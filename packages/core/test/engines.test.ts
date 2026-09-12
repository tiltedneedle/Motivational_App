import { describe, expect, it } from 'vitest';
import {
  AREAS,
  CHIPS,
  HELPLINES,
  addAnother,
  bookPages,
  pageCount,
  addCustomArea,
  answer,
  beginBranches,
  buildDawnBrief,
  clarity,
  minSecondsToCount,
  canClose,
  consistencyScore,
  contentGuard,
  dayValue,
  detectReturns,
  draftOf,
  draftWorthKeeping,
  dropDraft,
  validatePlan,
  buildPlan,
  resumeWriting,
  canResume,
  followUpPrompt,
  formatDay,
  framingSet,
  guessLine,
  initialInterview,
  isReturning,
  minVersionOf,
  nextNudge,
  plural,
  polish,
  proposeIdentity,
  identityLineText,
  question,
  reading,
  replyToChip,
  returnNumberToday,
  returnsLetter,
  ringFraction,
  screen,
  worseRisk,
  isWorse,
  scoreSpecificity,
  seeds,
  splitFirstMoves,
  startWriting,
  targetSeconds,
  tick,
  toggleArea,
  totalQuestions,
  wordCount,
  type BookVersion,
  type DaySummary,
  type GoalAnalysis,
} from '../src/index';
import { dayOf, endSentence, ifThenOf, sequentialIds, thenHalf } from '../src/ids';
import { firstSentence, restOfIdeal } from '../src/engines/portrait';

describe('the Interview', () => {
  it('runs entirely on taps and ends with a named goal', () => {
    let s = initialInterview();
    expect(question(s).multi).toBe(true);
    s = toggleArea(s, 'health');
    s = beginBranches(s);
    expect(question(s).prompt).toBe(AREAS[0]!.question);
    s = answer(s, 'Finish a race');
    expect(question(s).prompt).toBe('How far?');
    s = answer(s, 'A half marathon');
    expect(question(s).prompt).toBe('By when?');
    s = answer(s, 'Six months');
    expect(s.stage).toBe('admire');
    s = answer(s, 'A friend');
    expect(s.stage).toBe('summary');
    expect(s.drafts).toHaveLength(1);
    expect(s.drafts[0]!.title).toBe('Half marathon');
    expect(s.drafts[0]!.horizon).toBe('Six months');
  });

  it('lets a custom answer skip the follow-up, exactly as specified', () => {
    let s = initialInterview();
    s = toggleArea(s, 'money');
    s = beginBranches(s);
    s = answer(s, 'Stop the overdraft fees', true);
    expect(question(s).prompt).toBe('By when?');
    s = answer(s, 'Three months');
    expect(s.drafts[0]!.title).toBe('Stop the overdraft fees');
    expect(s.drafts[0]!.custom).toBe(true);
  });

  it('adds a custom area with its own branch set', () => {
    let s = initialInterview();
    s = addCustomArea(s, 'Guitar');
    expect(s.picked).toHaveLength(1);
    s = beginBranches(s);
    expect(question(s).prompt).toContain('Guitar');
    s = answer(s, 'Do it every week');
    s = answer(s, 'Three times');
    s = answer(s, 'A year');
    expect(s.drafts[0]!.title).toBe('Guitar, three times a week');
    expect(s.drafts[0]!.domain).toBe('custom');
  });

  it('caps at eight areas', () => {
    let s = initialInterview();
    for (const a of AREAS) s = toggleArea(s, a.id);
    s = addCustomArea(s, 'One');
    s = addCustomArea(s, 'Two');
    s = addCustomArea(s, 'Three');
    expect(s.picked.length).toBeLessThanOrEqual(8);
  });

  it('will not begin with nothing picked', () => {
    const s = initialInterview();
    expect(beginBranches(s)).toBe(s);
  });

  it('builds its guess only from the user picks', () => {
    let s = initialInterview();
    s = toggleArea(s, 'health');
    s = toggleArea(s, 'money');
    expect(guessLine(s)).toBe('Something about health, money…');
  });

  it('drops a goal and forgets its area', () => {
    let s = initialInterview();
    s = toggleArea(s, 'health');
    s = beginBranches(s);
    s = answer(s, 'Finish a race');
    s = answer(s, '5 km');
    s = answer(s, 'A year');
    s = answer(s, 'A friend');
    const id = s.drafts[0]!.id;
    s = dropDraft(s, id);
    expect(s.drafts).toHaveLength(0);
    expect(s.picked).toHaveLength(0);
  });

  it('keeps earlier picks when adding another goal', () => {
    let s = initialInterview();
    s = toggleArea(s, 'health');
    s = beginBranches(s);
    s = answer(s, 'Sleep properly');
    s = answer(s, 'Seven hours');
    s = answer(s, 'Six months');
    s = answer(s, 'A friend');
    s = addAnother(s);
    expect(s.stage).toBe('areas');
    expect(s.drafts).toHaveLength(1);
  });

  it('reports clarity between the floor and one', () => {
    let s = initialInterview();
    expect(clarity(s)).toBeGreaterThanOrEqual(0.08);
    s = toggleArea(s, 'mind');
    s = beginBranches(s);
    expect(clarity(s)).toBeLessThan(1);
    expect(totalQuestions(s)).toBe(5);
  });

  it('hands the Fifteen seeds that are the user own answers', () => {
    let s = initialInterview();
    s = toggleArea(s, 'health');
    s = beginBranches(s);
    s = answer(s, 'Finish a race');
    s = answer(s, 'A half marathon');
    s = answer(s, 'Six months');
    s = answer(s, 'A friend');
    expect(seeds(s)).toEqual(['Half marathon']);
  });
});

