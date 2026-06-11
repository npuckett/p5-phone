// ==============================================
// DEVICE ORIENTATION EXAMPLE
// ==============================================
// Demonstrates p5.js deviceOrientation with p5-phone motion permissions.
// deviceOrientation reports whether the device is portrait or landscape.

let lastOrientation = 'unknown';
let orientationChanges = 0;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();
    enableGyroTap('Tap to enable motion sensors');

    textAlign(CENTER, CENTER);
    rectMode(CENTER);
}

function draw()
{
    background(242);

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
    let currentOrientation = deviceOrientation || 'unknown';
    updateOrientationCount(currentOrientation);

    if (currentOrientation === 'landscape')
    {
        background(225, 242, 255);
    }
    else if (currentOrientation === 'portrait')
    {
        background(230, 248, 236);
    }
    else
    {
        background(242);
    }

    drawPhoneShape(currentOrientation);

    fill(35);
    textSize(30);
    text('deviceOrientation', width / 2, 70);

    textSize(42);
    text(currentOrientation, width / 2, height / 2 + 126);

    fill(80);
    textSize(17);
    text('Changes: ' + orientationChanges, width / 2, height / 2 + 172);
    text('Rotate the phone between portrait and landscape.', width / 2, height - 44, width - 40);
}

function drawPhoneShape(currentOrientation)
{
    push();
    translate(width / 2, height / 2 - 36);

    if (currentOrientation === 'landscape')
    {
        rotate(PI / 2);
    }

    stroke(35);
    strokeWeight(5);
    fill(255);
    rect(0, 0, 120, 210, 18);

    noStroke();
    fill(35);
    circle(0, 82, 10);

    fill(80);
    rect(0, -72, 42, 5, 3);
    pop();
}

function updateOrientationCount(currentOrientation)
{
    if (lastOrientation !== 'unknown' && currentOrientation !== lastOrientation)
    {
        orientationChanges++;
    }

    lastOrientation = currentOrientation;
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

function mousePressed()
{
    return false;
}

function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
}