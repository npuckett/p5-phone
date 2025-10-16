// Microphone level example
// Demonstrates reading microphone input level with visual feedback
// Shows text display and full-width bar graph with threshold detection

// Global variables - easy to adjust for different use cases
let mic;
let micLevel = 0;
let micMultiplier = 5; // Multiplier to amplify mic sensitivity
let threshold = 0.3; // Threshold for background color change (0.0 - 1.0)
let backgroundColor;
let backgroundColorQuiet;
let backgroundColorLoud;

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Set up colors
    backgroundColorQuiet = color(50, 50, 50); // Dark gray when quiet
    backgroundColorLoud = color(255, 100, 50); // Orange when loud
    backgroundColor = backgroundColorQuiet;
    
    // Create microphone input (global variable for library to use)
    mic = new p5.AudioIn();
    
    textAlign(CENTER, CENTER);
    textSize(16);
    
    // lock Gesturs
    lockGestures();

    // Request permission for microphone on iOS
    enableMicTap();
}

function draw() 
{
    background(backgroundColor);
    
    // Check if microphone is available
    if (window.micEnabled) 
    {
        // Get current microphone level (0.0 to 1.0) and apply multiplier
        micLevel = mic.getLevel() * micMultiplier;
        
        // Check if level exceeds threshold and change background
        if (micLevel > threshold) 
        {
            backgroundColor = backgroundColorLoud;
        } 
        else 
        {
            backgroundColor = backgroundColorQuiet;
        }
        
        // Display microphone level as text
        fill(255);
        text("Microphone Level", width/2, height/6);
        
        // Display numeric value with more precision
        text("Level: " + nf(micLevel, 1, 3), width/2, height/6 + 40);
        
        // Display threshold value
        fill(150);
        text("Threshold: " + nf(threshold, 1, 2), width/2, height/6 + 70);
        
        // Calculate bar height based on mic level
        let barHeight = map(micLevel, 0, 1, 0, height);
        
        // Draw full-width bar graph from bottom
        fill(100, 200, 255);
        noStroke();
        rect(0, height - barHeight, width, barHeight);
        
        // Draw threshold line
        let thresholdY = height - map(threshold, 0, 1, 0, height);
        stroke(255, 200, 0);
        strokeWeight(2);
        line(0, thresholdY, width, thresholdY);
        
        // Label the threshold line
        fill(255, 200, 0);
        noStroke();
        text("Threshold", width/2, thresholdY - 15);
        
        // Instructions
        fill(255);
        text("Make noise or speak to see the level change", width/2, height - 60);
        text("When level exceeds threshold, background changes color", width/2, height - 30);
    }
    else 
    {
        // Microphone not available or permission not granted
        fill(255, 100, 100);
        text("Microphone not available", width/2, height/2);
        text("On iOS: Tap to request microphone permission", width/2, height/2 + 30);
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