/**
 * The Book (PRD §7.3): the user's writing, typeset and sealed.
 *
 * The authorship ratio is computed here, server-side in the real product, and
 * must be ≥ 0.95. Only two kinds of characters exist in a Book: the user's
 * (their writing) and the app's (framing labels and headings we show small and
 * grey). If model prose ever enters, this number falls and the seal is refused.
 */
import type {
  AnalysisKind,
  BookChapter,
  BookVersion,
  DepthTrack,
  Goal,
  GoalAnalysis,
} from '../types';
import { ANALYSIS_ORDER } from '../types';
import { framingLabel } from './framings';
import { isQuotable } from './safety';
import { formatDay, plural, sealedOn, thenHalf } from '../ids';
import { firstSentence, restOfIdeal } from './portrait';

export const MIN_AUTHORSHIP_RATIO = 0.95;

export class SealRefused extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'SealRefused';
  }
}

export interface BookInput {
  version: number;
  title: string;
  /**
   * False when the spine title came from a framing chip or any other fixed
   * string rather than from the person typing it. Like a goal name from the
   * bank, it then counts as neither the user's prose nor rival prose.
   */
  titleAuthored?: boolean;
  /** The fixed framing the title is set against, if a chip was chosen. */
  titleFraming?: string | null;
  track: DepthTrack;
  ideal: string;
  shadow: string | null;
  iWill: string;
  goals: Goal[];
  analyses: GoalAnalysis[];
  memories?: Record<string, string[]>;
  /** The Present volume's picks, with the card sentences resolved by the caller. */
  present?: NonNullable<BookVersion['volumes']>['present'];
  /** The Past volume's analysed events, only the ones the person put in. */
  past?: NonNullable<BookVersion['volumes']>['past'];
  sealedAt?: string;
  diff?: BookVersion['diff'];
}

export function buildChapters(input: BookInput): BookChapter[] {
  const byGoal = new Map<string, GoalAnalysis[]>();
  for (const a of input.analyses) {
    const list = byGoal.get(a.goalId) ?? [];
    list.push(a);
    byGoal.set(a.goalId, list);
  }
  return [...input.goals]
    .sort((a, b) => a.rank - b.rank)
    .map((goal) => {
      const list = byGoal.get(goal.id) ?? [];
      const lines = ANALYSIS_ORDER.flatMap((kind: AnalysisKind) => {
        const a = list.find((x) => x.kind === kind && (x.line.trim() || x.paragraph?.trim()));
        if (!a) return [];
        // Enforced where the quoting happens, not at each writer. A line the
        // safety screen flagged is the person's to keep and never the app's to
        // print back at them in a serif face months later.
        if (!isQuotable(a)) return [];
        return [
          {
            kind,
            framingLabel: framingLabel(kind, goal.domain, a.framingId),
            // The line answers the question; on the Full track the paragraph
            // is the thinking behind it, printed under it. It used to replace
            // the line, which lost the one sentence the coach quotes and the
            // Blueprint is cut from under its own reasoning.
            text: a.line.trim() || a.paragraph?.trim() || '',
            ...(a.line2?.trim() ? { text2: a.line2.trim() } : {}),
            ...(a.line.trim() && a.paragraph?.trim() ? { paragraph: a.paragraph.trim() } : {}),
            // Carried through, not dropped. If any future path ever writes
            // prose about this person that they did not write, it arrives here
            // and the ratio below falls. A tripwire nothing is wired to is not
            // a tripwire.
            ...(a.generated?.trim() ? { generated: a.generated.trim() } : {}),
          },
        ];
      });
      return {
        goalId: goal.id,
        name: goal.title,
        ...(goal.titleAuthored === false ? { nameAuthored: false } : {}),
        horizon: goal.horizon,
        lines,
        memories: input.memories?.[goal.id] ?? [],
      };
    });
}

/**
 * user prose ÷ (user prose + generated prose).
 *
 * What counts as the user's: the Fifteen, the shadow, every analysis line, the
 * "I will", the goal names, any Quarry memories.
 *
 * What counts against: `line.generated` — any prose about this person's life
 * that they did not write. That slot is the tripwire for the day someone adds
 * a "let me polish that for you" feature: the seal starts refusing (PRD §11.1).
 *
 * What counts as neither: framing labels, and goal names taken from the fixed
 * Interview bank rather than written by the person. Both come from a fixed
 * bank, both are the same for everyone, and both are a few words long. They
 * earn no credit, and weighing them against a paragraph would refuse honest
 * Books over a title.
 *
 * Framing labels are deliberately NOT counted. They come from a fixed bank,
 * they are the same for everyone, and they are printed small and grey like a
 * heading. Counting chrome as rival authorship made short Books fail the floor
 * for no reason a reader would recognise.
 */
