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
import { currentSession, plain, supabase } from './supabase';

/**
 * What a device has already put on the account, row by row: a fingerprint
 * per row, keyed by the identity the upsert matches on. Held for the life of
 * a launch and nowhere else — a fingerprint that outlived a reinstall, or a
 * wipe of the account, would be a row silently never sent, and the first
 * push of a launch costing one full copy is a price worth paying for a fact
 * that cannot go stale.
 */
export type Sent = Record<string, string>;

export type SyncOutcome =
  | { ok: true; rows: number; sent?: Sent }
  /** `error` is for the person; `detail` is the service's own words, for a log; `conflict` means another device copied since. */
  | { ok: false; error: string; detail?: string; conflict?: true; closed?: true; rows: number };

const ANOTHER_DEVICE = 'Another phone or browser has copied to this account since this one last did. Bring that copy here first, or replace it with this one — under You.';

/** A fresh name for an install. The store keeps it (`deviceId`), so a phone is the same device across launches. */
export function newDeviceId(): string {
  return `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Whether the account holds any writing at all: a goal, a text, or an edition. */
async function accountHasWriting(c: NonNullable<Awaited<ReturnType<typeof supabase>>>, uid: string): Promise<boolean> {
  for (const table of ['goals', 'authoring_texts', 'book_versions'] as const) {
    const { count, error } = await c.from(table).select('id', { count: 'exact', head: true }).eq('user_id', uid);
    if (!error && (count ?? 0) > 0) return true;
  }
  return false;
}

/**
 * Mark this device as the one in step with the account — after it has
 * pulled the account's copy, so its next push is not read as another
 * device's overwrite. Only the stamp; nothing else on the row changes.
 */
/** The message every refused push into a closed account carries. */
export const CLOSED = 'This account was closed. Reopen it under You, or leave it to be deleted.';

/** Reopen a closed account, on the person's own tap: the service role clears the stamp. */
export async function restoreAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = await supabase();
  const session = await currentSession();
  if (!c || !session) return { ok: false, error: NOT_SIGNED_IN };
  try {
    const { error } = await c.functions.invoke('delete-account', { body: { action: 'restore' } });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

export async function stampAccount(device: string): Promise<{ ok: true; at: string } | { ok: false; error: string }> {
  const c = await supabase();
  const session = await currentSession();
  if (!c || !session) return { ok: false, error: NOT_SIGNED_IN };
  const at = new Date().toISOString();
  const { error } = await c.from('profiles').update({ pushed_by: device, pushed_at: at }).eq('id', session.user.id);
  if (error) return { ok: false, error: plain(error.message) };
  return { ok: true, at };
}

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
export async function pushAll(
  bundle: SyncBundle,
  opts: { device: string; reconcile?: boolean; deadlineMs?: number; lastPushAt?: string | null; force?: boolean; sent?: Sent },
): Promise<SyncOutcome> {
  const c = await supabase();
  const session = await currentSession();
  if (!c || !session) return { ok: false, error: NOT_SIGNED_IN, rows: 0 };

  const uid = session.user.id;
  // Another device's copy is a stop, not something to write over. The
  // profile row says who copied last and when; if that was not this device
  // and it was after this device's own last copy, the person is asked
  // (Settings, the account screen) rather than the other phone's evenings
  // quietly pruned. A device that has never copied up, against an account
  // that already holds writing, is the same stop whether or not the row is
  // stamped (a copy made before the stamp existed has none). `force` is
  // the person's answer.
  if (!opts.force) {
    const { data, error } = await c.from('profiles').select('pushed_by, pushed_at, deleted_at').eq('id', uid).maybeSingle();
    if (error && !/PGRST116|0 rows/i.test(error.message)) return { ok: false, error: plain(error.message), detail: error.message, rows: 0 };
    // A closed account takes nothing until the person reopens it.
    if (data?.deleted_at) return { ok: false, closed: true, error: CLOSED, rows: 0 };
    const stampedBy = data?.pushed_by ? String(data.pushed_by) : null;
    const stampedAt = data?.pushed_at ? Date.parse(String(data.pushed_at)) : NaN;
    const mine = opts.lastPushAt ? Date.parse(opts.lastPushAt) : 0;
    if (stampedBy && stampedBy !== opts.device && Number.isFinite(stampedAt) && stampedAt > mine) {
      return { ok: false, conflict: true, error: ANOTHER_DEVICE, rows: 0 };
    }
    if (!opts.lastPushAt && (!stampedBy || stampedBy !== opts.device)) {
      const held = await accountHasWriting(c, uid);
      if (held) return { ok: false, conflict: true, error: ANOTHER_DEVICE, rows: 0 };
    }
  }
  const tables = toRows(bundle, uid, timezone(), { id: opts.device, at: new Date().toISOString() });
  const startedAt = Date.now();
  const budget = opts.deadlineMs ?? 90_000;
  const overdue = () => Date.now() - startedAt > budget;
  let written = 0;
  /**
   * Only what has changed since the last copy that landed.
   *
   * Every backgrounding used to send every row of every table — a year of
   * ledger, a Book and all its editions, ten times a day, to say that one
   * move was done. The device still decides the whole shape (the prune below
   * reads every row, so nothing dropped is left behind); what goes over the
   * wire is the rows whose own contents differ from the ones this launch
   * already sent.
   *
   * The person's answer to a conflict (`force`) sends everything: their word
   * is that this device is the copy, and a delta against an account they have
   * just decided to replace would leave the other phone's rows standing.
   */
  const previously = opts.force ? undefined : opts.sent;
  const sent: Sent = {};
  for (const { table, rows } of tables) {
    const changed: Row[] = [];
    for (const row of rows) {
      const id = identity(table, row);
      const mark = fingerprint(row);
      sent[id] = mark;
      // The profile row carries this push's own stamp, so it always differs
      // and always goes — which is the point: the stamp is how another
      // device knows who copied last.
      if (!previously || previously[id] !== mark) changed.push(row);
    }
    for (const part of chunks(changed, 200)) {
      if (overdue()) return { ok: false, error: TOOK_TOO_LONG, rows: written };
      const { error } = await c.from(table).upsert(part, { onConflict: CONFLICT[table] ?? 'id' });
      if (error) {
        return { ok: false, error: plain(error.message), detail: `${table}: ${error.message}`, rows: written };
      }
      written += part.length;
    }
  }

  // Then what the device no longer has. A dropped goal, an undone move's
  // ledger row, a superseded log: an upsert leaves them on the account, and a
  // new device pulled them straight back — the dropped goal's moves on
  // Today, the very thing dropping it was for. Children first, so a parent
  // is never deleted from under a row that still points at it.
  //
  // Only from a device that has copied up before (`reconcile`). A new
  // phone's first push knows nothing about what the account holds, and this
  // pass used to delete the whole Book off the account when a replacement
  // phone signed in with one two-minute line on it.
  if (!opts.reconcile) return { ok: true, rows: written, sent };
  for (const { table, rows } of [...tables].reverse()) {
    if (table === 'profiles') continue;
    if (overdue()) return { ok: false, error: TOOK_TOO_LONG, rows: written };
    const key = KEY[table] ?? 'id';
    const keep = new Set(rows.map((r) => String(r[key])));
    const have = await allOf(c, table, uid, key);
    if (!have.ok) return { ok: false, error: plain(have.error), detail: `${table}: ${have.error}`, rows: written };
    const gone = have.values.filter((v) => !keep.has(v));
    for (const part of chunks(gone, 100)) {
      const { error } = await c.from(table).delete().eq('user_id', uid).in(key, part);
      if (error) return { ok: false, error: plain(error.message), detail: `${table}: ${error.message}`, rows: written };
    }
  }
  return { ok: true, rows: written, sent };
}

/**
 * The identity an upsert matches a row by, as one string — the row's id
 * ordinarily, and the conflict target where a table has one (a day summary
 * is one per day, a present pick one per card in a half). Keyed by anything
 * narrower, two different rows would share a fingerprint and the second
 * would never be sent.
 */
function identity(table: string, row: Row): string {
  const cols = (CONFLICT[table] ?? KEY[table] ?? 'id').split(',');
  return `${table}:${cols.map((c) => String(row[c.trim()] ?? '')).join('\u0001')}`;
}

/**
 * A row's contents in a dozen characters. Two passes with different mixes,
 * and the length beside them: enough that two rows of a person's writing do
 * not collide, and small enough that a Book's worth of them is a few tens of
 * kilobytes of memory rather than a second copy of the Book.
 */
function fingerprint(row: Row): string {
  const s = JSON.stringify(row);
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b + c, 2654435761) ^ (b >>> 13);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}${s.length.toString(36)}`;
}

