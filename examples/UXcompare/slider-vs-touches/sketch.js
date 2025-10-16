// Slider vs Touches Comparison
// Shows traditional slider UI vs multi-touch finger counting

// Color scheme - using proper p5.js colors
let backgroundColor, sliderColor, touchColor;

// Slider properties
let sliderValue = 0; // Current slider value (0-10)
let sliderMin = 0;
let sliderMax = 10;
let sliderX, sliderY;
let sliderWidth = 300;
let sliderHeight = 40;
let isDraggingSlider = false;

// Touch counting
let currentTouchCount = 0;
let maxTouchCount = 10; // Maximum touches to display

// Visual elements
let circleSize = 60;
let circleSpacing = 80;

// Layout properties
let topSectionHeight;
let bottomSectionHeight;
let dividerY;
let currentOrientation = 'portrait';

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize colors properly
  backgroundColor = color(44, 62, 80); // Dark blue-gray
  sliderColor = color(52, 152, 219); // Blue
  touchColor = color(231, 76, 60); // Red
  
  // Only call lockGestures if it exists
  if (typeof lockGestures === 'function') {
    lockGestures();
  }
  
  // Calculate layout
  updateLayout();
  
  textAlign(CENTER, CENTER);
  noStroke();
  
  console.log('Slider vs Touches ready!');
}

function draw() {
  background(backgroundColor);
  
  // Update orientation
  currentOrientation = (width > height) ? 'landscape' : 'portrait';
  
  // Count touches only in bottom section
  let bottomTouches = 0;
  if (touches && touches.length > 0) {
    for (let touch of touches) {
      if (touch && touch.y > dividerY) {
        bottomTouches++;
      }
    }
  }
  currentTouchCount = bottomTouches;
  
  // Draw divider line
  stroke(255, 255, 255, 100);
  strokeWeight(2);
  line(0, dividerY, width, dividerY);
  noStroke();
  
  // Draw top section - Traditional Slider UI
  drawTopSection();
  
  // Draw bottom section - Multi-touch Interaction
  drawBottomSection();
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
  
  // Draw slider
  drawSlider();
  
  // Draw value circles for slider
  drawValueCircles(sliderValue, topSectionHeight / 2 + 80, sliderColor);
  
  // Draw slider value text
  fill(255);
  textSize(20);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('Slider value: ' + sliderValue, 30, topSectionHeight - 40);
  } else {
    textAlign(CENTER, CENTER);
    text('Slider value: ' + sliderValue, width / 2, topSectionHeight - 40);
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
  
  // Instructions
  fill(255);
  textSize(18);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('Touch screen with multiple fingers!', 30, dividerY + 80);
  } else {
    textAlign(CENTER, CENTER);
    text('Touch screen with multiple fingers!', width / 2, dividerY + 80);
  }
  
  // Draw value circles for touches
  drawValueCircles(currentTouchCount, dividerY + (bottomSectionHeight / 2) + 40, touchColor);
  
  // Draw touch count text
  fill(255);
  textSize(20);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('Touch count: ' + currentTouchCount, 30, height - 40);
  } else {
    textAlign(CENTER, CENTER);
    text('Touch count: ' + currentTouchCount, width / 2, height - 40);
  }
  
  // Draw actual touch points
  drawTouchPoints();
}

function drawSlider() {
  // Position slider in center of top section
  sliderY = topSectionHeight / 2 - sliderHeight / 2;
  
  if (currentOrientation === 'landscape') {
    sliderX = width / 2 - sliderWidth / 2 + 50; // Offset right to avoid left text
  } else {
    sliderX = width / 2 - sliderWidth / 2;
  }
  
  // Slider track (background)
  fill(255, 255, 255, 100);
  rect(sliderX, sliderY, sliderWidth, sliderHeight, sliderHeight / 2);
  
  // Calculate slider handle position
  let handleX = map(sliderValue, sliderMin, sliderMax, sliderX + 20, sliderX + sliderWidth - 20);
  
  // Slider fill (shows progress)
  fill(sliderColor);
  rect(sliderX, sliderY, handleX - sliderX + 20, sliderHeight, sliderHeight / 2);
  
  // Slider handle
  fill(255);
  if (isDraggingSlider) {
    fill(255, 255, 0); // Yellow when dragging
  }
  
  // Handle shadow
  fill(0, 0, 0, 50);
  circle(handleX + 2, sliderY + sliderHeight / 2 + 2, 30);
  
  // Handle
  if (isDraggingSlider) {
    fill(255, 255, 0);
  } else {
    fill(255);
  }
  circle(handleX, sliderY + sliderHeight / 2, 30);
  
  // Handle indicator
  fill(sliderColor);
  circle(handleX, sliderY + sliderHeight / 2, 12);
}

