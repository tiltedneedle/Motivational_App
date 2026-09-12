import { describe, expect, it } from 'vitest';
import { fitLine, fitSentence } from '../src/fit';

describe('the lock screen line', () => {
  it('sets a short line large and a long one small, never smaller than a caption', () => {
    expect(fitLine('I will be out the back door before the kettle boils'.length)).toEqual({ fontSize: 26, lineHeight: 34 });
    expect(fitLine(100).fontSize).toBe(22);
    expect(fitLine(180).fontSize).toBe(19);
    expect(fitLine(400).fontSize).toBe(16);
  });

  it('steps down monotonically, so a longer line is never set larger', () => {
    let last = Infinity;
    for (let n = 0; n <= 500; n += 5) {
      const { fontSize, lineHeight } = fitLine(n);
      expect(fontSize).toBeLessThanOrEqual(last);
      expect(lineHeight).toBeGreaterThan(fontSize);
      last = fontSize;
    }
  });
});

describe("the Book's first sentence", () => {
  it('is a headline when short and steps down when it is a paragraph', () => {
    expect(fitSentence('It is 6:40 and the kitchen is still blue.'.length).fontSize).toBe(28);
    expect(fitSentence(120).fontSize).toBe(24);
    expect(fitSentence(300).fontSize).toBe(21);
    let last = Infinity;
    for (let n = 0; n <= 400; n += 10) {
      const { fontSize, lineHeight } = fitSentence(n);
      expect(fontSize).toBeLessThanOrEqual(last);
      expect(lineHeight).toBeGreaterThan(fontSize);
      last = fontSize;
    }
  });
});
