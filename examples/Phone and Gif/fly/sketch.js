// Fly control example
// Demonstrates using device acceleration (accelerationY) to control GIF playback speed
// Move phone up/down to simulate airplane motion and control cloud speed

// Global variables
let airplaneGif;
let playbackSpeed = 1.0; // Speed multiplier for GIF playback
let backgroundColor;

// Mapping variables - easy to adjust
let speedMultiplier = 3.0; // How much speed per unit of acceleration
let maxSpeed = 270.0; // Maximum playback speed
let minSpeedToPlay = 0.25; // Minimum speed before pausing
let movementThreshold = 0.1; // Minimum acceleration needed to play (below this = paused)

function preload() 
{
    // Load the airplane window GIF
    airplaneGif = loadImage('gifs/comparison.gif');
}

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    backgroundColor = color(200, 220, 255);
    
    // Lock mobile gestures to prevent browser interference
    lockGestures();
    
    textAlign(CENTER, CENTER);
    
    // Request permission for motion sensors on iOS
    enableGyroTap();
}

function draw() 
{
    background(backgroundColor);
    
    // Check if motion sensors are available
    if (window.sensorsEnabled) 
    {
        // Map absolute value of accelerationY to playback speed
        // When still (accelerationY = 0), speed is low/paused
        // As you move phone up/down, speed increases
        let moveAmount = abs(accelerationY);
        
        // Check if movement is below threshold
        if (moveAmount < movementThreshold) 
        {
            // Below threshold - pause the GIF
            airplaneGif.pause();
            playbackSpeed = 0;
        } 
        else 
        {
            // Above threshold - calculate and set playback speed
            playbackSpeed = moveAmount * speedMultiplier;
            
            // Constrain to max speed
            playbackSpeed = constrain(playbackSpeed, 0.0, maxSpeed);
            
            airplaneGif.play();
            airplaneGif.delay(int(100 / playbackSpeed));
        }
        
        // Display GIF rotated 90 degrees for portrait mode, filling the canvas
        push();
        translate(width/2, height/2);
        rotate(HALF_PI); // Rotate 90 degrees
        imageMode(CENTER);
        // After rotation, width becomes height and height becomes width
        image(airplaneGif, 0, 0, height, width);
        pop();
        
        // Display acceleration value over the image
        fill(255, 150, 0); // Orange
        stroke(0);
        strokeWeight(4);
        textSize(64);
       // text("Accel Y: " + nf(accelerationY, 1, 2), width/2, 80);
        
        // Instructions
        // textSize(18);
        // fill(100);
        // noStroke();
        // text("Move phone up/down to control flight speed", width/2, height - 50);
        // text("Still = paused, more movement = faster", width/2, height - 25);
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

function windowResized() 
{
    resizeCanvas(windowWidth, windowHeight);
}