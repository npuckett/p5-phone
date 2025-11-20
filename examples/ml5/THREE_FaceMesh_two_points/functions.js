/*
Helper Functions for Three.js FaceMesh Tracking

This file contains all helper functions for the FaceMesh tracking example.
Functions are organized by category:
- Three.js scene helpers
- ML5 callbacks
- Coordinate mapping
- Measurement functions
- Visualization functions
- Drawing primitives
- Text overlay
- UI functions
*/

// ==============================================
// THREE.JS SCENE HELPERS
// ==============================================

/**
 * Handle window resize
 * Updates renderer and camera to maintain aspect ratio
 */
function onWindowResize() {
  // For now, we keep a fixed canvas size
  // Could be extended to handle responsive sizing
  renderer.setSize(canvasWidth, canvasHeight);
}

/**
 * Clear dynamic objects from scene
 * Removes all objects except video background and text sprite
 */
function clearScene() {
  // Remove all objects except video background and text sprite
  const objectsToRemove = [];
  scene.children.forEach(child => {
    if (child !== videoBackground && child !== textSprite) {
      objectsToRemove.push(child);
    }
  });
  objectsToRemove.forEach(obj => scene.remove(obj));
}

// ==============================================
// ML5 CALLBACKS
// ==============================================

/**
 * Callback function when faces are detected
 * @param {Array} results - Array of detected faces
 */
function gotFaces(results) {
  faces = results || [];
}

// ==============================================
// COORDINATE MAPPING
// ==============================================

/**
 * Get keypoint data for a specific face point
 * @param {number} index - Keypoint index (0-467 for FaceMesh)
 * @param {number} faceNumber - Which face to get data from (default: 0)
 * @returns {Object|null} Keypoint data with canvas coordinates, or null if not found
 */
function getKeypoint(index, faceNumber = 0) {
  if (!faces || faces.length <= faceNumber) return null;
  
  const face = faces[faceNumber];
  if (!face || !face.keypoints) return null;
  
  const point = face.keypoints[index];
  if (!point) return null;
  
  // Map the keypoint to canvas coordinates
  return mapKeypointToCanvas(point, index);
}

/**
 * Map ML5 keypoint to canvas coordinates
 * Handles coordinate transformation from video space to canvas space
 * 
 * @param {Object} keypoint - ML5 keypoint with x, y, z properties
 * @param {number} index - Keypoint index for reference
 * @returns {Object} Mapped keypoint with canvas coordinates
 * 
 * Coordinate transformation process:
 * NOTE: FaceMesh keypoints are already in pixel coordinates (not normalized [0,1])
 * 1. ML5 keypoint: pixel coordinates relative to video dimensions
 * 2. Apply fitHeight scaling: scale to match canvas height
 * 3. Center horizontally: adjust X to center the scaled video
 * 4. Mirror X coordinate: flip horizontally for front camera
 * 5. Invert Y coordinate: flip vertically for Three.js coordinate system
 * 
 * Example:
 * ML5 keypoint:     {x: 320, y: 240, z: 0}        (center of 640x480 video)
 * Scaled:           {x: 480, y: 360, z: 0}        (scaled by 720/480 = 1.5)
 * Centered:         {x: 442.5, y: 360, z: 0}      (centered: 480 - (480-405)/2)
 * Mirrored X:       {x: -37.5, y: 360, z: 0}      (405 - 442.5)
 * Inverted Y:       {x: -37.5, y: 360, z: 0}      (720 - 360)
 */
function mapKeypointToCanvas(keypoint, index) {
  // Step 1: FaceMesh coordinates are already in pixels, no conversion needed
  const videoX = keypoint.x;
  const videoY = keypoint.y;
  
  // Step 2: Apply fitHeight scaling
  // Scale to match canvas height, may crop width
  const scale = canvasHeight / videoHeight;
  const scaledX = videoX * scale;
  const scaledY = videoY * scale;
  
  // Step 3: Center horizontally
  // Calculate how much width is cropped
  const scaledVideoWidth = videoWidth * scale;
  const cropOffset = (scaledVideoWidth - canvasWidth) / 2;
  const centeredX = scaledX - cropOffset;
  
  // Step 4: Mirror X coordinate (front camera effect)
  const mirroredX = canvasWidth - centeredX;
  
  // Step 5: Invert Y coordinate for Three.js coordinate system
  // Three.js uses bottom-left origin, we want top-left
  const invertedY = canvasHeight - scaledY;
  
  return {
    x: mirroredX,
    y: invertedY,
    z: keypoint.z,
    index: index
  };
}

