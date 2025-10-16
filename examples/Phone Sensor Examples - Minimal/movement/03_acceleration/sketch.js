// MINIMAL VERSION - Acceleration
// No visual feedback - data displayed in debug panel only
// Demonstrates: Reading device acceleration (accelerationX, accelerationY, accelerationZ)

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel FIRST
    showDebug();
    
    // Enable motion sensors with tap permission (iOS)
    enableGyroTap();
    
    // Lock mobile gestures
    lockGestures();
    
    debug("Acceleration - Minimal Version");
    debug("Move your device to see acceleration values");
    debug("Waiting for sensor data...");
}

function draw() 
{
    // No visual feedback in minimal version
    
    // Check if motion sensors are enabled
    if (window.sensorsEnabled) 
    {
        // Get current acceleration values
        let ax = accelerationX;
        let ay = accelerationY;
        let az = accelerationZ;
        
        // Calculate total acceleration magnitude
        let totalAccel = sqrt(ax * ax + ay * ay + az * az);
        
        // Output to debug panel
        debug("--- Device Acceleration ---");
        debug("Acceleration X: " + nf(ax, 1, 2));
        debug("Acceleration Y: " + nf(ay, 1, 2));
        debug("Acceleration Z: " + nf(az, 1, 2));
        debug("Total Magnitude: " + nf(totalAccel, 1, 2));
        
        // Add movement indicators
        if (totalAccel > 5) 
        {
            debug("MOVING FAST!");
        }
        else if (totalAccel > 2) 
        {
            debug("Moving moderately");
        }
        else if (totalAccel > 0.5) 
        {
            debug("Gentle movement");
        }
        else 
        {
            debug("Still or very slow");
        }
        
        // Show dominant direction
        let maxVal = max(abs(ax), abs(ay), abs(az));
        if (maxVal === abs(ax)) 
        {
            debug("Dominant axis: X " + (ax > 0 ? "(Right)" : "(Left)"));
        }
        else if (maxVal === abs(ay)) 
        {
            debug("Dominant axis: Y " + (ay > 0 ? "(Forward)" : "(Backward)"));
        }
        else 
        {
            debug("Dominant axis: Z " + (az > 0 ? "(Up)" : "(Down)"));
        }
    }
    else 
    {
        debug("Waiting for sensor permissions...");
        debug("Tap the screen to enable sensors");
    }
}