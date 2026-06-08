#ifndef P5_PHONE_BLE_H
#define P5_PHONE_BLE_H

#include <Arduino.h>

#if defined(ESP32)
  #define P5PHONE_USE_NIMBLE
  #include <NimBLEDevice.h>
#else
  #define P5PHONE_USE_ARDUINOBLE
  #include <ArduinoBLE.h>
#endif

enum P5Type {
  P5_BOOL, P5_INT8, P5_UINT8, P5_INT16, P5_UINT16,
  P5_INT32, P5_UINT32, P5_FLOAT, P5_DOUBLE, P5_STRING, P5_BYTES
};

enum P5Dir { P5_SEND, P5_RECEIVE, P5_BOTH };

const int P5_MAX_VALUES = 16;
const char P5PHONE_DEFAULT_SERVICE_UUID[] = "19b10000-e8f2-537e-4f6c-d104768a1214";

class P5PhoneBLE {
public:
  P5PhoneBLE();

  void setDeviceName(const char* name);
  void setDebug(bool enabled);
  void setStatusLED(int pin);
  void setServiceUUID(const char* uuid);

  void addValue(const char* name, P5Type type, P5Dir dir);
  void addValue(const char* name, P5Type type, P5Dir dir, const char* uuid);

  void sendBool(const char* name);
  void receiveBool(const char* name);
  void sendInt(const char* name);
  void receiveInt(const char* name);
  void sendByte(const char* name);
  void receiveByte(const char* name);
  void sendFloat(const char* name);
  void receiveFloat(const char* name);
  void sendString(const char* name, int maxLen = 32);
  void receiveString(const char* name, int maxLen = 32);

  bool begin();
  bool begin(const char* deviceName);
  void update();

  void set(const char* name, bool value);
  void set(const char* name, int value);
  void set(const char* name, long value);
  void set(const char* name, float value);
  void set(const char* name, double value);
  void set(const char* name, const char* value);
  void set(const char* name, const String& value);
  void setFast(const char* name, float value);

  bool getBool(const char* name);
  int getInt(const char* name);
  float getFloat(const char* name);
  String getString(const char* name);
  bool changed(const char* name);
  bool has(const char* name);

  bool isConnected();
  bool isReady();
  int getRSSI();
  const char* getServiceUUID();

private:
  struct Value {
    const char* name;
    P5Type type;
    P5Dir dir;
    char uuid[37];
    uint8_t lastBytes[20];
    uint8_t len;
    bool dirty;
#ifdef P5PHONE_USE_NIMBLE
    NimBLECharacteristic* ch;
#else
    BLECharacteristic* ch;
#endif
  };

  Value _values[P5_MAX_VALUES];
  int _count;
  char _serviceUUID[37];
  bool _debug;

  void _deriveUUID(int index, char* out);
  Value* _find(const char* name);
};

#endif