describe('adding to the Interview a second time', () => {
  it('only asks about areas that have not been shaped yet', () => {
    // "Add another" used to reset the cursor to zero, so every area already
    // answered was asked again and a second draft appended for each.
    let s = initialInterview();
    s = toggleArea(s, 'health');
    s = beginBranches(s);
    const area = AREAS.find((a) => a.id === 'health');
    const branch = area?.branches[0];
    s = answer(s, branch?.label ?? '');
    if (s.stage === 'follow') s = answer(s, branch?.options[0] ?? 'yes');
    s = answer(s, 'This season');
    expect(s.drafts).toHaveLength(1);

    // Now they pick a second area and come back.
    s = toggleArea(s, 'money');
    s = beginBranches(s);
    expect(s.stage).toBe('branch');
    // The cursor must be on the new area, not back at the top.
    expect(s.picked[s.cursor]).toBe('money');

    const money = AREAS.find((a) => a.id === 'money');
    const mb = money?.branches[0];
    s = answer(s, mb?.label ?? '');
    if (s.stage === 'follow') s = answer(s, mb?.options[0] ?? 'yes');
    s = answer(s, 'This season');

    expect(s.drafts).toHaveLength(2);
    expect(new Set(s.drafts.map((d) => d.areaId)).size).toBe(2);
  });
});

describe('how long a sitting has to be to count', () => {
  it('lets Starter close at ten minutes and Full only at fifteen', () => {
    // The two tracks are the honest-dose decision of the whole product, and
    // the test named for the ten-minute floor asserted fifteen.
    expect(minSecondsToCount('ideal', 'starter')).toBe(10 * 60);
    expect(minSecondsToCount('ideal', 'full')).toBe(15 * 60);

    const starter = { ...startWriting('ideal', 'starter'), elapsed: 10 * 60 };
    expect(canClose(starter)).toBe(true);

    const full = { ...startWriting('ideal', 'full'), elapsed: 10 * 60 };
    expect(canClose(full)).toBe(false);
    expect(canClose({ ...full, elapsed: 15 * 60 })).toBe(true);
  });

  it('does not let a Starter sitting close a minute early', () => {
    const nearly = { ...startWriting('ideal', 'starter'), elapsed: 10 * 60 - 1 };
    expect(canClose(nearly)).toBe(false);
  });

  it('asks the shadow for less on Starter than on Full', () => {
    expect(targetSeconds('shadow', 'starter')).toBeLessThan(targetSeconds('shadow', 'full'));
  });
});

describe('the dawn brief inside a sentence', () => {
  it('does not lowercase a weekday in the user own move title', () => {
    const brief = buildDawnBrief(
      {
        day: '2026-09-10',
        book: null,
        yesterday: null,
        moves: [
          {
            id: 'mv1', goalId: 'g1', milestoneId: null,
            title: 'Tuesday: at 6:40, out the back door',
            effort: 'S', energy: 'high', ifThen: null, scheduledFor: '2026-09-10',
            week: 1, status: 'todo', completedAt: null, minVersion: null,
            sourceLineId: 'a1', order: 0,
          },
        ],
        analyses: [],
        persona: 'gentle',
        score: 40,
        previousScore: 40,
      } as never,
      sequentialIds(),
    );
    expect(brief.today).toContain('Tuesday');
    expect(brief.today).not.toContain('tuesday');
  });

  it('starts with the first open move it is given, in the order Today shows them', () => {
    // The store hands the day's moves already ordered (the one said this
    // morning, then the top-ranked goal's). Re-sorting on each plan's own
    // `order` here used to name a different move from the Now card.
    const mv = (id: string, goalId: string, title: string, order: number, status: 'todo' | 'done' = 'todo') => ({
      id, goalId, milestoneId: null, title, effort: 'S', energy: 'high', ifThen: null, scheduledFor: '2026-09-10',
      week: 1, status, completedAt: status === 'done' ? '2026-09-10T07:00:00Z' : null, minVersion: null, sourceLineId: 'a1', order,
    });
    const brief = buildDawnBrief(
      {
        day: '2026-09-10',
        book: null,
        yesterday: null,
        moves: [mv('done', 'g1', 'Already done', 0, 'done'), mv('health1', 'g_health', 'Out the back door', 1), mv('money0', 'g_money', 'Move the rent', 0)],
        analyses: [],
        persona: 'gentle',
        score: 40,
        previousScore: 40,
      } as never,
      sequentialIds(),
    );
    expect(brief.firstMoveId).toBe('health1');
    expect(brief.today.toLowerCase()).toContain('start with out the back door');
  });
});

describe('dates a person can read', () => {
  it('writes the day the way it is said, not the way it is stored', () => {
    expect(formatDay('2026-10-10', { today: '2026-09-10' })).toBe('10 Oct');
    expect(formatDay('2026-09-08', { today: '2026-09-10', weekday: true })).toBe('Tue 8 Sep');
  });

  it('adds the year only when it is not this one', () => {
    expect(formatDay('2027-01-02', { today: '2026-09-10' })).toBe('2 Jan 2027');
    expect(formatDay('2026-01-02', { today: '2026-09-10' })).toBe('2 Jan');
  });

  it('hands back anything that is not a date unchanged', () => {
    expect(formatDay('')).toBe('');
    expect(formatDay('soon')).toBe('soon');
  });
});

