/*!
 * p5-phone v1.9.2
 * Simplified mobile hardware access for p5.js - handle sensors, microphone, touch, and browser gestures with ease
 * https://github.com/npuckett/p5-phone
 * 
 * Copyright (c) 2025 Nick Puckett
 * Released under the MIT License
 * https://opensource.org/licenses/MIT
 */

// ============================================= 
// P5-PHONE - Mobile Hardware Access for p5.js
// Clean API for enabling permissions in p5.js sketches
// =============================================

// Set up global error handling immediately when script loads
(function() {
  // Store original console methods before any overrides
  window._originalConsoleError = console.error;
  window._originalConsoleWarn = console.warn;
  
  // Only set up once
  if (window._debugErrorHandlersSet) return;
  window._debugErrorHandlersSet = true;
  
  // Initialize early error storage
  window._earlyErrors = window._earlyErrors || [];
  
  // Global error handler for JavaScript errors
  window.addEventListener('error', function(event) {
    const errorMsg = event.error?.message || event.message || 'Unknown error';
    const fileName = event.filename ? event.filename.split('/').pop() : 'unknown file';
    const line = event.lineno || 'unknown line';
    
    const fullError = `${errorMsg} (${fileName}:${line})`;
    
    console.error('🚨 Error caught:', fullError);
    if (event.error?.stack) {
      console.error('Stack:', event.error.stack);
    }
    
    // Store error for debug panel
    window._earlyErrors.push({
      type: 'error',
      message: 'JavaScript Error: ' + fullError,
      stack: event.error?.stack
    });
    
    // Auto-show debug panel when an error occurs (if SHOW_DEBUG is true)
    if (window.SHOW_DEBUG !== false && !window._debugVisible) {
      // Try to show debug panel automatically
      if (typeof showDebug === 'function') {
        showDebug();
      }
    }
    
    // If debug panel is already visible, show immediately
    if (window._debugVisible && typeof debugError === 'function') {
      debugError('JavaScript Error:', fullError);
      if (event.error?.stack) {
        debugError('Stack trace:', event.error.stack);
      }
    }
  });
  
  // Global handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const errorMsg = event.reason?.message || event.reason || 'Unknown promise rejection';
    
    console.error('🚨 Promise rejection caught:', errorMsg);
    
    window._earlyErrors.push({
      type: 'error',
      message: 'Unhandled Promise Rejection: ' + errorMsg
    });
    
    if (window._debugVisible && typeof debugError === 'function') {
      debugError('Unhandled Promise Rejection:', errorMsg);
    }
  });
})();

// Global state flags
window.sensorsEnabled = false;
window.micEnabled = false;
window.soundEnabled = false;
window.gesturesLocked = false;
window.vibrationEnabled = false;
window.speechEnabled = false;
window.nfcEnabled = false;
window.nfcError = '';
window.nfcStatus = 'idle';
window.nfcTagAliases = {};
window.lastNfcMessage = null;
window.lastNfcSerialNumber = null;
window.lastNfcAlias = '';

// Internal state
let _micInstance = null;
let _nfcReader = null;
let _nfcAbortController = null;

// p5.js version detection (1.x vs 2.x)
const _p5MajorVersion = (typeof p5 !== 'undefined' && p5.VERSION)
  ? parseInt(p5.VERSION.split('.')[0], 10)
  : 1; // Default to 1 if p5 not loaded yet
const _isP5v2 = _p5MajorVersion >= 2;

// =========================================
// PUBLIC API - CALL THESE FROM YOUR P5 SKETCH
// =========================================

/**
 * Lock mobile gestures to prevent browser interference
 * Call this in your setup() function
 */
function lockGestures() {
  if (window.gesturesLocked) return;
  
  console.log('🔒 Locking mobile gestures...');
  _initializeGestureBlocking();
  _initializeP5TouchOverrides();
  window.gesturesLocked = true;
  console.log('✅ Mobile gestures locked');
}

/**
 * Enable gyroscope with a button interface
 * Creates a start button that user must click
 */
function enableGyroButton(buttonText = 'ENABLE MOTION SENSORS', statusText = 'Requesting motion sensors...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via button');
  });
}

/**
 * Enable gyroscope with tap-to-start
 * User taps anywhere on screen to enable
 */
function enableGyroTap(message = 'Tap screen to enable motion sensors') {
  _createTapToEnable(message, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via tap');
  });
}

/**
 * Enable microphone with a button interface
 * Creates a start button that user must click
 */
function enableMicButton(buttonText = 'ENABLE MICROPHONE', statusText = 'Requesting microphone access...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via button');
  });
}

/**
 * Enable microphone with tap-to-start
 * User taps anywhere on screen to enable
 */
function enableMicTap(message = 'Tap screen to enable microphone') {
  _createTapToEnable(message, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via tap');
  });
}

/**
 * Enable sound output with a button interface
 * Creates a start button that user must click
 * Use this for playing sounds without needing microphone input
 */
function enableSoundButton(buttonText = 'ENABLE SOUND', statusText = 'Enabling audio...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via button');
  });
}

/**
 * Enable sound output with tap-to-start
 * User taps anywhere on screen to enable
 * Use this for playing sounds without needing microphone input
 */
function enableSoundTap(message = 'Tap screen to enable sound') {
  _createTapToEnable(message, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via tap');
  });
}

/**
 * Enable speech recognition with tap-to-start
 * User taps anywhere on screen to enable
 * IMPORTANT: This does NOT create a p5.AudioIn object
 * Only activates audio context for Web Speech API
 * You must create your own p5.SpeechRec object after this
 */
function enableSpeechTap(message = 'Tap to enable speech recognition') {
  _createTapToEnable(message, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via tap');
  });
}

/**
 * Enable speech recognition with a button interface
 * Creates a start button that user must click
 * IMPORTANT: This does NOT create a p5.AudioIn object
 * Only activates audio context for Web Speech API
 * You must create your own p5.SpeechRec object after this
 */
function enableSpeechButton(buttonText = 'ENABLE SPEECH RECOGNITION', statusText = 'Enabling speech recognition...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via button');
  });
}

/**
 * Enable vibration motor with a button interface
 * Creates a start button that user must click
 * Note: Vibration API is supported on Android, but not iOS
 */
function enableVibrationButton(buttonText = 'ENABLE VIBRATION', statusText = 'Enabling vibration...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via button');
  });
}

/**
 * Enable vibration motor with tap-to-start
 * User taps anywhere on screen to enable
 * Note: Vibration API is supported on Android, but not iOS
 */
function enableVibrationTap(message = 'Tap screen to enable vibration') {
  _createTapToEnable(message, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via tap');
  });
}

/**
 * Enable NFC tag reading with a button interface
 * Creates a start button that user must click
 * Note: Web NFC is supported on Android Chrome 89+ only, not iOS
 */
function enableNfcButton(buttonText = 'ENABLE NFC', statusText = 'Enabling NFC...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via button');
  });
}

/**
 * Enable NFC tag reading with tap-to-start
 * User taps anywhere on screen to enable
 * Note: Web NFC is supported on Android Chrome 89+ only, not iOS
 */
function enableNfcTap(message = 'Tap screen to enable NFC') {
  _createTapToEnable(message, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via tap');
  });
}

/**
 * Enable both motion sensors and microphone with a button interface
 * Creates a start button that user must click to enable both
 */
function enableAllButton(buttonText = 'ENABLE MOTION & MICROPHONE', statusText = 'Requesting permissions...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via button');
  });
}

/**
 * Enable both motion sensors and microphone with tap-to-start
 * User taps anywhere on screen to enable both
 */
function enableAllTap(message = 'Tap screen to enable motion sensors & microphone') {
  _createTapToEnable(message, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via tap');
  });
}

// =========================================
// CANVAS-FIRST-TOUCH — enableXxxCanvas()
// Permissions fire on the user's first touch/click on the p5 canvas.
// No overlay or button. Closest thing to "automatic".
// =========================================

/**
 * Enable gyroscope on first canvas touch
 * @param {string|null} message - Optional hint text shown on canvas
 */
function enableGyroCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via canvas touch');
  });
}

/**
 * Enable microphone on first canvas touch
 */
function enableMicCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via canvas touch');
  });
}

/**
 * Enable sound output on first canvas touch
 */
function enableSoundCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via canvas touch');
  });
}

/**
 * Enable speech recognition on first canvas touch
 */
function enableSpeechCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via canvas touch');
  });
}

/**
 * Enable vibration on first canvas touch
 */
function enableVibrationCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via canvas touch');
  });
}

/**
 * Enable NFC on first canvas touch
 */
function enableNfcCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via canvas touch');
  });
}

/**
 * Enable both motion sensors and microphone on first canvas touch
 */
function enableAllCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via canvas touch');
  });
}

