// MINIMAL VERSION - Rotational Velocity
// No visual feedback - data displayed in debug panel only
// Demonstrates: Calculating velocity of rotation by comparing current and previous rotation values

// Global variables for tracking previous rotation
let prevRotationX = 0;
let prevRotationY = 0;
let prevRotationZ = 0;

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
        // Get current rotation values
        let currentX = rotationX;
        let currentY = rotationY;
        let currentZ = rotationZ;
        
        // Calculate velocity (change since last frame)
        let velocityX = currentX - prevRotationX;
        let velocityY = currentY - prevRotationY;
        let velocityZ = currentZ - prevRotationZ;
        
        // Calculate total velocity magnitude
        let totalVelocity = sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);
        
        // Output to debug panel
        debug("--- Rotational Velocity ---");
        debug("Velocity X: " + nf(velocityX, 1, 2) + "°/frame");
        debug("Velocity Y: " + nf(velocityY, 1, 2) + "°/frame");
        debug("Velocity Z: " + nf(velocityZ, 1, 2) + "°/frame");
        debug("Total Velocity: " + nf(totalVelocity, 1, 2) + "°/frame");
        

        
        // Store current rotation for next frame
        prevRotationX = currentX;
        prevRotationY = currentY;
        prevRotationZ = currentZ;
    }
    else 
    {
        debug("Waiting for sensor permissions...");
        debug("Tap the screen to enable sensors");
    }
}