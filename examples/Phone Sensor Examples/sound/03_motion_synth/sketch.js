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
let pitchTilt = 0;
let volumeTilt = 0;
let motionDelta = { x: 0, y: 0, z: 0 };
let tiltMapPosition = { x: 0, y: 0 };
let previousAccelerationX = 0;
let previousAccelerationY = 0;
let previousAccelerationZ = 0;
const synthTiltRange = 30;
const minFrequency = 90;
const maxFrequency = 1200;
const minVolume = 0.02;
const maxVolume = 0.9;

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

    oscillator = new p5.Oscillator('sawtooth');
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
    pitchTilt = constrain(rotationX, -synthTiltRange, synthTiltRange);
    volumeTilt = constrain(rotationY, -synthTiltRange, synthTiltRange);
    currentFrequency = map(pitchTilt, -synthTiltRange, synthTiltRange, minFrequency, maxFrequency);
    currentVolume = map(volumeTilt, -synthTiltRange, synthTiltRange, minVolume, maxVolume);

    motionDelta.x = abs(accelerationX - previousAccelerationX);
    motionDelta.y = abs(accelerationY - previousAccelerationY);
    motionDelta.z = abs(accelerationZ - previousAccelerationZ);
    movementEnergy = constrain(motionDelta.x + motionDelta.y + motionDelta.z, 0, 8);

    oscillator.freq(currentFrequency, 0.04);
    oscillator.amp(currentVolume, 0.04);
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
    let pulseSize = map(level, 0, maxVolume, 120, min(width, height) * 0.82);
    let energySize = map(movementEnergy, 0, 8, 12, 90);

    noStroke();
    fill(70, 180, 220, 105);
    circle(width/2, height/2, pulseSize + energySize);

    fill(255, 204, 102, 235);
    circle(width/2, height/2, pulseSize * 0.45);

    drawTiltMap();
    drawMeter('Pitch from forward/back tilt', currentFrequency, minFrequency, maxFrequency, height - 150, 'Hz');
    drawMeter('Volume from side tilt', currentVolume, minVolume, maxVolume, height - 90, '');

    fill(255);
    textSize(24);
    text('Motion Synth', width/2, 44);

    fill(210);
    textSize(15);
    text('Forward/back changes pitch. Side tilt changes volume.', width/2, 74);
    text('rotationX: ' + nf(rotationX, 1, 1) + '   rotationY: ' + nf(rotationY, 1, 1) + '   motion: ' + nf(movementEnergy, 1, 2), width/2, 102);
}

function drawTiltMap()
{
    let mapWidth = min(width - 70, 300);
    let mapHeight = min(190, max(135, height * 0.28));
    let x = width/2 - mapWidth/2;
    let y = height/2 - mapHeight/2;

    let dotX = map(constrain(rotationY, -synthTiltRange, synthTiltRange), -synthTiltRange, synthTiltRange, x + 24, x + mapWidth - 24);
    let dotY = map(constrain(rotationX, -synthTiltRange, synthTiltRange), -synthTiltRange, synthTiltRange, y + mapHeight - 24, y + 24);

    noStroke();
    fill(18, 22, 28, 205);
    rect(x, y, mapWidth, mapHeight, 8);

    stroke(255, 255, 255, 70);
    strokeWeight(1);
    line(x + mapWidth/2, y + 28, x + mapWidth/2, y + mapHeight - 28);
    line(x + 28, y + mapHeight/2, x + mapWidth - 28, y + mapHeight/2);

    noStroke();
    fill(225);
    textSize(12);
    text('higher pitch', x + mapWidth/2, y + 16);
    text('lower pitch', x + mapWidth/2, y + mapHeight - 14);
    text('quiet', x + 30, y + mapHeight/2 - 16);
    text('louder', x + mapWidth - 34, y + mapHeight/2 - 16);

    fill(255, 204, 102);
    circle(dotX, dotY, 28);
}

function drawMeter(label, value, low, high, y, unit)
{
    let pitchTilt = 0;
    let volumeTilt = 0;
    let motionDelta = { x: 0, y: 0, z: 0 };
    let tiltMapPosition = { x: 0, y: 0 };
    let meterWidth = min(width - 70, 420);
    let x = width/2 - meterWidth/2;
    let amount = map(value, low, high, 0, 1);
    amount = constrain(amount, 0, 1);

    noStroke();
    fill(255, 255, 255, 45);
    rect(x, y, meterWidth, 18, 8);
        tiltMapPosition.x = map(volumeTilt, -synthTiltRange, synthTiltRange, x + 24, x + mapWidth - 24);
        tiltMapPosition.y = map(pitchTilt, -synthTiltRange, synthTiltRange, y + mapHeight - 24, y + 24);
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
        fill(255, 204, 102);
        circle(tiltMapPosition.x, tiltMapPosition.y, 28);