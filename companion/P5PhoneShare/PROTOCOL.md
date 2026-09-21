# P5PhoneShare wire protocol (v1)

JSON messages over a PartyServer WebSocket.

## URL

```
wss://<host>/parties/share-room/<roomKey>
```

`roomKey` = `${app || 'default'}:${room || 'main'}` (URL-encoded as a single path segment).

PartyServer maps the binding name `ShareRoom` → party path `share-room`.

## Version

Every message includes `"v": 1`. Mismatched versions produce an `error` message.

## Messages

### `hello` (client → server)

Sent once after the socket opens.

```json
{
  "type": "hello",
  "v": 1,
  "app": "my-sketch",
  "room": "demo",
  "me": { "name": "anon", "x": 0 },
  "shared": { "score": 0 }
}
```

- `me` — this client's initial per-guest object (JSON-serializable).
- `shared` — optional seed for room shared state. Applied only by the first client that joins an empty room (becomes host).

### `welcome` (server → client)

```json
{
  "type": "welcome",
  "v": 1,
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
  "v": 1,
  "scope": "shared",
  "path": "score",
  "value": 3,
  "clientId": "…"
}
```

- `scope`: `"shared"` (room) or `"me"` (sender's guest object).
- `path`: dot path (`"pos.x"`).
- `value`: JSON value, or omit/`undefined` to delete the leaf.
- Last-write-wins. Server applies then broadcasts to other connections (sender already applied locally).

### `presence` (server → client)

```json
{
  "type": "presence",
  "v": 1,
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
  "v": 1,
  "clientId": "…",
  "isHost": false
}
```

### `emit` (bidirectional)

Room one-shot events (not stored).

```json
{
  "type": "emit",
  "v": 1,
  "name": "pulse",
  "data": { "x": 10 },
  "clientId": "…"
}
```

### `error` (server → client)

```json
{
  "type": "error",
  "v": 1,
  "message": "…"
}
```

## Serialization rules

Values must be JSON-serializable plain data:

- Allowed: `null`, finite numbers, strings, booleans, plain objects, arrays of the above.
- Rejected: `undefined` (except as delete for patch leaf), `NaN`, `Infinity`, functions, DOM nodes, class instances, typed arrays, BigInt, Symbol.

## Persistence (roadmap)

v1 state is in-memory per Durable Object. Empty rooms reset. Future versions may load/save `shared` via DO SQLite in `onStart`.
