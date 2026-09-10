/**
 * A move belongs to exactly one day, and a parked move comes back tomorrow.
 *
 * Both rules live in the mobile store, which cannot be imported here — it needs
 * React Native and AsyncStorage. So the rules themselves live in the core
 * package as pure functions over a list, the store calls them, and these tests
 * hold them still. Both were real defects: one let a day with no activity score
 * 100%, and the other dropped a parked move out of the product entirely.
 */
import { describe, expect, it } from 'vitest';
import { movesForDay, movesOpenOn, type DayMove } from '../src/engines/days';
import { dayOf, formatDay } from '../src/ids';
import { greeting } from '../src/engines/coach';

const BOUNDARY = 3;

const move = (over: Partial<DayMove> = {}): DayMove => ({
  id: 'mv_1',
  status: 'todo',
  scheduledFor: '2026-09-10',
  completedAt: null,
  ...over,
});

describe('which day a move counts on', () => {
  it('counts an open move on the day it was asked for', () => {
    const m = move({ scheduledFor: '2026-09-10' });
    expect(movesForDay([m], '2026-09-10', BOUNDARY)).toHaveLength(1);
    expect(movesForDay([m], '2026-09-11', BOUNDARY)).toHaveLength(0);
  });

  it('counts a finished move on the day it was finished, and only there', () => {
    // Sealed the Book on the 10th, the first move dated the 11th, and the
    // person did it that same evening. It used to count on both days, and the
    // 11th then scored 100% having had no activity at all.
    const early = move({ status: 'done', scheduledFor: '2026-09-11', completedAt: '2026-09-10T20:00:00Z' });
    expect(movesForDay([early], '2026-09-10', BOUNDARY)).toHaveLength(1);
    expect(movesForDay([early], '2026-09-11', BOUNDARY)).toHaveLength(0);
  });

  it('counts a late one on the day it was actually done', () => {
    const late = move({ status: 'done', scheduledFor: '2026-09-08', completedAt: '2026-09-10T09:00:00Z' });
    expect(movesForDay([late], '2026-09-08', BOUNDARY)).toHaveLength(0);
    expect(movesForDay([late], '2026-09-10', BOUNDARY)).toHaveLength(1);
  });

  it('honours the day boundary, so 1am belongs to the night before', () => {
    const owl = move({ status: 'done', scheduledFor: '2026-09-10', completedAt: '2026-09-11T01:30:00' });
    expect(movesForDay([owl], '2026-09-10', BOUNDARY)).toHaveLength(1);
  });

  it('counts a parked move on the day it was asked for', () => {
    const parked = move({ status: 'skip', scheduledFor: '2026-09-10' });
    expect(movesForDay([parked], '2026-09-10', BOUNDARY)).toHaveLength(1);
  });
});

describe('what Today still asks for', () => {
  it('brings a parked move forward instead of losing it', () => {
    // "Not today" is not "never". A filter that kept only `todo` dropped a
    // parked move out of the app the next morning, and nothing anywhere could
    // complete it again.
    const parked = move({ status: 'skip', scheduledFor: '2026-09-10' });
    expect(movesOpenOn([parked], '2026-09-11', BOUNDARY)).toHaveLength(1);
  });

  it('keeps an overdue move that was never touched', () => {
    const overdue = move({ scheduledFor: '2026-09-01' });
    expect(movesOpenOn([overdue], '2026-09-10', BOUNDARY)).toHaveLength(1);
  });

  it('does not bring back something closed on an earlier day', () => {
    const yesterday = move({ status: 'done', scheduledFor: '2026-09-09', completedAt: '2026-09-09T18:00:00Z' });
    expect(movesOpenOn([yesterday], '2026-09-10', BOUNDARY)).toHaveLength(0);
  });

  it('shows what was finished today, so the day reads as done', () => {
    const done = move({ status: 'done', scheduledFor: '2026-09-10', completedAt: '2026-09-10T07:00:00Z' });
    expect(movesOpenOn([done], '2026-09-10', BOUNDARY)).toHaveLength(1);
  });

  it('does not show a move dated for a later day', () => {
    const later = move({ scheduledFor: '2026-09-20' });
    expect(movesOpenOn([later], '2026-09-10', BOUNDARY)).toHaveLength(0);
  });

  it('keeps an undated move, which is asked for whenever it is looked at', () => {
    const undated = move({ scheduledFor: null });
    expect(movesOpenOn([undated], '2026-09-10', BOUNDARY)).toHaveLength(1);
  });
});

/**
 * The two places the app used to read the wall clock instead of its own day.
 *
 * `dayOf` is the app's definition of "today": a day runs from the boundary
 * hour to the boundary hour, so somebody writing at half past midnight is
 * still in yesterday. Today's header printed `new Date()` instead, so the
 * screen said Friday while everything sealed on it filed itself under
 * Thursday. And the greeting was the fixed string "Good morning." at every
 * hour of the day, including the evening when the day is sealed.
 */
describe('the app day, as the person sees it', () => {
  it('is yesterday before the boundary hour', () => {
    expect(dayOf(new Date(2026, 8, 11, 1, 8), 4)).toBe('2026-09-10');
    expect(dayOf(new Date(2026, 8, 11, 3, 59), 4)).toBe('2026-09-10');
    expect(dayOf(new Date(2026, 8, 11, 4, 0), 4)).toBe('2026-09-11');
    expect(dayOf(new Date(2026, 8, 11, 23, 30), 4)).toBe('2026-09-11');
  });

  it('is printed by the header in the same words as the ledger', () => {
    // Both go through formatDay, so "THU 10 SEP" in one place is "THU 10 SEP"
    // in the other. The header used to be "Fri Sep 11" — a different format of
    // a different day.
    expect(formatDay('2026-09-10', { weekday: true, today: '2026-09-10' })).toBe('Thu 10 Sep');
    expect(formatDay(dayOf(new Date(2026, 8, 11, 1, 8), 4), { weekday: true, today: '2026-09-10' })).toBe(
      'Thu 10 Sep',
    );
  });

  it('greets by the hour, and does not wish anybody a good morning at nine at night', () => {
    expect(greeting(new Date(2026, 8, 11, 2, 0))).toBe('Still up.');
    expect(greeting(new Date(2026, 8, 11, 8, 0))).toBe('Good morning.');
    expect(greeting(new Date(2026, 8, 11, 13, 0))).toBe('Good afternoon.');
    expect(greeting(new Date(2026, 8, 11, 21, 0))).toBe('Good evening.');
  });

  it('uses the name when there is one, and does not print an empty comma when there is not', () => {
    expect(greeting(new Date(2026, 8, 11, 8, 0), 'Sam')).toBe('Good morning, Sam.');
    expect(greeting(new Date(2026, 8, 11, 8, 0), '   ')).toBe('Good morning.');
    expect(greeting(new Date(2026, 8, 11, 8, 0), undefined)).toBe('Good morning.');
  });
});
