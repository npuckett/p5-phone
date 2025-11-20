/*
ML5 FaceMesh Detection - Multiple Points with Velocity (Three.js)

This script uses ML5 FaceMesh with Three.js for face tracking visualization.
It tracks 5 face points: eyes, lips, and nose with velocity tracking.
Works on both phone and desktop with portrait orientation.

Key Variables:
- videoElement: HTML video element for camera feed
- faceMesh: ML5 FaceMesh detection model
- faces: Array to store detected faces
- facePointIndex1-5: Indices of face points to track (two-variable method)
- facePointData1-5: Global variables storing face point data (two-variable method)
- distance1_2, angle1_2: Global measurement variables for eyes
- distance3_4, angle3_4: Global measurement variables for lips
- velocity5: Global velocity data for nose (x, y, speed)

Key Functions:
- init(): Initializes Three.js, camera, and ML5 model
- loadFaceMeshModel(): Creates ML5 FaceMesh and starts detection
- setupCamera(): Sets up native WebRTC camera access
- setupThreeJS(): Creates Three.js scene, camera, renderer
- createVideoBackground(): Sets up video texture for background
- animate(): Main animation loop
- gotFaces(): Callback when faces are detected (in functions.js)

Common FaceMesh Keypoint Indices (468 points total):
Key landmarks:
1: Right eye inner corner
4: Nose tip
13: Upper lip center
14: Lower lip center
152: Chin
234: Left eye outer corner
454: Right eye outer corner

Example - Using the two-variable method with global measurements:
// Global variables are declared at top for indices, data, and measurements
// In animate(), data and measurements are automatically updated each frame:
facePointData1 = getKeypoint(facePointIndex1, 0);
distance1_2 = measureDistance(facePointData1, facePointData2);
angle1_2 = measureAngle(facePointData1, facePointData2);
velocity5 = measureVelocity(facePointData5, facePointData5Prev);

Controls:
- Click canvas: Toggle video visibility
*/

// ==============================================
// GLOBAL VARIABLES
// ==============================================

// Video and ML5
let videoElement;           // HTML video element
let faceMesh;               // ML5 FaceMesh model
let faces = [];             // Detected faces

// Three.js components
let scene, camera, renderer;
let videoBackground;        // Video texture mesh
let videoTexture;           // Three.js VideoTexture

// Canvas dimensions (portrait orientation)
const canvasWidth = 405;
const canvasHeight = 720;

// Video dimensions (will be set after camera starts)
let videoWidth = 640;
let videoHeight = 480;

// Display settings
let showVideo = true;       // Toggle video display
let showData = true;        // Toggle measurement visualization

// Text overlay
let textSprite;             // Three.js sprite for text overlay
let textCanvas;             // Canvas for rendering text
let textContext;            // 2D context for text rendering

// Two-variable method: Define which points to track and store their data
let facePointIndex1 = 234;      // Left eye outer corner
let facePointData1 = null;      // Stores mapped left eye data

let facePointIndex2 = 454;      // Right eye outer corner
let facePointData2 = null;      // Stores mapped right eye data

let facePointIndex3 = 13;       // Upper lip center
let facePointData3 = null;      // Stores mapped upper lip data

let facePointIndex4 = 14;       // Lower lip center
let facePointData4 = null;      // Stores mapped lower lip data

let facePointIndex5 = 4;        // Nose tip
let facePointData5 = null;      // Stores mapped nose data
let facePointData5Prev = null;  // Previous frame data for velocity

// Global measurement variables
let distance1_2 = 0;            // Distance between eyes
let angle1_2 = 0;               // Angle between eyes
let distance3_4 = 0;            // Distance between lips
let angle3_4 = 0;               // Angle between lips
let velocity5 = { x: 0, y: 0, speed: 0 }; // Nose velocity

// ==============================================
// INITIALIZATION
// ==============================================

/**
 * Initialize the application
 * Sets up Three.js scene, camera, and ML5 FaceMesh model
 */
async function init() {
  console.log('Initializing...');
  
  // Setup Three.js scene, camera, and renderer
  setupThreeJS();
  
  // Setup camera and load model
  await setupCamera();
  await loadFaceMeshModel();
  
  console.log('Initialization complete');
}

/**
 * Load and configure ML5 FaceMesh model
 * Starts detection when model is ready
 */
async function loadFaceMeshModel() {
  console.log('Loading FaceMesh model...');
  
  // Configure ML5 FaceMesh options
  const options = {
    maxFaces: 1,              // Only detect 1 face
    refineLandmarks: false,   // Skip detailed landmarks (faster)
    runtime: 'mediapipe',     // Use MediaPipe runtime
    flipHorizontal: false     // Don't flip - we handle mirroring in mapping
  };
  
  // Create FaceMesh model
  faceMesh = await ml5.faceMesh(options);
  console.log('FaceMesh model loaded');
  
  // Start detection
  faceMesh.detectStart(videoElement, gotFaces);
  console.log('Detection started');
  
  // Start animation loop
  animate();
}

