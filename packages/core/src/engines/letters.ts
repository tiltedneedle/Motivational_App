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
  return [sources.ideal, ...sources.evidence.map((e) => e.text)].filter((s) => s.trim().length > 0);
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
  portrait: 'I have been reading what you wrote, the night you wrote it.',
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
 * The one long middle sentence, built only out of what is in front of it.
 *
 * The shape is fixed and the content is theirs. Nothing in here describes the
 * person — it describes what is in the ledger, which is a different thing and
 * the only kind of claim this app is entitled to make about somebody's life.
 */
function middle(kept: string[], quoted: string[]): string {
  const bits: string[] = [];
  if (quoted[0]) bits.push(`You wrote “${quoted[0]}” and I have thought about that line more than you did.`);
  if (kept.length >= 2) {
    bits.push(
      `Since then the ledger has ${kept.length} entries in your own handwriting, and two of them are “${kept[0]}” and “${kept[1]}”.`,
    );
  } else if (kept.length === 1) {
    bits.push(`The ledger has one entry in your own handwriting so far, and it is “${kept[0]}”.`);
  } else {
    bits.push('The ledger is still empty, which is the ordinary state of a thing that has just begun.');
  }
  bits.push(
    'None of it was the day you felt like it. That is the part nobody tells you: the feeling arrives afterwards, if it arrives at all, and the work goes first either way.',
  );
  bits.push(
    'I am not writing to tell you it gets easier. I am writing because somebody should have a record of the mornings you did it anyway, and it turns out that somebody is you, later.',
  );
  return bits.join(' ');
}

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
  const first = firstSentenceOf(sources.ideal);
  const kept = sources.evidence
    .map((e) => e.text.trim())
    .filter((t) => t.length > 0 && t.length <= 90)
    .slice(0, 2);

  const quoted = [first, ...kept].filter((s) => s.length > 0);
  const body = [`${who}${OPENERS[trigger]}`, middle(kept, quoted), CLOSERS[trigger]].join(' ');

  return { body, quotes: quoted, check: checkLetter(body, quoted, sources) };
}

/** The first sentence of the Fifteen, uncut. Quoting half a sentence is worse than quoting none. */
function firstSentenceOf(text: string): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const m = t.match(/^[^.!?]{1,160}[.!?]/);
  const s = (m?.[0] ?? t).trim();
  return s.length <= 160 ? s : '';
}
