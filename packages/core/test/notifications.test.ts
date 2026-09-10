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
  DEFAULT_QUIET,
  fewer,
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
    expect(wake?.body).toContain('out the back door at 6:40');
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
