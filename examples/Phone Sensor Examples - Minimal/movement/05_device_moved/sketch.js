// MINIMAL VERSION - Device Moved
// Demonstrates: deviceMoved() and setMoveThreshold()

let moveCount = 0;
let moveThreshold = 0.5;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    showDebug();
    lockGestures();
    enableGyroTap('Tap to enable motion sensors');
    setMoveThreshold(moveThreshold);

    debug('Device Moved - Minimal Version');
    debug('setMoveThreshold(' + moveThreshold + ')');
    debug('Move the phone to trigger deviceMoved().');
}

function draw()
{
    background(240);

    if (window.sensorsEnabled)
    {
        debug('Move count: ' + moveCount);
    }
    else
    {
        debug('Waiting for motion sensors...');
    }
}

function deviceMoved()
{
    if (window.sensorsEnabled)
    {
        moveCount++;
        debug('deviceMoved() fired: ' + moveCount);
    }
}

function mousePressed()
{
    return false;
}