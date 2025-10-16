// Sliders vs Device Acceleration Comparison
// Shows traditional RGB sliders vs device acceleration control

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

// Acceleration values
let accelerationValues = [0.0, 0.0, 0.0]; // X, Y, Z acceleration
let normalizedAcceleration = [0.5, 0.5, 0.5]; // Normalized to 0.0-1.0

// Layout properties
let currentOrientation = 'portrait';
let topSectionHeight;
let bottomSectionHeight;
let dividerY;

// Slider dimensions
let sliderWidth = 250;
let sliderHeight = 30;
let sliderSpacing = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize colors
  backgroundColor = color(44, 62, 80); // Dark blue-gray
  sliderColors = [
    color(231, 76, 60),  // Red
    color(46, 204, 113), // Green
    color(52, 152, 219)  // Blue
  ];
  
  // Enable gesture locking and motion sensors
  lockGestures();
  enableGyroTap('Tap to enable device acceleration detection');
  
  // Calculate layout
  updateLayout();
  
  // Initialize slider positions
  updateSliderPositions();
  
  console.log('Sliders vs Acceleration ready!');
}

function draw() {
  // Update acceleration values
  updateAccelerationValues();
  
  // Update orientation
  updateOrientation();
  
  // Set background based on current mode
  if (window.sensorsEnabled) {
    // Use acceleration for background color
    backgroundColor = color(
      normalizedAcceleration[0] * 255, // Red from acceleration X
      normalizedAcceleration[1] * 255, // Green from acceleration Y 
      normalizedAcceleration[2] * 255  // Blue from acceleration Z
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
  
  // Draw bottom section - acceleration
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
  
  // Instructions or acceleration values
  if (window.sensorsEnabled) {
    drawAccelerationDisplay();
  } else {
    fill(255, 255, 255, 200);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('Tap to enable device acceleration!', width / 2, dividerY + 80);
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

function drawAccelerationDisplay() {
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textSize(18);
  
  let startY = dividerY + 80;
  
  text('Move or shake your device!', width / 2, startY);
  
  textSize(20);
  text('X: ' + accelerationValues[0].toFixed(1), width / 2, startY + 40);
  text('Y: ' + accelerationValues[1].toFixed(1), width / 2, startY + 70);
  text('Z: ' + accelerationValues[2].toFixed(1), width / 2, startY + 100);
  
  // Draw color preview from acceleration
  let accelerationColor = color(
    normalizedAcceleration[0] * 255,
    normalizedAcceleration[1] * 255,
    normalizedAcceleration[2] * 255
  );
  fill(accelerationColor);
  noStroke();
  rect(width / 2 - 100, startY + 130, 200, 40);
}

function updateAccelerationValues() {
  if (window.sensorsEnabled) {
    // Get acceleration values from p5.js
    accelerationValues[0] = accelerationX || 0;
    accelerationValues[1] = accelerationY || 0;
    accelerationValues[2] = accelerationZ || 0;
    
    // Normalize acceleration values to 0.0-1.0 range
    // Acceleration values typically range from -10 to +10 (in m/s²)
    // Map from -10 to +10 to 0.0 to 1.0
    normalizedAcceleration[0] = map(accelerationValues[0], -10, 10, 0.0, 1.0);
    normalizedAcceleration[1] = map(accelerationValues[1], -10, 10, 0.0, 1.0);
    normalizedAcceleration[2] = map(accelerationValues[2], -10, 10, 0.0, 1.0);
    
    // Constrain to 0.0-1.0 range
    normalizedAcceleration[0] = constrain(normalizedAcceleration[0], 0.0, 1.0);
    normalizedAcceleration[1] = constrain(normalizedAcceleration[1], 0.0, 1.0);
    normalizedAcceleration[2] = constrain(normalizedAcceleration[2], 0.0, 1.0);
  }
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

function updateOrientation() {
  currentOrientation = (width > height) ? 'landscape' : 'portrait';
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

// Called when permissions are ready
function userSetupComplete() {
  console.log('Motion sensors enabled! You can now move or shake the device.');
}