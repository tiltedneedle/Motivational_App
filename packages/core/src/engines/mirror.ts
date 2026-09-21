/**
 * The mirror (the rebuild, 2026-09-21): the app answers a piece of writing.
 *
 * What the published apps in this space do a minute in, and this one never
 * did: say something back. The rule holds — the app writes nothing about the
 * person's life. A mirror is made of three things it is allowed to do:
 *
 *  1. QUOTE: one or two clauses of their own, verbatim, chosen by the same
 *     extractor the read-back uses (`clauses` + `score`), and checked as
 *     exact substrings before they leave here.
 *  2. NAME the part of a life the writing is about, from the same word
 *     lists the read-back labels with — "this sounds like it is about
 *     sleep" is a label, not a sentence about them.
 *  3. ASK one question, from a bank keyed by that part, chosen by a hash of
 *     the text so the same words get the same question and the mirror does
 *     not look like it is shuffling cards.
 *
 * A remote model can propose the quote and the question later through the
 * same shape; `verifyMirror` throws away any quote that is not verbatim.
 */
import type { DomainId } from '../types';
import { clauses, domainOf, domainMatches, extractSpansLocally, onWordEdges } from './readback';

export interface Mirror {
  /** Verbatim clauses of the person's text, in the order they wrote them. */
  quotes: string[];
  /** The part of a life the writing is about, or null when it is not clear. */
  domain: DomainId | null;
  /** One question, the app's own words, about their words. */
  question: string;
  /** One short line the screen shows under the quotes: what a first line is for. */
  note: string;
}

const QUESTIONS: Record<DomainId, readonly string[]> = {
  health: [
    'What would the first week of that look like, on an ordinary Tuesday?',
    'When did your body last feel the way you want it to, and what was different that day?',
    'What is the smallest version of that you could do tomorrow morning?',
  ],
  money: [
    'What would you stop worrying about, once that was true?',
    'What is one number that would tell you it is working?',
    'Who would notice first, if that changed?',
  ],
  craft: [
    'What would you have made by this time next year?',
    'When do you already do this, even badly, and what pulls you away?',
    'Who would you want to show it to?',
  ],
  mind: [
    'What does a calm evening actually look like for you — where are you, and what is not there?',
    'What is the first thing that goes when a day gets loud?',
    'What would you do with the hour you got back?',
  ],
  people: [
    'Who is in the room, in the version where this goes well?',
    'What would they say about you, a year from now, if this held?',
    'What is one call you have been meaning to make?',
  ],
  home: [
    'What does the house look like on the morning this is true?',
    'What is the one corner you would fix first?',
    'Who else lives with this, and what would change for them?',
  ],
  custom: [
    'What would have to be true for that to happen this year?',
    'What is the two-minute version of it?',
    'When did it last go the way you wanted, and what was different that day?',
  ],
};

const DOMAIN_NAME: Record<DomainId, string> = {
  health: 'your health',
  money: 'money',
  craft: 'your work and what you make',
  mind: 'your mind and your sleep',
  people: 'the people in your life',
  home: 'home',
  custom: '',
};

/** Small and stable: the same text always lands on the same question. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Where a domain's word list places the text, or null when nothing matches.
 * With a hint — the area the person said they want to work on — the hint
 * wins whenever the text touches it at all: "out the door for a run" is
 * about the run when they came here for their health, whatever the
 * longest-word rule says about doors.
 */
export function mirrorDomain(text: string, hint?: DomainId | null): DomainId | null {
  if (hint && hint !== 'custom' && domainMatches(text, hint)) return hint;
  const d = domainOf(text);
  return d === 'custom' ? null : d;
}

/**
 * The offline mirror. Chooses at most two clauses (the extractor's best,
 * then the longest if it found only one and there is more), names the
 * domain, asks one question. Writes nothing.
 */
export function mirrorLocally(text: string, hint?: DomainId | null): Mirror {
  const source = (text ?? '').trim();
  const domain = mirrorDomain(source, hint);
  const bank = QUESTIONS[domain ?? 'custom'];
  const question = bank[hash(source) % bank.length]!;
  const note = domain ? `This sounds like it is about ${DOMAIN_NAME[domain]}. Your words, kept as you wrote them.` : 'Your words, kept as you wrote them.';

  if (!source) return { quotes: [], domain, question, note };

  const picked = extractSpansLocally(source, 2).spans.map((s) => s.text);
  // The extractor wants a clause that reads as a want; a first line is often
  // plainer than that ("Get to bed before midnight."). Fall back to the
  // longest clause, then to the whole text when it is short enough to quote.
  if (picked.length === 0) {
    const all = clauses(source).sort((a, b) => b.text.length - a.text.length);
    const longest = all[0]?.text ?? '';
    if (longest.length >= 8) picked.push(longest);
    else if (source.length <= 140) picked.push(source);
  }
  const quotes = verifyMirror(source, picked);
  // In the order they were written, not the extractor's ranking.
  quotes.sort((a, b) => source.indexOf(a) - source.indexOf(b));
  return { quotes, domain, question, note };
}

/**
 * The gate. Any quote that is not an exact substring of the source is
 * dropped, and quotes that overlap keep only the first. Under 8 characters
 * is not a quote.
 */
export function verifyMirror(source: string, proposed: readonly string[]): string[] {
  const out: string[] = [];
  const used: { start: number; end: number }[] = [];
  for (const raw of proposed) {
    const text = (raw ?? '').trim();
    if (text.length < 8) continue;
    // The first occurrence that begins and ends on a word of theirs.
    let start = -1;
    for (let from = 0; from <= source.length; ) {
      const idx = source.indexOf(text, from);
      if (idx === -1) break;
      if (onWordEdges(source, idx, idx + text.length)) {
        start = idx;
        break;
      }
      from = idx + 1;
    }
    if (start === -1) continue;
    const end = start + text.length;
    if (used.some((u) => start < u.end && u.start < end)) continue;
    used.push({ start, end });
    out.push(text);
    if (out.length === 2) break;
  }
  return out;
}

/** The warm-up prompts (the source's own list, in Morrow's words), by the area picked first. */
export const WARMUP_PROMPTS: Record<DomainId, string> = {
  health: 'If you could do one thing better for your body this year, what would it be?',
  money: 'If one thing about money could be different this year, what would it be?',
  craft: 'What is one thing you want to be better at by this time next year?',
  mind: 'If you could do one thing better for your own head this year, what would it be?',
  people: 'What is one thing you want to be different with the people in your life this year?',
  home: 'If one thing at home could be different this year, what would it be?',
  custom: 'If you could do one thing better this year, what would it be?',
};

export function warmupPrompt(domain: DomainId | null | undefined): string {
  return WARMUP_PROMPTS[domain ?? 'custom'];
}
