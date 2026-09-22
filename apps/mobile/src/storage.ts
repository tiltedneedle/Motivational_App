/**
 * The one gate between this app and the disk.
 *
 * There is a failure mode here that is worse than losing the writing, and it is
 * quietly replacing it. If the stored blob cannot be read — a truncated write,
 * an Android SQLite error — the store comes up holding its empty defaults. The
 * very next `set()` then serialises those defaults straight over the blob,
 * which is still sitting on the device intact underneath. The Book, every
 * sitting, every plan: gone, and gone because of the recovery path rather than
 * the original fault.
 *
 * That is not hypothetical plumbing. `zustand/middleware` replaces
 * `api.setState` with `(state, replace) => { savedSetState(state, replace);
 * return setItem(); }`, so *every* write persists, including the one that sets
 * the "storage is broken" flag. The flag's own write was destroying the data
 * the flag existed to protect.
 *
 * So the latch lives here, below zustand, where nothing can route around it:
 *
 *  - a read that fails latches the store closed, and every write after that is
 *    dropped rather than attempted;
 *  - before latching, the unreadable bytes are copied to a dated key, so the
 *    data is still on the device for a support path or a later repair;
 *  - `hasFailed()` lets the app tell the person the truth about what is and is
 *    not being saved.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * How many characters of the store go in one row.
 *
 * Android reads a row through a SQLite CursorWindow of two megabytes, and a
 * row past it cannot be read back at all — the app opened latched, the
 * writing on the disk and unreachable. A store over this many characters
 * is written as parts (`<key>#0`, `<key>#1`, …) with a small manifest
 * under the key itself, and read back joined. Half a million UTF-16 units
 * is well under the window in UTF-8 for any text this app stores.
 */
const PART = 500_000;
const MANIFEST = '__morrow_parts';

/** The value under a key, joined if it was written as parts. */
async function readWhole(name: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(name);
  if (raw === null) return null;
  if (!raw.startsWith(`{"${MANIFEST}"`)) return raw;
  const parts = (JSON.parse(raw) as { [MANIFEST]: number })[MANIFEST];
  const keys = Array.from({ length: parts }, (_, i) => `${name}#${i}`);
  const rows = await AsyncStorage.multiGet(keys);
  const pieces = rows.map(([, v]) => v);
  if (pieces.some((p) => p === null)) throw new Error('a part of the stored writing is missing');
  return pieces.join('');
}

/** The value written under a key: inline while it fits one row, as parts past that. */
async function writeWhole(name: string, value: string): Promise<void> {
  if (value.length <= PART) {
    await AsyncStorage.setItem(name, value);
    await dropParts(name, 0);
    return;
  }
  const count = Math.ceil(value.length / PART);
  const rows: [string, string][] = Array.from({ length: count }, (_, i) => [`${name}#${i}`, value.slice(i * PART, (i + 1) * PART)]);
  // The parts first, the manifest last: a write cut short leaves the old
  // value readable under the key rather than a manifest with parts missing.
  await AsyncStorage.multiSet(rows);
  await AsyncStorage.setItem(name, JSON.stringify({ [MANIFEST]: count }));
  await dropParts(name, count);
}

/** Parts beyond `from`, removed. */
async function dropParts(name: string, from: number): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(`${name}#`) && Number(k.slice(name.length + 1)) >= from);
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // stale parts cost only space
  }
}

/**
 * Writes coalesced: the newest value, written once the keystrokes pause.
 *
 * zustand's persist writes on every `set()`, and seven screens set the
 * store on every keystroke; each write serialised and wrote the whole
 * store — half a megabyte after a year, twelve milliseconds and a
 * SQLite row rewritten over the bridge per character on a phone. One
 * pending write, flushed the moment the app goes to the background, so a
 * kill loses at most a third of a second of typing. On the web the write
 * is localStorage's own synchronous one and stays immediate: a page that
 * is closed keeps what was typed to the last keystroke, and the checks
 * that read the stored copy straight after an action read it as it is.
 */
const WRITE_DELAY_MS = Platform.OS === 'web' ? 0 : 300;
let writeDelay = WRITE_DELAY_MS;
let pending: { name: string; value: string } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> = Promise.resolve();

