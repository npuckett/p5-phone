let mic;
let level = 0;

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

    level = lerp(level, mic.getLevel(), 0.2);

    let tiltX = constrain(rotationY, -45, 45);
    let tiltY = constrain(rotationX, -45, 45);
    let x = map(tiltX, -45, 45, 80, width - 80);
    let y = map(tiltY, -45, 45, 80, height - 80);
    let size = 80 + level * 900;

    noStroke();
    fill(70, 180, 255);
    circle(x, y, size);

    fill(255);
    text('Tilt to move. Speak to grow.', width / 2, 42);
    text('mic: ' + nf(level, 1, 3), width / 2, height - 42);
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