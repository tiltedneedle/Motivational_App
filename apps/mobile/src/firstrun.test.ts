/**
 * The path through the first run, as the store computes it.
 *
 * Reported from the app on 2026-09-25, with two screenshots: Today offering
 * "Carry on with what I heard", a read-back with nothing on it, and its one
 * button leading back to Today, which offered it again. There was no way past
 * step three.
 *
 * `firstRunStep` itself is pure and tested in core. What was wrong is the
 * thing this file tests: how the store decides what to hand it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const disk = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => (disk.has(k) ? (disk.get(k) as string) : null),
    setItem: async (k: string, v: string) => {
      disk.set(k, v);
    },
    removeItem: async (k: string) => {
      disk.delete(k);
    },
    getAllKeys: async () => [...disk.keys()],
    multiGet: async (keys: string[]) => keys.map((k) => [k, disk.get(k) ?? null]),
    multiSet: async (rows: [string, string][]) => {
      for (const [k, v] of rows) disk.set(k, v);
    },
    multiRemove: async (keys: string[]) => {
      for (const k of keys) disk.delete(k);
    },
  },
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock('@morrow/ui', () => ({ isDark: () => false, setDark: () => undefined, subscribeDark: () => () => undefined }));
vi.mock('./notify', () => ({
  scheduler: async () => ({ ids: async () => [], allowed: async () => false, request: async () => false, real: false, schedule: async () => undefined, cancel: async () => undefined }),
  syncNotices: async () => ({ scheduled: 0, cancelled: 0, silent: true }),
}));
vi.mock('./billing', () => ({ billing: { offerings: async () => ({}), buy: async () => ({ ok: false, error: 'no' }), restore: async () => ({ ok: false, error: 'no' }) } }));
vi.mock('./analytics', () => ({ track: () => undefined, analyticsConsent: () => undefined }));
vi.mock('./supabase', () => ({
  FUNCTIONS_URL: '',
  hasSupabase: false,
  deleteAccount: async () => ({ ok: true }),
  functionHeaders: async () => ({}),
  sessionState: async () => ({ session: null, reachable: false }),
  signOut: async () => undefined,
}));

const { useMorrow, firstRunOf } = await import('./store');

/** A person mid-first-run: consented, one goal named, a first line, a Fifteen written. */
function midFirstRun(ideal: string): string {
  useMorrow.setState(useMorrow.getInitialState?.() ?? {});
  const s = useMorrow.getState();
  s.setProfile({ consentedAt: '2026-09-25T08:00:00.000Z' });
  s.saveText('warmup', 'Anything can be done', 'type', 120);
  s.addGoals([{ authored: true, title: 'Run the loop', domain: 'health', horizon: 'Three months' }]);
  const written = useMorrow.getState().saveText('ideal', ideal, 'type', 900);
  expect(written, 'the Fifteen was stored').toBeTruthy();
  return written!.id;
}

describe('the path past the read-back', () => {
  beforeEach(() => {
    disk.clear();
  });

  it('asks for the read-back once the Fifteen is written', () => {
    midFirstRun('It is a Tuesday and the kitchen is quiet. I want to run the loop before work.');
    expect(firstRunOf(useMorrow.getState()).step).toBe('readback');
  });

  /**
   * The loop. A read-back that produced nothing to keep leaves exactly the
   * store that means "never reached" — no goal carrying a span of the
   * Fifteen, no stones, no title — so Today asked for it again, and its one
   * button came back to Today.
   */
  it('does not ask again once it has been answered, even with nothing kept', () => {
    const id = midFirstRun('Anything can be done.');
    expect(firstRunOf(useMorrow.getState()).step).toBe('readback');
    useMorrow.getState().markReadBackDone(id);
    const next = firstRunOf(useMorrow.getState());
    expect(next.step, 'the path moves on').not.toBe('readback');
    expect(next.route).not.toBe('/heard');
  });

  it('asks again for a Fifteen written after it', () => {
    const first = midFirstRun('Anything can be done.');
    useMorrow.getState().markReadBackDone(first);
    expect(firstRunOf(useMorrow.getState()).step).not.toBe('readback');
    // A second sitting is a second read-back: it is that Fifteen's phrases
    // the person has not been shown.
    const again = useMorrow.getState().saveText('ideal', 'I want to be out the back door before the kettle boils.', 'type', 900);
    expect(again).toBeTruthy();
    expect(firstRunOf(useMorrow.getState()).step).toBe('readback');
  });

  it('still asks while a read-back is part-way through', () => {
    const id = midFirstRun('I want to run the loop before work on Tuesdays.');
    useMorrow.getState().markReadBackDone(id);
    expect(firstRunOf(useMorrow.getState()).step).not.toBe('readback');
    // Rows kept and not yet named is an unfinished sitting, whatever else is true.
    useMorrow.getState().saveReadBackDraft(
      [{ span: { text: 'run the loop before work', start: 7, end: 31, domain: 'health' }, state: 'kept', name: '' }],
      'I want to run the loop before work on Tuesdays.',
    );
    expect(firstRunOf(useMorrow.getState()).step).toBe('readback');
  });
});
