/**
 * The concern band, which for a long time did nothing.
 *
 * PRD §11.6: "*Concern* softens the next prompt, avoids numeric targets and
 * suggests professional support once." Every free-text write was screened and
 * the verdict was stored on the row, but no screen read it back — a person
 * whose writing landed in the band got exactly the same morning as everybody
 * else, including the fierce register's "No negotiation with yourself this
 * morning". These tests hold the three promises still.
 */
import { describe, expect, it } from 'vitest';
import { buildDawnBrief, fullTrackInvitation, replyToChip, replyToText } from '../src/engines/coach';
import { SUPPORT_LINE, contentGuard, screen, shouldOfferSupport, softenFrom, withinSoftenWindow } from '../src/engines/safety';
import type { BookVersion, DaySummary, GoalAnalysis, Move } from '../src/types';

const DAY = '2026-09-11';

const book = {
  firstSentence: 'It is 6:40 and the kitchen is still blue.',
} as unknown as BookVersion;

const yesterday: DaySummary = {
  day: '2026-09-10',
  planned: 2,
  done: 1,
  score: 62,
  evidenceCount: 1,
  moodWord: 'Tired',
  proof: 'Went anyway. Rained the whole way.',
  gladOf: null,
  sealedAt: '2026-09-10T21:40:00.000Z',
  safetyRisk: 'none',
} as unknown as DaySummary;

const move = {
  id: 'mv_1',
  goalId: 'g_1',
  planId: 'p_1',
  title: 'Out the back door at 6:40',
  status: 'todo',
  order: 0,
  scheduledFor: DAY,
} as unknown as Move;

const ids = () => {
  let n = 0;
  return (p: string) => `${p}_${++n}`;
};

const base = {
  day: DAY,
  book,
  yesterday,
  moves: [move],
  analyses: [],
  persona: 'fierce' as const,
  score: 62,
  previousScore: 40,
};

