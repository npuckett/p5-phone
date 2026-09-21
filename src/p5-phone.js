/*!
 * p5-phone v1.14.0
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
window.cameraEnabled = false;
window.torchEnabled = false;
window.torchSupported = false;
window.torchActive = false;
window.torchError = '';
window.torchCapability = undefined;
window.nfcError = '';
window.nfcStatus = 'idle';
window.nfcTagAliases = {};
window.lastNfcMessage = null;
window.lastNfcSerialNumber = null;
window.lastNfcAlias = '';
window.bleSupported = false;
window.bleConnected = false;
window.bleStatus = 'idle';
window.bleError = '';
window.bleDeviceName = '';
window.bleValues = {};
window.shareSupported = false;
window.shareConnected = false;
window.shareStatus = 'idle'; // idle | connecting | connected | error | unsupported
window.shareError = '';
window.shareRoom = '';
window.shareClientId = '';
window.shareIsHost = false;
window.shared = {};
window.me = {};
window.guests = [];
window.geoEnabled = false;
window.geoStatus = 'idle'; // idle | requesting-permission | active | permission-denied | unsupported | secure-context-required | error | stopped
window.geoError = '';
window.lastGeoPosition = null;

// Internal state
let _micInstance = null;
let _nfcReader = null;
let _nfcAbortController = null;
let _geoWatchId = null;
// Coarse-by-default (battery-friendly, fast fix). Sketches opt into real GPS via
// setGeoOptions({ enableHighAccuracy: true }) BEFORE calling enableGeo*.
let _geoOpts = { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 };
let _torchStream = null;
let _torchTrack = null;
let _torchVideo = null;
let _bleDevice = null;
let _bleServer = null;
let _bleChars = {};
let _bleProfile = null;
let _bleReconnectTimer = null;
let _bleReconnectAttempt = 0;
let _bleReconnectStopped = false;
let _bleNotifyHandlers = {};
const _BLE_RECONNECT_DELAYS = [1500, 3000, 6000, 12000];
const _BLE_DEFAULT_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const _BLE_VALID_TYPES = new Set([
  'bool', 'int8', 'uint8', 'int16', 'uint16', 'int32', 'uint32',
  'float', 'double', 'string', 'bytes'
]);

// Share (PartyServer multi-user) internals
const _SHARE_PROTOCOL_VERSION = 1;
const _SHARE_RECONNECT_DELAYS = [1500, 3000, 6000, 12000];
let _shareProfile = null;
let _shareSocket = null;
let _shareReconnectTimer = null;
let _shareReconnectAttempt = 0;
let _shareReconnectStopped = false;
let _shareApplyingRemote = false;
let _shareSharedRoot = {};
let _shareMeRoot = {};
let _shareGuestsById = new Map();
let _shareReadySent = false;

const _gestureLockState = {
  locked: false,
  mode: null,
  target: null,
  listeners: [],
  historyTrapped: false,
  savedHandlers: {},
  appliedStyles: {}
};

function _resetGestureLockState() {
  _gestureLockState.locked = false;
  _gestureLockState.mode = null;
  _gestureLockState.target = null;
  _gestureLockState.listeners = [];
  _gestureLockState.historyTrapped = false;
  _gestureLockState.savedHandlers = {};
  _gestureLockState.appliedStyles = {};
}

function _addTrackedListener(node, type, handler, options) {
  node.addEventListener(type, handler, options);
  _gestureLockState.listeners.push({ node, type, handler, options });
}

function _isPermissionUIElement(target) {
  if (!target) return false;
  if (target.id === 'tapOverlay' ||
      target.closest('#tapOverlay') ||
      target.id === 'minimalOverlay' ||
      target.closest('#minimalOverlay') ||
      target.id === 'permissionButton' ||
      target.id === 'permissionStatus' ||
      target.closest('#permissionButton') ||
      target.closest('#permissionStatus')) {
    return true;
  }
  // Desktop QR panel close control.
  if (target.closest && target.closest('#p5phoneDesktopQr')) return true;
  return false;
}

// p5.js version detection (1.x vs 2.x) — evaluated at call time, not script load
function _getP5MajorVersion() {
  return (typeof p5 !== 'undefined' && p5.VERSION)
    ? parseInt(p5.VERSION.split('.')[0], 10)
    : 1;
}
function _isP5v2Runtime() {
  return _getP5MajorVersion() >= 2;
}
if (typeof p5 === 'undefined') {
  console.warn('p5-phone: load p5.js before p5-phone.js for correct version detection and prototype hooks.');
}

// =========================================
// DEVICE DETECTION (mobile vs desktop)
// =========================================

/**
 * Best-effort mobile-device detection. Used to gate desktop-only dev helpers
 * like showDesktopQr() so they never appear on a phone. Combines pointer type,
 * touch capability, and user-agent signals. Evaluated lazily and cached.
 * @returns {boolean}
 */
function _isMobileDevice() {
  if (window._p5phoneIsMobileCached !== undefined) return window._p5phoneIsMobileCached;
  let mobile = false;
  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    // Classic mobile UA tokens.
    if (/android|iphone|ipod|blackberry|iemobile|opera mini|mobile|windows phone/i.test(ua)) {
      mobile = true;
    }
    // iPadOS 13+ reports as Mac desktop UA but has touch.
    if (!mobile && /mac/i.test(ua) && navigator.maxTouchPoints > 1) {
      mobile = true;
    }
    // Coarse primary pointer (finger, not mouse).
    if (!mobile && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      mobile = true;
    }
    // Touch-only device with no fine pointer.
    if (!mobile && navigator.maxTouchPoints > 0 && window.matchMedia &&
        !window.matchMedia('(any-pointer: fine)').matches) {
      mobile = true;
    }
  } catch (e) {
    mobile = false;
  }
  window._p5phoneIsMobileCached = mobile;
  return mobile;
}

function _isDesktopDevice() {
  return !_isMobileDevice();
}

// =========================================
// DESKTOP QR — dev helper, desktop only
// =========================================

/**
 * Lazy-load qrcodejs (dqeefe/qrcodejs) from CDN, then render a QR pointing at
 * the current page into the given container element. Only ever called on
 * desktop, so mobile users never download the dependency.
 * @param {HTMLElement} container - element to render the QR into
 * @param {string} text - URL to encode
 * @param {number} size - pixel size of the QR
 * @param {function} [onFail] - called if the script cannot be loaded (CSP/offline)
 */
function _qrLazyLoadAndRender(container, text, size, onFail) {
  const QRCODE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

  const doRender = () => {
    if (typeof window.QRCode !== 'function') {
      if (onFail) onFail();
      return;
    }
    container.innerHTML = '';
    new window.QRCode(container, {
      text: text,
      width: size,
      height: size,
      colorDark: '#171717',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
    });
  };

  if (typeof window.QRCode !== 'function') {
    const script = document.createElement('script');
    script.src = QRCODE_SRC;
    script.async = true;
    script.onload = doRender;
    script.onerror = () => { if (onFail) onFail(); };
    document.head.appendChild(script);
  } else {
    doRender();
  }
}

let _qrState = null; // { panel, options } for the active desktop QR panel

/**
 * Show a floating QR code of the current page on DESKTOP ONLY.
 * On mobile this is a no-op (the QR would be useless — you're already on the
 * phone). Designed for the dev workflow of opening a sketch on desktop, then
 * scanning the QR to load it on a phone for testing.
 *
 * When Share has been configured via shareSetup(), the QR (and optionally the
 * address bar) include shareHost / room / app query params so phones join the
 * same PartyServer room without editing code. Opt out with { share: false }.
 *
 * @param {Object} [options]
 * @param {string} [options.url] - URL to encode (defaults to location.href, then share params may be merged)
 * @param {boolean} [options.share] - include Share join params (default: true when shareSetup() has run)
 * @param {boolean} [options.updateLocation=true] - when share params are included, replaceState the address bar so Copy Link works
 * @param {'top-right'|'top-left'|'bottom-right'|'bottom-left'} [options.position='top-right']
 * @param {number} [options.size=180] - QR pixel size
 * @param {string} [options.label] - caption under the QR (defaults based on share mode)
 * @param {boolean} [options.closable=true] - show a dismiss × (remembers for the session)
 * @param {boolean} [options.rememberDismiss=true] - keep it hidden after closing this browser session
 */
