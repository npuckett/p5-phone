#include "P5PhoneBLE.h"
#include "P5PhoneBLE_codec.h"
#include <string.h>
#include <stdio.h>

// Minimum milliseconds between notifies for a single characteristic when using
// set() (not setFast()). Protects against students calling set() every loop()
// iteration and flooding the radio. Drop-intermediate: the most recent value
// wins, we don't queue.
static const unsigned long P5_NOTIFY_MIN_INTERVAL_MS = 15;

P5PhoneBLE::P5PhoneBLE()
  : _count(0),
    _statusLedPin(-1),
    _debug(false),
    _begun(false),
    _connected(false),
    _readyAtMs(0),
    _lastLedToggleMs(0),
    _ledState(false) {
  strncpy(_serviceUUID, P5PHONE_DEFAULT_SERVICE_UUID, sizeof(_serviceUUID) - 1);
  _serviceUUID[sizeof(_serviceUUID) - 1] = '\0';
  strncpy(_deviceName, "p5phone", sizeof(_deviceName) - 1);
  _deviceName[sizeof(_deviceName) - 1] = '\0';
}

void P5PhoneBLE::setDeviceName(const char* name) {
  if (name) {
    strncpy(_deviceName, name, sizeof(_deviceName) - 1);
    _deviceName[sizeof(_deviceName) - 1] = '\0';
  }
}

void P5PhoneBLE::setDebug(bool enabled) { _debug = enabled; }

void P5PhoneBLE::setStatusLED(int pin) { _statusLedPin = pin; }

void P5PhoneBLE::setServiceUUID(const char* uuid) {
  if (uuid) {
    strncpy(_serviceUUID, uuid, sizeof(_serviceUUID) - 1);
    _serviceUUID[sizeof(_serviceUUID) - 1] = '\0';
  }
}

void P5PhoneBLE::_deriveUUID(int index, char* out) {
  p5codec::deriveUUID(_serviceUUID, index, out);
}

P5PhoneBLE::Value* P5PhoneBLE::_find(const char* name) {
  if (!name) return nullptr;
  for (int i = 0; i < _count; i++) {
    if (_values[i].name && strcmp(_values[i].name, name) == 0) {
      return &_values[i];
    }
  }
  return nullptr;
}

void P5PhoneBLE::addValue(const char* name, P5Type type, P5Dir dir) {
  if (_count >= P5_MAX_VALUES) return;
  Value& v = _values[_count];
  _deriveUUID(_count + 1, v.uuid);  // 1-based index, matches JS
  v.name = name;
  v.type = type;
  v.dir = dir;
  v.maxLen = P5_VALUE_MAX_BYTES;
  v.len = 0;
  v.dirty = false;
  v.pendingLen = 0;
  v.changedFlag = false;
  v.hasPending = false;
  v.lastNotifyMs = 0;
  v.ch = nullptr;
  memset(v.lastBytes, 0, sizeof(v.lastBytes));
  memset(v.pending, 0, sizeof(v.pending));
  _count++;
}

void P5PhoneBLE::addValue(const char* name, P5Type type, P5Dir dir, const char* uuid) {
  if (_count >= P5_MAX_VALUES) return;
  Value& v = _values[_count];
  if (uuid) {
    strncpy(v.uuid, uuid, sizeof(v.uuid) - 1);
    v.uuid[sizeof(v.uuid) - 1] = '\0';
  }
  v.name = name;
  v.type = type;
  v.dir = dir;
  v.maxLen = P5_VALUE_MAX_BYTES;
  v.len = 0;
  v.dirty = false;
  v.pendingLen = 0;
  v.changedFlag = false;
  v.hasPending = false;
  v.lastNotifyMs = 0;
  v.ch = nullptr;
  memset(v.lastBytes, 0, sizeof(v.lastBytes));
  memset(v.pending, 0, sizeof(v.pending));
  _count++;
}

