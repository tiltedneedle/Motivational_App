/**
 * The Goal Path (PRD §7.7).
 *
 * "A single route from now to the target date with milestone nodes, the user's
 * dot at the current fraction, 'You are here', distance to next, and the last
 * five evidence entries."
 *
 * The fraction is time, not progress, and that is a deliberate choice. A dot
 * that moves with completions would put somebody who has done nothing at the
 * start of a route whose deadline is a fortnight away, which is the one fact
 * about their situation they most need to see. Time is where they are; the
 * nodes say what is actually behind them. The picture is honest because the
 * two can disagree.
 */
import type { Evidence, Milestone, Plan } from '../types';

export interface PathNode {
  id: string;
  title: string;
  /** `YYYY-MM-DD`. */
  targetDate: string;
  /** Where along the route it sits, 0–1. */
  at: number;
  reached: boolean;
  /** Their own Monitoring line: what counts as proof for this one. */
  proof: string;
}

export interface GoalPath {
  /** `YYYY-MM-DD` for both ends. */
  from: string;
  to: string;
  /** Where the calendar is along the route, 0–1. */
  at: number;
  nodes: PathNode[];
  /** The next node not yet reached, and how far off it is. */
  next: { node: PathNode; daysAway: number } | null;
  /** Whole days from today to the target date. Negative once it is past. */
  daysLeft: number;
  /** True when there is no route to draw: no milestones, or no dates. */
  empty: boolean;
}

export const PATH_EVIDENCE = 5;

function day(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function between(from: string, to: string): number {
  const a = day(from);
  const b = day(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * The route for one goal.
 *
 * `from` is the day the plan was made rather than today, because a route whose
 * start moves with the clock is not a route: the dot would never advance, and
 * somebody two months in would see themselves at the beginning.
 */
export function goalPath(plan: Plan | undefined, today: string, targetDate?: string | null): GoalPath {
  const from = plan?.createdAt?.slice(0, 10) ?? today;
  const milestones = [...(plan?.milestones ?? [])]
    .filter((m) => /^\d{4}-\d{2}-\d{2}$/.test(m.targetDate))
    .sort((a, b) => (a.targetDate < b.targetDate ? -1 : 1));

  const last = milestones[milestones.length - 1]?.targetDate;
  const to = targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : (last ?? '');

  if (!to || milestones.length === 0) {
    return { from, to: to || from, at: 0, nodes: [], next: null, daysLeft: to ? between(today, to) : 0, empty: true };
  }

  const span = Math.max(1, between(from, to));
  const place = (m: Milestone): number => clamp01(between(from, m.targetDate) / span);

  const nodes: PathNode[] = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    targetDate: m.targetDate,
    at: place(m),
    reached: Boolean(m.reachedAt),
    proof: m.proof,
  }));

  const at = clamp01(between(from, today) / span);
  const upcoming = nodes.find((n) => !n.reached) ?? null;

  return {
    from,
    to,
    at,
    nodes,
    next: upcoming ? { node: upcoming, daysAway: between(today, upcoming.targetDate) } : null,
    daysLeft: between(today, to),
    empty: false,
  };
}

/**
 * The last few things they actually did on this goal.
 *
 * Newest first, and only this goal's — the Path is the one place in the app
 * where "here is where you are" has to be backed by "and here is what you did",
 * or it is a progress bar with a nicer name.
 */
export function pathEvidence(evidence: readonly Evidence[], goalId: string, limit = PATH_EVIDENCE): Evidence[] {
  return [...evidence]
    .filter((e) => e.goalId === goalId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

/**
 * How far off the next milestone is, in words.
 *
 * "Today", "Tomorrow" and "3 days" rather than a date, because the question the
 * Path answers is how far, not when. A day already past says so plainly rather
 * than counting up in negative numbers: a missed milestone is a fact, not an
 * error state, and the copy never treats it as one.
 */
export function distanceLabel(daysAway: number): string {
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  if (daysAway > 1) return `${daysAway} days`;
  if (daysAway === -1) return 'Yesterday';
  return `${Math.abs(daysAway)} days ago`;
}
