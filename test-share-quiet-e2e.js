#!/usr/bin/env node
/**
 * End-to-end checks for the Share quiet option: a connection that is not sent the other
 * phones' `me` changes (a class-wide phone page, or a small board), while it still gets
 * `shared`, events, presence and everything else.
 *
 * Starts `wrangler dev` for companion/P5PhoneShare on 127.0.0.1:8802 (and, for the
 * compatibility checks, the last released server on 8803), then
 *   1. talks to the server over raw WebSockets (what a quiet connection is and is not sent,
 *      and how many messages come out of a room of 30 phones), and
 *   2. drives emulated phones in Chromium with the real client (src/p5-phone.js).
 *
 * The compatibility checks need the last release's code, which has no quiet option: they
 * read it with `git archive <ref>`, where the ref is v1.15.4 or SHARE_OLD_REF. (v1.15.4's
 * companion is the same as main's.) The workers keep their state in a temporary folder, so a
 * run leaves nothing behind.
 *
 * Needs: npx playwright install chromium; (cd companion/P5PhoneShare && npm install);
 * network access once, for the p5.js 2.x build (if it fails, the local p5 1.x is used).
 * Run: node test-share-quiet-e2e.js   (or: npm run test:share-quiet)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9997';
const PORT = 8802;
const OLD_PORT = 8803;
const HOST = `http://127.0.0.1:${PORT}`;
const OLD_HOST = `http://127.0.0.1:${OLD_PORT}`;
const SERVER_DIR = process.env.SHARE_E2E_SERVER_DIR || path.join(__dirname, 'companion', 'P5PhoneShare');
const LIB = path.join(__dirname, process.env.SHARE_E2E_LIB || 'src/p5-phone.js');
const OLD_REF = process.env.SHARE_OLD_REF || 'v1.15.4';
const RUN = Date.now().toString(36);
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'share-quiet-e2e-'));
const P5_2_URL = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';

const rows = [];
function check(scenario, name, ok, detail) {
  rows.push({ scenario, check: name, ok: !!ok, detail: detail === undefined ? '' : String(detail).slice(0, 90) });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const report = []; // lines printed at the end: the measured numbers

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
  mark() { return this.msgs.length; }
  since(mark) { return this.msgs.slice(mark); }
  // me changes in what this connection was sent after `mark`, from patch and batch messages.
  meOps(mark) {
    const ops = [];
    for (const m of this.since(mark)) {
      if (m.type === 'patch' && m.scope === 'me') ops.push({ from: m.clientId, path: m.path, value: m.value });
      if (m.type === 'batch') for (const o of m.ops) if (o.scope === 'me') ops.push({ from: m.clientId, path: o.path, value: o.value });
    }
    return ops;
  }
  sharedOps(mark) {
    const ops = [];
    for (const m of this.since(mark)) {
      if (m.type === 'patch' && m.scope === 'shared') ops.push({ from: m.clientId, path: m.path, value: m.value });
      if (m.type === 'batch') for (const o of m.ops) if (o.scope === 'shared') ops.push({ from: m.clientId, path: o.path, value: o.value });
    }
    return ops;
  }
  async waitFor(pred, ms = 3000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = this.msgs.find(pred);
      if (hit) return hit;
      await sleep(25);
    }
    return null;
  }
  async hello({ me = {}, shared, keep, quiet } = {}) {
    await this.ready;
    const msg = { type: 'hello', app: 'wire', room: this.room, me };
    if (shared !== undefined) msg.shared = shared;
    if (keep !== undefined) msg.keep = keep;
    if (quiet !== undefined) msg.quiet = quiet;
    this.send(msg);
    return this.waitFor((m) => m.type === 'welcome');
  }
  close() { try { this.ws.close(1000, 'bye'); } catch (e) { /* ignore */ } }
}

async function joinWire(host, room, opts) {
  const w = new Wire(host, room);
  w.welcome = await w.hello(opts);
  w.id = w.welcome && w.welcome.clientId;
  return w;
}

const idsOf = (entries) => entries.map((g) => g.id).sort();
const entry = (guests, id) => guests.find((g) => g.id === id);

// ---------- the wire-level checks ----------

