// ==============================================
// HELPER FUNCTIONS FOR THREE.JS HANDPOSE
// ==============================================
// This file contains all helper functions for coordinate mapping,
// measurements, visualization, and UI.
// All global variables are accessed from sketch.js

// ==============================================
// THREE.JS HELPER FUNCTIONS
// ==============================================

function updateVideoBackground() {
  // Update video texture each frame
  if (videoTexture && videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
    videoTexture.needsUpdate = true;
  }
}

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // Maintain aspect ratio
  const canvasAspect = canvasWidth / canvasHeight;
  const containerAspect = containerWidth / containerHeight;
  
  let width, height;
  if (containerAspect > canvasAspect) {
    height = containerHeight;
    width = height * canvasAspect;
  } else {
    width = containerWidth;
    height = width / canvasAspect;
  }
  
  renderer.setSize(width, height);
}

function clearScene() {
  // Remove all meshes/lines from previous frame (keeps video and text sprite)
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const child = scene.children[i];
    if (child !== textSprite && child !== videoPlane) {
      scene.remove(child);
    }
  }
}

// ==============================================
// ML5 CALLBACKS
// ==============================================

function gotHands(results) {
  // Store detected hands (callback is called automatically by ML5)
  hands = results;
}

// ==============================================
// COORDINATE MAPPING
// ==============================================

/**
 * Get a keypoint from the detected hand and map it to canvas coordinates
 * @param {number} index - ML5 keypoint index (0-20)
 * @param {number} handNumber - Which detected hand (0 for first hand)
 * @returns {Object|null} Mapped point with x, y, z properties, or null if not found
 */
function getKeypoint(index, handNumber) {
  if (hands[handNumber] && hands[handNumber].keypoints[index]) {
    const kp = hands[handNumber].keypoints[index];
    return mapKeypointToCanvas(kp);
  }
  return null;
}

/**
 * Map ML5 keypoint coordinates to Three.js canvas coordinates
 * Handles video aspect ratio (fitHeight mode), mirroring, and Y-axis inversion
 * 
 * Process:
 * 1. Get ML5 coordinates (video space: 0-640 x 0-480)
 * 2. Calculate video display size (fitHeight: scale to canvas height, crop width)
 * 3. Scale coordinates to display size
 * 4. Adjust for centering offset
 * 5. Mirror X axis (front camera mirror effect)
 * 6. Invert Y axis (Three.js camera convention)
 * 
 * @param {Object} keypoint - ML5 keypoint with x, y, z properties
 * @returns {Object} Mapped point with x, y, z properties in canvas space
 */
function mapKeypointToCanvas(keypoint) {
  
  // Step 1: Get ML5 video coordinates (0-640, 0-480)
  const videoX = keypoint.x;
  const videoY = keypoint.y;
  
  // Step 2: Calculate how the video is displayed (fitHeight mode)
  const videoAspect = videoWidth / videoHeight;
  let displayWidth = canvasHeight * videoAspect;
  let displayHeight = canvasHeight;
  
  // If video is narrower than canvas, fit to width instead
  if (displayWidth < canvasWidth) {
    displayWidth = canvasWidth;
    displayHeight = displayWidth / videoAspect;
  }
  
  // Step 3: Scale from video dimensions to display dimensions
  let x = (videoX / videoWidth) * displayWidth;
  let y = (videoY / videoHeight) * displayHeight;
  
  // Step 4: Adjust for centering (video is centered on canvas)
  const offsetX = (displayWidth - canvasWidth) / 2;
  const offsetY = (displayHeight - canvasHeight) / 2;
  x -= offsetX;
  y -= offsetY;
  
  // Step 5: Mirror X (video plane has scale.x = -1 for front camera mirror effect)
  x = canvasWidth - x;
  
  // Step 6: Invert Y (Three.js camera has inverted Y: top=canvasHeight, bottom=0)
  y = canvasHeight - y;
  
  return { x, y, z: keypoint.z || 0 };
}

// ==============================================
// MEASUREMENT FUNCTIONS
// ==============================================

/**
 * Calculate Euclidean distance between two points
 * @param {Object} point1 - First point with x, y properties
 * @param {Object} point2 - Second point with x, y properties
 * @returns {number} Distance in pixels, or 0 if points are null
 */
