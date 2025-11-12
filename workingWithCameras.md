# Working with Cameras and ML5

This guide covers how to use the PhoneCamera class from p5-phone for computer vision projects with ML5.js.

## Part 1: Using PhoneCamera

### Installation

Include p5-phone in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/p5-phone@1.6.1/dist/p5-phone.min.js"></script>
```

Or install via npm:
```bash
npm install p5-phone
```

### Common Issues with Phone Cameras

#### Multiple Cameras
Mobile devices often have multiple cameras (front/back). The PhoneCamera class handles switching between them:
- `'user'` - Front-facing camera (selfie camera)
- `'environment'` - Back-facing camera

#### Phone Orientation and Fitting
Different phones have different camera aspect ratios and screen sizes. PhoneCamera provides display modes to handle this:
- `'fitHeight'` - Fits camera to canvas height (recommended for portrait)
- `'fitWidth'` - Fits camera to canvas width (recommended for landscape)
- `'fixed'` - Fixed size display (set with `cam.fixedWidth` and `cam.fixedHeight`)

#### Video Mirroring
Front cameras typically need to be mirrored for a natural "mirror" effect. PhoneCamera handles this automatically:
- Front camera (`'user'`) → mirrored by default
- Back camera (`'environment'`) → not mirrored

### Basic Patterns

#### Creating a PhoneCamera

```javascript
let cam;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create camera: facing, mirror, mode
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Enable camera with tap
  enableCameraTap();
}
```

**Parameters:**
- `active` - Camera to use: `'user'` (front) or `'environment'` (back)
- `mirror` - Boolean to mirror the video horizontally
- `mode` - Display mode: `'fitHeight'`, `'fitWidth'`, `'fixed'`

#### Changing Display Modes

```javascript
// Switch between display modes
cam.mode = 'fitHeight';  // Fit to height
cam.mode = 'fitWidth';   // Fit to width
cam.mode = 'fixed';      // Fixed size (640x480 default)

// For fixed mode, set custom size
cam.fixedWidth = 800;
cam.fixedHeight = 600;
cam.mode = 'fixed';
```

#### Switching Cameras

```javascript
// Switch between front and back camera
cam.active = 'environment';  // Back camera
cam.active = 'user';         // Front camera

// Toggle camera
function switchCamera() {
  cam.active = cam.active === 'user' ? 'environment' : 'user';
}
```

#### Enabling Camera Access

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Option 1: Tap to enable (recommended)
  enableCameraTap();
  
  // Option 2: Button to enable
  // enableCameraButton();
  
  // Option 3: Use callback when camera is ready
  cam.onReady(() => {
    console.log('Camera initialized!');
    // Start ML5 models here
  });
}
```

---

## Part 2: Integrating with ML5

### Getting ML5

**CDN Link:**
```html
<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
```

**Documentation:** https://docs.ml5js.org/

### Complete HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phone Camera + ML5</title>
  
  <!-- p5.js library -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.1/p5.min.js"></script>
  
  <!-- ML5.js library (v1.x) -->
  <script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
  
  <!-- p5-phone library -->
  <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.6.1/dist/p5-phone.min.js"></script>
  
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```

### Integrating PhoneCamera with ML5

#### Understanding Synchronous vs Asynchronous Events

**Camera Initialization (Asynchronous):**
The camera needs user permission and time to start. Use `cam.onReady()` callback:

```javascript
cam.onReady(() => {
  // Camera is ready - safe to start ML5 models
});
```

**Model Loading (Asynchronous):**
ML5 models need to download and initialize. Use the model's callback:

```javascript
let model = ml5.faceMesh(options, modelLoaded);

