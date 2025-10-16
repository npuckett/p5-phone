// ==============================================
// TOUCH ZONES EXAMPLE
// ==============================================
// This example splits the screen into 4 zones
// Each zone detects touches and counts them separately
// 
// CONCEPTS COVERED:
// - Touch position detection
// - Zone-based interaction
// - Multiple counters
// - Conditional logic for zones
// ==============================================

// Variables for each zone's state
let zone1Touched = false;  // Top-left zone
let zone2Touched = false;  // Top-right zone
let zone3Touched = false;  // Bottom-left zone
let zone4Touched = false;  // Bottom-right zone

// Counter for each zone
let zone1Counter = 0;
let zone2Counter = 0;
let zone3Counter = 0;
let zone4Counter = 0;

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
    background(240, 240, 240);  // Light gray background
    
    // Draw lines to divide screen into 4 zones
    stroke(100, 100, 100);  // Gray lines
    strokeWeight(2);
    
    // Vertical line (middle of screen)
    line(width/2, 0, width/2, height);
    // Horizontal line (middle of screen)
    line(0, height/2, width, height/2);
    
    // ==============================================
    // ZONE 1 - TOP LEFT
    // ==============================================
    if (zone1Touched) 
    {
        fill(200, 255, 200);  // Light green when touched
        rect(0, 0, width/2, height/2);
        fill(0, 100, 0);  // Dark green text
        text("TOUCHED", width/4, height/4 - 20);
    } 
    else 
    {
        fill(255, 255, 255);  // White when not touched
        rect(0, 0, width/2, height/2);
        fill(100, 100, 100);  // Gray text
        text("NOT TOUCHED", width/4, height/4 - 20);
    }
    fill(50, 50, 50);  // Dark text for counter
    text("Count: " + zone1Counter, width/4, height/4 + 20);
    
    // ==============================================
    // ZONE 2 - TOP RIGHT
    // ==============================================
    if (zone2Touched) 
    {
        fill(255, 200, 200);  // Light red when touched
        rect(width/2, 0, width/2, height/2);
        fill(150, 0, 0);  // Dark red text
        text("TOUCHED", width/2 + width/4, height/4 - 20);
    } 
    else 
    {
        fill(255, 255, 255);  // White when not touched
        rect(width/2, 0, width/2, height/2);
        fill(100, 100, 100);  // Gray text
        text("NOT TOUCHED", width/2 + width/4, height/4 - 20);
    }
    fill(50, 50, 50);  // Dark text for counter
    text("Count: " + zone2Counter, width/2 + width/4, height/4 + 20);
    
    // ==============================================
    // ZONE 3 - BOTTOM LEFT
    // ==============================================
    if (zone3Touched) 
    {
        fill(200, 200, 255);  // Light blue when touched
        rect(0, height/2, width/2, height/2);
        fill(0, 0, 150);  // Dark blue text
        text("TOUCHED", width/4, height/2 + height/4 - 20);
    } 
    else 
    {
        fill(255, 255, 255);  // White when not touched
        rect(0, height/2, width/2, height/2);
        fill(100, 100, 100);  // Gray text
        text("NOT TOUCHED", width/4, height/2 + height/4 - 20);
    }
    fill(50, 50, 50);  // Dark text for counter
    text("Count: " + zone3Counter, width/4, height/2 + height/4 + 20);
    
    // ==============================================
    // ZONE 4 - BOTTOM RIGHT
    // ==============================================
    if (zone4Touched) 
    {
        fill(255, 255, 200);  // Light yellow when touched
        rect(width/2, height/2, width/2, height/2);
        fill(150, 150, 0);  // Dark yellow text
        text("TOUCHED", width/2 + width/4, height/2 + height/4 - 20);
    } 
    else 
    {
        fill(255, 255, 255);  // White when not touched
        rect(width/2, height/2, width/2, height/2);
        fill(100, 100, 100);  // Gray text
        text("NOT TOUCHED", width/2 + width/4, height/2 + height/4 - 20);
    }
    fill(50, 50, 50);  // Dark text for counter
    text("Count: " + zone4Counter, width/2 + width/4, height/2 + height/4 + 20);
}

// ==============================================
// HELPER FUNCTION - Which zone was touched?
// ==============================================
function getZone(x, y) 
{
    // This function takes an x and y position and figures out
    // which of the 4 zones that position falls into
    
    // Set the division points - these variables make it easy to change later
    let xDivision = width / 2;   // Where to split left/right (middle of screen)
    let yDivision = height / 2;  // Where to split top/bottom (middle of screen)
    
    // We divide the screen into 4 equal rectangles:
    // - Left half vs Right half (check if x < xDivision)
    // - Top half vs Bottom half (check if y < yDivision)
    
    // Check if touch is in the LEFT half of screen
    if (x < xDivision && y < yDivision) 
    {
        return 1;  // Top-left zone
    } 
    else if (x >= xDivision && y < yDivision) 
    {
        return 2;  // Top-right zone (x is >= middle, y is < middle)
    } 
    else if (x < xDivision && y >= yDivision) 
    {
        return 3;  // Bottom-left zone (x is < middle, y is >= middle)
    } 
    else 
    {
        return 4;  // Bottom-right zone (everything else)
    }
}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// This function runs when a touch begins
function touchStarted() 
{
    // Find out which zone was touched
    let touchedZone = getZone(touches[0].x, touches[0].y);
    
    // Update the correct zone
    if (touchedZone == 1) 
    {
        zone1Touched = true;
        zone1Counter = zone1Counter + 1;
    } 
    else if (touchedZone == 2) 
    {
        zone2Touched = true;
        zone2Counter = zone2Counter + 1;
    } 
    else if (touchedZone == 3) 
    {
        zone3Touched = true;
        zone3Counter = zone3Counter + 1;
    } 
    else if (touchedZone == 4) 
    {
        zone4Touched = true;
        zone4Counter = zone4Counter + 1;
    }
    
    return false;  // Prevent default browser behavior
}

// This function runs when a touch ends
function touchEnded() 
{
    // Reset all zones to not touched
    zone1Touched = false;
    zone2Touched = false;
    zone3Touched = false;
    zone4Touched = false;
    
    return false;
}

