// Speech Recognition example using p5.speech
// Touch to talk - tap screen, speak, release
// Based on p5.speech example: 04simplerecognition.html

let speechRec;
let recognizedText = "Tap screen and say something";
let isListening = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(50);
    
    // Show debug panel for troubleshooting
    showDebug();
    
    // Lock gestures to prevent browser interference
    lockGestures();
    
    // Enable speech recognition permission
    // This activates the audio context without creating p5.AudioIn
    enableSpeechTap('Tap to enable speech recognition');
}

// This runs after speech permission is granted
function userSetupComplete() {
    // Create speech recognition object
    speechRec = new p5.SpeechRec('en-US');
    speechRec.continuous = false; // One phrase per touch
    speechRec.interimResults = false; // Only final results
    speechRec.onResult = showResult;
    
    // Handle when recognition ends
    speechRec.onEnd = function() {
        isListening = false;
        console.log("Recognition ended");
    };
    
    console.log('✅ Speech recognition ready - tap screen to talk');
}

function draw() {
    // Change background color when listening
    if (isListening) {
        background(100, 200, 100); // Green when listening
    } else {
        background(50);
    }
    
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    
    if (speechRec && window.speechEnabled) {
        if (isListening) {
            text("🎤 Listening...", width/2, 50);
        } else {
            text("👆 Tap to talk", width/2, 50);
        }
        text(recognizedText, 40, height/2, width - 80);
    } else {
        text("Tap to enable speech recognition", width/2, height/2);
    }
}

// Handle speech recognition results
function showResult() {
    if (speechRec.resultValue) {
        recognizedText = speechRec.resultString;
        console.log("Recognized:", recognizedText);
    }
}

// Touch started - start listening
function touchStarted() {
    if (speechRec && window.speechEnabled && !isListening) {
        isListening = true;
        speechRec.start();
        console.log("Started listening...");
    }
    return false; // Prevent default
}

// Touch ended - stop listening  
function touchEnded() {
    if (speechRec && isListening) {
        isListening = false;
        // Don't call stop - just let it process what was said
        console.log("Stopped listening...");
    }
    return false;
}
