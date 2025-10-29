// ==============================================
// HANDPOSE - HAND TRACKING AS UI INTERACTION (3D)
// ==============================================
// This example shows how to use hand tracking as a new way to interact
// with objects on screen. Move your index finger to control the red dot!
//
// INTERACTION CONCEPT:
// Traditional UI: Touch/click to select objects
// Hand Tracking UI: Point your finger to hover/select objects
//
// 3D COORDINATES:
// HandPose provides x, y, and z coordinates for each keypoint
// - x, y: Screen position (2D)
// - z: Depth from camera (negative = closer, positive = farther)
//
// Uses PhoneCamera class from p5-phone for automatic coordinate mapping.
// Works with any ML5 model (FaceMesh, HandPose, BodyPose, etc.)
// ==============================================

// ==============================================
// ADJUSTABLE PARAMETERS
// ==============================================
let SHOW_VIDEO = true;              // Show/hide video feed (toggle with touch)
let SHOW_ALL_KEYPOINTS = true;      // Show all 21 hand keypoints (set to false to hide)

// Customize which hand point to track:
// 8 = index finger tip (default)
// 4 = thumb tip
// 12 = middle finger tip
// 16 = ring finger tip
// 20 = pinky tip
// 0 = wrist
let TRACKED_KEYPOINT_INDEX = 8;     // Which hand point to use for interaction
let TRACKED_HAND = 'Left';          // Which hand to track: 'Left', 'Right', or 'First' (first detected)

let CURSOR_SIZE = 30;               // Size of the tracking cursor (finger dot)
let CURSOR_COLOR = [255, 50, 50];   // Color of cursor (red)
let KEYPOINT_SIZE = 3;              // Size of all hand keypoints (if shown)

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                            // PhoneCamera instance
let handpose;                       // ML5 HandPose model
let hands = [];                     // Detected hands (updated automatically)
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
    // Configure ML5 HandPose
    let options = {
      maxHands: 2,          // Detect up to 2 hands
      runtime: 'mediapipe', // Use MediaPipe for better performance
      flipHorizontal: false // Don't flip in ML5 - cam.mapKeypoint() handles mirroring
    };
    
    // Create HandPose model with ready callback
    handpose = ml5.handPose(options, modelLoaded);
  });
}

