// ==============================================
// ROTATIONAL VELOCITY EXAMPLE
// ==============================================
// This example shows the rotational velocity
// by comparing current rotation with previous rotation
// 
// CONCEPTS COVERED:
// - Device rotational velocity detection
// - Motion sensor permissions with enableGyroTap
// - rotationX, rotationY, rotationZ values
// - pRotationX, pRotationY, pRotationZ (previous frame values)
// - Calculating velocity as change over time
// - Global variables for velocity values
// ==============================================

// Variables to store current rotation data
let orientationX = 0;  // Current rotation around X axis (front/back tilt)
let orientationY = 0;  // Current rotation around Y axis (left/right tilt)
let orientationZ = 0;  // Current rotation around Z axis (device rotation)

// Variables to store rotational velocity
let velocityX = 0;     // Change in X rotation per frame
let velocityY = 0;     // Change in Y rotation per frame
let velocityZ = 0;     // Change in Z rotation per frame

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup() 
{
    // Create a canvas that fills the entire screen
    createCanvas(windowWidth, windowHeight);
    
    // Lock mobile gestures to prevent scrolling, zooming, etc.
    lockGestures();
    
    // Enable motion sensors with tap-to-start
    enableGyroTap('Tap screen to enable motion sensors');
    
    // Set text properties
    textAlign(CENTER, CENTER);
    textSize(32);
}

// ==============================================
// DRAW FUNCTION - Runs continuously
// ==============================================
function draw() 
{
    // Clear the screen
    background(240, 240, 240);
    
    // Check if sensors are working
    if (window.sensorsEnabled) 
    {
        background(200, 255, 200);  // Light green when sensors active
        
        // Update orientation values from device sensors ONLY when enabled
        orientationX = rotationX;
        orientationY = rotationY;
        orientationZ = rotationZ;
        
        // Calculate rotational velocity (change from previous frame)
        // p5.js provides pRotationX, pRotationY, pRotationZ for previous frame values
        velocityX = orientationX - pRotationX;
        velocityY = orientationY - pRotationY;
        velocityZ = orientationZ - pRotationZ;
        
        // NOTE: You can use constrain() to keep velocity values within a specific range
        // Example: velocityX = constrain(velocityX, -10, 10);
        // This would limit the X velocity to between -10 and 10 degrees per frame
        // Useful for creating smooth animations or preventing extreme values
        // Learn more: https://p5js.org/reference/p5/constrain/
        
        // Display current orientation values
        fill(50, 50, 50);  // Dark text
        textAlign(CENTER, CENTER);
        
        // Show current orientation title
        textSize(24);
        text("Device Rotational Velocity", width/2, height/2 - 140);
        
        // Show current rotation values
        textSize(18);
        fill(80, 80, 80);
        text("Current Rotation:", width/2, height/2 - 100);
        
        textSize(16);
        text("X: " + orientationX.toFixed(1) + "°", width/2, height/2 - 80);
        text("Y: " + orientationY.toFixed(1) + "°", width/2, height/2 - 60);
        text("Z: " + orientationZ.toFixed(1) + "°", width/2, height/2 - 40);
        
        // Show velocity values (change per frame)
        textSize(18);
        fill(150, 50, 50);  // Red text for velocity
        text("Rotational Velocity (°/frame):", width/2, height/2);
        
        textSize(16);
        text("X Velocity: " + velocityX.toFixed(2) + "°/frame", width/2, height/2 + 20);
        text("Y Velocity: " + velocityY.toFixed(2) + "°/frame", width/2, height/2 + 40);
        text("Z Velocity: " + velocityZ.toFixed(2) + "°/frame", width/2, height/2 + 60);
        
        // Show velocity magnitude (total rotational speed)
        let totalVelocity = sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);
        textSize(18);
        fill(50, 100, 150);  // Blue text for total
        text("Total Velocity: " + totalVelocity.toFixed(2) + "°/frame", width/2, height/2 + 90);
        
        // Instructions
        textSize(14);
        fill(100, 100, 100);
        text("Rotate your device quickly to see velocity changes!", width/2, height/2 + 130);
    } 
    else 
    {
        // Instructions to enable sensors
        fill(50, 50, 50);  // Dark text
        textAlign(CENTER, CENTER);
        textSize(28);
        fill(150, 50, 50);  // Red text
        text("Motion Sensors Disabled", width/2, height/2 - 40);
        
        textSize(20);
        fill(100, 100, 100);
        text("Tap the screen to enable\\nmotion sensors", width/2, height/2 + 20);
    }
}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================
// Note: Touch events are handled by enableGyroTap for permissions

function touchStarted() 
{
    // Permission handling is done by enableGyroTap
    return false;
}

function touchEnded() 
{
    return false;
}

