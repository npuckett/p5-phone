# P5PhoneShare

Cloudflare [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) companion for **p5-phone** multi-user shared state.

One Durable Object = one room. Your sketch talks to **your** free Cloudflare Worker; phones do not need a laptop left running.

## Who is this for?

| Situation | What you do |
|-----------|-------------|
| **Your own project** (solo or with friends) | Deploy a worker once under your Cloudflare account, put the URL in `shareSetup({ host })`, share your sketch link |
| **Class / workshop** | One person deploys (or each project deploys its own); others join via QR / link with `?shareHost=&room=` already filled in |
| **Coding agent helping you** | Ask it to run the deploy steps below and paste the printed URL into your sketch |

There is no shared public p5-phone server. Each project gets its own worker (free tier is enough for coursework and small multiplayer sketches).

## Requirements

- Node.js 20+
- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account (email signup is enough)
- This folder (`companion/P5PhoneShare`) from the p5-phone repo — or a copy in your project

## Launch your server (once per project)

```bash
cd companion/P5PhoneShare
npm install
npx wrangler login          # once per computer — opens Cloudflare in the browser
npx wrangler deploy         # prints your https://….workers.dev URL
```

1. Copy the printed `https://….workers.dev` URL.
2. Put it in your sketch as `host` (see below).
3. Host the sketch anywhere (GitHub Pages, p5 Web Editor, Netlify, classroom server, etc.).
4. Open the sketch on phones and tap to join. Use different `room` names for different experiments on the same worker.

```js
shareSetup({
  host: 'https://p5-phone-share.YOUR_SUBDOMAIN.workers.dev', // your deploy URL
  room: 'my-game',   // pick any string; same room = same shared state
  app: 'final-project', // optional namespace if you reuse one worker for many sketches
  shared: { score: 0 },
  me: { name: 'player', x: 0, y: 0 }
});
enableShareTap('Tap to join');
showDesktopQr(); // optional: QR + address bar include shareHost/room for friends
```

### Invite others without them deploying

After `shareSetup` + `showDesktopQr()` on desktop, the address bar / QR become a join link:

```text
https://your-sketch-host/sketch/?shareHost=https://….workers.dev&room=my-game
```

Friends open that link — they do not run Wrangler. `shareSetup` reads `shareHost` and `room` from the URL when present.

### Local testing only

```bash
npm run dev
# host: 'http://127.0.0.1:8787'
```

This is for several browser tabs on the same computer, with the sketch served from `http://localhost`. Phones cannot use it: a sketch served over HTTPS may not open an insecure `ws://` connection, and phone sensors need HTTPS anyway. Use `wrangler deploy` for phones and for anything you share with other people.

The repo's end-to-end test runs this way: `npm run test:share` (from the repo root) starts the worker locally and drives several emulated phones against it.

### Updating

Redeploy after updating p5-phone: `npx wrangler deploy`. The sketch and the worker must speak the same protocol version (v2 since p5-phone 1.14.0). A mismatch shows up as `shareError` "Unsupported protocol version". The keep option did not change the version: a worker or a sketch that does not know it just ignores it.

## How long does the worker stay up?

After `wrangler deploy`, the URL stays live indefinitely. You do not leave a computer on. Idle rooms hibernate and wake when someone connects. Free-tier limits only matter under heavy traffic.

Re-deploy anytime with `npx wrangler deploy` after you change server code. Your `*.workers.dev` URL stays the same.

## Sketch API (p5-phone)

| Call / global | Role |
|---------------|------|
| `shareSetup(config)` | Configure host, room, initial `shared` / `me` (URL params override host/room/app) |
| `getShareJoinUrl()` | Page URL with `shareHost` / `room` / `app` for sharing |
| `showDesktopQr()` | Desktop QR of the join URL (after `shareSetup`) |
| `enableShareTap()` / `shareConnect()` | Join from a user gesture |
| `shared`, `me`, `guests` | Live synced objects |
| `shareIsHost`, `shareConnected`, `shareStatus` | Status |
| `shareEmit(name, data?)` | Room one-shot events |
| `shareReady()` / `shareReceive()` / `shareEvent()` | Optional callbacks |
| `shareSetup({ keep })` | Keep the room's `shared` after the last phone leaves (see below) |
| `shareClear()` | Put `shared` back to its starting value for everyone, and erase the kept copy |
| `shareKept`, `shareKeptUntil` | Did the server keep this room, and until when |
| `shareSetup({ quiet })` | Do not send this phone the other phones' `me` changes (see below) |
| `shareQuiet` | Did the server go quiet for this phone |

See [PROTOCOL.md](./PROTOCOL.md) for the wire format.

## Keep the room between visits

Normally a room is cleared when the last phone leaves. The **keep** option makes `shared` survive that, for a time you choose. Use it when the work should remember: a wall that every visitor adds a mark to, a guest book, a counter that lasts all week.

```js
shareSetup({
  host: 'https://p5-phone-share.YOUR_SUBDOMAIN.workers.dev',
  room: 'the-wall',
  shared: { },
  keep: '7d'          // true (7 days), a number of ms, '30m', '24h', '7d', or { expire: '24h' }
});
```