describe('counting things in copy', () => {
  it('does not write "1 goals"', () => {
    expect(plural(1, 'goal')).toBe('1 goal');
    expect(plural(0, 'goal')).toBe('0 goals');
    expect(plural(2, 'goal')).toBe('2 goals');
  });

  it('takes an irregular plural when the word needs one', () => {
    expect(plural(1, 'entry', 'entries')).toBe('1 entry');
    expect(plural(3, 'entry', 'entries')).toBe('3 entries');
  });
});

describe('specificity', () => {
  it('accepts a line with a clock time and a place without a follow-up', () => {
    const r = scoreSpecificity('Tuesday, Thursday, Saturday at 6:40, out the back door');
    expect(r.hasTime).toBe(true);
    expect(r.needsFollowUp).toBe(false);
    expect(r.score).toBeGreaterThan(0.5);
  });

  it('asks once when a line has no time', () => {
    const r = scoreSpecificity('go running more');
    expect(r.needsFollowUp).toBe(true);
    expect(followUpPrompt('strategies')).toBe('When, exactly, and where?');
  });

  it('does not mistake a preposition for a place', () => {
    // The old pattern was (at|in|on|from|to) + optional "the" + any word, so
    // "to run" and "in order" registered as places. Nearly every English
    // sentence contains one, which meant the single follow-up question was
    // never asked of anybody.
    for (const line of ['I want to run more', 'get on top of it', 'in order to feel better']) {
      expect(scoreSpecificity(line).hasPlace, line).toBe(false);
    }
  });

  it('recognises a real place, named or pointed at', () => {
    expect(scoreSpecificity('twenty minutes in the kitchen').hasPlace).toBe(true);
    expect(scoreSpecificity('out the back door and round the park').hasPlace).toBe(true);
    expect(scoreSpecificity('at my desk before anyone else is up').hasPlace).toBe(true);
  });

  it('does not read money or a distance as a clock time', () => {
    // "£10.50" and "5.30 km" both matched the dotted clock form, so a line
    // that never said when scored as though it had.
    expect(scoreSpecificity('put by 10.50 a week').hasTime).toBe(false);
    expect(scoreSpecificity('run 5.30 km').hasTime).toBe(false);
  });

  it('still reads a dotted time when the sentence says it is one', () => {
    expect(scoreSpecificity('out the door at 6.40').hasTime).toBe(true);
    expect(scoreSpecificity('up at 6:15 every day').hasTime).toBe(true);
    expect(scoreSpecificity('7 pm, after the washing up').hasTime).toBe(true);
  });

  it('asks its one question of a line that says what but never when or where', () => {
    const r = scoreSpecificity('read more books this year');
    expect(r.hasTime).toBe(false);
    expect(r.hasPlace).toBe(false);
    expect(r.needsFollowUp).toBe(true);
  });

  it('treats an empty line as needing everything', () => {
    expect(scoreSpecificity('').score).toBe(0);
  });

  it('never exceeds one', () => {
    const r = scoreSpecificity(
      'Every Monday and Thursday at 6:40 in the kitchen for 30 minutes, three times a week, £50 ' + 'x'.repeat(3000),
    );
    expect(r.score).toBeLessThanOrEqual(1);
  });
});

