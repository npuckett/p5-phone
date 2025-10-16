// MINIMAL VERSION - Touch Count
// No visual feedback - data displayed in debug panel only
// Demonstrates: Counting simultaneous touches on the screen

// Global variable for tracking touch count
let currentTouchCount = 0;

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Lock mobile gestures
    lockGestures();
    
    debug("Touch Count - Minimal Version");
    debug("Use multiple fingers to touch the screen");
    debug("Waiting for touches...");
}

function draw() 
{
    // No visual feedback in minimal version
    
    // Update touch count
    let newTouchCount = touches.length;
    
    // Only output to debug if count changed
    if (newTouchCount !== currentTouchCount) 
    {
        currentTouchCount = newTouchCount;
        
        if (currentTouchCount > 0) 
        {
            debug("--- Touch Count Changed ---");
            debug("Current Touches: " + currentTouchCount);
            
            // List all touch positions
            for (let i = 0; i < touches.length; i++) 
            {
                debug("Touch " + (i + 1) + ": (" + int(touches[i].x) + ", " + int(touches[i].y) + ")");
            }
        }
        else 
        {
            debug("All touches ended");
            debug("Waiting for touches...");
        }
    }
}

// Prevent default touch behavior and unwanted gestures
function touchStarted() 
{
    return false;  // Prevents default behavior
}

// Prevent default touch behavior and unwanted gestures
function touchEnded() 
{
    return false;  // Prevents default behavior
}