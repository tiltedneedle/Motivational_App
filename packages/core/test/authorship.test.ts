/**
 * The authorship rules are the product. These tests are the gate that keeps
 * model text out of the user's Book and out of their plan.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  AnthropicProvider,
  LocalProvider,
  buildBookVersion,
  buildPlan,
  extractSpansLocally,
  guarded,
  MIN_AUTHORSHIP_RATIO,
  authorshipRatio,
  SealRefused,
  validatePlan,
  verifySpans,
  type AiProvider,
  type GoalAnalysis,
  type Goal,
} from '../src/index';
import { sequentialIds } from '../src/ids';

const IDEAL = `It's 6:40 and the kitchen is still blue. I lace the left shoe first, like always, and the door is already open before I've decided anything. Rent went out on the first and I didn't look at the balance, because I already knew. Sam is asleep upstairs and the guitar is on the wall where I can see it from the table.`;

function goal(over: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Half marathon',
    domain: 'health',
    horizon: 'Six months',
    targetDate: '2027-03-01',
    status: 'authored',
    rank: 0,
    createdAt: '2026-09-09T20:00:00.000Z',
    ...over,
  };
}

function analysis(over: Partial<GoalAnalysis> = {}): GoalAnalysis {
  return {
    id: 'a1',
    goalId: 'g1',
    kind: 'strategies',
    track: 'starter',
    framingId: 's-thrice',
    line: 'Tuesday, Thursday, Saturday at 6:40, out the back door before the kettle boils',
    specificity: 0.8,
    followupShown: false,
    writtenAt: '2026-09-09T20:05:00.000Z',
    ...over,
  };
}

describe('verifySpans', () => {
  it('keeps only verbatim substrings of the source', () => {
    const spans = verifySpans(IDEAL, [
      { text: 'the kitchen is still blue' },
      { text: 'I will run a marathon every day' }, // invented
      { text: 'Sam is asleep upstairs' },
    ]);
    expect(spans.map((s) => s.text)).toEqual([
      'the kitchen is still blue',
      'Sam is asleep upstairs',
    ]);
    for (const s of spans) {
      expect(IDEAL.slice(s.start, s.end)).toBe(s.text);
    }
  });

  it('never returns overlapping spans for a repeated phrase', () => {
    const source = 'the door is open. the door is open.';
    const spans = verifySpans(source, [{ text: 'the door is open' }, { text: 'the door is open' }]);
    expect(spans).toHaveLength(2);
    expect(spans[0]!.start).not.toBe(spans[1]!.start);
    expect(spans[0]!.end).toBeLessThanOrEqual(spans[1]!.start);
  });

  it('drops spans that are too short to be a goal', () => {
    expect(verifySpans(IDEAL, [{ text: 'blue' }])).toHaveLength(0);
  });
});

describe('local read-back', () => {
  it('only ever returns text the user wrote', () => {
    const { spans } = extractSpansLocally(IDEAL);
    expect(spans.length).toBeGreaterThan(0);
    for (const s of spans) expect(IDEAL).toContain(s.text);
  });

  it('asks the single left-out question when it finds fewer than three', () => {
    const out = extractSpansLocally('I want to sleep more.');
    expect(out.spans.length).toBeLessThan(3);
    expect(out.leftOutQuestion).toBe('What did you leave out on purpose?');
  });

  it('guesses a domain from the user words', () => {
    const { spans } = extractSpansLocally(IDEAL);
    const domains = spans.map((s) => s.domain);
    expect(domains).toContain('money');
  });
});

describe('guarded provider', () => {
  const liar: AiProvider = {
    name: 'liar',
    online: true,
    async readBack() {
      return { spans: [{ text: 'I will be a millionaire', start: 0, end: 10, domain: 'money' as const }] };
    },
    async scene() {
      return { narrative: 'x', imagePrompt: 'y', sourcedDetail: 'a yacht' };
    },
    async safety() {
      return { risk: 'none' as const, category: null, action: 'continue' as const };
    },
  };

  it('falls back to the local engine when no span is verbatim', async () => {
    const onViolation = vi.fn();
    const p = guarded(liar, { onViolation });
    const out = await p.readBack({ text: IDEAL });
    expect(onViolation).toHaveBeenCalled();
    for (const s of out.spans) expect(IDEAL).toContain(s.text);
  });

  it('rejects a scene whose sourced detail is not in the user text', async () => {
    const onViolation = vi.fn();
    const p = guarded(liar, { onViolation });
    const out = await p.scene({
      goalTitle: 'Half marathon',
      impactLine: 'Sam would stop worrying',
      idealExcerpt: IDEAL,
      type: 'practice',
    });
    expect(onViolation).toHaveBeenCalledWith({ call: 'scene', reason: 'sourcedDetail is not in the user text' });
    expect(`${IDEAL} Sam would stop worrying`.toLowerCase()).toContain(out.sourcedDetail.toLowerCase());
  });

  it('falls back when the provider throws', async () => {
    const broken: AiProvider = {
      ...liar,
      async readBack() {
        throw new Error('502');
      },
    };
    const out = await guarded(broken).readBack({ text: IDEAL });
    expect(out.spans.length).toBeGreaterThan(0);
  });

  it('takes the worse of the local and remote safety verdicts', async () => {
    const soft: AiProvider = {
      ...liar,
      async safety() {
        return { risk: 'none' as const, category: null, action: 'continue' as const };
      },
    };
    const out = await guarded(soft).safety('I want to kill myself');
    expect(out.risk).toBe('crisis');
  });

  it('never lets a network error suppress a local crisis verdict', async () => {
    const broken: AiProvider = {
      ...liar,
      async safety() {
        throw new Error('offline');
      },
    };
    const out = await guarded(broken).safety('I want to die');
    expect(out.risk).toBe('crisis');
  });
});

describe('AnthropicProvider', () => {
  it('verifies spans returned over the wire', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ spans: [{ text: 'the guitar is on the wall' }, { text: 'invented' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    const p = new AnthropicProvider({ endpoint: 'https://example.test/fn', fetchImpl });
    const out = await p.readBack({ text: IDEAL });
    expect(out.spans.map((s) => s.text)).toEqual(['the guitar is on the wall']);
  });
});

describe('plan validation', () => {
  const ids = sequentialIds();
  const strategies = analysis();
  const obstacles = analysis({
    id: 'a2',
    kind: 'obstacles',
    line: 'it rains at seven',
    line2: 'take the stairwell, ten floors, twice',
    framingId: 'o-runout',
  });
  const monitoring = analysis({
    id: 'a3',
    kind: 'monitoring',
    line: 'one run in the ledger, any pace, checked on Sunday',
    framingId: 'n-number',
  });

  it('builds a plan where every move points at a user line', () => {
    const plan = buildPlan(
      { goal: goal(), analyses: [strategies, obstacles, monitoring] },
      { today: '2026-09-09', newId: ids },
    );
    expect(plan.moves.length).toBeGreaterThan(0);
    for (const m of plan.moves) expect(m.sourceLineId).toBe(strategies.id);
    expect(validatePlan(plan, [strategies, obstacles, monitoring], '2026-09-09')).toEqual([]);
  });

  it('takes the first milestone proof from the user monitoring line', () => {
    const plan = buildPlan(
      { goal: goal(), analyses: [strategies, obstacles, monitoring] },
      { today: '2026-09-09', newId: sequentialIds() },
    );
    expect(plan.milestones[0]!.proof).toBe(monitoring.line);
  });

  it('rejects a plan whose move has no user line behind it', () => {
    const plan = buildPlan(
      { goal: goal(), analyses: [strategies, obstacles, monitoring] },
      { today: '2026-09-09', newId: sequentialIds() },
    );
    const tampered = { ...plan, moves: plan.moves.map((m) => ({ ...m, sourceLineId: 'made-up' })) };
    const problems = validatePlan(tampered, [strategies, obstacles, monitoring], '2026-09-09');
    expect(problems.join(' ')).toMatch(/no user line/);
  });

  it('refuses to plan with no strategies line', () => {
    expect(() =>
      buildPlan({ goal: goal(), analyses: [obstacles] }, { today: '2026-09-09', newId: sequentialIds() }),
    ).toThrow(/nothing to plan from/);
  });

  it('never schedules a move in the past and keeps week one to three moves', () => {
    const plan = buildPlan(
      { goal: goal(), analyses: [strategies, obstacles, monitoring] },
      { today: '2026-09-09', newId: sequentialIds() },
    );
    expect(plan.moves.filter((m) => m.week === 1).length).toBeLessThanOrEqual(3);
    for (const m of plan.moves) {
      if (m.scheduledFor) expect(m.scheduledFor >= '2026-09-09').toBe(true);
    }
  });
});

describe('the Book', () => {
  const ids = sequentialIds();
  const base = {
    version: 1,
    title: 'A year of the back door',
    track: 'starter' as const,
    ideal: IDEAL,
    shadow: null,
    iWill: 'I will be out the back door before the kettle boils',
    goals: [goal()],
    analyses: [analysis(), analysis({ id: 'a2', kind: 'obstacles', line: 'it rains', line2: 'stairwell' })],
  };

  it('seals with an authorship ratio above the floor', () => {
    const book = buildBookVersion(base, ids);
    expect(book.authorshipRatio).toBeGreaterThanOrEqual(MIN_AUTHORSHIP_RATIO);
    expect(book.firstSentence).toContain('the kitchen is still blue');
  });

  it('refuses to seal without the I will line', () => {
    expect(() => buildBookVersion({ ...base, iWill: '   ' }, ids)).toThrow(SealRefused);
  });

  it('refuses to seal a book with no written goal', () => {
    expect(() => buildBookVersion({ ...base, analyses: [] }, ids)).toThrow(/No goal has been written/);
  });

  it('refuses to seal when prose the user did not write enters the Book', () => {
    // The regression this metric exists to catch: a feature that writes for them.
    const withGenerated = {
      ...base,
      analyses: [analysis({ line: 'short' })],
    };
    const book = buildBookVersion(withGenerated, sequentialIds());
    const poisoned = {
      ...book,
      chapters: book.chapters.map((c) => ({
        ...c,
        lines: c.lines.map((l) => ({ ...l, generated: 'x'.repeat(20_000) })),
      })),
    };
    const ratio = authorshipRatio(withGenerated, poisoned.chapters);
    expect(ratio).toBeLessThan(MIN_AUTHORSHIP_RATIO);
  });

  it('does not count fixed framing labels against the user', () => {
    const book = buildBookVersion(base, sequentialIds());
    const labelled = book.chapters.some((c) => c.lines.some((l) => l.framingLabel));
    expect(labelled).toBe(true);
    expect(book.authorshipRatio).toBe(1);
  });
});
