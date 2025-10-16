// Sound Visualizer
// Demonstrates microphone input for audio-reactive visuals

let mic;
let particles = [];
let levelHistory = [];
let maxHistoryLength = 100;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create microphone input
  mic = new p5.AudioIn();
  
  // Initialize particles
  for (let i = 0; i < 50; i++) {
    particles.push(createParticle());
  }
  
  colorMode(HSB, 360, 100, 100, 1);
}

function draw() {
  background(0, 0, 10, 0.1);
  
  if (window.micEnabled) {
    drawVisualizer();
  } else {
    showWaitingScreen();
  }
}

function drawVisualizer() {
  let level = mic.getLevel();
  
  // Store level history for waveform
  levelHistory.push(level);
  if (levelHistory.length > maxHistoryLength) {
    levelHistory.shift();
  }
  
  // Central circle that responds to audio
  let centerSize = map(level, 0, 1, 50, 300);
  let hue = (millis() * 0.1) % 360;
  
  // Draw central responsive circle
  push();
  translate(width/2, height/2);
  
  // Outer glow
  for (let i = 0; i < 5; i++) {
    let alpha = map(i, 0, 4, 0.3, 0.05);
    fill(hue, 80, 100, alpha);
    noStroke();
    circle(0, 0, centerSize + i * 20);
  }
  
  // Core circle
  fill(hue, 100, 100, 0.8);
  circle(0, 0, centerSize);
  
  // Inner details
  fill(hue + 180, 80, 100, 0.5);
  circle(0, 0, centerSize * 0.6);
  
  pop();
  
  // Update and draw particles
  for (let particle of particles) {
    updateParticle(particle, level);
    drawParticle(particle);
  }
  
  // Draw waveform
  drawWaveform();
  
  // Draw level meter
  drawLevelMeter(level);
  
  // Instructions
  fill(0, 0, 100, 0.7);
  textAlign(CENTER, BOTTOM);
  textSize(16);
  text("Make some noise!", width/2, height - 20);
}

function createParticle() {
  return {
    x: random(width),
    y: random(height),
    vx: random(-2, 2),
    vy: random(-2, 2),
    size: random(5, 15),
    hue: random(360),
    life: 1.0
  };
}

function updateParticle(particle, audioLevel) {
  // Move particle
  particle.x += particle.vx;
  particle.y += particle.vy;
  
  // Audio influence
  let audioForce = audioLevel * 10;
  let centerX = width / 2;
  let centerY = height / 2;
  
  // Pull towards center when loud
  if (audioLevel > 0.1) {
    let dx = centerX - particle.x;
    let dy = centerY - particle.y;
    let distance = sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      particle.vx += (dx / distance) * audioForce * 0.02;
      particle.vy += (dy / distance) * audioForce * 0.02;
    }
  }
  
  // Bounce off edges
  if (particle.x < 0 || particle.x > width) {
    particle.vx *= -0.8;
    particle.x = constrain(particle.x, 0, width);
  }
  
  if (particle.y < 0 || particle.y > height) {
    particle.vy *= -0.8;
    particle.y = constrain(particle.y, 0, height);
  }
  
  // Apply friction
  particle.vx *= 0.98;
  particle.vy *= 0.98;
  
  // Update size based on audio
  particle.targetSize = map(audioLevel, 0, 1, 5, 25);
  particle.size = lerp(particle.size, particle.targetSize, 0.1);
}

function drawParticle(particle) {
  push();
  translate(particle.x, particle.y);
  
  let alpha = map(particle.size, 5, 25, 0.3, 0.8);
  fill(particle.hue, 80, 100, alpha);
  noStroke();
  
  circle(0, 0, particle.size);
  
  // Inner highlight
  fill(particle.hue, 40, 100, alpha * 0.5);
  circle(0, 0, particle.size * 0.5);
  
  pop();
}

function drawWaveform() {
  if (levelHistory.length < 2) return;
  
  stroke(0, 0, 100, 0.6);
  strokeWeight(2);
  noFill();
  
  beginShape();
  for (let i = 0; i < levelHistory.length; i++) {
    let x = map(i, 0, levelHistory.length - 1, 0, width);
    let y = map(levelHistory[i], 0, 1, height - 50, height - 150);
    vertex(x, y);
  }
  endShape();
}

function drawLevelMeter(level) {
  // Level meter on the side
  let meterHeight = 200;
  let meterWidth = 20;
  let meterX = width - 40;
  let meterY = height/2 - meterHeight/2;
  
  // Background
  fill(0, 0, 0, 0.3);
  rect(meterX, meterY, meterWidth, meterHeight);
  
  // Level bar
  let levelHeight = map(level, 0, 1, 0, meterHeight);
  let levelHue = map(level, 0, 1, 120, 0); // Green to red
  
  fill(levelHue, 80, 100, 0.8);
  rect(meterX, meterY + meterHeight - levelHeight, meterWidth, levelHeight);
  
  // Level text
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(12);
  text("MIC", meterX + meterWidth/2, meterY - 20);
}

function showWaitingScreen() {
  fill(0, 0, 100, 0.7);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Waiting for microphone...", width/2, height/2);
  textSize(16);
  text("Allow microphone access to continue", width/2, height/2 + 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}