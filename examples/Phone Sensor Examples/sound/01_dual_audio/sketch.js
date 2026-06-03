// ==============================================
// DUAL AUDIO PLAYBACK EXAMPLE (TOUCH VERSION)
// ==============================================
// This example shows how to enable audio playback
// on mobile devices and play different generated
// tones based on screen touch zones.
// ==============================================

let tone1;
let tone2;
let tone1Active = false;
let tone2Active = false;
let tone1Level = 0;
let tone2Level = 0;
let primaryTouchY = 0;
let activeTouchZone = '';

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();
    enableSoundTap();

    background(50);
    textAlign(CENTER, CENTER);
    textSize(16);
}

function draw()
{
    background(50);
    drawSplitScreen();

    if (window.soundEnabled)
    {
        drawVisualizers();
    }
    else
    {
        fill(255, 255, 0);
        textSize(24);
        text('Touch anywhere to start', width / 2, height / 2);
    }
}

function ensureTonesStarted()
{
    if (tone1 && tone2)
    {
        return;
    }

    tone1 = new p5.Oscillator(220, 'sine');
    tone2 = new p5.Oscillator(330, 'triangle');
    tone1.amp(0);
    tone2.amp(0);
    tone1.start();
    tone2.start();
}

function drawSplitScreen()
{
    noStroke();
    fill(150, 200, 255);
    rect(0, 0, width, height / 2);

    fill(150, 255, 200);
    rect(0, height / 2, width, height / 2);

    stroke(255);
    strokeWeight(2);
    line(0, height / 2, width, height / 2);
    noStroke();

    fill(50);
    textSize(20);
    text('LOW TONE', width / 2, height / 4 - 60);
    text(window.soundEnabled ? 'Touch and hold to play' : 'Enable sound first', width / 2, height / 4 - 35);

    text('HIGH TONE', width / 2, (height / 4) * 3 - 60);
    text(window.soundEnabled ? 'Touch and hold to play' : 'Enable sound first', width / 2, (height / 4) * 3 - 35);
}

function drawVisualizers()
{
    tone1Level = lerp(tone1Level, tone1Active ? 1 : 0, 0.18);
    tone2Level = lerp(tone2Level, tone2Active ? 1 : 0, 0.18);

    let pulse1 = 90 + 36 * sin(frameCount * 0.16);
    let pulse2 = 90 + 36 * sin(frameCount * 0.2);

    fill(255, 150, 100, 210);
    noStroke();
    circle(width / 2, height / 4, tone1Level * pulse1);

    fill(255, 100, 200, 210);
    circle(width / 2, 3 * height / 4, tone2Level * pulse2);
}

function mousePressed(event)
{
    if (window.soundEnabled)
    {
        ensureTonesStarted();

        updateTouchAudioValues(event);

        if (activeTouchZone === 'top')
        {
            tone1Active = true;
            tone2Active = false;
            tone1.amp(0.35, 0.04);
            tone2.amp(0, 0.04);
        }
        else
        {
            tone1Active = false;
            tone2Active = true;
            tone1.amp(0, 0.04);
            tone2.amp(0.35, 0.04);
        }
    }

    return false;
}

function updateTouchAudioValues(event)
{
    primaryTouchY = getPrimaryY(event);
    activeTouchZone = primaryTouchY < height / 2 ? 'top' : 'bottom';
}

function mouseReleased()
{
    tone1Active = false;
    tone2Active = false;

    if (tone1)
    {
        tone1.amp(0, 0.08);
    }

    if (tone2)
    {
        tone2.amp(0, 0.08);
    }

    return false;
}

function getPrimaryY(event)
{
    if (event)
    {
        let eventTouch = event.touches?.[0] ?? event.changedTouches?.[0];
        let eventY = eventTouch?.clientY ?? eventTouch?.pageY ?? event.clientY ?? event.pageY;

        if (Number.isFinite(eventY))
        {
            return eventY;
        }
    }

    if (touches.length > 0)
    {
        let touchPoint = touches[0];
        let y = touchPoint.y ?? touchPoint.winY ?? touchPoint.clientY ?? touchPoint.pageY;

        if (Number.isFinite(y))
        {
            return y;
        }
    }

    if (Number.isFinite(mouseY) && mouseY >= 0 && mouseY <= height)
    {
        return mouseY;
    }

    return height / 2;
}

function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
}