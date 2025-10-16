// Tilt Ball Game
// Demonstrates gyroscope and accelerometer input

let ball;
let targets = [];
let score = 0;
let gameStarted = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize ball
  ball = {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    size: 30
  };
  
  // Create initial targets
  createTargets();
}

function draw() {
  background(20, 30, 50);
  
  if (window.sensorsEnabled) {
    gameStarted = true;
    updateGame();
  } else {
    showWaitingScreen();
  }
}

function updateGame() {
  // Apply tilt forces to ball
  let tiltX = rotationY || 0;
  let tiltY = rotationX || 0;
  
  // Scale the tilt input
  ball.vx += tiltX * 0.3;
  ball.vy += tiltY * 0.3;
  
  // Apply friction
  ball.vx *= 0.95;
  ball.vy *= 0.95;
  
  // Update ball position
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Bounce off walls
  if (ball.x < ball.size/2 || ball.x > width - ball.size/2) {
    ball.vx *= -0.8;
    ball.x = constrain(ball.x, ball.size/2, width - ball.size/2);
  }
  
  if (ball.y < ball.size/2 || ball.y > height - ball.size/2) {
    ball.vy *= -0.8;
    ball.y = constrain(ball.y, ball.size/2, height - ball.size/2);
  }
  
  // Draw targets
  for (let i = targets.length - 1; i >= 0; i--) {
    let target = targets[i];
    
    // Animate target
    target.pulse += 0.1;
    let pulseSize = target.size + sin(target.pulse) * 5;
    
    fill(target.color[0], target.color[1], target.color[2], 150);
    circle(target.x, target.y, pulseSize);
    
    // Check collision with ball
    let distance = dist(ball.x, ball.y, target.x, target.y);
    if (distance < (ball.size + target.size) / 2) {
      // Target hit!
      score++;
      targets.splice(i, 1);
      
      // Create new target
      if (targets.length < 3) {
        createTarget();
      }
    }
  }
  
  // Draw ball
  fill(255, 200, 100);
  stroke(255, 255, 150);
  strokeWeight(2);
  circle(ball.x, ball.y, ball.size);
  
  // Draw trail
  fill(255, 200, 100, 50);
  noStroke();
  circle(ball.x - ball.vx * 2, ball.y - ball.vy * 2, ball.size * 0.8);
  circle(ball.x - ball.vx * 4, ball.y - ball.vy * 4, ball.size * 0.6);
  
  // Draw UI
  drawUI();
}

function createTargets() {
  targets = [];
  for (let i = 0; i < 3; i++) {
    createTarget();
  }
}

function createTarget() {
  let target = {
    x: random(50, width - 50),
    y: random(50, height - 50),
    size: random(40, 80),
    color: [random(100, 255), random(100, 255), random(100, 255)],
    pulse: random(TWO_PI)
  };
  
  // Make sure target isn't too close to ball
  while (dist(target.x, target.y, ball.x, ball.y) < 100) {
    target.x = random(50, width - 50);
    target.y = random(50, height - 50);
  }
  
  targets.push(target);
}

function drawUI() {
  // Score
  fill(255);
  textAlign(LEFT, TOP);
  textSize(24);
  text("Score: " + score, 20, 20);
  
  // Instructions
  textAlign(CENTER, BOTTOM);
  textSize(14);
  text("Tilt your device to move the ball", width/2, height - 20);
  
  // Tilt indicator
  if (window.sensorsEnabled) {
    textAlign(RIGHT, TOP);
    textSize(12);
    text("Tilt X: " + (rotationY || 0).toFixed(1), width - 20, 20);
    text("Tilt Y: " + (rotationX || 0).toFixed(1), width - 20, 40);
  }
}

function showWaitingScreen() {
  fill(255, 150);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Waiting for motion sensors...", width/2, height/2);
  textSize(16);
  text("Make sure to allow permissions!", width/2, height/2 + 40);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Keep ball in bounds
  ball.x = constrain(ball.x, ball.size/2, width - ball.size/2);
  ball.y = constrain(ball.y, ball.size/2, height - ball.size/2);
}