// ==============================================
// MEASUREMENT FUNCTIONS
// ==============================================

/**
 * Measure distance between two points
 * @param {Object} point1 - First point with x, y coordinates
 * @param {Object} point2 - Second point with x, y coordinates
 * @returns {number|null} Distance in pixels, or null if points invalid
 */
function measureDistance(point1, point2) {
  if (!point1 || !point2) return null;
  
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Measure angle from horizontal
 * @param {Object} basePoint - Base point (origin of angle)
 * @param {Object} endPoint - End point (defines angle direction)
 * @returns {number|null} Angle in degrees (0-360), or null if points invalid
 */
function measureAngle(basePoint, endPoint) {
  if (!basePoint || !endPoint) return null;
  
  const dx = endPoint.x - basePoint.x;
  const dy = endPoint.y - basePoint.y;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  
  return angle;
}

/**
 * Measure velocity between current and previous point
 * @param {Object} currentPoint - Current point position
 * @param {Object} previousPoint - Previous point position
 * @returns {Object} Velocity object with x, y components and speed
 */
function measureVelocity(currentPoint, previousPoint) {
  if (!currentPoint || !previousPoint) {
    return { x: 0, y: 0, speed: 0 };
  }
  
  const vx = currentPoint.x - previousPoint.x;
  const vy = currentPoint.y - previousPoint.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  
  return { x: vx, y: vy, speed: speed };
}

// ==============================================
// VISUALIZATION FUNCTIONS
// ==============================================

/**
 * Draw all tracked points
 * Shows points with different colors based on their role
 */
function drawPoints() {
  // Eyes
  if (facePointData1) drawCircle(facePointData1.x, facePointData1.y, 10, 0xff0000);  // Red
  if (facePointData2) drawCircle(facePointData2.x, facePointData2.y, 10, 0x0000ff);  // Blue
  
  // Lips
  if (facePointData3) drawCircle(facePointData3.x, facePointData3.y, 10, 0x00ff00);  // Green
  if (facePointData4) drawCircle(facePointData4.x, facePointData4.y, 10, 0xff00ff);  // Magenta
  
  // Nose
  if (facePointData5) drawCircle(facePointData5.x, facePointData5.y, 10, 0xffff00);  // Yellow
}

/**
 * Draw all measurements (distances, angles, velocity)
 * Only draws if showData is true
 */
function drawMeasurements() {
  if (!showData) return;
  
  // Distance and angle between eyes
  if (facePointData1 && facePointData2 && distance1_2) {
    // Draw line between eyes
    drawLine(
      facePointData1.x, facePointData1.y,
      facePointData2.x, facePointData2.y,
      0xffa500  // Orange
    );
    
    // Draw angle arc from eye 1 to eye 2
    if (angle1_2 !== null) {
      drawArc(
        facePointData1.x, facePointData1.y,
        30,
        0,
        angle1_2 * Math.PI / 180,
        0xffa500  // Orange
      );
      
      // Draw reference line at 0 degrees
      const refEndX = facePointData1.x + 30;
      const refEndY = facePointData1.y;
      drawLine(
        facePointData1.x, facePointData1.y,
        refEndX, refEndY,
        0xffa500,  // Orange
        0.5        // Semi-transparent
      );
    }
  }
  
  // Distance and angle between lips
  if (facePointData3 && facePointData4 && distance3_4) {
    // Draw line between lips
    drawLine(
      facePointData3.x, facePointData3.y,
      facePointData4.x, facePointData4.y,
      0xffa500  // Orange
    );
    
    // Draw angle arc from lip 3 to lip 4
    if (angle3_4 !== null) {
      drawArc(
        facePointData3.x, facePointData3.y,
        30,
        0,
        angle3_4 * Math.PI / 180,
        0xffa500  // Orange
      );
      
      // Draw reference line at 0 degrees
      const refEndX = facePointData3.x + 30;
      const refEndY = facePointData3.y;
      drawLine(
        facePointData3.x, facePointData3.y,
        refEndX, refEndY,
        0xffa500,  // Orange
        0.5        // Semi-transparent
      );
    }
  }
  
  // Velocity arrow for nose
  if (facePointData5 && velocity5 && velocity5.speed > 1) {
    const scale = 2;
    const endX = facePointData5.x + velocity5.x * scale;
    const endY = facePointData5.y + velocity5.y * scale;
    
    drawArrow(
      facePointData5.x, facePointData5.y,
      endX, endY,
      0xffff00  // Yellow
    );
  }
}

// ==============================================
// DRAWING PRIMITIVES
// ==============================================

/**
 * Draw a circle at specified position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} radius - Circle radius
 * @param {number} color - Hex color value
 */
function drawCircle(x, y, radius, color) {
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const circle = new THREE.Mesh(geometry, material);
  circle.position.set(x, y, 1);
  scene.add(circle);
}

/**
 * Draw a line between two points
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {number} color - Hex color value
 * @param {number} opacity - Line opacity (default: 1)
 */
function drawLine(x1, y1, x2, y2, color, opacity = 1) {
  const points = [];
  points.push(new THREE.Vector3(x1, y1, 1));
  points.push(new THREE.Vector3(x2, y2, 1));
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: color,
    transparent: opacity < 1,
    opacity: opacity
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

/**
 * Draw an arc
 * @param {number} x - Center X coordinate
 * @param {number} y - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @param {number} color - Hex color value
 */
function drawArc(x, y, radius, startAngle, endAngle, color) {
  const curve = new THREE.EllipseCurve(
    0, 0,              // Center offset (we'll position the whole curve)
    radius, radius,    // X radius, Y radius
    startAngle,        // Start angle
    endAngle,          // End angle
    false,             // Clockwise
    0                  // Rotation
  );
  
  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: color });
  const arc = new THREE.Line(geometry, material);
  arc.position.set(x, y, 1);
  scene.add(arc);
}

