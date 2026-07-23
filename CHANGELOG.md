# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- Added a sixth permission-activation style, **Minimal**: a bare semi-transparent full-screen overlay with an optional radiating circular icon in the center, as a cleaner alternative to the frosted message box used by `Tap`. Color, opacity, icon, icon color, and icon size are all adjustable.
- Added `enableSensorMinimal()`, `enableMicMinimal()`, `enableSoundMinimal()`, `enableSpeechMinimal()`, `enableVibrationMinimal()`, `enableTorchMinimal()` (+ `enableFlashlightMinimal` alias), `enableNfcMinimal()`, `enableGeoMinimal()`, `enableBleMinimal()`, `enableAllMinimal()`, `enableCameraMinimal()`, and `enablePermissionsMinimal()` (+ `enableHardwareMinimal` alias). Call forms: `enableXxxMinimal('Tap')`, `enableXxxMinimal({ color, opacity, icon, iconColor, iconSize, message })`, or `enableXxxMinimal('Tap', { opacity: 0.6 })`.
- Added `showDesktopQr()`, `hideDesktopQr()`, and `setQrUrl()` — a dev helper that renders a floating QR code of the current page on **desktop only** and is a no-op on mobile, so you never have to generate or dismiss a QR on the phone. Options: `{ url, position, size, label, closable, rememberDismiss }`. Closing the panel hides it for the session.
- Added device-detection globals `window.isMobile` and `window.isDesktop` (best-effort: UA + coarse-pointer + touch signals, including the iPadOS-13+ Mac-UA case).

### Notes
- The desktop QR lazily loads `qrcodejs` from a CDN only when shown on desktop, so mobile sketches download no extra bytes. It gracefully warns and removes the panel if the CDN is blocked (strict CSP / offline).
- Added GPS / geolocation support via `navigator.geolocation` — works on both iOS Safari and Android Chrome (HTTPS required). Coarse by default for battery friendliness; opt into real GPS with `setGeoOptions({ enableHighAccuracy: true })`.
- Added `enableGeoTap()`, `enableGeoButton()`, `enableGeoCanvas()`, `enableGeoBanner()`, and `enableGeoOn()` gesture-gated activation helpers.
- Added `stopGeo()`, `setGeoOptions()`, `getGeoPosition()`, `geoDistance()` (Haversine), and `geoInPolygon()` (ray-casting geofence test).
- Added GPS status globals: `window.geoEnabled`, `geoStatus`, `geoError`, and `lastGeoPosition`.
- Added optional sketch callbacks: `geoRead(position)` for position updates and `onGeoError(error)` for stream errors.
- Added `geo` / `gps` / `location` / `geolocation` tokens to the permission router (`enablePermissionsTap(['geo'], …)`).
- Added `test-geo-contract.js` for the `geoDistance` / `geoInPolygon` pure helpers; wired into `npm test`.

### Notes
- The GPS watch is released automatically on sketch removal in p5.js 2.x (`lifecycles.preremove`), preventing the shared-watch leak that affected the legacy `p5.geolocation` library.
- iOS does not deliver GPS updates while the screen is locked or the tab is backgrounded.
- `navigator.permissions.query({name:'geolocation'})` always returns `'prompt'` on Safari (WebKit bug); p5-phone does not gate UI on it.

## [1.12.1] - 2026-06-11

### Added
- Added `bleRead()` for polling read-only BLE characteristics.
- Wired `npm test` to `test-ble-contract.js`, testing the shipped encode/decode helpers.

### Fixed
- Fixed duplicate BLE notification listeners stacking on auto-reconnect.
- Fixed BLE auto-reconnect giving up after a single failed attempt; retries now use backoff until `bleDisconnect()`.
- Fixed `bleSetup()` accepting duplicate characteristic names silently.
- Fixed unbounded canvas permission polling in `_createCanvasToEnable`.
- Fixed `PhoneCamera.remove()` leaving instances in `window._phoneCameras`.
- Fixed p5 version detection defaulting to v1 when p5-phone loads before p5.js.
- Fixed debug panel HTML injection via `innerHTML`.
- Added warnings for oversized BLE string writes and read-only BLE profiles.

