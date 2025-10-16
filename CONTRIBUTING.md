# Contributing to Mobile p5.js Permissions

Thank you for your interest in contributing to this project! We welcome contributions from everyone.

## 🚀 Getting Started

### Prerequisites

- Node.js 12.0.0 or higher
- Git
- A modern web browser (for testing)
- Basic knowledge of JavaScript and p5.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mobile-p5-permissions.git
   cd mobile-p5-permissions
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Test Locally**
   - Open `examples/` directory files in your browser
   - Test on mobile devices for full functionality

## 📋 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Test on multiple devices** (iOS Safari, Android Chrome)
3. **Include these details:**
   - Device type and OS version
   - Browser name and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console error messages (if any)

### Submitting Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow existing code style
   - Test on mobile devices
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   npm test
   ```

4. **Commit Your Changes**
   ```bash
   git commit -m "Add: description of your changes"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Development Guidelines

### Code Style

- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Comments**: Use clear, descriptive comments
- **Functions**: Keep functions focused and well-named

### File Structure

```
src/
├── permissionsAll.js      # Full permission handling
├── permissionsGyro.js     # Motion sensors only
├── permissionMic.js       # Microphone only
└── permissionsGesture.js  # Touch/gesture only

examples/
├── basic-touch/           # Touch-only demo
├── gyroscope-demo/        # Motion sensor demo
├── microphone-demo/       # Audio input demo
└── full-sensors/          # Complete demo
```

### Testing Requirements

- **Manual Testing**: Test all examples on real mobile devices
- **Cross-browser**: Test on iOS Safari and Android Chrome at minimum
- **Permissions**: Verify permission flows work correctly
- **Gestures**: Ensure gesture blocking prevents unwanted behaviors

### Documentation

- Update README.md for new features
- Add comments to complex code sections
- Update examples if API changes
- Include usage examples for new functionality

## 🔄 Types of Contributions

### 🐛 Bug Fixes
- Device compatibility issues
- Permission handling problems
- Gesture blocking improvements

### ✨ New Features
- Additional sensor support
- New gesture blocking capabilities
- Enhanced permission flows
- Better error handling

### 📚 Documentation
- README improvements
- Code comments
- Example enhancements
- Usage guides

### 🎨 Examples
- New creative coding examples
- Educational demonstrations
- Real-world use cases

## 🧪 Testing Checklist

Before submitting a PR, please verify:

- [ ] Code runs without errors on desktop
- [ ] Examples work on iOS Safari
- [ ] Examples work on Android Chrome
- [ ] Permission requests appear correctly
- [ ] Gesture blocking prevents browser gestures
- [ ] No console errors or warnings
- [ ] Documentation updated (if applicable)

## 📖 Resources

- [p5.js Reference](https://p5js.org/reference/)
- [Web API Documentation](https://developer.mozilla.org/en-US/docs/Web/API)
- [Mobile Web Development Guide](https://developer.mozilla.org/en-US/docs/Web/Guide/Mobile)

## 💬 Questions?

- Open an issue for technical questions
- Check existing documentation first
- Be specific about your use case

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make mobile p5.js development easier for everyone! 🙏**