// Device acceleration example
// Demonstrates reading accelerationX, Y, Z values from device motion sensors
// Acceleration is measured in m/s² (meters per second squared)

let backgroundColor;

function setup() 
{
    createCanvas(windowWidth, windowHeight);
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
        // Display current acceleration values
        fill(255);
        text("Device Acceleration", width/2, height/6);
        
        // Display individual acceleration values
        text("X: " + nf(accelerationX, 1, 2) + " m/s²", width/2, height/6 + 40);
        text("Y: " + nf(accelerationY, 1, 2) + " m/s²", width/2, height/6 + 70);
        text("Z: " + nf(accelerationZ, 1, 2) + " m/s²", width/2, height/6 + 100);
        
        // Calculate total acceleration magnitude using 3D distance formula
        let totalAcceleration = sqrt(accelerationX * accelerationX + 
                                   accelerationY * accelerationY + 
                                   accelerationZ * accelerationZ);
        
        text("Total: " + nf(totalAcceleration, 1, 2) + " m/s²", width/2, height/6 + 140);
        
        // Visual representation using bars
        fill(255, 100, 100); // Red for X
        rect(width/2 - 120, height/2, map(abs(accelerationX), 0, 20, 0, 100), 20);
        
        fill(100, 255, 100); // Green for Y
        rect(width/2 - 120, height/2 + 30, map(abs(accelerationY), 0, 20, 0, 100), 20);
        
        fill(100, 100, 255); // Blue for Z
        rect(width/2 - 120, height/2 + 60, map(abs(accelerationZ), 0, 20, 0, 100), 20);
        
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

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// This function runs when a new touch begins
function touchStarted() 
{
    // Touch positions will be updated in draw() function
    return false;
}

// This function runs when a touch ends
function touchEnded() 
{
    // Touch positions will be updated in draw() function
    return false;
}