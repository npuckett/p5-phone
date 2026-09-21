---
name: p5-phone
description: "Use when generating p5-phone examples or answering questions about p5-phone APIs: mobile sensors, device orientation, accelerometer, gyroscope, touch, microphone, p5.sound, speech recognition, PhoneCamera, ML5 camera mapping, vibration, torch/flashlight, NFC, Bluetooth BLE, Share multi-user PartyServer rooms, GPS/geolocation, geoDistance/geoInPolygon, lockGestures, enablePermissionsTap, enableHardwareTap, arbitrary hardware combinations, mobile browser permissions, p5.js 2 compatibility."
argument-hint: "Describe the p5-phone example or API question"
---

# p5-phone: Mobile Hardware for p5.js

p5-phone is a single-file helper library that gives p5.js sketches access to mobile phone hardware — motion sensors, microphone, sound, speech, camera (with ML5 coordinate mapping), vibration, torch/flashlight, NFC, GPS/geolocation, Bluetooth LE, and multi-user Share rooms — plus mobile gesture locking, browser-permission activation UI, and an on-screen debug console. Current version: **1.14.0**.

It works in **both p5.js 1.x and 2.x** (auto-detected at runtime). Every public function is attached to `window` (global mode) and mirrored on `p5.prototype` (instance mode), so you call them as bare globals like `lockGestures()` and `enableSensorTap()`.

**Pair this with the `p5js-2x` skill.** p5-phone only unlocks the hardware and hands you *p5's own* globals and objects; the p5.js 2.x language patterns around them (async asset loading, the unified pointer/touch model, renamed APIs) live in the `p5js-2x` skill. Load both when writing phone sketches — and read the next section before writing any hardware code.

## When to use this skill

Use it whenever the request involves a p5-phone sketch, mobile p5.js hardware interaction, or an explanation of how p5-phone works: device orientation / accelerometer / gyroscope, touch, microphone / p5.sound, speech recognition, `PhoneCamera` and ML5 mapping, vibration, torch/flashlight, NFC, GPS/geolocation (`geoRead`, `geoDistance`, `geoInPolygon`), Bluetooth BLE, Share multi-user rooms (`shareSetup`, `shared`/`me`/`guests`), `lockGestures`, `enablePermissionsTap` / `enableHardwareTap`, arbitrary hardware combinations, mobile browser permissions, or p5.js 2 compatibility.

## Quick Start

For generated examples, produce a complete `index.html` **and** `sketch.js` unless the user asks for a single file or snippet.

HTML baseline (p5.js 2-compatible):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile p5.js App</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/p5-phone@1.12.1/dist/p5-phone.min.js"></script>
</head>
<body>
  <script src="sketch.js"></script>
</body>
</html>
```

Add p5.sound **only** when the sketch uses microphone levels, oscillators, audio input, sound output, or speech. Place it after p5 and before `p5-phone`/`sketch.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/p5.sound@0.3.0/dist/p5.sound.min.js"></script>
```

Minimal sketch (`sketch.js`):

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableSensorTap('Tap to enable motion sensors');
}

function draw() {
  background(20);
  if (!window.sensorsEnabled) {
    fill(255);
    textAlign(CENTER, CENTER);
    text('Waiting for sensors', width / 2, height / 2);
    return;
  }
  // rotationX / rotationY / rotationZ are p5.js built-ins, live once sensorsEnabled is true.
  fill(0, 180, 255);
  circle(width / 2 + rotationY * 4, height / 2 + rotationX * 4, 80);
}

function mousePressed() {
  return false; // let p5-phone's gesture handling manage the touch
}
```

## Golden Rules

