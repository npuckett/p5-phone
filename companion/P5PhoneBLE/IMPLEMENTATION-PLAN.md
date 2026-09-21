# P5PhoneBLE — Companion Arduino Library Implementation Plan

Goal: take the existing scaffold in `companion/P5PhoneBLE/` (public header +
metadata, all methods stubbed) to a shippable Arduino Library Manager release
that pairs with the BLE module in `src/p5-phone.js` (v1.12.0).

Audience assumption (same as p5-phone): students/artists who have never used
BLE. The API must work with name strings and `set()`/`getX()` only — no UUIDs,
no callbacks required.

---

## 0. Current state

| Piece | Status |
|---|---|
| `src/P5PhoneBLE.h` | Complete public API surface, `Value` struct, backend `#ifdef` split |
| `src/P5PhoneBLE.cpp` | UUID derivation + registry (`addValue`, `_find`, `_deriveUUID`) real; everything BLE is a stub (`begin()` returns false) |
| `library.properties` | Drafted; `depends=` needs rework (see §6) |
| `keywords.txt`, `README.md` | Drafted |
| Examples | None yet |
| JS side | `bleSetup`/`bleConnect`/`bleWrite`/notify pipeline shipped; `test-ble-contract.js` defines reference vectors |

## 1. Wire contract (frozen — must match p5-phone.js exactly)

These are already implemented on the JS side and must not drift:

- **Service UUID** default: `19b10000-e8f2-537e-4f6c-d104768a1214`
  (overridable on both ends; 128-bit hyphenated form only).
- **Characteristic UUIDs** derive from declaration order: the last 4 hex chars
  of the first UUID segment become the 1-based index → `19b10001-…`,
  `19b10002-…`. **Declaration order on the Arduino must match the
  `characteristics` array order in `bleSetup()`.** This is the #1 user
  footgun — both READMEs and the troubleshooting docs must hammer it.
- **Byte order:** little-endian for all multi-byte numerics. (Convenient: AVR/
  ARM/Xtensa are all little-endian, so `memcpy` of the native value is the
  wire format — no swapping.)
- **Types:** bool(1), int8(1), uint8(1), int16(2), uint16(2), int32(4),
  uint32(4), float(4), double(8), string(UTF-8), bytes(raw).
- **Phase-1 size limit: 20 bytes per value** (default ATT MTU 23 − 3). The JS
  side already warns on >20-byte notified strings. Arduino side should clamp
  and (in debug mode) print a warning. MTU negotiation is a later phase.
- **Direction mapping:**
  - Arduino `P5_SEND` ⇄ JS `notify: true` → characteristic properties **Read + Notify**
  - Arduino `P5_RECEIVE` ⇄ JS `write: true` → properties **Write + WriteWithoutResponse**
  - Arduino `P5_BOTH` ⇄ JS `notify: true, write: true` → all four
  (Including Read on SEND characteristics costs nothing and makes a future JS
  `bleRead()` work without an Arduino library update.)
- **Advertising:** advertise the service UUID + a local name (default
  `"p5phone"`, settable via `begin(name)` / `setDeviceName`). The JS filter is
  `namePrefix` + service UUID, so the name must be a *prefix-stable* string.

Contract verification: extend `test-ble-contract.js` vectors (float 123.456 →
`79 E9 F6 42`, etc.) into a table shared by a host-side C++ unit test (§7) so
both ends test against the same bytes.

## 2. Architecture

Single public class, two private backends selected at compile time (already
set up in the header):

```
P5PhoneBLE.h            — public API + Value registry (board-agnostic)
P5PhoneBLE.cpp          — registry, UUID derivation, encode/decode, shared logic
P5PhoneBLE_ArduinoBLE.cpp  — #ifdef P5PHONE_USE_ARDUINOBLE (UNO R4 WiFi, Nano 33 IoT, Nano 33 BLE)
P5PhoneBLE_NimBLE.cpp      — #ifdef P5PHONE_USE_NIMBLE (ESP32, S3, C3; S2 excluded — no radio)
```

Keep the encode/decode and `changed()`/dirty logic in the shared .cpp so the
backends only do: init stack, create service/characteristics, advertise,
poll/callbacks, raw read/write of byte buffers. Target: backends < ~150 lines
each.

`Value` struct grows two fields vs the scaffold: a `uint8_t pending[20]` +
`pendingLen` staging buffer written from BLE callbacks/poll, and a
`changedFlag` consumed by `changed()`. (NimBLE callbacks run on a separate
FreeRTOS task — see §4 concurrency note.)

