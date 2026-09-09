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

const CLOCK = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b|\b([1-9]|1[0-2])\s?(am|pm)\b/i;

const TIME_WORDS =
  /\b(morning|mornings|evening|evenings|night|nights|noon|dawn|dusk|lunchtime|before work|after work|after dinner|before bed|first thing|last thing)\b/i;

const CADENCE =
  /\b(once|twice|three times|four times|\d+\s?(x|times))\b.{0,18}\b(a|per|each)\b.{0,10}\b(day|week|month|morning|night)\b/i;

const PLACE =
  /\b(at|in|on|from|to)\s+(the\s+)?[a-z][\w'-]*(\s+[a-z][\w'-]*){0,3}\b|\b(kitchen|desk|gym|park|office|stairwell|bedroom|bathroom|studio|garage|hall|street|door|table|floor|track|pool|shed|garden|car|bus|train)\b/i;

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
  const hasClock = CLOCK.test(text);
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
