function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // Custom element: bind permission activation to your own HTML button
  enableSensorOn('#start-btn');
}

function draw() {
  if (!window.sensorsEnabled) {
    background(240);
    return;
  }

  background(20, 20, 40);

  // Particles that respond to device acceleration
  let ax = accelerationX || 0;
  let ay = accelerationY || 0;

  for (let i = 0; i < 40; i++) {
    let x = width / 2 + sin(frameCount * 0.02 + i) * (100 + ax * 5);
    let y = height / 2 + cos(frameCount * 0.02 + i) * (100 + ay * 5);
    let sz = 6 + sin(frameCount * 0.05 + i * 0.5) * 4;

    fill(100 + i * 3, 150, 255, 180);
    noStroke();
    circle(x, y, sz);
  }

  fill(255);
  textAlign(CENTER, TOP);
  textSize(14);
  text('Shake or tilt to move particles', width / 2, 20);
}