function modelLoaded() {
  // Start detection when model is ready
  handpose.detectStart(cam.videoElement, (results) => {
    hands = results;
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
  
  // Draw all detected hands
  if (hands.length > 0) {
    drawAllHands();
    drawTrackedCursor();
  }
  
  // Draw instructions and status
  drawUI();
}

// ==============================================
// DRAW ALL HANDS - Show keypoints for all detected hands
// ==============================================
function drawAllHands() {
  // Draw each detected hand
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    
    if (!hand.keypoints || hand.keypoints.length === 0) continue;
    
    // Map all keypoints to screen coordinates
    let allPoints = cam.mapKeypoints(hand.keypoints);
    
    // Determine hand label and color
    let handLabel = hand.handedness || 'Unknown';
    let handColor;
    if (handLabel === 'Left') {
      handColor = [100, 150, 255]; // Blue for left hand
    } else if (handLabel === 'Right') {
      handColor = [255, 150, 100]; // Orange for right hand
    } else {
      handColor = [150, 150, 150]; // Gray for unknown
    }
    
    // ==============================================
    // DRAW HAND KEYPOINTS
    // ==============================================
    if (SHOW_ALL_KEYPOINTS) {
      push();
      fill(handColor[0], handColor[1], handColor[2], 150);
      noStroke();
      for (let point of allPoints) {
        ellipse(point.x, point.y, KEYPOINT_SIZE, KEYPOINT_SIZE);
      }
      pop();
      
      // Draw hand skeleton/connections
      drawHandSkeleton(allPoints, handColor);
    }
    
    // Draw hand label
    if (allPoints[0]) {  // Wrist position
      push();
      fill(handColor[0], handColor[1], handColor[2]);
      noStroke();
      textAlign(CENTER, BOTTOM);
      textSize(12);
      text(handLabel, allPoints[0].x, allPoints[0].y - 10);
      pop();
    }
  }
}

// ==============================================
// DRAW TRACKED CURSOR - Show the specific tracked point
// ==============================================
function drawTrackedCursor() {
  // Find the hand to track based on TRACKED_HAND setting
  let trackedHand = null;
  
  if (TRACKED_HAND === 'First') {
    // Use first detected hand
    trackedHand = hands[0];
  } else {
    // Find specific hand (Left or Right)
    for (let hand of hands) {
      if (hand.handedness === TRACKED_HAND) {
        trackedHand = hand;
        break;
      }
    }
  }
  
  if (!trackedHand || !trackedHand.keypoints) return;
  
  // ==============================================
  // MAIN INTERACTION: Get tracked keypoint position (3D)
  // ==============================================
  // This is the hand point you can use to control UI elements!
  // Change TRACKED_KEYPOINT_INDEX at top of file to track different points
  
  // Get 2D keypoint for x, y coordinates
  let trackedKeypoint = trackedHand.keypoints[TRACKED_KEYPOINT_INDEX];
  if (!trackedKeypoint) return;
  
  // Map to screen coordinates
  // cam.mapKeypoint() handles all scaling and mirroring
  cursor = cam.mapKeypoint(trackedKeypoint);
  
  // Get 3D keypoint for z-depth coordinate
  if (trackedHand.keypoints3D && trackedHand.keypoints3D[TRACKED_KEYPOINT_INDEX]) {
    let keypoint3D = trackedHand.keypoints3D[TRACKED_KEYPOINT_INDEX];
    cursor.z = keypoint3D.z;  // Add z-depth to cursor
  }
  
  // ==============================================
  // USE THE CURSOR POSITION FOR INTERACTION
  // ==============================================
  // Now you have cursor.x, cursor.y, and cursor.z (3D depth!) to use however you want!
  // Examples:
  // - Move objects: object.x = cursor.x, object.y = cursor.y
  // - Check collision: if (dist(cursor.x, cursor.y, target.x, target.y) < 50) {...}
  // - Control parameters: brightness = map(cursor.y, 0, height, 0, 255)
  // - Use depth: size = map(cursor.z, -100, 100, 10, 50)
  // - Depth-based effects: alpha = map(cursor.z, -50, 50, 100, 255)
  
  // Demo: Use z-depth to change cursor size (closer = bigger)
  let depthSize = CURSOR_SIZE;
  if (cursor.z !== undefined) {
    // Map z-depth to size: closer to camera (negative z) = bigger
    depthSize = map(cursor.z, -0.1, 0.1, 50, 20);
    depthSize = constrain(depthSize, 15, 60);
  }
  
  // Draw cursor at tracked position with depth-based size
  push();
  fill(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2]);
  noStroke();
  ellipse(cursor.x, cursor.y, depthSize, depthSize);
  
  // Optional: Show crosshair for precise positioning
  stroke(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2], 150);
  strokeWeight(2);
  let crosshairSize = depthSize / 2;
  line(cursor.x - crosshairSize, cursor.y, cursor.x + crosshairSize, cursor.y);
  line(cursor.x, cursor.y - crosshairSize, cursor.x, cursor.y + crosshairSize);
  pop();
  
  // Optional: Display 3D coordinates (useful for debugging)
  push();
  fill(255);
  stroke(0);
  strokeWeight(3);
  textAlign(CENTER, TOP);
  textSize(14);
  text('x: ' + cursor.x.toFixed(0) + ', y: ' + cursor.y.toFixed(0) + 
       ', z: ' + (cursor.z !== undefined ? cursor.z.toFixed(4) : 'N/A'), 
       cursor.x, cursor.y + depthSize/2 + 10);
  pop();
}

// ==============================================
// DRAW HAND SKELETON - Connect keypoints to show hand structure
// ==============================================
function drawHandSkeleton(points, color) {
  // Define connections between keypoints (hand bones)
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],     // Index finger
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]            // Palm connections
  ];
  
  push();
  stroke(color[0], color[1], color[2], 150);
  strokeWeight(2);
  
  for (let connection of connections) {
    let [i, j] = connection;
    if (points[i] && points[j]) {
      line(points[i].x, points[i].y, points[j].x, points[j].y);
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
  } else if (hands.length === 0) {
    text('Show your hand(s) to start tracking', width/2, 20);
  } else {
    // Show which keypoint is being tracked
    let keypointNames = {
      8: 'Index Finger Tip',
      4: 'Thumb Tip',
      12: 'Middle Finger Tip',
      16: 'Ring Finger Tip',
      20: 'Pinky Tip',
      0: 'Wrist'
    };
    let name = keypointNames[TRACKED_KEYPOINT_INDEX] || 'Keypoint ' + TRACKED_KEYPOINT_INDEX;
    text('Tracking ' + TRACKED_HAND + ' Hand: ' + name, width/2, 20);
    
    // Show detected hands count
    textSize(14);
    text('Hands detected: ' + hands.length, width/2, 45);
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
