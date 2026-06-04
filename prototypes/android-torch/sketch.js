let cameraStream = null;
let cameraTrack = null;
let cameraVideo = null;
let torchEnabled = false;
let torchSupported = false;
let torchCapability = undefined;
let lastError = null;
let statusMessage = 'Waiting for camera start.';
let canvasElement = null;

const ui = {};

function setup() {
  canvasElement = createCanvas(640, 480);
  canvasElement.parent('preview');
  lockGestures();
  pixelDensity(1);
  setupControls();
  resizeToPreview();
  updatePanel();
}

function draw() {
  background(12, 15, 18);
  drawPreview();
  drawOverlay();
}

function windowResized() {
  resizeToPreview();
}

function resizeToPreview() {
  const preview = document.getElementById('preview');
  const bounds = preview.getBoundingClientRect();
  resizeCanvas(max(320, floor(bounds.width)), max(320, floor(bounds.height)));
}

function setupControls() {
  ui.start = document.getElementById('start-camera');
  ui.toggle = document.getElementById('toggle-torch');
  ui.on = document.getElementById('torch-on');
  ui.off = document.getElementById('torch-off');
  ui.tryAnyway = document.getElementById('try-anyway');
  ui.stop = document.getElementById('stop-camera');
  ui.cameraStatus = document.getElementById('camera-status');
  ui.torchStatus = document.getElementById('torch-status');
  ui.supportedConstraints = document.getElementById('supported-constraints');
  ui.capabilitySummary = document.getElementById('capability-summary');
  ui.settingsSummary = document.getElementById('settings-summary');
  ui.errorSummary = document.getElementById('error-summary');
  ui.debugOutput = document.getElementById('debug-output');

  ui.start.addEventListener('click', startBackCamera);
  ui.toggle.addEventListener('click', toggleTorch);
  ui.on.addEventListener('click', () => setTorch(true));
  ui.off.addEventListener('click', () => setTorch(false));
  ui.tryAnyway.addEventListener('click', () => setTorch(!torchEnabled, true));
  ui.stop.addEventListener('click', stopCamera);

  window.addEventListener('pagehide', cleanupCamera);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      cleanupCamera();
    }
  });
}

async function startBackCamera() {
  clearError();
  statusMessage = 'Starting back camera...';
  updatePanel();

  try {
    await cleanupCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not available in this browser.');
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    cameraVideo = document.createElement('video');
    cameraVideo.autoplay = true;
    cameraVideo.muted = true;
    cameraVideo.playsInline = true;
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    await waitForVideo(cameraVideo);

    cameraTrack = cameraStream.getVideoTracks()[0] || null;
    if (!cameraTrack) {
      throw new Error('No video track was returned.');
    }

    statusMessage = 'Camera stream active.';
    refreshTorchInfo();
  } catch (error) {
    recordError(error);
    await cleanupCamera();
  }

  updatePanel();
}

async function waitForVideo(videoElement) {
  if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Timed out waiting for video metadata.')), 5000);
    videoElement.addEventListener('loadedmetadata', () => {
      window.clearTimeout(timeoutId);
      resolve();
    }, { once: true });
  });
}

function refreshTorchInfo() {
  torchSupported = false;
  torchCapability = undefined;

  if (!cameraTrack) {
    torchEnabled = false;
    return;
  }

  const capabilities = getTrackCapabilities();
  const settings = getTrackSettings();
  torchCapability = capabilities ? capabilities.torch : undefined;
  torchSupported = canControlTorch(torchCapability);
  torchEnabled = settings && typeof settings.torch === 'boolean' ? settings.torch : torchEnabled;
}

function canControlTorch(value) {
  if (Array.isArray(value)) {
    return value.includes(true) && value.includes(false);
  }

  return value === true;
}

async function toggleTorch() {
  await setTorch(!torchEnabled);
}

async function setTorch(enabled, forceAttempt = false) {
  clearError();

  if (!cameraTrack || cameraTrack.readyState !== 'live') {
    recordError(new Error('Start the back camera before setting torch.'));
    updatePanel();
    return;
  }

  refreshTorchInfo();
  if (!torchSupported && !forceAttempt) {
    recordError(new Error('This camera track does not report controllable torch support.'));
    updatePanel();
    return;
  }

  try {
    statusMessage = enabled ? 'Turning torch on...' : 'Turning torch off...';
    updatePanel();
    await cameraTrack.applyConstraints({ advanced: [{ torch: enabled }] });
    torchEnabled = enabled;
    statusMessage = enabled ? 'Torch request resolved on.' : 'Torch request resolved off.';
    refreshTorchInfo();
  } catch (error) {
    recordError(error);
  }

  updatePanel();
}

async function stopCamera() {
  await cleanupCamera();
  statusMessage = 'Camera stopped.';
  updatePanel();
}

async function cleanupCamera() {
  if (cameraTrack && cameraTrack.readyState === 'live') {
    try {
      await cameraTrack.applyConstraints({ advanced: [{ torch: false }] });
    } catch (error) {
      lastError = summarizeError(error);
    }
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
  }

  if (cameraVideo) {
    cameraVideo.pause();
    cameraVideo.srcObject = null;
  }

  cameraStream = null;
  cameraTrack = null;
  cameraVideo = null;
  torchEnabled = false;
  torchSupported = false;
  torchCapability = undefined;
}

function getSupportedTorchConstraint() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getSupportedConstraints) {
    return undefined;
  }

  return navigator.mediaDevices.getSupportedConstraints().torch;
}

