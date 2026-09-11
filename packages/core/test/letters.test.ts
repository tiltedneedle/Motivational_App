/**
 * Letters (PRD §7.8), and the two rules one has to pass before anybody reads
 * it: every quoted span is verbatim, and no goal or plan line appears anywhere
 * in the body.
 *
 * The second is the one worth having a test for. A letter that names the plan
 * is the app writing the plan back at somebody in a warmer voice, which is the
 * exact failure this product is built to avoid — and it is the easiest thing in
 * the world to do by accident when the plan is right there in the same store.
 */
import { describe, expect, it } from 'vitest';
import {
  LETTER_MAX_WORDS,
  LETTER_MIN_WORDS,
  canDeliverOn,
  checkLetter,
  composeLetter,
  deliverable,
  dueLetters,
  quotableSources,
  type LetterSources,
} from '../src/engines/letters';
import type { Evidence, Goal, Letter, Move } from '../src/types';

const IDEAL =
  'It is 6:40 and the kitchen is still blue. I am out the back door before the kettle boils, and I run the towpath as far as the second bridge.';

const ev = (id: string, text: string, kind: Evidence['kind'] = 'seal'): Evidence =>
  ({ id, goalId: 'g_1', kind, text, day: '2026-09-20', createdAt: `2026-09-2${id.length}T09:00:00.000Z` }) as Evidence;

const sources: LetterSources = {
  ideal: IDEAL,
  evidence: [ev('a', 'Went anyway. Rained the whole way.'), ev('bb', 'Ten floors, twice, before work.')],
  goals: [{ id: 'g_1', title: '5 km race' } as Goal],
  moves: [{ id: 'mv_1', title: 'Tuesday: at 6:40, out the back door', minVersion: 'Two minutes of it' } as Move],
};

