// Slider vs Microphone Comparison
// Shows traditional volume slider vs microphone input

// Color scheme
let backgroundColor;

// Slider properties
let sliderValue = 0.5; // Volume value (0.0-1.0)
let sliderMin = 0.0;
let sliderMax = 1.0;
let slider = {};
let isDraggingSlider = false;

// Microphone properties
let mic;
let micLevel = 0.0;

// Layout properties
let currentOrientation = 'portrait';
let topSectionHeight;
let bottomSectionHeight;
let dividerY;

// Slider dimensions
let sliderWidth = 250;
let sliderHeight = 30;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize colors
  backgroundColor = color(44, 62, 80); // Dark blue-gray
  
  // Create microphone input (this is the key - create it here first!)
  mic = new p5.AudioIn();
  
  // Enable gesture locking and microphone using the new system
  lockGestures();
  enableMicTap('Tap to enable microphone');
  
  // Calculate layout
  updateLayout();
  
  // Initialize slider position
  updateSliderPosition();
  
  console.log('Slider vs Microphone ready!');
}

function draw() {
  // Update microphone level
  updateMicLevel();
  
  // Update orientation
  updateOrientation();
  
  // Set background based on current mode
  if (window.micEnabled && mic) {
    // Use microphone for background intensity
    let intensity = micLevel * 255;
    backgroundColor = color(intensity * 0.8, intensity * 0.6, intensity * 1.0);
  } else {
    // Use slider for background intensity
    let intensity = sliderValue * 255;
    backgroundColor = color(intensity * 0.8, intensity * 0.6, intensity * 1.0);
  }
  
  background(backgroundColor);
  
  // Draw top section - slider
  drawTopSection();
  
  // Draw divider
  drawDivider();
  
  // Draw bottom section - microphone
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
  
  // Draw volume slider
  drawSlider();
  
  // Draw volume bars visualization
  drawVolumeBars(sliderValue, 80);
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
  
  // Instructions or microphone visualization
  if (window.micEnabled && mic) {
    drawMicrophoneDisplay();
  } else {
    fill(255, 255, 255, 200);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('Tap to enable microphone!', width / 2, dividerY + 80);
  }
}

function drawDivider() {
  // Draw divider line
  stroke(255, 255, 255, 100);
  strokeWeight(2);
  line(0, dividerY, width, dividerY);
  noStroke();
}

function drawSlider() {
  // Slider track
  fill(100, 100, 100);
  noStroke();
  rect(slider.x, slider.y, sliderWidth, sliderHeight, 15);
  
  // Slider fill
  fill(100, 200, 255); // Blue color
  let fillWidth = sliderValue * sliderWidth;
  rect(slider.x, slider.y, fillWidth, sliderHeight, 15);
  
  // Slider handle
  fill(255, 255, 255);
  let handleX = slider.x + (sliderValue * sliderWidth);
  circle(handleX, slider.y + sliderHeight / 2, sliderHeight + 10);
  
  // Label
  fill(255, 255, 255);
  textAlign(LEFT, CENTER);
  textSize(16);
  text('Volume', slider.x, slider.y - 20);
  
  // Value
  textAlign(RIGHT, CENTER);
  textSize(14);
  text((sliderValue * 100).toFixed(0) + '%', slider.x + sliderWidth, slider.y - 20);
}

function drawVolumeBars(level, startY) {
  let barCount = 20;
  let barWidth = Math.min(200, width - 60) / barCount;
  let barSpacing = 2;
  let maxBarHeight = 80;
  
  let centerX = width / 2;
  let totalWidth = (barWidth + barSpacing) * barCount - barSpacing;
  let startX = centerX - totalWidth / 2;
  
  for (let i = 0; i < barCount; i++) {
    let barHeight = (level * maxBarHeight) * (1 - (abs(i - barCount/2) / (barCount/2)));
    barHeight = Math.max(barHeight, 5);
    
    // Color based on position
    let hue = map(i, 0, barCount - 1, 0.3, 0.7);
    fill(hue * 255, 200, 255);
    
    let x = startX + i * (barWidth + barSpacing);
    let y = startY + maxBarHeight - barHeight;
    
    rect(x, y, barWidth, barHeight, 2);
  }
}

