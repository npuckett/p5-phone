#!/usr/bin/env node
/**
 * Wire-contract tests for p5-phone BLE encode/decode and UUID derivation.
 * Run: node test-ble-contract.js
 */

const SERVICE = '19b10000-e8f2-537e-4f6c-d104768a1214';

function bleDeriveUUID(serviceUUID, index) {
  const parts = serviceUUID.toLowerCase().split('-');
  parts[0] = parts[0].slice(0, -4) + index.toString(16).padStart(4, '0');
  return parts.join('-');
}

function bleEncode(type, value) {
  let view;
  switch (type) {
    case 'float':
      view = new DataView(new ArrayBuffer(4));
      view.setFloat32(0, value, true);
      return view;
    case 'uint8':
      view = new DataView(new ArrayBuffer(1));
      view.setUint8(0, value);
      return view;
    default:
      throw new Error('unsupported type: ' + type);
  }
}

function bleDecode(type, dataView) {
  switch (type) {
    case 'float':
      return dataView.getFloat32(0, true);
    case 'uint8':
      return dataView.getUint8(0);
    default:
      throw new Error('unsupported type: ' + type);
  }
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('FAIL:', message);
  }
}

assert(
  bleDeriveUUID(SERVICE, 1) === '19b10001-e8f2-537e-4f6c-d104768a1214',
  'UUID index 1'
);
assert(
  bleDeriveUUID(SERVICE, 2) === '19b10002-e8f2-537e-4f6c-d104768a1214',
  'UUID index 2'
);

const testFloat = 123.456;
const floatView = bleEncode('float', testFloat);
assert(Math.abs(bleDecode('float', floatView) - testFloat) < 0.001, 'float round-trip');

const testByte = 200;
const byteView = bleEncode('uint8', testByte);
assert(bleDecode('uint8', byteView) === testByte, 'uint8 round-trip');

console.log(`BLE contract tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
