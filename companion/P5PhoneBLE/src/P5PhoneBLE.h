#ifndef P5_PHONE_BLE_H
#define P5_PHONE_BLE_H

// P5PhoneBLE — companion peripheral library for the p5-phone Web Bluetooth module.
//
// Declare named, typed values with addValue()/sendBool()/receiveByte()/etc.,
// call begin("name"), then drive everything from loop() with update() + set() + getX().
//
// Wire contract MUST match src/p5-phone.js (see P5PhoneBLE_codec.h for the spec):
//   - Default service UUID 19b10000-e8f2-537e-4f6c-d104768a1214
//   - Characteristic UUIDs derive from the service UUID + 1-based declaration order
//   - All numerics little-endian; strings raw UTF-8 (≤20 bytes); bytes raw
//   - #1 footgun: Arduino declaration order MUST match the JS characteristics[] array

#include "P5PhoneBLE_types.h"

// Arduino is required for the real library. The contract test (test/contract_test.cpp)
// only needs the codec, so it includes P5PhoneBLE_codec.h directly and never this file.
#include <Arduino.h>

#if defined(ESP32)
  #define P5PHONE_USE_NIMBLE
  #include <NimBLEDevice.h>
#else
  #define P5PHONE_USE_ARDUINOBLE
  #include <ArduinoBLE.h>
#endif

class P5PhoneBLE {
public:
  P5PhoneBLE();

  // ---- Configuration (call BEFORE begin()) ----
  void setDeviceName(const char* name);   // default "p5phone"
  void setDebug(bool enabled);            // Serial tracing on/off
  void setStatusLED(int pin);             // solid=connected, blink=advertising, off=idle
  void setServiceUUID(const char* uuid);  // override default service UUID

  // ---- Value registration (call BEFORE begin()) ----
  // NOTE: declaration order is load-bearing — it defines the characteristic
  // UUIDs and MUST match the characteristics[] array order in the p5 sketch.
  void addValue(const char* name, P5Type type, P5Dir dir);
  void addValue(const char* name, P5Type type, P5Dir dir, const char* uuid);

  // Convenience helpers for the most common types.
  void sendBool(const char* name);      // = addValue(name, P5_BOOL,   P5_SEND)
  void receiveBool(const char* name);   // = addValue(name, P5_BOOL,   P5_RECEIVE)
  void sendInt(const char* name);       // = addValue(name, P5_INT32,  P5_SEND)
  void receiveInt(const char* name);    // = addValue(name, P5_INT32,  P5_RECEIVE)
  void sendByte(const char* name);      // = addValue(name, P5_UINT8,  P5_SEND)
  void receiveByte(const char* name);   // = addValue(name, P5_UINT8,  P5_RECEIVE)
  void sendFloat(const char* name);     // = addValue(name, P5_FLOAT,  P5_SEND)
  void receiveFloat(const char* name);  // = addValue(name, P5_FLOAT,  P5_RECEIVE)
  void sendString(const char* name, int maxLen = 20);
  void receiveString(const char* name, int maxLen = 20);

  // ---- Lifecycle ----
  bool begin();                          // uses the device name set via setDeviceName, else "p5phone"
  bool begin(const char* deviceName);    // convenience: set name + begin
  void update();                         // call every loop() — polls BLE + promotes pending writes

  // ---- Writing (outbound: Arduino → p5 via notify) ----
  // set() compares to the last sent value and skips the radio write if unchanged,
  // and throttles to ≥15 ms between notifies per characteristic — so it's safe to
  // call every loop(). setFast() bypasses both guards for high-frequency data.
  void set(const char* name, bool value);
  void set(const char* name, int value);
  void set(const char* name, long value);
  void set(const char* name, float value);
  void set(const char* name, double value);
  void set(const char* name, const char* value);
  void set(const char* name, const String& value);
  void setFast(const char* name, float value);

  // ---- Reading (inbound: p5 → Arduino via write) ----
  // getInt() widens whatever int type was declared (uint8/int16/int32...) to int,
  // so getInt() works on a receiveByte() characteristic.
  bool   getBool(const char* name);
  int    getInt(const char* name);
  float  getFloat(const char* name);
  String getString(const char* name);
  // changed() is read-once: returns true if a new write arrived since the last
  // call, then clears the flag. Skip the check and you'll still see the latest
  // value via getBool/getInt/getFloat/getString.
  bool   changed(const char* name);
  bool   has(const char* name);

  // ---- Status ----
  bool isConnected();        // central currently attached
  bool isReady();            // connected AND ≥500 ms past connect (first notify safe)
  int  getRSSI();
  const char* getServiceUUID();

  // ---- Backend hooks (called by the per-backend .cpp files) ----
  // Backends call these from their callbacks to deliver writes / connect / disconnect
  // events into shared state. The ArduinoBLE backend runs them on the loop task
  // (synchronous); the NimBLE backend calls them from its host task under a portMUX.
  void _onWriteReceived(int index, const uint8_t* data, int len);
  void _onConnect();
  void _onDisconnect();
  // Case-insensitive UUID match against the registry slot's derived UUID.
  // Used by the ArduinoBLE static event handler to route a write back to its slot.
  bool _uuidMatches(int index, const char* uuid);

private:
  struct Value {
    const char* name;
    P5Type type;
    P5Dir dir;
    char uuid[37];
    int  maxLen;                       // ceiling for string/bytes (default 20)
    uint8_t lastBytes[P5_VALUE_MAX_BYTES];  // last value applied (sent or promoted)
    uint8_t len;                       // byte length of lastBytes
    bool dirty;                        // set() since last successful notify (internal)
    uint8_t pending[P5_VALUE_MAX_BYTES];   // freshly written by central, not yet promoted
    uint8_t pendingLen;                // byte length of pending
    bool changedFlag;                  // a new write arrived (consumed by changed())
    bool hasPending;                   // pending holds unread bytes
    unsigned long lastNotifyMs;        // throttle timestamp
#ifdef P5PHONE_USE_NIMBLE
    NimBLECharacteristic* ch;
#else
    BLECharacteristic* ch;
#endif
  };

  Value _values[P5_MAX_VALUES];
  int   _count;
  char  _serviceUUID[37];
  char  _deviceName[32];
  int   _statusLedPin;
  bool  _debug;
  bool  _begun;
  bool  _connected;
  unsigned long _readyAtMs;            // millis() after which isReady() is true
  unsigned long _lastLedToggleMs;
  bool _ledState;

  // Shared helpers
  void _deriveUUID(int index, char* out);
  Value* _find(const char* name);
  void _setStatusLED(bool advertising);
  void _promotePending();              // pending → lastBytes + changedFlag (called by update)
  bool _notifyIfDue(const char* name, const uint8_t* bytes, int byteLen, bool force);

  // Backend hooks — implemented per-backend in P5PhoneBLE_ArduinoBLE.cpp / _NimBLE.cpp
  bool _backendBegin(const char* deviceName);
  void _backendPoll();
  void _backendNotify(Value* v);
  bool _backendIsConnected();
  int  _backendRSSI();
  void _backendReconnect();            // restart advertising after disconnect
};

#endif
