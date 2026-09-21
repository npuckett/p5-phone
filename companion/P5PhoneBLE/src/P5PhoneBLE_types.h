#ifndef P5PHONE_BLE_TYPES_H
#define P5PHONE_BLE_TYPES_H

// Arduino-free type definitions for the p5-phone BLE wire contract.
// Kept in a separate header so the codec (deriveUUID/encode/decode) can be
// compiled natively with g++ for the host-side contract test, without pulling
// in Arduino.h or any BLE backend.
//
// These enums MUST stay 1:1 with the JS side (see src/p5-phone.js ~line 127):
//   const _BLE_VALID_TYPES = new Set([
//     'bool','int8','uint8','int16','uint16','int32','uint32',
//     'float','double','string','bytes'
//   ]);

enum P5Type {
  P5_BOOL,    // 1 byte  — any non-zero decodes to true
  P5_INT8,    // 1 byte  — signed
  P5_UINT8,   // 1 byte  — unsigned
  P5_INT16,   // 2 bytes — signed,   little-endian
  P5_UINT16,  // 2 bytes — unsigned, little-endian
  P5_INT32,   // 4 bytes — signed,   little-endian
  P5_UINT32,  // 4 bytes — unsigned, little-endian
  P5_FLOAT,   // 4 bytes — IEEE-754 single, little-endian
  P5_DOUBLE,  // 8 bytes — IEEE-754 double, little-endian
  P5_STRING,  // N bytes — raw UTF-8, no length prefix, no terminator, 20-byte ceiling
  P5_BYTES    // N bytes — raw, no framing
};

enum P5Dir { P5_SEND, P5_RECEIVE, P5_BOTH };

const int P5_MAX_VALUES = 16;
const int P5_VALUE_MAX_BYTES = 20;  // default ATT MTU (23) minus 3-byte ATT header

const char P5PHONE_DEFAULT_SERVICE_UUID[] = "19b10000-e8f2-537e-4f6c-d104768a1214";

#endif
