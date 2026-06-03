// MINIMAL VERSION - Rotational Velocity
// No visual feedback - data displayed in debug panel only
// Demonstrates: Calculating velocity of rotation by comparing current and previous rotation values

// Global variables for tracking previous rotation
let prevRotationX = 0;
let prevRotationY = 0;
let prevRotationZ = 0;
let rotationValues = { x: 0, y: 0, z: 0 };
let rotationVelocity = { x: 0, y: 0, z: 0, total: 0 };

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
    
    debug("Rotational Velocity - Minimal Version");
    debug("Move your device quickly to see velocity");
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
        debug("--- Rotational Velocity ---");
        debug("Velocity X: " + nf(rotationVelocity.x, 1, 2) + "°/frame");
        debug("Velocity Y: " + nf(rotationVelocity.y, 1, 2) + "°/frame");
        debug("Velocity Z: " + nf(rotationVelocity.z, 1, 2) + "°/frame");
        debug("Total Velocity: " + nf(rotationVelocity.total, 1, 2) + "°/frame");
        

        
        // Store current rotation for next frame
        prevRotationX = rotationValues.x;
        prevRotationY = rotationValues.y;
        prevRotationZ = rotationValues.z;
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
    rotationVelocity.x = rotationValues.x - prevRotationX;
    rotationVelocity.y = rotationValues.y - prevRotationY;
    rotationVelocity.z = rotationValues.z - prevRotationZ;
    rotationVelocity.total = sqrt(
        rotationVelocity.x * rotationVelocity.x +
        rotationVelocity.y * rotationVelocity.y +
        rotationVelocity.z * rotationVelocity.z
    );
}