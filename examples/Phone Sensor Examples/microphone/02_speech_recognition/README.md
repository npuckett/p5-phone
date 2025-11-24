# Speech Recognition Example

This example demonstrates voice-to-text speech recognition using p5.js-speech library integrated with p5-phone for mobile microphone access.

## Requirements

### HTTPS Required
Speech recognition requires a secure HTTPS connection on mobile devices. This will NOT work on:
- HTTP connections (except localhost)
- File:// protocol

### Browser Compatibility

**✅ Supported:**
- Chrome on Android (recommended)
- Safari on iOS (recommended for iOS)
- Chrome on Desktop
- Edge on Desktop
- Safari on Desktop

**❌ NOT Supported:**
- Firefox (as of 2025, limited support)

### Mobile Testing
To test on mobile:
1. Deploy to a server with HTTPS (GitHub Pages, Netlify, etc.)
2. Or use a tool like `ngrok` to create an HTTPS tunnel to your localhost
3. Use Chrome on Android or Safari on iOS for best results

## How It Works

### Cloud-Based Speech Recognition

The p5.speech library is built on top of the **Web Speech API**, which is a **cloud-based service**:

1. **Microphone captures audio** on your device (handled by p5-phone's `enableSpeechTap()`)
2. **Audio is sent to Google's servers** (Chrome/Edge) or Apple's servers (Safari) via the Web Speech Recognition API
3. **Google's servers process the audio** using machine learning models
4. **Transcribed text is sent back** to your browser
5. **Your sketch displays the results**

**IMPORTANT:** Because speech recognition happens on remote servers, you **MUST have an active internet connection** for this to work. If you get "no match" errors, check your internet connection first.

### Recognition Flow

1. **p5-phone** handles microphone permission via `enableMicTap()`
2. Once permission is granted, `userSetupComplete()` initializes p5.SpeechRec
3. Speech recognition starts and listens for phrases
4. Audio is sent to cloud for processing
5. Recognized text is displayed on screen with confidence levels
6. Recognition automatically restarts after each phrase

## Common Issues

### Desktop Works, Mobile Doesn't - Why?

**CRITICAL ISSUE SOLVED:** Microphone hardware conflict resolved!

**The Solution:**
- Use p5-phone's `enableSpeechTap()` method instead of `enableMicTap()`
- This activates the audio context **without creating p5.AudioIn**
- Prevents microphone hardware conflict on mobile devices
- Works reliably on both Android Chrome and iOS Safari

**Code pattern:**
```javascript
// In setup()
enableSpeechTap('Tap to enable speech recognition');

// In userSetupComplete()
speechRec = new p5.SpeechRec(); // Now this can access the mic
speechRec.continuous = false; // One phrase per touch
speechRec.interimResults = false; // Only final results
speechRec.onResult = showResult;

// Touch-to-talk pattern
function touchStarted() {
    if (speechRec && window.speechEnabled) {
        speechRec.start();
    }
}
```

**Why the old approach failed:**
- Desktop allows multiple audio streams (mic.getLevel() AND speech recognition work together)
- Mobile enforces exclusive microphone access (only ONE can work at a time)
- `p5.AudioIn` locks the microphone on mobile, preventing Web Speech API access
- No error is thrown - speech API just silently fails to get audio

### Previous "No match found for speech" debugging
This is the most common error. It means the Web Speech API heard you speaking but couldn't transcribe it.

**Common causes:**
1. **Poor internet connection** - Audio couldn't be sent to Google's servers or response was delayed
2. **Background noise** - Other sounds interfering with your voice
3. **Speaking too quietly/quickly** - The API needs clear, distinct speech
4. **Language mismatch** - Currently set to `en-US`. Speak in English for best results.

**Solutions:**
- Check you have a stable internet connection
- Move to a quieter environment
- Speak more clearly and at a moderate pace

### "No speech detected" repeatedly
- Check that you're speaking clearly and loudly enough
- Ensure you're in a quiet environment
- Verify your device microphone is working (test with voice memos app)
- **Check internet connection** - without it, recognition cannot work

### "Not allowed" error
- You may have denied microphone permission
- Reload the page and allow microphone access
- Check that you're using HTTPS (not HTTP)

## Configuration

You can adjust these settings in the code:

```javascript
speechRec.continuous = false;      // false = one phrase at a time
speechRec.interimResults = true;   // true = show partial results
const deviceLang = 'en-US';        // Change language (en-US, es-ES, etc.)
```

## Privacy Note

This example uses `continuous: false` mode, which means:
- Recognition stops after each phrase
- More privacy-conscious than continuous listening
- Auto-restarts after 1 second pause
- User maintains control over when mic is active