describe('the concern band is a band, not a column in a table', () => {
  it('is what the screen actually returns for a flat week', () => {
    // The sentences that put somebody here. None of them is a crisis, and none
    // of them should be treated as one.
    for (const line of ['I feel hopeless about all of it', 'nobody would even notice', "I'm a failure"]) {
      expect(screen(line).risk, line).toBe('concern');
      expect(screen(line).action, line).toBe('soften');
    }
  });

  it('softens the register whatever persona is set', () => {
    const fierce = buildDawnBrief(base, ids());
    expect(fierce.today).toContain('No negotiation with yourself this morning');

    const softened = buildDawnBrief({ ...base, soften: true }, ids());
    expect(softened.today).not.toContain('No negotiation');
    expect(softened.today).toContain("When you're ready");
    // And it is still their move, in their words.
    expect(softened.today.toLowerCase()).toContain('out the back door at 6:40');
  });

  it('takes the number off the morning', () => {
    const normal = buildDawnBrief(base, ids());
    expect(normal.yesterday).toContain('Consistency 62');

    const softened = buildDawnBrief({ ...base, soften: true }, ids());
    expect(softened.yesterday).not.toMatch(/Consistency/);
    expect(softened.soften).toBe(true);
    // Their own proof line still comes back — that is evidence, not a target.
    expect(softened.yesterday).toContain('Rained the whole way');
    // And the app's own full stop is not landing on top of theirs.
    expect(softened.yesterday.trimEnd()).not.toMatch(/["”']\.$/);
  });

  it('names professional support once, and then not again', () => {
    expect(shouldOfferSupport(true, null)).toBe(true);
    expect(shouldOfferSupport(true, '2026-09-01T09:00:00.000Z')).toBe(false);
    expect(shouldOfferSupport(false, null)).toBe(false);

    const offered = buildDawnBrief({ ...base, soften: true, offerSupport: true }, ids());
    expect(offered.support).toBe(SUPPORT_LINE);

    const later = buildDawnBrief({ ...base, soften: true, offerSupport: false }, ids());
    expect(later.support).toBeNull();
    // Still softened, though. The offer is once; the softening lasts as long as
    // the band does.
    expect(later.soften).toBe(true);
  });

  it('leaves an ordinary morning entirely alone', () => {
    const b = buildDawnBrief(base, ids());
    expect(b.support).toBeNull();
    expect(b.soften).toBe(false);
  });

  it('holds the window open for the next morning and no longer', () => {
    // Written on the 10th, read on the morning of the 11th: this is the whole
    // point of "the next prompt".
    expect(withinSoftenWindow('2026-09-10', '2026-09-11')).toBe(true);
    expect(withinSoftenWindow('2026-09-11', '2026-09-11')).toBe(true);
    expect(withinSoftenWindow('2026-09-09', '2026-09-11')).toBe(false);
    // A day in the future is not a reason to soften today.
    expect(withinSoftenWindow('2026-09-12', '2026-09-11')).toBe(false);
    // Rubbish in, false out — never a thrown error on the morning path.
    expect(withinSoftenWindow('', '2026-09-11')).toBe(false);
    expect(withinSoftenWindow('not a day', '2026-09-11')).toBe(false);
  });

  it('crosses a month and a year boundary without arithmetic of its own', () => {
    expect(withinSoftenWindow('2026-08-31', '2026-09-01')).toBe(true);
    expect(withinSoftenWindow('2026-12-31', '2027-01-01')).toBe(true);
    expect(withinSoftenWindow('2026-12-30', '2027-01-01')).toBe(false);
  });

  it('does not put words in the support line that the app cannot back', () => {
    // It points at You, the last tab, which is where the helplines are (the tab
    // is called You, so the line says You: the same word for the same place). It does
    // not diagnose, promise, or name a condition.
    expect(SUPPORT_LINE).toContain('You, the last tab');
    expect(SUPPORT_LINE).not.toMatch(/depress|anxiet|disorder|diagnos/i);
  });
});

describe('what puts a morning in the band, and what does not', () => {
  it('is any one screened thing inside the window', () => {
    expect(softenFrom([{ risk: 'concern', day: '2026-09-10' }], DAY)).toBe(true);
    expect(softenFrom([{ risk: 'concern', day: '2026-09-08' }], DAY)).toBe(false);
    expect(softenFrom([{ risk: 'none', day: '2026-09-10' }], DAY)).toBe(false);
    expect(softenFrom([], DAY)).toBe(false);
  });

  it('ignores a risk it has never heard of, and a missing one', () => {
    // Rows written by an older build, or by a sync that has drifted. A morning
    // is not softened on a value nothing in the app produces.
    expect(softenFrom([{ risk: undefined, day: '2026-09-10' }], DAY)).toBe(false);
    expect(softenFrom([{ risk: null, day: '2026-09-10' }], DAY)).toBe(false);
  });

  it('does not treat a crisis as a concern', () => {
    // Crisis has its own path — the sitting pauses and the resources card comes
    // up. It does not quietly become a softer brief tomorrow instead.
    expect(softenFrom([{ risk: 'crisis', day: '2026-09-10' }], DAY)).toBe(false);
  });

  it('finds the one flagged row among many quiet ones', () => {
    const stamps = [
      { risk: 'none' as const, day: '2026-09-11' },
      { risk: 'none' as const, day: '2026-09-10' },
      { risk: 'concern' as const, day: '2026-09-11' },
      { risk: 'none' as const, day: '2026-09-09' },
    ];
    expect(softenFrom(stamps, DAY)).toBe(true);
  });
});

/**
 * The one invitation the product is allowed to make (PRD §7.10).
 *
 * `fullTrackInvitation` was written, and then had no call site for as long as
 * the app existed — the invitation never arrived at all. Now that it does, the
 * shape of it matters: the argument is the person's own longest line, and the
 * app's sentence around it is kept separate so the serif goes on meaning what
 * it means everywhere else.
 */
describe('the invitation to go deeper', () => {
  const LONG =
    'Sam would stop worrying about me on the days I say nothing, and I would stop pretending the mornings are fine when they are not.';

  it('quotes them, and does not cut a word in half', () => {
    const inv = fullTrackInvitation(LONG);
    const shown = inv.quoted.replace(/…$/, '');
    expect(LONG.startsWith(shown)).toBe(true);
    // Cut at a word, not through one: whatever follows in their sentence must
    // begin a new word. "…the mornings are fine when they…" is fine;
    // "…when th…" would be the app breaking their word in half.
    expect(LONG.slice(shown.length)).toMatch(/^(\s|$)/);
    expect(inv.quotes[0]).toBe(LONG);
  });

  it('keeps the app half out of the quotation', () => {
    const inv = fullTrackInvitation(LONG);
    expect(inv.ask).not.toContain('Sam');
    expect(inv.quoted).not.toContain('Want to go');
    // The combined form is for the plain-text paths that have one face only.
    expect(inv.text).toContain(inv.ask);
  });

  it('does not fall over on nothing', () => {
    const inv = fullTrackInvitation('');
    expect(inv.quoted).toBe('');
    expect(inv.quotes).toEqual(['']);
  });
});

/**
 * What the coach says when a chip is tapped, checked against what was actually
 * on screen. All four of these were read off the built app: a raw ISO date,
 * "1 sealed days", a full stop landing on top of the person's own, and the
 * person's if-then rewritten into the second person and quoted back as theirs.
 */
describe('the coach quotes their words as written', () => {
  const analyses = [
    {
      id: 'an_obs',
      goalId: 'g_1',
      kind: 'obstacles',
      line: 'I stay up too late',
      line2: 'put the phone in the hall at ten',
    },
  ] as unknown as GoalAnalysis[];
  const moves = [move];
  const days = [
    {
      day: '2026-09-09',
      planned: 1,
      done: 1,
      proof: 'Went anyway. Rained the whole way.',
      sealedAt: '2026-09-09T21:00:00.000Z',
      safetyRisk: 'none',
    },
    { day: DAY, planned: 1, done: 1, proof: 'Out before the kettle.', sealedAt: null, safetyRisk: 'none' },
  ] as unknown as DaySummary[];
  const ctx = { book, analyses, moves, days, today: DAY, returns: 0, persona: 'straight' as const };

  it('keeps the if-then in the first person', () => {
    const r = replyToChip('stuck', ctx);
    expect(r.text).toContain('then I put the phone in the hall at ten');
    expect(r.text).not.toContain('then you');
  });

  it('quotes a past day, with a real date and one full stop', () => {
    const r = replyToChip('dont-feel', ctx);
    expect(r.text).toContain('Wed 9 Sep');
    expect(r.text).not.toContain('2026-09-09');
    // Not today's own line: they have not had today yet.
    expect(r.text).not.toContain('Out before the kettle');
    expect(r.text).not.toContain('.”.');
    expect(r.text).toContain('Rained the whole way.” Two minutes of it counts today.');
    // What the ledger holds, never how they felt: "you did not feel like it
    // either" was a claim about a feeling the app has no record of.
    expect(r.text).not.toMatch(/feel like it either/);
    expect(r.text).toMatch(/^On Wed 9 Sep you kept \d+ of \d+ moves? and wrote “/);
  });

  it('counts sealed days in the right number', () => {
    const r = replyToChip('celebrate', { ...ctx, days: [days[0]!] });
    expect(r.text).toContain('1 closed day.');
    expect(r.text).not.toContain('1 closed days');
  });
});

describe('the coach refuses a calorie target however it is asked for', () => {
  it('knows the question as well as the number', () => {
    expect(contentGuard('keep me under 1200 kcal a day').allowed).toBe(false);
    expect(contentGuard('how many calories should I eat to lose 5kg fast').allowed).toBe(false);
    expect(contentGuard('what should my macros be to lose weight').allowed).toBe(false);
  });

  it('does not refuse ordinary talk about food', () => {
    expect(contentGuard('I ate well today and the run felt easy').allowed).toBe(true);
    expect(contentGuard('cooking dinner at home three nights this week').allowed).toBe(true);
  });
});

describe('the coach with no model behind it', () => {
  const analyses = [
    { id: 'an_s', goalId: 'g_1', kind: 'strategies', line: 'Tuesday, Thursday, Saturday at 6:40, out the back door', safetyRisk: 'none' },
    { id: 'an_o', goalId: 'g_1', kind: 'obstacles', line: 'I stay up too late', line2: 'put the phone in the hall', safetyRisk: 'none' },
  ] as unknown as GoalAnalysis[];
  const ctx = { book, analyses, moves: [move], days: [], today: DAY, returns: 0, persona: 'straight' as const };

  it('quotes the line of theirs the message touches, and then asks', () => {
    const r = replyToText('I keep missing the Thursday one', ctx);
    expect(r.text).toContain('Thursday, Saturday at 6:40');
    expect(r.quotedSpans).toEqual(['Tuesday, Thursday, Saturday at 6:40, out the back door']);
    expect(r.text.trim().endsWith('?')).toBe(true);
  });

  it('asks rather than invents when nothing of theirs is touched', () => {
    const r = replyToText('what is the meaning of life', ctx);
    expect(r.quotedSpans).toEqual([]);
    expect(r.text.startsWith('Say more about that.')).toBe(true);
    expect(r.text.trim().endsWith('?')).toBe(true);
  });

  it('gives the same message the same question, and different messages different ones', () => {
    const a = replyToText('I have no idea where to start', ctx);
    const b = replyToText('I have no idea where to start', ctx);
    expect(a.text).toBe(b.text);
    const seen = new Set(
      ['one', 'another thing entirely', 'a third message here', 'and a fourth', 'five', 'six six six'].map(
        (t) => replyToText(t, ctx).text,
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('does not treat a common word as a match', () => {
    // "about" and "today" are in half of everything anybody writes.
    const r = replyToText('I want to talk about today', ctx);
    expect(r.quotedSpans).toEqual([]);
  });

  it('never quotes a line the screen flagged', () => {
    const flagged = [{ ...analyses[0], safetyRisk: 'crisis' }] as unknown as GoalAnalysis[];
    const r = replyToText('the Thursday run', { ...ctx, analyses: flagged });
    expect(r.quotedSpans).toEqual([]);
  });
});
