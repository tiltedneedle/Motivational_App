/**
 * Where somebody is on the first-run path, and what comes next.
 *
 * The path to a Book (the rebuild, 2026-09-21): set up, a first line, the
 * Interview, the fifteen minutes, the five questions per goal, your line
 * and the finish. A person who stops halfway — after the Interview one
 * night, after the fifteen another — comes back to an app that used to
 * open on Welcome and offer to begin again. This is the one place that
 * knows what the next step is, so Welcome, Today and the path card all
 * point at it.
 */
import { ANALYSIS_ORDER, CORE_ANALYSES, type AnalysisKind, type BookVersion, type DepthTrack, type Goal, type GoalAnalysis } from '../types';
import { plural } from '../ids';

/** Which analyses a goal gets, on this track, at this rank (PRD §7.2). */
export function analysisPlan(rank: number, track: DepthTrack): AnalysisKind[] {
  if (track === 'full' || rank < 3) return ANALYSIS_ORDER;
  return CORE_ANALYSES;
}

export type FirstRunStep =
  | { step: 'setup'; route: '/setup'; label: string }
  | { step: 'warmup'; route: '/first-write'; label: string }
  | { step: 'interview'; route: '/interview'; label: string }
  | { step: 'fifteen'; route: '/authoring'; label: string }
  | { step: 'readback'; route: '/heard'; label: string }
  | { step: 'order'; route: '/rank'; label: string }
  | { step: 'stones'; route: string; label: string; goalId: string; kind: AnalysisKind; written: number; total: number }
  | { step: 'seal'; route: string; label: string; goalId: string }
  | { step: 'done'; route: '/today'; label: string };

export interface FirstRunInput {
  goals: Goal[];
  /** Whether the first line (the warm-up) has been written. */
  hasWarmup?: boolean;
  /** Whether the Fifteen (the ideal) has been written. */
  hasIdeal: boolean;
  /**
   * Whether the read-back of the Fifteen was begun and left: rows kept or
   * named and not yet made goals. Left out of the path, the kept phrases
   * and the names typed sat on disk and were never shown again.
   */
  readBackOpen?: boolean;
  /** Whether the Book has been given its order and its title (the rank screen). */
  hasTitle: boolean;
  /** Whether consent has been given (the end of set-up). */
  consented?: boolean;
  analyses: GoalAnalysis[];
  books: BookVersion[];
  track: DepthTrack;
}

/** The next step on the path, with the route that leads there. */
export function firstRunStep(input: FirstRunInput): FirstRunStep {
  if (input.books.length > 0) return { step: 'done', route: '/today', label: 'Today' };
  if (!input.consented) return { step: 'setup', route: '/setup', label: 'Get started' };
  const goals = [...input.goals].filter((g) => g.status !== 'archived').sort((a, b) => a.rank - b.rank);
  if (goals.length === 0) {
    if (!input.hasWarmup) return { step: 'warmup', route: '/first-write', label: 'Write your first line · 2 min' };
    return { step: 'interview', route: '/interview', label: 'Find your goals · 2 min' };
  }
  if (!input.hasIdeal) return { step: 'fifteen', route: '/authoring', label: 'Write your future · 15 min' };
  if (input.readBackOpen) return { step: 'readback', route: '/heard', label: 'Carry on with what I heard · 2 min' };
  // The order and the title come between the Fifteen and the stones; once a
  // stone is written the person has been past that screen, titled or not.
  if (!input.hasTitle && input.analyses.length === 0) return { step: 'order', route: '/rank', label: 'Put your goals in order' };

  let written = 0;
  let total = 0;
  let first: { goalId: string; kind: AnalysisKind } | null = null;
  for (const g of goals) {
    const plan = analysisPlan(g.rank, input.track);
    total += plan.length;
    for (const kind of plan) {
      const done = input.analyses.some((a) => a.goalId === g.id && a.kind === kind && a.line.trim().length > 0);
      if (done) written += 1;
      else if (!first) first = { goalId: g.id, kind };
    }
  }
  if (first) {
    return {
      step: 'stones',
      route: `/stone?goal=${first.goalId}&kind=${first.kind}`,
      label: written === 0 ? 'Plan each goal · five questions' : `Carry on planning (${written} of ${total})`,
      goalId: first.goalId,
      kind: first.kind,
      written,
      total,
    };
  }
  const top = goals[0]!;
  return { step: 'seal', route: `/portrait?goal=${top.id}&next=/seal-book`, label: 'Finish your Book', goalId: top.id };
}