/**
 * Enable camera on first canvas touch
 */
function enableCameraCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via canvas touch');
  });
}

// =========================================
// BANNER UI — enableXxxBanner()
// A slim notification bar at the top or bottom of the screen.
// =========================================

/**
 * Enable gyroscope with a banner notification
 * @param {string} message - Banner text
 * @param {string} position - 'top' or 'bottom' (default: 'top')
 */
function enableGyroBanner(message = 'Tap to enable motion sensors', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via banner');
  });
}

function enableMicBanner(message = 'Tap to enable microphone', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via banner');
  });
}

function enableSoundBanner(message = 'Tap to enable sound', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via banner');
  });
}

function enableSpeechBanner(message = 'Tap to enable speech recognition', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via banner');
  });
}

function enableVibrationBanner(message = 'Tap to enable vibration', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via banner');
  });
}

function enableNfcBanner(message = 'Tap to enable NFC', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via banner');
  });
}

function enableAllBanner(message = 'Tap to enable sensors & microphone', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via banner');
  });
}

function enableCameraBanner(message = 'Tap to enable camera', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via banner');
  });
}

// =========================================
// CUSTOM ELEMENT BINDING — enableXxxOn()
// Attach permission trigger to any existing DOM element.
// =========================================

/**
 * Enable gyroscope when a custom DOM element is clicked/tapped
 * @param {string} selector - CSS selector (e.g., '#my-button', '.start-btn')
 */
function enableGyroOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via custom element');
  });
}

function enableMicOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via custom element');
  });
}

function enableSoundOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via custom element');
  });
}

function enableSpeechOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via custom element');
  });
}

function enableVibrationOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via custom element');
  });
}

function enableNfcOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via custom element');
  });
}

function enableAllOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via custom element');
  });
}

function enableCameraOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via custom element');
  });
}

/**
 * Trigger vibration on device
 * @param {number|number[]} pattern - Duration in ms or pattern array [vibrate, pause, vibrate, ...]
 * 
 * Examples:
 *   vibrate(200);              // Single 200ms vibration
 *   vibrate([100, 50, 100]);   // Pattern: vibrate 100ms, pause 50ms, vibrate 100ms
 * 
 * Note: Only works if vibrationEnabled is true and device supports vibration
 */
function vibrate(pattern) {
  if (!window.vibrationEnabled) {
    console.warn('⚠️ Vibration not enabled. Call enableVibrationTap() or enableVibrationButton() first.');
    return false;
  }
  
  if (!navigator.vibrate) {
    console.warn('⚠️ Vibration API not supported on this device');
    return false;
  }
  
  return navigator.vibrate(pattern);
}

/**
 * Stop any ongoing vibration
 */
function stopVibration() {
  if (navigator.vibrate) {
    navigator.vibrate(0);
  }
}

/**
 * Stop NFC scanning
 */
function stopNfc() {
  if (_nfcAbortController) {
    _nfcAbortController.abort();
    _nfcAbortController = null;
  }
  _nfcReader = null;
  window.nfcEnabled = false;
  window.nfcStatus = 'stopped';
  console.log('NFC scanning stopped');
}

function _normalizeNfcText(value) {
  return value == null ? '' : String(value).trim();
}

function _normalizeNfcTagId(serialNumber) {
  return _normalizeNfcText(serialNumber).toLowerCase();
}

function _nfcTextMatches(firstValue, secondValue) {
  const firstText = _normalizeNfcText(firstValue).toLowerCase();
  const secondText = _normalizeNfcText(secondValue).toLowerCase();
  return firstText !== '' && firstText === secondText;
}

/**
 * Give an NFC tag a human-friendly alias.
 * Pass an empty alias to remove the stored name for a tag.
 */
function setNfcTagAlias(serialNumber, alias) {
  const tagId = _normalizeNfcTagId(serialNumber);
  const tagAlias = _normalizeNfcText(alias);

  if (!tagId) {
    console.warn('p5-phone: setNfcTagAlias() needs an NFC serial number');
    return '';
  }

  if (!tagAlias) {
    delete window.nfcTagAliases[tagId];
  } else {
    window.nfcTagAliases[tagId] = tagAlias;
  }

  if (_normalizeNfcTagId(window.lastNfcSerialNumber) === tagId) {
    window.lastNfcAlias = tagAlias;
    if (window.lastNfcMessage) {
      window.lastNfcMessage.alias = tagAlias;
    }
  }

  return tagAlias;
}

/**
 * Get the human-friendly alias for an NFC tag serial number.
 */
function getNfcTagAlias(serialNumber = window.lastNfcSerialNumber) {
  const tagId = _normalizeNfcTagId(serialNumber);
  return tagId ? (window.nfcTagAliases[tagId] || '') : '';
}

/**
 * Check whether the most recently read NFC tag matches an alias or serial number.
 * Optionally pass a serial number from nfcRead(message, serialNumber) as the second argument.
 */
function isNfcTag(aliasOrSerialNumber, serialNumber = window.lastNfcSerialNumber) {
  const tagId = _normalizeNfcTagId(serialNumber);
  const targetText = _normalizeNfcText(aliasOrSerialNumber);

  if (!tagId || !targetText) {
    return false;
  }

  if (tagId === _normalizeNfcTagId(targetText)) {
    return true;
  }

  return _nfcTextMatches(getNfcTagAlias(serialNumber), targetText);
}

// =========================================
// INTERNAL PERMISSION HANDLERS
// =========================================

// Core permission logic (without notification) — used by combo functions
async function _requestMotionPermissionsCore() {
  try {
    // Request motion sensor permissions (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      
      const orientationPermission = await DeviceOrientationEvent.requestPermission();
      console.log('Orientation permission:', orientationPermission);
      
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        const motionPermission = await DeviceMotionEvent.requestPermission();
        console.log('Motion permission:', motionPermission);
      }
    }
    
    window.sensorsEnabled = true;
    
  } catch (error) {
    console.error('Motion sensor permission error:', error);
    if (_debugVisible) {
      debugError('Motion sensor permission error:', error);
    }
    // Enable anyway for non-iOS devices (Android doesn't require requestPermission)
    window.sensorsEnabled = true;
  }
}

async function _requestMicrophonePermissionsCore() {
  try {
    // Start audio context for p5.sound
    if (typeof userStartAudio !== 'undefined') {
      await userStartAudio();
    }
    
    // If there's a global mic object, start it
    if (typeof mic !== 'undefined' && mic && mic.start) {
      mic.start();
      _micInstance = mic;
      window.micEnabled = true;
    } else {
      console.warn('No microphone object found. Create one with: mic = new p5.AudioIn();');
    }
    
  } catch (error) {
    console.error('Microphone permission error:', error);
    if (_debugVisible) {
      debugError('Microphone permission error:', error);
    }
  }
}

async function _requestSoundOutputCore() {
  try {
    // Start audio context for p5.sound (enables sound playback)
    if (typeof userStartAudio !== 'undefined') {
      await userStartAudio();
    }
    
    window.soundEnabled = true;
    
  } catch (error) {
    console.error('Sound output error:', error);
    if (_debugVisible) {
      debugError('Sound output error:', error);
    }
    window.soundEnabled = true; // Enable anyway since no permission needed
  }
}

async function _requestSpeechPermissionCore() {
  try {
    // Start audio context for Web Speech API
    // DO NOT create or start p5.AudioIn - this would conflict with speech recognition
    if (typeof userStartAudio !== 'undefined') {
      await userStartAudio();
    }
    
    window.speechEnabled = true;
    
  } catch (error) {
    console.error('Speech permission error:', error);
    if (_debugVisible) {
      debugError('Speech permission error:', error);
    }
  }
}

async function _requestVibrationPermissionCore() {
  try {
    // Check if Vibration API is supported
    if (!navigator.vibrate) {
      console.warn('⚠️ Vibration API not supported on this device (likely iOS)');
      if (_debugVisible) {
        debugWarn('Vibration API not supported on this device');
      }
      window.vibrationEnabled = false;
      return;
    }
    
    // Test vibration with a short pulse
    const vibrateSuccess = navigator.vibrate(1);
    
    if (vibrateSuccess) {
      window.vibrationEnabled = true;
      console.log('✅ Vibration enabled');
    } else {
      console.warn('⚠️ Vibration API available but vibration failed');
      window.vibrationEnabled = false;
    }
    
  } catch (error) {
    console.error('Vibration permission error:', error);
    if (_debugVisible) {
      debugError('Vibration permission error:', error);
    }
    window.vibrationEnabled = false;
  }
}

