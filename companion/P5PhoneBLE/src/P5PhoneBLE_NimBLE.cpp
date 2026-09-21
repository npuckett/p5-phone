// NimBLE backend for P5PhoneBLE.
// Compiled when P5PHONE_USE_NIMBLE is defined (defined(ESP32)).
// Target boards: ESP32, ESP32-S3, ESP32-C3. (S2 has no BT radio — not supported.)
//
// Design notes:
//  - Targets NimBLE-Arduino 2.x API.
//  - onWrite callbacks fire on the NimBLE host task, NOT loop(). Any shared
//    state touched from a callback must go under a critical section. We use a
//    portMUX_TYPE and wrap the _onWriteReceived call.
//  - No heap allocation, no std::string copy inside the critical section. The
//    value is read into a stack buffer BEFORE entering the lock.
//  - NimBLE 2.x does NOT auto-resume advertising on disconnect — we restart it.

#include "P5PhoneBLE.h"

#ifdef P5PHONE_USE_NIMBLE

#include <NimBLEDevice.h>

static P5PhoneBLE* _p5Instance = nullptr;
static portMUX_TYPE _p5Mux = portMUX_INITIALIZER_UNLOCKED;
static NimBLEServer* _p5Server = nullptr;

// Per-characteristic callback subclass. Each instance remembers the index of
// its characteristic in the registry so it can route writes back by index
// (cheaper than a UUID lookup on every write).
class P5CharCallbacks : public NimBLECharacteristicCallbacks {
 public:
  explicit P5CharCallbacks(int index) : _index(index) {}

  void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& /*conn*/) override {
    if (!_p5Instance || !ch) return;
    // Read the value BEFORE the critical section so the ref-counted NimBLEAttValue
    // stays outside the lock. Copy raw bytes onto the stack, then deliver them.
    NimBLEAttValue val = ch->getValue();
    size_t len = val.size();
    if (len > P5_VALUE_MAX_BYTES) len = P5_VALUE_MAX_BYTES;
    uint8_t stack[P5_VALUE_MAX_BYTES];
    memcpy(stack, val.data(), len);
    portENTER_CRITICAL(&_p5Mux);
    _p5Instance->_onWriteReceived(_index, stack, (int)len);
    portEXIT_CRITICAL(&_p5Mux);
  }

 private:
  int _index;
};

// Server callbacks — connect/disconnect also fire on the host task, but those
// only flip booleans/timestamps, which is cheap and safe enough without a lock.
class P5ServerCallbacks : public NimBLEServerCallbacks {
 public:
  void onConnect(NimBLEServer* /*server*/, NimBLEConnInfo& /*conn*/) override {
    if (_p5Instance) _p5Instance->_onConnect();
  }
  void onDisconnect(NimBLEServer* /*server*/, NimBLEConnInfo& /*conn*/, int /*reason*/) override {
    if (_p5Instance) _p5Instance->_onDisconnect();
  }
};

// Direction → NimBLE property bitmap.
// P5_SEND    ⇄ JS notify:true → READ | NOTIFY  (READ enables future bleRead)
// P5_RECEIVE ⇄ JS write:true  → WRITE | WRITE_NR
// P5_BOTH    ⇄ all four
static uint16_t _propsFor(P5Dir dir) {
  switch (dir) {
    case P5_SEND:     return NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY;
    case P5_RECEIVE:  return NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR;
    case P5_BOTH:     return NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY |
                              NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR;
    default:          return NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY;
  }
}

bool P5PhoneBLE::_backendBegin(const char* deviceName) {
  NimBLEDevice::init(deviceName);
  _p5Instance = this;

  _p5Server = NimBLEDevice::createServer();
  _p5Server->setCallbacks(new P5ServerCallbacks(), /*deleteCallbacks=*/false);

  NimBLEService* service = _p5Server->createService(_serviceUUID);
  for (int i = 0; i < _count; i++) {
    Value& v = _values[i];
    NimBLECharacteristic* ch = service->createCharacteristic(
        v.uuid, _propsFor(v.dir), v.maxLen);
    v.ch = ch;
    if (v.dir == P5_RECEIVE || v.dir == P5_BOTH) {
      ch->setCallbacks(new P5CharCallbacks(i), /*deleteCallbacks=*/false);
    }
  }
  service->start();

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(_serviceUUID);
  // Scan-response carries the name; keep the primary adv payload ≤31 bytes.
  // "p5phone" (7 bytes) + 128-bit service UUID (16 bytes) fits comfortably.
  if (strlen(deviceName) > 20 && _debug) {
    Serial.println("P5PhoneBLE: long device name — using scan response for name");
  }
  NimBLEDevice::setDeviceName(deviceName);
  adv->start();

  return true;
}

void P5PhoneBLE::_backendPoll() {
  // NimBLE is callback-driven; nothing to poll on loop() for inbound data.
  // (We still keep this hook so the shared update() pipeline stays uniform.)
}

void P5PhoneBLE::_backendNotify(Value* v) {
  if (!v || !v->ch) return;
  v->ch->setValue(v->lastBytes, v->len);
  v->ch->notify();
}

bool P5PhoneBLE::_backendIsConnected() {
  return _p5Server && _p5Server->getConnectedCount() > 0;
}

int P5PhoneBLE::_backendRSSI() {
  // NimBLE 2.x: retrieving RSSI requires a peer handle; we'd need to track the
  // connection ID. Returning 0 keeps the API honest without over-promising.
  return 0;
}

void P5PhoneBLE::_backendReconnect() {
  // NimBLE 2.x does NOT auto-resume advertising — restart explicitly.
  NimBLEDevice::getAdvertising()->start();
}

#endif  // P5PHONE_USE_NIMBLE
