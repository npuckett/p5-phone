// ==============================================
// BODYPOSE - BODY TRACKING AS UI INTERACTION
// ==============================================
// This example shows how to use body tracking as a new way to interact
// with objects on screen. Move your nose to control the red dot!
//
// INTERACTION CONCEPT:
// Traditional UI: Touch/click to select objects
// Body Tracking UI: Move your body to hover/select objects
//
// Uses PhoneCamera class from p5-phone for automatic coordinate mapping.
// Works with any ML5 model (FaceMesh, HandPose, BodyPose, etc.)
// ==============================================

// ==============================================
// ADJUSTABLE PARAMETERS
// ==============================================
let SHOW_VIDEO = true;              // Show/hide video feed (toggle with touch)
let SHOW_ALL_KEYPOINTS = true;      // Show all 33 body keypoints (set to false to hide)

// Customize which body point to track:
// 0 = nose (default)
// 11 = left shoulder
// 12 = right shoulder
// 13 = left elbow
// 14 = right elbow
// 15 = left wrist
// 16 = right wrist
// 23 = left hip
// 24 = right hip
// 25 = left knee
// 26 = right knee
// 27 = left ankle
// 28 = right ankle
let TRACKED_KEYPOINT_INDEX = 0;     // Which body point to use for interaction

let CURSOR_SIZE = 30;               // Size of the tracking cursor (body dot)
let CURSOR_COLOR = [255, 50, 50];   // Color of cursor (red)
let KEYPOINT_SIZE = 5;              // Size of all body keypoints (if shown)

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                            // PhoneCamera instance
let bodypose;                       // ML5 BodyPose model
let poses = [];                     // Detected bodies (updated automatically)
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
    // Configure ML5 BodyPose with BlazePose for 3D coordinates
    let options = {
      runtime: 'mediapipe',               // Use MediaPipe runtime (same as HandPose)
      modelType: 'MULTIPOSE_LIGHTNING',  // Fast model for phone
      enableSmoothing: true,              // Smooth tracking
      minPoseScore: 0.25,                 // Minimum confidence threshold
      multiPoseMaxDimension: 256,         // Resolution (lower = faster)
      enableTracking: true,               // Track across frames
      trackerType: 'boundingBox',         // Tracking method
      trackerConfig: {},
      modelUrl: undefined,
      flipped: false                      // Don't flip in ML5 - cam.mapKeypoint() handles mirroring
    };
    
    // Create BodyPose model with ready callback
    bodypose = ml5.bodyPose('BlazePose', options, modelLoaded);
  });
}

function modelLoaded() {
  // Start detection when model is ready
  bodypose.detectStart(cam.videoElement, (results) => {
    poses = results;
  });
}

// ==============================================
// DRAW - Runs continuously (60 times per second)
// ==============================================
function draw() {
  background(40);  // Dark gray background
  
  // Draw the camera feed (toggle with touch)
  if (SHOW_VIDEO) {
    image(cam, 0, 0);  // PhoneCamera handles positioning and mirroring!
  }
  
  // Draw body tracking
  if (poses.length > 0) {
    drawAllPoses();
    drawTrackedCursor();
  }
  
  // Draw instructions and status
  drawUI();
}

// ==============================================
// DRAW ALL POSES - Show keypoints for all detected bodies
// ==============================================
function drawAllPoses() {
  // Draw each detected body
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    
    if (!pose.keypoints || pose.keypoints.length === 0) continue;
    
    // Map all keypoints to screen coordinates
    let allPoints = cam.mapKeypoints(pose.keypoints);
    
    // Body color (can differentiate multiple people)
    let bodyColor = [0, 255, 150]; // Green
    
    // ==============================================
    // DRAW BODY KEYPOINTS
    // ==============================================
    if (SHOW_ALL_KEYPOINTS) {
      push();
      for (let point of allPoints) {
        // Only draw if confidence is high enough
        let originalPoint = pose.keypoints[allPoints.indexOf(point)];
        if (originalPoint && originalPoint.confidence > 0.3) {
          fill(bodyColor[0], bodyColor[1], bodyColor[2], 150);
          noStroke();
          ellipse(point.x, point.y, KEYPOINT_SIZE, KEYPOINT_SIZE);
        }
      }
      pop();
      
      // Draw body skeleton/connections
      drawBodySkeleton(pose.keypoints, allPoints, bodyColor);
    }
  }
}

