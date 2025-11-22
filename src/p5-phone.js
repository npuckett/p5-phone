/*!
 * p5-phone v1.6.4
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

// Internal state
let _permissionsInitialized = false;
let _micInstance = null;

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
 * Enable both motion sensors and microphone with a button interface
 * Creates a start button that user must click to enable both
 */
function enableAllButton(buttonText = 'ENABLE MOTION & MICROPHONE', statusText = 'Requesting permissions...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMotionPermissions();
    await _requestMicrophonePermissions();
    console.log('✅ Motion sensors and microphone enabled via button');
  });
}

/**
 * Enable both motion sensors and microphone with tap-to-start
 * User taps anywhere on screen to enable both
 */
function enableAllTap(message = 'Tap screen to enable motion sensors & microphone') {
  _createTapToEnable(message, async () => {
    await _requestMotionPermissions();
    await _requestMicrophonePermissions();
    console.log('✅ Motion sensors and microphone enabled via tap');
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

// =========================================
// INTERNAL PERMISSION HANDLERS
// =========================================

async function _requestMotionPermissions() {
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
    _notifySketchReady();
    
  } catch (error) {
    console.error('Motion sensor permission error:', error);
    if (_debugVisible) {
      debugError('Motion sensor permission error:', error);
    }
    // Enable anyway for non-iOS devices
    window.sensorsEnabled = true;
    _notifySketchReady();
  }
}

async function _requestMicrophonePermissions() {
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
    
    _notifySketchReady();
    
  } catch (error) {
    console.error('Microphone permission error:', error);
    if (_debugVisible) {
      debugError('Microphone permission error:', error);
    }
    _notifySketchReady();
  }
}

async function _requestSoundOutput() {
  try {
    // Start audio context for p5.sound (enables sound playback)
    if (typeof userStartAudio !== 'undefined') {
      await userStartAudio();
    }
    
    window.soundEnabled = true;
    _notifySketchReady();
    
  } catch (error) {
    console.error('Sound output error:', error);
    if (_debugVisible) {
      debugError('Sound output error:', error);
    }
    window.soundEnabled = true; // Enable anyway since no permission needed
    _notifySketchReady();
  }
}

async function _requestSpeechPermission() {
  try {
    // Start audio context for Web Speech API
    // DO NOT create or start p5.AudioIn - this would conflict with speech recognition
    if (typeof userStartAudio !== 'undefined') {
      await userStartAudio();
    }
    
    window.speechEnabled = true;
    _notifySketchReady();
    
  } catch (error) {
    console.error('Speech permission error:', error);
    if (_debugVisible) {
      debugError('Speech permission error:', error);
    }
    _notifySketchReady();
  }
}

async function _requestVibrationPermission() {
  try {
    // Check if Vibration API is supported
    if (!navigator.vibrate) {
      console.warn('⚠️ Vibration API not supported on this device (likely iOS)');
      if (_debugVisible) {
        debugWarn('Vibration API not supported on this device');
      }
      window.vibrationEnabled = false;
      _notifySketchReady();
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
    
    _notifySketchReady();
    
  } catch (error) {
    console.error('Vibration permission error:', error);
    if (_debugVisible) {
      debugError('Vibration permission error:', error);
    }
    window.vibrationEnabled = false;
    _notifySketchReady();
  }
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
      vibration: window.vibrationEnabled,
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
    if (button.parentNode) {
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
    if (overlay.parentNode) {
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
  
  if (button) button.remove();
  if (status) status.remove();
  if (overlay) overlay.remove();
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
  // Wait for p5 to be ready
  setTimeout(() => {
    if (window._setupDone) {
      _overrideP5Touch();
    } else {
      // Try again after setup
      const checkP5 = setInterval(() => {
        if (window._setupDone) {
          _overrideP5Touch();
          clearInterval(checkP5);
        }
      }, 100);
    }
  }, 100);
}

function _overrideP5Touch() {
  const origTouchStarted = window.touchStarted || function() {};
  const origTouchMoved = window.touchMoved || function() {};
  const origTouchEnded = window.touchEnded || function() {};
  const origMousePressed = window.mousePressed || function() {};
  const origMouseDragged = window.mouseDragged || function() {};
  const origMouseReleased = window.mouseReleased || function() {};
  
  // Ensure all touch functions return false to prevent default behaviors
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
window.enableMicTap = enableMicTap;
window.enableMicButton = enableMicButton;
window.enableSoundTap = enableSoundTap;
window.enableSoundButton = enableSoundButton;
window.enableSpeechTap = enableSpeechTap;
window.enableVibrationTap = enableVibrationTap;
window.enableVibrationButton = enableVibrationButton;
window.vibrate = vibrate;
window.stopVibration = stopVibration;
window.enableAllTap = enableAllTap;
window.enableAllButton = enableAllButton;

/**
 * Set up console overrides to capture console.error and console.warn
 */
function _setupConsoleOverrides() {
  // Only override once
  if (window._consoleOverrideSet) return;
  window._consoleOverrideSet = true;
  
  // Store original console methods for debug functions to use
  window._originalConsoleError = console.error;
  window._originalConsoleWarn = console.warn;
  
  // Override console.error to also show in debug panel
  console.error = function(...args) {
    window._originalConsoleError.apply(console, args);
    if (_debugVisible) {
      debugError(...args);
    }
  };
  
  // Override console.warn to also show in debug panel
  console.warn = function(...args) {
    window._originalConsoleWarn.apply(console, args);
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
  
  _checkVideoReady() {
    // Check if video element has enough data for ML5
    if (this._video && this._video.elt && this._video.elt.readyState >= 2) {
      if (this._onReadyCallback) {
        const callback = this._onReadyCallback;
        this._onReadyCallback = null;  // Clear callback so it only fires once
        callback();
      }
    } else {
      // Check again shortly
      setTimeout(() => this._checkVideoReady(), 100);
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
    
    const videoWidth = this._video.width;
    const videoHeight = this._video.height;
    
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
  
  // ========================================
  // CANVAS DRAWING INTEGRATION
  // ========================================
  
  /**
   * Custom draw method for p5.image() compatibility
   * This allows image(cam, x, y) to work
   */
  _draw() {
    if (!this._ready || !this._video) return;
    
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
    
    // Save current drawing state
    push();
    
    // Apply mirroring if needed
    if (this._mirror) {
      // Mirror by flipping around the center of the canvas
      translate(canvasWidth, 0);
      scale(-1, 1);
      // Draw at the same logical position
      image(this._video, dims.x, dims.y, dims.width, dims.height);
    } else {
      image(this._video, dims.x, dims.y, dims.width, dims.height);
    }
    
    pop();
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
      cam._draw();
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
 * Add functions to p5.js prototype for namespace support
 * This allows using both global functions and p5.prototype.functionName
 */
if (typeof p5 !== 'undefined' && p5.prototype) {
  // Core permission functions
  p5.prototype.lockGestures = lockGestures;
  p5.prototype.enableGyroTap = enableGyroTap;
  p5.prototype.enableGyroButton = enableGyroButton;
  p5.prototype.enableMicTap = enableMicTap;
  p5.prototype.enableMicButton = enableMicButton;
  p5.prototype.enableSoundTap = enableSoundTap;
  p5.prototype.enableSoundButton = enableSoundButton;
  p5.prototype.enableSpeechTap = enableSpeechTap;
  p5.prototype.enableVibrationTap = enableVibrationTap;
  p5.prototype.enableVibrationButton = enableVibrationButton;
  p5.prototype.vibrate = vibrate;
  p5.prototype.stopVibration = stopVibration;
  p5.prototype.enableAllTap = enableAllTap;
  p5.prototype.enableAllButton = enableAllButton;
  
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