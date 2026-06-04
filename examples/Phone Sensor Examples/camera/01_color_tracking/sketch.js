let cam;
let controls;
let targetInput;
let toleranceInput;
let toleranceReadout;
let averageColor = { red: 0, green: 0, blue: 0 };
let currentTolerance = 80;
let matchDistance = 0;
let isMatch = false;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('environment', false, 'cover');
  createControls();
  enableCameraTap('Tap to enable camera');
}

function draw() {
  background('#101318');
  const bounds = getSampleBounds();
  const targetColor = hexToRgb(targetInput.value);
  currentTolerance = Number(toleranceInput.value);
  toleranceReadout.textContent = currentTolerance;

  if (cam && cam.ready) {
    image(cam, 0, 0, width, height);
    averageColor = averageSample(bounds);
    matchDistance = colorDistance(averageColor, targetColor);
    isMatch = matchDistance <= currentTolerance;
    drawTracker(bounds, targetColor);
  } else {
    drawWaiting(bounds, targetColor);
  }
}

function createControls() {
  controls = document.createElement('div');
  controls.id = 'tracker-controls';

  const colorLabel = document.createElement('label');
  colorLabel.textContent = 'Target';
  targetInput = document.createElement('input');
  targetInput.id = 'target-color';
  targetInput.type = 'color';
  targetInput.value = '#36d17a';
  colorLabel.appendChild(targetInput);
  colorLabel.appendChild(document.createElement('span'));

  const toleranceLabel = document.createElement('label');
  toleranceLabel.textContent = 'Tolerance';
  toleranceInput = document.createElement('input');
  toleranceInput.id = 'tolerance';
  toleranceInput.type = 'range';
  toleranceInput.min = '0';
  toleranceInput.max = '220';
  toleranceInput.step = '1';
  toleranceInput.value = String(currentTolerance);
  toleranceReadout = document.createElement('span');
  toleranceReadout.id = 'tolerance-readout';
  toleranceReadout.textContent = String(currentTolerance);
  toleranceLabel.appendChild(toleranceInput);
  toleranceLabel.appendChild(toleranceReadout);

  const useAverageButton = document.createElement('button');
  useAverageButton.id = 'use-average';
  useAverageButton.type = 'button';
  useAverageButton.textContent = 'Use average';
  useAverageButton.addEventListener('click', () => {
    targetInput.value = rgbToHex(averageColor);
  });

  controls.appendChild(colorLabel);
  controls.appendChild(toleranceLabel);
  controls.appendChild(useAverageButton);
  document.body.appendChild(controls);
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

function drawTracker(bounds, targetColor) {
  const matchColor = isMatch ? '#65e697' : '#ff7474';
  const label = isMatch ? 'MATCH' : 'NO MATCH';

  drawStatusPanel(label, matchColor, targetColor);

  noFill();
  stroke(matchColor);
  strokeWeight(4);
  rect(bounds.x, bounds.y, bounds.size, bounds.size, 5);

  stroke(255, 210);
  strokeWeight(1);
  rect(bounds.x + 8, bounds.y + 8, bounds.size - 16, bounds.size - 16, 3);
}

function drawStatusPanel(label, matchColor, targetColor) {
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
  text('distance ' + round(matchDistance) + ' / tolerance ' + currentTolerance, width / 2, panelY + 58);

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

function drawWaiting(bounds, targetColor) {
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
  drawStatusPanel('CAMERA WAITING', '#dbe7ff', targetColor);
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

function hexToRgb(hexValue) {
  const cleanHex = hexValue.replace('#', '');
  const numberValue = parseInt(cleanHex, 16);
  return {
    red: (numberValue >> 16) & 255,
    green: (numberValue >> 8) & 255,
    blue: numberValue & 255
  };
}

function rgbToHex(rgbColor) {
  const red = constrain(round(rgbColor.red), 0, 255).toString(16).padStart(2, '0');
  const green = constrain(round(rgbColor.green), 0, 255).toString(16).padStart(2, '0');
  const blue = constrain(round(rgbColor.blue), 0, 255).toString(16).padStart(2, '0');
  return '#' + red + green + blue;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}