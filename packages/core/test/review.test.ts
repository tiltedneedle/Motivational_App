/**
 * The Horizon Review says four things and invents none of them: a number it
 * computed, a milestone with a date, a sentence the person wrote, and a
 * count of what a replan would change.
 */
import { describe, expect, it } from 'vitest';
import { horizonReview } from '../src/engines/review';
import type { DaySummary, Goal, Plan } from '../src/types';

const TODAY = '2026-09-20';
const day = (d: string, extra: Partial<DaySummary> = {}): DaySummary =>
  ({ day: d, planned: 1, done: 1, skipped: 0, partial: 0, evidenceCount: 1, sealedAt: `${d}T21:00:00.000Z`, moodWord: null, proof: null, gladOf: null, ...extra }) as DaySummary;

const goal = { id: 'g1', title: '5 km race', domain: 'health', horizon: 'Three months', targetDate: '2026-12-10', status: 'active', rank: 0, createdAt: '2026-09-10T20:00:00.000Z' } as Goal;
const plan = {
  id: 'p1',
  goalId: 'g1',
  version: 1,
  seasonWeeks: 12,
  status: 'active',
  createdAt: '2026-09-10T20:00:00.000Z',
  replannedAt: [],
  milestones: [
    { id: 'm1', planId: 'p1', goalId: 'g1', title: 'First two weeks', proof: 'one run in the ledger', proofSourceLineId: null, targetDate: '2026-09-24', order: 0, reachedAt: null },
  ],
  moves: [],
  obstaclePlans: [],
} as Plan;

describe('the Horizon Review', () => {
  it('quotes a proof line from the week rather than describing the week', () => {
    const out = horizonReview({
      today: TODAY,
      days: [day('2026-09-16', { proof: 'Went anyway. Rained the whole way.' }), day('2026-09-18')],
      goals: [goal],
      plans: [plan],
      proposals: [{ goalId: 'g1', changes: 1 }],
    });
    expect(out.insight?.text).toContain('Wed 16 Sep');
    expect(out.insight?.text).toContain('“Went anyway. Rained the whole way.”');
    expect(out.insight?.quotes).toEqual(['Went anyway. Rained the whole way.']);
    expect(out.next[0]).toMatchObject({ goalTitle: '5 km race', title: 'First two weeks', daysAway: 4 });
    expect(out.replans).toEqual([{ goalId: 'g1', goalTitle: '5 km race', changes: 1 }]);
    expect(out.consistency.line).toBe(`Consistency ${out.consistency.score}. The first week in the ledger.`);
  });

  it('calls a change a change only when there was a week before it', () => {
    const out = horizonReview({
      today: TODAY,
      days: [day('2026-09-05', { planned: 2, done: 1 }), day('2026-09-18')],
      goals: [],
      plans: [],
      proposals: [],
    });
    expect(out.consistency.line).toMatch(/^Consistency \d+, (up from|down from|the same as)/);
  });

  it('never quotes a flagged proof line, and falls back to a count', () => {
    const out = horizonReview({
      today: TODAY,
      days: [day('2026-09-16', { proof: 'a line the screen refused', safetyRisk: 'crisis' }), day('2026-09-18', { planned: 2, done: 1 })],
      goals: [goal],
      plans: [plan],
      proposals: [],
    });
    expect(out.insight?.text).not.toContain('refused');
    expect(out.insight?.text).toBe('This week you kept 2 of 3 moves asked for.');
    expect(out.replans).toEqual([]);
  });

  it('says plainly when there is nothing yet', () => {
    const out = horizonReview({ today: TODAY, days: [], goals: [], plans: [], proposals: [] });
    expect(out.consistency.line).toBe('No days in the ledger yet.');
    expect(out.insight).toBeNull();
    expect(out.next).toEqual([]);
  });
});
