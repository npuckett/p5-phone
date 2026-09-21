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
# host: 'http://127.0.0.1:8787' — phones must reach your computer on the LAN
```

Prefer `wrangler deploy` for anything you share with other people.

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

See [PROTOCOL.md](./PROTOCOL.md) for the wire format.

## Free tier notes

Durable Objects work on the Workers Free plan. Hibernation keeps idle cost near zero. **Deploy your own worker for your project** — do not point coursework at someone else’s relay.

## Roadmap

1. Ephemeral rooms + URL/QR join links (this version)
2. Persist `shared` to DO SQLite; TTL / `shareClear`
3. Remember host in `localStorage`; short room codes only day-to-day
4. One-click / agent Cloudflare deploy that prints a ready join URL
5. Optional adapters (Supabase, Vercel + Redis) behind the same client protocol
6. `shareThrottle(ms)` for high-rate sensor writes into `me`

## License

MIT — same as p5-phone.
