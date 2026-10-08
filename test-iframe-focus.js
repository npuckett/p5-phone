#!/usr/bin/env node
/**
 * Browser check that a sketch inside a cross-origin iframe (the p5.js Web Editor) takes
 * focus when it is tapped or clicked, so Chrome lets it read the motion sensors and the
 * keyboard reaches it.
 * Needs Playwright's Chromium (npx playwright install chromium) and network access for
 * the p5.js 2.2.3 CDN build. Run: node test-iframe-focus.js   (or: npm run test:focus)
 * Set P5PHONE_LIB=<path to a p5-phone build> to run it against another build.
 *
 * Since Chrome 153, Chrome suspends a frame's motion sensors unless that frame, or one
 * of the same origin, is the focused frame. It resumes them only when an element in the
 * newly focused frame takes focus. The Web Editor runs the sketch from a blob: URL inside
 * preview.p5js.org, inside editor.p5js.org, and the tap to start never moved focus there:
 * the tap overlay cancels its touchend, and lockGestures() makes p5 cancel every press.
 * Regression: deviceShaken() and rotationX never changed in the Web Editor on Android,
 * while the same sketch on GitHub Pages worked (fixed for the motion tap in 1.15.3). The
 * other permission taps still left focus on the editor page, and with lockGestures() a
 * click never focused the sketch, so keyPressed() never ran in the Web Editor on a laptop.
 * Emulated sensors skip Chrome's focus check, so this test checks focus itself:
 *
 * 1. In the editor's frame layout, with lockGestures() and enableSensorTap(): after the
 *    tap the sketch's frame has focus and the canvas is the focused element, with no
 *    focus ring, and a key press reaches keyPressed(). Under p5.js 1.x and 2.2.3, and
 *    with lockGestures({ mode: 'embedded' }).
 * 2. Focus moved out (a tap on the editor page): a tap on the canvas brings it back.
 * 3. A tap that asks for something other than motion (enableVibrationTap) focuses too,
 *    and so does a plain tap on a sketch with no permission tap and no lockGestures().
 * 4. A laptop: with lockGestures(), a click on the sketch after the editor's code area had
 *    focus lets keyPressed() run.
 * 5. On a top-level page (GitHub Pages) nothing changes: the canvas gets no tabindex.
 * 6. NFC: Web NFC only runs in a top-level page. In the editor's frames the NFC tap must
 *    stop before scanning with nfcStatus 'unsupported' and an nfcError that says to open
 *    the sketch on its own page; on a top-level page it still scans. Desktop Chromium has
 *    no NDEFReader, so a stand-in throws the way Chrome on Android does in a child frame.
 */

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const EDITOR = 'https://editor.p5js.org';
const PREVIEW = 'https://preview.p5js.org';
const PAGES = 'https://example.github.io';
const LIB = fs.readFileSync(process.env.P5PHONE_LIB || path.join(__dirname, 'src/p5-phone.js'));
const P5_1 = fs.readFileSync(path.join(__dirname, 'node_modules/p5/lib/p5.min.js'));
const P5_2 = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.min.js';