## 3. Phase A — ArduinoBLE backend (first, simplest)

Boards: **UNO R4 WiFi** (primary classroom target), Nano 33 IoT, Nano 33 BLE.

1. `begin(name)`:
   - `BLE.begin()`; fail → return false (and blink status LED if set).
   - Create `BLEService(_serviceUUID)`.
   - For each registered value, create the right `BLECharacteristic` flavor.
     ArduinoBLE has typed classes (`BLEFloatCharacteristic`,
     `BLEBoolCharacteristic`, …) but to keep one code path use the generic
     `BLECharacteristic(uuid, props, maxLen)` with our own encode/decode —
     also the only way to honor little-endian explicitly for `string`/`bytes`.
   - `BLE.setLocalName(name)`, `BLE.setAdvertisedService(service)`,
     `BLE.addService(service)`, `BLE.advertise()`.
2. `update()`:
   - `BLE.poll()`.
   - Track connect/disconnect transitions (`BLE.connected()`), drive status
     LED (solid = connected, slow blink = advertising), and **re-advertise on
     disconnect** — ArduinoBLE resumes advertising automatically on most
     cores, but verify per board; UNO R4 needed an explicit `BLE.advertise()`
     in some core versions. This pairs with the JS `autoReconnect` path.
   - For each RECEIVE/BOTH value: `if (ch->written())` copy into `pending`,
     set `changedFlag`.
3. `set(...)` overloads: encode into a 20-byte scratch, compare against
   `lastBytes` — **skip the radio write if unchanged** (lets students call
   `set()` every loop() without flooding notifications), else
   `ch->writeValue(buf, len)` (triggers notify). `setFast()` skips the
   compare *and* applies no throttle.
   - Add a default notify throttle for SEND values (e.g. min 15 ms between
     notifies per characteristic, drop-intermediate semantics) so
     `set("x", analogRead(A0))` at loop speed doesn't saturate the link.
     Document; `setFast()` bypasses.
4. `getBool/getInt/getFloat/getString`: decode from `lastBytes` (after
   `update()` promotes `pending` → `lastBytes`). `getInt` must decode whatever
   the declared type is (uint8, int16, int32…) and widen — the README example
   `ble.getInt("brightness")` on a `receiveByte` must work.
5. `changed(name)`: returns the flag **and clears it** (read-once semantics —
   matches how students use it: `if (ble.changed("btn")) {...}`). Document.
6. `isConnected()` = link up; `isReady()` = link up **and** initial
   subscription seen (at least one CCCD subscribe or ~500 ms post-connect
   grace) so the first `set()` after connect isn't dropped before the phone
   subscribes. `getRSSI()` → `BLE.rssi()`.

Exit criteria: round-trip with the shipped JS module on UNO R4 WiFi against
Chrome/Android using the README's matching-sketch pair, all 11 types.

## 4. Phase B — NimBLE backend (ESP32 family)

Same public behavior via NimBLE-Arduino 2.x:

- `NimBLEDevice::init(name)`, server + service + characteristics with
  `NIMBLE_PROPERTY::READ | NOTIFY` / `WRITE | WRITE_NR` per direction.
- Writes arrive in `NimBLECharacteristicCallbacks::onWrite` on the NimBLE host
  task, **not** in `loop()`. Copy into `pending` under a `portMUX`/critical
  section (or `std::atomic` flag + 20-byte buffer swap); `update()` promotes
  to `lastBytes` on the Arduino task. No heap, no String in the callback.
- Server callbacks `onConnect`/`onDisconnect`; on disconnect call
  `NimBLEDevice::startAdvertising()` (NimBLE does **not** auto-resume by
  default in 2.x).
- Advertise service UUID + name; keep adv payload ≤31 bytes (128-bit UUID +
  name "p5phone" fits; warn in debug if a long device name pushes the name to
  scan-response).
- Pin NimBLE-Arduino version in docs/CI (2.x had breaking API changes from
  1.x; code targets 2.x).

Exit criteria: same round-trip matrix on ESP32 and ESP32-C3 (C3 is
single-core — good concurrency smoke test).

## 5. Phase C — Examples ladder

Mirror the p5 webeditor examples so each Arduino example names its exact p5
counterpart sketch in a header comment (and vice versa). Each example ≤60
lines, heavily commented, no extra hardware beyond the named part:

