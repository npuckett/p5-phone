#ifndef CONTRACT_VECTORS_H
#define CONTRACT_VECTORS_H

// Reference vectors for the host-side BLE contract test.
// These MUST match test-ble-contract.js exactly. Both files are derived from
// the same JS source (src/p5-phone.js _bleEncode/_bleDecode/_bleDeriveUUID).
// If you change one, change the other.

// ----- UUID derivation -----
// Service: 19b10000-e8f2-537e-4f6c-d104768a1214
// index 1 → 19b10001-...   index 2 → 19b10002-...
// Short UUID "180f" (not 5-part) → returned lowercased, unchanged by index.

// ----- Encode vectors (input → expected little-endian bytes) -----
//   bool true   → 01
//   bool false  → 00
//   int8  -12   → F4
//   uint8 200   → C8
//   int16 -1234 → 2E FB
//   uint16 65000 → E8 FD
//   int32 -123456 → C0 1D FE FF
//   uint32 4000000000 → 00 28 6B EE
//   float 123.456 → 79 E9 F6 42
//   string "hello" → 68 65 6C 6C 6F
//   bytes [1,2,3,255] → 01 02 03 FF

#endif
