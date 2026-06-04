let ml5LoadingActive = false;
let ml5LoadingMessage = 'Loading';

function setMl5Loading(message) {
  ml5LoadingActive = true;
  ml5LoadingMessage = message || 'Loading';
}

function clearMl5Loading() {
  ml5LoadingActive = false;
}

function isMl5Loading() {
  return ml5LoadingActive;
}

function drawMl5LoadingGraphic(message) {
  if (!ml5LoadingActive && !message) return;

  const label = message || ml5LoadingMessage;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 34;
  const activeDot = frameCount % 12;

  push();
  noStroke();
  fill(0, 180);
  rect(0, 0, width, height);

  for (let index = 0; index < 12; index += 1) {
    const angle = TWO_PI * index / 12;
    const alpha = map((index + 12 - activeDot) % 12, 0, 11, 255, 55);
    fill(255, alpha);
    circle(centerX + cos(angle) * radius, centerY + sin(angle) * radius, 9);
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(label, centerX, centerY + 70);
  pop();
}