const TOOK_TOO_LONG = 'That took too long. Check the connection and try again; nothing was lost.';

/** The column an upsert matches on, where it is not the id. */
const CONFLICT: Partial<Record<string, string>> = {
  day_summaries: 'user_id,day',
  practice_logs: 'practice_id,day',
  // A card let go and written about again is a new row with the same card:
  // matched on the card, or the account's old row refuses every push after.
  present_picks: 'user_id,half,card_id',
  // One row per person, keyed by the person (PRD §7.9's memory_profiles).
  memory_profiles: 'user_id',
};

/** The column that names a row, where it is not the id. */
const KEY: Partial<Record<string, string>> = { day_summaries: 'day', memory_profiles: 'user_id' };

const PAGE = 1000;

/**
 * Every value of one column for this person, paged.
 *
 * PostgREST answers at most a thousand rows a request and says nothing when
 * it stops; a ledger a few years long was silently cut there, and the next
 * push wrote the cut as the truth.
 */
async function allOf(
  c: NonNullable<Awaited<ReturnType<typeof supabase>>>,
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
export async function pullAll(
  localHasWriting: boolean,
): Promise<{ ok: true; bundle: SyncBundle; stamp: { by: string | null; at: string | null; closedAt: string | null } } | { ok: false; error: string; detail?: string }> {
  const c = await supabase();
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
      if (error) return { ok: false, error: plain(error.message), detail: `${table}: ${error.message}` };
      const page = (data ?? []) as Row[];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    tables[table] = rows;
  }
  const row = tables.profiles?.[0] as Record<string, unknown> | undefined;
  const stamp = {
    by: row?.pushed_by ? String(row.pushed_by) : null,
    at: row?.pushed_at ? String(row.pushed_at) : null,
    closedAt: row?.deleted_at ? String(row.deleted_at) : null,
  };
  return { ok: true, bundle: fromRows(tables, DEFAULT_PROFILE), stamp };
}

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
