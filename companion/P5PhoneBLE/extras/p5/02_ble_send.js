// p5 sketch — pairs with Arduino example 04_P5Phone_Send.
//
// Sends a uint8 "brightness" via write. The Arduino RECEIVES brightness and
// dims an LED; the phone WRITES it. Install p5-phone, paste into sketch.js,
// run on Chrome/Edge over HTTPS (iPhone/iPad: Bluefy browser).
//
// (Copied verbatim from p5-phone examples/Phone Sensor Examples/ble/02_ble_send.)

let lastSent = null;
let previewLevel = 128;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  bleSetup({
    namePrefix: 'p5phone',
    characteristics: [
      { name: 'brightness', type: 'uint8', write: true }
    ]
  });

  enableBleButton({ label: 'Connect BLE send' });
  showDebug();
}

function draw() {
  background(12, 14, 20);
  noStroke();

  const level = bleConnected ? previewLevel : 40;
  fill(level, level * 0.85, level * 0.35);
  rect(0, 0, width, height);

  fill(level > 140 ? 20 : 245);
  textSize(min(width * 0.05, 22));
  textAlign(CENTER, CENTER);

  if (bleConnected) {
    text('Connected: ' + bleDeviceName, width / 2, height * 0.12);
    textSize(min(width * 0.12, 56));
    text(previewLevel, width / 2, height * 0.38);
    textSize(min(width * 0.04, 18));
    text('brightness (uint8, write)', width / 2, height * 0.48);
    text('Send only — drag vertically to write brightness', width / 2, height * 0.58, width * 0.82);

    if (lastSent !== null) {
      textSize(min(width * 0.035, 16));
      text('Last sent: ' + lastSent, width / 2, height * 0.88);
    }
  } else {
    text(bleStatusText(), width / 2, height * 0.42, width * 0.82);
    textSize(min(width * 0.038, 17));
    fill(40, 40, 48);
    text('Send only — phone writes brightness to the device', width / 2, height * 0.56, width * 0.82);
  }
}

function mouseDragged() {
  if (!bleConnected) return false;
  sendBrightness(floor(map(mouseY, height * 0.2, height * 0.8, 255, 0)));
  return false;
}

function mousePressed() {
  if (!bleConnected) return false;
  sendBrightness(floor(map(mouseY, height * 0.2, height * 0.8, 255, 0)));
  return false;
}

function sendBrightness(value) {
  previewLevel = constrain(value, 0, 255);
  bleWrite('brightness', previewLevel);
  lastSent = previewLevel;
  debug('brightness = ' + previewLevel);
}

function bleReady(deviceName) { debug('bleReady: ' + deviceName); sendBrightness(previewLevel); }
function bleClosed() { lastSent = null; debug('bleClosed'); }

function bleStatusText() {
  if (window.bleError) return window.bleError;
  if (window.bleStatus === 'unsupported') return 'Web Bluetooth is not available in this browser.';
  return 'Tap Connect, then drag to send brightness';
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
