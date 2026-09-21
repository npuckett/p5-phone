// Host-side BLE wire-contract test for P5PhoneBLE.
// Compiles + runs with plain g++ — no Arduino hardware, no BLE backend.
// Run:  g++ -std=c++11 -Wall -Wextra -O2 -Isrc test/contract_test.cpp src/P5PhoneBLE_codec.cpp -o /tmp/p5contract && /tmp/p5contract
//
// Verifies deriveUUID/encode/decode against the same vectors as test-ble-contract.js.
// If this passes, the Arduino side speaks the same wire bytes as the p5.js side.

#include "../src/P5PhoneBLE_codec.h"
#include <cstdio>
#include <cstring>
#include <cmath>
#include <string>

static int passed = 0;
static int failed = 0;

static void check(bool ok, const char* msg) {
  if (ok) { passed++; }
  else { failed++; printf("FAIL: %s\n", msg); }
}

static bool bytesEqual(const uint8_t* a, const uint8_t* b, int len) {
  return memcmp(a, b, len) == 0;
}

int main() {
  using namespace p5codec;
  const char* SERVICE = "19b10000-e8f2-537e-4f6c-d104768a1214";

  // ============ UUID derivation ============
  char uuid[37];

  deriveUUID(SERVICE, 1, uuid);
  check(strcmp(uuid, "19b10001-e8f2-537e-4f6c-d104768a1214") == 0, "UUID index 1");

  deriveUUID(SERVICE, 2, uuid);
  check(strcmp(uuid, "19b10002-e8f2-537e-4f6c-d104768a1214") == 0, "UUID index 2");

  // Uppercase input should be lowercased.
  deriveUUID("19B10000-E8F2-537E-4F6C-D104768A1214", 1, uuid);
  check(strcmp(uuid, "19b10001-e8f2-537e-4f6c-d104768a1214") == 0, "UUID uppercase input lowercased");

  // Short UUID → passthrough (lowercased), unchanged by index.
  deriveUUID("180f", 1, uuid);
  check(strcmp(uuid, "180f") == 0, "16-bit UUID index 1 unchanged");
  deriveUUID("180f", 2, uuid);
  check(strcmp(uuid, "180f") == 0, "16-bit UUID index 2 unchanged");

  // ============ Encode: bool ============
  uint8_t buf[20];
  int n;

  n = encodeBool(true, buf);
  check(n == 1 && buf[0] == 0x01, "bool true → 01");

  n = encodeBool(false, buf);
  check(n == 1 && buf[0] == 0x00, "bool false → 00");

  // ============ Encode: int8 / uint8 ============
  n = encodeInt(P5_INT8, -12, buf);
  check(n == 1 && buf[0] == 0xF4, "int8 -12 → F4");

  n = encodeInt(P5_UINT8, 200, buf);
  check(n == 1 && buf[0] == 0xC8, "uint8 200 → C8");

  // ============ Encode: int16 / uint16 (little-endian) ============
  uint8_t exp16a[2] = {0x2E, 0xFB};  // -1234
  n = encodeInt(P5_INT16, -1234, buf);
  check(n == 2 && bytesEqual(buf, exp16a, 2), "int16 -1234 → 2E FB");

  uint8_t exp16b[2] = {0xE8, 0xFD};  // 65000
  n = encodeInt(P5_UINT16, 65000, buf);
  check(n == 2 && bytesEqual(buf, exp16b, 2), "uint16 65000 → E8 FD");

  // ============ Encode: int32 / uint32 (little-endian) ============
  uint8_t exp32a[4] = {0xC0, 0x1D, 0xFE, 0xFF};  // -123456
  n = encodeInt(P5_INT32, -123456, buf);
  check(n == 4 && bytesEqual(buf, exp32a, 4), "int32 -123456 → C0 1D FE FF");

  // 4,000,000,000 = 0xEE6B2800 → little-endian {00, 28, 6B, EE}
  uint8_t exp32b[4] = {0x00, 0x28, 0x6B, 0xEE};
  n = encodeInt(P5_UINT32, 4000000000UL, buf);
  check(n == 4 && bytesEqual(buf, exp32b, 4), "uint32 4000000000 → 00 28 6B EE");

  // ============ Encode: float (little-endian IEEE-754) ============
  uint8_t expF[4] = {0x79, 0xE9, 0xF6, 0x42};  // 123.456
  n = encodeFloat(123.456f, buf);
  check(n == 4 && bytesEqual(buf, expF, 4), "float 123.456 → 79 E9 F6 42");

  // ============ Encode: string ============
  uint8_t expHello[5] = {'h', 'e', 'l', 'l', 'o'};
  n = encodeString("hello", buf, 20);
  check(n == 5 && bytesEqual(buf, expHello, 5), "string hello → 68 65 6C 6C 6F");

  // String clamp to 20 bytes.
  n = encodeString("abcdefghijklmnopqrstuvwxyz", buf, 20);
  check(n == 20, "string clamps to 20 bytes");

  // ============ Encode: bytes ============
  uint8_t inBytes[4] = {1, 2, 3, 255};
  uint8_t expBytes[4] = {0x01, 0x02, 0x03, 0xFF};
  n = encodeBytes(inBytes, 4, buf, 20);
  check(n == 4 && bytesEqual(buf, expBytes, 4), "bytes [1,2,3,255] → 01 02 03 FF");

  // ============ Decode round-trips ============
  // bool
  check(decodeBool(buf, 1) == true, "decode bool");  // buf[0] is 0x01 from last encodeBytes[0]
  uint8_t boolFalse[1] = {0x00};
  check(decodeBool(boolFalse, 1) == false, "decode bool false");

  // integers via decodeInt (widens to long)
  uint8_t i8[1]  = {0xF4};
  uint8_t u8[1]  = {0xC8};
  uint8_t i16[2] = {0x2E, 0xFB};
  uint8_t u16[2] = {0xE8, 0xFD};
  uint8_t i32[4] = {0xC0, 0x1D, 0xFE, 0xFF};
  uint8_t u32[4] = {0x00, 0x28, 0x6B, 0xEE};
  check(decodeInt(P5_INT8, i8, 1)   == -12,    "decode int8");
  check(decodeInt(P5_UINT8, u8, 1)  == 200,    "decode uint8");
  check(decodeInt(P5_INT16, i16, 2) == -1234,  "decode int16");
  check(decodeInt(P5_UINT16, u16, 2) == 65000, "decode uint16");
  check(decodeInt(P5_INT32, i32, 4) == -123456, "decode int32");
  check(decodeInt(P5_UINT32, u32, 4) == 4000000000UL, "decode uint32");

  // float (within tolerance, matching the JS test)
  uint8_t fbytes[4] = {0x79, 0xE9, 0xF6, 0x42};
  float fv = decodeFloat(fbytes, 4);
  check(fabs(fv - 123.456f) < 0.001f, "decode float ~123.456");

  // double
  uint8_t dblBytes[8];
  encodeDouble(123.456789, dblBytes);
  double dv = decodeDouble(dblBytes, 8);
  check(fabs(dv - 123.456789) < 0.000001, "decode double ~123.456789");

  // ============ Cross-direction encode→decode round trips ============
  // encode then decode each numeric type, assert recovery
  encodeInt(P5_INT16, 1234, buf);    check(decodeInt(P5_INT16, buf, 2) == 1234, "round int16 +");
  encodeInt(P5_UINT16, 42, buf);     check(decodeInt(P5_UINT16, buf, 2) == 42, "round uint16");
  encodeFloat(3.14f, buf);           check(fabs(decodeFloat(buf, 4) - 3.14f) < 0.001f, "round float");

  printf("P5PhoneBLE contract tests: %d passed, %d failed\n", passed, failed);
  return failed > 0 ? 1 : 0;
}