void P5PhoneBLE::sendBool(const char* name)    { addValue(name, P5_BOOL, P5_SEND); }
void P5PhoneBLE::receiveBool(const char* name) { addValue(name, P5_BOOL, P5_RECEIVE); }
void P5PhoneBLE::sendInt(const char* name)     { addValue(name, P5_INT32, P5_SEND); }
void P5PhoneBLE::receiveInt(const char* name)  { addValue(name, P5_INT32, P5_RECEIVE); }
void P5PhoneBLE::sendByte(const char* name)    { addValue(name, P5_UINT8, P5_SEND); }
void P5PhoneBLE::receiveByte(const char* name) { addValue(name, P5_UINT8, P5_RECEIVE); }
void P5PhoneBLE::sendFloat(const char* name)   { addValue(name, P5_FLOAT, P5_SEND); }
void P5PhoneBLE::receiveFloat(const char* name){ addValue(name, P5_FLOAT, P5_RECEIVE); }

void P5PhoneBLE::sendString(const char* name, int maxLen) {
  addValue(name, P5_STRING, P5_SEND);
  if (_count > 0) {
    int cap = maxLen < P5_VALUE_MAX_BYTES ? maxLen : P5_VALUE_MAX_BYTES;
    _values[_count - 1].maxLen = cap;
  }
}

void P5PhoneBLE::receiveString(const char* name, int maxLen) {
  addValue(name, P5_STRING, P5_RECEIVE);
  if (_count > 0) {
    int cap = maxLen < P5_VALUE_MAX_BYTES ? maxLen : P5_VALUE_MAX_BYTES;
    _values[_count - 1].maxLen = cap;
  }
}

// ---- Lifecycle ----

bool P5PhoneBLE::begin() {
  return begin(_deviceName);
}

bool P5PhoneBLE::begin(const char* deviceName) {
  setDeviceName(deviceName);
  if (_count == 0) {
    if (_debug) Serial.println("P5PhoneBLE: no values registered — call sendFloat()/receiveByte()/addValue() before begin()");
    return false;
  }
  bool ok = _backendBegin(_deviceName);
  _begun = ok;
  if (!ok) {
    if (_debug) Serial.println("P5PhoneBLE: BLE.begin() failed");
    return false;
  }
  if (_debug) {
    Serial.print("P5PhoneBLE: advertising as '");
    Serial.print(_deviceName);
    Serial.print("' with ");
    Serial.print(_count);
    Serial.println(" value(s)");
  }
  return true;
}

void P5PhoneBLE::update() {
  if (!_begun) return;
  _backendPoll();

  // Promote any pending inbound writes (p5 → Arduino) from the staging buffer
  // into lastBytes and raise changedFlag. Done on the loop task for both backends.
  _promotePending();

  // Drive the status LED: solid = connected, slow blink = advertising, off = idle.
  if (_statusLedPin >= 0) {
    _setStatusLED(!_connected);  // blink while not connected (advertising)
  }
}

void P5PhoneBLE::_promotePending() {
  for (int i = 0; i < _count; i++) {
    Value& v = _values[i];
    if (!v.hasPending) continue;
    if (v.dir != P5_RECEIVE && v.dir != P5_BOTH) {
      v.hasPending = false;
      continue;
    }
    memcpy(v.lastBytes, v.pending, v.pendingLen);
    v.len = v.pendingLen;
    v.changedFlag = true;
    v.hasPending = false;
    if (_debug) {
      Serial.print("P5PhoneBLE ← ");
      Serial.println(v.name);
    }
  }
}

void P5PhoneBLE::_setStatusLED(bool advertising) {
  if (_statusLedPin < 0) return;
  if (!advertising) {
    // Connected → solid on.
    digitalWrite(_statusLedPin, HIGH);
    _ledState = true;
    return;
  }
  // Advertising → slow blink (~2 Hz).
  unsigned long now = millis();
  if (now - _lastLedToggleMs >= 500) {
    _ledState = !_ledState;
    digitalWrite(_statusLedPin, _ledState ? HIGH : LOW);
    _lastLedToggleMs = now;
  }
}

