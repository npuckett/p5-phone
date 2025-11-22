// Speech Recognition example using p5.speech
// Simple continuous speech recognition with p5-phone microphone permission
// Based on p5.speech example: 05continuousrecognition.html

let speechRec;
let recognizedText = "";

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(50);
    
    // Show debug panel for troubleshooting
    showDebug();
    
    // Lock gestures to prevent browser interference
    lockGestures();
    
    // Enable microphone permission with custom function
    enableSpeechRecognition();
}

function draw() {
    background(50);
    
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    
    if (speechRec && window.speechEnabled) {
        text("🎤 Listening...", width/2, 50);
        text(recognizedText || "Say something", width/2, height/2);
    } else {
        text("Tap to enable speech recognition", width/2, height/2);
    }
}

// Handle speech recognition results
function handleSpeech() {
    if (speechRec.resultValue) {
        recognizedText = speechRec.resultString;
        console.log("Recognized:", recognizedText);
    }
}

// Custom function to enable speech recognition
// Based on p5-phone's tap-to-enable pattern
function enableSpeechRecognition() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        cursor: pointer;
    `;
    
    const message = document.createElement('div');
    message.textContent = 'Tap to enable speech recognition';
    message.style.cssText = `
        color: white;
        font-size: 24px;
        font-family: sans-serif;
        text-align: center;
        padding: 40px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
    `;
    
    overlay.appendChild(message);
    
    overlay.addEventListener('click', async () => {
        message.textContent = 'Enabling...';
        
        // Start audio context (required for mobile)
        if (typeof userStartAudio !== 'undefined') {
            await userStartAudio();
        }
        
        // Create speech recognition
        speechRec = new p5.SpeechRec('en-US', handleSpeech);
        speechRec.continuous = true;
        speechRec.interimResults = true;
        speechRec.start();
        
        window.speechEnabled = true;
        document.body.removeChild(overlay);
        console.log('✅ Speech recognition started');
    });
    
    document.body.appendChild(overlay);
}
