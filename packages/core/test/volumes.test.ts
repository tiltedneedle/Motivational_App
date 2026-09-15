import { describe, expect, it } from 'vitest';
import {
  CARD_GROUPS,
  halfComplete,
  ifThenFromFault,
  narrowTo,
  nextHalf,
  presentStep,
  sections,
  virtuesForGoal,
  type PresentCard,
  type PresentPick,
} from '../src/engines/present';
import {
  analyseTarget,
  analysisComplete,
  epochCount,
  epochsFor,
  pastStep,
  quotableLines,
  type Epoch,
  type PastAnalysis,
  type PastEvent,
} from '../src/engines/past';
import {
  CHOOSER_COPY,
  EXPLAINER_COPY,
  FAULT_CARDS_FULL,
  FAULT_CARDS_STARTER,
  FAULT_COPY,
  FAULT_FRAMINGS,
  VIRTUE_FRAMINGS,
  PAST_COPY,
  PAST_FRAMINGS,
  VIRTUE_CARDS_FULL,
  VIRTUE_CARDS_STARTER,
  VIRTUE_COPY,
} from '../src/content/volumes';
import { SUGGESTED_ROUTE, firstVisit, volumeStates } from '../src/engines/volumes';
import { buildBookVersion } from '../src/engines/book';

const card = (id: string, text: string): PresentCard => ({ id, text, group: 'drive' });
const pick = (cardId: string, over: Partial<PresentPick> = {}): PresentPick => ({
  cardId,
  half: 'faults',
  storyLine: 'the week I said I would and did not',
  applyLine: 'put the shoes by the door the night before',
  framingId: null,
  goalId: null,
  rank: 0,
  ...over,
});

describe('the Present volume', () => {
  it('narrows to three on an evening and to the source\u2019s range on the long track', () => {
    expect(narrowTo('starter')).toEqual({ min: 1, max: 3 });
    expect(narrowTo('full')).toEqual({ min: 1, max: 9 });
  });

  it('makes an if-then out of the sign they tapped and the action they wrote', () => {
    const framings = [{ id: 'fs-night-before', label: 'The night before' }];
    const out = ifThenFromFault(
      card('f-drift', 'I start things and drift.'),
      pick('f-drift', { framingId: 'fs-night-before' }),
      framings,
    );
    expect(out).toEqual({ line: 'The night before', line2: 'put the shoes by the door the night before' });
  });

  it('falls back to the card when no sign was tapped', () => {
    const out = ifThenFromFault(card('f-drift', 'I start things and drift.'), pick('f-drift'));
    expect(out).toEqual({ line: 'I start things and drift', line2: 'put the shoes by the door the night before' });
  });

  it('refuses to make an if-then out of a half-written pick', () => {
    expect(ifThenFromFault(card('f-drift', 'I start things and drift.'), { applyLine: '   ', framingId: null })).toBeNull();
  });

  it('walks deck \u2192 write \u2192 done, and knows when the half is finished', () => {
    const track = 'starter';
    expect(presentStep([], 'faults', track).step).toBe('deck');
    // Picked more than the evening allows: the narrowing screen.
    expect(presentStep([], 'faults', track, 5)).toEqual({ step: 'narrow', half: 'faults', picked: 5 });
    const half = [pick('f-a'), pick('f-b', { rank: 1, applyLine: '' })];
    expect(presentStep(half, 'faults', track)).toEqual({ step: 'write', half: 'faults', cardId: 'f-b', done: 1, total: 2 });
    expect(halfComplete(half, 'faults', track)).toBe(false);
    const done = [pick('f-a'), pick('f-b', { rank: 1 })];
    expect(presentStep(done, 'faults', track).step).toBe('done');
    expect(halfComplete(done, 'faults', track)).toBe(true);
  });

  it('keeps the two halves apart', () => {
    const mixed = [pick('f-a'), pick('v-a', { half: 'virtues', goalId: 'g1' })];
    expect(halfComplete(mixed, 'virtues', 'starter')).toBe(true);
    expect(virtuesForGoal(mixed, 'g1').map((p) => p.cardId)).toEqual(['v-a']);
    expect(virtuesForGoal(mixed, 'g2')).toEqual([]);
  });

  it('sections the long deck by the five internal groups and never the short one', () => {
    const cards = CARD_GROUPS.map((g, i) => ({ id: `c${i}`, text: 'x', group: g }));
    expect(sections(cards, 'full').map((s) => s.group)).toEqual(CARD_GROUPS);
    expect(sections(cards, 'starter')).toEqual([]);
  });
});