export function authorshipRatio(input: BookInput, chapters: BookChapter[]): number {
  let user = 0;
  let generated = 0;
  user += input.ideal.length + (input.shadow?.length ?? 0) + input.iWill.length;
  // The spine title counts only when the person typed it. A title filled in
  // from a framing chip is a label like any other from the bank: no credit,
  // no penalty.
  if (input.titleAuthored !== false) user += input.title.length;
  // The Present volume: the two lines under each pick. The card's sentence
  // and the framing are the app's words, printed as headings — no credit, no
  // penalty, exactly as a framing label in a chapter.
  for (const e of input.present?.entries ?? []) user += e.story.length + e.apply.length;
  // The Past volume: the title they gave it and the three boxes under it. The
  // period's label is ours.
  for (const e of input.past?.entries ?? []) {
    user += e.title.length + e.whatHappened.length + e.shapedMe.length + e.stillBelieve.length;
  }
  for (const ch of chapters) {
    // A goal named by tapping through the fixed bank is not the person's
    // writing, so it earns them no credit here. Nor is it counted against
    // them: it is a label, a few words long, and weighing it against a
    // paragraph would refuse honest Books for the sake of a title. It simply
    // does not count, exactly like a framing label.
    if (ch.nameAuthored !== false) user += ch.name.length;
    for (const line of ch.lines) {
      user += line.text.length + (line.text2?.length ?? 0) + (line.paragraph?.length ?? 0);
      generated += line.generated?.length ?? 0;
    }
    for (const m of ch.memories) user += m.length;
  }
  const total = user + generated;
  if (total === 0) return 1;
  return Number((user / total).toFixed(4));
}

export function buildBookVersion(input: BookInput, newId: (p: string) => string): BookVersion {
  const ideal = input.ideal?.trim() ?? '';
  const iWill = input.iWill?.trim() ?? '';
  if (!iWill) throw new SealRefused('The "I will…" line is required. It can be three words.');
  if (input.goals.length === 0) throw new SealRefused('A Book needs at least one goal.');

  const chapters = buildChapters(input);
  if (chapters.every((c) => c.lines.length === 0)) {
    throw new SealRefused('No goal has been written about yet.');
  }
  const ratio = authorshipRatio(input, chapters);
  if (ratio < MIN_AUTHORSHIP_RATIO) {
    throw new SealRefused(
      `Authorship ratio ${ratio} is below ${MIN_AUTHORSHIP_RATIO}: something in this Book was not written by you.`,
    );
  }

  return {
    id: newId('book'),
    version: input.version,
    title: input.title.trim() || 'Untitled',
    titleAuthored: input.titleAuthored !== false,
    titleFraming: input.titleFraming?.trim() || null,
    track: input.track,
    sealedAt: input.sealedAt ?? new Date().toISOString(),
    firstSentence: firstSentence(ideal),
    ideal,
    shadow: input.shadow?.trim() || null,
    chapters,
    // Only when there is something in them: a Book from somebody who did the
    // Future volume alone carries no empty sections.
    ...(input.present?.entries.length || input.past?.entries.length
      ? {
          volumes: {
            ...(input.present?.entries.length ? { present: input.present } : {}),
            ...(input.past?.entries.length ? { past: input.past } : {}),
          },
        }
      : {}),
    iWill,
    authorshipRatio: ratio,
    diff: input.diff ?? null,
  };
}

/** Page count for the reader, so "page 1 of 9" is honest. */
export function pageCount(book: BookVersion): number {
  return bookPages(book).length;
}

/**
 * One page of the Book, for the Sunday reading (PRD 7.3).
 *
 * "A reading view with no controls but a page turn." So the Book has to be a
 * list of pages rather than one long scroll, and this is the list — the same
 * order the printed Book is in, because a reading view that reorders somebody's
 * own document is a different document.
 */
export type BookPage =
  | { kind: 'opening'; firstSentence: string; rest: string }
  | { kind: 'shadow'; text: string }
  | { kind: 'contents'; chapters: BookVersion['chapters'] }
  | { kind: 'chapter'; chapter: BookVersion['chapters'][number] }
  /** The Present volume, if it was written: both halves on one page. */
  | { kind: 'present'; entries: NonNullable<NonNullable<BookVersion['volumes']>['present']>['entries'] }
  /** The Past volume: only the events the person chose to put in. */
  | { kind: 'past'; entries: NonNullable<NonNullable<BookVersion['volumes']>['past']>['entries'] }
  | { kind: 'i-will'; text: string; sealedAt: string };

