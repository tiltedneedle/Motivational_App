/**
 * The rules that decide whether this app is the kind people mute (PRD §7.11).
 *
 * Every one of these is a promise: one per moment, nothing inside quiet hours,
 * never a count of what was missed, a missed one is never resent, and after a
 * gap exactly one gentle word on day three and none after.
 *
 * They are tested here rather than on a device because a device is the one
 * place they cannot be tested — the failure mode is a notification that
 * arrives when it should not have, weeks later, to somebody who then turns
 * them all off.
 */
import { describe, expect, it } from 'vitest';
import {
  CHRONOTYPES,
  DEFAULT_QUIET,
  chronotypeOf,
  clockLabel,
  fewer,
  boundaryFor,
  quietFor,
  shiftDaysLabel,
  timesFor,
  isQuiet,
  outOfQuiet,
  planNotices,
  toSchedule,
  withoutMuted,
  type Moment,
  type NoticeInput,
} from '../src/engines/notifications';
import type { BookVersion, DaySummary, Move } from '../src/types';

const MONDAY = '2026-09-14';
const SUNDAY = '2026-09-13';

const move = (over: Partial<Move> = {}): Move =>
  ({
    id: 'mv_1',
    goalId: 'g_1',
    milestoneId: null,
    title: 'Out the back door at 6:40',
    effort: 'S',
    energy: 'low',
    ifThen: null,
    scheduledFor: MONDAY,
    week: 1,
    status: 'todo',
    completedAt: null,
    minVersion: null,
    sourceLineId: 'an_1',
    order: 0,
    ...over,
  }) as Move;

const book = {
  firstSentence: 'It is 6:40 and the kitchen is still blue.',
  iWill: 'I will be out the back door before the kettle boils',
} as unknown as BookVersion;

const base: NoticeInput = {
  day: MONDAY,
  wakeTime: '07:30',
  eveningTime: '21:30',
  sundayHour: 10,
  persona: 'straight',
  book,
  moves: [move()],
  yesterday: null,
  daysSinceAnything: 0,
};

