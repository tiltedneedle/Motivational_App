/**
 * Which day a move counts on, and what a day is still asking for.
 *
 * Two rules that look like one line each and were wrong in a way that mattered.
 *
 * The first: a move belongs to exactly ONE day. Written as two overlapping
 * conditions — scheduled for this day, or completed on this day — a move
 * finished early counted on both, and the second day scored a full 100% having
 * had no activity at all. The Consistency Score is the one number in this
 * product that must not be able to flatter anybody, so the two cases are made
 * exclusive rather than nearly so.
 *
 * The second: parking a move says "not today", not "never". A filter that kept
 * only `todo` dropped a parked move out of the product the next morning — the
 * Goal screen listed it with no control on it, so nothing anywhere could ever
 * complete it again. What must not come back is a move closed on an earlier
 * day; that is history.
 *
 * They live here rather than in the mobile store so they can be tested: the
 * store needs React Native and AsyncStorage to import.
 */
import { dayOf } from '../ids';
import type { MoveStatus } from '../types';

/** The part of a Move these rules read. */
export interface DayMove {
  id: string;
  status: MoveStatus;
  scheduledFor: string | null;
  completedAt: string | null;
}

/** The day a finished move was actually closed on, honouring the boundary. */
export function closedOn(m: DayMove, boundaryHour: number): string | null {
  if (m.status !== 'done' || !m.completedAt) return null;
  const at = new Date(m.completedAt);
  if (Number.isNaN(at.getTime())) return null;
  return dayOf(at, boundaryHour);
}

/**
 * The moves that count toward one day's score.
 *
 * A finished move counts on the day it was finished. Anything still open —
 * waiting or parked — counts on the day it was asked for.
 */
export function movesForDay<T extends DayMove>(moves: readonly T[], day: string, boundaryHour: number): T[] {
  return moves.filter((m) => (m.status === 'done' ? closedOn(m, boundaryHour) === day : m.scheduledFor === day));
}

/**
 * The moves Today should show: everything still open and due or overdue, plus
 * what was finished today so the screen shows the day's work.
 *
 * An undated move is asked for whenever it is looked at; that is what having no
 * date means.
 */
export function movesOpenOn<T extends DayMove>(moves: readonly T[], day: string, boundaryHour: number): T[] {
  const open = (m: T) => m.status === 'todo' || m.status === 'skip';
  return moves.filter(
    (m) => (open(m) && (!m.scheduledFor || m.scheduledFor <= day)) || closedOn(m, boundaryHour) === day,
  );
}