async function _requestNfcPermissionCore() {
  try {
    if (window.nfcEnabled && _nfcReader) {
      return true;
    }

    window.nfcError = '';
    window.nfcStatus = 'starting';

    // Check if Web NFC API is supported
    if (!('NDEFReader' in window)) {
      console.warn('⚠️ Web NFC API not supported on this device/browser (Android Chrome 89+ required)');
      if (_debugVisible) {
        debugWarn('Web NFC not supported on this device/browser');
      }
      window.nfcEnabled = false;
      window.nfcStatus = 'unsupported';
      window.nfcError = window.isSecureContext === false
        ? 'NFC requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.'
        : 'Web NFC is not supported in this browser. Use Android Chrome 89+ over HTTPS.';
      return false;
    }

    window.nfcStatus = 'requesting-permission';
    _nfcAbortController = new AbortController();
    _nfcReader = new NDEFReader();

    _nfcReader.onreading = (event) => {
      const serialNumber = event.serialNumber || '';
      const decoder = new TextDecoder();
      const records = [];

      for (const record of event.message.records) {
        const entry = {
          recordType: record.recordType,
          mediaType: record.mediaType || null,
          id: record.id || null,
          data: null,
          raw: record.data
        };

        if (record.recordType === 'text' || record.recordType === 'url') {
          entry.data = decoder.decode(record.data);
        } else if (record.recordType === 'mime' && record.mediaType) {
          try {
            const text = decoder.decode(record.data);
            if (record.mediaType.includes('json')) {
              entry.data = JSON.parse(text);
            } else {
              entry.data = text;
            }
          } catch (e) {
            entry.data = record.data;
          }
        } else {
          entry.data = record.data;
        }

        records.push(entry);
      }

      const alias = getNfcTagAlias(serialNumber);
      const message = { serialNumber: serialNumber, alias: alias, records: records };
      window.lastNfcMessage = message;
      window.lastNfcSerialNumber = serialNumber;
      window.lastNfcAlias = alias;
      window.nfcStatus = 'tag-read';
      window.nfcError = '';

      // Call user-defined callback if it exists
      if (typeof nfcRead === 'function') {
        nfcRead(message, serialNumber);
      }

      console.log('NFC tag read — serial:', serialNumber, 'records:', records.length);
      if (_debugVisible) {
        debug('NFC tag read: ' + serialNumber);
      }
    };

    _nfcReader.onreadingerror = (event) => {
      console.warn('⚠️ NFC read error — tag may be incompatible or out of range');
      window.nfcError = 'NFC read error. Make sure the tag is NDEF formatted and hold it near the phone NFC antenna.';
      if (_debugVisible) {
        debugWarn('NFC read error — tag incompatible or out of range');
      }
    };

    await _nfcReader.scan({ signal: _nfcAbortController.signal });
    window.nfcEnabled = true;
    window.nfcStatus = 'scanning';
    console.log('✅ NFC scanning active');
    return true;

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.warn('⚠️ NFC permission denied by user');
      window.nfcStatus = 'permission-denied';
      window.nfcError = 'NFC permission was denied. Reload and tap Allow if Chrome asks.';
      if (_debugVisible) {
        debugWarn('NFC permission denied');
      }
    } else if (error.name === 'NotSupportedError') {
      console.warn('⚠️ NFC not supported on this device');
      window.nfcStatus = 'unsupported';
      window.nfcError = 'NFC is not supported on this device/browser, or this page is not using HTTPS.';
      if (_debugVisible) {
        debugWarn('NFC not supported on this device');
      }
    } else if (error.name === 'SecurityError') {
      console.warn('⚠️ NFC requires a secure HTTPS context');
      window.nfcStatus = 'secure-context-required';
      window.nfcError = 'NFC requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.';
      if (_debugVisible) {
        debugWarn('NFC requires HTTPS');
      }
    } else {
      console.error('NFC permission error:', error);
      window.nfcStatus = 'error';
      window.nfcError = error && error.message ? error.message : 'NFC could not start.';
      if (_debugVisible) {
        debugError('NFC error: ' + error.message);
      }
    }
    window.nfcEnabled = false;
    _nfcReader = null;
    _nfcAbortController = null;
    return false;
  }
}

// Wrapped versions that notify the sketch (used by single-permission functions)
async function _requestMotionPermissions() {
  await _requestMotionPermissionsCore();
  _notifySketchReady();
}

async function _requestMicrophonePermissions() {
  await _requestMicrophonePermissionsCore();
  _notifySketchReady();
}

async function _requestSoundOutput() {
  await _requestSoundOutputCore();
  _notifySketchReady();
}

async function _requestSpeechPermission() {
  await _requestSpeechPermissionCore();
  _notifySketchReady();
}

async function _requestVibrationPermission() {
  await _requestVibrationPermissionCore();
  _notifySketchReady();
}

async function _requestNfcPermission() {
  const enabled = await _requestNfcPermissionCore();
  _notifySketchReady();
  return enabled;
}

function _notifySketchReady() {
  // Call userSetupComplete if it exists
  if (typeof userSetupComplete === 'function') {
    userSetupComplete();
  }
  
  // Trigger a custom event for more advanced use cases
  window.dispatchEvent(new CustomEvent('permissionsReady', {
    detail: {
      sensors: window.sensorsEnabled,
      microphone: window.micEnabled,
      sound: window.soundEnabled,
      speech: window.speechEnabled,
      vibration: window.vibrationEnabled,
      nfc: window.nfcEnabled,
      gestures: window.gesturesLocked
    }
  }));
}

// =========================================
// UI CREATION HELPERS
// =========================================

