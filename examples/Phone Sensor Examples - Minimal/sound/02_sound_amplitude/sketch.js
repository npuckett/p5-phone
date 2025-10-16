// MINIMAL VERSION - Sound Amplitude
// No visual feedback - data displayed in debug panel only
// Demonstrates: Reading audio amplitude levels in real-time with p5.Amplitude

// Global variables for audio
let audioTrack;
let amplitude;
let currentLevel = 0;
let peakLevel = 0;
let threshold = 0.2;  // Threshold for "loud" detection

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
    
    // Create amplitude analyzer
    amplitude = new p5.Amplitude();
    amplitude.setInput(audioTrack);
    
    // Set audio to loop
    audioTrack.loop();
    audioTrack.pause();
    
    debug("Sound Amplitude - Minimal Version");
    debug("Touch & hold to play and analyze audio");
    debug("Amplitude Threshold: " + threshold);
}

function draw() 
{
    // Check if sound system is enabled
    if (window.soundEnabled) 
    {
        // Get current amplitude level
        currentLevel = amplitude.getLevel();
        
        // Track peak level
        if (currentLevel > peakLevel) 
        {
            peakLevel = currentLevel;
        }
        
        // Output amplitude data to debug panel
        debug("--- Audio Amplitude ---");
        debug("Is Playing: " + audioTrack.isPlaying());
        debug("Current Level: " + nf(currentLevel, 1, 3));
        debug("Peak Level: " + nf(peakLevel, 1, 3));
        debug("Percentage: " + int(currentLevel * 100) + "%");
        
        // Check against threshold
        if (currentLevel > threshold) 
        {
            debug("STATUS: LOUD! (Above threshold)");
        }
        else 
        {
            debug("STATUS: Quiet (Below threshold)");
        }
        
        // Add visual bar representation using text
        let barLength = int(currentLevel * 30);
        let bar = "";
        for (let i = 0; i < barLength; i++) 
        {
            bar = bar + "▮";
        }
        debug("Level: " + bar);
        
        debug("Touch & hold to play audio");
    }
    else 
    {
        debug("Waiting for audio permissions...");
        debug("Touch the screen to enable audio");
    }
}

// Play audio when touched
function touchStarted() 
{
    if (window.soundEnabled) 
    {
        if (!audioTrack.isPlaying()) 
        {
            audioTrack.play();
            debug("--- Touch: PLAYING ---");
        }
    }
    
    return false;  // Prevents default behavior
}

// Pause audio when touch ends
function touchEnded() 
{
    if (window.soundEnabled) 
    {
        audioTrack.pause();
        debug("--- Touch: PAUSED ---");
    }
    
    return false;  // Prevents default behavior
}
