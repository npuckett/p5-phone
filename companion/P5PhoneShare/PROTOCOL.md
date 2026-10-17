# P5PhoneShare wire protocol (v2)

JSON messages over a PartyServer WebSocket.

## URL

```
wss://<host>/parties/share-room/<roomKey>
```

`roomKey` = `${app || 'default'}:${room || 'main'}` (URL-encoded as a single path segment).

PartyServer maps the binding name `ShareRoom` → party path `share-room`.

## Version

Every message includes `"v": 2`. Mismatched versions produce an `error` message, so a sketch on a newer p5-phone than its worker (or the other way round) says so instead of misbehaving. Redeploy the worker (`npx wrangler deploy`) after updating p5-phone.

v2 (p5-phone 1.14.0) added `batch` and echoes shared patches to their sender.

The keep option (see [Keep](#keep-the-room-between-visits)) is part of v2. It adds optional fields (`hello.keep`, `welcome.keep`) and three messages (`kept`, `clear`, `reset`). A peer that does not know them ignores them, so the version stays 2. The one place an old peer shows it is a new client talking to an old worker: the worker answers `clear` with an `error` ("Unexpected message type: clear") and never reports `keep`.

The quiet option (see [Quiet](#quiet-a-connection-that-skips-other-phones-me-changes)) is part of v2 too. It adds one optional field to `hello` and one to `welcome` (`quiet`), and no messages. An old worker ignores `hello.quiet` and sends everything, and its `welcome` has no `quiet`, so the client knows the option was not used. An old client never sends it.

## Messages

### `hello` (client → server)

Sent once after the socket opens.

```json
{
  "type": "hello",
  "v": 2,
  "app": "my-sketch",
  "room": "demo",
  "me": { "name": "anon", "x": 0 },
  "shared": { "score": 0 },
  "keep": { "expire": 604800000 },
  "quiet": true
}
```

- `quiet` — optional. `true` asks not to be sent other clients' `me` changes (see [Quiet](#quiet-a-connection-that-skips-other-phones-me-changes)). Only the boolean `true` counts. It belongs to this connection, and every client chooses for itself. A server that does not know it ignores it.
- `keep` — optional. Ask for the room to be kept after the last client leaves. `expire` is in ms (clamped by the server to 1 second to 30 days; 7 days when missing). Only the client that creates the room (becomes host in an empty room) sets the policy. Ignored otherwise, and ignored by a server that does not know it.
- `me` — this client's current per-guest object (JSON-serializable). The client sends what it has now, so fields set before joining, or before a reconnect, are kept.
- `shared` — seed for room shared state: the client's current copy. Applied only by the first client that joins an empty room (becomes host); ignored otherwise.

### `welcome` (server → client)

```json
{
  "type": "welcome",
  "v": 2,
  "clientId": "…",
  "isHost": true,
  "shared": { "score": 0 },
  "guests": [{ "id": "…", "data": { "name": "other" } }],
  "you": { "name": "anon", "x": 0 },
  "keep": { "expire": 604800000, "remaining": 604711000 },
  "quiet": true
}
```

- `quiet` — present (and `true`) only when this connection is quiet. A client that sent `hello.quiet` and gets no `quiet` here knows its option was not used, because the server is older.

- `keep` — present only when the room is kept (whoever asked): `expire` is the room's keep time and `remaining` is the ms left before the kept copy is deleted if nothing changes. A client that sent `hello.keep` and gets no `keep` here knows its option was not used: the room already existed without keep, or the server is older. `remaining` is a duration, not a clock time, so clocks need not agree.

### `patch` (bidirectional)

```json
{
  "type": "patch",
  "v": 2,
  "scope": "shared",
  "path": "score",
  "value": 3,
  "clientId": "…"
}
```

- `scope`: `"shared"` (room) or `"me"` (sender's guest object).
- `path`: dot path (`"pos.x"`). Array elements use their index (`"list.2"`, `"list.length"`). Paths containing `__proto__`, `prototype` or `constructor` are rejected with an `error`.
- `value`: JSON value, or omit/`undefined` to delete the leaf.
- The server applies patches in arrival order (last write wins) and relays them with the sender's `clientId`:
  - `shared` patches go to **every** connection, the sender included. The echo tells the sender where its write landed. Until its own echo arrives, a client keeps its local value and skips remote writes to the same path (or a containing path), because its write will override them on the server. So every client ends up with the server's value, even when two write the same key at once.
  - `me` patches go to the other connections only, except the quiet ones (see [Quiet](#quiet-a-connection-that-skips-other-phones-me-changes)).

### `batch` (bidirectional)

Several patches in one frame, applied in order. The client queues changes and flushes them every `sendInterval` ms (default 50), dropping a queued patch that a later one overwrites. The server relays a batch the same way as single patches: all ops to the others, the `shared` ops back to the sender. A quiet connection is sent only the `shared` ops of a batch, as a `patch` when there is one and as a `batch` when there are several. If a batch has no `shared` ops, a quiet connection is sent nothing.

```json
{
  "type": "batch",
  "v": 2,
  "ops": [
    { "scope": "me", "path": "x", "value": 0.4 },
    { "scope": "me", "path": "y", "value": 0.7 }
  ],
  "clientId": "…"
}
```

### `presence` (server → client)

```json
{
  "type": "presence",
  "v": 2,
  "guests": [{ "id": "…", "data": {} }],
  "joined": "…",
  "left": "…"
}
```

Sent to every connection (quiet ones too) each time a client joins or leaves. `guests` lists everyone in the room at that moment, the receiver included, and each `data` is that client's `me` as the server holds it at that moment.

### `host` (server → client)

Sent when host changes (previous host left).

```json
{
  "type": "host",
  "v": 2,
  "clientId": "…",
  "isHost": false
}
```

### `emit` (bidirectional)

Room one-shot events (not stored).

```json
{
  "type": "emit",
  "v": 2,
  "name": "pulse",
  "data": { "x": 10 },
  "clientId": "…"
}
```

### `kept` (server → client)

Sent to every client of a kept room after a change has been saved (at most once a second) and after `clear`. A change moves the deadline, so the clients learn the new one.

```json
{ "type": "kept", "v": 2, "expire": 604800000, "remaining": 604799000 }
```

### `clear` (client → server)

Put `shared` back to a starting value, for everyone. Any client that has sent `hello` may send it.

```json
{ "type": "clear", "v": 2, "shared": { "marks": {} } }
```

- `shared` — the value to reset to (the client's `shareSetup({ shared })`). Missing, not a plain object, or over the size limit of a kept room: `{}`.
- The server replaces the stored copy at once, moves the deadline, and answers with `reset` to every connection, the sender included. `me` and guests are not touched.
- Works in any room, kept or not.

### `reset` (server → client)

The whole `shared` object was replaced. Sent to every client after `clear`, and to one client alone when the server refuses a write (see Size limit).

```json
{ "type": "reset", "v": 2, "shared": { "marks": {} } }
```

A client replaces its `shared` with this, then puts back the writes of its own that the server has not applied yet (those come after the reset, in the server's order).

### `error` (server → client)

```json
{
  "type": "error",
  "v": 2,
  "message": "…"
}
```

## Quiet: a connection that skips other phones' `me` changes

By default the server sends every `me` change from every client to every other client. In a room of n phones that is n times n messages. A page that never reads other phones' `me` (a phone page that reads only `shared.average`, or a small board) can ask not to get them.

A client sends `"quiet": true` in `hello`. The server stores it in the connection's state (so it survives hibernation) and answers with `"quiet": true` in `welcome`.

What a quiet connection is sent:

| Message | Quiet connection |
|---|---|
| `welcome` | Yes. `guests` lists everyone in the room, with each one's `me` as it is at that moment. |
| `presence` | Yes, on every join and leave, the same message as for everyone else. |
| `patch` / `batch` with `shared` ops | Yes. |
| `patch` / `batch` with `me` ops | **No.** A batch with both kinds is cut down to its `shared` ops. A batch with only `me` ops is not sent. |
| `emit`, `host`, `kept`, `reset`, `error` | Yes. |

What a quiet connection still does: it sends its own `me` and `shared` changes and events as usual, and the others receive them. The option changes only what that connection is sent. A room can mix quiet and ordinary clients, and each ordinary client sees every `me` as before.

**What `guests` holds for a quiet client.** The list is correct for who is here (every join and leave arrives in `presence`), and each entry's `me` is a snapshot. It is taken when the client joins (`welcome.guests`), and taken again each time anyone joins or leaves (`presence.guests`). Between those moments it does not change, because the `me` patches are not sent. So `role`, `name` and anything else a client put in `hello.me` is there from the start. A value a client changes later shows up only at the next join or leave. A client that needs live values must not be quiet.

The server never sends a quiet connection anything that an ordinary connection would not get, so a client that handles every message of an ordinary connection handles a quiet one. Old clients never send `quiet`, so nothing changes for them.

## Serialization rules

Values must be JSON-serializable plain data:

- Allowed: `null`, finite numbers, strings, booleans, plain objects, arrays of the above.
- Rejected: `undefined` (except as delete for patch leaf), `NaN`, `Infinity`, functions, DOM nodes, class instances, typed arrays, BigInt, Symbol.

## Persistence

`shared` and the host id are saved to Durable Object storage at most once a second (after changes), so a room that hibernates while phones are still connected wakes up with its state. The debounce keeps a busy room well inside the free tier's 100,000 row writes a day. When the last connection leaves, the room is cleared and the next joiner seeds it again.

## Keep the room between visits

A room created with `hello.keep` is **kept**: when the last connection leaves, the room is not cleared.

- **What is stored.** `shared`, the host id and the keep policy, in Durable Object storage (SQLite-backed, which the worker's migration already asks for). `me` and guests are never stored. The host id is cleared, so the next client to join is host.
- **When it is written.** At most once a second after a change, as for any room, and immediately when the last client leaves or on `clear`.
- **Expiry.** The kept copy expires `expire` ms after the last change to `shared` (or after the room was created, if nothing was ever written). Each change moves the deadline; joining and leaving do not. A Durable Object alarm is set at or before the deadline. When it runs, an empty room that has not changed since is deleted: storage, host, policy and alarm. If the alarm runs early (because the room changed), it sets itself again. As a backup for a missed alarm, a room whose time has run out is also deleted when the Durable Object wakes with nobody connected, and when a client sends `hello` into it. The next client then creates a new room with its own seed and its own `keep`.
- **A live room is not deleted.** If the deadline passes while a client is connected, nothing is deleted. The deadline is checked again when the last client leaves, and the room is deleted then if it has not changed.
- **Policy.** Fixed by the client that creates the room (`hello.keep` when the room is empty or expired). It does not change while the room exists. Later `hello.keep` values are ignored. `welcome.keep` tells each client what the room does.
- **Size limit.** `shared` in a kept room is at most 65,536 bytes of JSON (UTF-8). A `patch` or `batch` that would take it over is refused as a whole for its `shared` ops (its `me` ops still apply): the sender gets an `error` ("Not saved: a kept room holds at most 64 KB …") and a `reset` with the room's real `shared`, so its screen matches. Nobody else hears of it. A seed over the limit makes a room that is not kept (the `hello` is otherwise accepted, and the sender gets an `error`). Rooms without keep have no limit, as before.
- **Writes are counted, not always measured.** The worker adds up the size of each write as an upper bound and measures the whole object only when that bound nears the limit, so a busy room does not pay for it.
- **Quiet and keep.** They are independent. A quiet client can create or join a kept room, and gets `kept` and `reset` like anyone else.
- **Old peers.** A server that does not know `keep` ignores `hello.keep` and never sends `keep`, `kept` or `reset`. A client that does not know them ignores them. A client that does not know `reset` keeps its old `shared` after a `clear` until its next full join.

## Leaving

- A client that closes deliberately sends close code `1000`. (A bare `close()` sends no status; PartyServer cannot echo the reserved `1005`, and the socket stays half-open.)
- On phones, p5-phone closes the socket when the page is hidden (screen locked, another app) and rejoins when it is visible again, so a locked phone leaves `guests` at once. Sketches can turn this off with `shareSetup({ disconnectWhenHidden: false })`.
