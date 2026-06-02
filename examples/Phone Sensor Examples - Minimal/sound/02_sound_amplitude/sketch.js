// MINIMAL VERSION - Sound Amplitude
// No visual feedback - data displayed in debug panel only
// Demonstrates: reading generated audio amplitude levels with p5.Amplitude

let tone;
let amplitude;
let isPlaying = false;
let currentLevel = 0;
let peakLevel = 0;
let threshold = 0.2;

function setup()
{
    createCanvas(windowWidth, windowHeight);

    showDebug();
    enableSoundTap();
    lockGestures();

    debug('Sound Amplitude - Minimal Version');
    debug('Touch and hold to play and analyze audio');
    debug('Amplitude Threshold: ' + threshold);
}

function draw()
{
    if (window.soundEnabled)
    {
        if (amplitude)
        {
            currentLevel = amplitude.getLevel();
        }
        else
        {
            currentLevel = 0;
        }

        if (currentLevel > peakLevel)
        {
            peakLevel = currentLevel;
        }

        debug('--- Audio Amplitude ---');
        debug('Is Playing: ' + isPlaying);
        debug('Current Level: ' + nf(currentLevel, 1, 3));
        debug('Peak Level: ' + nf(peakLevel, 1, 3));
        debug('Percentage: ' + int(currentLevel * 100) + '%');
        debug('STATUS: ' + (currentLevel > threshold ? 'LOUD (Above threshold)' : 'Quiet (Below threshold)'));
        debug('Level: ' + makeLevelBar(currentLevel));
        debug('Touch and hold to play audio');
    }
    else
    {
        debug('Waiting for audio permissions...');
        debug('Touch the screen to enable audio');
    }
}

function ensureToneStarted()
{
    if (tone)
    {
        return;
    }

    tone = new p5.Oscillator(320, 'triangle');
    amplitude = new p5.Amplitude();
    tone.connect(amplitude);
    tone.amp(0);
    tone.start();
}

function mousePressed()
{
    if (window.soundEnabled)
    {
        ensureToneStarted();
        isPlaying = true;
        tone.amp(0.45, 0.06);
        debug('--- Touch: PLAYING ---');
    }

    return false;
}

function mouseReleased()
{
    if (tone)
    {
        tone.amp(0, 0.08);
    }

    isPlaying = false;
    debug('--- Touch: PAUSED ---');

    return false;
}

function makeLevelBar(level)
{
    let barLength = int(constrain(level, 0, 1) * 30);
    let bar = '';

    for (let index = 0; index < barLength; index++)
    {
        bar = bar + '#';
    }

    return bar;
}