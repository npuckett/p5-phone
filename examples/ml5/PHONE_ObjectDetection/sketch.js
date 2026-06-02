/*
ML5 Object Detection - Phone Adapted

This sketch uses ML5 ObjectDetection with p5-phone for automatic camera layout
and bounding-box coordinate mapping. It starts on the back camera for detecting
objects in the world, and includes camera/video controls that keep detection
aligned when the camera feed is mirrored, centered, or switched.
*/

let cam;
let detector;
let detections = [];
let activeCamera = 'environment';
let mirrorVideo = false;
let showVideo = true;
let modelReady = false;
let detectionRunning = false;
let switchingCamera = false;
let statusText = 'Tap to enable camera';

const confidenceThreshold = 0.35;
const switchButton = { x: 16, y: 0, w: 0, h: 44 };
const videoButton = { x: 0, y: 0, w: 0, h: 44 };

function setup() {
  createCanvas(405, 720);
  lockGestures();
  textAlign(CENTER, CENTER);
  rectMode(CORNER);

  cam = createPhoneCamera(activeCamera, mirrorVideo, 'fitHeight');
  enableCameraTap('Tap to enable camera');

  cam.onReady(async () => {
    await loadObjectDetector();
  });
}

function draw() {
  background(18, 20, 24);

  if (showVideo && cam.ready) {
    image(cam, 0, 0);
  }

  drawDetections();
  drawUI();
}

async function loadObjectDetector() {
  statusText = 'Loading object detector';
  detector = await ml5.objectDetection('cocossd');
  modelReady = true;
  startDetection();
}

function startDetection() {
  if (!detector || !cam.ready || !cam.videoElement) {
    return;
  }

  detectionRunning = true;
  statusText = 'Point camera at objects';
  detector.detectStart(cam.videoElement, gotDetections);
}

function gotDetections(results, error) {
  if (error) {
    console.error(error);
    statusText = 'Object detection error';
    detections = [];
    return;
  }

  detections = results || [];
}

function drawDetections() {
  if (!cam.ready || detections.length === 0) {
    return;
  }

  const mappedDetections = cam.mapBoxes(detections);

  for (const detection of mappedDetections) {
    const confidence = detection.confidence || detection.score || 0;
    if (confidence < confidenceThreshold) {
      continue;
    }

    drawDetectionBox(detection, confidence);
  }
}

function drawDetectionBox(detection, confidence) {
  const label = detection.label || detection.className || 'object';
  const labelText = label + ' ' + Math.round(confidence * 100) + '%';
  const labelHeight = 28;
  textSize(14);
  const labelWidth = min(max(textWidth(labelText) + 18, 78), width - 24);
  const labelX = constrain(detection.x, 12, width - labelWidth - 12);
  const labelY = constrain(detection.y - labelHeight, 12, height - 120);

  noFill();
  stroke(116, 255, 174);
  strokeWeight(3);
  rect(detection.x, detection.y, detection.width, detection.height, 4);

  noStroke();
  fill(6, 18, 12, 230);
  rect(labelX, labelY, labelWidth, labelHeight, 4);

  fill(255);
  textAlign(LEFT, CENTER);
  text(labelText, labelX + 9, labelY + labelHeight / 2);
  textAlign(CENTER, CENTER);
}

function drawUI() {
  drawTopStatus();
  drawControls();
}

function drawTopStatus() {
  const visibleDetections = detections.filter((detection) => {
    const confidence = detection.confidence || detection.score || 0;
    return confidence >= confidenceThreshold;
  }).length;

  if (!cam.ready) {
    statusText = 'Starting camera';
  } else if (!modelReady) {
    statusText = 'Loading object detector';
  } else if (switchingCamera) {
    statusText = 'Switching camera';
  } else if (visibleDetections > 0) {
    statusText = visibleDetections + ' object' + pluralSuffix(visibleDetections) + ' detected';
  } else if (detectionRunning) {
    statusText = 'Point camera at objects';
  }

  noStroke();
  fill(0, 0, 0, 150);
  rect(0, 0, width, 70);

  fill(255);
  textSize(18);
  text(statusText, width / 2, 30);

  fill(180);
  textSize(12);
  text(activeCamera === 'environment' ? 'Back camera' : 'Front camera', width / 2, 52);
}

function drawControls() {
  const buttonTop = height - 64;
  const buttonGap = 10;
  const buttonWidth = (width - 32 - buttonGap) / 2;

  switchButton.x = 16;
  switchButton.y = buttonTop;
  switchButton.w = buttonWidth;

  videoButton.x = switchButton.x + switchButton.w + buttonGap;
  videoButton.y = buttonTop;
  videoButton.w = buttonWidth;

  noStroke();
  fill(0, 0, 0, 170);
  rect(0, height - 86, width, 86);

  drawButton(switchButton, 'Switch Camera');
  drawButton(videoButton, showVideo ? 'Hide Video' : 'Show Video');
}

function drawButton(button, label) {
  fill(245);
  rect(button.x, button.y, button.w, button.h, 6);

  fill(20);
  textSize(14);
  text(label, button.x + button.w / 2, button.y + button.h / 2);
}

function mousePressed() {
  if (!cam || !cam.ready) {
    return false;
  }

  if (insideButton(mouseX, mouseY, switchButton)) {
    switchCamera();
    return false;
  }

  if (insideButton(mouseX, mouseY, videoButton)) {
    showVideo = !showVideo;
    return false;
  }

  return false;
}

function switchCamera() {
  if (!cam || switchingCamera) {
    return;
  }

  if (detector && detectionRunning && typeof detector.detectStop === 'function') {
    detector.detectStop();
  }

  detectionRunning = false;
  switchingCamera = true;
  detections = [];
  activeCamera = activeCamera === 'user' ? 'environment' : 'user';
  mirrorVideo = activeCamera === 'user';
  statusText = 'Switching camera';

  cam.mirror = mirrorVideo;
  cam.active = activeCamera;
  cam.onReady(() => {
    switchingCamera = false;
    startDetection();
  });
}

function insideButton(x, y, button) {
  return x >= button.x &&
         x <= button.x + button.w &&
         y >= button.y &&
         y <= button.y + button.h;
}

function pluralSuffix(count) {
  return count === 1 ? '' : 's';
}