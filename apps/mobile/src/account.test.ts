/**
 * Two devices on one account: the one code path that decides whose writing
 * survives, run against a scripted account rather than a live one.
 *
 * What is being tested is the decision, not the transport: what the store
 * does when the account holds another device's copy, when it holds this
 * device's own, when it holds nothing, and when the person answers.
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
  hasSupabase: true,
  deleteAccount: async () => ({ ok: true }),
  functionHeaders: async () => ({}),
  sessionState: async () => ({ session: { user: { id: 'user_1', email: 'a@b.c' } }, reachable: true }),
  signOut: async () => undefined,
}));

/** The scripted account: what it holds, who stamped it, and every push it took. */
const account = {
  bundle: null as null | Record<string, unknown>,
  stamp: { by: null as string | null, at: null as string | null, closedAt: null as string | null },
  pushes: [] as { force?: boolean; reconcile?: boolean }[],
};
vi.mock('./sync', () => ({
  CLOSED: 'closed',
  newDeviceId: () => `dev_${Math.random().toString(36).slice(2, 8)}`,
  restoreAccount: async () => ({ ok: true }),
  stampAccount: async (device: string) => {
    account.stamp = { ...account.stamp, by: device, at: new Date().toISOString() };
    return { ok: true, at: account.stamp.at };
  },
  pullAll: async () => ({ ok: true, bundle: account.bundle ?? empty(), stamp: account.stamp }),
  pushAll: async (_bundle: unknown, opts: { force?: boolean; reconcile?: boolean; device: string }) => {
    account.pushes.push({ force: opts.force, reconcile: opts.reconcile });
    account.stamp = { ...account.stamp, by: opts.device, at: new Date().toISOString() };
    return { ok: true, rows: 1 };
  },
}));

type Bundle = Record<string, unknown> & { goals: Record<string, unknown>[] };
function empty(): Bundle {
  return {
    profile: {},
    goals: [] as Record<string, unknown>[],
    texts: [],
    analyses: [],
    books: [],
    plans: [],
    evidence: [],
    days: {},
    practices: [],
    practiceLogs: [],
    scenes: [],
    portraits: [],
    letters: [],
    briefs: [],
    presentPicks: [],
    pastEpochs: [],
    pastEvents: [],
    pastListed: false,
    memoryEdits: [],
    memoryDocument: '',
  };
}
/** An account (or a device) that holds writing: two goals named in an Interview. */
function withWriting(): Bundle {
  return {
    ...empty(),
    goals: [
      { id: 'g_other_1', title: 'Run the loop', domain: 'health', horizon: 'Three months', rank: 0, status: 'active', createdAt: '2026-09-01T00:00:00.000Z', titleAuthored: true, targetDate: null },
      { id: 'g_other_2', title: 'Fix the gate', domain: 'home', horizon: 'No deadline', rank: 1, status: 'active', createdAt: '2026-09-01T00:00:00.000Z', titleAuthored: true, targetDate: null },
    ],
  };
}

/** The same writing, as the device holds it (its own profile kept). */
function onDevice(): Record<string, unknown> {
  const { profile: _profile, memoryDocument: _doc, ...rest } = withWriting();
  return rest;
}

const { useMorrow } = await import('./store');
const { openStorage } = await import('./storage');

