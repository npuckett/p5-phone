// MINIMAL VERSION - Touch Distance
// No visual feedback - data displayed in debug panel only
// Demonstrates: Measuring distance between two simultaneous touches

let touchPoints = [];
let touchDistance = 0;

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

    updateTouchValues();

    // Only measure when there are exactly 2 touches
    if (touchPoints.length === 2)
    {
        // Output to debug panel
        debug("--- Distance Measurement ---");
        debug("Touch 1: (" + int(touchPoints[0].x) + ", " + int(touchPoints[0].y) + ")");
        debug("Touch 2: (" + int(touchPoints[1].x) + ", " + int(touchPoints[1].y) + ")");
        debug("Distance: " + int(touchDistance) + " pixels");
    }
    else if (touchPoints.length === 0)
    {
        // No touches
        debug("Waiting for two touches...");
    }
    else if (touchPoints.length === 1)
    {
        // Only one touch
        debug("Need one more finger (1/2 touches)");
    }
    else if (touchPoints.length > 2)
    {
        // Too many touches
        debug("Too many touches! Use only 2 fingers");
    }
}

function updateTouchValues()
{
    touchPoints = touches.map((touchPoint) => ({
        x: touchPoint.x,
        y: touchPoint.y
    }));

    if (touchPoints.length === 2)
    {
        touchDistance = dist(touchPoints[0].x, touchPoints[0].y, touchPoints[1].x, touchPoints[1].y);
    }
    else
    {
        touchDistance = 0;
    }
}

// Prevent default touch behavior and unwanted gestures
function mousePressed()
{
    return false;  // Prevents default behavior
}

// Prevent default touch behavior and unwanted gestures
function mouseReleased()
{
    return false;  // Prevents default behavior
}