function modelLoaded() {
  // Model is ready - safe to start detection
  model.detectStart(cam.videoElement, gotResults);
}
```

**Detection (Asynchronous):**
ML5 continuously detects and calls your callback with results:

```javascript
function gotResults(results) {
  // Process results here (runs every frame)
  detections = results;
}
```

### Basic Pattern for Loading ML5 Models

**Standard Pattern (Recommended):**
```javascript
let cam;
let model;
let results = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  
  // Create camera
  cam = createPhoneCamera('user', true, 'fitHeight');
  enableCameraTap();
  
  // Wait for camera, then load model
  cam.onReady(() => {
    let options = {
      runtime: 'mediapipe',  // IMPORTANT: Required for iOS
      flipHorizontal: false  // PhoneCamera handles mirroring
    };
    
    model = ml5.modelName(options, modelLoaded);
  });
}

function modelLoaded() {
  console.log('Model loaded!');
  // Start detection with camera video element
  model.detectStart(cam.videoElement, gotResults);
}

function gotResults(detections) {
  results = detections;
}
```

---

## ML5 Models and Their Results

### 1. FaceMesh - Face Landmark Detection

**Reference:** https://docs.ml5js.org/#/reference/facemesh

**Returns:** 468 keypoints per face

```javascript
let facemesh;
let faces = [];

cam.onReady(() => {
  let options = {
    maxFaces: 1,
    refineLandmarks: false,
    runtime: 'mediapipe',
    flipHorizontal: false
  };
  
  facemesh = ml5.faceMesh(options, modelLoaded);
});

function modelLoaded() {
  facemesh.detectStart(cam.videoElement, (results) => {
    faces = results;
  });
}

function draw() {
  // Each face has:
  // - face.keypoints[] - Array of 468 keypoints
  // - Each keypoint has: {x, y, z, name}
  
  if (faces.length > 0) {
    let face = faces[0];
    let nose = face.keypoints[1];  // Nose tip
    let mappedNose = cam.mapKeypoint(nose);
    ellipse(mappedNose.x, mappedNose.y, 20, 20);
  }
}
```

**Important Keypoints:**
- Keypoint 1: Nose tip
- Keypoints 33-263: Facial contours
- Total: 468 keypoints per face

### 2. HandPose - Hand Tracking

**Reference:** https://docs.ml5js.org/#/reference/handpose

**Returns:** 21 keypoints per hand + 3D coordinates

```javascript
let handpose;
let hands = [];

cam.onReady(() => {
  let options = {
    maxHands: 2,
    runtime: 'mediapipe',
    flipHorizontal: false
  };
  
  handpose = ml5.handPose(options, modelLoaded);
});

function modelLoaded() {
  handpose.detectStart(cam.videoElement, (results) => {
    hands = results;
  });
}

function draw() {
  // Each hand has:
  // - hand.keypoints[] - Array of 21 2D keypoints
  // - hand.keypoints3D[] - Array of 21 3D keypoints (includes z-depth)
  // - hand.handedness - 'Left' or 'Right'
  
  if (hands.length > 0) {
    let hand = hands[0];
    let indexTip = hand.keypoints[8];  // Index finger tip
    let indexTip3D = hand.keypoints3D[8];  // With z-depth
    
    // Map to screen coordinates
    let mapped = cam.mapKeypoint(indexTip);
    
    // Use z-depth for interaction
    let depth = indexTip3D.z;
    let size = map(depth, -0.1, 0.1, 50, 20);
    
    ellipse(mapped.x, mapped.y, size, size);
  }
}
```

**Important Keypoints:**
- Keypoint 0: Wrist
- Keypoint 4: Thumb tip
- Keypoint 8: Index finger tip
- Keypoint 12: Middle finger tip
- Keypoint 16: Ring finger tip
- Keypoint 20: Pinky tip

### 3. BodyPose - Full Body Tracking

**Reference:** https://docs.ml5js.org/#/reference/bodypose

**Returns:** 33 keypoints per person

```javascript
let bodypose;
let poses = [];

