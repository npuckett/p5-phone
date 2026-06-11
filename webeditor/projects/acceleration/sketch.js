// Device acceleration example
// Demonstrates reading accelerationX, Y, Z values from device motion sensors
// Acceleration is measured in m/s² (meters per second squared)

let backgroundColor;
let accelerationValues = { x: 0, y: 0, z: 0 };
let totalAcceleration = 0;

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();
    backgroundColor = color(50, 50, 50);
    textAlign(CENTER, CENTER);
    textSize(16);
    
    // Request permission for motion sensors on iOS
    enableGyroTap();
}

function draw() 
{
    background(backgroundColor);
    
    // Check if motion sensors are available
    if (window.sensorsEnabled) 
    {
        updateAccelerationValues();

        // Display current acceleration values
        fill(255);
        text("Device Acceleration", width/2, height/6);
        
        // Display individual acceleration values
        text("X: " + nf(accelerationValues.x, 1, 2) + " m/s²", width/2, height/6 + 40);
        text("Y: " + nf(accelerationValues.y, 1, 2) + " m/s²", width/2, height/6 + 70);
        text("Z: " + nf(accelerationValues.z, 1, 2) + " m/s²", width/2, height/6 + 100);
        
        text("Total: " + nf(totalAcceleration, 1, 2) + " m/s²", width/2, height/6 + 140);
        
        // Visual representation using bars
        fill(255, 100, 100); // Red for X
        rect(width/2 - 120, height/2, map(abs(accelerationValues.x), 0, 20, 0, 100), 20);
        
        fill(100, 255, 100); // Green for Y
        rect(width/2 - 120, height/2 + 30, map(abs(accelerationValues.y), 0, 20, 0, 100), 20);
        
        fill(100, 100, 255); // Blue for Z
        rect(width/2 - 120, height/2 + 60, map(abs(accelerationValues.z), 0, 20, 0, 100), 20);
        
        // Labels for the bars
        fill(255);
        text("X", width/2 - 140, height/2 + 10);
        text("Y", width/2 - 140, height/2 + 40);
        text("Z", width/2 - 140, height/2 + 70);
        
        // Instructions
        text("Move your device to see acceleration changes", width/2, height - 60);
        text("Shake, tilt, or move the device in different directions", width/2, height - 30);
    }
    else 
    {
        // Motion sensors not available or permission not granted
        fill(255, 100, 100);
        text("Motion sensors not available", width/2, height/2);
        text("On iOS: Tap to request motion permission", width/2, height/2 + 30);
        text("Check device compatibility", width/2, height/2 + 60);
    }
}

function updateAccelerationValues()
{
    accelerationValues.x = accelerationX;
    accelerationValues.y = accelerationY;
    accelerationValues.z = accelerationZ;
    totalAcceleration = sqrt(
        accelerationValues.x * accelerationValues.x +
        accelerationValues.y * accelerationValues.y +
        accelerationValues.z * accelerationValues.z
    );
}

// ==============================================
// INPUT EVENT FUNCTIONS
// ==============================================

// This function runs when a new touch begins
function mousePressed() 
{
    // Touch positions will be updated in draw() function
    return false;
}

// This function runs when a touch ends
function mouseReleased() 
{
    // Touch positions will be updated in draw() function
    return false;
}