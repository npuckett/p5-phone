// ==============================================
// DEVICE SHAKEN EXAMPLE
// ==============================================
// Demonstrates p5.js deviceShaken() with p5-phone motion permissions.
// Use setShakeThreshold() to control how strong a shake must be.

let shakeCount = 0;
let shakeThreshold = 60;
let lastShakeTime = 0;
let flashColor;

const shakeDebounceMs = 700;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();
    enableGyroTap('Tap to enable motion sensors');

    textAlign(CENTER, CENTER);
    angleMode(DEGREES);
    flashColor = color(255, 230, 110);

    applyShakeThreshold();
}

function draw()
{
    background(245);

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
    let flashAmount = constrain(1 - (millis() - lastShakeTime) / 450, 0, 1);
    let backgroundShade = lerpColor(color(230, 248, 240), flashColor, flashAmount);
    background(backgroundShade);

    fill(35);
    textSize(30);
    text('deviceShaken()', width / 2, 72);

    textSize(80);
    text(shakeCount, width / 2, height / 2 - 40);

    textSize(18);
    fill(80);
    text('Shake count', width / 2, height / 2 + 28);
    text('Threshold: ' + shakeThreshold, width / 2, height / 2 + 66);

    drawThresholdButtons();

    textSize(15);
    fill(95);
    text('Shake the phone. Lower threshold = easier to trigger.', width / 2, height - 44, width - 40);
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

function drawThresholdButtons()
{
    let buttonY = height / 2 + 118;
    let buttonWidth = 96;
    let buttonHeight = 44;

    drawButton(width / 2 - 64, buttonY, buttonWidth, buttonHeight, '-');
    drawButton(width / 2 + 64, buttonY, buttonWidth, buttonHeight, '+');
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

function applyShakeThreshold()
{
    shakeThreshold = constrain(shakeThreshold, 20, 150);
    setShakeThreshold(shakeThreshold);
}

function deviceShaken()
{
    let now = millis();

    if (window.sensorsEnabled && (lastShakeTime === 0 || now - lastShakeTime > shakeDebounceMs))
    {
        shakeCount++;
        lastShakeTime = now;
    }
}

function mousePressed()
{
    if (window.sensorsEnabled)
    {
        let buttonY = height / 2 + 118;

        if (isInsideButton(width / 2 - 64, buttonY, 96, 44))
        {
            shakeThreshold -= 10;
            applyShakeThreshold();
        }
        else if (isInsideButton(width / 2 + 64, buttonY, 96, 44))
        {
            shakeThreshold += 10;
            applyShakeThreshold();
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