1. `01_SendButton` — `sendBool("button")`, onboard/user button → p5 circle.
2. `02_ReceiveLED` — `receiveByte("brightness")` → PWM LED ← p5 touch Y.
3. `03_SendSensor` — `sendFloat("level")` from `analogRead`, shows throttling.
4. `04_Bidirectional` — button up + LED down in one sketch (`P5_SEND` + `P5_RECEIVE`).
5. `05_SendString` — `sendString("msg", 20)`, 20-byte limit demonstrated.
6. `06_CustomUUIDs` — `setServiceUUID` + explicit per-value UUIDs (two boards
   in one classroom without cross-connecting).
7. `07_StatusLED_Debug` — `setStatusLED`, `setDebug(true)` serial tracing.

Plus `extras/p5/` (or links) holding the paired p5 sketches, generated through
the existing `webeditor/projects/` export pipeline so they get web-editor
links like the rest of the repo.

## 6. Phase D — Packaging & metadata fixes

- **`depends=ArduinoBLE,NimBLE-Arduino` is wrong as-is**: Library Manager
  installs *both* on every platform. Options, in order of preference:
  1. `depends=ArduinoBLE (>=1.3.0),NimBLE-Arduino (>=2.0.0)` and accept the
     dual install (harmless, ~no flash cost since only one is compiled) — but
     verify NimBLE-Arduino *compiles cleanly when merely installed* on
     samd/renesas (it's include-guarded, should be fine);
  2. drop `depends=` and document manual installs per board in README.
  Decide after testing fresh-install UX in Arduino IDE 2.x.
- `architectures=samd,nrf52,renesas_uno,esp32` — correct; also add `mbed_nano`
  (Nano 33 BLE is mbed-core `nrf52`-class but identifies as `mbed_nano`).
- The Library Manager requires the library at the **root of its own repo**
  (`url=https://github.com/npuckett/P5PhoneBLE`). Plan: develop here in
  `companion/P5PhoneBLE/`, publish via a sync script or `git subtree split`
  to the standalone repo, tag releases there. Add this to the release
  checklist so the two never drift (the wire contract lives in both repos).
- `keywords.txt`: cover every public method (KEYWORD2) + class (KEYWORD1).
- Version: start the standalone repo at 1.0.0 when Phase A+B+C land; keep
  0.x while only ArduinoBLE works.

## 7. Phase E — Testing & CI

1. **Host-side contract test** (no hardware): compile `P5PhoneBLE.cpp`'s
   encode/decode + `_deriveUUID` natively (they're already Arduino-free except
   `String`; guard or stub it) and assert against the same byte vectors as
   `test-ble-contract.js`. Run in CI next to the JS test so the contract is
   enforced from both sides of the wire.
2. **Compile matrix CI** (GitHub Actions + `arduino-cli`): build all examples
   for `arduino:renesas_uno:unor4wifi`, `arduino:samd:nano_33_iot`,
   `arduino:mbed_nano:nano33ble`, `esp32:esp32:esp32`, `esp32:esp32:esp32c3`.
   This catches the #ifdef split rotting long before a human flashes a board.
3. **Hardware-in-the-loop checklist** (manual, per release): connect /
   disconnect / phone-walks-away reconnect, all types round-trip, 20-byte
   string clamp, two boards + custom UUIDs simultaneously, Android Chrome +
   iOS Bluefy.
4. JS-side fixes that this work surfaces (tracked in `REPO-ANALYSIS.md`):
   duplicate notify listeners on reconnect, missing `bleRead()` for the Read
   property we're exposing, single-shot auto-reconnect.

## 8. Deliberately out of scope (phase 2+ backlog)

- MTU negotiation / values >20 bytes (chunking protocol).
- Security: pairing/bonding (everything is open — fine for workshops, say so
  in the README).
- Central role on the Arduino (it is peripheral-only by design).
- `P5_BYTES` convenience API beyond raw set/get (no struct packing helpers yet).
- RP2040/Pico W support (BTstack backend — third `#ifdef` branch later).

## Suggested order of work

| Step | Depends on | Output |
|---|---|---|
| 1. Shared encode/decode + dirty/changed logic in `P5PhoneBLE.cpp` | — | testable core |
| 2. Host-side contract test + CI for it | 1 | wire contract locked |
| 3. ArduinoBLE backend on UNO R4 WiFi | 1 | first live round-trip |
| 4. Examples 01–04 + paired p5 sketches | 3 | classroom-usable |
| 5. NimBLE backend | 1 | ESP32 family |
| 6. Examples 05–07, README rewrite, keywords | 4,5 | docs complete |
| 7. Compile-matrix CI, library.properties decision | 5 | release gate |
| 8. Subtree split → standalone repo, tag, Library Manager submission | 7 | shipped |
