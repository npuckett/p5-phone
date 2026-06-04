let discoRunning = false;
let lastPulseTime = 0;
let pulseStartedAt = 0;
let pulseActive = false;
let colorIndex = 0;
let statusText = 'Tap to enable flashlight and vibration';

const colors = ['#ff5c7a', '#36d1dc', '#fff06a', '#8b7cff', '#62e88b'];
const pulseInterval = 950;
const torchPulseLength = 160;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');
  enablePermissionsTap(['torch', 'vibration'], 'Tap to enable disco hardware');
}

function draw() {
  const baseColor = discoRunning ? colors[colorIndex] : '#14151c';
  background(baseColor);

  if (window.torchEnabled && discoRunning) {
    runDiscoPulse();
  }

  drawDiscoScreen();
}

function runDiscoPulse() {
  const now = millis();

  if (!pulseActive && now - lastPulseTime >= pulseInterval) {
    pulseActive = true;
    pulseStartedAt = now;
    lastPulseTime = now;
    colorIndex = (colorIndex + 1) % colors.length;
    torchOn();

    if (window.vibrationEnabled) {
      vibrate(45);
    }
  }

  if (pulseActive && now - pulseStartedAt >= torchPulseLength) {
    pulseActive = false;
    torchOff();
  }
}

function drawDiscoScreen() {
  noStroke();
  fill(255, discoRunning ? 230 : 245);
  circle(width * 0.5, height * 0.42, min(width, height) * 0.34);

  fill(discoRunning ? '#111111' : '#f4f5fa');
  textSize(min(width * 0.09, 48));
  text(discoRunning ? 'DISCO ON' : 'DISCO OFF', width / 2, height * 0.4);

  fill(discoRunning ? '#111111' : '#cbd2df');
  textSize(min(width * 0.042, 20));
  if (window.torchEnabled) {
    statusText = 'Tap anywhere to start or stop';
  }
  text(statusText, width / 2, height * 0.62);

  textSize(min(width * 0.032, 15));
  const vibrationStatus = window.vibrationEnabled ? 'vibration ready' : 'vibration unavailable';
  const torchStatus = window.torchActive ? 'flashlight on' : 'flashlight off';
  text(torchStatus + ' / ' + vibrationStatus, width / 2, height * 0.72);

  if (window.torchError) {
    fill('#ffd2d2');
    text(window.torchError, width * 0.12, height * 0.84, width * 0.76);
  }
}

async function mousePressed() {
  if (!window.torchEnabled) {
    return false;
  }

  discoRunning = !discoRunning;

  if (!discoRunning) {
    pulseActive = false;
    await torchOff();
    stopVibration();
  } else {
    lastPulseTime = millis() - pulseInterval;
  }

  return false;
}

async function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