/**
 * Draw an arrow from one point to another
 * @param {number} x1 - Start X coordinate
 * @param {number} y1 - Start Y coordinate
 * @param {number} x2 - End X coordinate
 * @param {number} y2 - End Y coordinate
 * @param {number} color - Hex color value
 */
function drawArrow(x1, y1, x2, y2, color) {
  // Draw main line
  drawLine(x1, y1, x2, y2, color);
  
  // Calculate arrow head
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLength = 10;
  const arrowAngle = Math.PI / 6;
  
  // Arrow head point 1
  const ax1 = x2 - arrowLength * Math.cos(angle - arrowAngle);
  const ay1 = y2 - arrowLength * Math.sin(angle - arrowAngle);
  
  // Arrow head point 2
  const ax2 = x2 - arrowLength * Math.cos(angle + arrowAngle);
  const ay2 = y2 - arrowLength * Math.sin(angle + arrowAngle);
  
  // Draw arrow head triangle
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(ax1 - x2, ay1 - y2);
  shape.lineTo(ax2 - x2, ay2 - y2);
  shape.lineTo(0, 0);
  
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const arrowHead = new THREE.Mesh(geometry, material);
  arrowHead.position.set(x2, y2, 1);
  scene.add(arrowHead);
}

// ==============================================
// TEXT OVERLAY
// ==============================================

/**
 * Update text overlay with status and measurements
 * Uses Canvas 2D API to render text, then updates Three.js texture
 */
