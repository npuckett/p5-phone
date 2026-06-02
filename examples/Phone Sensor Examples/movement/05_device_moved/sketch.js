// ==============================================
// DEVICE MOVED EXAMPLE
// ==============================================
// Demonstrates p5.js deviceMoved() with p5-phone motion permissions.
// Use setMoveThreshold() to control how much movement triggers the event.

let moveCount = 0;
let moveThreshold = 0.5;
let lastMoveTime = 0;
let trail = [];

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
    text('Threshold: ' + moveThreshold.toFixed(1), width / 2, height / 2 + 48);

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

    let movementStrength = sqrt(accelerationX * accelerationX + accelerationY * accelerationY + accelerationZ * accelerationZ);
    let dotSize = map(constrain(movementStrength, 0, 30), 0, 30, 16, 90);

    trail.push({
        x: width / 2 + accelerationX * 10,
        y: height / 2 + accelerationY * 10,
        size: dotSize,
        age: 255
    });

    if (trail.length > 24)
    {
        trail.shift();
    }
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
    moveThreshold = constrain(moveThreshold, 0.1, 5);
    setMoveThreshold(moveThreshold);
}

function deviceMoved()
{
    if (window.sensorsEnabled)
    {
        moveCount++;
        lastMoveTime = millis();
    }
}

function mousePressed()
{
    if (window.sensorsEnabled)
    {
        let buttonY = height / 2 + 100;

        if (isInsideButton(width / 2 - 64, buttonY, 96, 44))
        {
            moveThreshold -= 0.1;
            applyMoveThreshold();
        }
        else if (isInsideButton(width / 2 + 64, buttonY, 96, 44))
        {
            moveThreshold += 0.1;
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