async function wireChecks(worker) {
  const R = (n) => `${n}-${RUN}`;

  // the option itself
  let S = 'wire: the option';
  let a = await joinWire(HOST, R('opt'), { me: { role: 'phone' }, quiet: true });
  check(S, 'hello.quiet true: the welcome says quiet', a.welcome.quiet === true);
  let b = await joinWire(HOST, R('opt'), { me: { role: 'phone' } });
  check(S, 'a hello without quiet: no quiet field in the welcome', b.welcome.quiet === undefined);
  let c = await joinWire(HOST, R('opt'), { quiet: false });
  check(S, 'quiet false: not quiet', c.welcome.quiet === undefined);
  let d = await joinWire(HOST, R('opt'), { quiet: 'yes' });
  let e = await joinWire(HOST, R('opt'), { quiet: 1 });
  check(S, 'quiet must be the boolean true ("yes" and 1 are not quiet)', d.welcome.quiet === undefined && e.welcome.quiet === undefined);
  a.send({ type: 'patch', scope: 'me', path: 'x', value: 1 });
  check(S, 'a plain phone still gets the quiet phone\'s me changes', !!(await b.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.path === 'x')));
  const markD = d.mark();
  a.send({ type: 'patch', scope: 'me', path: 'x', value: 2 });
  await sleep(300);
  check(S, '"yes" and 1 did not make a connection quiet (it was sent the me change)', d.meOps(markD).length === 1 && e.meOps(0).length >= 1);
  check(S, 'a quiet hello is protocol v2 (no version change)', a.welcome.v === 2);
  [a, b, c, d, e].forEach((w) => w.close());

  // what a quiet connection is sent
  S = 'wire: what a quiet connection is sent';
  const room = R('who');
  const P = await joinWire(HOST, room, { me: { role: 'projector' }, shared: { average: 0 } });
  const N = await joinWire(HOST, room, { me: { role: 'phone', name: 'plain' } });
  const Q1 = await joinWire(HOST, room, { me: { role: 'phone', name: 'q1', x: 1 }, quiet: true });
  check(S, 'a quiet phone\'s welcome lists who is here, with each one\'s role',
    eq(idsOf(Q1.welcome.guests), [P.id, N.id].sort())
    && entry(Q1.welcome.guests, P.id).data.role === 'projector'
    && entry(Q1.welcome.guests, N.id).data.role === 'phone'
    && entry(Q1.welcome.guests, N.id).data.name === 'plain');
  check(S, 'the welcome also carries shared and isHost as usual', eq(Q1.welcome.shared, { average: 0 }) && Q1.welcome.isHost === false);
  const Q2 = await joinWire(HOST, room, { me: { role: 'phone', name: 'q2' }, quiet: true });
  const pres = await Q1.waitFor((m) => m.type === 'presence' && m.joined === Q2.id);
  check(S, 'presence: a quiet phone hears a join, with the newcomer\'s role',
    pres && eq(idsOf(pres.guests), [P.id, N.id, Q1.id, Q2.id].sort()) && entry(pres.guests, Q2.id).data.role === 'phone');
  check(S, 'presence: the others hear it too', !!(await P.waitFor((m) => m.type === 'presence' && m.joined === Q2.id))
    && !!(await N.waitFor((m) => m.type === 'presence' && m.joined === Q2.id)));

  // me changes: a plain phone's reach the projector and the plain phone, not the quiet ones
  let m1 = [P, N, Q1, Q2].map((w) => w.mark());
  N.send({ type: 'patch', scope: 'me', path: 'x', value: 0.5 });
  await P.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.path === 'x', 2000);
  await sleep(300);
  check(S, 'a plain phone\'s me change reaches the projector', eq(P.meOps(m1[0]).map((o) => [o.from, o.path, o.value]), [[N.id, 'x', 0.5]]));
  check(S, 'and does not reach a quiet phone', Q1.meOps(m1[2]).length === 0 && Q2.meOps(m1[3]).length === 0);
  check(S, 'and the sender does not get its own back', N.meOps(m1[1]).length === 0);

  // a quiet phone's own changes still go out
  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  Q1.send({ type: 'patch', scope: 'me', path: 'x', value: 0.9 });
  await P.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.clientId === Q1.id, 2000);
  await N.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.clientId === Q1.id, 2000);
  await sleep(300);
  check(S, 'a quiet phone\'s own me change reaches the projector and the plain phone',
    P.meOps(m1[0]).length === 1 && N.meOps(m1[1]).length === 1 && P.meOps(m1[0])[0].value === 0.9);
  check(S, 'and not the other quiet phone', Q2.meOps(m1[3]).length === 0 && Q1.meOps(m1[2]).length === 0);

  // the quiet setting survives the phone's own me changes (the server rewrites its state on each)
  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  Q2.send({ type: 'patch', scope: 'me', path: 'y', value: 3 });
  await P.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.clientId === Q2.id, 2000);
  P.send({ type: 'patch', scope: 'me', path: 'z', value: 4 });
  await N.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.clientId === P.id, 2000);
  await sleep(300);
  check(S, 'a quiet phone stays quiet after it has sent me changes of its own', Q2.meOps(m1[3]).length === 0 && Q1.meOps(m1[2]).length === 0);

  // batches: me and shared together
  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  Q1.send({ type: 'batch', ops: [
    { scope: 'me', path: 'x', value: 0.1 },
    { scope: 'shared', path: 'average', value: 0.42 },
    { scope: 'me', path: 'y', value: 0.2 },
  ] });
  await P.waitFor((m) => m.type === 'batch' && m.clientId === Q1.id, 2000);
  await Q2.waitFor((m) => (m.type === 'patch' || m.type === 'batch') && m.clientId === Q1.id && Q2.msgs.indexOf(m) >= m1[3], 2000);
  await sleep(300);
  const pb = P.since(m1[0]).find((m) => m.type === 'batch');
  check(S, 'a mixed batch reaches a plain phone whole (3 ops, in order)', pb && pb.ops.length === 3 && eq(pb.ops.map((o) => o.path), ['x', 'average', 'y']));
  const qm = Q2.since(m1[3]).filter((m) => m.type === 'patch' || m.type === 'batch');
  check(S, 'and reaches a quiet phone as its shared part only', qm.length === 1 && qm[0].type === 'patch' && qm[0].scope === 'shared'
    && qm[0].path === 'average' && qm[0].value === 0.42 && qm[0].clientId === Q1.id, JSON.stringify(qm));
  const qe = Q1.since(m1[2]).filter((m) => m.type === 'patch' || m.type === 'batch');
  check(S, 'the sender still gets the echo of its shared op, and only that', qe.length === 1 && qe[0].type === 'patch' && qe[0].scope === 'shared');

  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  N.send({ type: 'batch', ops: [{ scope: 'me', path: 'x', value: 1 }, { scope: 'me', path: 'y', value: 2 }] });
  await P.waitFor((m) => m.type === 'batch' && m.clientId === N.id && P.msgs.indexOf(m) >= m1[0], 2000);
  await sleep(300);
  check(S, 'a batch of me changes alone sends the quiet phones nothing at all',
    Q1.since(m1[2]).length === 0 && Q2.since(m1[3]).length === 0, JSON.stringify(Q2.since(m1[3])));

  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  N.send({ type: 'batch', ops: [{ scope: 'shared', path: 'a', value: 1 }, { scope: 'shared', path: 'b', value: 2 }] });
  await Q2.waitFor((m) => m.type === 'batch' && Q2.msgs.indexOf(m) >= m1[3], 2000);
  const sb = Q2.since(m1[3]).find((m) => m.type === 'batch');
  check(S, 'a batch of shared changes reaches a quiet phone whole', sb && sb.ops.length === 2 && sb.clientId === N.id);

  // shared, emit
  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  P.send({ type: 'patch', scope: 'shared', path: 'average', value: 0.7 });
  await Q1.waitFor((m) => m.type === 'patch' && m.path === 'average' && Q1.msgs.indexOf(m) >= m1[2], 2000);
  await Q2.waitFor((m) => m.type === 'patch' && m.path === 'average' && Q2.msgs.indexOf(m) >= m1[3], 2000);
  check(S, 'a shared change reaches every quiet phone', Q1.sharedOps(m1[2]).length === 1 && Q2.sharedOps(m1[3]).length === 1
    && Q1.sharedOps(m1[2])[0].value === 0.7 && Q1.sharedOps(m1[2])[0].from === P.id);
  check(S, 'and the sender gets its echo', P.sharedOps(m1[0]).length === 1);

  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  N.send({ type: 'emit', name: 'wave', data: { n: 1 } });
  const ev = await Q1.waitFor((m) => m.type === 'emit' && m.name === 'wave');
  await Q2.waitFor((m) => m.type === 'emit' && m.name === 'wave');
  check(S, 'an emit reaches a quiet phone with its data and sender', ev && eq(ev.data, { n: 1 }) && ev.clientId === N.id);

  // a phone that joins later: it is told the quiet phone's latest me
  const N2 = await joinWire(HOST, room, { me: { role: 'phone', name: 'late' } });
  const q1now = entry(N2.welcome.guests, Q1.id);
  check(S, 'a phone that joins later is told a quiet phone\'s latest me', q1now && q1now.data.x === 0.1 && q1now.data.y === 0.2 && q1now.data.role === 'phone',
    JSON.stringify(q1now));

  // guests on a quiet connection are a snapshot: refreshed at each join and leave
  m1 = [P, N, Q1, Q2].map((w) => w.mark());
  P.send({ type: 'patch', scope: 'me', path: 'level', value: 5 });
  await N.waitFor((m) => m.type === 'patch' && m.scope === 'me' && m.path === 'level');
  await sleep(300);
  check(S, 'a change in someone\'s me sends the quiet phone nothing', Q1.since(m1[2]).length === 0);
  const N3 = await joinWire(HOST, room, { me: { role: 'phone', name: 'third' } });
  const pres3 = await Q1.waitFor((m) => m.type === 'presence' && m.joined === N3.id);
  check(S, 'the next join refreshes the snapshot: the quiet phone now sees that change', pres3 && entry(pres3.guests, P.id).data.level === 5,
    pres3 && JSON.stringify(entry(pres3.guests, P.id)));
  check(S, 'and the newcomer is in the list with its role', pres3 && entry(pres3.guests, N3.id).data.role === 'phone' && pres3.guests.length === 6);

  // leave
  N3.close();
  const left = await Q1.waitFor((m) => m.type === 'presence' && m.left === N3.id);
  check(S, 'presence: a quiet phone hears a leave, and the list no longer has it', left && !entry(left.guests, N3.id) && left.guests.length === 5,
    left && left.guests.length);
  N2.close();
  await sleep(400);

  // host election reaches a quiet phone too
  const hostMark = [Q1, Q2, N].map((w) => w.mark());
  P.close(); // the host
  const wanted = [N.id, Q1.id, Q2.id].sort()[0];
  await sleep(500);
  const hostMsgs = [Q1, Q2, N].map((w, i) => w.since(hostMark[i]).filter((m) => m.type === 'host'));
  check(S, 'when the host leaves, a quiet phone is told who the new host is',
    hostMsgs[0].length === 1 && hostMsgs[0][0].clientId === wanted && hostMsgs[0][0].isHost === (Q1.id === wanted));
  [N, Q1, Q2].forEach((w) => w.close());

  // quiet and keep together
  S = 'wire: quiet with keep';
  a = await joinWire(HOST, R('qk'), { me: { role: 'phone' }, shared: { n: 0 }, keep: { expire: 60000 }, quiet: true });
  b = await joinWire(HOST, R('qk'), { me: { role: 'phone' } });
  check(S, 'a quiet phone can create a kept room', a.welcome.quiet === true && a.welcome.keep && a.welcome.keep.expire === 60000);
  b.send({ type: 'patch', scope: 'shared', path: 'x', value: 1 });
  const kept = await a.waitFor((m) => m.type === 'kept', 4000);
  check(S, 'a quiet phone gets "kept" after a change', !!kept && kept.expire === 60000);
  m1 = [a.mark()];
  b.send({ type: 'patch', scope: 'me', path: 'x', value: 1 });
  b.send({ type: 'clear', shared: { n: 0 } });
  const rs = await a.waitFor((m) => m.type === 'reset');
  await sleep(300);
  check(S, 'a quiet phone gets "reset" after a clear', rs && eq(rs.shared, { n: 0 }));
  check(S, 'and still no me changes', a.meOps(m1[0]).length === 0);
  a.close();
  b.close();
  await sleep(400);
  c = await joinWire(HOST, R('qk'), { me: { role: 'phone' }, quiet: true });
  check(S, 'a quiet phone joins the kept room later and gets the kept shared', eq(c.welcome.shared, { n: 0 }) && c.welcome.quiet === true && !!c.welcome.keep);
  c.close();

  // a quiet connection after the object has been idle
  S = 'wire: after an idle spell';
  a = await joinWire(HOST, R('idle'), { me: { role: 'phone' }, quiet: true });
  b = await joinWire(HOST, R('idle'), { me: { role: 'phone' } });
  await sleep(15000); // the object hibernates after about 10 s idle (wrangler dev runs onStart again on wake)
  m1 = [a.mark(), b.mark()];
  b.send({ type: 'patch', scope: 'me', path: 'x', value: 1 });
  a.send({ type: 'patch', scope: 'me', path: 'x', value: 2 });
  await b.waitFor((m) => m.type === 'patch' && m.scope === 'me' && b.msgs.indexOf(m) >= m1[1], 3000);
  await sleep(300);
  check(S, 'after 15 s idle the quiet phone is still quiet (its setting is kept in the connection\'s state)',
    a.meOps(m1[0]).length === 0 && b.meOps(m1[1]).length === 1);
  a.send({ type: 'patch', scope: 'shared', path: 'ok', value: 1 });
  check(S, 'and shared still reaches it', !!(await a.waitFor((m) => m.type === 'patch' && m.scope === 'shared' && m.path === 'ok')));
  [a, b].forEach((w) => w.close());

  // the same thing against a server that has no quiet option
  if (global.__oldRunning) {
    S = 'wire: an older server';
    a = await joinWire(OLD_HOST, R('oldq'), { me: { role: 'phone' }, quiet: true });
    b = await joinWire(OLD_HOST, R('oldq'), { me: { role: 'phone' } });
    check(S, 'an older server\'s welcome has no quiet field', a.welcome.quiet === undefined);
    m1 = [a.mark()];
    b.send({ type: 'patch', scope: 'me', path: 'x', value: 1 });
    check(S, 'and it sends the "quiet" phone every me change, as before', !!(await a.waitFor((m) => m.type === 'patch' && m.scope === 'me' && a.msgs.indexOf(m) >= m1[0])));
    [a, b].forEach((w) => w.close());
  }
}

