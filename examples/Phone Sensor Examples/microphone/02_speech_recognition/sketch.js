// Speech Recognition example using p5.speech and p5-phone
// Demonstrates voice-to-text recognition on mobile devices
// Shows recognized speech with visual feedback and confidence levels

// Global variables
let speechRec; // p5.SpeechRec object for speech recognition
let mic; // p5.AudioIn object for microphone (required for p5-phone activation)
let currentText = ""; // Currently recognized speech
let previousTexts = []; // Array to store previous recognized phrases
let maxPreviousTexts = 5; // Maximum number of previous phrases to display
let isListening = false; // Flag to track if recognition is active
let confidence = 0; // Confidence level of recognition (0.0 - 1.0)
let backgroundColor;
let listeningColor;
let notListeningColor;

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Show debug panel immediately to catch any errors
    showDebug();
    
    // Set up colors
    notListeningColor = color(50, 50, 70); // Dark blue-gray when not listening
    listeningColor = color(100, 50, 100); // Purple when listening
    backgroundColor = notListeningColor;
    
    // Create microphone input (required for p5-phone activation)
    mic = new p5.AudioIn();
    
    textAlign(CENTER, CENTER);
    
    // Lock gestures to prevent browser interference
    lockGestures();
    
    debug('Setup complete - waiting for microphone permission');
    
    // Request permission for microphone on mobile devices
    // This is crucial for p5.SpeechRec to work on iOS and Android
    enableMicTap('Tap to enable microphone for speech recognition');
}

// This function runs after microphone permission is granted
function userSetupComplete() {
    debug('✅ Microphone enabled - initializing speech recognition');
    debug('User Agent:', navigator.userAgent);
    debug('Language:', navigator.language);
    debug('Protocol:', window.location.protocol);
    debug('Host:', window.location.host);
    
    // Check if HTTPS (required for speech recognition on mobile)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        debugError('❌ Speech Recognition requires HTTPS on mobile devices');
        debugError('Current protocol:', window.location.protocol);
        return;
    }
    
    // Check if SpeechRecognition is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        debugError('❌ Speech Recognition API not supported on this browser');
        debugError('This may be an iOS device - Safari does not support Web Speech API');
        debugError('Try using Chrome on Android or Chrome/Edge on desktop');
        return;
    }
    
    debug('✅ Speech Recognition API available');
    
    // Initialize speech recognition AFTER microphone permission is granted
    try {
        // Try using device's default language first, fallback to en-US
        const deviceLang = navigator.language || 'en-US';
        debug('Creating SpeechRec with language:', deviceLang);
        speechRec = new p5.SpeechRec(deviceLang);
        debug('✅ p5.SpeechRec created');
    } catch (e) {
        debugError('❌ Error creating p5.SpeechRec:', e.message);
        debugError('Stack:', e.stack);
        return;
    }
    
    // Configure speech recognition
    speechRec.continuous = false; // Get one phrase at a time (better for privacy)
    speechRec.interimResults = true; // Show interim results for better feedback
    
    debug('Speech recognition configured:', {
        continuous: speechRec.continuous,
        interimResults: speechRec.interimResults,
        lang: speechRec.rec ? speechRec.rec.lang : 'unknown'
    });
    
    // Log the underlying recognition object
    if (speechRec.rec) {
        debug('Native recognition object exists');
        debug('Native rec.lang:', speechRec.rec.lang);
        debug('Native rec.continuous:', speechRec.rec.continuous);
        debug('Native rec.interimResults:', speechRec.rec.interimResults);
    }
    
    // Set up callback for when speech is recognized
    speechRec.onResult = handleSpeechResult;
    
    // Set up callback for when recognition starts
    speechRec.onStart = function() {
        debug('🎤 Speech recognition STARTED');
        debug('Listening for speech in language:', speechRec.rec ? speechRec.rec.lang : 'unknown');
        isListening = true;
        backgroundColor = listeningColor;
    };
    
    // Set up callback for when recognition ends
    speechRec.onEnd = function() {
        debug('⏸️ Speech recognition ENDED');
        isListening = false;
        backgroundColor = notListeningColor;
        
        // Automatically restart listening after a brief pause
        // Only restart if not already listening
        setTimeout(() => {
            if (window.micEnabled && !isListening) {
                try {
                    debug('🔄 Attempting to restart recognition...');
                    speechRec.start(false, true); // Pass params on restart too
                } catch (e) {
                    debugWarn('Could not restart recognition:', e.message);
                }
            }
        }, 1000); // Increased delay to ensure previous session is fully ended
    };
    
    // Set up error callback
    speechRec.onError = function(error) {
        debugError('❌ Speech recognition error:', error.error || 'unknown');
        debugError('Error details:', JSON.stringify({
            error: error.error,
            message: error.message,
            type: error.type
        }));
        
        // Specific error messages for common issues
        if (error.error === 'not-allowed') {
            debugError('🚫 Microphone permission was denied or HTTPS not used');
        } else if (error.error === 'network') {
            debugError('🌐 Network error - check internet connection');
        } else if (error.error === 'audio-capture') {
            debugError('🎤 No microphone found or it\'s being used by another app');
        }
        
        isListening = false;
        backgroundColor = notListeningColor;
        
        // Don't auto-restart on certain errors
        if (error.error === 'no-speech' || error.error === 'aborted') {
            debug('⚠️ No speech detected, will restart...');
            // Restart after no-speech timeout
            setTimeout(() => {
                if (window.micEnabled && !isListening) {
                    try {
                        speechRec.start(false, true); // Pass params on error restart
                    } catch (e) {
                        debugWarn('Could not restart after error:', e.message);
                    }
                }
            }, 1000);
        } else if (error.error === 'not-allowed' || error.error === 'service-not-allowed') {
            debugError('❌ Cannot auto-restart - permission or service issue');
        }
    };
    
    // Start listening
    try {
        debug('🎤 Starting initial speech recognition...');
        // IMPORTANT: Pass continuous and interimResults as parameters to start()
        // instead of setting them as properties - this is how p5.speech expects them
        speechRec.start(false, true); // (continuous=false, interimResults=true)
        debug('Start command executed with params: continuous=false, interimResults=true');
    } catch (e) {
        debugError('❌ Error starting speech recognition:', e.message);
        debugError('Stack:', e.stack);
    }
}

