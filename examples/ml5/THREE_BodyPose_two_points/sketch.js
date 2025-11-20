/*
ML5 BodyPose Detection - Multiple Points with Velocity (Three.js)

This script uses ML5 BodyPose (BlazePose) with Three.js for body tracking visualization.
It tracks 5 body points: shoulders, wrists, and nose with velocity tracking.
Works on both phone and desktop with portrait orientation.

Key Variables:
- videoElement: HTML video element for camera feed
- bodypose: ML5 BodyPose detection model
- poses: Array to store detected bodies
- bodyPointIndex1-5: Indices of body points to track (two-variable method)
- bodyPointData1-5: Global variables storing body point data (two-variable method)
- distance1_2, angle1_2: Global measurement variables for shoulders
- distance3_4, angle3_4: Global measurement variables for wrists
- velocity5: Global velocity data for nose (x, y, speed)

Key Functions:
- init(): Initializes Three.js, camera, and ML5 model
- loadBodyPoseModel(): Creates ML5 BodyPose and starts detection
- setupCamera(): Sets up native WebRTC camera access
- setupThreeJS(): Creates Three.js scene, camera, renderer
- createVideoBackground(): Sets up video texture for background
- animate(): Main animation loop
- gotPoses(): Callback when poses are detected (in functions.js)

BodyPose (BlazePose) Keypoint Indices (33 points total):
Body structure:
- Nose: 0
- Eyes: 1 (left inner), 2 (left), 3 (left outer), 4 (right inner), 5 (right), 6 (right outer)
- Ears: 7 (left), 8 (right)
- Mouth: 9 (left), 10 (right)
- Shoulders: 11 (left), 12 (right)
- Elbows: 13 (left), 14 (right)
- Wrists: 15 (left), 16 (right)
- Pinkies: 17 (left), 18 (right)
- Index fingers: 19 (left), 20 (right)
- Thumbs: 21 (left), 22 (right)
- Hips: 23 (left), 24 (right)
- Knees: 25 (left), 26 (right)
- Ankles: 27 (left), 28 (right)
- Heels: 29 (left), 30 (right)
- Foot indices: 31 (left), 32 (right)

Example - Using the two-variable method with global measurements:
// Global variables are declared at top for indices, data, and measurements
// In animate(), data and measurements are automatically updated each frame:
bodyPointData1 = getKeypoint(bodyPointIndex1, 0);
distance1_2 = measureDistance(bodyPointData1, bodyPointData2);
angle1_2 = measureAngle(bodyPointData1, bodyPointData2);
velocity5 = measureVelocity(bodyPointData5, bodyPointData5Prev);

Controls:
- Click canvas: Toggle video visibility
*/

// ==============================================
// GLOBAL VARIABLES
// ==============================================

// Video and ML5
let videoElement;           // HTML video element
let bodypose;               // ML5 BodyPose model
let poses = [];             // Detected bodies

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
let bodyPointIndex1 = 11;       // Left shoulder
let bodyPointData1 = null;      // Stores mapped left shoulder data

let bodyPointIndex2 = 12;       // Right shoulder
let bodyPointData2 = null;      // Stores mapped right shoulder data

let bodyPointIndex3 = 15;       // Left wrist
let bodyPointData3 = null;      // Stores mapped left wrist data

let bodyPointIndex4 = 16;       // Right wrist
let bodyPointData4 = null;      // Stores mapped right wrist data

let bodyPointIndex5 = 0;        // Nose
let bodyPointData5 = null;      // Stores mapped nose data
let bodyPointData5Prev = null;  // Previous frame data for velocity

// Global measurement variables
let distance1_2 = 0;            // Distance between shoulders
let angle1_2 = 0;               // Angle between shoulders
let distance3_4 = 0;            // Distance between wrists
let angle3_4 = 0;               // Angle between wrists
let velocity5 = { x: 0, y: 0, speed: 0 }; // Nose velocity

// ==============================================
// INITIALIZATION
// ==============================================

/**
 * Initialize the application
 * Sets up Three.js scene, camera, and ML5 BodyPose model
 */
async function init() {
  console.log('Initializing...');
  
  // Setup Three.js scene, camera, and renderer
  setupThreeJS();
  
  // Setup camera and load model
  await setupCamera();
  await loadBodyPoseModel();
  
  console.log('Initialization complete');
}

/**
 * Load and configure ML5 BodyPose model
 * Starts detection when model is ready
 */
async function loadBodyPoseModel() {
  console.log('Loading BodyPose model...');
  
  // Configure ML5 BodyPose (BlazePose) options
  const options = {
    runtime: 'mediapipe',               // Use MediaPipe runtime
    modelType: 'lite',                  // Fast model for phone ('lite', 'full', or 'heavy')
    enableSmoothing: true,              // Smooth tracking
    minPoseScore: 0.25,                 // Minimum confidence threshold
    multiPoseMaxDimension: 256,         // Resolution (lower = faster)
    flipped: false                      // Don't flip - we handle mirroring in mapping
  };
  
  // Create BodyPose model
  bodypose = await ml5.bodyPose('BlazePose', options);
  console.log('BodyPose model loaded');
  
  // Start detection
  bodypose.detectStart(videoElement, gotPoses);
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
  if (poses.length > 0) {
    // Update global variables with current point data
    bodyPointData1 = getKeypoint(bodyPointIndex1, 0);
    bodyPointData2 = getKeypoint(bodyPointIndex2, 0);
    bodyPointData3 = getKeypoint(bodyPointIndex3, 0);
    bodyPointData4 = getKeypoint(bodyPointIndex4, 0);
    
    // Store previous nose position for velocity calculation
    bodyPointData5Prev = bodyPointData5;
    bodyPointData5 = getKeypoint(bodyPointIndex5, 0);
    
    // Calculate global measurements
    distance1_2 = measureDistance(bodyPointData1, bodyPointData2);
    angle1_2 = measureAngle(bodyPointData1, bodyPointData2);
    distance3_4 = measureDistance(bodyPointData3, bodyPointData4);
    angle3_4 = measureAngle(bodyPointData3, bodyPointData4);
    velocity5 = measureVelocity(bodyPointData5, bodyPointData5Prev);
    
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
