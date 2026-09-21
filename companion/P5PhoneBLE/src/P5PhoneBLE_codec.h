#ifndef P5PHONE_BLE_CODEC_H
#define P5PHONE_BLE_CODEC_H

#include "P5PhoneBLE_types.h"
#include <stdint.h>
#include <string.h>

// Wire codec for the p5-phone BLE contract.
// Arduino-free so it can be compiled + tested natively with g++.
// MUST match src/p5-phone.js _bleDeriveUUID / _bleEncode / _bleDecode byte-for-byte.
//
// Contract summary:
//  - All multi-byte numerics are LITTLE-ENDIAN (all target archs are LE, so
//    memcpy of the native value IS the wire format — no swapping needed).
//  - Strings are raw UTF-8, no length prefix, no NUL terminator, ≤20 bytes.
//  - Bytes are opaque raw, no framing.
//  - Characteristic UUIDs derive from the service UUID + 1-based index.

namespace p5codec {

// Derive a characteristic UUID from a service UUID + 1-based index.
// Matches JS _bleDeriveUUID exactly:
//   - lowercase the input
//   - if not a 5-part hyphenated UUID or first segment < 4 chars → passthrough
//   - replace last 4 hex digits of the first segment with the index
// Writes 36 chars + NUL to out37.
// index must be 1..65535 (P5_MAX_VALUES caps it at 16).
void deriveUUID(const char* serviceUUID, int index, char* out37);

// ---- Encode (native value → wire bytes). Returns byte length written, 0 on error. ----

inline int encodeBool(bool value, uint8_t* out) {
  out[0] = value ? 1 : 0;
  return 1;
}

// Encode any integer type (int8/uint8/int16/uint16/int32/uint32).
// The declared P5Type selects width + signedness; value is narrowed.
inline int encodeInt(P5Type type, long value, uint8_t* out) {
  switch (type) {
    case P5_INT8:   { int8_t  v = (int8_t)value;  memcpy(out, &v, 1); return 1; }
    case P5_UINT8:  { uint8_t v = (uint8_t)value; memcpy(out, &v, 1); return 1; }
    case P5_INT16:  { int16_t v = (int16_t)value; memcpy(out, &v, 2); return 2; }
    case P5_UINT16: { uint16_t v = (uint16_t)value; memcpy(out, &v, 2); return 2; }
    case P5_INT32:  { int32_t v = (int32_t)value; memcpy(out, &v, 4); return 4; }
    case P5_UINT32: { uint32_t v = (uint32_t)value; memcpy(out, &v, 4); return 4; }
    default: return 0;
  }
}

inline int encodeFloat(float value, uint8_t* out) {
  memcpy(out, &value, 4);
  return 4;
}

inline int encodeDouble(double value, uint8_t* out) {
  memcpy(out, &value, 8);
  return 8;
}

// Copy a C-string as raw UTF-8 bytes (no terminator). Clamps to maxBytes.
inline int encodeString(const char* value, uint8_t* out, int maxBytes) {
  int len = (int)strlen(value);
  if (len > maxBytes) len = maxBytes;
  memcpy(out, value, len);
  return len;
}

inline int encodeBytes(const uint8_t* data, int dataLen, uint8_t* out, int maxBytes) {
  int len = dataLen < maxBytes ? dataLen : maxBytes;
  memcpy(out, data, len);
  return len;
}

// ---- Decode (wire bytes → native value). ----

inline bool decodeBool(const uint8_t* in, int /*len*/) {
  return in[0] != 0;
}

// Decode any integer type, widening to long. Lets getInt() work on uint8 etc.
inline long decodeInt(P5Type type, const uint8_t* in, int /*len*/) {
  switch (type) {
    case P5_INT8:   { int8_t v;  memcpy(&v, in, 1); return v; }
    case P5_UINT8:  return (long)in[0];
    case P5_INT16:  { int16_t v; memcpy(&v, in, 2); return v; }
    case P5_UINT16: { uint16_t v; memcpy(&v, in, 2); return v; }
    case P5_INT32:  { int32_t v; memcpy(&v, in, 4); return v; }
    case P5_UINT32: { uint32_t v; memcpy(&v, in, 4); return (long)v; }
    default: return 0;
  }
}

inline float decodeFloat(const uint8_t* in, int /*len*/) {
  float v;
  memcpy(&v, in, 4);
  return v;
}

inline double decodeDouble(const uint8_t* in, int /*len*/) {
  double v;
  memcpy(&v, in, 8);
  return v;
}

} // namespace p5codec

#endif