- **Expiry.** The kept copy is deleted `expire` after the last change to `shared`. Each change moves the deadline. Visiting does not. The default is 7 days and the most is 30 days. The least is 1 second.
- **Clear.** `shareClear()` puts `shared` back to the starting value you gave `shareSetup()` (or `{}`) for every phone in the room, and replaces the kept copy at once. Any phone in the room can call it, so give the button to one person (for example `if (shareIsHost)`).
- **Who sets the rule.** The first phone to create the room sets it. A phone that joins later with a different `keep` gets the room's rule. A phone that joins a kept room without `keep` still gets the kept room. To stop keeping a room, use a new room name, or call `shareClear()` and let the empty room expire.
- **What is kept.** Only `shared`. `me` and `guests` are presence, and are gone when the phone leaves.
- **Size.** A kept room holds at most 64 KB of `shared` as JSON. A write that would go over is refused as a whole, and the phone gets a `shareError` that starts with "Not saved". A starting `shared` over 64 KB makes a room that is not kept.
- **Status.** `shareKept` is `true` once the server has said it keeps this room. `shareKeptUntil` is the time (in ms, like `Date.now()`) when the copy is deleted if nothing changes. It moves forward with every change.
- **A room with a phone in it is never deleted.** The deadline is checked again when the last phone leaves.

**Many phones adding to a kept room.** The last write wins, so two phones that do `shared.marks.push(...)` at the same moment lose a mark. Give each mark its own key, so no two phones write the same path:

```js
let n = 0; // marks this phone has added
function addMark(x, y) {
  shared['m-' + shareClientId.slice(0, 8) + '-' + n++] = { x: x, y: y, t: Date.now() };
}
```

Keep marks small. At about 80 bytes each, 64 KB holds around 800. A phone can delete marks that are older than you want (`delete shared[key]`). Deleting the same key from two phones is safe.

**Server update needed.** Keep is part of the worker, so redeploy it (`npx wrangler deploy`) before sketches use it. No migration is needed: the worker already uses SQLite-backed Durable Objects, which also run the expiry alarm. Against an older worker, a sketch with `keep` still works, but `shareKept` stays `false` and `shareClear()` sets `shareError` ("Unexpected message type: clear"). Kept rooms cost one stored copy per room. Writes are debounced to once a second, so a busy room stays inside the free tier.

## Quiet: a page that does not read the other phones' values

By default the server sends every change in `me` from every phone to every other phone. In a room of n phones that is n times n messages. 30 phones sending 10 times a second make about 8,700 messages a second out of the room. 60 phones lag, and a small board cannot take it at all.

Many pages do not need those messages. A class-wide phone page reads only `shared`, because the projector adds up the phones and writes `shared.average`. A board reads `shared.average` too. Only the projector needs every phone's `me`. The **quiet** option lets a phone say so:

```js
shareSetup({
  host: 'https://p5-phone-share.YOUR_SUBDOMAIN.workers.dev',
  room: 'class',
  me: { role: 'phone' },
  quiet: true         // this phone reads shared.average, not the other phones' values
});
```

- **Each phone chooses for itself.** The projector page does not set `quiet`, so it still sees every phone. A room can mix quiet and ordinary pages.
- **A quiet phone still sends.** Its own `me` and `shared` changes reach everyone else, as before.
- **What a quiet phone still gets.** `shared` (every change), events (`shareEvent`), joins and leaves, `shareClear()`, and the keep messages.
- **What `guests` holds.** `guests` tells you who is here, and each one's `role` and `name`. It does not give live values. Each entry is a snapshot of that phone's `me`. It is taken when you join, and taken again each time anyone joins or leaves. In between, it does not change. Put `role` and `name` in the `me` you give `shareSetup()`, so they are there from the start. A value that a phone changes later (`me.x = ...`) does not reach a quiet page.
- **If you need live values, do not be quiet.** Or have the projector add the values up and write the total to `shared`.
- **Status.** `shareQuiet` is `true` once the server has said it went quiet for this phone. Against an older worker it stays `false`, the console says so, and the sketch gets everything, as it did before.
- **What it saves.** With 29 quiet phones and one projector, the room sends about 290 `me` messages a second instead of 8,700, and each quiet phone is sent about 5 messages a second (the `shared.average` writes) instead of about 290. `test-share-quiet-e2e.js` measures it.
- **What it does not save.** Joins and leaves are the same for everyone. Each one sends the whole guest list, with every guest's `me`. While 30 phones join one by one, that is about 45 KB in all. An Arduino board using the P5PhoneShareArduino library asks for it with `share.setQuiet(true)`.

**Server update needed.** Redeploy the worker (`npx wrangler deploy`) before sketches use `quiet`. Nothing else changes: no migration, no new binding. Until the worker is redeployed, a quiet sketch works but is not quiet.

## Free tier notes

Durable Objects work on the Workers Free plan. Hibernation keeps idle cost near zero. **Deploy your own worker for your project** — do not point coursework at someone else’s relay.

## Roadmap

1. Ephemeral rooms + URL/QR join links (this version)
2. **Done on branch `feat/share-keep` (not released):** keep `shared` between visits (Durable Object storage), with an expiry (TTL) and `shareClear()`. See "Keep the room between visits"
3. Remember host in `localStorage`; short room codes only day-to-day
4. One-click / agent Cloudflare deploy that prints a ready join URL
5. Optional adapters (Supabase, Vercel + Redis) behind the same client protocol
6. **Done on branch `feat/share-quiet` (not released):** `quiet` for phones and boards that do not read other phones' `me`. See "Quiet"
7. `shareThrottle(ms)` for high-rate sensor writes into `me`

## License

MIT — same as p5-phone.
