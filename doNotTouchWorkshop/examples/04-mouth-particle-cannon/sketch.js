let cam;
let faceMesh;
let faces = [];
let cameraButton;
let cameraSwitching = false;
let mouthOpenAmount = 0;
let mouthIsOpen = false;
let mouthCenter = { x: 0, y: 0 };
let faceKeypoints = [];
let mouthParticles = [];

const upperLipIndex = 13;
const lowerLipIndex = 14;
const mouthThreshold = 18;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  cam = createPhoneCamera('user', true, 'fitHeight');
  createCameraButton();
  enableCameraTap('Tap to enable camera');

  setMl5Loading('Waiting for camera');
  cam.onReady(async () => {
    setMl5Loading('Loading FaceMesh');
    let options = { maxFaces: 1, refineLandmarks: false, runtime: 'mediapipe', flipped: false };
    faceMesh = await loadMl5Model((modelLoaded) => ml5.faceMesh(options, modelLoaded));
    faceMesh.detectStart(cam.videoElement, gotFaces);
    clearMl5Loading();
  });
}

function draw() {
  background(0);
  if (cam && cam.ready) drawPhoneCamera(cam);
  updateMouthValues();
  updateMouthParticles();
  drawMouthParticles();
  drawMouthOverlay();
  drawReadout();
  drawMl5LoadingGraphic();
}

function loadMl5Model(createModel) {
  return new Promise((resolve) => {
    let model = createModel(() => resolve(model));
  });
}

function gotFaces(results) {
  faces = results || [];
}

function updateMouthValues() {
  faceKeypoints = [];
  mouthOpenAmount = lerp(mouthOpenAmount, 0, 0.18);
  mouthIsOpen = false;

  let upperLip = getFaceKeypoint(upperLipIndex);
  let lowerLip = getFaceKeypoint(lowerLipIndex);
  if (!upperLip || !lowerLip) return;

  faceKeypoints = [upperLip, lowerLip];
  let currentOpenAmount = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  mouthOpenAmount = lerp(mouthOpenAmount, currentOpenAmount, 0.35);
  mouthIsOpen = mouthOpenAmount > mouthThreshold;
  mouthCenter.x = (upperLip.x + lowerLip.x) / 2;
  mouthCenter.y = (upperLip.y + lowerLip.y) / 2;

  if (mouthIsOpen) {
    emitMouthParticles(map(constrain(mouthOpenAmount, mouthThreshold, 70), mouthThreshold, 70, 2, 12));
  }
}

function getFaceKeypoint(index) {
  let face = faces[0];
  if (!face || !face.keypoints || !face.keypoints[index] || !cam) return null;
  return cam.mapKeypoint(face.keypoints[index]);
}

function emitMouthParticles(amount) {
  for (let index = 0; index < amount; index += 1) {
    mouthParticles.push({
      x: mouthCenter.x,
      y: mouthCenter.y,
      vx: random(-3, 3),
      vy: random(-8, -2),
      life: random(28, 62),
      size: random(5, 16)
    });
  }
}

function updateMouthParticles() {
  for (let particle of mouthParticles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.08;
    particle.life -= 1;
  }
  mouthParticles = mouthParticles.filter(particle => particle.life > 0);
}

function drawMouthParticles() {
  noStroke();
  for (let particle of mouthParticles) {
    fill(236, 203, 214, map(particle.life, 0, 62, 0, 240));
    circle(particle.x, particle.y, particle.size);
  }
}

function drawMouthOverlay() {
  if (!faceKeypoints.length) return;
  stroke(211, 155, 31);
  strokeWeight(4);
  line(faceKeypoints[0].x, faceKeypoints[0].y, faceKeypoints[1].x, faceKeypoints[1].y);
  noStroke();
  fill(11, 143, 106);
  circle(mouthCenter.x, mouthCenter.y, max(18, mouthOpenAmount));
}

function drawReadout() {
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  if (!window.cameraEnabled) {
    text('Tap once to enable camera', width / 2, height / 2);
  } else {
    text('mouthOpenAmount: ' + nf(mouthOpenAmount, 1, 1) + '\nmouthIsOpen: ' + mouthIsOpen, width / 2, height - 58);
  }
}

function createCameraButton() {
  cameraButton = createButton('Back camera');
  cameraButton.position(14, 14);
  cameraButton.style('position', 'fixed');
  cameraButton.style('z-index', '20');
  cameraButton.style('padding', '12px 14px');
  cameraButton.style('font-size', '15px');
  cameraButton.style('font-weight', '700');
  cameraButton.style('border', '0');
  cameraButton.style('border-radius', '8px');
  cameraButton.style('background', '#ffffff');
  cameraButton.style('color', '#111111');
  cameraButton.style('box-shadow', '0 4px 14px rgba(0, 0, 0, 0.25)');
  cameraButton.mousePressed(switchCameraView);
}

async function switchCameraView() {
  if (!cam || cameraSwitching) return false;
  cameraSwitching = true;
  setMl5Loading('Switching camera');
  faces = [];

  if (faceMesh && faceMesh.detectStop) faceMesh.detectStop();
  let useBackCamera = cam.active !== 'environment';
  cam.mirror = !useBackCamera;
  cam.active = useBackCamera ? 'environment' : 'user';
  cameraButton.html(useBackCamera ? 'Front camera' : 'Back camera');
  await waitForCameraReady();
  if (faceMesh && cam.videoElement) faceMesh.detectStart(cam.videoElement, gotFaces);

  cameraSwitching = false;
  clearMl5Loading();
  return false;
}

function waitForCameraReady() {
  return new Promise((resolve) => {
    let attempts = 0;
    let checkReady = () => {
      if (cam && cam.ready && cam.videoElement && cam.videoElement.readyState >= 2) resolve();
      else if (attempts > 100) resolve();
      else {
        attempts += 1;
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
}

function drawPhoneCamera(phoneCamera) {
  const videoElement = phoneCamera.videoElement;
  if (!phoneCamera.ready || !videoElement || videoElement.readyState < 2) return;
  const dims = phoneCamera.getDimensions();
  push();
  if (phoneCamera.mirror) {
    translate(width, 0);
    scale(-1, 1);
  }
  drawingContext.drawImage(videoElement, dims.x, dims.y, dims.width, dims.height);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}