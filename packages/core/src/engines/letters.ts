/**
 * Letters (PRD §7.8).
 *
 * "From the future self at the Portrait reveal, the first Return, each
 * milestone and monthly: 120–180 words, quoting the Fifteen and real ledger
 * entries. The user can also write to their future self with a delivery date.
 * Letters are AI-written and always quote the user; they never contain a goal
 * or a plan line."
 *
 * So there are two rules a letter has to pass before anybody sees it, and they
 * are enforced here rather than trusted to whoever wrote the prose:
 *
 *   1. every quoted span is a verbatim substring of something the person
 *      actually wrote, checked against the sources;
 *   2. no goal title and no plan line appears anywhere in the body, because a
 *      letter that names the plan is the app writing the plan back at them in
 *      a warmer voice.
 *
 * A letter that fails either is not shown. There is no third option where it is
 * shown with a warning: the person cannot be expected to audit their own
 * encouragement.
 */
import type { Evidence, Goal, Letter, Move } from '../types';
import { endSentence } from '../ids';
import { withoutDanglingWord } from './portrait';

/**
 * Their sentence inside ours: the full stop they ended it with comes off, so
 * the sentence has one. A sentence that ends in their own quotation mark is
 * left whole — taking the mark off with the stop left the quotation
 * unbalanced.
 */
const midSentence = (s: string): string => s.replace(/[.!?]+$/, '');

export type LetterTrigger = 'portrait' | 'first-return' | 'milestone' | 'monthly';

export const LETTER_MIN_WORDS = 120;
export const LETTER_MAX_WORDS = 180;

export interface LetterSources {
  /** The Fifteen, verbatim. */
  ideal: string;
  /** Ledger lines, newest first. Their words. */
  evidence: readonly Evidence[];
  /** Everything a letter may not say back to them. */
  goals: readonly Goal[];
  moves: readonly Move[];
}

export interface LetterCheck {
  ok: boolean;
  /** Why it was refused, for the log. Never shown to the person. */
  problems: string[];
  words: number;
}

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function normalise(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Everything the person wrote that a letter is allowed to quote.
 *
 * Deliberately not "everything in the store": a letter quotes the Fifteen and
 * the ledger, both of which are their own sentences. An analysis line is theirs
 * too, but it is the material a plan was built from, and quoting it back is one
 * short step from quoting the plan.
 */
export function quotableSources(sources: LetterSources): string[] {
  return [sources.ideal, ...freeText(sources.evidence).map((e) => e.text)].filter((s) => s.trim().length > 0);
}

/**
 * The ledger rows that are sentences the person typed: what they wrote at the
 * seal, and what they captured. A kept move's row carries the move's title —
 * a plan line, which no letter may say back — and a practice run's row
 * carries the app's own "Two minutes of it", which is not theirs at all.
 * Quoting either made every letter after the first kept move fail its own
 * check, so no letter was ever written once the plan was in use.
 */
export function freeText<T extends { kind: Evidence['kind'] }>(evidence: readonly T[]): T[] {
  return evidence.filter((e) => e.kind === 'seal' || e.kind === 'capture');
}

/**
 * Check a letter before anybody reads it.
 *
 * The word count is a range rather than a cap because both ends matter: under
 * 120 it is a notification with a stamp on it, and over 180 nobody finishes it.
 */
export function checkLetter(body: string, quotes: readonly string[], sources: LetterSources): LetterCheck {
  const problems: string[] = [];
  const n = words(body);
  if (n < LETTER_MIN_WORDS) problems.push(`too short: ${n} words`);
  if (n > LETTER_MAX_WORDS) problems.push(`too long: ${n} words`);

  const haystack = quotableSources(sources).map(normalise);
  const kept = quotes.filter((q) => q.trim().length > 0);
  if (kept.length === 0) problems.push('quotes nothing of theirs');
  for (const q of kept) {
    const needle = normalise(q);
    if (!haystack.some((h) => h.includes(needle))) problems.push(`not their words: "${q.slice(0, 40)}"`);
    if (!normalise(body).includes(needle)) problems.push(`quoted but not present: "${q.slice(0, 40)}"`);
  }

  // No goal, no plan line. Matched on the whole title rather than on words
  // from it: "race" appearing in a letter is ordinary English, "5 km race" is
  // the app reading its own database out loud.
  const forbidden = [
    ...sources.goals.map((g) => g.title),
    ...sources.moves.map((m) => m.title),
    ...sources.moves.map((m) => m.minVersion ?? ''),
  ]
    .map(normalise)
    .filter((t) => t.length >= 8);
  const flat = normalise(body);
  for (const t of forbidden) {
    if (flat.includes(t)) {
      problems.push(`names the plan: "${t.slice(0, 40)}"`);
      break;
    }
  }

  return { ok: problems.length === 0, problems, words: n };
}

export interface LetterOccasion {
  trigger: LetterTrigger;
  /** Stable, so the same occasion cannot produce two letters. */
  key: string;
  goalId: string | null;
}

export interface OccasionInput {
  /** `YYYY-MM-DD`. */
  today: string;
  /** True once the Portrait exists and has been seen. */
  portraitReady: boolean;
  /** Returns detected so far. */
  returns: number;
  /** Milestones reached, by id. */
  reachedMilestones: readonly { id: string; goalId: string; reachedAt: string }[];
  /** Keys of letters already written. */
  existing: readonly string[];
  /** The day the first Book was sealed, for the monthly cadence. */
  firstSealedOn: string | null;
}

function monthsBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  return b.getUTCDate() >= a.getUTCDate() ? months : months - 1;
}

