# Changelog

All notable changes to this project will be documented in this file.

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
- Important notes about flipHorizontal and iOS compatibility

## [1.5.0] - Previous Release

Initial stable release with core phone sensor functionality.
