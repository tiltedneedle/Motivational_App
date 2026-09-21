/**
 * The specificity check (PRD §7.2).
 *
 * Deterministic, offline, and deliberately generous: it exists to earn ONE
 * follow-up question ("When, exactly, and where?"), never to reject a line.
 * The 2020 Rotterdam study found plan specificity predicted outcomes, so we
 * measure it, log it, and show it as polish — never as an error.
 */

const WEEKDAYS =
  /\b(mon|tues|wednes|thurs|fri|satur|sun)day(s)?\b|\bweekday(s)?\b|\bweekend(s)?\b|\bdaily\b|\bevery day\b|\bevery night\b/i;

/**
 * A clock time, and only a clock time.
 *
 * The dotted form is the trap: "6.40" is a time, but so is "10.50" in pounds
 * and so is "5.30" in kilometres. Written as `[:.]` the pattern counted money
 * and distances as times, which inflated the score of a line that had never
 * said when. The dot is only a clock when a time preposition or am/pm says so.
 */
const CLOCK_COLON = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
const CLOCK_MERIDIEM = /\b(1[0-2]|[1-9])(?:[:.][0-5]\d)?\s?(am|pm)\b/i;
/** "at 6.40", "by 7.15" — a time preposition in front of a dotted number. */
const CLOCK_DOTTED = /\b(at|by|around|before|after|from|until|til|till)\s+([01]?\d|2[0-3])\.([0-5]\d)\b/i;
/**
 * What follows a dotted number when it is a rate or an amount rather than a
 * time: "put by 10.50 a week", "from 12.99 per month". The preposition alone
 * cannot tell these apart, so the words after the number decide.
 */
const RATE_TAIL = /^\s*(a|per|each|every)\s+(week|month|day|year|fortnight|session|hour)\b/i;
const MONEY_HEAD = /[£$€]\s?$/;

function hasClockTime(t: string): boolean {
  if (CLOCK_COLON.test(t) || CLOCK_MERIDIEM.test(t)) return true;
  const m = CLOCK_DOTTED.exec(t);
  if (!m) return false;
  const before = t.slice(0, m.index + m[0].length - `${m[2]}.${m[3]}`.length);
  const after = t.slice(m.index + m[0].length);
  // A currency in front of it, or a rate behind it, and it was never a time.
  if (MONEY_HEAD.test(before) || RATE_TAIL.test(after)) return false;
  return true;
}

const TIME_WORDS =
  /\b(morning|mornings|evening|evenings|night|nights|noon|dawn|dusk|lunchtime|before work|after work|after dinner|before bed|first thing|last thing)\b/i;

const CADENCE =
  /\b(once|twice|three times|four times|\d+\s?(x|times))\b.{0,18}\b(a|per|each)\b.{0,10}\b(day|week|month|morning|night)\b/i;

/**
 * A place, not any preposition.
 *
 * The first arm used to be `(at|in|on|from|to)\s+(the\s+)?<word>`, which
 * matches "to run", "in order" and "at all". Nearly every sentence in English
 * contains one, so `hasPlace` was true for lines that named no place at all,
 * and the single follow-up question — the one chance the product has to ask
 * "where, exactly?" — was never asked of anyone.
 *
 * A preposition now has to carry a determiner to count, which is what actually
 * separates "in the kitchen" from "in order to".
 */
const PLACE_NAMED =
  /\b(kitchen|desk|gym|park|office|stairwell|bedroom|bathroom|studio|garage|hall|hallway|street|door|doorstep|table|floor|track|pool|shed|garden|yard|balcony|basement|porch|counter|sink|window|couch|sofa|stairs|library|cafe|church|field|beach|river|canal|towpath|trail|car|bus|train|platform)\b/i;
// Not a time wearing a preposition: "in the morning", "at the weekend", "on
// a Sunday", "in a rush" name no place, and the one chance to ask "where,
// exactly?" was skipped on every one of them.
const PLACE_PHRASE =
  /\b(at|in|on|by|outside|inside|behind|beside|under|near|round)\s+(the|a|an|my|our|his|her|their|its)\s+(?!(?:morning|mornings|evening|evenings|afternoon|afternoons|night|nights|weekend|weekends|week|month|year|moment|minute|hour|end|start|rush|hurry|way|meantime|monday|tuesday|wednesday|thursday|friday|saturday|sunday|same\s+time|first|last|next)\b)[a-z][\w'-]*/i;
const PLACE = { test: (t: string) => PLACE_NAMED.test(t) || PLACE_PHRASE.test(t) };

const NUMBER = /\b\d+(\.\d+)?\s?(km|k|m|mi|miles|min|mins|minutes|hours?|hrs?|kg|lbs|words|pages|reps|sets|£|\$|€)?\b|[£$€]\s?\d/i;

export interface SpecificityResult {
  /** 0..1. Not a grade the user ever sees as a number. */
  score: number;
  hasTime: boolean;
  hasPlace: boolean;
  hasNumber: boolean;
  hasCadence: boolean;
  /** True when the app may ask its single follow-up. */
  needsFollowUp: boolean;
}

export function scoreSpecificity(raw: string): SpecificityResult {
  const text = (raw ?? '').trim();
  if (!text) {
    return { score: 0, hasTime: false, hasPlace: false, hasNumber: false, hasCadence: false, needsFollowUp: true };
  }
  const hasClock = hasClockTime(text);
  const hasTime = hasClock || WEEKDAYS.test(text) || TIME_WORDS.test(text);
  const hasCadence = CADENCE.test(text);
  const hasNumber = NUMBER.test(text);
  const hasPlace = PLACE.test(text);

  // Weighted so a line with a real clock time and a place scores high on its own.
  let score = 0;
  if (hasClock) score += 0.34;
  else if (hasTime) score += 0.24;
  if (hasPlace) score += 0.26;
  if (hasNumber) score += 0.2;
  if (hasCadence) score += 0.2;
  // Length is a weak signal of effort; capped so it can never carry a vague line.
  score += Math.min(0.1, text.length / 1200);

  const clamped = Math.max(0, Math.min(1, Number(score.toFixed(3))));
  return {
    score: clamped,
    hasTime,
    hasPlace,
    hasNumber,
    hasCadence,
    needsFollowUp: !(hasTime && (hasPlace || hasNumber || hasCadence)),
  };
}

/** The single follow-up. Never asked twice for the same line. */
export function followUpPrompt(kind: 'strategies' | 'monitoring'): string {
  return kind === 'strategies' ? 'When, exactly, and where?' : 'How often will you look, and what counts?';
}

/** What the caption under a line says. Signal, not scolding. */
export function specificityCaption(r: SpecificityResult): string {
  const marks: string[] = [];
  if (r.hasTime) marks.push('time ✓');
  if (r.hasPlace) marks.push('place ✓');
  if (r.hasNumber) marks.push('number ✓');
  if (r.hasCadence) marks.push('cadence ✓');
  return marks.length ? marks.join(' · ') : 'add a time or a place and the plan gets sharper';
}
