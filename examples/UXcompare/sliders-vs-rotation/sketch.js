// Sliders vs Device Rotation Comparison
// Shows traditional RGB sliders vs device rotation control

// Color scheme
let backgroundColor;

// Slider properties
let sliderValues = [0.5, 0.5, 0.5]; // RGB values (0.0-1.0)
let sliderLabels = ['Red', 'Green', 'Blue'];
let sliderColors = [];
let sliderMin = 0.0;
let sliderMax = 1.0;
let sliders = [];
let isDraggingSlider = -1; // -1 = none, 0-2 = slider index

// Rotation values
let rotationValues = [0.0, 0.0, 0.0]; // X, Y, Z rotation
let normalizedRotation = [0.5, 0.5, 0.5]; // Normalized to 0.0-1.0

// Layout properties
let currentOrientation = 'portrait';
let topSectionHeight;
let bottomSectionHeight;
let dividerY;

// Slider dimensions
let sliderWidth = 250;
let sliderHeight = 30;
let sliderSpacing = 60;

function addLog(message) {
  console.log(message); // Only log to browser console
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize colors
  backgroundColor = color(44, 62, 80); // Dark blue-gray
  sliderColors = [
    color(231, 76, 60),  // Red
    color(46, 204, 113), // Green
    color(52, 152, 219)  // Blue
  ];
  
  // Enable gesture locking and motion sensors (using new permissionsAll.js system)
  addLog('Calling lockGestures()...');
  lockGestures();
  
  addLog('Calling enableGyroTap()...');
  enableGyroTap('Tap to enable device rotation detection');
  
  // Calculate layout
  updateLayout();
  
  // Initialize slider positions
  updateSliderPositions();
  
  addLog('Sliders vs Rotation ready!');
  addLog('Canvas size: ' + width + 'x' + height);
  addLog('Using permissionsAll.js system');
}

function draw() {
  // Update rotation values
  updateRotationValues();
  
  // Update orientation
  updateOrientation();
  
  // Set background based on current mode
  if (window.sensorsEnabled) {
    // Use rotation for background color
    backgroundColor = color(
      normalizedRotation[0] * 255, // Red from rotation X
      normalizedRotation[1] * 255, // Green from rotation Y 
      normalizedRotation[2] * 255  // Blue from rotation Z
    );
  } else {
    // Use sliders for background color
    backgroundColor = color(
      sliderValues[0] * 255, // Red
      sliderValues[1] * 255, // Green
      sliderValues[2] * 255  // Blue
    );
  }
  
  background(backgroundColor);
  
  // Draw top section - sliders
  drawTopSection();
  
  // Draw divider
  drawDivider();
  
  // Draw bottom section - rotation
  drawBottomSection();
}

function drawTopSection() {
  // Section title
  fill(255, 255, 255);
  textSize(20);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('TRADITIONAL UI', 30, 30);
  } else {
    textAlign(CENTER, CENTER);
    text('TRADITIONAL UI', width / 2, 30);
  }
  
  // Draw all three sliders
  for (let i = 0; i < 3; i++) {
    drawSlider(i);
  }
  
  // Draw color preview rectangle
  let previewColor = color(
    sliderValues[0] * 255,
    sliderValues[1] * 255,
    sliderValues[2] * 255
  );
  fill(previewColor);
  noStroke();
  if (currentOrientation === 'landscape') {
    rect(30, topSectionHeight - 60, 200, 40);
  } else {
    rect(width / 2 - 100, topSectionHeight - 60, 200, 40);
  }
}

function drawBottomSection() {
  // Section title
  fill(255, 255, 255);
  textSize(20);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('MOBILE INTERACTION', 30, dividerY + 30);
  } else {
    textAlign(CENTER, CENTER);
    text('MOBILE INTERACTION', width / 2, dividerY + 30);
  }
  
  // Instructions or rotation values
  if (window.sensorsEnabled) {
    drawRotationDisplay();
  } else {
    fill(255, 255, 255, 200);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('Tap to enable device rotation!', width / 2, dividerY + 80);
  }
}

function drawDivider() {
  // Draw divider line
  stroke(255, 255, 255, 100);
  strokeWeight(2);
  line(0, dividerY, width, dividerY);
  noStroke();
}

function drawSlider(index) {
  let slider = sliders[index];
  if (!slider) return;
  
  // Slider track
  fill(100, 100, 100);
  noStroke();
  rect(slider.x, slider.y, sliderWidth, sliderHeight, 15);
  
  // Slider fill
  fill(sliderColors[index]);
  let fillWidth = sliderValues[index] * sliderWidth;
  rect(slider.x, slider.y, fillWidth, sliderHeight, 15);
  
  // Slider handle
  fill(255, 255, 255);
  let handleX = slider.x + (sliderValues[index] * sliderWidth);
  circle(handleX, slider.y + sliderHeight / 2, sliderHeight + 10);
  
  // Label
  fill(255, 255, 255);
  textAlign(LEFT, CENTER);
  textSize(16);
  text(sliderLabels[index], slider.x, slider.y - 20);
  
  // Value
  textAlign(RIGHT, CENTER);
  textSize(14);
  text((sliderValues[index] * 255).toFixed(0), slider.x + sliderWidth, slider.y - 20);
}

