#include "P5PhoneBLE.h"
#include <string.h>

P5PhoneBLE::P5PhoneBLE()
  : _count(0), _debug(false) {
  strncpy(_serviceUUID, P5PHONE_DEFAULT_SERVICE_UUID, sizeof(_serviceUUID) - 1);
  _serviceUUID[sizeof(_serviceUUID) - 1] = '\0';
}

void P5PhoneBLE::setDeviceName(const char* name) { (void)name; }
void P5PhoneBLE::setDebug(bool enabled) { _debug = enabled; }
void P5PhoneBLE::setStatusLED(int pin) { (void)pin; }
void P5PhoneBLE::setServiceUUID(const char* uuid) {
  if (uuid) {
    strncpy(_serviceUUID, uuid, sizeof(_serviceUUID) - 1);
    _serviceUUID[sizeof(_serviceUUID) - 1] = '\0';
  }
}

void P5PhoneBLE::_deriveUUID(int index, char* out) {
  strncpy(out, _serviceUUID, 36);
  out[36] = '\0';
  char* dash = strchr(out, '-');
  if (!dash || dash - out < 4) return;
  char hex[5];
  snprintf(hex, sizeof(hex), "%04x", index);
  dash[-4] = hex[0];
  dash[-3] = hex[1];
  dash[-2] = hex[2];
  dash[-1] = hex[3];
}

P5PhoneBLE::Value* P5PhoneBLE::_find(const char* name) {
  for (int i = 0; i < _count; i++) {
    if (_values[i].name && name && strcmp(_values[i].name, name) == 0) {
      return &_values[i];
    }
  }
  return nullptr;
}

void P5PhoneBLE::addValue(const char* name, P5Type type, P5Dir dir) {
  if (_count >= P5_MAX_VALUES) return;
  _deriveUUID(_count + 1, _values[_count].uuid);
  _values[_count].name = name;
  _values[_count].type = type;
  _values[_count].dir = dir;
  _values[_count].len = 0;
  _values[_count].dirty = false;
  _values[_count].ch = nullptr;
  _count++;
}

void P5PhoneBLE::addValue(const char* name, P5Type type, P5Dir dir, const char* uuid) {
  if (_count >= P5_MAX_VALUES) return;
  strncpy(_values[_count].uuid, uuid, sizeof(_values[_count].uuid) - 1);
  _values[_count].uuid[sizeof(_values[_count].uuid) - 1] = '\0';
  _values[_count].name = name;
  _values[_count].type = type;
  _values[_count].dir = dir;
  _values[_count].len = 0;
  _values[_count].dirty = false;
  _values[_count].ch = nullptr;
  _count++;
}

void P5PhoneBLE::sendBool(const char* name) { addValue(name, P5_BOOL, P5_SEND); }
void P5PhoneBLE::receiveBool(const char* name) { addValue(name, P5_BOOL, P5_RECEIVE); }
void P5PhoneBLE::sendInt(const char* name) { addValue(name, P5_INT32, P5_SEND); }
void P5PhoneBLE::receiveInt(const char* name) { addValue(name, P5_INT32, P5_RECEIVE); }
void P5PhoneBLE::sendByte(const char* name) { addValue(name, P5_UINT8, P5_SEND); }
void P5PhoneBLE::receiveByte(const char* name) { addValue(name, P5_UINT8, P5_RECEIVE); }
void P5PhoneBLE::sendFloat(const char* name) { addValue(name, P5_FLOAT, P5_SEND); }
void P5PhoneBLE::receiveFloat(const char* name) { addValue(name, P5_FLOAT, P5_RECEIVE); }
void P5PhoneBLE::sendString(const char* name, int maxLen) { (void)maxLen; addValue(name, P5_STRING, P5_SEND); }
void P5PhoneBLE::receiveString(const char* name, int maxLen) { (void)maxLen; addValue(name, P5_STRING, P5_RECEIVE); }

bool P5PhoneBLE::begin() { return begin("p5phone"); }

bool P5PhoneBLE::begin(const char* deviceName) {
  (void)deviceName;
  if (_debug) Serial.println("P5PhoneBLE: scaffold — full BLE stack not yet implemented");
  return false;
}

void P5PhoneBLE::update() {}

void P5PhoneBLE::set(const char* name, bool value) { (void)name; (void)value; }
void P5PhoneBLE::set(const char* name, int value) { (void)name; (void)value; }
void P5PhoneBLE::set(const char* name, long value) { (void)name; (void)value; }
void P5PhoneBLE::set(const char* name, float value) { (void)name; (void)value; }
void P5PhoneBLE::set(const char* name, double value) { (void)name; (void)value; }
void P5PhoneBLE::set(const char* name, const char* value) { (void)name; (void)value; }
void P5PhoneBLE::set(const char* name, const String& value) { (void)name; (void)value; }
void P5PhoneBLE::setFast(const char* name, float value) { set(name, value); }

bool P5PhoneBLE::getBool(const char* name) { (void)name; return false; }
int P5PhoneBLE::getInt(const char* name) { (void)name; return 0; }
float P5PhoneBLE::getFloat(const char* name) { (void)name; return 0.0f; }
String P5PhoneBLE::getString(const char* name) { (void)name; return String(); }
bool P5PhoneBLE::changed(const char* name) { (void)name; return false; }
bool P5PhoneBLE::has(const char* name) { (void)name; return false; }

bool P5PhoneBLE::isConnected() { return false; }
bool P5PhoneBLE::isReady() { return false; }
int P5PhoneBLE::getRSSI() { return 0; }
const char* P5PhoneBLE::getServiceUUID() { return _serviceUUID; }
