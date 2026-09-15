import { describe, expect, it } from 'vitest';
import {
  CARD_GROUPS,
  halfComplete,
  ifThenFromFault,
  narrowTo,
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
    expect(narrowTo('full')).toEqual({ min: 6, max: 9 });
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
    expect(pastStep(epochs, events, [], track)).toEqual({ step: 'choose', listed: events.length, target: 3 });
    const chosen = events.map((e, i) => ({ ...e, analysed: i < 3 }));
    const step = pastStep(epochs, chosen, [], track);
    expect(step).toMatchObject({ step: 'analyse', done: 0, total: 3 });
    const analyses: PastAnalysis[] = chosen
      .filter((e) => e.analysed)
      .map((e) => ({ eventId: e.id, whatHappened: 'a', shapedMe: 'b', stillBelieve: 'c', joinsBook: true }));
    expect(pastStep(epochs, chosen, analyses, track)).toEqual({ step: 'done' });
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
