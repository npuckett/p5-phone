function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // Canvas style: message drawn on the canvas until user taps it
  enableSensorCanvas('Tap the canvas to begin');
}

function draw() {
  if (!window.sensorsEnabled) return;

  background(220);

  // Map device rotation to a ball position
  let x = width / 2 + rotationY * 3;
  let y = height / 2 + rotationX * 3;

  fill(50, 150, 255);
  noStroke();
  circle(x, y, 60);

  fill(0);
  textAlign(CENTER, TOP);
  textSize(16);
  text('Tilt your phone to move the ball', width / 2, 30);
}
