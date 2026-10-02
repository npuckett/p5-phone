#!/usr/bin/env node
/**
 * Browser checks for p5's tilt and touch variables under p5-phone. Needs Playwright's
 * Chromium (npx playwright install chromium) and network access for the p5.js 2.x CDN builds.
 * Run: node test-input-state.js   (or: npm run test:input)
 *
 * 1. Empty tilt reading: a computer with no tilt sensor sends one deviceorientation event
 *    with alpha, beta and gamma all null. Under p5.js 1.x, 2.2.3 and 2.3.4, a tilt sketch
 *    with angleMode(DEGREES) taps to start, gets an empty reading, and must log no p5.js
 *    warnings for 3 seconds, with rotationX/Y/Z still 0. Real readings must then come
 *    through, a reading without alpha too, and rotationX must follow angleMode(RADIANS).
 *    Regression: p5 turned the empty reading into rotationX = null, and every map() or
 *    round() on it logged "Expected number" (hundreds of warnings a second).
 * 2. Cancelled touches (p5.js 2.2.3, with and without lockGestures): a touch the browser
 *    cancels must leave touches[], mouseIsPressed and mouseButton as if the finger had
 *    lifted, call mouseReleased() once, and keep mouseX/mouseY at the finger's last
 *    position. Covers real cancels from Chromium's touch emulation, a synthetic
 *    pointercancel at 0, 0 (how WebKit sends one when a scroll or zoom takes the touch),
 *    two fingers where one lifts, and a mouse pointercancel, which must be left to p5.
 *    Regression: p5.js 2.0 to 2.3.0 have no pointercancel handler, so the finger stayed
 *    in touches[] until the page reloaded. p5.js 2.3.1 added its own, so under 2.3.4
 *    p5-phone must leave the cancel to p5 (released once, by p5, without mouseReleased()).
 */

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9999';
const P5_1 = '/node_modules/p5/lib/p5.js';
const P5_2 = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';
const P5_23 = 'https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.js'; // has its own pointercancel handler

