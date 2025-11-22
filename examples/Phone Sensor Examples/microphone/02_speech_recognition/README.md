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
- Chrome on Desktop
- Edge on Desktop
- Safari on Desktop (limited support)

**❌ NOT Supported:**
- **iOS Safari** - Apple's Safari on iOS does not support the Web Speech API
- **iOS Chrome** - Uses Safari's engine on iOS, so also not supported
- Firefox (as of 2025, limited support)

### Mobile Testing
To test on mobile:
1. Deploy to a server with HTTPS (GitHub Pages, Netlify, etc.)
2. Or use a tool like `ngrok` to create an HTTPS tunnel to your localhost
3. Make sure you're using Chrome on Android (not iOS)

## How It Works

### Cloud-Based Speech Recognition

The p5.speech library is built on top of the **Web Speech API**, which is a **cloud-based service**:

1. **Microphone captures audio** on your device (handled by p5-phone's `enableMicTap()`)
2. **Audio is sent to Google's servers** via the Web Speech Recognition API
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

**CRITICAL ISSUE IDENTIFIED:** Microphone hardware conflict!

**The Real Problem:**
- On mobile, only **ONE application can access the microphone at a time**
- `p5.AudioIn` (from p5.sound) and Web Speech API **both try to access the same mic**
- Desktop Chrome is more forgiving and allows both
- Mobile Chrome enforces strict exclusive access

**The Solution:**
- Create a `p5.AudioIn` object but **never call mic.start()**
- Use `enableMicTap()` to get permission, then **immediately stop the mic**
- This frees the hardware for Web Speech API to use

**Code pattern:**
```javascript
// In setup()
mic = new p5.AudioIn(); // Create but don't start
enableMicTap(); // Get permission

// In userSetupComplete()
if (mic && mic.enabled) {
    mic.stop(); // Free the microphone!
}
speechRec = new p5.SpeechRec(); // Now this can access the mic
```

**Why this wasn't obvious:**
- Desktop allows multiple streams (mic.getLevel() AND speech recognition work together)
- Mobile enforces exclusive access (only ONE can work at a time)
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
- Check the microphone level indicator - it should move when you speak

### "No speech detected" repeatedly
- Check that you're speaking clearly and loudly enough
- Ensure you're in a quiet environment
- Verify your device microphone is working (test with voice memos app)
- **Check internet connection** - without it, recognition cannot work

### Nothing happens on iOS
- iOS Safari does not support Web Speech API
- Try using an Android device with Chrome instead

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
