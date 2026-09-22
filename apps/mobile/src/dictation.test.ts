/**
 * The one text that has to come out of a results list, whatever the browser
 * did with it. Each case is a shape a real browser produces; the wrong
 * answer in every one of them was the sentence written twice or the first
 * word lost.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const { sessionText, sessionStretches } = await import('./dictation');

const list = (...rows: [string, boolean][]) =>
  rows.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })) as unknown as ArrayLike<{
    isFinal: boolean;
    0?: { transcript: string };
  }>;

describe('sessionText', () => {
  it('Chrome desktop: a list that grows a phrase at a time, finished ones first', () => {
    expect(sessionText(list(['hello', false]))).toBe('hello');
    expect(sessionText(list(['hello how are you doing', false]))).toBe('hello how are you doing');
    expect(sessionText(list(['hello how are you doing', true], [' I am fine', false]))).toBe('hello how are you doing I am fine');
    expect(sessionText(list(['hello how are you doing', true], [' I am fine', true], [' thanks', false]))).toBe(
      'hello how are you doing I am fine thanks',
    );
  });

  it('Safari: one result whose text grows', () => {
    expect(sessionText(list(['Hello.', false]))).toBe('Hello.');
    expect(sessionText(list(['Hello. How are you doing?', false]))).toBe('Hello. How are you doing?');
    expect(sessionText(list(['Hello. How are you doing?', true]))).toBe('Hello. How are you doing?');
  });

  it('Android Chrome: what was finished is sent again at the head of the next interim', () => {
    expect(sessionText(list(['hello', true], ['hello how are you', false]))).toBe('hello how are you');
    expect(sessionText(list(['hello', true], ['hello how are you doing', true]))).toBe('hello how are you doing');
    // Re-sent with different punctuation or case: still the same words.
    expect(sessionText(list(['Hello.', true], ['hello, how are you doing', false]))).toBe('Hello. how are you doing');
  });

  it('a new phrase that does not repeat the total goes after it', () => {
    expect(sessionText(list(['I went out', true], ['and it rained', false]))).toBe('I went out and it rained');
  });

  it('empty results are nothing', () => {
    expect(sessionText(list())).toBe('');
    expect(sessionText(list(['', false], ['  ', true]))).toBe('');
  });
});

describe('sessionStretches', () => {
  it('Chrome: each result is its own stretch', () => {
    expect(sessionStretches(list(['hello', true], [' how are you', false]))).toEqual([
      { text: 'hello', final: true },
      { text: 'how are you', final: false },
    ]);
  });

  it('Android: the total sent again is reduced to what is new in it', () => {
    expect(sessionStretches(list(['hello', true], ['hello how are you', false]))).toEqual([
      { text: 'hello', final: true },
      { text: 'how are you', final: false },
    ]);
    // The same words again with nothing new: the earlier stretch, now final.
    expect(sessionStretches(list(['hello', false], ['hello', true]))).toEqual([{ text: 'hello', final: true }]);
    // The stretch just finished said again at the head of the next, not the whole session.
    expect(sessionStretches(list(['I went out', true], ['and it rained', true], ['and it rained on me', false]))).toEqual([
      { text: 'I went out', final: true },
      { text: 'and it rained', final: true },
      { text: 'on me', final: false },
    ]);
  });

  it('Safari: one growing result is one stretch', () => {
    expect(sessionStretches(list(['Hello. How are you?', false]))).toEqual([{ text: 'Hello. How are you?', final: false }]);
  });
});
