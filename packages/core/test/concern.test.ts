/**
 * The concern band, which for a long time did nothing.
 *
 * PRD §11.6: "*Concern* softens the next prompt, avoids numeric targets and
 * suggests professional support once." Every free-text write was screened and
 * the verdict was stored on the row, but no screen read it back — a person
 * whose writing landed in the band got exactly the same morning as everybody
 * else, including the fierce register's "No negotiation with yourself this
 * morning". These tests hold the three promises still.
 */
import { describe, expect, it } from 'vitest';
import { buildDawnBrief } from '../src/engines/coach';
import { SUPPORT_LINE, screen, shouldOfferSupport, withinSoftenWindow } from '../src/engines/safety';
import type { BookVersion, DaySummary, Move } from '../src/types';

const DAY = '2026-09-11';

const book = {
  firstSentence: 'It is 6:40 and the kitchen is still blue.',
} as unknown as BookVersion;

const yesterday: DaySummary = {
  day: '2026-09-10',
  planned: 2,
  done: 1,
  score: 62,
  evidenceCount: 1,
  moodWord: 'Tired',
  proof: 'Went anyway. Rained the whole way.',
  gladOf: null,
  sealedAt: '2026-09-10T21:40:00.000Z',
  safetyRisk: 'none',
} as unknown as DaySummary;

const move = {
  id: 'mv_1',
  goalId: 'g_1',
  planId: 'p_1',
  title: 'Out the back door at 6:40',
  status: 'todo',
  order: 0,
  scheduledFor: DAY,
} as unknown as Move;

const ids = () => {
  let n = 0;
  return (p: string) => `${p}_${++n}`;
};

const base = {
  day: DAY,
  book,
  yesterday,
  moves: [move],
  analyses: [],
  persona: 'fierce' as const,
  score: 62,
  previousScore: 40,
};

describe('the concern band is a band, not a column in a table', () => {
  it('is what the screen actually returns for a flat week', () => {
    // The sentences that put somebody here. None of them is a crisis, and none
    // of them should be treated as one.
    for (const line of ['I feel hopeless about all of it', 'nobody would even notice', "I'm a failure"]) {
      expect(screen(line).risk, line).toBe('concern');
      expect(screen(line).action, line).toBe('soften');
    }
  });

  it('softens the register whatever persona is set', () => {
    const fierce = buildDawnBrief(base, ids());
    expect(fierce.today).toContain('No negotiation with yourself this morning');

    const softened = buildDawnBrief({ ...base, soften: true }, ids());
    expect(softened.today).not.toContain('No negotiation');
    expect(softened.today).toContain("When you're ready");
    // And it is still their move, in their words.
    expect(softened.today).toContain('out the back door at 6:40');
  });

  it('takes the number off the morning', () => {
    const normal = buildDawnBrief(base, ids());
    expect(normal.yesterday).toContain('Consistency 62');

    const softened = buildDawnBrief({ ...base, soften: true }, ids());
    expect(softened.yesterday).not.toMatch(/Consistency/);
    expect(softened.soften).toBe(true);
    // Their own proof line still comes back — that is evidence, not a target.
    expect(softened.yesterday).toContain('Rained the whole way');
    // And the app's own full stop is not landing on top of theirs.
    expect(softened.yesterday.trimEnd()).not.toMatch(/["”']\.$/);
  });

  it('names professional support once, and then not again', () => {
    expect(shouldOfferSupport(true, null)).toBe(true);
    expect(shouldOfferSupport(true, '2026-09-01T09:00:00.000Z')).toBe(false);
    expect(shouldOfferSupport(false, null)).toBe(false);

    const offered = buildDawnBrief({ ...base, soften: true, offerSupport: true }, ids());
    expect(offered.support).toBe(SUPPORT_LINE);

    const later = buildDawnBrief({ ...base, soften: true, offerSupport: false }, ids());
    expect(later.support).toBeNull();
    // Still softened, though. The offer is once; the softening lasts as long as
    // the band does.
    expect(later.soften).toBe(true);
  });

  it('leaves an ordinary morning entirely alone', () => {
    const b = buildDawnBrief(base, ids());
    expect(b.support).toBeNull();
    expect(b.soften).toBe(false);
  });

  it('holds the window open for the next morning and no longer', () => {
    // Written on the 10th, read on the morning of the 11th: this is the whole
    // point of "the next prompt".
    expect(withinSoftenWindow('2026-09-10', '2026-09-11')).toBe(true);
    expect(withinSoftenWindow('2026-09-11', '2026-09-11')).toBe(true);
    expect(withinSoftenWindow('2026-09-09', '2026-09-11')).toBe(false);
    // A day in the future is not a reason to soften today.
    expect(withinSoftenWindow('2026-09-12', '2026-09-11')).toBe(false);
    // Rubbish in, false out — never a thrown error on the morning path.
    expect(withinSoftenWindow('', '2026-09-11')).toBe(false);
    expect(withinSoftenWindow('not a day', '2026-09-11')).toBe(false);
  });

  it('crosses a month and a year boundary without arithmetic of its own', () => {
    expect(withinSoftenWindow('2026-08-31', '2026-09-01')).toBe(true);
    expect(withinSoftenWindow('2026-12-31', '2027-01-01')).toBe(true);
    expect(withinSoftenWindow('2026-12-30', '2027-01-01')).toBe(false);
  });

  it('does not put words in the support line that the app cannot back', () => {
    // It points at Settings, and Settings is where the helplines are. It does
    // not diagnose, promise, or name a condition.
    expect(SUPPORT_LINE).toContain('Settings');
    expect(SUPPORT_LINE).not.toMatch(/depress|anxiet|disorder|diagnos/i);
  });
});