export function bookPages(book: BookVersion): BookPage[] {
  const rest = restOfIdeal(book.ideal, book.firstSentence);
  const pages: BookPage[] = [{ kind: 'opening', firstSentence: book.firstSentence, rest }];
  if (book.shadow) pages.push({ kind: 'shadow', text: book.shadow });
  pages.push({ kind: 'contents', chapters: book.chapters });
  for (const chapter of book.chapters) pages.push({ kind: 'chapter', chapter });
  // The other two volumes sit after the goals and before the "I will": the
  // Book reads forwards, and what a person is and where they came from belong
  // behind the goals they lead to rather than in front of them.
  const present = book.volumes?.present?.entries ?? [];
  if (present.length) pages.push({ kind: 'present', entries: present });
  const past = book.volumes?.past?.entries ?? [];
  if (past.length) pages.push({ kind: 'past', entries: past });
  pages.push({ kind: 'i-will', text: book.iWill, sealedAt: book.sealedAt });
  return pages;
}

export interface BookDiff {
  kept: string[];
  rewritten: string[];
  letGo: string[];
}

/** Day-90 re-authoring: what changed between editions (PRD §7.3). */
export function diffBooks(previous: BookVersion, next: BookVersion): BookDiff {
  const prev = new Map(previous.chapters.map((c) => [c.goalId, c]));
  const kept: string[] = [];
  const rewritten: string[] = [];
  const letGo: string[] = [];
  for (const ch of next.chapters) {
    const before = prev.get(ch.goalId);
    if (!before) {
      rewritten.push(ch.name);
      continue;
    }
    const same =
      before.lines.length === ch.lines.length &&
      before.lines.every((l, i) => l.text === ch.lines[i]?.text && (l.paragraph ?? '') === (ch.lines[i]?.paragraph ?? ''));
    (same ? kept : rewritten).push(ch.name);
    prev.delete(ch.goalId);
  }
  for (const [, ch] of prev) letGo.push(ch.name);
  return { kept, rewritten, letGo };
}

/** Plain-text export. The PDF renderer uses the same shape. */
export function bookToText(book: BookVersion, boundaryHour = 3): string {
  const out: string[] = [];
  // The framing is the app's words and the title is theirs; the plain text has
  // no second face to say so, so they simply run together as one line.
  out.push([book.titleFraming, book.title].filter(Boolean).join(' ').toUpperCase());
  out.push(`Sealed ${formatDay(sealedOn(book.sealedAt, boundaryHour))} · ${plural(book.chapters.length, 'goal')} · ${book.track}`);
  out.push('');
  out.push('CHAPTER ONE · THE FIFTEEN');
  out.push(book.ideal);
  out.push('');
  if (book.shadow) {
    out.push('THE OTHER ROAD');
    out.push(book.shadow);
    out.push('');
  }
  out.push('CONTENTS');
  for (const c of book.chapters) out.push(`  ${c.name} — ${c.horizon}`);
  out.push('');
  for (const c of book.chapters) {
    out.push(c.name.toUpperCase());
    for (const l of c.lines) {
      out.push(`  ${l.kind}${l.framingLabel ? ` (${l.framingLabel})` : ''}`);
      out.push(`  ${l.text}`);
      if (l.text2) {
        const half = thenHalf(l.text2);
        out.push(`  ${half.framing} ${half.act}`);
      }
      if (l.paragraph) out.push(`  ${l.paragraph}`);
    }
    for (const m of c.memories) out.push(`  from before: ${m}`);
    out.push('');
  }
  // The other two volumes, in the order the pages have them: after the goals,
  // before the last line. The headings are the app's; every line under them
  // is theirs, so the plain text is as complete as the reading.
  const present = book.volumes?.present?.entries ?? [];
  if (present.length) {
    out.push('WHAT I AM LIKE');
    for (const e of present) {
      out.push('  ' + (e.half === 'faults' ? 'What gets in the way' : 'What I am good at') + (e.goalName ? ' · ' + e.goalName : ''));
      out.push('  ' + e.card);
      out.push('  ' + e.story);
      out.push('  ' + (e.framing ? e.framing + ' ' : '') + e.apply);
    }
    out.push('');
  }
  const past = book.volumes?.past?.entries ?? [];
  if (past.length) {
    out.push('WHERE I CAME FROM');
    for (const e of past) {
      out.push('  ' + e.period);
      out.push('  ' + e.title);
      out.push('  ' + e.whatHappened);
      out.push('  ' + e.shapedMe);
      out.push('  ' + e.stillBelieve);
    }
    out.push('');
  }
  out.push('I WILL');
  out.push(book.iWill);
  return out.join('\n');
}
