// BLE Send and Receive Example
// Pair with a P5PhoneBLE Arduino sketch (or any peripheral using the same profile).
// Requires Chrome/Edge over HTTPS. On iPhone/iPad use the Bluefy browser app.

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);

  bleSetup({
    namePrefix: 'p5phone',
    characteristics: [
      { name: 'temp', type: 'float', notify: true },
      { name: 'brightness', type: 'uint8', write: true }
    ]
  });

  enableBleButton({ label: 'Connect device' });
  showDebug();
}

function draw() {
  background(20);
  fill(255);
  textSize(20);

  if (bleConnected) {
    text('Connected: ' + bleDeviceName, width / 2, 40);
    text('temp: ' + (bleValues.temp ?? '—'), width / 2, 80);
    text('Drag horizontally to send brightness', width / 2, height / 2);
  } else {
    text(bleStatusText(), width / 2, height / 2 - 20, width - 40);
    text('Tap Connect device', width / 2, height / 2 + 30);
  }
}

function mousePressed() {
  if (bleConnected) {
    bleWrite('brightness', floor(map(mouseX, 0, width, 0, 255)));
  }
}

function bleReceive(name, value) {
  debug('bleReceive: ' + name + ' = ' + value);
}

function bleReady(deviceName) {
  debug('bleReady: ' + deviceName);
}

function bleClosed() {
  debug('bleClosed');
}

function bleStatusText() {
  if (window.bleError) {
    return window.bleError;
  }
  if (window.bleStatus === 'unsupported') {
    return 'Web Bluetooth is not available in this browser.';
  }
  return 'Tap to connect a BLE device';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
