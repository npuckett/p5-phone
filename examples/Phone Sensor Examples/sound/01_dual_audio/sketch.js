// ==============================================
// DUAL AUDIO PLAYBACK EXAMPLE (TOUCH VERSION)
// ==============================================
// This example shows how to enable audio playback
// on mobile devices and play different sounds
// based on screen touch zones
// 
// CONCEPTS COVERED:
// - Audio playback on mobile (enableSoundTap)
// - Loading audio files
// - Touch zone detection
// - Audio visualization with amplitude
// - Mobile gesture locking
// ==============================================

// Global variables to store our audio files
// We declare these at the top so they can be accessed by all functions
let audioTrack1;
let audioTrack2;

// Global variables for audio level detection
// Amplitude analyzes the volume level of audio in real-time
let amplitude1;
let amplitude2;

// ==============================================
// PRELOAD FUNCTION - Runs before setup
// ==============================================
// preload() function runs BEFORE setup()
// This is the best place to load external assets like images, sounds, or fonts
// p5.js will wait for all preload operations to complete before moving to setup()
function preload() 
{
    // Load both audio files from the tracks folder
    // The paths are relative to where our HTML file is located
    audioTrack1 = loadSound('tracks/audio1.mp3');
    audioTrack2 = loadSound('tracks/audio2.mp3');
    
    // Note: Audio files must be loaded in preload() to ensure they're ready
    // Modern browsers require user interaction before playing audio
}

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
// setup() runs once after preload() is complete
// This is where we configure our canvas and initial settings
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
    background(50);
    
    // Set text properties for displaying instructions
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(255);
    
    // Set the volume of both audio tracks (0.0 to 1.0)
    audioTrack1.setVolume(0.7);
    audioTrack2.setVolume(0.7);
    
    // Set both tracks to loop continuously
    audioTrack1.loop();
    audioTrack2.loop();
    // Pause them initially (they will start looped when played)
    audioTrack1.pause();
    audioTrack2.pause();
    
    // Create amplitude objects to analyze audio levels for both tracks
    amplitude1 = new p5.Amplitude();
    amplitude2 = new p5.Amplitude();
    // Connect the amplitude analyzers to our audio tracks
    amplitude1.setInput(audioTrack1);
    amplitude2.setInput(audioTrack2);
}

// ==============================================
// DRAW FUNCTION - Runs continuously (like a loop)
// ==============================================
function draw() 
{
    // Clear the background each frame
    background(50);
    
    // Draw the split screen zones
    drawSplitScreen();
    
    // Show instruction text if audio context hasn't been started yet
    // window.soundEnabled is set by enableSoundTap() after user interaction
    if (!window.soundEnabled) 
    {
        fill(255, 255, 0); // yellow text
        textSize(24);
        text("Touch anywhere to start", width/2, height/2);
        return; // don't draw anything else until audio is started
    }
    
    // Draw audio visualizers once sound is enabled
    drawVisualizers();
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function drawSplitScreen() 
{
    // Top half - Audio 1 zone (light blue)
    noStroke();
    fill(150, 200, 255);
    rect(0, 0, width, height/2);
    
    // Bottom half - Audio 2 zone (light green)
    fill(150, 255, 200);
    rect(0, height/2, width, height/2);
    
    // Draw a horizontal line to divide the canvas in half
    stroke(255);
    strokeWeight(2);
    line(0, height/2, width, height/2);
    noStroke();
    
    // Draw labels if audio has been enabled
    if (window.soundEnabled) 
    {
        fill(50);
        textSize(20);
        text("AUDIO 1", width/2, height/4 - 60);
        text("Touch & hold to play", width/2, height/4 - 35);
        
        text("AUDIO 2", width/2, (height/4) * 3 - 60);
        text("Touch & hold to play", width/2, (height/4) * 3 - 35);
    }
}

function drawVisualizers() 
{
    // Visual audio level feedback for track 1
    if (audioTrack1.isPlaying()) 
    {
        let level1 = amplitude1.getLevel();
        let circleSize1 = map(level1, 0, 0.3, 30, 200);
        fill(255, 150, 100, 200); // Orange, semi-transparent
        noStroke();
        ellipse(width/2, height/4, circleSize1, circleSize1);
    }
    
    // Visual audio level feedback for track 2
    if (audioTrack2.isPlaying()) 
    {
        let level2 = amplitude2.getLevel();
        let circleSize2 = map(level2, 0, 0.3, 30, 200);
        fill(255, 100, 200, 200); // Magenta, semi-transparent
        noStroke();
        ellipse(width/2, 3*height/4, circleSize2, circleSize2);
    }
}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// touchStarted() runs when a touch begins
// This function starts playing audio based on which zone is touched
function touchStarted() 
{
    // Only process if sound system is enabled
    if (!window.soundEnabled) 
    {
        return false;
    }
    
    // Get the first touch point
    if (touches.length > 0) 
    {
        let touchY = touches[0].y;
        
        // Check if touch is in top half (Audio 1 zone)
        if (touchY < height/2) 
        {
            if (!audioTrack1.isPlaying()) 
            {
                audioTrack1.play();
            }
        }
        // Check if touch is in bottom half (Audio 2 zone)
        else 
        {
            if (!audioTrack2.isPlaying()) 
            {
                audioTrack2.play();
            }
        }
    }
    
    // Prevent default touch behavior
    return false;
}

// touchEnded() runs when a touch is released
// This function stops the audio when touch is released
function touchEnded() 
{
    // Only process if sound system is enabled
    if (window.soundEnabled) 
    {
        // Pause both audio tracks when touch is released
        audioTrack1.pause();
        audioTrack2.pause();
    }
    
    // Prevent default touch behavior
    return false;
}