1. **Call `lockGestures()` in every mobile sketch `setup()`.** It blocks pull-to-refresh, swipe-back, pinch-zoom, double-tap zoom, long-press menus, and overscroll so the canvas behaves like an app.
2. **Request every permission from a user gesture.** iOS grants sensitive APIs only during *transient user activation* (a tap/click). Never auto-request on page load — use an `enable*` activation UI.
3. **Gate all hardware reads behind the matching `window.*Enabled` flag** (`sensorsEnabled`, `micEnabled`, `bleConnected`, etc.). Reading before permission returns stale/undefined data.
4. **Use `mousePressed` / `mouseDragged` / `mouseReleased`, not p5 1.x `touchStarted` / `touchMoved` / `touchEnded`.** The mouse callbacks fire for both mouse and touch in p5.js 1.x and 2.x; the touch callbacks are removed/no-ops in p5.js 2.
5. **Serve over HTTPS** (or `localhost`). Sensors, mic, camera, NFC, BLE, GPS, and torch all require a secure context on mobile.
6. **Need several hardware features from one tap? Use a single combined call** — `enablePermissionsTap(['sensors', 'torch'])` — not several single-permission binds on the same gesture. One call keeps iOS transient activation intact and fires `userSetupComplete()` once.
7. **Use exactly one activation style per permission need** unless the user explicitly asks to compare styles.

## Use p5.js built-ins — do not reimplement them

The most common failure mode is a model **hand-rolling hardware plumbing** (a raw `DeviceOrientationEvent` listener, a `touchstart` handler, a Web Audio graph, a manual asset loader) instead of reading the values p5-phone and p5.js already provide. p5-phone deliberately surfaces everything through *p5's own* globals and objects. For each concern below, use the p5 built-in — never a bespoke equivalent:

| p5-phone concern | Use these p5.js built-ins (not custom code) | Notes |
| --- | --- | --- |
| Device orientation | `rotationX`, `rotationY`, `rotationZ` (+ `pRotationX/Y/Z`) | p5 globals; p5-phone only gates them via `sensorsEnabled` |
| Acceleration | `accelerationX/Y/Z`, `pAccelerationX/Y/Z` | p5 globals |
| Rotation rate | `rotationRateAlpha`, `rotationRateBeta`, `rotationRateGamma` | p5 globals |
| Motion events / thresholds | `deviceMoved()`, `deviceShaken()`, `setMoveThreshold()`, `setShakeThreshold()`, `deviceOrientation` | define the callbacks as globals |
| Touch / pointer input | `mousePressed()`, `mouseDragged()`, `mouseReleased()`, `mouseX`, `mouseY`, `touches[]` | p5.js 2 unifies mouse+touch under the pointer model; use `touches[]` for multitouch. Do **not** add your own `addEventListener('touchstart', …)` |
| Drawing the camera feed | `image(cam, x, y, w, h)` + `cam.mapKeypoint()/mapBox()` | `PhoneCamera` integrates with p5's `image()`; map ML5 results with its helpers, not manual video compositing |
| Microphone level / analysis | `p5.AudioIn`, `p5.Amplitude`, `p5.FFT` (p5.sound) | not a raw Web Audio graph |
| Generated sound | `p5.Oscillator`, `p5.Envelope` (p5.sound) | prefer over `loadSound()` for portability |
| Loading images/audio/JSON/font | `await loadImage()/loadSound()/loadJSON()/loadFont()` in `async setup()` | p5.js 2: `load*` return Promises — no `preload()`. See the `p5js-2x` skill |
| Mapping / ranges | `map()`, `constrain()`, `lerp()` | p5 math helpers |

Two specific traps worth calling out:

- **Motion values are p5.js built-ins, not p5-phone APIs.** p5-phone only requests the *permission* and sets `window.sensorsEnabled`. The data (`rotationX`, `accelerationX`, `deviceShaken()`, …) comes straight from p5.js. Do not invent p5-phone getters for them.
- **There is no `bleValue()` getter.** Read incoming BLE data from `window.bleValues[name]` or from the `bleReceive(name, value)` callback. `bleValues` is an object keyed by characteristic name.

## Permissions model

Every hardware family exposes the same **five activation styles**. Pick one:

- **Tap** — `enable<Feature>Tap(message)` — full-screen tap overlay.
- **Button** — `enable<Feature>Button(buttonText, statusText?)` — auto-generated button.
- **Canvas** — `enable<Feature>Canvas(message)` — prompt drawn on the p5 canvas.
- **Banner** — `enable<Feature>Banner(message, position?)` — animated slide-in banner (`position` = `'top'`/`'bottom'`).
- **On (custom element)** — `enable<Feature>On(selector)` — bind activation to any existing HTML element by CSS selector.

Full matrix:

