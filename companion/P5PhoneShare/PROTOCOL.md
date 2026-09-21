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
  "shared": { "score": 0 }
}
```

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
  "you": { "name": "anon", "x": 0 }
}
```

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
  - `me` patches go to the other connections only.

### `batch` (bidirectional)

Several patches in one frame, applied in order. The client queues changes and flushes them every `sendInterval` ms (default 50), dropping a queued patch that a later one overwrites. The server relays a batch the same way as single patches: all ops to the others, the `shared` ops back to the sender.

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

### `error` (server → client)

```json
{
  "type": "error",
  "v": 2,
  "message": "…"
}
```

## Serialization rules

Values must be JSON-serializable plain data:

- Allowed: `null`, finite numbers, strings, booleans, plain objects, arrays of the above.
- Rejected: `undefined` (except as delete for patch leaf), `NaN`, `Infinity`, functions, DOM nodes, class instances, typed arrays, BigInt, Symbol.

## Persistence

`shared` and the host id are saved to Durable Object storage at most once a second (after changes), so a room that hibernates while phones are still connected wakes up with its state. The debounce keeps a busy room well inside the free tier's 100,000 row writes a day. When the last connection leaves, the room is cleared and the next joiner seeds it again.

## Leaving

- A client that closes deliberately sends close code `1000`. (A bare `close()` sends no status; PartyServer cannot echo the reserved `1005`, and the socket stays half-open.)
- On phones, p5-phone closes the socket when the page is hidden (screen locked, another app) and rejoins when it is visible again, so a locked phone leaves `guests` at once. Sketches can turn this off with `shareSetup({ disconnectWhenHidden: false })`.
