// MINIMAL VERSION - Motion Synth
// Demonstrates: generated sound controlled by motion sensors

let oscillator;
let startButton;
let frequency = 220;
let volume = 0;
let pitchTilt = 0;
let volumeTilt = 0;
const synthTiltRange = 30;
const minFrequency = 90;
const maxFrequency = 1200;
const minVolume = 0.02;
const maxVolume = 0.9;

function setup()
{
    createCanvas(windowWidth, windowHeight);
    showDebug();
    lockGestures();

    startButton = createButton('Enable motion sound');
    startButton.id('motion-sound-start');
    startButton.position(20, 20);
    startButton.style('font-size', '18px');
    startButton.style('padding', '14px 18px');

    enableSoundOn('#motion-sound-start');
    enableGyroOn('#motion-sound-start');

    debug('Motion Synth - Minimal Version');
    debug('Tap the button to enable sound and sensors.');
}

function draw()
{
    background(240);

    if (window.soundEnabled && window.sensorsEnabled)
    {
        startButton.hide();
        ensureSynthStarted();
        updateMotionSoundValues();


        oscillator.freq(frequency, 0.04);
        oscillator.amp(volume, 0.04);

        debug('--- Motion Synth ---');
        debug('rotationX: ' + nf(rotationX, 1, 2));
        debug('rotationY: ' + nf(rotationY, 1, 2));
        debug('frequency: ' + int(frequency) + ' Hz');
        debug('volume: ' + int(volume * 100) + '%');
        debug('forward/back tilt changes pitch');
        debug('side tilt changes volume');
    }
    else
    {
        if (oscillator)
        {
            oscillator.amp(0, 0.1);
        }

        debug('Waiting for sound and motion sensors...');
    }
}

function updateMotionSoundValues()
{
    pitchTilt = constrain(rotationX, -synthTiltRange, synthTiltRange);
    volumeTilt = constrain(rotationY, -synthTiltRange, synthTiltRange);
    frequency = map(pitchTilt, -synthTiltRange, synthTiltRange, minFrequency, maxFrequency);
    volume = map(volumeTilt, -synthTiltRange, synthTiltRange, minVolume, maxVolume);
}

function ensureSynthStarted()
{
    if (oscillator)
    {
        return;
    }

    oscillator = new p5.Oscillator('sawtooth');
    oscillator.freq(frequency);
    oscillator.amp(0);
    oscillator.start();
}

function mousePressed()
{
    return false;
}