## [1.12.0] - 2026-06-08

### Added
- Added Web Bluetooth (BLE) support for typed send/receive between p5.js sketches and Arduino-class peripherals.
- Added `bleSetup()`, `bleConnect()`, `bleDisconnect()`, `bleWrite()`, and `isBleSupported()`.
- Added `enableBleTap()`, `enableBleButton()`, `enableBleCanvas()`, `enableBleBanner()`, and `enableBleOn()` gesture-gated connect helpers.
- Added BLE status globals: `window.bleSupported`, `bleConnected`, `bleStatus`, `bleError`, `bleDeviceName`, and `bleValues`.
- Added optional sketch callbacks: `bleReceive(name, value)`, `bleReady(deviceName)`, and `bleClosed()`.
- Added UUID auto-derivation in `bleSetup()` when characteristic UUIDs are omitted (matches the P5PhoneBLE Arduino contract).
- Added `examples/Phone Sensor Examples/ble/01_send_receive/`.

### Notes
- Web Bluetooth requires HTTPS (or localhost). iOS Safari/Chrome do not support it; use the Bluefy browser on iPhone/iPad.
- Embedded iframes (e.g. Canvas LMS) need `allow="bluetooth"` on the iframe element.

## [1.11.0] - 2026-06-02

### Added
- Added Android Chrome-oriented torch/flashlight control through the rear camera track.
- Added `enableTorchTap()`, `enableTorchButton()`, `enableTorchCanvas()`, `enableTorchBanner()`, and `enableTorchOn()` permission helpers plus matching `enableFlashlight*` aliases.
- Added `torchOn()`, `torchOff()`, `toggleTorch()`, `setTorch()`, `stopTorch()`, and flashlight aliases for simple operation.
- Added `window.torchEnabled`, `window.torchSupported`, `window.torchActive`, `window.torchError`, and `window.torchCapability` status globals.
- Added `torch`, `flashlight`, `flash`, and `light` aliases to `enablePermissions*()` and `enableHardware*()` multi-hardware permission helpers.
- Added touch, disco, and shake flashlight examples.

## [1.10.0] - 2026-06-02

### Added
- Added `enablePermissionsTap()`, `enablePermissionsButton()`, `enablePermissionsCanvas()`, `enablePermissionsBanner()`, and `enablePermissionsOn()` for requesting any selected combination of hardware permissions from one user gesture.
- Added `enableHardware*` aliases for the new arbitrary-combination permission helpers.
- Added `window.cameraEnabled` and included camera status in the `permissionsReady` event detail.

## [1.9.3] - 2026-06-02

### Fixed
- Fixed `PhoneCamera` drawing in p5.js 2.x by rendering the native video element directly instead of passing p5 media wrappers back through `image()`.
- Improved `PhoneCamera` display sizing by using the native video element dimensions when available.
- Updated ML5 PhoneCamera examples to wait for model-loaded callbacks before starting detection.

## [1.9.2] - 2026-06-02

### Fixed
- Fixed p5.js 2.x global-mode startup crashes caused by duplicate p5-phone addon registration of globals such as `lockGestures()`.
- Kept p5.js 2.x instance-mode support by attaching p5-phone methods during the `presetup` lifecycle instead of registering colliding prototype globals.

### Changed
- Updated the npm peer dependency range to advertise support for both p5.js 1.x and 2.x.
- Updated examples and teaching snippets to use p5.js `2.2.3`, `p5.js-compatibility@0.2.0` preload support, and `p5.sound@0.3.0` where sound is required.
- Converted image and sound asset-loading examples from `preload()` to `async setup()` with awaited `loadImage()` and `loadSound()` calls.

