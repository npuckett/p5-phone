#!/usr/bin/env node
/**
 * End-to-end checks for the Share keep option: a room that holds on to `shared` after the
 * last phone leaves, for a time, until someone clears it.
 *
 * Starts `wrangler dev` for companion/P5PhoneShare on 127.0.0.1:8793 (and, for the
 * compatibility checks, the last released server on 8794), then
 *   1. talks to the server over raw WebSockets (the wire format, timing, limits), and
 *   2. drives emulated phones in Chromium with the real client (src/p5-phone.js).
 *
 * The compatibility checks need the last release's code: they read it with
 * `git archive <ref>`, where the ref is v1.15.4 or SHARE_OLD_REF. The worker keeps its
 * state in a temporary folder, so a run leaves nothing behind.
 *
 * Needs: npx playwright install chromium; (cd companion/P5PhoneShare && npm install);
 * network access once, for the p5.js 2.x build (if it fails, the local p5 1.x is used).
 * Run: node test-share-keep-e2e.js   (or: npm run test:share-keep)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9998';
const PORT = 8793;
const OLD_PORT = 8794;
const HOST = `http://127.0.0.1:${PORT}`;
const OLD_HOST = `http://127.0.0.1:${OLD_PORT}`;
const SERVER_DIR = path.join(__dirname, 'companion', 'P5PhoneShare');
const LIB = path.join(__dirname, process.env.SHARE_E2E_LIB || 'src/p5-phone.js');
const OLD_REF = process.env.SHARE_OLD_REF || 'v1.15.4';
const RUN = Date.now().toString(36);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'share-keep-e2e-'));
const DAY = 24 * 60 * 60 * 1000;
const P5_2_URL = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';

const rows = [];
function check(scenario, name, ok, detail) {
  rows.push({ scenario, check: name, ok: !!ok, detail: detail === undefined ? '' : String(detail).slice(0, 90) });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- local workers ----------

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

function startWorker({ dir, port, inspector, state }) {
  const wrangler = path.join(SERVER_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const child = spawn(process.execPath, [wrangler, 'dev', '--port', String(port), '--ip', '127.0.0.1',
    '--inspector-port', String(inspector), '--persist-to', state], {
    cwd: dir,
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

// The last release: its worker and its client, read from git so they cannot drift.
function prepareOldRelease() {
  const dir = path.join(WORK, 'old');
  fs.mkdirSync(dir);
  const tar = execFileSync('git', ['archive', OLD_REF, 'companion/P5PhoneShare', 'src/p5-phone.js'],
    { cwd: __dirname, maxBuffer: 256 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  const serverDir = path.join(dir, 'companion', 'P5PhoneShare');
  fs.symlinkSync(path.join(SERVER_DIR, 'node_modules'), path.join(serverDir, 'node_modules'));
  return { serverDir, lib: path.join(dir, 'src', 'p5-phone.js') };
}

// ---------- raw WebSocket client (the wire format) ----------

const WS = typeof WebSocket !== 'undefined' ? WebSocket : require(path.join(SERVER_DIR, 'node_modules', 'ws'));

function wireUrl(host, room) {
  return host.replace(/^http/, 'ws') + '/parties/share-room/' + encodeURIComponent('wire:' + room);
}

class Wire {
  constructor(host, room) {
    this.room = room;
    this.msgs = [];
    this.ws = new WS(wireUrl(host, room));
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error('wire: could not open ' + room));
    });
    this.ws.onmessage = (e) => {
      try { this.msgs.push(JSON.parse(String(e.data))); } catch (err) { /* ignore */ }
    };
  }
  send(obj) { this.ws.send(JSON.stringify(Object.assign({ v: 2 }, obj))); }
  of(type) { return this.msgs.filter((m) => m.type === type); }
  async waitFor(pred, ms = 3000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = this.msgs.find(pred);
      if (hit) return hit;
      await sleep(25);
    }
    return null;
  }
  async hello({ me = {}, shared, keep } = {}) {
    await this.ready;
    const msg = { type: 'hello', app: 'wire', room: this.room, me };
    if (shared !== undefined) msg.shared = shared;
    if (keep !== undefined) msg.keep = keep;
    this.send(msg);
    return this.waitFor((m) => m.type === 'welcome');
  }
  // Write and wait for the server's echo, so the write has been applied.
  async write(path, value) {
    const before = this.msgs.length;
    this.send({ type: 'patch', scope: 'shared', path, value });
    await this.waitFor((m) => (m.type === 'patch' || m.type === 'error') && this.msgs.indexOf(m) >= before, 3000);
  }
  close() { try { this.ws.close(1000, 'bye'); } catch (e) { /* ignore */ } }
}

async function joinWire(host, room, opts) {
  const w = new Wire(host, room);
  w.welcome = await w.hello(opts);
  return w;
}

// ---------- the wire-level checks ----------

