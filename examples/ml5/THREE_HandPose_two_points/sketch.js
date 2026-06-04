/*
THREE.js HandPose Detection - Multiple Points with Velocity

This script uses ML5 HandPose with Three.js for 3D rendering and native WebRTC.
It tracks 5 hand points: fingertips and wrist with velocity tracking.
Works on both phone and desktop with portrait orientation.

Key Variables:
- videoElement: HTML video element for camera feed
- handPose: ML5 HandPose detection model
- hands: Array to store detected hands
- handPointIndex1-5: Indices of hand points to track (two-variable method)
- handPointData1-5: Global variables storing hand point data (two-variable method)
- distance1_2, angle1_2: Global measurement variables for thumb-index
- distance3_4, angle3_4: Global measurement variables for middle-ring
- velocity5: Global velocity data for wrist (x, y, speed)

Key Functions:
- init(): Initializes Three.js scene and camera
- loadHandPoseModel(): Creates ML5 model and starts detection
- animate(): Main animation loop (like draw() in p5.js)

Note: All helper functions are in functions.js

HandPose Keypoint Indices (21 points total per hand):
Finger structure: Each finger has 4 keypoints (base to tip)
- Wrist: 0
- Thumb: 1, 2, 3, 4 (tip)
- Index: 5, 6, 7, 8 (tip)
- Middle: 9, 10, 11, 12 (tip)
- Ring: 13, 14, 15, 16 (tip)
- Pinky: 17, 18, 19, 20 (tip)

Key Differences from p5.js version:
- Uses Three.js OrthographicCamera with inverted Y axis (top=720, bottom=0)
- Native WebRTC camera access (no p5-phone dependency)
- Custom coordinate mapping for fitHeight video display
- Video texture mirroring for front camera

Controls:
- Click "Toggle Video" button to show/hide video
- Change showData variable (true/false) to toggle measurement visualization
*/

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let videoElement;      // HTML video element
let handPose;          // ML5 HandPose model
let hands = [];        // Detected hands
let showData = true;   // Toggle measurement visualization (lines, arcs, text)
let videoVisible = false;
let cameraMode = 'user';
let mirrorVideo = true;
let cameraSwitching = false;
let cameraButton;
let loadingOverlay;

// Canvas dimensions (portrait orientation: 9:16 ratio)
const canvasWidth = 405;
const canvasHeight = 720;

// Camera dimensions for coordinate mapping
let videoWidth = 640;
let videoHeight = 480;

// Three.js core objects
let scene, camera, renderer;
let textCanvas, textTexture, textSprite;
let videoTexture, videoPlane;

// Two-variable method: Define which points to track and store their data
let handPointIndex1 = 4;    // Thumb tip
let handPointData1 = null;  // Stores mapped thumb data

let handPointIndex2 = 8;    // Index finger tip
let handPointData2 = null;  // Stores mapped index data

let handPointIndex3 = 12;   // Middle finger tip
let handPointData3 = null;  // Stores mapped middle data

let handPointIndex4 = 16;   // Ring finger tip
let handPointData4 = null;  // Stores mapped ring data

let handPointIndex5 = 0;    // Wrist
let handPointData5 = null;  // Stores mapped wrist data
let handPointData5Prev = null; // Previous frame data for velocity

// Global measurement variables
let distance1_2 = 0;  // Distance between thumb and index
let angle1_2 = 0;     // Angle between thumb and index
let distance3_4 = 0;  // Distance between middle and ring
let angle3_4 = 0;     // Angle between middle and ring
let velocity5 = { x: 0, y: 0, speed: 0 }; // Wrist velocity

// ==============================================
// INITIALIZATION - Runs once when page loads
// ==============================================
async function init() {
  // Set up Three.js scene (without video background yet)
  setupThreeJS();
  createCameraButton();
  loadingOverlay = createMl5LoadingOverlay('#container');
  showMl5LoadingOverlay(loadingOverlay, 'Waiting for camera');
  
  // Initialize camera using native WebRTC
  try {
    await setupCamera();
    
    // Now create video background with the video element
    createVideoBackground();
    
    updateStatus('Camera ready, loading HandPose...', 'status');
    showMl5LoadingOverlay(loadingOverlay, 'Loading HandPose');
    
    // Initialize ML5 HandPose model
    await loadHandPoseModel();
    
  } catch (error) {
    hideMl5LoadingOverlay(loadingOverlay);
    updateStatus(`Camera error: ${error.message}`, 'error');
  }
}