// ---------- message counts: 30 phones at 10 Hz ----------

// A phone for the counting test: it counts what it is sent and does not parse it.
class Counter {
  constructor(host, room, { quiet, role }) {
    this.n = 0;
    this.me = 0;
    this.shared = 0;
    this.bytes = 0;
    this.measuring = false;
    this.ws = new WS(wireUrl(host, room));
    this.welcomed = new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        const hello = { type: 'hello', v: 2, app: 'wire', room, me: { role, x: 0, y: 0 } };
        if (quiet) hello.quiet = true;
        this.ws.send(JSON.stringify(hello));
      };
      this.ws.onerror = () => reject(new Error('counter: could not open'));
      this.ws.onmessage = (e) => {
        const s = String(e.data);
        if (this.measuring) {
          this.n++;
          this.bytes += s.length;
          if (s.includes('"scope":"me"')) this.me++;
          else if (s.includes('"scope":"shared"')) this.shared++;
        }
        if (s.startsWith('{"type":"welcome"')) resolve();
      };
    });
  }
}

async function rateRun(host, room, { phones, quietPhones, seconds, hz }) {
  const clients = [];
  for (let i = 0; i < phones; i++) {
    const isProjector = i === 0;
    clients.push(new Counter(host, room, { quiet: !isProjector && i <= quietPhones, role: isProjector ? 'projector' : 'phone' }));
  }
  await Promise.all(clients.map((c) => c.welcomed));
  await sleep(500);

  let meSent = 0;
  let sharedSent = 0;
  let sending = false;
  const timers = clients.map((c, i) => setInterval(() => {
    if (c.ws.readyState !== 1) return;
    // A Crowd Tilt phone: two values, ten times a second.
    c.ws.send(JSON.stringify({ type: 'batch', v: 2, ops: [
      { scope: 'me', path: 'x', value: Math.round(Math.random() * 1000) / 1000 },
      { scope: 'me', path: 'y', value: Math.round(Math.random() * 1000) / 1000 },
    ] }));
    if (sending) meSent++;
  }, 1000 / hz));
  // The projector writes the class average about five times a second.
  const avg = setInterval(() => {
    clients[0].ws.send(JSON.stringify({ type: 'patch', v: 2, scope: 'shared', path: 'average', value: Math.random() }));
    if (sending) sharedSent++;
  }, 200);

  await sleep(1500); // let it settle
  clients.forEach((c) => { c.n = 0; c.me = 0; c.shared = 0; c.bytes = 0; c.measuring = true; });
  sending = true;
  const t0 = Date.now();
  await sleep(seconds * 1000);
  const dt = (Date.now() - t0) / 1000;
  clients.forEach((c) => { c.measuring = false; });
  sending = false;
  timers.forEach(clearInterval);
  clearInterval(avg);
  await sleep(200);

  const sum = (f) => clients.reduce((t, c) => t + f(c), 0);
  const out = {
    seconds: dt,
    delivered: sum((c) => c.n) / dt,
    deliveredMe: sum((c) => c.me) / dt,
    deliveredShared: sum((c) => c.shared) / dt,
    bytes: sum((c) => c.bytes) / dt,
    meSent: meSent / dt,
    sharedSent: sharedSent / dt,
    projector: clients[0].n / dt,
    projectorMe: clients[0].me / dt,
    quietMe: clients.slice(1, quietPhones + 1).reduce((t, c) => t + c.me, 0),
    onePhone: clients[phones - 1].n / dt,
  };
  clients.forEach((c) => { try { c.ws.close(1000, 'bye'); } catch (e) { /* ignore */ } });
  await sleep(300);
  return out;
}

