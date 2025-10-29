// ==============================================
// FACEMESH - FACE TRACKING AS UI INTERACTION
// ==============================================
// This example shows how to use face tracking as a new way to interact
// with objects on screen. Move your nose to control the red dot!
//
// INTERACTION CONCEPT:
// Traditional UI: Touch/click to select objects
// Face Tracking UI: Move your face to hover/select objects
//
// Uses PhoneCamera class from p5-phone for automatic coordinate mapping.
// Works with any ML5 model (FaceMesh, HandPose, BodyPose, etc.)
// ==============================================

// ==============================================
// ADJUSTABLE PARAMETERS
// ==============================================
let SHOW_VIDEO = true;              // Show/hide video feed (toggle with touch)
let SHOW_ALL_KEYPOINTS = true;      // Show all 468 face keypoints (set to false to hide)

// Customize which face point to track:
// 1 = nose tip (default)
// 10 = top of face
// 152 = chin
// 234 = left eye
// 454 = right eye
// 13 = lips
let TRACKED_KEYPOINT_INDEX = 1;     // Which face point to use for interaction

let CURSOR_SIZE = 30;               // Size of the tracking cursor (nose dot)
let CURSOR_COLOR = [255, 50, 50];   // Color of cursor (red)
let KEYPOINT_SIZE = 3;              // Size of all face keypoints (if shown)

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                            // PhoneCamera instance
let facemesh;                       // ML5 FaceMesh model
let faces = [];                     // Detected faces (updated automatically)
let cursor;                         // Tracked keypoint position (mapped to screen coordinates)

// ==============================================
// SETUP - Runs once when page loads
// ==============================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();  // Prevent phone gestures (zoom, refresh)
  
  // Create camera: front camera, mirrored, fit to canvas height
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Enable camera (handles initialization automatically)
  enableCameraTap();
  
  // Start ML5 when camera is ready
  cam.onReady(() => {
    // Configure ML5 FaceMesh
    let options = {
      runtime: 'mediapipe',   // Use MediaPipe runtime for consistent iOS behavior
      maxFaces: 1,            // Only detect 1 face (faster)
      refineLandmarks: false, // Skip detailed landmarks (faster)
      flipHorizontal: false   // Don't flip in ML5 - cam.mapKeypoint() handles mirroring
    };
    
    // Create FaceMesh model with ready callback
    facemesh = ml5.faceMesh(options, modelLoaded);
  });
}

function modelLoaded() {
  // Start detection when model is ready
  facemesh.detectStart(cam.videoElement, (results) => {
    faces = results;
  });
}

// ==============================================
// DRAW - Runs continuously (60 times per second)
// ==============================================
function draw() {
  background(40);  // Dark gray background
  
  // Draw the camera feed (toggle with touch)
  if (SHOW_VIDEO ) {
    image(cam, 0, 0);  // PhoneCamera handles positioning and mirroring!
  }
  
  // Draw face tracking
  if (faces.length > 0) {
    drawFaceTracking();
  }
  
  // Draw instructions and status
  drawUI();
}

