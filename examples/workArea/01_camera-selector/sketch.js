// ==============================================
// CAMERA SELECTOR - SIMPLIFIED WITH P5-PHONE
// ==============================================
// Demonstrates the PhoneCamera API from p5-phone library.
// Shows camera switching, display modes, and mirroring.
// 
// KEY FEATURES:
// - Switch between front/back cameras
// - Cycle through display modes (fitHeight, fitWidth, cover, contain, fixed)
// - Toggle mirroring on/off
// - All camera logic handled by PhoneCamera class
// ==============================================

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                          // PhoneCamera instance
let cameraButton;                 // Button to switch cameras
let scaleModeButton;              // Button to change scale mode
let flipButton;                   // Button to toggle video flip

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Lock mobile gestures to prevent browser interference
  lockGestures();
  
  // Create PhoneCamera: front camera, mirrored, fit to height
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Create UI buttons
  createCameraButton();
  createScaleModeButton();
  createFlipButton();
  
  // Enable camera with tap
  enableCameraTap();
}

// ==============================================
// CAMERA READY - Called when user enables camera
// ==============================================
function userCameraReady() {
  // Initialize the camera (starts video capture)
  cam._initializeCamera();
  console.log('Camera started!');
}

// ==============================================
// DRAW FUNCTION - Runs continuously
// ==============================================
function draw() {
  background(40);
  
  // Draw the camera feed if ready
  if (cam.ready) {
    image(cam, 0, 0);  // PhoneCamera handles all positioning and mirroring!
  } else {
    // Show loading message
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text('Tap to start camera...', width/2, height/2);
  }
  
  // Draw status overlay
  drawStatus();
}

// ==============================================
// CREATE CAMERA BUTTON
// ==============================================
function createCameraButton() {
  cameraButton = createButton('Front Cam');
  
  let buttonWidth = width / 3;
  let buttonHeight = 60;
  let buttonX = 0;
  let buttonY = height - buttonHeight;
  
  cameraButton.position(buttonX, buttonY);
  cameraButton.size(buttonWidth, buttonHeight);
  cameraButton.style('font-size', '14px');
  cameraButton.style('background-color', '#4A90E2');
  cameraButton.style('color', 'white');
  cameraButton.style('border', 'none');
  cameraButton.style('border-radius', '0');
  cameraButton.style('cursor', 'pointer');
  cameraButton.style('box-shadow', 'none');
  cameraButton.style('z-index', '1000');
  
  cameraButton.mousePressed(switchCamera);
}

// ==============================================
// CREATE SCALE MODE BUTTON
// ==============================================
function createScaleModeButton() {
  scaleModeButton = createButton('Fit Height');
  
  let buttonWidth = width / 3;
  let buttonHeight = 60;
  let buttonX = width / 3;
  let buttonY = height - buttonHeight;
  
  scaleModeButton.position(buttonX, buttonY);
  scaleModeButton.size(buttonWidth, buttonHeight);
  scaleModeButton.style('font-size', '14px');
  scaleModeButton.style('background-color', '#50C878');
  scaleModeButton.style('color', 'white');
  scaleModeButton.style('border', 'none');
  scaleModeButton.style('border-radius', '0');
  scaleModeButton.style('cursor', 'pointer');
  scaleModeButton.style('box-shadow', 'none');
  scaleModeButton.style('z-index', '1000');
  
  scaleModeButton.mousePressed(cycleScaleMode);
}

// ==============================================
// CREATE FLIP BUTTON
// ==============================================
function createFlipButton() {
  flipButton = createButton('Mirror: ON');
  
  let buttonWidth = width / 3;
  let buttonHeight = 60;
  let buttonX = (width / 3) * 2;
  let buttonY = height - buttonHeight;
  
  flipButton.position(buttonX, buttonY);
  flipButton.size(buttonWidth, buttonHeight);
  flipButton.style('font-size', '14px');
  flipButton.style('background-color', '#FF6B6B');
  flipButton.style('color', 'white');
  flipButton.style('border', 'none');
  flipButton.style('border-radius', '0');
  flipButton.style('cursor', 'pointer');
  flipButton.style('box-shadow', 'none');
  flipButton.style('z-index', '1000');
  
  flipButton.mousePressed(toggleFlip);
}

// ==============================================
// SWITCH CAMERA
// ==============================================
function switchCamera() {
  if (!cam.ready) return;
  
  // Toggle camera with property assignment
  cam.active = cam.active === 'user' ? 'environment' : 'user';
  
  // Update button text
  cameraButton.html(cam.active === 'user' ? 'Front Cam' : 'Back Cam');
}

// ==============================================
// CYCLE SCALE MODE
// ==============================================
function cycleScaleMode() {
  if (!cam.ready) return;
  
  // Cycle through: fitHeight -> fitWidth -> cover -> contain -> fixed -> fitHeight
  const modes = ['fitHeight', 'fitWidth', 'cover', 'contain', 'fixed'];
  const modeNames = ['Fit Height', 'Fit Width', 'Cover', 'Contain', 'Fixed'];
  
  let currentIndex = modes.indexOf(cam.mode);
  let nextIndex = (currentIndex + 1) % modes.length;
  
  cam.mode = modes[nextIndex];
  scaleModeButton.html(modeNames[nextIndex]);
}

// ==============================================
// TOGGLE FLIP
// ==============================================
function toggleFlip() {
  if (!cam.ready) return;
  
  // Toggle mirroring with property assignment
  cam.mirror = !cam.mirror;
  
  // Update button text
  flipButton.html(cam.mirror ? 'Mirror: ON' : 'Mirror: OFF');
}

// ==============================================
// DRAW STATUS
// ==============================================
function drawStatus() {
  if (!cam.ready) return;
  
  // Draw status overlay at top
  push();
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, 80);
  
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(`Camera: ${cam.active}`, width/2, 20);
  text(`Mode: ${cam.mode} | Mirror: ${cam.mirror ? 'ON' : 'OFF'}`, width/2, 45);
  
  // Show dimensions
  let dims = cam.getDimensions();
  textSize(12);
  text(`Display: ${dims.width.toFixed(0)}x${dims.height.toFixed(0)} | Video: ${cam.video.width}x${cam.video.height}`, width/2, 65);
  pop();
}

// ==============================================
// WINDOW RESIZE
// ==============================================
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Recalculate button dimensions and positions
  let buttonWidth = width / 3;
  let buttonHeight = 60;
  let buttonY = height - buttonHeight;
  
  if (cameraButton) {
    cameraButton.position(0, buttonY);
    cameraButton.size(buttonWidth, buttonHeight);
  }
  if (scaleModeButton) {
    scaleModeButton.position(buttonWidth, buttonY);
    scaleModeButton.size(buttonWidth, buttonHeight);
  }
  if (flipButton) {
    flipButton.position(buttonWidth * 2, buttonY);
    flipButton.size(buttonWidth, buttonHeight);
  }
}
