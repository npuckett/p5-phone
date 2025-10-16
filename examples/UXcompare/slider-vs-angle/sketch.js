// Slider vs Touch Angle Comparison
// Shows traditional float slider UI vs two-touch angle measurement

// Color scheme - using proper p5.js colors
let backgroundColor, sliderColor, touchColor;

// Slider properties
let sliderValue = 0.5; // Current slider value (0.0-1.0)
let sliderMin = 0.0;
let sliderMax = 1.0;
let sliderX, sliderY;
let sliderWidth = 300;
let sliderHeight = 40;
let isDraggingSlider = false;

// Touch angle measurement
let touchAngle = 0.0; // Angle in degrees
let normalizedAngle = 0.0; // Normalized to 0.0-1.0 (0-360 degrees)

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
  
  console.log('Slider vs Angle ready!');
}

function draw() {
  background(backgroundColor);
  
  // Update orientation
  currentOrientation = (width > height) ? 'landscape' : 'portrait';
  
  // Calculate touch angle for bottom section
  calculateTouchAngle();
  
  // Draw divider line
  stroke(255, 255, 255, 100);
  strokeWeight(2);
  line(0, dividerY, width, dividerY);
  noStroke();
  
  // Draw top section - Traditional Float Slider UI
  drawTopSection();
  
  // Draw bottom section - Touch Angle Interaction
  drawBottomSection();
}

function drawTopSection() {
  // Section title
  fill(255, 255, 255);
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
  
  // Draw value bar visualization
  drawValueBar(sliderValue, topSectionHeight / 2 + 80, sliderColor);
  
  // Draw slider value text
  fill(255, 255, 255);
  textSize(20);
  let angleFromSlider = sliderValue * 360;
  let valueText = 'Slider angle: ' + angleFromSlider.toFixed(0) + '°';
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text(valueText, 30, topSectionHeight - 40);
  } else {
    textAlign(CENTER, CENTER);
    text(valueText, width / 2, topSectionHeight - 40);
  }
}

function drawBottomSection() {
  // Section title
  fill(255, 255, 255);
  textSize(24);
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text('MOBILE INTERACTION', 30, dividerY + 40);
  } else {
    textAlign(CENTER, CENTER);
    text('MOBILE INTERACTION', width / 2, dividerY + 40);
  }
  
  // Instructions
  fill(255, 255, 255, 200);
  textSize(18);
  let instructionText = getTouchInstructions();
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text(instructionText, 30, dividerY + 80);
  } else {
    textAlign(CENTER, CENTER);
    text(instructionText, width / 2, dividerY + 80);
  }
  
  // Draw value bar for angle
  drawValueBar(normalizedAngle, dividerY + (bottomSectionHeight / 2) + 40, touchColor);
  
  // Draw touch angle visualization
  drawTouchAngleVisualization();
  
  // Draw angle value text
  fill(255, 255, 255);
  textSize(20);
  let angleText = 'Touch angle: ' + touchAngle.toFixed(0) + '°';
  if (currentOrientation === 'landscape') {
    textAlign(LEFT, CENTER);
    text(angleText, 30, height - 40);
  } else {
    textAlign(CENTER, CENTER);
    text(angleText, width / 2, height - 40);
  }
}

function getTouchInstructions() {
  let bottomTouches = getBottomTouches();
  if (bottomTouches.length === 0) {
    return 'Place two fingers to measure angle!';
  } else if (bottomTouches.length === 1) {
    return 'Add a second finger!';
  } else if (bottomTouches.length === 2) {
    return 'Rotate fingers to change angle!';
  } else {
    return 'Too many fingers - use only 2!';
  }
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
  
  // Slider handle shadow
  fill(0, 0, 0, 50);
  circle(handleX + 2, sliderY + sliderHeight / 2 + 2, 35);
  
  // Slider handle
  fill(255, 255, 255);
  if (isDraggingSlider) {
    fill(255, 255, 0); // Yellow when dragging
  }
  circle(handleX, sliderY + sliderHeight / 2, 35);
  
  // Handle indicator
  fill(sliderColor);
  circle(handleX, sliderY + sliderHeight / 2, 15);
}

function drawValueBar(value, yPos, barColor) {
  // Draw a horizontal bar representing the value (0.0-1.0)
  let barWidth = min(300, width - 120);
  let barHeight = 30;
  let barX = width / 2 - barWidth / 2;
  
  if (currentOrientation === 'landscape') {
    barX = width / 2 - barWidth / 2 + 25; // Slight offset for landscape
  }
  
  // Background bar
  fill(255, 255, 255, 100);
  rect(barX, yPos - barHeight / 2, barWidth, barHeight, barHeight / 2);
  
  // Value fill
  let fillWidth = value * barWidth;
  fill(barColor);
  rect(barX, yPos - barHeight / 2, fillWidth, barHeight, barHeight / 2);
  
  // Value text on bar (showing degrees)
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text((value * 360).toFixed(0) + '°', barX + barWidth / 2, yPos);
}

