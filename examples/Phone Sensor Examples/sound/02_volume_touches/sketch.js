// ==============================================
// VOLUME BY TOUCHES EXAMPLE
// ==============================================
// This example demonstrates controlling generated
// audio volume based on the number of simultaneous
// touches.
// ==============================================

let tone;
let playing = false;
let currentVolume = 0;
let targetVolume = 0;

const MAX_TOUCHES = 5;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();
    enableSoundTap();

    background(30);
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(255);
}

function draw()
{
    background(30, 20, 50);

    if (window.soundEnabled)
    {
        fill(200, 200, 255);
        textSize(16);
        text('Touch and hold with 1-5 fingers to play', width / 2, 30);
        text('More fingers = higher volume', width / 2, 55);

        drawVisualizer();
        drawTouchInfo();
    }
    else
    {
        fill(255, 200, 100);
        textSize(24);
        text('Touch anywhere to start', width / 2, height / 2 - 40);
        textSize(18);
        text('Use 1-5 fingers to control volume', width / 2, height / 2 + 10);
    }
}

function ensureToneStarted()
{
    if (tone)
    {
        return;
    }

    tone = new p5.Oscillator(240, 'sawtooth');
    tone.amp(0);
    tone.start();
}

function drawVisualizer()
{
    currentVolume = lerp(currentVolume, targetVolume, 0.18);

    let circleSize = map(currentVolume, 0, 1, 40, min(width, height) * 0.72);
    let numTouches = getTouchCount();
    let hue = map(numTouches, 0, MAX_TOUCHES, 180, 300);

    push();
    colorMode(HSB);
    fill(hue, 80, 100, 0.7);
    noStroke();
    circle(width / 2, height / 2, circleSize);

    fill(hue, 60, 100, 0.9);
    circle(width / 2, height / 2, circleSize * 0.5);
    pop();
}

function drawTouchInfo()
{
    let numTouches = getTouchCount();

    fill(255);
    textSize(20);
    text('Touches: ' + numTouches, width / 2, height - 80);

    textSize(18);
    text('Volume: ' + int(targetVolume * 100) + '%', width / 2, height - 50);

    drawTouchIndicators(numTouches);
}

function drawTouchIndicators(currentTouches)
{
    let spacing = min(50, (width - 70) / MAX_TOUCHES);
    let startX = width / 2 - (spacing * (MAX_TOUCHES - 1)) / 2;
    let y = height - 120;

    for (let index = 0; index < MAX_TOUCHES; index++)
    {
        let x = startX + (index * spacing);

        push();
        if (index < currentTouches)
        {
            fill(100, 200, 255);
            stroke(255);
        }
        else
        {
            noFill();
            stroke(100);
        }

        strokeWeight(2);
        circle(x, y, 30);

        if (index < currentTouches)
        {
            fill(255);
            noStroke();
            textSize(14);
            text(index + 1, x, y);
        }
        pop();
    }
}

function mousePressed()
{
    if (window.soundEnabled)
    {
        ensureToneStarted();
        playing = true;
        updateVolume();
    }

    return false;
}

function mouseDragged()
{
    if (window.soundEnabled && playing)
    {
        updateVolume();
    }

    return false;
}

function mouseReleased()
{
    playing = false;
    targetVolume = 0;

    if (tone)
    {
        tone.amp(0, 0.08);
    }

    return false;
}

function updateVolume()
{
    let numTouches = getTouchCount();
    targetVolume = map(numTouches, 1, MAX_TOUCHES, 0.12, 0.7);
    targetVolume = constrain(targetVolume, 0, 0.7);

    tone.freq(map(numTouches, 1, MAX_TOUCHES, 220, 520), 0.08);
    tone.amp(targetVolume, 0.05);
}

function getTouchCount()
{
    if (!mouseIsPressed && touches.length === 0)
    {
        return 0;
    }

    return max(1, min(touches.length || 1, MAX_TOUCHES));
}

function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
}