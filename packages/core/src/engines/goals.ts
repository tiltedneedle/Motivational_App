/**
 * Naming goals, and naming them twice.
 *
 * The Interview names goals by tapping, and What I heard names them again out
 * of the person's own writing. Someone who calls it the same thing both times
 * has one goal, not two, and this is the rule that decides that.
 *
 * It lives here rather than inside the mobile store so it can be tested: the
 * store needs React Native and AsyncStorage to import, which is why this
 * behaviour — a real bug, found by the end-to-end run and fixed once — had no
 * test holding it in place afterwards.
 */
import type { DomainId, Goal } from '../types';

export interface GoalDraft {
  title: string;
  domain: DomainId;
  domainLabel?: string;
  horizon: string;
  /** The span of their own writing this came from, when it came from there. */
  sourceSpan?: string;
  /** True when they typed it or lifted it from their writing, not tapped it. */
  authored?: boolean;
}

/** Enough of a Goal to merge. The store adds ids and timestamps. */
export interface MergedGoal {
  title: string;
  domain: DomainId;
  domainLabel?: string;
  horizon: string;
  sourceSpan?: string;
  titleAuthored: boolean;
  rank: number;
}

/** Two names are the same goal when they are the same words. */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function mergeGoalDrafts<T extends MergedGoal>(
  existing: readonly T[],
  drafts: readonly GoalDraft[],
): (T | MergedGoal)[] {
  const goals: (T | MergedGoal)[] = [...existing];

  for (const d of drafts) {
    const title = d.title.trim();
    // A goal with no name is not a goal.
    if (!title) continue;

    const i = goals.findIndex((g) => sameName(g.title, title));
    if (i >= 0) {
      const current = goals[i]!;
      goals[i] = {
        ...current,
        // The first spelling stays: it is the one they have already seen.
        ...(d.sourceSpan && !current.sourceSpan ? { sourceSpan: d.sourceSpan } : {}),
        // Authorship only ever goes up. Writing it yourself makes it yours and
        // tapping it again afterwards does not take that back.
        titleAuthored: current.titleAuthored || Boolean(d.sourceSpan) || d.authored === true,
        // A real horizon fills in a vague one, and never replaces a real one.
        ...(current.horizon === 'No deadline' && d.horizon !== 'No deadline' ? { horizon: d.horizon } : {}),
      };
      continue;
    }

    goals.push({
      title,
      domain: d.domain,
      ...(d.domainLabel ? { domainLabel: d.domainLabel } : {}),
      horizon: d.horizon,
      ...(d.sourceSpan ? { sourceSpan: d.sourceSpan } : {}),
      titleAuthored: Boolean(d.sourceSpan) || d.authored === true,
      rank: goals.length,
    });
  }

  return goals.map((g, rank) => ({ ...g, rank }));
}

/** The same rule, for a list of real Goals. */
export function dedupeGoals(goals: readonly Goal[]): Goal[] {
  const out: Goal[] = [];
  for (const g of goals) {
    if (out.some((k) => sameName(k.title, g.title))) continue;
    out.push(g);
  }
  return out.map((g, rank) => ({ ...g, rank }));
}
