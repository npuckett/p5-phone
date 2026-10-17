/**
 * P5PhoneShare — PartyServer room for p5-phone multi-user shared state.
 *
 * Deploy: npm i && npx wrangler deploy
 * Connect sketches with shareSetup({ host: 'https://YOUR.workers.dev', room: 'demo' })
 */

import { routePartykitRequest, Server, type Connection, type ConnectionContext } from 'partyserver';
import {
  KEEP_MAX_BYTES,
  SHARE_PROTOCOL_VERSION,
  applyPatchInPlace,
  cloneJson,
  decodeMessage,
  encodeMessage,
  isJsonSerializable,
  isSafePath,
  jsonBytes,
  opsForQuiet,
  parseKeep,
  parseQuiet,
  type GuestEntry,
  type KeepPolicy,
  type KeepStatus,
  type PatchOp,
  type ShareMessage,
  type ShareScope
} from './protocol';

type ConnState = {
  me: Record<string, unknown>;
  helloDone: boolean;
  // The quiet option: this connection is not sent other phones' `me` changes. Set from
  // hello.quiet and kept in the connection's state, so it survives hibernation.
  quiet?: boolean;
};

type RoomMeta = {
  hostId: string | null;
  seeded: boolean;
  // Only in a kept room: the keep time, and when `shared` last changed (ms since 1970).
  keep?: KeepPolicy;
  touchedAt?: number;
};

// Storage writes are debounced: the free tier allows 100,000 row writes a day, and a
// sketch that moves a shared object every frame would otherwise use them up in minutes.
// A pending timer keeps the room awake, so state is written before it can hibernate.
const PERSIST_DELAY_MS = 1000;

function emptyState(): ConnState {
  return { me: {}, helloDone: false };
}

// A connection's state with its `me`. `quiet` is written only when it is on, so the state of
// an ordinary connection is the same as before the quiet option.
function connState(me: Record<string, unknown>, quiet: boolean): ConnState {
  return quiet ? { me, helloDone: true, quiet: true } : { me, helloDone: true };
}

export class ShareRoom extends Server {
  static options = { hibernate: true };

  shared: Record<string, unknown> = {};
  hostId: string | null = null;
  seeded = false;
  persistTimer: ReturnType<typeof setTimeout> | null = null;

  // The keep option. A room created with keep holds on to `shared` after the last phone
  // leaves, until `keep.expire` ms after its last change. The first phone to create the
  // room sets the policy; it never changes while the room exists.
  keep: KeepPolicy | null = null;
  touchedAt = 0; // when `shared` last changed (or the room was created)
  sharedBytes = 0; // an upper bound on the JSON size of `shared`, kept for kept rooms only

  async onStart() {
    // Light persistence so hibernation wake does not wipe room state.
    // A kept room goes further: see the keep option.
    const storedShared = await this.ctx.storage.get<Record<string, unknown>>('shared');
    const meta = await this.ctx.storage.get<RoomMeta>('meta');
    this.shared =
      storedShared && typeof storedShared === 'object' && !Array.isArray(storedShared)
        ? storedShared
        : {};
    this.hostId = meta?.hostId ?? null;
    this.seeded = Boolean(meta?.seeded);
    this.keep = this.seeded && meta?.keep ? parseKeep(meta.keep) : null;
    this.touchedAt = this.keep ? meta?.touchedAt ?? Date.now() : 0;
    this.sharedBytes = this.keep ? jsonBytes(this.shared) : 0;

    // Backup for a missed alarm: a kept room that ran out of time while it slept is gone.
    if (this.isExpired() && this.openConnections() === 0) {
      await this.expireRoom('time ran out, found on wake');
    }
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
      case 'clear':
        void this.handleClear(connection, msg);
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
      if (this.persistTimer) {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
      }
      if (this.keep && !this.isExpired()) {
        // A kept room stays. Save it now (not after the debounce), and set the alarm that
        // deletes it when its time runs out.
        this.hostId = null;
        await this.persistRoom();
        return;
      }
      await this.expireRoom('time ran out, last phone left');
      return;
    }

