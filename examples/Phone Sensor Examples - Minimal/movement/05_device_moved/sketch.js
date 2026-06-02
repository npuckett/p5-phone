// MINIMAL VERSION - Device Moved
// Demonstrates: deviceMoved() and setMoveThreshold()

let moveCount = 0;
let moveThreshold = 5;
let lastMoveTime = 0;
let lastAcceptedAccelerationX = 0;
let lastAcceptedAccelerationY = 0;
let lastAcceptedAccelerationZ = 0;

const moveDebounceMs = 450;

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
    let now = millis();
    let accelerationDelta = dist(
        accelerationX, accelerationY, accelerationZ,
        lastAcceptedAccelerationX, lastAcceptedAccelerationY, lastAcceptedAccelerationZ
    );

    if (window.sensorsEnabled && (lastMoveTime === 0 || now - lastMoveTime > moveDebounceMs) && accelerationDelta >= moveThreshold)
    {
        moveCount++;
        lastMoveTime = now;
        lastAcceptedAccelerationX = accelerationX;
        lastAcceptedAccelerationY = accelerationY;
        lastAcceptedAccelerationZ = accelerationZ;
        debug('deviceMoved() fired: ' + moveCount);
    }
}

function mousePressed()
{
    return false;
}