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

function createMl5LoadingOverlay(containerSelector) {
  ensureMl5LoadingOverlayStyles();
  const parent = document.querySelector(containerSelector || 'body');
  const overlay = document.createElement('div');
  overlay.className = 'ml5-loading-overlay';
  overlay.innerHTML = '<div class="ml5-loading-ring"></div><div class="ml5-loading-message">Loading</div>';
  parent.appendChild(overlay);
  return overlay;
}

function showMl5LoadingOverlay(overlay, message) {
  if (!overlay) return;
  overlay.querySelector('.ml5-loading-message').textContent = message || ml5LoadingMessage;
  overlay.style.display = 'flex';
}

function hideMl5LoadingOverlay(overlay) {
  if (overlay) overlay.style.display = 'none';
}

function ensureMl5LoadingOverlayStyles() {
  if (document.getElementById('ml5-loading-overlay-styles')) return;

  const style = document.createElement('style');
  style.id = 'ml5-loading-overlay-styles';
  style.textContent = `
    .ml5-loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 30;
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 18px;
      color: white;
      background: rgba(0, 0, 0, 0.72);
      font-family: Arial, sans-serif;
      font-size: 16px;
      pointer-events: none;
    }
    .ml5-loading-ring {
      width: 68px;
      height: 68px;
      border: 8px solid rgba(255, 255, 255, 0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: ml5-loading-spin 0.9s linear infinite;
    }
    @keyframes ml5-loading-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
