/**
 * Browser-local case storage (ADR-0003: no server persistence). Every access is wrapped in
 * try/catch: storage can be blocked, full or cleared, and the pages must still render.
 */
import { CaseRecordSchema, type CaseRecord, type CaseRecordInput } from "./case";

const KEY_PREFIX = "splitline:case:";
const INDEX_KEY = "splitline:cases";
export const DRAFT_KEY = "splitline:intake-draft";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readIndex(store: StorageLike): string[] {
  try {
    const raw = store.getItem(INDEX_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function loadCase(id: string, store: StorageLike | null = browserStorage()): CaseRecord | null {
  if (!store) return null;
  try {
    const raw = store.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    const parsed = CaseRecordSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.id === id ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Saves the case; returns false when the browser refused (private mode, quota). */
export function saveCase(record: CaseRecordInput, store: StorageLike | null = browserStorage()): boolean {
  if (!store) return false;
  try {
    const parsed = CaseRecordSchema.parse(record);
    store.setItem(KEY_PREFIX + parsed.id, JSON.stringify(parsed));
    const index = readIndex(store).filter((x) => x !== parsed.id);
    store.setItem(INDEX_KEY, JSON.stringify([parsed.id, ...index].slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function deleteCase(id: string, store: StorageLike | null = browserStorage()): void {
  if (!store) return;
  try {
    store.removeItem(KEY_PREFIX + id);
    store.setItem(INDEX_KEY, JSON.stringify(readIndex(store).filter((x) => x !== id)));
  } catch {
    // Nothing to do: the record stays until storage works again.
  }
}

export function listCaseIds(store: StorageLike | null = browserStorage()): string[] {
  return store ? readIndex(store) : [];
}

export function readJson(key: string, store: StorageLike | null = browserStorage()): unknown {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, store: StorageLike | null = browserStorage()): void {
  if (!store) return;
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch {
    // A draft that cannot be saved is not an error the user needs to see.
  }
}