/**
 * Which letters are owed today, and none that already exist.
 *
 * Keyed rather than counted: a letter for "the third milestone" is the letter
 * for that milestone's id, so reaching it, undoing it and reaching it again
 * does not produce a second one — and a device that syncs twice does not
 * either.
 */
export function dueLetters(input: OccasionInput): LetterOccasion[] {
  const have = new Set(input.existing);
  const out: LetterOccasion[] = [];

  const add = (trigger: LetterTrigger, key: string, goalId: string | null) => {
    if (have.has(key)) return;
    out.push({ trigger, key, goalId });
    have.add(key);
  };

  if (input.portraitReady) add('portrait', 'portrait', null);
  // The *first* return only. Every return after that is met on Today, and a
  // letter each time would turn coming back into something that is watched.
  if (input.returns >= 1) add('first-return', 'first-return', null);
  for (const m of input.reachedMilestones) add('milestone', `milestone:${m.id}`, m.goalId);

  if (input.firstSealedOn) {
    const months = monthsBetween(input.firstSealedOn, input.today);
    if (months >= 1) add('monthly', `monthly:${months}`, null);
  }

  return out;
}

/** Letters ready to be read today. A letter with a future date is not yet theirs. */
export function deliverable(letters: readonly Letter[], today: string): Letter[] {
  return letters.filter((l) => l.deliverAt.slice(0, 10) <= today && !l.readAt);
}

export const WRITE_TO_FUTURE_MIN_DAYS = 1;
export const WRITE_TO_FUTURE_MAX_DAYS = 365;

/**
 * Whether a delivery date the person picked is one the app can honour.
 *
 * A year is the ceiling because anything further is a promise about a product
 * rather than about them, and one day is the floor because a letter to your
 * future self that arrives this afternoon is a note.
 */
export function canDeliverOn(days: number): { ok: boolean; reason?: string } {
  if (!Number.isFinite(days) || Math.floor(days) !== days) return { ok: false, reason: 'Pick a number of days.' };
  if (days < WRITE_TO_FUTURE_MIN_DAYS) return { ok: false, reason: 'Tomorrow at the earliest.' };
  if (days > WRITE_TO_FUTURE_MAX_DAYS) return { ok: false, reason: 'A year is as far ahead as this goes.' };
  return { ok: true };
}

// ---------------------------------------------------------------- composing

const OPENERS: Record<LetterTrigger, string> = {
  portrait: 'I have been reading what you wrote, the day you wrote it.',
  'first-return': 'You came back. I want to be the one to say that plainly.',
  milestone: 'You reached one. Not the whole thing — one, which is how the whole thing happens.',
  monthly: 'A month. I have been keeping the receipts, so here they are.',
};

const CLOSERS: Record<LetterTrigger, string> = {
  portrait: 'Start with the smallest thing tomorrow. I will keep the rest of it safe until you need it.',
  'first-return': 'Nothing reset while you were gone, and nothing is owed for the days off. Start small and start today.',
  milestone: 'Do not spend it. Put it down and take the next ordinary morning, the same way you took this one.',
  monthly: 'Nothing here needs to be bigger next month. It needs to be this, again, on the days it is dull.',
};

/**
 * The middle of the letter, built only out of what is in front of it.
 *
 * The shape is fixed and the content is theirs. Nothing in here describes the
 * person — it describes what is in the ledger, which is a different thing and
 * the only kind of claim this app is entitled to make about somebody's life.
 *
 * Every piece carries a rank. When the whole letter runs past the ceiling —
 * a thirty-word first sentence and two long ledger lines will do it — the
 * highest-ranked optional pieces go first, quotations last, so the composer
 * cannot hand its own check a letter the check refuses.
 */