function updateTextOverlay() {
  // Clear canvas
  textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);
  
  // Set text style
  textContext.font = '16px Arial';
  textContext.textAlign = 'center';
  textContext.fillStyle = 'white';
  textContext.strokeStyle = 'black';
  textContext.lineWidth = 3;
  
  // Draw status at top
  let statusText = '';
  if (!videoElement || !videoElement.srcObject) {
    statusText = 'Starting camera...';
  } else if (faces.length === 0) {
    statusText = 'Show your face to start tracking';
  } else {
    statusText = 'Tracking 5 face points';
  }
  
  textContext.strokeText(statusText, canvasWidth / 2, 20);
  textContext.fillText(statusText, canvasWidth / 2, 20);
  
  // Draw instructions at bottom
  textContext.font = '14px Arial';
  textContext.strokeText('Click canvas to toggle video', canvasWidth / 2, canvasHeight - 40);
  textContext.fillText('Click canvas to toggle video', canvasWidth / 2, canvasHeight - 40);
  
  // Draw point coordinates and measurements if showData is true
  if (showData && faces.length > 0) {
    textContext.font = '8px Arial';
    textContext.textAlign = 'center';
    textContext.fillStyle = 'yellow';
    
    // Point coordinates
    if (facePointData3) {
      const text = `(${Math.round(facePointData3.x)}, ${Math.round(facePointData3.y)})`;
      const y = canvasHeight - facePointData3.y + 15;
      textContext.strokeText(text, facePointData3.x, y);
      textContext.fillText(text, facePointData3.x, y);
    }
    
    if (facePointData4) {
      const text = `(${Math.round(facePointData4.x)}, ${Math.round(facePointData4.y)})`;
      const y = canvasHeight - facePointData4.y + 15;
      textContext.strokeText(text, facePointData4.x, y);
      textContext.fillText(text, facePointData4.x, y);
    }
    
    if (facePointData5) {
      const text = `(${Math.round(facePointData5.x)}, ${Math.round(facePointData5.y)})`;
      const y = canvasHeight - facePointData5.y + 15;
      textContext.strokeText(text, facePointData5.x, y);
      textContext.fillText(text, facePointData5.x, y);
    }
    
    // Distance measurements
    textContext.font = '12px Arial';
    textContext.fillStyle = 'orange';
    
    if (facePointData1 && facePointData2 && distance1_2) {
      const midX = (facePointData1.x + facePointData2.x) / 2;
      const midY = (facePointData1.y + facePointData2.y) / 2;
      const text = `${Math.round(distance1_2)}px`;
      const y = canvasHeight - midY;
      textContext.strokeText(text, midX, y);
      textContext.fillText(text, midX, y);
    }
    
    if (facePointData3 && facePointData4 && distance3_4) {
      const midX = (facePointData3.x + facePointData3.x) / 2;
      const midY = (facePointData3.y + facePointData4.y) / 2;
      const text = `${Math.round(distance3_4)}px`;
      const y = canvasHeight - midY;
      textContext.strokeText(text, midX, y);
      textContext.fillText(text, midX, y);
    }
    
    // Angle measurements
    if (facePointData1 && angle1_2 !== null) {
      const text = `${Math.round(angle1_2)}°`;
      const x = facePointData1.x + 35;
      const y = canvasHeight - facePointData1.y;
      textContext.textAlign = 'left';
      textContext.strokeText(text, x, y);
      textContext.fillText(text, x, y);
      textContext.textAlign = 'center';
    }
    
    if (facePointData3 && angle3_4 !== null) {
      const text = `${Math.round(angle3_4)}°`;
      const x = facePointData3.x + 35;
      const y = canvasHeight - facePointData3.y;
      textContext.textAlign = 'left';
      textContext.strokeText(text, x, y);
      textContext.fillText(text, x, y);
      textContext.textAlign = 'center';
    }
    
    // Velocity measurement
    if (facePointData5 && velocity5 && velocity5.speed > 0) {
      textContext.fillStyle = 'yellow';
      const text = `vx: ${velocity5.x.toFixed(1)} vy: ${velocity5.y.toFixed(1)} speed: ${velocity5.speed.toFixed(1)}`;
      const y = canvasHeight - facePointData5.y - 20;
      textContext.strokeText(text, facePointData5.x, y);
      textContext.fillText(text, facePointData5.x, y);
    }
  }
  
  // Update texture
  textSprite.material.map.needsUpdate = true;
}

// ==============================================
// UI FUNCTIONS
// ==============================================

/**
 * Toggle video visibility
 */
function toggleVideoVisibility() {
  showVideo = !showVideo;
}
