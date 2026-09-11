/**
 * The Goal Path (PRD §7.7).
 *
 * The one thing worth arguing about here: the dot is time, not progress. A dot
 * that moved with completions would put somebody who has done nothing at the
 * start of a route whose deadline is a fortnight away — which is the single
 * fact about their situation they most need to see. Time says where they are;
 * the nodes say what is actually behind them, and the picture is honest
 * because those two can disagree.
 */
import { describe, expect, it } from 'vitest';
import { distanceLabel, goalPath, pathEvidence } from '../src/engines/path';
import type { Evidence, Milestone, Plan } from '../src/types';

const milestone = (over: Partial<Milestone>): Milestone =>
  ({
    id: 'ms_1',
    planId: 'p_1',
    goalId: 'g_1',
    title: 'First two weeks',
    proof: 'one run in the ledger, any pace, checked on Sunday',
    proofSourceLineId: 'an_monitoring',
    targetDate: '2026-09-24',
    order: 0,
    reachedAt: null,
    ...over,
  }) as Milestone;

const plan = (milestones: Milestone[]): Plan =>
  ({
    id: 'p_1',
    goalId: 'g_1',
    version: 1,
    seasonWeeks: 12,
    status: 'active',
    createdAt: '2026-09-10T09:00:00.000Z',
    milestones,
    moves: [],
    obstaclePlans: [],
  }) as unknown as Plan;

describe('the route', () => {
  const p = plan([
    milestone({ id: 'ms_1', targetDate: '2026-09-24' }),
    milestone({ id: 'ms_2', title: 'Halfway', targetDate: '2026-10-24' }),
  ]);

  it('runs from the day the plan was made, not from today', () => {
    // A route whose start moves with the clock is not a route: the dot would
    // never advance and somebody two months in would see the beginning.
    const path = goalPath(p, '2026-10-10', '2026-12-10');
    expect(path.from).toBe('2026-09-10');
    expect(path.to).toBe('2026-12-10');
  });

  it('puts the dot where the calendar is', () => {
    const start = goalPath(p, '2026-09-10', '2026-12-10');
    const middle = goalPath(p, '2026-10-25', '2026-12-10');
    const end = goalPath(p, '2026-12-10', '2026-12-10');
    expect(start.at).toBe(0);
    expect(middle.at).toBeGreaterThan(0.4);
    expect(middle.at).toBeLessThan(0.6);
    expect(end.at).toBe(1);
  });

  it('does not run off either end when the day is outside the route', () => {
    expect(goalPath(p, '2026-01-01', '2026-12-10').at).toBe(0);
    expect(goalPath(p, '2027-06-01', '2026-12-10').at).toBe(1);
  });

  it('places every node along the same route', () => {
    const path = goalPath(p, '2026-10-10', '2026-12-10');
    expect(path.nodes).toHaveLength(2);
    for (const n of path.nodes) {
      expect(n.at).toBeGreaterThanOrEqual(0);
      expect(n.at).toBeLessThanOrEqual(1);
    }
    expect(path.nodes[0]!.at).toBeLessThan(path.nodes[1]!.at);
  });

  it('carries their own Monitoring line onto each node', () => {
    const path = goalPath(p, '2026-10-10', '2026-12-10');
    expect(path.nodes[0]!.proof).toContain('one run in the ledger');
  });

  it('names the next one not yet reached, and how far off it is', () => {
    const path = goalPath(p, '2026-09-20', '2026-12-10');
    expect(path.next?.node.id).toBe('ms_1');
    expect(path.next?.daysAway).toBe(4);
  });

  it('skips over one already reached', () => {
    const reached = plan([
      milestone({ id: 'ms_1', targetDate: '2026-09-24', reachedAt: '2026-09-23T20:00:00.000Z' }),
      milestone({ id: 'ms_2', title: 'Halfway', targetDate: '2026-10-24' }),
    ]);
    const path = goalPath(reached, '2026-09-25', '2026-12-10');
    expect(path.next?.node.id).toBe('ms_2');
    expect(path.nodes[0]!.reached).toBe(true);
  });

  it('has nothing to draw before there is a plan, and says so', () => {
    expect(goalPath(undefined, '2026-09-20').empty).toBe(true);
    expect(goalPath(plan([]), '2026-09-20', '2026-12-10').empty).toBe(true);
  });

  it('falls back to the last milestone when the goal has no target date', () => {
    const path = goalPath(p, '2026-09-20', null);
    expect(path.to).toBe('2026-10-24');
    expect(path.empty).toBe(false);
  });

  it('ignores a milestone whose date is not a date', () => {
    const messy = plan([milestone({ id: 'ms_1', targetDate: 'someday' }), milestone({ id: 'ms_2' })]);
    const path = goalPath(messy, '2026-09-20', '2026-12-10');
    expect(path.nodes.map((n) => n.id)).toEqual(['ms_2']);
  });
});

describe('how far off, in words', () => {
  it('answers the question that was asked', () => {
    expect(distanceLabel(0)).toBe('Today');
    expect(distanceLabel(1)).toBe('Tomorrow');
    expect(distanceLabel(9)).toBe('9 days');
  });

  it('treats a missed one as a fact, not an error', () => {
    expect(distanceLabel(-1)).toBe('Yesterday');
    expect(distanceLabel(-6)).toBe('6 days ago');
    expect(distanceLabel(-6)).not.toContain('-');
  });
});

describe('the last five things they did', () => {
  const ev = (over: Partial<Evidence>): Evidence =>
    ({ id: 'e', goalId: 'g_1', kind: 'move', text: 'x', day: '2026-09-20', createdAt: '2026-09-20T09:00:00.000Z', ...over }) as Evidence;

  it('is this goal only, newest first, and no more than five', () => {
    const rows = [
      ev({ id: 'a', createdAt: '2026-09-01T09:00:00.000Z' }),
      ev({ id: 'b', createdAt: '2026-09-06T09:00:00.000Z' }),
      ev({ id: 'c', createdAt: '2026-09-03T09:00:00.000Z' }),
      ev({ id: 'd', createdAt: '2026-09-05T09:00:00.000Z' }),
      ev({ id: 'e', createdAt: '2026-09-04T09:00:00.000Z' }),
      ev({ id: 'f', createdAt: '2026-09-02T09:00:00.000Z' }),
      ev({ id: 'other', goalId: 'g_2', createdAt: '2026-09-09T09:00:00.000Z' }),
    ];
    const out = pathEvidence(rows, 'g_1');
    expect(out).toHaveLength(5);
    expect(out.map((e) => e.id)).toEqual(['b', 'd', 'e', 'c', 'f']);
    expect(out.some((e) => e.goalId !== 'g_1')).toBe(false);
  });

  it('does not mutate what it was handed', () => {
    const rows = [ev({ id: 'a', createdAt: '2026-09-01T09:00:00.000Z' }), ev({ id: 'b' })];
    const before = rows.map((r) => r.id);
    pathEvidence(rows, 'g_1');
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});
