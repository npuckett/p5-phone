// MINIMAL VERSION - Touch Zones
// No visual feedback - data displayed in debug panel only
// Demonstrates: Detecting which zone of the screen is touched (divided into 4 quadrants)

// Global variables for zone detection
let xDivision = 2;  // Number of columns (2 = left/right)
let yDivision = 2;  // Number of rows (2 = top/bottom)
let zoneCounters = [0, 0, 0, 0];  // Touch counters for each zone

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Lock mobile gestures
    lockGestures();
    
    debug("Touch Zones - Minimal Version");
    debug("Screen divided into " + (xDivision * yDivision) + " zones");
    debug("Zone 0: Top-Left");
    debug("Zone 1: Top-Right");
    debug("Zone 2: Bottom-Left");
    debug("Zone 3: Bottom-Right");
    debug("Touch anywhere to see which zone");
}

function draw() 
{
    // No visual feedback in minimal version
}

// Helper function to determine which zone a touch is in
function getZone(x, y) 
{
    // Calculate which column and row the touch is in
    let col = floor(x / (width / xDivision));
    let row = floor(y / (height / yDivision));
    
    // Convert to zone number (0-3)
    let zone = row * xDivision + col;
    
    // Make sure zone is within valid range
    zone = constrain(zone, 0, (xDivision * yDivision) - 1);
    
    return zone;
}

// Prevent default touch behavior and unwanted gestures
function touchStarted() 
{
    // Check all active touches
    for (let i = 0; i < touches.length; i++) 
    {
        let x = touches[i].x;
        let y = touches[i].y;
        
        // Get zone for this touch
        let zone = getZone(x, y);
        
        // Increment counter for this zone
        zoneCounters[zone] = zoneCounters[zone] + 1;
        
        // Output to debug panel
        debug("--- Touch in Zone " + zone + " ---");
        debug("Position: (" + int(x) + ", " + int(y) + ")");
        debug("Zone " + zone + " Total Touches: " + zoneCounters[zone]);
    }
    
    return false;  // Prevents default behavior
}

// Prevent default touch behavior and unwanted gestures
function touchEnded() 
{
    return false;  // Prevents default behavior
}