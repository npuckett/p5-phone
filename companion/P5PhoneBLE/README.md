# P5PhoneBLE (scaffold)

Companion Arduino library for the p5-phone Web Bluetooth module. This folder is a **scaffold** for the full library described in the p5-phone BLE implementation spec (Part B).

## Wire contract (must match p5-phone.js)

- Default service UUID: `19b10000-e8f2-537e-4f6c-d104768a1214`
- Characteristic UUIDs auto-derive from declaration order: index 1 → `19b10001-...`, index 2 → `19b10002-...`, etc.
- All numeric types: **little-endian** byte order
- JS side: `bleSetup({ characteristics: [{ name, type, notify/write }] })`
- Arduino side: `sendFloat("temp")`, `receiveByte("brightness")`, same names/types/order

## Target boards

| Board | BLE backend |
|---|---|
| Arduino UNO R4 WiFi | ArduinoBLE |
| Arduino Nano 33 IoT / BLE | ArduinoBLE |
| ESP32 / ESP32-S3 / ESP32-C3 | NimBLE-Arduino |

ESP32-S2 has no Bluetooth radio — not supported.

## Status

This scaffold provides the public header API and library metadata. Full implementation (ArduinoBLE + NimBLE branches, examples ladder, handshake/LED) is the next development phase. See `src/P5PhoneBLE.h` for the planned class surface.

## Matching p5 sketch

```javascript
bleSetup({
  namePrefix: 'p5phone',
  characteristics: [
    { name: 'temp', type: 'float', notify: true },
    { name: 'brightness', type: 'uint8', write: true }
  ]
});
enableBleButton({ label: 'Connect device' });
```

```cpp
#include <P5PhoneBLE.h>
P5PhoneBLE ble;

void setup() {
  ble.sendFloat("temp");
  ble.receiveByte("brightness");
  ble.begin("p5phone");
}

void loop() {
  ble.update();
  if (!ble.isReady()) return;
  ble.set("temp", 22.5f);
  analogWrite(LED_BUILTIN, ble.getInt("brightness"));
}
```