function drawRotationDisplay() {
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textSize(18); // Increased from 14
  
  let startY = dividerY + 80;
  
  text('Rotate your device!', width / 2, startY);
  
  textSize(20); // Increased from 14 for rotation values
  text('X: ' + rotationValues[0].toFixed(1) + '°', width / 2, startY + 40);
  text('Y: ' + rotationValues[1].toFixed(1) + '°', width / 2, startY + 70);
  text('Z: ' + rotationValues[2].toFixed(1) + '°', width / 2, startY + 100);
  
  // Draw color preview from rotation
  let rotationColor = color(
    normalizedRotation[0] * 255,
    normalizedRotation[1] * 255,
    normalizedRotation[2] * 255
  );
  fill(rotationColor);
  noStroke();
  rect(width / 2 - 100, startY + 130, 200, 40);
}

// Slider helper functions
function updateSliderPositions() {
  sliders = [];
  let startY = 70;
  
  for (let i = 0; i < 3; i++) {
    let slider = {
      x: currentOrientation === 'landscape' ? 30 : (width - sliderWidth) / 2,
      y: startY + (i * sliderSpacing),
      width: sliderWidth,
      height: sliderHeight
    };
    sliders.push(slider);
  }
}

function isSliderPressed(sliderIndex, x, y) {
  let slider = sliders[sliderIndex];
  if (!slider) return false;
  
  return (x >= slider.x && x <= slider.x + slider.width &&
          y >= slider.y && y <= slider.y + slider.height);
}

function updateSliderValue(sliderIndex, x) {
  let slider = sliders[sliderIndex];
  if (!slider) return;
  
  let normalizedX = (x - slider.x) / slider.width;
  normalizedX = constrain(normalizedX, 0, 1);
  
  sliderValues[sliderIndex] = map(normalizedX, 0, 1, sliderMin, sliderMax);
  sliderValues[sliderIndex] = constrain(sliderValues[sliderIndex], sliderMin, sliderMax);
}

function updateRotationValues() {
  if (window.sensorsEnabled) {
    // Get rotation values from p5.js - use the same approach as gyroscope-demo
    rotationValues[0] = rotationX || 0;
    rotationValues[1] = rotationY || 0;
    rotationValues[2] = rotationZ || 0;
    
    // Normalize rotation values to 0.0-1.0 range
    // Map from -180 to 180 degrees to 0.0 to 1.0
    normalizedRotation[0] = map(rotationValues[0], -180, 180, 0.0, 1.0);
    normalizedRotation[1] = map(rotationValues[1], -180, 180, 0.0, 1.0);
    normalizedRotation[2] = map(rotationValues[2], -180, 180, 0.0, 1.0);
    
    // Constrain to 0.0-1.0 range
    normalizedRotation[0] = constrain(normalizedRotation[0], 0.0, 1.0);
    normalizedRotation[1] = constrain(normalizedRotation[1], 0.0, 1.0);
    normalizedRotation[2] = constrain(normalizedRotation[2], 0.0, 1.0);
  }
}

// Handle touch interaction for mobile
function touchStarted() {
  // Check all sliders for touch in top section
  if (touches && touches.length >= 1) {
    for (let touch of touches) {
      if (touch && touch.y < dividerY) {
        for (let i = 0; i < 3; i++) {
          if (isSliderPressed(i, touch.x, touch.y)) {
            isDraggingSlider = i;
            updateSliderValue(i, touch.x);
            return false; // Only prevent default if we actually handled a slider
          }
        }
      }
    }
  }
  // Don't prevent default if we didn't handle the touch - this allows overlay clicks to work
}

function touchMoved() {
  // Update slider if dragging
  if (isDraggingSlider !== -1 && touches && touches.length >= 1) {
    for (let touch of touches) {
      if (touch && touch.y < dividerY) {
        updateSliderValue(isDraggingSlider, touch.x);
        return false; // Only prevent default when actively dragging
      }
    }
  }
  // Don't prevent default if we're not dragging
}

function touchEnded() {
  // Check if any touches remain in slider area
  if (isDraggingSlider !== -1) {
    let sliderTouchExists = false;
    if (touches && touches.length > 0) {
      for (let touch of touches) {
        if (touch && touch.y < dividerY && isSliderPressed(isDraggingSlider, touch.x, touch.y)) {
          sliderTouchExists = true;
          break;
        }
      }
    }
    if (!sliderTouchExists) {
      isDraggingSlider = -1;
    }
  }
  // Don't prevent default - allow other handlers to process the event
}

// Handle mouse interaction for desktop testing
function mousePressed() {
  if (mouseY < dividerY) {
    for (let i = 0; i < 3; i++) {
      if (isSliderPressed(i, mouseX, mouseY)) {
        isDraggingSlider = i;
        updateSliderValue(i, mouseX);
        return false;
      }
    }
  }
}

function mouseDragged() {
  if (isDraggingSlider !== -1) {
    updateSliderValue(isDraggingSlider, mouseX);
    return false;
  }
}

function mouseReleased() {
  isDraggingSlider = -1;
}

function updateLayout() {
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
  
  updateSliderPositions();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}

function updateOrientation() {
  currentOrientation = (width > height) ? 'landscape' : 'portrait';
}

// Called when permissions are ready
function userSetupComplete() {
  addLog('userSetupComplete() called!');
  addLog('Motion sensors should be enabled now');
  addLog('window.sensorsEnabled: ' + window.sensorsEnabled);
  addLog('Checking rotation variables:');
  addLog('rotationX type: ' + typeof rotationX + ' value: ' + rotationX);
  addLog('rotationY type: ' + typeof rotationY + ' value: ' + rotationY);
  addLog('rotationZ type: ' + typeof rotationZ + ' value: ' + rotationZ);
}