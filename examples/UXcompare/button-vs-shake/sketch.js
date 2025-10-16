// Button vs Shake Comparison
// Shows traditional button UI vs mobile device shake interaction

// Color states
let isBlueBackground = true; // true = blue, false = orange
let buttonColor1 = '#3498db'; // Blue
let buttonColor2 = '#e67e22'; // Orange

// Counters
let buttonClickCount = 0;
let shakeCount = 0;

// Button properties
let buttonWidth = 200;
let buttonHeight = 60;
let buttonX, buttonY;

// Slider properties
let sliderX, sliderY;
let sliderWidth = 200;
let sliderHeight = 20;
let sliderValue = 100; // Default shake threshold (higher = less sensitive)
let sliderMin = 30;
let sliderMax = 150;
let isDraggingSlider = false;

// Simple shake debounce
let lastShakeFrame = 0;

// Layout properties
let topSectionHeight;
let bottomSectionHeight;
let dividerY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Enable gesture locking and motion sensors
  lockGestures();
  enableGyroTap('Tap to enable shake detection');
  
  // Calculate layout for portrait orientation
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
  
  // Position button in top section
  buttonX = width / 2 - buttonWidth / 2;
  buttonY = topSectionHeight / 2 - buttonHeight / 2;
  
  // Position slider in bottom section
  sliderX = width / 2 - sliderWidth / 2;
  sliderY = height - 120;
  
  // Set initial shake threshold (higher value = less sensitive)
  setShakeThreshold(sliderValue);
  
  textAlign(CENTER, CENTER);
}

function draw() {
  // Set background color based on current state
  if (isBlueBackground) {
    background(buttonColor1);
  } else {
    background(buttonColor2);
  }
  
  // Draw divider line
  stroke(255, 255, 255, 100);
  strokeWeight(2);
  line(0, dividerY, width, dividerY);
  
  // Draw top section - Traditional Button UI
  drawTopSection();
  
  // Draw bottom section - Shake Interaction
  drawBottomSection();
}

function drawTopSection() {
  // Section title
  fill(255);
  textSize(24);
  text('TRADITIONAL UI', width / 2, 40);
  
  // Draw button
  drawButton();
  
  // Draw counter
  textSize(20);
  text('Button pressed: ' + buttonClickCount + ' times', width / 2, buttonY + buttonHeight + 40);
}

function drawBottomSection() {
  // Section title
  fill(255);
  textSize(24);
  text('MOBILE INTERACTION', width / 2, dividerY + 40);
  
  // Instructions or shake indicator
  textSize(18);
  if (window.sensorsEnabled) {
    text('Shake your device!', width / 2, dividerY + 80);
  } else {
    text('Enable motion sensors first', width / 2, dividerY + 80);
  }
  
  // Draw shake visualization
  if (window.sensorsEnabled) {
    drawShakeIndicator();
  }
  
  // Draw shake threshold slider
  drawSlider();
  
  // Draw counter
  textSize(20);
  text('Device shaken: ' + shakeCount + ' times', width / 2, height - 30);
}

function drawButton() {
  // Button shadow
  fill(0, 0, 0, 50);
  noStroke();
  rect(buttonX + 3, buttonY + 3, buttonWidth, buttonHeight, 8);
  
  // Button background
  if (isBlueBackground) {
    fill(255, 255, 255, 200);
  } else {
    fill(255, 255, 255, 200);
  }
  
  // Check if button is being pressed
  if (isButtonPressed()) {
    fill(255, 255, 255, 255); // Brighter when pressed
  }
  
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
  
  // Button text
  fill(0);
  textSize(18);
  text('TOGGLE COLOR', width / 2, buttonY + buttonHeight / 2);
}

function drawShakeIndicator() {
  // Simple shake visualization - concentric circles
  let centerX = width / 2;
  let centerY = dividerY + (bottomSectionHeight / 2) - 20;
  
  // Get motion intensity for visualization
  let motionIntensity = 0;
  if (typeof accelerationX !== 'undefined') {
    motionIntensity = abs(accelerationX) + abs(accelerationY) + abs(accelerationZ);
    motionIntensity = constrain(motionIntensity, 0, 10);
  }
  
  // Draw concentric circles that respond to motion
  noFill();
  stroke(255, 150);
  strokeWeight(2);
  
  for (let i = 1; i <= 3; i++) {
    let radius = 30 + (i * 20) + (motionIntensity * 2);
    circle(centerX, centerY, radius);
  }
  
  // Center dot
  fill(255);
  noStroke();
  circle(centerX, centerY, 10);
}