function measureDistance(point1, point2) {
  if (!point1 || !point2) return 0;
  
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle from base point to end point
 * @param {Object} basePoint - Base point with x, y properties
 * @param {Object} endPoint - End point with x, y properties
 * @returns {number} Angle in radians (-PI to PI), or 0 if points are null
 */
function measureAngle(basePoint, endPoint) {
  if (!basePoint || !endPoint) return 0;
  
  const dx = endPoint.x - basePoint.x;
  const dy = endPoint.y - basePoint.y;
  return Math.atan2(dy, dx);
}

/**
 * Calculate velocity between current and previous positions
 * @param {Object} current - Current point with x, y properties
 * @param {Object} prev - Previous point with x, y properties
 * @returns {Object} Velocity object with x, y components and speed
 */
function measureVelocity(current, prev) {
  if (!current || !prev) return { x: 0, y: 0, speed: 0 };
  
  const vx = current.x - prev.x;
  const vy = current.y - prev.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  return { x: vx, y: vy, speed };
}

// ==============================================
// VISUALIZATION FUNCTIONS
// ==============================================

function drawPoints() {
  // Draw all tracked points (matching p5.js colors)
  if (handPointData1) {
    drawCircle(handPointData1.x, handPointData1.y, 20, 0xff0000); // Red - Thumb
  }
  if (handPointData2) {
    drawCircle(handPointData2.x, handPointData2.y, 20, 0x0000ff); // Blue - Index
  }
  if (handPointData3) {
    drawCircle(handPointData3.x, handPointData3.y, 20, 0x00ff00); // Green - Middle
  }
  if (handPointData4) {
    drawCircle(handPointData4.x, handPointData4.y, 20, 0xff00ff); // Magenta - Ring
  }
  if (handPointData5) {
    drawCircle(handPointData5.x, handPointData5.y, 20, 0xffff00); // Yellow - Wrist
  }
}

function drawMeasurements() {
  if (!showData) return;
  
  // Distance between thumb (1) and index (2)
  if (handPointData1 && handPointData2 && distance1_2 > 0) {
    drawLine(
      handPointData1.x, handPointData1.y,
      handPointData2.x, handPointData2.y,
      0xffa500, 2  // Orange
    );
  }
  
  // Angle from thumb (1) to index (2)
  if (handPointData1 && handPointData2 && angle1_2 !== 0) {
    const arcRadius = 30;
    drawArc(
      handPointData1.x, handPointData1.y,
      arcRadius,
      0, angle1_2,
      0xffa500, 2   // Orange
    );
    
    // Draw reference line at 0 degrees
    const endX = handPointData1.x + arcRadius;
    const endY = handPointData1.y;
    drawLine(
      handPointData1.x, handPointData1.y,
      endX, endY,
      0xffa500, 1
    );
  }
  
  // Distance between middle (3) and ring (4)
  if (handPointData3 && handPointData4 && distance3_4 > 0) {
    drawLine(
      handPointData3.x, handPointData3.y,
      handPointData4.x, handPointData4.y,
      0xffa500, 2  // Orange
    );
  }
  
  // Angle from middle (3) to ring (4)
  if (handPointData3 && handPointData4 && angle3_4 !== 0) {
    const arcRadius = 30;
    drawArc(
      handPointData3.x, handPointData3.y,
      arcRadius,
      0, angle3_4,
      0xffa500, 2   // Orange
    );
    
    // Draw reference line at 0 degrees
    const endX = handPointData3.x + arcRadius;
    const endY = handPointData3.y;
    drawLine(
      handPointData3.x, handPointData3.y,
      endX, endY,
      0xffa500, 1
    );
  }
  
  // Velocity arrow from wrist (5)
  if (handPointData5 && handPointData5Prev && velocity5.speed > 1) {
    const scale = 2;
    const endX = handPointData5.x + velocity5.x * scale;
    const endY = handPointData5.y + velocity5.y * scale;
    
    drawArrow(
      handPointData5.x, handPointData5.y,
      endX, endY,
      0xffff00, 3  // Yellow
    );
  }
}

// ==============================================
// DRAWING PRIMITIVES
// ==============================================

function drawCircle(x, y, diameter, color) {
  const geometry = new THREE.CircleGeometry(diameter / 2, 32);
  const material = new THREE.MeshBasicMaterial({ 
    color: color,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });
  const circle = new THREE.Mesh(geometry, material);
  circle.position.set(x, y, 5);
  circle.renderOrder = 100;
  scene.add(circle);
}

function drawLine(x1, y1, x2, y2, color, linewidth) {
  const points = [
    new THREE.Vector3(x1, y1, 6),
    new THREE.Vector3(x2, y2, 6)
  ];
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: color,
    depthTest: false,
    linewidth: linewidth 
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

function drawArc(x, y, radius, startAngle, endAngle, color, linewidth) {
  const curve = new THREE.EllipseCurve(
    x, y,
    radius, radius,
    startAngle, endAngle,
    false,  // clockwise
    0       // rotation
  );
  
  const points = curve.getPoints(32);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Set z position for all points
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] = 6;
  }
  
  const material = new THREE.LineBasicMaterial({ 
    color: color,
    linewidth: linewidth,
    depthTest: false
  });
  const arc = new THREE.Line(geometry, material);
  scene.add(arc);
}

