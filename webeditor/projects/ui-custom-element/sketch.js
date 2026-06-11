let accelerationAmountX = 0;
let accelerationAmountY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // Custom element: bind permission activation to your own HTML button
  enableGyroOn('#start-btn');
}

function draw() {
  if (window.sensorsEnabled) {
    background(20, 20, 40);
    updateAccelerationValues();

    for (let i = 0; i < 40; i++) {
      let x = width / 2 + sin(frameCount * 0.02 + i) * (100 + accelerationAmountX * 5);
      let y = height / 2 + cos(frameCount * 0.02 + i) * (100 + accelerationAmountY * 5);
      let sz = 6 + sin(frameCount * 0.05 + i * 0.5) * 4;

      fill(100 + i * 3, 150, 255, 180);
      noStroke();
      circle(x, y, sz);
    }

    fill(255);
    textAlign(CENTER, TOP);
    textSize(14);
    text('Shake or tilt to move particles', width / 2, 20);
  } else {
    background(240);
  }
}

function updateAccelerationValues() {
  accelerationAmountX = accelerationX || 0;
  accelerationAmountY = accelerationY || 0;
}