| Feature | Tap | Button | Canvas | Banner | On (selector) |
| --- | --- | --- | --- | --- | --- |
| Motion sensors | `enableSensorTap(msg)` | `enableSensorButton(text)` | `enableSensorCanvas(msg)` | `enableSensorBanner(msg)` | `enableSensorOn(sel)` |
| Microphone | `enableMicTap(msg)` | `enableMicButton(text)` | `enableMicCanvas(msg)` | `enableMicBanner(msg)` | `enableMicOn(sel)` |
| Sound output | `enableSoundTap(msg)` | `enableSoundButton(text)` | `enableSoundCanvas(msg)` | `enableSoundBanner(msg)` | `enableSoundOn(sel)` |
| Speech | `enableSpeechTap(msg)` | `enableSpeechButton(text)` | `enableSpeechCanvas(msg)` | `enableSpeechBanner(msg)` | `enableSpeechOn(sel)` |
| Vibration | `enableVibrationTap(msg)` | `enableVibrationButton(text)` | `enableVibrationCanvas(msg)` | `enableVibrationBanner(msg)` | `enableVibrationOn(sel)` |
| Torch / flashlight | `enableTorchTap(msg)` | `enableTorchButton(text)` | `enableTorchCanvas(msg)` | `enableTorchBanner(msg)` | `enableTorchOn(sel)` |
| NFC | `enableNfcTap(msg)` | `enableNfcButton(text)` | `enableNfcCanvas(msg)` | `enableNfcBanner(msg)` | `enableNfcOn(sel)` |
| GPS / geolocation | `enableGeoTap(msg)` | `enableGeoButton(text)` | `enableGeoCanvas(msg)` | `enableGeoBanner(msg)` | `enableGeoOn(sel)` |
| Bluetooth (BLE) | `enableBleTap(opts?)` | `enableBleButton(opts?)` | `enableBleCanvas(opts?)` | `enableBleBanner(opts?)` | `enableBleOn(sel)` |
| Share (multi-user) | `enableShareTap(opts?)` | `enableShareButton(opts?)` | `enableShareCanvas(opts?)` | `enableShareBanner(opts?)` | `enableShareOn(sel)` |
| Camera | `enableCameraTap(msg)` | `enableCameraButton(text)` | `enableCameraCanvas(msg)` | `enableCameraBanner(msg)` | `enableCameraOn(sel)` |
| Sensors + mic | `enableAllTap(msg)` | `enableAllButton(text)` | `enableAllCanvas(msg)` | `enableAllBanner(msg)` | `enableAllOn(sel)` |
| Any combination | `enablePermissionsTap(list, msg)` | `enablePermissionsButton(list, text)` | `enablePermissionsCanvas(list, msg)` | `enablePermissionsBanner(list, msg)` | `enablePermissionsOn(sel, list)` |

Notes:

- `enableBle*` take an **options object** (`{ label, message, statusText, position }`), unlike the other families which take positional `(message, position)` / `(buttonText, statusText)`.
- `enableShare*` also take an **options object** (same shape as `enableBle*`). Call `shareSetup({ host, room })` first; deploy [companion/P5PhoneShare](companion/P5PhoneShare/).
- `enableGyro*` is a **legacy alias** for `enableSensor*`. Prefer `enableSensor*` for new examples; use `enableGyro*` only to match older published sketches.
- `enableAll*` is shorthand for sensors + mic. For any other mix, use `enablePermissions*`.
- `enableHardware*` is an exact alias of `enablePermissions*`.

### Combining features

`enablePermissions*` (a.k.a. `enableHardware*`) takes a list plus a message. The list can be an array or a space/comma string.

**Canonical tokens:** `sensors`, `mic`, `sound`, `speech`, `vibration`, `torch`, `nfc`, `geo`, `camera`.

**Aliases** (all normalized to the canonical tokens): `sensor`, `motion`, `orientation`, `gyro`, `gyroscope`, `accelerometer` → `sensors`; `microphone`, `audioin` → `mic`; `audio`, `audiooutput`, `output` → `sound`; `voice`, `recognition` → `speech`; `vibrate`, `haptic`, `haptics` → `vibration`; `flashlight`, `flash`, `light` → `torch`; `tag`, `tags` → `nfc`; `gps`, `location`, `geolocation` → `geo`; `video`, `webcam` → `camera`; `all` → `sensors` + `mic`.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enablePermissionsTap(['sensors', 'mic'], 'Tap to enable motion + microphone');
}

