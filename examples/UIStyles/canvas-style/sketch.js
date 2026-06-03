let ballX = 0;
let ballY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // Canvas style: message drawn on the canvas until user taps it
  enableGyroCanvas('Tap the canvas to begin');
}

function draw() {
  if (window.sensorsEnabled) {
    background(220);
    updateBallValues();

    fill(50, 150, 255);
    noStroke();
    circle(ballX, ballY, 60);

    fill(0);
    textAlign(CENTER, TOP);
    textSize(16);
    text('Tilt your phone to move the ball', width / 2, 30);
  }
}

function updateBallValues() {
  ballX = width / 2 + rotationY * 3;
  ballY = height / 2 + rotationX * 3;
}