describe('quiet hours', () => {
  it('follow the person’s own day (PRD §7.12): an hour after the evening line until the morning one', () => {
    // The defaults are the PRD's 22:00–07:00 exactly.
    expect(quietFor({ wakeTime: '07:00', eveningTime: '21:30' })).toEqual(DEFAULT_QUIET);
    // A lark hears the morning line at 05:30, not at seven.
    const lark = quietFor({ wakeTime: '05:30', eveningTime: '20:30' });
    expect(lark).toEqual({ from: 21, to: 5 });
    expect(outOfQuiet('05:30', lark)).toBe('05:30');
    // An owl's 22:30 evening line is not pushed to the next morning.
    const owl = quietFor({ wakeTime: '08:30', eveningTime: '22:30' });
    expect(owl).toEqual({ from: 23, to: 8 });
    expect(outOfQuiet('22:30', owl)).toBe('22:30');
    expect(outOfQuiet('08:30', owl)).toBe('08:30');
    // A Sunday at eight with a morning at nine is not inside the quiet.
    expect(quietFor({ wakeTime: '09:00', eveningTime: '21:30', sundayHour: 8 })).toEqual({ from: 22, to: 8 });
    expect(outOfQuiet('08:00', quietFor({ wakeTime: '09:00', eveningTime: '21:30', sundayHour: 8 }))).toBe('08:00');
    // A Sunday hour outside the window leaves it alone: an evening line after
    // midnight with a Sunday hour before it must not wrap the quiet round
    // over the morning.
    expect(quietFor({ wakeTime: '07:00', eveningTime: '01:00', sundayHour: 0 })).toEqual({ from: 2, to: 7 });
    expect(quietFor({ wakeTime: '07:00', eveningTime: '21:30', sundayHour: 12 })).toEqual({ from: 22, to: 7 });
    expect(quietFor({ wakeTime: '07:00', eveningTime: '21:30', sundayHour: 22 })).toEqual({ from: 22, to: 7 });
    // No room for quiet at all: the default, never a window over the whole clock.
    expect(quietFor({ wakeTime: '01:00', eveningTime: '00:15' })).toEqual(DEFAULT_QUIET);
    // Rubbish falls back too.
    expect(quietFor({ wakeTime: 'dawn', eveningTime: '21:30' })).toEqual(DEFAULT_QUIET);
  });

  it('keeps the shift’s hours on the shift’s days, and the day’s own quiet with them (PRD §7.12)', () => {
    const profile = { wakeTime: '07:00', eveningTime: '21:30', shiftDays: [2, 3], shiftWakeTime: '13:00', shiftEveningTime: '02:00' };
    // 2026-09-16 is a Wednesday (3); the 17th a Thursday (4).
    expect(timesFor(profile, '2026-09-16')).toEqual({ wakeTime: '13:00', eveningTime: '02:00', shift: true });
    expect(timesFor(profile, '2026-09-17')).toEqual({ wakeTime: '07:00', eveningTime: '21:30', shift: false });
    // A night-shift Wednesday's quiet runs from three in the morning to one in
    // the afternoon; the Sunday hour is a Sunday's business.
    expect(quietFor({ ...timesFor(profile, '2026-09-16'), sundayHour: 10, onSunday: false })).toEqual({ from: 3, to: 13 });
    expect(quietFor({ ...timesFor(profile, '2026-09-16'), sundayHour: 10, onSunday: true })).toEqual({ from: 3, to: 10 });
    // The planner hears the shift's morning line at the shift's morning.
    const shiftDay = timesFor(profile, '2026-09-16');
    const notices = planNotices({ ...base, day: '2026-09-16', wakeTime: shiftDay.wakeTime, eveningTime: shiftDay.eveningTime, quiet: quietFor({ ...shiftDay, sundayHour: 10, onSunday: false }) });
    expect(notices.find((n) => n.moment === 'wake')?.at).toBe('2026-09-16T13:00:00');
    // The evening line at two in the morning is the night AFTER the day: the
    // next calendar date. On the day's own date it was already past and never
    // fired; the schedule at half past one that afternoon keeps it.
    expect(notices.find((n) => n.moment === 'evening')?.at).toBe('2026-09-17T02:00:00');
    expect(toSchedule(notices, new Date('2026-09-16T13:30:00')).map((n) => n.moment)).toContain('evening');
    // A plain evening stays on its own date.
    const plain = planNotices({ ...base, day: '2026-09-16', wakeTime: '07:00', eveningTime: '21:30' });
    expect(plain.find((n) => n.moment === 'evening')?.at).toBe('2026-09-16T21:30:00');
    // The boundary a small-hours evening needs; none for an ordinary one.
    expect(boundaryFor('02:00', 3)).toBeNull();
    expect(boundaryFor('02:00', 1)).toBe(3);
    expect(boundaryFor('00:30', 1)).toBeNull();
    expect(boundaryFor('23:00', 1)).toBeNull();
    // No shift days: every day the same.
    expect(timesFor({ wakeTime: '07:00', eveningTime: '21:30' }, '2026-09-16').shift).toBe(false);
    expect(shiftDaysLabel([1, 2, 5])).toBe('Mondays, Tuesdays and Fridays');
    expect(shiftDaysLabel([0])).toBe('Sundays');
    expect(shiftDaysLabel([])).toBe('');
  });

  it('names the chronotype only when every time matches it', () => {
    for (const c of CHRONOTYPES) expect(chronotypeOf(c)).toBe(c.id);
    expect(chronotypeOf({ wakeTime: '07:00', eveningTime: '21:30', sundayHour: 10 })).toBe('middle');
    expect(chronotypeOf({ wakeTime: '07:30', eveningTime: '21:30', sundayHour: 10 })).toBeNull();
    expect(clockLabel('07:00')).toBe('7:00');
    expect(clockLabel('21:30')).toBe('21:30');
  });

  it('wraps midnight', () => {
    expect(isQuiet(23)).toBe(true);
    expect(isQuiet(2)).toBe(true);
    expect(isQuiet(6)).toBe(true);
    expect(isQuiet(7)).toBe(false);
    expect(isQuiet(21)).toBe(false);
  });

  it('moves a time out of the window rather than dropping it', () => {
    // Somebody whose wake time is 06:30 has told the app when their morning is.
    // Silently cancelling the one line it had for them, because the default
    // quiet hours have not ended, is the app's preference beating theirs.
    expect(outOfQuiet('06:30')).toBe('07:00');
    expect(outOfQuiet('23:15')).toBe('07:00');
    expect(outOfQuiet('07:30')).toBe('07:30');
    expect(outOfQuiet('21:30')).toBe('21:30');
  });

  it('has no way to spell "quiet all day", because that is what muting is for', () => {
    // A window that swallowed the whole clock would cancel everything while
    // Settings still said notifications were on. Equal ends mean no window.
    expect(isQuiet(8, { from: 0, to: 24 })).toBe(false);
    expect(outOfQuiet('08:00', { from: 0, to: 24 })).toBe('08:00');
    expect(isQuiet(8, { from: 9, to: 9 })).toBe(false);
  });

  it('says no on nonsense rather than guessing', () => {
    expect(outOfQuiet('')).toBe(null);
    expect(outOfQuiet('25:00')).toBe(null);
    expect(outOfQuiet('07:99')).toBe(null);
    expect(outOfQuiet('half past seven')).toBe(null);
  });

  it('never hands back a time inside the window it was asked to leave', () => {
    for (let h = 0; h < 24; h++) {
      for (const q of [DEFAULT_QUIET, { from: 1, to: 5 }, { from: 20, to: 6 }, { from: 12, to: 13 }]) {
        const out = outOfQuiet(`${String(h).padStart(2, '0')}:15`, q);
        if (out === null) continue;
        expect(isQuiet(Number(out.slice(0, 2)), q), `${h} in ${JSON.stringify(q)} -> ${out}`).toBe(false);
      }
    }
  });

  it('nothing planned ever lands inside the window', () => {
    const notices = planNotices({ ...base, wakeTime: '05:00', eveningTime: '23:00', sundayHour: 3 });
    for (const n of notices) {
      const hour = Number(n.at.slice(11, 13));
      expect(isQuiet(hour, DEFAULT_QUIET), `${n.moment} at ${n.at}`).toBe(false);
    }
  });
});

