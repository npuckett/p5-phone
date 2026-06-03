// MINIMAL VERSION - Touch Angle
// No visual feedback - data displayed in debug panel only
// Demonstrates: Calculating the angle between two simultaneous touches

let touchPoints = [];
let touchAngleRadians = 0;
let touchAngleDegrees = 0;
let touchDirection = "";

function setup()
{
    createCanvas(windowWidth, windowHeight);

    // Show debug panel FIRST
    showDebug();

    // Lock mobile gestures
    lockGestures();

    debug("Touch Angle - Minimal Version");
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
        debug("--- Angle Measurement ---");
        debug("Touch 1: (" + int(touchPoints[0].x) + ", " + int(touchPoints[0].y) + ")");
        debug("Touch 2: (" + int(touchPoints[1].x) + ", " + int(touchPoints[1].y) + ")");
        debug("Angle: " + int(touchAngleDegrees) + "°");
        debug("Radians: " + nf(touchAngleRadians, 1, 2));
        debug("Direction: " + touchDirection);
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
        touchAngleRadians = atan2(touchPoints[1].y - touchPoints[0].y, touchPoints[1].x - touchPoints[0].x);
        touchAngleDegrees = degrees(touchAngleRadians);

        if (touchAngleDegrees < 0)
        {
            touchAngleDegrees = touchAngleDegrees + 360;
        }

        if (touchAngleDegrees < 45 || touchAngleDegrees >= 315) touchDirection = "Right";
        else if (touchAngleDegrees < 135) touchDirection = "Down";
        else if (touchAngleDegrees < 225) touchDirection = "Left";
        else touchDirection = "Up";
    }
    else
    {
        touchAngleRadians = 0;
        touchAngleDegrees = 0;
        touchDirection = "";
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