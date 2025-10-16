// MINIMAL VERSION - Touch Basic
// No visual feedback - data displayed in debug panel only
// Demonstrates: Basic touch detection, duration tracking, and touch counting

// Global variables for touch state
let isCurrentlyTouching = false;  // Track if screen is being touched
let touchCounter = 0;             // Count total number of touches
let touchStartTime = 0;           // When current touch started (milliseconds)
let touchDuration = 0;            // How long current touch has been active (seconds)

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST to display all touch data
    showDebug();
    
    // Lock mobile gestures to prevent browser interference
    lockGestures();
    
    debug("Touch Basic - Minimal Version");
    debug("Touch the screen to see data in this panel");
}

function draw() 
{
    // Update touch duration while touching
    if (isCurrentlyTouching) 
    {
        touchDuration = (millis() - touchStartTime) / 1000;  // Convert to seconds
    }
}

// Prevent default touch behavior and unwanted gestures
function touchStarted() 
{
    isCurrentlyTouching = true;
    touchCounter = touchCounter + 1;
    touchStartTime = millis();
    
    // Output touch data to debug panel
    debug("--- Touch Started ---");
    debug("Touch Count: " + touchCounter);
    
    return false;  // Prevents default behavior
}

// Prevent default touch behavior and unwanted gestures
function touchEnded() 
{
    isCurrentlyTouching = false;
    
    // Output final touch duration to debug panel
    debug("Touch Duration: " + touchDuration.toFixed(2) + " seconds");
    debug("--- Touch Ended ---");
    
    return false;  // Prevents default behavior
}