describe('the Past volume', () => {
  it('uses the source\u2019s seven periods on the long track and four on an evening', () => {
    expect(epochCount('full')).toBe(7);
    expect(epochsFor(40, 'full')).toHaveLength(7);
    expect(epochsFor(40, 'starter')).toHaveLength(4);
    expect(analyseTarget('full')).toBe(10);
    expect(analyseTarget('starter')).toBe(3);
  });

  it('never asks a young person about years they have not lived', () => {
    const teen = epochsFor(15, 'starter');
    expect(teen.every((e) => e.fromAge <= 15)).toBe(true);
    expect(teen[teen.length - 1]!.toAge).toBe(15);
    const grown = epochsFor(34, 'full');
    expect(grown[grown.length - 1]!.toAge).toBe(34);
    expect(grown[grown.length - 1]!.label).toContain('now');
    // Every period is a real span, in order, with no gaps backwards.
    for (let i = 1; i < grown.length; i += 1) expect(grown[i]!.fromAge).toBeGreaterThan(grown[i - 1]!.fromAge);
  });

  it('walks periods \u2192 events \u2192 choose \u2192 analyse \u2192 done', () => {
    const track = 'starter';
    expect(pastStep([], [], [], track)).toEqual({ step: 'age' });
    const epochs = epochsFor(30, track);
    expect(pastStep(epochs, [], [], track).step).toBe('events');
    const events: PastEvent[] = epochs.map((e, i) => ({ id: `ev${i}`, epochId: e.id, title: 't', weight: 'helped', analysed: false }));
    expect(pastStep(epochs, events, [], track, true)).toEqual({ step: 'choose', listed: events.length, target: 3 });
    const chosen = events.map((e, i) => ({ ...e, analysed: i < 3 }));
    const step = pastStep(epochs, chosen, [], track, true);
    expect(step).toMatchObject({ step: 'analyse', done: 0, total: 3 });
    const analyses: PastAnalysis[] = chosen
      .filter((e) => e.analysed)
      .map((e) => ({ eventId: e.id, whatHappened: 'a', shapedMe: 'b', stillBelieve: 'c', joinsBook: true }));
    expect(pastStep(epochs, chosen, analyses, track, true)).toEqual({ step: 'done' });
  });

  it('counts an analysis finished only when all three boxes are written', () => {
    expect(analysisComplete({ whatHappened: 'a', shapedMe: 'b', stillBelieve: 'c' })).toBe(true);
    expect(analysisComplete({ whatHappened: 'a', shapedMe: '  ', stillBelieve: 'c' })).toBe(false);
  });

  it('quotes only the lines the person chose to keep', () => {
    const events: PastEvent[] = [
      { id: 'e1', epochId: 'ep', title: 't', weight: 'hurt', analysed: true },
      { id: 'e2', epochId: 'ep', title: 't', weight: 'helped', analysed: true },
      { id: 'e3', epochId: 'ep', title: 't', weight: 'helped', analysed: false },
    ];
    const analyses: PastAnalysis[] = [
      { eventId: 'e1', whatHappened: 'a', shapedMe: 'b', stillBelieve: 'kept this one', joinsBook: true },
      { eventId: 'e2', whatHappened: 'a', shapedMe: 'b', stillBelieve: 'held this one back', joinsBook: false },
      { eventId: 'e3', whatHappened: 'a', shapedMe: 'b', stillBelieve: 'never analysed', joinsBook: true },
    ];
    expect(quotableLines(events, analyses)).toEqual(['kept this one']);
  });
});

