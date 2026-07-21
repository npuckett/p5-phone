#!/usr/bin/env node
/**
 * Contract tests for p5-phone GPS geo-math helpers (geoDistance, geoInPolygon).
 * Loads the real implementations from src/p5-phone.js.
 * Run: node test-geo-contract.js
 */

const fs = require('fs');
const path = require('path');

function loadGeoHelpers() {
  const srcPath = path.join(__dirname, 'src', 'p5-phone.js');
  const src = fs.readFileSync(srcPath, 'utf8');
  const start = src.indexOf('function geoDistance');
  const end = src.indexOf('function _normalizeGeoPosition');
  if (start === -1 || end === -1) {
    throw new Error('Could not locate geo helpers in src/p5-phone.js');
  }

  const block = src.slice(start, end);
  const factory = new Function(
    block + '\nreturn { geoDistance: geoDistance, geoInPolygon: geoInPolygon };'
  );
  return factory();
}

const { geoDistance, geoInPolygon } = loadGeoHelpers();

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

function approxEqual(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, message + ' (got ' + actual + ')');
}

// --- geoDistance (Haversine) ---

// Same point → zero distance
assert(geoDistance(40.7, -74.0, 40.7, -74.0, 'm') === 0, 'same point is zero');

// NYC (40.7128, -74.0060) → LA (34.0522, -118.2437) ≈ 3935.75 km
approxEqual(geoDistance(40.7128, -74.0060, 34.0522, -118.2437, 'km'), 3935.75, 5, 'NYC→LA km');
approxEqual(geoDistance(40.7128, -74.0060, 34.0522, -118.2437, 'mi'), 2445.1, 3, 'NYC→LA mi');
approxEqual(geoDistance(40.7128, -74.0060, 34.0522, -118.2437, 'm'), 3935750, 5000, 'NYC→LA m');

// Default units = meters
approxEqual(geoDistance(40.7128, -74.0060, 34.0522, -118.2437), 3935750, 5000, 'default units = meters');

// Symmetric
assert(
  Math.abs(geoDistance(51.5, -0.12, 48.85, 2.35, 'km') - geoDistance(48.85, 2.35, 51.5, -0.12, 'km')) < 0.001,
  'distance is symmetric'
);

// Short distance (100m north of a point should be ~11119m on a sphere at this latitude)
// 1 degree latitude ≈ 111.19 km. So 0.001 deg ≈ 111.19 m.
approxEqual(geoDistance(40.0, -74.0, 40.001, -74.0, 'm'), 111.19, 0.5, '0.001 deg latitude ≈ 111.19 m');

// London → Paris ≈ 343.5 km
approxEqual(geoDistance(51.5074, -0.1278, 48.8566, 2.3522, 'km'), 343.5, 2, 'London→Paris km');

// --- geoInPolygon (ray casting) ---

// A unit square around the origin: corners at (lat 0..1, lon 0..1)
const square = [
  { lat: 0, lon: 0 },
  { lat: 1, lon: 0 },
  { lat: 1, lon: 1 },
  { lat: 0, lon: 1 }
];

assert(geoInPolygon(square, { lat: 0.5, lon: 0.5 }) === true, 'point inside square');
assert(geoInPolygon(square, { lat: 0.5, lon: 0.5 }) === true, 'center inside');
assert(geoInPolygon(square, { lat: 2, lon: 2 }) === false, 'point outside square (NE)');
assert(geoInPolygon(square, { lat: -1, lon: -1 }) === false, 'point outside square (SW)');
assert(geoInPolygon(square, { lat: 0.5, lon: 5 }) === false, 'point outside square (far E)');

// A triangle
const triangle = [
  { lat: 0, lon: 0 },
  { lat: 10, lon: 0 },
  { lat: 0, lon: 10 }
];
assert(geoInPolygon(triangle, { lat: 1, lon: 1 }) === true, 'point inside triangle');
assert(geoInPolygon(triangle, { lat: 8, lon: 8 }) === false, 'point outside triangle');

// Degenerate inputs
assert(geoInPolygon([], { lat: 0, lon: 0 }) === false, 'empty polygon → false');
assert(geoInPolygon([{ lat: 0, lon: 0 }], { lat: 0, lon: 0 }) === false, '< 3 vertices → false');
assert(geoInPolygon(square, null) === false, 'null point → false');
assert(geoInPolygon(null, { lat: 0, lon: 0 }) === false, 'null polygon → false');

// Concave polygon (a U-shape: square 0..10 with a top-center notch removed
// between lon 3..7 above lat 4). Verifies ray casting handles concavity.
//   lon=x horizontal, lat=y vertical. Vertices clockwise.
const concave = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 10 },
  { lat: 10, lon: 10 },
  { lat: 10, lon: 7 },
  { lat: 4, lon: 7 },
  { lat: 4, lon: 3 },
  { lat: 10, lon: 3 },
  { lat: 10, lon: 0 }
];
assert(geoInPolygon(concave, { lat: 2, lon: 5 }) === true, 'concave: point in U base (inside)');
assert(geoInPolygon(concave, { lat: 8, lon: 1 }) === true, 'concave: point in left arm (inside)');
assert(geoInPolygon(concave, { lat: 8, lon: 9 }) === true, 'concave: point in right arm (inside)');
assert(geoInPolygon(concave, { lat: 8, lon: 5 }) === false, 'concave: point in notch (outside)');
assert(geoInPolygon(concave, { lat: 6, lon: 5 }) === false, 'concave: point in notch lower (outside)');

console.log(`Geo contract tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