// ==============================================
// DRAW FACE TRACKING - Use face position as UI input
// ==============================================
function drawFaceTracking() {
  let face = faces[0];  // Get the first detected face
  
  if (!face.keypoints || face.keypoints.length === 0) return;
  
  // ==============================================
  // MAIN INTERACTION: Get tracked keypoint position
  // ==============================================
  // This is the face point you can use to control UI elements!
  // Change TRACKED_KEYPOINT_INDEX at top of file to track different points
  
  let trackedKeypoint = face.keypoints[TRACKED_KEYPOINT_INDEX];
  if (!trackedKeypoint) return;
  
  // Map to screen coordinates - ONE LINE!
  // cam.mapKeypoint() handles all scaling and mirroring automatically
  cursor = cam.mapKeypoint(trackedKeypoint);
  
  // ==============================================
  // USE THE CURSOR POSITION FOR INTERACTION
  // ==============================================
  // Now you have cursor.x and cursor.y to use however you want!
  // Examples:
  // - Move objects: object.x = cursor.x, object.y = cursor.y
  // - Check collision: if (dist(cursor.x, cursor.y, target.x, target.y) < 50) {...}
  // - Control parameters: brightness = map(cursor.y, 0, height, 0, 255)
  // - Draw effects: ellipse(cursor.x, cursor.y, 50, 50)
  
  // Draw cursor at tracked position
  push();
  fill(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2]);
  noStroke();
  ellipse(cursor.x, cursor.y, CURSOR_SIZE, CURSOR_SIZE);
  
  // Optional: Show crosshair for precise positioning
  stroke(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2], 150);
  strokeWeight(2);
  line(cursor.x - 15, cursor.y, cursor.x + 15, cursor.y);
  line(cursor.x, cursor.y - 15, cursor.x, cursor.y + 15);
  pop();
  
  // Optional: Display coordinates (useful for debugging)
  push();
  fill(255);
  stroke(0);
  strokeWeight(3);
  textAlign(CENTER, TOP);
  textSize(14);
  text('x: ' + cursor.x.toFixed(0) + ', y: ' + cursor.y.toFixed(0) + 
       ', z: ' + (cursor.z || 0).toFixed(0), 
       cursor.x, cursor.y + CURSOR_SIZE/2 + 10);
  pop();
  
  // ==============================================
  // OPTIONAL: Draw all face keypoints
  // ==============================================
  if (SHOW_ALL_KEYPOINTS) {
    // Map entire array at once with cam.mapKeypoints()
    let allPoints = cam.mapKeypoints(face.keypoints);
    
    push();
    fill(0, 255, 0, 100);  // Green, semi-transparent
    noStroke();
    for (let point of allPoints) {
      ellipse(point.x, point.y, KEYPOINT_SIZE, KEYPOINT_SIZE);
    }
    pop();
  }
}

// ==============================================
// DRAW UI - Display status and instructions
// ==============================================
function drawUI() {
  push();
  fill(255);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(18);
  
  // Show status at top of screen
  if (!cam.ready) {
    text('Starting camera...', width/2, 20);
  } else if (faces.length === 0) {
    text('Show your face to start tracking', width/2, 20);
  } else {
    // Show which keypoint is being tracked
    let keypointNames = {
      1: 'Nose Tip',
      10: 'Top of Face',
      152: 'Chin',
      234: 'Left Eye',
      454: 'Right Eye',
      13: 'Lips'
    };
    let name = keypointNames[TRACKED_KEYPOINT_INDEX] || 'Keypoint ' + TRACKED_KEYPOINT_INDEX;
    text('Tracking: ' + name, width/2, 20);
  }
  
  // Show instructions at bottom
  textSize(14);
  fill(200);
  textAlign(CENTER, BOTTOM);
  text('Touch screen to toggle video', width/2, height - 20);
  
  // Show settings status
  textSize(12);
  fill(SHOW_VIDEO ? [0, 255, 0] : [150, 150, 150]);
  text('Video: ' + (SHOW_VIDEO ? 'ON' : 'OFF'), width/2, height - 40);
  
  fill(SHOW_ALL_KEYPOINTS ? [0, 255, 0] : [150, 150, 150]);
  text('All Keypoints: ' + (SHOW_ALL_KEYPOINTS ? 'ON' : 'OFF'), width/2, height - 55);
  
  fill(255);
  if (cam.ready) {
    text('Camera: ' + cam.active + ' (mirrored: ' + cam.mirror + ')', width/2, height - 70);
  }
  
  pop();
}

// ==============================================
// TOUCH EVENTS - Toggle video display
// ==============================================
function touchStarted() {
  SHOW_VIDEO = !SHOW_VIDEO;
  return false;  // Prevent default to avoid interfering with camera/ML5
}

// Also works with mouse click for testing on desktop
function mousePressed() {
  SHOW_VIDEO = !SHOW_VIDEO;
  return false;
}

// ==============================================
// KEY PRESS - Switch camera with spacebar
// ==============================================
function keyPressed() {
  if (key === ' ' && cam.ready) {
    // Switch between front and back camera
    cam.active = cam.active === 'user' ? 'environment' : 'user';
    
    // Typically mirror front camera, not back camera
    if (cam.active === 'environment') {
      cam.mirror = false;
    } else {
      cam.mirror = true;
    }
    
    console.log('Switched to', cam.active, 'camera');
  }
}

// ==============================================
// WINDOW RESIZE - Update canvas when screen rotates
// ==============================================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