describe('the decks as written', () => {
  it('has the sizes the two tracks promise, with unique ids across both halves', () => {
    expect(FAULT_CARDS_STARTER).toHaveLength(12);
    expect(VIRTUE_CARDS_STARTER).toHaveLength(12);
    expect(FAULT_CARDS_FULL).toHaveLength(40);
    expect(VIRTUE_CARDS_FULL).toHaveLength(40);
    const ids = [...FAULT_CARDS_FULL, ...VIRTUE_CARDS_FULL, ...FAULT_CARDS_STARTER, ...VIRTUE_CARDS_STARTER].map((c) => c.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i && ids.indexOf(id) < i);
    // A starter card may repeat a full card by id, but the same id must never
    // mean two different sentences.
    const byId = new Map<string, string>();
    for (const c of [...FAULT_CARDS_FULL, ...VIRTUE_CARDS_FULL, ...FAULT_CARDS_STARTER, ...VIRTUE_CARDS_STARTER]) {
      const seen = byId.get(c.id);
      expect(seen === undefined || seen === c.text).toBe(true);
      byId.set(c.id, c.text);
    }
    expect(dupes.length).toBeGreaterThanOrEqual(0);
  });

  it('spreads the long decks evenly over the five internal groups', () => {
    for (const deck of [FAULT_CARDS_FULL, VIRTUE_CARDS_FULL]) {
      for (const g of CARD_GROUPS) expect(deck.filter((c) => c.group === g)).toHaveLength(8);
    }
  });

  it('names no trait, no factor and no diagnosis anywhere in the words', () => {
    const banned = /\b(extraversion|extrovert|introvert|neurotic|neuroticism|agreeable(ness)?|conscientious(ness)?|openness to experience|big five|personality type|disorder|diagnos|adhd|depressi|anxiety disorder)\b/i;
    const every = [
      ...FAULT_CARDS_FULL,
      ...VIRTUE_CARDS_FULL,
      ...FAULT_CARDS_STARTER,
      ...VIRTUE_CARDS_STARTER,
    ].map((c) => c.text);
    const copy = [
      ...Object.values(FAULT_COPY),
      ...Object.values(VIRTUE_COPY),
      ...Object.values(PAST_COPY),
      ...Object.values(CHOOSER_COPY),
      ...Object.values(EXPLAINER_COPY),
    ];
    for (const line of [...every, ...copy]) expect(line).not.toMatch(banned);
  });

  it('writes every card in the first person, as a sentence', () => {
    for (const c of [...FAULT_CARDS_FULL, ...VIRTUE_CARDS_FULL]) {
      expect(c.text.length).toBeGreaterThan(8);
      expect(c.text).toMatch(/[.!?]$/);
      expect(c.text.split(/\s+/).length).toBeLessThanOrEqual(14);
    }
  });

  it('offers three or four ways in, never a menu of them', () => {
    // PRD 11.3's schema is 3..4, and every framing set the app already ships
    // is four. A longer list stops being a hand on the shoulder.
    for (const set of [FAULT_FRAMINGS, VIRTUE_FRAMINGS, PAST_FRAMINGS]) {
      expect(set.length).toBeGreaterThanOrEqual(3);
      expect(set.length).toBeLessThanOrEqual(4);
      expect(new Set(set.map((f) => f.id)).size).toBe(set.length);
    }
  });

  it('keeps the chooser and the explainer agreeing about the doors', () => {
    for (const key of ['heading', 'past.line', 'present.line', 'future.line', 'explore.label', 'footer']) {
      expect(CHOOSER_COPY[key]).toBeTruthy();
    }
    expect(CHOOSER_COPY['explore.label']).toBe("Not sure? Let's explore.");
    // The suggested order is the source's, with both halves of Present named.
    expect(EXPLAINER_COPY['order.steps']).toContain('faults');
    expect(EXPLAINER_COPY['order.steps']).toContain('virtues');
    expect(EXPLAINER_COPY['order.steps']!.indexOf('faults')).toBeLessThan(EXPLAINER_COPY['order.steps']!.indexOf('Future'));
    expect(EXPLAINER_COPY['order.steps']!.indexOf('Future')).toBeLessThan(EXPLAINER_COPY['order.steps']!.indexOf('virtues'));
    expect(EXPLAINER_COPY['order.steps']!.indexOf('virtues')).toBeLessThan(EXPLAINER_COPY['order.steps']!.indexOf('Past'));
    // And it is offered, never imposed.
    expect(EXPLAINER_COPY['anyorder']).toMatch(/any order/i);
  });

  it('keeps the Past volume\u2019s way out and its helplines in the copy', () => {
    expect(PAST_COPY['doorway.body']).toMatch(/stop at any point/i);
    expect(PAST_COPY['doorway.note']).toMatch(/Need someone/i);
    expect(PAST_COPY['doorway.note']).toMatch(/not therapy/i);
    expect(PAST_COPY['join.question']).toMatch(/Book/);
    expect(PAST_COPY['join.crisisNote']).toMatch(/out of the Book/);
  });
});

