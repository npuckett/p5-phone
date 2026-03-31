---
description: "Use when writing p5.js sketches that use mobile phone sensors, microphone, camera, speech recognition, vibration, or the p5-phone library. Use when: enableSensorTap, enableMicTap, enableAllTap, lockGestures, PhoneCamera, mobile permissions, device orientation, accelerometer, gyroscope."
applyTo: "**/sketch.js"
---

# p5-phone Library Reference

p5-phone provides mobile hardware access for p5.js sketches. Include it via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/p5-phone@1.8.0/dist/p5-phone.min.js"></script>
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
  if (!window.sensorsEnabled) return; // Wait for permission
  background(220);
  // rotationX, rotationY, rotationZ — device orientation
  // accelerationX, accelerationY, accelerationZ — device acceleration
  // rotationRateAlpha/Beta/Gamma — gyroscope angular velocity
}
```

## Permission Functions

Each permission type has 5 UI styles — pick the one that fits your design:

| Style | Sensor | Microphone | Speech | Both | Camera |
|-------|--------|------------|--------|------|--------|
| **Tap** (overlay) | `enableSensorTap(msg)` | `enableMicTap(msg)` | `enableSpeechTap(msg)` | `enableAllTap(msg)` | `enableCameraTap(msg)` |
| **Button** | `enableSensorButton(txt)` | `enableMicButton(txt)` | `enableSpeechButton(txt)` | `enableAllButton(txt)` | `enableCameraButton(txt)` |
| **Canvas** | `enableSensorCanvas(msg)` | `enableMicCanvas(msg)` | `enableSpeechCanvas(msg)` | `enableAllCanvas(msg)` | `enableCameraCanvas(msg)` |
| **Banner** | `enableSensorBanner(msg)` | `enableMicBanner(msg)` | `enableSpeechBanner(msg)` | `enableAllBanner(msg)` | `enableCameraBanner(msg)` |
| **Custom** | `enableSensorOn(sel)` | `enableMicOn(sel)` | `enableSpeechOn(sel)` | `enableAllOn(sel)` | `enableCameraOn(sel)` |

Legacy aliases: `enableGyroTap`, `enableGyroButton` also work (same as `enableSensor*`).

## Status Variables

Check these to know if permissions have been granted:
- `window.sensorsEnabled` — motion sensors active
- `window.micEnabled` — microphone active
- `window.speechEnabled` — speech recognition active

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
function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  lockGestures();
  enableMicTap('Tap to enable microphone');
}
function draw() {
  if (!window.micEnabled) return;
  let level = mic.getLevel();
  background(220);
  circle(width/2, height/2, level * 500);
}
```

Requires p5.sound: `<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.10/addons/p5.sound.min.js"></script>`

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
- Call `lockGestures()` in `setup()` to prevent browser default touch behaviors.
- `enableSpeech*` only activates the audio context — create your own `p5.SpeechRec` object after.
- `enableAll*` combines sensors + microphone (not speech or camera).

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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.10/p5.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.8.0/dist/p5-phone.min.js"></script>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```
