// Button vs Movement Comparison
// Shows traditional button UI vs mobile device movement interaction

// Color states
let isBlueBackground = true; // true = blue, false = orange
let buttonColor1 = '#3498db'; // Blue
let buttonColor2 = '#e67e22'; // Orange

// Counters
let buttonClickCount = 0;
let movementCount = 0;

// Button properties
let buttonWidth = 200;
let buttonHeight = 60;
let buttonX, buttonY;

// Slider properties
let sliderX, sliderY;
let sliderWidth = 200;
let sliderHeight = 20;
let sliderValue = 5; // Default movement threshold (higher = less sensitive)
let sliderMin = 1;
let sliderMax = 50;
let isDraggingSlider = false;

// Simple movement debounce
let lastMovementFrame = 0;

// Layout properties
let topSectionHeight;
let bottomSectionHeight;
let dividerY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Enable gesture locking and motion sensors
  lockGestures();
  enableGyroTap('Tap to enable movement detection');
  
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
  
  // Set initial movement threshold (higher value = less sensitive)
  setMoveThreshold(sliderValue);
  
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
  
  // Draw bottom section - Movement Interaction
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
  
  // Instructions or movement indicator
  textSize(18);
  if (window.sensorsEnabled) {
    text('Move your device!', width / 2, dividerY + 80);
  } else {
    text('Enable motion sensors first', width / 2, dividerY + 80);
  }
  
  // Draw movement visualization
  if (window.sensorsEnabled) {
    drawMovementIndicator();
  }
  
  // Draw movement threshold slider
  drawSlider();
  
  // Draw counter
  textSize(20);
  text('Device moved: ' + movementCount + ' times', width / 2, height - 30);
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

function drawMovementIndicator() {
  // Simple movement visualization - arrows showing device movement
  let centerX = width / 2;
  let centerY = dividerY + (bottomSectionHeight / 2) - 40;
  
  // Get motion intensity for visualization
  let motionX = 0;
  let motionY = 0;
  let motionZ = 0;
  
  if (typeof accelerationX !== 'undefined') {
    motionX = accelerationX || 0;
    motionY = accelerationY || 0;
    motionZ = accelerationZ || 0;
  }
  
  // Draw device representation (rectangle)
  fill(255, 150);
  stroke(255);
  strokeWeight(2);
  rect(centerX - 40, centerY - 20, 80, 40, 5);
  
  // Draw movement arrows based on acceleration
  strokeWeight(3);
  
  // X-axis movement (left/right)
  if (abs(motionX) > 0.5) {
    stroke(255, 200, 100);
    if (motionX > 0) {
      // Arrow pointing right
      line(centerX + 50, centerY, centerX + 80, centerY);
      line(centerX + 75, centerY - 5, centerX + 80, centerY);
      line(centerX + 75, centerY + 5, centerX + 80, centerY);
    } else {
      // Arrow pointing left
      line(centerX - 50, centerY, centerX - 80, centerY);
      line(centerX - 75, centerY - 5, centerX - 80, centerY);
      line(centerX - 75, centerY + 5, centerX - 80, centerY);
    }
  }
  
  // Y-axis movement (up/down)
  if (abs(motionY) > 0.5) {
    stroke(100, 255, 200);
    if (motionY > 0) {
      // Arrow pointing down
      line(centerX, centerY + 25, centerX, centerY + 55);
      line(centerX - 5, centerY + 50, centerX, centerY + 55);
      line(centerX + 5, centerY + 50, centerX, centerY + 55);
    } else {
      // Arrow pointing up
      line(centerX, centerY - 25, centerX, centerY - 55);
      line(centerX - 5, centerY - 50, centerX, centerY - 55);
      line(centerX + 5, centerY - 50, centerX, centerY - 55);
    }
  }
  
  // Center dot
  fill(255);
  noStroke();
  circle(centerX, centerY, 8);
}

function drawSlider() {
  // Slider label
  fill(255);
  textSize(16);
  text('Movement Sensitivity: ' + sliderValue, width / 2, sliderY - 25);
  
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
  
  // Update movement threshold
  setMoveThreshold(sliderValue);
  
  console.log('Movement threshold set to:', sliderValue);
}

// Handle device movement (built-in p5.js function)
function deviceMoved() {
  // Only respond if motion sensors are enabled
  if (window.sensorsEnabled) {
    // Simple debounce - ignore if movement happened in last 5 frames (about 1/12 second)
    if (frameCount - lastMovementFrame > 5) {
      // Toggle background color
      isBlueBackground = !isBlueBackground;
      
      // Increment counter
      movementCount++;
      
      // Update last movement frame
      lastMovementFrame = frameCount;
      
      console.log('Device moved! Count:', movementCount);
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
  console.log('Motion sensors enabled! You can now move the device.');
}