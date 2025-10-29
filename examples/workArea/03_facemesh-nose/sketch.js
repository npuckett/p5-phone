// ==============================================
// FACEMESH - NOSE TRACKING
// ==============================================
// Uses ML5's FaceMesh to detect faces and track the nose.
// Touch the screen to toggle the video on/off.
// 
// CONCEPTS COVERED:
// - ML5.js FaceMesh model for face detection
// - Tracking a single facial keypoint (nose)
// - 3D coordinates (x, y, z values)
// - Scaling keypoints to match video display
// - Camera input with phone
// ==============================================

// ==============================================
// ADJUSTABLE PARAMETERS
// ==============================================
let CAMERA_FACING = 'user';       // 'user' = front camera, 'environment' = back camera
let SHOW_VIDEO = true;            // Show/hide the video feed behind tracking
let KEYPOINT_SIZE = 20;           // Size of the red dot (nose marker)
let KEYPOINT_COLOR = [255, 0, 0]; // Color of the nose dot (red)
let MIRROR_VIDEO = true;          // Mirror the video (true for natural selfie view)

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let videoCapture;                 // Stores the camera video
let facemesh;                     // The ML5 FaceMesh model
let faces = [];                   // Stores detected faces (updated automatically)
let modelReady = false;           // Tracks if the model has finished loading

// ==============================================
// PRELOAD - Loads ML5 model before setup() runs
// ==============================================
function preload() {
  // Configure the FaceMesh model
  let options = {
    maxFaces: 1,                  // Only detect 1 face (faster)
    refineLandmarks: false,       // Skip detailed landmarks (faster)
    flipHorizontal: MIRROR_VIDEO  // Mirror to match video display
  };
  
  // Load the FaceMesh model from ML5
  facemesh = ml5.faceMesh(options);
}

// ==============================================
// SETUP - Runs once when page loads
// ==============================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();  // Prevent phone gestures (zoom, refresh)
  
  // Start the camera
  startCamera(CAMERA_FACING);
  
  modelReady = true;
}

// ==============================================
// START CAMERA - Initializes camera and face detection
// ==============================================
function startCamera(facingMode) {
  // Set up camera with constraints
  let constraints = {
    video: { facingMode: facingMode },  // Which camera to use
    audio: false,                       // No audio needed
    flipped: MIRROR_VIDEO               // Mirror the video
  };
  
  // Create and configure video capture
  videoCapture = createCapture(constraints);
  videoCapture.size(640, 480);
  videoCapture.hide();  // Hide the HTML video element (we draw it ourselves)
  
  // Start face detection
  // ML5 will call gotFaces() every time it detects faces
  facemesh.detectStart(videoCapture, gotFaces);
}

// ==============================================
// GOT FACES - Callback function for face detection
// ==============================================
// This function is called automatically by ML5 when faces are found
function gotFaces(results) {
  faces = results;  // Store the detected faces
}

// ==============================================
// GET VIDEO DIMENSIONS - Calculate how to fit video to screen
// ==============================================
// Returns an object with position, size, and scale factors
// This ensures the video fills the screen properly in portrait or landscape
function getVideoDimensions() {
  if (!videoCapture) return null;
  
  let videoWidth = videoCapture.width;
  let videoHeight = videoCapture.height;
  let orientation = deviceOrientation || 'PORTRAIT';
  
  let drawWidth, drawHeight, drawX, drawY;
  
  // Calculate size based on phone orientation
  if (orientation === 'PORTRAIT') {
    // Portrait: fill width, center vertically
    drawWidth = width;
    drawHeight = (videoHeight / videoWidth) * width;
    drawX = 0;
    drawY = (height - drawHeight) / 2;
  } else {
    // Landscape: fill height, center horizontally
    drawHeight = height;
    drawWidth = (videoWidth / videoHeight) * height;
    drawX = (width - drawWidth) / 2;
    drawY = 0;
  }
  
  // Calculate scale factors (used to position keypoints correctly)
  let scaleX = drawWidth / videoWidth;
  let scaleY = drawHeight / videoHeight;
  
  return {
    x: drawX,           // X position to draw video
    y: drawY,           // Y position to draw video
    width: drawWidth,   // Width to draw video
    height: drawHeight, // Height to draw video
    scaleX: scaleX,     // Horizontal scale factor for keypoints
    scaleY: scaleY      // Vertical scale factor for keypoints
  };
}

// ==============================================
// DRAW - Runs continuously (60 times per second)
// ==============================================
function draw() {
  background(40);  // Dark gray background
  
  // Calculate video dimensions for current orientation
  let videoDims = getVideoDimensions();
  
  // Draw the video feed (if enabled)
  if (SHOW_VIDEO && videoCapture && videoDims) {
    image(videoCapture, videoDims.x, videoDims.y, videoDims.width, videoDims.height);
  }
  
  // Draw the nose keypoint (if a face is detected)
  if (faces.length > 0 && videoDims) {
    drawKeypoint(videoDims);
  }
  
  // Draw instructions and status text
  drawUI();
}

// ==============================================
// DRAW KEYPOINT - Draw the nose with its coordinates
// ==============================================
function drawKeypoint(videoDims) {
  let face = faces[0];  // Get the first detected face
  
  if (face.keypoints) {
    // Get the nose keypoint (index 1 in FaceMesh = nose tip)
    let noseKeypoint = face.keypoints[1];
    
    if (noseKeypoint) {
      // Scale the nose position to match the video display
      // The raw coordinates are in video space (640x480)
      // We need to convert them to canvas space
      let x = noseKeypoint.x * videoDims.scaleX + videoDims.x;
      let y = noseKeypoint.y * videoDims.scaleY + videoDims.y;
      let z = noseKeypoint.z || 0;  // Depth coordinate (distance from camera)
      
      // Draw a red dot on the nose
      push();
      fill(KEYPOINT_COLOR[0], KEYPOINT_COLOR[1], KEYPOINT_COLOR[2]);
      noStroke();
      ellipse(x, y, KEYPOINT_SIZE, KEYPOINT_SIZE);
      pop();
      
      // Draw the coordinates below the nose
      push();
      fill(255);
      stroke(0);
      strokeWeight(3);
      textAlign(CENTER, TOP);
      textSize(16);
      text('x: ' + x.toFixed(1) + '\n' + 
           'y: ' + y.toFixed(1) + '\n' + 
           'z: ' + z.toFixed(1), 
           x, y + KEYPOINT_SIZE);
      pop();
    }
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
  if (!modelReady) {
    text('Loading FaceMesh model...', width/2, 20);
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
  fill(SHOW_VIDEO ? [0, 255, 0] : [255, 0, 0]);
  text('Video: ' + (SHOW_VIDEO ? 'ON' : 'OFF'), width/2, height - 40);
  
  pop();
}

// ==============================================
// TOUCH EVENTS - Toggle video when touching screen
// ==============================================
function touchStarted() {
  SHOW_VIDEO = !SHOW_VIDEO;  // Switch video on/off
  return false;  // Prevent default phone behavior
}

// Also works with mouse click for testing on desktop
function mousePressed() {
  touchStarted();
}

// ==============================================
// WINDOW RESIZE - Update canvas when screen rotates
// ==============================================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
