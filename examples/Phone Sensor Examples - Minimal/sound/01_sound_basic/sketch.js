// MINIMAL VERSION - Sound Basic
// No visual feedback - data displayed in debug panel only
// Demonstrates: generated audio, touch to play/pause control

let tone;
let isPlaying = false;
let playCount = 0;
let frequency = 260;
let volume = 0.35;

function setup()
{
    createCanvas(windowWidth, windowHeight);

    showDebug();
    enableSoundTap();
    lockGestures();

    debug('Sound Basic - Minimal Version');
    debug('Touch to play/pause generated audio');
    debug('Waiting for audio permissions...');
}

function draw()
{
    if (window.soundEnabled)
    {
        debug('--- Audio Status ---');
        debug('Is Playing: ' + isPlaying);
        debug('Play Count: ' + playCount);
        debug('Frequency: ' + int(frequency) + ' Hz');
        debug('Volume: ' + int(volume * 100) + '%');
        debug('STATUS: ' + (isPlaying ? 'PLAYING' : 'PAUSED'));
        debug('Touch anywhere to toggle play/pause');
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

    tone = new p5.Oscillator(frequency, 'sine');
    tone.amp(0);
    tone.start();
}

function mousePressed()
{
    if (window.soundEnabled)
    {
        ensureToneStarted();

        if (isPlaying)
        {
            tone.amp(0, 0.08);
            isPlaying = false;
            debug('--- Touch: PAUSED ---');
        }
        else
        {
            tone.amp(volume, 0.08);
            isPlaying = true;
            playCount = playCount + 1;
            debug('--- Touch: PLAYING ---');
        }
    }

    return false;
}

function mouseReleased()
{
    return false;
}