function draw() {
  if (!window.sensorsEnabled || !window.micEnabled) return;
  // Use motion values and microphone input here.
}
```

## Status variables and callbacks

Read these `window.*` flags before using hardware data:

- **Motion:** `sensorsEnabled`
- **Microphone:** `micEnabled`
- **Sound:** `soundEnabled`
- **Speech:** `speechEnabled`
- **Vibration:** `vibrationEnabled`
- **Torch:** `torchEnabled`, `torchSupported`, `torchActive`, `torchError`, `torchCapability`
- **NFC:** `nfcEnabled`, `nfcStatus`, `nfcError`, `nfcTagAliases`, `lastNfcSerialNumber`, `lastNfcAlias`, `lastNfcMessage`
- **GPS:** `geoEnabled`, `geoStatus`, `geoError`, `lastGeoPosition`
- **BLE:** `bleSupported`, `bleConnected`, `bleStatus`, `bleError`, `bleDeviceName`, `bleValues`
- **Share:** `shareSupported`, `shareConnected`, `shareStatus`, `shareError`, `shareRoom`, `shareClientId`, `shareIsHost`, `shared`, `me`, `guests`
- **Camera:** `cameraEnabled`
- **Gestures:** `gesturesLocked`

Callbacks your sketch can define (p5-phone calls them if present):

- `userSetupComplete()` — fires once immediately after permissions succeed.
- `deviceMoved()`, `deviceShaken()` — p5.js motion events (available after `sensorsEnabled`).
- `nfcRead(message, serialNumber)` — a tag was read.
- `geoRead(position)` — a new GPS position arrived. `position` is a plain object: `{ latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, timestamp }`.
- `onGeoError(error)` — a GPS stream error after the watch started. `error.code`: 1=`PERMISSION_DENIED`, 2=`POSITION_UNAVAILABLE`, 3=`TIMEOUT`.
- `bleReceive(name, value)` — a BLE characteristic notified or was read.
- `shareReady()` — Share room welcome applied.
- `shareReceive(path, value)` — remote Share patch applied.
- `shareClosed()` / `shareHostChanged(isHost)` / `shareEvent(name, data)` — Share lifecycle and emits.

```javascript
function userSetupComplete() {
  debug('Permissions ready');
}
```

## Motion sensors

After `window.sensorsEnabled` is true, read p5.js built-ins:

- Orientation: `rotationX`, `rotationY`, `rotationZ`
- Acceleration: `accelerationX`, `accelerationY`, `accelerationZ`
- Rotational velocity: `rotationRateAlpha`, `rotationRateBeta`, `rotationRateGamma`
- Events: `deviceMoved()`, `deviceShaken()`
- Thresholds: `setMoveThreshold(value)`, `setShakeThreshold(value)`
- Orientation state: `deviceOrientation`

iOS requires the sensor permission to be requested from a tap/click. Never auto-request motion permission on page load.

## Microphone and sound

Include p5.sound and create `p5.AudioIn()` before enabling mic. For simple examples read levels with `mic.getLevel()` after `window.micEnabled` is true. Avoid wiring `p5.Amplitude.setInput(mic)` before permission — p5.sound 0.3.0 can throw in p5.js 2 previews.

```javascript
let mic;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  mic = new p5.AudioIn();
  enableMicTap('Tap to enable microphone');
}

function draw() {
  background(0);
  if (!window.micEnabled) return;
  const level = mic.getLevel();
  circle(width / 2, height / 2, 40 + level * 600);
}
```

For generated audio, use `enableSoundTap()` (or `enableSoundOn(selector)`) to resume the AudioContext, then `p5.Oscillator`. Prefer generated sound over `loadSound()` unless the user provides audio assets — it is more portable in the p5 Web Editor.

## Speech recognition

`enableSpeech*` satisfies the mobile audio/user-activation requirement and sets `window.speechEnabled`; it deliberately does **not** create a `p5.AudioIn` (which would conflict with the mic). After activation, create your own Web Speech API `SpeechRecognition` object.

## Camera and ML5 (`PhoneCamera`)

`createPhoneCamera(active = 'user', mirror = true, mode = 'fitHeight')` returns a `PhoneCamera`. The camera is not initialized until an `enableCamera*` gesture (this fixes an iOS rotation bug).

- `active`: `'user'` (front) or `'environment'` (rear).
- `mirror`: mirror the display (front cameras usually `true`).
- `mode`: `'fitHeight'`, `'fitWidth'`, `'cover'`, `'contain'`, or `'fixed'`.

```javascript
let cam;
let model;

