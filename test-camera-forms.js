#!/usr/bin/env node
/**
 * Browser checks for two problems found building camera sketches with p5.js 2.2.3. Needs
 * Playwright's Chromium (npx playwright install chromium) and network access for the
 * p5.js 2.x CDN builds. Chromium's fake camera stands in for a real one.
 * Run: node test-camera-forms.js   (or: npm run test:camera-forms)
 * Set P5PHONE_LIB=<path to a p5-phone build> to run it against another build.
 *
 * 1. image(cam): a sketch that draws a PhoneCamera with image(cam, 0, 0, width, height)
 *    must log no p5.js warnings, from page load through the camera tap, 2 seconds of
 *    frames and a switch to the other camera, under the unminified p5.js 1.x, 2.2.3 and
 *    2.3.4, and the camera must be on the canvas. image() with a p5.Graphics must still
 *    draw, and under p5.js 2.x a wrong argument must still get p5's warning.
 *    Regression: p5.js 2.2.3 checks arguments in a wrapper around every p5 function, and
 *    that wrapper ran before p5-phone's image() override, so "Expected Image or Element
 *    ... at the first parameter in image()" was logged on every frame. Starting the camera
 *    also logged "Expected object at the second parameter in createCapture()" once.
 * 2. lockGestures() and form controls, in fullscreen and embedded mode, under p5.js 1.x
 *    and 2.2.3, with a mouse and with touch: a click or tap on a createInput() field, a
 *    textarea or a contenteditable element focuses it and typing reaches it; a select
 *    takes focus; two quick presses on a checkbox toggle it twice; and the sketch's
 *    mousePressed() (touchStarted() for a touch in p5.js 1.x), which returns false like
 *    the camera examples, still runs. With touch,
 *    a tap on a field at the screen's left edge focuses it. With a mouse, a right-click in
 *    a field is not cancelled. A press and a right-click on the canvas are still cancelled.
 *    Regression: lockGestures() makes the sketch's press handlers return false, and p5
 *    listens on window, so p5 cancelled presses on the page's text fields too. Clicking
 *    one left document.activeElement on BODY and typing did nothing.
 */

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9999';
const LIB = fs.readFileSync(process.env.P5PHONE_LIB || path.join(__dirname, 'src/p5-phone.js'));
const P5_1 = '/node_modules/p5/lib/p5.js'; // unminified: the minified builds check no arguments
const P5_2 = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';
const P5_23 = 'https://cdn.jsdelivr.net/npm/p5@2.3.4/lib/p5.js';

