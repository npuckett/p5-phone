// MINIMAL VERSION - Device Shaken
// Demonstrates: deviceShaken() and setShakeThreshold()

let shakeCount = 0;
let shakeThreshold = 30;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    showDebug();
    lockGestures();
    enableGyroTap('Tap to enable motion sensors');
    setShakeThreshold(shakeThreshold);

    debug('Device Shaken - Minimal Version');
    debug('setShakeThreshold(' + shakeThreshold + ')');
    debug('Shake the phone to trigger deviceShaken().');
}

function draw()
{
    background(240);

    if (window.sensorsEnabled)
    {
        debug('Shake count: ' + shakeCount);
    }
    else
    {
        debug('Waiting for motion sensors...');
    }
}

function deviceShaken()
{
    if (window.sensorsEnabled)
    {
        shakeCount++;
        debug('deviceShaken() fired: ' + shakeCount);
    }
}

function mousePressed()
{
    return false;
}