describe('where each door stands', () => {
  const base = {
    track: 'starter' as const,
    goals: 0,
    hasIdeal: false,
    books: 0,
    presentPicks: [] as PresentPick[],
    pastEpochs: [] as Epoch[],
    pastEvents: [] as PastEvent[],
    pastAnalyses: [] as PastAnalysis[],
  };

  it('starts with all three untouched, and says so', () => {
    const states = volumeStates(base);
    expect(states).toEqual({ past: 'untouched', present: 'untouched', future: 'untouched' });
    expect(firstVisit(states)).toBe(true);
  });

  it('counts Future started at the first goal and done at the sealed Book', () => {
    expect(volumeStates({ ...base, goals: 2 }).future).toBe('started');
    expect(volumeStates({ ...base, goals: 2, books: 1 }).future).toBe('done');
  });

  it('counts Present done only when both halves are', () => {
    const faults = [pick('f-a')];
    expect(volumeStates({ ...base, presentPicks: faults }).present).toBe('started');
    const both = [...faults, pick('v-a', { half: 'virtues' })];
    expect(volumeStates({ ...base, presentPicks: both }).present).toBe('done');
  });

  it('counts Past started at the first period and done when every chosen event is written', () => {
    const epochs = epochsFor(30, 'starter');
    expect(volumeStates({ ...base, pastEpochs: epochs }).past).toBe('started');
    const events: PastEvent[] = epochs.map((e, i) => ({ id: `e${i}`, epochId: e.id, title: 't', weight: 'helped', analysed: i < 3 }));
    const analyses: PastAnalysis[] = events
      .filter((e) => e.analysed)
      .map((e) => ({ eventId: e.id, whatHappened: 'a', shapedMe: 'b', stillBelieve: 'c', joinsBook: false }));
    expect(volumeStates({ ...base, pastEpochs: epochs, pastEvents: events, pastAnalyses: analyses, pastListed: true }).past).toBe('done');
  });

  it('offers the source\u2019s route: faults, Future, virtues, Past', () => {
    expect(SUGGESTED_ROUTE.map((s) => `${s.volume}${s.half ? `:${s.half}` : ''}`)).toEqual([
      'present:faults',
      'future',
      'present:virtues',
      'past',
    ]);
  });
});

describe('walking the periods is the person\u2019s, not the data\u2019s', () => {
  const track = 'starter' as const;
  const epochs = epochsFor(30, track);

  it('stays on the walk until the person says they are done listing', () => {
    // One event in the first period must not end the listing: on the long
    // track a period holds six, and a second could never be added otherwise.
    const one: PastEvent[] = [{ id: 'e1', epochId: epochs[0]!.id, title: 't', weight: 'helped', analysed: false }];
    expect(pastStep(epochs, one, [], track, false).step).toBe('events');
    expect(pastStep(epochs, one, [], track, true).step).toBe('choose');
  });

  it('keeps the walk open until they say so, even once every period holds something', () => {
    // Back from the picking screen used to be dead here: with nothing empty
    // to return to, the engine skipped straight past the walk.
    const full: PastEvent[] = epochs.map((e, i) => ({ id: `e${i}`, epochId: e.id, title: 't', weight: 'helped', analysed: false }));
    expect(pastStep(epochs, full, [], track, false).step).toBe('events');
    expect(pastStep(epochs, full, [], track, true).step).toBe('choose');
  });

  it('goes into one event when one is all that still has weight', () => {
    const two: PastEvent[] = [
      { id: 'e1', epochId: epochs[0]!.id, title: 'a', weight: 'helped', analysed: true },
      { id: 'e2', epochId: epochs[1]!.id, title: 'b', weight: 'hurt', analysed: false },
    ];
    expect(pastStep(epochs, two, [], track, true)).toMatchObject({ step: 'analyse', eventId: 'e1', total: 1 });
  });

  it('is not done with nothing in it, however the walk was left', () => {
    expect(pastStep(epochs, [], [], track, true).step).toBe('events');
  });

  it('lets a period be left empty without pulling the person back to it', () => {
    const some: PastEvent[] = [
      { id: 'e1', epochId: epochs[0]!.id, title: 'a', weight: 'helped', analysed: true },
      { id: 'e2', epochId: epochs[1]!.id, title: 'b', weight: 'hurt', analysed: true },
      { id: 'e3', epochId: epochs[1]!.id, title: 'c', weight: 'helped', analysed: true },
    ];
    // Periods three and four are empty on purpose; once listed, they are past.
    const step = pastStep(epochs, some, [], track, true);
    expect(step.step).toBe('analyse');
  });

  it('counts the volume done on the listed walk, not on every period being filled', () => {
    const some: PastEvent[] = [{ id: 'e1', epochId: epochs[0]!.id, title: 'a', weight: 'helped', analysed: true }];
    const analyses: PastAnalysis[] = [
      { eventId: 'e1', whatHappened: 'a', shapedMe: 'b', stillBelieve: 'c', joinsBook: false },
    ];
    expect(
      volumeStates({
        track,
        goals: 0,
        hasIdeal: false,
        books: 0,
        presentPicks: [],
        pastEpochs: epochs,
        pastEvents: some,
        pastAnalyses: analyses,
        pastListed: true,
      }).past,
    ).toBe('done');
  });
});

