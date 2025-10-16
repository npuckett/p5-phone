// MINIMAL VERSION - Mic Level
// No visual feedback - data displayed in debug panel only
// Demonstrates: Reading microphone input level with threshold detection

// Global variables for microphone
let mic;
let micLevel = 0;
let micMultiplier = 3;  // Increase sensitivity
let threshold = 0.3;    // Threshold for loud sound detection

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Enable microphone with tap permission
    enableMicTap();
    
    // Lock mobile gestures
    lockGestures();
    
    debug("Mic Level - Minimal Version");
    debug("Tap to enable microphone");
    debug("Threshold: " + threshold);
    debug("Waiting for microphone...");
}

function draw() 
{
    // No visual feedback in minimal version
    
    // Check if microphone is enabled
    if (mic && mic.enabled) 
    {
        // Get current microphone level (0.0 to 1.0)
        micLevel = mic.getLevel() * micMultiplier;
        
        // Constrain to 0-1 range
        micLevel = constrain(micLevel, 0, 1);
        
        // Output to debug panel
        debug("--- Microphone Level ---");
        debug("Raw Level: " + nf(micLevel, 1, 3));
        debug("Percentage: " + int(micLevel * 100) + "%");
        
        // Check against threshold
        if (micLevel > threshold) 
        {
            debug("STATUS: LOUD! (Above threshold)");
        }
        else 
        {
            debug("STATUS: Quiet (Below threshold)");
        }
        
        // Add visual bar representation using text
        let barLength = int(micLevel * 20);
        let bar = "";
        for (let i = 0; i < barLength; i++) 
        {
            bar = bar + "▮";
        }
        debug("Level: " + bar);
    }
    else 
    {
        debug("Waiting for microphone permissions...");
        debug("Tap the screen to enable microphone");
    }
}