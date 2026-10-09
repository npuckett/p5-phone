# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- **Docs: enabling several inputs and outputs from one tap has its own section.** It was hard to find. `enablePermissions*` appeared on the examples homepage only as one row of the permission table and as cards under Audio and under Torch. The README covered just `enableAll*` (motion plus microphone), under "Combined Activation". Both now have a "Multiple Inputs and Outputs" section in the API, second after Core Setup on the homepage and after Status Variables in the README. It explains the idea and covers all six styles and the list of names, with the status flag each one sets. It also gives the one-call rule and how to add Bluetooth or Share from `userSetupComplete()`. Each Quick Start has a new subheading, "Several inputs and outputs from one tap", with a complete sketch, and the homepage sidebar links both.
- **The README Quick Start no longer leaves motion off.** It called `enableGyroTap()` and then `enableMicTap()`. The second call removes the first one's tap screen, so only the microphone asked. Its comment also claimed the mic tap turns on sound output, but only a `sound` request sets `window.soundEnabled`. It now calls `enablePermissionsTap(['gyro', 'mic', 'sound'], 'Tap to start')`.
- **Docs: `gyro` names motion in the list.** The docs wrote motion as `sensors` in `enablePermissions*` lists. That name is more generic than the others and doesn't match `enableGyroTap()`. They now write `gyro`, which always worked. `sensors`, `motion` and the other names still work too. `gyro` still sets `window.sensorsEnabled`, and the docs say so. The Quick Start's several-at-once sketch is also simpler: motion and the microphone, each checked in `draw()`, with no `mousePressed()`. The README's "Multiple Inputs and Outputs" section points to it instead of repeating a longer sketch.

## [1.15.4] - 2026-10-08

