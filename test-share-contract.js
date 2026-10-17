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
      '  shareIsSafePath: _shareIsSafePath,\n' +
      '  shareGetAtPath: _shareGetAtPath,\n' +
      '  shareApplyPatchInPlace: _shareApplyPatchInPlace,\n' +
      '  shareRoomKey: _shareRoomKey,\n' +
      '  shareReadUrlParams: _shareReadUrlParams,\n' +
      '  shareBuildJoinUrl: _shareBuildJoinUrl,\n' +
      '  shareParseDuration: _shareParseDuration,\n' +
      '  shareParseKeep: _shareParseKeep,\n' +
      '  shareParseQuiet: _shareParseQuiet\n' +
      '};'
  );
  return factory();
}

const {
  shareIsJsonSerializable,
  shareCloneJson,
  shareParsePath,
  shareIsSafePath,
  shareGetAtPath,
  shareApplyPatchInPlace,
  shareRoomKey,
  shareReadUrlParams,
  shareBuildJoinUrl,
  shareParseDuration,
  shareParseKeep,
  shareParseQuiet
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

// Arrays are walked into, so index paths (sent for push / index writes) work.
const withList = { list: [1, 2] };
assert(shareApplyPatchInPlace(withList, 'list.2', 3) === true && withList.list.join() === '1,2,3', 'index path appends');
assert(Array.isArray(withList.list), 'index path keeps the array');
assert(shareApplyPatchInPlace(withList, 'list.length', 1) === true && withList.list.join() === '1', 'length path truncates');

// Paths into Object.prototype are refused everywhere.
assert(shareIsSafePath('a.b') && !shareIsSafePath(''), 'safe path basics');
assert(!shareIsSafePath('__proto__.x') && !shareIsSafePath('a.constructor.prototype.x') && !shareIsSafePath('a.prototype'), 'prototype keys refused');
assert(shareApplyPatchInPlace({}, '__proto__.polluted', 'yes') === false, '__proto__ patch refused');
assert(shareApplyPatchInPlace({}, 'constructor.prototype.polluted', 'yes') === false, 'constructor patch refused');
assert(({}).polluted === undefined, 'Object.prototype untouched');

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

// ---- the keep option (client side) ----

const DAY = 24 * 60 * 60 * 1000;
assert(shareParseKeep(undefined) === null && shareParseKeep(false) === null && shareParseKeep(null) === null, 'no keep option: no keep');
assert(shareParseKeep(true).expire === 7 * DAY, 'keep: true is 7 days');
assert(shareParseKeep({}).expire === 7 * DAY, 'keep: {} is 7 days');
assert(shareParseKeep({ expire: 3000 }).expire === 3000, 'keep: { expire: ms }');
assert(shareParseKeep(86400000).expire === DAY, 'keep: a bare number is ms');
assert(shareParseKeep('24h').expire === DAY, 'keep: \'24h\'');
assert(shareParseKeep({ expire: '7d' }).expire === 7 * DAY, 'keep: { expire: \'7d\' }');
assert(shareParseKeep('30m').expire === 30 * 60 * 1000, 'keep: \'30m\'');
assert(shareParseKeep(' 90 s ').expire === 90000, 'keep: spaces and seconds');
assert(shareParseKeep('1.5h').expire === 90 * 60 * 1000, 'keep: fractions');
assert(shareParseKeep('2D').expire === 2 * DAY, 'keep: unit is case-insensitive');
assert(shareParseKeep('500ms').expire === 1000 && shareParseKeep('500ms').note, 'keep: under 1 s is raised to 1 s, with a note');
assert(shareParseKeep('45d').expire === 30 * DAY && shareParseKeep('45d').note, 'keep: over 30 days is cut to 30 days, with a note');
assert(shareParseKeep(30 * DAY).expire === 30 * DAY && !shareParseKeep(30 * DAY).note, 'keep: 30 days exactly is fine');
assert(shareParseKeep('7 days').error, 'keep: \'7 days\' is an error');
assert(shareParseKeep('forever').error, 'keep: a word is an error');
assert(shareParseKeep('24').error, 'keep: a string with no unit is an error');
assert(shareParseKeep(-5).error && shareParseKeep(0).error && shareParseKeep(NaN).error, 'keep: zero, negative and NaN are errors');
assert(shareParseKeep({ expire: 'soon' }).error, 'keep: { expire: \'soon\' } is an error');
assert(shareParseKeep([]).error, 'keep: an array is an error');
assert(Number.isNaN(shareParseDuration(Infinity)), 'duration: Infinity rejected');

// ---- the quiet option (client side) ----

assert(shareParseQuiet(undefined).quiet === false && shareParseQuiet(null).quiet === false && shareParseQuiet(false).quiet === false, 'no quiet option: not quiet');
assert(shareParseQuiet(undefined).error === undefined && shareParseQuiet(false).error === undefined, 'no quiet option: no error');
assert(shareParseQuiet(true).quiet === true && shareParseQuiet(true).error === undefined, 'quiet: true is quiet');
assert(shareParseQuiet('yes').error && shareParseQuiet(1).error && shareParseQuiet('true').error, 'quiet: only true or false are accepted');
assert(shareParseQuiet({}).error && shareParseQuiet([]).error, 'quiet: an object or an array is an error');
assert(shareParseQuiet(0).error && shareParseQuiet('').error, 'quiet: 0 and an empty string are errors too (write false)');
assert(shareParseQuiet('yes').quiet === false, 'quiet: an error never turns quiet on');

// ---- the keep option (server side): protocol.ts must agree with the client ----

function loadServerProtocol() {
  let ts;
  try {
    ts = require(path.join(__dirname, 'companion', 'P5PhoneShare', 'node_modules', 'typescript'));
  } catch (e) {
    return null;
  }
  const file = path.join(__dirname, 'companion', 'P5PhoneShare', 'src', 'protocol.ts');
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'TextEncoder', js)(mod, mod.exports, TextEncoder);
  return mod.exports;
}

