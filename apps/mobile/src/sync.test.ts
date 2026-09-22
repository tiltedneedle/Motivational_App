/**
 * What actually goes over the wire on a push.
 *
 * The account is scripted — a fake PostgREST that records every upsert and
 * every delete — because the thing under test is not the transport but the
 * decision: on the second push of a launch, only the rows whose contents
 * changed should travel, and the prune that keeps the account honest must
 * still see every row the device holds, not only the ones just sent.
 */
import { describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

/** Every upsert the push made, table by table, and every id it deleted. */
const wire = { upserts: [] as { table: string; rows: Row[] }[], deleted: [] as { table: string; ids: string[] }[] };
/** What the account already holds, per table, as the ids the prune will read back. */
const held = new Map<string, string[]>();
/** The profile row the conflict check reads. */
let stamp: Row | null = null;

function reset(): void {
  wire.upserts = [];
  wire.deleted = [];
}

/** A chainable stand-in for the query builder, answering the three shapes `pushAll` asks for. */
function table(name: string) {
  const self = {
    upsert: async (rows: Row[]) => {
      wire.upserts.push({ table: name, rows });
      return { error: null };
    },
    select: (_cols: string, opts?: { head?: boolean }) => {
      const chain: Record<string, unknown> = {
        eq: () => chain,
        order: () => chain,
        range: (from: number) => Promise.resolve(from > 0 ? { data: [], error: null } : { data: (held.get(name) ?? []).map((id) => ({ [KEY[name] ?? 'id']: id })), error: null }),
        maybeSingle: async () => ({ data: stamp, error: null }),
        // Awaited directly: the "does the account hold any writing" count.
        then: (res: (v: { count: number; error: null }) => unknown) => res({ count: opts?.head ? (held.get(name) ?? []).length : 0, error: null }),
      };
      return chain;
    },
    delete: () => ({
      eq: () => ({
        in: async (_key: string, ids: string[]) => {
          wire.deleted.push({ table: name, ids });
          return { error: null };
        },
      }),
    }),
  };
  return self;
}
const KEY: Record<string, string> = { day_summaries: 'day', memory_profiles: 'user_id' };

vi.mock('./supabase', () => ({
  supabase: async () => ({ from: (t: string) => table(t) }),
  currentSession: async () => ({ user: { id: 'user_1' } }),
  plain: (m: string) => m,
}));

const { pushAll } = await import('./sync');

function bundle(goalTitle: string, goals = 2): Record<string, unknown> {
  return {
    profile: { name: 'Sam', track: 'full' },
    goals: Array.from({ length: goals }, (_, i) => ({
      id: `g_${i + 1}`,
      title: i === 0 ? goalTitle : 'Fix the gate',
      domain: i === 0 ? 'health' : 'home',
      horizon: 'Three months',
      rank: i,
      status: 'active',
      createdAt: '2026-09-01T00:00:00.000Z',
      titleAuthored: true,
      targetDate: null,
    })),
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

/** The tables that carried rows in the last push, by name. */
const carried = (): string[] => wire.upserts.filter((u) => u.rows.length > 0).map((u) => u.table);
const rowsFor = (t: string): Row[] => wire.upserts.filter((u) => u.table === t).flatMap((u) => u.rows);

describe('a push sends what changed', () => {
  it('sends everything the first time, and says what it sent', async () => {
    reset();
    const out = await pushAll(bundle('Run the loop') as never, { device: 'dev_a' });
    expect(out.ok).toBe(true);
    expect(carried()).toContain('goals');
    expect(rowsFor('goals')).toHaveLength(2);
    expect(out.ok && Object.keys(out.sent ?? {}).length).toBeGreaterThan(2);
  });

  it('sends only the row that changed on the next push', async () => {
    reset();
    const first = await pushAll(bundle('Run the loop') as never, { device: 'dev_a' });
    const sent = first.ok ? first.sent : undefined;
    reset();
    await pushAll(bundle('Run the loop before work') as never, { device: 'dev_a', sent });
    const goals = rowsFor('goals');
    expect(goals).toHaveLength(1);
    expect(goals[0]?.title).toBe('Run the loop before work');
    // The profile row carries this push's own stamp, so it always travels;
    // nothing else should.
    expect(carried().filter((t) => t !== 'profiles')).toEqual(['goals']);
  });

  it('sends nothing at all when nothing changed', async () => {
    reset();
    const first = await pushAll(bundle('Run the loop') as never, { device: 'dev_a' });
    const sent = first.ok ? first.sent : undefined;
    reset();
    await pushAll(bundle('Run the loop') as never, { device: 'dev_a', sent });
    expect(carried().filter((t) => t !== 'profiles')).toEqual([]);
  });

  it('sends everything again when the person says this device is the copy', async () => {
    reset();
    const first = await pushAll(bundle('Run the loop') as never, { device: 'dev_a' });
    const sent = first.ok ? first.sent : undefined;
    reset();
    await pushAll(bundle('Run the loop') as never, { device: 'dev_a', sent, force: true });
    expect(rowsFor('goals')).toHaveLength(2);
  });

  it('still prunes what the device no longer has, though it sent no goals', async () => {
    reset();
    const first = await pushAll(bundle('Run the loop') as never, { device: 'dev_a' });
    const sent = first.ok ? first.sent : undefined;
    // The account holds a third goal this device dropped.
    held.set('goals', ['g_1', 'g_2', 'g_gone']);
    stamp = { pushed_by: 'dev_a', pushed_at: '2026-09-01T00:00:00.000Z', deleted_at: null };
    reset();
    await pushAll(bundle('Run the loop') as never, { device: 'dev_a', sent, reconcile: true, lastPushAt: '2026-09-02T00:00:00.000Z' });
    expect(carried().filter((t) => t !== 'profiles')).toEqual([]);
    expect(wire.deleted.find((d) => d.table === 'goals')?.ids).toEqual(['g_gone']);
    held.clear();
    stamp = null;
  });
});
