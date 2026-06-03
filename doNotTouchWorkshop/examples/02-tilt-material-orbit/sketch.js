let tiltX = 0;
let tiltY = 0;
let tiltZ = 0;
let orbitRadius = 120;
let orbitSpeed = 0.01;
let orbitAngle = 0;
let materialPoints = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableSensorTap('Tap to enable motion sensors');

  for (let index = 0; index < 12; index += 1) {
    materialPoints.push({
      offset: (TWO_PI / 12) * index,
      size: random(18, 54),
      wobble: random(0.4, 1.4)
    });
  }
}

function draw() {
  updateTiltValues();
  background(247, 247, 244);
  translate(width / 2, height / 2);
  rotate(radians(tiltZ) * 0.25);

  stroke(31);
  strokeWeight(2);
  noFill();
  circle(0, 0, orbitRadius * 2);

  noStroke();
  for (let point of materialPoints) {
    let angle = orbitAngle + point.offset;
    let radius = orbitRadius + sin(frameCount * 0.03 + point.offset) * tiltX * point.wobble;
    let x = cos(angle) * radius + tiltY * 2.5;
    let y = sin(angle) * radius + tiltX * 2.5;
    fill(236, 203, 214, 210);
    rectMode(CENTER);
    push();
    translate(x, y);
    rotate(angle + radians(tiltZ));
    rect(0, 0, point.size * 1.6, point.size, 4);
    pop();
  }

  orbitAngle += orbitSpeed;
  drawReadout();
}

function updateTiltValues() {
  if (window.sensorsEnabled) {
    tiltX = lerp(tiltX, rotationX || 0, 0.14);
    tiltY = lerp(tiltY, rotationY || 0, 0.14);
    tiltZ = lerp(tiltZ, rotationZ || 0, 0.14);
  }

  orbitRadius = map(constrain(abs(tiltY), 0, 70), 0, 70, min(width, height) * 0.16, min(width, height) * 0.42);
  orbitSpeed = map(constrain(abs(tiltX), 0, 80), 0, 80, 0.004, 0.055);
}

function drawReadout() {
  resetMatrix();
  fill(23);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  if (window.sensorsEnabled) {
    text('tiltX: ' + nf(tiltX, 1, 1) + '\ntiltY: ' + nf(tiltY, 1, 1) + '\ntiltZ: ' + nf(tiltZ, 1, 1), 18, 18);
  } else {
    textAlign(CENTER, CENTER);
    text('Tap once to enable motion sensors', width / 2, height / 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}