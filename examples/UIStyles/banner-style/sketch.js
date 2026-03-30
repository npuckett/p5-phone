function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  // Banner style: animated slide-in banner at the top of the screen
  enableAllBanner('Tap here to enable sensors & mic');
}

function draw() {
  background(30);

  if (window.sensorsEnabled) {
    // Draw a compass-like indicator using device orientation
    push();
    translate(width / 2, height / 2);
    rotate(radians(rotationZ));
    stroke(255);
    strokeWeight(3);
    line(0, -80, 0, 80);
    fill(255, 80, 80);
    noStroke();
    triangle(-15, -80, 15, -80, 0, -110);
    pop();

    fill(255);
    textAlign(CENTER, TOP);
    textSize(16);
    text('Heading: ' + nf(rotationZ, 0, 1) + '°', width / 2, 30);
  } else {
    fill(100);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('Waiting for permissions...', width / 2, height / 2);
  }
}
