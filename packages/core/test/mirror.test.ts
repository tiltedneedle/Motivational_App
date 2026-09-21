import { describe, expect, it } from 'vitest';
import { mirrorLocally, verifyMirror, warmupPrompt } from '../src/engines/mirror';

describe('the mirror', () => {
  it('quotes a line with a decimal in it whole', () => {
    // The clause splitter used to end a sentence at the dot in "6.30", and
    // the first words back to a person were “30 and I am out the door by 7”.
    expect(mirrorLocally('I wake at 6.30 and I am out the door by 7').quotes).toEqual(['I wake at 6.30 and I am out the door by 7']);
    // And a proposed quote that starts mid-word is not their words.
    expect(verifyMirror('I want to run everyday and grow', ['un everyday and gro', 'run everyday and grow'])).toEqual(['run everyday and grow']);
  });

  it('quotes only what was written, verbatim', () => {
    const text = 'I want to get to bed before midnight and I want to run before work on Tuesdays.';
    const m = mirrorLocally(text);
    expect(m.quotes.length).toBeGreaterThan(0);
    for (const q of m.quotes) expect(text.includes(q)).toBe(true);
    expect(m.question.length).toBeGreaterThan(10);
  });

  it('finds a quote in a plain first line', () => {
    const m = mirrorLocally('Get to bed before midnight.');
    expect(m.quotes).toEqual(['Get to bed before midnight']);
  });

  it('names the part of a life when the words say it', () => {
    expect(mirrorLocally('I want to sleep properly and stop the phone in bed.').domain).toBe('mind');
    expect(mirrorLocally('Pay off the overdraft and save every month.').domain).toBe('money');
  });

  it('asks the same question of the same words', () => {
    const a = mirrorLocally('I want to run a marathon.');
    const b = mirrorLocally('I want to run a marathon.');
    expect(a.question).toBe(b.question);
  });

  it('says nothing about an empty page', () => {
    const m = mirrorLocally('   ');
    expect(m.quotes).toEqual([]);
    expect(m.question.length).toBeGreaterThan(0);
  });

  it('throws away a quote that is not in the source', () => {
    expect(verifyMirror('I want to run.', ['I want to run.', 'I want to fly far away'])).toEqual(['I want to run.']);
    expect(verifyMirror('I want to run.', ['run.'])).toEqual([]);
  });

  it('keeps at most two, non-overlapping', () => {
    const src = 'one long clause here, another long clause there, a third long clause too';
    expect(verifyMirror(src, ['one long clause here', 'long clause here, another', 'another long clause there', 'a third long clause too'])).toEqual(['one long clause here', 'another long clause there']);
  });

  it('has a warm-up prompt for every area and a plain one for none', () => {
    expect(warmupPrompt('health')).toContain('body');
    expect(warmupPrompt(null)).toContain('one thing better');
  });
});

describe('the mirror, with a hint', () => {
  it('lets the area they chose win when the text touches it', () => {
    const m = mirrorLocally('I want to get out the door for a run before work.', 'health');
    expect(m.domain).toBe('health');
  });
  it('ignores a hint the text never touches', () => {
    const m = mirrorLocally('Pay off the overdraft.', 'health');
    expect(m.domain).toBe('money');
  });
});
