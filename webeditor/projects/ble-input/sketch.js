// BLE Input Example
// Receive a float temperature value from a BLE peripheral (notify).
// Pair with P5PhoneBLE Arduino or any device using the same profile.
// Chrome/Edge over HTTPS. iPhone/iPad: Bluefy browser.

let displayTemp = null;
let lastUpdateMs = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  bleSetup({
    namePrefix: 'p5phone',
    characteristics: [
      { name: 'temp', type: 'float', notify: true }
    ]
  });

  enableBleTap({ label: 'Tap to connect BLE sensor' });
  showDebug();
}

function draw() {
  background(18, 22, 32);
  fill(245);
  textSize(min(width * 0.05, 22));

  if (bleConnected) {
    text('Connected: ' + bleDeviceName, width / 2, height * 0.12);

    const temp = bleValues.temp ?? displayTemp;
    const hasValue = temp !== null && temp !== undefined && !Number.isNaN(temp);

    textSize(min(width * 0.14, 64));
    fill(hasValue ? '#7dd3fc' : '#94a3b8');
    text(hasValue ? nf(temp, 1, 1) + '°' : '—', width / 2, height * 0.38);

    textSize(min(width * 0.04, 18));
    fill(200);
    text('temp (float, notify)', width / 2, height * 0.48);

    if (hasValue) {
      const barHeight = map(constrain(temp, 0, 40), 0, 40, 0, height * 0.35);
      fill(56, 189, 248, 180);
      noStroke();
      rect(width * 0.15, height * 0.78 - barHeight, width * 0.7, barHeight, 8);
      stroke(148, 163, 184);
      line(width * 0.15, height * 0.78, width * 0.85, height * 0.78);
    }

    if (lastUpdateMs > 0) {
      fill(148, 163, 184);
      text('Updated ' + floor((millis() - lastUpdateMs) / 1000) + 's ago', width / 2, height * 0.88);
    }
  } else {
    text(bleStatusText(), width / 2, height * 0.42, width * 0.82);
    textSize(min(width * 0.038, 17));
    fill(148, 163, 184);
    text('Input only — phone receives temp notifications', width / 2, height * 0.56, width * 0.82);
  }
}

function bleReceive(name, value) {
  if (name === 'temp') {
    displayTemp = value;
    lastUpdateMs = millis();
    debug('temp = ' + value);
  }
}

function bleReady(deviceName) {
  debug('bleReady: ' + deviceName);
}

function bleClosed() {
  displayTemp = null;
  debug('bleClosed');
}

function bleStatusText() {
  if (window.bleError) return window.bleError;
  if (window.bleStatus === 'unsupported') {
    return 'Web Bluetooth is not available in this browser.';
  }
  return 'Tap to connect a BLE temperature sensor';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