/**
 * Setup native WebRTC camera
 * Returns a promise that resolves when camera is ready
 */
function setupCamera() {
  return new Promise((resolve, reject) => {
    console.log('Setting up camera...');
    
    // Create video element
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);
    
    // Request camera access (front camera)
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    })
    .then(stream => {
      videoElement.srcObject = stream;
      
      // Wait for video metadata to load
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        
        // Update video dimensions
        videoWidth = videoElement.videoWidth;
        videoHeight = videoElement.videoHeight;
        console.log(`Camera ready: ${videoWidth}x${videoHeight}`);
        
        // Create video background after video is ready
        createVideoBackground();
        
        resolve();
      };
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
      reject(err);
    });
  });
}

/**
 * Setup Three.js scene, camera, and renderer
 */
function setupThreeJS() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  // Create orthographic camera for 2D-style rendering
  // Using portrait orientation: width=405, height=720
  camera = new THREE.OrthographicCamera(
    0,              // left
    canvasWidth,    // right
    canvasHeight,   // top (inverted for canvas-style coordinates)
    0,              // bottom (inverted for canvas-style coordinates)
    0.1,            // near
    1000            // far
  );
  camera.position.z = 5;
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(canvasWidth, canvasHeight);
  document.body.appendChild(renderer.domElement);
  
  // Create text overlay sprite
  textCanvas = document.createElement('canvas');
  textCanvas.width = canvasWidth;
  textCanvas.height = canvasHeight;
  textContext = textCanvas.getContext('2d');
  
  const textTexture = new THREE.CanvasTexture(textCanvas);
  const textMaterial = new THREE.SpriteMaterial({ 
    map: textTexture,
    transparent: true,
    depthTest: false
  });
  textSprite = new THREE.Sprite(textMaterial);
  textSprite.scale.set(canvasWidth, canvasHeight, 1);
  textSprite.position.set(canvasWidth / 2, canvasHeight / 2, 2);
  scene.add(textSprite);
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Handle canvas click to toggle video
  renderer.domElement.addEventListener('click', toggleVideoVisibility);
  
  console.log('Three.js setup complete');
}

/**
 * Create video background with fitHeight scaling
 * Matches p5-phone's fitHeight behavior
 */
function createVideoBackground() {
  console.log('Creating video background...');
  
  // Create video texture
  videoTexture = new THREE.VideoTexture(videoElement);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  
  // Calculate scale to fit video height to canvas height (fitHeight mode)
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  
  // Scale to fit height, crop width if needed
  const scale = canvasHeight / videoHeight;
  const scaledWidth = videoWidth * scale;
  const scaledHeight = canvasHeight;
  
  // Create plane geometry
  const geometry = new THREE.PlaneGeometry(scaledWidth, scaledHeight);
  const material = new THREE.MeshBasicMaterial({ 
    map: videoTexture,
    side: THREE.DoubleSide
  });
  
  videoBackground = new THREE.Mesh(geometry, material);
  
  // Position to fill canvas (centered horizontally)
  videoBackground.position.set(canvasWidth / 2, canvasHeight / 2, 0);
  
  // Flip horizontally for mirror effect (front camera)
  videoBackground.scale.x = -1;
  
  scene.add(videoBackground);
  
  console.log('Video background created');
}

/**
 * Main animation loop
 * Updates and renders the scene
 */
function animate() {
  requestAnimationFrame(animate);
  
  // Update video texture
  if (videoTexture) {
    videoTexture.needsUpdate = true;
  }
  
  // Update video visibility
  if (videoBackground) {
    videoBackground.visible = showVideo;
  }
  
  // Clear previous drawings
  clearScene();
  
  // Update global point data and measure between specified points
  if (faces.length > 0) {
    // Update global variables with current point data
    facePointData1 = getKeypoint(facePointIndex1, 0);
    facePointData2 = getKeypoint(facePointIndex2, 0);
    facePointData3 = getKeypoint(facePointIndex3, 0);
    facePointData4 = getKeypoint(facePointIndex4, 0);
    
    // Store previous nose position for velocity calculation
    facePointData5Prev = facePointData5;
    facePointData5 = getKeypoint(facePointIndex5, 0);
    
    // Calculate global measurements
    distance1_2 = measureDistance(facePointData1, facePointData2);
    angle1_2 = measureAngle(facePointData1, facePointData2);
    distance3_4 = measureDistance(facePointData3, facePointData4);
    angle3_4 = measureAngle(facePointData3, facePointData4);
    velocity5 = measureVelocity(facePointData5, facePointData5Prev);
    
    // Draw points and measurements
    drawPoints();
    drawMeasurements();
  }
  
  // Update text overlay
  updateTextOverlay();
  
  // Render the scene
  renderer.render(scene, camera);
}

// Start initialization when page loads
window.addEventListener('load', init);
