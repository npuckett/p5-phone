#!/usr/bin/env node
/**
 * Browser checks for the permission-activation UIs. Needs Playwright's Chromium
 * (npx playwright install chromium) and network access for the p5.js 2.x CDN build.
 * Run: node test-press-state.js   (or: npm run test:press)
 *
 * 1. Press state: taps every activation style under p5.js 1.x and 2.x, with mouse
 *    and with touch, and asserts p5 is left fully released afterwards
 *    (mouseIsPressed false, touches[] empty, release callback fired).
 *    Regression: the UIs used to stopPropagation() the release but not the press.
 * 2. window.micOpen: true with a live stream, false when the microphone is refused,
 *    false again after mic.stop(), while window.micEnabled is true in every case.
 */

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9999';
const P5_1 = ['/node_modules/p5/lib/p5.js'];
const P5_2 = ['https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js'];
const SOUND_LEGACY = '/node_modules/p5/lib/addons/p5.sound.js';
const SOUND_03 = 'https://cdn.jsdelivr.net/npm/p5.sound@0.3.0/dist/p5.sound.js';

// Vibration needs no browser permission, so the handler resolves immediately:
// the hardest case, because the UI is removed while the tap is still finishing.
const STYLES = {
  tap: { call: `enableVibrationTap('tap');`, selector: '#tapOverlay' },
  button: { call: `enableVibrationButton('go', 'wait');`, selector: '#permissionButton' },
  banner: { call: `enableVibrationBanner('banner');`, selector: '#permissionBanner' },
  minimal: { call: `enableVibrationMinimal('minimal');`, selector: '#minimalOverlay' },
  on: { call: `enableVibrationOn('#customBtn');`, selector: '#customBtn' },
};

function page(scripts, sketch) {
  const tags = scripts.concat('/src/p5-phone.js').map((s) => `<script src="${s}"></script>`).join('');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${tags}</head>
<body style="margin:0"><button id="customBtn" style="position:fixed;bottom:10px;left:10px;z-index:5;padding:20px">custom</button>
<script>${sketch}</script></body></html>`;
}

const pressSketch = (call) => `
window.evlog = [];
function setup(){ createCanvas(windowWidth, windowHeight); ${call} window.ready = true; }
function draw(){ background(50); }
function mousePressed(){ evlog.push('mousePressed'); }
function mouseReleased(){ evlog.push('mouseReleased'); }
function touchStarted(){ evlog.push('touchStarted'); }
function touchEnded(){ evlog.push('touchEnded'); }`;

const micSketch = `
let mic;
function setup(){ createCanvas(200, 200); mic = new p5.AudioIn(); enableMicTap('tap'); window.ready = true; }
function draw(){ background(50); }`;

// Stand-ins for the browser's answer, so the result does not depend on OS mic access.
const grantMic = () => {
  navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput', deviceId: 'fake', groupId: 'g', label: 'Fake mic' }];
  navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const dest = ac.createMediaStreamDestination();
    osc.connect(dest);
    osc.start();
    return dest.stream;
  };
};
const denyMic = () => {
  navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput', deviceId: 'fake', groupId: 'g', label: 'Fake mic' }];
  navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
};

async function open(ctx, html) {
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route(ORIGIN + '/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    const file = path.join(__dirname, pathname);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(file) });
  });
  await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => window.ready === true, null, { timeout: 15000 });
  return { p, errors };
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];

  for (const [ver, scripts] of [['1.x', P5_1], ['2.x', P5_2]]) {
    for (const input of ['mouse', 'touch']) {
      const ctx = await browser.newContext(input === 'touch' ? devices['Pixel 7'] : { viewport: { width: 900, height: 700 } });
      for (const [style, { call, selector }] of Object.entries(STYLES)) {
        const { p, errors } = await open(ctx, page(scripts, pressSketch(call)));
        await p.waitForSelector(selector);
        await p.waitForTimeout(500); // banner slide-in
        const box = await p.locator(selector).boundingBox();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        if (input === 'touch') await p.touchscreen.tap(x, y);
        else await p.mouse.click(x, y);
        await p.waitForTimeout(600);
        const r = await p.evaluate(() => ({
          mouseIsPressed: window.mouseIsPressed,
          touches: (window.touches || []).length,
          enabled: window.vibrationEnabled,
          uiGone: !document.querySelector('#tapOverlay,#permissionButton,#permissionBanner,#minimalOverlay'),
          events: window.evlog.join(','),
        }));
        const released = /mouseReleased|touchEnded/.test(r.events);
        const ok = r.mouseIsPressed === false && r.touches === 0 && r.enabled === true && r.uiGone && released && !errors.length;
        rows.push({ check: 'press', p5: ver, input, style, ...r, ok });
        await p.close();
      }
      await ctx.close();
    }
  }

  for (const [stack, scripts] of [['1.x + legacy p5.sound', P5_1.concat(SOUND_LEGACY)], ['2.x + p5.sound 0.3.0', P5_2.concat(SOUND_03)]]) {
    for (const [answer, stub, expected] of [['granted', grantMic, true], ['denied', denyMic, false]]) {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
      await ctx.addInitScript(stub);
      const { p } = await open(ctx, page(scripts, micSketch));
      const before = await p.evaluate(() => window.micOpen);
      await p.mouse.click(100, 100);
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => ({ micEnabled: window.micEnabled, micOpen: window.micOpen }));
      await p.evaluate(() => mic.stop());
      await p.waitForTimeout(300);
      const afterStop = await p.evaluate(() => window.micOpen);
      const ok = before === false && r.micEnabled === true && r.micOpen === expected && afterStop === false;
      rows.push({ check: 'micOpen', p5: stack, input: answer, ...r, afterStop, ok });
      await ctx.close();
    }
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
