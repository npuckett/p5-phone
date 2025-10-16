// ==============================================
// BASIC ORIENTATION EXAMPLE
// ==============================================
// This example shows the device orientation
// values for x, y, and z rotation
// 
// CONCEPTS COVERED:
// - Device orientation detection
// - Motion sensor permissions with enableGyroTap
// - rotationX, rotationY, rotationZ values
// - Simple display of sensor data
// - Global variables for sensor values
// ==============================================

// Variables to store orientation data
let orientationX = 0;  // Rotation around X axis (front/back tilt)
let orientationY = 0;  // Rotation around Y axis (left/right tilt)
let orientationZ = 0;  // Rotation around Z axis (device rotation)

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup() 
{
    // Create a canvas that fills the entire screen
    createCanvas(windowWidth, windowHeight);

    // Set to show in Degrees
    angleMode(DEGREES);
    
    // Lock mobile gestures to prevent scrolling, zooming, etc.
    lockGestures();
    
    // Show debug panel to see what's happening
    //showDebug();
    
    // Try button instead of tap (more reliable)
    enableGyroTap('ENABLE MOTION SENSORS', 'Requesting motion sensors...');
    
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
        
        // NOTE: You can use constrain() to keep values within a specific range
        // Example: orientationX = constrain(rotationX, -90, 90);
        // This would limit the X rotation to between -90 and 90 degrees
        // Useful for mapping sensor values to specific ranges for animations or controls
        // Learn more: https://p5js.org/reference/p5/constrain/

        debug('angles',orientationX,orientationY,orientationZ);
        
        // Display orientation values
        fill(50, 50, 50);  // Dark text
        textAlign(CENTER, CENTER);
        
        // Show current orientation values
        textSize(24);
        text("Device Orientation", width/2, height/2 - 100);
        
        textSize(20);
        text("X (Tilt Forward/Back): " + orientationX.toFixed(1) + "°", width/2, height/2 - 40);
        text("Y (Tilt Left/Right): " + orientationY.toFixed(1) + "°", width/2, height/2);
        text("Z (Rotation): " + orientationZ.toFixed(1) + "°", width/2, height/2 + 40);
        
        // Instructions
        textSize(16);
        fill(100, 100, 100);
        text("Tilt and rotate your device!", width/2, height/2 + 100);
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

