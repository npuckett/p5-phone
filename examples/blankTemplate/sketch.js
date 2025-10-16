// Global variable for microphone
let mic;

function setup() 
{
  // Show debug panel FIRST to catch setup errors
  showDebug();
  
  createCanvas(windowWidth, windowHeight);
  
  // Lock mobile gestures to prevent browser interference
  lockGestures();
  
  // Create microphone input
  mic = new p5.AudioIn();
  
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
    // Use device rotation and acceleration
    fill(255, 0, 0);
    circle(width/2 + rotationY * 5, height/2 + rotationX * 5, 50);
  }
  
  if (window.micEnabled) 
  {
    // Use microphone input
    let micLevel = mic.getLevel();
    let size = map(micLevel, 0, 1, 10, 200);
    
    fill(0, 255, 0);
    circle(width/2, height/2, size);
  }
}

// Prevent default touch behavior (optional but recommended)
function touchStarted() 
{
  return false;
}

function touchEnded() 
{
  return false;
}