#!/usr/bin/env node
/**
 * Browser checks of the address showDesktopQr() encodes. Needs Playwright's Chromium
 * (npx playwright install chromium); no network access (every request is answered locally).
 * Run: node test-desktop-qr.js   (or: npm run test:qr)
 *
 * 1. A normal page (GitHub Pages, a local server): the QR is location.href, query and all,
 *    exactly as before. An explicit { url } still wins everywhere.
 * 2. The p5.js Web Editor: the sketch runs from a blob: URL in an iframe inside
 *    preview.p5js.org, with <base href="https://preview.p5js.org/<editor path>/"> and
 *    window.editorOrigin, the way the editor's EmbedFrame builds it. The QR must be the
 *    Present link, https://editor.p5js.org/<user>/full/<id>, from the editor view
 *    (/sketches/<id>) and from a share link (/full/<id>).
 *    Regression: the QR encoded blob:https://preview.p5js.org/<uuid>, which no phone opens.
 * 3. An unsaved Web Editor sketch (path "/"), and a blob: page outside the editor: no QR.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PAGES = 'https://example.github.io';
const PREVIEW = 'https://preview.p5js.org';
const LIB = fs.readFileSync(path.join(__dirname, 'src/p5-phone.js'));
const P5 = fs.readFileSync(path.join(__dirname, 'node_modules/p5/lib/p5.min.js'));

// Stand-in for qrcodejs: record the text instead of drawing it
const QR_STUB = `window.QRCode = function (el, opts) { window.qrText = opts.text; };`;

function sketchPage(call, head = '') {
  return `<!doctype html><html><head><meta charset="utf-8">${head}
<script src="${PREVIEW}/p5.min.js"></script><script src="${PREVIEW}/p5-phone.js"></script></head>
<body><script>${QR_STUB}
function setup() { createCanvas(100, 100); ${call}; window.ready = true; }</script></body></html>`;
}

// The editor's preview page: build the sketch document, then load it as a blob: iframe
function previewPage(basePath, call, withEditorOrigin = true) {
  const base = `${PREVIEW}${basePath}${basePath.length > 1 ? '/' : ''}`;
  const head = `<base href="${base}">` +
    (withEditorOrigin ? `<script>window.editorOrigin = 'https://editor.p5js.org';</script>` : '');
  const doc = JSON.stringify(sketchPage(call, head));
  return `<!doctype html><html><body><iframe id="f"></iframe><script>
const url = URL.createObjectURL(new Blob([${doc.replace(/<\//g, '<\\/')}], { type: 'text/html' }));
document.getElementById('f').src = url;
</script></body></html>`;
}

async function run(browser, url, html, { frame = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('/p5-phone.js')) return route.fulfill({ contentType: 'application/javascript', body: LIB });
    if (u.pathname.endsWith('/p5.min.js')) return route.fulfill({ contentType: 'application/javascript', body: P5 });
    if (u.href.split('#')[0] === url.split('#')[0]) return route.fulfill({ contentType: 'text/html', body: html });
    return route.fulfill({ status: 404, body: '' });
  });
  await p.goto(url);
  let target = p;
  if (frame) {
    await p.waitForFunction(() => document.getElementById('f').src.startsWith('blob:'));
    await p.waitForTimeout(200);
    target = p.frames().find((f) => f.url().startsWith('blob:'));
  }
  await target.waitForFunction(() => window.ready === true, null, { timeout: 15000 })
    .catch((e) => { throw new Error(errors.length ? `setup() failed: ${errors.join('; ')}` : e.message); });
  const result = await target.evaluate(() => ({
    href: location.href,
    qr: window.qrText || null,
    panel: !!document.getElementById('p5phoneDesktopQr'),
  }));
  await ctx.close();
  return { ...result, errors };
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  const check = (name, r, want) => {
    const ok = !r.errors.length && r.qr === want && r.panel === (want !== null);
    rows.push({ check: name, qr: r.qr === null ? '(no QR)' : r.qr, ok });
  };

  // 1. Normal pages: unchanged
  const pagesUrl = `${PAGES}/CC2026/experiment-2/01-tilt-to-draw/1-person/?room=a#x`;
  check('Pages: location.href', await run(browser, pagesUrl, sketchPage('showDesktopQr()')), pagesUrl);
  check('Pages: explicit url', await run(browser, pagesUrl, sketchPage("showDesktopQr({ url: 'https://x.test/' })")), 'https://x.test/');
  const local = 'http://localhost:8765/examples/a/';
  check('localhost: location.href', await run(browser, local, sketchPage('showDesktopQr()')), local);

  // 2. The Web Editor
  const present = 'https://editor.p5js.org/creationcomputation/full/8y_qfoqiR';
  check('Web Editor: editor view', await run(browser, `${PREVIEW}/`,
    previewPage('/creationcomputation/sketches/8y_qfoqiR', 'showDesktopQr()'), { frame: true }), present);
  check('Web Editor: share link', await run(browser, `${PREVIEW}/`,
    previewPage('/creationcomputation/full/8y_qfoqiR', 'showDesktopQr()'), { frame: true }), present);
  check('Web Editor: no editorOrigin', await run(browser, `${PREVIEW}/`,
    previewPage('/creationcomputation/sketches/8y_qfoqiR', 'showDesktopQr()', false), { frame: true }), present);
  check('Web Editor: explicit url', await run(browser, `${PREVIEW}/`,
    previewPage('/creationcomputation/sketches/8y_qfoqiR', "showDesktopQr({ url: 'https://x.test/' })"), { frame: true }), 'https://x.test/');
  check('Web Editor: setQrUrl', await run(browser, `${PREVIEW}/`,
    previewPage('/creationcomputation/sketches/8y_qfoqiR', "setQrUrl('https://x.test/')"), { frame: true }), 'https://x.test/');

  // 3. No openable address
  check('Web Editor: unsaved sketch', await run(browser, `${PREVIEW}/`,
    previewPage('/', 'showDesktopQr()'), { frame: true }), null);
  check('blob: outside the editor', await run(browser, 'https://other.test/',
    previewPage('/', 'showDesktopQr()', false).replace(/https:\/\/preview\.p5js\.org/g, 'https://other.test'),
    { frame: true }), null);

  await browser.close();
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log('All desktop QR checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