function _createPermissionButton(buttonText, statusText, onClickHandler) {
  // Remove existing button if present
  _removeExistingUI();
  let activating = false;
  
  // Create button
  const button = document.createElement('button');
  button.id = 'permissionButton';
  button.textContent = buttonText;
  button.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px 40px;
    font-size: 18px;
    font-weight: bold;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: transform 0.2s ease;
    touch-action: manipulation;
  `;
  
  // Create status text
  const status = document.createElement('div');
  status.id = 'permissionStatus';
  status.textContent = statusText;
  status.style.cssText = `
    position: fixed;
    top: 60%;
    left: 50%;
    transform: translate(-50%, 0);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    z-index: 999998;
    display: none;
  `;
  
  // Add hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translate(-50%, -50%) scale(1.05)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  
  // Add multiple event handlers to ensure responsiveness
  const handleButtonClick = async () => {
    if (!activating && button.parentNode) {
      activating = true;
      button.style.display = 'none';
      status.style.display = 'block';
      
      await onClickHandler();
      
      status.style.display = 'none';
      _removeExistingUI();
    }
  };
  
  // Add click, touch, and pointer handlers
  button.addEventListener('click', handleButtonClick);
  button.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleButtonClick();
  });
  button.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleButtonClick();
  });
  
  document.body.appendChild(button);
  document.body.appendChild(status);
}

function _createTapToEnable(message, onTapHandler) {
  // Remove existing UI if present
  _removeExistingUI();
  let activating = false;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'tapOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    cursor: pointer;
    touch-action: manipulation;
  `;
  
  // Create message
  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    color: white;
    font-size: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    padding: 40px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  `;
  
  overlay.appendChild(messageDiv);
  
  // Add multiple event handlers to ensure responsiveness
  const handleActivation = async () => {
    if (!activating && overlay.parentNode) {
      activating = true;
      messageDiv.textContent = 'Enabling...';
      await onTapHandler();
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }
  };
  
  // Add both click and touch handlers
  overlay.addEventListener('click', handleActivation);
  overlay.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
  
  // Also add pointer events for wider compatibility
  overlay.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
  
  document.body.appendChild(overlay);
}

function _removeExistingUI() {
  const button = document.getElementById('permissionButton');
  const status = document.getElementById('permissionStatus');
  const overlay = document.getElementById('tapOverlay');
  const banner = document.getElementById('permissionBanner');
  
  if (button) button.remove();
  if (status) status.remove();
  if (overlay) overlay.remove();
  if (banner) banner.remove();
}

// =========================================
// ALTERNATIVE UI STYLES
// =========================================

/**
 * Canvas-first-touch: Permissions fire on the user's first touch/click on the p5 canvas.
 * No overlay or button UI is shown. Optionally displays a text hint on the canvas.
 * @param {string|null} message - Optional hint text to display on canvas (or null for no hint)
 * @param {function} onActivateHandler - Async permission handler to run on first interaction
 */
function _createCanvasToEnable(message, onActivateHandler) {
  _removeExistingUI();
  
  let activated = false;
  let hintInterval = null;
  
  // Draw hint text on the canvas if message is provided
  if (message) {
    hintInterval = setInterval(() => {
      const canvas = document.querySelector('canvas');
      if (canvas && typeof push === 'function') {
        // Use p5 drawing functions to show hint
        push();
        fill(255, 255, 255, 200);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(Math.min(canvas.width, canvas.height) * 0.04);
        text(message, (typeof width !== 'undefined' ? width : canvas.width) / 2, 
             (typeof height !== 'undefined' ? height : canvas.height) * 0.9);
        pop();
      }
    }, 50);
  }
  
  const handleFirstInteraction = async (e) => {
    if (activated) return;
    activated = true;
    
    // Clean up hint drawing
    if (hintInterval) {
      clearInterval(hintInterval);
      hintInterval = null;
    }
    
    // Clean up listeners
    document.removeEventListener('touchstart', handleFirstInteraction, true);
    document.removeEventListener('mousedown', handleFirstInteraction, true);
    
    await onActivateHandler();
  };
  
  // Wait for canvas to appear, then attach listeners
  const waitForCanvas = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
      canvas.addEventListener('mousedown', handleFirstInteraction, { once: true, capture: true });
    } else {
      // Canvas not ready yet — also listen on document as a fallback
      setTimeout(waitForCanvas, 50);
    }
  };
  
  waitForCanvas();
}

/**
 * Banner UI: A slim notification-style banner at top or bottom of screen.
 * Less intrusive than full-screen overlay or centered button.
 * @param {string} message - Banner text
 * @param {string} position - 'top' or 'bottom'
 * @param {function} onActivateHandler - Async permission handler
 */
function _createBannerToEnable(message, position, onActivateHandler) {
  _removeExistingUI();
  let activating = false;
  
  const banner = document.createElement('div');
  banner.id = 'permissionBanner';
  
  const isTop = position === 'top';
  banner.style.cssText = `
    position: fixed;
    ${isTop ? 'top: 0;' : 'bottom: 0;'}
    left: 0;
    width: 100%;
    padding: 16px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 16px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    z-index: 999999;
    cursor: pointer;
    touch-action: manipulation;
    box-shadow: ${isTop ? '0 2px 10px rgba(0,0,0,0.3)' : '0 -2px 10px rgba(0,0,0,0.3)'};
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform: translateY(${isTop ? '-100%' : '100%'});
  `;
  
  banner.textContent = message;
  document.body.appendChild(banner);
  
  // Slide in animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    });
  });
  
  const handleActivation = async () => {
    if (activating || !banner.parentNode) return;
    activating = true;
    
    banner.textContent = 'Enabling...';
    banner.style.pointerEvents = 'none';
    
    await onActivateHandler();
    
    // Slide out animation
    banner.style.transform = `translateY(${isTop ? '-100%' : '100%'})`;
    banner.style.opacity = '0';
    setTimeout(() => {
      if (banner.parentNode) banner.remove();
    }, 300);
  };
  
  banner.addEventListener('click', handleActivation);
  banner.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
  banner.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
}

/**
 * Custom element binding: Attach permission trigger to any existing DOM element.
 * Users build their own UI and just bind the permission handler.
 * @param {string} selector - CSS selector for the target element
 * @param {function} onActivateHandler - Async permission handler
 */
function _bindPermissionTo(selector, onActivateHandler) {
  let activated = false;
  
  const attach = () => {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`p5-phone: Element "${selector}" not found. Retrying...`);
      setTimeout(attach, 100);
      return;
    }
    
    const handleActivation = async () => {
      if (activated) return;
      activated = true;
      
      await onActivateHandler();
    };
    
    element.addEventListener('click', handleActivation);
    element.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleActivation();
    });
  };
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
}

// =========================================
// GESTURE BLOCKING IMPLEMENTATION
// =========================================

function _initializeGestureBlocking() {
  // Prevent back navigation
  window.history.pushState(null, '', window.location.href);
  window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
  };
  
  // Warn before leaving
  window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.returnValue = '';
  });
  
  _initializeEdgeSwipePrevention();
  _initializeOtherGesturePrevention();
}

function _initializeEdgeSwipePrevention() {
  let touchStartX = 0;
  let touchStartY = 0;
  const edgeThreshold = 20;
  
  document.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      // Prevent edge swipes
      if (touchStartX < edgeThreshold || 
          touchStartX > window.innerWidth - edgeThreshold) {
        e.preventDefault();
      }
    }
  }, { passive: false, capture: true });
  
  document.addEventListener('touchmove', function(e) {
    if (!e.touches || e.touches.length === 0) return;
    
    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;
    let deltaX = currentX - touchStartX;
    let deltaY = currentY - touchStartY;
    
    // Prevent horizontal edge swipes (back/forward)
    if ((touchStartX < edgeThreshold && deltaX > 0) ||
        (touchStartX > window.innerWidth - edgeThreshold && deltaX < 0)) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent pull-to-refresh
    if (window.pageYOffset === 0 && deltaY > 0) {
      e.preventDefault();
    }
    
    // Prevent canvas touches but not on permission UI
    if (e.target && e.target.tagName === 'CANVAS' && 
        !document.getElementById('tapOverlay') && 
        !document.getElementById('permissionButton')) {
      e.preventDefault();
    }
  }, { passive: false, capture: true });
}

function _initializeOtherGesturePrevention() {
  // Prevent pinch zoom
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  });
  
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    // Don't prevent clicks on permission UI elements
    if (e.target && (
        e.target.id === 'tapOverlay' || 
        e.target.closest('#tapOverlay') || 
        e.target.id === 'permissionButton' ||
        e.target.id === 'permissionStatus' ||
        e.target.closest('#permissionButton') ||
        e.target.closest('#permissionStatus')
    )) {
      return; // Allow clicks on permission UI
    }
    
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // Prevent long-press context menu
  window.oncontextmenu = function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
}

function _initializeP5TouchOverrides() {
  // Wait for p5 to be ready by checking for a canvas element or p5 instance
  const maxAttempts = 50; // Stop after 5 seconds (50 * 100ms)
  let attempts = 0;
  
  const tryOverride = () => {
    attempts++;
    // Check multiple signals that p5 setup has completed
    const p5Ready = (typeof p5 !== 'undefined' && p5.instance) ||
                    document.querySelector('canvas') ||
                    (typeof window.setup === 'function' && typeof window.draw === 'function');
    
    if (p5Ready) {
      _overrideP5Touch();
    } else if (attempts < maxAttempts) {
      setTimeout(tryOverride, 100);
    } else {
      console.warn('p5-phone: Could not detect p5.js setup completion. Touch overrides not applied.');
    }
  };
  
  setTimeout(tryOverride, 100);
}

function _overrideP5Touch() {
  const origMousePressed = window.mousePressed || function() {};
  const origMouseDragged = window.mouseDragged || function() {};
  const origMouseReleased = window.mouseReleased || function() {};
  
  // In p5.js 2.0, touch and mouse are unified via Pointer API.
  // mousePressed/mouseDragged/mouseReleased fire for ALL pointer types (mouse + touch).
  // In p5.js 1.x, touchStarted/touchMoved/touchEnded are separate from mouse callbacks.
  // We wrap both sets for 1.x, and only mouse callbacks for 2.0.
  if (!_isP5v2) {
    // p5.js 1.x: also wrap touch-specific callbacks
    const origTouchStarted = window.touchStarted || function() {};
    const origTouchMoved = window.touchMoved || function() {};
    const origTouchEnded = window.touchEnded || function() {};
    
    window.touchStarted = function(e) {
      origTouchStarted(e);
      return false;
    };
    
    window.touchMoved = function(e) {
      origTouchMoved(e);
      return false;
    };
    
    window.touchEnded = function(e) {
      origTouchEnded(e);
      return false;
    };
  }
  
  // Mouse callbacks — work in both 1.x and 2.0
  window.mousePressed = function(e) {
    origMousePressed(e);
    return false;
  };
  
  window.mouseDragged = function(e) {
    origMouseDragged(e);
    return false;
  };
  
  window.mouseReleased = function(e) {
    origMouseReleased(e);
    return false;
  };
}

// =========================================
// LEGACY COMPATIBILITY
// =========================================

// Initialize gesture blocking on DOM load for backward compatibility
document.addEventListener('DOMContentLoaded', function() {
  // Check for old-style HTML elements
  const startButton = document.getElementById('startButton');
  const statusText = document.getElementById('statusText');
  
  if (startButton && statusText) {
    console.warn('⚠️  Legacy HTML elements detected. Consider using the new API functions instead.');
    // Maintain backward compatibility
    startButton.addEventListener('click', async () => {
      startButton.classList.add('hidden');
      statusText.classList.remove('hidden');
      statusText.textContent = 'Requesting permissions...';
      
      await _requestMotionPermissions();
      await _requestMicrophonePermissions();
      
      statusText.classList.add('hidden');
    });
    
    lockGestures(); // Auto-lock gestures for legacy mode
  }
});

// =========================================
// DEBUG SYSTEM - ON-SCREEN CONSOLE
// =========================================

// Debug system state
let _debugPanel = null;
let _debugVisible = false;
let _debugMessages = [];
const MAX_DEBUG_MESSAGES = 20;

/**
 * Show the on-screen debug panel
 */
function showDebug() {
  _createDebugPanel();
  _debugPanel.style.display = 'block';
  _debugVisible = true;
  window._debugVisible = true; // Global flag
  
  // Set up console overrides for future calls
  _setupConsoleOverrides();
  
  // Immediately show any early errors that might have been caught
  _displayEarlyErrors();
}

/**
 * Hide the on-screen debug panel
 */
function hideDebug() {
  if (_debugPanel) {
    _debugPanel.style.display = 'none';
    _debugVisible = false;
  }
}

/**
 * Toggle the debug panel visibility
 */
function toggleDebug() {
  if (_debugVisible) {
    hideDebug();
  } else {
    showDebug();
  }
}

/**
 * Debug function - works like console.log but shows on screen
 * Also logs to browser console
 */
function debug(...args) {
  // Also log to browser console
  console.log(...args);
  
  // Format arguments like console.log does
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  _addDebugMessage(message, 'log');
}

/**
 * Error function - shows errors on screen with red styling
 * Also logs to browser console as error
 */
function debugError(...args) {
  // Use original console.error to avoid infinite loop
  const originalError = window._originalConsoleError || console.error;
  originalError.apply(console, args);
  
  // Format arguments like console.log does
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  _addDebugMessage(`❌ ERROR: ${message}`, 'error');
}

/**
 * Warning function - shows warnings on screen with yellow styling
 * Also logs to browser console as warning
 */
function debugWarn(...args) {
  // Use original console.warn to avoid infinite loop
  const originalWarn = window._originalConsoleWarn || console.warn;
  originalWarn.apply(console, args);
  
  // Format arguments like console.log does
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  _addDebugMessage(`⚠️ WARNING: ${message}`, 'warning');
}

/**
 * Internal function to add messages to debug panel
 */
function _addDebugMessage(message, type = 'log') {
  // Add timestamp
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  
  const timestampedMessage = {
    text: `[${timestamp}] ${message}`,
    type: type
  };
  
  // Add to message history
  _debugMessages.push(timestampedMessage);
  if (_debugMessages.length > MAX_DEBUG_MESSAGES) {
    _debugMessages.shift();
  }
  
  // Update display if panel exists
  if (_debugPanel) {
    _updateDebugDisplay();
  }
}

/**
 * Clear all debug messages
 */
debug.clear = function() {
  _debugMessages = [];
  if (_debugPanel) {
    _updateDebugDisplay();
  }
  console.clear();
};

// Make debug functions globally accessible
window.debug = debug;
window.debugError = debugError;
window.debugWarn = debugWarn;
window.showDebug = showDebug;
window.hideDebug = hideDebug;
window.toggleDebug = toggleDebug;

// Make permission functions globally accessible
window.lockGestures = lockGestures;
window.enableGyroTap = enableGyroTap;
window.enableGyroButton = enableGyroButton;
window.enableSensorTap = enableGyroTap;
window.enableSensorButton = enableGyroButton;
window.enableMicTap = enableMicTap;
window.enableMicButton = enableMicButton;
window.enableSoundTap = enableSoundTap;
window.enableSoundButton = enableSoundButton;
window.enableSpeechTap = enableSpeechTap;
window.enableSpeechButton = enableSpeechButton;
window.enableVibrationTap = enableVibrationTap;
window.enableVibrationButton = enableVibrationButton;
window.vibrate = vibrate;
window.stopVibration = stopVibration;
window.enableNfcTap = enableNfcTap;
window.enableNfcButton = enableNfcButton;
window.stopNfc = stopNfc;
window.setNfcTagAlias = setNfcTagAlias;
window.getNfcTagAlias = getNfcTagAlias;
window.isNfcTag = isNfcTag;
window.enableAllTap = enableAllTap;
window.enableAllButton = enableAllButton;

// Canvas-first-touch style
window.enableGyroCanvas = enableGyroCanvas;
window.enableSensorCanvas = enableGyroCanvas;
window.enableMicCanvas = enableMicCanvas;
window.enableSoundCanvas = enableSoundCanvas;
window.enableSpeechCanvas = enableSpeechCanvas;
window.enableVibrationCanvas = enableVibrationCanvas;
window.enableNfcCanvas = enableNfcCanvas;
window.enableAllCanvas = enableAllCanvas;
window.enableCameraCanvas = enableCameraCanvas;

// Banner style
window.enableGyroBanner = enableGyroBanner;
window.enableSensorBanner = enableGyroBanner;
window.enableMicBanner = enableMicBanner;
window.enableSoundBanner = enableSoundBanner;
window.enableSpeechBanner = enableSpeechBanner;
window.enableVibrationBanner = enableVibrationBanner;
window.enableNfcBanner = enableNfcBanner;
window.enableAllBanner = enableAllBanner;
window.enableCameraBanner = enableCameraBanner;

// Custom element binding
window.enableGyroOn = enableGyroOn;
window.enableSensorOn = enableGyroOn;
window.enableMicOn = enableMicOn;
window.enableSoundOn = enableSoundOn;
window.enableSpeechOn = enableSpeechOn;
window.enableVibrationOn = enableVibrationOn;
window.enableNfcOn = enableNfcOn;
window.enableAllOn = enableAllOn;
window.enableCameraOn = enableCameraOn;

/**
 * Set up console overrides to capture console.error and console.warn
 */
function _setupConsoleOverrides() {
  // Only override once
  if (window._consoleOverrideSet) return;
  window._consoleOverrideSet = true;
  
  // Store original console methods for debug functions to use
  // Verify originals are functions before storing
  if (typeof console.error === 'function') {
    window._originalConsoleError = console.error;
  }
  if (typeof console.warn === 'function') {
    window._originalConsoleWarn = console.warn;
  }
  
  // Override console.error to also show in debug panel
  console.error = function(...args) {
    try {
      window._originalConsoleError.apply(console, args);
    } catch (e) { /* prevent override from breaking error flow */ }
    if (_debugVisible) {
      debugError(...args);
    }
  };
  
  // Override console.warn to also show in debug panel
  console.warn = function(...args) {
    try {
      window._originalConsoleWarn.apply(console, args);
    } catch (e) { /* prevent override from breaking warn flow */ }
    if (_debugVisible) {
      debugWarn(...args);
    }
  };
}

/**
 * Display any errors that were caught before the debug panel was ready
 */
function _displayEarlyErrors() {
  if (window._earlyErrors && window._earlyErrors.length > 0) {
    debugError(`🚨 Found ${window._earlyErrors.length} early error(s):`);
    window._earlyErrors.forEach(error => {
      debugError(error.message);
      if (error.stack) {
        debugError('Stack trace:', error.stack);
      }
    });
    window._earlyErrors = []; // Clear after displaying
  }
}

/**
 * Create the debug panel DOM element
 */
function _createDebugPanel() {
  if (_debugPanel) return;
  
  _debugPanel = document.createElement('div');
  _debugPanel.id = 'mobile-debug-panel';
  _debugPanel.innerHTML = `
    <div id="mobile-debug-header">
      <span>Debug</span>
      <button id="mobile-debug-close">×</button>
    </div>
    <div id="mobile-debug-content"></div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #mobile-debug-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-width: calc(100vw - 40px);
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      display: none;
    }
    
    #mobile-debug-header {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px 8px 0 0;
    }
    
    #mobile-debug-header span {
      font-weight: bold;
      font-size: 13px;
    }
    
    #mobile-debug-close {
      background: none;
      border: none;
      color: #ffffff;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #mobile-debug-close:hover {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    #mobile-debug-content {
      padding: 12px;
      max-height: 340px;
      overflow-y: auto;
      word-wrap: break-word;
      line-height: 1.4;
    }
    
    .debug-message {
      margin-bottom: 4px;
      white-space: pre-wrap;
    }
    
    .debug-message.error {
      color: #ff6b6b;
      background: rgba(255, 107, 107, 0.1);
      padding: 4px;
      border-radius: 3px;
      border-left: 3px solid #ff6b6b;
    }
    
    .debug-message.warning {
      color: #ffd93d;
      background: rgba(255, 217, 61, 0.1);
      padding: 4px;
      border-radius: 3px;
      border-left: 3px solid #ffd93d;
    }
    
    .debug-timestamp {
      color: #888;
      font-size: 10px;
    }
    
    @media (max-width: 480px) {
      #mobile-debug-panel {
        width: calc(100vw - 20px);
        right: 10px;
        top: 10px;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(_debugPanel);
  
  // Add close button functionality
  document.getElementById('mobile-debug-close').onclick = hideDebug;
  
  // Update display with existing messages
  _updateDebugDisplay();
}

