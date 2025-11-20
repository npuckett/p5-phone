/*
ML5 HandPose Detection - Multiple Points with Velocity (Phone Adapted)

This script uses ML5 HandPose with p5-phone for automatic coordinate mapping.
It tracks 5 hand points: fingertips and wrist with velocity tracking.
Works on both phone and desktop with portrait orientation.

Key Variables:
- cam: PhoneCamera instance for video feed
- handpose: ML5 HandPose detection model
- hands: Array to store detected hands
- handPointIndex1-5: Indices of hand points to track (two-variable method)
- handPointData1-5: Global variables storing hand point data (two-variable method)
- distance1_2, angle1_2: Global measurement variables for thumb-index
- distance3_4, angle3_4: Global measurement variables for index-middle
- velocity5: Global velocity data for wrist (x, y, speed)

Key Functions:
- setup(): Initializes canvas and PhoneCamera
- gotHands(): Callback function when hands are detected
- showPoint(): Highlights a specific keypoint with given color and index
- getKeypoint(): Helper function to safely get keypoint data
- measureDistance(point1, point2): Calculates and shows distance between two points in pixels
- measureAngle(basePoint, endPoint): Calculates and shows angle from horizontal in degrees
- measureVelocity(current, previous): Calculates and shows velocity in x, y directions and speed

HandPose Keypoint Indices (21 points total per hand):
Finger structure: Each finger has 4 keypoints (base to tip)
- Wrist: 0
- Thumb: 1, 2, 3, 4 (tip)
- Index: 5, 6, 7, 8 (tip)
- Middle: 9, 10, 11, 12 (tip)
- Ring: 13, 14, 15, 16 (tip)
- Pinky: 17, 18, 19, 20 (tip)

Example - Using the two-variable method with global measurements:
// Global variables are declared at top for indices, data, and measurements
// In draw(), data and measurements are automatically updated each frame:
handPointData1 = getKeypoint(handPointIndex1, 0);
distance1_2 = measureDistance(handPointData1, handPointData2);
angle1_2 = measureAngle(handPointData1, handPointData2);
velocity5 = measureVelocity(handPointData5, handPointData5Prev);

Controls:
- Touch screen: Toggle video visibility
- Change showData variable (true/false) to toggle measurement visualization
*/

// ==============================================
// GLOBAL VARIABLES
// ==============================================
let cam;                // PhoneCamera instance
let handpose;           // ML5 HandPose model
let hands = [];         // Detected hands
let showVideo = true;   // Toggle video display
let showData = true;    // Toggle measurement visualization (lines, arcs, text)

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
    // Configure ML5 HandPose AFTER camera is ready
    let options = {
      maxHands: 1,           // Only detect 1 hand
      runtime: 'mediapipe',  // Use MediaPipe runtime
      flipHorizontal: false  // Don't flip in ML5 - cam.mapKeypoint() handles mirroring
    };
    
    // Create HandPose model and start detection when ready
    handpose = ml5.handPose(options, () => {
      handpose.detectStart(cam.videoElement, gotHands);
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
    
    // Fingertips: Check if points are valid and display
    if (handPointData1 && handPointData2) {
      // Show the thumb and index in different colors
      showPoint(handPointData1, color(255, 0, 0));    // Red - Thumb
      showPoint(handPointData2, color(0, 0, 255));    // Blue - Index
    }
    
    if (handPointData3 && handPointData4) {
      // Show the middle and ring in different colors
      showPoint(handPointData3, color(0, 255, 0));    // Green - Middle
      showPoint(handPointData4, color(255, 0, 255));  // Magenta - Ring
    }
    
    // Wrist: Check if point is valid and display
    if (handPointData5) {
      // Show the wrist point in yellow
      showPoint(handPointData5, color(255, 255, 0));  // Yellow - Wrist
    }
  }
  
  // Draw UI
  drawUI();
}

// ==============================================
// CALLBACK - When hands are detected
// ==============================================
function gotHands(results) {
  hands = results || [];
}

// ==============================================
// HELPER - Get keypoint with mapped coordinates
// ==============================================
// Function to get a specific keypoint with coordinate mapping
function getKeypoint(index, handNumber = 0) {
  if (!hands || hands.length <= handNumber) return null;
  
  const hand = hands[handNumber];
  if (!hand || !hand.keypoints) return null;
  
  const point = hand.keypoints[index];
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
  } else if (hands.length === 0) {
    text('Show your hand to start tracking', width/2, 20);
  } else {
    text('Tracking 5 hand points', width/2, 20);
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
