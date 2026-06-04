let shakeCount = 0;
let lastShakeTime = 0;
let statusText = 'Tap to enable motion and flashlight';

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');
  setShakeThreshold(18);
  enablePermissionsTap(['sensors', 'torch'], 'Tap to enable shake flashlight');
}

function draw() {
  background(window.torchActive ? '#fff1a8' : '#0e1117');

  const wobble = window.sensorsEnabled ? accelerationX * 4 : 0;
  noStroke();
  fill(window.torchActive ? '#151515' : '#f4f7ff');
  circle(width / 2 + wobble, height * 0.38, min(width, height) * 0.26);

  textSize(min(width * 0.08, 44));
  text(window.torchActive ? 'LIGHT ON' : 'LIGHT OFF', width / 2, height * 0.57);

  textSize(min(width * 0.04, 20));
  if (window.sensorsEnabled && window.torchEnabled) {
    statusText = 'Shake the phone to toggle';
  }
  text(statusText, width / 2, height * 0.68);

  textSize(min(width * 0.034, 16));
  text('shake count: ' + shakeCount, width / 2, height * 0.76);

  if (window.torchError) {
    fill('#ffb6b6');
    text(window.torchError, width * 0.12, height * 0.86, width * 0.76);
  }
}

async function deviceShaken() {
  if (!window.sensorsEnabled || !window.torchEnabled) {
    return;
  }

  if (millis() - lastShakeTime < 700) {
    return;
  }

  lastShakeTime = millis();
  shakeCount += 1;
  const success = await toggleTorch();
  statusText = success ? 'Shake the phone to toggle' : 'Torch toggle failed';
}

async function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
