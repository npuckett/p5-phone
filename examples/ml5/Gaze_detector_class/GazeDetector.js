/**
 * GazeDetector Class
 * 
 * A reusable class for detecting gaze direction using ML5 FaceMesh.
 * Simplifies the complex process of tracking face landmarks and calculating
 * where the user is looking on screen.
 * 
 * WHAT IT DOES:
 * - Automatically sets up camera and FaceMesh model
 * - Tracks 3D face keypoints (ears, nose)
 * - Calculates gaze direction (LEFT, CENTER, RIGHT)
 * - Provides smooth gaze position (X, Y coordinates)
 * - Optional visualization of tracking data
 * 
 * HOW TO USE:
 * 
 *   let gazeDetector;
 * 
 *   function setup() {
 *     createCanvas(405, 720);
 *     gazeDetector = new GazeDetector();
 *   }
 * 
 *   function draw() {
 *     gazeDetector.update();
 *     
 *     if (gazeDetector.isFaceDetected()) {
 *       let direction = gazeDetector.getDirection();  // "LEFT", "CENTER", "RIGHT"
 *       let position = gazeDetector.getGazePosition(); // {x, y}
 *       
 *       // Use gaze data for interaction
 *       circle(position.x, position.y, 50);
 *     }
 *   }
 * 
 * BENEFITS OVER FUNCTION VERSION:
 * - Setup reduced from 40+ lines to 1 line
 * - All gaze logic encapsulated in one class
 * - Easy to reuse in multiple projects
 * - Clean, documented API
 * - Tunable parameters with sensible defaults
 */

class GazeDetector {
  /**
   * Constructor - Initialize the gaze detector
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.cameraMode - 'user' (front) or 'environment' (back)
   * @param {boolean} options.mirror - Mirror the camera feed
   * @param {string} options.displayMode - 'fitHeight', 'cover', 'contain'
   * @param {boolean} options.showVideo - Show camera feed
   * @param {number} options.gazeXThreshold - X-axis threshold (0.1-0.3)
   * @param {number} options.smoothingFactor - Smoothing amount (0-1)
   * @param {number} options.gazeRangeX - Horizontal gaze range (1.0-3.0)
   * @param {number} options.gazeRangeY - Vertical gaze range (1.0-4.0)
   */
  constructor(options = {}) {
    // Camera and model
    this.cam = null;
    this.faceMesh = null;
    this.faces = [];
    this.ready = false;
    
    // Camera settings
    this.cameraMode = options.cameraMode || 'user';
    this.mirror = options.mirror !== undefined ? options.mirror : true;
    this.displayMode = options.displayMode || 'fitHeight';
    this.showVideo = options.showVideo !== undefined ? options.showVideo : true;
    
    // Face tracking keypoint indices
    this.leftEarIndex = 234;    // Left ear
    this.rightEarIndex = 454;   // Right ear
    this.noseIndex = 1;         // Nose bridge (stable point)
    
    // Tracked keypoint data
    this.leftEarData = null;
    this.rightEarData = null;
    this.noseData = null;
    
    // Gaze detection state
    this.gazeDirection = "CENTER";  // "LEFT", "CENTER", "RIGHT"
    this.gazeAngle = 0;             // Raw gaze angle
    this.smoothedGazeAngle = 0;     // Smoothed angle
    
    // Gaze position on screen
    this.gazeX = 0;                 // Screen X coordinate
    this.gazeY = 0;                 // Screen Y coordinate
    this.gazeAngleY = 0;            // Vertical angle
    this.smoothedGazeY = 0;         // Smoothed Y
    
    // Tunable parameters
    this.GAZE_X_THRESHOLD = options.gazeXThreshold || 0.15;
    this.SMOOTHING_FACTOR = options.smoothingFactor || 0.4;
    this.GAZE_RANGE_X = options.gazeRangeX || 1.5;
    this.GAZE_RANGE_Y = options.gazeRangeY || 2.5;
    
    // Initialize camera and model
    this._initializeCamera();
  }
  
  /**
   * PRIVATE: Initialize camera and FaceMesh model
   * Called automatically by constructor
   */
  _initializeCamera() {
    lockGestures();  // Prevent phone gestures
    
    // Create phone camera
    this.cam = createPhoneCamera(this.cameraMode, this.mirror, this.displayMode);
    enableCameraTap();  // Enable tap to toggle video
    
    // Wait for camera to be ready before creating model
    this.cam.onReady(() => {
      this._initializeFaceMesh();
    });
  }
  
  /**
   * PRIVATE: Initialize FaceMesh model
   * Called automatically after camera is ready
   */
  _initializeFaceMesh() {
    let options = {
      maxFaces: 1,            // Only detect 1 face
      refineLandmarks: false, // Faster without refinement
      flipHorizontal: false   // Camera handles mirroring
    };
    
    // Create FaceMesh model
    this.faceMesh = ml5.faceMesh(options, () => {
      // Start detection when model is ready
      this.faceMesh.detectStart(this.cam.videoElement, (results) => {
        this.faces = results;
      });
      this.ready = true;
    });
  }
  
