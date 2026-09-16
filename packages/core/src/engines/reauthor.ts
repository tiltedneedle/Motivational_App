/**
 * Day-90 re-authoring (PRD §7.3).
 *
 * "Two Books side by side. Per stone: Keep, Rewrite (the same screens with
 * the old line above the new) or Let it go (the goal is archived with a line
 * about what it taught, written now). The new edition is sealed with the
 * hold; the diff is its first page. The calendar is Morrow's: the dawn brief
 * opens it on day 90 and every 90 after."
 *
 * The calendar lives here. The screen only asks whether it is time.
 */
import { sealedOn } from '../ids';
import type { AnalysisKind, BookChapterLine, BookVersion, Goal, GoalAnalysis } from '../types';

export const REAUTHOR_EVERY = 90;

/**
 * How many mornings the brief keeps offering it. Day 90 is a day like any
 * other; somebody who did not open the app that morning has not missed a
 * quarter. A week, and then it waits for the next ninety.
 */
export const REAUTHOR_WINDOW = 7;

export interface ReauthorDue {
  /** 1 on day 90, 2 on day 180, and so on. */
  cycle: number;
  /** Whole days since the latest edition was sealed. */
  daysSince: number;
  /** The day this cycle's brief first opened it. */
  dueOn: string;
  /** What the next seal will be numbered. */
  edition: number;
}

/** Whole days from one day column to another, either way round. */
function daysBetween(from: string, to: string): number {
  const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** A day column moved forward by `n` days. */
export function plusDays(day: string, n: number): string {
  const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)) + n));
  return d.toISOString().slice(0, 10);
}

/**
 * Whether today is one of the mornings the brief opens the re-authoring, and
 * which one. Null with no Book, before day 90, and on every morning outside
 * the window — the card on Today is then simply not there.
 *
 * Counted from the latest edition: sealing the second edition on day 90
 * starts the next ninety from there, so nobody is asked to write it again
 * the week after they did.
 */
export function reauthorDue(books: readonly BookVersion[], today: string, boundaryHour = 3): ReauthorDue | null {
  const latest = books[books.length - 1];
  if (!latest) return null;
  const sealed = sealedOn(latest.sealedAt, boundaryHour);
  const daysSince = daysBetween(sealed, today);
  if (daysSince < REAUTHOR_EVERY) return null;
  const cycle = Math.floor(daysSince / REAUTHOR_EVERY);
  if (daysSince - cycle * REAUTHOR_EVERY >= REAUTHOR_WINDOW) return null;
  return { cycle, daysSince, dueOn: plusDays(sealed, cycle * REAUTHOR_EVERY), edition: latest.version + 1 };
}

const IN_WORDS: Record<number, string> = {
  90: 'ninety',
  180: 'one hundred and eighty',
  270: 'two hundred and seventy',
  360: 'three hundred and sixty',
};

/** "Day ninety", "Day one hundred and eighty"; digits once the words run out. */
export function reauthorLabel(cycle: number): string {
  const n = Math.max(1, Math.trunc(cycle)) * REAUTHOR_EVERY;
  return `Day ${IN_WORDS[n] ?? String(n)}`;
}

export interface SideBySideLine {
  kind: AnalysisKind;
  /** The line as it stands in the sealed edition. */
  before: BookChapterLine;
  /** The line as it is on the stone now; null if the stone has been emptied. */
  now: string | null;
  /** Whether the stone has been written again since the seal. */
  rewritten: boolean;
}

export interface SideBySideChapter {
  goalId: string;
  name: string;
  nameAuthored: boolean;
  lines: SideBySideLine[];
  /** Set once the person has let the goal go, with the line they wrote about it. */
  letGo: { lesson: string } | null;
}

/**
 * The two Books side by side: every chapter of the sealed edition against
 * the stones as they are now. A stone reads as rewritten when its text no
 * longer matches the sealed line — the same comparison the diff makes at
 * the seal, so what this screen shows as changed is what the first page of
 * the new edition will say changed.
 *
 * A goal dropped outright since the seal is not here: there is nothing of
 * it to keep or rewrite, and the diff will list it under "let go" anyway.
 */
export function sideBySide(previous: BookVersion, goals: readonly Goal[], analyses: readonly GoalAnalysis[]): SideBySideChapter[] {
  const out: SideBySideChapter[] = [];
  for (const chapter of previous.chapters) {
    const goal = goals.find((g) => g.id === chapter.goalId);
    if (!goal) continue;
    const lines = chapter.lines.map((before) => {
      const a = analyses.find((x) => x.goalId === goal.id && x.kind === before.kind);
      const text = a ? a.line.trim() || a.paragraph?.trim() || '' : '';
      const now = text || null;
      return { kind: before.kind, before, now, rewritten: now !== null && now !== before.text };
    });
    out.push({
      goalId: goal.id,
      name: goal.title,
      nameAuthored: goal.titleAuthored !== false,
      lines,
      letGo: goal.status === 'archived' ? { lesson: goal.lesson ?? '' } : null,
    });
  }
  return out;
}