function drawTouchAngleVisualization() {
  let bottomTouches = getBottomTouches();
  
  if (bottomTouches.length >= 2) {
    // Draw angle visualization between first two touches
    let touch1 = bottomTouches[0];
    let touch2 = bottomTouches[1];
    
    // Connection line
    stroke(touchColor);
    strokeWeight(3);
    line(touch1.x, touch1.y, touch2.x, touch2.y);
    
    // Calculate midpoint for angle arc
    let midX = (touch1.x + touch2.x) / 2;
    let midY = (touch1.y + touch2.y) / 2;
    
    // Draw angle arc
    stroke(255, 255, 0); // Yellow for angle indicator
    strokeWeight(2);
    noFill();
    let arcRadius = 60;
    
    // Calculate angle from horizontal (right direction = 0°)
    let angleRad = atan2(touch2.y - touch1.y, touch2.x - touch1.x);
    
    // Draw reference line (horizontal)
    stroke(255, 255, 255, 100);
    strokeWeight(1);
    line(midX - 40, midY, midX + 40, midY);
    
    // Draw angle arc from horizontal to the line
    stroke(255, 255, 0);
    strokeWeight(2);
    if (angleRad >= 0) {
      arc(midX, midY, arcRadius, arcRadius, 0, angleRad);
    } else {
      arc(midX, midY, arcRadius, arcRadius, angleRad, 0);
    }
    
    // Touch points
    fill(touchColor);
    noStroke();
    circle(touch1.x, touch1.y, 40);
    circle(touch2.x, touch2.y, 40);
    
    // Touch numbers
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('1', touch1.x, touch1.y);
    text('2', touch2.x, touch2.y);
    
    // Angle text near midpoint
    fill(0, 0, 0, 150);
    let angleText = Math.round(touchAngle) + '°';
    textSize(14);
    let textW = textWidth(angleText) + 10;
    rect(midX - textW / 2, midY - 35, textW, 20, 5);
    
    // Angle text
    fill(255, 255, 0);
    text(angleText, midX, midY - 25);
    
  } else {
    // Draw all touches in bottom section
    for (let i = 0; i < bottomTouches.length; i++) {
      let touch = bottomTouches[i];
      fill(touchColor);
      noStroke();
      circle(touch.x, touch.y, 40);
      
      fill(255, 255, 255);
      textAlign(CENTER, CENTER);
      textSize(18);
      text(i + 1, touch.x, touch.y);
    }
  }
}

function getBottomTouches() {
  let bottomTouches = [];
  if (touches && touches.length > 0) {
    for (let touch of touches) {
      if (touch && typeof touch.x === 'number' && typeof touch.y === 'number' && touch.y > dividerY) {
        bottomTouches.push(touch);
      }
    }
  }
  return bottomTouches;
}

function calculateTouchAngle() {
  let bottomTouches = getBottomTouches();
  
  if (bottomTouches.length >= 2) {
    let touch1 = bottomTouches[0];
    let touch2 = bottomTouches[1];
    
    // Calculate angle in radians, then convert to degrees
    let angleRad = atan2(touch2.y - touch1.y, touch2.x - touch1.x);
    touchAngle = degrees(angleRad);
    
    // Normalize to 0-360 degrees
    if (touchAngle < 0) {
      touchAngle += 360;
    }
    
    // Normalize to 0.0-1.0 range
    normalizedAngle = touchAngle / 360.0;
  } else {
    touchAngle = 0.0;
    normalizedAngle = 0.0;
  }
}

function isSliderPressed(x, y) {
  return x >= sliderX && 
         x <= sliderX + sliderWidth &&
         y >= sliderY - 20 && 
         y <= sliderY + sliderHeight + 20 &&
         y < dividerY;
}

function updateSliderValueFromTouch(x) {
  let newValue = map(x, sliderX, sliderX + sliderWidth, sliderMin, sliderMax);
  newValue = constrain(newValue, sliderMin, sliderMax);
  sliderValue = newValue;
  
  console.log('Slider angle:', (sliderValue * 360).toFixed(1) + '°');
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

function updateLayout() {
  topSectionHeight = height * 0.5;
  bottomSectionHeight = height * 0.5;
  dividerY = height * 0.5;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}