function drawArrow(x1, y1, x2, y2, color, linewidth) {
  // Draw main line shaft
  drawLine(x1, y1, x2, y2, color, linewidth);
  
  // Calculate arrowhead geometry
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 10;
  const headWidth = 5;
  
  // Calculate triangle base point (back from tip)
  const backX = x2 - headLength * Math.cos(angle);
  const backY = y2 - headLength * Math.sin(angle);
  
  // Calculate left and right points perpendicular to arrow direction
  const leftX = backX - headWidth * Math.cos(angle + Math.PI / 2);
  const leftY = backY - headWidth * Math.sin(angle + Math.PI / 2);
  const rightX = backX - headWidth * Math.cos(angle - Math.PI / 2);
  const rightY = backY - headWidth * Math.sin(angle - Math.PI / 2);
  
  // Create filled triangle for arrowhead
  const shape = new THREE.Shape();
  shape.moveTo(x2, y2);
  shape.lineTo(leftX, leftY);
  shape.lineTo(rightX, rightY);
  shape.closePath();
  
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ 
    color: color,
    depthTest: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 6;
  mesh.renderOrder = 100;
  scene.add(mesh);
}

// ==============================================
// TEXT OVERLAY
// ==============================================

function updateTextOverlay() {
  const ctx = textCanvas.getContext('2d');
  
  // Clear previous frame
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  
  if (showData && hands.length > 0) {
    // Base text style (orange like p5.js version)
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgb(255, 165, 0)';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Distance 1-2 text at midpoint (thumb to index)
    if (handPointData1 && handPointData2 && distance1_2 > 0) {
      const midX = (handPointData1.x + handPointData2.x) / 2;
      const midY = canvasHeight - (handPointData1.y + handPointData2.y) / 2;
      const text = `${Math.round(distance1_2)}px`;
      ctx.strokeText(text, midX, midY);
      ctx.fillText(text, midX, midY);
    }
    
    // Angle 1-2 text near base point (thumb)
    if (handPointData1 && angle1_2 !== 0) {
      const degrees = Math.round(angle1_2 * 180 / Math.PI);
      const text = `${degrees}°`;
      const textX = handPointData1.x + 40;
      const textY = canvasHeight - handPointData1.y;
      ctx.textAlign = 'left';
      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
      ctx.textAlign = 'center';
    }
    
    // Distance 3-4 text at midpoint (middle to ring)
    if (handPointData3 && handPointData4 && distance3_4 > 0) {
      const midX = (handPointData3.x + handPointData4.x) / 2;
      const midY = canvasHeight - (handPointData3.y + handPointData4.y) / 2;
      const text = `${Math.round(distance3_4)}px`;
      ctx.strokeText(text, midX, midY);
      ctx.fillText(text, midX, midY);
    }
    
    // Angle 3-4 text near base point (middle)
    if (handPointData3 && angle3_4 !== 0) {
      const degrees = Math.round(angle3_4 * 180 / Math.PI);
      const text = `${degrees}°`;
      const textX = handPointData3.x + 40;
      const textY = canvasHeight - handPointData3.y;
      ctx.textAlign = 'left';
      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
      ctx.textAlign = 'center';
    }
    
    // Velocity text near wrist
    if (handPointData5 && velocity5.speed > 0) {
      ctx.fillStyle = 'rgb(255, 255, 0)';  // Yellow for velocity
      const text = `vx: ${velocity5.x.toFixed(1)} vy: ${velocity5.y.toFixed(1)} speed: ${velocity5.speed.toFixed(1)}`;
      const textX = handPointData5.x;
      const textY = canvasHeight - handPointData5.y - 20;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
    }
  }
  
  // Update texture
  textTexture.needsUpdate = true;
}

// ==============================================
// UI FUNCTIONS
// ==============================================

function updateStatus(message, className = '') {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = className;
}

function toggleVideoVisibility() {
  videoVisible = !videoVisible;
  const videoDisplayElement = document.getElementById('video');
  videoDisplayElement.style.display = videoVisible ? 'block' : 'none';
  
  if (videoVisible && videoElement) {
    videoDisplayElement.srcObject = videoElement.srcObject;
  }
}