// Callback function when speech is recognized
function handleSpeechResult() {
    debug('📝 Result callback triggered');
    debug('resultValue:', speechRec.resultValue);
    debug('resultString:', speechRec.resultString);
    debug('resultConfidence:', speechRec.resultConfidence);
    
    // Log the full result JSON for debugging
    if (speechRec.resultJSON) {
        debug('Full result JSON:', JSON.stringify(speechRec.resultJSON));
    }
    
    if (speechRec.resultValue) {
        // Get the recognized text
        currentText = speechRec.resultString;
        confidence = speechRec.resultConfidence;
        
        debug('✅ Recognized:', currentText, 'Confidence:', confidence);
        
        // Add to previous texts array
        if (currentText.length > 0) {
            previousTexts.unshift(currentText); // Add to beginning of array
            
            // Keep only the most recent phrases
            if (previousTexts.length > maxPreviousTexts) {
                previousTexts.pop(); // Remove oldest phrase
            }
        }
    } else {
        debugWarn('⚠️ Result callback fired but resultValue is false');
    }
}

function draw() {
    background(backgroundColor);
    
    // Check if microphone is available and speech recognition is initialized
    if (window.micEnabled && speechRec) {
        
        // Display listening status
        fill(255);
        textSize(20);
        if (isListening) {
            text("🎤 LISTENING...", width/2, 60);
        } else {
            text("⏸️ Paused", width/2, 60);
        }
        
        // Display current recognized text (large and prominent)
        if (currentText.length > 0) {
            fill(255, 255, 100); // Yellow for current text
            textSize(32);
            textAlign(CENTER, TOP);
            text('"' + currentText + '"', 30, height/3, width - 60, 200);
            textAlign(CENTER, CENTER);
            
            // Display confidence level
            fill(150, 200, 255);
            textSize(16);
            text("Confidence: " + nf(confidence * 100, 0, 1) + "%", width/2, height/3 + 120);
            
            // Visual confidence bar
            let barWidth = map(confidence, 0, 1, 0, width - 100);
            fill(100, 200, 255);
            noStroke();
            rect((width - barWidth) / 2, height/3 + 140, barWidth, 10);
        } else {
            fill(200);
            textSize(24);
            text("Start speaking...", width/2, height/3);
        }
        
        // Display previous recognized phrases
        if (previousTexts.length > 0) {
            fill(150);
            textSize(14);
            text("Previous phrases:", width/2, height/2 + 80);
            
            fill(180);
            textSize(12);
            textAlign(CENTER, TOP);
            let yPos = height/2 + 110;
            for (let i = 0; i < previousTexts.length; i++) {
                let alpha = map(i, 0, previousTexts.length, 255, 80);
                fill(180, alpha);
                text((i + 1) + ". " + previousTexts[i], 40, yPos, width - 80, 25);
                yPos += 35;
            }
            textAlign(CENTER, CENTER);
        }
        
        // Instructions
        fill(255);
        textSize(14);
        text("Speak clearly into your device microphone", width/2, height - 80);
        text("Recognition will automatically restart after each phrase", width/2, height - 55);
        text("Works best in a quiet environment", width/2, height - 30);
        
    } else if (!window.micEnabled) {
        // Microphone not available or permission not granted
        fill(255, 100, 100);
        textSize(18);
        text("Microphone not available", width/2, height/2);
        textSize(14);
        text("Tap screen to request microphone permission", width/2, height/2 + 40);
        text("Speech recognition requires microphone access", width/2, height/2 + 70);
        
    } else {
        // Waiting for speech recognition to initialize
        fill(255, 200, 100);
        textSize(18);
        text("Initializing speech recognition...", width/2, height/2);
    }
}

// Allow manual restart of recognition by tapping
function touchStarted() {
    debug('👆 Touch detected');
    if (window.micEnabled && speechRec && !isListening) {
        try {
            debug('🎤 Manual restart of recognition');
            speechRec.start(false, true); // Pass params on manual restart
        } catch (e) {
            debugWarn('Could not start recognition:', e.message);
        }
    } else {
        debug('Cannot restart - micEnabled:', window.micEnabled, 'speechRec:', !!speechRec, 'isListening:', isListening);
    }
    return false; // Prevent default
}
