# p5-phone Project Guidelines

## What This Library Does

p5-phone provides simplified mobile hardware access for p5.js sketches. It handles:
- **Permission prompts** for motion sensors and microphone (required on iOS Safari)
- **Gesture locking** to prevent browser default behaviors (scroll, zoom, pull-to-refresh)
- **Speech recognition** setup (Web Speech API audio context activation)
- **Camera access** via the `PhoneCamera` class (optimized for ML5 integration)
- **On-screen debug console** for mobile testing
- **Vibration API** helpers

## Architecture

- `src/p5-phone.js` — Single-file library (~2200 lines). IIFE for boot + functional public API + `PhoneCamera` class.
- `dist/` — Built output: `p5-phone.js` (copy) and `p5-phone.min.js` (terser).
- All public functions are registered on both `window` and `p5.prototype`.
- Permission handlers use a Core/wrapped pattern: `_requestXxxCore()` (no notification) + `_requestXxx()` (with notification). Combo functions use Core versions to prevent duplicate `_notifySketchReady()` calls.

## Key Constraints

- iOS Safari requires **transient user activation** (a tap/click) before `DeviceOrientationEvent.requestPermission()` or `DeviceMotionEvent.requestPermission()` can be called. Permissions cannot be auto-triggered on page load.
- Android does not require `requestPermission()` at all — the enable functions still work (they're no-ops on Android).
- `p5.AudioIn` and Web Speech API conflict on mobile — `enableSpeechTap`/`enableSpeechButton` activate the audio context without creating a `p5.AudioIn`.

## Build & Test

```bash
npm run build          # terser minification → dist/
npm publish --otp=CODE # publish to npm (requires 2FA)
```

## Permission UI Styles

Each permission type has 5 activation styles:
- **Tap**: `enableSensorTap(msg)` — full-screen overlay
- **Button**: `enableSensorButton(text)` — auto-generated button
- **Canvas**: `enableSensorCanvas(msg)` — message on p5 canvas
- **Banner**: `enableSensorBanner(msg)` — animated slide-in
- **Custom**: `enableSensorOn(selector)` — bind to any HTML element

Permission types: `Sensor`, `Mic`, `Speech`, `All` (sensors+mic), `Camera`.

## Status Variables

- `window.sensorsEnabled` — motion sensors active
- `window.micEnabled` — microphone active
- `window.speechEnabled` — speech recognition active

## Conventions

- Use `enableGyroTap` / `enableSensorTap` (both work — `enableGyro*` is a legacy alias).
- The `userSetupComplete()` callback fires after permissions are granted.
- Always call `lockGestures()` in `setup()` to prevent browser default touch behaviors.
- Use `debug()`, `debugWarn()`, `debugError()` for on-device logging (requires `showDebug()` first).
