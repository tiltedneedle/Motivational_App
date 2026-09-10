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
