#!/usr/bin/env node
/**
 * Browser checks for the audio unlock. Needs Playwright's Chromium
 * (npx playwright install chromium) and network access for the p5.js, p5.sound and
 * Tone.js CDN builds.
 * Run: node test-audio-unlock.js   (or: npm run test:audio)
 * Point it at another build with AUDIO_UNLOCK_LIB=/dist/p5-phone.min.js (a path in this repo).
 *
 * 1. Unlock inside the tap: for p5.sound 0.3.0, Tone.js on its own, and a context the
 *    sketch made itself (smplr style), every activation that asks for audio must call
 *    resume() on that engine's context while the tap event is still being handled.
 *    The motion prompt is slowed down the way iOS's is, so a resume() after the
 *    motion await lands outside the tap, where iOS refuses it.
 *    Regression: 1.14.0 resumed only p5.sound, and only after the motion prompt.
 * 2. Wake: after the unlock, audio the browser suspended resumes on the next click,
 *    but audio the sketch suspended on purpose (userStopAudio(), ctx.suspend()) stays off.
 */

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ORIGIN = 'http://localhost:9998';
const LIB = process.env.AUDIO_UNLOCK_LIB || '/src/p5-phone.js';
const P5_1 = '/node_modules/p5/lib/p5.js';
const P5_2 = 'https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js';
const SOUND_LEGACY = '/node_modules/p5/lib/addons/p5.sound.js';
const SOUND_03 = 'https://cdn.jsdelivr.net/npm/p5.sound@0.3.0/dist/p5.sound.js';
const TONE = 'https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js';

// Each engine: the scripts before p5-phone, the sketch's globals, and how to find its native context.
const ENGINES = {
  'p5.sound 0.3.0': {
    scripts: [P5_2, SOUND_03],
    globals: `let osc; let mic;`,
    make: `osc = new p5.Oscillator(440); mic = new p5.AudioIn();`,
    target: `getAudioContext()`,
  },
  'legacy p5.sound (p5 1.x)': {
    scripts: [P5_1, SOUND_LEGACY],
    globals: `let osc; let mic;`,
    make: `osc = new p5.Oscillator(440); mic = new p5.AudioIn();`,
    target: `getAudioContext()`,
  },
  'Tone.js': {
    scripts: [P5_2, TONE],
    globals: `let mic = { start: function () {} }; // the Class 5 home-made mic`,
    make: ``,
    target: `Tone.getContext().rawContext._nativeAudioContext`,
  },
  // loaded after p5-phone, so Tone.js makes its context through p5-phone's wrapped constructor
  'Tone.js after p5-phone': {
    scripts: [P5_2],
    after: [TONE],
    globals: `let mic = { start: function () {} };`,
    make: ``,
    target: `Tone.getContext().rawContext._nativeAudioContext`,
  },
  'own AudioContext': {
    scripts: [P5_2],
    globals: `let audio = new AudioContext(); let mic = { start: function () {} };`,
    make: ``,
    target: `audio`,
  },
};

const CALLS = {
  enableSoundTap: `enableSoundTap('tap');`,
  enableMicTap: `enableMicTap('tap');`,
  'motion + sound': `enablePermissionsTap(['motion', 'sound'], 'tap');`,
  enableAllTap: `enableAllTap('tap');`,
};

// Runs before any page script: logs resume() calls with the event being handled, keeps
// the native suspend() to act as the browser, and makes the motion prompt slow like iOS's.
function instrument() {
  window.resumeLog = [];
  const nativeResume = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () {
    // only tap events let a phone start audio (Tone.js's own 'message' events do not)
    const e = window.event;
    const tap = e && ['touchend', 'click', 'pointerup', 'mouseup', 'mousedown', 'pointerdown', 'keydown'].includes(e.type);
    window.resumeLog.push({ ctx: this, during: tap ? e.type : null });
    return nativeResume.apply(this, arguments);
  };
  window.browserSuspend = AudioContext.prototype.suspend;
  DeviceOrientationEvent.requestPermission = () => new Promise((resolve) => setTimeout(() => resolve('granted'), 800));
  DeviceMotionEvent.requestPermission = () => Promise.resolve('granted');
  // a stand-in microphone, so the result does not depend on OS mic access
  navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput', deviceId: 'fake', groupId: 'g', label: 'Fake mic' }];
  navigator.mediaDevices.getUserMedia = async () => {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const dest = ac.createMediaStreamDestination();
    osc.connect(dest);
    osc.start();
    return dest.stream;
  };
}