const server = loadServerProtocol();
if (!server) {
  console.log('Skipping server protocol checks: run npm install in companion/P5PhoneShare to enable them.');
} else {
  assert(server.SHARE_PROTOCOL_VERSION === 2, 'server speaks protocol v2 (the keep option does not bump it)');
  assert(server.KEEP_DEFAULT_MS === shareParseKeep(true).expire, 'server and client agree on the default keep time');
  assert(server.KEEP_MAX_MS === 30 * DAY && server.KEEP_MIN_MS === 1000, 'server limits are 1 second and 30 days');
  assert(server.KEEP_MAX_BYTES === 64 * 1024, 'a kept room holds 64 KB');
  assert(server.parseKeep(undefined) === null && server.parseKeep(null) === null && server.parseKeep(false) === null, 'server: no keep field, no keep');
  assert(server.parseKeep(true).expire === 7 * DAY, 'server: keep true is 7 days');
  assert(server.parseKeep({}).expire === 7 * DAY, 'server: keep {} is 7 days');
  assert(server.parseKeep({ expire: 5000 }).expire === 5000, 'server: keep.expire is used');
  assert(server.parseKeep({ expire: 1 }).expire === 1000, 'server: a tiny keep.expire is raised to 1 s');
  assert(server.parseKeep({ expire: 99 * DAY }).expire === 30 * DAY, 'server: a huge keep.expire is cut to 30 days');
  assert(server.parseKeep({ expire: 'abc' }).expire === 7 * DAY, 'server: a bad keep.expire falls back to 7 days');
  assert(server.parseKeep({ expire: NaN }).expire === 7 * DAY, 'server: NaN keep.expire falls back to 7 days');
  assert(server.parseKeep('24h') === null && server.parseKeep(7) === null && server.parseKeep([]) === null, 'server: only true or an object asks for keep');
  assert(server.jsonBytes({ a: 'é' }) === JSON.stringify({ a: 'é' }).length + 1, 'jsonBytes counts UTF-8 bytes');
  assert(server.jsonBytes({}) === 2, 'jsonBytes of {} is 2');

  // ---- the quiet option (server side) ----
  assert(server.SHARE_PROTOCOL_VERSION === 2, 'server speaks protocol v2 (the quiet option does not bump it)');
  assert(server.parseQuiet(true) === true, 'server: hello.quiet true is quiet');
  assert(server.parseQuiet(undefined) === false && server.parseQuiet(null) === false && server.parseQuiet(false) === false, 'server: no quiet field, not quiet');
  assert(server.parseQuiet(1) === false && server.parseQuiet('true') === false && server.parseQuiet({}) === false && server.parseQuiet([]) === false, 'server: only the boolean true is quiet');
  const mixed = [
    { scope: 'me', path: 'x', value: 1 },
    { scope: 'shared', path: 'score', value: 2 },
    { scope: 'me', path: 'y' }
  ];
  const forQuiet = server.opsForQuiet(mixed);
  assert(forQuiet.length === 1 && forQuiet[0].scope === 'shared' && forQuiet[0].path === 'score' && forQuiet[0].value === 2, 'server: a quiet connection gets only the shared ops of a batch');
  assert(server.opsForQuiet([{ scope: 'me', path: 'x', value: 1 }]).length === 0, 'server: a quiet connection gets nothing from a me-only batch');
  const sharedOnly = [{ scope: 'shared', path: 'a', value: 1 }, { scope: 'shared', path: 'b', value: 2 }];
  assert(server.opsForQuiet(sharedOnly).length === 2, 'server: a shared-only batch goes to a quiet connection whole');
  assert(server.opsForQuiet([]).length === 0, 'server: no ops, nothing for a quiet connection');
  assert(mixed.length === 3, 'server: opsForQuiet does not change its input');
}

console.log(`Share contract tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