function setup() {
  createCanvas(405, 720);
  lockGestures();
  cam = createPhoneCamera('user', true, 'fitHeight');
  enableCameraTap('Tap screen to enable camera');

  cam.onReady(async () => {
    model = await ml5.handPose({ maxHands: 1, runtime: 'mediapipe', flipped: false });
    model.detectStart(cam.videoElement, gotResults);
  });
}
```

`PhoneCamera` properties: `ready`, `video` (p5 element), `videoElement` (native `<video>` for ML5), `width`, `height`, `active`, `mirror`, `mode`, `fixedWidth`, `fixedHeight`.

Coordinate-mapping methods (video space → display space, mirror-aware):

- `cam.onReady(callback)` — safe point to start ML5.
- `cam.getDimensions()` → `{ x, y, width, height, scaleX, scaleY }`.
- `cam.mapPoint(x, y)` → `{ x, y }`.
- `cam.mapKeypoint(keypoint)` / `cam.mapKeypoints(keypoints)`.
- `cam.mapBox(box)` / `cam.mapBoxes(boxes)`.
- `cam.remove()` — stop and clean up the camera.

Set ML5 `flipped: false` when available — `PhoneCamera` already handles mirroring and coordinate mapping, so pass raw ML5 results through the `map*` helpers.

For `ml5@1` with `p5@2.2.3`, add the preload-counter polyfill before loading ml5:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
<script>
  p5.prototype._incrementPreload ||= function() {};
  p5.prototype._decrementPreload ||= function() {};
</script>
<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
```

For Three.js pages that use ML5 but are not p5 sketches, put p5, the compatibility shim, the preload-counter polyfill, and ml5 in the document `<head>` so p5 Web Editor preview injection does not run before p5 exists.

## NFC

Android Chrome only, requires HTTPS. Compatible with widely available NFC Type 2 tags — NTAG213, NTAG215, NTAG216 — and any NDEF-formatted tag.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enableNfcTap('Tap to enable NFC');
}

function nfcRead(message, serialNumber) {
  setNfcTagAlias(serialNumber, 'example-tag');
  debug('Read NFC tag: ' + serialNumber);
}

function draw() {
  background(20);
  if (isNfcTag('example-tag')) {
    background(0, 120, 255);
  }
}
```

Helpers: `setNfcTagAlias(serialNumber, alias)`, `getNfcTagAlias(serialNumber?)` (defaults to `window.lastNfcSerialNumber`), `isNfcTag(aliasOrSerialNumber)`, `stopNfc()`. Track state via `window.nfcStatus` (`idle`/`starting`/`requesting-permission`/`scanning`/`tag-read`/`permission-denied`/`unsupported`/`secure-context-required`/`error`/`stopped`) and `window.nfcError`.

## GPS / geolocation

Cross-platform (iOS Safari + Android Chrome), requires HTTPS. Builds on `navigator.geolocation` — the only well-supported API in 2026. **Coarse by default** (battery-friendly, ~50-100m); opt into real GPS via `setGeoOptions({ enableHighAccuracy: true })` *before* enabling. Cold start can take 5-30s.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  // Optional: real GPS (~5-10m outdoors). Omit for coarse default.
  setGeoOptions({ enableHighAccuracy: true });
  enableGeoTap('Tap to enable GPS');
}

function draw() {
  background(20);
  const pos = window.lastGeoPosition;
  if (pos) {
    text(pos.latitude.toFixed(5) + ', ' + pos.longitude.toFixed(5), width / 2, height / 2);
  } else if (window.geoStatus === 'requesting-permission') {
    text('Acquiring GPS…', width / 2, height / 2);
  }
}

function geoRead(position) {
  // { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, timestamp }
}
```

