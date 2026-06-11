let lastToggleTime = 0;
let statusText = 'Tap to enable flashlight';

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');
  enableTorchTap('Tap to enable flashlight');
}

function draw() {
  background(window.torchActive ? '#fff3a0' : '#10131a');

  fill(window.torchActive ? '#161616' : '#f5f7ff');
  noStroke();
  textSize(min(width * 0.11, 52));
  text(window.torchActive ? 'ON' : 'OFF', width / 2, height * 0.38);

  textSize(min(width * 0.045, 22));
  if (window.torchEnabled) {
    statusText = window.torchSupported ? 'Tap anywhere to toggle' : 'Tap to try toggling anyway';
  }
  text(statusText, width / 2, height * 0.55);

  textSize(min(width * 0.034, 16));
  const supportText = window.torchSupported ? 'Torch support reported' : 'Torch support not reported';
  text(supportText, width / 2, height * 0.66);

  if (window.torchError) {
    fill('#ffb1b1');
    text(window.torchError, width * 0.12, height * 0.78, width * 0.76);
  }
}

async function mousePressed() {
  if (!window.torchEnabled) {
    return false;
  }

  if (millis() - lastToggleTime < 350) {
    return false;
  }

  lastToggleTime = millis();
  const success = await toggleTorch();
  statusText = success ? 'Tap anywhere to toggle' : 'Torch toggle failed';
  return false;
}

async function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