function getTrackCapabilities() {
  if (!cameraTrack || !cameraTrack.getCapabilities) {
    return null;
  }

  try {
    return cameraTrack.getCapabilities();
  } catch (error) {
    recordError(error);
    return null;
  }
}

function getTrackSettings() {
  if (!cameraTrack || !cameraTrack.getSettings) {
    return null;
  }

  try {
    return cameraTrack.getSettings();
  } catch (error) {
    recordError(error);
    return null;
  }
}

function updatePanel() {
  const cameraActive = cameraTrack && cameraTrack.readyState === 'live';
  const supportedConstraint = getSupportedTorchConstraint();
  const capabilities = getTrackCapabilities();
  const settings = getTrackSettings();
  const canTryTorch = cameraActive && !torchSupported;

  ui.start.disabled = false;
  ui.toggle.disabled = !cameraActive || !torchSupported;
  ui.on.disabled = !cameraActive || !torchSupported || torchEnabled;
  ui.off.disabled = !cameraActive || !torchSupported || !torchEnabled;
  ui.tryAnyway.disabled = !canTryTorch;
  ui.stop.disabled = !cameraActive;

  setBadge(ui.cameraStatus, cameraActive ? 'live' : 'idle', cameraActive ? 'ok' : '');
  setBadge(ui.torchStatus, getTorchStatusLabel(cameraActive), getTorchStatusKind(cameraActive));
  ui.supportedConstraints.textContent = formatValue(supportedConstraint);
  ui.capabilitySummary.textContent = formatTorchCapability(torchCapability);
  ui.settingsSummary.textContent = summarizeSettings(settings);
  ui.errorSummary.textContent = lastError || 'none';
  ui.debugOutput.textContent = buildDebugOutput(supportedConstraint, capabilities, settings);
}

function setBadge(element, label, kind) {
  element.textContent = label;
  element.className = kind ? `status ${kind}` : 'status';
}

function getTorchStatusLabel(cameraActive) {
  if (!cameraActive) {
    return 'unknown';
  }

  if (torchEnabled) {
    return 'on';
  }

  if (torchSupported) {
    return 'off';
  }

  return 'not reported';
}

function getTorchStatusKind(cameraActive) {
  if (!cameraActive) {
    return '';
  }

  if (torchEnabled) {
    return 'ok';
  }

  return torchSupported ? 'warn' : 'error';
}

function formatTorchCapability(value) {
  if (typeof value === 'undefined') {
    return 'not reported';
  }

  return `${formatValue(value)} (${torchSupported ? 'controllable' : 'not controllable'})`;
}

function summarizeSettings(settings) {
  if (!settings) {
    return 'pending';
  }

  const parts = [];
  if (typeof settings.torch !== 'undefined') {
    parts.push(`torch: ${settings.torch}`);
  }
  if (settings.facingMode) {
    parts.push(`facing: ${settings.facingMode}`);
  }
  if (settings.width && settings.height) {
    parts.push(`${settings.width} x ${settings.height}`);
  }
  if (settings.deviceId) {
    parts.push(`device: ${shortId(settings.deviceId)}`);
  }

  return parts.length ? parts.join(', ') : 'available, no torch field';
}

function buildDebugOutput(supportedConstraint, capabilities, settings) {
  const payload = {
    status: statusMessage,
    secureContext: window.isSecureContext,
    supportedConstraintsTorch: supportedConstraint,
    trackReadyState: cameraTrack ? cameraTrack.readyState : null,
    trackLabel: cameraTrack ? cameraTrack.label : null,
    torchSupported,
    torchEnabled,
    torchCapability,
    settings,
    capabilities,
    lastError,
    userAgent: navigator.userAgent
  };

  return JSON.stringify(payload, null, 2);
}

function drawPreview() {
  if (!cameraVideo || cameraVideo.readyState < 2 || cameraVideo.videoWidth === 0) {
    drawPlaceholder();
    return;
  }

  const videoRatio = cameraVideo.videoWidth / cameraVideo.videoHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let drawX = 0;
  let drawY = 0;

  if (videoRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * videoRatio;
    drawX = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / videoRatio;
    drawY = (height - drawHeight) / 2;
  }

  image(cameraVideo, drawX, drawY, drawWidth, drawHeight);
}

function drawPlaceholder() {
  background(16, 19, 23);
  noStroke();
  fill(33, 40, 47);
  rect(width * 0.08, height * 0.16, width * 0.84, height * 0.68, 10);
  fill(122, 133, 143);
  textAlign(CENTER, CENTER);
  textSize(min(24, width * 0.055));
  text('Camera preview', width / 2, height / 2 - 12);
  textSize(min(15, width * 0.035));
  text(statusMessage, width / 2, height / 2 + 24);
}

function drawOverlay() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(0, height - 68, width, 68);
  fill(torchEnabled ? color(255, 224, 115) : color(222, 231, 239));
  textAlign(LEFT, CENTER);
  textSize(min(20, width * 0.045));
  text(`Torch: ${getTorchStatusLabel(cameraTrack && cameraTrack.readyState === 'live')}`, 18, height - 42);
  fill(178, 188, 197);
  textSize(min(13, width * 0.032));
  text(statusMessage, 18, height - 18);
}

function clearError() {
  lastError = null;
}

function recordError(error) {
  lastError = summarizeError(error);
  statusMessage = 'Last operation failed.';
}

function summarizeError(error) {
  if (!error) {
    return 'unknown error';
  }

  const name = error.name || 'Error';
  const message = error.message || String(error);
  return `${name}: ${message}`;
}

function formatValue(value) {
  if (typeof value === 'undefined') {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function shortId(value) {
  if (!value || value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
