// Global variables for microphone
let mic;
let amplitude;
let orientationX = 0;
let orientationY = 0;
let motionCircleX = 0;
let motionCircleY = 0;
let micLevel = 0;
let micCircleSize = 10;

function setup() 
{
  // Show debug panel FIRST to catch setup errors
  showDebug();
  
  createCanvas(windowWidth, windowHeight);
  
  // Lock mobile gestures to prevent browser interference
  lockGestures();
  
  // Create microphone input and route it to an amplitude analyzer
  mic = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.disconnect(); // Keep the live mic out of the speakers (prevents feedback)
  mic.connect(amplitude);
  
  // Enable motion sensors with tap-to-start
  enableGyroTap('Tap to enable motion sensors');
  
  // Enable microphone with tap-to-start  
  enableMicTap('Tap to enable microphone');
}

function draw() 
{
  background(220);
  
  if (window.sensorsEnabled) 
  {
    updateMotionValues();

    // Use device rotation and acceleration
    fill(255, 0, 0);
    circle(motionCircleX, motionCircleY, 50);
  }
  
  if (window.micEnabled) 
  {
    updateMicValues();
    
    fill(0, 255, 0);
    circle(width/2, height/2, micCircleSize);
  }
}

function updateMotionValues()
{
  orientationX = rotationX;
  orientationY = rotationY;
  motionCircleX = width/2 + orientationY * 5;
  motionCircleY = height/2 + orientationX * 5;
}

function updateMicValues()
{
  micLevel = amplitude.getLevel();
  micCircleSize = map(micLevel, 0, 1, 10, 200);
}

// Prevent default touch behavior (optional but recommended)
function mousePressed() 
{
  return false;
}

function mouseReleased() 
{
  return false;
}