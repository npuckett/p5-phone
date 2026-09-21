/**
 * P5PhoneShare — PartyServer room for p5-phone multi-user shared state.
 *
 * Deploy: npm i && npx wrangler deploy
 * Connect sketches with shareSetup({ host: 'https://YOUR.workers.dev', room: 'demo' })
 */

import { routePartykitRequest, Server, type Connection, type ConnectionContext } from 'partyserver';
import {
  SHARE_PROTOCOL_VERSION,
  applyPatchInPlace,
  cloneJson,
  decodeMessage,
  encodeMessage,
  isJsonSerializable,
  isSafePath,
  type GuestEntry,
  type PatchOp,
  type ShareMessage,
  type ShareScope
} from './protocol';

type ConnState = {
  me: Record<string, unknown>;
  helloDone: boolean;
};

type RoomMeta = {
  hostId: string | null;
  seeded: boolean;
};

// Storage writes are debounced: the free tier allows 100,000 row writes a day, and a
// sketch that moves a shared object every frame would otherwise use them up in minutes.
// A pending timer keeps the room awake, so state is written before it can hibernate.
const PERSIST_DELAY_MS = 1000;

function emptyState(): ConnState {
  return { me: {}, helloDone: false };
}

export class ShareRoom extends Server {
  static options = { hibernate: true };

  shared: Record<string, unknown> = {};
  hostId: string | null = null;
  seeded = false;
  persistTimer: ReturnType<typeof setTimeout> | null = null;

  async onStart() {
    // Light persistence so hibernation wake does not wipe room state.
    // Long-term DB adapters remain a roadmap item.
    const storedShared = await this.ctx.storage.get<Record<string, unknown>>('shared');
    const meta = await this.ctx.storage.get<RoomMeta>('meta');
    this.shared =
      storedShared && typeof storedShared === 'object' && !Array.isArray(storedShared)
        ? storedShared
        : {};
    this.hostId = meta?.hostId ?? null;
    this.seeded = Boolean(meta?.seeded);
  }

  onConnect(connection: Connection, _ctx: ConnectionContext) {
    connection.setState(emptyState());
  }

  onMessage(connection: Connection, message: string | ArrayBuffer) {
    if (typeof message !== 'string') {
      this.sendError(connection, 'Binary messages are not supported');
      return;
    }

    const msg = decodeMessage(message);
    if (!msg) {
      this.sendError(connection, 'Invalid JSON message');
      return;
    }

    if ('v' in msg && typeof msg.v === 'number' && msg.v !== SHARE_PROTOCOL_VERSION) {
      this.sendError(
        connection,
        `Unsupported protocol version ${msg.v}; server expects ${SHARE_PROTOCOL_VERSION}`
      );
      return;
    }

    switch (msg.type) {
      case 'hello':
        void this.handleHello(connection, msg);
        break;
      case 'patch':
        this.handleOps(connection, [{ scope: msg.scope, path: msg.path, value: msg.value }]);
        break;
      case 'batch':
        this.handleOps(connection, Array.isArray(msg.ops) ? msg.ops : []);
        break;
      case 'emit':
        this.handleEmit(connection, msg);
        break;
      default:
        this.sendError(connection, `Unexpected message type: ${(msg as ShareMessage).type}`);
    }
  }

  async onClose(connection: Connection) {
    // PartyServer calls onClose before it closes the socket, so the leaving connection
    // can still be listed as open here. Leave it out explicitly.
    const leftId = connection.id;
    const remaining = [...this.getConnections()].filter((c) => c.id !== leftId);
    this.broadcastPresence(undefined, leftId, [leftId]);

    if (remaining.length === 0) {
      this.shared = {};
      this.hostId = null;
      this.seeded = false;
      if (this.persistTimer) {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
      }
      await this.ctx.storage.deleteAll();
      return;
    }

    if (this.hostId === leftId) {
      await this.electHost(remaining);
    }
  }

  onError(connection: Connection, error: unknown) {
    console.error('ShareRoom connection error', connection.id, error);
  }

