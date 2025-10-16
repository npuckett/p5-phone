# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure and documentation
- GitHub Actions for CI/CD and automated releases
- GitHub Pages deployment for live examples

### Changed
- Updated repository URLs to use DigitalFuturesOCADU organization
- Fixed CDN URLs in documentation and examples

## [1.0.0] - 2025-01-XX

### Added
- 🎯 **Four modular permission scripts:**
  - `permissionsGesture.js` - Touch input with gesture blocking
  - `permissionsGyro.js` - Motion sensors (gyroscope + accelerometer)
  - `permissionMic.js` - Microphone input
  - `permissionsAll.js` - Complete permission handling

- 🛡️ **Comprehensive gesture blocking:**
  - Back/forward navigation prevention
  - Edge swipe blocking
  - Pull-to-refresh prevention
  - Pinch zoom disabling
  - Double-tap zoom prevention
  - Long-press menu blocking
  - p5.js touch event optimization

- 📱 **Cross-platform compatibility:**
  - iOS Safari 13+ support
  - Android Chrome 80+ support
  - Automatic permission request handling
  - Graceful degradation on unsupported devices

- 🎨 **Interactive examples:**
  - Basic touch drawing app
  - Gyroscope tilt ball game
  - Sound-reactive visualizer
  - Full sensor demonstration

- 📚 **Complete documentation:**
  - Detailed usage instructions
  - Code examples for each module
  - Mobile-first CSS template
  - Best practices guide

### Technical Details
- Zero external dependencies (except p5.js)
- Lightweight modular architecture
- Event-driven permission handling
- Automatic p5.js touch override system
- Comprehensive mobile browser compatibility

---

## Release Notes Template

### [X.Y.Z] - YYYY-MM-DD

#### Added
- New features and capabilities

#### Changed
- Updates to existing functionality

#### Deprecated
- Features marked for removal

#### Removed
- Deleted features

#### Fixed
- Bug fixes and improvements

#### Security
- Security-related changes