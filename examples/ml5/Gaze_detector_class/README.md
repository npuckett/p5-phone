# Classes 06 - Gaze Detector Class

## Overview
This example provides the same functionality as `friday_31st/PHONE_FaceMesh_gaze_detection`, but refactored into a clean, reusable **GazeDetector class** that simplifies face tracking and gaze detection.

**Purpose:** Demonstrate how a well-designed class can encapsulate complex ML5 FaceMesh gaze tracking, making it easy to add eye-tracking interaction to any project.

## What It Does
- **Face tracking** using ML5 FaceMesh (3D landmarks)
- **Gaze direction detection** (LEFT, CENTER, RIGHT)
- **Gaze position tracking** (X, Y coordinates on screen)
- **Automatic smoothing** for stable tracking
- **Built-in visualization** of face keypoints and gaze position
- **Easy-to-use API** for accessing gaze data

## Live Demo
[Demo](https://npuckett.github.io/mlphone/wednesday_19th/classes/06_gaze_detector_class/)

## File Structure

### Class-Based Architecture
```
06_gaze_detector_class/
├── index.html         → HTML with p5.js, ML5, p5-phone
├── GazeDetector.js    → Reusable gaze detector class (430 lines)
├── sketch.js          → Simple main program (180 lines)
└── README.md          → This documentation
```

**Comparison:** Function version is 285 lines in one file. Class version separates concerns for clarity and reusability.

## GazeDetector Class

### Quick Start

```javascript
let gazeDetector;

function setup() {
  createCanvas(405, 720);
  gazeDetector = new GazeDetector();  // That's it!
}

function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    // Get gaze data
    let direction = gazeDetector.getDirection();      // "LEFT", "CENTER", "RIGHT"
    let position = gazeDetector.getGazePosition();    // {x, y}
    let angle = gazeDetector.getGazeAngle();          // -1 to 1
    
    // Draw visualization
    gazeDetector.drawAll();
  }
}
```

### Constructor Options

```javascript
gazeDetector = new GazeDetector({
  cameraMode: 'user',        // 'user' (front) or 'environment' (back)
  mirror: true,              // Mirror camera for natural interaction
  displayMode: 'fitHeight',  // 'fitHeight', 'cover', 'contain'
  showVideo: true,           // Show camera feed
  gazeXThreshold: 0.15,      // X sensitivity (0.1-0.3, lower = more sensitive)
  smoothingFactor: 0.4,      // Smoothing (0-1, higher = smoother but slower)
  gazeRangeX: 1.5,           // Horizontal gaze range (1.0-3.0)
  gazeRangeY: 2.5            // Vertical gaze range (1.0-4.0)
});
```

### Core Methods

#### Getting Gaze Data

```javascript
// Check if face is detected
if (gazeDetector.isFaceDetected()) {
  
  // Get gaze direction as string
  let direction = gazeDetector.getDirection();
  // Returns: "LEFT", "CENTER", or "RIGHT"
  
  // Get gaze position on screen
  let position = gazeDetector.getGazePosition();
  // Returns: {x: number, y: number}
  
  // Get raw horizontal gaze angle
  let angle = gazeDetector.getGazeAngle();
  // Returns: number (-1 to 1, negative = left, positive = right)
  
  // Get vertical gaze angle
  let verticalAngle = gazeDetector.getVerticalAngle();
  // Returns: number (-1 to 1, negative = up, positive = down)
  
  // Get individual tracked keypoints
  let keypoints = gazeDetector.getKeypoints();
  // Returns: {leftEar, rightEar, nose}
}
```

#### Visualization

```javascript
// Draw tracked keypoints (ears and nose)
gazeDetector.drawKeypoints();

// Draw gaze position indicator
gazeDetector.drawGazeIndicator(60);  // 60 = circle size

// Draw everything at once
gazeDetector.drawAll();
```

#### Settings & Controls

```javascript
// Toggle video feed
gazeDetector.toggleVideo();

// Adjust sensitivity (lower = more sensitive)
gazeDetector.setXThreshold(0.12);

// Adjust smoothing (higher = smoother but slower)
gazeDetector.setSmoothingFactor(0.6);

// Adjust gaze range
gazeDetector.setGazeRange(2.0, 3.0);  // (horizontal, vertical)

// Check if ready
if (gazeDetector.isReady()) {
  // Camera and model are initialized
}
```

## How Gaze Detection Works

### Technical Details

The GazeDetector uses **3D face landmarks** from ML5 FaceMesh to calculate where you're looking:

1. **Track 3 keypoints:**
   - Left ear (index 234)
   - Right ear (index 454)
   - Nose bridge (index 1)

2. **Calculate face center:**
   - Find midpoint between ears in 3D space

3. **Measure nose offset:**
   - Horizontal offset = how far nose is from ear center
   - Normalize by face width for consistency

4. **Apply smoothing:**
   - Use lerp() to reduce jitter
   - Balance responsiveness vs stability

5. **Map to screen:**
   - Convert normalized angle to screen coordinates
   - Apply gaze range multipliers
   - Constrain to canvas bounds

### Coordinate System

```
     LEFT              CENTER           RIGHT
       |                  |                |
  angle: -1          angle: 0         angle: 1
```

## Comparison to Function Version

### Setup Complexity

#### Function Version (`PHONE_FaceMesh_gaze_detection`)
```javascript
// 40+ lines of setup
let cam;
let faceMesh;
let faces = [];
let leftEarIndex = 234;
let rightEarIndex = 454;
let noseIndex = 1;
let leftEarData = null;
let rightEarData = null;
let noseData = null;
let gazeDirection = "CENTER";
let gazeAngle = 0;
let smoothedGazeAngle = 0;
let gazeX = 0;
let gazeY = 0;
// ... many more variables

function setup() {
  createCanvas(405, 720);
  lockGestures();
  
  cam = createPhoneCamera('user', true, 'fitHeight');
  enableCameraTap();
  
  cam.onReady(() => {
    let options = {
      maxFaces: 1,
      refineLandmarks: false,
      flipHorizontal: false
    };
    
    faceMesh = ml5.faceMesh(options, () => {
      faceMesh.detectStart(cam.videoElement, gotFaces);
    });
  });
}

function gotFaces(results) {
  faces = results;
}
```

#### Class Version (`06_gaze_detector_class`)
```javascript
let gazeDetector;

function setup() {
  createCanvas(405, 720);
  gazeDetector = new GazeDetector();
}
```

**40+ lines reduced to 2 lines!**

### Getting Gaze Direction

#### Function Version
```javascript
// Must calculate and track manually
function calculateGaze() {
  let leftEarRaw = faces[0].keypoints[leftEarIndex];
  let rightEarRaw = faces[0].keypoints[rightEarIndex];
  let noseRaw = faces[0].keypoints[noseIndex];
  
  let faceWidth = abs(leftEarRaw.x - rightEarRaw.x);
  let earCenterX = (leftEarRaw.x + rightEarRaw.x) / 2;
  let noseOffsetX = noseRaw.x - earCenterX;
  let normalizedOffsetX = noseOffsetX / faceWidth;
  
  gazeAngle = normalizedOffsetX;
  smoothedGazeAngle = lerp(smoothedGazeAngle, gazeAngle, 1 - SMOOTHING_FACTOR);
  
  if (smoothedGazeAngle < -GAZE_X_THRESHOLD) {
    gazeDirection = "LEFT";
  } else if (smoothedGazeAngle > GAZE_X_THRESHOLD) {
    gazeDirection = "RIGHT";
  } else {
    gazeDirection = "CENTER";
  }
}

// Use in draw():
if (faces.length > 0) {
  calculateGaze();
  // Use gazeDirection variable
}
```

#### Class Version
```javascript
// One line!
let direction = gazeDetector.getDirection();
```

### Getting Gaze Position

#### Function Version
```javascript
// Must calculate manually
gazeX = width / 2 - (smoothedGazeAngle * width * GAZE_RANGE_X);

let noseOffsetY = noseRaw.y - earCenterY;
gazeAngleY = noseOffsetY / faceWidth;
smoothedGazeY = lerp(smoothedGazeY, gazeAngleY, 1 - SMOOTHING_FACTOR);
gazeY = height / 2 + (smoothedGazeY * height * GAZE_RANGE_Y);

gazeX = constrain(gazeX, 0, width);
gazeY = constrain(gazeY, 0, height);
```

#### Class Version
```javascript
// One line!
let position = gazeDetector.getGazePosition();  // {x, y}
```

## Usage Examples

### Example 1: Menu Selection

```javascript
let menuItems = ['Start Game', 'Settings', 'Quit'];
let selectedItem = 1;  // Center by default

function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let direction = gazeDetector.getDirection();
    
    if (direction === "LEFT") {
      selectedItem = 0;
    } else if (direction === "CENTER") {
      selectedItem = 1;
    } else if (direction === "RIGHT") {
      selectedItem = 2;
    }
    
    // Draw menu with highlighted selection
    drawMenu(selectedItem);
  }
}
```

### Example 2: Character Control

```javascript
let playerX = 200;

function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let gazePos = gazeDetector.getGazePosition();
    
    // Move player to gaze X position
    playerX = lerp(playerX, gazePos.x, 0.1);
    
    circle(playerX, height - 50, 40);
  }
}
```

### Example 3: Interactive Zones

```javascript
function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let gazePos = gazeDetector.getGazePosition();
    
    // Divide screen into 3 zones
    let zone;
    if (gazePos.x < width / 3) {
      zone = "LEFT_ZONE";
      background(255, 200, 200);  // Red tint
    } else if (gazePos.x > width * 2/3) {
      zone = "RIGHT_ZONE";
      background(200, 200, 255);  // Blue tint
    } else {
      zone = "CENTER_ZONE";
      background(200, 255, 200);  // Green tint
    }
    
    // Show zone name
    text(`Looking at: ${zone}`, width/2, 30);
  }
}
```

### Example 4: Gaze-Controlled Drawing

```javascript
let trail = [];

function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let gazePos = gazeDetector.getGazePosition();
    
    // Add current gaze position to trail
    trail.push({x: gazePos.x, y: gazePos.y});
    
    // Limit trail length
    if (trail.length > 50) {
      trail.shift();
    }
    
    // Draw trail
    for (let i = 1; i < trail.length; i++) {
      strokeWeight(i / 10);
      stroke(255, 100, 100, 150);
      line(trail[i-1].x, trail[i-1].y, trail[i].x, trail[i].y);
    }
  }
}
```

### Example 5: Attention Tracking

```javascript
let centerTime = 0;
let totalTime = 0;

function draw() {
  gazeDetector.update();
  totalTime++;
  
  if (gazeDetector.isFaceDetected()) {
    let direction = gazeDetector.getDirection();
    
    if (direction === "CENTER") {
      centerTime++;
    }
    
    // Calculate attention percentage
    let attention = (centerTime / totalTime) * 100;
    
    text(`Attention: ${attention.toFixed(1)}%`, width/2, 30);
  }
}
```

### Example 6: Combining with Other Classes

```javascript
let gazeDetector;
let healthCharacter;

function setup() {
  createCanvas(405, 720);
  
  gazeDetector = new GazeDetector();
  healthCharacter = new HealthCharacter(width/2, height/2, anim1, anim2);
}

function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let direction = gazeDetector.getDirection();
    
    // Character health based on gaze
    if (direction === "CENTER") {
      healthCharacter.increaseHealth(0.5);  // Focused = healthy
    } else {
      healthCharacter.decreaseHealth(0.2);  // Distracted = unhealthy
    }
  }
  
  healthCharacter.update();
}
```

## Key Benefits

### 1. **Simplicity**
- One line to create detector
- Intuitive method names
- No manual camera/model setup
- Automatic coordinate mapping

### 2. **Flexibility**
- Multiple ways to access data (direction, position, angle)
- Adjustable sensitivity and smoothing
- Optional visualization
- Works with other classes

### 3. **Reusability**
- Drop GazeDetector.js into any project
- Same class works everywhere
- Update once, all projects benefit
- Professional code organization

### 4. **Reliability**
- Built-in smoothing for stable tracking
- Error checking for missing faces
- Automatic coordinate constraining
- Handles edge cases

### 5. **Maintainability**
- All gaze logic in one class
- Clear separation of concerns
- Well-documented API
- Easy to modify and extend

## Code Comparison Table

| Task | Function Version | Class Version |
|------|------------------|---------------|
| Setup | 40+ lines | 2 lines |
| Get direction | Manual calculation | `gazeDetector.getDirection()` |
| Get position | 8 lines of math | `gazeDetector.getGazePosition()` |
| Get angle | Access global variable | `gazeDetector.getGazeAngle()` |
| Visualization | Mixed with logic | Separate draw methods |
| Adjust sensitivity | Edit global constant | `gazeDetector.setXThreshold()` |
| Toggle video | Manual variable | `gazeDetector.toggleVideo()` |
| Total lines | 285 | 180 (+ reusable 430) |
| Reusability | Copy entire sketch | Include class file |

## Tuning Parameters

### Sensitivity (`gazeXThreshold`)
- **Lower (0.1):** More sensitive, detects smaller head turns
- **Higher (0.3):** Less sensitive, requires larger head turns
- **Default (0.15):** Balanced for most use cases

### Smoothing (`smoothingFactor`)
- **Lower (0.2):** More responsive, but jittery
- **Higher (0.7):** Very smooth, but laggy
- **Default (0.4):** Good balance

### Gaze Range (`gazeRangeX`, `gazeRangeY`)
- **Lower (1.0):** Gaze stays near center
- **Higher (3.0):** Gaze extends far across screen
- **Default X (1.5):** Moderate horizontal range
- **Default Y (2.5):** Wider vertical range

## Advanced Usage

### Custom Thresholds for Different Zones

```javascript
function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let angle = gazeDetector.getGazeAngle();
    
    // Create 5 zones with custom thresholds
    if (angle < -0.3) {
      zone = "FAR_LEFT";
    } else if (angle < -0.1) {
      zone = "LEFT";
    } else if (angle > 0.3) {
      zone = "FAR_RIGHT";
    } else if (angle > 0.1) {
      zone = "RIGHT";
    } else {
      zone = "CENTER";
    }
  }
}
```

### Dynamic Sensitivity Adjustment

```javascript
let difficulty = 1;  // Game difficulty

function draw() {
  gazeDetector.update();
  
  // Easier difficulty = more sensitive detection
  let threshold = 0.2 - (difficulty * 0.05);
  gazeDetector.setXThreshold(threshold);
  
  // ... game logic
}
```

## Summary

The **GazeDetector class** transforms complex ML5 FaceMesh gaze tracking into a simple, reusable tool.

**Key Advantages:**
- ✓ **40+ lines → 2 lines** for setup
- ✓ **Simple API** for accessing gaze data
- ✓ **Built-in smoothing** for stable tracking
- ✓ **Multiple access methods** (direction, position, angle)
- ✓ **Adjustable parameters** (sensitivity, smoothing, range)
- ✓ **Optional visualization** methods
- ✓ **Reusable** in any project

**Use Cases:**
- Menu navigation (look to select)
- Game control (gaze-controlled player)
- Attention tracking (measure focus)
- Interactive art (gaze-based drawing)
- Accessibility interfaces
- Eye-tracking studies

## Files
- `index.html` - HTML with p5.js, ML5, p5-phone
- `GazeDetector.js` - Complete reusable gaze detector class
- `sketch.js` - Simple example usage with multiple demos
- `README.md` - This documentation

## Related Examples
- `PHONE_FaceMesh_gaze_detection` - Function-based version (compare!)
- `05_bodypose_tracker_class` - BodyPose tracking class
- `04_character_template_class` - Character controller class
