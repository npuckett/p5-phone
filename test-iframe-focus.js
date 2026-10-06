#!/usr/bin/env node
/**
 * Browser check that a sketch inside a cross-origin iframe (the p5.js Web Editor) takes
 * focus when the phone taps to start, so Chrome lets it read the motion sensors.
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
 * while the same sketch on GitHub Pages worked. Emulated sensors skip Chrome's focus
 * check, so this test checks focus itself:
 *
 * 1. In the editor's frame layout, with lockGestures() and enableSensorTap(): after the
 *    tap the sketch's frame has focus and the canvas is the focused element, with no
 *    focus ring. Under p5.js 1.x and 2.2.3, and with lockGestures({ mode: 'embedded' }).
 * 2. Focus moved out (a tap on the editor page): a tap on the canvas brings it back.
 * 3. On a top-level page (GitHub Pages) nothing changes: the canvas gets no tabindex.
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

function sketchPage(p5Src, lockCall, head = '') {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">${head}
<style>body { margin: 0; overflow: hidden; } canvas { display: block; touch-action: none; }</style>
<script src="${p5Src}"></script><script src="${PREVIEW}/p5-phone.js"></script></head>
<body><script>
function setup() { createCanvas(windowWidth, windowHeight); ${lockCall}; enableSensorTap('Tap to start'); window.ready = true; }
function draw() { background(40); }
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
<style>body { margin: 0; } #outside { display: block; width: 100%; height: 60px; }
iframe { display: block; width: 100%; height: 600px; border: 0; }</style></head>
<body><button id="outside">editor</button>
<iframe src="${PREVIEW}/" allow="accelerometer; gyroscope; magnetometer"
  sandbox="allow-scripts allow-same-origin allow-modals allow-popups"></iframe></body></html>`;

async function open(browser, url, routes) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
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
  };
});

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n      ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

async function editorCase(browser, label, p5Src, lockCall) {
  const { ctx, p, errors } = await open(browser, `${EDITOR}/someone/full/abc123`, {
    [`${EDITOR}/someone/full/abc123`]: editorPage,
    [`${PREVIEW}/`]: previewPage(sketchPage(p5Src, lockCall)),
  });
  const f = await sketchFrame(p, errors);
  await p.waitForTimeout(300); // lockGestures() wraps the mouse handlers after 100 ms

  const before = await focusState(f);
  check(`${label}: before the tap the editor page has focus`, !before.hasFocus && before.overlay, before);

  const box = await p.locator('iframe').boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForTimeout(400);
  const tapped = await focusState(f);
  check(`${label}: the tap to start moves focus to the sketch's canvas`,
    tapped.hasFocus && tapped.canvasFocused && !tapped.overlay && tapped.sensorsEnabled, tapped);
  check(`${label}: no focus ring on the canvas`, !tapped.ring, tapped);

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

(async () => {
  const browser = await chromium.launch();
  try {
    await editorCase(browser, 'p5.js 2.2.3', P5_2, 'lockGestures()');
    await editorCase(browser, 'p5.js 1.x', `${PREVIEW}/p5-local.min.js`, 'lockGestures()');
    await editorCase(browser, 'p5.js 2.2.3, embedded lock', P5_2, "lockGestures({ mode: 'embedded' })");
    await topLevelCase(browser);
  } finally {
    await browser.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
