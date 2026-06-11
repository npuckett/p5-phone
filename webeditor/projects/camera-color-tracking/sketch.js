let cam;
let targetColor = { red: 54, green: 209, blue: 122 };
let averageColor = { red: 0, green: 0, blue: 0 };
let tolerance = 80;
let matchDistance = 0;
let isMatch = false;
let captureFlash = 0;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('environment', false, 'cover');
  enableCameraTap('Tap to enable camera');
}

function draw() {
  background('#101318');
  const bounds = getSampleBounds();

  if (cam && cam.ready) {
    image(cam, 0, 0, width, height);
    averageColor = averageSample(bounds);
    matchDistance = colorDistance(averageColor, targetColor);
    isMatch = matchDistance <= tolerance;
    drawTracker(bounds);
  } else {
    drawWaiting(bounds);
  }

  captureFlash = max(0, captureFlash - 10);
}

function mousePressed() {
  if (!window.cameraEnabled || !cam || !cam.ready) {
    return false;
  }

  const bounds = getSampleBounds();
  if (pointInsideSample(mouseX, mouseY, bounds)) {
    useCurrentColorAsTarget();
  }

  return false;
}

function useCurrentColorAsTarget() {
  targetColor = {
    red: averageColor.red,
    green: averageColor.green,
    blue: averageColor.blue
  };
  captureFlash = 180;
}

function getSampleBounds() {
  const size = Math.min(width * 0.42, height * 0.28, 190);
  return {
    x: width / 2 - size / 2,
    y: height * 0.43 - size / 2,
    size: size
  };
}

function averageSample(bounds) {
  loadPixels();
  const step = max(1, floor(bounds.size / 42));
  const startX = max(0, floor(bounds.x));
  const endX = min(width - 1, floor(bounds.x + bounds.size));
  const startY = max(0, floor(bounds.y));
  const endY = min(height - 1, floor(bounds.y + bounds.size));
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;
  let count = 0;

  for (let sampleY = startY; sampleY <= endY; sampleY += step) {
    for (let sampleX = startX; sampleX <= endX; sampleX += step) {
      const index = 4 * (sampleY * width + sampleX);
      totalRed += pixels[index];
      totalGreen += pixels[index + 1];
      totalBlue += pixels[index + 2];
      count += 1;
    }
  }

  if (count === 0) {
    return averageColor;
  }

  return {
    red: totalRed / count,
    green: totalGreen / count,
    blue: totalBlue / count
  };
}

function drawTracker(bounds) {
  const matchColor = isMatch ? '#65e697' : '#ff7474';
  const label = isMatch ? 'MATCH' : 'NO MATCH';

  drawStatusPanel(label, matchColor);

  noFill();
  stroke(matchColor);
  strokeWeight(4);
  rect(bounds.x, bounds.y, bounds.size, bounds.size, 5);

  stroke(255, 210 + captureFlash * 0.25);
  strokeWeight(1);
  rect(bounds.x + 8, bounds.y + 8, bounds.size - 16, bounds.size - 16, 3);

  if (captureFlash > 0) {
    noStroke();
    fill(255, captureFlash);
    rect(bounds.x, bounds.y, bounds.size, bounds.size, 5);
  }

  fill('#f7f8fb');
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(Math.min(width * 0.036, 16));
  text('tap square to set target', width / 2, bounds.y + bounds.size + 28);
}

function drawStatusPanel(label, matchColor) {
  const panelWidth = Math.min(width - 24, 430);
  const panelX = (width - panelWidth) / 2;
  const panelY = 14;

  noStroke();
  fill(10, 13, 18, 205);
  rect(panelX, panelY, panelWidth, 118, 8);

  fill(matchColor);
  textAlign(CENTER, CENTER);
  textSize(Math.min(width * 0.07, 32));
  textStyle(BOLD);
  text(label, width / 2, panelY + 30);

  fill('#f7f8fb');
  textStyle(NORMAL);
  textSize(Math.min(width * 0.036, 16));
  text('distance ' + round(matchDistance) + ' / tolerance ' + tolerance, width / 2, panelY + 58);

  drawSwatch(panelX + panelWidth * 0.28, panelY + 88, targetColor, 'target');
  drawSwatch(panelX + panelWidth * 0.72, panelY + 88, averageColor, 'average');
}

function drawSwatch(x, y, swatchColor, label) {
  fill(swatchColor.red, swatchColor.green, swatchColor.blue);
  stroke(255, 210);
  strokeWeight(2);
  rect(x - 34, y - 15, 30, 30, 5);

  noStroke();
  fill('#f7f8fb');
  textAlign(LEFT, CENTER);
  textSize(Math.min(width * 0.032, 14));
  text(label, x + 3, y);
}

function drawWaiting(bounds) {
  const pulse = 80 + sin(frameCount * 0.045) * 28;
  noStroke();
  fill(26, 31, 40);
  rect(bounds.x, bounds.y, bounds.size, bounds.size, 5);
  stroke(255, pulse);
  strokeWeight(3);
  noFill();
  rect(bounds.x, bounds.y, bounds.size, bounds.size, 5);

  matchDistance = colorDistance(averageColor, targetColor);
  isMatch = false;
  drawStatusPanel('CAMERA WAITING', '#dbe7ff');
}

function pointInsideSample(x, y, bounds) {
  return x >= bounds.x &&
    x <= bounds.x + bounds.size &&
    y >= bounds.y &&
    y <= bounds.y + bounds.size;
}

function colorDistance(firstColor, secondColor) {
  const redDifference = firstColor.red - secondColor.red;
  const greenDifference = firstColor.green - secondColor.green;
  const blueDifference = firstColor.blue - secondColor.blue;
  return Math.sqrt(
    redDifference * redDifference +
    greenDifference * greenDifference +
    blueDifference * blueDifference
  );
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}