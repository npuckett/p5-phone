// MINIMAL VERSION - Touch Distance
// No visual feedback - data displayed in debug panel only
// Demonstrates: Measuring distance between two simultaneous touches

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Lock mobile gestures
    lockGestures();
    
    debug("Touch Distance - Minimal Version");
    debug("Use two fingers to touch the screen");
    debug("Waiting for two touches...");
}

function draw() 
{
    // No visual feedback in minimal version
    
    // Only measure when there are exactly 2 touches
    if (touches.length === 2) 
    {
        // Get positions of both touches
        let x1 = touches[0].x;
        let y1 = touches[0].y;
        let x2 = touches[1].x;
        let y2 = touches[1].y;
        
        // Calculate distance using Pythagorean theorem
        let distance = dist(x1, y1, x2, y2);
        
        // Output to debug panel
        debug("--- Distance Measurement ---");
        debug("Touch 1: (" + int(x1) + ", " + int(y1) + ")");
        debug("Touch 2: (" + int(x2) + ", " + int(y2) + ")");
        debug("Distance: " + int(distance) + " pixels");
    }
    else if (touches.length === 0) 
    {
        // No touches
        debug("Waiting for two touches...");
    }
    else if (touches.length === 1) 
    {
        // Only one touch
        debug("Need one more finger (1/2 touches)");
    }
    else if (touches.length > 2) 
    {
        // Too many touches
        debug("Too many touches! Use only 2 fingers");
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