import { describe, expect, it } from 'vitest';
import {
  PracticeInvalid,
  buildPractice,
  scheduleLabel,
  dueOn,
  durationLabel,
  logOf,
  nextStep,
  practiceValue,
  startRun,
  suggestSteps,
  tickRun,
  totalSeconds,
  type GoalAnalysis,
  type Practice,
} from '../src/index';
import { sequentialIds } from '../src/ids';

const SOURCE = {
  id: 'a_strategies',
  line: 'Tuesday, Thursday, Saturday at 6:40, out the back door',
  paragraph: undefined,
} as Pick<GoalAnalysis, 'id' | 'line' | 'paragraph'>;

const build = (over: Partial<Parameters<typeof buildPractice>[0]> = {}) =>
  buildPractice({
    goalId: 'g1',
    title: 'The morning round',
    kind: 'routine',
    steps: [
      { text: 'Shoes on at the back door', seconds: 60 },
      { text: 'Out to the second bridge', seconds: 1200 },
      { text: 'Stretch on the step', seconds: 300 },
    ],
    schedule: { type: 'days', days: [2, 4, 6] },
    source: SOURCE,
    newId: sequentialIds(),
    ...over,
  });

describe('building a practice', () => {
  it('keeps the line it came from, like a move does', () => {
    // Same rule as the Blueprint: nothing on Today exists without a sentence
    // of theirs behind it.
    expect(build().sourceLineId).toBe('a_strategies');
  });

  it('cuts a two-minute version from their words when they have not written one', () => {
    const p = build();
    expect(p.minVersion.length).toBeGreaterThan(0);
    expect(p.minVersion.toLowerCase()).toContain('two minutes');
  });

  it('keeps a two-minute version the person wrote themselves', () => {
    const p = build({ minVersion: 'Just put the shoes on.' });
    expect(p.minVersion).toBe('Just put the shoes on.');
  });

  it('refuses a practice with no name', () => {
    expect(() => build({ title: '   ' })).toThrow(PracticeInvalid);
  });

  it('refuses a practice with no line behind it', () => {
    expect(() => build({ source: { id: '', line: '', paragraph: undefined } as never })).toThrow(PracticeInvalid);
  });

  it('refuses a habit that is secretly a routine', () => {
    expect(() =>
      build({
        kind: 'habit',
        steps: [
          { text: 'One', seconds: 60 },
          { text: 'Two', seconds: 60 },
        ],
      }),
    ).toThrow(PracticeInvalid);
  });

  it('refuses a step with no length', () => {
    expect(() => build({ steps: [{ text: 'Shoes on', seconds: 0 }] })).toThrow(PracticeInvalid);
  });

  it('drops blank steps rather than storing an unactionable one', () => {
    const p = build({
      steps: [
        { text: 'Shoes on', seconds: 60 },
        { text: '   ', seconds: 60 },
      ],
    });
    expect(p.steps).toHaveLength(1);
  });

  it('adds up its own length', () => {
    expect(totalSeconds(build())).toBe(60 + 1200 + 300);
  });
});

describe('proposing steps from what they already wrote', () => {
  it('cuts them out of the strategy line, never invents them', () => {
    const steps = suggestSteps(SOURCE);
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      // Every proposed title has to be traceable to their sentence.
      expect(s.text.toLowerCase()).toContain('back door');
    }
  });

  it('proposes nothing when there is nothing to cut', () => {
    expect(suggestSteps({ id: 'x', line: '', paragraph: undefined } as never)).toEqual([]);
  });
});

