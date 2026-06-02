window.P5PHONE_PERMISSION_MATRIX = [
  { capability: 'Motion sensors', status: 'window.sensorsEnabled', tap: 'enableGyroTap(message)', button: 'enableGyroButton(text)', canvas: 'enableGyroCanvas(message)', banner: 'enableGyroBanner(message, position)', custom: 'enableGyroOn(selector)', notes: 'Use for rotationX/Y/Z, accelerationX/Y/Z, deviceMoved(), and deviceShaken().' },
  { capability: 'Microphone', status: 'window.micEnabled', tap: 'enableMicTap(message)', button: 'enableMicButton(text)', canvas: 'enableMicCanvas(message)', banner: 'enableMicBanner(message, position)', custom: 'enableMicOn(selector)', notes: 'Requires p5.sound when using p5.AudioIn.' },
  { capability: 'Sound output', status: 'window.soundEnabled', tap: 'enableSoundTap(message)', button: 'enableSoundButton(text)', canvas: 'enableSoundCanvas(message)', banner: 'enableSoundBanner(message, position)', custom: 'enableSoundOn(selector)', notes: 'Unlocks browser audio playback after a user gesture.' },
  { capability: 'Speech recognition', status: 'window.speechEnabled', tap: 'enableSpeechTap(message)', button: 'enableSpeechButton(text)', canvas: 'enableSpeechCanvas(message)', banner: 'enableSpeechBanner(message, position)', custom: 'enableSpeechOn(selector)', notes: 'Activates audio context. Create your own p5.SpeechRec after permission.' },
  { capability: 'Vibration', status: 'window.vibrationEnabled', tap: 'enableVibrationTap(message)', button: 'enableVibrationButton(text)', canvas: 'enableVibrationCanvas(message)', banner: 'enableVibrationBanner(message, position)', custom: 'enableVibrationOn(selector)', notes: 'Android-oriented. Use vibrate(pattern) for haptics.' },
  { capability: 'NFC', status: 'window.nfcEnabled', tap: 'enableNfcTap(message)', button: 'enableNfcButton(text)', canvas: 'enableNfcCanvas(message)', banner: 'enableNfcBanner(message, position)', custom: 'enableNfcOn(selector)', notes: 'Android Chrome with HTTPS only. Use nfcRead(message, serialNumber).' },
  { capability: 'Camera', status: 'cam.ready', tap: 'enableCameraTap(message)', button: 'enableCameraButton(text)', canvas: 'enableCameraCanvas(message)', banner: 'enableCameraBanner(message, position)', custom: 'enableCameraOn(selector)', notes: 'Pair with createPhoneCamera() for ML5-friendly mapping.' },
  { capability: 'Motion + microphone', status: 'window.sensorsEnabled && window.micEnabled', tap: 'enableAllTap(message)', button: 'enableAllButton(text)', canvas: 'enableAllCanvas(message)', banner: 'enableAllBanner(message, position)', custom: 'enableAllOn(selector)', notes: 'Convenience flow for sketches that need both sensors and mic.' }
];