  /**
   * Update the gaze detector
   * Call this in draw() every frame
   */
  update() {
    // Draw video feed if enabled
    if (this.showVideo && this.cam && this.cam.ready) {
      image(this.cam, 0, 0);
    }
    
    // Process face data if detected
    if (this.faces.length > 0) {
      this._updateKeypoints();
      
      // Calculate gaze if all points are valid
      if (this.leftEarData && this.rightEarData && this.noseData) {
        this._calculateGaze();
      }
    } else {
      // Reset when no face detected
      this.gazeDirection = "CENTER";
    }
  }
  
  /**
   * PRIVATE: Update tracked keypoint positions
   */
  _updateKeypoints() {
    this.leftEarData = this._getKeypoint(this.leftEarIndex);
    this.rightEarData = this._getKeypoint(this.rightEarIndex);
    this.noseData = this._getKeypoint(this.noseIndex);
  }
  
  /**
   * PRIVATE: Calculate gaze direction and position
   */
  _calculateGaze() {
    // Get raw 3D keypoints (before mapping)
    let leftEarRaw = this.faces[0].keypoints[this.leftEarIndex];
    let rightEarRaw = this.faces[0].keypoints[this.rightEarIndex];
    let noseRaw = this.faces[0].keypoints[this.noseIndex];
    
    // Calculate face width (distance between ears)
    let faceWidth = abs(leftEarRaw.x - rightEarRaw.x);
    
    // Calculate center point between ears (in 3D space)
    let earCenterX = (leftEarRaw.x + rightEarRaw.x) / 2;
    let earCenterY = (leftEarRaw.y + rightEarRaw.y) / 2;
    
    // Calculate nose offset from ear center
    let noseOffsetX = noseRaw.x - earCenterX;
    let noseOffsetY = noseRaw.y - earCenterY;
    
    // Normalize offsets by face width
    let normalizedOffsetX = noseOffsetX / faceWidth;
    
    // Store raw gaze angle
    this.gazeAngle = normalizedOffsetX;
    
    // Apply smoothing to reduce jitter
    this.smoothedGazeAngle = lerp(this.smoothedGazeAngle, this.gazeAngle, 1 - this.SMOOTHING_FACTOR);
    
    // Determine gaze direction based on threshold
    if (this.smoothedGazeAngle < -this.GAZE_X_THRESHOLD) {
      this.gazeDirection = "LEFT";
    } else if (this.smoothedGazeAngle > this.GAZE_X_THRESHOLD) {
      this.gazeDirection = "RIGHT";
    } else {
      this.gazeDirection = "CENTER";
    }
    
    // Calculate gaze position on screen
    
    // HORIZONTAL (X): Map smoothed gaze angle to screen coordinates
    // Invert to fix mirroring (negate the angle)
    this.gazeX = width / 2 - (this.smoothedGazeAngle * width * this.GAZE_RANGE_X);
    
    // VERTICAL (Y): Calculate based on nose position relative to ear center
    this.gazeAngleY = noseOffsetY / faceWidth; // Normalize by face width
    this.smoothedGazeY = lerp(this.smoothedGazeY, this.gazeAngleY, 1 - this.SMOOTHING_FACTOR);
    
    // Map to screen coordinates (invert Y since canvas Y increases downward)
    this.gazeY = height / 2 + (this.smoothedGazeY * height * this.GAZE_RANGE_Y);
    
    // Constrain to screen bounds
    this.gazeX = constrain(this.gazeX, 0, width);
    this.gazeY = constrain(this.gazeY, 0, height);
  }
  
  /**
   * PRIVATE: Get keypoint with error checking and coordinate mapping
   * 
   * @param {number} index - Keypoint index
   * @param {number} faceNumber - Face number (default 0)
   * @returns {Object|null} Keypoint data with x, y, z or null
   */
  _getKeypoint(index, faceNumber = 0) {
    if (!this.faces || this.faces.length === 0) return null;
    if (faceNumber >= this.faces.length) return null;
    if (!this.faces[faceNumber].keypoints) return null;
    if (index >= this.faces[faceNumber].keypoints.length) return null;
    
    let keypoint = this.faces[faceNumber].keypoints[index];
    
    // Map coordinates using PhoneCamera (handles mirroring and scaling)
    let mapped = this.cam.mapKeypoint(keypoint);
    
    return mapped;
  }
  
  // ============================================
  // PUBLIC API - Methods to access gaze data
  // ============================================
  
  /**
   * Check if a face is currently detected
   * @returns {boolean} True if face is detected
   */
  isFaceDetected() {
    return this.faces.length > 0 && this.leftEarData && this.rightEarData && this.noseData;
  }
  
  /**
   * Check if the detector is ready
   * @returns {boolean} True if camera and model are ready
   */
  isReady() {
    return this.ready && this.cam && this.cam.ready;
  }
  
  /**
   * Get the current gaze direction
   * @returns {string} "LEFT", "CENTER", or "RIGHT"
   */
  getDirection() {
    return this.gazeDirection;
  }
  