async function settled(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

beforeEach(async () => {
  disk.clear();
  account.bundle = null;
  account.stamp = { by: null, at: null, closedAt: null };
  account.pushes = [];
  openStorage();
  useMorrow.getState().reset();
  useMorrow.setState({ hydrated: true, deviceId: 'dev_A', account: null, lastSync: {} });
  await settled();
});

describe('signing in', () => {
  it('pulls the account into an empty device and is then in step with it', async () => {
    account.bundle = withWriting();
    account.stamp = { by: 'dev_B', at: '2026-09-20T10:00:00.000Z', closedAt: null };
    await useMorrow.getState().setAccount();
    const out = await useMorrow.getState().afterSignIn();
    expect(out).toMatchObject({ ok: true, pulled: true });
    expect(useMorrow.getState().goals.map((g) => g.id)).toEqual(['g_other_1', 'g_other_2']);
    // Stamped as this device's, so the next push is not a conflict.
    expect(account.stamp.by).toBe('dev_A');
    expect(useMorrow.getState().lastSync.user_1).toBeTruthy();
    expect(useMorrow.getState().account?.needsChoice).toBeFalsy();
  });

  it('pushes a device with writing into an empty account', async () => {
    useMorrow.setState(onDevice() as never);
    await useMorrow.getState().setAccount();
    const out = await useMorrow.getState().afterSignIn();
    expect(out).toMatchObject({ ok: true, moved: 'pushed' });
    expect(account.pushes).toHaveLength(1);
    expect(account.pushes[0]?.force).toBeFalsy();
  });

  it('asks when both hold writing and the copy is another device’s, and moves nothing', async () => {
    useMorrow.setState(onDevice() as never);
    account.bundle = withWriting();
    account.stamp = { by: 'dev_B', at: '2026-09-20T10:00:00.000Z', closedAt: null };
    await useMorrow.getState().setAccount();
    const out = await useMorrow.getState().afterSignIn();
    expect(out).toMatchObject({ ok: false, conflict: true });
    expect(account.pushes).toHaveLength(0);
    expect(useMorrow.getState().account?.needsChoice).toBe(true);
    // A background push is refused while the choice is owed.
    const pushed = await useMorrow.getState().pushToAccount();
    expect(pushed).toMatchObject({ ok: false, conflict: true });
    expect(account.pushes).toHaveLength(0);
  });

  it('does not ask when the copy is this very device’s (signed out and back in)', async () => {
    useMorrow.setState(onDevice() as never);
    account.bundle = withWriting();
    account.stamp = { by: 'dev_A', at: '2026-09-20T10:00:00.000Z', closedAt: null };
    await useMorrow.getState().setAccount();
    const out = await useMorrow.getState().afterSignIn();
    expect(out).toMatchObject({ ok: true, moved: 'pushed' });
    expect(useMorrow.getState().account?.needsChoice).toBeFalsy();
  });

  it('asks after Delete everything even though the stamp names the old install', async () => {
    // The account was this phone's copy; the phone was wiped and written on again.
    account.bundle = withWriting();
    account.stamp = { by: 'dev_A', at: '2026-09-20T10:00:00.000Z', closedAt: null };
    useMorrow.getState().reset();
    expect(useMorrow.getState().deviceId).not.toBe('dev_A');
    useMorrow.setState({ ...(onDevice() as Record<string, never>), hydrated: true });
    await useMorrow.getState().setAccount();
    const out = await useMorrow.getState().afterSignIn();
    expect(out).toMatchObject({ ok: false, conflict: true });
    expect(account.pushes).toHaveLength(0);
  });

  it('stops at a closed account and reopens it only on the person’s word', async () => {
    account.bundle = withWriting();
    account.stamp = { by: 'dev_B', at: '2026-09-20T10:00:00.000Z', closedAt: '2026-09-21T10:00:00.000Z' };
    await useMorrow.getState().setAccount();
    const out = await useMorrow.getState().afterSignIn();
    expect(out).toMatchObject({ ok: false, closed: true });
    expect(useMorrow.getState().account?.closedAt).toBe('2026-09-21T10:00:00.000Z');
    expect(await useMorrow.getState().pushToAccount()).toMatchObject({ ok: false });
    account.stamp.closedAt = null;
    const reopened = await useMorrow.getState().reopenAccount();
    expect(reopened).toMatchObject({ ok: true, pulled: true });
    expect(useMorrow.getState().account?.closedAt).toBeFalsy();
  });
});

describe('the answer to a conflict', () => {
  beforeEach(async () => {
    useMorrow.setState(onDevice() as never);
    account.bundle = { ...withWriting(), goals: [{ ...(withWriting().goals[0] as Record<string, unknown>), id: 'g_account', title: 'The account’s goal' }] };
    account.stamp = { by: 'dev_B', at: '2026-09-20T10:00:00.000Z', closedAt: null };
    await useMorrow.getState().setAccount();
    await useMorrow.getState().afterSignIn();
  });

  it('“bring the account’s Book here” replaces the device and is then in step', async () => {
    const out = await useMorrow.getState().resolveSignIn('pull');
    expect(out).toMatchObject({ ok: true, pulled: true });
    expect(useMorrow.getState().goals.map((g) => g.id)).toEqual(['g_account']);
    expect(useMorrow.getState().account?.needsChoice).toBeFalsy();
    expect(account.stamp.by).toBe('dev_A');
  });

  it('“keep this phone’s writing” is the one forced push, and the choice clears only when it lands', async () => {
    const out = await useMorrow.getState().resolveSignIn('push');
    expect(out).toMatchObject({ ok: true, moved: 'pushed' });
    expect(account.pushes).toEqual([{ force: true, reconcile: true }]);
    expect(useMorrow.getState().account?.needsChoice).toBe(false);
    expect(useMorrow.getState().goals.map((g) => g.id)).toEqual(['g_other_1', 'g_other_2']);
  });
});
