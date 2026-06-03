let mic;
let level = 0;
let tiltX = 0;
let tiltY = 0;
let circleX = 0;
let circleY = 0;
let circleSize = 80;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();

    mic = new p5.AudioIn();

    textAlign(CENTER, CENTER);
    textSize(18);

    enablePermissionsTap(['sensors', 'mic'], 'Tap to enable motion + microphone');
}

function draw()
{
    background(20, 24, 30);

    if (!window.sensorsEnabled || !window.micEnabled)
    {
        fill(255);
        text('Waiting for motion sensors and microphone', width / 2, height / 2);
        return;
    }

    updateInputValues();

    noStroke();
    fill(70, 180, 255);
    circle(circleX, circleY, circleSize);

    fill(255);
    text('Tilt to move. Speak to grow.', width / 2, 42);
    text('mic: ' + nf(level, 1, 3), width / 2, height - 42);
}

function updateInputValues()
{
    level = lerp(level, mic.getLevel(), 0.2);
    tiltX = constrain(rotationY, -45, 45);
    tiltY = constrain(rotationX, -45, 45);
    circleX = map(tiltX, -45, 45, 80, width - 80);
    circleY = map(tiltY, -45, 45, 80, height - 80);
    circleSize = 80 + level * 900;
}
function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
}

function mousePressed()
{
    return false;
}

function mouseReleased()
{
    return false;
}