interface Piece {
  text: string;
  /** Quotations this piece carries, so dropping it drops them from the list. */
  quotes: string[];
  /** 0 is always kept. Higher numbers are the first to go when it runs long. */
  optional: number;
}

function middlePieces(first: string, cut: boolean, kept: string[], total: number, theirs: number): Piece[] {
  const pieces: Piece[] = [];
  const entries = total === 1 ? 'one entry' : `${total} entries`;
  if (first) {
    pieces.push({
      // "began" when the sentence was cut: the quotation is the verbatim
      // start of it, and saying "wrote" of half a sentence is a small lie.
      text: `You ${cut ? 'began' : 'wrote'} “${midSentence(first)}” and I have thought about that line more than you did.`,
      quotes: [midSentence(first)],
      // The last thing to go, and only ever when there is a ledger line to
      // quote instead: a letter that quotes nothing of theirs is not a letter.
      optional: kept.length > 0 ? 1 : 0,
    });
  }
  // A kept move's row is a plan line and a practice run's is the app's
  // sentence, so "in your own handwriting" is said only of the rows that
  // are: what they wrote at a seal, or captured.
  if (kept.length >= 2) {
    pieces.push({
      // "both of them" when the two quoted are every line in their hand.
      text: `Since then the ledger has ${entries}, and ${theirs === 2 ? 'both' : 'two'} of the ones in your own hand are “${midSentence(kept[0]!)}” and ${endSentence(
        `“${kept[1]}”`,
      )}`,
      quotes: [midSentence(kept[0]!), kept[1]!],
      optional: 0,
    });
  } else if (kept.length === 1) {
    pieces.push({
      text: `The ledger has ${entries} so far, and ${theirs === 1 ? 'the one' : 'one of the ones'} in your own hand is ${endSentence(`“${kept[0]}”`)}`,
      quotes: [kept[0]!],
      optional: 0,
    });
  } else if (theirs > 0) {
    // Their lines are there and too long to quote whole; the letter says so
    // rather than calling a ledger with two sentences in it empty.
    pieces.push({
      text: `The ledger has ${entries} so far, and what you wrote in it runs longer than a letter has room to quote.`,
      quotes: [],
      optional: 0,
    });
  } else if (total > 0) {
    pieces.push({
      text: `The ledger has ${entries} so far, every one of them a thing done rather than written.`,
      quotes: [],
      optional: 0,
    });
  } else {
    pieces.push({
      text: 'The ledger is still empty, which is the ordinary state of a thing that has just begun.',
      quotes: [],
      optional: 0,
    });
  }
  if (total > 0) {
    // These two presume a morning in the ledger. With none there yet they
    // would be describing a life the app has no record of — and neither
    // says how the person felt on any of those mornings, which the app does
    // not know.
    pieces.push({
      text: 'Nobody tells you that the feeling arrives afterwards, if it arrives at all, and that the work goes first either way.',
      quotes: [],
      optional: 3,
    });
    pieces.push({
      text: 'I am not writing to tell you it gets easier. I am writing because somebody should have a record of the mornings you did it anyway, and it turns out that somebody is you, later.',
      quotes: [],
      optional: 2,
    });
  } else {
    pieces.push({
      text: 'An empty page is not a verdict. The first line goes in the same way the last one will, on a morning that does not feel like it, and nobody is counting how long the page stayed blank.',
      quotes: [],
      optional: 3,
    });
    pieces.push({
      text: 'I am not writing to tell you it gets easier. I am writing because somebody should keep a record of what you decided, and it turns out that somebody is you, later.',
      quotes: [],
      optional: 2,
    });
  }
  return pieces;
}

/**
 * Sentences that say nothing about anybody, for a letter that comes in under
 * the floor — one short ledger line and no first sentence will do that. Added
 * in order, only as far as needed, so a letter is never padded for its own
 * sake.
 */
const FILLER = [
  'Keep the ledger honest and keep it small. A line a day is more than most people ever write down about their own lives.',
  'Read this once and then close it. It was not written to be kept open, and the next one will find you when it is due.',
  'What you wrote is still where you left it, and it will still be yours on the days you do not want to look at it.',
];

export interface ComposedLetter {
  body: string;
  quotes: string[];
  check: LetterCheck;
}

/**
 * Build a letter from the future self, locally.
 *
 * This is the fallback the product ships with: no key, no network, and it still
 * has to produce something worth reading. Every sentence about their life is a
 * quotation, and `checkLetter` runs on the result rather than being trusted —
 * the composer is not exempt from the rule just because it is ours.
 */
