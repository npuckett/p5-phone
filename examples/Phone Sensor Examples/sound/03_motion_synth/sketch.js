// ==============================================
// MOTION SYNTH EXAMPLE
// ==============================================
// This example generates sound with p5.sound and
// controls it with phone motion sensor data.
//
// CONCEPTS COVERED:
// - Generated sound with p5.Oscillator
// - Audio output activation on mobile
// - Motion sensor activation on mobile
// - Mapping rotationX and rotationY to sound
// - Mobile gesture locking
// ==============================================

let oscillator;
let startButton;
let currentFrequency = 220;
let currentVolume = 0;
let movementEnergy = 0;
let previousAccelerationX = 0;
let previousAccelerationY = 0;
let previousAccelerationZ = 0;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    lockGestures();

    createStartButton();
    enableSoundOn('#motion-sound-start');
    enableGyroOn('#motion-sound-start');

    textAlign(CENTER, CENTER);
}

function draw()
{
    background(24, 28, 34);

    if (window.soundEnabled && window.sensorsEnabled)
    {
        startButton.hide();
        ensureSynthStarted();
        updateSynthFromMotion();
        drawActiveState();
    }
    else
    {
        if (oscillator)
        {
            oscillator.amp(0, 0.1);
        }
        drawWaitingState();
    }
}

function ensureSynthStarted()
{
    if (oscillator)
    {
        return;
    }

    oscillator = new p5.Oscillator('sine');
    oscillator.freq(currentFrequency);
    oscillator.amp(0);
    oscillator.start();
}

function createStartButton()
{
    startButton = createButton('Enable motion sound');
    startButton.id('motion-sound-start');
    startButton.style('position', 'fixed');
    startButton.style('z-index', '10');
    startButton.style('padding', '16px 22px');
    startButton.style('font-size', '18px');
    startButton.style('font-weight', '700');
    startButton.style('border', '0');
    startButton.style('border-radius', '8px');
    startButton.style('background', '#ffcc66');
    startButton.style('color', '#171a20');
    startButton.style('box-shadow', '0 8px 22px rgba(0, 0, 0, 0.25)');
    positionStartButton();
}

function positionStartButton()
{
    if (startButton)
    {
        startButton.position(width/2 - 110, height/2 - 28);
    }
}

function updateSynthFromMotion()
{
    currentFrequency = map(constrain(rotationX, -90, 90), -90, 90, 120, 880);
    currentVolume = map(abs(constrain(rotationY, -90, 90)), 0, 90, 0.05, 0.35);

    let deltaX = abs(accelerationX - previousAccelerationX);
    let deltaY = abs(accelerationY - previousAccelerationY);
    let deltaZ = abs(accelerationZ - previousAccelerationZ);
    movementEnergy = constrain(deltaX + deltaY + deltaZ, 0, 8);

    previousAccelerationX = accelerationX;
    previousAccelerationY = accelerationY;
    previousAccelerationZ = accelerationZ;

    oscillator.freq(currentFrequency, 0.08);
    oscillator.amp(currentVolume, 0.08);
}

function drawWaitingState()
{
    fill(255);
    textSize(24);
    text('Motion Synth', width/2, height/2 - 110);

    fill(205);
    textSize(16);
    text('Tap the button to enable sound and motion sensors.', width/2, height/2 + 50);
    text('Tilt the phone after it starts.', width/2, height/2 + 78);
}

function drawActiveState()
{
    let level = currentVolume * (0.86 + 0.14 * sin(frameCount * 0.08));
    let pulseSize = map(level, 0, 0.35, 120, min(width, height) * 0.65);
    let energySize = map(movementEnergy, 0, 8, 12, 90);

    noStroke();
    fill(70, 180, 220, 80);
    circle(width/2, height/2, pulseSize + energySize);

    fill(255, 204, 102, 210);
    circle(width/2, height/2, pulseSize * 0.45);

    drawMeter('Pitch', currentFrequency, 120, 880, height - 150, 'Hz');
    drawMeter('Volume', currentVolume, 0, 0.35, height - 90, '');

    fill(255);
    textSize(24);
    text('Tilt to shape the tone', width/2, 56);

    fill(210);
    textSize(15);
    text('Forward/back changes pitch. Side tilt changes volume.', width/2, 88);
    text('Motion energy: ' + nf(movementEnergy, 1, 2), width/2, 116);
}

function drawMeter(label, value, low, high, y, unit)
{
    let meterWidth = min(width - 70, 420);
    let x = width/2 - meterWidth/2;
    let amount = map(value, low, high, 0, 1);
    amount = constrain(amount, 0, 1);

    noStroke();
    fill(255, 255, 255, 45);
    rect(x, y, meterWidth, 18, 8);

    fill(120, 220, 170);
    rect(x, y, meterWidth * amount, 18, 8);

    fill(255);
    textSize(14);
    let displayValue = unit === 'Hz' ? int(value) + ' Hz' : int(value * 100) + '%';
    text(label + ': ' + displayValue, width/2, y - 18);
}

function mousePressed()
{
    return false;
}

function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
    positionStartButton();
}