#!/usr/bin/env node
/**
 * End-to-end checks for Share: real browsers talking to the real companion worker.
 * Starts `wrangler dev` for companion/P5PhoneShare on 127.0.0.1:8788, opens several
 * emulated phones with Playwright's Chromium, and checks what a class would hit:
 * joining from every activation style, late joiners, shared/me/guests sync, events,
 * host handoff, reconnect, room reset, URL join links, and the share examples.
 *
 * Needs: npx playwright install chromium; (cd companion/P5PhoneShare && npm install);
 * network access for the p5.js 2.x CDN build.
 * Run: node test-share-e2e.js   (or: npm run test:share)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9998';
const PORT = 8788;
const HOST = `http://127.0.0.1:${PORT}`;
const P5_1 = ['/node_modules/p5/lib/p5.js'];
const P5_2 = ['https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js'];
const SERVER_DIR = path.join(__dirname, 'companion', 'P5PhoneShare');
const RUN = Date.now().toString(36);

const STYLES = {
  tap: { call: `enableShareTap({ label: 'join' });`, selector: '#tapOverlay' },
  button: { call: `enableShareButton({ label: 'join' });`, selector: '#permissionButton' },
  banner: { call: `enableShareBanner({ label: 'join' });`, selector: '#permissionBanner' },
  minimal: { call: `enableShareMinimal({ label: 'join' });`, selector: '#minimalOverlay' },
  canvas: { call: `enableShareCanvas({ label: 'join' });`, selector: 'canvas' },
  on: { call: `enableShareOn('#customBtn');`, selector: '#customBtn' },
};

const rows = [];
function check(scenario, name, ok, detail) {
  rows.push({ scenario, check: name, ok: !!ok, detail: detail === undefined ? '' : String(detail).slice(0, 90) });
}

// ---------- local worker ----------

function waitForHttp(url, ms) {
  const end = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http.get(url, (res) => { res.resume(); resolve(); }).on('error', () => {
        if (Date.now() > end) reject(new Error('worker did not start: ' + url));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

function startWorker() {
  const child = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1'], {
    cwd: SERVER_DIR,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  child.getLog = () => log;
  return child;
}

// ---------- pages ----------

function sketch({ config, pre = '', enable }) {
  return `
window.evlog = [];
function setup(){
  createCanvas(windowWidth, windowHeight);
  shareSetup(${JSON.stringify(config)});
  ${pre}
  ${enable}
  window.ready = true;
}
function draw(){ background(40); }
function shareReady(){ evlog.push('ready'); }
function shareReceive(p, v){ evlog.push('recv:' + p); }
function shareEvent(n, d){ evlog.push('event:' + n + ':' + JSON.stringify(d)); }
function shareHostChanged(h){ evlog.push('host:' + h); }
function shareClosed(){ evlog.push('closed'); }
function mouseReleased(){ evlog.push('mouseReleased'); }`;
}

function html(scripts, body) {
  const tags = scripts.concat('/src/p5-phone.js').map((s) => `<script src="${s}"></script>`).join('');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${tags}</head>
<body style="margin:0"><button id="customBtn" style="position:fixed;bottom:10px;left:10px;z-index:5;padding:20px">custom</button>
<script>${body}</script></body></html>`;
}

async function route(p, pageHtml) {
  // p5-phone from the CDN or the local dist build is always served from src/, so the
  // examples are tested against the code in this checkout.
  await p.route(/cdn\.jsdelivr\.net\/npm\/p5-phone@[^/]+\/dist\/p5-phone(\.min)?\.js/, (r) =>
    r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, 'src/p5-phone.js')) }));
  await p.route(ORIGIN + '/**', (r) => {
    let pathname = decodeURIComponent(new URL(r.request().url()).pathname);
    if (pathname === '/' && pageHtml) return r.fulfill({ contentType: 'text/html', body: pageHtml });
    if (/\/dist\/p5-phone(\.min)?\.js$/.test(pathname)) pathname = '/src/p5-phone.js';
    const file = path.join(__dirname, pathname);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return r.fulfill({ status: 404, body: '' });
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'application/javascript';
    return r.fulfill({ contentType: type, body: fs.readFileSync(file) });
  });
}

// sendDelay simulates a phone on a slow network: every outgoing frame leaves late (in order).
async function newContext(browser, { touch = false, sendDelay = 0 } = {}) {
  const ctx = await browser.newContext(touch ? devices['Pixel 7'] : { viewport: { width: 800, height: 600 } });
  await ctx.addInitScript((delay) => {
    window.__wsSent = [];
    const orig = WebSocket.prototype.send;
    WebSocket.prototype.send = function (d) {
      window.__wsSent.push(d);
      if (delay) setTimeout(() => orig.call(this, d), delay);
      else orig.call(this, d);
    };
  }, sendDelay);
  return ctx;
}

async function openClient(ctx, { p5 = P5_2, config, pre, style = 'tap', query = '' }) {
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await route(p, html(p5, sketch({ config, pre, enable: STYLES[style].call })));
  await p.goto(ORIGIN + '/' + query);
  await p.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  return p;
}

async function tapToJoin(p, style = 'tap', touch = false) {
  const selector = STYLES[style].selector;
  await p.waitForSelector(selector);
  await p.waitForTimeout(style === 'banner' ? 500 : 150);
  const box = await p.locator(selector).first().boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (touch) await p.touchscreen.tap(x, y);
  else await p.mouse.click(x, y);
  return waitFor(p, () => window.shareConnected === true, 8000);
}

async function waitFor(p, fn, ms = 4000, arg) {
  try {
    await p.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
    return true;
  } catch (e) {
    return false;
  }
}

const state = (p) => p.evaluate(() => ({
  connected: window.shareConnected,
  isHost: window.shareIsHost,
  id: window.shareClientId,
  status: window.shareStatus,
  error: window.shareError,
  room: window.shareRoom,
  shared: JSON.parse(JSON.stringify(window.shared)),
  me: JSON.parse(JSON.stringify(window.me)),
  guests: window.guests.map((g) => Object.assign({ id: g.id }, JSON.parse(JSON.stringify(g)))),
  evlog: (window.evlog || []).slice(),
  pressed: window.mouseIsPressed,
  touches: (window.touches || []).length,
}));

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const patchCount = (p) => p.evaluate(() => window.__wsSent.filter((s) => /"type":"(patch|batch)"/.test(s)).length);

// ---------- scenarios ----------

async function coreSync(browser) {
  const S = 'core';
  const room = `core-${RUN}`;
  const ctxA = await newContext(browser, { touch: true });
  const ctxB = await newContext(browser);
  const A = await openClient(ctxA, { config: { host: HOST, room, shared: { score: 0, nested: { a: 1 } }, me: { name: 'A', x: 0 } } });
  check(S, 'A joins by tap', await tapToJoin(A, 'tap', true));
  await waitFor(A, () => window.evlog.includes('ready'));
  let a = await state(A);
  check(S, 'first joiner is host and seeds shared', a.isHost && eq(a.shared, { score: 0, nested: { a: 1 } }), JSON.stringify(a.shared));
  check(S, 'shareReady fired', a.evlog.includes('ready'));
  check(S, 'enabling tap leaves p5 released', a.pressed === false && a.touches === 0, `pressed=${a.pressed} touches=${a.touches}`);

  const B = await openClient(ctxB, { style: 'button', config: { host: HOST, room, shared: { score: 99, other: true }, me: { name: 'B' } } });
  check(S, 'B joins by button', await tapToJoin(B, 'button'));
  let b = await state(B);
  check(S, 'late joiner gets room state, not its own seed', eq(b.shared, { score: 0, nested: { a: 1 } }) && !b.isHost, JSON.stringify(b.shared));
  check(S, 'late joiner sees existing guest', b.guests.some((g) => g.id === a.id && g.name === 'A'), JSON.stringify(b.guests));
  check(S, 'existing guest sees late joiner', await waitFor(A, (id) => window.guests.some((g) => g.id === id && g.name === 'B'), 4000, b.id));
  check(S, 'guests never includes yourself', !b.guests.some((g) => g.id === b.id) && !(await state(A)).guests.some((g) => g.id === a.id));

  await A.evaluate(() => { shared.score = 5; });
  check(S, 'shared set propagates', await waitFor(B, () => shared.score === 5));
  check(S, 'shareReceive fires on remote patch', (await state(B)).evlog.includes('recv:score'));
  await A.evaluate(() => { shared.nested.a = 2; });
  check(S, 'nested set propagates', await waitFor(B, () => shared.nested && shared.nested.a === 2));
  await A.evaluate(() => { delete shared.nested; });
  check(S, 'delete propagates', await waitFor(B, () => !('nested' in shared)));
  await B.evaluate(() => { shareSet('deep.path.x', 3); });
  check(S, 'shareSet dotted path propagates', await waitFor(A, () => shared.deep && shared.deep.path && shared.deep.path.x === 3));
  await A.evaluate(() => { me.x = 0.7; });
  check(S, 'me set shows in others\' guests', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.x === 0.7), 4000, a.id));

  await A.evaluate(() => { shareEmit('boom', { k: 1 }); });
  check(S, 'shareEmit reaches others', await waitFor(B, () => window.evlog.includes('event:boom:{"k":1}')));
  await A.waitForTimeout(200);
  check(S, 'shareEmit does not echo to sender', !(await state(A)).evlog.some((e) => e.startsWith('event:boom')));

  await A.evaluate(() => { shared.list = [1, 2]; });
  check(S, 'array assignment propagates', await waitFor(B, () => Array.isArray(shared.list) && shared.list.join() === '1,2'));
  await A.evaluate(() => { shared.list.push(3); });
  check(S, 'array push propagates', await waitFor(B, () => Array.isArray(shared.list) && shared.list.join() === '1,2,3', 2000),
    JSON.stringify((await state(B)).shared.list));
  await A.evaluate(() => { shared.list[0] = 9; });
  check(S, 'array index set propagates', await waitFor(B, () => Array.isArray(shared.list) && shared.list[0] === 9, 2000),
    JSON.stringify((await state(B)).shared.list));

  // A sketch that writes me.x = mouseX every frame should not flood the worker while the value is unchanged.
  const before = await patchCount(A);
  await A.evaluate(() => { for (let i = 0; i < 10; i++) me.x = 0.25; });
  await A.waitForTimeout(300);
  const sent = (await patchCount(A)) - before;
  check(S, 'unchanged value is not re-sent', sent <= 1, `${sent} patches for 10 identical writes`);

  // A one-second drag that writes me.x and me.y every frame is sent in batches.
  const beforeDrag = await patchCount(A);
  await A.evaluate(() => new Promise((resolve) => {
    let i = 0;
    const t = setInterval(() => { me.x = i / 100; me.y = 1 - i / 100; if (++i >= 60) { clearInterval(t); resolve(); } }, 16);
  }));
  await A.waitForTimeout(200);
  const dragFrames = (await patchCount(A)) - beforeDrag;
  check(S, 'per-frame drag is batched', dragFrames <= 30, `${dragFrames} frames for 120 writes in 1 s`);
  check(S, 'batched drag arrives intact', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.x === 59 / 100 && g.y === 1 - 59 / 100), 3000, a.id));

  // A client must not be able to reach Object.prototype on the worker or on other phones.
  const pv = await B.evaluate(() => {
    const v = typeof _SHARE_PROTOCOL_VERSION !== 'undefined' ? _SHARE_PROTOCOL_VERSION : 1;
    _shareSocket.send(JSON.stringify({ type: 'patch', v, scope: 'shared', path: '__proto__.polluted', value: 'yes' }));
    _shareSocket.send(JSON.stringify({ type: 'patch', v, scope: 'shared', path: 'constructor.prototype.polluted2', value: 'yes' }));
    return v;
  });
  await A.waitForTimeout(600);
  const polluted = await A.evaluate(() => ({}).polluted === 'yes' || ({}).polluted2 === 'yes');
  check(S, '__proto__ path cannot pollute other phones', !polluted, `protocol v${pv}`);
  const probe = await openClient(await newContext(browser), { config: { host: HOST, room, me: { name: 'probe' } } });
  await tapToJoin(probe);
  const pr = await probe.evaluate(() => ({ polluted: ({}).polluted === 'yes', keys: Object.keys(shared) }));
  check(S, '__proto__ path cannot pollute the worker', !pr.polluted && !pr.keys.includes('__proto__') && !pr.keys.includes('constructor'), pr.keys.join(','));
  check(S, 'worker rejects the bad path', /path/i.test(await B.evaluate(() => window.shareError)), await B.evaluate(() => window.shareError));
  check(S, 'a rejected write does not drop the connection', await B.evaluate(() => window.shareConnected && window.shareStatus === 'connected'));
  await probe.context().close();

  // Something set before joining (a random color in setup) must survive the join.
  const C = await openClient(await newContext(browser, { touch: true }), {
    config: { host: HOST, room, me: { name: 'C' } },
    pre: `me.color = 'red';`,
  });
  await tapToJoin(C, 'tap', true);
  const c = await state(C);
  check(S, 'me set before joining survives the join', c.me.color === 'red', JSON.stringify(c.me));
  check(S, 'others see me set before joining', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.color === 'red'), 3000, c.id));

  // Reconnect: drop B's socket and let auto-reconnect bring it back with its state.
  await B.evaluate(() => { me.status = 'here'; });
  await waitFor(A, (id) => window.guests.some((g) => g.id === id && g.status === 'here'), 3000, b.id);
  // A coded close stands in for a network drop (the worker answers it, so onclose fires).
  await B.evaluate(() => { _shareSocket.close(4000, 'test drop'); });
  check(S, 'shareClosed fires on drop', await waitFor(B, () => window.evlog.includes('closed')));
  check(S, 'auto-reconnects', await waitFor(B, () => window.shareConnected === true, 10000));
  b = await state(B);
  check(S, 'me survives reconnect', b.me.status === 'here' && b.me.name === 'B', JSON.stringify(b.me));
  check(S, 'shared survives reconnect', b.shared.score === 5, JSON.stringify(b.shared));
  check(S, 'others see reconnected me', await waitFor(A, (id) => window.guests.some((g) => g.id === id && g.status === 'here'), 4000, b.id));
  check(S, 'old connection is gone from guests', !(await state(A)).guests.some((g) => g.name === 'B' && g.status !== 'here'));

  // A phone that locks its screen leaves at once, and rejoins with its state when it wakes.
  const setHidden = (p, hidden) => p.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  const cId = (await state(C)).id;
  await setHidden(C, true);
  check(S, 'hidden phone disconnects', await waitFor(C, () => !window.shareConnected && window.shareStatus === 'idle', 3000));
  check(S, 'hidden phone leaves guests at once', await waitFor(B, (id) => !window.guests.some((g) => g.id === id), 3000, cId));
  await C.waitForTimeout(2500);
  check(S, 'hidden phone does not auto-reconnect', !(await C.evaluate(() => window.shareConnected)));
  await setHidden(C, false);
  check(S, 'visible again: rejoins', await waitFor(C, () => window.shareConnected === true, 6000));
  check(S, 'visible again: me kept', (await state(C)).me.color === 'red');
  check(S, 'visible again: others see it', await waitFor(B, () => window.guests.some((g) => g.name === 'C' && g.color === 'red'), 4000));

  // Host handoff: the host leaves.
  await ctxA.close();
  check(S, 'host leaves: a remaining phone becomes host', await waitFor(B, () => window.shareIsHost === true, 6000)
    || await waitFor(C, () => window.shareIsHost === true, 1000));
  check(S, 'host leaves: removed from guests', await waitFor(B, (id) => !window.guests.some((g) => g.id === id), 4000, a.id));
  const onlyOneHost = (await B.evaluate(() => window.shareIsHost)) !== (await C.evaluate(() => window.shareIsHost));
  check(S, 'exactly one host', onlyOneHost);
  check(S, 'no page errors', !B.errors.length && !C.errors.length, B.errors.concat(C.errors).join(' | '));
  await ctxB.close();
  await C.context().close();

  // Everyone left: the next joiner seeds a fresh room.
  await new Promise((r) => setTimeout(r, 800));
  const D = await openClient(await newContext(browser), { config: { host: HOST, room, shared: { fresh: 1 } } });
  await tapToJoin(D);
  const d = await state(D);
  check(S, 'empty room resets and reseeds', eq(d.shared, { fresh: 1 }) && d.isHost, JSON.stringify(d.shared));
  await D.context().close();
}

// Two phones write the same key at nearly the same time; one is on a slow network.
// Every phone must end up agreeing with the worker.
async function concurrentWrites(browser) {
  const S = 'concurrent';
  const room = `conc-${RUN}`;
  const X = await openClient(await newContext(browser), { config: { host: HOST, room, shared: { color: 'none' } } });
  const Y = await openClient(await newContext(browser, { sendDelay: 300 }), { config: { host: HOST, room } });
  await tapToJoin(X);
  await tapToJoin(Y);
  await Y.waitForTimeout(700);
  await Y.evaluate(() => { shared.color = 'blue'; }); // leaves Y 300 ms later
  await X.waitForTimeout(60);
  await X.evaluate(() => { shared.color = 'red'; }); // reaches the worker first
  await X.waitForTimeout(1500);
  const Z = await openClient(await newContext(browser), { config: { host: HOST, room } });
  await tapToJoin(Z);
  const [x, y, z] = [await state(X), await state(Y), await state(Z)];
  check(S, 'all phones converge on the worker value', x.shared.color === z.shared.color && y.shared.color === z.shared.color,
    `X=${x.shared.color} Y=${y.shared.color} worker=${z.shared.color}`);

  // Rapid local writes must not be rewound by their own echoes (dragging a shared value).
  await X.evaluate(() => { for (let i = 1; i <= 20; i++) shared.drag = i; });
  const seen = await X.evaluate(() => new Promise((resolve) => {
    const vals = [];
    const t = setInterval(() => vals.push(shared.drag), 10);
    setTimeout(() => { clearInterval(t); resolve(vals); }, 600);
  }));
  check(S, 'own writes are not rewound by echoes', seen.every((v) => v === 20), `saw ${[...new Set(seen)].join(',')}`);
  check(S, 'others get the final dragged value', await waitFor(Z, () => shared.drag === 20));

  // A remote write that replaces a parent object must not wipe a pending local child write.
  await Y.evaluate(() => { shared.pos = { x: 1, y: 1 }; });
  await X.waitForTimeout(800);
  await Y.evaluate(() => { shared.pos.x = 5; }); // slow, so the worker applies it second
  await X.waitForTimeout(40);
  await X.evaluate(() => { shared.pos = { x: 2, y: 2 }; });
  await X.waitForTimeout(1500);
  const [x2, y2, z2] = [await state(X), await state(Y), await state(Z)];
  check(S, 'parent replace + child write converge', eq(x2.shared.pos, z2.shared.pos) && eq(y2.shared.pos, z2.shared.pos),
    `X=${JSON.stringify(x2.shared.pos)} Y=${JSON.stringify(y2.shared.pos)} Z=${JSON.stringify(z2.shared.pos)}`);
  for (const p of [X, Y, Z]) await p.context().close();
}

async function styles(browser) {
  for (const [ver, scripts] of [['2.x', P5_2], ['1.x', P5_1]]) {
    const list = ver === '2.x' ? Object.keys(STYLES) : ['tap', 'button'];
    for (const style of list) {
      const S = `style ${ver}`;
      const ctx = await newContext(browser, { touch: true });
      const p = await openClient(ctx, { p5: scripts, style, config: { host: HOST, room: `style-${style}-${ver}-${RUN}` } });
      const joined = await tapToJoin(p, style, true);
      await p.waitForTimeout(300);
      const s = await state(p);
      check(S, `${style}: joins, p5 released`, joined && s.pressed === false && s.touches === 0 && !p.errors.length,
        `joined=${joined} pressed=${s.pressed} touches=${s.touches} ${p.errors.join(' | ')}`);
      await ctx.close();
    }
  }
}

async function joinLink(browser) {
  const S = 'join link';
  const q = `?shareHost=${encodeURIComponent(HOST)}&room=link-${RUN}&app=cls`;
  const p = await openClient(await newContext(browser), { query: q, config: { host: 'https://wrong.invalid', room: 'wrong' } });
  const joined = await tapToJoin(p);
  const s = await state(p);
  check(S, 'URL params override config', joined && s.room === `cls:link-${RUN}`, s.room);
  const url = await p.evaluate(() => getShareJoinUrl());
  const u = new URL(url);
  check(S, 'getShareJoinUrl carries host/room/app', u.searchParams.get('shareHost') === HOST && u.searchParams.get('room') === `link-${RUN}` && u.searchParams.get('app') === 'cls', url);
  await p.context().close();

  const bad = await openClient(await newContext(browser), { config: { host: 'http://127.0.0.1:1', room: 'nope' } });
  await bad.mouse.click(400, 300);
  const failed = await waitFor(bad, () => window.shareStatus === 'error' && window.shareConnected === false, 5000);
  check('errors', 'unreachable host reports error status', failed, await bad.evaluate(() => window.shareStatus + ' ' + window.shareError));
  await bad.context().close();
}

async function examples(browser) {
  const dir = 'examples/Phone Sensor Examples/share';
  for (const name of fs.readdirSync(path.join(__dirname, dir)).sort()) {
    const S = 'example';
    const q = `?shareHost=${encodeURIComponent(HOST)}&room=ex-${name}-${RUN}`;
    const url = `${ORIGIN}/${dir.split('/').map(encodeURIComponent).join('/')}/${name}/index.html${q}`;
    const phones = [];
    for (let i = 0; i < 2; i++) {
      const ctx = await newContext(browser, { touch: true });
      const p = await ctx.newPage();
      p.errors = [];
      p.on('pageerror', (e) => p.errors.push(e.message));
      await route(p);
      await p.goto(url);
      await waitFor(p, () => typeof window.shareStatus === 'string' && document.querySelector('canvas'), 20000);
      await p.waitForTimeout(400);
      const overlay = await p.$('#tapOverlay,#permissionButton,#permissionBanner,#minimalOverlay');
      if (overlay) {
        const box = await overlay.boundingBox();
        await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await p.touchscreen.tap(200, 400);
      }
      await waitFor(p, () => window.shareConnected === true, 8000);
      phones.push(p);
    }
    const [p1, p2] = phones;
    const box = await p1.locator('canvas').boundingBox();
    await p1.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await p1.waitForTimeout(800);
    const s1 = await state(p1);
    const s2 = await state(p2);
    const sees = s2.guests.some((g) => g.id === s1.id) || eq(s1.shared, s2.shared);
    check(S, `${name}: two phones join and see each other`, s1.connected && s2.connected && sees && !p1.errors.length && !p2.errors.length,
      `c=${s1.connected}/${s2.connected} guests=${s2.guests.length} ${p1.errors.concat(p2.errors).join(' | ')}`);
    for (const p of phones) await p.context().close();
  }
}

(async () => {
  const worker = startWorker();
  let browser;
  const stop = () => { try { process.kill(-worker.pid); } catch (e) { /* already gone */ } };
  process.on('exit', stop);
  try {
    await waitForHttp(HOST + '/', 60000);
    // The test pages come from Playwright's router, so Chromium treats them as public and
    // blocks their WebSocket to 127.0.0.1. Real sketches reach a public workers.dev URL.
    browser = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks'] });
    await coreSync(browser);
    await concurrentWrites(browser);
    await styles(browser);
    await joinLink(browser);
    await examples(browser);
  } catch (err) {
    console.error(err);
    check('harness', 'ran to completion', false, err.message);
    if (process.env.SHARE_E2E_LOG) console.error(worker.getLog());
  } finally {
    if (browser) await browser.close();
    stop();
  }
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
