let mic;
let micLevel = 0;
let bloomSize = 0;
let quietAmount = 1;
let bloomParticles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  mic = new p5.AudioIn();
  enableMicTap('Tap to enable microphone');

  for (let index = 0; index < 90; index += 1) {
    bloomParticles.push({
      angle: random(TWO_PI),
      distance: random(20, 180),
      speed: random(0.002, 0.012),
      size: random(4, 16)
    });
  }
}

function draw() {
  updateMicValues();
  background(247, 247, 244, 42);
  translate(width / 2, height / 2);

  noStroke();
  fill(236, 203, 214, 46 + quietAmount * 80);
  circle(0, 0, bloomSize * 1.45);

  for (let particle of bloomParticles) {
    particle.angle += particle.speed + micLevel * 0.18;
    let radius = particle.distance + bloomSize * 0.42;
    let x = cos(particle.angle) * radius;
    let y = sin(particle.angle) * radius;
    fill(11, 143, 106, 70 + micLevel * 520);
    circle(x, y, particle.size + micLevel * 90);
  }

  fill(23);
  textAlign(CENTER, CENTER);
  textSize(18);
  if (window.micEnabled) {
    text('micLevel: ' + nf(micLevel, 1, 3), 0, min(height * 0.38, 280));
  } else {
    text('Tap once to enable microphone', 0, 0);
  }
}

function updateMicValues() {
  if (window.micEnabled) {
    micLevel = lerp(micLevel, mic.getLevel(), 0.18);
  } else {
    micLevel = lerp(micLevel, 0, 0.08);
  }

  bloomSize = map(constrain(micLevel, 0, 0.22), 0, 0.22, min(width, height) * 0.18, min(width, height) * 0.82);
  quietAmount = 1 - constrain(map(micLevel, 0, 0.08, 0, 1), 0, 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}