function sketchPage(p5Src, lockCall, tapCall = "enableSensorTap('Tap to start')", head = '') {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">${head}
<style>body { margin: 0; overflow: hidden; } canvas { display: block; touch-action: none; }</style>
<script src="${p5Src}"></script><script src="${PREVIEW}/p5-phone.js"></script></head>
<body><script>
window.keys = 0;
function setup() { createCanvas(windowWidth, windowHeight); ${lockCall}; ${tapCall}; window.ready = true; }
function draw() { background(40); }
function keyPressed() { window.keys++; }
</script></body></html>`;
}

// The editor's preview page: build the sketch document, then load it as a blob: iframe
function previewPage(sketch) {
  const doc = JSON.stringify(sketch);
  return `<!doctype html><html><head><style>html, body, iframe { margin: 0; border: 0; width: 100%; height: 100%; display: block; }</style></head>
<body><iframe id="f"></iframe><script>
const url = URL.createObjectURL(new Blob([${doc.replace(/<\//g, '<\\/')}], { type: 'text/html' }));
document.getElementById('f').src = url;
</script></body></html>`;
}

// The editor page: a control above the sketch (the editor's own UI), then the preview iframe
const editorPage = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body { margin: 0; } #outside { display: block; width: 100%; height: 60px; } #code { position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; }
iframe { display: block; width: 100%; height: 600px; border: 0; }</style></head>
<body><button id="outside">editor</button><textarea id="code"></textarea>
<iframe src="${PREVIEW}/" allow="accelerometer; gyroscope; magnetometer"
  sandbox="allow-scripts allow-same-origin allow-modals allow-popups"></iframe></body></html>`;

async function open(browser, url, routes, device = devices['Pixel 7']) {
  const ctx = await browser.newContext({ ...device });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('/p5-phone.js')) return route.fulfill({ contentType: 'application/javascript', body: LIB });
    if (u.pathname.endsWith('/p5-local.min.js')) return route.fulfill({ contentType: 'application/javascript', body: P5_1 });
    if (u.hostname === 'cdn.jsdelivr.net') return route.continue();
    const body = routes[u.origin + u.pathname];
    if (body !== undefined) return route.fulfill({ contentType: 'text/html', body });
    return route.fulfill({ status: 404, body: '' });
  });
  await p.goto(url);
  return { ctx, p, errors };
}

async function sketchFrame(p, errors) {
  for (let i = 0; i < 100; i++) {
    for (const f of p.frames()) {
      if (await f.evaluate(() => window.ready === true).catch(() => false)) return f;
    }
    await p.waitForTimeout(100);
  }
  throw new Error(errors.length ? `setup() failed: ${errors.join('; ')}` : 'the sketch never ran');
}

const focusState = (f) => f.evaluate(() => {
  const canvas = document.querySelector('canvas');
  return {
    hasFocus: document.hasFocus(),
    canvasFocused: document.activeElement === canvas,
    ring: canvas.matches(':focus-visible'),
    tabindex: canvas.getAttribute('tabindex'),
    overlay: !!document.getElementById('tapOverlay'),
    sensorsEnabled: window.sensorsEnabled === true,
    vibrationEnabled: window.vibrationEnabled === true,
    keys: window.keys,
  };
});

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

async function editorCase(browser, label, p5Src, lockCall, tapCall, flag = 'sensorsEnabled') {
  const { ctx, p, errors } = await open(browser, `${EDITOR}/someone/full/abc123`, {
    [`${EDITOR}/someone/full/abc123`]: editorPage,
    [`${PREVIEW}/`]: previewPage(sketchPage(p5Src, lockCall, tapCall)),
  });
  const f = await sketchFrame(p, errors);
  await p.waitForTimeout(300); // lockGestures() wraps the mouse handlers after 100 ms

  const hasTap = tapCall !== '';
  const before = await focusState(f);
  check(`${label}: before the tap the editor page has focus`, !before.hasFocus && before.overlay === hasTap, before);

  const box = await p.locator('iframe').boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(400);
  const tapped = await focusState(f);
  check(`${label}: the ${hasTap ? 'tap to start' : 'tap'} moves focus to the sketch's canvas`,
    tapped.hasFocus && tapped.canvasFocused && !tapped.overlay && (!hasTap || tapped[flag]), tapped);
  check(`${label}: no focus ring on the canvas`, !tapped.ring, tapped);
  await p.keyboard.press('a');
  await p.waitForTimeout(100);
  check(`${label}: a key press reaches keyPressed()`, (await focusState(f)).keys === 1, await focusState(f));

  await p.touchscreen.tap(box.x + box.width / 2, 30); // the editor's own UI, above the iframe
  await p.waitForTimeout(300);
  const away = await focusState(f);
  check(`${label}: a tap on the editor page takes focus away`, !away.hasFocus, away);

  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(300);
  const back = await focusState(f);
  check(`${label}: a tap on the canvas brings focus back`, back.hasFocus && back.canvasFocused && !back.ring, back);

  check(`${label}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

// A laptop: the editor's code area has focus, then a mouse click on the sketch
async function laptopCase(browser) {
  const label = 'laptop, lockGestures()';
  const { ctx, p, errors } = await open(browser, `${EDITOR}/someone/sketches/abc123`, {
    [`${EDITOR}/someone/sketches/abc123`]: editorPage,
    [`${PREVIEW}/`]: previewPage(sketchPage(P5_2, 'lockGestures()', '')),
  }, { viewport: { width: 1000, height: 700 } });
  const f = await sketchFrame(p, errors);
  await p.waitForTimeout(300);
  await p.focus('#code');
  const box = await p.locator('iframe').boundingBox();
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await p.keyboard.press('a');
  await p.waitForTimeout(100);
  const s = await focusState(f);
  check(`${label}: a click on the sketch lets keyPressed() run`, s.hasFocus && s.canvasFocused && s.keys === 1 && !s.ring, s);
  check(`${label}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

async function topLevelCase(browser) {
  const url = `${PAGES}/sketch/`;
  const { ctx, p, errors } = await open(browser, url, { [url]: sketchPage(P5_2, 'lockGestures()') });
  const f = await sketchFrame(p, errors);
  const vp = p.viewportSize();
  await p.touchscreen.tap(vp.width / 2, vp.height / 2);
  await p.waitForTimeout(400);
  const s = await focusState(f);
  check('top-level page: the tap enables sensors and leaves the canvas alone',
    s.hasFocus && s.sensorsEnabled && !s.overlay && s.tabindex === null && !s.canvasFocused, s);
  check('top-level page: no page errors', errors.length === 0, errors);
  await ctx.close();
}

// Chrome on Android, ndef_reader.cc: scan() from a child frame throws InvalidStateError
const NFC_STUB = `<script>window.NDEFReader = function () {};
NDEFReader.prototype.scan = function () {
  if (window.top !== window) return Promise.reject(new DOMException('Web NFC can only be accessed in a top-level browsing context.', 'InvalidStateError'));
  window.nfcScanned = true; return Promise.resolve();
};</script>`;

async function nfcCase(browser, where) {
  const label = `NFC, ${where}`;
  const page = sketchPage(P5_2, '', "enableNfcTap('Tap to start')", NFC_STUB);
  const top = where === 'top-level page';
  const url = top ? `${PAGES}/nfc/` : `${EDITOR}/someone/full/abc123`;
  const { ctx, p, errors } = await open(browser, url, top
    ? { [url]: page }
    : { [url]: editorPage, [`${PREVIEW}/`]: previewPage(page) });
  const f = await sketchFrame(p, errors);
  const box = top ? { x: 0, y: 0, width: p.viewportSize().width, height: p.viewportSize().height } : await p.locator('iframe').boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(400);
  const s = await f.evaluate(() => ({ enabled: window.nfcEnabled, status: window.nfcStatus, error: window.nfcError, scanned: !!window.nfcScanned }));
  if (top) {
    check(`${label}: the tap starts scanning`, s.enabled && s.status === 'scanning' && s.scanned, s);
  } else {
    check(`${label}: the tap stops before scanning and says why`,
      !s.enabled && !s.scanned && s.status === 'unsupported' && /own page/.test(s.error), s);
  }
  check(`${label}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    const sensorTap = "enableSensorTap('Tap to start')";
    await editorCase(browser, 'p5.js 2.2.3', P5_2, 'lockGestures()', sensorTap);
    await editorCase(browser, 'p5.js 1.x', `${PREVIEW}/p5-local.min.js`, 'lockGestures()', sensorTap);
    await editorCase(browser, 'p5.js 2.2.3, embedded lock', P5_2, "lockGestures({ mode: 'embedded' })", sensorTap);
    await editorCase(browser, 'p5.js 2.2.3, vibration tap', P5_2, 'lockGestures()', "enableVibrationTap('Tap to start')", 'vibrationEnabled');
    await editorCase(browser, 'p5.js 2.2.3, no tap, no lock', P5_2, '', '');
    await laptopCase(browser);
    await topLevelCase(browser);
    await nfcCase(browser, 'top-level page');
    await nfcCase(browser, 'Web Editor');
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