function page(p5Src, sketch) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="${p5Src}"></script><script src="/p5-phone.js"></script></head>
<body style="margin:0"><script>${sketch}</script></body></html>`;
}

async function open(ctx, html) {
  const p = await ctx.newPage();
  const errors = [];
  const warnings = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.text().includes('p5.js says')) warnings.push(m.text().replace(/\s+/g, ' ')); });
  await p.route(ORIGIN + '/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (pathname === '/p5-phone.js') return route.fulfill({ contentType: 'application/javascript', body: LIB });
    const file = path.join(__dirname, pathname);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(file) });
  });
  await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => window.ready === true, null, { timeout: 15000 });
  return { p, errors, warnings };
}

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

// The camera examples' pattern (01_color_tracking)
const cameraSketch = `
let cam;
function setup() {
  createCanvas(400, 300);
  lockGestures();
  cam = createPhoneCamera('user', true, 'cover');
  enableCameraTap('Tap to enable camera');
  window.ready = true;
}
function draw() {
  background(16, 19, 24);
  if (cam.ready) image(cam, 0, 0, width, height);
}`;

const cameraOn = (p) => p.waitForFunction(() => cam.ready && cam.videoElement && cam.videoElement.readyState >= 2, null, { timeout: 15000 });

async function cameraCase(browser, ver, src) {
  const label = `image(cam), p5.js ${ver}`;
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const { p, errors, warnings } = await open(ctx, page(src, cameraSketch));
  await p.click('#tapOverlay');
  await cameraOn(p);
  const f0 = await p.evaluate(() => frameCount);
  await p.waitForTimeout(2000);
  const frames = (await p.evaluate(() => frameCount)) - f0;
  // Share of sampled pixels that are not the background: the camera covers the canvas
  const covered = await p.evaluate(() => {
    loadPixels();
    let hit = 0, n = 0;
    for (let i = 0; i < pixels.length; i += 4 * 101, n++) {
      if (pixels[i] !== 16 || pixels[i + 1] !== 19 || pixels[i + 2] !== 24) hit++;
    }
    return Math.round((hit / n) * 100);
  });
  check(`${label}: the camera is drawn (${frames} frames, ${covered}% of the canvas)`, frames > 30 && covered > 90, { frames, covered });

  await p.evaluate(() => { cam.active = 'environment'; });
  await p.waitForFunction(() => cam.active === 'environment' && cam.ready, null, { timeout: 15000 });
  await cameraOn(p);
  await p.waitForTimeout(500);
  check(`${label}: no p5.js warnings from load through a camera switch`, warnings.length === 0,
    { count: warnings.length, first: warnings[0] && warnings[0].slice(0, 160) });

  // Anything else still goes to p5's image(), and p5 still checks it
  const other = await p.evaluate(() => {
    noLoop();
    const g = createGraphics(20, 20);
    g.background(255, 0, 0);
    background(0);
    image(g, 0, 0);
    const drawn = get(10, 10).slice(0, 3).join(',');
    try { image('not an image', 0, 0); } catch (error) { /* p5 may throw after warning */ }
    return drawn;
  });
  await p.waitForTimeout(100);
  check(`${label}: image() of a p5.Graphics still draws`, other === '255,0,0', other);
  if (ver !== '1.x') { // p5.js 1.x's image() checks no arguments
    check(`${label}: a wrong image() argument still gets p5's warning`,
      warnings.some((w) => w.includes('image()')), warnings.slice(-1));
  }
  check(`${label}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

// Form controls on the page, outside the canvas. The listeners record, once the event is
// over, whether anything cancelled it: p5 on window, or lockGestures() on the document or
// the canvas (embedded mode stops a canvas contextmenu from reaching window).
const formSketch = (lock) => `
let field, area, note, menu, box, edgeField;
window.presses = 0;
window.prevented = [];
window.toggles = 0;
function setup() {
  createCanvas(360, 200);
  ${lock}
  field = createInput('x');
  field.id('field').position(40, 220).size(200, 28);
  area = createElement('textarea');
  area.id('area').position(40, 270).size(200, 40);
  note = createDiv('');
  note.attribute('contenteditable', 'true');
  note.position(40, 330).size(200, 28);
  menu = createSelect();
  menu.option('one');
  menu.option('two');
  menu.position(40, 380);
  box = createCheckbox(' ok', false);
  box.position(40, 420);
  box.elt.querySelector('input').addEventListener('change', () => toggles++);
  edgeField = createInput('');
  edgeField.id('edge').position(0, 470).size(200, 28);
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'contextmenu']) {
    window.addEventListener(type, (e) => setTimeout(() => {
      if (e.defaultPrevented) prevented.push(type + ':' + (e.target.tagName || '').toLowerCase());
    }), true);
  }
  window.ready = true;
}
function draw() { background(30); }
function mousePressed() { presses++; return false; }
function touchStarted() { presses++; return false; } // p5.js 1.x sends touches here`;

const LOCKS = {
  fullscreen: 'lockGestures();',
  embedded: "lockGestures({ mode: 'embedded', element: document.querySelector('canvas') });",
};