// ---- Writing (Arduino → p5 via notify) ----

// Internal: encode + maybe-write for a single value. Returns true if a notify
// was actually sent. Applies the skip-if-unchanged and throttle guards unless
// `force` is set (setFast uses force).
bool P5PhoneBLE::_notifyIfDue(const char* name, const uint8_t* bytes, int byteLen, bool force) {
  Value* vp = _find(name);
  if (!vp || !vp->ch) return false;
  if (vp->dir != P5_SEND && vp->dir != P5_BOTH) return false;

  // Skip-if-unchanged: avoid radio writes when the value hasn't moved.
  if (!force && vp->len == (uint8_t)byteLen && memcmp(vp->lastBytes, bytes, byteLen) == 0) {
    return false;
  }
  // Throttle: drop intermediate notifies closer than P5_NOTIFY_MIN_INTERVAL_MS.
  unsigned long now = millis();
  if (!force && now - vp->lastNotifyMs < P5_NOTIFY_MIN_INTERVAL_MS) {
    return false;  // value is dropped (drop-intermediate policy)
  }
  vp->lastNotifyMs = now;
  memcpy(vp->lastBytes, bytes, byteLen);
  vp->len = (uint8_t)byteLen;
  vp->dirty = true;
  _backendNotify(vp);
  return true;
}

// Helper to bridge the public set(...) overloads into the typed codec.
// The implementation file can't see the codec without the include, so we route
// each set() overload through the matching codec function directly below.

void P5PhoneBLE::set(const char* name, bool value) {
  uint8_t b[1];
  int n = p5codec::encodeBool(value, b);
  _notifyIfDue(name, b, n, false);
}

void P5PhoneBLE::set(const char* name, int value)   { set(name, (long)value); }
void P5PhoneBLE::set(const char* name, long value)  {
  Value* vp = _find(name);
  if (!vp) return;
  uint8_t b[8];
  int n;
  if (vp->type == P5_FLOAT) {
    n = p5codec::encodeFloat((float)value, b);
  } else if (vp->type == P5_DOUBLE) {
    n = p5codec::encodeDouble((double)value, b);
  } else {
    n = p5codec::encodeInt(vp->type, value, b);
  }
  _notifyIfDue(name, b, n, false);
}

void P5PhoneBLE::set(const char* name, float value) {
  Value* vp = _find(name);
  if (!vp) return;
  uint8_t b[8];
  int n;
  if (vp->type == P5_DOUBLE) {
    n = p5codec::encodeDouble((double)value, b);
  } else {
    n = p5codec::encodeFloat(value, b);
  }
  _notifyIfDue(name, b, n, false);
}

void P5PhoneBLE::set(const char* name, double value) {
  uint8_t b[8];
  int n = p5codec::encodeDouble(value, b);
  _notifyIfDue(name, b, n, false);
}

void P5PhoneBLE::set(const char* name, const char* value) {
  Value* vp = _find(name);
  if (!vp) return;
  uint8_t b[P5_VALUE_MAX_BYTES];
  int n = p5codec::encodeString(value, b, vp->maxLen);
  if ((int)strlen(value) > vp->maxLen && _debug) {
    Serial.print("P5PhoneBLE: string '");
    Serial.print(name);
    Serial.print("' truncated to ");
    Serial.print(vp->maxLen);
    Serial.println(" bytes");
  }
  _notifyIfDue(name, b, n, false);
}

void P5PhoneBLE::set(const char* name, const String& value) {
  set(name, value.c_str());
}

void P5PhoneBLE::setFast(const char* name, float value) {
  uint8_t b[4];
  int n = p5codec::encodeFloat(value, b);
  _notifyIfDue(name, b, n, true);  // force: skip throttle + skip-if-unchanged
}

// ---- Reading (p5 → Arduino via write) ----

bool P5PhoneBLE::getBool(const char* name) {
  Value* vp = _find(name);
  if (!vp || vp->len == 0) return false;
  return p5codec::decodeBool(vp->lastBytes, vp->len);
}

