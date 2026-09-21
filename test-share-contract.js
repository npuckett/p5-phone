#!/usr/bin/env node
/**
 * Contract tests for p5-phone Share protocol helpers.
 * Loads helper implementations from src/p5-phone.js.
 * Run: node test-share-contract.js
 */

const fs = require('fs');
const path = require('path');

function loadShareHelpers() {
  const srcPath = path.join(__dirname, 'src', 'p5-phone.js');
  const src = fs.readFileSync(srcPath, 'utf8');
  const start = src.indexOf('function _shareIsJsonSerializable');
  const end = src.indexOf('function _shareRebuildGuestsArray');
  if (start === -1 || end === -1) {
    throw new Error('Could not locate Share helpers in src/p5-phone.js');
  }

  const block = src.slice(start, end);
  const factory = new Function(
    block +
      '\nreturn {\n' +
      '  shareIsJsonSerializable: _shareIsJsonSerializable,\n' +
      '  shareCloneJson: _shareCloneJson,\n' +
      '  shareParsePath: _shareParsePath,\n' +
      '  shareGetAtPath: _shareGetAtPath,\n' +
      '  shareApplyPatchInPlace: _shareApplyPatchInPlace,\n' +
      '  shareRoomKey: _shareRoomKey,\n' +
      '  shareReadUrlParams: _shareReadUrlParams,\n' +
      '  shareBuildJoinUrl: _shareBuildJoinUrl\n' +
      '};'
  );
  return factory();
}

const {
  shareIsJsonSerializable,
  shareCloneJson,
  shareParsePath,
  shareGetAtPath,
  shareApplyPatchInPlace,
  shareRoomKey,
  shareReadUrlParams,
  shareBuildJoinUrl
} = loadShareHelpers();

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

assert(shareIsJsonSerializable(null), 'null serializable');
assert(shareIsJsonSerializable(true), 'bool serializable');
assert(shareIsJsonSerializable(12), 'number serializable');
assert(shareIsJsonSerializable('hi'), 'string serializable');
assert(shareIsJsonSerializable({ a: 1, b: [2, 3] }), 'plain object serializable');
assert(!shareIsJsonSerializable(undefined), 'undefined rejected');
assert(!shareIsJsonSerializable(NaN), 'NaN rejected');
assert(!shareIsJsonSerializable(Infinity), 'Infinity rejected');
assert(!shareIsJsonSerializable(() => {}), 'function rejected');
assert(!shareIsJsonSerializable(new Date()), 'Date rejected');
assert(!shareIsJsonSerializable(new Uint8Array([1])), 'typed array rejected');

const cloned = shareCloneJson({ x: 1, nest: { y: 2 } });
assert(cloned.x === 1 && cloned.nest.y === 2, 'clone preserves values');
cloned.nest.y = 9;
assert(shareCloneJson({ x: 1, nest: { y: 2 } }).nest.y === 2, 'clone is deep');

assert(shareParsePath('a.b.c').join(',') === 'a,b,c', 'parse path');
assert(shareParsePath('').length === 0, 'empty path');
assert(shareParsePath('..a.').join(',') === 'a', 'filter empty segments');

const tree = { score: 0, pos: { x: 1 } };
assert(shareGetAtPath(tree, 'score') === 0, 'get score');
assert(shareGetAtPath(tree, 'pos.x') === 1, 'get nested');
assert(shareGetAtPath(tree, 'missing') === undefined, 'get missing');

assert(shareApplyPatchInPlace(tree, 'score', 5) === true, 'patch score');
assert(tree.score === 5, 'score updated');
assert(shareApplyPatchInPlace(tree, 'pos.y', 8) === true, 'patch nested create');
assert(tree.pos.y === 8, 'nested y created');
assert(shareApplyPatchInPlace(tree, 'pos.x', undefined) === true, 'delete leaf');
assert(tree.pos.x === undefined && !('x' in tree.pos), 'leaf deleted');
assert(shareApplyPatchInPlace(tree, 'deep.child.val', 3) === true, 'create intermediate objects');
assert(tree.deep.child.val === 3, 'deep path created');
assert(shareApplyPatchInPlace(tree, '', 1) === false, 'empty path rejected');

assert(shareRoomKey(undefined, 'demo') === 'default:demo', 'default app');
assert(shareRoomKey('app', undefined) === 'app:main', 'default room');
assert(shareRoomKey('  MyApp  ', ' Room ') === 'MyApp:Room', 'trim app/room');

const fromUrl = shareReadUrlParams(
  'shareHost=https://demo.workers.dev/&room=lab&app=sketch'
);
assert(fromUrl.host === 'https://demo.workers.dev/', 'read shareHost');
assert(fromUrl.room === 'lab', 'read room');
assert(fromUrl.app === 'sketch', 'read app');

const aliases = shareReadUrlParams('host=https://h.example&shareRoom=r2&shareApp=a2');
assert(aliases.host === 'https://h.example', 'host alias');
assert(aliases.room === 'r2', 'shareRoom alias');
assert(aliases.app === 'a2', 'shareApp alias');

const join = shareBuildJoinUrl(
  'https://example.com/sketch/?x=1',
  { host: 'https://demo.workers.dev/', room: 'lab', app: 'sketch' }
);
assert(join.indexOf('shareHost=https%3A%2F%2Fdemo.workers.dev') !== -1, 'join url host');
assert(join.indexOf('room=lab') !== -1, 'join url room');
assert(join.indexOf('app=sketch') !== -1, 'join url app');
assert(join.indexOf('x=1') !== -1, 'join url keeps other params');

const joinDefaultApp = shareBuildJoinUrl(
  'https://example.com/sketch/',
  { host: 'https://demo.workers.dev', room: 'lab', app: 'default' }
);
assert(joinDefaultApp.indexOf('app=') === -1, 'default app omitted from join url');

console.log(`Share contract tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
