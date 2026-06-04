let cam;
let handpose;
let hands = [];
let cameraButton;
let cameraSwitching = false;
let archiveImage;
let fingerDistance = 0;
let imageOpacity = 0;
let thumbPoint = null;
let indexPoint = null;
let archiveImageLoading = true;
let handTrackingLoading = false;
let handTrackingReady = false;
let loadingMessage = 'Loading image';

const archiveImageUrl = 'https://dn710708.ca.archive.org/0/items/AILS_AC89-0437-6/AC89-0437-6.jpg';

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  loadArchiveImage();
  cam = createPhoneCamera('user', true, 'fitHeight');
  createCameraButton();
  enableCameraTap('Tap to enable camera');

  cam.onReady(prepareHandTracking);
}

function draw() {
  background(0);
  if (cam && cam.ready) drawPhoneCamera(cam);
  updateHandValues();
  drawArchiveImage();
  drawHandOverlay();
  drawLoadingGraphic();
  drawReadout();
}

async function loadArchiveImage() {
  archiveImageLoading = true;
  loadingMessage = 'Loading image';
  try {
    archiveImage = await loadImageAsync(archiveImageUrl);
  } catch (error) {
    archiveImage = null;
  }
  archiveImageLoading = false;
}

async function prepareHandTracking() {
  handTrackingLoading = true;
  handTrackingReady = false;
  loadingMessage = 'Loading hand tracking';
  let options = { maxHands: 1, runtime: 'mediapipe', flipped: false };
  handpose = await loadMl5Model((modelLoaded) => ml5.handPose(options, modelLoaded));
  handpose.detectStart(cam.videoElement, gotHands);
  handTrackingLoading = false;
  handTrackingReady = true;
}

function loadImageAsync(url) {
  return new Promise((resolve, reject) => {
    let imageElement = new Image();
    imageElement.onload = () => resolve(imageElement);
    imageElement.onerror = reject;
    imageElement.src = url;
  });
}

function loadMl5Model(createModel) {
  return new Promise((resolve) => {
    let model = createModel(() => resolve(model));
  });
}

function gotHands(results) {
  hands = results || [];
}

function updateHandValues() {
  thumbPoint = getHandKeypoint(4);
  indexPoint = getHandKeypoint(8);

  if (!thumbPoint || !indexPoint) {
    fingerDistance = lerp(fingerDistance, 0, 0.12);
    imageOpacity = lerp(imageOpacity, 0, 0.08);
    return;
  }

  let currentDistance = dist(thumbPoint.x, thumbPoint.y, indexPoint.x, indexPoint.y);
  fingerDistance = lerp(fingerDistance, currentDistance, 0.35);
  imageOpacity = map(constrain(fingerDistance, 18, min(width, height) * 0.42), 18, min(width, height) * 0.42, 35, 255);
}

function getHandKeypoint(index) {
  let hand = hands[0];
  if (!hand || !hand.keypoints || !hand.keypoints[index] || !cam) return null;
  return cam.mapKeypoint(hand.keypoints[index]);
}

function drawArchiveImage() {
  if (!archiveImage || !archiveImage.naturalWidth || !archiveImage.naturalHeight) return;
  let scaleFactor = max(width / archiveImage.naturalWidth, height / archiveImage.naturalHeight);
  let imageWidth = archiveImage.naturalWidth * scaleFactor;
  let imageHeight = archiveImage.naturalHeight * scaleFactor;
  push();
  drawingContext.globalAlpha = imageOpacity / 255;
  drawingContext.drawImage(archiveImage, width / 2 - imageWidth / 2, height / 2 - imageHeight / 2, imageWidth, imageHeight);
  pop();
}

function drawHandOverlay() {
  if (!thumbPoint || !indexPoint) return;
  stroke(211, 155, 31);
  strokeWeight(4);
  line(thumbPoint.x, thumbPoint.y, indexPoint.x, indexPoint.y);
  noStroke();
  fill(236, 203, 214);
  circle(thumbPoint.x, thumbPoint.y, 20);
  fill(11, 143, 106);
  circle(indexPoint.x, indexPoint.y, 20);
}

function drawReadout() {
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  if (!window.cameraEnabled) {
    text('Tap once to enable camera', width / 2, height / 2);
  } else {
    text('fingerDistance: ' + nf(fingerDistance, 1, 1) + '\nimageOpacity: ' + nf(imageOpacity, 1, 1), width / 2, height - 58);
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
  hands = [];

  if (handpose && handpose.detectStop) handpose.detectStop();
  loadingMessage = 'Switching camera';
  let useBackCamera = cam.active !== 'environment';
  cam.mirror = !useBackCamera;
  cam.active = useBackCamera ? 'environment' : 'user';
  cameraButton.html(useBackCamera ? 'Front camera' : 'Back camera');
  await waitForCameraReady();
  if (handpose && cam.videoElement) handpose.detectStart(cam.videoElement, gotHands);

  cameraSwitching = false;
  return false;
}

function drawLoadingGraphic() {
  if (!window.cameraEnabled || (!archiveImageLoading && !handTrackingLoading && !cameraSwitching && handTrackingReady)) return;

  let centerX = width / 2;
  let centerY = height / 2;
  let radius = 34;
  let activeDot = frameCount % 12;

  push();
  noStroke();
  fill(0, 180);
  rect(0, 0, width, height);

  for (let index = 0; index < 12; index += 1) {
    let angle = TWO_PI * index / 12;
    let alpha = map((index + 12 - activeDot) % 12, 0, 11, 255, 55);
    fill(255, alpha);
    circle(centerX + cos(angle) * radius, centerY + sin(angle) * radius, 9);
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(loadingMessage, centerX, centerY + 70);
  pop();
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