describe('when a practice comes round', () => {
  const p = build();

  it('lands on the named weekdays and nowhere else', () => {
    // 2026-09-10 is a Thursday, 2026-09-11 a Friday.
    expect(dueOn(p, '2026-09-10')).toBe(true);
    expect(dueOn(p, '2026-09-11')).toBe(false);
    expect(dueOn(p, '2026-09-12')).toBe(true);
  });

  it('waits out the interval it was given', () => {
    const every3 = build({ schedule: { type: 'interval', intervalDays: 3 } });
    expect(dueOn(every3, '2026-09-10', null)).toBe(true);
    expect(dueOn(every3, '2026-09-11', '2026-09-10')).toBe(false);
    expect(dueOn(every3, '2026-09-13', '2026-09-10')).toBe(true);
  });

  it('never asks for an archived practice', () => {
    expect(dueOn({ ...p, archivedAt: '2026-09-01T00:00:00Z' }, '2026-09-10')).toBe(false);
  });

  it('says when it comes round in words a person would use', () => {
    expect(scheduleLabel({ type: 'days', days: [1, 2, 3, 4, 5] })).toBe('Weekdays');
    expect(scheduleLabel({ type: 'days', days: [0, 6] })).toBe('Weekends');
    expect(scheduleLabel({ type: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day');
    expect(scheduleLabel({ type: 'interval', intervalDays: 1 })).toBe('Every day');
    expect(scheduleLabel({ type: 'interval', intervalDays: 3 })).toBe('Every 3 days');
    expect(scheduleLabel({ type: 'anchor', anchorText: 'coffee' })).toBe('After coffee');
  });

  it('writes a duration the way it is said', () => {
    expect(durationLabel(60)).toBe('1 min');
    expect(durationLabel(1200)).toBe('20 min');
    expect(durationLabel(30)).toBe('30 sec');
  });
});

describe('running a practice', () => {
  const p: Practice = build();

  it('does not march on without the person', () => {
    // A step whose clock runs out stays put. The clock is a guide; they are the
    // one doing it, and a routine that advances itself is one you fight.
    let s = startRun(p);
    s = tickRun(s, 120_000);
    expect(s.remaining).toBe(0);
    expect(s.stepIndex).toBe(0);
    expect(s.done).toBe(false);
  });

  it('moves on when they say so, and finishes at the last step', () => {
    let s = startRun(p);
    s = nextStep(s, p);
    expect(s.stepIndex).toBe(1);
    expect(s.remaining).toBe(1200);
    s = nextStep(s, p);
    s = nextStep(s, p);
    expect(s.done).toBe(true);
    expect(s.running).toBe(false);
  });

  it('treats the two-minute version as one step and finishes it', () => {
    let s = startRun(p, true);
    expect(s.remaining).toBe(120);
    s = nextStep(s, p);
    expect(s.done).toBe(true);
  });

  it('leaves a log of what actually happened, finished or not', () => {
    const ids = sequentialIds();
    let s = startRun(p);
    s = nextStep(s, p);
    // Walked away after one step.
    const abandoned = logOf(s, p, '2026-09-10', ids);
    expect(abandoned.stepsDone).toBe(1);
    expect(abandoned.stepsTotal).toBe(3);
    expect(abandoned.completedAt).toBeNull();

    s = nextStep(s, p);
    s = nextStep(s, p);
    const finished = logOf(s, p, '2026-09-10', ids);
    expect(finished.stepsDone).toBe(3);
    expect(finished.completedAt).not.toBeNull();
  });
});

describe('what a practice is worth to a day', () => {
  const p = build();
  const ids = sequentialIds();

  it('counts the two-minute version in full', () => {
    // The mechanism, not generosity: the person who keeps the smallest version
    // on a bad day is the person still doing this in March.
    let s = startRun(p, true);
    s = nextStep(s, p);
    expect(practiceValue(logOf(s, p, '2026-09-10', ids))).toBe(1);
  });

  it('counts part of a routine as part of a day', () => {
    let s = startRun(p);
    s = nextStep(s, p);
    expect(practiceValue(logOf(s, p, '2026-09-10', ids))).toBeCloseTo(1 / 3, 5);
  });

  it('counts nothing for a day it was not done', () => {
    expect(practiceValue(null)).toBe(0);
  });
});
