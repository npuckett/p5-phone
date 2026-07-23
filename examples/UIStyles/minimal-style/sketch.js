let ballX = 0;
let ballY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // Minimal style: a bare semi-transparent full-screen overlay with a
  // radiating circular icon. Cleaner than the frosted Tap message box.
  // Color, opacity, icon, iconColor, and iconSize are all adjustable.
  enableSensorMinimal('Tap to begin');

  // Dev helper: on desktop a floating QR of this page appears so you can
  // scan-and-test on your phone. It is a no-op on mobile, so you never see
  // (or have to close) a QR on the phone itself.
  showDesktopQr();
}

function draw() {
  if (window.sensorsEnabled) {
    background(20);
    updateBallValues();

    fill(80, 200, 255);
    noStroke();
    circle(ballX, ballY, 60);

    fill(255);
    textAlign(CENTER, TOP);
    textSize(16);
    text('Tilt your phone to move the ball', width / 2, 30);
  } else {
    // The minimal overlay sits on top of this idle frame.
    background(20);
  }
}

function updateBallValues() {
  ballX = width / 2 + rotationY * 3;
  ballY = height / 2 + rotationX * 3;
}
