/*
ML5 BodyPose Detection - Multiple Points with Velocity (Phone Adapted)

This script uses ML5 BodyPose (BlazePose) with p5-phone for automatic coordinate mapping.
It tracks 5 body points: shoulders, wrists, and nose with velocity tracking.
Works on both phone and desktop with portrait orientation.

Key Variables:
- cam: PhoneCamera instance for video feed
- bodypose: ML5 BodyPose detection model
- poses: Array to store detected bodies
- bodyPointIndex1-5: Indices of body points to track (two-variable method)
- bodyPointData1-5: Global variables storing body point data (two-variable method)
- distance1_2, angle1_2: Global measurement variables for shoulders
- distance3_4, angle3_4: Global measurement variables for wrists
- velocity5: Global velocity data for nose (x, y, speed)

Key Functions:
- setup(): Initializes canvas and PhoneCamera
- gotPoses(): Callback function when poses are detected
- showPoint(): Highlights a specific keypoint with given color and index
- getKeypoint(): Helper function to safely get keypoint data
- measureDistance(point1, point2): Calculates and shows distance between two points in pixels
- measureAngle(basePoint, endPoint): Calculates and shows angle from horizontal in degrees
- measureVelocity(current, previous): Calculates and shows velocity in x, y directions and speed

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
// In draw(), data and measurements are automatically updated each frame:
bodyPointData1 = getKeypoint(bodyPointIndex1, 0);
distance1_2 = measureDistance(bodyPointData1, bodyPointData2);
angle1_2 = measureAngle(bodyPointData1, bodyPointData2);
velocity5 = measureVelocity(bodyPointData5, bodyPointData5Prev);

Controls:
- Touch screen: Toggle video visibility
- Change showData variable (true/false) to toggle measurement visualization
*/

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                // PhoneCamera instance
let bodypose;           // ML5 BodyPose model
let poses = [];         // Detected bodies
let showVideo = true;   // Toggle video display
let showData = true;    // Toggle measurement visualization (lines, arcs, text)

// Two-variable method: Define which points to track and store their data
let bodyPointIndex1 = 11;   // Left shoulder
let bodyPointData1 = null;  // Stores mapped left shoulder data

let bodyPointIndex2 = 0;   // Right shoulder
let bodyPointData2 = null;  // Stores mapped right shoulder data

let bodyPointIndex3 = 15;   // Left wrist
let bodyPointData3 = null;  // Stores mapped left wrist data

let bodyPointIndex4 = 16;   // Right wrist
let bodyPointData4 = null;  // Stores mapped right wrist data

let bodyPointIndex5 = 0;    // Nose
let bodyPointData5 = null;  // Stores mapped nose data
let bodyPointData5Prev = null; // Previous frame data for velocity

// Global measurement variables
let distance1_2 = 0;  // Distance between shoulders
let angle1_2 = 0;     // Angle between shoulders
let distance3_4 = 0;  // Distance between wrists
let angle3_4 = 0;     // Angle between wrists
let velocity5 = { x: 0, y: 0, speed: 0 }; // Nose velocity

// ==============================================
// SETUP - Runs once when page loads
// ==============================================
function setup() {
  // Create portrait canvas (typical phone proportions: 9:16)
  createCanvas(405, 720);
  lockGestures();  // Prevent phone gestures (zoom, refresh)
  
  // Create camera: front camera, mirrored, fit to canvas height
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  // Enable camera tap to toggle video
  enableCameraTap();
  
  // Wait for camera to initialize, then create model and start detection
  cam.onReady(() => {
    // Configure ML5 BodyPose (BlazePose) AFTER camera is ready
    let options = {
      runtime: 'mediapipe',               // Use MediaPipe runtime
      modelType: 'MULTIPOSE_LIGHTNING',   // Fast model for phone
      enableSmoothing: true,              // Smooth tracking
      minPoseScore: 0.25,                 // Minimum confidence threshold
      multiPoseMaxDimension: 256,         // Resolution (lower = faster)
      flipped: false                      // Don't flip in ML5 - cam.mapKeypoint() handles mirroring
    };
    
    // Create BodyPose model and start detection when ready
    bodypose = ml5.bodyPose('BlazePose', options, () => {
      bodypose.detectStart(cam.videoElement, gotPoses);
    });
  });
}

// ==============================================
// DRAW - Runs continuously
// ==============================================
function draw() {
  background(255);
  
  // Display the video feed
  if (showVideo && cam.ready) {
    image(cam, 0, 0);  // PhoneCamera handles positioning and mirroring
  }
  
  // Update global point data and measure between the specified points
  if (poses.length > 0) {
    // Update global variables with current point data (index, pose number)
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
    
    // Shoulders: Check if points are valid and display
    if (bodyPointData1 && bodyPointData2) {
      // Show the shoulders in different colors
      showPoint(bodyPointData1, color(255, 0, 0));    // Red - Left shoulder
      showPoint(bodyPointData2, color(0, 0, 255));    // Blue - Right shoulder
    }
    
    // Wrists: Check if points are valid and display
    if (bodyPointData3 && bodyPointData4) {
      // Show the wrists in different colors
      showPoint(bodyPointData3, color(0, 255, 0));    // Green - Left wrist
      showPoint(bodyPointData4, color(255, 0, 255));  // Magenta - Right wrist
    }
    
    // Nose: Check if point is valid and display
    if (bodyPointData5) {
      // Show the nose point in yellow
      showPoint(bodyPointData5, color(255, 255, 0));  // Yellow - Nose
    }
  }
  
  // Draw UI
  drawUI();
}

