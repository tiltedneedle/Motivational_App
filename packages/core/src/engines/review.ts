/**
 * The Horizon Review (PRD §7.9): on Sunday, after the reading.
 *
 * "Consistency trend, milestone distances, one insight, a proposed Replan
 * diff." Four facts, and the rule for the third is the rule for everything
 * the coach says: it is either a number the app computed or a sentence the
 * person wrote, quoted. The review never describes the week in its own
 * words — a summary of somebody's week written by software is the app
 * authoring their life, which is the one thing it does not do.
 */
import type { DaySummary, Goal, Plan } from '../types';
import { endSentence, formatDay, plural } from '../ids';
import { reading } from './consistency';
import { goalPath } from './path';
import { isQuotable } from './safety';

export interface ReviewInput {
  /** `YYYY-MM-DD`, the app's day. */
  today: string;
  days: readonly DaySummary[];
  goals: readonly Goal[];
  plans: readonly Plan[];
  /** How many changes a replan would propose, per goal. Computed by the store. */
  proposals: readonly { goalId: string; changes: number }[];
}

export interface HorizonReview {
  consistency: { score: number; previous: number; delta: number; line: string };
  /** The next milestone for each goal that has one, nearest first. */
  next: { goalId: string; goalTitle: string; title: string; daysAway: number }[];
  /** One fact: a line they wrote this week, quoted, or a count. */
  insight: { text: string; quotes: string[] } | null;
  /** Goals a replan would change, with how many rows. */
  replans: { goalId: string; goalTitle: string; changes: number }[];
}

function shiftDay(day: string, by: number): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return day;
  return new Date(t + by * 86_400_000).toISOString().slice(0, 10);
}

export function horizonReview(input: ReviewInput): HorizonReview {
  const days = [...input.days];
  const r = reading(days, input.today);
  // "Up from 0" is not a trend when there was nothing a week ago to be up
  // from; the first Sunday says so instead.
  const weekAgo = shiftDay(input.today, -7);
  const firstWeek = !days.some((d) => d.day <= weekAgo);
  const line =
    r.logged === 0
      ? 'No days in the ledger yet.'
      : firstWeek
        ? `Consistency ${r.score}. The first week in the ledger.`
        : r.delta > 0
        ? `Consistency ${r.score}, up from ${r.previous} last Sunday.`
        : r.delta < 0
          ? `Consistency ${r.score}, down from ${r.previous} last Sunday.`
          : `Consistency ${r.score}, the same as last Sunday.`;

  const next = input.goals
    .map((g) => {
      const plan = input.plans.find((p) => p.goalId === g.id && p.status === 'active');
      const path = goalPath(plan, input.today, g.targetDate);
      return path.next ? { goalId: g.id, goalTitle: g.title, title: path.next.node.title, daysAway: path.next.daysAway } : null;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null)
    .sort((a, b) => a.daysAway - b.daysAway);

  // The week: the seven days ending today.
  const since = shiftDay(input.today, -7);
  const week = days.filter((d) => d.day > since && d.day <= input.today);
  const proved = week
    .filter((d) => d.sealedAt && d.proof?.trim() && isQuotable(d))
    .sort((a, b) => (a.day < b.day ? 1 : -1))[0];
  let insight: HorizonReview['insight'] = null;
  if (proved?.proof) {
    const quote = proved.proof.trim();
    insight = {
      text: `On ${formatDay(proved.day, { weekday: true, today: input.today })} you wrote ${endSentence(`“${quote}”`)}`,
      quotes: [quote],
    };
  } else if (week.length > 0) {
    const asked = week.reduce((n, d) => n + d.planned, 0);
    const kept = week.reduce((n, d) => n + d.done, 0);
    insight = asked > 0 ? { text: `This week you kept ${kept} of ${plural(asked, 'move')} asked for.`, quotes: [] } : null;
  }

  const replans = input.proposals
    .filter((p) => p.changes > 0)
    .map((p) => ({ goalId: p.goalId, goalTitle: input.goals.find((g) => g.id === p.goalId)?.title ?? '', changes: p.changes }))
    .filter((p) => p.goalTitle.length > 0);

  return { consistency: { score: r.score, previous: r.previous, delta: r.delta, line }, next, insight, replans };
}
