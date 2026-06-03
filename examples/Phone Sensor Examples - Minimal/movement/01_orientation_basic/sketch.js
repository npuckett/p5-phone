// MINIMAL VERSION - Orientation Basic
// No visual feedback - data displayed in debug panel only
// Demonstrates: Reading device orientation (rotationX, rotationY, rotationZ)

let rotationValues = { x: 0, y: 0, z: 0 };

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Enable motion sensors with tap permission (iOS)
    enableGyroTap();
    
    // Lock mobile gestures
    lockGestures();

    // Set to show in Degrees
    angleMode(DEGREES);
    
    debug("Orientation Basic - Minimal Version");
    debug("Tilt your device to see orientation values");
    debug("Waiting for sensor data...");
}

function draw() 
{
    // No visual feedback in minimal version
    
    // Check if motion sensors are enabled
    if (window.sensorsEnabled) 
    {
        updateRotationValues();
        
        // Output to debug panel
        debug("--- Device Orientation ---");
        debug("Rotation X (Tilt Forward/Back): " + int(rotationValues.x) + "°");
        debug("Rotation Y (Tilt Left/Right): " + int(rotationValues.y) + "°");
        debug("Rotation Z (Turn/Compass): " + int(rotationValues.z) + "°");
        

    }
    else 
    {
        debug("Waiting for sensor permissions...");
        debug("Tap the screen to enable sensors");
    }
}

function updateRotationValues()
{
    rotationValues.x = rotationX;
    rotationValues.y = rotationY;
    rotationValues.z = rotationZ;
}