function drawSlider() {
  // Slider label
  fill(255);
  textSize(16);
  text('Shake Sensitivity: ' + sliderValue, width / 2, sliderY - 25);
  
  // Slider track (background)
  fill(255, 255, 255, 100);
  noStroke();
  rect(sliderX, sliderY, sliderWidth, sliderHeight, sliderHeight / 2);
  
  // Calculate slider handle position
  let handleX = map(sliderValue, sliderMin, sliderMax, sliderX, sliderX + sliderWidth - 20);
  
  // Slider handle
  fill(255);
  if (isDraggingSlider) {
    fill(255, 255, 0); // Yellow when dragging
  }
  
  // Handle shadow
  fill(0, 0, 0, 50);
  circle(handleX + 12, sliderY + sliderHeight / 2 + 2, 24);
  
  // Handle
  if (isDraggingSlider) {
    fill(255, 255, 0);
  } else {
    fill(255);
  }
  circle(handleX + 10, sliderY + sliderHeight / 2, 24);
  
  // Handle indicator
  fill(0);
  circle(handleX + 10, sliderY + sliderHeight / 2, 8);
}

function isButtonPressed() {
  return mouseIsPressed && 
         mouseX >= buttonX && 
         mouseX <= buttonX + buttonWidth &&
         mouseY >= buttonY && 
         mouseY <= buttonY + buttonHeight;
}

function isSliderPressed() {
  let handleX = map(sliderValue, sliderMin, sliderMax, sliderX, sliderX + sliderWidth - 20);
  return mouseX >= handleX && 
         mouseX <= handleX + 20 &&
         mouseY >= sliderY - 10 && 
         mouseY <= sliderY + sliderHeight + 10;
}

// Handle button clicks
function mousePressed() {
  // Check button press
  if (mouseX >= buttonX && 
      mouseX <= buttonX + buttonWidth &&
      mouseY >= buttonY && 
      mouseY <= buttonY + buttonHeight) {
    
    // Toggle background color
    isBlueBackground = !isBlueBackground;
    
    // Increment counter
    buttonClickCount++;
    
    console.log('Button clicked! Count:', buttonClickCount);
    
    return false; // Prevent default
  }
  
  // Check slider press
  if (isSliderPressed()) {
    isDraggingSlider = true;
    updateSliderValue();
    return false;
  }
}

function mouseDragged() {
  if (isDraggingSlider) {
    updateSliderValue();
    return false;
  }
}

function mouseReleased() {
  isDraggingSlider = false;
}

function updateSliderValue() {
  // Calculate new slider value based on mouse position
  let newValue = map(mouseX, sliderX, sliderX + sliderWidth, sliderMin, sliderMax);
  newValue = constrain(newValue, sliderMin, sliderMax);
  sliderValue = round(newValue);
  
  // Update shake threshold
  setShakeThreshold(sliderValue);
  
  console.log('Shake threshold set to:', sliderValue);
}

// Handle device shake (built-in p5.js function)
function deviceShaken() {
  // Only respond if motion sensors are enabled
  if (window.sensorsEnabled) {
    // Simple debounce - ignore if shake happened in last 10 frames (about 1/6 second)
    if (frameCount - lastShakeFrame > 10) {
      // Toggle background color
      isBlueBackground = !isBlueBackground;
      
      // Increment counter
      shakeCount++;
      
      // Update last shake frame
      lastShakeFrame = frameCount;
      
      console.log('Device shaken! Count:', shakeCount);
    }
  }
}

// Handle screen rotation
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Recalculate layout
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
  
  // Reposition button
  buttonX = width / 2 - buttonWidth / 2;
  buttonY = topSectionHeight / 2 - buttonHeight / 2;
  
  // Reposition slider
  sliderX = width / 2 - sliderWidth / 2;
  sliderY = height - 120;
}

// Called when permissions are ready
function userSetupComplete() {
  console.log('Motion sensors enabled! You can now shake the device.');
}