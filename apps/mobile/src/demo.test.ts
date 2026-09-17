import { describe, expect, it } from 'vitest';
import { DEMO_SCENARIOS, shiftFor, shifted } from './demo';

describe('the demo build moves a fixture to today', () => {
  it('shifts every day and instant by the same number of days, keys included', () => {
    const fixture = {
      books: [{ sealedAt: '2026-06-14T21:03:11.000Z', firstSentence: 'It is 6:40 and the kitchen is still blue.' }],
      days: { '2026-09-11': { day: '2026-09-11', proof: 'Out before the kettle. Cold, and I did not mind.' } },
      plans: [{ moves: [{ scheduledFor: '2026-09-12', title: 'Tuesday: at 6:40, out the back door' }] }],
      coachTurns: { '2026-09-10': 3 },
      profile: { wakeTime: '07:00', track: 'starter' },
    };
    const moved = shifted(fixture as Record<string, unknown>, 5) as unknown as {
      books: { sealedAt: string; firstSentence: string }[];
      days: Record<string, { day: string; proof: string }>;
      plans: { moves: { scheduledFor: string; title: string }[] }[];
      coachTurns: Record<string, number>;
      profile: Record<string, string>;
    };
    expect(moved.books[0]!.sealedAt).toBe('2026-06-19T21:03:11.000Z');
    expect(moved.books[0]!.firstSentence).toBe('It is 6:40 and the kitchen is still blue.');
    expect(Object.keys(moved.days)).toEqual(['2026-09-16']);
    expect(moved.days['2026-09-16']!.day).toBe('2026-09-16');
    expect(moved.days['2026-09-16']!.proof).toBe('Out before the kettle. Cold, and I did not mind.');
    expect(moved.plans[0]!.moves[0]!.scheduledFor).toBe('2026-09-17');
    expect(moved.coachTurns).toEqual({ '2026-09-15': 3 });
    // A clock time and a track are not dates.
    expect(moved.profile).toEqual({ wakeTime: '07:00', track: 'starter' });
    // Across a month boundary, and backwards.
    expect(shifted('2026-09-30', 2)).toBe('2026-10-02');
    expect(shifted('2026-03-01', -1)).toBe('2026-02-28');
    expect(shifted(fixture, 0)).toBe(fixture);
  });

  it("counts the days from the fixture's today to the demo's, by the app's day", () => {
    // 01:00 on the 18th is still the 17th before the three o'clock boundary.
    expect(shiftFor('2026-09-12', 3, new Date('2026-09-17T12:00:00'))).toBe(5);
    expect(shiftFor('2026-09-12', 3, new Date('2026-09-18T01:00:00'))).toBe(5);
    expect(shiftFor('2026-09-19', 3, new Date('2026-09-17T12:00:00'))).toBe(-2);
  });

  it('names its scenarios once each, with a fixture and a landing', () => {
    expect(new Set(DEMO_SCENARIOS.map((s) => s.id)).size).toBe(DEMO_SCENARIOS.length);
    for (const s of DEMO_SCENARIOS) {
      expect(s.anchor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.route.startsWith('/')).toBe(true);
      expect(s.shows.length).toBeGreaterThan(20);
    }
  });
});