// ==============================================
// CALLBACK - When poses are detected
// ==============================================
function gotPoses(results) {
  poses = results || [];
}

// ==============================================
// HELPER - Get keypoint with mapped coordinates
// ==============================================
// Function to get a specific keypoint with coordinate mapping
function getKeypoint(index, poseNumber = 0) {
  if (!poses || poses.length <= poseNumber) return null;
  
  const pose = poses[poseNumber];
  if (!pose || !pose.keypoints) return null;
  
  const point = pose.keypoints[index];
  if (!point) return null;
  
  // Map the keypoint using PhoneCamera for coordinate transformation
  return cam.mapKeypoint(point);
}

// ==============================================
// DISPLAY - Show a point with its coordinates
// ==============================================
function showPoint(point, pointColor) {
  if (!isValidPoint(point)) return;

  // Draw point circle at screen coordinates
  fill(pointColor);
  noStroke();
  circle(point.x, point.y, 20);
  
  // Draw point index number
  if (point.index != null) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(10);
    text(point.index, point.x, point.y);
  }
  
  // Draw point coordinates only if showData is true
  if (showData) {
    fill(255, 255, 0);
    textAlign(CENTER, TOP);
    textSize(8);
    let displayText = `(${Math.round(point.x)}, ${Math.round(point.y)})`;
    text(displayText, point.x, point.y + 15);
  }
}

// ==============================================
// MEASURE - Distance between two points
// ==============================================
function measureDistance(point1, point2) {
  if (!point1 || !point2) return null;
  
  // Calculate distance
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Draw visualization only if showData is true
  if (showData) {
    // Draw line between points
    stroke(255, 165, 0); // Orange
    strokeWeight(2);
    line(point1.x, point1.y, point2.x, point2.y);
    
    // Show distance text at midpoint
    const midX = (point1.x + point2.x) / 2;
    const midY = (point1.y + point2.y) / 2;
    noStroke();
    fill(255, 165, 0);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(`${Math.round(distance)}px`, midX, midY);
  }

  return distance;
}

// ==============================================
// MEASURE - Angle from horizontal
// ==============================================
function measureAngle(basePoint, endPoint) {
  if (!basePoint || !endPoint) return null;
  
  // Calculate angle
  const dx = endPoint.x - basePoint.x;
  const dy = endPoint.y - basePoint.y;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  
  // Draw visualization only if showData is true
  if (showData) {
    // Draw angle arc
    noFill();
    stroke(255, 165, 0);
    strokeWeight(2);
    const arcRadius = 30;
    arc(basePoint.x, basePoint.y, arcRadius*2, arcRadius*2, 0, angle * PI/180);
    
    // Draw small line at 0 degrees for reference
    stroke(255, 165, 0, 127); // Semi-transparent orange
    line(basePoint.x, basePoint.y, basePoint.x + arcRadius, basePoint.y);
    
    // Show angle text near base point
    noStroke();
    fill(255, 165, 0);
    textAlign(LEFT, CENTER);
    textSize(12);
    text(`${Math.round(angle)}°`, basePoint.x + arcRadius + 5, basePoint.y);
  }

  return angle;
}

// ==============================================
// MEASURE - Velocity in x and y directions
// ==============================================
function measureVelocity(currentPoint, previousPoint) {
  // Return zero velocity if either point is missing
  if (!currentPoint || !previousPoint) {
    return { x: 0, y: 0, speed: 0 };
  }
  
  // Calculate velocity components
  const vx = currentPoint.x - previousPoint.x;
  const vy = currentPoint.y - previousPoint.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  
  // Draw visualization only if showData is true
  if (showData) {
    // Draw velocity vector from current point
    if (speed > 1) { // Only draw if there's noticeable movement
      stroke(255, 255, 0);
      strokeWeight(3);
      
      // Draw velocity arrow (scaled for visibility)
      const scale = 2;
      const endX = currentPoint.x + vx * scale;
      const endY = currentPoint.y + vy * scale;
      
      // Arrow line
      line(currentPoint.x, currentPoint.y, endX, endY);
      
      // Arrow head
      push();
      translate(endX, endY);
      rotate(atan2(vy, vx));
      fill(255, 255, 0);
      noStroke();
      triangle(-10, -5, -10, 5, 0, 0);
      pop();
    }
    
    // Show velocity text
    noStroke();
    fill(255, 255, 0);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text(`vx: ${vx.toFixed(1)} vy: ${vy.toFixed(1)} speed: ${speed.toFixed(1)}`, 
         currentPoint.x, currentPoint.y - 20);
  }
  
  return { x: vx, y: vy, speed: speed };
}

// ==============================================
// HELPER - Check if point has valid coordinates
// ==============================================
function isValidPoint(point) {
  return point && 
         typeof point.x === 'number' && 
         typeof point.y === 'number';
}

// ==============================================
// UI - Display status and instructions
// ==============================================
function drawUI() {
  push();
  fill(255);
  stroke(0);
  strokeWeight(3);
  textAlign(CENTER, TOP);
  textSize(16);
  
  // Show status at top of screen
  if (!cam.ready) {
    text('Starting camera...', width/2, 20);
  } else if (poses.length === 0) {
    text('Show your body to start tracking', width/2, 20);
  } else {
    text('Tracking 5 body points', width/2, 20);
  }
  
  // Instructions at bottom
  textSize(14);
  text('Tap screen to toggle video', width/2, height - 40);
  pop();
}

// ==============================================
// INTERACTION - Toggle video on touch
// ==============================================
function mousePressed() {
  showVideo = !showVideo;
}