function drawValueCircles(value, yPos, color) {
  // Draw circles representing the current value (0-10)
  let totalWidth = min(maxTouchCount * circleSpacing, width - 60);
  let startX = width / 2 - totalWidth / 2;
  
  if (currentOrientation === 'landscape') {
    startX = width / 2 - totalWidth / 2 + 25; // Slight offset for landscape
  }
  
  for (let i = 0; i < maxTouchCount; i++) {
    let x = startX + i * (totalWidth / maxTouchCount) + (totalWidth / maxTouchCount) / 2;
    
    if (i < value) {
      // Filled circle
      fill(color);
      circle(x, yPos, circleSize);
      
      // Inner highlight
      fill(255, 255, 255, 100);
      circle(x, yPos, circleSize * 0.6);
    } else {
      // Empty circle
      fill(255, 255, 255, 50);
      circle(x, yPos, circleSize);
      
      // Border
      stroke(255, 255, 255, 100);
      strokeWeight(2);
      noFill();
      circle(x, yPos, circleSize);
      noStroke();
    }
  }
}

function drawTouchPoints() {
  // Draw visual indicators for touches in bottom section only
  if (touches && touches.length > 0) {
    stroke(touchColor);
    strokeWeight(4);
    fill(red(touchColor), green(touchColor), blue(touchColor), 100);
    
    let touchIndex = 1;
    for (let i = 0; i < touches.length; i++) {
      let touch = touches[i];
      
      // Only draw touches in bottom section
      if (touch && typeof touch.x === 'number' && typeof touch.y === 'number' && touch.y > dividerY) {
        // Touch circle
        circle(touch.x, touch.y, 40);
        
        // Touch number
        fill(255, 255, 255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(touchIndex, touch.x, touch.y);
        
        // Ripple effect
        noFill();
        stroke(red(touchColor), green(touchColor), blue(touchColor), 100);
        strokeWeight(2);
        circle(touch.x, touch.y, 60);
        circle(touch.x, touch.y, 80);
        
        fill(red(touchColor), green(touchColor), blue(touchColor), 100);
        stroke(touchColor);
        strokeWeight(4);
        
        touchIndex++;
      }
    }
    
    noStroke();
  } else {
    // Show instruction when no touches in bottom section
    fill(255, 150);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Place fingers in this area', width / 2, dividerY + (bottomSectionHeight / 2) + 120);
  }
}

function isSliderPressed(touchX, touchY) {
  // More generous slider interaction area, but only in top section
  return touchX >= sliderX && 
         touchX <= sliderX + sliderWidth &&
         touchY >= sliderY - 20 && 
         touchY <= sliderY + sliderHeight + 20 &&
         touchY < dividerY; // Make sure it's in the top section
}

// Handle touch interaction for mobile
function touchStarted() {
  // Handle slider interaction only for touches in top section
  if (touches && touches.length >= 1) {
    for (let touch of touches) {
      if (touch && touch.y < dividerY && isSliderPressed(touch.x, touch.y)) {
        isDraggingSlider = true;
        updateSliderValueFromTouch(touch.x);
        break;
      }
    }
  }
  return false; // Always prevent default
}

function touchMoved() {
  // Update slider if dragging and touch is in top section
  if (isDraggingSlider && touches && touches.length >= 1) {
    for (let touch of touches) {
      if (touch && touch.y < dividerY) {
        updateSliderValueFromTouch(touch.x);
        break;
      }
    }
  }
  return false; // Always prevent default
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
  return false; // Always prevent default
}

// Handle mouse interaction for desktop testing
function mousePressed() {
  // Check slider press for desktop testing
  if (isSliderPressed(mouseX, mouseY)) {
    isDraggingSlider = true;
    updateSliderValueFromTouch(mouseX);
    return false;
  }
}

function mouseDragged() {
  if (isDraggingSlider) {
    updateSliderValueFromTouch(mouseX);
    return false;
  }
}

function mouseReleased() {
  isDraggingSlider = false;
}

function updateSliderValueFromTouch(x) {
  // Calculate new slider value based on touch position
  let newValue = map(x, sliderX, sliderX + sliderWidth, sliderMin, sliderMax);
  newValue = constrain(newValue, sliderMin, sliderMax);
  sliderValue = round(newValue);
  
  console.log('Slider value:', sliderValue);
}

function updateLayout() {
  // Calculate layout
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
}

// Handle screen rotation
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}