async function rateChecks() {
  const S = 'wire: message counts (30 phones, 10 Hz)';
  const R = (n) => `${n}-${RUN}`;
  const cfg = { phones: 30, seconds: 5, hz: 10 };
  const all = await rateRun(HOST, R('rate-all'), { ...cfg, quietPhones: 0 });
  const quiet = await rateRun(HOST, R('rate-quiet'), { ...cfg, quietPhones: 29 });

  const f = (x) => Math.round(x).toLocaleString('en-US');
  report.push('Message counts, 30 phones at 10 Hz (two me values each), the projector writing shared.average 5 times a second, measured over ' + cfg.seconds + ' s:');
  report.push('                          all 30 plain      29 quiet + 1 projector');
  report.push('  phones send (me/s)      ' + String(f(all.meSent)).padEnd(17) + f(quiet.meSent));
  report.push('  room sends out (msg/s)  ' + String(f(all.delivered)).padEnd(17) + f(quiet.delivered));
  report.push('    of which me relays    ' + String(f(all.deliveredMe)).padEnd(17) + f(quiet.deliveredMe));
  report.push('    of which shared       ' + String(f(all.deliveredShared)).padEnd(17) + f(quiet.deliveredShared));
  report.push('  room sends out (KB/s)   ' + String(f(all.bytes / 1024)).padEnd(17) + f(quiet.bytes / 1024));
  report.push('  one phone receives/s    ' + String(f(all.onePhone)).padEnd(17) + f(quiet.onePhone));
  report.push('  projector receives/s    ' + String(f(all.projector)).padEnd(17) + f(quiet.projector));
  report.push('  ratio, msg/s            ' + (all.delivered / quiet.delivered).toFixed(1) + 'x fewer; me relays ' + (all.deliveredMe / Math.max(1, quiet.deliveredMe)).toFixed(1) + 'x fewer; one phone ' + (all.onePhone / quiet.onePhone).toFixed(1) + 'x fewer');

  const expectProjector = cfg.hz * (cfg.phones - 1); // the other 29 phones' batches
  const expectPlain = cfg.hz * cfg.phones * (cfg.phones - 1); // every batch to the other 29
  check(S, 'plain room: each me batch goes to the other 29 (about 8,700 msg/s in all)', all.deliveredMe > expectPlain * 0.7 && all.deliveredMe < expectPlain * 1.3,
    f(all.deliveredMe) + ' msg/s');
  check(S, 'quiet room: no quiet phone is sent a single me change', quiet.quietMe === 0, 'count ' + quiet.quietMe);
  check(S, 'quiet room: the projector still gets every phone\'s me (about 290 a second)', quiet.projectorMe > expectProjector * 0.7 && quiet.projectorMe < expectProjector * 1.3, f(quiet.projectorMe) + ' msg/s');
  check(S, 'quiet room: me relays are about 29 times fewer', all.deliveredMe / Math.max(1, quiet.deliveredMe) > 15, (all.deliveredMe / Math.max(1, quiet.deliveredMe)).toFixed(1) + 'x');
  check(S, 'quiet room: all messages out of the room are at least 10 times fewer', all.delivered / quiet.delivered > 10, (all.delivered / quiet.delivered).toFixed(1) + 'x');
  check(S, 'quiet room: a quiet phone gets only the shared.average writes (about 5 a second)', quiet.onePhone > 2 && quiet.onePhone < 12, f(quiet.onePhone) + ' msg/s');
  check(S, 'plain room: a plain phone gets about 290 a second, as before', all.onePhone > 200 && all.onePhone < 400, f(all.onePhone) + ' msg/s');

  // the join burst: what a quiet phone is sent while 30 phones join
  const room = R('burst');
  const watcherQuiet = await joinWire(HOST, room, { me: { role: 'phone' }, quiet: true });
  const watcherPlain = await joinWire(HOST, room, { me: { role: 'phone' } });
  const bytes = (w) => w.msgs.reduce((t, m) => t + JSON.stringify(m).length, 0);
  const b0 = [bytes(watcherQuiet), bytes(watcherPlain)];
  const joiners = [];
  for (let i = 0; i < 30; i++) joiners.push(await joinWire(HOST, room, { me: { role: 'phone', name: 'phone ' + i, x: 0.5, y: 0.5 } }));
  await sleep(300);
  const presenceQuiet = watcherQuiet.of('presence');
  const last = presenceQuiet[presenceQuiet.length - 1];
  const b1 = [bytes(watcherQuiet) - b0[0], bytes(watcherPlain) - b0[1]];
  report.push('');
  report.push('While 30 phones join one by one, a watcher is sent ' + presenceQuiet.length + ' presence messages (' + (b1[0] / 1024).toFixed(1) + ' KB in all, the biggest ' + Math.max(...presenceQuiet.map((m) => JSON.stringify(m).length)) + ' bytes). Quiet and plain watchers get the same: ' + (b1[0] === b1[1] ? 'yes' : 'no (' + b1[1] + ' bytes plain)') + '.');
  check(S, 'a quiet watcher hears every join, and the last list has all 32 in the room', presenceQuiet.length >= 30 && last.guests.length === 32, last && last.guests.length);
  check(S, 'a quiet and a plain watcher are sent the same presence bytes while phones join', b1[0] === b1[1], b1.join(' vs '));
  joiners.forEach((w) => w.close());
  watcherQuiet.close();
  watcherPlain.close();
}

