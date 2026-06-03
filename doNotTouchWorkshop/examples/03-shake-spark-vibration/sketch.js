let shakeCount = 0;
let movementStrength = 0;
let sparkParticles = [];
let canVibrate = false;
let previousAcceleration = { x: 0, y: 0, z: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  setShakeThreshold(12);
  enablePermissionsTap(['sensors', 'vibration'], 'Tap to enable motion and vibration');
}

function draw() {
  updateMovementValues();
  background(23, 23, 23, 54);
  updateSparks();
  drawSparks();
  drawReadout();
}

function updateMovementValues() {
  canVibrate = Boolean(window.vibrationEnabled && navigator.vibrate);

  if (!window.sensorsEnabled) {
    movementStrength = lerp(movementStrength, 0, 0.1);
    return;
  }

  let deltaX = (accelerationX || 0) - previousAcceleration.x;
  let deltaY = (accelerationY || 0) - previousAcceleration.y;
  let deltaZ = (accelerationZ || 0) - previousAcceleration.z;
  movementStrength = lerp(movementStrength, sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ), 0.25);

  previousAcceleration.x = accelerationX || 0;
  previousAcceleration.y = accelerationY || 0;
  previousAcceleration.z = accelerationZ || 0;
}

function deviceShaken() {
  shakeCount += 1;
  burstSparks(width / 2, height / 2, 46);
  if (canVibrate) vibrate([30, 30, 60]);
}

function burstSparks(x, y, amount) {
  for (let index = 0; index < amount; index += 1) {
    sparkParticles.push({ x, y, vx: random(-7, 7), vy: random(-9, 5), life: random(42, 86), size: random(4, 14) });
  }
}

function updateSparks() {
  if (window.sensorsEnabled && movementStrength > 5 && frameCount % 4 === 0) {
    burstSparks(width / 2 + random(-60, 60), height / 2 + random(-60, 60), 4);
  }

  for (let particle of sparkParticles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.16;
    particle.life -= 1;
  }

  sparkParticles = sparkParticles.filter(particle => particle.life > 0);
}

function drawSparks() {
  noStroke();
  for (let particle of sparkParticles) {
    fill(211, 155, 31, map(particle.life, 0, 86, 0, 230));
    circle(particle.x, particle.y, particle.size);
  }
}

function drawReadout() {
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  if (!window.sensorsEnabled) {
    text('Tap once to enable motion', width / 2, height / 2);
    return;
  }
  text('shakeCount: ' + shakeCount + '\nmovementStrength: ' + nf(movementStrength, 1, 2) + '\nvibration: ' + (canVibrate ? 'available' : 'not available'), width / 2, height * 0.18);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}