async function wireChecks(worker) {
  let S = 'wire: policy';
  const R = (n) => `${n}-${RUN}`;

  // keep: the first phone sets the policy; later ones are told it
  let a = await joinWire(HOST, R('pol'), { shared: { a: 1 }, keep: { expire: 60000 } });
  check(S, 'welcome says the room is kept, with its time', a.welcome.keep && a.welcome.keep.expire === 60000
    && a.welcome.keep.remaining <= 60000 && a.welcome.keep.remaining > 58000, JSON.stringify(a.welcome.keep));
  let b = await joinWire(HOST, R('pol'), { shared: { b: 2 }, keep: { expire: 120000 } });
  check(S, 'a second phone with another time gets the first policy', b.welcome.keep && b.welcome.keep.expire === 60000,
    JSON.stringify(b.welcome.keep));
  check(S, 'a second phone\'s seed is ignored', eq(b.welcome.shared, { a: 1 }) && !b.welcome.isHost);
  let c = await joinWire(HOST, R('pol'), {});
  check(S, 'a phone that asks for no keep still gets the kept room', c.welcome.keep && c.welcome.keep.expire === 60000);
  [a, b, c].forEach((w) => w.close());

  a = await joinWire(HOST, R('pol-nokeep'), { shared: { a: 1 } });
  check(S, 'a room without keep has no keep field', a.welcome.keep === undefined);
  b = await joinWire(HOST, R('pol-nokeep'), { keep: { expire: 5000 } });
  check(S, 'asking for keep in an open room without it is ignored', b.welcome.keep === undefined);
  [a, b].forEach((w) => w.close());

  a = await joinWire(HOST, R('pol-true'), { keep: true });
  check(S, 'keep: true is 7 days', a.welcome.keep && a.welcome.keep.expire === 7 * DAY, JSON.stringify(a.welcome.keep));
  b = await joinWire(HOST, R('pol-max'), { keep: { expire: 99 * DAY } });
  check(S, 'over 30 days is cut to 30 days', b.welcome.keep && b.welcome.keep.expire === 30 * DAY);
  c = await joinWire(HOST, R('pol-min'), { keep: { expire: 5 } });
  check(S, 'under 1 second is raised to 1 second', c.welcome.keep && c.welcome.keep.expire === 1000);
  let d = await joinWire(HOST, R('pol-bad'), { keep: 'forever' });
  check(S, 'a keep value the server does not understand means no keep', d.welcome.keep === undefined);
  let e = await joinWire(HOST, R('pol-bad2'), { keep: { expire: 'soon' } });
  check(S, 'a bad expire falls back to 7 days', e.welcome.keep && e.welcome.keep.expire === 7 * DAY);
  [a, b, c, d, e].forEach((w) => w.close());

  // kept: the deadline moves with each change
  S = 'wire: kept message';
  a = await joinWire(HOST, R('kmsg'), { keep: { expire: 60000 } });
  b = await joinWire(HOST, R('kmsg'), {});
  await a.write('x', 1);
  const kept = await b.waitFor((m) => m.type === 'kept', 4000);
  check(S, 'a change makes the server send "kept" to everyone', kept && kept.expire === 60000 && kept.remaining > 58000 && kept.remaining <= 60000,
    JSON.stringify(kept));
  check(S, 'the sender gets it too', !!(await a.waitFor((m) => m.type === 'kept', 1000)));
  [a, b].forEach((w) => w.close());

  // persistence: shared survives the last phone leaving; me and guests do not
  S = 'wire: persistence';
  a = await joinWire(HOST, R('keep'), { shared: { n: 0 }, me: { name: 'one' }, keep: { expire: 60000 } });
  await a.write('mark', 'x');
  a.close(); // no waiting for the one-second write delay: leaving saves at once
  await sleep(400);
  b = await joinWire(HOST, R('keep'), { me: { name: 'two' }, shared: { other: 1 } });
  check(S, 'a kept room still has shared after everyone left', eq(b.welcome.shared, { n: 0, mark: 'x' }), JSON.stringify(b.welcome.shared));
  check(S, 'the next phone is host', b.welcome.isHost === true);
  check(S, 'guests are not kept', b.welcome.guests.length === 0);
  check(S, 'the policy is still there', b.welcome.keep && b.welcome.keep.expire === 60000);
  check(S, 'the next phone\'s own seed is ignored', b.welcome.shared.other === undefined);
  await b.write('mark2', 'y');
  b.close();
  await sleep(400);
  c = await joinWire(HOST, R('keep'), {});
  check(S, 'and again after a second visit', eq(c.welcome.shared, { n: 0, mark: 'x', mark2: 'y' }));
  c.close();

  a = await joinWire(HOST, R('open'), { shared: { n: 0 }, me: { name: 'one' } });
  await a.write('mark', 'x');
  a.close();
  await sleep(400);
  b = await joinWire(HOST, R('open'), { shared: { fresh: 1 } });
  check(S, 'a room without keep is cleared when the last phone leaves', eq(b.welcome.shared, { fresh: 1 }) && b.welcome.isHost, JSON.stringify(b.welcome.shared));
  b.close();

  // a quick leave: the value is saved even if the debounce has not run
  a = await joinWire(HOST, R('quick'), { keep: { expire: 60000 } });
  a.send({ type: 'patch', scope: 'shared', path: 'q', value: 7 });
  a.close();
  await sleep(400);
  b = await joinWire(HOST, R('quick'), {});
  check(S, 'a write made just before leaving is kept', b.welcome.shared.q === 7, JSON.stringify(b.welcome.shared));
  b.close();

  // expiry
  S = 'wire: expiry';
  a = await joinWire(HOST, R('exp'), { shared: { v: 1 }, keep: { expire: 3000 } });
  await a.write('mark', 'x');
  a.close();
  const leftAt = Date.now();
  await sleep(4800);
  const log1 = worker.getLog();
  check(S, 'the alarm deletes the room (wrangler dev runs alarms)', /kept room deleted \(time ran out, alarm\)/.test(log1),
    (log1.match(/kept room deleted[^\n]*/g) || ['no log line']).join(' / '));
  b = await joinWire(HOST, R('exp'), { shared: { fresh: 1 } });
  check(S, 'after the time, the value is gone', eq(b.welcome.shared, { fresh: 1 }) && b.welcome.isHost && b.welcome.keep === undefined,
    `${Date.now() - leftAt} ms after leaving: ${JSON.stringify(b.welcome.shared)}`);
  b.close();

  // each change pushes the deadline; a visit does not
  const t0 = Date.now();
  const at = (ms) => sleep(Math.max(0, t0 + ms - Date.now()));
  a = await joinWire(HOST, R('move'), { keep: { expire: 4000 } });
  await a.write('k1', 1);
  a.close();
  await at(2500);
  b = await joinWire(HOST, R('move'), {});
  await b.write('k2', 2); // the deadline is now about t0 + 6.6 s
  b.close();
  await at(5000); // past the first deadline (t0 + 4.1 s)
  c = await joinWire(HOST, R('move'), {});
  check(S, 'a change pushes the deadline forward', eq(c.welcome.shared, { k1: 1, k2: 2 }), `${Date.now() - t0} ms: ${JSON.stringify(c.welcome.shared)}`);
  c.close(); // a visit with no change
  await at(8200); // past the moved deadline
  d = await joinWire(HOST, R('move'), { shared: { fresh: 1 } });
  check(S, 'a visit without a change does not push it', eq(d.welcome.shared, { fresh: 1 }), `${Date.now() - t0} ms: ${JSON.stringify(d.welcome.shared)}`);
  d.close();

  // a room with a phone in it is not deleted under it
  a = await joinWire(HOST, R('live'), { shared: { v: 1 }, keep: { expire: 1500 } });
  await sleep(3500); // the deadline (and the alarm) pass with the phone still connected
  b = await joinWire(HOST, R('live'), {});
  check(S, 'a room with a phone in it is not deleted when its time passes', eq(b.welcome.shared, { v: 1 }), JSON.stringify(b.welcome.shared));
  check(S, 'and a late visitor is told the time is up', b.welcome.keep && b.welcome.keep.remaining === 0);
  a.close();
  b.close();
  await sleep(500);
  c = await joinWire(HOST, R('live'), { shared: { fresh: 1 } });
  check(S, 'it is deleted when the last phone leaves, as the time had run out', eq(c.welcome.shared, { fresh: 1 }), JSON.stringify(c.welcome.shared));
  c.close();

  // clear
  S = 'wire: clear';
  a = await joinWire(HOST, R('clr'), { shared: { marks: {} }, me: { name: 'a' }, keep: { expire: 60000 } });
  b = await joinWire(HOST, R('clr'), {});
  await a.write('marks.one', 1);
  await b.write('marks.two', 2);
  await sleep(300);
  const mark = a.msgs.length;
  b.send({ type: 'clear', shared: { marks: {} } });
  const ra = await a.waitFor((m) => m.type === 'reset');
  const rb = await b.waitFor((m) => m.type === 'reset');
  check(S, 'clear sends reset to everyone, the sender too', ra && rb && eq(ra.shared, { marks: {} }) && eq(rb.shared, { marks: {} }),
    JSON.stringify(ra));
  await sleep(200);
  check(S, 'clear leaves guests and me alone', a.msgs.slice(mark).every((m) => m.type === 'reset' || m.type === 'kept'),
    a.msgs.slice(mark).map((m) => m.type).join(','));
  a.close();
  b.close();
  await sleep(400);
  c = await joinWire(HOST, R('clr'), {});
  check(S, 'a later phone sees the cleared value, not the old marks', eq(c.welcome.shared, { marks: {} }) && c.welcome.keep, JSON.stringify(c.welcome.shared));
  c.send({ type: 'clear' }); // no seed: empty
  const rc = await c.waitFor((m) => m.type === 'reset');
  check(S, 'clear with no value resets to {}', rc && eq(rc.shared, {}));
  c.close();
  await sleep(400);
  d = await joinWire(HOST, R('clr'), {});
  check(S, 'and the kept copy is the empty one', eq(d.welcome.shared, {}) && !!d.welcome.keep);
  d.close();

  a = new Wire(HOST, R('clr-early'));
  await a.ready;
  a.send({ type: 'clear', shared: {} });
  check(S, 'clear before hello is refused', !!(await a.waitFor((m) => m.type === 'error' && /hello/.test(m.message))));
  a.close();

  a = await joinWire(HOST, R('clr-open'), { shared: { s: 1 } });
  b = await joinWire(HOST, R('clr-open'), {});
  await a.write('s', 5);
  a.send({ type: 'clear', shared: { s: 1 } });
  const ro = await b.waitFor((m) => m.type === 'reset');
  check(S, 'clear works in a room without keep', ro && eq(ro.shared, { s: 1 }));
  [a, b].forEach((w) => w.close());

  // size limit
  S = 'wire: size limit';
  a = await joinWire(HOST, R('big'), { shared: {}, keep: { expire: 60000 } });
  b = await joinWire(HOST, R('big'), {});
  a.send({ type: 'patch', scope: 'shared', path: 'big', value: 'x'.repeat(70000) });
  const err = await a.waitFor((m) => m.type === 'error');
  check(S, 'a write over 64 KB is refused with an error', err && /Not saved/.test(err.message) && /64 KB/.test(err.message), err && err.message);
  const back = await a.waitFor((m) => m.type === 'reset');
  check(S, 'the sender gets the room\'s real state back', back && eq(back.shared, {}));
  await sleep(300);
  check(S, 'nobody else hears about it', b.of('patch').length === 0 && b.of('reset').length === 0 && b.of('error').length === 0);
  a.send({ type: 'patch', scope: 'shared', path: 'small', value: 1 });
  check(S, 'a small write after that works', !!(await b.waitFor((m) => m.type === 'patch' && m.path === 'small')));

  // many writes that each fit but together do not
  const before = a.msgs.length;
  a.send({ type: 'patch', scope: 'shared', path: 'a', value: 'x'.repeat(25000) });
  a.send({ type: 'patch', scope: 'shared', path: 'b', value: 'x'.repeat(25000) });
  await sleep(300);
  check(S, 'two writes of 25 KB fit', a.msgs.slice(before).filter((m) => m.type === 'patch').length === 2);
  a.send({ type: 'patch', scope: 'shared', path: 'c', value: 'x'.repeat(25000) });
  const err2 = await a.waitFor((m) => m.type === 'error' && a.msgs.indexOf(m) >= before);
  check(S, 'the third one is refused (50 KB + 25 KB)', !!err2, err2 && err2.message);
  for (let i = 0; i < 6; i++) a.send({ type: 'patch', scope: 'shared', path: 'a', value: String(i).repeat(25000) });
  await sleep(500);
  const rewrites = a.msgs.slice(before).filter((m) => m.type === 'patch' && m.path === 'a').length;
  check(S, 'rewriting one 25 KB key again and again is never refused', rewrites === 7, `${rewrites} of 7 accepted`);
  check(S, 'deleting makes room', await (async () => {
    a.send({ type: 'patch', scope: 'shared', path: 'a' }); // delete
    a.send({ type: 'patch', scope: 'shared', path: 'c', value: 'x'.repeat(25000) });
    return !!(await a.waitFor((m) => m.type === 'patch' && m.path === 'c' && a.msgs.indexOf(m) > before + 8));
  })());

  a.send({
    type: 'batch',
    ops: [
      { scope: 'me', path: 'x', value: 1 },
      { scope: 'shared', path: 'p', value: 'x'.repeat(30000) },
      { scope: 'shared', path: 'q', value: 'x'.repeat(30000) },
    ],
  });
  const meOp = await b.waitFor((m) => (m.type === 'patch' && m.scope === 'me' && m.path === 'x')
    || (m.type === 'batch' && m.ops.some((o) => o.scope === 'me')), 2000);
  check(S, 'a refused batch drops its shared writes but not its me writes', !!meOp);
  const sizeNow = await joinWire(HOST, R('big'), {});
  check(S, 'a refused batch changes nothing in shared', sizeNow.welcome.shared.p === undefined && sizeNow.welcome.shared.q === undefined);
  sizeNow.close();
  [a, b].forEach((w) => w.close());

  a = await joinWire(HOST, R('big-open'), { shared: {} });
  b = await joinWire(HOST, R('big-open'), {});
  a.send({ type: 'patch', scope: 'shared', path: 'big', value: 'x'.repeat(70000) });
  check(S, 'a room without keep takes the same write (unchanged)', !!(await b.waitFor((m) => m.type === 'patch' && m.path === 'big')));
  [a, b].forEach((w) => w.close());

  a = await joinWire(HOST, R('seedbig'), { shared: { big: 'x'.repeat(70000) }, keep: { expire: 60000 } });
  check(S, 'a starting value over 64 KB: the room is not kept', a.welcome.keep === undefined && a.welcome.shared.big.length === 70000);
  check(S, 'and the phone is told why', !!(await a.waitFor((m) => m.type === 'error' && /not kept/.test(m.message))));
  a.close();

  // old clients
  S = 'wire: old clients';
  a = await joinWire(HOST, R('old'), { shared: { a: 1 } }); // a hello with no keep field at all
  check(S, 'a hello with no keep field makes an ordinary room', a.welcome.keep === undefined);
  a.send({ type: 'patch', scope: 'shared', path: 'a', value: 2 });
  await sleep(200);
  check(S, 'and it works as before', a.of('patch').length === 1);
  a.close();
}