async function formCase(browser, ver, src, device, mode) {
  const label = `form controls, p5.js ${ver}, ${device}, ${mode}`;
  const touch = device === 'touch';
  const ctx = await browser.newContext(touch ? devices['Pixel 7'] : { viewport: { width: 800, height: 600 } });
  const { p, errors } = await open(ctx, page(src, formSketch(LOCKS[mode])));
  await p.waitForTimeout(300); // lockGestures() wraps the press handlers after 100 ms
  const press = (selector) => (touch ? p.tap(selector) : p.click(selector));
  const active = () => p.evaluate(() => document.activeElement === document.querySelector('canvas')
    ? 'canvas' : document.activeElement.tagName.toLowerCase());

  await press('#field');
  await p.keyboard.type('abc');
  const typed = await p.evaluate(() => [document.activeElement === field.elt, field.value()]);
  check(`${label}: a text field takes focus and typing`, typed[0] && typed[1] === 'xabc', typed);

  await press('#area');
  await p.keyboard.type('hi');
  const areaValue = await p.evaluate(() => document.activeElement === area.elt && area.value());
  check(`${label}: a textarea takes focus and typing`, areaValue === 'hi', areaValue);

  await press('[contenteditable]');
  await p.keyboard.type('zz');
  const noteText = await p.evaluate(() => document.activeElement === note.elt && note.elt.textContent);
  check(`${label}: a contenteditable element takes focus and typing`, noteText === 'zz', noteText);

  await press('select');
  const selectFocused = (await active()) === 'select';
  if (!touch) await p.keyboard.press('Escape');
  check(`${label}: a select takes focus`, selectFocused, await active());

  // Two presses 100 ms apart: under 300 ms, so lockGestures() would count them as a double-tap
  const boxPos = await p.locator('input[type=checkbox]').boundingBox();
  const cx = boxPos.x + boxPos.width / 2;
  const cy = boxPos.y + boxPos.height / 2;
  for (let i = 0; i < 2; i++) {
    if (touch) await p.touchscreen.tap(cx, cy); else await p.mouse.click(cx, cy);
    await p.waitForTimeout(100);
  }
  const boxState = await p.evaluate(() => ({ toggles, checked: box.checked() }));
  check(`${label}: two quick presses on a checkbox toggle it twice`, boxState.toggles === 2 && !boxState.checked, boxState);

  if (touch) {
    const edge = await p.locator('#edge').boundingBox();
    await p.touchscreen.tap(6, edge.y + edge.height / 2); // inside lockGestures()'s 20 px edge
    await p.waitForTimeout(100);
    const edgeFocused = await p.evaluate(() => document.activeElement === edgeField.elt);
    check(`${label}: a tap on a field at the screen's edge focuses it`, edgeFocused, await active());
  } else {
    await p.click('#field', { button: 'right' });
  }

  const onFields = await p.evaluate(() => prevented.slice());
  check(`${label}: no press on a form control was cancelled`, onFields.length === 0, onFields);
  const presses = await p.evaluate(() => presses);
  check(`${label}: the sketch's press handler still ran for them`, presses > 0, presses);

  // The canvas: p5 cancels the press (pointerdown in 2.x; mousedown or touchstart in 1.x)
  await press('canvas');
  if (!touch) await p.click('canvas', { button: 'right' });
  await p.waitForTimeout(100);
  const onCanvas = await p.evaluate(() => prevented.slice());
  const pressCancelled = onCanvas.some((s) => /^(pointerdown|mousedown|touchstart):canvas$/.test(s));
  const menuCancelled = touch || onCanvas.includes('contextmenu:canvas');
  check(`${label}: a press${touch ? '' : ' and a right-click'} on the canvas are still cancelled`, pressCancelled && menuCancelled, onCanvas);

  check(`${label}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

(async () => {
  // Chromium's fake camera and an automatic yes to the camera prompt
  const browser = await chromium.launch({
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  try {
    for (const [ver, src] of [['1.x', P5_1], ['2.2.3', P5_2], ['2.3.4', P5_23]]) {
      await cameraCase(browser, ver, src);
    }
    for (const [ver, src] of [['1.x', P5_1], ['2.2.3', P5_2]]) {
      for (const device of ['mouse', 'touch']) {
        for (const mode of Object.keys(LOCKS)) {
          await formCase(browser, ver, src, device, mode);
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
