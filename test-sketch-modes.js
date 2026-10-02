#!/usr/bin/env node
/**
 * Browser checks that p5-phone's functions work in p5.js global and instance mode, with no
 * p5.js warnings. Needs Playwright's Chromium (npx playwright install chromium) and network
 * access for the p5.js 2.x CDN build.
 * Run: node test-sketch-modes.js   (or: npm run test:modes)
 *
 * 1. Global mode: a sketch that calls lockGestures(), angleMode(DEGREES) and enableGyroTap()
 *    must log no p5.js warnings from page load through the tap, under the unminified
 *    p5.js 1.x and 2.2.3, and the tap must still turn the sensors on.
 *    Regression: in global mode, p5.js 1.x copies every enumerable p5.prototype property
 *    onto window. p5-phone's functions are globals already, so the unminified build logged
 *    "p5 had problems creating the global function …" once per function: 144 warnings.
 * 2. Instance mode: p.lockGestures() and p.enableGyroTap() must work, under both versions.
 * 3. remove() in a p5.js 1.x global-mode sketch must leave p5-phone's functions on window.
 *    Regression: remove() cleared every enumerable p5.prototype name from window, so
 *    lockGestures, unlockGestures and the rest became undefined.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ORIGIN = 'http://localhost:9999';
const P5_1 = '/node_modules/p5/lib/p5.js'; // unminified: p5.min.js never logged the warnings
const P5_2 = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';

function page(p5Src, sketch) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="${p5Src}"></script><script src="/src/p5-phone.js"></script></head>
<body style="margin:0"><script>${sketch}</script></body></html>`;
}

// The sketch from the report: 144 warnings under p5.js 1.11.10, before setup() ran
const globalSketch = `
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  angleMode(DEGREES);
  enableGyroTap('tap');
  window.ready = true;
}
function draw() { background(20); }`;

const instanceSketch = `
new p5((p) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.lockGestures();
    p.angleMode(p.DEGREES);
    p.enableGyroTap('tap');
    window.ready = true;
  };
  p.draw = () => p.background(20);
});`;

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
  // A setup() that throws (p.lockGestures is not a function) never sets ready: say why
  await p.waitForFunction(() => window.ready === true, null, { timeout: 15000 })
    .catch((e) => { throw new Error(errors.length ? `setup() failed: ${errors.join('; ')}` : e.message); });
  return { p, errors, warnings };
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];

  // 1 and 2. Global and instance mode
  for (const [ver, src] of [['1.x', P5_1], ['2.2.3', P5_2]]) {
    for (const [mode, sketch] of [['global', globalSketch], ['instance', instanceSketch]]) {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
      const { p, errors, warnings } = await open(ctx, page(src, sketch));
      await p.waitForTimeout(1000); // the first frames
      const locked = await p.evaluate(() => window.gesturesLocked);
      await p.click('#tapOverlay');
      await p.waitForFunction(() => window.sensorsEnabled === true);
      const ok = warnings.length === 0 && !errors.length && locked === true;
      rows.push({
        check: `${mode} mode`, p5: ver,
        detail: `gesturesLocked ${locked}, sensorsEnabled true after the tap`,
        warnings: warnings.length, errors: errors.length, ok,
      });
      if (warnings.length) console.log(`  first p5.js warning (${ver}, ${mode} mode): ${warnings[0].trim().slice(0, 140)}`);
      await ctx.close();
    }
  }

  // 3. remove() in global mode, p5.js 1.x
  {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const { p, errors } = await open(ctx, page(P5_1, globalSketch));
    await p.evaluate(() => remove());
    const gone = await p.evaluate(() => ['lockGestures', 'unlockGestures', 'enableGyroTap', 'enableSensorTap', 'vibrate', 'debug']
      .filter((name) => typeof window[name] !== 'function'));
    rows.push({
      check: 'remove(), global mode', p5: '1.x',
      detail: gone.length ? `undefined after remove(): ${gone.join(', ')}` : 'lockGestures, enableGyroTap and the rest still on window',
      errors: errors.length, ok: !gone.length && !errors.length,
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
