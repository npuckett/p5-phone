// ==============================================
// HAPTIC FEEDBACK EXAMPLE
// ==============================================
// This example demonstrates vibration motor control
// on Android devices. Different touch zones trigger
// different vibration patterns.
// 
// CONCEPTS COVERED:
// - Vibration motor activation (Android only)
// - Different vibration patterns
// - Touch zone detection
// - Visual and haptic feedback combined
// 
// NOTE: Vibration only works on Android devices
//       iOS does not support the Vibration API
// ==============================================

// Variables for touch zones
let zones = [];
let currentZone = -1;

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup() {
    // Create a canvas that fills the entire screen
    createCanvas(windowWidth, windowHeight);
    
    // Lock mobile gestures to prevent scrolling, zooming, etc.
    lockGestures();
    
    // Enable vibration with tap-to-start
    // User must tap screen to enable vibration (browser requirement)
    enableVibrationTap('Tap to enable vibration');
    
    // Set text properties
    textAlign(CENTER, CENTER);
    textSize(24);
    
    // Create four touch zones with different vibration patterns
    zones = [
        {
            name: "Quick Tap",
            color: color(100, 200, 255),
            pattern: 20,  // Single 20ms vibration
            description: "Short pulse"
        },
        {
            name: "Double Tap",
            color: color(255, 200, 100),
            pattern: [50, 30, 50],  // Pattern: vibrate-pause-vibrate
            description: "Two pulses"
        },
        {
            name: "Triple Tap",
            color: color(100, 255, 200),
            pattern: [50, 30, 50, 30, 50],  // Three pulses
            description: "Three pulses"
        },
        {
            name: "Long Press",
            color: color(255, 150, 200),
            pattern: 200,  // Single 200ms vibration
            description: "Extended pulse"
        }
    ];
}

// ==============================================
// DRAW FUNCTION - Runs continuously
// ==============================================
function draw() {
    background(240);
    
    // Check if vibration is enabled
    if (!window.vibrationEnabled) {
        // Show instructions if vibration not enabled yet
        fill(50);
        textSize(32);
        text("Tap to Enable Vibration", width/2, height/2 - 40);
        textSize(20);
        text("(Android Only)", width/2, height/2 + 10);
        textSize(16);
        text("iOS does not support vibration", width/2, height/2 + 40);
        return;
    }
    
    // Draw the four zones (2x2 grid)
    let zoneWidth = width / 2;
    let zoneHeight = height / 2;
    
    for (let i = 0; i < zones.length; i++) {
        let x = (i % 2) * zoneWidth;
        let y = floor(i / 2) * zoneHeight;
        
        // Highlight the zone if it's currently being touched
        if (currentZone === i) {
            fill(zones[i].color);
            stroke(0);
            strokeWeight(4);
        } else {
            fill(255);
            stroke(200);
            strokeWeight(2);
        }
        
        rect(x, y, zoneWidth, zoneHeight);
        
        // Draw zone label
        fill(50);
        noStroke();
        textSize(28);
        text(zones[i].name, x + zoneWidth/2, y + zoneHeight/2 - 30);
        
        textSize(18);
        fill(100);
        text(zones[i].description, x + zoneWidth/2, y + zoneHeight/2 + 10);
        
        // Show pattern details
        textSize(14);
        fill(150);
        let patternText = Array.isArray(zones[i].pattern) 
            ? "[" + zones[i].pattern.join(", ") + "]" 
            : zones[i].pattern + "ms";
        text(patternText, x + zoneWidth/2, y + zoneHeight/2 + 40);
    }
    
    // Instructions at bottom
    fill(50);
    textSize(16);
    text("Touch different zones to feel different vibration patterns", width/2, height - 30);
}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// This function runs when a touch begins
function touchStarted() {
    // Only proceed if vibration is enabled
    if (!window.vibrationEnabled) {
        return false;
    }
    
    // Determine which zone was touched
    let zoneWidth = width / 2;
    let zoneHeight = height / 2;
    
    let col = floor(mouseX / zoneWidth);
    let row = floor(mouseY / zoneHeight);
    let zoneIndex = row * 2 + col;
    
    // Make sure the zone is valid
    if (zoneIndex >= 0 && zoneIndex < zones.length) {
        currentZone = zoneIndex;
        
        // Trigger the vibration pattern for this zone
        vibrate(zones[zoneIndex].pattern);
    }
    
    return false;  // Prevent default touch behavior
}

// This function runs when a touch ends
function touchEnded() {
    currentZone = -1;  // No zone is being touched
    return false;
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

// Handle window resizing
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
