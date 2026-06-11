#!/usr/bin/env node
/**
 * Wire-contract tests for p5-phone BLE encode/decode and UUID derivation.
 * Loads the real helper implementations from src/p5-phone.js.
 * Run: node test-ble-contract.js
 */

const fs = require('fs');
const path = require('path');

const SERVICE = '19b10000-e8f2-537e-4f6c-d104768a1214';
const SHORT_UUID = '180f';

function loadBleWireHelpers() {
  const srcPath = path.join(__dirname, 'src', 'p5-phone.js');
  const src = fs.readFileSync(srcPath, 'utf8');
  const start = src.indexOf('function _bleDeriveUUID');
  const end = src.indexOf('function _bleHandleNotify');
  if (start === -1 || end === -1) {
    throw new Error('Could not locate BLE wire helpers in src/p5-phone.js');
  }

  const block = src.slice(start, end);
  const warnLog = [];
  const sandbox = {
    TextEncoder,
    TextDecoder,
    DataView,
    ArrayBuffer,
    Uint8Array,
    debugWarn: (msg) => warnLog.push(String(msg))
  };

  const factory = new Function(
    ...Object.keys(sandbox),
    block + '\nreturn { bleDeriveUUID: _bleDeriveUUID, bleEncode: _bleEncode, bleDecode: _bleDecode };'
  );
  const helpers = factory(...Object.values(sandbox));
  helpers.warnLog = warnLog;
  return helpers;
}

const { bleDeriveUUID, bleEncode, bleDecode, warnLog } = loadBleWireHelpers();

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

function roundTrip(type, value, compare) {
  const encoded = bleEncode(type, value);
  const buffer = encoded instanceof ArrayBuffer ? encoded : encoded.buffer;
  const view = new DataView(buffer);
  const decoded = bleDecode(type, view);
  if (compare) {
    assert(compare(decoded, value), type + ' round-trip');
  } else {
    assert(decoded === value, type + ' round-trip');
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

const short1 = bleDeriveUUID(SHORT_UUID, 1);
const short2 = bleDeriveUUID(SHORT_UUID, 2);
assert(short1 === SHORT_UUID, '16-bit UUID index 1 unchanged');
assert(short2 === SHORT_UUID, '16-bit UUID index 2 unchanged');
assert(short1 === short2, '16-bit UUID derivation does not vary by index');

roundTrip('bool', true);
roundTrip('bool', false);
roundTrip('int8', -12);
roundTrip('uint8', 200);
roundTrip('int16', -1234);
roundTrip('uint16', 65000);
roundTrip('int32', -123456);
roundTrip('uint32', 4000000000);
roundTrip('float', 123.456, (decoded, value) => Math.abs(decoded - value) < 0.001);
roundTrip('double', 123.456789, (decoded, value) => Math.abs(decoded - value) < 0.000001);

const bytesIn = new Uint8Array([1, 2, 3, 255]);
const bytesEncoded = bleEncode('bytes', bytesIn);
const bytesView = new DataView(bytesEncoded);
const bytesOut = bleDecode('bytes', bytesView);
assert(
  bytesOut instanceof Uint8Array &&
    bytesOut.length === 4 &&
    bytesOut[0] === 1 &&
    bytesOut[3] === 255,
  'bytes round-trip'
);

roundTrip('string', 'hello');

warnLog.length = 0;
bleDecode('string', new DataView(new TextEncoder().encode('abcdefghijklmnopqrstuvwxyz').buffer));
assert(
  warnLog.some((msg) => msg.includes('20 bytes')),
  'string decode warns above 20 bytes'
);

console.log(`BLE contract tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
