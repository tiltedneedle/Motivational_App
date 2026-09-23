/**
 * The one thing this layer exists to prevent: replacing someone's writing with
 * an empty store because the read failed.
 *
 * These run against a fake AsyncStorage rather than a device, because what is
 * being tested is the ordering — that a failed read latches writes shut BEFORE
 * anything downstream can persist over the original bytes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const disk = new Map<string, string>();
let readThrows = false;

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => {
      if (readThrows) throw new Error('SQLITE_CORRUPT: database disk image is malformed');
      return disk.has(k) ? (disk.get(k) as string) : null;
    },
    setItem: async (k: string, v: string) => {
      disk.set(k, v);
    },
    removeItem: async (k: string) => {
      disk.delete(k);
    },
    getAllKeys: async () => [...disk.keys()],
    multiGet: async (keys: string[]) => keys.map((k) => [k, disk.has(k) ? (disk.get(k) as string) : null]),
    multiSet: async (rows: [string, string][]) => {
      for (const [k, v] of rows) {
        if (v.length > 2_000_000) throw new Error('Row too big to fit into CursorWindow');
        disk.set(k, v);
      }
    },
    multiRemove: async (keys: string[]) => {
      for (const k of keys) disk.delete(k);
    },
  },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AppState: { addEventListener: () => ({ remove() {} }) } }));

const { QUARANTINE_PREFIX, guardedStorage, hasFailed, resetStorageLatch, setWriteDelayForTest, storedRaw } = await import('./storage');
setWriteDelayForTest(0);

const A_REAL_BOOK = JSON.stringify({
  state: { books: [{ title: 'A year of small mornings' }], texts: [{ body: 'It is 6:40 and the kitchen is still blue.' }] },
  version: 0,
});

beforeEach(() => {
  disk.clear();
  readThrows = false;
  resetStorageLatch();
});

describe('reading and writing when the disk is fine', () => {
  it('round-trips', async () => {
    await guardedStorage.setItem('morrow-v1', A_REAL_BOOK);
    expect(await guardedStorage.getItem('morrow-v1')).toBe(A_REAL_BOOK);
    expect(hasFailed()).toBe(false);
  });

  it('reports nothing stored as nothing stored, not as a failure', async () => {
    expect(await guardedStorage.getItem('morrow-v1')).toBeNull();
    expect(hasFailed()).toBe(false);
  });
});

describe('when the stored writing cannot be read', () => {
  it('refuses every later write rather than overwriting what is there', async () => {
    // A write interrupted halfway is the commonest shape of this: it reads
    // back fine as a string and then does not parse.
    disk.set('morrow-v1', A_REAL_BOOK.slice(0, 60));

    expect(await guardedStorage.getItem('morrow-v1')).toBeNull();
    expect(hasFailed()).toBe(true);

    // This is the write that used to destroy everything: the store comes up
    // holding its empty defaults and persists them over the real bytes.
    await guardedStorage.setItem('morrow-v1', JSON.stringify({ state: { books: [], texts: [] }, version: 0 }));

    expect(disk.get('morrow-v1')).toBe(A_REAL_BOOK.slice(0, 60));
    expect(disk.get('morrow-v1')).not.toContain('"books":[]');
  });

  it('keeps a copy of the unreadable bytes so they are still recoverable', async () => {
    disk.set('morrow-v1', A_REAL_BOOK.slice(0, 60));
    await guardedStorage.getItem('morrow-v1');

    const kept = [...disk.entries()].filter(([k]) => k.startsWith(QUARANTINE_PREFIX));
    expect(kept).toHaveLength(1);
    expect(kept[0]?.[1]).toBe(A_REAL_BOOK.slice(0, 60));
  });

  it('latches on a read that throws outright, not only on bad JSON', async () => {
    disk.set('morrow-v1', A_REAL_BOOK);
    readThrows = true;

    expect(await guardedStorage.getItem('morrow-v1')).toBeNull();
    expect(hasFailed()).toBe(true);

    readThrows = false;
    await guardedStorage.setItem('morrow-v1', '{"state":{},"version":0}');
    // The original survives: the latch does not lift just because the disk
    // started answering again.
    expect(disk.get('morrow-v1')).toBe(A_REAL_BOOK);
  });

  it('refuses to delete as well, so a reset cannot finish the job', async () => {
    disk.set('morrow-v1', A_REAL_BOOK.slice(0, 60));
    await guardedStorage.getItem('morrow-v1');
    await guardedStorage.removeItem('morrow-v1');
    expect(disk.has('morrow-v1')).toBe(true);
  });
});

describe('being told when the latch closes', () => {
  it('tells a listener the moment a write fails, and says it was a write', async () => {
    const { onStorageFailure, storageFailure } = await import('./storage');
    const heard: string[] = [];
    const off = onStorageFailure((f) => heard.push(f ? f.kind : 'cleared'));
    // A disk that reads fine and then refuses a write, mid-use.
    disk.set('morrow-v1', A_REAL_BOOK);
    expect(await guardedStorage.getItem('morrow-v1')).toBe(A_REAL_BOOK);
    expect(heard).toEqual([]);
    const setItem = (await import('@react-native-async-storage/async-storage')).default.setItem;
    (await import('@react-native-async-storage/async-storage')).default.setItem = async () => {
      throw new Error('SQLITE_FULL: database or disk is full');
    };
    try {
      await guardedStorage.setItem('morrow-v1', '{"state":{}}');
    } finally {
      (await import('@react-native-async-storage/async-storage')).default.setItem = setItem;
    }
    expect(heard).toEqual(['write']);
    expect(storageFailure()?.kind).toBe('write');
    // A failed write does not close the latch: the disk holds an older
    // sound state and memory a newer one, so the next write may try.
    expect(hasFailed()).toBe(false);
    await guardedStorage.setItem('morrow-v1', '{"state":{"a":1}}');
    expect(disk.get('morrow-v1')).toBe('{"state":{"a":1}}');
    // And the listener is told the failure cleared.
    expect(heard).toEqual(['write', 'cleared']);
    expect(storageFailure()).toBe(null);
    off();
  });

  it('gives the read latch an exit, at the person asking', async () => {
    const { clearLatchAndReplace, quarantinedRaw } = await import('./storage');
    disk.set('morrow-v1', A_REAL_BOOK.slice(0, 60));
    await guardedStorage.getItem('morrow-v1');
    expect(hasFailed()).toBe(true);
    // The unreadable bytes are kept under a dated key, readable.
    expect(await quarantinedRaw()).toBe(A_REAL_BOOK.slice(0, 60));
    await clearLatchAndReplace();
    expect(hasFailed()).toBe(false);
    expect(disk.has('morrow-v1')).toBe(false);
    await guardedStorage.setItem('morrow-v1', '{"state":{"fresh":true}}');
    expect(disk.get('morrow-v1')).toBe('{"state":{"fresh":true}}');
  });

  it('writes nothing before the store has been read once', async () => {
    const { openStorage, resetStorageLatch: reset } = await import('./storage');
    reset();
    // The test helper opens storage; close it again the way a launch starts.
    (await import('./storage')).closeStorageForTest();
    disk.set('morrow-v1', A_REAL_BOOK);
    await guardedStorage.setItem('morrow-v1', '{"state":{}}');
    expect(disk.get('morrow-v1')).toBe(A_REAL_BOOK);
    openStorage();
    await guardedStorage.setItem('morrow-v1', '{"state":{}}');
    expect(disk.get('morrow-v1')).toBe('{"state":{}}');
  });

  it('tells a listener that arrives late, once, and a read failure says read', async () => {
    const { onStorageFailure } = await import('./storage');
    readThrows = true;
    await guardedStorage.getItem('morrow-v1');
    const heard: string[] = [];
    onStorageFailure((f) => heard.push(f ? f.kind : 'cleared'));
    expect(heard).toEqual(['read']);
    // A second failure does not ring twice.
    await guardedStorage.getItem('morrow-v1');
    expect(heard).toEqual(['read']);
  });
});

describe('a store too big for one Android row', () => {
  it('is written as parts and read back whole', async () => {
    resetStorageLatch();
    disk.clear();
    const { openStorage } = await import('./storage');
    openStorage();
    const big = JSON.stringify({ state: { texts: [{ body: 'x'.repeat(1_200_000) }] } });
    await guardedStorage.setItem('morrow-v1', big);
    expect([...disk.keys()].filter((k) => k.startsWith('morrow-v1#')).length).toBe(3);
    expect(disk.get('morrow-v1')).toContain('__morrow_parts');
    expect(await guardedStorage.getItem('morrow-v1')).toBe(big);
    expect(await storedRaw()).toBe(big);
    // Shrunk back under the limit: inline again, the parts gone.
    await guardedStorage.setItem('morrow-v1', '{"state":{}}');
    expect(disk.get('morrow-v1')).toBe('{"state":{}}');
    expect([...disk.keys()].filter((k) => k.startsWith('morrow-v1#')).length).toBe(0);
    expect(hasFailed()).toBe(false);
  });

  /**
   * The sweep (2026-09-23). `multiSet` is not atomic anywhere — the shim is
   * `Promise.all(pairs.map(setItem))` — and the parts of the new generation
   * used to land on the keys of the old one. Reaped on the background flush,
   * or one row refused for space, and the manifest still named a set that was
   * now half new and half old. The join of that parses as nothing: the app
   * came up empty and latched, on the store the whole module exists for.
   */
  it('survives a parts write cut in half, with the previous copy still whole', async () => {
    resetStorageLatch();
    disk.clear();
    const { openStorage } = await import('./storage');
    openStorage();
    const first = JSON.stringify({ state: { texts: [{ body: 'a'.repeat(1_200_000) }] } });
    await guardedStorage.setItem('morrow-v1', first);
    const gen1 = [...disk.keys()].filter((k) => k.startsWith('morrow-v1#')).sort();
    expect(gen1.length).toBe(3);

    // The second write, cut off after its first part.
    const store = (await import('@react-native-async-storage/async-storage')).default;
    const real = store.multiSet;
    store.multiSet = (async (rows: readonly (readonly [string, string])[]) => {
      const row = rows[0];
      if (row) await store.setItem(row[0], row[1]);
      throw new Error('quota');
    }) as typeof store.multiSet;
    const second = JSON.stringify({ state: { texts: [{ body: 'b'.repeat(1_200_000) }] } });
    await Promise.resolve(guardedStorage.setItem('morrow-v1', second)).catch(() => undefined);
    store.multiSet = real;

    // The half-written generation is under its own keys; the manifest still
    // names the whole one, and the store reads back as it was.
    expect(await guardedStorage.getItem('morrow-v1')).toBe(first);
    expect(hasFailed()).toBe(false);
  });

  /**
   * The sweep (2026-09-23). A read that throws — a missing part, an Android
   * row too big for the cursor window — latched without keeping a copy, so
   * the banner offered "Copy out the earlier copy" with nothing behind it and
   * "Start again on this device", whose label promises the earlier copy
   * stays. It did not: two taps and the writing was gone.
   */
  it('keeps what it can when the read itself throws, and never starts again over the only copy', async () => {
    resetStorageLatch();
    disk.clear();
    const { openStorage, quarantinedRaw, clearLatchAndReplace } = await import('./storage');
    openStorage();
    const big = JSON.stringify({ state: { texts: [{ body: 'c'.repeat(1_200_000) }] } });
    await guardedStorage.setItem('morrow-v1', big);
    // One part lost under the app's feet.
    const parts = [...disk.keys()].filter((k) => k.startsWith('morrow-v1#')).sort();
    disk.delete(parts[1]!);

    expect(await guardedStorage.getItem('morrow-v1')).toBe(null);
    expect(hasFailed()).toBe(true);
    // Each readable part under its own quarantine key: a rejoined copy would
    // be one row of the same size, which is the thing that could not be read.
    const copies = () => [...disk.entries()].filter(([k]) => k.startsWith(QUARANTINE_PREFIX));
    expect(copies().length, 'the readable parts were kept').toBe(2);
    expect(copies().reduce((n, [, v]) => n + v.length, 0)).toBeGreaterThan(500_000);
    expect(await quarantinedRaw()).toBeTruthy();

    await clearLatchAndReplace();
    expect(copies().length, 'starting again leaves the copies behind').toBe(2);
    expect(hasFailed()).toBe(false);
  });
});