// ==============================================
// DRAW TRACKED CURSOR - Show the specific tracked point
// ==============================================
function drawTrackedCursor() {
  // Use first detected body
  let pose = poses[0];
  
  if (!pose || !pose.keypoints) return;
  
  // ==============================================
  // MAIN INTERACTION: Get tracked keypoint position
  // ==============================================
  // This is the body point you can use to control UI elements!
  // Change TRACKED_KEYPOINT_INDEX at top of file to track different points
  
  let trackedKeypoint = pose.keypoints[TRACKED_KEYPOINT_INDEX];
  if (!trackedKeypoint || trackedKeypoint.confidence < 0.3) return;
  
  // Map to screen coordinates - ONE LINE!
  // cam.mapKeypoint() handles all scaling and mirroring automatically
  cursor = cam.mapKeypoint(trackedKeypoint);
  
  // ==============================================
  // USE THE CURSOR POSITION FOR INTERACTION
  // ==============================================
  // Now you have cursor.x, cursor.y, and cursor.z (3D!) to use however you want!
  // Examples:
  // - Move objects: object.x = cursor.x, object.y = cursor.y
  // - Check collision: if (dist(cursor.x, cursor.y, target.x, target.y) < 50) {...}
  // - Control parameters: brightness = map(cursor.y, 0, height, 0, 255)
  // - Use depth: size = map(cursor.z, -100, 100, 10, 50)
  
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
       ', z: ' + (cursor.z || 0).toFixed(2), 
       cursor.x, cursor.y + CURSOR_SIZE/2 + 10);
  pop();
}

// ==============================================
// DRAW BODY SKELETON - Connect keypoints to show body structure
// ==============================================
function drawBodySkeleton(originalPoints, mappedPoints, color) {
  // BlazePose connections (33 keypoints)
  const connections = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7],     // Nose to left
    [0, 4], [4, 5], [5, 6], [6, 8],     // Nose to right
    [9, 10],                             // Mouth
    
    // Torso
    [11, 12],                            // Shoulders
    [11, 23], [12, 24],                  // Shoulder to hip
    [23, 24],                            // Hips
    
    // Left arm
    [11, 13], [13, 15],                  // Shoulder to elbow to wrist
    [15, 17], [15, 19], [15, 21],        // Wrist to hand
    [17, 19],                            // Hand connections
    
    // Right arm  
    [12, 14], [14, 16],                  // Shoulder to elbow to wrist
    [16, 18], [16, 20], [16, 22],        // Wrist to hand
    [18, 20],                            // Hand connections
    
    // Left leg
    [23, 25], [25, 27],                  // Hip to knee to ankle
    [27, 29], [27, 31],                  // Ankle to foot
    [29, 31],                            // Foot connections
    
    // Right leg
    [24, 26], [26, 28],                  // Hip to knee to ankle
    [28, 30], [28, 32],                  // Ankle to foot
    [30, 32]                             // Foot connections
  ];
  
  push();
  stroke(color[0], color[1], color[2], 150);
  strokeWeight(2);
  
  for (let connection of connections) {
    let [i, j] = connection;
    // Only draw if both points have high confidence
    if (originalPoints[i] && originalPoints[j] &&
        originalPoints[i].confidence > 0.3 && 
        originalPoints[j].confidence > 0.3 &&
        mappedPoints[i] && mappedPoints[j]) {
      line(mappedPoints[i].x, mappedPoints[i].y, 
           mappedPoints[j].x, mappedPoints[j].y);
    }
  }
  pop();
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
  } else if (poses.length === 0) {
    text('Show your body to start tracking', width/2, 20);
  } else {
    // Show which keypoint is being tracked
    let keypointNames = {
      0: 'Nose',
      11: 'Left Shoulder',
      12: 'Right Shoulder',
      13: 'Left Elbow',
      14: 'Right Elbow',
      15: 'Left Wrist',
      16: 'Right Wrist',
      23: 'Left Hip',
      24: 'Right Hip',
      25: 'Left Knee',
      26: 'Right Knee',
      27: 'Left Ankle',
      28: 'Right Ankle'
    };
    let name = keypointNames[TRACKED_KEYPOINT_INDEX] || 'Keypoint ' + TRACKED_KEYPOINT_INDEX;
    text('Tracking: ' + name, width/2, 20);
    
    // Show detected poses count
    textSize(14);
    text('Bodies detected: ' + poses.length, width/2, 45);
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
  }
}

// ==============================================
// WINDOW RESIZE - Update canvas when screen rotates
// ==============================================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
