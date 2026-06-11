/*
GazeDetector Class Example - Simplified Usage

This example shows the same functionality as the function-based version,
but using the GazeDetector class for cleaner, more maintainable code.

COMPARISON:
- Function version: 285 lines in one file
- Class version: 180 lines main program + 430-line reusable class

BENEFITS:
- Setup reduced from 40+ lines to 1 line
- All gaze logic encapsulated in class
- Easy to reuse in other projects
- Clean API for accessing gaze data
- Built-in visualization methods
*/

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let gazeDetector;  // GazeDetector instance
let cameraButton;  // Button to toggle front/back camera
let lastCameraButtonPress = 0;
let gazeDirection = "CENTER";
let gazePosition = { x: 0, y: 0 };
let gazeAngle = 0;
let verticalGazeAngle = 0;
let gazeKeypoints = null;

// ==============================================
// SETUP - Runs once when page loads
// ==============================================
function setup() {
  // Create portrait canvas (typical phone proportions: 9:16)
  createCanvas(405, 720);
  
  // Create gaze detector with default settings
  // That's it! Camera and FaceMesh are automatically initialized
  gazeDetector = new GazeDetector();
  createCameraButton();
  
  // Optional: Customize settings
  // gazeDetector = new GazeDetector({
  //   cameraMode: 'user',        // 'user' or 'environment'
  //   mirror: true,              // Mirror camera
  //   showVideo: true,           // Show camera feed
  //   gazeXThreshold: 0.15,      // X sensitivity (0.1-0.3)
  //   smoothingFactor: 0.4,      // Smoothing (0-1)
  //   gazeRangeX: 1.5,           // Horizontal range (1.0-3.0)
  //   gazeRangeY: 2.5            // Vertical range (1.0-4.0)
  // });
}

function createCameraButton() {
  cameraButton = createButton('Back camera');
  cameraButton.position(14, 14);
  cameraButton.style('position', 'fixed');
  cameraButton.style('z-index', '20');
  cameraButton.style('padding', '12px 14px');
  cameraButton.style('font-size', '15px');
  cameraButton.style('font-weight', '700');
  cameraButton.style('border', '0');
  cameraButton.style('border-radius', '8px');
  cameraButton.style('background', '#ffffff');
  cameraButton.style('color', '#111111');
  cameraButton.style('box-shadow', '0 4px 14px rgba(0, 0, 0, 0.25)');
  cameraButton.mousePressed(switchCameraView);
}

async function switchCameraView() {
  lastCameraButtonPress = Date.now();

  if (!gazeDetector || gazeDetector.isSwitchingCamera()) {
    return false;
  }

  let useBackCamera = gazeDetector.getCameraMode() !== 'environment';
  cameraButton.html(useBackCamera ? 'Switching...' : 'Switching...');
  await gazeDetector.switchCamera();
  cameraButton.html(gazeDetector.getCameraMode() === 'environment' ? 'Front camera' : 'Back camera');
  return false;
}

// ==============================================
// DRAW - Runs continuously
// ==============================================
function draw() {
  background(220);
  
  // Update the gaze detector (handles camera feed and calculations)
  gazeDetector.update();
  
  // Only process if face is detected
  if (gazeDetector.isFaceDetected()) {
    updateGazeValues();
    
    // ==========================================
    // GET GAZE DATA - Multiple ways to access
    // ==========================================
    
    // Method 1: Use gazeDirection as a string
    // Returns: "LEFT", "CENTER", or "RIGHT"
    
    // Method 2: Use gazePosition on screen
    // Returns: {x: number, y: number}
    
    // Method 3: Use raw gazeAngle
    // Returns: number (-1 to 1, negative = left, positive = right)
    
    // Method 4: Use verticalGazeAngle
    // Returns: number (-1 to 1, negative = up, positive = down)
    
    // Method 5: Use gazeKeypoints
    // Returns: {leftEar, rightEar, nose}
    
    // ==========================================
    // VISUALIZE - Built-in drawing methods
    // ==========================================
    
    // Draw tracked keypoints (ears and nose)
    gazeDetector.drawKeypoints();
    
    // Draw gaze position indicator
    gazeDetector.drawGazeIndicator(60);
    
    // Draw gaze info overlay (direction, position, angle)
    gazeDetector.drawGazeInfo();
    
    // Or draw everything at once:
    // gazeDetector.drawAll();
  }

  drawMl5LoadingGraphic();
}

function updateGazeValues() {
  gazeDirection = gazeDetector.getDirection();
  gazePosition = gazeDetector.getGazePosition();
  gazeAngle = gazeDetector.getGazeAngle();
  verticalGazeAngle = gazeDetector.getVerticalAngle();
  gazeKeypoints = gazeDetector.getKeypoints();
}

// ==============================================
// INTERACTION - Toggle video with tap
// ==============================================
function mousePressed() {
  if (Date.now() - lastCameraButtonPress < 400) {
    return false;
  }

  // Toggle video display when screen is tapped
  gazeDetector.toggleVideo();
  return false;
}

// ==============================================
// ADVANCED USAGE EXAMPLES (commented out)
// ==============================================

/*
// Example 1: Control a character with gaze
function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let gazePos = gazeDetector.getGazePosition();
    
    // Move character to gaze position
    character.x = gazePos.x;
    character.y = gazePos.y;
  }
}
*/

/*
// Example 2: Trigger actions based on direction
function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let direction = gazeDetector.getDirection();
    
    if (direction === "LEFT") {
      // Do something when looking left
      background(255, 200, 200);
    } else if (direction === "RIGHT") {
      // Do something when looking right
      background(200, 200, 255);
    } else {
      // Do something when looking center
      background(200, 255, 200);
    }
  }
}
*/

/*
// Example 3: Create interactive zones
function draw() {
  gazeDetector.update();
  
  if (gazeDetector.isFaceDetected()) {
    let gazePos = gazeDetector.getGazePosition();
    
    // Define zones
    if (gazePos.x < width / 3) {
      // Left zone
      selectMenuItem(0);
    } else if (gazePos.x > width * 2 / 3) {
      // Right zone
      selectMenuItem(2);
    } else {
      // Center zone
      selectMenuItem(1);
    }
  }
}
*/

/*
// Example 4: Adjust sensitivity dynamically
function keyPressed() {
  if (key === 'w') {
    // Increase sensitivity (lower threshold)
    gazeDetector.setXThreshold(0.1);
  } else if (key === 's') {
    // Decrease sensitivity (higher threshold)
    gazeDetector.setXThreshold(0.2);
  } else if (key === 'q') {
    // More smoothing (more stable but slower)
    gazeDetector.setSmoothingFactor(0.6);
  } else if (key === 'a') {
    // Less smoothing (more responsive but jittery)
    gazeDetector.setSmoothingFactor(0.2);
  }
}
*/

/*
// Example 5: Use with other classes
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
    // Use gaze to affect character health
    let direction = gazeDetector.getDirection();
    
    if (direction === "CENTER") {
      healthCharacter.increaseHealth(0.5);  // Looking at center = relaxed
    } else {
      healthCharacter.decreaseHealth(0.2);  // Looking away = distracted
    }
  }
  
  healthCharacter.update();
}
*/