    if (this.hostId === leftId) {
      await this.electHost(remaining);
    }
  }

  onError(connection: Connection, error: unknown) {
    console.error('ShareRoom connection error', connection.id, error);
  }

  // True when a kept room's time has run out: `keep.expire` ms with no change to `shared`.
  private isExpired(): boolean {
    return this.keep !== null && Date.now() >= this.touchedAt + this.keep.expire;
  }

  private openConnections(exceptId?: string): number {
    let n = 0;
    for (const c of this.getConnections()) if (c.id !== exceptId) n++;
    return n;
  }

  // Forget the room: shared, host, keep policy, the stored copy and the alarm.
  // `why` is logged when a kept room ends, so the dashboard (or wrangler dev) shows it.
  private async expireRoom(why = 'cleared') {
    const wasKept = this.keep !== null;
    if (wasKept) console.log(`ShareRoom: kept room deleted (${why})`);
    this.shared = {};
    this.hostId = null;
    this.seeded = false;
    this.keep = null;
    this.touchedAt = 0;
    this.sharedBytes = 0;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    // Both calls are issued before anything is awaited, so a phone that joins during the
    // delete cannot have its new room wiped by it.
    await Promise.all([
      wasKept ? this.ctx.storage.deleteAlarm() : Promise.resolve(),
      this.ctx.storage.deleteAll()
    ]);
  }

  // The alarm runs when a kept room's time may be up. It deletes the room if it is empty and
  // has not changed since. A room with phones in it is left alone: it is checked again when
  // the last phone leaves.
  async onAlarm() {
    if (!this.keep) return;
    if (this.openConnections() > 0) return;
    if (this.isExpired()) {
      await this.expireRoom('time ran out, alarm');
    } else {
      await this.ctx.storage.setAlarm(this.touchedAt + this.keep.expire);
    }
  }

  // Keep the alarm at or before the room's deadline. If it fires early (the room changed
  // since), onAlarm sets it again, so a change never needs its own alarm write.
  private async armAlarm() {
    if (!this.keep) return;
    const deadline = this.touchedAt + this.keep.expire;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > deadline) await this.ctx.storage.setAlarm(deadline);
  }

  private keepStatus(): KeepStatus | undefined {
    if (!this.keep) return undefined;
    return {
      expire: this.keep.expire,
      remaining: Math.max(0, this.touchedAt + this.keep.expire - Date.now())
    };
  }

  // Tell everyone how long the kept copy lives now (each change moves the deadline).
  private broadcastKept() {
    const status = this.keepStatus();
    if (!status) return;
    const msg: ShareMessage = { type: 'kept', v: SHARE_PROTOCOL_VERSION, ...status };
    this.broadcast(encodeMessage(msg));
  }

  private async persistRoom() {
    try {
      const meta: RoomMeta = { hostId: this.hostId, seeded: this.seeded };
      if (this.keep) {
        meta.keep = this.keep;
        meta.touchedAt = this.touchedAt;
      }
      await this.ctx.storage.put({ shared: this.shared, meta });
      await this.armAlarm();
    } catch (err) {
      // Over the free-tier write limit: keep the live room working from memory.
      console.error('ShareRoom persist failed', err);
    }
  }

  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persistRoom().then(() => this.broadcastKept());
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

    // The quiet option: hello.quiet asks not to be sent other phones' `me` changes. The
    // welcome says whether it was used. An older server ignores the field and sends everything.
    const quiet = parseQuiet(msg.quiet);
    connection.setState(connState(me, quiet));

    // A kept room whose time ran out (and whose alarm has not run yet) is gone. This phone
    // starts a new room.
    if (this.isExpired() && this.openConnections(connection.id) === 0) {
      await this.expireRoom('time ran out, found on join');
    }

    let keepRefused = '';
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
      // The first phone sets the keep policy. Later phones' hello.keep is ignored.
      const wanted = parseKeep(msg.keep);
      if (wanted) {
        const size = jsonBytes(this.shared);
        if (size <= KEEP_MAX_BYTES) {
          this.keep = wanted;
          this.touchedAt = Date.now();
          this.sharedBytes = size;
        } else {
          keepRefused = `The shared data you start with is ${Math.ceil(size / 1024)} KB. A kept room holds at most ${KEEP_MAX_BYTES / 1024} KB, so this room is not kept.`;
        }
      }
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
    const keep = this.keepStatus();
    if (keep) welcome.keep = keep;
    if (quiet) welcome.quiet = true;
    connection.send(encodeMessage(welcome));
    if (keepRefused) this.sendError(connection, keepRefused);

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

    type Checked = { scope: ShareScope; path: string; value: unknown };
    let checked: Checked[] = [];
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
      checked.push({
        scope: op.scope,
        path: op.path,
        value: op.value === undefined ? undefined : cloneJson(op.value)
      });
    }

    // A kept room holds at most KEEP_MAX_BYTES of `shared`. Most writes are small, so they
    // are counted by their own size (an upper bound) and nothing is measured. Only when
    // that bound nears the limit is the whole object measured, with the write applied to a
    // copy. A write that does not fit is refused as a whole, and the sender gets the
    // room's real state back so its screen matches.
    let sharedApplied = false;
    const sharedOps = checked.filter((op) => op.scope === 'shared');
    if (this.keep && sharedOps.length) {
      let growth = 0;
      for (const op of sharedOps) {
        if (op.value !== undefined) growth += op.path.length + jsonBytes(op.value) + 8;
      }
      if (this.sharedBytes + growth <= KEEP_MAX_BYTES) {
        this.sharedBytes += growth;
      } else {
        const next = cloneJson(this.shared);
        for (const op of sharedOps) applyPatchInPlace(next, op.path, op.value);
        const size = jsonBytes(next);
        if (size > KEEP_MAX_BYTES) {
          this.sendError(
            connection,
            `Not saved: a kept room holds at most ${KEEP_MAX_BYTES / 1024} KB of shared data, and this change would make it ${Math.ceil(size / 1024)} KB.`
          );
          const reset: ShareMessage = {
            type: 'reset',
            v: SHARE_PROTOCOL_VERSION,
            shared: cloneJson(this.shared)
          };
          connection.send(encodeMessage(reset));
          checked = checked.filter((op) => op.scope !== 'shared');
        } else {
          this.shared = next;
          this.sharedBytes = size;
          sharedApplied = true;
        }
      }
    }

    const applied: PatchOp[] = [];
    let meChanged = false;
    for (const op of checked) {
      if (op.scope === 'me') {
        applyPatchInPlace(state.me, op.path, op.value);
        meChanged = true;
      } else if (!sharedApplied) {
        applyPatchInPlace(this.shared, op.path, op.value);
      }
      const out: PatchOp = { scope: op.scope, path: op.path };
      if (op.value !== undefined) out.value = op.value;
      applied.push(out);
    }
    if (applied.length === 0) return;

    if (meChanged) connection.setState(connState(state.me, state.quiet === true));
    const shared = applied.filter((op) => op.scope === 'shared');
    if (shared.length) {
      if (this.keep) this.touchedAt = Date.now();
      this.schedulePersist();
    }

    this.relayOps(connection, applied);
    if (shared.length) connection.send(this.encodeOps(shared, connection.id));
  }

  // Send patches to every connection but the sender. A quiet connection is sent only the
  // `shared` ones: a batch with both kinds is cut down to its shared part for it, and a
  // patch or batch with only `me` changes is not sent to it at all. This is what keeps a
  // room of n phones from sending n times n messages to a page that does not use them.
  private relayOps(sender: Connection, applied: PatchOp[]) {
    const full = this.encodeOps(applied, sender.id);
    const sharedOps = opsForQuiet(applied);
    const forQuiet =
      sharedOps.length === applied.length
        ? full
        : sharedOps.length > 0
          ? this.encodeOps(sharedOps, sender.id)
          : null;
    for (const c of this.getConnections()) {
      if (c.id === sender.id) continue;
      const quiet = ((c.state as ConnState | null)?.quiet) === true;
      const out = quiet ? forQuiet : full;
      if (out === null) continue;
      try {
        c.send(out);
      } catch (_e) {
        // The same handling as PartyServer's broadcast().
        c.close(1011, 'Unexpected error');
      }
    }
  }

  // clear: put `shared` back to the seed the phone sends (its shareSetup shared, or {}), for
  // everyone, and replace the kept copy at once. `me` and guests are not touched.
  private async handleClear(
    connection: Connection,
    msg: Extract<ShareMessage, { type: 'clear' }>
  ) {
    const state = (connection.state || emptyState()) as ConnState;
    if (!state.helloDone) {
      this.sendError(connection, 'Send hello before clear');
      return;
    }
    let next: Record<string, unknown> = {};
    if (
      msg.shared &&
      typeof msg.shared === 'object' &&
      !Array.isArray(msg.shared) &&
      isJsonSerializable(msg.shared) &&
      (!this.keep || jsonBytes(msg.shared) <= KEEP_MAX_BYTES)
    ) {
      next = cloneJson(msg.shared as Record<string, unknown>);
    }
    this.shared = next;
    if (this.keep) {
      this.sharedBytes = jsonBytes(next);
      this.touchedAt = Date.now();
    }
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    const reset: ShareMessage = {
      type: 'reset',
      v: SHARE_PROTOCOL_VERSION,
      shared: cloneJson(next)
    };
    this.broadcast(encodeMessage(reset));
    await this.persistRoom();
    this.broadcastKept();
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
