// ArduinoBLE backend for P5PhoneBLE.
// Compiled when P5PHONE_USE_ARDUINOBLE is defined (every non-ESP32 board).
// Target boards: Arduino UNO R4 WiFi, Nano 33 IoT, Nano 33 BLE.
//
// Design notes:
//  - Uses the GENERIC BLECharacteristic(uuid, properties, maxLen) rather than
//    ArduinoBLE's typed subclasses (BLEFloatCharacteristic etc.) so there is
//    exactly one little-endian code path matching the JS wire contract.
//  - Inbound writes are delivered via setEventHandler(BLEWritten), which
//    ArduinoBLE fires ONCE per write event (unlike the written() poll flag,
//    which is sticky until the next write). The handler matches the incoming
//    characteristic back to a registry index by UUID string.
//  - All BLE event delivery on ArduinoBLE happens from BLE.poll() on the loop
//    task, so the connect/disconnect/write handlers need no locking.
//  - A single static P5PhoneBLE* lets the static C-linkage handlers route back.

#include "P5PhoneBLE.h"

#ifdef P5PHONE_USE_ARDUINOBLE

#include <ArduinoBLE.h>

static P5PhoneBLE* _p5Instance = nullptr;

// Direction → ArduinoBLE characteristic properties bitmap.
// P5_SEND    ⇄ JS notify:true → Read + Notify (Read is free + enables future bleRead)
// P5_RECEIVE ⇄ JS write:true  → Write + WriteWithoutResponse
// P5_BOTH    ⇄ all four
static unsigned char _propsFor(P5Dir dir) {
  switch (dir) {
    case P5_SEND:     return BLERead | BLENotify;
    case P5_RECEIVE:  return BLEWrite | BLEWriteWithoutResponse;
    case P5_BOTH:     return BLERead | BLENotify | BLEWrite | BLEWriteWithoutResponse;
    default:          return BLERead | BLENotify;
  }
}

// C-linkage handlers. ArduinoBLE's setEventHandler takes a plain function
// pointer, so no capturing callables.
static void _onConnected(BLEDevice /*device*/) {
  if (_p5Instance) _p5Instance->_onConnect();
}
static void _onDisconnected(BLEDevice /*device*/) {
  if (_p5Instance) _p5Instance->_onDisconnect();
}

// Write handler — ArduinoBLE gives us the characteristic that was written.
// We match it back to a registry slot by UUID and forward the bytes.
static void _onCharWritten(BLEDevice /*device*/, BLECharacteristic characteristic) {
  if (!_p5Instance) return;
  const char* uuid = characteristic.uuid();
  if (!uuid) return;
  // Match by UUID. The instance's registry stores the UUID we derived in
  // addValue(); compare case-insensitively to be safe (ArduinoBLE may
  // normalize differently than our lowercased derive output).
  for (int i = 0; i < P5_MAX_VALUES; i++) {
    if (_p5Instance->_uuidMatches(i, uuid)) {
      int len = characteristic.valueLength();
      const uint8_t* data = characteristic.value();
      _p5Instance->_onWriteReceived(i, data, len);
      return;
    }
  }
}

bool P5PhoneBLE::_backendBegin(const char* deviceName) {
  if (!BLE.begin()) return false;
  _p5Instance = this;

  BLE.setLocalName(deviceName);
  BLE.setAdvertisedServiceUuid(_serviceUUID);

  // Build service + characteristics once; static so they live for the
  // program's lifetime.
  static BLEService service(_serviceUUID);
  for (int i = 0; i < _count; i++) {
    Value& v = _values[i];
    v.ch = new BLECharacteristic(v.uuid, _propsFor(v.dir), v.maxLen);
    service.addCharacteristic(v.ch);
    if (v.dir == P5_RECEIVE || v.dir == P5_BOTH) {
      v.ch->setEventHandler(BLEWritten, _onCharWritten);
    }
  }
  BLE.setAdvertisedService(service);
  BLE.addService(service);

  BLE.setEventHandler(BLEConnected, _onConnected);
  BLE.setEventHandler(BLEDisconnected, _onDisconnected);

  BLE.advertise();
  return true;
}

void P5PhoneBLE::_backendPoll() {
  // Inbound writes arrive via the BLEWritten event handler above; nothing
  // to poll for them. We still drive the BLE stack so events fire.
  BLE.poll();
}

void P5PhoneBLE::_backendNotify(Value* v) {
  if (!v || !v->ch) return;
  v->ch->writeValue(v->lastBytes, v->len);  // pushes to subscribed centrals
}

bool P5PhoneBLE::_backendIsConnected() {
  BLEDevice c = BLE.central();
  return c && c.connected();
}

int P5PhoneBLE::_backendRSSI() {
  BLEDevice c = BLE.central();
  return c ? c.rssi() : 0;
}

void P5PhoneBLE::_backendReconnect() {
  BLE.advertise();
}

#endif  // P5PHONE_USE_ARDUINOBLE