export function composeLetter(trigger: LetterTrigger, sources: LetterSources, name?: string): ComposedLetter {
  const who = name?.trim() ? `${name.trim()}, ` : '';
  // Never a sentence that names the goal or a plan line: the check below
  // would refuse the letter, and "I deadlift 140 kg for a clean single" is
  // the Fifteen's second sentence for a goal called "Deadlift 140 kg".
  const { first, cut } = firstSentenceOf(sources.ideal, [...sources.goals.map((g) => g.title), ...sources.moves.map((m) => m.title)]);
  // The count is the whole ledger; the quotations come only from the rows
  // that are sentences they typed.
  const total = sources.evidence.filter((e) => e.text.trim().length > 0).length;
  const theirs = freeText(sources.evidence).filter((e) => e.text.trim().length > 0).length;
  const kept = freeText(sources.evidence)
    .map((e) => e.text.trim())
    .filter((t) => t.length > 0 && t.length <= 90)
    .slice(0, 2);

  // After a name the sentence carries on: "Priya, you came back."
  const greeting = OPENERS[trigger];
  const opener = who ? `${who}${/^I\b/.test(greeting) ? greeting : greeting.charAt(0).toLowerCase() + greeting.slice(1)}` : greeting;
  const closer = CLOSERS[trigger];
  let pieces = middlePieces(first, cut, kept, total, theirs);

  const assemble = (ps: Piece[]) => [opener, ...ps.map((p) => p.text), closer].join(' ');

  // Too long: shed the most optional piece and look again. The quotation of
  // the Fifteen goes only after the prose has, and only when a ledger line is
  // still there to be quoted instead.
  while (words(assemble(pieces)) > LETTER_MAX_WORDS) {
    const top = Math.max(...pieces.map((p) => p.optional));
    if (top === 0) break;
    const idx = pieces.findIndex((p) => p.optional === top);
    pieces = pieces.filter((_, i) => i !== idx);
  }
  // Two long ledger lines with nothing else to shed: keep one of them.
  if (words(assemble(pieces)) > LETTER_MAX_WORDS && kept.length === 2) {
    pieces = pieces.map((p) =>
      p.quotes.length === 2
        ? {
            text: `The ledger has ${total} entries in your own handwriting so far, and one of them is ${endSentence(`“${kept[0]}”`)}`,
            quotes: [kept[0]!],
            optional: 0,
          }
        : p,
    );
  }

  // Too short: one plain sentence at a time, before the closer.
  const middle = pieces.map((p) => p.text);
  let body = [opener, ...middle, closer].join(' ');
  for (const line of FILLER) {
    if (words(body) >= LETTER_MIN_WORDS) break;
    middle.push(line);
    body = [opener, ...middle, closer].join(' ');
  }

  const quotes = pieces.flatMap((p) => p.quotes);
  return { body, quotes, check: checkLetter(body, quotes, sources) };
}

/**
 * The first sentence of the Fifteen, whole when it fits and its verbatim
 * start when it does not. A Fifteen that opens with a 220-character sentence
 * used to yield no quotation at all, so the Portrait letter was refused on
 * every launch for exactly the people who wrote the most.
 */
function firstSentenceOf(text: string, avoid: readonly string[] = []): { first: string; cut: boolean } {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return { first: '', cut: false };
  // The first sentence with something in it. "It's March." is a scene-setter,
  // and the line the future self has thought about is the next one.
  const forbidden = avoid.map(normalise).filter((a) => a.length >= 8);
  const sentences = t.match(/[^.!?]+[.!?]+["'”’)\]]*(?=\s|$)/g)?.map((x) => x.trim()) ?? [];
  const fuller = sentences.find((x) => x.split(/\s+/).length >= 5 && !forbidden.some((f) => normalise(x).includes(f)));
  // The fallback — the first sentence, whatever its length — obeys the same
  // list: a letter built on a sentence that names the plan is refused by
  // the check and then never written, on every launch, for good.
  const m = t.match(/^.*?[.!?]+["'”’)\]]*(?=\s|$)/);
  const fallback = (m?.[0] ?? t).trim();
  if (!fuller && forbidden.some((f) => normalise(fallback).includes(f))) return { first: '', cut: false };
  const s = (fuller ?? fallback).trim();
  if (s.length <= 160) return { first: s, cut: false };
  const window = s.slice(0, 161);
  const lastSpace = window.lastIndexOf(' ');
  const prefix = withoutDanglingWord(lastSpace > 80 ? window.slice(0, lastSpace) : window.slice(0, 160), 80);
  return { first: prefix, cut: true };
}