async function loadHandPoseModel() {
  // ML5 HandPose initialization - match p5.js example exactly
  const options = {
    maxHands: 1,           // Only detect 1 hand (like p5.js example)
    runtime: 'mediapipe',  // Use MediaPipe runtime
    flipped: false         // Handle mirroring in coordinate mapping
  };
  
  // AWAIT the promise to get the actual handPose object
  handPose = await ml5.handPose(options);
  
  // Now start detection
  updateStatus('HandPose model ready! Starting detection...', 'status');
  handPose.detectStart(videoElement, gotHands);
  updateStatus('Detection started!', 'status');
  hideMl5LoadingOverlay(loadingOverlay);
  
  // Set up button
  document.getElementById('toggleVideo').addEventListener('click', toggleVideoVisibility);
  
  // Start animation loop
  animate();
}

async function setupCamera() {
  // Create video element
  if (!videoElement) {
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.autoplay = true;
    videoElement.muted = true;
  }
  
  // Request camera access
  const constraints = {
    video: {
      facingMode: cameraMode,
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  };
  
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;
  
  // Wait for video to be ready and start playing
  return new Promise((resolve) => {
    videoElement.onloadedmetadata = async () => {
      videoWidth = videoElement.videoWidth;
      videoHeight = videoElement.videoHeight;
      // Explicitly start playing
      videoElement.play().then(() => {
        resolve();
      }).catch(error => {
        console.error('Error starting video:', error);
        resolve(); // Resolve anyway to continue
      });
    };
  });
}

function setupThreeJS() {
  // Get container
  const container = document.getElementById('canvas-container');
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Black background behind video
  
  // Create orthographic camera (2D view like p5)
  // Set up coordinates to match p5: origin at top-left, y increases downward
  const aspect = canvasWidth / canvasHeight;
  camera = new THREE.OrthographicCamera(
    0, canvasWidth,      // left, right
    canvasHeight, 0,     // top, bottom (inverted for top-left origin)
    0.1, 1000            // near, far
  );
  camera.position.z = 10;
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.setSize(canvasWidth, canvasHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  // Create text sprite for overlays
  createTextSprite();
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  onWindowResize(); // Initial sizing
}

function createTextSprite() {
  // Create a canvas for drawing text
  textCanvas = document.createElement('canvas');
  textCanvas.width = canvasWidth;
  textCanvas.height = canvasHeight;
  
  // Create texture from canvas
  textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.needsUpdate = true;
  
  // Create sprite with the texture
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: textTexture,
    transparent: true,
    depthTest: false
  });
  textSprite = new THREE.Sprite(spriteMaterial);
  textSprite.position.set(canvasWidth / 2, canvasHeight / 2, 9);
  textSprite.scale.set(canvasWidth, canvasHeight, 1);
  scene.add(textSprite);
}

