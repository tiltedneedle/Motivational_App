/**
 * Practices (PRD §7.5): routines and habits.
 *
 * A habit is one repeated action. A routine is a sequence done together. They
 * are the same record with a different number of steps, because the difference
 * that matters to a person is not a category — it is whether there is a next
 * thing after this one.
 *
 * The authorship rule holds here as everywhere: a practice is built from the
 * person's own Strategies line, it keeps the id of that line, and the two-minute
 * version is cut from their words rather than composed. What the app supplies is
 * the shape — the schedule, the order, the clock — never the content.
 */
import type { GoalAnalysis, Practice } from '../types';
import { minVersionOf } from './blueprint';
import { splitFirstMoves } from './portrait';

export type PracticeKind = Practice['kind'];
export type Schedule = Practice['schedule'];
export type PracticeStep = Practice['steps'][number];
export type EnergySlot = Practice['energySlot'];

/**
 * A record of one attempt at a practice on one day.
 *
 * Not in `types.ts` because nothing persisted it before this engine existed;
 * it is the `practice_logs` table of PRD 7.5.
 */
export interface PracticeLog {
  id: string;
  practiceId: string;
  day: string;
  /** How many steps were done. A habit is 0 or 1. */
  stepsDone: number;
  stepsTotal: number;
  /** True when they did the two-minute version instead of the whole thing. */
  minimal: boolean;
  completedAt: string | null;
}

export const DURATION_CHIPS = [60, 120, 300, 600, 1500, 2700] as const;

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.round(seconds / 60);
  return m === 1 ? '1 min' : `${m} min`;
}

export function totalSeconds(p: Pick<Practice, 'steps'>): number {
  return p.steps.reduce((n, s) => n + Math.max(0, s.seconds ?? 0), 0);
}

export class PracticeInvalid extends Error {
  constructor(public readonly problems: string[]) {
    super(`Practice rejected: ${problems.join('; ')}`);
    this.name = 'PracticeInvalid';
  }
}

export interface BuildPracticeInput {
  goalId: string;
  title: string;
  kind: PracticeKind;
  /** One entry per step. A habit has exactly one. */
  steps: { text: string; seconds: number }[];
  schedule: Schedule;
  energySlot?: EnergySlot;
  minVersion?: string;
  /** The Strategies line this comes from. */
  source: Pick<GoalAnalysis, 'id' | 'line' | 'paragraph'>;
  newId: (prefix: string) => string;
}

/**
 * Build a practice, refusing anything that would put words in the person's
 * mouth or leave a step nobody can act on.
 */
export function buildPractice(input: BuildPracticeInput): Practice {
  const problems: string[] = [];
  const title = input.title.trim();
  if (!title) problems.push('a practice needs a name, and it has to be yours');
  if (!input.source?.id) problems.push('a practice needs the line it came from');

  const steps = input.steps
    .map((s) => ({ text: s.text.trim(), seconds: Math.max(0, Math.round(s.seconds)) }))
    .filter((s) => s.text.length > 0);

  if (steps.length === 0) problems.push('a practice needs at least one step');
  if (input.kind === 'habit' && steps.length > 1) problems.push('a habit is one step; more than one is a routine');
  if (steps.some((s) => s.seconds === 0)) problems.push('every step needs a length, even a short one');
  if (problems.length) throw new PracticeInvalid(problems);

  // The line, as the Blueprint does: the Full track's paragraph is prose
  // across four prompts, and a two-minute version cut from it named the
  // wrong verb.
  const sourceText = input.source.line.trim() || input.source.paragraph?.trim() || '';
  return {
    id: input.newId('prac'),
    goalId: input.goalId,
    kind: input.kind,
    title,
    steps,
    // Cut from their line when they have not written one themselves.
    minVersion: input.minVersion?.trim() || minVersionOf(sourceText),
    schedule: input.schedule,
    energySlot: input.energySlot ?? (totalSeconds({ steps }) > 900 ? 'morning' : 'evening'),
    sourceLineId: input.source.id,
    archivedAt: null,
  };
}

/**
 * A first draft of a routine, proposed from the Strategies line the person
 * already wrote, so the builder opens with their sentences in it rather than
 * an empty form. Every step here is a substring of their own writing; where
 * nothing can be cut, the list comes back empty and they write it.
 */
