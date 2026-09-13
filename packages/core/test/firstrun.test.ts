import { describe, expect, it } from 'vitest';
import { analysisPlan, firstRunCaption, firstRunStep } from '../src/engines/firstrun';
import type { BookVersion, Goal, GoalAnalysis } from '../src/types';

const goal = (id: string, rank: number, over: Partial<Goal> = {}): Goal => ({
  id,
  title: `goal ${rank}`,
  domain: 'health',
  horizon: 'Three months',
  targetDate: null,
  rank,
  status: 'named',
  createdAt: '2026-09-09T20:00:00.000Z',
  ...over,
});

const line = (goalId: string, kind: GoalAnalysis['kind'], text = 'a line'): GoalAnalysis => ({
  id: `${goalId}-${kind}`,
  goalId,
  kind,
  track: 'starter',
  framingId: null,
  line: text,
  specificity: 0.5,
  followupShown: false,
  writtenAt: '2026-09-09T20:05:00.000Z',
});

describe('where somebody is on the first-run path', () => {
  it('starts at the Interview with nothing', () => {
    const s = firstRunStep({ goals: [], hasIdeal: false, hasTitle: false, analyses: [], books: [], track: 'starter' });
    expect(s.step).toBe('interview');
    expect(s.route).toBe('/consent');
  });

  it('goes straight to the Interview once consent is given', () => {
    const s = firstRunStep({ goals: [], hasIdeal: false, hasTitle: false, consented: true, analyses: [], books: [], track: 'starter' });
    expect(s.step).toBe('interview');
    expect(s.route).toBe('/interview');
  });

  it('points at the Fifteen once goals are named', () => {
    const s = firstRunStep({ goals: [goal('g1', 0)], hasIdeal: false, hasTitle: false, analyses: [], books: [], track: 'starter' });
    expect(s.step).toBe('fifteen');
    expect(s.route).toBe('/authoring');
    expect(firstRunCaption(s, 1)).toContain('One goal is named');
  });

  it('points at the first unwritten stone, in the order the stones are asked', () => {
    const goals = [goal('g1', 0), goal('g2', 1)];
    const s = firstRunStep({ goals, hasIdeal: true, hasTitle: true, analyses: [line('g1', 'motives'), line('g1', 'impact')], books: [], track: 'starter' });
    expect(s.step).toBe('stones');
    if (s.step === 'stones') {
      expect(s.goalId).toBe('g1');
      expect(s.kind).toBe('strategies');
      expect(s.route).toBe('/stone?goal=g1&kind=strategies');
      expect(s.written).toBe(2);
      expect(s.total).toBe(10);
      expect(firstRunCaption(s, 2)).toBe('2 of 10 stones are written. The rest are where you left them.');
    }
  });

  it('counts the Starter track the way the stone screen does: two stones past the top three', () => {
    expect(analysisPlan(2, 'starter')).toHaveLength(5);
    expect(analysisPlan(3, 'starter')).toHaveLength(2);
    expect(analysisPlan(3, 'full')).toHaveLength(5);
    const goals = [goal('g1', 0), goal('g2', 1), goal('g3', 2), goal('g4', 3)];
    const s = firstRunStep({ goals, hasIdeal: true, hasTitle: true, analyses: [], books: [], track: 'starter' });
    if (s.step === 'stones') expect(s.total).toBe(17);
  });

  it('does not count a blank line as written, and skips an archived goal', () => {
    const goals = [goal('g1', 0), goal('g2', 1, { status: 'archived' })];
    const s = firstRunStep({ goals, hasIdeal: true, hasTitle: true, analyses: [line('g1', 'motives', '   ')], books: [], track: 'starter' });
    if (s.step === 'stones') {
      expect(s.kind).toBe('motives');
      expect(s.total).toBe(5);
    }
  });

  it('points at the Portrait and the seal once every stone is written', () => {
    const goals = [goal('g1', 0)];
    const analyses = (['motives', 'impact', 'strategies', 'obstacles', 'monitoring'] as const).map((k) => line('g1', k));
    const s = firstRunStep({ goals, hasIdeal: true, hasTitle: true, analyses, books: [], track: 'starter' });
    expect(s.step).toBe('seal');
    expect(s.route).toBe('/portrait?goal=g1&next=/seal-book');
  });

  it('is done once there is a Book', () => {
    const s = firstRunStep({ goals: [goal('g1', 0)], hasIdeal: true, hasTitle: true, analyses: [], books: [{} as BookVersion], track: 'starter' });
    expect(s.step).toBe('done');
  });

  it('goes to the order and the title between the Fifteen and the first stone', () => {
    const s = firstRunStep({ goals: [goal('g1', 0)], hasIdeal: true, hasTitle: false, analyses: [], books: [], track: 'starter' });
    expect(s.step).toBe('order');
    expect(s.route).toBe('/rank');
    // Once a stone is written that screen is behind them, titled or not.
    const past = firstRunStep({ goals: [goal('g1', 0)], hasIdeal: true, hasTitle: false, analyses: [line('g1', 'motives')], books: [], track: 'starter' });
    expect(past.step).toBe('stones');
  });
});
