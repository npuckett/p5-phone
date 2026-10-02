#!/usr/bin/env node
/**
 * Browser checks for what p5-phone releases when a p5.js 2.x sketch calls remove(). Needs
 * Playwright's Chromium (npx playwright install chromium) and network access for the p5.js
 * 2.x CDN builds. GPS and the Share worker are stand-ins, so no location permission or
 * running worker is needed.
 * Run: node test-remove-cleanup.js   (or: npm run test:remove)
 *
 * 1. With lockGestures() on, a GPS watch running (enableGeoTap) and Share connected, under
 *    p5.js 2.2.3 and 2.3.4, remove() must unlock the gestures (window.gesturesLocked false,
 *    the document listeners gone, the sketch's own mousePressed back on window), clear the
 *    GPS watch, and close the Share socket for good: no reconnect, and no shareClosed() call
 *    into the removed sketch.
 *    Regression: the addon registered lifecycles.preremove, a name p5.js 2.x drops without
 *    a warning (it keeps presetup, postsetup, predraw, postdraw and remove only), so none of
 *    this ran.
 * 2. With nothing started, remove() must stay quiet: no errors, no "GPS watch stopped",
 *    geoStatus and shareStatus still 'idle'.
 * 3. remove() within 100 ms of lockGestures(), before lockGestures() wraps the sketch's mouse
 *    handlers, must leave them unwrapped, with no errors.
 *    Regression: the 100 ms timer ran anyway and wrapped them on the unlocked page, then
 *    threw "debugWarn is not a function" (remove() had cleared p5-phone's globals).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ORIGIN = 'http://localhost:9999';
const P5_2 = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';
const P5_23 = 'https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.js';

// The geolocation stand-in goes in before p5-phone loads. It answers at once, hands out
// watch ids from 40 up and records every clearWatch().
function page(p5Src, sketch) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
window.geoCalls = { watches: [], cleared: [] };
(function () {
  const here = { coords: { latitude: 43.6532, longitude: -79.3832, accuracy: 20, altitude: null,
    altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() };
  navigator.geolocation.getCurrentPosition = (ok) => setTimeout(() => ok(here), 0);
  navigator.geolocation.watchPosition = (ok) => {
    const id = 40 + geoCalls.watches.length;
    geoCalls.watches.push(id);
    setTimeout(() => ok(here), 0);
    return id;
  };
  navigator.geolocation.clearWatch = (id) => geoCalls.cleared.push(id);
})();
</script>
<script src="${p5Src}"></script><script src="/src/p5-phone.js"></script></head>
<body style="margin:0"><script>${sketch}</script></body></html>`;
}

const busySketch = `
window.evlog = [];
function setup() {
  createCanvas(windowWidth, windowHeight);
  window.ownMousePressed = mousePressed;
  lockGestures();
  shareSetup({ host: 'http://share.test', room: 'remove-check' });
  shareConnect();
  enableGeoTap('tap');
  window.ready = true;
}
function draw() { background(20); }
function mousePressed() {}
function shareClosed() { evlog.push('shareClosed'); }`;

const earlySketch = `
function setup() {
  createCanvas(200, 200);
  window.ownMousePressed = mousePressed;
  lockGestures();
  setTimeout(() => { remove(); window.ready = true; }, 10);
}
function draw() { background(20); }
function mousePressed() {}`;

const quietSketch = `
function setup() {
  createCanvas(200, 200);
  window.ready = true;
}
function draw() { background(20); }`;

// A stand-in for the Share worker: it welcomes every socket and records how each one closed.
async function shareWorker(ctx) {
  const share = { sockets: 0, closed: [] };
  await ctx.routeWebSocket(/\/parties\/share-room\//, (ws) => {
    share.sockets++;
    let closed = false;
    ws.onMessage((raw) => {
      if (JSON.parse(raw).type !== 'hello') return;
      ws.send(JSON.stringify({ type: 'welcome', clientId: 'c' + share.sockets, isHost: true, shared: {}, you: {}, guests: [] }));
    });
    // With an onClose handler, Playwright leaves the page's socket closing until the route
    // closes it too, and the page's onclose (which could call shareClosed()) never runs.
    // That close comes back through this handler, so only the first one is recorded.
    ws.onClose((code, reason) => {
      if (closed) return;
      closed = true;
      share.closed.push(`${code} ${reason}`);
      ws.close({ code, reason });
    });
  });
  return share;
}

async function open(ctx, html) {
  const p = await ctx.newPage();
  const errors = [];
  const logs = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => logs.push(m.text()));
  await p.route(ORIGIN + '/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    const file = path.join(__dirname, pathname);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(file) });
  });
  await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => window.ready === true, null, { timeout: 15000 });
  return { p, errors, logs };
}

// lockGestures() blocks gesturestart on document, so a synthetic one shows whether that
// listener is still there.
const state = (p) => p.evaluate(() => {
  const gesture = new Event('gesturestart', { cancelable: true });
  document.dispatchEvent(gesture);
  return {
    locked: window.gesturesLocked,
    blocking: gesture.defaultPrevented,
    mousePressed: window.mousePressed === window.ownMousePressed ? 'own' : 'wrapped',
    geoEnabled: window.geoEnabled,
    watches: geoCalls.watches.join(','),
    cleared: geoCalls.cleared.join(','),
    shareConnected: window.shareConnected,
    events: evlog.join(' '),
  };
});

(async () => {
  const browser = await chromium.launch();
  const rows = [];

  for (const [ver, src] of [['2.2.3', P5_2], ['2.3.4', P5_23]]) {
    // 1. Gestures locked, GPS watching, Share connected
    let ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const share = await shareWorker(ctx);
    const busy = await open(ctx, page(src, busySketch));
    await busy.p.click('#tapOverlay');
    await busy.p.waitForFunction(() => window.geoEnabled === true && window.shareConnected === true);
    // lockGestures() wraps the sketch's mouse handlers 100 ms after it runs
    await busy.p.waitForFunction(() => window.mousePressed !== window.ownMousePressed);
    const before = await state(busy.p);
    await busy.p.evaluate(() => remove());
    await busy.p.waitForTimeout(2000); // past Share's first reconnect (1.5 s)
    const after = await state(busy.p);
    const errors = busy.errors.length;

    rows.push({
      check: 'unlocks gestures', p5: ver,
      detail: `locked ${before.locked} -> ${after.locked}, listeners ${before.blocking ? 'on' : 'off'} -> ${after.blocking ? 'on' : 'off'}, mousePressed ${before.mousePressed} -> ${after.mousePressed}`,
      errors, ok: before.locked === true && before.blocking && before.mousePressed === 'wrapped' &&
        after.locked === false && !after.blocking && after.mousePressed === 'own' && !errors,
    });
    rows.push({
      check: 'clears the GPS watch', p5: ver,
      detail: `watches [${after.watches}], cleared [${after.cleared}], geoEnabled ${before.geoEnabled} -> ${after.geoEnabled}`,
      errors, ok: before.geoEnabled === true && before.watches === '40' && before.cleared === '' &&
        after.watches === '40' && after.cleared === '40' && after.geoEnabled === false && !errors,
    });
    rows.push({
      check: 'closes Share', p5: ver,
      detail: `sockets ${share.sockets}, closed [${share.closed.join('; ')}], shareConnected ${before.shareConnected} -> ${after.shareConnected}, shareClosed() ${after.events ? 'called' : 'not called'}`,
      errors, ok: before.shareConnected === true && after.shareConnected === false && share.sockets === 1 &&
        share.closed.join('; ') === '1000 disconnect' && after.events === '' && !errors,
    });
    await ctx.close();

    // 2. Nothing started
    ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const quiet = await open(ctx, page(src, quietSketch));
    const startup = quiet.logs.length;
    await quiet.p.evaluate(() => remove());
    await quiet.p.waitForTimeout(200);
    const r = await quiet.p.evaluate(() => ({ geoStatus: window.geoStatus, shareStatus: window.shareStatus, cleared: geoCalls.cleared.length }));
    const gpsLog = quiet.logs.slice(startup).some((t) => t.includes('GPS watch stopped'));
    rows.push({
      check: 'nothing to release', p5: ver,
      detail: `geoStatus ${r.geoStatus}, shareStatus ${r.shareStatus}, "GPS watch stopped" ${gpsLog ? 'logged' : 'not logged'}`,
      errors: quiet.errors.length,
      ok: r.geoStatus === 'idle' && r.shareStatus === 'idle' && r.cleared === 0 && !gpsLog && !quiet.errors.length,
    });
    await ctx.close();

    // 3. remove() before lockGestures() wraps the mouse handlers
    ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const early = await open(ctx, page(src, earlySketch));
    await early.p.waitForTimeout(300); // past lockGestures()'s 100 ms timer
    const e = await early.p.evaluate(() => ({
      locked: window.gesturesLocked,
      mousePressed: window.mousePressed === window.ownMousePressed ? 'own' : 'wrapped',
    }));
    rows.push({
      check: 'remove() right after lock', p5: ver,
      detail: `locked ${e.locked}, mousePressed ${e.mousePressed}${early.errors.length ? ', ' + early.errors[0] : ''}`,
      errors: early.errors.length,
      ok: e.locked === false && e.mousePressed === 'own' && !early.errors.length,
    });
    await ctx.close();
  }

  await browser.close();
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
