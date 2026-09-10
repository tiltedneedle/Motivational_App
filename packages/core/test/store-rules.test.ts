/**
 * The rules the store enforces, tested against the same pure functions the
 * store uses rather than against the store itself.
 *
 * The mobile store needs React Native and AsyncStorage to import, which is why
 * these behaviours had no tests at all — including the duplicate-goal merge,
 * which was a real bug found by the end-to-end run and then left unpinned. The
 * merge rule is a pure function over a list, so it is lifted here and the store
 * calls it. A bug fixed once should not be able to come back quietly.
 */
import { describe, expect, it } from 'vitest';
import { mergeGoalDrafts, type GoalDraft } from '../src/engines/goals';

const draft = (over: Partial<GoalDraft> = {}): GoalDraft => ({
  title: 'Half marathon',
  domain: 'health',
  horizon: 'This season',
  ...over,
});

describe('naming the same goal twice', () => {
  it('merges by name instead of making a second copy', () => {
    // The Interview names goals, and What I heard names them again from the
    // writing. Someone who calls it the same thing both times has one goal.
    const first = mergeGoalDrafts([], [draft()]);
    const second = mergeGoalDrafts(first, [draft({ sourceSpan: 'run a half marathon in the spring' })]);
    expect(second).toHaveLength(1);
    expect(second[0]?.sourceSpan).toBe('run a half marathon in the spring');
  });

  it('ignores case and surrounding space when matching', () => {
    const first = mergeGoalDrafts([], [draft({ title: 'Half Marathon' })]);
    const second = mergeGoalDrafts(first, [draft({ title: '  half marathon  ' })]);
    expect(second).toHaveLength(1);
    // The first spelling is the one kept: it is the one they saw.
    expect(second[0]?.title).toBe('Half Marathon');
  });

  it('keeps genuinely different goals apart', () => {
    const merged = mergeGoalDrafts([], [draft(), draft({ title: 'Learn guitar', domain: 'craft' })]);
    expect(merged).toHaveLength(2);
  });

  it('drops an empty title rather than creating a nameless goal', () => {
    expect(mergeGoalDrafts([], [draft({ title: '   ' })])).toHaveLength(0);
  });

  it('upgrades a bank title to an authored one when they write it themselves', () => {
    // A tapped option is the bank's words; typing it, or lifting it from their
    // own writing, makes it theirs, and the Book's authorship ratio counts it
    // differently.
    const tapped = mergeGoalDrafts([], [draft({ authored: false })]);
    expect(tapped[0]?.titleAuthored).toBe(false);

    const typed = mergeGoalDrafts(tapped, [draft({ authored: true })]);
    expect(typed[0]?.titleAuthored).toBe(true);
  });

  it('never downgrades an authored title back to a bank one', () => {
    const typed = mergeGoalDrafts([], [draft({ authored: true })]);
    const again = mergeGoalDrafts(typed, [draft({ authored: false })]);
    expect(again[0]?.titleAuthored).toBe(true);
  });

  it('fills in a real horizon over "No deadline" but does not overwrite one', () => {
    const vague = mergeGoalDrafts([], [draft({ horizon: 'No deadline' })]);
    const dated = mergeGoalDrafts(vague, [draft({ horizon: 'This season' })]);
    expect(dated[0]?.horizon).toBe('This season');

    const kept = mergeGoalDrafts(dated, [draft({ horizon: 'This year' })]);
    expect(kept[0]?.horizon).toBe('This season');
  });

  it('keeps the ranks contiguous from zero', () => {
    const merged = mergeGoalDrafts(
      [],
      [draft(), draft({ title: 'Learn guitar' }), draft({ title: 'Sleep before midnight' })],
    );
    expect(merged.map((g) => g.rank)).toEqual([0, 1, 2]);
  });
});
