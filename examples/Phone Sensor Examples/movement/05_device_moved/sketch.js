// ==============================================
// DEVICE MOVED EXAMPLE
// ==============================================
// Demonstrates p5.js deviceMoved() with p5-phone motion permissions.
// Use setMoveThreshold() to control how much movement triggers the event.

let moveCount = 0;
let moveThreshold = 5;
let lastMoveTime = 0;
let trail = [];
let lastAcceptedAccelerationX = 0;
let lastAcceptedAccelerationY = 0;
let lastAcceptedAccelerationZ = 0;
let accelerationValues = { x: 0, y: 0, z: 0 };
let movementStrength = 0;
let movementPoint = { x: 0, y: 0 };
let movementDotSize = 16;
let accelerationDelta = 0;

const moveDebounceMs = 450;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();
    enableGyroTap('Tap to enable motion sensors');

    textAlign(CENTER, CENTER);
    applyMoveThreshold();
}

function draw()
{
    background(238, 244, 255);

    if (window.sensorsEnabled)
    {
        drawActiveState();
    }
    else
    {
        drawWaitingState();
    }
}

function drawActiveState()
{
    updateTrail();
    drawTrail();

    fill(35);
    textSize(30);
    text('deviceMoved()', width / 2, 70);

    textSize(76);
    text(moveCount, width / 2, height / 2 - 52);

    fill(80);
    textSize(18);
    text('Move count', width / 2, height / 2 + 10);
    text('Threshold: ' + moveThreshold.toFixed(0), width / 2, height / 2 + 48);

    drawThresholdButtons();

    textSize(15);
    fill(95);
    text('Move, tilt, or nudge the phone. Lower threshold = more sensitive.', width / 2, height - 44, width - 40);
}

function drawWaitingState()
{
    fill(50);
    textSize(28);
    text('Motion Sensors Disabled', width / 2, height / 2 - 36);

    textSize(18);
    fill(100);
    text('Tap to enable motion sensors', width / 2, height / 2 + 18);
}

function updateTrail()
{
    if (!window.sensorsEnabled)
    {
        return;
    }

    updateAccelerationValues();

    trail.push({
        x: movementPoint.x,
        y: movementPoint.y,
        size: movementDotSize,
        age: 255
    });

    if (trail.length > 24)
    {
        trail.shift();
    }
}

function updateAccelerationValues()
{
    accelerationValues.x = accelerationX;
    accelerationValues.y = accelerationY;
    accelerationValues.z = accelerationZ;
    movementStrength = sqrt(
        accelerationValues.x * accelerationValues.x +
        accelerationValues.y * accelerationValues.y +
        accelerationValues.z * accelerationValues.z
    );
    movementPoint.x = width / 2 + accelerationValues.x * 10;
    movementPoint.y = height / 2 + accelerationValues.y * 10;
    movementDotSize = map(constrain(movementStrength, 0, 30), 0, 30, 16, 90);
}

function drawTrail()
{
    noStroke();

    for (let trailIndex = 0; trailIndex < trail.length; trailIndex++)
    {
        let dot = trail[trailIndex];
        fill(54, 108, 210, dot.age);
        circle(dot.x, dot.y, dot.size);
        dot.age *= 0.9;
    }
}

function drawThresholdButtons()
{
    let buttonY = height / 2 + 100;
    drawButton(width / 2 - 64, buttonY, 96, 44, '-');
    drawButton(width / 2 + 64, buttonY, 96, 44, '+');
}

function drawButton(centerX, centerY, buttonWidth, buttonHeight, label)
{
    rectMode(CENTER);
    stroke(40);
    strokeWeight(2);
    fill(255);
    rect(centerX, centerY, buttonWidth, buttonHeight, 8);

    noStroke();
    fill(25);
    textSize(26);
    text(label, centerX, centerY - 2);
}

function applyMoveThreshold()
{
    moveThreshold = constrain(moveThreshold, 1, 20);
    setMoveThreshold(moveThreshold);
}

function deviceMoved()
{
    let now = millis();
    updateAccelerationValues();
    accelerationDelta = dist(
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
    }
}

function mousePressed()
{
    if (window.sensorsEnabled)
    {
        let buttonY = height / 2 + 100;

        if (isInsideButton(width / 2 - 64, buttonY, 96, 44))
        {
            moveThreshold -= 1;
            applyMoveThreshold();
        }
        else if (isInsideButton(width / 2 + 64, buttonY, 96, 44))
        {
            moveThreshold += 1;
            applyMoveThreshold();
        }
    }

    return false;
}

function isInsideButton(centerX, centerY, buttonWidth, buttonHeight)
{
    return mouseX >= centerX - buttonWidth / 2 &&
        mouseX <= centerX + buttonWidth / 2 &&
        mouseY >= centerY - buttonHeight / 2 &&
        mouseY <= centerY + buttonHeight / 2;
}

function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
}