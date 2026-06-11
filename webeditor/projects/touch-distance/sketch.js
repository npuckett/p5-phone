// ==============================================
// TOUCH DISTANCE EXAMPLE
// ==============================================
// This example measures the distance between
// the first 2 touches and displays the line
// with coordinates and distance
//
// CONCEPTS COVERED:
// - Multi-touch detection
// - Distance calculation using dist() function
// - Drawing lines between points
// - Displaying coordinates
// - Math.round() for cleaner numbers
// ==============================================

// Variables to store touch information
let touch1X = 0;      // X position of first touch
let touch1Y = 0;      // Y position of first touch
let touch2X = 0;      // X position of second touch
let touch2Y = 0;      // Y position of second touch
let touchDistance = 0; // Distance between the two touches
let touchMidpointX = 0; // Midpoint X between the two touches
let touchMidpointY = 0; // Midpoint Y between the two touches
let hasTwoTouches = false;


// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup()
{
    // Create a canvas that fills the entire screen
    createCanvas(windowWidth, windowHeight);

    // Lock mobile gestures to prevent scrolling, zooming, etc.
    lockGestures();

    // Set text properties
    textAlign(CENTER, CENTER);
    textSize(24);
}

// ==============================================
// DRAW FUNCTION - Runs continuously
// ==============================================
function draw()
{
    // Clear the screen
    background(240, 240, 240);

    updateTouchValues();

    // Check if we have at least 2 touches
    if (hasTwoTouches)
    {
        // Draw a line between the two touches
        stroke(100, 100, 100);
        strokeWeight(3);
        line(touch1X, touch1Y, touch2X, touch2Y);

        // Draw circles at each touch point
        fill(255, 0, 0);  // Red circles
        noStroke();
        circle(touch1X, touch1Y, 30);
        circle(touch2X, touch2Y, 30);

        // Draw distance text in the middle of the line
        fill(0, 0, 0);  // Black text
        textSize(20);
        text(Math.round(touchDistance) + " pixels", touchMidpointX, touchMidpointY - 30);

        // Display coordinates at the top of screen
        textAlign(LEFT, TOP);
        textSize(18);
        text("Touch 1: (" + Math.round(touch1X) + ", " + Math.round(touch1Y) + ")", 20, 20);
        text("Touch 2: (" + Math.round(touch2X) + ", " + Math.round(touch2Y) + ")", 20, 50);
        text("Distance: " + Math.round(touchDistance) + " pixels", 20, 80);

    }
    else
    {
        // Instructions when not enough touches
        textAlign(CENTER, CENTER);
        textSize(32);
        fill(100, 100, 100);
        text("Touch 2 points on the screen", width/2, height/2);


    }
}

function updateTouchValues()
{
    hasTwoTouches = touches.length >= 2;

    if (hasTwoTouches)
    {
        touch1X = touches[0].x;
        touch1Y = touches[0].y;
        touch2X = touches[1].x;
        touch2Y = touches[1].y;
        touchDistance = dist(touch1X, touch1Y, touch2X, touch2Y);
        touchMidpointX = (touch1X + touch2X) / 2;
        touchMidpointY = (touch1Y + touch2Y) / 2;
    }
    else
    {
        touchDistance = 0;
    }
}

// ==============================================
// INPUT EVENT FUNCTIONS
// ==============================================

// This function runs when a new touch begins
function mousePressed()
{
    // Touch positions will be updated in draw() function
    return false;
}

// This function runs when a touch ends
function mouseReleased()
{
    // Touch positions will be updated in draw() function
    return false;
}

