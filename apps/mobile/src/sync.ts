/**
 * The account as a place the writing also lives (PRD §7.12).
 *
 * "A declined account keeps everything local … because a lost device with no
 * account loses the Book." So the sync is one-directional in spirit: the
 * device is the truth, the server is the copy, and the copy exists so a new
 * device can be handed the same shape back.
 *
 * Push writes every table in foreign-key order, upserting on the row's own id,
 * so running it twice is the same as running it once, and then removes from
 * the account what the device no longer has. Pull is only ever used on a
 * device with nothing of its own — merging two devices' writing is a
 * different and harder problem than this product has yet, and pretending
 * otherwise would risk the one thing the account exists to protect.
 *
 * The consequence, stated plainly: two phones each writing their own Book
 * against one account take turns being the copy. Neither loses anything on
 * the phone itself; the account holds whichever pushed last. That is the
 * model — the device is the truth — and the day a merge is built this is
 * the function it replaces.
 */
import { TABLE_ORDER, fromRows, toRows, type Row, type SyncBundle } from '@morrow/core';
import { DEFAULT_PROFILE } from '@morrow/core';
import { currentSession, supabase } from './supabase';

export type SyncOutcome =
  | { ok: true; rows: number }
  | { ok: false; error: string; rows: number };

const NOT_SIGNED_IN = 'Not signed in, so nothing was sent. Everything is still on this device.';

/** The device's zone, for the profile row. The only global this module reads. */
function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Everything on the device, up.
 *
 * Table by table rather than all at once, so a failure part-way says which
 * table stopped it — and because the tables have to land in order anyway.
 * Rows are chunked; a Book with a year of ledger entries is a few thousand
 * rows and one request of that size is one request that times out.
 */
export async function pushAll(bundle: SyncBundle): Promise<SyncOutcome> {
  const c = supabase();
  const session = await currentSession();
  if (!c || !session) return { ok: false, error: NOT_SIGNED_IN, rows: 0 };

  const uid = session.user.id;
  const tables = toRows(bundle, uid, timezone());
  let written = 0;
  for (const { table, rows } of tables) {
    for (const part of chunks(rows, 200)) {
      const { error } = await c.from(table).upsert(part, { onConflict: CONFLICT[table] ?? 'id' });
      if (error) {
        return { ok: false, error: `${table}: ${error.message}`, rows: written };
      }
      written += part.length;
    }
  }

  // Then what the device no longer has. A dropped goal, an undone move's
  // ledger row, a superseded log: an upsert leaves them on the account, and a
  // new device pulled them straight back — the dropped goal's moves on
  // Today, the very thing dropping it was for. Children first, so a parent
  // is never deleted from under a row that still points at it.
  for (const { table, rows } of [...tables].reverse()) {
    if (table === 'profiles') continue;
    const key = KEY[table] ?? 'id';
    const keep = new Set(rows.map((r) => String(r[key])));
    const have = await allOf(c, table, uid, key);
    if (!have.ok) return { ok: false, error: `${table}: ${have.error}`, rows: written };
    const gone = have.values.filter((v) => !keep.has(v));
    for (const part of chunks(gone, 100)) {
      const { error } = await c.from(table).delete().eq('user_id', uid).in(key, part);
      if (error) return { ok: false, error: `${table}: ${error.message}`, rows: written };
    }
  }
  return { ok: true, rows: written };
}

/** The column an upsert matches on, where it is not the id. */
const CONFLICT: Partial<Record<string, string>> = {
  day_summaries: 'user_id,day',
  practice_logs: 'practice_id,day',
  // A card let go and written about again is a new row with the same card:
  // matched on the card, or the account's old row refuses every push after.
  present_picks: 'user_id,half,card_id',
};

/** The column that names a row, where it is not the id. */
const KEY: Partial<Record<string, string>> = { day_summaries: 'day' };

const PAGE = 1000;

/**
 * Every value of one column for this person, paged.
 *
 * PostgREST answers at most a thousand rows a request and says nothing when
 * it stops; a ledger a few years long was silently cut there, and the next
 * push wrote the cut as the truth.
 */
async function allOf(
  c: NonNullable<ReturnType<typeof supabase>>,
  table: string,
  uid: string,
  key: string,
): Promise<{ ok: true; values: string[] } | { ok: false; error: string }> {
  const values: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await c
      .from(table)
      .select(key)
      .eq('user_id', uid)
      .order(key)
      .range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    for (const r of page) values.push(String(r[key]));
    if (page.length < PAGE) break;
  }
  return { ok: true, values };
}

/**
 * Everything on the account, down — for a device that has nothing.
 *
 * Refuses when the device already has writing. Two devices each with their
 * own Book is a merge, not a pull, and the honest thing is to say so rather
 * than let one silently win.
 */
export async function pullAll(localHasWriting: boolean): Promise<{ ok: true; bundle: SyncBundle } | { ok: false; error: string }> {
  const c = supabase();
  const session = await currentSession();
  if (!c || !session) return { ok: false, error: NOT_SIGNED_IN };
  if (localHasWriting) {
    return {
      ok: false,
      error: 'This device already has writing on it. The account can hold it, but it will not overwrite it.',
    };
  }

  const tables: Partial<Record<(typeof TABLE_ORDER)[number], Row[]>> = {};
  for (const table of TABLE_ORDER) {
    const rows: Row[] = [];
    const key = KEY[table] ?? 'id';
    // Paged, for the same reason `allOf` is: a thousand rows is the most one
    // request returns, and a Book's ledger outgrows that.
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await c
        .from(table)
        .select('*')
        .eq(table === 'profiles' ? 'id' : 'user_id', session.user.id)
        .order(key)
        .range(from, from + PAGE - 1);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
      const page = (data ?? []) as Row[];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    tables[table] = rows;
  }
  return { ok: true, bundle: fromRows(tables, DEFAULT_PROFILE) };
}

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
