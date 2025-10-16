# p5-phone
![P5Phone.png](p5-phone.png)
*Illustration by [Angela Torchio](https://angelatorchio.com/)*

##  [Link for Interactive Examples](https://npuckett.github.io/p5-phone/examples/homepage)

# Overview
P5.js on mobile provides unique opportunities and challenges. The main P5 framework does an excellent job of making it easy to read data from various phone inputs and sensors, however it doesn't deal with the realities of contemporary browser's built in gestures and security protocols.
That's where this library comes in:

- Simplifies accessing phone hardware from the browser (accelerometers, gyroscopes, microphone)
- Simplifies disabling default phone gestures (Zoom, refresh, back, etc)
- Simplifies enabling audio output
- Simplifies using an on-screen console to display errors and debug info

## p5 commands

This library simplifies access to the following p5.js mobile sensor and audio commands:

**Touch Events:**
- [`touchStarted()`](https://p5js.org/reference/p5/touchStarted/) - Called when a touch begins
- [`touchEnded()`](https://p5js.org/reference/p5/touchEnded/) - Called when a touch ends

**Device Motion & Orientation:**
- [`rotationX`](https://p5js.org/reference/p5/rotationX/) - Device tilt forward/backward
- [`rotationY`](https://p5js.org/reference/p5/rotationY/) - Device tilt left/right
- [`rotationZ`](https://p5js.org/reference/p5/rotationZ/) - Device rotation around screen
- [`accelerationX`](https://p5js.org/reference/p5/accelerationX/) - Acceleration left/right
- [`accelerationY`](https://p5js.org/reference/p5/accelerationY/) - Acceleration up/down
- [`accelerationZ`](https://p5js.org/reference/p5/accelerationZ/) - Acceleration forward/back
- [`deviceShaken()`](https://p5js.org/reference/p5/deviceShaken/) - Shake detection event
- [`deviceMoved()`](https://p5js.org/reference/p5/deviceMoved/) - Movement detection event
- [`setShakeThreshold()`](https://p5js.org/reference/p5/setShakeThreshold/) - Set shake detection sensitivity
- [`setMoveThreshold()`](https://p5js.org/reference/p5/setMoveThreshold/) - Set movement detection sensitivity

**Audio Input (requires p5.sound):**
- [`p5.AudioIn()`](https://p5js.org/reference/p5.sound/p5.AudioIn/) - Audio input object
- [`getLevel()`](https://p5js.org/reference/p5.sound/p5.AudioIn/getLevel/) - Current audio input level

## Browser Compatibility

- iOS 13+ (Safari)
- Android 7+ (Chrome)
- Chrome 80+
- Safari 13+
- Firefox 75+

## Table of Contents

- [Link for Interactive Examples](#link-for-interactive-examples)
- [Browser Compatibility](#browser-compatibility)
- [CDN (Recommended)](#cdn-recommended)
- [Basic Setup](#basic-setup)
  - [Index HTML](#index-html)
  - [p5.js](#p5js)
- [API Reference](#api-reference)
  - [Core Functions](#core-functions)
  - [Status Variables](#status-variables)
  - [lockGestures()](#lockgestures)
  - [Motion Sensor Activation](#motion-sensor-activation)
  - [Microphone Activation](#microphone-activation)
  - [Sound Output Activation](#sound-output-activation)
  - [Debug System](#debug-system)

### CDN (Recommended)

```html
<!-- Minified version (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/p5-phone@1.4.4/dist/p5-phone.min.js"></script>

<!-- Development version (larger, with comments) -->
<!-- <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.4.4/dist/p5-phone.js"></script> -->
```

### Basic Setup

#### Index HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile p5.js App</title>
  
  <!-- Basic CSS to remove browser defaults and align canvas -->
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
  
  <!-- Load p5.js library -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.10/p5.min.js"></script>
  
  <!-- Load p5-phone library -->
  <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.4.4/dist/p5-phone.min.js"></script>
  
</head>
<body>
  <!-- Load the p5.js sketch -->
  <script src="sketch.js"></script>
</body>
</html>
```

#### p5.js

```javascript
let mic;
let mySound;

function preload() {
  // Load sound file if needed
  // mySound = loadSound('assets/sound.mp3');
}

function setup() {
  // Show debug panel FIRST to catch setup errors
  showDebug();
  
  createCanvas(windowWidth, windowHeight);
  
  // Lock mobile gestures to prevent browser interference
  lockGestures();
  
  // Enable motion sensors with tap-to-start
  enableGyroTap('Tap to enable motion sensors');
  
  // Enable microphone with tap-to-start (also enables sound output)
  mic = new p5.AudioIn();
  enableMicTap('Tap to enable microphone');
  
  // OR enable sound output only (no microphone input)
  // enableSoundTap('Tap to enable sound');
}

function draw() {
  background(220);
  
  // Always check status before using hardware features
  if (window.sensorsEnabled) {
    // Use device rotation and acceleration
    fill(255, 0, 0);
    circle(width/2 + rotationY * 5, height/2 + rotationX * 5, 50);
  }
  
  if (window.micEnabled) {
    // Use microphone input
    let level = mic.getLevel();
    fill(0, 255, 0);
    rect(10, 10, level * 200, 20);
  }
  
  if (window.soundEnabled) {
    // Safe to play sounds
    // mySound.play();
  }
}

// Prevent default touch behavior (optional but recommended)
function touchStarted() {
  return false;
}

function touchEnded() {
  return false;
}
```

## API Reference

### Core Functions

```javascript
// Essential mobile setup
lockGestures()  // Prevent browser gestures (call in setup())

// Motion sensor activation  
enableGyroTap(message)    // Tap anywhere to enable sensors
enableGyroButton(text)    // Button-based sensor activation

// Microphone activation
enableMicTap(message)     // Tap anywhere to enable microphone  
enableMicButton(text)     // Button-based microphone activation

// Sound output activation (no microphone input)
enableSoundTap(message)   // Tap anywhere to enable sound playback
enableSoundButton(text)   // Button-based sound activation

// Status variables (check these in your code)
window.sensorsEnabled     // Boolean: true when motion sensors are active
window.micEnabled         // Boolean: true when microphone is active
window.soundEnabled       // Boolean: true when sound output is active

// Debug system (enhanced in v1.4.0)
showDebug()       // Show on-screen debug panel with automatic error catching
hideDebug()       // Hide debug panel
toggleDebug()     // Toggle panel visibility
debug(...args)    // Console.log with on-screen display and timestamps
debugError(...args) // Display errors with red styling
debugWarn(...args)  // Display warnings with yellow styling
debug.clear()     // Clear debug messages
```

**p5.js Namespace Support**: All functions are also available as `p5.prototype` methods:
```javascript
// You can use either syntax:
lockGestures();          // Global function (recommended)
this.lockGestures();     // p5.js instance method

// Both approaches work identically
enableGyroTap('Tap to start');
this.enableGyroTap('Tap to start');
```

### Status Variables

**Purpose:** Check whether permissions have been granted and sensors are active.

**Variables:**
- `window.sensorsEnabled` - Boolean indicating if motion sensors are active
- `window.micEnabled` - Boolean indicating if microphone is active
- `window.soundEnabled` - Boolean indicating if sound output is active

**Usage:**
```javascript
function draw() {
  // Always check before using sensor data
  if (window.sensorsEnabled) {
    // Safe to use rotationX, rotationY, accelerationX, etc.
    let tilt = rotationX;
  }
  
  if (window.micEnabled) {
    // Safe to use microphone
    let audioLevel = mic.getLevel();
  }
  
  if (window.soundEnabled) {
    // Safe to play sounds
    mySound.play();
  }
}

// You can also use them for conditional UI
function setup() {
  enableGyroTap('Tap to enable motion');
  
  // Show different instructions based on status
  if (!window.sensorsEnabled) {
    debug("Motion sensors not yet enabled");
  }
}
```

### lockGestures()

**Purpose:** Prevents unwanted mobile browser gestures that can interfere with your p5.js app.

**When to use:** Call once in your `setup()` function after creating the canvas.

**What it blocks:**
- **Pinch-to-zoom** - Prevents users from accidentally zooming the page
- **Pull-to-refresh** - Stops the browser refresh gesture when pulling down
- **Swipe navigation** - Disables back/forward swipe gestures
- **Long-press context menus** - Prevents copy/paste menus from appearing
- **Text selection** - Stops accidental text highlighting on touch and hold
- **Double-tap zoom** - Eliminates double-tap to zoom behavior

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures(); // Essential for smooth mobile interaction
}
```

### Motion Sensor Activation

**Purpose:** Enable device motion and orientation sensors with user permission handling.

**Commands:**
- `enableGyroTap(message)` - Tap anywhere on screen to enable sensors
- `enableGyroButton(text)` - Creates a button with custom text to enable sensors

**Usage:**
```javascript
// Tap-to-enable (recommended)
enableGyroTap('Tap to enable motion sensors');

// Button-based activation
enableGyroButton('Enable Motion');
```

**Available p5.js Variables (when `window.sensorsEnabled` is true):**

| Variable | Description | Range/Units |
|----------|-------------|-------------|
| [`rotationX`](https://p5js.org/reference/p5/rotationX/) | Device tilt forward/backward | -180° to 180° |
| [`rotationY`](https://p5js.org/reference/p5/rotationY/) | Device tilt left/right | -180° to 180° |
| [`rotationZ`](https://p5js.org/reference/p5/rotationZ/) | Device rotation around screen | -180° to 180° |
| [`accelerationX`](https://p5js.org/reference/p5/accelerationX/) | Acceleration left/right | m/s² |
| [`accelerationY`](https://p5js.org/reference/p5/accelerationY/) | Acceleration up/down | m/s² |
| [`accelerationZ`](https://p5js.org/reference/p5/accelerationZ/) | Acceleration forward/back | m/s² |
| [`deviceShaken`](https://p5js.org/reference/p5/deviceShaken/) | Shake detection event | true when shaken |
| [`deviceMoved`](https://p5js.org/reference/p5/deviceMoved/) | Movement detection event | true when moved |

**Important:** All motion sensor variables, including `deviceShaken` and `deviceMoved`, are only available when `window.sensorsEnabled` is true. Always check this status before using any motion data.

**Example:**
```javascript
function draw() {
  // CRITICAL: Always check window.sensorsEnabled first
  if (window.sensorsEnabled) {
    // Tilt-controlled circle
    let x = width/2 + rotationY * 3;
    let y = height/2 + rotationX * 3;
    circle(x, y, 50);
    
    // Shake detection - only works when sensors are enabled
    if (deviceShaken) {
      background(random(255), random(255), random(255));
    }
    
    // Movement detection - also requires sensors to be enabled
    if (deviceMoved) {
      fill(255, 0, 0);
    }
  } else {
    // Show fallback when sensors not enabled
    text('Tap to enable motion sensors', 20, 20);
  }
}
```

### Microphone Activation

**Purpose:** Enable device microphone with user permission handling for audio-reactive applications.

**Important:** Microphone examples require the p5.sound library. Add this script tag to your HTML:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.0/addons/p5.sound.min.js"></script>
```

**Commands:**
- `enableMicTap(message)` - Tap anywhere on screen to enable microphone
- `enableMicButton(text)` - Creates a button with custom text to enable microphone

**Usage:**
```javascript
// Tap-to-enable (recommended)
enableMicTap('Tap to enable microphone');

// Button-based activation
enableMicButton('Enable Audio');
```

**Available p5.js Variables (when `window.micEnabled` is true):**

| Variable | Description | Range |
|----------|-------------|-------|
| [`p5.AudioIn()`](https://p5js.org/reference/p5.sound/p5.AudioIn/) | Audio input object (stored in `mic`) | Object |
| [`mic.getLevel()`](https://p5js.org/reference/p5.sound/p5.AudioIn/getLevel/) | Current audio input level | 0.0 to 1.0 |

**Example:**
```javascript
let mic;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create a new p5.AudioIn() instance
  mic = new p5.AudioIn();
  
  // Enable microphone with tap
  enableMicTap();
}

function draw() {
  if (window.micEnabled) {
    // The mic object is a p5.AudioIn() instance
    // Audio-reactive visualization
    let level = mic.getLevel();
    let size = map(level, 0, 1, 10, 200);
    
    background(level * 255);
    circle(width/2, height/2, size);
  }
}
```

### Sound Output Activation

**Purpose:** Enable audio playback without requiring microphone input. Perfect for playing sounds, music, synthesizers, and audio effects in mobile browsers.

**Important:** Sound examples require the p5.sound library. Add this script tag to your HTML:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.0/addons/p5.sound.min.js"></script>
```

**Commands:**
- `enableSoundTap(message)` - Tap anywhere on screen to enable sound playback
- `enableSoundButton(text)` - Creates a button with custom text to enable sound

**Usage:**
```javascript
// Tap-to-enable (recommended)
enableSoundTap('Tap to enable sound');

// Button-based activation
enableSoundButton('Enable Sound');
```

**When to use Sound vs. Microphone:**
- Use `enableSound` for: Playing audio files, synthesizers, oscillators, sound effects
- Use `enableMic` for: Recording audio, audio-reactive visualizations, voice input
- Note: `enableMic` also enables sound output, so you don't need both

**Example:**
```javascript
let mySound;

function preload() {
  // Load audio file
  mySound = loadSound('assets/sound.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Enable sound playback with tap
  enableSoundTap('Tap to enable sound');
}

function draw() {
  background(220);
  
  if (window.soundEnabled) {
    text('Tap anywhere to play sound', 20, 20);
  } else {
    text('Waiting for sound activation...', 20, 20);
  }
}

function mousePressed() {
  // Check if sound is enabled before playing
  if (window.soundEnabled && !mySound.isPlaying()) {
    mySound.play();
  }
}
```

### Debug System

**Purpose:** Essential on-screen debugging system for mobile development where traditional browser dev tools aren't accessible. Provides automatic error catching, timestamped logging, and color-coded messages.

**Why use it:** Mobile browsers often hide JavaScript errors, making debugging difficult. This system displays all errors, warnings, and custom messages directly on your mobile screen with timestamps and color coding.

**Commands:**

| Function | Purpose | Example |
|----------|---------|---------|
| `showDebug()` | Show debug panel and enable error catching | `showDebug()` |
| `hideDebug()` | Hide debug panel | `hideDebug()` |
| `toggleDebug()` | Toggle panel visibility | `toggleDebug()` |
| `debug(...args)` | Log messages (white text) | `debug("App started", frameRate())` |
| `debugError(...args)` | Display errors (red text) | `debugError("Connection failed")` |
| `debugWarn(...args)` | Display warnings (yellow text) | `debugWarn("Low battery")` |
| `debug.clear()` | Clear all messages | `debug.clear()` |

**Key Features:**
- **Automatic Error Catching** - JavaScript errors automatically displayed with red styling
- **Error Location** - Shows filename and line number for easy debugging
- **Timestamps** - All messages include precise timestamps
- **Color Coding** - Errors (red), warnings (yellow), normal messages (white)
- **Mobile Optimized** - Touch-friendly interface that works on small screens
- **Keyboard Shortcuts** - Press 'D' to toggle, 'C' to clear (when debug is enabled)

**Critical Setup:**
```javascript
function setup() {
  // IMPORTANT: Call showDebug() FIRST to catch setup errors
  showDebug();
  
  createCanvas(windowWidth, windowHeight);
  // Any errors after this point will be automatically caught and displayed
}
```

**Usage Examples:**
```javascript
// Basic logging
debug("Touch at:", mouseX, mouseY);
debug("Sensors enabled:", window.sensorsEnabled);

// Error handling
debugError("Failed to load image");
debugWarn("Frame rate dropping:", frameRate());

// Objects and arrays
debug("Touch points:", touches);
debug({rotation: rotationX, acceleration: accelerationX});
```