// The counter goes in before p5-phone loads, so it sees every empty reading, including
// the browser's own one at page load.
function page(p5Src, sketch) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
window.emptyReadings = 0;
addEventListener('deviceorientation', function (e) { if (e.beta === null) emptyReadings++; }, true);
</script>
<script src="${p5Src}"></script><script src="/src/p5-phone.js"></script></head>
<body style="margin:0"><script>${sketch}</script></body></html>`;
}

const tiltSketch = `
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);
  enableGyroTap('tap');
  window.ready = true;
}
function draw() {
  background(20);
  if (!window.sensorsEnabled) return;
  let x = map(rotationY, -45, 45, 0, width, true);
  let y = map(rotationX, -45, 45, 0, height, true);
  circle(x, y, 80);
  text('rotationX ' + round(rotationX) + '   rotationY ' + round(rotationY), 20, 40);
}`;

const touchSketch = (lock) => `
window.evlog = [];
function setup() {
  createCanvas(windowWidth, windowHeight);
  ${lock ? 'lockGestures();' : ''}
  window.ready = true;
}
function draw() { background(20); }
function mousePressed() { evlog.push('pressed'); }
function mouseReleased(e) { evlog.push('released:' + (e && e.type)); }`;

async function open(ctx, html) {
  const p = await ctx.newPage();
  const errors = [];
  const warnings = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.text().includes('p5.js says')) warnings.push(m.text()); });
  await p.route(ORIGIN + '/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    const file = path.join(__dirname, pathname);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(file) });
  });
  await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => window.ready === true, null, { timeout: 15000 });
  return { p, errors, warnings };
}

const orient = (p, reading) => p.evaluate((r) => {
  window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', r));
}, reading);
const rotation = (p) => p.evaluate(() => [rotationX, rotationY, rotationZ]);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Synthetic pointer events, dispatched on the canvas so they bubble to window like real ones.
const pointer = (p, type, init) => p.evaluate(([t, i]) => {
  document.querySelector('canvas').dispatchEvent(new PointerEvent(t, Object.assign({
    isPrimary: true, bubbles: true, cancelable: t !== 'pointercancel', composed: true,
  }, i)));
}, [type, init]);
const pressState = (p) => p.evaluate(() => ({
  touches: touches.length,
  mouseIsPressed,
  left: mouseButton.left,
  mouse: Math.round(mouseX) + ',' + Math.round(mouseY),
  events: evlog.join(' '),
}));

(async () => {
  const browser = await chromium.launch();
  const rows = [];

  // 1. Empty tilt reading
  for (const [ver, src] of [['1.x', P5_1], ['2.2.3', P5_2], ['2.3.4', P5_23]]) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const { p, errors, warnings } = await open(ctx, page(src, tiltSketch));
    await p.click('#tapOverlay');
    await p.waitForFunction(() => window.sensorsEnabled === true);
    // Count from the tap. The unminified p5.js 1.x also logs "p5 had problems creating the
    // global function …" once per p5-phone function at startup, which is not this check.
    const startup = warnings.length;
    await orient(p, {}); // an empty reading after the sketch is listening, whatever the browser sent
    await p.waitForTimeout(3000);
    const afterEmpty = await rotation(p);
    const tiltWarnings = warnings.slice(startup);

    await orient(p, { alpha: 30, beta: 20, gamma: -10 });
    const first = await rotation(p);
    await orient(p, { alpha: 300, beta: -45, gamma: 60 });
    const second = await rotation(p);
    const pRotationX = await p.evaluate(() => pRotationX);
    await orient(p, { alpha: null, beta: 15, gamma: 5 }); // not empty: only alpha missing
    const noAlpha = (await rotation(p)).slice(0, 2);
    await orient(p, {}); // an empty reading mid-stream changes nothing
    const kept = (await rotation(p)).slice(0, 2);
    await p.evaluate(() => angleMode(RADIANS));
    await orient(p, { alpha: 0, beta: 90, gamma: 0 });
    const radians = await p.evaluate(() => Math.abs(rotationX - Math.PI / 2) < 1e-9);
    await p.waitForTimeout(200);
    const emptyReadings = await p.evaluate(() => window.emptyReadings);

    const ok = tiltWarnings.length === 0 && !errors.length && same(afterEmpty, [0, 0, 0]) &&
      same(first, [20, -10, 30]) && same(second, [-45, 60, 300]) && pRotationX === 20 &&
      same(noAlpha, [15, 5]) && same(kept, [15, 5]) && radians;
    rows.push({
      check: 'empty tilt reading', p5: ver,
      detail: `${emptyReadings} empty readings, rotation after 3 s ${afterEmpty.join('/')}, then ${first.join('/')} and ${second.join('/')}, radians ${radians}`,
      warnings: tiltWarnings.length, errors: errors.length, ok,
    });
    if (tiltWarnings.length) console.log(`  first p5.js warning (${ver}): ${tiltWarnings[0].slice(0, 140)}`);
    await ctx.close();
  }

  // 2. Cancelled touches
  for (const lock of [true, false]) {
    const ctx = await browser.newContext(devices['Pixel 7']);
    const run = async (name, steps, expected, src = P5_2, ver = '2.2.3') => {
      const { p, errors } = await open(ctx, page(src, touchSketch(lock)));
      const cdp = await ctx.newCDPSession(p);
      const r = await steps(p, cdp);
      const ok = Object.entries(expected).every(([k, v]) => r[k] === v) && !errors.length;
      rows.push({ check: name, p5: ver, detail: `lockGestures ${lock ? 'on' : 'off'}: ${JSON.stringify(r)}`, errors: errors.length, ok });
      await p.close();
    };

    await run('real cancel, 1 finger', async (p, cdp) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 200, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 140, y: 230, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await p.waitForTimeout(200);
      return pressState(p);
    }, { touches: 0, mouseIsPressed: false, left: false, mouse: '140,230', events: 'pressed released:pointercancel' });

    await run('real cancel, 2 fingers', async (p, cdp) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 200, id: 1 }, { x: 250, y: 400, id: 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await p.waitForTimeout(200);
      return pressState(p);
    }, { touches: 0, mouseIsPressed: false, left: false, events: 'pressed pressed released:pointercancel released:pointercancel' });

    await run('cancel at 0,0 (WebKit)', async (p) => {
      await pointer(p, 'pointerdown', { pointerId: 21, pointerType: 'touch', clientX: 200, clientY: 300, buttons: 1 });
      await pointer(p, 'pointermove', { pointerId: 21, pointerType: 'touch', clientX: 220, clientY: 320, buttons: 1 });
      await pointer(p, 'pointercancel', { pointerId: 21, pointerType: 'touch' });
      return pressState(p);
    }, { touches: 0, mouseIsPressed: false, left: false, mouse: '220,320', events: 'pressed released:pointercancel' });

    // p5 sets mouseIsPressed false when any finger lifts; touches.length still counts the
    // other finger. That is p5's behaviour, documented in the README and SKILL.md.
    await run('2 fingers, 1 lifts, 1 cancels', async (p) => {
      await pointer(p, 'pointerdown', { pointerId: 31, pointerType: 'touch', clientX: 100, clientY: 150, buttons: 1 });
      await pointer(p, 'pointerdown', { pointerId: 32, pointerType: 'touch', isPrimary: false, clientX: 300, clientY: 500, buttons: 1 });
      await pointer(p, 'pointerup', { pointerId: 32, pointerType: 'touch', isPrimary: false, clientX: 300, clientY: 500 });
      const oneLifted = await pressState(p);
      await pointer(p, 'pointercancel', { pointerId: 31, pointerType: 'touch' });
      const cancelled = await pressState(p);
      return {
        afterLift: `${oneLifted.touches} touch, mouseIsPressed ${oneLifted.mouseIsPressed}`,
        touches: cancelled.touches, mouseIsPressed: cancelled.mouseIsPressed, left: cancelled.left,
        mouse: cancelled.mouse, events: cancelled.events,
      };
    }, { afterLift: '1 touch, mouseIsPressed false', touches: 0, mouseIsPressed: false, left: false, mouse: '100,150', events: 'pressed pressed released:pointerup released:pointercancel' });

    // Chrome cancels a mouse pointer when a native drag starts, then sends dragend, which
    // p5 already treats as pointerup. Forwarding the cancel too would release it twice.
    await run('mouse cancel left to p5', async (p) => {
      await pointer(p, 'pointerdown', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 60, buttons: 1 });
      await pointer(p, 'pointercancel', { pointerId: 1, pointerType: 'mouse' });
      const cancelled = await pressState(p);
      await pointer(p, 'pointerup', { pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 60 });
      const up = await pressState(p);
      return { afterCancel: cancelled.events, events: up.events, mouseIsPressed: up.mouseIsPressed };
    }, { afterCancel: 'pressed', events: 'pressed released:pointerup', mouseIsPressed: false });

    // p5.js 2.3.1+ releases the touch itself and does not call mouseReleased(). A second
    // release here would mean p5-phone handled the cancel as well.
    await run('p5 handles its own cancel', async (p, cdp) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 200, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await p.waitForTimeout(200);
      return pressState(p);
    }, { touches: 0, mouseIsPressed: false, left: false, events: 'pressed' }, P5_23, '2.3.4');

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
