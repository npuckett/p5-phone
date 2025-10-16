// MINIMAL VERSION - Sound Basic
// No visual feedback - data displayed in debug panel only
// Demonstrates: Loading and playing audio, touch to play/pause control

// Global variables for audio
let audioTrack;
let isPlaying = false;
let playCount = 0;

function preload() 
{
    // Load audio file
    audioTrack = loadSound('tracks/audio1.mp3');
}

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Enable sound with tap permission
    enableSoundTap();
    
    // Lock mobile gestures
    lockGestures();
    
    // Set audio to loop
    audioTrack.loop();
    audioTrack.pause();
    
    debug("Sound Basic - Minimal Version");
    debug("Touch to play/pause audio");
    debug("Waiting for audio permissions...");
}

function draw() 
{
    // Check if sound system is enabled
    if (window.soundEnabled) 
    {
        // Output audio state to debug panel
        debug("--- Audio Status ---");
        debug("Is Playing: " + audioTrack.isPlaying());
        debug("Play Count: " + playCount);
        debug("Current Time: " + audioTrack.currentTime().toFixed(2) + "s");
        debug("Duration: " + audioTrack.duration().toFixed(2) + "s");
        debug("Volume: " + int(audioTrack.getVolume() * 100) + "%");
        
        if (audioTrack.isPlaying()) 
        {
            debug("STATUS: PLAYING ▶");
        }
        else 
        {
            debug("STATUS: PAUSED ⏸");
        }
        
        debug("Touch anywhere to toggle play/pause");
    }
    else 
    {
        debug("Waiting for audio permissions...");
        debug("Touch the screen to enable audio");
    }
}

// Toggle play/pause on touch
function touchStarted() 
{
    if (window.soundEnabled) 
    {
        if (audioTrack.isPlaying()) 
        {
            audioTrack.pause();
            isPlaying = false;
            debug("--- Touch: PAUSED ---");
        }
        else 
        {
            audioTrack.play();
            isPlaying = true;
            playCount = playCount + 1;
            debug("--- Touch: PLAYING ---");
        }
    }
    
    return false;  // Prevents default behavior
}

// Prevent default touch behavior
function touchEnded() 
{
    return false;  // Prevents default behavior
}
