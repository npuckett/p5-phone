# P5PhoneBLE

**Companion Arduino library for [p5-phone](https://github.com/npuckett/p5-phone).**
Send and receive typed values (bool, int, float, string) between an Arduino
sketch and a p5.js sketch running in a phone browser — over Bluetooth Low
Energy. Designed for classrooms, beginners, and fast prototyping.

> The Arduino is the **peripheral** (it advertises); the phone is the **central**
> (it scans and connects via [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)).

## Supported boards

| Board | BLE backend | Notes |
|---|---|---|
| Arduino UNO R4 WiFi | ArduinoBLE | Primary classroom target |
| Arduino Nano 33 IoT | ArduinoBLE | |
| Arduino Nano 33 BLE | ArduinoBLE | |
| ESP32 / ESP32-S3 / ESP32-C3 | NimBLE-Arduino | 2.x API |
| ESP32-S2 | — | No Bluetooth radio |

## Install

**From the Arduino IDE (Library Manager):** search for **P5PhoneBLE** and click Install.
Dependencies (`ArduinoBLE` and `NimBLE-Arduino`) are installed automatically.

**Manual:** download this repo as a ZIP and use *Sketch → Include Library → Add .ZIP Library…*,
then install `ArduinoBLE` and/or `NimBLE-Arduino` from Library Manager depending on your board.

## The 30-second version

```cpp
#include <P5PhoneBLE.h>
P5PhoneBLE ble;

void setup() {
  ble.sendFloat("temp");          // declare what you'll send, BEFORE begin()
  ble.receiveByte("brightness");  // declare what you'll receive
  ble.setStatusLED(LED_BUILTIN);  // optional: solid=connected, blink=advertising
  ble.begin("p5phone");           // the name the phone sees
}

void loop() {
  ble.update();                            // ALWAYS call update() first
  ble.set("temp", 22.5f);                  // send (skips radio if unchanged)
  int b = ble.getInt("brightness");        // read latest inbound value
  analogWrite(LED_BUILTIN, b);
}
```

Paired p5 sketch (the phone side):

```javascript
bleSetup({
  namePrefix: 'p5phone',
  characteristics: [
    { name: 'temp',       type: 'float', notify: true },   // Arduino → phone
    { name: 'brightness', type: 'uint8', write: true }     // phone → Arduino
  ]
});
```

## The one rule that bites everyone

**Declaration order matters.** The characteristic UUIDs are derived from the
order you register values on the Arduino and the order they appear in the p5
sketch's `characteristics:` array. They **must match exactly**.

```cpp
// Arduino side — order is load-bearing:
ble.sendFloat("temp");          // → characteristic UUID ...0001
ble.receiveByte("brightness");  // → characteristic UUID ...0002
```
```javascript
// p5 side — same order, same names, same types:
characteristics: [
  { name: 'temp',       type: 'float', notify: true },   // index 1 → ...0001
  { name: 'brightness', type: 'uint8', write: true }     // index 2 → ...0002
]
```

Get the order wrong and the phone will write to the wrong characteristic.
Nothing will work and there will be no obvious error. **Memorize this.**

## How names work (send vs. receive)

The Arduino is one side of a conversation. "Send" and "receive" are from the
**Arduino's** point of view:

| Arduino call | Direction | p5 side |
|---|---|---|
| `sendFloat("temp")` | Arduino → phone | `{ name: 'temp', type: 'float', notify: true }` |
| `receiveByte("brightness")` | phone → Arduino | `{ name: 'brightness', type: 'uint8', write: true }` |

The p5-phone example names are written from the **phone's** perspective, so
they're inverted: p5's `01_ble_input` (the phone *receives* temp) pairs with
the Arduino *sending* temp. Each example's header comment spells this out.

## API reference

### Setup (call before `begin()`)

| Method | Purpose |
|---|---|
| `ble.sendBool(name)` | Declare an Arduino→phone `bool` value |
| `ble.sendInt(name)` | Declare an Arduino→phone `int32` value |
| `ble.sendByte(name)` | Declare an Arduino→phone `uint8` value (0–255) |
| `ble.sendFloat(name)` | Declare an Arduino→phone `float` value |
| `ble.sendString(name, maxLen)` | Declare an Arduino→phone UTF-8 string (≤20 bytes) |
| `ble.receiveBool(name)` | Declare a phone→Arduino `bool` value |
| `ble.receiveInt(name)` | Declare a phone→Arduino `int32` value |
| `ble.receiveByte(name)` | Declare a phone→Arduino `uint8` value |
| `ble.receiveFloat(name)` | Declare a phone→Arduino `float` value |
| `ble.receiveString(name, maxLen)` | Declare a phone→Arduino string |
| `ble.addValue(name, type, dir)` | Generic form. `type` ∈ `P5_BOOL, P5_INT8, P5_UINT8, P5_INT16, P5_UINT16, P5_INT32, P5_UINT32, P5_FLOAT, P5_DOUBLE, P5_STRING, P5_BYTES`; `dir` ∈ `P5_SEND, P5_RECEIVE, P5_BOTH` |
| `ble.setDeviceName(name)` | Override the advertised name (default `p5phone`) |
| `ble.setServiceUUID(uuid)` | Override the default service UUID |
| `ble.setStatusLED(pin)` | Solid when connected, slow blink while advertising |
| `ble.setDebug(true)` | Print connect/disconnect/write events to `Serial` |

### Lifecycle

| Method | Purpose |
|---|---|
| `ble.begin()` / `ble.begin(name)` | Start BLE, advertise. Returns false on failure. |
| `ble.update()` | **Call every `loop()`** — pumps BLE events and promotes inbound writes. |
| `ble.isConnected()` | A central is currently attached. |
| `ble.isReady()` | Connected AND ≥500 ms past connect (first notify is safe). |

### Sending (Arduino → phone)

| Method | Notes |
|---|---|
| `ble.set(name, value)` | `bool`/`int`/`long`/`float`/`double`/`const char*`/`String`. **Skips the radio write if the value hasn't changed** and throttles to ≥15 ms between notifies — safe to call every loop. |
| `ble.setFast(name, value)` | Bypass throttle + skip-unchanged for high-frequency data (`float` only). |

### Receiving (phone → Arduino)

| Method | Notes |
|---|---|
| `ble.getBool(name)` | Latest inbound value. |
| `ble.getInt(name)` | Widens whatever int type was declared (`uint8`/`int16`/…) to `int`. |
| `ble.getFloat(name)` | Latest inbound float (or double). |
| `ble.getString(name)` | Latest inbound string. |
| `ble.changed(name)` | **Read-once**: true if a new write arrived since the last call, then clears. Optional — `get*()` always returns the latest value regardless. |
| `ble.has(name)` | Is a value with this name registered? |

## Wire contract (for advanced users)

You usually don't need this — the library handles it — but if you're building
your own peripheral in C/C++ and want to interoperate, here's the spec:

- **Default service UUID:** `19b10000-e8f2-537e-4f6c-d104768a1214`
- **Characteristic UUID derivation:** replace the last 4 hex digits of the
  service UUID's first group with the 1-based index →
  `19b10001-…`, `19b10002-…`. (Hence the declaration-order rule above.)
- **All multi-byte numerics are little-endian** (memcpy of the native value is
  the wire format on ARM/ESP32 — no swapping needed).
- **Strings** are raw UTF-8, no length prefix, no NUL terminator, **≤20 bytes**
  (default ATT MTU ceiling). Over-long strings are clamped + warned in debug.
- **Bytes** are opaque raw bytes, no framing.
- **No framing bytes anywhere.** The GATT characteristic UUID is the only mux.

A host-side contract test (`test/contract_test.cpp`) asserts byte-for-byte
parity with the p5-phone JavaScript side — `float 123.456` → `79 E9 F6 42`,
etc. Run it from the library root:

```sh
g++ -std=c++11 -Isrc test/contract_test.cpp src/P5PhoneBLE_codec.cpp -o /tmp/p5contract && /tmp/p5contract
```

## Examples

| # | Sketch | What it shows | Pairs with |
|---|---|---|---|
| 01 | `SendBool` | Send a button state | any notify consumer |
| 02 | `ReceiveLED` | Receive a number, dim an LED | any write source |
| 03 | `P5Phone_Input` | Send a float sensor value | p5 `ble/01_ble_input` |
| 04 | `P5Phone_Send` | Receive a uint8, dim an LED | p5 `ble/02_ble_send` |
| 05 | `P5Phone_Both` | Bidirectional on one connection | p5 `ble/03_ble_both` |

The matching p5.js sketches live in [`extras/p5/`](extras/p5/).

## Security note

This library uses **open pairing** — no bonding, no encryption. That's fine for
classrooms and workshops (anyone nearby can connect), but don't use it for
anything sensitive. Pairing/bonding is on the phase-2 roadmap.

## License

MIT — see [LICENSE](LICENSE).
