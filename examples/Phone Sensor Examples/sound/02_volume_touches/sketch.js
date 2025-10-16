// ==============================================
// VOLUME BY TOUCHES EXAMPLE
// ==============================================
// This example demonstrates controlling audio volume
// based on the number of simultaneous touches
// 
// CONCEPTS COVERED:
// - Audio playback on mobile (enableSoundTap)
// - Loading audio files
// - Multi-touch detection (touches.length)
// - Dynamic volume control based on touch count
// - Audio visualization with amplitude
// - Mobile gesture locking
// ==============================================

// Global variables to store our audio file
let audioTrack;

// Global variable for audio level detection
// Amplitude analyzes the volume level of audio in real-time
let amplitude;

// Maximum number of touches to detect (for volume control)
const MAX_TOUCHES = 5;

// ==============================================
// PRELOAD FUNCTION - Runs before setup
// ==============================================
function preload() 
{
    // Load the audio file from the tracks folder
    // The path is relative to where our HTML file is located
    audioTrack = loadSound('tracks/audio1.mp3');
}

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup() 
{
    // Create a canvas that fills the entire screen
    createCanvas(windowWidth, windowHeight);
    
    // Lock mobile gestures to prevent scrolling, zooming, etc.
    lockGestures();
    
    // Enable audio playback on mobile devices
    // This creates a tap-to-start overlay for iOS/mobile browsers
    enableSoundTap();
    
    // Set the background to a dark color
    background(30);
    
    // Set text properties for displaying instructions
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(255);
    
    // Set the audio track to loop continuously
    audioTrack.loop();
    // Pause it initially (will start when touched)
    audioTrack.pause();
    
    // Create amplitude object to analyze audio level
    amplitude = new p5.Amplitude();
    // Connect the amplitude analyzer to our audio track
    amplitude.setInput(audioTrack);
}

// ==============================================
// DRAW FUNCTION - Runs continuously (like a loop)
// ==============================================
function draw() 
{
    // Clear the background each frame with a gradient effect
    background(30, 20, 50);
    
    // Show instruction text if audio hasn't been started yet
    if (!window.soundEnabled) 
    {
        fill(255, 200, 100);
        textSize(24);
        text("Touch anywhere to start", width/2, height/2 - 40);
        textSize(18);
        text("Use 1-5 fingers to control volume", width/2, height/2 + 10);
        return; // don't draw anything else until audio is started
    }
    
    // Draw instructions at the top
    fill(200, 200, 255);
    textSize(16);
    text("Touch & hold with 1-5 fingers to play", width/2, 30);
    text("More fingers = Higher volume", width/2, 55);
    
    // Draw visualizer and touch feedback
    drawVisualizer();
    drawTouchInfo();
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function drawVisualizer() 
{
    // Only draw visualizer if audio is playing
    if (audioTrack.isPlaying()) 
    {
        // Get the current audio level
        let level = amplitude.getLevel();
        
        // Map the level to a circle size (30 to 400 pixels)
        let circleSize = map(level, 0, 0.5, 30, 400);
        
        // Create a color that changes with the number of touches
        let numTouches = min(touches.length, MAX_TOUCHES);
        let hue = map(numTouches, 0, MAX_TOUCHES, 180, 300); // Blue to purple
        
        // Draw the main visualizer circle
        push();
        colorMode(HSB);
        fill(hue, 80, 100, 0.7); // Semi-transparent
        noStroke();
        circle(width/2, height/2, circleSize);
        
        // Draw a smaller inner circle
        fill(hue, 60, 100, 0.9);
        circle(width/2, height/2, circleSize * 0.5);
        pop();
    }
}

function drawTouchInfo() 
{
    // Display current number of touches and volume level
    if (window.soundEnabled) 
    {
        let numTouches = touches.length;
        let volume = audioTrack.getVolume();
        
        fill(255);
        textSize(20);
        text("Touches: " + numTouches, width/2, height - 80);
        
        textSize(18);
        text("Volume: " + (volume * 100).toFixed(0) + "%", width/2, height - 50);
        
        // Draw visual indicators for each possible touch
        drawTouchIndicators(numTouches);
    }
}

function drawTouchIndicators(currentTouches) 
{
    // Draw 5 circles representing the maximum touch count
    let spacing = 50;
    let startX = width/2 - (spacing * 2);
    let y = height - 120;
    
    for (let i = 0; i < MAX_TOUCHES; i++) 
    {
        let x = startX + (i * spacing);
        
        push();
        if (i < currentTouches) 
        {
            // Active touch - filled circle
            fill(100, 200, 255);
            stroke(255);
        } 
        else 
        {
            // Inactive touch - outline only
            noFill();
            stroke(100);
        }
        strokeWeight(2);
        circle(x, y, 30);
        
        // Draw finger number
        if (i < currentTouches) 
        {
            fill(255);
            noStroke();
            textSize(14);
            text(i + 1, x, y);
        }
        pop();
    }
}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// touchStarted() runs when a touch begins
function touchStarted() 
{
    // Only process if sound system is enabled
    if (!window.soundEnabled) 
    {
        return false;
    }
    
    // Start playing the audio if it's not already playing
    if (!audioTrack.isPlaying()) 
    {
        audioTrack.play();
    }
    
    // Update volume based on number of touches
    updateVolume();
    
    // Prevent default touch behavior
    return false;
}

// touchMoved() runs continuously while touches are moving
function touchMoved() 
{
    // Update volume as touches are added or removed
    if (window.soundEnabled) 
    {
        updateVolume();
    }
    
    // Prevent default touch behavior
    return false;
}

// touchEnded() runs when a touch is released
function touchEnded() 
{
    // If no more touches, pause the audio
    if (window.soundEnabled && touches.length === 0) 
    {
        audioTrack.pause();
    }
    
    // Prevent default touch behavior
    return false;
}

// ==============================================
// VOLUME CONTROL FUNCTION
// ==============================================

function updateVolume() 
{
    // Get the number of current touches (capped at MAX_TOUCHES)
    let numTouches = min(touches.length, MAX_TOUCHES);
    
    // Map number of touches (1-5) to volume (0.2 to 1.0)
    // This ensures there's always some volume with 1 touch
    let volume = map(numTouches, 1, MAX_TOUCHES, 0.2, 1.0);
    
    // Set the audio volume
    audioTrack.setVolume(volume);
}

// ==============================================
// RESPONSIVE CANVAS
// ==============================================

// Resize canvas when window size changes
function windowResized() 
{
    resizeCanvas(windowWidth, windowHeight);
}