/**
 * Update the debug panel display with current messages
 */
function _updateDebugDisplay() {
  if (!_debugPanel) return;
  
  const content = document.getElementById('mobile-debug-content');
  if (!content) return;
  
  content.innerHTML = _debugMessages
    .map(msg => {
      // Handle both old string format and new object format
      if (typeof msg === 'string') {
        return `<div class="debug-message">${msg}</div>`;
      } else {
        return `<div class="debug-message ${msg.type}">${msg.text}</div>`;
      }
    })
    .join('');
  
  // Auto-scroll to bottom
  content.scrollTop = content.scrollHeight;
}

// =========================================
// PHONE CAMERA - ML5-OPTIMIZED VIDEO CAPTURE
// =========================================

/**
 * PhoneCamera class - Video capture optimized for ML5 integration
 * Handles camera switching, mirroring, display modes, and coordinate mapping
 */
class PhoneCamera {
  constructor(active = 'user', mirror = true, mode = 'fitHeight') {
    this._active = active;
    this._mirror = mirror;
    this._mode = mode;
    this._fixedWidth = 640;
    this._fixedHeight = 480;
    this._video = null;
    this._ready = false;
    this._p5Instance = window;
    this._onReadyCallback = null;
    
    // Store reference to createCapture for later use
    this._createCaptureRef = null;
    
    // Register this camera instance globally
    if (!window._phoneCameras) {
      window._phoneCameras = [];
    }
    window._phoneCameras.push(this);
    
    // Don't initialize immediately - wait for enableCameraTap() or explicit initialization
    // This fixes iOS rotation bug where camera was initialized before permissions granted
  }
  
