/**
 * Consistency, Returns and the Ledger (PRD §7.7).
 *
 * There is no streak. A missed day costs what it costs and nothing resets to
 * zero. Copy never says "you broke"; it says "63, up from 59".
 */
import type { DaySummary } from '../types';

export const WINDOW_DAYS = 28;
export const DECAY = 0.93;

/** A day's value: two-minute versions count fully, "not today" counts half. */
export function dayValue(d: Pick<DaySummary, 'planned' | 'done' | 'partial' | 'skipped' | 'evidenceCount'>): number {
  const planned = Math.max(0, d.planned);
  if (planned === 0) {
    // No plan is not a failure. Evidence alone keeps the day alive.
    return d.evidenceCount > 0 ? 1 : 0;
  }
  const credited = d.done + d.partial + d.skipped * 0.5;
  return Math.max(0, Math.min(1, credited / planned));
}

function toDay(iso: string): number {
  return Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000);
}

/**
 * Exponentially weighted completion over the trailing 28 days.
 * Days with no record at all are absent from the sum, not zeroes: a person who
 * did not open the app is not punished twice.
 */
export function consistencyScore(days: DaySummary[], today: string): number {
  const t = toDay(today);
  let num = 0;
  let den = 0;
  for (const d of days) {
    const age = t - toDay(d.day);
    if (age < 0 || age >= WINDOW_DAYS) continue;
    const w = DECAY ** age;
    num += dayValue(d) * w;
    den += w;
  }
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

export interface ConsistencyReading {
  score: number;
  previous: number;
  delta: number;
  /** The user's own eight-week baseline band, for the chart. */
  baselineLow: number;
  baselineHigh: number;
  /**
   * How many days have any record at all. A score of zero means two entirely
   * different things — nobody has started, or somebody turned up and finished
   * nothing — and the caption used to tell the second person they had not
   * shown up.
   */
  logged: number;
  /** Days the person closed deliberately, whatever they got done. */
  sealed: number;
}

export function reading(days: DaySummary[], today: string): ConsistencyReading {
  const score = consistencyScore(days, today);
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const previous = consistencyScore(days, weekAgo.toISOString().slice(0, 10));
  const values: number[] = [];
  for (let i = 0; i < 56; i += 7) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    values.push(consistencyScore(days, d.toISOString().slice(0, 10)));
  }
  const real = values.filter((v) => v > 0);
  const low = real.length ? Math.min(...real) : 0;
  const high = real.length ? Math.max(...real) : 0;
  return {
    score,
    previous,
    delta: score - previous,
    baselineLow: low,
    baselineHigh: high,
    logged: days.length,
    sealed: days.filter((d) => Boolean(d.sealedAt)).length,
  };
}

export interface ReturnRecord {
  gapDays: number;
  returnedOn: string;
}

/** A Return is coming back after two or more missed days. Celebrated, never counted against. */
export function detectReturns(days: DaySummary[], today: string): ReturnRecord[] {
  const active = days
    .filter((d) => d.sealedAt || d.done > 0 || d.evidenceCount > 0)
    .map((d) => d.day)
    .sort();
  const out: ReturnRecord[] = [];
  for (let i = 1; i < active.length; i++) {
    const prev = active[i - 1];
    const cur = active[i];
    if (!prev || !cur) continue;
    const gap = toDay(cur) - toDay(prev) - 1;
    if (gap >= 2) out.push({ gapDays: gap, returnedOn: cur });
  }
  const last = active[active.length - 1];
  if (last) {
    const gapNow = toDay(today) - toDay(last) - 1;
    if (gapNow >= 2) {
      // Not a return yet: the user is away. The Returns letter fires on next open.
    }
  }
  return out;
}

export function isReturning(days: DaySummary[], today: string): { returning: boolean; gapDays: number } {
  const active = days
    .filter((d) => d.sealedAt || d.done > 0 || d.evidenceCount > 0)
    .map((d) => d.day)
    .sort();
  const last = active[active.length - 1];
  if (!last) return { returning: false, gapDays: 0 };
  const gap = toDay(today) - toDay(last) - 1;
  return { returning: gap >= 2, gapDays: Math.max(0, gap) };
}

/** The line under the number. Never mentions breaking anything. */
export function consistencyCaption(r: ConsistencyReading): string {
  if (r.score === 0) {
    // Turning up and finishing nothing is not the same as never turning up,
    // and a person who sealed the day deserves to have that noticed.
    if (r.sealed > 0) {
      return r.sealed === 1
        ? 'One day closed, nothing finished on it. Closing it still counted.'
        : `${r.sealed} days closed, nothing finished on them yet. Closing them still counted.`;
    }
    if (r.logged > 0) return 'Nothing finished yet. The first one is the whole thing.';
    return 'Nothing logged yet. The first day is the whole thing.';
  }
  // "Up from 0" is not a trend when there was nothing a week ago to be up from.
  if (r.delta > 0 && r.previous === 0) return `${r.score}. The first week in the ledger.`;
  if (r.delta > 0) return `${r.score}, up from ${r.previous}.`;
  if (r.delta < 0) return `${r.score}. Quieter week than usual, and that is information.`;
  return `${r.score}, holding.`;
}

/** The Almanac: one small stone per day of the year, polished by evidence. */
export interface AlmanacMark {
  day: string;
  evidence: number;
  sealed: boolean;
  quiet: boolean;
}

export function almanac(days: DaySummary[], year: number): AlmanacMark[] {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const out: AlmanacMark[] = [];
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  for (let d = start; d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const rec = byDay.get(key);
    out.push({
      day: key,
      evidence: rec?.evidenceCount ?? 0,
      sealed: Boolean(rec?.sealedAt),
      quiet: !rec || (rec.evidenceCount === 0 && rec.done === 0),
    });
  }
  return out;
}
