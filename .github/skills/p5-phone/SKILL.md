---
name: p5-phone
description: "Use when generating p5-phone examples or answering questions about p5-phone APIs: mobile sensors, device orientation, accelerometer, gyroscope, touch, microphone, p5.sound, speech recognition, PhoneCamera, ML5 camera mapping, vibration, NFC, lockGestures, enablePermissionsTap, enableHardwareTap, arbitrary hardware combinations, mobile browser permissions, p5.js 2 compatibility."
argument-hint: "Describe the p5-phone example or API question"
---

# p5-phone Examples and API Help

Use this skill when the user asks for a p5-phone sketch, p5-phone example, mobile p5.js hardware interaction, or explanation of how the library works.

This is the canonical full skill. Portable entrypoints for other CLI/chat agents live at `.agents/skills/p5-phone/SKILL.md` and `.claude/skills/p5-phone/SKILL.md`; keep those short files aligned with this one when the API guidance changes.

p5-phone is a p5.js helper library for mobile hardware access. It provides permission activation UI, arbitrary hardware-combination permission helpers, gesture locking, microphone and sound activation, speech activation, NFC helpers, vibration helpers, an on-device debug console, and `PhoneCamera` for camera/ML5 coordinate mapping.

## Start Here

For generated examples, produce a complete `index.html` and `sketch.js` unless the user asks for only one file.

Use this HTML baseline for p5.js 2-compatible sketches:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile p5.js App</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.10.0/dist/p5-phone.min.js"></script>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```

Add p5.sound only when the sketch uses microphone levels, oscillators, audio input, or generated sound:

```html
<script src="https://cdn.jsdelivr.net/npm/p5.sound@0.3.0/dist/p5.sound.min.js"></script>
```

Place p5.sound after p5 and before `p5-phone`/`sketch.js` unless the local example pattern shows otherwise.

## Core Sketch Pattern

Every mobile p5-phone sketch should call `lockGestures()` in `setup()` and request permissions from a user action.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableSensorTap('Tap to enable motion sensors');
}

function draw() {
  background(20);

  if (!window.sensorsEnabled) {
    fill(255);
    textAlign(CENTER, CENTER);
    text('Waiting for sensors', width / 2, height / 2);
    return;
  }

  // Use rotationX, rotationY, rotationZ, accelerationX/Y/Z, etc.
}

function mousePressed() {
  return false;
}
```

Use `mousePressed`, `mouseDragged`, and `mouseReleased` instead of `touchStarted`, `touchMoved`, and `touchEnded` for p5.js 2 compatibility. The mouse callbacks work for mouse and touch in both p5.js 1.x and 2.x.

## Permission API

Permission functions come in five activation styles: tap overlay, generated button, canvas prompt, banner prompt, and custom element binding.

| Type | Tap | Button | Canvas | Banner | Custom Element |
| --- | --- | --- | --- | --- | --- |
| Motion sensors | `enableSensorTap(msg)` | `enableSensorButton(text)` | `enableSensorCanvas(msg)` | `enableSensorBanner(msg)` | `enableSensorOn(selector)` |
| Microphone | `enableMicTap(msg)` | `enableMicButton(text)` | `enableMicCanvas(msg)` | `enableMicBanner(msg)` | `enableMicOn(selector)` |
| Sound only | `enableSoundTap(msg)` | `enableSoundButton(text)` | `enableSoundCanvas(msg)` | `enableSoundBanner(msg)` | `enableSoundOn(selector)` |
| Speech | `enableSpeechTap(msg)` | `enableSpeechButton(text)` | `enableSpeechCanvas(msg)` | `enableSpeechBanner(msg)` | `enableSpeechOn(selector)` |
| Vibration | `enableVibrationTap(msg)` | `enableVibrationButton(text)` | `enableVibrationCanvas(msg)` | `enableVibrationBanner(msg)` | `enableVibrationOn(selector)` |
| NFC | `enableNfcTap(msg)` | `enableNfcButton(text)` | `enableNfcCanvas(msg)` | `enableNfcBanner(msg)` | `enableNfcOn(selector)` |
| Sensors + mic | `enableAllTap(msg)` | `enableAllButton(text)` | `enableAllCanvas(msg)` | `enableAllBanner(msg)` | `enableAllOn(selector)` |
| Camera | `enableCameraTap(msg)` | `enableCameraButton(text)` | `enableCameraCanvas(msg)` | `enableCameraBanner(msg)` | `enableCameraOn(selector)` |
| Any combination | `enablePermissionsTap(list, msg)` | `enablePermissionsButton(list, text)` | `enablePermissionsCanvas(list, msg)` | `enablePermissionsBanner(list, msg)` | `enablePermissionsOn(selector, list)` |

Use `enablePermissions*` when a sketch needs a custom combination such as `['sensors', 'mic', 'camera']`. Valid names include `sensors`, `mic`, `sound`, `speech`, `vibration`, `nfc`, and `camera`; aliases like `gyro`, `microphone`, `video`, and `haptics` also work. `enableHardware*` aliases are available for the same functions.

For sketches that need multiple hardware features, prefer one combined permission call over binding several single-permission helpers to the same gesture. This keeps iOS transient user activation intact and calls `userSetupComplete()` once.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enablePermissionsTap(['sensors', 'mic'], 'Tap to enable motion + microphone');
}

function draw() {
  if (!window.sensorsEnabled || !window.micEnabled) return;
  // Use motion values and microphone input here.
}
```

`enableGyro*` names are legacy aliases for motion sensor functions. Prefer the current `enableSensor*` names for new examples, and use `enableGyro*` only when matching older published sketches that depend on those aliases.

Use exactly one activation style per permission need unless the user explicitly asks to compare styles.

## Status Variables and Callbacks