  // ========================================
  // READ-ONLY PROPERTIES
  // ========================================
  
  get ready() {
    return this._ready;
  }
  
  get video() {
    return this._video;
  }
  
  get videoElement() {
    // Returns the native HTML video element for ML5/other libraries
    return this._video ? this._video.elt : null;
  }
  
  get width() {
    if (!this._ready) return 0;
    const dims = this.getDimensions();
    return dims.width;
  }
  
  get height() {
    if (!this._ready) return 0;
    const dims = this.getDimensions();
    return dims.height;
  }
  
  // ========================================
  // READ-WRITE PROPERTIES
  // ========================================
  
  get active() {
    return this._active;
  }
  
  set active(value) {
    if (value !== 'user' && value !== 'environment') {
      console.error('PhoneCamera: active must be "user" or "environment"');
      return;
    }
    if (this._active !== value) {
      this._active = value;
      if (this._ready) {
        this._switchCamera();
      }
    }
  }
  
  get mirror() {
    return this._mirror;
  }
  
  set mirror(value) {
    this._mirror = !!value;
  }
  
  get mode() {
    return this._mode;
  }
  
  set mode(value) {
    const validModes = ['fitWidth', 'fitHeight', 'cover', 'contain', 'fixed'];
    if (!validModes.includes(value)) {
      console.error('PhoneCamera: mode must be one of:', validModes.join(', '));
      return;
    }
    this._mode = value;
  }
  
  get fixedWidth() {
    return this._fixedWidth;
  }
  
  set fixedWidth(value) {
    this._fixedWidth = Math.max(1, value);
  }
  
  get fixedHeight() {
    return this._fixedHeight;
  }
  
  set fixedHeight(value) {
    this._fixedHeight = Math.max(1, value);
  }
  
  /**
   * Set callback to run when video is fully ready
   * @param {function} callback - Function to call when video is ready for ML5
   */
  onReady(callback) {
    this._onReadyCallback = callback;
    
    // If already ready, call immediately
    if (this._ready && this._video && this._video.elt && this._video.elt.readyState >= 2) {
      callback();
    } else if (this._video) {
      // Video exists but not ready yet - start checking
      this._checkVideoReady();
    }
    // If video doesn't exist yet, callback will fire when _initializeCamera completes
  }
  
  // ========================================
  // INTERNAL METHODS
  // ========================================
  
  _initializeCamera() {
    if (this._ready || this._video) return;
    
    const constraints = {
      video: {
        facingMode: this._active
      },
      audio: false
    };
    
    // Use p5's createCapture
    this._video = createCapture(constraints, () => {
      this._ready = true;
      this._video.hide(); // Hide default video element
      console.log('✅ PhoneCamera ready');
      this._checkVideoReady();
    });
    
    // Handle load event for older p5 versions
    if (this._video && this._video.elt) {
      this._video.elt.addEventListener('loadeddata', () => {
        this._ready = true;
        this._checkVideoReady();
      });
    }
  }
  
  _checkVideoReady(attempts = 0) {
    const maxAttempts = 100; // 10 seconds (100 * 100ms)
    
    // Check if video element has enough data for ML5
    if (this._video && this._video.elt && this._video.elt.readyState >= 2) {
      if (this._onReadyCallback) {
        const callback = this._onReadyCallback;
        this._onReadyCallback = null;  // Clear callback so it only fires once
        callback();
      }
    } else if (attempts < maxAttempts) {
      // Check again shortly
      setTimeout(() => this._checkVideoReady(attempts + 1), 100);
    } else {
      console.warn('PhoneCamera: Video failed to reach ready state after 10 seconds');
      if (_debugVisible) {
        debugWarn('PhoneCamera: Video not ready after timeout. Check camera permissions.');
      }
    }
  }
  
  _switchCamera() {
    if (!this._video) return;
    
    // Remove old video
    const wasReady = this._ready;
    this._ready = false;
    this._video.remove();
    
    // Create new video with new facing mode
    const constraints = {
      video: {
        facingMode: this._active
      },
      audio: false
    };
    
    this._video = createCapture(constraints, () => {
      this._ready = true;
      this._video.hide();
      console.log(`✅ PhoneCamera switched to ${this._active} camera`);
    });
    
    // Handle load event for older p5 versions
    if (this._video && this._video.elt) {
      this._video.elt.addEventListener('loadeddata', () => {
        this._ready = true;
      });
    }
  }
  
  // ========================================
  // PUBLIC METHODS
  // ========================================
  
  /**
   * Remove and stop the camera
   */
  remove() {
    if (this._video) {
      this._video.remove();
      this._video = null;
    }
    this._ready = false;
  }
  
  /**
   * Get dimension information for the current display mode
   * Returns: { x, y, width, height, scaleX, scaleY }
   */
  getDimensions() {
    if (!this._ready || !this._video) {
      return { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 };
    }
    
    const videoElement = this.videoElement;
    const videoWidth = (videoElement && videoElement.videoWidth) || this._video.width;
    const videoHeight = (videoElement && videoElement.videoHeight) || this._video.height;

    if (!videoWidth || !videoHeight) {
      return { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 };
    }
    
    // Get actual canvas DISPLAY dimensions (not drawing buffer dimensions)
    // In p5.js, the width/height globals represent the logical canvas size
    // which already accounts for pixel density in recent versions
    const canvasWidth = (typeof width !== 'undefined') ? width : window.innerWidth;
    const canvasHeight = (typeof height !== 'undefined') ? height : window.innerHeight;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (this._mode === 'fixed') {
      drawWidth = this._fixedWidth;
      drawHeight = this._fixedHeight;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = (canvasHeight - drawHeight) / 2;
      
    } else if (this._mode === 'fitWidth') {
      drawWidth = canvasWidth;
      drawHeight = (videoHeight / videoWidth) * drawWidth;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
      
    } else if (this._mode === 'fitHeight') {
      drawHeight = canvasHeight;
      drawWidth = (videoWidth / videoHeight) * drawHeight;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
      
    } else if (this._mode === 'cover') {
      const scale = Math.max(
        canvasWidth / videoWidth,
        canvasHeight / videoHeight
      );
      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = (canvasHeight - drawHeight) / 2;
      
    } else if (this._mode === 'contain') {
      const scale = Math.min(
        canvasWidth / videoWidth,
        canvasHeight / videoHeight
      );
      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = (canvasHeight - drawHeight) / 2;
    }
    
    return {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
      scaleX: drawWidth / videoWidth,
      scaleY: drawHeight / videoHeight
    };
  }
  
  /**
   * Map a simple point (x, y) to display coordinates
   * Handles mirroring automatically
   * @param {number} x - X coordinate in video space
   * @param {number} y - Y coordinate in video space
   * @returns {object} - { x, y } in display space
   */
  mapPoint(x, y) {
    const dims = this.getDimensions();
    
    // Scale the coordinates from video space to display space
    let scaledX = x * dims.scaleX;
    const scaledY = y * dims.scaleY;
    
    // Apply mirroring if enabled
    if (this._mirror) {
      // Mirror the scaled coordinate within the video width
      scaledX = dims.width - scaledX;
    }
    
    // Add offset to position on canvas
    // dims.x and dims.y represent where the video is drawn on the canvas
    // This can be negative when the video is larger than the canvas (fitHeight/fitWidth modes)
    const mappedX = scaledX + dims.x;
    const mappedY = scaledY + dims.y;
    
    return { x: mappedX, y: mappedY };
  }
  
