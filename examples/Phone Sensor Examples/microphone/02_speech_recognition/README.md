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

1. **p5-phone** handles microphone permission via `enableMicTap()`
2. Once permission is granted, `userSetupComplete()` initializes p5.SpeechRec
3. Speech recognition starts and listens for phrases
4. Recognized text is displayed on screen with confidence levels
5. Recognition automatically restarts after each phrase

## Common Issues

### "No speech detected" repeatedly
- Check that you're speaking clearly and loudly enough
- Ensure you're in a quiet environment
- Verify your device microphone is working (test with voice memos app)

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