describe('what one day is allowed to contain', () => {
  it('is at most one per moment', () => {
    const notices = planNotices({
      ...base,
      day: SUNDAY,
      milestone: { title: 'First two weeks', proof: 'one run in the ledger, any pace' },
    });
    const moments = notices.map((n) => n.moment);
    expect(new Set(moments).size).toBe(moments.length);
  });

  it('quotes the person rather than describing them', () => {
    const [wake] = planNotices(base);
    expect(wake?.body).toContain('“Out the back door at 6:40”');
    expect(wake?.quotes[0]).toBe('Out the back door at 6:40');
  });

  it('does not lowercase a weekday out of somebody own sentence', () => {
    const [wake] = planNotices({ ...base, moves: [move({ title: 'Tuesday: at 6:40, out the back door' })] });
    expect(wake?.body).toContain('Tuesday: at 6:40');
  });

  it('never counts what was missed', () => {
    const notices = planNotices({
      ...base,
      moves: [move(), move({ id: 'mv_2', order: 1 }), move({ id: 'mv_3', order: 2 })],
    });
    const evening = notices.find((n) => n.moment === 'evening');
    expect(evening).toBeDefined();
    expect(evening!.body).not.toMatch(/\b0 of\b|\bmissed\b|\bfailed\b|\b3\b/);
    expect(evening!.body).toContain('ledger');
  });

  it('says nothing in the evening once the day is sealed', () => {
    const sealed = { day: MONDAY, sealedAt: '2026-09-14T21:00:00.000Z' } as unknown as DaySummary;
    const notices = planNotices({ ...base, yesterday: sealed });
    expect(notices.find((n) => n.moment === 'evening')).toBeUndefined();
  });

  it('has nothing to say in the morning when nothing is open', () => {
    const notices = planNotices({ ...base, moves: [move({ status: 'done' })] });
    expect(notices.find((n) => n.moment === 'wake')).toBeUndefined();
  });

  it('reads on Sunday and not on Monday', () => {
    expect(planNotices({ ...base, day: SUNDAY }).some((n) => n.moment === 'sunday')).toBe(true);
    expect(planNotices(base).some((n) => n.moment === 'sunday')).toBe(false);
  });

  it('keeps the milestone off the top of the morning line', () => {
    const notices = planNotices({
      ...base,
      milestone: { title: 'First two weeks', proof: 'one run in the ledger, any pace' },
    });
    const wake = notices.find((n) => n.moment === 'wake');
    const milestone = notices.find((n) => n.moment === 'milestone');
    expect(wake && milestone && milestone.at > wake.at).toBe(true);
  });

  it('softens the morning for the gentle register and never pushes', () => {
    const gentle = planNotices({ ...base, persona: 'gentle' }).find((n) => n.moment === 'wake');
    expect(gentle?.body).toContain("When you're ready");
    const fierce = planNotices({ ...base, persona: 'fierce' }).find((n) => n.moment === 'wake');
    // Whatever the register, a notification is not the place to be pushed.
    expect(fierce?.body).not.toMatch(/No negotiation|no excuses/i);
  });

  it('sends nothing at all when muted', () => {
    expect(planNotices({ ...base, muted: true })).toEqual([]);
  });
});