function page(engine, call) {
  const tags = engine.scripts.concat(LIB, engine.after || []).map((s) => `<script src="${s}"></script>`).join('');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${tags}</head>
<body style="margin:0"><script>
${engine.globals}
window.target = function () { return ${engine.target}; };
function setup(){ createCanvas(windowWidth, windowHeight); ${engine.make} ${call} window.ready = true; }
function draw(){ background(40); }
</script></body></html>`;
}

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
  await p.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  return { p, errors };
}

async function tapOverlay(p, input) {
  await p.waitForSelector('#tapOverlay');
  if (input === 'touch') await p.touchscreen.tap(150, 150);
  else await p.mouse.click(150, 150);
  await p.waitForTimeout(1500); // the slow motion prompt, then the rest of the handler
}

const readState = () => {
  const target = window.target();
  const duringTap = window.resumeLog.filter((e) => e.ctx === target && e.during).map((e) => e.during);
  return { state: target.state, resumedDuring: [...new Set(duringTap)].join(',') || 'never' };
};

(async () => {
  const browser = await chromium.launch();
  const rows = [];

  for (const [engineName, engine] of Object.entries(ENGINES)) {
    for (const [callName, call] of Object.entries(CALLS)) {
      for (const input of ['mouse', 'touch']) {
        const ctx = await browser.newContext(input === 'touch' ? devices['Pixel 7'] : { viewport: { width: 900, height: 700 } });
        await ctx.addInitScript(instrument);
        const { p, errors } = await open(ctx, page(engine, call));
        await tapOverlay(p, input);
        const r = await p.evaluate(readState);
        const ok = r.resumedDuring !== 'never' && r.state === 'running' && !errors.length;
        rows.push({ check: 'unlock', engine: engineName, call: callName, input, ...r, errors: errors.join('; '), ok });
        await ctx.close();
      }
    }

    // Wake: the browser suspends the context; the next click must bring it back.
    // Held: the sketch suspends it on purpose; the next click must leave it alone.
    const held = {
      'p5.sound 0.3.0': `userStopAudio()`,
      'legacy p5.sound (p5 1.x)': `getAudioContext().suspend()`,
      'Tone.js': `Tone.getContext().rawContext.suspend()`,
      'Tone.js after p5-phone': `Tone.getContext().rawContext.suspend()`,
      'own AudioContext': `audio.suspend()`,
    }[engineName];
    const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    await ctx.addInitScript(instrument);
    const { p, errors } = await open(ctx, page(engine, CALLS.enableSoundTap));
    await tapOverlay(p, 'mouse');
    await p.evaluate(() => window.browserSuspend.call(window.target()));
    await p.waitForTimeout(300);
    const suspended = await p.evaluate(() => window.target().state);
    await p.mouse.click(400, 400);
    await p.waitForTimeout(500);
    const woke = await p.evaluate(() => window.target().state);
    await p.evaluate(held);
    await p.waitForTimeout(300);
    await p.mouse.click(400, 400);
    await p.waitForTimeout(500);
    const stayed = await p.evaluate(() => window.target().state);
    const ok = suspended === 'suspended' && woke === 'running' && stayed === 'suspended' && !errors.length;
    rows.push({ check: 'wake', engine: engineName, call: 'browser suspend, then ' + held, input: 'mouse', state: `${suspended} → ${woke}; held → ${stayed}`, resumedDuring: '', errors: errors.join('; '), ok });
    await ctx.close();
  }

  await browser.close();
  console.log('library:', LIB);
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