describe('what a letter is allowed to say', () => {
  it('accepts one that quotes them and stays in range', () => {
    const { body, quotes, check } = composeLetter('portrait', sources, 'Sam');
    expect(check.ok, check.problems.join('; ')).toBe(true);
    expect(check.words).toBeGreaterThanOrEqual(LETTER_MIN_WORDS);
    expect(check.words).toBeLessThanOrEqual(LETTER_MAX_WORDS);
    expect(body).toContain('Sam,');
    expect(quotes.length).toBeGreaterThan(0);
  });

  it('refuses one that names a goal', () => {
    const body = `${'word '.repeat(130)} the 5 km race`;
    const out = checkLetter(body, ['It is 6:40 and the kitchen is still blue.'], sources);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toContain('names the plan');
  });

  it('refuses one that names a plan line, or its smaller version', () => {
    const withMove = checkLetter(`${'word '.repeat(130)} Tuesday: at 6:40, out the back door`, ['x'], sources);
    expect(withMove.problems.join(' ')).toContain('names the plan');
    const withMin = checkLetter(`${'word '.repeat(130)} two minutes of it`, ['x'], sources);
    expect(withMin.problems.join(' ')).toContain('names the plan');
  });

  it('does not trip on an ordinary English word that happens to be in a goal', () => {
    // "race" on its own is a word. "5 km race" is the app reading its own
    // database out loud, and only the second is a problem.
    const body = `I have been thinking about the race you are not running yet. ${'word '.repeat(125)}`;
    const out = checkLetter(body, [], sources);
    expect(out.problems.join(' ')).not.toContain('names the plan');
  });

  it('refuses a quote that is not actually theirs', () => {
    const body = `${'word '.repeat(130)} “I have never been more ready.”`;
    const out = checkLetter(body, ['I have never been more ready.'], sources);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toContain('not their words');
  });

  it('refuses a quote listed but missing from the body', () => {
    const body = 'word '.repeat(130);
    const out = checkLetter(body, ['Went anyway. Rained the whole way.'], sources);
    expect(out.problems.join(' ')).toContain('quoted but not present');
  });

  it('refuses one that quotes nothing at all', () => {
    const out = checkLetter('word '.repeat(130), [], sources);
    expect(out.ok).toBe(false);
    expect(out.problems.join(' ')).toContain('quotes nothing');
  });

  it('holds both ends of the word range', () => {
    expect(checkLetter('short', ['x'], sources).problems.join(' ')).toContain('too short');
    expect(checkLetter('word '.repeat(400), ['x'], sources).problems.join(' ')).toContain('too long');
  });

  it('quotes the Fifteen and the ledger, and nothing else', () => {
    const allowed = quotableSources(sources);
    expect(allowed).toContain(IDEAL);
    expect(allowed).toContain('Went anyway. Rained the whole way.');
    expect(allowed.some((s) => s.includes('Tuesday: at 6:40'))).toBe(false);
  });

  it('writes something worth reading with an empty ledger', () => {
    const bare = { ...sources, evidence: [] };
    const { check, body } = composeLetter('portrait', bare);
    expect(check.ok, check.problems.join('; ')).toBe(true);
    expect(body).toContain('ledger is still empty');
  });

  it('stays inside the ceiling when the quotations are long', () => {
    // A thirty-word first sentence and two ninety-character ledger lines used
    // to add up to 230 words, which the composer's own check then refused.
    const longIdeal = 'It is six forty in the morning and the kitchen is still blue and quiet and I am standing at the back door with my shoes on before the kettle has even started to boil.';
    const long = {
      ...sources,
      ideal: longIdeal,
      evidence: [
        ev('a', 'Went anyway, in the rain, with the wrong socks and no breakfast and it was fine in the end.'),
        ev('bb', 'Ten floors twice before work and then once more at lunch because the lift was broken.'),
      ],
    };
    for (const trigger of ['portrait', 'first-return', 'milestone', 'monthly'] as const) {
      const { check, quotes } = composeLetter(trigger, long, 'Samantha');
      expect(check.ok, ).toBe(true);
      expect(quotes.length).toBeGreaterThan(0);
    }
  });

  it('reaches the floor with one short ledger line and no Fifteen', () => {
    const thin = { ...sources, ideal: '', evidence: [ev('a', 'Went.')] };
    const { check } = composeLetter('monthly', thin);
    expect(check.ok, check.problems.join('; ')).toBe(true);
  });

  it('counts the whole ledger, not just the lines it quotes', () => {
    const many = { ...sources, evidence: [...sources.evidence, ev('ccc', 'Third.'), ev('dddd', 'Fourth.')] };
    const { body } = composeLetter('monthly', many);
    expect(body).toContain('the ledger has 4 entries');
  });

  it('does not describe mornings that are not in the ledger', () => {
    const bare = { ...sources, evidence: [] };
    const { body } = composeLetter('portrait', bare);
    expect(body).not.toContain('mornings you did it anyway');
    expect(body).not.toContain('None of it was the day');
  });

  it('stays inside the ceiling when the quotations are long', () => {
    // A thirty-word first sentence and two ninety-character ledger lines used
    // to add up to 230 words, which the composer's own check then refused.
    const longIdeal =
      'It is six forty in the morning and the kitchen is still blue and quiet and I am standing at the back door with my shoes on before the kettle has even started to boil.';
    const long = {
      ...sources,
      ideal: longIdeal,
      evidence: [
        ev('a', 'Went anyway, in the rain, with the wrong socks and no breakfast and it was fine in the end.'),
        ev('bb', 'Ten floors twice before work and then once more at lunch because the lift was broken.'),
      ],
    };
    for (const trigger of ['portrait', 'first-return', 'milestone', 'monthly'] as const) {
      const { check, quotes } = composeLetter(trigger, long, 'Samantha');
      expect(check.ok, `${trigger}: ${check.problems.join('; ')}`).toBe(true);
      expect(quotes.length).toBeGreaterThan(0);
    }
  });

  it('reaches the floor with one short ledger line and no Fifteen', () => {
    const thin = { ...sources, ideal: '', evidence: [ev('a', 'Went.')] };
    const { check } = composeLetter('monthly', thin);
    expect(check.ok, check.problems.join('; ')).toBe(true);
  });

  it('counts the whole ledger, not just the lines it quotes', () => {
    const many = { ...sources, evidence: [...sources.evidence, ev('ccc', 'Third.'), ev('dddd', 'Fourth.')] };
    const { body } = composeLetter('monthly', many);
    expect(body).toContain('the ledger has 4 entries');
  });

  it('does not describe mornings that are not in the ledger', () => {
    const bare = { ...sources, evidence: [] };
    const { body } = composeLetter('portrait', bare);
    expect(body).not.toContain('mornings you did it anyway');
    expect(body).not.toContain('None of it was the day');
  });

  it('never quotes a kept move or a practice run, whose rows are plan lines and app prose', () => {
    // Keeping a move writes its title to the ledger, and a minimal practice
    // run writes the app's own "Two minutes of it". Quoting either made every
    // letter after the first kept move fail its own check.
    const inUse = {
      ...sources,
      evidence: [
        ev('m', 'Tuesday: at 6:40, out the back door', 'move'),
        ev('pp', 'Two minutes of it', 'practice'),
        ev('sss', 'Went anyway. Rained the whole way.'),
      ],
    };
    for (const trigger of ['first-return', 'milestone', 'monthly'] as const) {
      const { check, quotes, body } = composeLetter(trigger, inUse);
      expect(check.ok, `${trigger}: ${check.problems.join('; ')}`).toBe(true);
      expect(quotes).not.toContain('Tuesday: at 6:40, out the back door');
      expect(body).not.toContain('Two minutes of it');
      expect(body).toContain('3 entries');
    }
  });

  it('quotes the start of a first sentence too long to quote whole', () => {
    const long = {
      ...sources,
      ideal:
        'It is 6:40 in the morning and I am already out of the door with my running shoes on, the kitchen is still blue and quiet and nobody else is awake yet, and I feel the cold air on my face as I head down toward the towpath.',
      evidence: [],
    };
    const { check, body, quotes } = composeLetter('portrait', long);
    expect(check.ok, check.problems.join('; ')).toBe(true);
    expect(body).toContain('You began “');
    expect(long.ideal.startsWith(quotes[0]!)).toBe(true);
  });

  it("sheds its own prose before the person's sentence when it runs long", () => {
    const wordy = {
      ...sources,
      ideal:
        'It is six forty in the morning and the kitchen is still blue and quiet and I am standing at the back door with my shoes already on before the kettle has even started to boil for anyone.',
      evidence: [ev('a', 'Went anyway, in the rain, with the wrong socks and no breakfast and it was fine.')],
    };
    const { check, quotes } = composeLetter('portrait', wordy, 'Samantha');
    expect(check.ok, check.problems.join('; ')).toBe(true);
    expect(quotes.some((q) => wordy.ideal.startsWith(q))).toBe(true);
  });

  it('passes its own check on every occasion there is', () => {
    for (const trigger of ['portrait', 'first-return', 'milestone', 'monthly'] as const) {
      const { check } = composeLetter(trigger, sources);
      expect(check.ok, `${trigger}: ${check.problems.join('; ')}`).toBe(true);
    }
  });
});