  /**
   * Map an ML5 keypoint object to display coordinates
   * Handles mirroring automatically
   * Preserves z coordinate and any other properties
   * @param {object} keypoint - ML5 keypoint { x, y, z?, ... }
   * @returns {object} - Keypoint with mapped coordinates
   */
  mapKeypoint(keypoint) {
    if (!keypoint || typeof keypoint.x === 'undefined' || typeof keypoint.y === 'undefined') {
      console.warn('PhoneCamera.mapKeypoint: invalid keypoint', keypoint);
      return keypoint;
    }
    
    const mapped = this.mapPoint(keypoint.x, keypoint.y);
    
    // Preserve all properties from original keypoint
    return {
      ...keypoint,
      x: mapped.x,
      y: mapped.y
    };
  }
  
  /**
   * Map an array of ML5 keypoints to display coordinates
   * Handles mirroring automatically
   * @param {array} keypoints - Array of ML5 keypoints
   * @returns {array} - Array of keypoints with mapped coordinates
   */
  mapKeypoints(keypoints) {
    if (!Array.isArray(keypoints)) {
      console.warn('PhoneCamera.mapKeypoints: expected array, got', typeof keypoints);
      return keypoints;
    }
    
    return keypoints.map(kp => this.mapKeypoint(kp));
  }

  /**
   * Map an ML5 bounding box object to display coordinates
   * Handles scaling and mirroring automatically
   * Preserves labels, confidence, and any other detection properties
   * @param {object} box - ML5 box/detection { x, y, width, height, ... }
   * @returns {object} - Box with mapped x, y, width, and height
   */
  mapBox(box) {
    if (!box) {
      console.warn('PhoneCamera.mapBox: invalid box', box);
      return box;
    }

    const boxX = typeof box.x !== 'undefined' ? box.x : box.xMin;
    const boxY = typeof box.y !== 'undefined' ? box.y : box.yMin;
    const boxWidth = typeof box.width !== 'undefined' ? box.width : box.xMax - box.xMin;
    const boxHeight = typeof box.height !== 'undefined' ? box.height : box.yMax - box.yMin;
    const numericX = Number(boxX);
    const numericY = Number(boxY);
    const numericWidth = Number(boxWidth);
    const numericHeight = Number(boxHeight);

    if (!Number.isFinite(numericX) ||
        !Number.isFinite(numericY) ||
        !Number.isFinite(numericWidth) ||
        !Number.isFinite(numericHeight)) {
      console.warn('PhoneCamera.mapBox: invalid box', box);
      return box;
    }

    const topLeft = this.mapPoint(numericX, numericY);
    const bottomRight = this.mapPoint(numericX + numericWidth, numericY + numericHeight);
    const mappedX = Math.min(topLeft.x, bottomRight.x);
    const mappedY = Math.min(topLeft.y, bottomRight.y);
    const mappedWidth = Math.abs(bottomRight.x - topLeft.x);
    const mappedHeight = Math.abs(bottomRight.y - topLeft.y);

    return {
      ...box,
      x: mappedX,
      y: mappedY,
      width: mappedWidth,
      height: mappedHeight,
      xMin: mappedX,
      yMin: mappedY,
      xMax: mappedX + mappedWidth,
      yMax: mappedY + mappedHeight
    };
  }

  /**
   * Map an array of ML5 bounding boxes to display coordinates
   * @param {array} boxes - Array of ML5 boxes/detections
   * @returns {array} - Array of boxes with mapped coordinates
   */
  mapBoxes(boxes) {
    if (!Array.isArray(boxes)) {
      console.warn('PhoneCamera.mapBoxes: expected array, got', typeof boxes);
      return boxes;
    }

    return boxes.map(box => this.mapBox(box));
  }
  
  // ========================================
  // CANVAS DRAWING INTEGRATION
  // ========================================
  
  /**
   * Custom draw method for p5.image() compatibility
   * This allows image(cam, x, y) to work
   */
  _draw(p5Instance = null) {
    const videoElement = this.videoElement;
    if (!this._ready || !this._video || !videoElement || videoElement.readyState < 2) return;
    
    const dims = this.getDimensions();
    
    // Get canvas display dimensions for mirroring
    const canvasWidth = (typeof width !== 'undefined') ? width : window.innerWidth;
    
    // Debug: log what we're drawing (once)
    if (!this._drawDebugLogged) {
      console.log('_draw() params:', {
        x: dims.x,
        y: dims.y,
        width: dims.width,
        height: dims.height,
        canvasWidth: canvasWidth,
        mirror: this._mirror
      });
      this._drawDebugLogged = true;
    }
    
    const context = (p5Instance && p5Instance.drawingContext) ||
      (typeof drawingContext !== 'undefined' ? drawingContext : null);

    if (!context || typeof context.drawImage !== 'function') return;

    const pushState = (p5Instance && p5Instance.push) ? p5Instance.push.bind(p5Instance) :
      (typeof push === 'function' ? push : null);
    const popState = (p5Instance && p5Instance.pop) ? p5Instance.pop.bind(p5Instance) :
      (typeof pop === 'function' ? pop : null);
    const translateCanvas = (p5Instance && p5Instance.translate) ? p5Instance.translate.bind(p5Instance) :
      (typeof translate === 'function' ? translate : null);
    const scaleCanvas = (p5Instance && p5Instance.scale) ? p5Instance.scale.bind(p5Instance) :
      (typeof scale === 'function' ? scale : null);

    if (!pushState || !popState || !translateCanvas || !scaleCanvas) return;

    // Save current drawing state
    pushState();
    
    // Apply mirroring if needed
    if (this._mirror) {
      // Mirror by flipping around the center of the canvas
      translateCanvas(canvasWidth, 0);
      scaleCanvas(-1, 1);
      // Draw at the same logical position
      context.drawImage(videoElement, dims.x, dims.y, dims.width, dims.height);
    } else {
      context.drawImage(videoElement, dims.x, dims.y, dims.width, dims.height);
    }
    
    popState();
  }
}

/**
 * Create a new PhoneCamera instance
 * @param {string} active - 'user' (front) or 'environment' (back) camera
 * @param {boolean} mirror - Whether to mirror the video horizontally
 * @param {string} mode - Display mode: 'fitWidth', 'fitHeight', 'cover', 'contain', 'fixed'
 * @returns {PhoneCamera} - Camera instance
 */
function createPhoneCamera(active = 'user', mirror = true, mode = 'fitHeight') {
  return new PhoneCamera(active, mirror, mode);
}

/**
 * Enable camera with a button interface
 * Creates a start button that user must click
 */
function enableCameraButton(buttonText = 'ENABLE CAMERA', statusText = 'Starting camera...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via button');
  });
}

/**
 * Enable camera with tap-to-start
 * User taps anywhere on screen to enable
 */
function enableCameraTap(message = 'Tap screen to enable camera') {
  // Check if camera permission is already granted
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'camera' })
      .then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
          // Permission already granted - skip the tap UI and initialize immediately
          console.log('✅ Camera permission already granted - auto-starting');
          _requestCameraPermission();
        } else {
          // Permission not granted - show tap UI
          _createTapToEnable(message, async () => {
            await _requestCameraPermission();
            console.log('✅ Camera enabled via tap');
          });
        }
      })
      .catch(() => {
        // Permissions API not supported - show tap UI
        _createTapToEnable(message, async () => {
          await _requestCameraPermission();
          console.log('✅ Camera enabled via tap');
        });
      });
  } else {
    // Fallback - show tap UI
    _createTapToEnable(message, async () => {
      await _requestCameraPermission();
      console.log('✅ Camera enabled via tap');
    });
  }
}

async function _requestCameraPermission() {
  try {
    // Initialize any PhoneCamera instances that haven't been initialized yet
    // This happens after user interaction grants camera permission
    if (typeof window._phoneCameras !== 'undefined' && Array.isArray(window._phoneCameras)) {
      for (let cam of window._phoneCameras) {
        if (cam && !cam._ready && !cam._video) {
          cam._initializeCamera();
        }
      }
    }
    
    // Call userCameraReady callback if it exists (user-defined function)
    if (typeof userCameraReady === 'function') {
      userCameraReady();
    }
    
    _notifySketchReady();
    
  } catch (error) {
    console.error('Camera permission error:', error);
    if (_debugVisible) {
      debugError('Camera permission error:', error);
    }
    _notifySketchReady();
  }
}

// Make camera functions globally accessible
window.createPhoneCamera = createPhoneCamera;
window.enableCameraButton = enableCameraButton;
window.enableCameraTap = enableCameraTap;