describe('the two volumes in the sealed Book', () => {
  const base = {
    version: 1,
    title: 'the back door',
    track: 'starter' as const,
    ideal: 'It is 6:40 and the kitchen is still blue.',
    shadow: null,
    iWill: 'I will be out the back door before the kettle boils',
    // A Book is the Future volume's artefact and needs a goal; the other two
    // volumes join one when it is sealed.
    goals: [{ id: 'g1', title: 'a goal', domain: 'health' as const, horizon: 'Three months', targetDate: null, rank: 0, status: 'active' as const, createdAt: 'x' }],
    analyses: [
      {
        id: 'a1',
        goalId: 'g1',
        kind: 'strategies' as const,
        track: 'starter' as const,
        framingId: null,
        line: 'Tuesday at 6:40, out the back door',
        specificity: 0.5,
        followupShown: false,
        writtenAt: 'x',
      },
    ],
  };
  /** Everything the person wrote in a Book built from `base` alone. */
  const baseChars = () => {
    const b = buildBookVersion(base, (p) => p + '_1');
    return b.ideal.length + b.iWill.length + b.title.length + 'a goal'.length + 'Tuesday at 6:40, out the back door'.length;
  };

  it('carries no empty sections for somebody who only wrote the Future volume', () => {
    const book = buildBookVersion(base, (p) => p + '_1');
    expect(book.volumes).toBeUndefined();
  });

  it('counts what the person wrote and not the app\u2019s card sentences', () => {
    const card = 'I start things and drift.';
    const story = 'The talk I had to give.';
    const apply = 'Shoes by the door the night before.';
    const withPresent = buildBookVersion(
      { ...base, present: { entries: [{ half: 'faults', card, framing: 'The night before', story, apply }] } },
      (p) => p + '_1',
    );
    expect(withPresent.volumes?.present?.entries).toHaveLength(1);
    // The ratio moves only by the person's own characters: if the card and the
    // framing counted as rival prose the floor would refuse honest Books, and
    // if they counted as the person's it would flatter them.
    // Nothing generated anywhere, so the ratio is one either way — what this
    // proves is that the card and the framing changed neither side of it.
    expect(withPresent.authorshipRatio).toBe(1);
    expect(baseChars()).toBeGreaterThan(0);
  });

  it('keeps the Past volume\u2019s four written fields and drops the period label from the count', () => {
    const entry = {
      period: 'School',
      title: 'changing school mid-term',
      whatHappened: 'It happened in the spring.',
      shapedMe: 'I pack lightly.',
      stillBelieve: 'Starting again is survivable.',
    };
    const book = buildBookVersion({ ...base, past: { entries: [entry] } }, (p) => p + '_1');
    expect(book.volumes?.past?.entries[0]).toEqual(entry);
    expect(book.authorshipRatio).toBe(1);
  });

  it('still refuses a Book carrying prose the person did not write', () => {
    // The volumes add to the person's side of the ratio; they must not become
    // a way to smuggle prose past the floor. The seal refuses outright.
    expect(() =>
      buildBookVersion(
        {
          ...base,
          analyses: [
            {
              ...base.analyses[0]!,
              line: 'short',
              generated: 'a long paragraph the app wrote about this person, at length, without being asked'.repeat(8),
            },
          ],
          past: { entries: [{ period: 'School', title: 't', whatHappened: 'a', shapedMe: 'b', stillBelieve: 'c' }] },
        },
        (p) => p + '_1',
      ),
    ).toThrow(/not written by you/i);
  });
});

describe('which half a bare door opens', () => {
  const done = (half: 'faults' | 'virtues', cardId: string) => ({
    cardId,
    half,
    storyLine: 'a time',
    applyLine: 'what instead',
    framingId: null,
    goalId: null,
    rank: 0,
  });
  it('is the faults first, then the virtues once the faults are written, then the faults again', () => {
    expect(nextHalf([], 'starter')).toBe('faults');
    expect(nextHalf([done('faults', 'f1')], 'starter')).toBe('virtues');
    expect(nextHalf([done('faults', 'f1'), done('virtues', 'v1')], 'starter')).toBe('faults');
  });
});