Check status before using hardware-dependent data:

- `window.sensorsEnabled`
- `window.micEnabled`
- `window.speechEnabled`
- `window.vibrationEnabled`
- `window.nfcEnabled`
- `window.cameraEnabled`
- `window.lastNfcSerialNumber`
- `window.lastNfcAlias`
- `window.lastNfcMessage`

Define `userSetupComplete()` when the sketch needs a hook immediately after permission succeeds.

```javascript
function userSetupComplete() {
  debug('Permissions ready');
}
```

## Motion Sensor Examples

Use p5 global sensor variables after `window.sensorsEnabled` is true:

- Orientation: `rotationX`, `rotationY`, `rotationZ`
- Acceleration: `accelerationX`, `accelerationY`, `accelerationZ`
- Rotational velocity: `rotationRateAlpha`, `rotationRateBeta`, `rotationRateGamma`
- Events: `deviceMoved()`, `deviceShaken()`
- Thresholds: `setMoveThreshold(value)`, `setShakeThreshold(value)`
- Orientation state: `deviceOrientation`

For iOS, sensor permission must be requested from a tap/click. Never auto-request motion permission on page load.

## Microphone and Sound

For microphone level sketches, include p5.sound and create `p5.AudioIn()` before enabling mic. For simple examples, read levels with `mic.getLevel()` after `window.micEnabled` is true; avoid wiring `p5.Amplitude.setInput(mic)` before permission because p5.sound 0.3.0 can throw in p5.js 2 previews.

```javascript
let mic;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  mic = new p5.AudioIn();
  enableMicTap('Tap to enable microphone');
}

function draw() {
  background(0);
  if (!window.micEnabled) return;
  const level = mic.getLevel();
  circle(width / 2, height / 2, 40 + level * 600);
}
```

For generated audio, prefer `p5.Oscillator`, call `enableSoundTap()` or `enableSoundOn(selector)`, and avoid `loadSound()` unless the user provides audio assets. Generated sound is better for p5 Web Editor portability.

Speech activation uses `enableSpeech*` to satisfy mobile audio/user-activation requirements. The sketch still needs its own Web Speech API or p5 speech-recognition object after activation.

## PhoneCamera and ML5

Use `createPhoneCamera(active, mirror, mode)` for camera examples.

Common setup:

```javascript
let cam;
let model;

function setup() {
  createCanvas(405, 720);
  lockGestures();
  cam = createPhoneCamera('user', true, 'fitHeight');
  enableCameraTap('Tap screen to enable camera');

  cam.onReady(async () => {
    model = await ml5.handPose({ maxHands: 1, runtime: 'mediapipe', flipped: false });
    model.detectStart(cam.videoElement, gotResults);
  });
}
```

PhoneCamera mapping helpers:

- `cam.mapKeypoint(keypoint)`
- `cam.mapKeypoints(keypoints)`
- `cam.mapBox(box)`
- `cam.mapBoxes(boxes)`

Set ML5 `flipped: false` when available. PhoneCamera handles mirroring and coordinate mapping.

For `ml5@1` with `p5@2.2.3`, include this before loading ml5:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
<script>
  p5.prototype._incrementPreload ||= function() {};
  p5.prototype._decrementPreload ||= function() {};
</script>
<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
```

For Three.js pages that use ml5 but are not p5 sketches, put p5, the compatibility shim, the preload-counter polyfill, and ml5 in the document `<head>` so p5 Web Editor preview injection does not run before p5 exists.

## NFC

NFC is Android Chrome only and requires HTTPS.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableNfcTap('Tap to enable NFC');
}

function nfcRead(message, serialNumber) {
  setNfcTagAlias(serialNumber, 'example-tag');
  debug('Read NFC tag: ' + serialNumber);
}

function draw() {
  background(20);
  if (isNfcTag('example-tag')) {
    background(0, 120, 255);
  }
}
```

Useful helpers: `setNfcTagAlias(id, alias)`, `getNfcTagAlias(id)`, `isNfcTag(aliasOrSerialNumber)`, and `stopNfc()`.

## Vibration

Use `enableVibrationTap()` before calling `vibrate(pattern)`. iOS does not support the Vibration API; write examples that still display useful feedback if `window.vibrationEnabled` is false.

```javascript
function mousePressed() {
  if (window.vibrationEnabled) {
    vibrate([40, 30, 80]);
  }
  return false;
}
```

## Debug Console

For mobile troubleshooting, call `showDebug()` once in `setup()` and log with:

- `debug(message)`
- `debugWarn(message)`
- `debugError(message)`
- `hideDebug()`
- `toggleDebug()`

Use debug output sparingly in examples. It is most useful for camera, NFC, and permission troubleshooting.

## Answering Questions

When answering API questions:

- Explain the browser permission reason, especially iOS transient user activation.
- Distinguish sensors, mic, sound-only, speech, camera, vibration, and NFC permissions.
- Mention HTTPS requirements for mobile hardware.
- Mention p5.js 2 event changes when touch callbacks are involved.
- Point to existing examples in `examples/` when useful.
- If a feature is browser-specific, say so clearly: NFC is Android Chrome; vibration is not supported on iOS; speech recognition depends on Web Speech API browser support.

## Example Quality Checklist

Before finishing generated code, check:

- `lockGestures()` is called in `setup()`.
- Permission request happens from a user activation path such as tap, button, banner, canvas, or custom element.
- Hardware data is read only after the corresponding `window.*Enabled` flag is true.
- The HTML includes needed dependencies and no unused heavy libraries.
- p5.js 2-compatible callbacks are used.
- Text and canvas output fit mobile screens.
- Asset-dependent examples either include assets or are clearly documented as requiring manual asset upload.
- ML5 camera examples include p5 2 compatibility and use PhoneCamera mapping helpers.