function createVideoBackground() {
  if (videoPlane) {
    scene.remove(videoPlane);
    if (videoPlane.geometry) videoPlane.geometry.dispose();
    if (videoPlane.material) videoPlane.material.dispose();
    videoPlane = null;
  }

  if (videoTexture) {
    videoTexture.dispose();
    videoTexture = null;
  }

  // Calculate how to fit video to canvas (matching p5-phone 'fitHeight' mode)
  // Video is 640x480 (4:3), canvas is 405x720 (9:16)
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  
  let planeWidth, planeHeight;
  
  // Fit to height (like p5-phone 'fitHeight')
  planeHeight = canvasHeight;
  planeWidth = planeHeight * videoAspect;
  
  // If width is less than canvas, fit to width instead
  if (planeWidth < canvasWidth) {
    planeWidth = canvasWidth;
    planeHeight = planeWidth / videoAspect;
  }
  
  // Create a plane geometry with calculated dimensions
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  
  // Create video texture from video element
  videoTexture = new THREE.VideoTexture(videoElement);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.wrapS = THREE.ClampToEdgeWrapping;
  videoTexture.wrapT = THREE.ClampToEdgeWrapping;
  
  // Create material with the video texture
  const material = new THREE.MeshBasicMaterial({
    map: videoTexture,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  videoPlane = new THREE.Mesh(geometry, material);
  
  // Position the plane at the back (z = 0)
  videoPlane.position.set(canvasWidth / 2, canvasHeight / 2, 0);
  
  videoPlane.scale.x = mirrorVideo ? -1 : 1;
  
  // Store the video plane dimensions for coordinate mapping
  videoPlane.userData.displayWidth = planeWidth;
  videoPlane.userData.displayHeight = planeHeight;
  
  // Add to scene
  scene.add(videoPlane);
}

function createCameraButton() {
  cameraButton = document.createElement('button');
  cameraButton.textContent = 'Back camera';
  cameraButton.style.position = 'fixed';
  cameraButton.style.right = '14px';
  cameraButton.style.top = '14px';
  cameraButton.style.zIndex = '20';
  cameraButton.style.padding = '12px 14px';
  cameraButton.style.fontSize = '15px';
  cameraButton.style.fontWeight = '700';
  cameraButton.style.border = '0';
  cameraButton.style.borderRadius = '8px';
  cameraButton.style.background = '#ffffff';
  cameraButton.style.color = '#111111';
  cameraButton.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
  cameraButton.addEventListener('click', switchCameraView);
  document.body.appendChild(cameraButton);
}

async function switchCameraView(event) {
  if (event) event.stopPropagation();

  if (cameraSwitching) {
    return;
  }

  cameraSwitching = true;
  hands = [];
  updateStatus('Switching camera...', 'status');
  showMl5LoadingOverlay(loadingOverlay, 'Switching camera');

  if (handPose && handPose.detectStop) {
    handPose.detectStop();
  }

  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }

  cameraMode = cameraMode === 'environment' ? 'user' : 'environment';
  mirrorVideo = cameraMode === 'user';
  cameraButton.textContent = cameraMode === 'environment' ? 'Front camera' : 'Back camera';

  try {
    await setupCamera();
    createVideoBackground();

    if (handPose && videoElement) {
      handPose.detectStart(videoElement, gotHands);
    }

    updateStatus('Detection started!', 'status');
    hideMl5LoadingOverlay(loadingOverlay);
  } catch (error) {
    hideMl5LoadingOverlay(loadingOverlay);
    updateStatus(`Camera error: ${error.message}`, 'error');
  }

  cameraSwitching = false;
}

// ==============================================
// ANIMATE - Runs continuously (like draw() in p5.js)
// ==============================================
function animate() {
  requestAnimationFrame(animate);
  
  // Update video texture
  updateVideoBackground();
  
  // Clear scene (remove all meshes/lines from previous frame)
  clearScene();
  
  // Update global point data and measure between the specified points
  if (hands.length > 0) {
    // Update global variables with current point data (index, hand number)
    handPointData1 = getKeypoint(handPointIndex1, 0);
    handPointData2 = getKeypoint(handPointIndex2, 0);
    handPointData3 = getKeypoint(handPointIndex3, 0);
    handPointData4 = getKeypoint(handPointIndex4, 0);
    
    // Store previous wrist position for velocity calculation
    handPointData5Prev = handPointData5;
    handPointData5 = getKeypoint(handPointIndex5, 0);
    
    // Calculate global measurements
    distance1_2 = measureDistance(handPointData1, handPointData2);
    angle1_2 = measureAngle(handPointData1, handPointData2);
    distance3_4 = measureDistance(handPointData3, handPointData4);
    angle3_4 = measureAngle(handPointData3, handPointData4);
    velocity5 = measureVelocity(handPointData5, handPointData5Prev);
    
    // Draw visualization
    drawPoints();
    drawMeasurements();
  }
  
  // Update text overlay
  updateTextOverlay();
  
  // Render scene
  renderer.render(scene, camera);
}

// ===== START =====

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already loaded
  init();
}