describe('after a gap', () => {
  it('says one thing on day three, and it quotes their own line', () => {
    const notices = planNotices({ ...base, daysSinceAnything: 3 });
    expect(notices).toHaveLength(1);
    expect(notices[0]!.moment).toBe('return');
    expect(notices[0]!.body).toContain('out the back door before the kettle boils');
    expect(notices[0]!.quotes).toHaveLength(1);
  });

  it('says nothing on day four, or day forty', () => {
    expect(planNotices({ ...base, daysSinceAnything: 4 })).toEqual([]);
    expect(planNotices({ ...base, daysSinceAnything: 40 })).toEqual([]);
  });

  it('does not stack the morning and evening lines on top of the nudge', () => {
    const notices = planNotices({ ...base, daysSinceAnything: 3 });
    expect(notices.map((n) => n.moment)).toEqual(['return']);
  });

  it('is still the ordinary day when the gap is short', () => {
    const notices = planNotices({ ...base, daysSinceAnything: 2 });
    expect(notices.some((n) => n.moment === 'wake')).toBe(true);
    expect(notices.some((n) => n.moment === 'return')).toBe(false);
  });
});

describe('a missed notification is not resent', () => {
  const notices = planNotices(base);

  it('drops anything whose time has passed', () => {
    // A phone that was off overnight must not deliver yesterday's morning line
    // at breakfast.
    const later = new Date('2026-09-14T12:00:00');
    const due = toSchedule(notices, later).map((n) => n.moment);
    expect(due).not.toContain('wake');
    expect(due).toContain('evening');
  });

  it('does not schedule the same id twice', () => {
    const early = new Date('2026-09-14T06:00:00');
    const first = toSchedule(notices, early);
    expect(first.length).toBeGreaterThan(0);
    const again = toSchedule(notices, early, first.map((n) => n.id));
    expect(again).toEqual([]);
  });
});

describe('Fewer', () => {
  it('takes one step at a time, starting with the evening', () => {
    const one = fewer([]);
    expect(one).toEqual(['evening']);
    const two = fewer(one);
    expect(two).toEqual(['evening', 'wake']);
    const three = fewer(two);
    expect(three).toContain('sunday');
    // And it stops rather than looping.
    expect(fewer(three)).toEqual(three);
  });

  it('actually removes what it says it removes', () => {
    const muted: Moment[] = ['evening'];
    const left = withoutMuted(planNotices(base), muted);
    expect(left.some((n) => n.moment === 'evening')).toBe(false);
    expect(left.some((n) => n.moment === 'wake')).toBe(true);
  });
});

describe('a tap has somewhere to land', () => {
  it('sends every notice to the screen it is about', () => {
    const notices = planNotices({
      ...base,
      day: SUNDAY,
      milestone: { title: 'First two weeks', proof: 'one run in the ledger, any pace' },
    });
    const where = Object.fromEntries(notices.map((n) => [n.moment, n.route]));
    // The Sunday line is about the reading view. Opening the app to wherever it
    // happened to be would waste the one tap somebody gave it.
    expect(where.sunday).toBe('/reading');
    expect(where.evening).toBe('/seal-day');
    expect(where.wake).toBe('/today');
    expect(where.milestone).toBe('/progress');
  });

  it('gives the return nudge somewhere gentle to land', () => {
    const [nudge] = planNotices({ ...base, daysSinceAnything: 3 });
    expect(nudge?.route).toBe('/today');
  });

  it('never leaves a route empty', () => {
    for (const n of planNotices({ ...base, day: SUNDAY })) {
      expect(n.route, n.moment).toMatch(/^\/[a-z-]+$/);
    }
  });
});
