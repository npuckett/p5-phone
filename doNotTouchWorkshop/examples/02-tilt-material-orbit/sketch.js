let tiltX = 0;
let tiltY = 0;
let tiltZ = 0;
let tiltAmountX = 0;
let tiltAmountY = 0;
let tiltAmountZ = 0;
let orbitRadius = 120;
let orbitSpeed = 0.2;
let orbitAngle = 0;
let materialPoints = [];
const tiltRange = 35;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  lockGestures();
  enableSensorTap('Tap to enable motion sensors');

  for (let index = 0; index < 12; index += 1) {
    materialPoints.push({
      offset: (360 / 12) * index,
      size: random(18, 54),
      wobble: random(0.4, 1.4)
    });
  }
}

function draw() {
  updateTiltValues();
  background(247, 247, 244);
  translate(width / 2, height / 2);
  rotate(tiltAmountZ * 18);

  stroke(31);
  strokeWeight(2);
  noFill();
  circle(0, 0, orbitRadius * 2);

  noStroke();
  for (let point of materialPoints) {
    let angle = orbitAngle + point.offset;
    let radius = orbitRadius + sin(frameCount * 1.4 + point.offset) * tiltAmountX * 90 * point.wobble;
    let x = cos(angle) * radius + tiltAmountY * min(width, height) * 0.18;
    let y = sin(angle) * radius + tiltAmountX * min(width, height) * 0.18;
    fill(236, 203, 214, 210);
    rectMode(CENTER);
    push();
    translate(x, y);
    rotate(angle + tiltAmountZ * 45);
    rect(0, 0, point.size * 1.6, point.size, 4);
    pop();
  }

  orbitAngle += orbitSpeed;
  drawReadout();
}

function updateTiltValues() {
  if (window.sensorsEnabled) {
    tiltX = lerp(tiltX, rotationX || 0, 0.3);
    tiltY = lerp(tiltY, rotationY || 0, 0.3);
    tiltZ = lerp(tiltZ, rotationZ || 0, 0.3);
  }

  tiltAmountX = constrain(map(tiltX, -tiltRange, tiltRange, -1, 1), -1, 1);
  tiltAmountY = constrain(map(tiltY, -tiltRange, tiltRange, -1, 1), -1, 1);
  tiltAmountZ = constrain(map(tiltZ, -tiltRange, tiltRange, -1, 1), -1, 1);

  orbitRadius = map(abs(tiltAmountY), 0, 1, min(width, height) * 0.16, min(width, height) * 0.46);
  orbitSpeed = map(abs(tiltAmountX), 0, 1, 0.2, 3.2);
}

function drawReadout() {
  resetMatrix();
  fill(23);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  if (window.sensorsEnabled) {
    text('tiltX: ' + nf(tiltX, 1, 1) + '°\ntiltY: ' + nf(tiltY, 1, 1) + '°\ntiltZ: ' + nf(tiltZ, 1, 1) + '°\nresponseX: ' + nf(tiltAmountX, 1, 2) + '\nresponseY: ' + nf(tiltAmountY, 1, 2), 18, 18);
  } else {
    textAlign(CENTER, CENTER);
    text('Tap once to enable motion sensors', width / 2, height / 2);
  }
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}