/** Tests: write at once. */
export function setWriteDelayForTest(ms: number): void {
  writeDelay = ms;
}

async function writeNow(name: string, value: string): Promise<void> {
  try {
    await writeWhole(name, value);
    // A write that landed clears a write failure before it.
    if (failure?.kind === 'write') {
      failure = null;
      tell(null);
    }
  } catch (err) {
    latch('write', err instanceof Error ? err.message : 'the device would not write to its own storage');
  }
}

/** Whatever is waiting, written now. Safe to call at any time. */
export function flushWrites(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const p = pending;
  pending = null;
  if (p && !failed && open) inflight = inflight.then(() => writeNow(p.name, p.value));
  return inflight;
}

if (Platform.OS === 'web') {
  const w = globalThis as { addEventListener?: (t: string, f: () => void) => void; document?: { visibilityState?: string; addEventListener?: (t: string, f: () => void) => void } };
  try {
    w.addEventListener?.('pagehide', () => void flushWrites());
    w.document?.addEventListener?.('visibilitychange', () => {
      if (w.document?.visibilityState === 'hidden') void flushWrites();
    });
  } catch {
    // not a browser
  }
} else {
  try {
    AppState.addEventListener('change', (next) => {
      if (next !== 'active') void flushWrites();
    });
  } catch {
    // no app state here (tests)
  }
}

/** Where the unreadable bytes go, so a bad read never means a lost Book. */
export const QUARANTINE_PREFIX = 'morrow-unreadable-';

/**
 * The one key everything the person has written lives under.
 *
 * Named here rather than inline in the persist config because two places need
 * it: the store, and the error boundary, which reads the blob straight off
 * disk precisely so that it does not depend on the store still working. A
 * magic string copied into both is a rename away from an export button that
 * silently finds nothing.
 */
export const STORE_KEY = 'morrow-v1';

export type StorageFailure = {
  /** A read that failed latches before anything is shown; a write fails later, mid-use. */
  kind: 'read' | 'write';
  detail: string;
};

let failed = false;
let failure: StorageFailure | null = null;

export function hasFailed(): boolean {
  return failed;
}

export function failureReason(): string | null {
  return failure?.detail ?? null;
}

export function storageFailure(): StorageFailure | null {
  return failure;
}

/** Told of a failure, and told `null` when a later write cleared it. */
type FailureListener = (failure: StorageFailure | null) => void;
const listeners = new Set<FailureListener>();

/**
 * Whether writes may go to disk at all. Closed until the store has been read
 * once: zustand persists on every `setState`, including ones the root layout
 * makes before the disk has answered, and each of those wrote the empty
 * defaults over the person's blob for the milliseconds until the real state
 * was read back. A crash in that window was the whole Book gone.
 */
let open = false;

/** The store has been read; writes may land. Called once hydration is done. */
export function openStorage(): void {
  open = true;
}

/**
 * Close the read latch and make a fresh start on this device, at the
 * person's asking. The unreadable bytes are already under a dated
 * quarantine key (`quarantinedRaw`); the store key itself is removed so the
 * next launch does not read them again, and writes are allowed from now.
 */
export async function clearLatchAndReplace(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORE_KEY);
    await dropParts(STORE_KEY, 0);
  } catch {
    // Nothing further to try; the write that follows will say so if it fails.
  }
  failed = false;
  failure = null;
  open = true;
  tell(null);
}

/** The stored writing as one string, joined if it was written as parts — for the exports that read the disk directly. */
export async function storedRaw(): Promise<string | null> {
  return readWhole(STORE_KEY);
}

/** The most recent quarantined copy of the store, or null. Bytes, as they were. */
export async function quarantinedRaw(): Promise<string | null> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(QUARANTINE_PREFIX)).sort();
    const last = mine[mine.length - 1];
    return last ? await AsyncStorage.getItem(last) : null;
  } catch {
    return null;
  }
}

/**
 * Close the read latch from outside: the store's own merge threw on a shape
 * it could not take, which is a blob it must not write over.
 */
export function markUnreadable(detail: string): void {
  latch('read', detail);
}