export function suggestSteps(source: Pick<GoalAnalysis, 'line' | 'paragraph'>): { text: string; seconds: number }[] {
  // The line, not the paragraph: the paragraph gave sixty-word steps.
  const text = source.line.trim() || source.paragraph?.trim() || '';
  return splitFirstMoves(text).map((t) => ({ text: t, seconds: 300 }));
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function scheduleLabel(c: Schedule): string {
  if (c.type === 'anchor') return `After ${c.anchorText ?? 'the last one'}`;
  if (c.type === 'interval') {
    const n = c.intervalDays ?? 1;
    return n === 1 ? 'Every day' : `Every ${n} days`;
  }
  const days = [...(c.days ?? [])].sort((a, b) => a - b);
  if (days.length === 0) return 'No days chosen yet';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map((d) => (WEEKDAY_NAMES[d] ?? '').slice(0, 3)).join(', ');
}

/** Whether a practice is asked for on a given day. */
export function dueOn(p: Practice, day: string, lastDoneDay?: string | null): boolean {
  if (p.archivedAt) return false;
  const c = p.schedule;
  if (c.type === 'days') {
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    return (c.days ?? []).includes(dow);
  }
  if (c.type === 'interval') {
    if (!lastDoneDay) return true;
    const a = Date.parse(`${lastDoneDay}T00:00:00Z`);
    const b = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(a) || Number.isNaN(b)) return true;
    return Math.round((b - a) / 86_400_000) >= (c.intervalDays ?? 1);
  }
  // An anchor has no calendar: it comes round whenever the thing it follows
  // does, so it is offered every day and simply not counted against anyone.
  return true;
}

export interface RunnerState {
  practiceId: string;
  stepIndex: number;
  /** Seconds left on the current step. */
  remaining: number;
  running: boolean;
  done: boolean;
  /** Set when they chose the two-minute version instead. */
  minimal: boolean;
}

export function startRun(p: Practice, minimal = false, from = 0): RunnerState {
  // Picked up where the day left it: three steps done this morning and a
  // stop for a call used to mean step one again tonight, and a second stop
  // wrote the tally back down to nothing.
  const at = Math.max(0, Math.min(from, p.steps.length));
  const done = p.steps.length === 0 || at >= p.steps.length;
  const step = p.steps[at];
  return {
    practiceId: p.id,
    stepIndex: done ? Math.max(0, p.steps.length - 1) : at,
    remaining: minimal ? 120 : (step?.seconds ?? 0),
    running: !done,
    done,
    minimal,
  };
}

/**
 * Advance the run by a tick.
 *
 * A step that runs out does NOT auto-advance. The person says when a step is
 * finished, because the clock is a guide and they are the one doing it — a
 * routine that marches on without them is a routine you end up fighting.
 */
export function tickRun(s: RunnerState, deltaMs: number): RunnerState {
  if (!s.running || s.done) return s;
  return { ...s, remaining: Math.max(0, s.remaining - deltaMs / 1000) };
}

export function nextStep(s: RunnerState, p: Practice): RunnerState {
  if (s.done) return s;
  const i = s.stepIndex + 1;
  if (s.minimal || i >= p.steps.length) return { ...s, running: false, done: true };
  return { ...s, stepIndex: i, remaining: p.steps[i]?.seconds ?? 0, running: true };
}

export function pauseRun(s: RunnerState): RunnerState {
  return { ...s, running: false };
}

export function resumeRun(s: RunnerState): RunnerState {
  return s.done ? s : { ...s, running: true };
}

export function runProgress(s: RunnerState, p: Practice): number {
  if (p.steps.length === 0) return 1;
  if (s.done) return 1;
  return Math.min(1, s.stepIndex / p.steps.length);
}

/** The log a finished (or abandoned) run leaves behind. */
export function logOf(
  s: RunnerState,
  p: Practice,
  day: string,
  newId: (prefix: string) => string,
  now = new Date(),
): PracticeLog {
  const stepsDone = s.done ? (s.minimal ? 1 : p.steps.length) : s.stepIndex;
  return {
    id: newId('plog'),
    practiceId: p.id,
    day,
    stepsDone,
    stepsTotal: s.minimal ? 1 : p.steps.length,
    minimal: s.minimal,
    completedAt: s.done ? now.toISOString() : null,
  };
}

/**
 * What a practice contributes to a day.
 *
 * The two-minute version counts fully. That is not generosity, it is the
 * mechanism: a person who keeps the smallest version on a bad day is the person
 * still doing this in March, and a score that punished them for it would be
 * teaching the opposite of what the product is for.
 */
export function practiceValue(log: PracticeLog | null | undefined): number {
  if (!log) return 0;
  if (log.minimal && log.stepsDone > 0) return 1;
  if (log.stepsTotal === 0) return 0;
  return Math.min(1, log.stepsDone / log.stepsTotal);
}