  private async persistRoom() {
    try {
      await this.ctx.storage.put({
        shared: this.shared,
        meta: { hostId: this.hostId, seeded: this.seeded } satisfies RoomMeta
      });
    } catch (err) {
      // Over the free-tier write limit: keep the live room working from memory.
      console.error('ShareRoom persist failed', err);
    }
  }

  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persistRoom();
    }, PERSIST_DELAY_MS);
  }

  private async handleHello(
    connection: Connection,
    msg: Extract<ShareMessage, { type: 'hello' }>
  ) {
    const me =
      msg.me && typeof msg.me === 'object' && !Array.isArray(msg.me) && isJsonSerializable(msg.me)
        ? cloneJson(msg.me as Record<string, unknown>)
        : {};

    connection.setState({ me, helloDone: true } satisfies ConnState);

    if (!this.seeded) {
      if (
        msg.shared &&
        typeof msg.shared === 'object' &&
        !Array.isArray(msg.shared) &&
        isJsonSerializable(msg.shared)
      ) {
        this.shared = cloneJson(msg.shared as Record<string, unknown>);
      } else {
        this.shared = {};
      }
      this.seeded = true;
      this.hostId = connection.id;
      await this.persistRoom();
    } else if (!this.hostId) {
      this.hostId = connection.id;
      await this.persistRoom();
    }

    const isHost = this.hostId === connection.id;
    const welcome: ShareMessage = {
      type: 'welcome',
      v: SHARE_PROTOCOL_VERSION,
      clientId: connection.id,
      isHost,
      shared: cloneJson(this.shared),
      guests: this.guestList([connection.id]),
      you: cloneJson(me)
    };
    connection.send(encodeMessage(welcome));

    this.broadcastPresence(connection.id, undefined, [connection.id]);
  }

  // Apply a list of patches in order. Shared patches go to everyone, the sender
  // included: the echo tells the sender where its write landed in the room's order, so
  // phones that write the same key at once still agree. A phone's own me patches go to
  // the others only (nobody else writes them).
  private handleOps(connection: Connection, ops: PatchOp[]) {
    const state = (connection.state || emptyState()) as ConnState;
    if (!state.helloDone) {
      this.sendError(connection, 'Send hello before patch');
      return;
    }

    const applied: PatchOp[] = [];
    let meChanged = false;
    for (const op of ops) {
      if (!op || (op.scope !== 'shared' && op.scope !== 'me')) {
        this.sendError(connection, 'Invalid patch scope');
        continue;
      }
      if (!isSafePath(op.path)) {
        this.sendError(connection, 'Invalid patch path');
        continue;
      }
      if (op.value !== undefined && !isJsonSerializable(op.value)) {
        this.sendError(connection, 'Patch value must be JSON-serializable');
        continue;
      }
      const value = op.value === undefined ? undefined : cloneJson(op.value);
      applyPatchInPlace(op.scope === 'shared' ? this.shared : state.me, op.path, value);
      if (op.scope === 'me') meChanged = true;
      const out: PatchOp = { scope: op.scope, path: op.path };
      if (value !== undefined) out.value = value;
      applied.push(out);
    }
    if (applied.length === 0) return;

    if (meChanged) connection.setState({ me: state.me, helloDone: true } satisfies ConnState);
    const shared = applied.filter((op) => op.scope === 'shared');
    if (shared.length) this.schedulePersist();

    this.broadcast(this.encodeOps(applied, connection.id), [connection.id]);
    if (shared.length) connection.send(this.encodeOps(shared, connection.id));
  }

  private encodeOps(ops: PatchOp[], clientId: string): string {
    const msg: ShareMessage =
      ops.length === 1
        ? { type: 'patch', v: SHARE_PROTOCOL_VERSION, ...ops[0], clientId }
        : { type: 'batch', v: SHARE_PROTOCOL_VERSION, ops, clientId };
    return encodeMessage(msg);
  }

  private handleEmit(
    connection: Connection,
    msg: Extract<ShareMessage, { type: 'emit' }>
  ) {
    const state = (connection.state || emptyState()) as ConnState;
    if (!state.helloDone) {
      this.sendError(connection, 'Send hello before emit');
      return;
    }
    if (typeof msg.name !== 'string' || msg.name.length === 0) {
      this.sendError(connection, 'Invalid emit name');
      return;
    }
    if (msg.data !== undefined && !isJsonSerializable(msg.data)) {
      this.sendError(connection, 'Emit data must be JSON-serializable');
      return;
    }

    const out: ShareMessage = {
      type: 'emit',
      v: SHARE_PROTOCOL_VERSION,
      name: msg.name,
      data: msg.data === undefined ? undefined : cloneJson(msg.data),
      clientId: connection.id
    };
    this.broadcast(encodeMessage(out), [connection.id]);
  }

  private async electHost(connections: Connection[] = [...this.getConnections()]) {
    connections = [...connections];
    if (connections.length === 0) {
      this.hostId = null;
      await this.persistRoom();
      return;
    }
    connections.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    this.hostId = connections[0].id;
    await this.persistRoom();
    for (const c of connections) {
      const hostMsg: ShareMessage = {
        type: 'host',
        v: SHARE_PROTOCOL_VERSION,
        clientId: this.hostId,
        isHost: c.id === this.hostId
      };
      c.send(encodeMessage(hostMsg));
    }
  }

  private guestList(exclude: string[] = []): GuestEntry[] {
    const guests: GuestEntry[] = [];
    for (const c of this.getConnections()) {
      if (exclude.includes(c.id)) continue;
      const state = (c.state || emptyState()) as ConnState;
      if (!state.helloDone) continue;
      guests.push({ id: c.id, data: cloneJson(state.me) });
    }
    return guests;
  }

  private broadcastPresence(joined?: string, left?: string, exclude: string[] = []) {
    const guests = this.guestList(left ? [left] : []);
    const msg: ShareMessage = {
      type: 'presence',
      v: SHARE_PROTOCOL_VERSION,
      guests,
      joined,
      left
    };
    this.broadcast(encodeMessage(msg), exclude);
  }

  private sendError(connection: Connection, message: string) {
    const msg: ShareMessage = {
      type: 'error',
      v: SHARE_PROTOCOL_VERSION,
      message
    };
    connection.send(encodeMessage(msg));
  }
}

type Env = {
  ShareRoom: DurableObjectNamespace<ShareRoom>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(
        'P5PhoneShare PartyServer is running. Connect with p5-phone shareSetup({ host }).\n',
        { headers: { 'content-type': 'text/plain; charset=utf-8' } }
      );
    }

    return (
      (await routePartykitRequest(request, env as never)) ||
      new Response('Not Found', { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