Helpers: `setGeoOptions({ enableHighAccuracy?, timeout?, maximumAge? })` (call before `enableGeo*`), `getGeoPosition()` (sync last position or `null`), `geoDistance(lat1, lon1, lat2, lon2, units)` (Haversine; `'m'` default, `'km'`, `'mi'`), `geoInPolygon([{lat,lon},…], {lat,lon})` (ray-casting geofence test), `stopGeo()`. Track state via `window.geoStatus` (`idle`/`requesting-permission`/`active`/`permission-denied`/`unsupported`/`secure-context-required`/`error`/`stopped`) and `window.geoError`. Optional error callback: `onGeoError(error)`.

Gotchas: iOS does not track in background/locked screen; in-app browsers (Instagram/Facebook) usually fail — tell users to open in Safari; `navigator.permissions.query({name:'geolocation'})` always returns `'prompt'` on Safari (WebKit bug), so don't gate UI on it.

## Bluetooth Low Energy (BLE)

Web Bluetooth exchanges typed values with Arduino-class peripherals. Call `bleSetup()` in `setup()` before any connect helper; connect from a user gesture via `enableBle*`.

Platform support:
- Chrome/Edge on Android and desktop over HTTPS (or localhost).
- iOS Safari/Chrome: not supported — use the **Bluefy** browser app.
- Embedded iframes need `allow="bluetooth"`.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();

  bleSetup({
    namePrefix: 'p5phone',      // optional device-name filter
    autoReconnect: true,        // optional
    characteristics: [
      { name: 'temp', type: 'float', notify: true },
      { name: 'brightness', type: 'uint8', write: true }
    ]
  });

  enableBleButton({ label: 'Connect device' });
  showDebug();
}

function draw() {
  background(20);
  if (bleConnected) {
    text('temp: ' + (bleValues.temp ?? '—'), 20, 40);
  }
}

function mousePressed() {
  if (bleConnected) {
    bleWrite('brightness', floor(map(mouseX, 0, width, 0, 255)));
  }
  return false;
}

function bleReceive(name, value) {
  debug('BLE ' + name + ' = ' + value);
}
```

`bleSetup(config)` fields:
- `serviceUUID` — hyphenated 128-bit UUID; defaults to the P5PhoneBLE service if omitted.
- `namePrefix` — optional device-name filter.
- `autoReconnect` — optional boolean.
- `characteristics` — required array of `{ name, type, read?, write?, notify?, uuid? }`. Each needs at least one of `read`/`write`/`notify`. Omit `uuid` to auto-derive it from the service UUID and declaration order (must match the P5PhoneBLE Arduino side). Names must be unique.

Valid `type` values: `bool`, `int8`, `uint8`, `int16`, `uint16`, `int32`, `uint32`, `float`, `double`, `string`, `bytes`. Numeric types use little-endian byte order.

Lifecycle and I/O:
- `enableBle*(options)` — connect from a user gesture.
- `bleConnect()` / `bleDisconnect()` — programmatic connect/disconnect (connect still needs a gesture).
- `bleRead(name)` — async; reads and decodes a characteristic, updates `window.bleValues[name]`, returns the value.
- `bleWrite(name, value, opts?)` — async; `opts.ack === false` uses write-without-response (default is write-with-response). String writes over ~20 bytes may truncate on default-MTU peripherals.
- `isBleSupported()` — boolean.
- `bleReceive(name, value)` — your callback, fired on notify and on read.

`window.bleStatus` progresses through `idle`/`connecting`/`connected`/`requesting`/`disconnected`/`error`/`unsupported`. `bleValues` is not cleared on disconnect (sketches keep rendering last-known values).

## Share (multi-user / PartyServer)

Sync JSON variables across phones in one room. Client API mirrors BLE (`shareSetup` → gesture connect → status globals). Backend is [companion/P5PhoneShare](companion/P5PhoneShare/) (Cloudflare PartyServer Durable Object) — **each project deploys its own free worker**.

**Agent: launch a server for this user’s project** (student, artist, or class):

1. Confirm they have (or can create) a free Cloudflare account
2. `cd companion/P5PhoneShare && npm install`
3. `npx wrangler login` (interactive — ask the user to finish in the browser if needed)
4. `npx wrangler deploy` — capture the printed `https://….workers.dev` URL
5. Put that URL in **their** sketch: `shareSetup({ host: 'https://…', room: '…' })`
6. Explain: the worker stays up without their laptop; friends join the sketch URL / QR (`showDesktopQr()`), and do not need to deploy unless they want their own project server
7. Do **not** invent or reuse a public shared relay URL

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  shareSetup({
    host: 'https://YOUR.workers.dev', // from wrangler deploy — this project’s server
    room: 'my-game',
    app: 'final-project',
    shared: { score: 0 },
    me: { x: 0.5, y: 0.5, name: 'a' }
  });
  enableShareTap({ label: 'Tap to join room' });
  showDesktopQr(); // invite link for friends; also updates the address bar
}
```

Join URL shape: `?shareHost=https://….workers.dev&room=my-game&app=final-project`  
Helpers: `getShareJoinUrl()`, `showDesktopQr({ share: false })` to opt out.  
Full path: `companion/P5PhoneShare/README.md`.

