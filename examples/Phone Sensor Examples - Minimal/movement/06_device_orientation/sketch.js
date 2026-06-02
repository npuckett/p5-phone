// MINIMAL VERSION - Device Orientation
// Demonstrates: deviceOrientation

let lastOrientation = 'unknown';

function setup()
{
    createCanvas(windowWidth, windowHeight);
    showDebug();
    lockGestures();
    enableGyroTap('Tap to enable motion sensors');

    debug('Device Orientation - Minimal Version');
    debug('Rotate the phone between portrait and landscape.');
}

function draw()
{
    background(240);

    if (window.sensorsEnabled)
    {
        let currentOrientation = deviceOrientation || 'unknown';

        if (currentOrientation !== lastOrientation)
        {
            debug('deviceOrientation: ' + currentOrientation);
            lastOrientation = currentOrientation;
        }
    }
    else
    {
        debug('Waiting for motion sensors...');
    }
}

function mousePressed()
{
    return false;
}