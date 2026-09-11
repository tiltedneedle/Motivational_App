/**
 * The rule that decides which words in a mixed sentence are the person's.
 *
 * The renderer is a thin wrapper over this; if the split is right the faces
 * are right, and if it is wrong the app is claiming its own prose as theirs
 * or setting their words in the app's face. Both are authorship failures.
 */
import { describe, expect, it } from 'vitest';
import { splitQuoted } from '../src/quoted';

describe('splitting app prose around the person\'s words', () => {
  it('finds a span and sets only it apart', () => {
    const parts = splitQuoted('You wrote “out the back door” and I read it.', ['out the back door']);
    expect(parts).toEqual([
      { text: 'You wrote “', theirs: false },
      { text: 'out the back door', theirs: true },
      { text: '” and I read it.', theirs: false },
    ]);
  });

  it('keeps a short span that sits before a longer one', () => {
    const body = 'First “Went.” then “Ten floors, twice, before work.” end';
    const parts = splitQuoted(body, ['Ten floors, twice, before work.', 'Went.']);
    expect(parts.filter((p) => p.theirs).map((p) => p.text)).toEqual(['Went.', 'Ten floors, twice, before work.']);
  });

  it('marks every occurrence of a span, not just the first', () => {
    const parts = splitQuoted('“Went.” Again: “Went.”', ['Went.']);
    expect(parts.filter((p) => p.theirs)).toHaveLength(2);
  });

  it('lets the longer claim win when two spans overlap', () => {
    const parts = splitQuoted('I stay up too late and read', ['I stay up too late', 'up too late and read']);
    expect(parts.filter((p) => p.theirs).map((p) => p.text)).toEqual(['up too late and read']);
  });

  it('is the whole body in the app face when nothing of theirs is in it', () => {
    expect(splitQuoted('Nothing is scheduled.', [])).toEqual([{ text: 'Nothing is scheduled.', theirs: false }]);
    expect(splitQuoted('Nothing is scheduled.', ['absent'])).toEqual([{ text: 'Nothing is scheduled.', theirs: false }]);
  });

  it('ignores blank spans rather than matching everywhere', () => {
    expect(splitQuoted('abc', ['', '  '])).toEqual([{ text: 'abc', theirs: false }]);
  });
});
