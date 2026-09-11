/**
 * The account as a place the writing also lives (PRD §7.12).
 *
 * "A declined account keeps everything local … because a lost device with no
 * account loses the Book." So the sync is one-directional in spirit: the
 * device is the truth, the server is the copy, and the copy exists so a new
 * device can be handed the same shape back.
 *
 * Push writes every table in foreign-key order, upserting on the row's own id,
 * so running it twice is the same as running it once. Pull is only ever used
 * on a device with nothing of its own — merging two devices' writing is a
 * different and harder problem than this product has yet, and pretending
 * otherwise would risk the one thing the account exists to protect.
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

  let written = 0;
  for (const { table, rows } of toRows(bundle, session.user.id, timezone())) {
    for (const part of chunks(rows, 200)) {
      const conflict = table === 'day_summaries' ? 'user_id,day' : 'id';
      const { error } = await c.from(table).upsert(part, { onConflict: conflict });
      if (error) {
        return { ok: false, error: `${table}: ${error.message}`, rows: written };
      }
      written += part.length;
    }
  }
  return { ok: true, rows: written };
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
    const { data, error } = await c.from(table).select('*').eq(table === 'profiles' ? 'id' : 'user_id', session.user.id);
    if (error) return { ok: false, error: `${table}: ${error.message}` };
    tables[table] = (data ?? []) as Row[];
  }
  return { ok: true, bundle: fromRows(tables, DEFAULT_PROFILE) };
}

function* chunks<T>(items: T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}
