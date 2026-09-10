/**
 * The label printed beside somebody's own sentence.
 *
 * `domainOf` is the app saying, out loud and next to their words, what it
 * thinks a sentence of theirs was about. Every case here was found by writing
 * the Fifteen the way a person writes it and reading what came back:
 *
 *   “It is 6:40 and the kitchen is still blue”  →  MIND & SLEEP
 *
 * — because `still` was a stillness word, and because a tie was broken by the
 * order the domains happen to appear in the source file.
 */
import { describe, expect, it } from 'vitest';
import { clauses, domainOf, extractSpansLocally } from '../src/engines/readback';

describe('what the app says a sentence was about', () => {
  it('reads a kitchen as a home, not as a state of mind', () => {
    expect(domainOf('It is 6:40 and the kitchen is still blue')).toBe('home');
  });

  it('does not treat "still" as stillness', () => {
    // The adverb, in the four shapes people actually write it.
    expect(domainOf('Sam is still asleep')).not.toBe('mind');
    expect(domainOf('the shelf is still there')).toBe('home');
    expect(domainOf('I am still here')).toBe('custom');
    // And a real one still lands.
    expect(domainOf('I want the mornings to be quieter')).toBe('mind');
  });

  it('does not read a word out of the middle of a longer one', () => {
    // Each of these was a false positive from a trailing \w* on the whole
    // alternation: card→cardio, sam→same, bill→billion, rest→restaurant.
    expect(domainOf('twenty minutes of cardio')).toBe('health');
    expect(domainOf('the same thing every week')).toBe('custom');
    expect(domainOf('a billion things to do')).toBe('custom');
    expect(domainOf('we ate at the restaurant')).toBe('custom');
  });

  it('still catches the ordinary forms of each domain', () => {
    expect(domainOf('I run the towpath as far as the second bridge')).toBe('health');
    expect(domainOf('the rent is paid and there is money left')).toBe('money');
    expect(domainOf('I am writing every morning before work')).toBe('craft');
    expect(domainOf('the phone stays in the hall after ten')).toBe('mind');
    expect(domainOf('Sam and I have dinner together')).toBe('people');
    expect(domainOf('the kitchen is clean before bed')).not.toBe('custom');
  });

  it('says nothing rather than guessing when two domains tie exactly', () => {
    // One word each, three letters each: "gym" for health, "bed" for mind.
    // Neither reading is better than the other, and "something else" is the
    // honest answer. Before this, health won for being declared first.
    expect(domainOf('from the gym to the bed')).toBe('custom');
  });

  it('prefers the more specific word when the counts are level', () => {
    // "swimming" is a longer, more specific claim than "room".
    expect(domainOf('swimming in the room')).toBe('health');
  });

  it('is not thrown by an empty or punctuation-only line', () => {
    expect(domainOf('')).toBe('custom');
    expect(domainOf('   ')).toBe('custom');
    expect(domainOf('...')).toBe('custom');
  });
});

describe('a quotation ends where a quotation should', () => {
  const IDEAL =
    'It is 6:40 and the kitchen is still blue. I am out the back door before the kettle boils, and I run the towpath as far as the second bridge. Sam is still asleep.';

  it('does not leave a comma inside the quotation marks', () => {
    for (const c of clauses(IDEAL)) {
      expect(c.text, c.text).not.toMatch(/[,;:]$/);
    }
    for (const span of extractSpansLocally(IDEAL).spans) {
      expect(span.text, span.text).not.toMatch(/[,;:]$/);
    }
  });

  it('keeps every span an exact substring of what they wrote', () => {
    // The whole product rests on this, and trimming the tail is exactly the
    // kind of change that could quietly break it.
    for (const span of extractSpansLocally(IDEAL).spans) {
      expect(IDEAL.includes(span.text), span.text).toBe(true);
      expect(IDEAL.slice(span.start, span.end)).toBe(span.text);
    }
  });

  it('trims the comma before "and" off the half it does not belong to', () => {
    const texts = clauses(IDEAL).map((c) => c.text);
    const half = texts.find((t) => t.startsWith('I am out the back door'));
    expect(half).toBeDefined();
    expect(half!.endsWith(',')).toBe(false);
    expect(IDEAL.includes(half!)).toBe(true);
  });
});