function drawMicrophoneDisplay() {
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textSize(18);
  
  let startY = dividerY + 80;
  
  text('Speak or make noise!', width / 2, startY);
  
  // Show microphone level
  textSize(20);
  text('Level: ' + (micLevel * 100).toFixed(0) + '%', width / 2, startY + 40);
  
  // Draw volume bars visualization for microphone
  drawVolumeBars(micLevel, startY + 80);
  
  // Draw microphone level indicator
  fill(255, 100, 100); // Red color for mic
  noStroke();
  let indicatorWidth = 200;
  let indicatorHeight = 20;
  let micFillWidth = micLevel * indicatorWidth;
  
  // Background
  fill(100, 100, 100);
  rect(width / 2 - indicatorWidth / 2, startY + 170, indicatorWidth, indicatorHeight, 10);
  
  // Fill
  fill(255, 100, 100);
  rect(width / 2 - indicatorWidth / 2, startY + 170, micFillWidth, indicatorHeight, 10);
}

function updateMicLevel() {
  if (window.micEnabled && mic) {
    let rawLevel = mic.getLevel();
    micLevel = constrain(rawLevel * 5, 0, 1); // Amplify and constrain
  }
}

// Slider helper functions
function updateSliderPosition() {
  slider = {
    x: currentOrientation === 'landscape' ? 30 : (width - sliderWidth) / 2,
    y: 70,
    width: sliderWidth,
    height: sliderHeight
  };
}

function isSliderPressed(x, y) {
  return (x >= slider.x && x <= slider.x + slider.width &&
          y >= slider.y && y <= slider.y + slider.height);
}

function updateSliderValue(x) {
  let normalizedX = (x - slider.x) / slider.width;
  normalizedX = constrain(normalizedX, 0, 1);
  
  sliderValue = map(normalizedX, 0, 1, sliderMin, sliderMax);
  sliderValue = constrain(sliderValue, sliderMin, sliderMax);
}

// Handle touch interaction for mobile
function touchStarted() {
  // Check slider for touch in top section
  if (touches && touches.length >= 1) {
    for (let touch of touches) {
      if (touch && touch.y < dividerY) {
        if (isSliderPressed(touch.x, touch.y)) {
          isDraggingSlider = true;
          updateSliderValue(touch.x);
          return false; // Only prevent default if we actually handled the slider
        }
      }
    }
  }
  // Don't prevent default if we didn't handle the touch - this allows overlay clicks to work
}

function touchMoved() {
  // Update slider if dragging
  if (isDraggingSlider && touches && touches.length >= 1) {
    for (let touch of touches) {
      if (touch && touch.y < dividerY) {
        updateSliderValue(touch.x);
        return false; // Only prevent default when actively dragging
      }
    }
  }
  // Don't prevent default if we're not dragging
}

function touchEnded() {
  // Check if any touches remain in slider area
  if (isDraggingSlider) {
    let sliderTouchExists = false;
    if (touches && touches.length > 0) {
      for (let touch of touches) {
        if (touch && touch.y < dividerY && isSliderPressed(touch.x, touch.y)) {
          sliderTouchExists = true;
          break;
        }
      }
    }
    if (!sliderTouchExists) {
      isDraggingSlider = false;
    }
  }
  // Don't prevent default - allow other handlers to process the event
}

// Handle mouse interaction for desktop testing
function mousePressed() {
  if (mouseY < dividerY) {
    if (isSliderPressed(mouseX, mouseY)) {
      isDraggingSlider = true;
      updateSliderValue(mouseX);
      return false;
    }
  }
}

function mouseDragged() {
  if (isDraggingSlider) {
    updateSliderValue(mouseX);
    return false;
  }
}

function mouseReleased() {
  isDraggingSlider = false;
}

function updateOrientation() {
  currentOrientation = (width > height) ? 'landscape' : 'portrait';
}

function updateLayout() {
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
  
  updateSliderPosition();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}

// Called when permissions are ready
function userSetupComplete() {
  console.log('Microphone enabled! You can now speak into the device.');
}