function showDesktopQr(options = {}) {
  // Core rule: never appear on a phone.
  if (_isMobileDevice()) {
    console.log('p5-phone: showDesktopQr() is hidden on mobile.');
    return;
  }

  const includeShare = options.share === true ||
    (options.share !== false && _shareProfile && _shareProfile.host);
  let url = options.url || (window.location ? window.location.href : '');
  if (includeShare && _shareProfile && _shareProfile.host) {
    url = getShareJoinUrl(url);
    if (options.updateLocation !== false) {
      _shareUpdateLocationFromProfile();
    }
  }

  const position = options.position || 'top-right';
  const size = typeof options.size === 'number' ? options.size : 180;
  const defaultLabel = includeShare
    ? 'Scan to join this shared room'
    : 'Scan to open on your phone';
  const label = options.label != null ? options.label : defaultLabel;
  const closable = options.closable !== false;
  const rememberDismiss = options.rememberDismiss !== false;

  if (rememberDismiss && window.sessionStorage &&
      sessionStorage.getItem('p5phone_qr_dismissed') === '1') {
    return;
  }

  // Replace any existing panel.
  hideDesktopQr();

  const panel = document.createElement('div');
  panel.id = 'p5phoneDesktopQr';
  panel.setAttribute('data-p5phone-role', 'permission-ui');

  const pos = { 'top-right': ['16px', '16px', 'auto', 'auto'],
                'top-left':  ['16px', 'auto', 'auto', '16px'],
                'bottom-right': ['auto', '16px', '16px', 'auto'],
                'bottom-left':  ['auto', 'auto', '16px', '16px'] };
  const sides = pos[position] || pos['top-right'];
  panel.style.cssText = `
    position: fixed;
    top: ${sides[0]};
    right: ${sides[1]};
    bottom: ${sides[2]};
    left: ${sides[3]};
    z-index: 1000000;
    background: #ffffff;
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
    max-width: ${size + 32}px;
  `;

  if (closable) {
    const close = document.createElement('div');
    close.textContent = '×';
    close.style.cssText = `
      position: absolute;
      top: 2px;
      right: 8px;
      font-size: 20px;
      line-height: 1;
      color: #666;
      cursor: pointer;
      pointer-events: auto;
    `;
    close.title = 'Hide QR for this session';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      hideDesktopQr();
      if (rememberDismiss && window.sessionStorage) {
        sessionStorage.setItem('p5phone_qr_dismissed', '1');
      }
    });
    panel.appendChild(close);
  }

  const qrBox = document.createElement('div');
  qrBox.style.cssText = `width: ${size}px; height: ${size}px;`;
  panel.appendChild(qrBox);

  if (label) {
    const caption = document.createElement('div');
    caption.textContent = label;
    caption.style.cssText = `
      margin-top: 8px;
      font-size: 11px;
      color: #444;
      text-align: center;
      max-width: ${size}px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    panel.appendChild(caption);
  }

  document.body.appendChild(panel);
  _qrState = { panel, options: Object.assign({}, options, { url: url, share: includeShare }) };

  _qrLazyLoadAndRender(qrBox, url, size, () => {
    // CDN blocked (CSP/offline) — remove the empty panel and warn.
    console.warn('p5-phone: could not load qrcodejs (CSP or offline). showDesktopQr() needs network access on desktop.');
    hideDesktopQr();
  });
}

/**
 * Update the URL of an already-visible desktop QR panel. No-op on mobile or
 * when no panel is showing (in which case it creates one).
 * @param {string} url
 */
function setQrUrl(url) {
  if (_isMobileDevice()) return;
  const size = (_qrState && _qrState.options && _qrState.options.size) || 180;
  if (!_qrState || !_qrState.panel || !document.getElementById('p5phoneDesktopQr')) {
    showDesktopQr({ url: url });
    return;
  }
  const qrBox = _qrState.panel.querySelector('div');
  if (!qrBox) return;
  _qrLazyLoadAndRender(qrBox, url, size, () => {
    console.warn('p5-phone: could not refresh QR (qrcodejs unavailable).');
  });
}

/**
 * Remove the desktop QR panel if present.
 */
function hideDesktopQr() {
  const panel = document.getElementById('p5phoneDesktopQr');
  if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  _qrState = null;
}

// =========================================
// PUBLIC API - CALL THESE FROM YOUR P5 SKETCH
// =========================================

/**
 * Lock mobile gestures to prevent browser interference
 * Call this in your setup() function
 * @param {Object} [options]
 * @param {'fullscreen'|'embedded'} [options.mode='fullscreen']
 * @param {HTMLElement} [options.element] - Canvas or container for embedded mode
 * @param {boolean} [options.warnBeforeLeave=false]
 * @param {boolean} [options.trapHistory] - Defaults to true in fullscreen mode
 */
function lockGestures(options = {}) {
  if (window.gesturesLocked) {
    unlockGestures();
  }

  const mode = options.mode === 'embedded' ? 'embedded' : 'fullscreen';
  const warnBeforeLeave = options.warnBeforeLeave === true;
  const trapHistory = options.trapHistory !== undefined
    ? options.trapHistory
    : mode === 'fullscreen';

  let target = options.element || null;
  if (mode === 'embedded') {
    if (!target) {
      target = document.querySelector('canvas');
    }
    if (!target) {
      console.warn('p5-phone: lockGestures embedded mode requires a canvas element. Falling back to document.');
      target = document;
    }
  }

  console.log(`🔒 Locking mobile gestures (${mode})...`);

  _gestureLockState.locked = true;
  _gestureLockState.mode = mode;
  _gestureLockState.target = target;

  if (mode === 'embedded') {
    _lockGesturesEmbedded(target);
  } else {
    _lockGesturesFullscreen({ warnBeforeLeave, trapHistory });
  }

  _initializeP5TouchOverrides();
  window.gesturesLocked = true;
  console.log('✅ Mobile gestures locked');
}

/**
 * Remove gesture blocking listeners and restore saved handlers
 */
function unlockGestures() {
  if (!_gestureLockState.locked && !window.gesturesLocked) return;

  _gestureLockState.listeners.forEach(({ node, type, handler, options }) => {
    node.removeEventListener(type, handler, options);
  });

  if (_gestureLockState.savedHandlers.onpopstate !== undefined) {
    window.onpopstate = _gestureLockState.savedHandlers.onpopstate;
  }

  if (_gestureLockState.savedHandlers.oncontextmenu !== undefined) {
    window.oncontextmenu = _gestureLockState.savedHandlers.oncontextmenu;
  }

  const saved = _gestureLockState.savedHandlers.p5Callbacks || {};
  if (saved.mousePressed !== undefined) window.mousePressed = saved.mousePressed;
  if (saved.mouseDragged !== undefined) window.mouseDragged = saved.mouseDragged;
  if (saved.mouseReleased !== undefined) window.mouseReleased = saved.mouseReleased;
  if (saved.touchStarted !== undefined) window.touchStarted = saved.touchStarted;
  if (saved.touchMoved !== undefined) window.touchMoved = saved.touchMoved;
  if (saved.touchEnded !== undefined) window.touchEnded = saved.touchEnded;

  if (_gestureLockState.target && _gestureLockState.appliedStyles.touchAction !== undefined) {
    _gestureLockState.target.style.touchAction = _gestureLockState.appliedStyles.touchAction;
  }

  _resetGestureLockState();
  window.gesturesLocked = false;
  console.log('🔓 Mobile gestures unlocked');
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
 * Enable camera torch/flashlight with a button interface.
 * Starts the rear camera stream required for torch control.
 * Note: Torch is Android Chrome-oriented and requires HTTPS.
 */
function enableTorchButton(buttonText = 'ENABLE FLASHLIGHT', statusText = 'Starting flashlight...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via button');
  });
}

/**
 * Enable camera torch/flashlight with tap-to-start.
 * Starts the rear camera stream required for torch control.
 */
function enableTorchTap(message = 'Tap screen to enable flashlight') {
  _createTapToEnable(message, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via tap');
  });
}

const enableFlashlightButton = enableTorchButton;
const enableFlashlightTap = enableTorchTap;

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
 * Enable GPS/geolocation with a button interface
 * Creates a start button that user must click
 * Works on iOS Safari and Android Chrome (HTTPS required)
 */
function enableGeoButton(buttonText = 'ENABLE LOCATION', statusText = 'Enabling GPS...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via button');
  });
}

/**
 * Enable GPS/geolocation with tap-to-start
 * User taps anywhere on screen to enable
 * Works on iOS Safari and Android Chrome (HTTPS required)
 */
function enableGeoTap(message = 'Tap screen to enable GPS') {
  _createTapToEnable(message, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via tap');
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

/**
 * Enable any combination of hardware permissions with tap-to-start.
 * @param {string|string[]} permissions - e.g. ['sensors', 'mic', 'camera']
 * @param {string} message - Tap overlay message
 */
function enablePermissionsTap(permissions, message = 'Tap screen to enable hardware') {
  _createTapToEnable(message, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via tap:', enabledPermissions);
  });
}

/**
 * Enable any combination of hardware permissions with a button interface.
 * @param {string|string[]} permissions - e.g. ['sensors', 'mic', 'camera']
 * @param {string} buttonText - Button label
 * @param {string} statusText - Status text shown while enabling
 */
function enablePermissionsButton(permissions, buttonText = 'ENABLE HARDWARE', statusText = 'Requesting permissions...') {
  _createPermissionButton(buttonText, statusText, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via button:', enabledPermissions);
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
 * Enable torch/flashlight on first canvas touch
 */
function enableTorchCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via canvas touch');
  });
}

const enableFlashlightCanvas = enableTorchCanvas;

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
 * Enable GPS/geolocation on first canvas touch
 */
function enableGeoCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via canvas touch');
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

/**
 * Enable any combination of hardware permissions on first canvas touch.
 */
function enablePermissionsCanvas(permissions, message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via canvas touch:', enabledPermissions);
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

function enableTorchBanner(message = 'Tap to enable flashlight', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via banner');
  });
}

const enableFlashlightBanner = enableTorchBanner;

function enableNfcBanner(message = 'Tap to enable NFC', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via banner');
  });
}

function enableGeoBanner(message = 'Tap to enable GPS', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via banner');
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

function enablePermissionsBanner(permissions, message = 'Tap to enable hardware', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via banner:', enabledPermissions);
  });
}

// =========================================
// MINIMAL UI — enableXxxMinimal()
// A bare semi-transparent full-screen overlay with an optional radiating
// circular icon. Less chrome than the Tap frosted message box.
// Call forms:
//   enableXxxMinimal(message)
//   enableXxxMinimal({ color, opacity, icon, iconColor, iconSize, message })
//   enableXxxMinimal(message, { opacity, icon, ... })
// =========================================

/**
 * Enable gyroscope with the minimal overlay
 * @param {string|Object} [messageOrOpts] - Message string or options object
 * @param {Object} [options] - { color, opacity, icon, iconColor, iconSize }
 */
function enableGyroMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via minimal overlay');
  });
}

function enableMicMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via minimal overlay');
  });
}

function enableSoundMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via minimal overlay');
  });
}

function enableSpeechMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via minimal overlay');
  });
}

function enableVibrationMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via minimal overlay');
  });
}

function enableTorchMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via minimal overlay');
  });
}

const enableFlashlightMinimal = enableTorchMinimal;

function enableNfcMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via minimal overlay');
  });
}

function enableGeoMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via minimal overlay');
  });
}

function enableAllMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via minimal overlay');
  });
}

function enableCameraMinimal(messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via minimal overlay');
  });
}

function enableBleMinimal(options = {}) {
  const message = options.label || options.message;
  _createMinimalToEnable(message, options, () => {
    _bleConnectFromUI('minimal');
  });
}

/**
 * Enable any combination of hardware permissions with the minimal overlay.
 * @param {string|string[]} permissions - e.g. ['sensors', 'mic', 'camera']
 * @param {string|Object} [messageOrOpts] - Message string or options object
 * @param {Object} [options] - { color, opacity, icon, iconColor, iconSize }
 */
function enablePermissionsMinimal(permissions, messageOrOpts, options) {
  _createMinimalToEnable(messageOrOpts, options, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via minimal overlay:', enabledPermissions);
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

function enableTorchOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via custom element');
  });
}

const enableFlashlightOn = enableTorchOn;

function enableNfcOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via custom element');
  });
}

function enableGeoOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via custom element');
  });
}

function _bleConnectFromUI(source) {
  if (!_bleProfile) {
    debugWarn('Call bleSetup() in setup() before connecting.');
    return;
  }
  bleConnect().then(() => {
    console.log('✅ BLE connect initiated via ' + source);
  }).catch(() => {});
}

function enableBleButton(options = {}) {
  const label = options.label || 'Connect device';
  const status = options.statusText || 'Connecting...';
  _createPermissionButton(label, status, () => {
    _bleConnectFromUI('button');
  });
}

function enableBleTap(options = {}) {
  const message = options.label || options.message || 'Tap to connect Bluetooth device';
  _createTapToEnable(message, () => {
    _bleConnectFromUI('tap');
  });
}

function enableBleCanvas(options = {}) {
  const message = options.label || options.message || 'Touch to connect';
  _createCanvasToEnable(message, () => {
    _bleConnectFromUI('canvas');
  });
}

function enableBleBanner(options = {}) {
  const message = options.label || options.message || 'Tap to connect Bluetooth';
  const position = options.position || 'top';
  _createBannerToEnable(message, position, () => {
    _bleConnectFromUI('banner');
  });
}

function enableBleOn(selector) {
  _bindPermissionTo(selector, () => {
    _bleConnectFromUI('custom element');
  });
}

function _shareConnectFromUI(source) {
  if (!_shareProfile) {
    debugWarn('Call shareSetup() in setup() before connecting.');
    return;
  }
  shareConnect().then(() => {
    console.log('✅ Share connect initiated via ' + source);
  }).catch(() => {});
}

function enableShareButton(options = {}) {
  const label = options.label || 'Join room';
  const status = options.statusText || 'Connecting...';
  _createPermissionButton(label, status, () => {
    _shareConnectFromUI('button');
  });
}

function enableShareTap(options = {}) {
  const message = options.label || options.message || 'Tap to join shared room';
  _createTapToEnable(message, () => {
    _shareConnectFromUI('tap');
  });
}

function enableShareCanvas(options = {}) {
  const message = options.label || options.message || 'Touch to join room';
  _createCanvasToEnable(message, () => {
    _shareConnectFromUI('canvas');
  });
}

function enableShareBanner(options = {}) {
  const message = options.label || options.message || 'Tap to join shared room';
  const position = options.position || 'top';
  _createBannerToEnable(message, position, () => {
    _shareConnectFromUI('banner');
  });
}

function enableShareMinimal(options = {}) {
  const message = options.label || options.message;
  _createMinimalToEnable(message, options, () => {
    _shareConnectFromUI('minimal');
  });
}

function enableShareOn(selector) {
  _bindPermissionTo(selector, () => {
    _shareConnectFromUI('custom element');
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

function enablePermissionsOn(selector, permissions) {
  _bindPermissionTo(selector, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via custom element:', enabledPermissions);
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
 * Check whether the current torch stream reports controllable torch support.
 * Some Android browsers may not report support even when setTorch() works.
 */
function isTorchSupported() {
  return !!window.torchSupported;
}

/**
 * Set camera torch/flashlight state.
 * Starts a rear camera stream if one is not already active.
 * @param {boolean} enabled - true to turn on, false to turn off
 * @returns {Promise<boolean>} true when the browser accepts the torch request
 */
async function setTorch(enabled) {
  try {
    window.torchError = '';

    if (!_torchTrack || _torchTrack.readyState !== 'live') {
      await _requestTorchPermissionCore();
    }

    if (!_torchTrack || _torchTrack.readyState !== 'live') {
      window.torchError = 'No live rear camera track is available for torch control.';
      return false;
    }

    await _torchTrack.applyConstraints({ advanced: [{ torch: !!enabled }] });
    window.torchActive = !!enabled;
    _refreshTorchState();
    return true;
  } catch (error) {
    window.torchError = error && error.message ? error.message : String(error);
    console.warn('⚠️ Torch control failed:', error);
    if (_debugVisible) {
      debugWarn('Torch control failed: ' + window.torchError);
    }
    return false;
  }
}

function torchOn() {
  return setTorch(true);
}

function torchOff() {
  return setTorch(false);
}

function toggleTorch() {
  return setTorch(!window.torchActive);
}

const flashlightOn = torchOn;
const flashlightOff = torchOff;
const toggleFlashlight = toggleTorch;
const setFlashlight = setTorch;

/**
 * Turn the torch off and release the internal camera stream.
 */
async function stopTorch() {
  if (_torchTrack && _torchTrack.readyState === 'live') {
    try {
      await _torchTrack.applyConstraints({ advanced: [{ torch: false }] });
    } catch (error) {
      window.torchError = error && error.message ? error.message : String(error);
    }
  }

  if (_torchStream) {
    _torchStream.getTracks().forEach(track => track.stop());
  }

  if (_torchVideo) {
    _torchVideo.pause();
    _torchVideo.srcObject = null;
  }

  _torchStream = null;
  _torchTrack = null;
  _torchVideo = null;
  window.torchEnabled = false;
  window.torchSupported = false;
  window.torchActive = false;
  window.torchCapability = undefined;
}

const stopFlashlight = stopTorch;

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

// =========================================
// GPS / GEOLOCATION (navigator.geolocation)
// Cross-platform (iOS Safari + Android Chrome). HTTPS required.
// Coarse-by-default; opt into real GPS via setGeoOptions({ enableHighAccuracy: true }).
// =========================================

/**
 * Stop GPS watch and release the position subscription.
 */
function stopGeo() {
  if (_geoWatchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try { navigator.geolocation.clearWatch(_geoWatchId); } catch (e) { /* ignore */ }
  }
  _geoWatchId = null;
  window.geoEnabled = false;
  window.geoStatus = 'stopped';
  console.log('GPS watch stopped');
}

/**
 * Update GPS options. Call BEFORE enableGeo* for the options to apply.
 * Defaults: { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 }
 * Set enableHighAccuracy: true for real GPS (~5-10m outdoors, slower cold start, more battery).
 */
function setGeoOptions(opts) {
  if (opts && typeof opts === 'object') {
    if (typeof opts.enableHighAccuracy === 'boolean') _geoOpts.enableHighAccuracy = opts.enableHighAccuracy;
    if (typeof opts.timeout === 'number') _geoOpts.timeout = opts.timeout;
    if (typeof opts.maximumAge === 'number') _geoOpts.maximumAge = opts.maximumAge;
  }
  return _geoOpts;
}

/**
 * Return the most recent normalized position synchronously, or null.
 * Read this in draw() — position updates arrive via the geoRead() callback.
 */
function getGeoPosition() {
  return window.lastGeoPosition;
}

/**
 * Great-circle distance between two lat/lon points (Haversine).
 * units: 'm' (meters, default), 'km', or 'mi'.
 * Assumes a spherical earth (error < 0.3% vs WGS84 — fine for creative use).
 */
function geoDistance(lat1, lon1, lat2, lon2, units) {
  const R = units === 'km' ? 6371 : (units === 'mi' ? 3959 : 6371000);
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Point-in-geofence test via ray casting (pnpoly).
 * polygon: array of { lat, lon } vertices (first vertex need not repeat).
 * point: { lat, lon }.
 * Planar approximation — accurate for typical geo-fence sizes.
 */
function geoInPolygon(polygon, point) {
  if (!Array.isArray(polygon) || polygon.length < 3 || !point) return false;
  const px = point.lon;
  const py = point.lat;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-15) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Normalize a GeolocationPosition DOM object into a plain object that sketches
 * can read synchronously and serialize safely.
 */
function _normalizeGeoPosition(position) {
  const c = position.coords;
  return {
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy: c.accuracy,
    altitude: c.altitude,
    altitudeAccuracy: c.altitudeAccuracy,
    heading: c.heading,
    speed: c.speed,
    timestamp: position.timestamp
  };
}

function _handleGeoPosition(position) {
  const normalized = _normalizeGeoPosition(position);
  window.lastGeoPosition = normalized;
  window.geoStatus = 'active';
  window.geoError = '';
  window.geoEnabled = true;
  if (typeof geoRead === 'function') {
    try { geoRead(normalized); } catch (e) { console.error('geoRead callback error:', e); }
  }
  if (_debugVisible) {
    debug('GPS: ' + normalized.latitude.toFixed(5) + ', ' + normalized.longitude.toFixed(5) + ' ±' + Math.round(normalized.accuracy) + 'm');
  }
}

function _handleGeoError(error, isStream) {
  // PositionError.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  if (error && error.code === 1) {
    window.geoStatus = 'permission-denied';
    window.geoError = 'Location permission denied. Check browser site settings and OS-level Location Services (iOS: Settings → Privacy & Security → Location Services → Safari; Android: Settings → Location).';
    if (_debugVisible) debugWarn('GPS permission denied');
  } else if (error && error.code === 3) {
    // Timeouts are often transient (cold start, indoor use). Don't flip to a hard
    // error status if the watch is already active and we have a last position.
    if (!window.lastGeoPosition) {
      window.geoStatus = 'error';
      window.geoError = 'GPS timeout. Cold start can take 5-30s — try again, preferably outdoors.';
    }
    if (_debugVisible) debugWarn('GPS timeout (cold start can take 5-30s)');
  } else {
    window.geoStatus = 'error';
    window.geoError = (error && error.message)
      ? 'Location unavailable: ' + error.message + '. Move outdoors or retry.'
      : 'Location unavailable. Move outdoors or retry.';
    if (_debugVisible) debugWarn('GPS error: ' + (error && error.message ? error.message : 'unavailable'));
  }
  if (error && error.code !== 3) {
    window.geoEnabled = false;
  }
  if (typeof onGeoError === 'function') {
    try { onGeoError(error); } catch (e) { console.error('onGeoError callback error:', e); }
  }
}

async function _requestGeoPermissionCore() {
  try {
    if (window.geoEnabled && _geoWatchId !== null) {
      return true;
    }
    window.geoError = '';

    // Secure context (HTTPS or localhost) is mandatory.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      console.warn('⚠️ GPS requires HTTPS (or localhost). Blocked on insecure origins.');
      window.geoEnabled = false;
      window.geoStatus = 'secure-context-required';
      window.geoError = 'GPS requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.';
      if (_debugVisible) debugWarn('GPS requires HTTPS');
      return false;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.warn('⚠️ Geolocation API not supported on this device/browser');
      window.geoEnabled = false;
      window.geoStatus = 'unsupported';
      window.geoError = 'Geolocation is not supported in this browser.';
      if (_debugVisible) debugWarn('Geolocation not supported');
      return false;
    }

    window.geoStatus = 'requesting-permission';

    // Trigger the permission prompt from this user gesture with a one-shot call.
    // More predictable across iOS/Android than relying on watchPosition to prompt.
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, _geoOpts);
    }).then(_handleGeoPosition, (err) => { throw err; });

    // Permission granted — start the continuous watch.
    _geoWatchId = navigator.geolocation.watchPosition(_handleGeoPosition, (err) => {
      _handleGeoError(err, true);
    }, _geoOpts);

    console.log('✅ GPS watch active');
    return true;

  } catch (error) {
    _handleGeoError(error, false);
    return false;
  }
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

async function _requestTorchPermissionCore() {
  try {
    window.torchError = '';

    if (_torchTrack && _torchTrack.readyState === 'live') {
      _refreshTorchState();
      return true;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.torchError = 'getUserMedia is not available in this browser.';
      window.torchEnabled = false;
      return false;
    }

    _torchStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    _torchTrack = _torchStream.getVideoTracks()[0] || null;
    if (!_torchTrack) {
      window.torchError = 'No video track was returned for torch control.';
      window.torchEnabled = false;
      return false;
    }

    _torchVideo = document.createElement('video');
    _torchVideo.muted = true;
    _torchVideo.autoplay = true;
    _torchVideo.playsInline = true;
    _torchVideo.srcObject = _torchStream;

    try {
      await _torchVideo.play();
    } catch (error) {
      console.warn('p5-phone: Torch video preview could not play, continuing with live track.', error);
    }

    _refreshTorchState();
    window.torchEnabled = _torchTrack.readyState === 'live';
    console.log('✅ Torch camera stream ready');
    return window.torchEnabled;
  } catch (error) {
    window.torchError = error && error.message ? error.message : String(error);
    console.error('Torch permission error:', error);
    if (_debugVisible) {
      debugError('Torch permission error:', error);
    }
    await stopTorch();
    return false;
  }
}

function _refreshTorchState() {
  window.torchSupported = false;
  window.torchCapability = undefined;

  if (!_torchTrack || _torchTrack.readyState !== 'live') {
    window.torchEnabled = false;
    window.torchActive = false;
    return;
  }

  window.torchEnabled = true;

  if (_torchTrack.getCapabilities) {
    try {
      const capabilities = _torchTrack.getCapabilities();
      window.torchCapability = capabilities ? capabilities.torch : undefined;
      window.torchSupported = _canControlTorch(window.torchCapability);
    } catch (error) {
      window.torchError = error && error.message ? error.message : String(error);
    }
  }

  if (_torchTrack.getSettings) {
    try {
      const settings = _torchTrack.getSettings();
      if (typeof settings.torch === 'boolean') {
        window.torchActive = settings.torch;
      }
    } catch (error) {
      window.torchError = error && error.message ? error.message : String(error);
    }
  }
}

function _canControlTorch(value) {
  if (Array.isArray(value)) {
    return value.includes(true) && value.includes(false);
  }

  return value === true;
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

// =========================================
// BLUETOOTH LOW ENERGY (Web Bluetooth)
// Typed characteristics, little-endian wire format.
// Call bleSetup() in setup(); connect via enableBle* or bleConnect() from a user gesture.
// =========================================

function _bleDeriveUUID(serviceUUID, index) {
  const normalized = String(serviceUUID).toLowerCase();
  const parts = normalized.split('-');
  if (parts.length !== 5 || parts[0].length < 4) {
    return normalized;
  }
  parts[0] = parts[0].slice(0, -4) + index.toString(16).padStart(4, '0');
  return parts.join('-');
}

function isBleSupported() {
  if (window.isSecureContext === false) {
    window.bleSupported = false;
    window.bleStatus = 'unsupported';
    window.bleError = 'Web Bluetooth requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.';
    return false;
  }

  if (!('bluetooth' in navigator)) {
    window.bleSupported = false;
    window.bleStatus = 'unsupported';
    window.bleError =
      'Web Bluetooth is unavailable. Use Chrome/Edge on desktop or Chrome on Android, ' +
      'over HTTPS. On iPhone/iPad, install the free "Bluefy" browser app and open this ' +
      'page there.';
    return false;
  }

  window.bleSupported = true;
  if (window.bleStatus === 'unsupported') {
    window.bleStatus = 'idle';
    window.bleError = '';
  }
  return true;
}

function bleSetup(config) {
  if (!config || !Array.isArray(config.characteristics) || config.characteristics.length === 0) {
    debugError('bleSetup() requires a characteristics array with at least one entry.');
    return false;
  }

  const serviceUUID = (config.serviceUUID || _BLE_DEFAULT_SERVICE_UUID).toLowerCase();
  const characteristics = [];
  const seenNames = new Set();

  const uuidParts = serviceUUID.split('-');
  if (uuidParts.length !== 5 || uuidParts[0].length < 4) {
    debugWarn('bleSetup(): serviceUUID should be a hyphenated 128-bit UUID; auto-derivation requires that format.');
  }

  for (let i = 0; i < config.characteristics.length; i++) {
    const entry = config.characteristics[i];
    const name = entry && entry.name;
    const type = entry && entry.type;

    if (!name || typeof name !== 'string') {
      debugError('bleSetup(): each characteristic needs a name string.');
      return false;
    }
    if (seenNames.has(name)) {
      debugError('bleSetup(): duplicate characteristic name "' + name + '".');
      return false;
    }
    seenNames.add(name);
    if (!_BLE_VALID_TYPES.has(type)) {
      debugError('bleSetup(): unknown type "' + type + '" for "' + name + '".');
      return false;
    }
    if (!entry.read && !entry.write && !entry.notify) {
      debugError('bleSetup(): characteristic "' + name + '" needs read, write, and/or notify.');
      return false;
    }
    if (entry.read && !entry.write && !entry.notify) {
      debugWarn('bleSetup(): "' + name + '" is read-only; call bleRead("' + name + '") to poll values.');
    }

    characteristics.push({
      name: name,
      uuid: (entry.uuid || _bleDeriveUUID(serviceUUID, i + 1)).toLowerCase(),
      type: type,
      read: !!entry.read,
      write: !!entry.write,
      notify: !!entry.notify
    });
  }

  _bleProfile = {
    serviceUUID: serviceUUID,
    namePrefix: config.namePrefix || '',
    autoReconnect: config.autoReconnect === true,
    characteristics: characteristics
  };

  window.bleValues = {};
  window.bleStatus = isBleSupported() ? 'idle' : 'unsupported';
  debug('BLE profile ready: ' + characteristics.length + ' characteristic(s)');
  return true;
}

function _bleEncode(type, value) {
  let view;
  switch (type) {
    case 'bool':
      view = new DataView(new ArrayBuffer(1));
      view.setUint8(0, value ? 1 : 0);
      return view.buffer;
    case 'int8':
      view = new DataView(new ArrayBuffer(1));
      view.setInt8(0, value);
      return view.buffer;
    case 'uint8':
      view = new DataView(new ArrayBuffer(1));
      view.setUint8(0, value);
      return view.buffer;
    case 'int16':
      view = new DataView(new ArrayBuffer(2));
      view.setInt16(0, value, true);
      return view.buffer;
    case 'uint16':
      view = new DataView(new ArrayBuffer(2));
      view.setUint16(0, value, true);
      return view.buffer;
    case 'int32':
      view = new DataView(new ArrayBuffer(4));
      view.setInt32(0, value, true);
      return view.buffer;
    case 'uint32':
      view = new DataView(new ArrayBuffer(4));
      view.setUint32(0, value, true);
      return view.buffer;
    case 'float':
      view = new DataView(new ArrayBuffer(4));
      view.setFloat32(0, value, true);
      return view.buffer;
    case 'double':
      view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0, value, true);
      return view.buffer;
    case 'string':
      return new TextEncoder().encode(String(value));
    case 'bytes':
      if (value instanceof ArrayBuffer) return value;
      if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      return value;
    default:
      return new ArrayBuffer(0);
  }
}

function _bleDecode(type, dataView) {
  switch (type) {
    case 'bool':
      return dataView.getUint8(0) !== 0;
    case 'int8':
      return dataView.getInt8(0);
    case 'uint8':
      return dataView.getUint8(0);
    case 'int16':
      return dataView.getInt16(0, true);
    case 'uint16':
      return dataView.getUint16(0, true);
    case 'int32':
      return dataView.getInt32(0, true);
    case 'uint32':
      return dataView.getUint32(0, true);
    case 'float':
      return dataView.getFloat32(0, true);
    case 'double':
      return dataView.getFloat64(0, true);
    case 'string': {
      const decoded = new TextDecoder().decode(dataView);
      if (decoded.length > 20) {
        debugWarn('BLE notified string exceeds 20 bytes; phase 1 may truncate or miss data.');
      }
      return decoded;
    }
    case 'bytes':
      return new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    default:
      return undefined;
  }
}

function _bleHandleNotify(name, type, event) {
  const value = _bleDecode(type, event.target.value);
  window.bleValues[name] = value;
  debug('BLE ' + name + ' = ' + value);
  if (typeof bleReceive === 'function') {
    bleReceive(name, value);
  }
}

function _bleDetachNotificationListeners() {
  for (const name in _bleNotifyHandlers) {
    const entry = _bleNotifyHandlers[name];
    if (entry && entry.ch && entry.handler) {
      entry.ch.removeEventListener('characteristicvaluechanged', entry.handler);
    }
  }
  _bleNotifyHandlers = {};
}

async function _bleAttachCharacteristics(service) {
  _bleDetachNotificationListeners();
  _bleChars = {};
  for (const c of _bleProfile.characteristics) {
    const ch = await service.getCharacteristic(c.uuid);
    _bleChars[c.name] = { ch: ch, type: c.type };
    if (c.notify) {
      await ch.startNotifications();
      const handler = (e) => {
        _bleHandleNotify(c.name, c.type, e);
      };
      ch.addEventListener('characteristicvaluechanged', handler);
      _bleNotifyHandlers[c.name] = { ch: ch, handler: handler };
    }
  }
}

function _bleScheduleReconnect() {
  if (!_bleProfile || !_bleProfile.autoReconnect || !_bleDevice || _bleReconnectStopped) {
    return;
  }
  if (_bleReconnectTimer) {
    clearTimeout(_bleReconnectTimer);
  }
  const delay = _BLE_RECONNECT_DELAYS[
    Math.min(_bleReconnectAttempt, _BLE_RECONNECT_DELAYS.length - 1)
  ];
  _bleReconnectTimer = setTimeout(async () => {
    _bleReconnectTimer = null;
    if (!_bleDevice || !_bleDevice.gatt || _bleReconnectStopped) {
      return;
    }
    try {
      window.bleStatus = 'connecting';
      _bleServer = await _bleDevice.gatt.connect();
      const service = await _bleServer.getPrimaryService(_bleProfile.serviceUUID);
      await _bleAttachCharacteristics(service);
      window.bleConnected = true;
      window.bleStatus = 'connected';
      _bleReconnectAttempt = 0;
      debug('BLE reconnected: ' + (window.bleDeviceName || 'device'));
      if (typeof bleReady === 'function') {
        bleReady(window.bleDeviceName);
      }
    } catch (e) {
      _bleReconnectAttempt++;
      window.bleStatus = 'disconnected';
      debugWarn('BLE auto-reconnect failed (attempt ' + _bleReconnectAttempt + ')');
      _bleScheduleReconnect();
    }
  }, delay);
}

async function bleConnect() {
  if (!isBleSupported()) {
    debugError(window.bleError || 'Web Bluetooth is not supported.');
    return false;
  }
  if (!_bleProfile) {
    debugError('Call bleSetup() in setup() before bleConnect().');
    return false;
  }

  try {
    if (navigator.bluetooth.getAvailability) {
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        window.bleStatus = 'error';
        window.bleError = 'Bluetooth adapter is unavailable or powered off.';
        debugError(window.bleError);
        return false;
      }
    }

    window.bleStatus = 'requesting';
    window.bleError = '';

    const filters = _bleProfile.namePrefix
      ? [{ namePrefix: _bleProfile.namePrefix, services: [_bleProfile.serviceUUID] }]
      : [{ services: [_bleProfile.serviceUUID] }];

    _bleDevice = await navigator.bluetooth.requestDevice({
      filters: filters,
      optionalServices: [_bleProfile.serviceUUID]
    });

    _bleDevice.addEventListener('gattserverdisconnected', _bleOnDisconnected);

    window.bleStatus = 'connecting';
    _bleServer = await _bleDevice.gatt.connect();
    const service = await _bleServer.getPrimaryService(_bleProfile.serviceUUID);
    await _bleAttachCharacteristics(service);

    window.bleConnected = true;
    window.bleStatus = 'connected';
    window.bleDeviceName = _bleDevice.name || 'device';
    _bleReconnectStopped = false;
    _bleReconnectAttempt = 0;
    debug('BLE connected: ' + window.bleDeviceName);
    if (typeof bleReady === 'function') {
      bleReady(window.bleDeviceName);
    }
    return true;
  } catch (err) {
    if (err.name === 'NotFoundError') {
      window.bleStatus = 'idle';
      window.bleError = '';
      debug('BLE device picker cancelled.');
      return false;
    }
    window.bleStatus = 'error';
    window.bleConnected = false;
    window.bleError = err && err.message ? err.message : 'BLE connect failed.';
    debugError('BLE connect failed: ' + window.bleError);
    return false;
  }
}

function _bleOnDisconnected() {
  window.bleConnected = false;
  window.bleStatus = 'disconnected';
  _bleServer = null;
  _bleDetachNotificationListeners();
  _bleChars = {};
  debugWarn('BLE disconnected');
  if (typeof bleClosed === 'function') {
    bleClosed();
  }

  if (_bleProfile && _bleProfile.autoReconnect && _bleDevice && !_bleReconnectStopped) {
    _bleScheduleReconnect();
  }
}

function bleDisconnect() {
  _bleReconnectStopped = true;
  _bleReconnectAttempt = 0;
  if (_bleReconnectTimer) {
    clearTimeout(_bleReconnectTimer);
    _bleReconnectTimer = null;
  }
  if (_bleDevice && _bleDevice.gatt && _bleDevice.gatt.connected) {
    _bleDevice.gatt.disconnect();
  }
  window.bleConnected = false;
  window.bleStatus = 'idle';
  _bleServer = null;
  _bleDetachNotificationListeners();
  _bleChars = {};
  debug('BLE disconnected by sketch');
}

async function bleRead(name) {
  const entry = _bleChars[name];
  if (!entry) {
    debugError('BLE no characteristic named "' + name + '"');
    return undefined;
  }
  const profileEntry = _bleProfile && _bleProfile.characteristics.find((c) => c.name === name);
  if (!profileEntry || !profileEntry.read) {
    debugError('BLE characteristic "' + name + '" is not declared with read: true');
    return undefined;
  }
  try {
    const dataView = await entry.ch.readValue();
    const value = _bleDecode(entry.type, dataView);
    window.bleValues[name] = value;
    debug('BLE read ' + name + ' = ' + value);
    if (typeof bleReceive === 'function') {
      bleReceive(name, value);
    }
    return value;
  } catch (err) {
    debugError('BLE read "' + name + '" failed: ' + (err && err.message ? err.message : err));
    return undefined;
  }
}

async function bleWrite(name, value, opts = {}) {
  const entry = _bleChars[name];
  if (!entry) {
    debugError('BLE no characteristic named "' + name + '"');
    return false;
  }
  if (entry.type === 'string') {
    const byteLength = new TextEncoder().encode(String(value)).byteLength;
    if (byteLength > 20) {
      debugWarn('BLE write string exceeds 20 bytes; many peripherals truncate without MTU negotiation.');
    }
  }
  const data = _bleEncode(entry.type, value);
  try {
    if (opts.ack === false) {
      await entry.ch.writeValueWithoutResponse(data);
    } else {
      await entry.ch.writeValueWithResponse(data);
    }
    return true;
  } catch (err) {
    debugError('BLE write "' + name + '" failed: ' + (err && err.message ? err.message : err));
    return false;
  }
}

// =========================================
// SHARE (PartyServer multi-user shared state)
// Call shareSetup() in setup(); connect via enableShare* or shareConnect() from a user gesture.
// Mutate shared / me like plain objects; read guests in draw().
// =========================================

function _shareIsJsonSerializable(value, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 32) return false;
  if (value === null) return true;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return true;
  if (t === 'number') return Number.isFinite(value);
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') return false;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!_shareIsJsonSerializable(value[i], depth + 1)) return false;
    }
    return true;
  }
  if (t === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return false;
    }
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      if (!_shareIsJsonSerializable(value[keys[i]], depth + 1)) return false;
    }
    return true;
  }
  return false;
}

function _shareCloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function _shareParsePath(path) {
  if (typeof path !== 'string' || path.length === 0) return [];
  return path.split('.').filter(function(p) { return p.length > 0; });
}

function _shareGetAtPath(obj, path) {
  const parts = _shareParsePath(path);
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function _shareApplyPatchInPlace(obj, path, value) {
  const parts = _shareParsePath(path);
  if (parts.length === 0) return false;

  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = cur[part];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      const created = {};
      cur[part] = created;
      cur = created;
    } else {
      cur = next;
    }
  }

  const leaf = parts[parts.length - 1];
  if (value === undefined) {
    delete cur[leaf];
  } else {
    cur[leaf] = value;
  }
  return true;
}

function _shareRoomKey(app, room) {
  const a = (app && String(app).trim()) || 'default';
  const r = (room && String(room).trim()) || 'main';
  return a + ':' + r;
}

/**
 * Read Share join params from the page URL.
 * Accepts: shareHost (or host), shareRoom (or room), shareApp (or app).
 * URL values are intended for workshop link sharing.
 */
function _shareReadUrlParams(search) {
  const out = {};
  if (typeof search !== 'string') {
    if (typeof window === 'undefined' || !window.location) return out;
    search = window.location.search || '';
  }
  let params;
  try {
    params = new URLSearchParams(search.charAt(0) === '?' ? search.slice(1) : search);
  } catch (e) {
    return out;
  }
  const host = params.get('shareHost') || params.get('host');
  const room = params.get('shareRoom') || params.get('room');
  const app = params.get('shareApp') || params.get('app');
  if (host) out.host = String(host).trim();
  if (room) out.room = String(room).trim();
  if (app) out.app = String(app).trim();
  return out;
}

/**
 * Build a sketch URL that carries Share join params so phones need no code edits.
 * @param {string} [baseUrl]
 * @param {{host?: string, room?: string, app?: string}} [profile]
 * @returns {string}
 */
function _shareBuildJoinUrl(baseUrl, profile) {
  const base = baseUrl || (typeof window !== 'undefined' && window.location ? window.location.href : '');
  if (!base) return '';
  let url;
  try {
    url = new URL(base, typeof window !== 'undefined' ? window.location.href : undefined);
  } catch (e) {
    return base;
  }
  const host = profile && profile.host;
  const room = profile && profile.room;
  const app = profile && profile.app;
  if (host) {
    url.searchParams.set('shareHost', String(host).replace(/\/$/, ''));
  }
  if (room) {
    url.searchParams.set('room', String(room));
  }
  if (app && app !== 'default') {
    url.searchParams.set('app', String(app));
  } else {
    url.searchParams.delete('app');
    url.searchParams.delete('shareApp');
  }
  // Prefer canonical names; drop aliases that could confuse scanners.
  url.searchParams.delete('host');
  url.searchParams.delete('shareRoom');
  url.searchParams.delete('shareApp');
  return url.toString();
}

/**
 * Return the current page URL with shareHost / room / app query params from
 * the active shareSetup() profile (or from an explicit profile object).
 */
function getShareJoinUrl(baseUrl, profile) {
  const p = profile || _shareProfile;
  if (!p || !p.host) {
    return baseUrl || (typeof window !== 'undefined' && window.location ? window.location.href : '');
  }
  return _shareBuildJoinUrl(baseUrl, p);
}

function _shareUpdateLocationFromProfile() {
  if (!_shareProfile || !_shareProfile.host) return;
  if (typeof window === 'undefined' || !window.location || !window.history || !window.history.replaceState) {
    return;
  }
  const protocol = window.location.protocol;
  if (protocol !== 'http:' && protocol !== 'https:') return;
  try {
    const next = getShareJoinUrl(window.location.href);
    if (next && next !== window.location.href) {
      window.history.replaceState(null, '', next);
    }
  } catch (e) { /* ignore */ }
}

function _shareRebuildGuestsArray() {
  const list = [];
  _shareGuestsById.forEach(function(data, id) {
    if (id === window.shareClientId) return;
    const entry = data && typeof data === 'object' ? data : {};
    // Expose id for sketches without requiring a nested {id,data} shape.
    if (entry.id !== id) {
      try {
        Object.defineProperty(entry, 'id', {
          value: id,
          enumerable: false,
          configurable: true,
          writable: false
        });
      } catch (e) {
        entry.id = id;
      }
    }
    list.push(entry);
  });
  window.guests = list;
}

function _shareCreateProxy(target, scope, pathPrefix) {
  return new Proxy(target, {
    get: function(obj, prop) {
      if (prop === '__shareRaw') return obj;
      const val = Reflect.get(obj, prop);
      if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof prop === 'string'
      ) {
        const nextPath = pathPrefix ? pathPrefix + '.' + prop : prop;
        return _shareCreateProxy(val, scope, nextPath);
      }
      return val;
    },
    set: function(obj, prop, value) {
      if (typeof prop === 'symbol') {
        obj[prop] = value;
        return true;
      }
      if (!_shareApplyingRemote && value !== undefined && !_shareIsJsonSerializable(value)) {
        debugError('share: value for "' + prop + '" must be JSON-serializable');
        return false;
      }
      const path = pathPrefix ? pathPrefix + '.' + prop : String(prop);
      const ok = Reflect.set(obj, prop, value);
      if (ok && !_shareApplyingRemote) {
        _shareSendPatch(scope, path, value);
      }
      return ok;
    },
    deleteProperty: function(obj, prop) {
      if (typeof prop === 'symbol') {
        return Reflect.deleteProperty(obj, prop);
      }
      const path = pathPrefix ? pathPrefix + '.' + prop : String(prop);
      const ok = Reflect.deleteProperty(obj, prop);
      if (ok && !_shareApplyingRemote) {
        _shareSendPatch(scope, path, undefined);
      }
      return ok;
    }
  });
}

function _shareBindProxies() {
  window.shared = _shareCreateProxy(_shareSharedRoot, 'shared', '');
  window.me = _shareCreateProxy(_shareMeRoot, 'me', '');
}

function _shareResetLocalState(seedShared, seedMe) {
  _shareSharedRoot = seedShared && typeof seedShared === 'object' && !Array.isArray(seedShared)
    ? _shareCloneJson(seedShared)
    : {};
  _shareMeRoot = seedMe && typeof seedMe === 'object' && !Array.isArray(seedMe)
    ? _shareCloneJson(seedMe)
    : {};
  _shareGuestsById = new Map();
  window.guests = [];
  _shareBindProxies();
}

function isShareSupported() {
  if (typeof WebSocket === 'undefined') {
    window.shareSupported = false;
    window.shareStatus = 'unsupported';
    window.shareError = 'WebSocket is not available in this environment.';
    return false;
  }
  window.shareSupported = true;
  if (window.shareStatus === 'unsupported') {
    window.shareStatus = 'idle';
    window.shareError = '';
  }
  return true;
}

function shareSetup(config) {
  config = config && typeof config === 'object' ? config : {};
  const fromUrl = _shareReadUrlParams();

  // URL params win so a shared / QR link configures every phone without edits.
  const host = (fromUrl.host || config.host || '').trim();
  const room = (fromUrl.room || config.room || '').trim();
  const app = (fromUrl.app || config.app || 'default').trim() || 'default';

  if (!host) {
    debugError(
      'shareSetup() needs a host: pass host in config, or open a link with ?shareHost=https://….workers.dev'
    );
    return false;
  }
  if (!room) {
    debugError(
      'shareSetup() needs a room: pass room in config, or open a link with ?room=demo'
    );
    return false;
  }

  isShareSupported();

  const sharedInit =
    config.shared && typeof config.shared === 'object' && !Array.isArray(config.shared)
      ? config.shared
      : {};
  const meInit =
    config.me && typeof config.me === 'object' && !Array.isArray(config.me)
      ? config.me
      : {};

  if (!_shareIsJsonSerializable(sharedInit) || !_shareIsJsonSerializable(meInit)) {
    debugError('shareSetup(): shared and me must be JSON-serializable plain objects.');
    return false;
  }

  _shareProfile = {
    host: String(host).replace(/\/$/, ''),
    room: String(room),
    app: String(app),
    shared: _shareCloneJson(sharedInit),
    me: _shareCloneJson(meInit),
    autoReconnect: config.autoReconnect !== false
  };

  window.shareRoom = _shareRoomKey(_shareProfile.app, _shareProfile.room);
  _shareResetLocalState(_shareProfile.shared, _shareProfile.me);
  window.shareStatus = 'idle';
  window.shareError = '';
  window.shareConnected = false;
  window.shareClientId = '';
  window.shareIsHost = false;
  _shareReadySent = false;
  debug(
    'shareSetup room=' + window.shareRoom + ' host=' + _shareProfile.host +
    (fromUrl.host || fromUrl.room ? ' (from URL)' : '')
  );
  return true;
}

function _shareWsUrl() {
  const host = _shareProfile.host;
  const key = encodeURIComponent(_shareRoomKey(_shareProfile.app, _shareProfile.room));
  const wsBase = host.replace(/^http/i, 'ws');
  return wsBase + '/parties/share-room/' + key;
}

function _shareSend(obj) {
  if (!_shareSocket || _shareSocket.readyState !== WebSocket.OPEN) return false;
  try {
    _shareSocket.send(JSON.stringify(obj));
    return true;
  } catch (err) {
    debugError('share send failed: ' + (err && err.message ? err.message : err));
    return false;
  }
}

function _shareSendPatch(scope, path, value) {
  if (!window.shareConnected) return;
  if (value !== undefined && !_shareIsJsonSerializable(value)) {
    debugError('share patch rejected: non-JSON value at ' + path);
    return;
  }
  const msg = {
    type: 'patch',
    v: _SHARE_PROTOCOL_VERSION,
    scope: scope,
    path: path
  };
  if (value !== undefined) {
    msg.value = _shareCloneJson(value);
  }
  _shareSend(msg);
}

function shareSet(path, value) {
  if (typeof path !== 'string' || path.length === 0) {
    debugError('shareSet(path, value) requires a non-empty path string.');
    return false;
  }
  if (value !== undefined && !_shareIsJsonSerializable(value)) {
    debugError('shareSet(): value must be JSON-serializable.');
    return false;
  }
  _shareApplyingRemote = true;
  try {
    _shareApplyPatchInPlace(_shareSharedRoot, path, value === undefined ? undefined : _shareCloneJson(value));
  } finally {
    _shareApplyingRemote = false;
  }
  _shareSendPatch('shared', path, value);
  return true;
}

function shareSetMe(path, value) {
  if (typeof path !== 'string' || path.length === 0) {
    debugError('shareSetMe(path, value) requires a non-empty path string.');
    return false;
  }
  if (value !== undefined && !_shareIsJsonSerializable(value)) {
    debugError('shareSetMe(): value must be JSON-serializable.');
    return false;
  }
  _shareApplyingRemote = true;
  try {
    _shareApplyPatchInPlace(_shareMeRoot, path, value === undefined ? undefined : _shareCloneJson(value));
  } finally {
    _shareApplyingRemote = false;
  }
  _shareSendPatch('me', path, value);
  return true;
}

function shareEmit(name, data) {
  if (!window.shareConnected) {
    debugWarn('shareEmit(): not connected.');
    return false;
  }
  if (typeof name !== 'string' || name.length === 0) {
    debugError('shareEmit(name, data?) requires a non-empty name.');
    return false;
  }
  if (data !== undefined && !_shareIsJsonSerializable(data)) {
    debugError('shareEmit(): data must be JSON-serializable.');
    return false;
  }
  const msg = {
    type: 'emit',
    v: _SHARE_PROTOCOL_VERSION,
    name: name
  };
  if (data !== undefined) {
    msg.data = _shareCloneJson(data);
  }
  return _shareSend(msg);
}

function _shareApplyRemotePatch(msg) {
  const scope = msg.scope;
  const path = msg.path;
  const value = Object.prototype.hasOwnProperty.call(msg, 'value') ? msg.value : undefined;
  const clientId = msg.clientId;

  _shareApplyingRemote = true;
  try {
    if (scope === 'shared') {
      _shareApplyPatchInPlace(_shareSharedRoot, path, value);
      if (typeof shareReceive === 'function') {
        shareReceive(path, value);
      }
    } else if (scope === 'me') {
      if (clientId && clientId === window.shareClientId) {
        _shareApplyPatchInPlace(_shareMeRoot, path, value);
      } else if (clientId) {
        let guest = _shareGuestsById.get(clientId);
        if (!guest) {
          guest = {};
          _shareGuestsById.set(clientId, guest);
        }
        _shareApplyPatchInPlace(guest, path, value);
        _shareRebuildGuestsArray();
      }
      if (typeof shareReceive === 'function') {
        shareReceive(path, value);
      }
    }
  } finally {
    _shareApplyingRemote = false;
  }
}

function _shareHandleMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (e) {
    debugWarn('share: ignoring non-JSON message');
    return;
  }
  if (!msg || typeof msg.type !== 'string') return;

  switch (msg.type) {
    case 'welcome': {
      window.shareClientId = msg.clientId || '';
      window.shareIsHost = !!msg.isHost;
      _shareApplyingRemote = true;
      try {
        _shareSharedRoot = msg.shared && typeof msg.shared === 'object' ? _shareCloneJson(msg.shared) : {};
        _shareMeRoot = msg.you && typeof msg.you === 'object' ? _shareCloneJson(msg.you) : _shareCloneJson(_shareProfile.me);
        _shareBindProxies();
        _shareGuestsById = new Map();
        const guests = Array.isArray(msg.guests) ? msg.guests : [];
        for (let i = 0; i < guests.length; i++) {
          const g = guests[i];
          if (g && g.id) {
            _shareGuestsById.set(g.id, g.data && typeof g.data === 'object' ? _shareCloneJson(g.data) : {});
          }
        }
        _shareRebuildGuestsArray();
      } finally {
        _shareApplyingRemote = false;
      }
      window.shareConnected = true;
      window.shareStatus = 'connected';
      window.shareError = '';
      if (!_shareReadySent) {
        _shareReadySent = true;
        if (typeof shareReady === 'function') {
          shareReady();
        }
      }
      debug('share welcome id=' + window.shareClientId + ' host=' + window.shareIsHost);
      break;
    }
    case 'patch':
      _shareApplyRemotePatch(msg);
      break;
    case 'presence': {
      _shareGuestsById = new Map();
      const guests = Array.isArray(msg.guests) ? msg.guests : [];
      for (let i = 0; i < guests.length; i++) {
        const g = guests[i];
        if (g && g.id && g.id !== window.shareClientId) {
          _shareGuestsById.set(g.id, g.data && typeof g.data === 'object' ? _shareCloneJson(g.data) : {});
        }
      }
      _shareRebuildGuestsArray();
      break;
    }
    case 'host': {
      const wasHost = window.shareIsHost;
      window.shareIsHost = !!msg.isHost;
      if (wasHost !== window.shareIsHost && typeof shareHostChanged === 'function') {
        shareHostChanged(window.shareIsHost);
      }
      break;
    }
    case 'emit':
      if (typeof shareEvent === 'function') {
        shareEvent(msg.name, msg.data);
      }
      break;
    case 'error':
      window.shareError = msg.message || 'Share server error';
      window.shareStatus = 'error';
      debugError('share: ' + window.shareError);
      break;
    default:
      break;
  }
}

function _shareClearReconnect() {
  if (_shareReconnectTimer) {
    clearTimeout(_shareReconnectTimer);
    _shareReconnectTimer = null;
  }
}

function _shareScheduleReconnect() {
  if (!_shareProfile || !_shareProfile.autoReconnect || _shareReconnectStopped) return;
  if (_shareReconnectTimer) return;
  const delay = _SHARE_RECONNECT_DELAYS[
    Math.min(_shareReconnectAttempt, _SHARE_RECONNECT_DELAYS.length - 1)
  ];
  _shareReconnectAttempt += 1;
  debug('share reconnect in ' + delay + 'ms (attempt ' + _shareReconnectAttempt + ')');
  _shareReconnectTimer = setTimeout(function() {
    _shareReconnectTimer = null;
    shareConnect().catch(function() {});
  }, delay);
}

function shareConnect() {
  if (!_shareProfile) {
    debugError('Call shareSetup() before shareConnect().');
    return Promise.reject(new Error('shareSetup required'));
  }
  if (!isShareSupported()) {
    return Promise.reject(new Error(window.shareError || 'WebSocket unsupported'));
  }

  _shareReconnectStopped = false;
  _shareClearReconnect();

  if (_shareSocket && (_shareSocket.readyState === WebSocket.OPEN || _shareSocket.readyState === WebSocket.CONNECTING)) {
    return Promise.resolve();
  }

  window.shareStatus = 'connecting';
  window.shareError = '';
  window.shareConnected = false;
  _shareReadySent = false;

  return new Promise(function(resolve, reject) {
    let settled = false;
    const url = _shareWsUrl();
    debug('share connecting ' + url);

    let socket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      window.shareStatus = 'error';
      window.shareError = err && err.message ? err.message : String(err);
      reject(err);
      return;
    }

    _shareSocket = socket;

    socket.onopen = function() {
      _shareReconnectAttempt = 0;
      _shareSend({
        type: 'hello',
        v: _SHARE_PROTOCOL_VERSION,
        app: _shareProfile.app,
        room: _shareProfile.room,
        me: _shareCloneJson(_shareProfile.me),
        shared: _shareCloneJson(_shareProfile.shared)
      });
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    socket.onmessage = function(event) {
      _shareHandleMessage(event.data);
    };

    socket.onerror = function() {
      window.shareStatus = 'error';
      if (!window.shareError) {
        window.shareError = 'Share WebSocket error';
      }
      if (!settled) {
        settled = true;
        reject(new Error(window.shareError));
      }
    };

    socket.onclose = function() {
      const wasConnected = window.shareConnected;
      window.shareConnected = false;
      if (window.shareStatus !== 'unsupported') {
        window.shareStatus = _shareReconnectStopped ? 'idle' : 'error';
      }
      if (_shareSocket === socket) {
        _shareSocket = null;
      }
      if (wasConnected && typeof shareClosed === 'function') {
        shareClosed();
      }
      if (!_shareReconnectStopped) {
        _shareScheduleReconnect();
      }
    };
  });
}

function shareDisconnect() {
  _shareReconnectStopped = true;
  _shareClearReconnect();
  if (_shareSocket) {
    try {
      _shareSocket.close();
    } catch (e) { /* ignore */ }
    _shareSocket = null;
  }
  window.shareConnected = false;
  window.shareStatus = 'idle';
  window.shareIsHost = false;
  window.shareClientId = '';
  _shareReadySent = false;
}

function _normalizePermissionList(permissions) {
  const aliasMap = {
    sensor: 'sensors',
    sensors: 'sensors',
    motion: 'sensors',
    orientation: 'sensors',
    gyro: 'sensors',
    gyroscope: 'sensors',
    accelerometer: 'sensors',
    mic: 'mic',
    microphone: 'mic',
    audioin: 'mic',
    sound: 'sound',
    audio: 'sound',
    audiooutput: 'sound',
    output: 'sound',
    speech: 'speech',
    voice: 'speech',
    recognition: 'speech',
    vibration: 'vibration',
    vibrate: 'vibration',
    haptic: 'vibration',
    haptics: 'vibration',
    torch: 'torch',
    flashlight: 'torch',
    flash: 'torch',
    light: 'torch',
    nfc: 'nfc',
    tag: 'nfc',
    tags: 'nfc',
    geo: 'geo',
    gps: 'geo',
    location: 'geo',
    geolocation: 'geo',
    camera: 'camera',
    video: 'camera',
    webcam: 'camera'
  };

  const source = Array.isArray(permissions)
    ? permissions
    : (typeof permissions === 'string' ? permissions.split(/[\s,]+/) : []);
  const normalized = [];

  for (const permission of source) {
    const key = String(permission).trim().toLowerCase().replace(/[-_]/g, '');
    if (!key) continue;

    if (key === 'all') {
      for (const defaultPermission of ['sensors', 'mic']) {
        if (!normalized.includes(defaultPermission)) {
          normalized.push(defaultPermission);
        }
      }
      continue;
    }

    const normalizedPermission = aliasMap[key];
    if (!normalizedPermission) {
      console.warn('p5-phone: Unknown permission type:', permission);
      continue;
    }

    if (!normalized.includes(normalizedPermission)) {
      normalized.push(normalizedPermission);
    }
  }

  if (normalized.length === 0) {
    console.warn('p5-phone: No valid permission types provided. Use sensors, mic, sound, speech, vibration, torch, nfc, geo, or camera.');
  }

  return normalized;
}

async function _requestPermissionsCore(permissions) {
  const normalized = _normalizePermissionList(permissions);

  for (const permission of normalized) {
    if (permission === 'sensors') {
      await _requestMotionPermissionsCore();
    } else if (permission === 'mic') {
      await _requestMicrophonePermissionsCore();
    } else if (permission === 'sound') {
      await _requestSoundOutputCore();
    } else if (permission === 'speech') {
      await _requestSpeechPermissionCore();
    } else if (permission === 'vibration') {
      await _requestVibrationPermissionCore();
    } else if (permission === 'torch') {
      await _requestTorchPermissionCore();
    } else if (permission === 'nfc') {
      await _requestNfcPermissionCore();
    } else if (permission === 'geo') {
      await _requestGeoPermissionCore();
    } else if (permission === 'camera') {
      await _requestCameraPermissionCore();
    }
  }

  return normalized;
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

async function _requestTorchPermission() {
  const enabled = await _requestTorchPermissionCore();
  _notifySketchReady();
  return enabled;
}

async function _requestNfcPermission() {
  const enabled = await _requestNfcPermissionCore();
  _notifySketchReady();
  return enabled;
}

async function _requestGeoPermission() {
  const enabled = await _requestGeoPermissionCore();
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
      torch: window.torchEnabled,
      nfc: window.nfcEnabled,
      geo: window.geoEnabled,
      camera: window.cameraEnabled,
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
  const minimal = document.getElementById('minimalOverlay');

  if (button) button.remove();
  if (status) status.remove();
  if (overlay) overlay.remove();
  if (banner) banner.remove();
  if (minimal) {
    minimal.remove();
    const kf = document.getElementById('p5phoneMinimalKeyframes');
    if (kf) kf.remove();
  }
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
  let canvasWaitTimer = null;
  let documentFallbackAttached = false;
  const maxAttempts = 50;
  let attempts = 0;

  const cleanupListeners = () => {
    if (canvasWaitTimer) {
      clearTimeout(canvasWaitTimer);
      canvasWaitTimer = null;
    }
    document.removeEventListener('touchstart', handleFirstInteraction, true);
    document.removeEventListener('mousedown', handleFirstInteraction, true);
  };

  const stopHintInterval = () => {
    if (hintInterval) {
      clearInterval(hintInterval);
      hintInterval = null;
    }
  };

  // Draw hint text on the canvas if message is provided
  if (message) {
    let hintFrames = 0;
    hintInterval = setInterval(() => {
      hintFrames++;
      if (hintFrames > maxAttempts) {
        stopHintInterval();
        return;
      }
      const canvas = document.querySelector('canvas');
      if (canvas && typeof push === 'function') {
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

    stopHintInterval();
    cleanupListeners();

    await onActivateHandler();
  };

  const attachDocumentFallback = () => {
    if (documentFallbackAttached) return;
    documentFallbackAttached = true;
    document.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
    document.addEventListener('mousedown', handleFirstInteraction, { once: true, capture: true });
  };

  const waitForCanvas = () => {
    attempts++;
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
      canvas.addEventListener('mousedown', handleFirstInteraction, { once: true, capture: true });
    } else if (attempts < maxAttempts) {
      attachDocumentFallback();
      canvasWaitTimer = setTimeout(waitForCanvas, 50);
    } else {
      attachDocumentFallback();
      stopHintInterval();
      debugWarn('p5-phone: canvas not found after waiting; using document fallback for permission tap.');
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
 * Minimal UI: A bare semi-transparent full-screen overlay with an optional
 * radiating circular icon in the center. Less visual chrome than the Tap
 * frosted message box — designed to sit cleanly over the sketch.
 *
 * Signature flexibility (mirrors how Tap is called):
 *   _createMinimalToEnable(message, options, onActivateHandler)
 *   _createMinimalToEnable(options, onActivateHandler)        // options may carry message
 *   _createMinimalToEnable(message, onActivateHandler)        // default options
 *
 * @param {string|Object|null} messageOrOpts - Overlay text (string|null) or an options object
 * @param {Object} [options] - { color, opacity, icon, iconColor, iconSize, message }
 * @param {function} onActivateHandler - Async permission handler to run on tap
 */
function _createMinimalToEnable(messageOrOpts, options, onActivateHandler) {
  _removeExistingUI();

  // Normalize the flexible signature into (message, options, handler).
  let message = messageOrOpts;
  if (messageOrOpts && typeof messageOrOpts === 'object') {
    options = options || {};
    message = messageOrOpts.message != null ? messageOrOpts.message : null;
    options = Object.assign({}, messageOrOpts, options);
    delete options.message;
  }
  options = options || {};
  const color = options.color || '#000000';
  const opacity = typeof options.opacity === 'number' ? options.opacity : 0.5;
  const showIcon = options.icon !== false; // default true
  const iconColor = options.iconColor || '#ffffff';
  const iconSize = typeof options.iconSize === 'number' ? options.iconSize : 14;

  // Parse the overlay color into r,g,b so we can apply opacity independently.
  const rgb = _parseColorToRgb(color);
  const bg = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
    : `rgba(0, 0, 0, ${opacity})`;

  let activating = false;

  // Inject the keyframes once.
  if (!document.getElementById('p5phoneMinimalKeyframes')) {
    const style = document.createElement('style');
    style.id = 'p5phoneMinimalKeyframes';
    style.textContent = `
      @keyframes p5phoneMinimalPulse {
        0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.55; }
        70%  { opacity: 0; }
        100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
      }
      @keyframes p5phoneMinimalCorePulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.9; }
        50%      { transform: translate(-50%, -50%) scale(1.25); opacity: 1; }
      }`;
    document.head.appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.id = 'minimalOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${bg};
    z-index: 999999;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  `;

  // Center stack for the icon and optional message.
  const center = document.createElement('div');
  center.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    pointer-events: none;
  `;

  if (showIcon) {
    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `
      position: relative;
      width: ${iconSize}px;
      height: ${iconSize}px;
    `;
    // Radiating rings.
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('span');
      ring.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: 50%;
        border: 2px solid ${iconColor};
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
        animation: p5phoneMinimalPulse 2.4s ease-out infinite;
        animation-delay: ${i * 0.8}s;
      `;
      iconWrap.appendChild(ring);
    }
    // Solid core dot.
    const dot = document.createElement('span');
    dot.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${iconSize}px;
      height: ${iconSize}px;
      border-radius: 50%;
      background: ${iconColor};
      transform: translate(-50%, -50%) scale(1);
      animation: p5phoneMinimalCorePulse 2.4s ease-in-out infinite;
    `;
    iconWrap.appendChild(dot);
    center.appendChild(iconWrap);
  }

  if (message) {
    const msg = document.createElement('div');
    msg.textContent = message;
    msg.style.cssText = `
      color: ${iconColor};
      font-size: 15px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center;
      letter-spacing: 0.02em;
      opacity: 0.9;
      max-width: 80vw;
    `;
    center.appendChild(msg);
  }

  overlay.appendChild(center);

  const removeOverlay = () => {
    if (overlay.parentNode) overlay.remove();
    const kf = document.getElementById('p5phoneMinimalKeyframes');
    // Only drop the keyframes if no other minimal overlay is using them.
    if (kf && !document.getElementById('minimalOverlay')) kf.remove();
  };

  const handleActivation = async () => {
    if (!activating && overlay.parentNode) {
      activating = true;
      overlay.style.cursor = 'wait';
      await onActivateHandler();
      removeOverlay();
    }
  };

  overlay.addEventListener('click', handleActivation);
  overlay.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
  overlay.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });

  document.body.appendChild(overlay);
}

/**
 * Parse a CSS color string (#hex, rgb(), rgba(), or color name) into {r,g,b}.
 * Returns null if the value cannot be resolved in the current document.
 * @param {string} color
 * @returns {{r:number,g:number,b:number}|null}
 */
function _parseColorToRgb(color) {
  if (!color || typeof color !== 'string') return null;
  const trimmed = color.trim();
  try {
    const probe = document.createElement('span');
    probe.style.color = trimmed;
    // Setting an invalid value leaves color empty.
    if (!probe.style.color) return null;
    document.head.appendChild(probe);
    const computed = window.getComputedStyle(probe).color;
    probe.remove();
    const m = computed.match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2] };
  } catch (e) {
    return null;
  }
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

function _lockGesturesEmbedded(target) {
  _gestureLockState.appliedStyles.touchAction = target.style.touchAction;
  target.style.touchAction = 'none';

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartedOnTarget = false;

  const touchStartHandler = function(e) {
    touchStartedOnTarget = target.contains(e.target);
    if (!touchStartedOnTarget || !e.touches || e.touches.length === 0) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const touchMoveHandler = function(e) {
    if (!touchStartedOnTarget || !target.contains(e.target)) return;
    if (!e.touches || e.touches.length === 0) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY;

    if (window.pageYOffset === 0 && deltaY > 0) {
      e.preventDefault();
      return;
    }

    if (_isPermissionUIElement(e.target)) return;

    e.preventDefault();
  };

  let lastTouchEnd = 0;
  const touchEndHandler = function(e) {
    if (!touchStartedOnTarget || !target.contains(e.target)) return;
    if (_isPermissionUIElement(e.target)) return;

    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  const gestureHandler = function(e) {
    if (target.contains(e.target)) {
      e.preventDefault();
    }
  };

  const contextMenuHandler = function(e) {
    if (target.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const captureOptions = { passive: false, capture: true };
  _addTrackedListener(target, 'touchstart', touchStartHandler, captureOptions);
  _addTrackedListener(target, 'touchmove', touchMoveHandler, captureOptions);
  _addTrackedListener(target, 'touchend', touchEndHandler, false);
  _addTrackedListener(target, 'gesturestart', gestureHandler, false);
  _addTrackedListener(target, 'gesturechange', gestureHandler, false);
  _addTrackedListener(target, 'gestureend', gestureHandler, false);
  _addTrackedListener(target, 'contextmenu', contextMenuHandler, false);
}

function _lockGesturesFullscreen(options) {
  const { warnBeforeLeave, trapHistory } = options;

  if (trapHistory) {
    _gestureLockState.savedHandlers.onpopstate = window.onpopstate;
    window.history.pushState(null, '', window.location.href);
    _gestureLockState.historyTrapped = true;

    const popstateHandler = function() {
      window.history.pushState(null, '', window.location.href);
    };
    window.onpopstate = popstateHandler;
  }

  if (warnBeforeLeave) {
    const beforeUnloadHandler = function(e) {
      e.preventDefault();
      e.returnValue = '';
    };
    _addTrackedListener(window, 'beforeunload', beforeUnloadHandler, false);
  }

  let touchStartX = 0;
  let touchStartY = 0;
  const edgeThreshold = 20;

  const touchStartHandler = function(e) {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      if (touchStartX < edgeThreshold ||
          touchStartX > window.innerWidth - edgeThreshold) {
        e.preventDefault();
      }
    }
  };

  const touchMoveHandler = function(e) {
    if (!e.touches || e.touches.length === 0) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    if ((touchStartX < edgeThreshold && deltaX > 0) ||
        (touchStartX > window.innerWidth - edgeThreshold && deltaX < 0)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (window.pageYOffset === 0 && deltaY > 0) {
      e.preventDefault();
    }

    if (e.target && e.target.tagName === 'CANVAS' &&
        !document.getElementById('tapOverlay') &&
        !document.getElementById('permissionButton')) {
      e.preventDefault();
    }
  };

  const captureOptions = { passive: false, capture: true };
  _addTrackedListener(document, 'touchstart', touchStartHandler, captureOptions);
  _addTrackedListener(document, 'touchmove', touchMoveHandler, captureOptions);

  const gestureHandler = function(e) {
    e.preventDefault();
  };
  _addTrackedListener(document, 'gesturestart', gestureHandler, false);
  _addTrackedListener(document, 'gesturechange', gestureHandler, false);
  _addTrackedListener(document, 'gestureend', gestureHandler, false);

  let lastTouchEnd = 0;
  const touchEndHandler = function(e) {
    if (_isPermissionUIElement(e.target)) return;

    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };
  _addTrackedListener(document, 'touchend', touchEndHandler, false);

  _gestureLockState.savedHandlers.oncontextmenu = window.oncontextmenu;
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
  if (_gestureLockState.savedHandlers.p5Callbacks) return;

  const saved = {
    mousePressed: window.mousePressed || function() {},
    mouseDragged: window.mouseDragged || function() {},
    mouseReleased: window.mouseReleased || function() {}
  };

  // In p5.js 2.0, touch and mouse are unified via Pointer API.
  // mousePressed/mouseDragged/mouseReleased fire for ALL pointer types (mouse + touch).
  // In p5.js 1.x, touchStarted/touchMoved/touchEnded are separate from mouse callbacks.
  // We wrap both sets for 1.x, and only mouse callbacks for 2.0.
  if (!_isP5v2Runtime()) {
    saved.touchStarted = window.touchStarted || function() {};
    saved.touchMoved = window.touchMoved || function() {};
    saved.touchEnded = window.touchEnded || function() {};

    window.touchStarted = function(e) {
      saved.touchStarted(e);
      return false;
    };

    window.touchMoved = function(e) {
      saved.touchMoved(e);
      return false;
    };

    window.touchEnded = function(e) {
      saved.touchEnded(e);
      return false;
    };
  }

  window.mousePressed = function(e) {
    saved.mousePressed(e);
    return false;
  };

  window.mouseDragged = function(e) {
    saved.mouseDragged(e);
    return false;
  };

  window.mouseReleased = function(e) {
    saved.mouseReleased(e);
    return false;
  };

  _gestureLockState.savedHandlers.p5Callbacks = saved;
  if (!window._gestureHandlerAssignWarned) {
    window._gestureHandlerAssignWarned = true;
    debugWarn('Assign touch/mouse handlers before lockGestures(); reassigning them afterward may bypass gesture blocking.');
  }
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
    
    lockGestures({ mode: 'fullscreen' }); // Auto-lock gestures for legacy mode
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
window.unlockGestures = unlockGestures;

// Device detection
window.isMobile = _isMobileDevice();
window.isDesktop = !_isMobileDevice();

// Desktop QR dev helper
window.showDesktopQr = showDesktopQr;
window.hideDesktopQr = hideDesktopQr;
window.setQrUrl = setQrUrl;
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
window.enableGeoTap = enableGeoTap;
window.enableGeoButton = enableGeoButton;
window.stopGeo = stopGeo;
window.setGeoOptions = setGeoOptions;
window.getGeoPosition = getGeoPosition;
window.geoDistance = geoDistance;
window.geoInPolygon = geoInPolygon;
window.isBleSupported = isBleSupported;
window.bleSetup = bleSetup;
window.bleConnect = bleConnect;
window.bleDisconnect = bleDisconnect;
window.bleRead = bleRead;
window.bleWrite = bleWrite;
window.enableBleTap = enableBleTap;
window.enableBleButton = enableBleButton;
window.isShareSupported = isShareSupported;
window.shareSetup = shareSetup;
window.shareConnect = shareConnect;
window.shareDisconnect = shareDisconnect;
window.shareSet = shareSet;
window.shareSetMe = shareSetMe;
window.shareEmit = shareEmit;
window.getShareJoinUrl = getShareJoinUrl;
window.enableShareTap = enableShareTap;
window.enableShareButton = enableShareButton;
window.enableAllTap = enableAllTap;
window.enableAllButton = enableAllButton;
window.enablePermissionsTap = enablePermissionsTap;
window.enablePermissionsButton = enablePermissionsButton;
window.enableHardwareTap = enablePermissionsTap;
window.enableHardwareButton = enablePermissionsButton;

// Canvas-first-touch style
window.enableGyroCanvas = enableGyroCanvas;
window.enableSensorCanvas = enableGyroCanvas;
window.enableMicCanvas = enableMicCanvas;
window.enableSoundCanvas = enableSoundCanvas;
window.enableSpeechCanvas = enableSpeechCanvas;
window.enableVibrationCanvas = enableVibrationCanvas;
window.enableNfcCanvas = enableNfcCanvas;
window.enableGeoCanvas = enableGeoCanvas;
window.enableBleCanvas = enableBleCanvas;
window.enableShareCanvas = enableShareCanvas;
window.enableAllCanvas = enableAllCanvas;
window.enableCameraCanvas = enableCameraCanvas;
window.enablePermissionsCanvas = enablePermissionsCanvas;
window.enableHardwareCanvas = enablePermissionsCanvas;

// Banner style
window.enableGyroBanner = enableGyroBanner;
window.enableSensorBanner = enableGyroBanner;
window.enableMicBanner = enableMicBanner;
window.enableSoundBanner = enableSoundBanner;
window.enableSpeechBanner = enableSpeechBanner;
window.enableVibrationBanner = enableVibrationBanner;
window.enableNfcBanner = enableNfcBanner;
window.enableGeoBanner = enableGeoBanner;
window.enableBleBanner = enableBleBanner;
window.enableShareBanner = enableShareBanner;
window.enableAllBanner = enableAllBanner;
window.enableCameraBanner = enableCameraBanner;
window.enablePermissionsBanner = enablePermissionsBanner;
window.enableHardwareBanner = enablePermissionsBanner;

// Minimal style
window.enableGyroMinimal = enableGyroMinimal;
window.enableSensorMinimal = enableGyroMinimal;
window.enableMicMinimal = enableMicMinimal;
window.enableSoundMinimal = enableSoundMinimal;
window.enableSpeechMinimal = enableSpeechMinimal;
window.enableVibrationMinimal = enableVibrationMinimal;
window.enableNfcMinimal = enableNfcMinimal;
window.enableGeoMinimal = enableGeoMinimal;
window.enableBleMinimal = enableBleMinimal;
window.enableShareMinimal = enableShareMinimal;
window.enableAllMinimal = enableAllMinimal;
window.enableCameraMinimal = enableCameraMinimal;
window.enablePermissionsMinimal = enablePermissionsMinimal;
window.enableHardwareMinimal = enablePermissionsMinimal;
window.enableTorchMinimal = enableTorchMinimal;
window.enableFlashlightMinimal = enableFlashlightMinimal;

// Custom element binding
window.enableGyroOn = enableGyroOn;
window.enableSensorOn = enableGyroOn;
window.enableMicOn = enableMicOn;
window.enableSoundOn = enableSoundOn;
window.enableSpeechOn = enableSpeechOn;
window.enableVibrationOn = enableVibrationOn;
window.enableNfcOn = enableNfcOn;
window.enableGeoOn = enableGeoOn;
window.enableBleOn = enableBleOn;
window.enableShareOn = enableShareOn;
window.enableAllOn = enableAllOn;
window.enableCameraOn = enableCameraOn;
window.enablePermissionsOn = enablePermissionsOn;
window.enableHardwareOn = enablePermissionsOn;

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

  content.replaceChildren();
  for (const msg of _debugMessages) {
    const div = document.createElement('div');
    div.className = 'debug-message';
    if (typeof msg === 'object' && msg !== null && msg.type) {
      div.classList.add(msg.type);
      div.textContent = msg.text;
    } else {
      div.textContent = typeof msg === 'string' ? msg : String(msg);
    }
    content.appendChild(div);
  }

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
    if (window._phoneCameras && Array.isArray(window._phoneCameras)) {
      const idx = window._phoneCameras.indexOf(this);
      if (idx !== -1) {
        window._phoneCameras.splice(idx, 1);
      }
    }
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

async function _requestCameraPermissionCore() {
  try {
    // Initialize any PhoneCamera instances that haven't been initialized yet
    // This happens after user interaction grants camera permission
    let cameraStarted = false;

    if (typeof window._phoneCameras !== 'undefined' && Array.isArray(window._phoneCameras)) {
      for (let cam of window._phoneCameras) {
        if (!cam) continue;

        if (!cam._ready && !cam._video) {
          cam._initializeCamera();
        }

        if (cam._ready || cam._video) {
          cameraStarted = true;
        }
      }
    }

    window.cameraEnabled = cameraStarted;

    if (!cameraStarted) {
      console.warn('p5-phone: No PhoneCamera found. Create one with createPhoneCamera() before enabling camera permissions.');
      return false;
    }
    
    // Call userCameraReady callback if it exists (user-defined function)
    if (typeof userCameraReady === 'function') {
      userCameraReady();
    }
    return true;
    
  } catch (error) {
    console.error('Camera permission error:', error);
    if (_debugVisible) {
      debugError('Camera permission error:', error);
    }
    window.cameraEnabled = false;
    return false;
  }
}

async function _requestCameraPermission() {
  const enabled = await _requestCameraPermissionCore();
  _notifySketchReady();
  return enabled;
}

// Make camera functions globally accessible
window.createPhoneCamera = createPhoneCamera;
window.enableCameraButton = enableCameraButton;
window.enableCameraTap = enableCameraTap;
window.enableTorchButton = enableTorchButton;
window.enableTorchTap = enableTorchTap;
window.enableTorchCanvas = enableTorchCanvas;
window.enableTorchBanner = enableTorchBanner;
window.enableTorchOn = enableTorchOn;
window.enableFlashlightButton = enableFlashlightButton;
window.enableFlashlightTap = enableFlashlightTap;
window.enableFlashlightCanvas = enableFlashlightCanvas;
window.enableFlashlightBanner = enableFlashlightBanner;
window.enableFlashlightOn = enableFlashlightOn;
window.setTorch = setTorch;
window.torchOn = torchOn;
window.torchOff = torchOff;
window.toggleTorch = toggleTorch;
window.stopTorch = stopTorch;
window.isTorchSupported = isTorchSupported;
window.setFlashlight = setFlashlight;
window.flashlightOn = flashlightOn;
window.flashlightOff = flashlightOff;
window.toggleFlashlight = toggleFlashlight;
window.stopFlashlight = stopFlashlight;

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
  p5.prototype.unlockGestures = unlockGestures;
  p5.prototype.showDesktopQr = showDesktopQr;
  p5.prototype.hideDesktopQr = hideDesktopQr;
  p5.prototype.setQrUrl = setQrUrl;
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
  p5.prototype.enableTorchTap = enableTorchTap;
  p5.prototype.enableTorchButton = enableTorchButton;
  p5.prototype.enableFlashlightTap = enableFlashlightTap;
  p5.prototype.enableFlashlightButton = enableFlashlightButton;
  p5.prototype.setTorch = setTorch;
  p5.prototype.torchOn = torchOn;
  p5.prototype.torchOff = torchOff;
  p5.prototype.toggleTorch = toggleTorch;
  p5.prototype.stopTorch = stopTorch;
  p5.prototype.isTorchSupported = isTorchSupported;
  p5.prototype.setFlashlight = setFlashlight;
  p5.prototype.flashlightOn = flashlightOn;
  p5.prototype.flashlightOff = flashlightOff;
  p5.prototype.toggleFlashlight = toggleFlashlight;
  p5.prototype.stopFlashlight = stopFlashlight;
  p5.prototype.enableNfcTap = enableNfcTap;
  p5.prototype.enableNfcButton = enableNfcButton;
  p5.prototype.stopNfc = stopNfc;
  p5.prototype.setNfcTagAlias = setNfcTagAlias;
  p5.prototype.getNfcTagAlias = getNfcTagAlias;
  p5.prototype.isNfcTag = isNfcTag;
  p5.prototype.enableGeoTap = enableGeoTap;
  p5.prototype.enableGeoButton = enableGeoButton;
  p5.prototype.stopGeo = stopGeo;
  p5.prototype.setGeoOptions = setGeoOptions;
  p5.prototype.getGeoPosition = getGeoPosition;
  p5.prototype.geoDistance = geoDistance;
  p5.prototype.geoInPolygon = geoInPolygon;
  p5.prototype.isBleSupported = isBleSupported;
  p5.prototype.bleSetup = bleSetup;
  p5.prototype.bleConnect = bleConnect;
  p5.prototype.bleDisconnect = bleDisconnect;
  p5.prototype.bleRead = bleRead;
  p5.prototype.bleWrite = bleWrite;
  p5.prototype.enableBleTap = enableBleTap;
  p5.prototype.enableBleButton = enableBleButton;
  p5.prototype.isShareSupported = isShareSupported;
  p5.prototype.shareSetup = shareSetup;
  p5.prototype.shareConnect = shareConnect;
  p5.prototype.shareDisconnect = shareDisconnect;
  p5.prototype.shareSet = shareSet;
  p5.prototype.shareSetMe = shareSetMe;
  p5.prototype.shareEmit = shareEmit;
  p5.prototype.getShareJoinUrl = getShareJoinUrl;
  p5.prototype.enableShareTap = enableShareTap;
  p5.prototype.enableShareButton = enableShareButton;
  p5.prototype.enableAllTap = enableAllTap;
  p5.prototype.enableAllButton = enableAllButton;
  p5.prototype.enablePermissionsTap = enablePermissionsTap;
  p5.prototype.enablePermissionsButton = enablePermissionsButton;
  p5.prototype.enableHardwareTap = enablePermissionsTap;
  p5.prototype.enableHardwareButton = enablePermissionsButton;
  
  // Canvas-first-touch style
  p5.prototype.enableGyroCanvas = enableGyroCanvas;
  p5.prototype.enableSensorCanvas = enableGyroCanvas;
  p5.prototype.enableMicCanvas = enableMicCanvas;
  p5.prototype.enableSoundCanvas = enableSoundCanvas;
  p5.prototype.enableSpeechCanvas = enableSpeechCanvas;
  p5.prototype.enableVibrationCanvas = enableVibrationCanvas;
  p5.prototype.enableTorchCanvas = enableTorchCanvas;
  p5.prototype.enableFlashlightCanvas = enableFlashlightCanvas;
  p5.prototype.enableNfcCanvas = enableNfcCanvas;
  p5.prototype.enableGeoCanvas = enableGeoCanvas;
  p5.prototype.enableBleCanvas = enableBleCanvas;
  p5.prototype.enableShareCanvas = enableShareCanvas;
  p5.prototype.enableAllCanvas = enableAllCanvas;
  p5.prototype.enableCameraCanvas = enableCameraCanvas;
  p5.prototype.enablePermissionsCanvas = enablePermissionsCanvas;
  p5.prototype.enableHardwareCanvas = enablePermissionsCanvas;
  
  // Banner style
  p5.prototype.enableGyroBanner = enableGyroBanner;
  p5.prototype.enableSensorBanner = enableGyroBanner;
  p5.prototype.enableMicBanner = enableMicBanner;
  p5.prototype.enableSoundBanner = enableSoundBanner;
  p5.prototype.enableSpeechBanner = enableSpeechBanner;
  p5.prototype.enableVibrationBanner = enableVibrationBanner;
  p5.prototype.enableTorchBanner = enableTorchBanner;
  p5.prototype.enableFlashlightBanner = enableFlashlightBanner;
  p5.prototype.enableNfcBanner = enableNfcBanner;
  p5.prototype.enableGeoBanner = enableGeoBanner;
  p5.prototype.enableBleBanner = enableBleBanner;
  p5.prototype.enableShareBanner = enableShareBanner;
  p5.prototype.enableAllBanner = enableAllBanner;
  p5.prototype.enableCameraBanner = enableCameraBanner;
  p5.prototype.enablePermissionsBanner = enablePermissionsBanner;
  p5.prototype.enableHardwareBanner = enablePermissionsBanner;

  // Minimal style
  p5.prototype.enableGyroMinimal = enableGyroMinimal;
  p5.prototype.enableSensorMinimal = enableGyroMinimal;
  p5.prototype.enableMicMinimal = enableMicMinimal;
  p5.prototype.enableSoundMinimal = enableSoundMinimal;
  p5.prototype.enableSpeechMinimal = enableSpeechMinimal;
  p5.prototype.enableVibrationMinimal = enableVibrationMinimal;
  p5.prototype.enableTorchMinimal = enableTorchMinimal;
  p5.prototype.enableFlashlightMinimal = enableFlashlightMinimal;
  p5.prototype.enableNfcMinimal = enableNfcMinimal;
  p5.prototype.enableGeoMinimal = enableGeoMinimal;
  p5.prototype.enableBleMinimal = enableBleMinimal;
  p5.prototype.enableShareMinimal = enableShareMinimal;
  p5.prototype.enableAllMinimal = enableAllMinimal;
  p5.prototype.enableCameraMinimal = enableCameraMinimal;
  p5.prototype.enablePermissionsMinimal = enablePermissionsMinimal;
  p5.prototype.enableHardwareMinimal = enablePermissionsMinimal;

  // Custom element binding
  p5.prototype.enableGyroOn = enableGyroOn;
  p5.prototype.enableSensorOn = enableGyroOn;
  p5.prototype.enableMicOn = enableMicOn;
  p5.prototype.enableSoundOn = enableSoundOn;
  p5.prototype.enableSpeechOn = enableSpeechOn;
  p5.prototype.enableVibrationOn = enableVibrationOn;
  p5.prototype.enableTorchOn = enableTorchOn;
  p5.prototype.enableFlashlightOn = enableFlashlightOn;
  p5.prototype.enableNfcOn = enableNfcOn;
  p5.prototype.enableGeoOn = enableGeoOn;
  p5.prototype.enableBleOn = enableBleOn;
  p5.prototype.enableShareOn = enableShareOn;
  p5.prototype.enableAllOn = enableAllOn;
  p5.prototype.enableCameraOn = enableCameraOn;
  p5.prototype.enablePermissionsOn = enablePermissionsOn;
  p5.prototype.enableHardwareOn = enablePermissionsOn;
  
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
      this.unlockGestures = unlockGestures;
      this.showDesktopQr = showDesktopQr;
      this.hideDesktopQr = hideDesktopQr;
      this.setQrUrl = setQrUrl;
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
      this.enableTorchTap = enableTorchTap;
      this.enableTorchButton = enableTorchButton;
      this.enableFlashlightTap = enableFlashlightTap;
      this.enableFlashlightButton = enableFlashlightButton;
      this.setTorch = setTorch;
      this.torchOn = torchOn;
      this.torchOff = torchOff;
      this.toggleTorch = toggleTorch;
      this.stopTorch = stopTorch;
      this.isTorchSupported = isTorchSupported;
      this.setFlashlight = setFlashlight;
      this.flashlightOn = flashlightOn;
      this.flashlightOff = flashlightOff;
      this.toggleFlashlight = toggleFlashlight;
      this.stopFlashlight = stopFlashlight;
      this.enableNfcTap = enableNfcTap;
      this.enableNfcButton = enableNfcButton;
      this.stopNfc = stopNfc;
      this.setNfcTagAlias = setNfcTagAlias;
      this.getNfcTagAlias = getNfcTagAlias;
      this.isNfcTag = isNfcTag;
      this.enableGeoTap = enableGeoTap;
      this.enableGeoButton = enableGeoButton;
      this.stopGeo = stopGeo;
      this.setGeoOptions = setGeoOptions;
      this.getGeoPosition = getGeoPosition;
      this.geoDistance = geoDistance;
      this.geoInPolygon = geoInPolygon;
      this.isBleSupported = isBleSupported;
      this.bleSetup = bleSetup;
      this.bleConnect = bleConnect;
      this.bleDisconnect = bleDisconnect;
      this.bleRead = bleRead;
      this.bleWrite = bleWrite;
      this.enableBleTap = enableBleTap;
      this.enableBleButton = enableBleButton;
      this.isShareSupported = isShareSupported;
      this.shareSetup = shareSetup;
      this.shareConnect = shareConnect;
      this.shareDisconnect = shareDisconnect;
      this.shareSet = shareSet;
      this.shareSetMe = shareSetMe;
      this.shareEmit = shareEmit;
      this.getShareJoinUrl = getShareJoinUrl;
      this.enableShareTap = enableShareTap;
      this.enableShareButton = enableShareButton;
      this.enableAllTap = enableAllTap;
      this.enableAllButton = enableAllButton;
      this.enablePermissionsTap = enablePermissionsTap;
      this.enablePermissionsButton = enablePermissionsButton;
      this.enableHardwareTap = enablePermissionsTap;
      this.enableHardwareButton = enablePermissionsButton;

      // Canvas-first-touch style
      this.enableGyroCanvas = enableGyroCanvas;
      this.enableSensorCanvas = enableGyroCanvas;
      this.enableMicCanvas = enableMicCanvas;
      this.enableSoundCanvas = enableSoundCanvas;
      this.enableSpeechCanvas = enableSpeechCanvas;
      this.enableVibrationCanvas = enableVibrationCanvas;
      this.enableTorchCanvas = enableTorchCanvas;
      this.enableFlashlightCanvas = enableFlashlightCanvas;
      this.enableNfcCanvas = enableNfcCanvas;
      this.enableGeoCanvas = enableGeoCanvas;
      this.enableBleCanvas = enableBleCanvas;
      this.enableShareCanvas = enableShareCanvas;
      this.enableAllCanvas = enableAllCanvas;
      this.enableCameraCanvas = enableCameraCanvas;
      this.enablePermissionsCanvas = enablePermissionsCanvas;
      this.enableHardwareCanvas = enablePermissionsCanvas;

      // Banner style
      this.enableGyroBanner = enableGyroBanner;
      this.enableSensorBanner = enableGyroBanner;
      this.enableMicBanner = enableMicBanner;
      this.enableSoundBanner = enableSoundBanner;
      this.enableSpeechBanner = enableSpeechBanner;
      this.enableVibrationBanner = enableVibrationBanner;
      this.enableTorchBanner = enableTorchBanner;
      this.enableFlashlightBanner = enableFlashlightBanner;
      this.enableNfcBanner = enableNfcBanner;
      this.enableGeoBanner = enableGeoBanner;
      this.enableBleBanner = enableBleBanner;
      this.enableShareBanner = enableShareBanner;
      this.enableAllBanner = enableAllBanner;
      this.enableCameraBanner = enableCameraBanner;
      this.enablePermissionsBanner = enablePermissionsBanner;
      this.enableHardwareBanner = enablePermissionsBanner;

      // Minimal style
      this.enableGyroMinimal = enableGyroMinimal;
      this.enableSensorMinimal = enableGyroMinimal;
      this.enableMicMinimal = enableMicMinimal;
      this.enableSoundMinimal = enableSoundMinimal;
      this.enableSpeechMinimal = enableSpeechMinimal;
      this.enableVibrationMinimal = enableVibrationMinimal;
      this.enableTorchMinimal = enableTorchMinimal;
      this.enableFlashlightMinimal = enableFlashlightMinimal;
      this.enableNfcMinimal = enableNfcMinimal;
      this.enableGeoMinimal = enableGeoMinimal;
      this.enableBleMinimal = enableBleMinimal;
      this.enableShareMinimal = enableShareMinimal;
      this.enableAllMinimal = enableAllMinimal;
      this.enableCameraMinimal = enableCameraMinimal;
      this.enablePermissionsMinimal = enablePermissionsMinimal;
      this.enableHardwareMinimal = enablePermissionsMinimal;

      // Custom element binding
      this.enableGyroOn = enableGyroOn;
      this.enableSensorOn = enableGyroOn;
      this.enableMicOn = enableMicOn;
      this.enableSoundOn = enableSoundOn;
      this.enableSpeechOn = enableSpeechOn;
      this.enableVibrationOn = enableVibrationOn;
      this.enableTorchOn = enableTorchOn;
      this.enableFlashlightOn = enableFlashlightOn;
      this.enableNfcOn = enableNfcOn;
      this.enableGeoOn = enableGeoOn;
      this.enableBleOn = enableBleOn;
      this.enableShareOn = enableShareOn;
      this.enableAllOn = enableAllOn;
      this.enableCameraOn = enableCameraOn;
      this.enablePermissionsOn = enablePermissionsOn;
      this.enableHardwareOn = enablePermissionsOn;

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

    lifecycles.preremove = function() {
      unlockGestures();
      // Release the GPS watch so removing/reloading a sketch never leaks the
      // position subscription (fixes the old p5.geolocation shared-watch bug).
      try { stopGeo(); } catch (e) { /* ignore */ }
      try { shareDisconnect(); } catch (e) { /* ignore */ }
    };

    console.log('✅ Mobile p5.js Permissions: registered as p5.js 2.0 addon');
  });
}