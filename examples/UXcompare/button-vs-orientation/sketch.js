// Button vs Orientation Comparison
// Shows traditional button UI vs mobile device orientation change interaction

// Color states
let isBlueBackground = true; // true = blue, false = orange
let buttonColor1 = '#3498db'; // Blue
let buttonColor2 = '#e67e22'; // Orange

// Counters
let buttonClickCount = 0;
let orientationCount = 0;

// Button properties
let buttonWidth = 200;
let buttonHeight = 60;
let buttonX, buttonY;

// Orientation tracking
let lastOrientation = '';
let currentOrientation = '';

// Simple orientation debounce
let lastOrientationFrame = 0;

// Layout properties
let topSectionHeight;
let bottomSectionHeight;
let dividerY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Enable gesture locking and motion sensors
  lockGestures();
  enableGyroTap('Tap to enable orientation detection');
  
  // Calculate layout for portrait orientation
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
  
  // Position button in top section
  buttonX = width / 2 - buttonWidth / 2;
  buttonY = topSectionHeight / 2 - buttonHeight / 2;
  
  // Initialize orientation tracking
  updateOrientation();
  
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
  
  // Draw bottom section - Orientation Interaction
  drawBottomSection();
  
  // Check for orientation changes
  checkOrientationChange();
}

function drawTopSection() {
  // Section title
  fill(255);
  textSize(24);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('TRADITIONAL UI', 30, 40);
  } else {
    textAlign(CENTER, CENTER);
    text('TRADITIONAL UI', width / 2, 40);
  }
  
  // Draw button
  drawButton();
  
  // Draw counter
  textSize(20);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('Button pressed: ' + buttonClickCount + ' times', 30, buttonY + buttonHeight);
  } else {
    textAlign(CENTER, CENTER);
    text('Button pressed: ' + buttonClickCount + ' times', width / 2, buttonY + buttonHeight + 40);
  }
}

function drawBottomSection() {
  // Section title
  fill(255);
  textSize(24);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('MOBILE INTERACTION', 30, dividerY + 40);
  } else {
    textAlign(CENTER, CENTER);
    text('MOBILE INTERACTION', width / 2, dividerY + 40);
  }
  
  // Instructions or orientation indicator
  textSize(18);
  if (window.sensorsEnabled) {
    if (currentOrientation === 'landscape') {
      textAlign(LEFT, CENTER);
      text('Rotate your device!', 30, dividerY + 80);
    } else {
      textAlign(CENTER, CENTER);
      text('Rotate your device!', width / 2, dividerY + 80);
    }
  } else {
    if (currentOrientation === 'landscape') {
      textAlign(LEFT, CENTER);
      text('Enable motion sensors first', 30, dividerY + 80);
    } else {
      textAlign(CENTER, CENTER);
      text('Enable motion sensors first', width / 2, dividerY + 80);
    }
  }
  
  // Draw orientation visualization
  if (window.sensorsEnabled) {
    drawOrientationIndicator();
  }
  
  // Draw counter
  textSize(20);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('Device rotated: ' + orientationCount + ' times', 30, height - 40);
  } else {
    textAlign(CENTER, CENTER);
    text('Device rotated: ' + orientationCount + ' times', width / 2, height - 40);
  }
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
  textAlign(CENTER, CENTER);
  text('TOGGLE COLOR', width / 2, buttonY + buttonHeight / 2);
}

function drawOrientationIndicator() {
  // Device orientation visualization
  let centerX = width / 2;
  let centerY = dividerY + (bottomSectionHeight / 2) - 20;
  
  // Draw device representation based on current orientation
  fill(255, 150);
  stroke(255);
  strokeWeight(2);
  
  if (currentOrientation === 'portrait' || currentOrientation === 'portrait-flipped') {
    // Draw tall rectangle for portrait
    rect(centerX - 30, centerY - 40, 60, 80, 8);
    
    // Draw orientation indicator
    fill(255, 200, 100);
    textSize(14);
    textAlign(CENTER, CENTER);
    text('PORTRAIT', centerX, centerY + 60);
    
  } else if (currentOrientation === 'landscape' || currentOrientation === 'landscape-flipped') {
    // Draw wide rectangle for landscape
    rect(centerX - 50, centerY - 25, 100, 50, 8);
    
    // Draw orientation indicator
    fill(255, 200, 100);
    textSize(14);
    textAlign(CENTER, CENTER);
    text('LANDSCAPE', centerX, centerY + 50);
  } else {
    // Unknown orientation
    rect(centerX - 40, centerY - 30, 80, 60, 8);
    
    fill(255, 100, 100);
    textSize(14);
    textAlign(CENTER, CENTER);
    text('UNKNOWN', centerX, centerY + 50);
  }
  
  // Center dot
  fill(255);
  noStroke();
  circle(centerX, centerY, 8);
  
  // Current orientation text
  fill(255);
  textSize(16);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('Current: ' + currentOrientation, 30, centerY - 70);
  } else {
    textAlign(CENTER, CENTER);
    text('Current: ' + currentOrientation, centerX, centerY - 70);
  }
}

function isButtonPressed() {
  return mouseIsPressed && 
         mouseX >= buttonX && 
         mouseX <= buttonX + buttonWidth &&
         mouseY >= buttonY && 
         mouseY <= buttonY + buttonHeight;
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
}

function updateOrientation() {
  // Determine orientation based on screen dimensions
  if (width > height) {
    currentOrientation = 'landscape';
  } else {
    currentOrientation = 'portrait';
  }
}

function checkOrientationChange() {
  // Only check if motion sensors are enabled
  if (window.sensorsEnabled) {
    // Update current orientation
    let newOrientation = (width > height) ? 'landscape' : 'portrait';
    
    // Check if orientation changed
    if (newOrientation !== currentOrientation && currentOrientation !== '') {
      // Simple debounce - ignore if orientation changed in last 30 frames (about 1/2 second)
      if (frameCount - lastOrientationFrame > 30) {
        // Toggle background color
        isBlueBackground = !isBlueBackground;
        
        // Increment counter
        orientationCount++;
        
        // Update tracking variables
        lastOrientation = currentOrientation;
        currentOrientation = newOrientation;
        lastOrientationFrame = frameCount;
        
        console.log('Orientation changed from', lastOrientation, 'to', currentOrientation, '! Count:', orientationCount);
      }
    } else {
      // Update current orientation without triggering change
      currentOrientation = newOrientation;
    }
  }
}

// Handle screen rotation (this will trigger our orientation change detection)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Recalculate layout
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
  
  // Reposition button
  buttonX = width / 2 - buttonWidth / 2;
  buttonY = topSectionHeight / 2 - buttonHeight / 2;
}

// Called when permissions are ready
function userSetupComplete() {
  console.log('Motion sensors enabled! You can now rotate the device.');
  updateOrientation(); // Initialize orientation tracking
}