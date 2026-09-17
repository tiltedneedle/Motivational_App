/**
 * Where somebody is on the first-run path, and what comes next.
 *
 * The path to a Book is the Interview, the Fifteen, the stones, the
 * Portrait, the seal. A person who stops halfway — after the Interview one
 * night, after the Fifteen another — comes back to an app that used to open
 * on Welcome and offer to begin again, or on a Today with a goal row and no
 * Now card and no way to the stones. This is the one place that knows what
 * the next step is, so Welcome and Today can both point at it.
 */
import { ANALYSIS_ORDER, CORE_ANALYSES, type AnalysisKind, type BookVersion, type DepthTrack, type Goal, type GoalAnalysis } from '../types';
import { plural } from '../ids';

/** Which analyses a goal gets, on this track, at this rank (PRD §7.2). */
export function analysisPlan(rank: number, track: DepthTrack): AnalysisKind[] {
  if (track === 'full' || rank < 3) return ANALYSIS_ORDER;
  return CORE_ANALYSES;
}

export type FirstRunStep =
  | { step: 'interview'; route: '/consent' | '/interview'; label: string }
  | { step: 'fifteen'; route: '/authoring'; label: string }
  | { step: 'order'; route: '/rank'; label: string }
  | { step: 'stones'; route: string; label: string; goalId: string; kind: AnalysisKind; written: number; total: number }
  | { step: 'seal'; route: string; label: string; goalId: string }
  | { step: 'done'; route: '/today'; label: string };

export interface FirstRunInput {
  goals: Goal[];
  /** Whether the Fifteen (the ideal) has been written. */
  hasIdeal: boolean;
  /** Whether the Book has been given its order and its title (the rank screen). */
  hasTitle: boolean;
  /** Whether consent has been given (the screen before the Interview). */
  consented?: boolean;
  analyses: GoalAnalysis[];
  books: BookVersion[];
  track: DepthTrack;
}

/** The next step on the path, with the route that leads there. */
export function firstRunStep(input: FirstRunInput): FirstRunStep {
  if (input.books.length > 0) return { step: 'done', route: '/today', label: 'Today' };
  const goals = [...input.goals].filter((g) => g.status !== 'archived').sort((a, b) => a.rank - b.rank);
  if (goals.length === 0) return { step: 'interview', route: input.consented ? '/interview' : '/consent', label: 'Begin the Interview' };
  if (!input.hasIdeal) return { step: 'fifteen', route: '/authoring', label: 'Write the Fifteen' };
  // The order and the title come between the Fifteen and the stones; once a
  // stone is written the person has been past that screen, titled or not.
  if (!input.hasTitle && input.analyses.length === 0) return { step: 'order', route: '/rank', label: 'Put the goals in order' };

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
      label: written === 0 ? 'Write the stones' : `Carry on with the stones (${written} of ${total})`,
      goalId: first.goalId,
      kind: first.kind,
      written,
      total,
    };
  }
  const top = goals[0]!;
  return { step: 'seal', route: `/portrait?goal=${top.id}&next=/seal-book`, label: 'See the Portrait and seal the Book', goalId: top.id };
}

/** One sentence for the person, about where they are. */
export function firstRunCaption(s: FirstRunStep, goalCount: number): string {
  switch (s.step) {
    case 'interview':
      return 'Nothing here yet, and that is the right starting point.';
    case 'fifteen':
      return `${goalCount === 1 ? 'One goal is' : `${goalCount} goals are`} named. The Fifteen comes next: fifteen minutes of writing, then one line per question.`;
    case 'order':
      return 'The Fifteen is written. Next: put the goals in order and give the Book its name, then the stones.';
    case 'stones':
      return s.written === 0
        ? `The Fifteen is written. Now the stones: ${plural(s.total, 'short line')} across your goals, in your words.`
        : `${s.written} of ${s.total} stones are written. The rest are where you left them.`;
    case 'seal':
      return 'Every stone is written. The Portrait is ready, and the Book seals after it.';
    case 'done':
      return '';
  }
}
