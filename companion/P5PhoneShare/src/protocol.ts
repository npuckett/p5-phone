/**
 * p5-phone Share wire protocol helpers (v1).
 * Keep in sync with the SHARE helpers in src/p5-phone.js.
 */

export const SHARE_PROTOCOL_VERSION = 1;

export type ShareScope = 'shared' | 'me';

export type ShareMessage =
  | { type: 'hello'; v: number; app: string; room: string; me: Record<string, unknown>; shared?: Record<string, unknown> }
  | { type: 'welcome'; v: number; clientId: string; isHost: boolean; shared: Record<string, unknown>; guests: GuestEntry[]; you: Record<string, unknown> }
  | { type: 'patch'; v: number; scope: ShareScope; path: string; value: unknown; clientId?: string }
  | { type: 'presence'; v: number; guests: GuestEntry[]; joined?: string; left?: string }
  | { type: 'host'; v: number; clientId: string; isHost: boolean }
  | { type: 'emit'; v: number; name: string; data?: unknown; clientId?: string }
  | { type: 'error'; v: number; message: string };

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

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function parsePath(path: string): string[] {
  if (typeof path !== 'string' || path.length === 0) return [];
  return path.split('.').filter((p) => p.length > 0);
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
 * Returns false if the path is empty or intermediate is not an object.
 */
export function applyPatchInPlace(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): boolean {
  const parts = parsePath(path);
  if (parts.length === 0) return false;

  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = cur[part];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
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
