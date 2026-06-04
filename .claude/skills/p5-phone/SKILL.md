---
name: p5-phone
description: "Use when generating p5-phone examples or answering questions about p5-phone APIs: mobile sensors, device orientation, accelerometer, gyroscope, touch, microphone, p5.sound, speech recognition, PhoneCamera, ML5 camera mapping, vibration, torch/flashlight, NFC, lockGestures, enablePermissionsTap, enableHardwareTap, arbitrary hardware combinations, mobile browser permissions, p5.js 2 compatibility."
argument-hint: "Describe the p5-phone example or API question"
---

# p5-phone Portable Skill Entry Point

This file makes the p5-phone skill discoverable to CLI agents that scan `.claude/skills/`.

If your client can read repository files, load the canonical full skill first:

```text
.github/skills/p5-phone/SKILL.md
```

Use the quick reference below when a chat or CLI interface cannot follow that file reference.

## Core Rules

- Generate complete `index.html` and `sketch.js` examples unless the user asks for a snippet.
- Include `p5@2.2.3`, `p5.js-compatibility@0.2.0`, and `p5-phone@1.11.0` in generated HTML.
- Include `p5.sound@0.3.0` only for microphone, audio input, oscillators, or sound output.
- Call `lockGestures()` in every mobile sketch `setup()`.
- Request permissions from a user action using `enableSensorTap`, `enableMicTap`, `enableSoundTap`, `enableSpeechTap`, `enableCameraTap`, `enableNfcTap`, `enableVibrationTap`, `enableTorchTap`, `enablePermissionsTap`, or style variants.
- Use one `enablePermissions*` / `enableHardware*` call for sketches that need multiple hardware features from the same gesture, such as `enablePermissionsTap(['sensors', 'torch'])`.
- For simple microphone level examples, prefer `mic.getLevel()` after `window.micEnabled`; avoid `p5.Amplitude.setInput(mic)` before permission in p5.js 2 previews.
- Use `mousePressed`, `mouseDragged`, and `mouseReleased` instead of p5 1.x touch callbacks for p5 2 compatibility.
- Gate hardware-dependent drawing behind `window.sensorsEnabled`, `window.micEnabled`, `window.speechEnabled`, `window.nfcEnabled`, `window.cameraEnabled`, `window.vibrationEnabled`, or `window.torchEnabled`.
- Explain iOS transient user activation, HTTPS requirements, and browser/device support limits when answering questions.

## API Families

- Motion: `enableSensor*` or legacy `enableGyro*`, `rotationX/Y/Z`, `accelerationX/Y/Z`, `rotationRateAlpha/Beta/Gamma`, `deviceMoved()`, `deviceShaken()`.
- Microphone: `enableMic*`, `p5.AudioIn`, `p5.Amplitude`, `window.micEnabled`.
- Sound: `enableSound*`, `p5.Oscillator`, generated sound preferred for portable examples.
- Speech: `enableSpeech*` activates audio/user gesture; create speech recognition separately.
- Camera: `createPhoneCamera()`, `enableCamera*`, `cam.mapKeypoint()`, `cam.mapKeypoints()`, `cam.mapBox()`, `cam.mapBoxes()`.
- NFC: `enableNfc*`, `nfcRead(message, serialNumber)`, `setNfcTagAlias()`, `getNfcTagAlias()`, `isNfcTag()`, `stopNfc()`.
- Vibration: `enableVibration*`, `vibrate(pattern)`, iOS unsupported.
- Torch: `enableTorch*`, `torchOn()`, `torchOff()`, `toggleTorch()`, `setTorch(value)`, `stopTorch()`, Android Chrome-oriented.
- Any combination: `enablePermissions*` or `enableHardware*` with `sensors`, `mic`, `sound`, `speech`, `vibration`, `torch`, `nfc`, and `camera`; aliases include `gyro`, `microphone`, `video`, `haptics`, `flashlight`, and `flash`.
- Debug: `showDebug()`, `debug()`, `debugWarn()`, `debugError()`, `hideDebug()`, `toggleDebug()`.

## p5 2 and ml5

For `ml5@1` with `p5@2.2.3`, load this before ml5:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
<script>
  p5.prototype._incrementPreload ||= function() {};
  p5.prototype._decrementPreload ||= function() {};
</script>
<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
```

For ML5 camera examples, set ML5 `flipped: false` when available and use PhoneCamera mapping helpers.