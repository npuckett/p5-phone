// MINIMAL VERSION - Vibration Haptic Feedback
// No visual feedback - vibration patterns triggered by touch zones
// Demonstrates: Vibration activation, different patterns, zone detection
// NOTE: Android only - iOS does not support the Vibration API

// Global variables for touch zones
let currentZone = -1;

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST to display all vibration data
    showDebug();
    
    // Lock mobile gestures to prevent browser interference
    lockGestures();
    
    // Enable vibration with tap-to-start (Android only)
    enableVibrationTap('Tap to enable vibration');
    
    debug("Vibration Haptic Feedback - Minimal Version");
    debug("Android only - iOS does not support vibration");
    debug("Touch different screen zones to trigger patterns:");
    debug("Top-Left: Quick pulse (20ms)");
    debug("Top-Right: Double pulse [50,30,50]");
    debug("Bottom-Left: Triple pulse [50,30,50,30,50]");
    debug("Bottom-Right: Long pulse (200ms)");
}

function draw() 
{
    // Minimal visual - no graphics needed
    background(240);
}

// Prevent default touch behavior and unwanted gestures
function touchStarted() 
{
    // Check if vibration is enabled
    if (!window.vibrationEnabled) 
    {
        debug("⚠️ Vibration not enabled or not supported");
        return false;
    }
    
    // Determine which zone was touched (2x2 grid)
    let zoneWidth = width / 2;
    let zoneHeight = height / 2;
    let col = floor(mouseX / zoneWidth);
    let row = floor(mouseY / zoneHeight);
    let zoneIndex = row * 2 + col;
    
    // Trigger vibration based on zone
    if (zoneIndex === 0) 
    {
        // Top-Left: Quick Tap
        vibrate(20);
        debug("Zone 1 (Top-Left): Quick pulse - 20ms");
    }
    else if (zoneIndex === 1) 
    {
        // Top-Right: Double Tap
        vibrate([50, 30, 50]);
        debug("Zone 2 (Top-Right): Double pulse - [50, 30, 50]");
    }
    else if (zoneIndex === 2) 
    {
        // Bottom-Left: Triple Tap
        vibrate([50, 30, 50, 30, 50]);
        debug("Zone 3 (Bottom-Left): Triple pulse - [50, 30, 50, 30, 50]");
    }
    else if (zoneIndex === 3) 
    {
        // Bottom-Right: Long Press
        vibrate(200);
        debug("Zone 4 (Bottom-Right): Long pulse - 200ms");
    }
    
    return false;  // Prevents default behavior
}

// Prevent default touch behavior
function touchEnded() 
{
    return false;
}
