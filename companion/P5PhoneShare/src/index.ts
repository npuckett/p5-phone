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
  type GuestEntry,
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

function emptyState(): ConnState {
  return { me: {}, helloDone: false };
}

export class ShareRoom extends Server {
  static options = { hibernate: true };

  shared: Record<string, unknown> = {};
  hostId: string | null = null;
  seeded = false;

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
        void this.handlePatch(connection, msg);
        break;
      case 'emit':
        this.handleEmit(connection, msg);
        break;
      default:
        this.sendError(connection, `Unexpected message type: ${(msg as ShareMessage).type}`);
    }
  }

  async onClose(connection: Connection) {
    const wasHost = this.hostId === connection.id;
    this.broadcastPresence(undefined, connection.id);

    if (wasHost) {
      await this.electHost();
    }

    const remaining = [...this.getConnections()];
    if (remaining.length === 0) {
      this.shared = {};
      this.hostId = null;
      this.seeded = false;
      await this.ctx.storage.deleteAll();
    }
  }

  onError(connection: Connection, error: unknown) {
    console.error('ShareRoom connection error', connection.id, error);
  }

  private async persistRoom() {
    await this.ctx.storage.put('shared', this.shared);
    await this.ctx.storage.put('meta', {
      hostId: this.hostId,
      seeded: this.seeded
    } satisfies RoomMeta);
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
      guests: this.guestList(connection.id),
      you: cloneJson(me)
    };
    connection.send(encodeMessage(welcome));

    this.broadcastPresence(connection.id, undefined, [connection.id]);
  }

  private async handlePatch(
    connection: Connection,
    msg: Extract<ShareMessage, { type: 'patch' }>
  ) {
    const state = (connection.state || emptyState()) as ConnState;
    if (!state.helloDone) {
      this.sendError(connection, 'Send hello before patch');
      return;
    }

    const scope = msg.scope as ShareScope;
    if (scope !== 'shared' && scope !== 'me') {
      this.sendError(connection, 'Invalid patch scope');
      return;
    }
    if (typeof msg.path !== 'string' || msg.path.length === 0) {
      this.sendError(connection, 'Invalid patch path');
      return;
    }
    if (msg.value !== undefined && !isJsonSerializable(msg.value)) {
      this.sendError(connection, 'Patch value must be JSON-serializable');
      return;
    }

    const value = msg.value === undefined ? undefined : cloneJson(msg.value);

    if (scope === 'shared') {
      applyPatchInPlace(this.shared, msg.path, value);
      await this.persistRoom();
      const out: ShareMessage = {
        type: 'patch',
        v: SHARE_PROTOCOL_VERSION,
        scope: 'shared',
        path: msg.path,
        value,
        clientId: connection.id
      };
      this.broadcast(encodeMessage(out), [connection.id]);
      return;
    }

    applyPatchInPlace(state.me, msg.path, value);
    connection.setState({ me: state.me, helloDone: true } satisfies ConnState);

    const out: ShareMessage = {
      type: 'patch',
      v: SHARE_PROTOCOL_VERSION,
      scope: 'me',
      path: msg.path,
      value,
      clientId: connection.id
    };
    this.broadcast(encodeMessage(out), [connection.id]);
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

  private async electHost() {
    const connections = [...this.getConnections()];
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

  private guestList(excludeId?: string): GuestEntry[] {
    const guests: GuestEntry[] = [];
    for (const c of this.getConnections()) {
      if (excludeId && c.id === excludeId) continue;
      const state = (c.state || emptyState()) as ConnState;
      if (!state.helloDone) continue;
      guests.push({ id: c.id, data: cloneJson(state.me) });
    }
    return guests;
  }

  private broadcastPresence(joined?: string, left?: string, exclude: string[] = []) {
    const guests = this.guestList();
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
