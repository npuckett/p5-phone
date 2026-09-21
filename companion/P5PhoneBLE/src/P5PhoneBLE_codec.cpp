#include "P5PhoneBLE_codec.h"
#include <cctype>
#include <cstdio>

namespace p5codec {

// Replicates JS _bleDeriveUUID(serviceUUID, index) exactly:
//   1. lowercase the input
//   2. if not a 5-part hyphenated UUID OR first segment < 4 chars → passthrough (lowercased)
//   3. replace the last 4 hex chars of the first segment with the index,
//      formatted as 4 lowercase zero-padded hex digits
//
// Examples (default service 19b10000-e8f2-537e-4f6c-d104768a1214):
//   index 1 → 19b10001-e8f2-537e-4f6c-d104768a1214
//   index 2 → 19b10002-e8f2-537e-4f6c-d104768a1214
// Short UUID "180f" (not 5-part) → returned lowercased, unchanged by index.
void deriveUUID(const char* serviceUUID, int index, char* out37) {
  // 1. Copy + lowercase into the output buffer.
  int i = 0;
  for (; i < 36 && serviceUUID[i] != '\0'; i++) {
    out37[i] = (char)tolower((unsigned char)serviceUUID[i]);
  }
  out37[i] = '\0';
  if (i != 36) return;  // not a canonical 36-char UUID → passthrough

  // 2. Validate structure: exactly 4 dashes at the canonical positions.
  //    A canonical UUID is 8-4-4-4-12 → dashes at offsets 8, 13, 18, 23.
  static const int DASH_OFFSETS[4] = {8, 13, 18, 23};
  for (int d = 0; d < 4; d++) {
    if (out37[DASH_OFFSETS[d]] != '-') return;  // malformed → passthrough
  }

  // JS guard: parts[0].length < 4 → passthrough. parts[0] is out37[0..7], length 8 ≥ 4, OK.

  // 3. Replace the last 4 chars of the first segment (offsets 4..7) with
  //    the index formatted as 4 lowercase zero-padded hex digits.
  //    Matches JS: parts[0].slice(0,-4) + index.toString(16).padStart(4,'0')
  char hex[5];
  snprintf(hex, sizeof(hex), "%04x", index & 0xffff);
  out37[4] = hex[0];
  out37[5] = hex[1];
  out37[6] = hex[2];
  out37[7] = hex[3];
}

} // namespace p5codec