int P5PhoneBLE::getInt(const char* name) {
  Value* vp = _find(name);
  if (!vp || vp->len == 0) return 0;
  // Widens any int type (uint8/int16/int32...) to int.
  return (int)p5codec::decodeInt(vp->type, vp->lastBytes, vp->len);
}

float P5PhoneBLE::getFloat(const char* name) {
  Value* vp = _find(name);
  if (!vp || vp->len == 0) return 0.0f;
  if (vp->type == P5_DOUBLE) return (float)p5codec::decodeDouble(vp->lastBytes, vp->len);
  return p5codec::decodeFloat(vp->lastBytes, vp->len);
}

String P5PhoneBLE::getString(const char* name) {
  Value* vp = _find(name);
  if (!vp || vp->len == 0) return String();
  // Raw UTF-8 bytes, no terminator — build a String of exactly len bytes.
  String s;
  s.reserve(vp->len);
  for (uint8_t i = 0; i < vp->len; i++) s += (char)vp->lastBytes[i];
  return s;
}

bool P5PhoneBLE::changed(const char* name) {
  Value* vp = _find(name);
  if (!vp) return false;
  bool c = vp->changedFlag;
  vp->changedFlag = false;  // read-once
  return c;
}

bool P5PhoneBLE::has(const char* name) {
  return _find(name) != nullptr;
}

// ---- Status ----

bool P5PhoneBLE::isConnected() { return _begun && _backendIsConnected(); }

bool P5PhoneBLE::isReady() {
  if (!_begun || !_connected) return false;
  return millis() >= _readyAtMs;
}

int P5PhoneBLE::getRSSI() { return _backendRSSI(); }

const char* P5PhoneBLE::getServiceUUID() { return _serviceUUID; }

// ---- Backend hooks (backends call these to deliver events) ----

void P5PhoneBLE::_onWriteReceived(int index, const uint8_t* data, int len) {
  if (index < 0 || index >= _count) return;
  Value& v = _values[index];
  if (v.dir != P5_RECEIVE && v.dir != P5_BOTH) return;
  int copyLen = len < P5_VALUE_MAX_BYTES ? len : P5_VALUE_MAX_BYTES;
  // NOTE: NimBLE calls this from its host task — the matching backend wraps this
  // call in a critical section so the pending buffer write is atomic vs. update().
  memcpy(v.pending, data, copyLen);
  v.pendingLen = (uint8_t)copyLen;
  v.hasPending = true;
}

void P5PhoneBLE::_onConnect() {
  _connected = true;
  _readyAtMs = millis() + 500;  // grace so the first notify after CCCD subscribe lands
  if (_debug) Serial.println("P5PhoneBLE: central connected");
}

void P5PhoneBLE::_onDisconnect() {
  _connected = false;
  _readyAtMs = 0;
  if (_debug) Serial.println("P5PhoneBLE: central disconnected — re-advertising");
  _backendReconnect();
}

bool P5PhoneBLE::_uuidMatches(int index, const char* uuid) {
  if (index < 0 || index >= _count || !uuid) return false;
  // Case-insensitive compare: ArduinoBLE may uppercase; our derived UUIDs are
  // always lowercase, so normalize both sides char by char.
  const char* a = _values[index].uuid;
  for (int i = 0; i < 36; i++) {
    char ca = a[i], cb = uuid[i];
    if (ca >= 'A' && ca <= 'Z') ca += 32;
    if (cb >= 'A' && cb <= 'Z') cb += 32;
    if (ca != cb) return false;
    if (ca == '\0') return cb == '\0';
  }
  return uuid[36] == '\0';
}

// _backendBegin / _backendPoll / _backendNotify / _backendIsConnected /
// _backendRSSI / _backendReconnect are implemented in P5PhoneBLE_ArduinoBLE.cpp
// or P5PhoneBLE_NimBLE.cpp, selected by the #ifdef in P5PhoneBLE.h.
