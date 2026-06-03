// MINIMAL VERSION - Acceleration
// No visual feedback - data displayed in debug panel only
// Demonstrates: Reading device acceleration (accelerationX, accelerationY, accelerationZ)

let accelerationValues = { x: 0, y: 0, z: 0 };
let totalAcceleration = 0;
let dominantAxis = "";

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
        updateAccelerationValues();

        // Output to debug panel
        debug("--- Device Acceleration ---");
        debug("Acceleration X: " + nf(accelerationValues.x, 1, 2));
        debug("Acceleration Y: " + nf(accelerationValues.y, 1, 2));
        debug("Acceleration Z: " + nf(accelerationValues.z, 1, 2));
        debug("Total Magnitude: " + nf(totalAcceleration, 1, 2));

        // Add movement indicators
        if (totalAcceleration > 5)
        {
            debug("MOVING FAST!");
        }
        else if (totalAcceleration > 2)
        {
            debug("Moving moderately");
        }
        else if (totalAcceleration > 0.5)
        {
            debug("Gentle movement");
        }
        else
        {
            debug("Still or very slow");
        }

        // Show dominant direction
        debug("Dominant axis: " + dominantAxis);
    }
    else
    {
        debug("Waiting for sensor permissions...");
        debug("Tap the screen to enable sensors");
    }
}

function updateAccelerationValues()
{
    accelerationValues.x = accelerationX;
    accelerationValues.y = accelerationY;
    accelerationValues.z = accelerationZ;
    totalAcceleration = sqrt(
        accelerationValues.x * accelerationValues.x +
        accelerationValues.y * accelerationValues.y +
        accelerationValues.z * accelerationValues.z
    );

    let maxVal = max(abs(accelerationValues.x), abs(accelerationValues.y), abs(accelerationValues.z));
    if (maxVal === abs(accelerationValues.x))
    {
        dominantAxis = "X " + (accelerationValues.x > 0 ? "(Right)" : "(Left)");
    }
    else if (maxVal === abs(accelerationValues.y))
    {
        dominantAxis = "Y " + (accelerationValues.y > 0 ? "(Forward)" : "(Backward)");
    }
    else
    {
        dominantAxis = "Z " + (accelerationValues.z > 0 ? "(Up)" : "(Down)");
    }
}