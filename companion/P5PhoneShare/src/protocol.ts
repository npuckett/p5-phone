/**
 * p5-phone Share wire protocol helpers (v2).
 * Keep in sync with the SHARE helpers in src/p5-phone.js.
 */

// v2: 'batch' messages, and shared patches are echoed to their sender.
// The keep option (hello.keep, welcome.keep, 'kept', 'clear', 'reset') and the quiet option
// (hello.quiet, welcome.quiet) are optional and added without a version bump: a peer that
// does not know them ignores the fields and the messages.
export const SHARE_PROTOCOL_VERSION = 2;

// The keep option: a room that keeps `shared` after the last phone leaves.
export const KEEP_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;
export const KEEP_MAX_MS = 30 * 24 * 60 * 60 * 1000;
export const KEEP_MIN_MS = 1000;
// A kept room holds at most this much JSON (UTF-8 bytes).
export const KEEP_MAX_BYTES = 64 * 1024;

export type KeepPolicy = { expire: number };

export type ShareScope = 'shared' | 'me';

export type ShareMessage =
  | { type: 'hello'; v: number; app: string; room: string; me: Record<string, unknown>; shared?: Record<string, unknown>; keep?: { expire?: number }; quiet?: boolean }
  | { type: 'welcome'; v: number; clientId: string; isHost: boolean; shared: Record<string, unknown>; guests: GuestEntry[]; you: Record<string, unknown>; keep?: KeepStatus; quiet?: boolean }
  | { type: 'kept'; v: number; expire: number; remaining: number }
  | { type: 'clear'; v: number; shared?: Record<string, unknown> }
  | { type: 'reset'; v: number; shared: Record<string, unknown> }
  | { type: 'patch'; v: number; scope: ShareScope; path: string; value?: unknown; clientId?: string }
  | { type: 'batch'; v: number; ops: PatchOp[]; clientId?: string }
  | { type: 'presence'; v: number; guests: GuestEntry[]; joined?: string; left?: string }
  | { type: 'host'; v: number; clientId: string; isHost: boolean }
  | { type: 'emit'; v: number; name: string; data?: unknown; clientId?: string }
  | { type: 'error'; v: number; message: string };

export type KeepStatus = {
  /** The room's keep time in ms: how long the kept copy lives after the last change. */
  expire: number;
  /** Ms left until the kept copy is deleted, if nothing changes. */
  remaining: number;
};

export type PatchOp = {
  scope: ShareScope;
  path: string;
  value?: unknown;
};

export type GuestEntry = {
  id: string;
  data: Record<string, unknown>;
};

export function isJsonSerializable(value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (value === null) return true;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return true;
  if (t === 'number') return Number.isFinite(value as number);
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') return false;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!isJsonSerializable(value[i], depth + 1)) return false;
    }
    return true;
  }
  if (t === 'object') {
    // Reject DOM / class instances / typed arrays by constructor name heuristics
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return false;
    }
    for (const key of Object.keys(value as object)) {
      if (!isJsonSerializable((value as Record<string, unknown>)[key], depth + 1)) return false;
    }
    return true;
  }
  return false;
}

/** UTF-8 size of a value as JSON. */
export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** Turn a hello.keep value into a policy, or null for no keep. Never trusts the client's number. */
export function parseKeep(raw: unknown): KeepPolicy | null {
  if (raw === undefined || raw === null || raw === false) return null;
  let expire = KEEP_DEFAULT_MS;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const e = (raw as { expire?: unknown }).expire;
    if (typeof e === 'number' && Number.isFinite(e)) expire = e;
  } else if (raw !== true) {
    return null;
  }
  return { expire: Math.min(KEEP_MAX_MS, Math.max(KEEP_MIN_MS, Math.round(expire))) };
}

/** hello.quiet: only the boolean true turns it on. Anything else is a connection that hears everything. */
export function parseQuiet(raw: unknown): boolean {
  return raw === true;
}

/**
 * The part of a list of patches that a quiet connection is sent: the `shared` ones. A quiet
 * connection never gets another phone's `me` changes.
 */
export function opsForQuiet(ops: PatchOp[]): PatchOp[] {
  return ops.filter((op) => op.scope === 'shared');
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function parsePath(path: string): string[] {
  if (typeof path !== 'string' || path.length === 0) return [];
  return path.split('.').filter((p) => p.length > 0);
}

// Path segments that would walk into Object.prototype.
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function isSafePath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  const parts = parsePath(path);
  return parts.length > 0 && parts.every((p) => !BLOCKED_KEYS.has(p));
}

export function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = parsePath(path);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Apply a path patch in place. `undefined` value deletes the leaf property.
 * Returns false if the path is empty or walks into __proto__ / prototype / constructor.
 */
export function applyPatchInPlace(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): boolean {
  if (!isSafePath(path)) return false;
  const parts = parsePath(path);

  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = cur[part];
    // Arrays are walked into, so 'list.2' sets an element.
    if (next === null || typeof next !== 'object') {
      const created: Record<string, unknown> = {};
      cur[part] = created;
      cur = created;
    } else {
      cur = next as Record<string, unknown>;
    }
  }

  const leaf = parts[parts.length - 1];
  if (value === undefined) {
    delete cur[leaf];
  } else {
    cur[leaf] = value as never;
  }
  return true;
}

export function roomKey(app: string | undefined, room: string): string {
  const a = (app && String(app).trim()) || 'default';
  const r = (room && String(room).trim()) || 'main';
  return `${a}:${r}`;
}

export function encodeMessage(msg: ShareMessage): string {
  return JSON.stringify(msg);
}

export function decodeMessage(raw: string): ShareMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      return null;
    }
    return parsed as ShareMessage;
  } catch {
    return null;
  }
}
