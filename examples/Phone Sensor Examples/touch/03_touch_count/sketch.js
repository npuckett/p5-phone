// ==============================================
// TOUCH COUNT EXAMPLE
// ==============================================
// This example counts how many fingers are
// currently touching the screen at the same time
// 
// CONCEPTS COVERED:
// - Multi-touch detection
// - touches array
// - Real-time touch counting
// - Simple display of numbers
// 
// HARDWARE LIMITATIONS:
// - iPhone: Usually max 5 simultaneous touches
// - iPad: Usually max 10-11 simultaneous touches  
// - Android: Varies by device (typically 5-10)

// ==============================================

// Variables to store touch information
let currentTouchCount = 0;    // How many fingers are touching right now
let previousTouchCount = 0;   // Previous number of touches to detect changes
let backgroundColor = [255, 255, 255];  // Current background color [red, green, blue]

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
    textSize(48);
}

// ==============================================
// DRAW FUNCTION - Runs continuously
// ==============================================
function draw() 
{
    // Always check the actual number of current touches for accuracy
    currentTouchCount = touches.length;
    
    // Check if the number of touches has changed
    if (currentTouchCount != previousTouchCount) 
    {
        // Generate a new random background color
        backgroundColor[0] = random(150, 255);  // Red component
        backgroundColor[1] = random(150, 255);  // Green component  
        backgroundColor[2] = random(150, 255);  // Blue component
        
        // Update previous count to current count
        previousTouchCount = currentTouchCount;
    }
    
    // Use the stored background color
    background(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
    
    // Display current touch count (big number in center)
    fill(50, 50, 50);
    textSize(120);
    text(currentTouchCount, width/2, height/2);
    
    // Display label
    textSize(32);
    text("Current Touches", width/2, height/2 + 100);
    

}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// This function runs when a new touch begins
function touchStarted() 
{
    // Touch count will be updated in draw() function
    return false;
}

// This function runs when a touch ends
function touchEnded() 
{
    // Touch count will be updated in draw() function  
    return false;
}

