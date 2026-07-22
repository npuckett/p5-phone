---
name: p5js-2x
description: Use whenever writing, editing, or reviewing p5.js sketches — p5.js is transitioning from 1.x to 2.x (2.x becomes the editor default in 2026), and models default to outdated 1.x patterns (preload(), curveVertex, keyCode, TypedDict) unless corrected. Trigger this for ANY p5.js code generation, even simple sketches, and especially for anything involving asset loading, custom shapes/curves, keyboard/mouse events, text measurement, or vector/array helper functions. Also trigger if the user mentions "p5", "p5.js", "creative coding sketch", or asks to convert/upgrade a sketch to p5.js 2.0.
---

# p5.js 2.x

p5.js has two live major versions right now. p5.js 1.x is what's in most training data and most existing tutorials. p5.js 2.x is the current line (2.0 released April 2025, up through 2.2 as of writing) and becomes the default in the p5.js Editor in 2026, after which 1.x stops receiving updates.

**Default to writing 2.x code unless the user's project is pinned to 1.x** (e.g. an existing 1.x codebase, or an explicit `p5.js@1` import). If you're not sure which the user's project targets, check the `<script src>` version or `package.json`, or ask.

Docs are split by version:
- 1.x reference: https://p5js.org/reference/
- 2.x reference: https://beta.p5js.org/

## The one thing most likely to break a sketch: asset loading

This is the biggest change and the one a model is most likely to get wrong by default, because `preload()` is so heavily represented in training data.

```js
// 1.x — DO NOT use this pattern for 2.x sketches
let img;
function preload() {
  img = loadImage('bricks.jpg');
}
function setup() {
  createCanvas(100, 100);
  image(img, 0, 0);
}
```

```js
// 2.x — correct pattern
let img;
async function setup() {
  createCanvas(100, 100);
  background(255, 0, 0);       // shows while the asset loads
  img = await loadImage('bricks.jpg');
  image(img, 0, 0);
}
```

All `load...()` functions (`loadImage`, `loadJSON`, `loadSound`, `loadFont`, etc.) now return Promises. Use `async function setup()` + `await`. `preload()` still exists but is no longer the default idiom to reach for.

## Other 2.x changes worth knowing by default

These come up often enough in ordinary sketches that they're worth internalizing rather than looking up every time. See `references/migration-1x-to-2x.md` for the full table with code examples.

- **Custom shapes/curves**: `curveVertex` → `splineVertex`, `curve()` → `spline()`, `curveTangent()` → `splineTangent()`, `curveTightness(t)` → `splineProperty('tightness', t)`. `bezierVertex()` now takes one point per call (not 3 old-style), with curve order set via `bezierOrder()`.
- **Keyboard**: prefer `keyIsDown(UP_ARROW)` (works both versions) or `code === 'ArrowUp'` in 2.x. Avoid relying on `keyCode === UP_ARROW` for new 2.x code.
- **Mouse buttons**: `mouseButton` is now an object — `mouseButton.left` / `.right` / `.center` — not a single value compared with `===`. This also means multiple buttons can be detected as pressed simultaneously.
- **Touch**: `touchStarted()`/`touchMoved()`/`touchEnded()` still exist, but mouse and touch are unified under the browser's pointer model — read the global `touches` array for multitouch instead of assuming separate code paths.
- **Text measurement**: `textWidth()` and `fontWidth()` swapped meanings from what you'd expect from 1.x muscle memory — `textWidth()` now gives the tight bounding box (no leading/trailing space), `fontWidth()` includes it.
- **Data structures**: `createStringDict()`, `createNumberDict()`, `p5.TypedDict`, `p5.NumberDict` are gone — use plain JS objects/Maps. Also gone: `append()`, `arrayCopy()`, `concat()`, `reverse()`, `shorten()`, `sort()`, `splice()`, `subset()` — use native JS array methods instead.
- **Vectors**: `createVector()` with no arguments no longer implies 3D. Be explicit: `createVector(0, 0)` for 2D, `createVector(0, 0, 0)` for 3D.
- **New in 2.1/2.2** (safe to use, but genuinely new — don't assume a model already "knows" these): `p5.strands` (a JS-flavored shader authoring API compiled to GLSL) and a WebGPU-based renderer option.

## Mobile / phone-hardware sketches (works with the p5-phone skill)

When a sketch touches phone hardware — motion sensors, touch, microphone, sound, camera, vibration, torch, NFC, or BLE — **use the `p5-phone` skill together with this one.** They cover different layers and are meant to be paired:

- **p5-phone unlocks the hardware and hands you p5 values.** It requests the mobile permission (iOS transient activation), sets `window.*Enabled` flags, and exposes data through *p5's own globals and objects*.
- **This skill governs the surrounding p5.js 2.x language.** Async asset loading, the unified pointer/touch model, renamed curve/data APIs — everything below.

The failure this pairing prevents: models reinventing hardware plumbing instead of reading the p5 values p5-phone already provides. **Use the built-in p5 methods, don't hand-roll equivalents:**

- Read motion from p5 globals `rotationX/Y/Z`, `accelerationX/Y/Z`, `rotationRateAlpha/Beta/Gamma` — not a custom `DeviceOrientationEvent` listener.
- Handle input with `mousePressed/mouseDragged/mouseReleased` and `touches[]` — not `element.addEventListener('touchstart', …)`. (These are p5.js 2's unified pointer callbacks; the old `touchStarted/Moved/Ended` are no-ops there.)
- Draw the camera with p5's `image(cam, x, y, w, h)` and map ML5 results with p5-phone's `cam.mapKeypoint()/mapBox()` — not manual canvas video compositing.
- Do audio through p5.sound (`p5.AudioIn`, `p5.Amplitude`, `p5.FFT`, `p5.Oscillator`) — not a raw Web Audio graph.
- Load any assets with `await loadImage()/loadSound()` inside `async setup()` — the 2.x pattern above.

If the request is specifically about phone hardware APIs, defer to the `p5-phone` skill for the exact `enable*` calls, status flags, and `PhoneCamera`/BLE/NFC signatures; use this skill for the p5.js 2.x idioms around them.

## If a sketch needs to stay on 1.x

Compatibility add-on libraries (`preload.js`, `shapes.js`, `data.js`, `events.js`) restore the 1.x APIs on top of 2.x, if the goal is running old code rather than rewriting it. Point the user to https://github.com/processing/p5.js-compatibility rather than hand-writing a shim.

## Working with students / smaller local models

If you're scaffolding this for a less capable or local model (the common case for this project): put the async/await loading pattern and the shape/curve renames right in the prompt or system context every time, not just this file's existence — those two are the highest-frequency failure points because 1.x muscle memory is so strong in general training data.