Rules:
- Values must be JSON-serializable plain data (no functions, DOM, `NaN`, class instances).
- Mutate `shared` / `me` like objects, or use `shareSet('pos.x', v)` / `shareSetMe(...)`.
- `guests` is read-mostly (other players' `me` snapshots); mutating it does not sync.
- `shareIsHost` is true for the lexicographically first connected client; re-elected on leave.
- Wire protocol: see `companion/P5PhoneShare/PROTOCOL.md`.
- Roadmap: localStorage host memory, short room codes, one-click deploy, adapters, `shareThrottle`.

## Vibration

Use `enableVibration*` before `vibrate(pattern)`. iOS does not support the Vibration API — write examples that still show useful feedback when `window.vibrationEnabled` is false.

```javascript
function mousePressed() {
  if (window.vibrationEnabled) {
    vibrate([40, 30, 80]); // ms on / off / on, or a single number
  }
  return false;
}
```

`stopVibration()` cancels an ongoing pattern.

## Torch / flashlight

Android-Chrome-oriented, requires HTTPS, works through a rear-camera stream. Enable with `enableTorch*()` (or `enablePermissions*(['torch'])`), then control the light:

- `torchOn()`, `torchOff()`, `toggleTorch()`, `setTorch(enabled)` (async), `stopTorch()`, `isTorchSupported()`.
- Flashlight aliases: `enableFlashlight*`, `flashlightOn()`, `flashlightOff()`, `toggleFlashlight()`, `setFlashlight()`, `stopFlashlight()`.

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  enablePermissionsTap(['sensors', 'torch'], 'Tap to enable shake flashlight');
}