## [1.9.1] - 2026-06-02

### Added
- NFC tag alias helpers: `setNfcTagAlias()`, `getNfcTagAlias()`, and `isNfcTag()` for naming physical tags and using aliases in conditionals.
- NFC read messages now include `message.alias`, with `window.lastNfcAlias` and `window.nfcTagAliases` available for sketches.
- NFC two-tag effects example showing `shirt` and `table` aliases used in simple `if (isNfcTag(...))` branches.
- Basic movement examples for `deviceShaken()`, `deviceMoved()`, and `deviceOrientation`, including threshold controls for `setShakeThreshold()` and `setMoveThreshold()`.
- Motion Synth sound example showing generated p5.sound oscillator audio controlled by phone motion sensors.
- `PhoneCamera.mapBox()` and `PhoneCamera.mapBoxes()` for mapping ML5 object-detection bounding boxes through p5-phone camera scaling and mirroring.
- ML5 phone object detection example using `ml5.objectDetection('cocossd')` and mapped bounding boxes.

### Changed
- NFC example is now a tag identifier workflow with larger centered tag IDs, alias entry, and a downloadable tag-name list.
- ML5 FaceMesh and HandPose examples now use the current `flipped: false` option name.

### Fixed
- PHONE BodyPose example now tracks the right shoulder at index `12` instead of the nose for the shoulder-distance pair.

## [1.9.0] - 2026-04-08

### Added
- **NFC Tag Reading (Android Only)**: Read NFC tags via the Web NFC API (`NDEFReader`)
  - 5 UI activation styles: `enableNfcTap()`, `enableNfcButton()`, `enableNfcCanvas()`, `enableNfcBanner()`, `enableNfcOn()`
  - `stopNfc()` to stop scanning via `AbortController`
  - `window.nfcEnabled` status variable
  - `window.lastNfcMessage` / `window.lastNfcSerialNumber` globals for most recent tag data
  - User-defined `nfcRead(message, serialNumber)` callback with pre-decoded NDEF records (text, url, mime/JSON)
  - Graceful degradation on unsupported platforms (iOS, desktop) with console warnings
  - Registered on `window`, `p5.prototype`, and `p5.registerAddon()` for p5.js 1.x and 2.0+ compatibility
- NFC documentation section in README with platform support, API reference, record types table, and examples
- NFC example: `examples/Phone Sensor Examples/nfc/01_nfc_read/`
- NFC added to `.github/instructions/p5-phone.instructions.md` permission table

## [1.8.0] - 2025-06-26

### Added
- **p5.js 2.0 compatibility**: Full support for both p5.js 1.x and 2.0+
  - Automatic version detection via `p5.VERSION` (`_p5MajorVersion`, `_isP5v2`)
  - `p5.registerAddon()` integration for p5.js 2.0+ (in addition to existing `p5.prototype` registration)
  - `_overrideP5Touch()` conditionally wraps touch callbacks only in 1.x (no-ops in 2.0 where Pointer API handles all input)
- p5.js 2.0 CDN comments in all example HTML files
- `test-p5v2.html` — test page for verifying p5.js 2.0 compatibility
- "p5.js Version Compatibility" section in README with feature matrix

### Changed
- All 31 example `sketch.js` files: `touchStarted()` → `mousePressed()`, `touchMoved()` → `mouseDragged()`, `touchEnded()` → `mouseReleased()` (works in both p5.js 1.x and 2.0)
- Homepage `index.html` updated: Touch Events section → Touch/Pointer Events, function declarations renamed
- Section headers in examples updated from "TOUCH EVENT FUNCTIONS" to "INPUT EVENT FUNCTIONS"
- README code examples updated to use `mousePressed`/`mouseReleased` instead of `touchStarted`/`touchEnded`
- Updated `.github/copilot-instructions.md` and `.github/instructions/p5-phone.instructions.md` with 2.0 compatibility notes

## [1.7.0] - 2025-06-25