cam.onReady(() => {
  let options = {
    runtime: 'mediapipe',
    modelType: 'MULTIPOSE_LIGHTNING',
    enableSmoothing: true,
    minPoseScore: 0.25
  };
  
  bodypose = ml5.bodyPose('BlazePose', options, modelLoaded);
});

function modelLoaded() {
  bodypose.detectStart(cam.videoElement, (results) => {
    poses = results;
  });
}

function draw() {
  // Each pose has:
  // - pose.keypoints[] - Array of 33 keypoints
  // - Each keypoint has: {x, y, z, score, name}
  // - score: Confidence (0-1)
  
  if (poses.length > 0) {
    let pose = poses[0];
    
    // Filter by confidence
    for (let kp of pose.keypoints) {
      if (kp.score > 0.3) {
        let mapped = cam.mapKeypoint(kp);
        ellipse(mapped.x, mapped.y, 10, 10);
      }
    }
  }
}
```

**Important Keypoints:**
- Keypoint 0: Nose
- Keypoints 11-12: Shoulders
- Keypoints 13-14: Elbows
- Keypoints 15-16: Wrists
- Keypoints 23-24: Hips
- Keypoints 25-26: Knees
- Keypoints 27-28: Ankles

---

## Important Concepts for workArea Examples

### Key Variables

All examples use this pattern:

```javascript
let cam;           // PhoneCamera instance
let model;         // ML5 model (facemesh, handpose, or bodypose)
let results = [];  // Detection results (updated automatically)
```

### Coordinate Mapping

**IMPORTANT:** Always map ML5 coordinates to screen space:

```javascript
// Map single keypoint
let mappedPoint = cam.mapKeypoint(keypoint);

// Map array of keypoints
let mappedPoints = cam.mapKeypoints(keypoints);
```

**Why?** ML5 returns coordinates in video space (e.g., 640x480), but your canvas might be different (e.g., 1920x1080). `cam.mapKeypoint()` handles:
- Scaling to canvas size
- Mirroring (for front camera)
- Offset positioning (for different display modes)

### Video Element Access

ML5 needs the native HTML video element:

```javascript
// ✅ Correct
model.detectStart(cam.videoElement, gotResults);

// ❌ Wrong
model.detectStart(cam, gotResults);
model.detectStart(cam.video, gotResults);
```

### Display Modes

**fitHeight** (Default for examples):
- Camera fits to canvas height
- May have horizontal offset if aspect ratios differ
- Best for portrait phone orientation

**fitWidth**:
- Camera fits to canvas width
- May have vertical offset
- Best for landscape orientation

**fixed**:
- Camera displays at exact size (cam.fixedWidth × cam.fixedHeight)
- Centered on canvas
- Good for consistent sizing across devices

### Example Structure

All workArea examples follow this pattern:

```javascript
// 1. Setup
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  cam = createPhoneCamera('user', true, 'fitHeight');
  enableCameraTap();
  
  cam.onReady(() => {
    // 2. Load model when camera ready
    model = ml5.modelName(options, modelLoaded);
  });
}

// 3. Start detection when model loaded
function modelLoaded() {
  model.detectStart(cam.videoElement, gotResults);
}

// 4. Store results
function gotResults(detections) {
  results = detections;
}

// 5. Draw
function draw() {
  background(40);
  image(cam, 0, 0);  // Draw camera
  
  // Map and draw keypoints
  if (results.length > 0) {
    let mappedPoints = cam.mapKeypoints(results[0].keypoints);
    // Draw with mappedPoints
  }
}
```

---

## See Also

- **PhoneCamera Documentation:** [README.md](README.md#phonecamera-ml5-integration)
- **ML5 Documentation:** https://docs.ml5js.org/
- **p5-phone Examples:** `/examples/workArea/`
  - `PHONE_01_camera-selector` - Camera switching and modes
  - `PHONE_02_facemesh` - Face tracking
  - `PHONE_03_handpose` - Hand tracking with 3D depth
  - `PHONE_04_bodypose` - Full body tracking
