// ==============================================
// FACEMESH - NOSE TRACKING (PRELOAD VERSION)
// ==============================================
// Uses ML5's FaceMesh to detect faces and track the nose.
// This version demonstrates using preload() to load the ML5 model
// alongside the p5-phone library's PhoneCamera methods.
// Touch the screen to toggle the video on/off.
// 
// CONCEPTS COVERED:
// - Using preload() to load ML5 model before setup()
// - Combining preload with p5-phone's createPhoneCamera()
// - Using cam.onReady() callback with preloaded model
// - ML5.js FaceMesh model for face detection
// - Tracking a single facial keypoint (nose)
// - PhoneCamera coordinate mapping with cam.mapKeypoint()
// ==============================================

// ==============================================
// ADJUSTABLE PARAMETERS
// ==============================================
let SHOW_VIDEO = true;            // Show/hide the video feed behind tracking
let KEYPOINT_SIZE = 20;           // Size of the red dot (nose marker)
let KEYPOINT_COLOR = [255, 0, 0]; // Color of the nose dot (red)
const NOSE_INDEX = 1;             // FaceMesh keypoint index for nose tip

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                          // PhoneCamera instance (from p5-phone library)
let facemesh;                     // The ML5 FaceMesh model
let faces = [];                   // Stores detected faces (updated automatically)
let cursor = { x: 0, y: 0, z: 0 };// Stores the mapped nose position

// ==============================================
// PRELOAD - Loads ML5 model before setup() runs
// ==============================================
function preload() {
  // Configure the FaceMesh model
  let options = {
    maxFaces: 1,           // Only detect 1 face (faster)
    refineLandmarks: false,// Skip detailed landmarks (faster)
    flipHorizontal: false  // Important: p5-phone handles mirroring
  };
  
  // Load the FaceMesh model from ML5
  // The model will be fully loaded before setup() runs
  facemesh = ml5.faceMesh(options);
}

// ==============================================
// SETUP - Runs once when page loads
// ==============================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create phone camera with p5-phone library
  // Parameters: active (front/back), mirror (true/false), display mode
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Enable tap-to-toggle camera feature
  enableCameraTap(cam);
  
  // Wait for camera to be ready, then start face detection
  cam.onReady(() => {
    // Start ML5 face detection using the camera video
    // cam.videoElement provides the native HTML video element for ML5
    facemesh.detectStart(cam.videoElement, gotFaces);
  });
}

// ==============================================
// GOT FACES - Callback function for face detection
// ==============================================
// This function is called automatically by ML5 when faces are found
function gotFaces(results) {
  faces = results;  // Store the detected faces
}

// ==============================================
// DRAW - Runs continuously (60 times per second)
// ==============================================
function draw() {
  background(40);  // Dark gray background
  
  // Draw the video feed (if camera is ready)
  if (cam.ready) {
    image(cam.video, 0, 0, width, height);
  }
  
  // Draw the nose keypoint (if a face is detected)
  if (faces.length > 0 && cam.ready) {
    drawNoseTracking();
  }
  
  // Draw instructions and status text
  drawUI();
}

// ==============================================
// DRAW NOSE TRACKING - Draw the nose with coordinates
// ==============================================
function drawNoseTracking() {
  let face = faces[0];  // Get the first detected face
  
  if (face.keypoints && face.keypoints[NOSE_INDEX]) {
    // Get the nose keypoint (index 1 in FaceMesh = nose tip)
    let noseKeypoint = face.keypoints[NOSE_INDEX];
    
    // Map the nose position from video space to canvas space
    // This automatically handles scaling and positioning
    cursor = cam.mapKeypoint(noseKeypoint);
    
    // Draw a red dot on the nose
    push();
    fill(KEYPOINT_COLOR[0], KEYPOINT_COLOR[1], KEYPOINT_COLOR[2]);
    noStroke();
    ellipse(cursor.x, cursor.y, KEYPOINT_SIZE, KEYPOINT_SIZE);
    pop();
    
    // Draw the coordinates below the nose
    push();
    fill(255);
    stroke(0);
    strokeWeight(3);
    textAlign(CENTER, TOP);
    textSize(16);
    text('x: ' + cursor.x.toFixed(1) + '\n' + 
         'y: ' + cursor.y.toFixed(1) + '\n' + 
         'z: ' + cursor.z.toFixed(1), 
         cursor.x, cursor.y + KEYPOINT_SIZE);
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
    text('Loading camera and model...', width/2, 20);
  } else if (faces.length === 0) {
    text('No face detected', width/2, 20);
  } else {
    text('Tracking nose', width/2, 20);
  }
  
  // Show instructions at bottom
  textSize(14);
  fill(200);
  textAlign(CENTER, BOTTOM);
  text('Touch to toggle video on/off', width/2, height - 20);
  
  // Show video status
  textSize(12);
  fill(cam.active ? [0, 255, 0] : [255, 0, 0]);
  text('Video: ' + (cam.active ? 'ON' : 'OFF'), width/2, height - 40);
  
  pop();
}

// ==============================================
// WINDOW RESIZE - Update canvas when screen rotates
// ==============================================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