/**
 * The five steps the path card shows, with where the person is.
 *
 * Set-up is not a step (it is over before the card exists), and the order,
 * the questions and the finish are one step each on the card even though
 * they are several screens: the card is a promise of how much is left, not
 * a map of the screens.
 */
export interface PathStepInfo {
  key: 'warmup' | 'interview' | 'fifteen' | 'plan' | 'finish';
  label: string;
  minutes: string;
  done: boolean;
}

export function firstRunPath(s: FirstRunStep): { steps: PathStepInfo[]; at: number } {
  const order: PathStepInfo['key'][] = ['warmup', 'interview', 'fifteen', 'plan', 'finish'];
  const current: PathStepInfo['key'] =
    s.step === 'setup' || s.step === 'warmup' ? 'warmup' : s.step === 'interview' ? 'interview' : s.step === 'fifteen' || s.step === 'readback' ? 'fifteen' : s.step === 'order' || s.step === 'stones' ? 'plan' : 'finish';
  const at = s.step === 'done' ? order.length : order.indexOf(current);
  const labels: Record<PathStepInfo['key'], { label: string; minutes: string }> = {
    warmup: { label: 'Write a first line', minutes: '2 min' },
    interview: { label: 'Find your goals', minutes: '2 min' },
    fifteen: { label: 'Write your future', minutes: '15 min' },
    plan: { label: 'Plan each goal', minutes: '10–20 min' },
    finish: { label: 'Finish your Book', minutes: '3 min' },
  };
  return {
    steps: order.map((key, i) => ({ key, ...labels[key], done: i < at })),
    at: Math.min(at, order.length - 1),
  };
}

/**
 * The path card's heading, by step. It said "Your Book is not finished yet."
 * at every step — true, and the first thing a person read a minute after
 * finishing their first evening.
 */
export function firstRunHeading(s: FirstRunStep): string {
  switch (s.step) {
    case 'setup':
      return 'Hello.';
    case 'warmup':
      return 'Start with one line.';
    case 'interview':
      return 'Your first line is kept.';
    case 'fifteen':
      return 'Your goals are named.';
    case 'readback':
      return 'Your future is written.';
    case 'order':
      return 'Your future is written.';
    case 'stones':
      return s.written === 0 ? 'Now plan each goal.' : 'Halfway to your Book.';
    case 'seal':
      return 'One step from your Book.';
    case 'done':
      return '';
  }
}

/** One sentence for the person, about where they are. */
export function firstRunCaption(s: FirstRunStep, goalCount: number): string {
  switch (s.step) {
    case 'setup':
      return 'Nothing here yet, and that is the right starting point.';
    case 'warmup':
      return 'Two minutes on one question. It becomes the first line you keep.';
    case 'interview':
      return 'Next, find your goals: about eight taps, no typing.';
    case 'fifteen':
      return `${goalCount === 1 ? 'One goal is' : `${goalCount} goals are`} named. Next: fifteen minutes on the life you want, three to five years out.`;
    case 'readback':
      return 'The phrases you kept from it are where you left them. Finish naming them, then the goals go in order.';
    case 'order':
      return 'Next: put the goals in order and name the Book, then five short questions per goal.';
    case 'stones':
      return s.written === 0
        ? `${plural(s.total, 'short question')} ${goalCount === 1 ? 'about your goal' : 'across your goals'}, one line each, in your words.`
        : `${s.written} of ${s.total} lines are written. The rest are where you left them.`;
    case 'seal':
      return 'Every line is written. One line about who you are becoming, then the Book is yours.';
    case 'done':
      return '';
  }
}