window.P5PHONE_API_SECTIONS = [
  {
    id: 'core',
    title: 'Core Setup',
    description: 'Functions that most sketches use before enabling hardware access.',
    relatedApis: [
      { label: 'mousePressed()', href: 'https://p5js.org/reference/p5/mousePressed/', summary: 'Touch-compatible press callback for p5.js 2.x sketches.' },
      { label: 'mouseDragged()', href: 'https://p5js.org/reference/p5/mouseDragged/', summary: 'Touch-compatible drag callback for p5.js 2.x sketches.' },
      { label: 'mouseReleased()', href: 'https://p5js.org/reference/p5/mouseReleased/', summary: 'Touch-compatible release callback for p5.js 2.x sketches.' }
    ],
    items: [
      { name: 'lockGestures', signature: 'lockGestures()', summary: 'Disables browser gestures that interfere with full-screen mobile sketches, including scroll, zoom, pull-to-refresh, context menu, and back-swipe behavior.', tags: ['setup', 'mobile'] },
      { name: 'userSetupComplete', signature: 'function userSetupComplete() { ... }', summary: 'Optional sketch callback. p5-phone calls it after a permission request completes successfully.', tags: ['callback'] }
    ]
  },
  {
    id: 'motion',
    title: 'Motion Sensors',
    description: 'Enable orientation, acceleration, movement, and shake data. The public API still uses the historic Gyro name.',
    relatedApis: [
      { label: 'rotationX', href: 'https://p5js.org/reference/p5/rotationX/', summary: 'Device tilt forward and backward.' },
      { label: 'rotationY', href: 'https://p5js.org/reference/p5/rotationY/', summary: 'Device tilt left and right.' },
      { label: 'rotationZ', href: 'https://p5js.org/reference/p5/rotationZ/', summary: 'Device rotation around the screen.' },
      { label: 'accelerationX', href: 'https://p5js.org/reference/p5/accelerationX/', summary: 'Device acceleration left and right.' },
      { label: 'accelerationY', href: 'https://p5js.org/reference/p5/accelerationY/', summary: 'Device acceleration up and down.' },
      { label: 'accelerationZ', href: 'https://p5js.org/reference/p5/accelerationZ/', summary: 'Device acceleration forward and back.' },
      { label: 'deviceOrientation', href: 'https://p5js.org/reference/p5/deviceOrientation/', summary: 'Current device orientation state.' },
      { label: 'deviceMoved()', href: 'https://p5js.org/reference/p5/deviceMoved/', summary: 'Callback fired when movement crosses the move threshold.' },
      { label: 'deviceShaken()', href: 'https://p5js.org/reference/p5/deviceShaken/', summary: 'Callback fired when shaking crosses the shake threshold.' },
      { label: 'setMoveThreshold()', href: 'https://p5js.org/reference/p5/setMoveThreshold/', summary: 'Sets movement callback sensitivity.' },
      { label: 'setShakeThreshold()', href: 'https://p5js.org/reference/p5/setShakeThreshold/', summary: 'Sets shake callback sensitivity.' }
    ],
    items: [
      { name: 'enableGyroTap', signature: 'enableGyroTap(message)', summary: 'Shows a full-screen tap overlay to request motion sensor permission.', tags: ['tap', 'sensors'] },
      { name: 'enableGyroButton', signature: 'enableGyroButton(buttonText, statusText)', summary: 'Adds a generated button for requesting motion sensors.', tags: ['button', 'sensors'] },
      { name: 'window.sensorsEnabled', signature: 'window.sensorsEnabled', summary: 'Boolean status flag. True after motion sensors are active or after the Android no-op path succeeds.', tags: ['status'] }
    ]
  },
  {
    id: 'audio',
    title: 'Microphone, Sound, and Speech',
    description: 'Separate activation paths keep p5.AudioIn, audio playback, and speech recognition clear.',
    relatedApis: [
      { label: 'p5.AudioIn', href: 'https://p5js.org/reference/p5.sound/p5.AudioIn/', summary: 'p5.sound microphone input object.' },
      { label: 'getLevel()', href: 'https://p5js.org/reference/p5.AudioIn/getLevel/', summary: 'Reads the current microphone level.' },
      { label: 'loadSound()', href: 'https://p5js.org/reference/p5/loadSound/', summary: 'Loads a sound file for playback.' },
      { label: 'p5.SoundFile.play()', href: 'https://p5js.org/reference/p5.SoundFile/play/', summary: 'Starts sound-file playback after audio is unlocked.' },
      { label: 'p5.Oscillator', href: 'https://p5js.org/reference/p5.sound/p5.Oscillator/', summary: 'Generated sound source for synth-style sketches.' },
      { label: 'p5.SpeechRec', href: 'https://idmnyu.github.io/p5.js-speech/', summary: 'Speech-recognition helper from p5.js-speech.' }
    ],
    items: [
      { name: 'enableMicTap', signature: 'enableMicTap(message)', summary: 'Requests microphone access from a tap. Use with p5.sound and p5.AudioIn.', tags: ['microphone', 'tap'] },
      { name: 'enableSoundTap', signature: 'enableSoundTap(message)', summary: 'Unlocks browser audio output so sound files or oscillators can play.', tags: ['sound', 'tap'] },
      { name: 'enableSpeechTap', signature: 'enableSpeechTap(message)', summary: 'Activates the audio context for Web Speech API use without creating a p5.AudioIn instance.', tags: ['speech', 'tap'] },
      { name: 'enableAllTap', signature: 'enableAllTap(message)', summary: 'Combines motion sensor and microphone activation in one user-gesture flow.', tags: ['combined'] }
    ]
  },
  {
    id: 'camera',
    title: 'Camera and PhoneCamera',
    description: 'PhoneCamera is optimized for ML5 sketches where video coordinates need to map onto a p5 canvas.',
    relatedApis: [
      { label: 'createCapture()', href: 'https://p5js.org/reference/p5/createCapture/', summary: 'p5.js video-capture helper when you do not need PhoneCamera mapping.' }
    ],
    items: [
      { name: 'createPhoneCamera', signature: "createPhoneCamera(active = 'user', mirror = true, mode = 'fitHeight')", summary: 'Creates a PhoneCamera instance. active is user or environment; mode can be fitHeight, fitWidth, cover, contain, or fixed.', tags: ['camera', 'ml5'] },
      { name: 'cam.onReady', signature: 'cam.onReady(callback)', summary: 'Runs a callback once the camera video element is ready. Initialize ML5 models inside this callback.', tags: ['camera', 'callback'] },
      { name: 'cam.mapKeypoint', signature: 'cam.mapKeypoint(keypoint)', summary: 'Maps one ML5 keypoint from video coordinates into canvas coordinates while handling scaling, offsets, and mirroring.', tags: ['ml5', 'keypoints'] },
      { name: 'cam.mapBox', signature: 'cam.mapBox(box)', summary: 'Maps one object-detection bounding box. Supports x/y/width/height and xMin/yMin/xMax/yMax shapes.', tags: ['ml5', 'boxes'] }
    ]
  },
  {
    id: 'nfc',
    title: 'NFC',
    description: 'Web NFC helpers for Android Chrome sketches that read physical tags and assign aliases.',
    items: [
      { name: 'enableNfcTap', signature: 'enableNfcTap(message)', summary: 'Starts NFC scanning from a user tap. Requires Android Chrome and HTTPS.', tags: ['nfc', 'tap'] },
      { name: 'nfcRead', signature: 'function nfcRead(message, serialNumber) { ... }', summary: 'Optional sketch callback called whenever a tag is read. message.records contains decoded NDEF records and message.alias when available.', tags: ['callback'] },
      { name: 'setNfcTagAlias', signature: 'setNfcTagAlias(serialNumber, alias)', summary: 'Stores a human-readable alias for a tag ID. Pass an empty alias to remove it.', tags: ['alias'] },
      { name: 'isNfcTag', signature: 'isNfcTag(aliasOrSerialNumber, serialNumber)', summary: 'Checks whether the current or supplied serial number matches an alias or raw tag ID. Useful in if statements.', tags: ['alias', 'conditionals'] },
      { name: 'stopNfc', signature: 'stopNfc()', summary: 'Stops active NFC scanning through the internal AbortController.', tags: ['nfc'] }
    ]
  },
  {
    id: 'vibration',
    title: 'Vibration',
    description: 'Android-oriented haptic helpers built on the browser Vibration API.',
    items: [
      { name: 'enableVibrationTap', signature: 'enableVibrationTap(message)', summary: 'Checks vibration support from a tap and sets window.vibrationEnabled.', tags: ['vibration', 'tap'] },
      { name: 'vibrate', signature: 'vibrate(pattern)', summary: 'Triggers vibration. pattern can be a duration number or an array of on/off durations.', tags: ['haptics'] },
      { name: 'stopVibration', signature: 'stopVibration()', summary: 'Stops the current vibration pattern by calling navigator.vibrate(0).', tags: ['haptics'] }
    ]
  },
  {
    id: 'debug',
    title: 'Debug Console',
    description: 'On-screen logging helpers for testing on phones where developer tools are awkward.',
    items: [
      { name: 'showDebug', signature: 'showDebug()', summary: 'Displays the mobile debug panel and captures warnings and errors.', tags: ['debug'] },
      { name: 'debug', signature: 'debug(...args)', summary: 'Writes a normal message to the on-screen debug panel.', tags: ['debug'] },
      { name: 'debugWarn', signature: 'debugWarn(...args)', summary: 'Writes a warning message to the debug panel.', tags: ['debug'] },
      { name: 'debugError', signature: 'debugError(...args)', summary: 'Writes an error message to the debug panel.', tags: ['debug'] }
    ]
  },
  {
    id: 'status',
    title: 'Status Variables',
    description: 'Global flags and last-read values that sketches can check in draw().',
    items: [
      { name: 'permission flags', signature: 'window.sensorsEnabled, micEnabled, soundEnabled, speechEnabled, vibrationEnabled, nfcEnabled', summary: 'Boolean flags for the currently enabled hardware paths.', tags: ['status'] },
      { name: 'NFC state', signature: 'window.nfcStatus, nfcError, lastNfcMessage, lastNfcSerialNumber, lastNfcAlias, nfcTagAliases', summary: 'NFC diagnostic and tag alias state for sketches and debug screens.', tags: ['nfc', 'status'] },
      { name: 'gesture state', signature: 'window.gesturesLocked', summary: 'True after lockGestures() has installed the mobile gesture prevention handlers.', tags: ['status'] }
    ]
  }
];