async function deviceShaken() {
  if (window.sensorsEnabled && window.torchEnabled) {
    await toggleTorch();
  }
}
```

Keep flashing pulses slow and short, avoid rapid strobing, and call `torchOff()` or `stopTorch()` when the effect ends.

## lockGestures reference

```javascript
lockGestures(options?)
```

`options`:
- `mode` — `'fullscreen'` (default) or `'embedded'`.
- `element` — target element for embedded mode (defaults to the first `<canvas>`).
- `warnBeforeLeave` — show a leave-confirmation prompt (default `false`).
- `trapHistory` — trap back/forward navigation (default `true` in fullscreen, `false` in embedded).

Use bare `lockGestures()` for full-screen mobile sketches. Use `lockGestures({ mode: 'embedded', element: canvas })` for a canvas embedded in a scrollable, multi-section page — it scopes gesture blocking to that canvas so the rest of the page still scrolls. `unlockGestures()` restores the saved handlers, listeners, and styles. `window.gesturesLocked` reflects the current state.

Caveat: p5 touch/mouse callbacks are snapshotted when gestures lock. If you assign `window.mousePressed = ...` *after* `lockGestures()`, you replace p5-phone's wrapper. Define your callbacks before locking, or reassign is fine as long as you `return false` from them.

## Debug console

For on-device troubleshooting, call `showDebug()` once in `setup()`, then log:

- `debug(message)`, `debugWarn(message)`, `debugError(message)`
- `hideDebug()`, `toggleDebug()`

Most useful for camera, NFC, BLE, and permission troubleshooting. Use sparingly in finished examples.

## Platform support matrix

| Feature | iOS Safari | Android Chrome |
| --- | --- | --- |
| Motion sensors | ✓ (permission tap required) | ✓ (no prompt) |
| Microphone | ✓ | ✓ |
| Sound output | ✓ | ✓ |
| Speech recognition | Web Speech API support varies | ✓ |
| Camera | ✓ | ✓ |
| Vibration | ✗ (API absent) | ✓ |
| Torch / flashlight | ✗ | ✓ |
| NFC | ✗ | ✓ (HTTPS) |
| GPS / geolocation | ✓ (HTTPS, user gesture) | ✓ (HTTPS, user gesture) |
| Bluetooth BLE | ✗ (use Bluefy app) | ✓ (HTTPS) |
| Share (PartyServer) | ✓ (WebSocket) | ✓ (WebSocket) |

All hardware requires a secure context (HTTPS or localhost).

## Troubleshooting

- **Permission never fires / `*Enabled` stays false** — the request must run inside a user gesture. Confirm you used an `enable*` activation UI and did not call it on load. On iOS a single gesture only grants one activation window, so combine features with one `enablePermissions*` call.
- **ML5 throws about `_incrementPreload` / preload with p5@2.2.3** — add the preload-counter polyfill shim before loading ml5 (see Camera section).
- **Torch or NFC does nothing** — both are Android-Chrome + HTTPS only; check `window.torchSupported` / `window.nfcStatus`.
- **GPS hangs on "Acquiring…" or times out** — cold start can take 5-30s, longer indoors; move outdoors, retry, and confirm OS-level Location Services is on. `window.geoStatus` tells you which state you're in.
- **GPS denied even after tapping Allow** — the OS-level Location Services toggle (iOS Settings → Privacy & Security → Location Services; Android Settings → Location) must also be on; in-app browsers (Instagram/Facebook) usually fail — open in Safari/Chrome.
- **BLE won't connect on iPhone** — Web Bluetooth is unavailable in iOS Safari/Chrome; use the Bluefy app.
- **Share won't connect** — confirm `shareSetup({ host })` uses the deployed `*.workers.dev` URL (https), `wrangler deploy` succeeded, and the room name matches across devices.
- **Touch callbacks never run** — `touchStarted/Moved/Ended` are no-ops in p5.js 2; switch to `mousePressed/mouseDragged/mouseReleased`.
- **Mic example throws in preview** — don't call `p5.Amplitude.setInput(mic)` before `window.micEnabled`; read `mic.getLevel()` after permission.

## Answering questions

- Explain the browser-permission reason, especially iOS transient user activation.
- Distinguish sensors, mic, sound-only, speech, camera, vibration, torch, NFC, GPS, BLE, and Share permissions/connections.
- Mention HTTPS requirements for mobile hardware.
- Mention p5.js 2 event changes when touch callbacks are involved.
- Flag browser/device limits clearly: torch and NFC are Android-Chrome-oriented; vibration is unsupported on iOS; BLE needs Bluefy on iOS; speech recognition depends on Web Speech API support.
- Point to the bundled examples under `examples/` when useful — feature folders include `movement/`, `microphone/`, `sound/`, `touch/`, `vibration/`, `camera/`, `torch/`, `nfc/`, `geo/`, `ble/`, and `combined/`, plus `ml5/`, `UIStyles/`, and `UXcompare/`.
- When migrating examples to the p5 Web Editor, follow the web-editor batch-sync workflow in `docs/web-editor/` and record links in `webeditorLinks.md`.

## Example quality checklist

Before finishing generated code, confirm:

- `lockGestures()` is called in `setup()`.
- The permission request happens from a user-activation path (tap, button, banner, canvas, or custom element).
- Hardware data is read only after the matching `window.*Enabled` flag is true.
- The HTML includes the needed dependencies and no unused heavy libraries.
- p5.js 2-compatible `mouse*` callbacks are used (not p5 1.x touch callbacks).
- Text and canvas output fit mobile screens.
- Asset-dependent examples either include the assets or clearly document that the user must upload them.
- ML5 camera examples include the p5 2 compatibility shim and use `PhoneCamera` mapping helpers.