describe('when a letter is owed', () => {
  const base = {
    today: '2026-10-12',
    portraitReady: true,
    returns: 0,
    reachedMilestones: [],
    existing: [] as string[],
    firstSealedOn: '2026-09-10',
  };

  it('writes one at the Portrait, once', () => {
    expect(dueLetters(base).map((l) => l.trigger)).toContain('portrait');
    expect(dueLetters({ ...base, existing: ['portrait', 'monthly:1'] }).map((l) => l.trigger)).not.toContain('portrait');
  });

  it('writes one at the first Return and not at the fourth', () => {
    const first = dueLetters({ ...base, returns: 1 });
    expect(first.some((l) => l.trigger === 'first-return')).toBe(true);
    const later = dueLetters({ ...base, returns: 4, existing: ['first-return'] });
    expect(later.some((l) => l.trigger === 'first-return')).toBe(false);
  });

  it('keys a milestone letter to the milestone', () => {
    const reached = [{ id: 'ms_2', goalId: 'g_1', reachedAt: '2026-10-01T20:00:00.000Z' }];
    const out = dueLetters({ ...base, reachedMilestones: reached });
    expect(out.find((l) => l.trigger === 'milestone')?.key).toBe('milestone:ms_2');
    // Reached, undone, reached again: still one letter.
    const again = dueLetters({ ...base, reachedMilestones: reached, existing: ['milestone:ms_2'] });
    expect(again.some((l) => l.trigger === 'milestone')).toBe(false);
  });

  it('writes one a month, counted from the first seal', () => {
    expect(dueLetters({ ...base, today: '2026-10-09' }).some((l) => l.trigger === 'monthly')).toBe(false);
    expect(dueLetters({ ...base, today: '2026-10-10' }).find((l) => l.trigger === 'monthly')?.key).toBe('monthly:1');
    expect(dueLetters({ ...base, today: '2026-12-11' }).find((l) => l.trigger === 'monthly')?.key).toBe('monthly:3');
  });

  it('has nothing to say before there is a Book', () => {
    const out = dueLetters({ ...base, portraitReady: false, firstSealedOn: null });
    expect(out).toEqual([]);
  });
});

describe('when a letter arrives', () => {
  const letter = (over: Partial<Letter>): Letter =>
    ({ id: 'l', goalId: null, direction: 'to_future', body: 'x', quotes: [], trigger: 'self', deliverAt: '2026-10-01', readAt: null, ...over }) as Letter;

  it('is not theirs until the day it was addressed to', () => {
    const rows = [letter({ id: 'past', deliverAt: '2026-09-01' }), letter({ id: 'future', deliverAt: '2027-01-01' })];
    expect(deliverable(rows, '2026-10-12').map((l) => l.id)).toEqual(['past']);
  });

  it('does not arrive twice', () => {
    const rows = [letter({ id: 'read', deliverAt: '2026-09-01', readAt: '2026-09-02T09:00:00.000Z' })];
    expect(deliverable(rows, '2026-10-12')).toEqual([]);
  });
});

describe('writing to your future self', () => {
  it('takes tomorrow at the earliest and a year at the latest', () => {
    expect(canDeliverOn(1).ok).toBe(true);
    expect(canDeliverOn(365).ok).toBe(true);
    expect(canDeliverOn(0).ok).toBe(false);
    expect(canDeliverOn(366).ok).toBe(false);
  });

  it('says why rather than refusing in silence', () => {
    expect(canDeliverOn(0).reason).toBeTruthy();
    expect(canDeliverOn(400).reason).toContain('year');
    expect(canDeliverOn(1.5).reason).toBeTruthy();
    expect(canDeliverOn(Number.NaN).ok).toBe(false);
  });
});