function tell(value: StorageFailure | null): void {
  for (const listener of listeners) {
    try {
      listener(value);
    } catch {
      // A listener that throws must not stop the others being told.
    }
  }
}

/**
 * Be told when the latch closes.
 *
 * The store reads `hasFailed()` once, when it rehydrates. A write that fails
 * an hour later closed the latch just the same — every save after it was
 * dropped — but nothing was watching, so the app carried on looking as if it
 * were saving. This is what the store subscribes to so the banner can go up
 * the moment it stops. A listener added after the latch closed is told at
 * once.
 */
export function onStorageFailure(listener: FailureListener): () => void {
  listeners.add(listener);
  if (failure) listener(failure);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests only: forget a previous failure. */
export function resetStorageLatch(): void {
  failed = false;
  failure = null;
  open = true;
}

/** Tests only: the state a launch starts in, before the disk has answered. */
export function closeStorageForTest(): void {
  open = false;
}

async function quarantine(key: string, raw: string | null): Promise<void> {
  if (!raw) return;
  try {
    // One copy, not one per launch: the same unreadable bytes were copied
    // again on every open, and five launches of a large store filled the
    // 6 MB Android database, after which even "start fresh" could not write.
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(`${QUARANTINE_PREFIX}${key}-`)).sort();
    const same = await Promise.all(mine.map(async (k) => (await AsyncStorage.getItem(k)) === raw));
    if (same.some(Boolean)) return;
    await AsyncStorage.setItem(`${QUARANTINE_PREFIX}${key}-${Date.now()}`, raw);
    // The newest two are enough; older copies of other failures go.
    const stale = mine.slice(0, Math.max(0, mine.length - 1));
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    // If even this fails there is nothing further to try, and the important
    // half — not overwriting the original — has already happened.
  }
}

/**
 * Every quarantined copy, gone. For "Delete everything": the confirmation
 * says nothing of the writing remains on the device, and a copy kept when
 * storage failed is still the writing.
 */
export async function clearQuarantine(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(QUARANTINE_PREFIX));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {
    // nothing further to try
  }
}

function latch(kind: StorageFailure['kind'], detail: string): void {
  // A read that failed closes the latch: the person's real data is still
  // under there, and an empty store written over it is unrecoverable in a
  // way the original fault was not. A write that failed does not: the disk
  // holds an older, sound state and memory a newer one, so writing again can
  // only help — one locked-database error used to drop every save for the
  // rest of the session, and the banner's advice (restart) discarded them.
  const first = !failure;
  if (kind === 'read') failed = true;
  failure = { kind, detail };
  if (!first) return;
  tell(failure);
}

export const guardedStorage: StateStorage = {
  async getItem(name) {
    try {
      const raw = await readWhole(name);
      if (raw === null) return null;
      // Parse here rather than letting the caller do it, so a blob that reads
      // but does not parse latches the store too. That is the commonest shape
      // of this failure: a write interrupted halfway.
      try {
        JSON.parse(raw);
      } catch {
        await quarantine(name, raw);
        latch('read', 'the stored writing could not be read back');
        // Returning null tells zustand there is nothing to rehydrate. The
        // original bytes are untouched on disk and copied to a dated key, and
        // the latch means nothing will be written over them.
        return null;
      }
      return raw;
    } catch (err) {
      latch('read', err instanceof Error ? err.message : 'the device would not open its own storage');
      return null;
    }
  },

  async setItem(name, value) {
    // The whole point. Once a read has failed, every write is dropped: the
    // person's real data is still under there, and an empty store written over
    // it is unrecoverable in a way the original fault was not. And nothing
    // is written before the store has been read once (`openStorage`).
    if (failed || !open) return;
    if (writeDelay <= 0) {
      await writeNow(name, value);
      return;
    }
    pending = { name, value };
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flushWrites(), writeDelay);
  },

  async removeItem(name) {
    if (failed || !open) return;
    if (pending?.name === name) pending = null;
    try {
      await AsyncStorage.removeItem(name);
      await dropParts(name, 0);
    } catch {
      // Deleting is the one operation whose failure costs nothing.
    }
  },
};