// ---------- browser pages ----------

let p5Body = null;
const P5_1 = '/node_modules/p5/lib/p5.js';

function sketch({ config }) {
  return `
window.evlog = [];
window.cons = [];
function setup(){
  createCanvas(200, 200);
  window.setupResult = shareSetup(${JSON.stringify(config)});
  window.ready = true;
}
function draw(){ background(40); }
function shareReady(){ evlog.push('ready'); }
function shareReceive(p, v){ evlog.push('recv:' + p); }
function shareClosed(){ evlog.push('closed'); }`;
}

function html(p5Src, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="${p5Src}"></script><script src="/src/p5-phone.js"></script></head>
<body style="margin:0"><script>${body}</script></body></html>`;
}

async function route(p, pageHtml, lib) {
  await p.route(P5_2_URL, (r) => r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: p5Body }));
  await p.route(ORIGIN + '/**', (r) => {
    const pathname = decodeURIComponent(new URL(r.request().url()).pathname);
    if (pathname === '/') return r.fulfill({ contentType: 'text/html; charset=utf-8', body: pageHtml });
    const file = pathname === '/src/p5-phone.js' ? lib : path.join(__dirname, pathname);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: fs.readFileSync(file) });
  });
}

async function newPhone(browser) {
  const ctx = await browser.newContext(devices['Pixel 7']);
  return ctx;
}

// A phone: a page running the sketch with the given shareSetup config. lib is the p5-phone file.
async function openPhone(browser, { config, lib = LIB }) {
  const ctx = await newPhone(browser);
  const p = await ctx.newPage();
  p.errors = [];
  p.cons = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => p.cons.push(m.type() + ': ' + m.text()));
  await route(p, html(p5Body ? P5_2_URL : P5_1, sketch({ config })), lib);
  await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  return p;
}

async function join(p) {
  await p.evaluate(() => shareConnect());
  return waitFor(p, () => window.shareConnected === true, 8000);
}

// Write something and wait until the server has applied it (its echo came back), so that
// closing the page right after cannot lose it.
async function settled(p) {
  return waitFor(p, () => _shareOutbox.length === 0 && _sharePending.size === 0, 4000);
}

async function leave(p) {
  await p.context().close();
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
  status: window.shareStatus,
  error: window.shareError,
  kept: window.shareKept,
  keptUntil: window.shareKeptUntil,
  shared: JSON.parse(JSON.stringify(window.shared)),
  now: Date.now(),
}));

async function browserChecks(browser, oldRelease) {
  const cfg = (room, extra = {}) => Object.assign({ host: HOST, room: `${room}-${RUN}` }, extra);

  // 1 and 2: a kept room and an ordinary one
  let S = 'client: keep';
  let A = await openPhone(browser, { config: cfg('b1', { shared: { marks: {} }, keep: { expire: 60000 } }) });
  check(S, 'shareKept is false before joining', (await state(A)).kept === false && (await state(A)).keptUntil === 0);
  check(S, 'phone A joins', await join(A));
  let a = await state(A);
  check(S, 'shareKept is true when the server keeps the room', a.kept === true);
  check(S, 'shareKeptUntil is about 60 s ahead', a.keptUntil > a.now + 55000 && a.keptUntil <= a.now + 60500, a.keptUntil - a.now);
  await A.evaluate(() => { shared.hello = 'wall'; shared.marks.m1 = { x: 1 }; });
  check(S, 'the write is applied by the server', await settled(A));
  check(S, 'a change moves shareKeptUntil forward', await waitFor(A, (t) => window.shareKeptUntil > t, 4000, a.keptUntil));
  await leave(A);
  await sleep(500);
  let B = await openPhone(browser, { config: cfg('b1', { shared: { other: true } }) });
  check(S, 'phone B joins later', await join(B));
  let b = await state(B);
  check(S, 'B sees what A left', eq(b.shared, { marks: { m1: { x: 1 } }, hello: 'wall' }), JSON.stringify(b.shared));
  check(S, 'B was not asking for keep, yet shareKept is true', b.kept === true && b.keptUntil > b.now);
  check(S, 'B is host of the waiting room', b.isHost === true);
  await leave(B);

  S = 'client: no keep';
  A = await openPhone(browser, { config: cfg('b2', { shared: { marks: {} } }) });
  await join(A);
  await A.evaluate(() => { shared.hello = 'wall'; });
  await settled(A);
  check(S, 'shareKept stays false', (await state(A)).kept === false && (await state(A)).keptUntil === 0);
  await leave(A);
  await sleep(500);
  B = await openPhone(browser, { config: cfg('b2', { shared: { marks: {} } }) });
  await join(B);
  check(S, 'without keep the room is empty for the next phone', eq((await state(B)).shared, { marks: {} }), JSON.stringify((await state(B)).shared));
  await leave(B);

  // 3: expiry with a string time
  S = 'client: expiry';
  A = await openPhone(browser, { config: cfg('b3', { keep: '4s' }) });
  await join(A);
  a = await state(A);
  check(S, 'keep: \'4s\' is read as 4 seconds', a.kept && a.keptUntil > a.now + 2500 && a.keptUntil <= a.now + 4200, a.keptUntil - a.now);
  await A.evaluate(() => { shared.v = 1; });
  await settled(A);
  await leave(A);
  await sleep(6500);
  B = await openPhone(browser, { config: cfg('b3', { shared: { fresh: 1 } }) });
  await join(B);
  b = await state(B);
  check(S, 'after the time the value is gone', eq(b.shared, { fresh: 1 }) && b.isHost && !b.kept, JSON.stringify(b.shared));
  await leave(B);

  // 4: shareClear
  S = 'client: shareClear';
  A = await openPhone(browser, { config: cfg('b4', { shared: { marks: {} }, keep: '1h' }) });
  B = await openPhone(browser, { config: cfg('b4', { shared: { marks: {} } }) });
  await join(A);
  await join(B);
  await A.evaluate(() => { shared.marks.a = 1; });
  await B.evaluate(() => { shared.marks.b = 2; });
  check(S, 'both phones see both marks', await waitFor(A, () => shared.marks.a === 1 && shared.marks.b === 2)
    && await waitFor(B, () => shared.marks.a === 1 && shared.marks.b === 2));
  const cleared = await B.evaluate(() => shareClear());
  check(S, 'shareClear() returns true while connected', cleared === true);
  check(S, 'it wipes the room for the phone that did not call it', await waitFor(A, () => Object.keys(shared.marks).length === 0 && Object.keys(shared).length === 1));
  check(S, 'and for the phone that did', await waitFor(B, () => Object.keys(shared.marks).length === 0 && Object.keys(shared).length === 1));
  check(S, 'later writes still work', await (async () => {
    await A.evaluate(() => { shared.marks.c = 3; });
    return waitFor(B, () => shared.marks.c === 3);
  })());
  await B.evaluate(() => { shareClear(); });
  await A.evaluate(() => { shared.junk = 1; shared.marks.d = 4; shareClear(); });
  check(S, 'a write made just before shareClear() is cleared too', await waitFor(B, () => !('junk' in shared) && Object.keys(shared.marks).length === 0, 3000)
    && await waitFor(A, () => !('junk' in shared) && Object.keys(shared.marks).length === 0, 3000), JSON.stringify((await state(A)).shared));
  await A.evaluate(() => { shareClear(); shared.after = 1; });
  check(S, 'a write made just after shareClear() stays', await waitFor(B, () => shared.after === 1, 3000) && await waitFor(A, () => shared.after === 1, 3000),
    JSON.stringify((await state(A)).shared));
  await A.evaluate(() => { shareClear(); });
  await waitFor(B, () => !('after' in shared));
  await leave(A);
  await leave(B);
  await sleep(500);
  let C = await openPhone(browser, { config: cfg('b4', { shared: { zzz: 1 } }) });
  await join(C);
  const c = await state(C);
  check(S, 'a later phone gets the starting value, not the old marks', eq(c.shared, { marks: {} }) && c.kept, JSON.stringify(c.shared));
  await leave(C);

  // 5: the first policy wins
  S = 'client: policy';
  A = await openPhone(browser, { config: cfg('b5', { keep: { expire: 60000 } }) });
  B = await openPhone(browser, { config: cfg('b5', { keep: '12h' }) });
  C = await openPhone(browser, { config: cfg('b5') });
  await join(A);
  await join(B);
  await join(C);
  const [sa, sb, sc] = [await state(A), await state(B), await state(C)];
  check(S, 'B asked for 12 h and got the room\'s 60 s', sb.kept && sb.keptUntil - sb.now <= 60500 && sb.keptUntil - sb.now > 50000, sb.keptUntil - sb.now);
  check(S, 'C asked for nothing and got the kept room', sc.kept && sc.keptUntil - sc.now <= 60500);
  check(S, 'no page errors', !A.errors.length && !B.errors.length && !C.errors.length);
  for (const p of [A, B, C]) await leave(p);

  A = await openPhone(browser, { config: cfg('b5open') });
  await join(A);
  B = await openPhone(browser, { config: cfg('b5open', { keep: true }) });
  await join(B);
  check(S, 'a phone asking for keep in an open room without it: shareKept false', (await state(B)).kept === false);
  check(S, 'and it is warned in the console', B.cons.some((t) => /not kept/.test(t)), B.cons.filter((t) => /keep/.test(t)).join(' | '));
  await B.evaluate(() => { shared.v = 1; });
  await settled(B);
  await leave(A);
  await leave(B);
  await sleep(500);
  C = await openPhone(browser, { config: cfg('b5open', { shared: { fresh: 1 } }) });
  await join(C);
  check(S, 'and the room is not kept after all leave', eq((await state(C)).shared, { fresh: 1 }));
  await leave(C);

  A = await openPhone(browser, { config: cfg('b5bad', { keep: 'a week' }) });
  check(S, 'a bad keep value fails shareSetup() with a message', (await A.evaluate(() => window.setupResult)) === false
    && A.cons.some((t) => /^error: .*keep must be/.test(t)), A.cons.slice(-2).join(' | '));
  await leave(A);
  A = await openPhone(browser, { config: cfg('b5long', { keep: '90d' }) });
  await join(A);
  a = await state(A);
  check(S, 'over 30 days is cut to 30 days, with a console note', a.keptUntil - a.now > 29.9 * DAY && a.keptUntil - a.now <= 30 * DAY && A.cons.some((t) => /at most 30 days/.test(t)));
  await leave(A);

  // 6: size limit
  S = 'client: size limit';
  A = await openPhone(browser, { config: cfg('b6', { keep: '1h', shared: {} }) });
  B = await openPhone(browser, { config: cfg('b6') });
  await join(A);
  await join(B);
  await A.evaluate(() => { shared.big = 'x'.repeat(70000); });
  check(S, 'a write over 64 KB gives shareError', await waitFor(A, () => /Not saved/.test(window.shareError), 4000), (await state(A)).error);
  check(S, 'the phone is still connected', (await state(A)).connected);
  check(S, 'the phone\'s screen goes back to the room\'s value', await waitFor(A, () => !('big' in shared), 3000));
  await sleep(300);
  check(S, 'the other phone never sees it', !('big' in (await state(B)).shared));
  await A.evaluate(() => { shared.small = 1; });
  check(S, 'a small write after that works', await waitFor(B, () => shared.small === 1));
  check(S, 'no page errors', !A.errors.length && !B.errors.length);
  await leave(A);
  await leave(B);

  // 8: five phones adding a mark at the same moment
  S = 'client: The Wall';
  const room = 'wall';
  const phones = [];
  for (let i = 0; i < 5; i++) {
    phones.push(await openPhone(browser, { config: cfg(room, { keep: '24h', shared: {}, me: { n: i } }) }));
  }
  for (const p of phones) await join(p);
  // The pattern in the docs: every phone writes each mark under its own key (its id and a
  // counter). Nobody overwrites anybody.
  const addMark = () => {
    window.n = window.n || 0;
    const key = 'm-' + shareClientId.slice(0, 8) + '-' + window.n++;
    shared[key] = { x: Math.round(Math.random() * 100), y: Math.round(Math.random() * 100), t: Date.now() };
    return key;
  };
  const keys = await Promise.all(phones.map((p) => p.evaluate(addMark)));
  check(S, '5 phones add a mark at the same moment: all 5 keys are different', new Set(keys).size === 5);
  const allMarks = (n) => Object.keys(shared).filter((k) => k.startsWith('m-')).length === n;
  let okAll = true;
  for (const p of phones) okAll = (await waitFor(p, allMarks, 5000, 5)) && okAll;
  check(S, 'every phone sees all 5 marks', okAll, (await Promise.all(phones.map((p) => p.evaluate(() => Object.keys(shared).length)))).join(','));
  // each phone adds 3 more marks, quickly
  await Promise.all(phones.map((p) => p.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      window.n = window.n || 0;
      shared['m-' + shareClientId.slice(0, 8) + '-' + window.n++] = { x: i, y: i, t: Date.now() };
    }
  })));
  okAll = true;
  for (const p of phones) okAll = (await waitFor(p, allMarks, 5000, 20)) && okAll;
  check(S, '5 phones add 3 marks each at once: all 20 marks arrive', okAll, (await Promise.all(phones.map((p) => p.evaluate(() => Object.keys(shared).length)))).join(','));
  for (const p of phones) await settled(p);
  for (const p of phones) await leave(p);
  await sleep(500);
  const late = await openPhone(browser, { config: cfg(room) });
  await join(late);
  check(S, 'after everyone left, a new phone sees all 20 marks', Object.keys((await state(late)).shared).length === 20, Object.keys((await state(late)).shared).length);
  // Old marks: two phones delete the same old keys at the same moment. Safe: deletes do not conflict.
  const late2 = await openPhone(browser, { config: cfg(room) });
  await join(late2);
  await late.evaluate(() => { for (let i = 0; i < 4; i++) shared['old-' + i] = { t: 0 }; });
  await waitFor(late2, () => Object.keys(shared).length === 24, 4000);
  const prune = () => { for (const k in shared) if (shared[k].t < 1000) delete shared[k]; };
  await Promise.all([late.evaluate(prune), late2.evaluate(prune)]);
  const pruned = await waitFor(late, () => Object.keys(shared).length === 20, 4000) && await waitFor(late2, () => Object.keys(shared).length === 20, 4000);
  check(S, 'two phones delete the same old marks at once: both end with the 20 new ones', pruned);
  await leave(late);
  await leave(late2);

  // the pattern to avoid: one shared array that everyone pushes to
  const naive = [];
  for (let i = 0; i < 5; i++) naive.push(await openPhone(browser, { config: cfg('wall-naive', { shared: { marks: [] } }) }));
  for (const p of naive) await join(p);
  await Promise.all(naive.map((p, i) => p.evaluate((i) => { shared.marks.push({ from: i }); }, i)));
  await sleep(1500);
  const counts = await Promise.all(naive.map((p) => p.evaluate(() => shared.marks.length)));
  check(S, 'for contrast: one shared array loses marks when 5 phones push at once (phones agree)', new Set(counts).size === 1,
    `${counts[0]} of 5 survived; phones see ${counts.join(',')}`);
  for (const p of naive) await leave(p);

  // compatibility
  await compatChecks(browser, oldRelease);
}

async function compatChecks(browser, oldRelease) {
  let S = 'compat: old client, new server';
  const cfg = (room, extra = {}) => Object.assign({ host: HOST, room: `${room}-${RUN}` }, extra);

  let N = await openPhone(browser, { config: cfg('c1', { shared: { n: 0 }, keep: '1h' }) });
  let O = await openPhone(browser, { config: cfg('c1', { shared: { other: 1 } }), lib: oldRelease.lib });
  await join(N);
  check(S, 'the old client joins a kept room', await join(O));
  let o = await state(O);
  check(S, 'it has no keep globals and reads the stored value', o.kept === undefined && eq(o.shared, { n: 0 }), JSON.stringify(o.shared));
  await N.evaluate(() => { shared.n = 1; });
  check(S, 'new to old: a write arrives', await waitFor(O, () => shared.n === 1));
  await O.evaluate(() => { shared.fromOld = true; });
  check(S, 'old to new: a write arrives', await waitFor(N, () => shared.fromOld === true));
  await sleep(1500); // "kept" messages go out after each change; the old client ignores them
  await N.evaluate(() => { shareClear(); });
  check(S, 'a clear from the new client reaches the new client', await waitFor(N, () => !('fromOld' in shared) && shared.n === 0));
  await sleep(300);
  o = await state(O);
  check(S, 'the old client ignores the reset and stays connected', o.connected && o.status === 'connected');
  check(S, 'and throws no errors', !O.errors.length && !N.errors.length, O.errors.concat(N.errors).join(' | '));
  await leave(N);
  await leave(O);

  O = await openPhone(browser, { config: cfg('c2', { shared: { a: 1 } }), lib: oldRelease.lib });
  await join(O);
  await O.evaluate(() => { shared.a = 2; });
  await settled(O).catch(() => {});
  await sleep(500);
  await leave(O);
  await sleep(500);
  O = await openPhone(browser, { config: cfg('c2', { shared: { fresh: 1 } }), lib: oldRelease.lib });
  await join(O);
  check(S, 'an old client\'s room is cleared when it leaves, as before', eq((await state(O)).shared, { fresh: 1 }));
  await leave(O);

  // new client, old server
  S = 'compat: new client, old server';
  const ocfg = (room, extra = {}) => Object.assign({ host: OLD_HOST, room: `${room}-${RUN}` }, extra);
  N = await openPhone(browser, { config: ocfg('d1', { shared: { n: 0 }, keep: '1h' }) });
  const N2 = await openPhone(browser, { config: ocfg('d1', { keep: '1h' }) });
  check(S, 'a new client joins the old server', await join(N));
  await join(N2);
  let n = await state(N);
  check(S, 'shareKept is false and shareKeptUntil is 0', n.kept === false && n.keptUntil === 0 && n.connected);
  check(S, 'a console note says the room is not kept', N.cons.some((t) => /not kept/.test(t)));
  await N.evaluate(() => { shared.n = 5; me.name = 'x'; });
  check(S, 'shared syncs between new clients', await waitFor(N2, () => shared.n === 5));
  check(S, 'me shows in guests', await waitFor(N2, () => guests.some((g) => g.name === 'x')));
  await N.evaluate(() => { shareClear(); });
  check(S, 'shareClear() on an old server sets shareError', await waitFor(N, () => /Unexpected message type: clear/.test(window.shareError), 3000), (await state(N)).error);
  n = await state(N);
  check(S, 'and the connection stays up', n.connected && n.status === 'connected');
  await N2.evaluate(() => { shared.n = 6; });
  check(S, 'and sync still works after that', await waitFor(N, () => shared.n === 6));
  check(S, 'no page errors', !N.errors.length && !N2.errors.length);
  await leave(N);
  await leave(N2);
  await sleep(500);
  N = await openPhone(browser, { config: ocfg('d1', { shared: { fresh: 1 }, keep: '1h' }) });
  await join(N);
  check(S, 'the old server does not keep the room', eq((await state(N)).shared, { fresh: 1 }));
  await leave(N);
}

// ---------- run ----------

(async () => {
  let oldRelease = null;
  let oldError = '';
  try { oldRelease = prepareOldRelease(); } catch (err) { oldError = err.message.split('\n')[0]; }

  const workers = [];
  const stop = () => {
    for (const w of workers) { try { process.kill(-w.pid); } catch (e) { /* already gone */ } }
    try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(130); });

  let browser;
  try {
    const worker = startWorker({ dir: SERVER_DIR, port: PORT, inspector: 9330, state: path.join(WORK, 'state-new') });
    workers.push(worker);
    if (oldRelease) {
      workers.push(startWorker({ dir: oldRelease.serverDir, port: OLD_PORT, inspector: 9331, state: path.join(WORK, 'state-old') }));
    }
    await waitForHttp(HOST + '/', 90000);
    if (oldRelease) await waitForHttp(OLD_HOST + '/', 90000);

    try {
      const res = await fetch(P5_2_URL);
      if (!res.ok) throw new Error(String(res.status));
      p5Body = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.error('p5 2.x CDN not reachable; using the local p5 1.x:', err.message);
    }

    await wireChecks(worker);

    // The test pages come from Playwright's router, so Chromium treats them as public and
    // blocks their WebSocket to 127.0.0.1. Real sketches reach a public workers.dev URL.
    browser = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks'] });
    if (oldRelease) {
      await browserChecks(browser, oldRelease);
    } else {
      check('compat', `could read ${OLD_REF} from git`, false, oldError);
      await browserChecks(browser, { lib: LIB });
    }
  } catch (err) {
    console.error(err);
    check('harness', 'ran to completion', false, err.message);
    if (process.env.SHARE_E2E_LOG) workers.forEach((w) => console.error(w.getLog()));
  } finally {
    if (browser) await browser.close();
    stop();
  }
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
