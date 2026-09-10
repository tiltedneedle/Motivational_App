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
import type { StateStorage } from 'zustand/middleware';

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

let failed = false;
let failureDetail: string | null = null;

export function hasFailed(): boolean {
  return failed;
}

export function failureReason(): string | null {
  return failureDetail;
}

/** Tests only: forget a previous failure. */
export function resetStorageLatch(): void {
  failed = false;
  failureDetail = null;
}

async function quarantine(key: string, raw: string | null): Promise<void> {
  if (!raw) return;
  try {
    await AsyncStorage.setItem(`${QUARANTINE_PREFIX}${key}-${Date.now()}`, raw);
  } catch {
    // If even this fails there is nothing further to try, and the important
    // half — not overwriting the original — has already happened.
  }
}

function latch(detail: string): void {
  failed = true;
  failureDetail = detail;
}

export const guardedStorage: StateStorage = {
  async getItem(name) {
    try {
      const raw = await AsyncStorage.getItem(name);
      if (raw === null) return null;
      // Parse here rather than letting the caller do it, so a blob that reads
      // but does not parse latches the store too. That is the commonest shape
      // of this failure: a write interrupted halfway.
      try {
        JSON.parse(raw);
      } catch (err) {
        await quarantine(name, raw);
        latch('the stored writing could not be read back');
        // Returning null tells zustand there is nothing to rehydrate. The
        // original bytes are untouched on disk and copied to a dated key, and
        // the latch means nothing will be written over them.
        return null;
      }
      return raw;
    } catch (err) {
      latch(err instanceof Error ? err.message : 'the device would not open its own storage');
      return null;
    }
  },

  async setItem(name, value) {
    // The whole point. Once a read has failed, every write is dropped: the
    // person's real data is still under there, and an empty store written over
    // it is unrecoverable in a way the original fault was not.
    if (failed) return;
    try {
      await AsyncStorage.setItem(name, value);
    } catch (err) {
      latch(err instanceof Error ? err.message : 'the device would not write to its own storage');
    }
  },

  async removeItem(name) {
    if (failed) return;
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Deleting is the one operation whose failure costs nothing.
    }
  },
};
