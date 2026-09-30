// Keep the screen from dimming and locking with the browser's Screen Wake Lock API.
// navigator.wakeLock is built into the browser, not part of p5-phone.
// Only touches reset the phone's auto-lock timer, so sketches driven by motion,
// sound, GPS or BLE go dark after a while unless they hold a wake lock.

let wakeLock = null;   // the WakeLockSentinel while the lock is held
let wantAwake = false; // true after a tap turns the lock on
let errorText = '';
let lastTouchTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');
  lastTouchTime = millis();

  // The browser drops the lock whenever the page is hidden: another app, another tab,
  // or the side button. Ask again when the page is visible. On iOS, only the first
  // request needs a tap.
  document.addEventListener('visibilitychange', () => {
    if (wantAwake && document.visibilityState === 'visible') {
      requestWakeLock();
    }
  });
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    errorText = '';
  } catch (err) {
    // Power saving, low battery, or an iframe without allow="screen-wake-lock"
    errorText = err.name + ': ' + err.message;
    if (window.self !== window.top) {
      errorText += '\nEmbedded previews such as the p5.js Web Editor block wake lock. Open the sketch in its own tab.';
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    await wakeLock.release();
  }
}

function isAwake() {
  // released turns true when the sketch releases the lock or the browser drops it
  return wakeLock !== null && !wakeLock.released;
}

function draw() {
  const awake = isAwake();
  background(awake ? '#ffd23f' : '#10131a');
  fill(awake ? '#161616' : '#f5f7ff');
  noStroke();

  textSize(min(width * 0.12, 60));
  text(awake ? 'AWAKE' : 'CAN SLEEP', width / 2, height * 0.26);

  let statusText = 'Tap to keep the screen on';
  if (!window.isSecureContext) {
    statusText = 'Wake lock needs HTTPS (or localhost)';
  } else if (!('wakeLock' in navigator)) {
    statusText = 'This browser has no Screen Wake Lock';
  } else if (awake) {
    statusText = 'The screen stays on. Tap to let it sleep.';
  } else if (errorText) {
    statusText = 'The browser refused the lock. Tap to try again.';
  } else if (wantAwake) {
    statusText = 'The lock was released. Tap to ask again.';
  }
  textSize(min(width * 0.045, 22));
  text(statusText, width * 0.1, height * 0.38, width * 0.8);

  // Put the phone down: with the lock on, this keeps counting past your auto-lock time.
  const seconds = floor((millis() - lastTouchTime) / 1000);
  textSize(min(width * 0.2, 96));
  text(floor(seconds / 60) + ':' + nf(seconds % 60, 2), width / 2, height * 0.58);
  textSize(min(width * 0.034, 16));
  text('since your last touch', width / 2, height * 0.68);

  if (errorText) {
    fill('#ffb1b1');
    text(errorText, width * 0.1, height * 0.8, width * 0.8);
  }
}

// Ask from mouseReleased, not mousePressed: a touch counts as a user gesture
// when the finger lifts, and iOS Safari refuses the first request without one.
function mouseReleased() {
  lastTouchTime = millis();
  if (!('wakeLock' in navigator)) {
    return false;
  }

  if (isAwake()) {
    wantAwake = false;
    releaseWakeLock();
  } else {
    wantAwake = true;
    requestWakeLock();
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