### Fixed
- **In the p5.js Web Editor, only the motion tap gave the sketch focus.** 1.15.3 focused the sketch's canvas when a tap asked for motion, and on touches with `lockGestures()` on. Every other permission tap left focus on the editor page. That was checked in a copy of the editor's frames with the microphone, sound, speech, vibration, torch, camera, GPS and Bluetooth examples. So did a mouse click with `lockGestures()`. The keyboard only reaches the focused frame, so in the Web Editor on a laptop `keyPressed()` never ran once `lockGestures()` was on. Now, inside any iframe, every tap or click on the sketch focuses its canvas, and so does every permission request. That includes a sketch with no permission tap and no `lockGestures()`: there the browser focused the frame but no element in it, so Chrome kept the motion sensors paused. A top-level page is unchanged. `npm run test:focus` (now 43 checks) also covers a vibration tap, a plain tap, and a laptop click followed by a key press; 5 of those focus checks fail on 1.15.3.
- **`torchError` said only "Permission denied" when the camera was blocked.** When a site's camera access is blocked, the browser refuses without asking. Chrome also blocks a site for 7 days after 3 dismissed or 4 unanswered prompts. In an iframe, the permission belongs to the top page, not the sketch's frame. In the p5.js Web Editor that is editor.p5js.org, so unanswered prompts from every editor sketch count together. A torch sketch could fail in the editor and work on GitHub Pages, with no prompt on the phone. `torchError` now names the blocked site and says where to allow the camera again: Android Chrome's site settings or iPhone Safari's Website Settings. In the editor it adds that the setting covers every sketch there. "Permission dismissed" and "Permission denied by system" (the phone's own setting) get their own messages. Other errors are unchanged.
- **NFC in an iframe reported a generic error.** Web NFC only works when the sketch is the whole page. In the p5.js Web Editor on Android, `scan()` fails with an `InvalidStateError`, which p5-phone reported as `nfcStatus` `'error'`. Now, in an iframe, the NFC tap stops before scanning. It sets `nfcStatus` to `'unsupported'`, which the NFC examples already handle, and `nfcError` says to open the sketch on its own page. A top-level page is unchanged. `npm run test:focus` checks both; on 1.15.3 the iframe check fails.

### Changed
- **Docs: what works in the p5.js Web Editor.** This comes from an audit of every input and output in a copy of the editor's frames, checked against Chrome and WebKit source. Motion is the only feature Chrome pauses for an unfocused frame. Keyboard events only reach the focused frame. NFC needs a top-level page, and the editor's iframe does not allow the wake lock. The rest needs only the tap's user gesture inside the sketch. The README FAQ has a table of what works there. The NFC section says it does not work in an iframe. SKILL.md and its four copies, the Copilot instructions, the homepage's `enableNfcTap` entry and the Web Editor troubleshooting table say the same.
- **Docs: the motion tap matters on Android in the p5.js Web Editor.** The README FAQ said the tap is a no-op on Android. It is still needed there, because it is what gives the sketch focus (1.15.3). The FAQ now has a "works on GitHub Pages but not in the Web Editor" entry. SKILL.md and its four copies, the Copilot instructions, the homepage's `enableGyroTap` entry and the Web Editor troubleshooting table say to start motion sketches with a p5-phone tap and to load 1.15.3 or later. CONTRIBUTING lists `npm run test:focus`.
- **`examples/SKILL.zip` holds the current skill.** It still had the short June entry-point file, which pinned `p5-phone@1.10.0`. It now has the full SKILL.md, the same file as the four copies. The workshop page links to it as the skill download.

## [1.15.3] - 2026-10-06

### Added
- Added `npm run test:focus` (`test-iframe-focus.js`), a Playwright check of the fix below. It uses a stand-in for the p5.js Web Editor's frames: an editor.p5js.org page, a preview.p5js.org iframe, and the sketch in a `blob:` iframe. With `lockGestures()` and `enableSensorTap()`, it checks that the tap to start moves focus to the sketch's canvas with no focus ring. It also checks that a tap on the canvas brings focus back after a tap on the editor page took it away. It runs under p5.js 1.x and 2.2.3, and with `lockGestures({ mode: 'embedded' })`. On a top-level page the canvas is left alone. Chrome does not suspend emulated sensors, so the test checks focus rather than readings.

### Fixed
- **Motion did nothing in the p5.js Web Editor on Android.** Since Chrome 153 (stable 2026-09-08), Chrome suspends a frame's motion sensors unless that frame, or one of the same origin, has focus. It resumes them only when an element in the newly focused frame takes focus. The Web Editor runs the sketch in a preview.p5js.org iframe inside editor.p5js.org, and the tap to start never moved focus there: the tap overlay cancels its `touchend`, and `lockGestures()` makes p5 cancel every press. So `deviceShaken()`, `rotationX` and `accelerationX` never changed, while the same sketch on GitHub Pages worked. Now the tap focuses the sketch's canvas: the motion permission request does it, and with `lockGestures()` on, so does a later tap on the sketch. The canvas gets `tabindex="-1"` and is focused with `focusVisible: false`, so no focus ring is drawn. A top-level page (GitHub Pages, localhost) is unchanged. An element the sketch focused itself, such as an input, keeps its focus.

## [1.15.2] - 2026-10-05

### Added
- Added `npm run test:qr` (`test-desktop-qr.js`), a Playwright check of the address `showDesktopQr()` encodes: on a normal page (GitHub Pages, localhost) it is still `location.href`, query and hash included; in a stand-in for the p5.js Web Editor (a `blob:` iframe inside preview.p5js.org with the editor's `<base href>` and `window.editorOrigin`) it is the Present link from both the editor view and a share link; an explicit `url` and `setQrUrl()` still win; an unsaved editor sketch and a `blob:` page outside the editor show no QR.

### Fixed
- **`showDesktopQr()` encoded an address no phone can open in the p5.js Web Editor.** The editor runs a sketch from `blob:https://preview.p5js.org/<uuid>` in an iframe, and that was the QR. The QR is now the sketch's Present link, `https://editor.p5js.org/<user>/full/<id>`, rebuilt from the `<base href>` the editor adds (`https://preview.p5js.org/<user>/sketches/<id>/`) and `window.editorOrigin`. The phone gets the last saved version. An unsaved sketch, and any other `blob:` page, shows no QR (a console line says why) rather than a dead one. Pages served from a real address are unchanged. Share join parameters are left off in the editor, which drops query strings before the sketch sees them; phones join from the room and host set in `shareSetup()`.

## [1.15.1] - 2026-10-02

### Added
- Added `npm run test:input` (`test-input-state.js`), a Playwright check of the first two fixes below: the empty tilt reading under p5.js 1.x, 2.2.3 and 2.3.4 (no warnings for 3 seconds after the tap, then real readings come through), and cancelled touches under p5.js 2.2.3, with and without `lockGestures()` (real cancels from Chromium's touch emulation, a cancel at 0, 0 the way WebKit sends one, two fingers, a mouse), plus a check that p5-phone leaves the cancel to p5.js 2.3.4. `test-input-state.html` is the same check on a laptop and on real phones, with a switch to compare against 1.15.0.
- Added `npm run test:modes` (`test-sketch-modes.js`), a Playwright check of the p5.js 1.x startup fix and the `remove()` globals fix below: a global-mode sketch logs no p5.js warnings under p5.js 1.x and 2.2.3, `p.lockGestures()` and `p.enableGyroTap()` work in instance mode under both, and `remove()` in a global-mode sketch leaves p5-phone's functions on `window`, with no errors after it, under p5.js 1.x, 2.2.3 and 2.3.4.
- Added `npm run test:remove` (`test-remove-cleanup.js`), a Playwright check of the `remove()` fix below under p5.js 2.2.3 and 2.3.4: with `lockGestures()` on, a GPS watch running and Share connected, `remove()` must unlock the gestures, clear the watch and close the Share socket with no reconnect and no `shareClosed()` call; with nothing started, it must not log "GPS watch stopped" or change `geoStatus` and `shareStatus`; and a `remove()` within 100 ms of `lockGestures()` must leave the sketch's mouse handlers unwrapped. GPS and the Share worker are stand-ins, so it needs no location permission or running worker.

### Changed
- **Docs: the torch / flashlight works on iPhone too.** The README, SKILL.md and its copies, the Copilot instructions, the examples homepage and a source comment said it was Android Chrome only. WebKit added the `torch` camera constraint in Safari 17.4 (iOS 17.4), and it was tested on an iPhone on 2026-10-01. `isTorchSupported()` / `window.torchSupported` is still the runtime check for phones with no rear flash and older browsers. The library code did not change.

### Fixed
- **Tilt sketches flooded the console on a laptop.** A computer with no tilt sensor sends one `deviceorientation` event with every angle `null` (Chrome on a laptop does on each page load). p5.js copied it into `rotationX/Y/Z`, which stay `null` in `angleMode(DEGREES)`, so every `map()` or `round()` on them logged "Expected number at the first parameter in map()" each frame: hundreds of warnings a second, in the p5 Web Editor's console too. `window.sensorsEnabled` turns true after the tap on a laptop as well, so gating on it did not help. p5-phone now drops the empty reading before p5 sees it, and `rotationX/Y/Z` stay 0 until a real reading arrives. A reading with any angle in it still goes through. Sketches no longer need their own `deviceorientation` listener for this.
- **Cancelled touches stayed down with p5.js 2.0 to 2.3.0.** Those versions (2.2.3 included) have no `pointercancel` handler, so a touch the phone took back (a system swipe, too many fingers, a scroll or zoom the browser took over) stayed in `touches` until the page reloaded, `mouseIsPressed` stayed `true` until another finger lifted, and `mouseReleased()` never ran for it. p5-phone now hands the cancel to p5's own release handling, with or without `lockGestures()`, at the finger's last position (WebKit sends some cancels at 0, 0). `mouseReleased(e)` gets `e.type === 'pointercancel'`, so a tone started in `mousePressed()` and faded in `mouseReleased()` stops. A mouse's `pointercancel`, sent when a native drag starts, is left to p5, which releases it on `dragend`. p5.js 2.3.1 added its own `pointercancel` handling, which releases the touch without calling `mouseReleased()`; p5-phone leaves the cancel to p5 there.
- **p5.js 1.x logged 144 warnings at startup.** With the unminified p5.js 1.x (`p5.js` rather than `p5.min.js`), a global-mode sketch logged "p5 had problems creating the global function …, possibly because your code is already using that name as a variable" before `setup()` ran, once for each p5-phone function: `lockGestures`, `enableGyroTap` and 142 more. In global mode, p5.js 1.x copies every enumerable `p5.prototype` property onto `window`, and p5-phone's functions are on `window` already. p5-phone now adds them to `p5.prototype` as non-enumerable properties, which that copy skips; instance mode still finds them (`p.lockGestures()`). `remove()` in a 1.x global-mode sketch clears every enumerable `p5.prototype` name from `window`, so it used to set `lockGestures`, `unlockGestures` and the rest to `undefined`; now they stay. p5.js 2.x had the same `remove()` problem another way (next two entries).
- **Removing a p5.js 2.x sketch released nothing.** The p5.js 2.x addon registered its cleanup as `lifecycles.preremove`, but p5.js 2.x only runs the hooks named in `p5.lifecycleHooks` (`presetup`, `postsetup`, `predraw`, `postdraw`, `remove`) and drops any other name without a warning. So `remove()` never did what the hook was for: unlocking the gestures (since 1.12.0; the touch listeners and the back-button trap stayed on the page), clearing the GPS watch (since 1.13.0) and disconnecting Share (since 1.14.0). The hook is now `lifecycles.remove`, which p5 runs after it stops `draw()` and removes the canvas: `remove()` unlocks the gestures, clears the GPS watch and disconnects Share, without calling `shareClosed()`. A sketch that never started GPS does not log "GPS watch stopped". p5.js 1.x sketches still get no cleanup from `remove()`; call `unlockGestures()`, `stopGeo()` and `shareDisconnect()` before it.
- **`remove()` in a p5.js 2.x global-mode sketch cleared p5-phone's functions.** After `remove()`, `lockGestures`, `unlockGestures`, `vibrate`, `debug` and the rest of p5-phone's functions were `undefined` on `window`, so p5-phone code still running on the page, or another sketch started on it, failed with "… is not a function". p5.js 2.x's `remove()` clears every enumerable property of the sketch from `window`, and the addon put p5-phone's functions on each sketch for instance mode. They are non-enumerable there now, as on `p5.prototype` for 1.x, and `p.lockGestures()` still works. Both versions share one list of the 144 functions.
- **`lockGestures()` could wrap the mouse handlers after an unlock.** `lockGestures()` wraps the sketch's mouse handlers (and in p5.js 1.x its touch handlers) 100 ms after it runs. If `unlockGestures()` or `remove()` ran first, the wrap still happened, on an unlocked page, and after a p5.js 2.x `remove()` it threw "debugWarn is not a function". It is skipped now.

### Documentation
- README, SKILL.md (all five copies) and the Copilot instructions: `rotationX/Y/Z` follow `angleMode()`, so they are radians unless the sketch calls `angleMode(DEGREES)`. The README and skill sketches that turn tilt into pixels now call it; in radians, `rotationY * 3` moved a few pixels. The README's rotation ranges are corrected (`rotationY` runs from -90° to 90°, `rotationZ` from 0° to 360°).
- README, SKILL.md and the Copilot instructions: `mouseIsPressed` turns false as soon as any one finger lifts, so multi-finger sketches should test `touches.length > 0`. SKILL.md has a new Touch section.
- The 1.13.0 notes said the GPS watch was released on sketch removal in p5.js 2.x; they now say it was not until this release. The README, the examples homepage and the `lockGestures()` bug write-up said `p.remove()` unlocks the gestures without naming a p5.js version; they now say p5.js 2.x.

## [1.15.0] - 2026-09-26

### Added
- **The sound tap starts Tone.js and your own audio contexts, not only p5.sound.** Every activation that asks for sound or the microphone now also calls `Tone.start()` when Tone.js is loaded, and resumes any `AudioContext` the sketch creates after p5-phone loads (for example `let audio = new AudioContext()` for smplr). p5-phone sees those contexts because it wraps the `AudioContext` constructor when it loads; `new AudioContext()` still returns a plain native context. Sketches that load Tone.js without p5.sound used to get no sound from `enableSoundTap()`.
- **Audio wakes on the next touch.** After the first unlock, any later touch, click or key resumes audio the phone put to sleep, for example after leaving the page or locking the screen. A sketch no longer needs its own `userStartAudio()` in `mousePressed()` for this. Audio the sketch paused on purpose (`userStopAudio()`, `Tone.getContext().rawContext.suspend()`, `ctx.suspend()`) stays paused until the sketch resumes it.
- Added `npm run test:audio` (`test-audio-unlock.js`), a Playwright check of the unlock and the wake with p5.sound 0.3.0, legacy p5.sound, Tone.js (loaded before and after p5-phone) and a sketch's own context. `test-audio-unlock.html` is the same check for real phones, with a switch to compare against 1.14.0.

### Fixed
- **Combined taps started sound after the motion prompt.** `enablePermissionsTap(['motion', 'sound'])`, `enableAllTap()` and the other combined and `enableAll…` styles waited for iOS's motion permission before starting audio. Once the person answers the prompt the tap is over, so iOS could leave the audio off until another tap. Audio now starts first, while the tap is still being handled. The single-permission helpers (`enableSoundTap()`, `enableMicTap()`, …) already did this.

## [1.14.0] - 2026-09-21

### Added
- Added **Share** multi-user shared state via Cloudflare PartyServer: `shareSetup()`, `shareConnect()` / `shareDisconnect()`, proxied `shared` / `me` / `guests`, `shareSet` / `shareSetMe` / `shareEmit`, and `enableShareTap|Button|Canvas|Banner|Minimal|On` gesture helpers.
- Share join links: `shareSetup` reads `?shareHost=&room=&app=` (URL overrides config); `getShareJoinUrl()` builds the link; `showDesktopQr()` after `shareSetup` encodes it (and updates the address bar) so students only scan/open one URL.
- Added companion template [`companion/P5PhoneShare`](companion/P5PhoneShare) (Durable Object room + wire protocol) for free-tier deploy with Wrangler.
- Share sync behavior: last write wins and every phone converges on the worker's order, even when two phones write the same key at once (the worker echoes shared patches to their sender). Arrays sync (`shared.list.push(x)`, index writes). Unchanged values are not re-sent and changes are batched every 50 ms (`shareSetup({ sendInterval })`), so per-frame `me.x = mouseX` stays inside the Cloudflare free tier. `me` set before joining or before a reconnect is kept. On phones, a hidden page (locked screen, other app) leaves the room at once and rejoins when visible (`disconnectWhenHidden`, default on mobile). Wire protocol v2; see [PROTOCOL.md](companion/P5PhoneShare/PROTOCOL.md).
- `enableShareTap('Join')` and the other `enableShare*` helpers accept a label string as well as an options object.
- Added examples `share/01_share_shared`, `02_share_presence`, `03_share_both`.
- Added `test-share-contract.js` for JSON/patch helpers; wired into `npm test`.
- Added `npm run test:share` (`test-share-e2e.js`): runs the companion worker under `wrangler dev` and drives several emulated phones through joining, sync, presence, events, host handoff, reconnect, hidden pages, room reset, concurrent writes, and the share examples. `test-share.html` runs the share examples against `src/` on real phones.
- Added a sixth permission-activation style, **Minimal**: a bare semi-transparent full-screen overlay with an optional radiating circular icon in the center, as a cleaner alternative to the frosted message box used by `Tap`. Color, opacity, icon, icon color, and icon size are all adjustable.
- Added `enableSensorMinimal()`, `enableMicMinimal()`, `enableSoundMinimal()`, `enableSpeechMinimal()`, `enableVibrationMinimal()`, `enableTorchMinimal()` (+ `enableFlashlightMinimal` alias), `enableNfcMinimal()`, `enableGeoMinimal()`, `enableBleMinimal()`, `enableAllMinimal()`, `enableCameraMinimal()`, and `enablePermissionsMinimal()` (+ `enableHardwareMinimal` alias). Call forms: `enableXxxMinimal('Tap')`, `enableXxxMinimal({ color, opacity, icon, iconColor, iconSize, message })`, or `enableXxxMinimal('Tap', { opacity: 0.6 })`.
- Added `showDesktopQr()`, `hideDesktopQr()`, and `setQrUrl()` — a dev helper that renders a floating QR code of the current page on **desktop only** and is a no-op on mobile, so you never have to generate or dismiss a QR on the phone. Options: `{ url, position, size, label, closable, rememberDismiss }`. Closing the panel hides it for the session.
- Added device-detection globals `window.isMobile` and `window.isDesktop` (best-effort: UA + coarse-pointer + touch signals, including the iPadOS-13+ Mac-UA case).
- Added `window.micOpen`: `true` only while the microphone stream is really live (works with p5.sound 0.3.x and the legacy p5.sound for p5.js 1.x). `window.micEnabled` is unchanged and still only means the request ran — it is `true` even when the person denies the microphone or no input exists, because p5.sound 0.3.x swallows that failure inside `mic.start()`.
- With the legacy p5.sound, a failed `mic.start()` now logs a clear p5-phone warning (and shows in the debug panel).
- Added `npm run test:press`, a Playwright check that taps every activation style under p5.js 1.x and 2.x with mouse and touch and asserts p5 is left fully released.

### Fixed
- **Enabling tap left p5 half-pressed.** The Tap, Button, Banner, and Minimal activation UIs (and `enable…On()` custom elements) called `stopPropagation()` on the release (`touchend` / `pointerup`) but not on the press. p5 listens on `window`, so it saw the press and never the release: `mouseIsPressed` stayed `true`, `touches[]` kept a phantom entry, and `mouseReleased()` / `touchEnded()` never fired until the next complete tap. Affected p5.js 2.x with mouse and touch, and p5.js 1.x with touch. The release now propagates; `preventDefault()` on `touchend` is kept so the synthesized click cannot land on the sketch once the UI is removed.
- Touch activation now runs from `touchend` rather than the `pointerup` that precedes it. A fast handler (vibration, sound, Android motion) used to remove the overlay between the two events, and a `touchend` dispatched to a detached element never reaches `window`, so p5.js 1.x missed the release. Apple Pencil is handled the same way.
- Examples that called `mic.getLevel()` threw `mic.getLevel is not a function` with p5.sound 0.3.x as soon as the mic was enabled (`blankTemplate`, `UXcompare/microphone-demo`, `UXcompare/slider-vs-microphone`, `combined/01_permissions_combo`, homepage snippets). They now read the level through `p5.Amplitude`.
- `UXcompare/microphone-demo` and `UXcompare/gyroscope-demo`: the START button did nothing, so the mic / motion sensors never turned on. It now calls `enableMicOn` / `enableGyroOn`.
- `UXcompare/slider-vs-microphone` defined `mousePressed` / `mouseDragged` / `mouseReleased` twice; the unused copy is gone.

### Documentation
- Root `SKILL.md` was missing the Share docs; all five SKILL.md copies are identical again.
- README, SKILL.md, and agent instructions no longer document `mic.getLevel()`, which does not exist on `p5.AudioIn` in p5.sound 0.3.x. The documented pattern is `mic.disconnect(); mic.connect(amplitude); amplitude.getLevel()`. The `disconnect()` matters: every p5.sound 0.3.x node is wired to the speakers by default.

### Notes
- The desktop QR lazily loads `qrcodejs` from a CDN only when shown on desktop, so mobile sketches download no extra bytes. It gracefully warns and removes the panel if the CDN is blocked (strict CSP / offline).

## [1.13.0] - 2026-07-21

### Added
- Added GPS / geolocation support via `navigator.geolocation` — works on both iOS Safari and Android Chrome (HTTPS required). Coarse by default for battery friendliness; opt into real GPS with `setGeoOptions({ enableHighAccuracy: true })`.
- Added `enableGeoTap()`, `enableGeoButton()`, `enableGeoCanvas()`, `enableGeoBanner()`, and `enableGeoOn()` gesture-gated activation helpers.
- Added `stopGeo()`, `setGeoOptions()`, `getGeoPosition()`, `geoDistance()` (Haversine), and `geoInPolygon()` (ray-casting geofence test).
- Added GPS status globals: `window.geoEnabled`, `geoStatus`, `geoError`, and `lastGeoPosition`.
- Added optional sketch callbacks: `geoRead(position)` for position updates and `onGeoError(error)` for stream errors.
- Added `geo` / `gps` / `location` / `geolocation` tokens to the permission router (`enablePermissionsTap(['geo'], …)`).
- Added `test-geo-contract.js` for the `geoDistance` / `geoInPolygon` pure helpers; wired into `npm test`.

### Notes
- The GPS watch was meant to be released automatically on sketch removal in p5.js 2.x, preventing the shared-watch leak that affected the legacy `p5.geolocation` library. **Correction:** it was not. The hook was registered as `lifecycles.preremove`, a name p5.js 2.x ignores, so from 1.13.0 to 1.15.0 the watch kept running after `remove()`. Fixed in the release after 1.15.0.
- iOS does not deliver GPS updates while the screen is locked or the tab is backgrounded.
- `navigator.permissions.query({name:'geolocation'})` always returns `'prompt'` on Safari (WebKit bug); p5-phone does not gate UI on it.

## [1.12.1] - 2026-06-11

### Added
- Added `bleRead()` for polling read-only BLE characteristics.
- Wired `npm test` to `test-ble-contract.js`, testing the shipped encode/decode helpers.

### Fixed
- Fixed duplicate BLE notification listeners stacking on auto-reconnect.
- Fixed BLE auto-reconnect giving up after a single failed attempt; retries now use backoff until `bleDisconnect()`.
- Fixed `bleSetup()` accepting duplicate characteristic names silently.
- Fixed unbounded canvas permission polling in `_createCanvasToEnable`.
- Fixed `PhoneCamera.remove()` leaving instances in `window._phoneCameras`.
- Fixed p5 version detection defaulting to v1 when p5-phone loads before p5.js.
- Fixed debug panel HTML injection via `innerHTML`.
- Added warnings for oversized BLE string writes and read-only BLE profiles.

## [1.12.0] - 2026-06-08

### Added
- Added Web Bluetooth (BLE) support for typed send/receive between p5.js sketches and Arduino-class peripherals.
- Added `bleSetup()`, `bleConnect()`, `bleDisconnect()`, `bleWrite()`, and `isBleSupported()`.
- Added `enableBleTap()`, `enableBleButton()`, `enableBleCanvas()`, `enableBleBanner()`, and `enableBleOn()` gesture-gated connect helpers.
- Added BLE status globals: `window.bleSupported`, `bleConnected`, `bleStatus`, `bleError`, `bleDeviceName`, and `bleValues`.
- Added optional sketch callbacks: `bleReceive(name, value)`, `bleReady(deviceName)`, and `bleClosed()`.
- Added UUID auto-derivation in `bleSetup()` when characteristic UUIDs are omitted (matches the P5PhoneBLE Arduino contract).
- Added `examples/Phone Sensor Examples/ble/01_send_receive/`.

### Notes
- Web Bluetooth requires HTTPS (or localhost). iOS Safari/Chrome do not support it; use the Bluefy browser on iPhone/iPad.
- Embedded iframes (e.g. Canvas LMS) need `allow="bluetooth"` on the iframe element.

## [1.11.0] - 2026-06-02

### Added
- Added Android Chrome-oriented torch/flashlight control through the rear camera track.
- Added `enableTorchTap()`, `enableTorchButton()`, `enableTorchCanvas()`, `enableTorchBanner()`, and `enableTorchOn()` permission helpers plus matching `enableFlashlight*` aliases.
- Added `torchOn()`, `torchOff()`, `toggleTorch()`, `setTorch()`, `stopTorch()`, and flashlight aliases for simple operation.
- Added `window.torchEnabled`, `window.torchSupported`, `window.torchActive`, `window.torchError`, and `window.torchCapability` status globals.
- Added `torch`, `flashlight`, `flash`, and `light` aliases to `enablePermissions*()` and `enableHardware*()` multi-hardware permission helpers.
- Added touch, disco, and shake flashlight examples.

## [1.10.0] - 2026-06-02

### Added
- Added `enablePermissionsTap()`, `enablePermissionsButton()`, `enablePermissionsCanvas()`, `enablePermissionsBanner()`, and `enablePermissionsOn()` for requesting any selected combination of hardware permissions from one user gesture.
- Added `enableHardware*` aliases for the new arbitrary-combination permission helpers.
- Added `window.cameraEnabled` and included camera status in the `permissionsReady` event detail.

## [1.9.3] - 2026-06-02

### Fixed
- Fixed `PhoneCamera` drawing in p5.js 2.x by rendering the native video element directly instead of passing p5 media wrappers back through `image()`.
- Improved `PhoneCamera` display sizing by using the native video element dimensions when available.
- Updated ML5 PhoneCamera examples to wait for model-loaded callbacks before starting detection.

## [1.9.2] - 2026-06-02

### Fixed
- Fixed p5.js 2.x global-mode startup crashes caused by duplicate p5-phone addon registration of globals such as `lockGestures()`.
- Kept p5.js 2.x instance-mode support by attaching p5-phone methods during the `presetup` lifecycle instead of registering colliding prototype globals.

### Changed
- Updated the npm peer dependency range to advertise support for both p5.js 1.x and 2.x.
- Updated examples and teaching snippets to use p5.js `2.2.3`, `p5.js-compatibility@0.2.0` preload support, and `p5.sound@0.3.0` where sound is required.
- Converted image and sound asset-loading examples from `preload()` to `async setup()` with awaited `loadImage()` and `loadSound()` calls.

## [1.9.1] - 2026-06-02

### Added
- NFC tag alias helpers: `setNfcTagAlias()`, `getNfcTagAlias()`, and `isNfcTag()` for naming physical tags and using aliases in conditionals.
- NFC read messages now include `message.alias`, with `window.lastNfcAlias` and `window.nfcTagAliases` available for sketches.
- NFC two-tag effects example showing `shirt` and `table` aliases used in simple `if (isNfcTag(...))` branches.
- Basic movement examples for `deviceShaken()`, `deviceMoved()`, and `deviceOrientation`, including threshold controls for `setShakeThreshold()` and `setMoveThreshold()`.
- Motion Synth sound example showing generated p5.sound oscillator audio controlled by phone motion sensors.
- `PhoneCamera.mapBox()` and `PhoneCamera.mapBoxes()` for mapping ML5 object-detection bounding boxes through p5-phone camera scaling and mirroring.
- ML5 phone object detection example using `ml5.objectDetection('cocossd')` and mapped bounding boxes.

### Changed
- NFC example is now a tag identifier workflow with larger centered tag IDs, alias entry, and a downloadable tag-name list.
- ML5 FaceMesh and HandPose examples now use the current `flipped: false` option name.

### Fixed
- PHONE BodyPose example now tracks the right shoulder at index `12` instead of the nose for the shoulder-distance pair.

## [1.9.0] - 2026-04-08

### Added
- **NFC Tag Reading (Android Only)**: Read NFC tags via the Web NFC API (`NDEFReader`)
  - 5 UI activation styles: `enableNfcTap()`, `enableNfcButton()`, `enableNfcCanvas()`, `enableNfcBanner()`, `enableNfcOn()`
  - `stopNfc()` to stop scanning via `AbortController`
  - `window.nfcEnabled` status variable
  - `window.lastNfcMessage` / `window.lastNfcSerialNumber` globals for most recent tag data
  - User-defined `nfcRead(message, serialNumber)` callback with pre-decoded NDEF records (text, url, mime/JSON)
  - Graceful degradation on unsupported platforms (iOS, desktop) with console warnings
  - Registered on `window`, `p5.prototype`, and `p5.registerAddon()` for p5.js 1.x and 2.0+ compatibility
- NFC documentation section in README with platform support, API reference, record types table, and examples
- NFC example: `examples/Phone Sensor Examples/nfc/01_nfc_read/`
- NFC added to `.github/instructions/p5-phone.instructions.md` permission table

## [1.8.0] - 2025-06-26

### Added
- **p5.js 2.0 compatibility**: Full support for both p5.js 1.x and 2.0+
  - Automatic version detection via `p5.VERSION` (`_p5MajorVersion`, `_isP5v2`)
  - `p5.registerAddon()` integration for p5.js 2.0+ (in addition to existing `p5.prototype` registration)
  - `_overrideP5Touch()` conditionally wraps touch callbacks only in 1.x (no-ops in 2.0 where Pointer API handles all input)
- p5.js 2.0 CDN comments in all example HTML files
- `test-p5v2.html` — test page for verifying p5.js 2.0 compatibility
- "p5.js Version Compatibility" section in README with feature matrix

### Changed
- All 31 example `sketch.js` files: `touchStarted()` → `mousePressed()`, `touchMoved()` → `mouseDragged()`, `touchEnded()` → `mouseReleased()` (works in both p5.js 1.x and 2.0)
- Homepage `index.html` updated: Touch Events section → Touch/Pointer Events, function declarations renamed
- Section headers in examples updated from "TOUCH EVENT FUNCTIONS" to "INPUT EVENT FUNCTIONS"
- README code examples updated to use `mousePressed`/`mouseReleased` instead of `touchStarted`/`touchEnded`
- Updated `.github/copilot-instructions.md` and `.github/instructions/p5-phone.instructions.md` with 2.0 compatibility notes

## [1.7.0] - 2025-06-25

### Added
- **Permission UI Styles**: Three new ways to present permission prompts
  - **Canvas style** (`enableSensorCanvas`, `enableMicCanvas`, etc.) — message drawn on the p5 canvas, tap canvas to activate
  - **Banner style** (`enableSensorBanner`, `enableMicBanner`, etc.) — animated slide-in banner at top of screen
  - **Custom element** (`enableSensorOn`, `enableMicOn`, etc.) — bind activation to any HTML element via CSS selector
- `enableSpeechButton(text)` — button-based speech recognition activation (was missing)
- All 21 new API functions registered on both `window` and `p5.prototype`

### Fixed
- **Timing bug**: `_initializeP5TouchOverrides()` replaced infinite `window._setupDone` poll with canvas-detection loop (max 50 attempts)
- **Duplicate notifications**: `enableAllTap`/`enableAllButton` now use internal Core functions to prevent multiple `_notifySketchReady()` calls
- **Infinite polling**: `_checkVideoReady()` now has max 100 attempts (10s timeout) instead of polling forever
- **Console override safety**: `_setupConsoleOverrides()` wrapped in try/catch to prevent crashes
- **Missing global**: Added `window.speechEnabled = false` initialization
- Removed dead `_permissionsInitialized` variable
- `_notifySketchReady()` event detail now includes `speech: window.speechEnabled`

### Changed
- `_removeExistingUI()` now also removes `#permissionBanner` elements
- Internal permission handlers split into Core (no notify) + wrapped (with notify) pairs

## [1.6.4] - 2025-01-31

### Added
- **Speech Recognition Support**: New `enableSpeechTap()` method for Web Speech API integration
  - Activates audio context without creating p5.AudioIn (prevents microphone hardware conflict on mobile)
  - Compatible with p5.js-speech library and p5.SpeechRec
  - Includes new speech recognition example using touch-to-talk pattern
  - Works reliably on mobile devices (Android/iOS)

## [1.6.1] - 2025-01-29

### Fixed
- Version comment in source file header (was incorrectly showing v1.5.0)

## [1.6.0] - 2025-01-29

### Added
- **PhoneCamera Class**: New ML5-optimized camera class for computer vision integration
  - `createPhoneCamera(active, mirror, mode)` - Create camera with display options
  - `cam.videoElement` - Clean API to access native HTML video element for ML5
  - `cam.onReady(callback)` - Callback fired when camera is initialized
  - `cam.mapKeypoint(keypoint)` - Map single ML5 keypoint to screen coordinates
  - `cam.mapKeypoints(keypoints)` - Map array of ML5 keypoints to screen coordinates
  - Display modes: 'fitHeight', 'cover', 'contain', 'fixed'
  - Properties: `cam.ready`, `cam.video`, `cam.active`, `cam.mirror`, `cam.mode`
  
- **Auto-initialization**: Camera permission detection and automatic initialization
- **iOS orientation fix**: Proper handling of video orientation with MediaPipe runtime
- **ML5 Integration Examples**: 
  - FaceMesh (468 keypoints, nose tracking)
  - HandPose (21 keypoints, 3D depth, both hands)
  - BodyPose (33 keypoints, BlazePose, full skeleton)

### Changed
- Camera initialization now waits for permissions to prevent iOS orientation bugs
- All ML5 examples use `runtime: 'mediapipe'` for consistent cross-platform behavior

### Fixed
- iOS video rotation bug (90-degree rotation) in BodyPose tracking
- Coordinate mapping offset handling with Math.max(0, dims.x) for negative offsets
- Camera permission handling on iOS requiring user interaction

### Documentation
- Added comprehensive PhoneCamera (ML5 Integration) section to README
- API reference for all PhoneCamera methods and properties
- Display modes documentation
- Coordinate mapping explanation
- Important notes about ML5 flipping options and iOS compatibility

## [1.5.0] - Previous Release

Initial stable release with core phone sensor functionality.
