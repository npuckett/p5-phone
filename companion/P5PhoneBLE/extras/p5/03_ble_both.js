// p5 sketch — pairs with Arduino example 05_P5Phone_Both.
//
// Bidirectional: receives "temp" (notify) and writes "brightness" (uint8) on
// one connection. The Arduino sends temp and dims an LED from brightness.
// Install p5-phone, paste into sketch.js, run on Chrome/Edge over HTTPS
// (iPhone/iPad: Bluefy browser).
//
// (Copied verbatim from p5-phone examples/Phone Sensor Examples/ble/03_ble_both.)

let previewLevel = 128;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');

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
  textSize(min(width * 0.05, 22));

  if (bleConnected) {
    text('Connected: ' + bleDeviceName, width / 2, height * 0.1);
    textSize(min(width * 0.04, 18));
    text('temp: ' + (bleValues.temp ?? '—'), width / 2, height * 0.22);
    text('brightness out: ' + previewLevel, width / 2, height * 0.3);
    textSize(min(width * 0.045, 20));
    text('Drag horizontally to send brightness', width / 2, height * 0.5, width * 0.85);
    text('Temperature updates arrive via bleReceive()', width / 2, height * 0.58, width * 0.85);
  } else {
    text(bleStatusText(), width / 2, height * 0.44, width * 0.82);
    textSize(min(width * 0.038, 17));
    fill(180);
    text('Both directions — receive temp, send brightness', width / 2, height * 0.56, width * 0.82);
  }
}

function mouseDragged() {
  if (!bleConnected) return false;
  sendBrightness(floor(map(mouseX, 0, width, 0, 255)));
  return false;
}

function mousePressed() {
  if (!bleConnected) return false;
  sendBrightness(floor(map(mouseX, 0, width, 0, 255)));
  return false;
}

function sendBrightness(value) {
  previewLevel = constrain(value, 0, 255);
  bleWrite('brightness', previewLevel);
}

function bleReceive(name, value) {
  debug('bleReceive: ' + name + ' = ' + value);
}

function bleReady(deviceName) { debug('bleReady: ' + deviceName); sendBrightness(previewLevel); }
function bleClosed() { debug('bleClosed'); }

function bleStatusText() {
  if (window.bleError) return window.bleError;
  if (window.bleStatus === 'unsupported') return 'Web Bluetooth is not available in this browser.';
  return 'Tap to connect a BLE device';
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