// Override p5's image() function to support PhoneCamera
if (typeof p5 !== 'undefined' && p5.prototype) {
  const originalImage = p5.prototype.image;
  
  p5.prototype.image = function(...args) {
    // Check if first argument is a PhoneCamera instance
    if (args[0] instanceof PhoneCamera) {
      const cam = args[0];
      
      // Always use auto-positioning for PhoneCamera
      // The camera calculates the correct position based on mode (fitHeight, fitWidth, etc)
      cam._draw(this);
    } else {
      // Not a PhoneCamera, use original image function
      originalImage.apply(this, args);
    }
  };
}

// =========================================
// P5.JS NAMESPACE SUPPORT
// =========================================

/**
 * Add functions to p5.js prototype for namespace support in p5.js 1.x.
 * p5.js 2.x uses p5.registerAddon() below; registering in both places
 * creates duplicate globals during p5 2 global-mode binding.
 */
if (typeof p5 !== 'undefined' && p5.prototype && typeof p5.registerAddon !== 'function') {
  // Core permission functions
  p5.prototype.lockGestures = lockGestures;
  p5.prototype.enableGyroTap = enableGyroTap;
  p5.prototype.enableGyroButton = enableGyroButton;
  p5.prototype.enableSensorTap = enableGyroTap;
  p5.prototype.enableSensorButton = enableGyroButton;
  p5.prototype.enableMicTap = enableMicTap;
  p5.prototype.enableMicButton = enableMicButton;
  p5.prototype.enableSoundTap = enableSoundTap;
  p5.prototype.enableSoundButton = enableSoundButton;
  p5.prototype.enableSpeechTap = enableSpeechTap;
  p5.prototype.enableSpeechButton = enableSpeechButton;
  p5.prototype.enableVibrationTap = enableVibrationTap;
  p5.prototype.enableVibrationButton = enableVibrationButton;
  p5.prototype.vibrate = vibrate;
  p5.prototype.stopVibration = stopVibration;
  p5.prototype.enableNfcTap = enableNfcTap;
  p5.prototype.enableNfcButton = enableNfcButton;
  p5.prototype.stopNfc = stopNfc;
  p5.prototype.setNfcTagAlias = setNfcTagAlias;
  p5.prototype.getNfcTagAlias = getNfcTagAlias;
  p5.prototype.isNfcTag = isNfcTag;
  p5.prototype.enableAllTap = enableAllTap;
  p5.prototype.enableAllButton = enableAllButton;
  
  // Canvas-first-touch style
  p5.prototype.enableGyroCanvas = enableGyroCanvas;
  p5.prototype.enableSensorCanvas = enableGyroCanvas;
  p5.prototype.enableMicCanvas = enableMicCanvas;
  p5.prototype.enableSoundCanvas = enableSoundCanvas;
  p5.prototype.enableSpeechCanvas = enableSpeechCanvas;
  p5.prototype.enableVibrationCanvas = enableVibrationCanvas;
  p5.prototype.enableNfcCanvas = enableNfcCanvas;
  p5.prototype.enableAllCanvas = enableAllCanvas;
  p5.prototype.enableCameraCanvas = enableCameraCanvas;
  
  // Banner style
  p5.prototype.enableGyroBanner = enableGyroBanner;
  p5.prototype.enableSensorBanner = enableGyroBanner;
  p5.prototype.enableMicBanner = enableMicBanner;
  p5.prototype.enableSoundBanner = enableSoundBanner;
  p5.prototype.enableSpeechBanner = enableSpeechBanner;
  p5.prototype.enableVibrationBanner = enableVibrationBanner;
  p5.prototype.enableNfcBanner = enableNfcBanner;
  p5.prototype.enableAllBanner = enableAllBanner;
  p5.prototype.enableCameraBanner = enableCameraBanner;
  
  // Custom element binding
  p5.prototype.enableGyroOn = enableGyroOn;
  p5.prototype.enableSensorOn = enableGyroOn;
  p5.prototype.enableMicOn = enableMicOn;
  p5.prototype.enableSoundOn = enableSoundOn;
  p5.prototype.enableSpeechOn = enableSpeechOn;
  p5.prototype.enableVibrationOn = enableVibrationOn;
  p5.prototype.enableNfcOn = enableNfcOn;
  p5.prototype.enableAllOn = enableAllOn;
  p5.prototype.enableCameraOn = enableCameraOn;
  
  // Camera functions
  p5.prototype.createPhoneCamera = createPhoneCamera;
  p5.prototype.enableCameraButton = enableCameraButton;
  p5.prototype.enableCameraTap = enableCameraTap;
  
  // Debug functions
  p5.prototype.showDebug = showDebug;
  p5.prototype.hideDebug = hideDebug;
  p5.prototype.toggleDebug = toggleDebug;
  p5.prototype.debug = debug;
  p5.prototype.debugError = debugError;
  p5.prototype.debugWarn = debugWarn;
  
  console.log('✅ Mobile p5.js Permissions: p5.prototype functions registered');
}

// =========================================
// P5.JS 2.0 ADDON REGISTRATION
// =========================================

/**
 * Register as a p5.js 2.0 addon via p5.registerAddon().
 * This provides the modern lifecycle integration for p5.js 2.0+
 * while the p5.prototype block above handles 1.x compatibility.
 */
if (typeof p5 !== 'undefined' && typeof p5.registerAddon === 'function') {
  p5.registerAddon(function(p5, fn, lifecycles) {
    // In p5.js 2 global mode, p5 binds every prototype property onto window.
    // p5-phone's top-level function declarations already create globals such
    // as lockGestures, so adding those names to p5.prototype before binding
    // causes "Cannot redefine property" errors. Attach instance methods after
    // global binding but before setup() instead.
    lifecycles.presetup = function() {
      // Core permission functions
      this.lockGestures = lockGestures;
      this.enableGyroTap = enableGyroTap;
      this.enableGyroButton = enableGyroButton;
      this.enableSensorTap = enableGyroTap;
      this.enableSensorButton = enableGyroButton;
      this.enableMicTap = enableMicTap;
      this.enableMicButton = enableMicButton;
      this.enableSoundTap = enableSoundTap;
      this.enableSoundButton = enableSoundButton;
      this.enableSpeechTap = enableSpeechTap;
      this.enableSpeechButton = enableSpeechButton;
      this.enableVibrationTap = enableVibrationTap;
      this.enableVibrationButton = enableVibrationButton;
      this.vibrate = vibrate;
      this.stopVibration = stopVibration;
      this.enableNfcTap = enableNfcTap;
      this.enableNfcButton = enableNfcButton;
      this.stopNfc = stopNfc;
      this.setNfcTagAlias = setNfcTagAlias;
      this.getNfcTagAlias = getNfcTagAlias;
      this.isNfcTag = isNfcTag;
      this.enableAllTap = enableAllTap;
      this.enableAllButton = enableAllButton;

      // Canvas-first-touch style
      this.enableGyroCanvas = enableGyroCanvas;
      this.enableSensorCanvas = enableGyroCanvas;
      this.enableMicCanvas = enableMicCanvas;
      this.enableSoundCanvas = enableSoundCanvas;
      this.enableSpeechCanvas = enableSpeechCanvas;
      this.enableVibrationCanvas = enableVibrationCanvas;
      this.enableNfcCanvas = enableNfcCanvas;
      this.enableAllCanvas = enableAllCanvas;
      this.enableCameraCanvas = enableCameraCanvas;

      // Banner style
      this.enableGyroBanner = enableGyroBanner;
      this.enableSensorBanner = enableGyroBanner;
      this.enableMicBanner = enableMicBanner;
      this.enableSoundBanner = enableSoundBanner;
      this.enableSpeechBanner = enableSpeechBanner;
      this.enableVibrationBanner = enableVibrationBanner;
      this.enableNfcBanner = enableNfcBanner;
      this.enableAllBanner = enableAllBanner;
      this.enableCameraBanner = enableCameraBanner;

      // Custom element binding
      this.enableGyroOn = enableGyroOn;
      this.enableSensorOn = enableGyroOn;
      this.enableMicOn = enableMicOn;
      this.enableSoundOn = enableSoundOn;
      this.enableSpeechOn = enableSpeechOn;
      this.enableVibrationOn = enableVibrationOn;
      this.enableNfcOn = enableNfcOn;
      this.enableAllOn = enableAllOn;
      this.enableCameraOn = enableCameraOn;

      // Camera functions
      this.createPhoneCamera = createPhoneCamera;
      this.enableCameraButton = enableCameraButton;
      this.enableCameraTap = enableCameraTap;

      // Debug functions
      this.showDebug = showDebug;
      this.hideDebug = hideDebug;
      this.toggleDebug = toggleDebug;
      this.debug = debug;
      this.debugError = debugError;
      this.debugWarn = debugWarn;
    };

    console.log('✅ Mobile p5.js Permissions: registered as p5.js 2.0 addon');
  });
}