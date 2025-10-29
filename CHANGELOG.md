# Changelog

All notable changes to this project will be documented in this file.

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
