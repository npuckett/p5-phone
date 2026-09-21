---
description: "Use when writing p5.js sketches that use mobile phone sensors, microphone, camera, speech recognition, vibration, torch/flashlight, NFC, or the p5-phone library. Use when: enableSensorTap, enableMicTap, enableAllTap, enablePermissionsTap, enableTorchTap, enableNfcTap, lockGestures, PhoneCamera, mobile permissions, device orientation, accelerometer, gyroscope, flashlight, NFC tag reading."
applyTo: "**/sketch.js"
---

# p5-phone Library Reference

p5-phone provides mobile hardware access for p5.js sketches. Include it via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/p5-phone@1.14.0/dist/p5-phone.min.js"></script>
```

## Essential Pattern

Every mobile sketch should follow this structure:

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures(); // REQUIRED: prevents scroll, zoom, pull-to-refresh

  // Choose ONE permission style (Tap is simplest):
  enableSensorTap('Tap to enable sensors');
}

function draw() {
  background(220);

  if (window.sensorsEnabled) {
    // rotationX, rotationY, rotationZ — device orientation
    // accelerationX, accelerationY, accelerationZ — device acceleration
    // rotationRateAlpha/Beta/Gamma — gyroscope angular velocity
  }
}
```

## Permission Functions

Each permission type has 5 UI styles — pick the one that fits your design:

| Style | Sensor | Microphone | Speech | Both | Camera | Torch | NFC |
|-------|--------|------------|--------|------|--------|-------|-----|
| **Tap** (overlay) | `enableSensorTap(msg)` | `enableMicTap(msg)` | `enableSpeechTap(msg)` | `enableAllTap(msg)` | `enableCameraTap(msg)` | `enableTorchTap(msg)` | `enableNfcTap(msg)` |
| **Button** | `enableSensorButton(txt)` | `enableMicButton(txt)` | `enableSpeechButton(txt)` | `enableAllButton(txt)` | `enableCameraButton(txt)` | `enableTorchButton(txt)` | `enableNfcButton(txt)` |
| **Canvas** | `enableSensorCanvas(msg)` | `enableMicCanvas(msg)` | `enableSpeechCanvas(msg)` | `enableAllCanvas(msg)` | `enableCameraCanvas(msg)` | `enableTorchCanvas(msg)` | `enableNfcCanvas(msg)` |
| **Banner** | `enableSensorBanner(msg)` | `enableMicBanner(msg)` | `enableSpeechBanner(msg)` | `enableAllBanner(msg)` | `enableCameraBanner(msg)` | `enableTorchBanner(msg)` | `enableNfcBanner(msg)` |
| **Custom** | `enableSensorOn(sel)` | `enableMicOn(sel)` | `enableSpeechOn(sel)` | `enableAllOn(sel)` | `enableCameraOn(sel)` | `enableTorchOn(sel)` | `enableNfcOn(sel)` |

For arbitrary combinations, use `enablePermissionsTap(['sensors', 'torch'])`, `enablePermissionsButton([...])`, `enablePermissionsCanvas([...])`, `enablePermissionsBanner([...])`, or `enablePermissionsOn(selector, [...])`. Valid names include `sensors`, `mic`, `sound`, `speech`, `vibration`, `torch`, `nfc`, and `camera`. `enableHardware*` aliases also work.

Legacy aliases: `enableGyroTap`, `enableGyroButton` also work (same as `enableSensor*`).

## Status Variables

Check these to know if permissions have been granted:
- `window.sensorsEnabled` — motion sensors active
- `window.micEnabled` — microphone active
- `window.speechEnabled` — speech recognition active
- `window.cameraEnabled` — camera startup succeeded
- `window.torchEnabled` — torch control stream active (Android Chrome)
- `window.torchActive` — flashlight currently on
- `window.nfcEnabled` — NFC scanning active (Android only)
- `window.lastNfcSerialNumber` — most recently read NFC tag ID
- `window.lastNfcAlias` — alias for the most recently read NFC tag, if set

Prefer wrapping hardware-dependent code in positive checks, such as `if (window.sensorsEnabled) { ... }` or `if (window.micEnabled) { ... }`.

## Callback

Define `userSetupComplete()` to run code immediately after permissions are granted:

```javascript
function userSetupComplete() {
  // Safe to use sensor data, mic, etc.
}
```

## Microphone

```javascript
let mic;
let amplitude;
function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.disconnect();        // p5.sound 0.3.x wires every node to the speakers by default
  mic.connect(amplitude);  // p5.sound 0.3.x has no mic.getLevel()
  lockGestures();
  enableMicTap('Tap to enable microphone');
}
function draw() {
  background(220);

  if (window.micOpen) { // micEnabled is true even if the mic was denied; micOpen is not
    let level = amplitude.getLevel();
    circle(width/2, height/2, level * 500);
  }
}
```

Requires p5.sound: `<script src="https://cdn.jsdelivr.net/npm/p5.sound@0.3.0/dist/p5.sound.min.js"></script>`

## Debug Console

```javascript
showDebug();           // Show on-screen console (call once in setup)
debug('message');      // Log to on-screen console
debugWarn('warning');  // Yellow warning
debugError('error');   // Red error
```

## Key Constraints

- iOS requires a **user tap** before granting sensor/mic access — cannot auto-trigger.
- Always serve over **HTTPS** — sensors and mic are blocked on HTTP.
- Call `lockGestures()` in `setup()` to prevent browser default touch behaviors. Use `lockGestures({ mode: 'embedded', element: canvas })` for canvases inside scrollable multi-page sites.
- **Torch / flashlight** is Android Chrome-oriented, requires HTTPS and camera permission, and is controlled through a rear camera stream. Use `torchOn()`, `torchOff()`, `toggleTorch()`, or `setTorch(value)` after `enableTorch*()` or `enablePermissions*(['torch'])`.
- **NFC** is Android-only (Chrome 89+). Define `nfcRead(message, serialNumber)` in your sketch to receive tag data. Use `setNfcTagAlias(id, alias)` and `isNfcTag(aliasOrId)` for named tag workflows. Use `stopNfc()` to stop scanning.
- **PhoneCamera + ML5**: Use `cam.mapKeypoint()` / `cam.mapKeypoints()` for landmark models and `cam.mapBox()` / `cam.mapBoxes()` for object-detection boxes. Set ML5 `flipped: false` when available because PhoneCamera handles mirroring.
- `enableSpeech*` only activates the audio context — create your own `p5.SpeechRec` object after.
- `enableAll*` combines sensors + microphone (not speech or camera). Use `enablePermissions*` for custom hardware combinations.

## p5.js 2.0 Compatibility

p5-phone supports both p5.js 1.x and 2.0. Key difference:

- **p5.js 2.0 removes `touchStarted`/`touchMoved`/`touchEnded`** — use `mousePressed`/`mouseDragged`/`mouseReleased` instead. These mouse callbacks work for ALL pointer types (mouse + touch) in **both** 1.x and 2.0.
- p5-phone auto-detects the p5.js version and adjusts its internal behavior.
- In p5.js 2.0, p5-phone also registers via `p5.registerAddon()` automatically.

**Use `mousePressed`/`mouseReleased` for forward-compatible sketches:**
```javascript
function mousePressed() {
  return false; // Works in both p5.js 1.x and 2.0
}
```

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile p5.js App</title>
  <style>body { margin: 0; padding: 0; overflow: hidden; }</style>
  <script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.14.0/dist/p5-phone.min.js"></script>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```
