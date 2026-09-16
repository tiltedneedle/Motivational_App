/**
 * What is free, and the four moments the paywall is allowed to appear
 * (PRD §7.13, §13.3).
 *
 * The point of testing this rather than trusting it: a paywall that can appear
 * anywhere is a paywall that eventually does. The list of moments is closed,
 * every one of them is dismissible, and the free plan is a whole product — a
 * person can write everything, seal the Book with every goal in it, and take
 * the whole thing away, without paying anything.
 */
import { describe, expect, it } from 'vitest';
import {
  BENEFITS,
  FREE,
  HIGHLIGHTED,
  annualAgainstMonthly,
  MOMENT_HEADING,
  PLANS,
  PRO,
  canBuildBlueprint,
  canReauthor,
  canTakeCoachTurn,
  isDismissible,
  limits,
  paywallMoment,
  type EntitlementContext,
  type PaywallMoment,
} from '../src/engines/entitlement';

const free: EntitlementContext = {
  entitled: false,
  blueprintsBuilt: 0,
  coachTurnsToday: 0,
  afterBlueprintShown: false,
  firstDaySealed: true,
  replansThisMonth: 0,
};

describe('the free plan is a whole product', () => {
  it('builds a Blueprint, and then asks', () => {
    expect(canBuildBlueprint(free).allowed).toBe(true);
    const second = canBuildBlueprint({ ...free, blueprintsBuilt: 1 });
    expect(second.allowed).toBe(false);
    if (!second.allowed) {
      expect(second.moment).toBe('second-blueprint');
      // And it says the thing that is actually true, which is that nothing has
      // been taken away.
      expect(second.reason.toLowerCase()).toContain('still here');
    }
  });

  it('gives Pro every Blueprint', () => {
    expect(canBuildBlueprint({ ...free, entitled: true, blueprintsBuilt: 40 }).allowed).toBe(true);
  });

  it('holds the coach at twenty turns a day, and two hundred on Pro', () => {
    expect(limits(false).coachTurnsPerDay).toBe(FREE.coachTurnsPerDay);
    expect(limits(true).coachTurnsPerDay).toBe(PRO.coachTurnsPerDay);
    expect(canTakeCoachTurn({ ...free, coachTurnsToday: 19 }).allowed).toBe(true);
    expect(canTakeCoachTurn({ ...free, coachTurnsToday: 20 }).allowed).toBe(false);
    expect(canTakeCoachTurn({ ...free, entitled: true, coachTurnsToday: 20 }).allowed).toBe(true);
  });

  it('says when the coach comes back rather than only that it is gone', () => {
    const capped = canTakeCoachTurn({ ...free, coachTurnsToday: 20 });
    expect(capped.allowed).toBe(false);
    if (!capped.allowed) expect(capped.reason).toContain('morning');
  });
});

describe('the one appearance nobody asked for', () => {
  it('is after the first Blueprint, and only then', () => {
    expect(paywallMoment(free)).toBe(null);
    expect(paywallMoment({ ...free, blueprintsBuilt: 1 })).toBe('after-blueprint');
  });

  it('waits for the first sealed day, so the first Today is not a price', () => {
    // No paywall before the first value moment: the first Today is the thing
    // all three sittings were for, and a price on its first paint reads as
    // the app's real purpose.
    expect(paywallMoment({ ...free, blueprintsBuilt: 1, firstDaySealed: false })).toBe(null);
    expect(paywallMoment({ ...free, blueprintsBuilt: 1, firstDaySealed: true })).toBe('after-blueprint');
  });

  it('is once, ever', () => {
    expect(paywallMoment({ ...free, blueprintsBuilt: 1, afterBlueprintShown: true })).toBe(null);
  });

  it('never happens to somebody who has already paid', () => {
    expect(paywallMoment({ ...free, blueprintsBuilt: 1, entitled: true })).toBe(null);
    expect(paywallMoment({ ...free, blueprintsBuilt: 9, entitled: true })).toBe(null);
  });
});

describe('the screen it opens', () => {
  it('has a heading for every moment there is', () => {
    const moments: PaywallMoment[] = ['after-blueprint', 'second-blueprint', 'reauthor', 'bench', 'coach-cap'];
    for (const m of moments) {
      expect(MOMENT_HEADING[m], m).toBeTruthy();
      // Every one of them can be walked away from.
      expect(isDismissible(m), m).toBe(true);
    }
  });

  it('does the per-month maths rather than asserting it', () => {
    const annual = PLANS.find((p) => p.id === 'annual')!;
    expect(annual.note).toContain('$49.99');
    // 4999 / 12 = 416.58…, which is $4.17 a month. A number written by hand
    // here is a number that drifts from the price beside it.
    expect(annual.note).toContain('$4.17');
    expect(HIGHLIGHTED).toBe('annual');
    // The highlight is explained with arithmetic, not a statistic nobody measured.
    expect(annualAgainstMonthly()).toBe('A year for the price of five months.');
    expect(
      annualAgainstMonthly([
        { id: 'monthly', label: 'Monthly', cents: 400, note: '' },
        { id: 'annual', label: 'Annual', cents: 4800, note: '' },
      ]),
    ).toBeNull();
    expect(annualAgainstMonthly([{ id: 'annual', label: 'Annual', cents: 4999, note: '' }])).toBeNull();
  });

  it('offers a trial on exactly one plan, and never a countdown', () => {
    const withTrial = PLANS.filter((p) => p.trialDays);
    expect(withTrial).toHaveLength(1);
    expect(withTrial[0]!.id).toBe('annual');
    for (const p of PLANS) {
      expect(p.note, p.id).not.toMatch(/\bends\b|\bhurry\b|\bonly\b|\btoday only\b|%\s*off/i);
    }
  });

  it('promises four things, and each of them is a thing the app does', () => {
    // One per gate: the second Blueprint, the scene, the coach's cap, and —
    // since the re-authoring was built — the Book written again on day 90.
    expect(BENEFITS).toHaveLength(4);
    for (const b of BENEFITS) {
      expect(b.length).toBeGreaterThan(20);
      expect(b).not.toMatch(/unlimited everything|best|amazing/i);
    }
    expect(BENEFITS.join(' ')).toContain('Blueprint');
    expect(BENEFITS.join(' ')).toContain('coach');
    expect(BENEFITS.join(' ')).toContain('ninety days');
  });

  it('gates the day-90 re-authoring on the free plan, and on the free plan only', () => {
    const gate = canReauthor(free);
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) {
      expect(gate.moment).toBe('reauthor');
      // The reason says what stays theirs, not only what is behind the door.
      expect(gate.reason).toMatch(/yours/);
    }
    expect(canReauthor({ ...free, entitled: true }).allowed).toBe(true);
  });
});