### Added
- **Permission UI Styles**: Three new ways to present permission prompts
  - **Canvas style** (`enableSensorCanvas`, `enableMicCanvas`, etc.) — message drawn on the p5 canvas, tap canvas to activate
  - **Banner style** (`enableSensorBanner`, `enableMicBanner`, etc.) — animated slide-in banner at top of screen
  - **Custom element** (`enableSensorOn`, `enableMicOn`, etc.) — bind activation to any HTML element via CSS selector
- `enableSpeechButton(text)` — button-based speech recognition activation (was missing)
- All 21 new API functions registered on both `window` and `p5.prototype`

### Fixed
- **Timing bug**: `_initializeP5TouchOverrides()` replaced infinite `window._setupDone` poll with canvas-detection loop (max 50 attempts)
- **Duplicate notifications**: `enableAllTap`/`enableAllButton` now use internal Core functions to prevent multiple `_notifySketchReady()` calls
- **Infinite polling**: `_checkVideoReady()` now has max 100 attempts (10s timeout) instead of polling forever
- **Console override safety**: `_setupConsoleOverrides()` wrapped in try/catch to prevent crashes
- **Missing global**: Added `window.speechEnabled = false` initialization
- Removed dead `_permissionsInitialized` variable
- `_notifySketchReady()` event detail now includes `speech: window.speechEnabled`

### Changed
- `_removeExistingUI()` now also removes `#permissionBanner` elements
- Internal permission handlers split into Core (no notify) + wrapped (with notify) pairs

## [1.6.4] - 2025-01-31

### Added
- **Speech Recognition Support**: New `enableSpeechTap()` method for Web Speech API integration
  - Activates audio context without creating p5.AudioIn (prevents microphone hardware conflict on mobile)
  - Compatible with p5.js-speech library and p5.SpeechRec
  - Includes new speech recognition example using touch-to-talk pattern
  - Works reliably on mobile devices (Android/iOS)

## [1.6.1] - 2025-01-29

### Fixed
- Version comment in source file header (was incorrectly showing v1.5.0)

## [1.6.0] - 2025-01-29

### Added
- **PhoneCamera Class**: New ML5-optimized camera class for computer vision integration
  - `createPhoneCamera(active, mirror, mode)` - Create camera with display options
  - `cam.videoElement` - Clean API to access native HTML video element for ML5
  - `cam.onReady(callback)` - Callback fired when camera is initialized
  - `cam.mapKeypoint(keypoint)` - Map single ML5 keypoint to screen coordinates
  - `cam.mapKeypoints(keypoints)` - Map array of ML5 keypoints to screen coordinates
  - Display modes: 'fitHeight', 'cover', 'contain', 'fixed'
  - Properties: `cam.ready`, `cam.video`, `cam.active`, `cam.mirror`, `cam.mode`
  
- **Auto-initialization**: Camera permission detection and automatic initialization
- **iOS orientation fix**: Proper handling of video orientation with MediaPipe runtime
- **ML5 Integration Examples**: 
  - FaceMesh (468 keypoints, nose tracking)
  - HandPose (21 keypoints, 3D depth, both hands)
  - BodyPose (33 keypoints, BlazePose, full skeleton)

### Changed
- Camera initialization now waits for permissions to prevent iOS orientation bugs
- All ML5 examples use `runtime: 'mediapipe'` for consistent cross-platform behavior

### Fixed
- iOS video rotation bug (90-degree rotation) in BodyPose tracking
- Coordinate mapping offset handling with Math.max(0, dims.x) for negative offsets
- Camera permission handling on iOS requiring user interaction

### Documentation
- Added comprehensive PhoneCamera (ML5 Integration) section to README
- API reference for all PhoneCamera methods and properties
- Display modes documentation
- Coordinate mapping explanation
- Important notes about ML5 flipping options and iOS compatibility

## [1.5.0] - Previous Release

Initial stable release with core phone sensor functionality.