describe('framings', () => {
  it('varies the motives question by domain', () => {
    expect(framingSet('motives', 'money').question).not.toBe(framingSet('motives', 'health').question);
  });

  it('offers three or four framings and the program own prompts for the full track', () => {
    for (const kind of ['motives', 'impact', 'strategies', 'obstacles', 'monitoring'] as const) {
      const set = framingSet(kind, 'craft');
      expect(set.framings.length).toBeGreaterThanOrEqual(3);
      expect(set.framings.length).toBeLessThanOrEqual(4);
      expect(set.fullPrompts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('the Fifteen', () => {
  it('counts a starter session at ten minutes and a full one at fifteen', () => {
    expect(targetSeconds('ideal', 'starter')).toBe(900);
    expect(targetSeconds('shadow', 'starter')).toBe(480);
    expect(targetSeconds('shadow', 'full')).toBe(900);
  });

  it('nudges only after eight idle seconds, and never repeats itself', () => {
    let s = startWriting('ideal', 'starter');
    s = tick(s, 5000, false);
    expect(s.nudge).toBeNull();
    s = tick(s, 4000, false);
    expect(s.nudge).not.toBeNull();
    expect(s.nudgeCount).toBe(1);
    const first = s.nudge!;
    expect(nextNudge(first)).not.toBe(first);
  });

  it('clears the nudge the moment writing resumes', () => {
    let s = startWriting('ideal', 'starter');
    s = tick(s, 9000, false);
    expect(s.nudge).not.toBeNull();
    s = tick(s, 100, true);
    expect(s.nudge).toBeNull();
    expect(s.idleMs).toBe(0);
  });

  it('closes itself when the ring completes', () => {
    let s = startWriting('ideal', 'starter');
    s = tick(s, 900_000, true);
    expect(s.closed).toBe(true);
    expect(ringFraction(s)).toBe(1);
  });

  it('shows depth as polish, never a word count the user can game', () => {
    expect(polish(0)).toBe(0);
    expect(polish(350)).toBeGreaterThan(polish(100));
    expect(polish(5000)).toBe(1);
    expect(wordCount('  one two   three ')).toBe(3);
  });
});

describe('consistency', () => {
  const day = (d: string, over: Partial<DaySummary> = {}): DaySummary => ({
    day: d,
    planned: 3,
    done: 3,
    skipped: 0,
    partial: 0,
    evidenceCount: 1,
    sealedAt: `${d}T21:00:00.000Z`,
    moodWord: 'Steady',
    proof: 'ten floors, twice',
    gladOf: null,
    ...over,
  });

  it('gives a perfect week a high score', () => {
    const days = ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'].map((d) => day(d));
    expect(consistencyScore(days, '2026-09-09')).toBeGreaterThan(90);
  });

  it('counts a two-minute version fully and a not-today as half', () => {
    expect(dayValue({ planned: 2, done: 0, partial: 2, skipped: 0, evidenceCount: 0 })).toBe(1);
    expect(dayValue({ planned: 2, done: 0, partial: 0, skipped: 2, evidenceCount: 0 })).toBe(0.5);
  });

  it('does not punish a day with no plan but with evidence', () => {
    expect(dayValue({ planned: 0, done: 0, partial: 0, skipped: 0, evidenceCount: 1 })).toBe(1);
  });

  it('never resets to zero after a gap', () => {
    const days = [day('2026-09-01'), day('2026-09-02')];
    expect(consistencyScore(days, '2026-09-09')).toBeGreaterThan(0);
  });

  it('detects a return after two or more missed days', () => {
    const days = [day('2026-09-01'), day('2026-09-06')];
    const returns = detectReturns(days, '2026-09-09');
    expect(returns).toHaveLength(1);
    expect(returns[0]!.gapDays).toBe(4);
  });

  it('numbers the return being made, not the last one made', () => {
    // Two gaps come back from already; today is the third time. The ledger
    // cannot show today's return until something is done, so the card that
    // welcomes the third return used to say "Return #2".
    const days = [day('2026-08-01'), day('2026-08-06'), day('2026-08-12')];
    expect(detectReturns(days, '2026-08-20')).toHaveLength(2);
    expect(returnNumberToday(days, '2026-08-20')).toBe(3);
    // The very first return is #1.
    expect(returnNumberToday([day('2026-08-01')], '2026-08-09')).toBe(1);
  });

  it('knows when the user is returning right now', () => {
    const days = [day('2026-09-01')];
    const r = isReturning(days, '2026-09-09');
    expect(r.returning).toBe(true);
    expect(r.gapDays).toBe(7);
  });

  it('reads the trend without ever saying broken', () => {
    const days = ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'].map((d) => day(d));
    const r = reading(days, '2026-09-09');
    expect(r.score).toBeGreaterThan(0);
    expect(r.baselineHigh).toBeGreaterThanOrEqual(r.baselineLow);
  });
});

describe('safety', () => {
  it('catches the contracted and inflected forms people actually write', () => {
    // Each of these slipped through the first version of the screen. The
    // contracted "don't" was the worst of them, because it is the ordinary way
    // anyone writes the sentence.
    const missed = [
      "I don't want to be here any more",
      "I didn't want to wake up this morning",
      'some nights I have thought about killing myself',
      'I ended my life in every version of this I can imagine',
      'I wanted to die for most of last year',
      'I wish I was never born',
      'I have been cutting my arms again',
      'there is nothing left to live for',
      'no point in carrying on',
      "I'd be better off dead",
    ];
    for (const t of missed) {
      expect(screen(t).risk, t).toBe('crisis');
      expect(screen(t).action, t).toBe('resources');
    }
  });

  it('stays over-sensitive on purpose, even when the sentence is a denial', () => {
    // The cost of being wrong here is a card that takes one tap to dismiss.
    // The cost of the other mistake has no floor, so the negation is not
    // excused.
    expect(screen("I don't want to kill myself, I just want to sleep").risk).toBe('crisis');
  });

  it('does not read gym injuries, idioms or savings as a crisis', () => {
    // Every one of these was flagged by the widened patterns, and a flag now
    // excludes the whole sitting from the Book, so each would have quietly
    // deleted somebody's writing.
    for (const t of [
      'I hurt my wrists in the gym again last week.',
      'I keep hurting my legs when I push the pace.',
      'I want to kill my self-doubt.',
      'This year I am taking my life back.',
      'I took my life savings and bought the van.',
      'She took my life apart and I let her.',
    ]) {
      expect(screen(t).risk, t).not.toBe('crisis');
    }
  });

  it('still catches the sentences those patterns are actually for', () => {
    for (const t of [
      'I have been cutting my arms again',
      'I hurt myself on purpose last week',
      'I have thought about taking my own life',
      'I am going to end my life',
      'killing myself would be easier',
    ]) {
      expect(screen(t).risk, t).toBe('crisis');
    }
  });

  it('does not read ordinary hard writing as a crisis', () => {
    for (const t of [
      'It was a terrible year and I gave up in March',
      'I killed the project before it killed me',
      'my grandmother died in the spring and I still miss her',
      'the deadline is killing me',
    ]) {
      expect(screen(t).risk, t).not.toBe('crisis');
    }
  });

  it('takes the stricter of two verdicts and never the softer', () => {
    expect(worseRisk('none', 'crisis')).toBe('crisis');
    expect(worseRisk('crisis', 'none')).toBe('crisis');
    expect(worseRisk('concern', 'crisis')).toBe('crisis');
    expect(isWorse('crisis', 'concern')).toBe(true);
    // A second opinion that comes back calmer changes nothing.
    expect(isWorse('none', 'concern')).toBe(false);
    expect(isWorse('concern', 'concern')).toBe(false);
  });

  it('catches crisis language and routes to resources', () => {
    for (const t of ['I want to kill myself', 'i want to die', "there's no reason to go on"]) {
      const r = screen(t);
      expect(r.risk).toBe('crisis');
      expect(r.action).toBe('resources');
    }
  });

  it('softens on concern without stopping the sitting', () => {
    const r = screen('I hate myself for missing again');
    expect(r.risk).toBe('concern');
    expect(r.action).toBe('soften');
  });

  it('lets ordinary hard writing through', () => {
    expect(screen('It was a terrible year and I gave up in March').risk).toBe('none');
  });

  it('logs a category and never the words', () => {
    const r = screen('I have been bingeing at night');
    expect(r.category).toBe('disordered-eating');
    expect(JSON.stringify(r)).not.toContain('bingeing');
  });

  it('refuses calorie targets, dosing and financial products', () => {
    expect(contentGuard('keep me under 900 calories').allowed).toBe(false);
    expect(contentGuard('what dose should I take').allowed).toBe(false);
    expect(contentGuard('which stock should i buy').allowed).toBe(false);
    expect(contentGuard('book the physio on Thursday').allowed).toBe(true);
  });

  it('ships helplines for the launch regions', () => {
    expect(HELPLINES.map((h) => h.region)).toContain('US');
    expect(HELPLINES.map((h) => h.region)).toContain('PK');
  });
});

describe('the coach', () => {
  const analyses: GoalAnalysis[] = [
    {
      id: 'a2',
      goalId: 'g1',
      kind: 'obstacles',
      track: 'starter',
      framingId: 'o-runout',
      line: "it's raining at 7",
      line2: 'take the stairwell, ten floors, twice',
      specificity: 0.7,
      followupShown: false,
      writtenAt: '2026-09-09T20:00:00.000Z',
    },
  ];

  it('offers the move to the goal it belongs to, in the user own words', () => {
    // The next move across every plan is routinely not the first goal's. It
    // used to be filed under goals[0] with that goal's Strategies line, so a
    // guitar move landed on the running plan attributed to a running sentence.
    const guitar = {
      id: 'mv_guitar',
      goalId: 'g_guitar',
      milestoneId: null,
      title: 'Ten minutes of scales after dinner',
      effort: 'S' as const,
      energy: 'low' as const,
      ifThen: null,
      scheduledFor: '2026-09-10',
      week: 1,
      status: 'todo' as const,
      completedAt: null,
      minVersion: "Two minutes: play, that's the whole ask.",
      sourceLineId: 'a_guitar_strategies',
      order: 0,
    };
    const r = replyToChip('stuck', {
      book: null,
      analyses,
      moves: [guitar],
      days: [],
      today: '2026-09-09',
      returns: 0,
      persona: 'gentle',
    });
    expect(r.action).not.toBeNull();
    // It points at the move they are already stuck on rather than making
    // another one like it: a duplicate row counted against them in the score
    // for not being done.
    expect(r.action?.kind).toBe('shrink-move');
    expect(r.action?.moveId).toBe('mv_guitar');
    expect(r.action?.goalId).toBe('g_guitar');
    // The title is the sentence they wrote. The two-minute version is the
    // app's, so it travels beside it rather than becoming the move.
    expect(r.action?.title).toBe('Ten minutes of scales after dinner');
    expect(r.action?.minVersion).toContain('Two minutes');
  });

  it('does not print the same number twice when celebrating', () => {
    const days: DaySummary[] = [
      { day: '2026-09-01', planned: 1, done: 1, partial: 0, skipped: 0, evidenceCount: 1, sealedAt: '2026-09-01T20:00:00Z', moodWord: null, proof: null, gladOf: null },
      { day: '2026-09-02', planned: 1, done: 1, partial: 0, skipped: 0, evidenceCount: 1, sealedAt: '2026-09-02T20:00:00Z', moodWord: null, proof: null, gladOf: null },
    ];
    const r = replyToChip('celebrate', {
      book: null,
      analyses,
      moves: [],
      days,
      today: '2026-09-09',
      returns: 0,
      persona: 'gentle',
    });
    // Two sealed days and no returns: the sentence must not claim two returns.
    expect(r.text).toContain('2 sealed days');
    expect(r.text).not.toContain('2 returns');
  });

  it('quotes the user own if-then when they are stuck', () => {
    const r = replyToChip('stuck', {
      book: null,
      analyses,
      moves: [],
      days: [],
      today: '2026-09-09',
      returns: 0,
      persona: 'gentle',
    });
    expect(r.text).toContain('stairwell');
    expect(r.quotedSpans.length).toBeGreaterThan(0);
  });

  it('asks a question rather than inventing encouragement when it has nothing to quote', () => {
    const r = replyToChip('dont-feel', {
      book: null,
      analyses: [],
      moves: [],
      days: [],
      today: '2026-09-09',
      returns: 0,
      persona: 'straight',
    });
    expect(r.quotedSpans).toHaveLength(0);
    expect(r.text).toMatch(/\?$/);
  });

  it('offers four chips', () => {
    expect(CHIPS).toHaveLength(4);
  });

  it('writes a dawn brief that quotes the Book', () => {
    const brief = buildDawnBrief(
      {
        day: '2026-09-09',
        book: {
          id: 'b1',
          version: 1,
          title: 'A year of the back door',
          titleFraming: null,
          track: 'starter',
          sealedAt: '2026-09-08T22:41:00.000Z',
          firstSentence: "It's 6:40 and the kitchen is still blue",
          ideal: 'x',
          shadow: null,
          chapters: [],
          iWill: 'I will be out the back door',
          authorshipRatio: 1,
          diff: null,
        },
        yesterday: null,
        moves: [],
        analyses,
        persona: 'gentle',
        score: 71,
        previousScore: 64,
        raining: true,
      },
      sequentialIds(),
    );
    expect(brief.today).toContain('the kitchen is still blue');
    expect(brief.quotedSpans.length).toBeGreaterThan(0);
    expect(brief.ifThen).toContain('It is raining');
  });

  it('writes a returns letter with no streak language', () => {
    const { body } = returnsLetter(null, 5, 4);
    expect(body).toContain('Return #4');
    expect(body.toLowerCase()).not.toContain('streak');
  });
});

describe('helpers', () => {
  it('lifts the day names into the schedule and leaves the sentence whole', () => {
    const moves = splitFirstMoves('Tuesday, Thursday, Saturday at 6:40, out the back door');
    expect(moves).toEqual([
      'Tuesday: at 6:40, out the back door',
      'Thursday: at 6:40, out the back door',
      'Saturday: at 6:40, out the back door',
    ]);
    // The other day names must not survive inside the body, and the person's
    // own first word must not be eaten by the strip that removes them.
    for (const m of moves) {
      expect(m.slice(m.indexOf(':') + 1)).not.toMatch(/day/i);
      // The body must begin with the person's own first word, not a fragment of it.
      expect(m).toContain(': at 6:40, out the back door');
    }
  });

  it('understands plural day names as one habit, not two unrelated moves', () => {
    expect(splitFirstMoves('Mondays and Wednesdays, and then twenty minutes of scales')).toEqual([
      'Monday: twenty minutes of scales',
      'Wednesday: twenty minutes of scales',
    ]);
  });

  it('leaves a single-day line exactly as the person wrote it', () => {
    expect(splitFirstMoves('Saturday at 7am, park run with Sam')).toEqual([
      'Saturday at 7am, park run with Sam',
    ]);
  });

  it('cuts a two-minute version from the user verb', () => {
    expect(minVersionOf('run ten minutes at 6:40')).toContain('run');
  });

  it('proposes an identity line only from the user own words', () => {
    const p = proposeIdentity('I am out the back door before the kettle boils, every Tuesday');
    // The clause is the user's, verbatim, and carries none of the framing.
    expect(p.clause).toBe('out the back door before the kettle boils, every Tuesday');
    expect(p.framing).toBe("I'm becoming someone who is");
    expect(identityLineText(p)).toBe(
      "I'm becoming someone who is out the back door before the kettle boils, every Tuesday",
    );
  });

  it('proposes nothing when the person wrote no state about themselves', () => {
    // "I run every morning" is an action. Fitting it to the frame would mean
    // conjugating their verb, and the app does not get to write.
    expect(proposeIdentity('I run every morning before work').clause).toBe('');
    expect(proposeIdentity('').clause).toBe('');
    expect(identityLineText(proposeIdentity(''))).toBe('');
  });

  it('assigns 1am to yesterday when the day boundary is 3am', () => {
    expect(dayOf(new Date('2026-09-09T01:30:00'), 3)).toBe('2026-09-08');
    expect(dayOf(new Date('2026-09-09T09:30:00'), 3)).toBe('2026-09-09');
  });
});

describe('a sitting that is interrupted', () => {
  const sitting = () => {
    let live = startWriting('ideal', 'full', 'type');
    live = { ...live, body: 'I wake before the house does and the kitchen is already warm.' };
    // Four minutes in.
    for (let i = 0; i < 4 * 60; i += 1) live = tick(live, 1000, true);
    return live;
  };

  it('keeps every word and the elapsed time across a crash', () => {
    const live = sitting();
    const draft = draftOf(live, '2026-09-10T09:00:00.000Z');
    const back = resumeWriting(draft);
    expect(back.body).toBe(live.body);
    expect(Math.round(back.elapsed)).toBe(Math.round(live.elapsed));
    expect(back.kind).toBe('ideal');
    expect(back.track).toBe('full');
  });

  it('lets the sitting be picked up once and no more', () => {
    const first = draftOf(sitting());
    expect(canResume(first)).toBe(true);
    const second = draftOf(resumeWriting(first));
    expect(canResume(second)).toBe(false);
  });

  it('does not close a resumed sitting that still has time on the ring', () => {
    const back = resumeWriting(draftOf(sitting()));
    expect(back.closed).toBe(false);
    expect(back.elapsed).toBeLessThan(targetSeconds('ideal', 'full'));
  });

  it('closes a resumed sitting whose ring had already run out', () => {
    let live = startWriting('ideal', 'starter', 'type');
    live = { ...live, elapsed: targetSeconds('ideal', 'starter') + 1 };
    expect(resumeWriting(draftOf(live)).closed).toBe(true);
  });

  it('does not offer a stray tap back as an unfinished sitting', () => {
    const stray = draftOf({ ...startWriting('ideal', 'full', 'type'), body: 'I', elapsed: 3 });
    expect(draftWorthKeeping(stray)).toBe(false);
    expect(draftWorthKeeping(null)).toBe(false);
    expect(draftWorthKeeping(draftOf(sitting()))).toBe(true);
  });

  it('clears the nudge when a sitting comes back, so it does not resume mid-question', () => {
    let live = startWriting('ideal', 'full', 'type');
    live = { ...live, body: 'something' };
    for (let i = 0; i < 12; i += 1) live = tick(live, 1000, false);
    expect(live.nudge).not.toBeNull();
    expect(resumeWriting(draftOf(live)).nudge).toBeNull();
  });
});

describe('a plan whose first step the user put a week away', () => {
  const goal = {
    id: 'g1',
    title: 'Run a half marathon',
    domain: 'health' as const,
    rank: 0,
    status: 'authored' as const,
    horizon: '1y',
    targetDate: null,
    createdAt: '2026-09-06T00:00:00.000Z',
  };
  const analyses = [
    { id: 'a1', goalId: 'g1', kind: 'strategies' as const, framingLabel: null, line: 'Saturday at 7am, park run with Sam', line2: null, paragraph: null, specificity: 3, createdAt: '2026-09-06T00:00:00.000Z' },
    { id: 'a2', goalId: 'g1', kind: 'monitoring' as const, framingLabel: null, line: 'The watch says 21.1', line2: null, paragraph: null, specificity: 3, createdAt: '2026-09-06T00:00:00.000Z' },
  ];
  let n = 0;
  const newId = (p: string) => `${p}-${(n += 1)}`;

  it('still builds, instead of leaving the person with no plan at all', () => {
    // 2026-09-06 is a Sunday, so the next Saturday is six days out.
    const plan = buildPlan({ goal, analyses } as never, { today: '2026-09-06', newId });
    expect(plan.moves.length).toBeGreaterThan(0);
    expect(validatePlan(plan, analyses as never, '2026-09-06')).toEqual([]);
  });

  it('opens within 48 hours and keeps the day the user actually named', () => {
    const plan = buildPlan({ goal, analyses } as never, { today: '2026-09-06', newId });
    const dates = plan.moves.map((m) => m.scheduledFor).sort();
    expect(dates[0]).toBe('2026-09-07');
    expect(dates).toContain('2026-09-12');
  });

  it('puts the user own words in the opening move, not the app own', () => {
    const plan = buildPlan({ goal, analyses } as never, { today: '2026-09-06', newId });
    const first = plan.moves.find((m) => m.scheduledFor === '2026-09-07');
    expect(first?.title.toLowerCase()).toContain('park run');
    expect(first?.sourceLineId).toBe('a1');
  });

  it('never puts more than three moves in the first week', () => {
    const many = [
      { ...analyses[0]!, line: 'Monday, Tuesday, Wednesday, Thursday and Friday at 6:40, out the back door' },
      analyses[1]!,
    ];
    const plan = buildPlan({ goal, analyses: many } as never, { today: '2026-09-06', newId });
    expect(plan.moves.filter((m) => m.week === 1).length).toBeLessThanOrEqual(3);
  });
});

/**
 * The Book as a list of pages, for the Sunday reading (PRD §7.3).
 *
 * "A reading view with no controls but a page turn" needs the Book to be pages
 * rather than one scroll — and the pages must be the printed order, because a
 * reading view that reorders somebody's own document is a different document.
 */
describe('the Book turns into pages', () => {
  const book = {
    firstSentence: 'It is 6:40 and the kitchen is still blue.',
    ideal: 'It is 6:40 and the kitchen is still blue. Sam is still asleep.',
    shadow: null,
    iWill: 'I will be out the back door before the kettle boils',
    sealedAt: '2026-09-10T21:00:00.000Z',
    chapters: [
      { goalId: 'g1', name: '5 km race', horizon: 'Three months', lines: [] },
      { goalId: 'g2', name: 'Sleep by eleven', horizon: 'Three months', lines: [] },
    ],
  } as unknown as BookVersion;

  it('opens with the Fifteen and ends with the I will', () => {
    const pages = bookPages(book);
    expect(pages[0]!.kind).toBe('opening');
    expect(pages[pages.length - 1]!.kind).toBe('i-will');
  });

  it('puts the contents before the chapters, in rank order', () => {
    const kinds = bookPages(book).map((p) => p.kind);
    expect(kinds).toEqual(['opening', 'contents', 'chapter', 'chapter', 'i-will']);
  });

  it('gives the other road its own page only when it was written', () => {
    expect(bookPages(book).some((p) => p.kind === 'shadow')).toBe(false);
    const withShadow = { ...book, shadow: 'The mornings go and I do not notice.' } as BookVersion;
    expect(bookPages(withShadow).some((p) => p.kind === 'shadow')).toBe(true);
  });

  it('agrees with the page count printed on the Book', () => {
    expect(pageCount(book)).toBe(bookPages(book).length);
    const withShadow = { ...book, shadow: 'x' } as BookVersion;
    expect(pageCount(withShadow)).toBe(bookPages(withShadow).length);
  });

  it('does not repeat the first sentence in the body of the opening page', () => {
    const opening = bookPages(book)[0]!;
    if (opening.kind !== 'opening') throw new Error('first page is not the opening');
    expect(opening.rest.startsWith('It is 6:40')).toBe(false);
    expect(opening.rest).toContain('Sam is still asleep');
  });
});

/**
 * `endSentence`, now shared. The app ends a great many sentences with a
 * quotation of theirs, and theirs usually ends in a full stop already. Every
 * one of these shapes was on screen at some point: `way.".`, `blue.”.`
 */
describe('one full stop, whoever wrote it', () => {
  it('adds a stop when the quotation has none', () => {
    expect(endSentence('“out the back door”')).toBe('“out the back door”.');
  });

  it('does not double one the person already wrote', () => {
    expect(endSentence('“Rained the whole way.”')).toBe('“Rained the whole way.”');
    expect(endSentence('“Did it!”')).toBe('“Did it!”');
    expect(endSentence('“Really?”')).toBe('“Really?”');
  });

  it('is happy with plain prose and with nothing', () => {
    expect(endSentence('Say it out loud')).toBe('Say it out loud.');
    expect(endSentence('Say it out loud.')).toBe('Say it out loud.');
    expect(endSentence('')).toBe('');
    expect(endSentence('   ')).toBe('');
  });
});

describe('the body of the Fifteen after its first sentence', () => {
  it('starts where the shown sentence stops, not at its character count', () => {
    const ideal = 'It is 6:40 and the kitchen is still blue. Sam is still asleep.';
    expect(restOfIdeal(ideal, firstSentence(ideal))).toBe('Sam is still asleep.');
  });

  it('survives a line break inside the opening sentence', () => {
    const ideal = 'It is 6:40 and the\nkitchen is still blue.\n\nSam is still asleep.';
    const shown = firstSentence(ideal);
    expect(shown).toBe('It is 6:40 and the kitchen is still blue.');
    expect(restOfIdeal(ideal, shown)).toBe('Sam is still asleep.');
  });

  it('prints nothing twice when the sentence was cut with an ellipsis', () => {
    const long = `${'The kitchen is still blue and the kettle is not on yet and the dog has not stirred, '.repeat(3)}and I am up. Then the rest.`;
    const shown = firstSentence(long);
    expect(shown.endsWith('…')).toBe(true);
    const rest = restOfIdeal(long, shown);
    const head = shown.slice(0, -1).split(' ').slice(-3).join(' ');
    expect(rest.startsWith(head)).toBe(false);
    expect(rest.startsWith(',')).toBe(false);
    expect(`${shown.slice(0, -1)} ${rest}`.replace(/\s+/g, ' ')).toBe(long.replace(/\s+/g, ' '));
  });

  it('falls back to the whole text when the sentence is not from it', () => {
    expect(restOfIdeal('Something else entirely.', 'It is 6:40.')).toBe('Something else entirely.');
  });
});

describe('the if-then as one sentence', () => {
  it('supplies the framing once, whatever of it they typed', () => {
    expect(ifThenOf('I stay up too late', 'put the phone in the hall').sentence).toBe('if I stay up too late, then I put the phone in the hall');
    expect(ifThenOf('If I stay up too late,', 'then I put the phone in the hall.').sentence).toBe(
      'if I stay up too late, then I put the phone in the hall',
    );
    expect(ifThenOf('it rains', 'I put the phone in the hall').sentence).toBe('if it rains, then I put the phone in the hall');
  });

  it("keeps their contraction rather than printing 'then I I'll'", () => {
    expect(ifThenOf('it rains', "I'll go anyway").sentence).toBe("if it rains, then I'll go anyway");
    expect(ifThenOf('it rains', 'I’m going anyway').sentence).toBe('if it rains, then I’m going anyway');
  });

  it('takes their full stop off so the sentence gets exactly one', () => {
    const { sentence } = ifThenOf('it rains.', 'go anyway.');
    expect(endSentence(sentence)).toBe('if it rains, then I go anyway.');
  });

  it('hands back spans that are still substrings of what they wrote', () => {
    const line = 'If I stay up too late,';
    const line2 = "then I'll put the phone in the hall.";
    const { spans, sentence } = ifThenOf(line, line2);
    for (const s of spans) {
      expect(line.includes(s) || line2.includes(s), s).toBe(true);
      expect(sentence).toContain(s);
    }
  });
});

describe('the first sentence, at its real end', () => {
  it('takes the whole run of terminators and a decimal point is not an end', () => {
    expect(firstSentence('I want to run every morning... Not just some mornings.')).toBe('I want to run every morning...');
    expect(firstSentence('Is this really it?! I want more.')).toBe('Is this really it?!');
    expect(firstSentence('I want to be 1.5x fitter by spring. Then more.')).toBe('I want to be 1.5x fitter by spring.');
    expect(firstSentence('He said “go.” So I went.')).toBe('He said “go.”');
  });

  it('leaves the body starting at the next sentence', () => {
    const ideal = 'I want to run every morning... Not just some mornings.';
    expect(restOfIdeal(ideal, firstSentence(ideal))).toBe('Not just some mornings.');
  });

  it('keeps an ellipsis that is theirs', () => {
    const ideal = 'I want to be someone who runs…';
    const shown = firstSentence(ideal);
    expect(shown).toBe(ideal);
    expect(restOfIdeal(ideal, shown)).toBe('');
  });
});

describe('the second half of an if-then on its own line', () => {
  it('prints whatever framing they did not type themselves', () => {
    expect(thenHalf('put the phone in the hall')).toEqual({ framing: '…then I', act: 'put the phone in the hall' });
    expect(thenHalf('then I put the phone in the hall.')).toEqual({ framing: '…then I', act: 'put the phone in the hall' });
    expect(thenHalf("I'll put the phone in the hall")).toEqual({ framing: '…then', act: "I'll put the phone in the hall" });
    expect(thenHalf('then, i put the phone in the hall')).toEqual({ framing: '…then I', act: 'put the phone in the hall' });
  });
});

describe('moves cut from a line with days in the middle of it', () => {
  it('keeps the sentence whole rather than lifting the days out of it', () => {
    const moves = splitFirstMoves('I run on Monday and Wednesday at 6:40 before work');
    expect(moves).toEqual(['Monday: I run on Monday and Wednesday at 6:40 before work', 'Wednesday: I run on Monday and Wednesday at 6:40 before work']);
  });
  it('still lifts a leading run of days', () => {
    expect(splitFirstMoves('Tuesday, Thursday, Saturday at 6:40, out the back door')).toEqual([
      'Tuesday: at 6:40, out the back door',
      'Thursday: at 6:40, out the back door',
      'Saturday: at 6:40, out the back door',
    ]);
    expect(splitFirstMoves('Every Monday, Wednesday and Friday I go to the pool at 7')[0]).toBe('Monday: I go to the pool at 7');
  });
});