  /**
   * Get the gaze position on screen
   * @returns {Object} {x, y} coordinates
   */
  getGazePosition() {
    return { x: this.gazeX, y: this.gazeY };
  }
  
  /**
   * Get the raw gaze angle
   * @returns {number} Normalized angle (-1 to 1, negative = left, positive = right)
   */
  getGazeAngle() {
    return this.smoothedGazeAngle;
  }
  
  /**
   * Get the vertical gaze angle
   * @returns {number} Normalized angle (-1 to 1, negative = up, positive = down)
   */
  getVerticalAngle() {
    return this.smoothedGazeY;
  }
  
  /**
   * Get individual tracked keypoints
   * @returns {Object} {leftEar, rightEar, nose}
   */
  getKeypoints() {
    return {
      leftEar: this.leftEarData,
      rightEar: this.rightEarData,
      nose: this.noseData
    };
  }
  
  // ============================================
  // VISUALIZATION - Optional drawing methods
  // ============================================
  
  /**
   * Draw the tracked keypoints (ears and nose)
   */
  drawKeypoints() {
    if (!this.isFaceDetected()) return;
    
    push();
    noStroke();
    
    // Draw ear points (red)
    fill(255, 0, 0);
    circle(this.leftEarData.x, this.leftEarData.y, 20);
    circle(this.rightEarData.x, this.rightEarData.y, 20);
    
    // Draw nose point (color based on gaze direction)
    if (this.gazeDirection === "LEFT") {
      fill(255, 100, 100);
    } else if (this.gazeDirection === "RIGHT") {
      fill(100, 100, 255);
    } else {
      fill(100, 255, 100);
    }
    circle(this.noseData.x, this.noseData.y, 25);
    
    pop();
  }
  
  /**
   * Draw the gaze position indicator
   * @param {number} size - Size of the gaze indicator (default 60)
   */
  drawGazeIndicator(size = 60) {
    if (!this.isFaceDetected()) return;
    
    push();
    
    // Draw gaze position circle with color based on direction
    if (this.gazeDirection === "LEFT") {
      fill(255, 100, 100, 150);
    } else if (this.gazeDirection === "RIGHT") {
      fill(100, 100, 255, 150);
    } else {
      fill(100, 255, 100, 150);
    }
    stroke(255, 200);
    strokeWeight(3);
    circle(this.gazeX, this.gazeY, size);
    
    // Draw crosshair at gaze position
    stroke(255, 255, 0, 200);
    strokeWeight(2);
    let halfSize = size / 4;
    line(this.gazeX - halfSize, this.gazeY, this.gazeX + halfSize, this.gazeY);
    line(this.gazeX, this.gazeY - halfSize, this.gazeX, this.gazeY + halfSize);
    
    pop();
  }
  
  /**
   * Draw both keypoints and gaze indicator
   */
  drawAll() {
    this.drawKeypoints();
    this.drawGazeIndicator();
  }
  
  /**
   * Draw gaze information text overlay
   * Shows direction, position, angle, and instructions
   */
  drawGazeInfo() {
    if (!this.isFaceDetected()) return;
    
    push();
    
    // Display text info at top of screen
    fill(255);
    stroke(0);
    strokeWeight(2);
    textSize(20);
    textAlign(CENTER);
    
    // Direction
    text(`Direction: ${this.gazeDirection}`, width / 2, 30);
    
    // Position
    text(`Position: (${Math.round(this.gazeX)}, ${Math.round(this.gazeY)})`, width / 2, 60);
    
    // Angle
    text(`Angle: ${this.smoothedGazeAngle.toFixed(2)}`, width / 2, 90);
    
    // Instructions
    textSize(16);
    text('Tap to toggle video', width / 2, height - 20);
    
    pop();
  }
  
  // ============================================
  // SETTINGS - Methods to adjust behavior
  // ============================================
  
  /**
   * Toggle video display
   */
  toggleVideo() {
    this.showVideo = !this.showVideo;
  }
  
  /**
   * Set the gaze X threshold (sensitivity)
   * @param {number} threshold - Value between 0.1 and 0.3
   */
  setXThreshold(threshold) {
    this.GAZE_X_THRESHOLD = constrain(threshold, 0.1, 0.3);
  }
  
  /**
   * Set the smoothing factor
   * @param {number} factor - Value between 0 and 1 (0=no smooth, 1=max smooth)
   */
  setSmoothingFactor(factor) {
    this.SMOOTHING_FACTOR = constrain(factor, 0, 1);
  }
  
  /**
   * Set the gaze range (how far gaze extends on screen)
   * @param {number} rangeX - Horizontal range (1.0-3.0)
   * @param {number} rangeY - Vertical range (1.0-4.0)
   */
  setGazeRange(rangeX, rangeY) {
    this.GAZE_RANGE_X = constrain(rangeX, 1.0, 3.0);
    this.GAZE_RANGE_Y = constrain(rangeY, 1.0, 4.0);
  }
}