// ---------- browser pages ----------

let p5Body = null;
const P5_1 = '/node_modules/p5/lib/p5.js';

function sketch({ config }) {
  return `
window.evlog = [];
function setup(){
  createCanvas(200, 200);
  window.setupResult = shareSetup(${JSON.stringify(config)});
  window.ready = true;
}
function draw(){ background(40); }
function shareReady(){ evlog.push('ready'); }
function shareReceive(p, v){ evlog.push('recv:' + p); }
function shareEvent(n, d){ evlog.push('event:' + n); }
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

async function openPhone(browser, { config, lib = LIB }) {
  const ctx = await browser.newContext(devices['Pixel 7']);
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
  quiet: window.shareQuiet,
  kept: window.shareKept,
  shared: JSON.parse(JSON.stringify(window.shared)),
  evlog: window.evlog.slice(),
}));
const guestsOf = (p) => p.evaluate(() => guests.map((g) => Object.assign({ id: g.id }, JSON.parse(JSON.stringify(g)))));
const guestOf = async (p, id) => (await guestsOf(p)).find((g) => g.id === id);

async function browserChecks(browser, oldRelease) {
  const cfg = (room, extra = {}) => Object.assign({ host: HOST, room: `${room}-${RUN}` }, extra);

  // 1: the globals and shareSetup
  let S = 'client: shareSetup and shareQuiet';
  let Q = await openPhone(browser, { config: cfg('s1', { me: { role: 'phone' }, quiet: true }) });
  check(S, 'shareQuiet is false before joining', (await state(Q)).quiet === false);
  check(S, 'shareSetup() with quiet: true works', (await Q.evaluate(() => window.setupResult)) === true);
  check(S, 'a quiet phone joins', await join(Q));
  check(S, 'shareQuiet is true once the server has confirmed it', (await state(Q)).quiet === true);
  await Q.evaluate(() => shareDisconnect());
  check(S, 'shareQuiet is false again after shareDisconnect()', (await state(Q)).quiet === false);
  await leave(Q);

  let A = await openPhone(browser, { config: cfg('s1b', { me: { role: 'phone' } }) });
  await join(A);
  check(S, 'a phone with no quiet option: shareQuiet stays false', (await state(A)).quiet === false);
  await leave(A);
  A = await openPhone(browser, { config: cfg('s1c', { quiet: false }) });
  await join(A);
  check(S, 'quiet: false is the same as no option', (await state(A)).quiet === false && (await state(A)).connected);
  await leave(A);
  A = await openPhone(browser, { config: cfg('s1d', { quiet: 'yes' }) });
  check(S, 'quiet: \'yes\' fails shareSetup() with a message', (await A.evaluate(() => window.setupResult)) === false
    && A.cons.some((t) => /^error: .*quiet must be true or false/.test(t)), A.cons.slice(-2).join(' | '));
  await leave(A);

  // 2: a room of phones, a projector and a plain phone
  S = 'client: a quiet phone in a room';
  const P = await openPhone(browser, { config: cfg('r1', { shared: { average: 0 }, me: { role: 'projector' } }) });
  const N = await openPhone(browser, { config: cfg('r1', { me: { role: 'phone', name: 'plain' } }) });
  const Q1 = await openPhone(browser, { config: cfg('r1', { me: { role: 'phone', name: 'q1' }, quiet: true }) });
  const Q2 = await openPhone(browser, { config: cfg('r1', { me: { role: 'phone', name: 'q2' }, quiet: true }) });
  for (const p of [P, N, Q1, Q2]) await join(p);
  check(S, 'only the quiet phones have shareQuiet', (await state(P)).quiet === false && (await state(N)).quiet === false
    && (await state(Q1)).quiet === true && (await state(Q2)).quiet === true);
  check(S, 'a quiet phone\'s guests lists everyone else (3)', await waitFor(Q1, () => guests.length === 3));
  let g = await guestsOf(Q1);
  check(S, 'with their roles and names', eq(g.map((x) => x.role).sort(), ['phone', 'phone', 'projector'])
    && g.some((x) => x.name === 'plain') && g.some((x) => x.name === 'q2'), JSON.stringify(g));
  check(S, 'the projector counts 3 phones and sees the roles too', await waitFor(P, () => guests.length === 3 && guests.filter((x) => x.role === 'phone').length === 3));

  const nId = await N.evaluate(() => shareClientId);
  const q1Id = await Q1.evaluate(() => shareClientId);
  await N.evaluate(() => { me.x = 0.25; });
  check(S, 'the projector sees a plain phone\'s value live', await waitFor(P, (id) => { const n = guests.find((x) => x.id === id); return n && n.x === 0.25; }, 4000, nId));
  await N.evaluate(() => { me.x = 0.75; });
  check(S, 'and the next value', await waitFor(P, (id) => { const n = guests.find((x) => x.id === id); return n && n.x === 0.75; }, 4000, nId));
  await Q2.evaluate(() => { me.x = 0.5; });
  check(S, 'a plain phone sees a quiet phone\'s value live', await waitFor(N, () => guests.some((x) => x.name === 'q2' && x.x === 0.5)));
  await sleep(500);
  check(S, 'a quiet phone does not see either: no x in the plain phone\'s entry', (await guestOf(Q1, nId)).x === undefined, JSON.stringify(await guestOf(Q1, nId)));
  check(S, 'and none in any entry', (await guestsOf(Q1)).every((x) => x.x === undefined));
  check(S, 'shareReceive() never ran for a me change on the quiet phone', !(await state(Q1)).evlog.some((t) => t === 'recv:x'));
  check(S, 'while the plain phone got shareReceive("x")', (await state(N)).evlog.includes('recv:x'));
  await Q1.evaluate(() => { me.x = 0.1; });
  check(S, 'a quiet phone\'s own value reaches the projector', await waitFor(P, (id) => { const n = guests.find((x) => x.id === id); return n && n.x === 0.1; }, 4000, q1Id));
  check(S, 'and its own me is intact on the quiet phone', (await Q1.evaluate(() => me.x)) === 0.1);

  // shared and events
  await P.evaluate(() => { shared.average = 0.6; });
  check(S, 'shared.average written by the projector reaches the quiet phones', await waitFor(Q1, () => shared.average === 0.6) && await waitFor(Q2, () => shared.average === 0.6));
  check(S, 'and shareReceive("average") ran', (await state(Q1)).evlog.includes('recv:average'));
  await Q1.evaluate(() => { shared.vote = 'a'; });
  check(S, 'a quiet phone can write shared, and others get it', await waitFor(P, () => shared.vote === 'a') && await waitFor(Q2, () => shared.vote === 'a'));
  await P.evaluate(() => { shareEmit('wave', { n: 1 }); });
  check(S, 'an event reaches a quiet phone', await waitFor(Q1, () => evlog.includes('event:wave')) && await waitFor(Q2, () => evlog.includes('event:wave')));

  // presence
  const N2 = await openPhone(browser, { config: cfg('r1', { me: { role: 'phone', name: 'late' } }) });
  await join(N2);
  check(S, 'a join reaches the quiet phone\'s guests, with its role', await waitFor(Q1, () => guests.length === 4 && guests.some((x) => x.name === 'late' && x.role === 'phone')));
  g = await guestOf(Q1, nId);
  check(S, 'the join also refreshed the snapshot: the plain phone\'s latest x is there now', g && g.x === 0.75, JSON.stringify(g));
  await N.evaluate(() => { me.x = 0.9; });
  await sleep(500);
  check(S, 'but later changes still do not arrive', (await guestOf(Q1, nId)).x === 0.75);
  await leave(N2);
  check(S, 'a leave reaches the quiet phone\'s guests', await waitFor(Q1, () => guests.length === 3 && !guests.some((x) => x.name === 'late')));
  check(S, 'a quiet phone counts the phones by role', (await Q1.evaluate(() => guests.filter((x) => x.role === 'phone').length)) === 2);

  // reconnect
  await Q1.evaluate(() => { _shareSocket.close(1000, 'test'); });
  check(S, 'a quiet phone that loses its connection rejoins', await waitFor(Q1, () => window.shareConnected === true && evlog.filter((t) => t === 'closed').length === 1, 10000));
  check(S, 'and is still quiet', (await state(Q1)).quiet === true);
  await N.evaluate(() => { me.x = 0.123; });
  check(S, 'the projector sees it', await waitFor(P, (id) => { const n = guests.find((x) => x.id === id); return n && n.x === 0.123; }, 4000, nId));
  await sleep(500);
  const g2 = await guestOf(Q1, nId);
  check(S, 'the rejoined quiet phone is told the latest value once (in its welcome), then nothing', g2 && g2.x === 0.9, JSON.stringify(g2));
  check(S, 'no page errors', ![P, N, Q1, Q2].some((p) => p.errors.length), [P, N, Q1, Q2].map((p) => p.errors.join(';')).join('|'));
  for (const p of [P, N, Q1, Q2]) await leave(p);

  // 3: quiet with keep, and clear
  S = 'client: quiet with keep';
  const K1 = await openPhone(browser, { config: cfg('k1', { shared: { marks: {} }, me: { role: 'phone' }, keep: '1h', quiet: true }) });
  const K2 = await openPhone(browser, { config: cfg('k1', { shared: { marks: {} }, me: { role: 'phone' } }) });
  await join(K1);
  await join(K2);
  let k = await state(K1);
  check(S, 'a phone can be quiet and ask for keep at once', k.quiet === true && k.kept === true);
  await K2.evaluate(() => { shared.marks.a = 1; me.x = 1; });
  check(S, 'a quiet phone gets a plain phone\'s shared write', await waitFor(K1, () => shared.marks.a === 1));
  await K2.evaluate(() => { shareClear(); });
  check(S, 'a clear reaches the quiet phone', await waitFor(K1, () => Object.keys(shared.marks).length === 0));
  await sleep(300);
  check(S, 'and no me change did', !(await state(K1)).evlog.includes('recv:x'));
  await K1.evaluate(() => { shared.marks.b = 2; });
  await settled(K1);
  await leave(K1);
  await leave(K2);
  await sleep(500);
  const K3 = await openPhone(browser, { config: cfg('k1', { shared: { fresh: 1 }, me: { role: 'phone' }, quiet: true }) });
  await join(K3);
  k = await state(K3);
  check(S, 'a quiet phone that joins the kept room later gets what was kept', k.kept && k.quiet && eq(k.shared, { marks: { b: 2 } }), JSON.stringify(k.shared));
  check(S, 'no page errors', !K3.errors.length);
  await leave(K3);

  // 4: an older client in a room with quiet phones
  S = 'compat: old client, new server';
  const OP = await openPhone(browser, { config: cfg('c1', { shared: { n: 0 }, me: { role: 'phone', name: 'old' } }), lib: oldRelease.lib });
  const NQ = await openPhone(browser, { config: cfg('c1', { me: { role: 'phone', name: 'quiet' }, quiet: true }) });
  const NP = await openPhone(browser, { config: cfg('c1', { me: { role: 'phone', name: 'plain' } }) });
  check(S, 'the old client joins', await join(OP));
  await join(NQ);
  await join(NP);
  const o = await OP.evaluate(() => ({ quietGlobal: window.shareQuiet, connected: window.shareConnected }));
  check(S, 'it has no shareQuiet global and is connected', o.quietGlobal === undefined && o.connected);
  await NP.evaluate(() => { me.x = 0.3; });
  await NQ.evaluate(() => { me.x = 0.6; });
  check(S, 'the old client sees a plain phone\'s value live', await waitFor(OP, () => guests.some((x) => x.name === 'plain' && x.x === 0.3)));
  check(S, 'and the quiet phone\'s value live', await waitFor(OP, () => guests.some((x) => x.name === 'quiet' && x.x === 0.6)));
  await OP.evaluate(() => { me.x = 0.9; shared.n = 1; });
  check(S, 'the old client\'s shared write reaches the quiet phone', await waitFor(NQ, () => shared.n === 1));
  await sleep(300);
  check(S, 'but its me value does not (the quiet phone has no x for it)', (await NQ.evaluate(() => guests.find((x) => x.name === 'old').x)) === undefined);
  check(S, 'the plain phone sees the old client\'s value live', await waitFor(NP, () => guests.some((x) => x.name === 'old' && x.x === 0.9)));
  check(S, 'no page errors', !OP.errors.length && !NQ.errors.length && !NP.errors.length);
  for (const p of [OP, NQ, NP]) await leave(p);

  // 5: a new client against a server that has no quiet option
  S = 'compat: new client, old server';
  if (!global.__oldRunning) {
    check(S, 'the old server started', false);
    return;
  }
  const ocfg = (room, extra = {}) => Object.assign({ host: OLD_HOST, room: `${room}-${RUN}` }, extra);
  const OQ = await openPhone(browser, { config: ocfg('d1', { me: { role: 'phone', name: 'quiet' }, quiet: true }) });
  const OB = await openPhone(browser, { config: ocfg('d1', { me: { role: 'phone', name: 'plain' } }) });
  check(S, 'a quiet client joins the old server', await join(OQ));
  await join(OB);
  const oq = await state(OQ);
  check(S, 'shareQuiet is false: the server did not confirm', oq.quiet === false && oq.connected);
  check(S, 'the console says the server does not support it', OQ.cons.some((t) => /quiet was asked for, but the server does not support it/.test(t)), OQ.cons.filter((t) => /quiet/.test(t)).join(' | '));
  await OB.evaluate(() => { me.x = 0.4; shared.n = 7; });
  check(S, 'guests still update live (the old server sends everything)', await waitFor(OQ, () => guests.some((x) => x.name === 'plain' && x.x === 0.4)));
  check(S, 'shared still syncs', await waitFor(OQ, () => shared.n === 7));
  await OQ.evaluate(() => { me.x = 0.8; shareEmit('wave'); });
  check(S, 'the plain client sees the quiet client\'s value and event', await waitFor(OB, () => guests.some((x) => x.name === 'quiet' && x.x === 0.8)) && await waitFor(OB, () => evlog.includes('event:wave')));
  check(S, 'no page errors', !OQ.errors.length && !OB.errors.length);
  await leave(OQ);
  await leave(OB);
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
    const worker = startWorker({ dir: SERVER_DIR, port: PORT, inspector: 9340, state: path.join(WORK, 'state-new') });
    workers.push(worker);
    if (oldRelease) {
      workers.push(startWorker({ dir: oldRelease.serverDir, port: OLD_PORT, inspector: 9341, state: path.join(WORK, 'state-old') }));
    }
    await waitForHttp(HOST + '/', 90000);
    if (oldRelease) {
      await waitForHttp(OLD_HOST + '/', 90000);
      global.__oldRunning = true;
    }

    try {
      const res = await fetch(P5_2_URL);
      if (!res.ok) throw new Error(String(res.status));
      p5Body = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.error('p5 2.x CDN not reachable; using the local p5 1.x:', err.message);
    }

    await wireChecks(worker);
    await rateChecks();

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
  console.log(report.join('\n'));
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
