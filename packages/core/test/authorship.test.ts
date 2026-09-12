/**
 * The authorship rules are the product. These tests are the gate that keeps
 * model text out of the user's Book and out of their plan.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  AnthropicProvider,
  LocalProvider,
  buildBookVersion,
  buildChapters,
  buildPlan,
  extractSpansLocally,
  guarded,
  isQuotable,
  quotable,
  MIN_AUTHORSHIP_RATIO,
  authorshipRatio,
  sourceLineFor,
  bookToHtml,
  bookToText,
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
      // Long enough and specific enough to look like a real detail, and
      // nowhere in the user's writing. That is the lie being caught.
      return {
        narrative: 'You wake on a yacht in the harbour at dawn.',
        imagePrompt: 'y',
        sourcedDetail: 'a yacht in the harbour at dawn',
      };
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

  it('rejects a sourced detail too small to prove anything', async () => {
    // "a" appears in everybody's writing. Accepting it meant a scene could
    // satisfy the check while containing nothing of this person's life.
    const vague: AiProvider = {
      ...liar,
      async scene() {
        return { narrative: 'You wake and it is quiet.', imagePrompt: 'y', sourcedDetail: 'a' };
      },
    };
    const onViolation = vi.fn();
    const out = await guarded(vague, { onViolation }).scene({
      goalTitle: 'Half marathon',
      impactLine: 'Sam would stop worrying',
      idealExcerpt: IDEAL,
      type: 'practice',
    });
    expect(onViolation).toHaveBeenCalledWith({
      call: 'scene',
      reason: 'sourcedDetail is too short to be a detail',
    });
    // Whatever comes back has been through the gate too.
    if (out.narrative) {
      expect(out.narrative.toLowerCase()).toContain(out.sourcedDetail.toLowerCase());
    }
  });

  it('rejects a scene that never uses the detail it claims to be built on', async () => {
    // A real quotation from the user, attached to a narrative that is stock
    // footage. The receipt was genuine and the picture was somebody else's.
    const detail = IDEAL.slice(0, 40);
    const stock: AiProvider = {
      ...liar,
      async scene() {
        return {
          narrative: 'You wake early. The light is good. It is a fine morning to begin.',
          imagePrompt: 'y',
          sourcedDetail: detail,
        };
      },
    };
    const onViolation = vi.fn();
    await guarded(stock, { onViolation }).scene({
      goalTitle: 'Half marathon',
      impactLine: 'Sam would stop worrying',
      idealExcerpt: IDEAL,
      type: 'practice',
    });
    expect(onViolation).toHaveBeenCalledWith({
      call: 'scene',
      reason: 'the narrative does not contain the detail it claims to be built on',
    });
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

  it('shows one sentence under a move, not the whole Full-track paragraph', () => {
    // On Full the stone carries a paragraph; the plan is cut from it, and
    // "from …" under each of nine moves used to print all of it nine times.
    const full = analysis({
      id: 'a-full',
      line: 'Tuesday, Thursday, Saturday at 6:40, out the back door',
      paragraph:
        'Shoes by the door the night before. Tuesday, Thursday and Saturday at 6:40, out the back door. If the morning is lost, the ten-minute version to the first bridge still counts.',
    });
    const fromLine = { id: 'm1', goalId: 'g1', milestoneId: null, title: 'Tuesday: at 6:40, out the back door', effort: 'S', energy: 'high', ifThen: null, scheduledFor: null, week: 1, status: 'todo', completedAt: null, minVersion: null, sourceLineId: 'a-full', order: 0 } as const;
    expect(sourceLineFor(fromLine as never, [full])).toBe(full.line);
    const fromParagraph = { ...fromLine, id: 'm2', title: 'the ten-minute version to the first bridge still counts' };
    expect(sourceLineFor(fromParagraph as never, [full])).toBe('If the morning is lost, the ten-minute version to the first bridge still counts.');
    const elsewhere = { ...fromLine, id: 'm3', title: 'something the person typed themselves' };
    expect(sourceLineFor(elsewhere as never, [full])).toBe(full.line);
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

  it('keeps the Full-track paragraph under its line rather than in place of it', () => {
    // The line is the answer the coach quotes and the Blueprint is cut from;
    // the paragraph is the thinking behind it. Both are the person's, both
    // are printed, both count as theirs.
    const full = {
      ...base,
      track: 'full' as const,
      analyses: [
        analysis({ id: 'a4', kind: 'motives', line: 'Because I said I would.', paragraph: 'I have said it out loud to Sam twice now, and the second time I heard myself.' }),
        analysis({ id: 'a3', kind: 'strategies', line: '', paragraph: 'Tuesday, Thursday and Saturday at 6:40, out the back door.' }),
      ],
    };
    const book = buildBookVersion(full, sequentialIds());
    const lines = book.chapters[0]!.lines;
    const motives = lines.find((l) => l.kind === 'motives')!;
    expect(motives.text).toBe('Because I said I would.');
    expect(motives.paragraph).toContain('out loud to Sam');
    // No line at all: the paragraph stands in, and nothing is doubled.
    const strategies = lines.find((l) => l.kind === 'strategies')!;
    expect(strategies.text).toContain('Tuesday, Thursday and Saturday');
    expect(strategies.paragraph).toBeUndefined();
    // Both reach the exports.
    expect(bookToText(book)).toContain('out loud to Sam');
    expect(bookToHtml(book)).toContain('out loud to Sam');
    expect(book.authorshipRatio).toBe(1);
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

  it('refuses the seal when model prose reaches the Book the way it actually would', () => {
    // The other tests here poison `chapters[].lines[].generated` by hand, a
    // field no product code writes, so they could not catch a real leak. This
    // one puts the prose where it would actually arrive — on the analysis
    // record — and goes through buildBookVersion exactly as sealing does.
    const withProse = {
      ...base,
      analyses: base.analyses.map((a, i) =>
        i === 0
          ? {
              ...a,
              generated:
                'You have always been the kind of person who follows through, and this year that finally becomes visible to everyone around you. It was never really in doubt.',
            }
          : a,
      ),
    };
    expect(() => buildBookVersion(withProse, sequentialIds())).toThrow(SealRefused);
  });

  it('carries the generated slot from the analysis into the chapter', () => {
    const withProse = {
      ...base,
      analyses: base.analyses.map((a, i) => (i === 0 ? { ...a, generated: 'not their words' } : a)),
    };
    const chapters = buildChapters(withProse);
    const carried = chapters.some((c) => c.lines.some((l) => l.generated === 'not their words'));
    // A tripwire nothing can reach is not a tripwire.
    expect(carried).toBe(true);
  });

  it('will not put its own sentence in a milestone proof', () => {
    // The proof is the rule THEY wrote for what counts. It used to fall back
    // to "One entry in the ledger." when the Monitoring line was missing, and
    // the validator accepted it because the string was not empty.
    const noMonitoring = base.analyses.filter((a) => a.kind !== 'monitoring');
    const plan = buildPlan(
      { goal: base.goals[0]!, analyses: noMonitoring },
      { today: '2026-09-10', newId: sequentialIds() },
    );
    for (const ms of plan.milestones) {
      expect(ms.proof).toBe('');
      expect(ms.proofSourceLineId).toBeNull();
    }
    expect(validatePlan(plan, noMonitoring, '2026-09-10')).toEqual([]);
  });

  it('refuses a proof that claims a line the person did not write', () => {
    const plan = buildPlan(
      { goal: base.goals[0]!, analyses: base.analyses },
      { today: '2026-09-10', newId: sequentialIds() },
    );
    const forged = {
      ...plan,
      milestones: plan.milestones.map((m) => ({ ...m, proof: 'Invented rule.', proofSourceLineId: 'not_a_real_line' })),
    };
    expect(validatePlan(forged, base.analyses, '2026-09-10').join(' ')).toContain('no user line behind it');
  });

  it('never seals a line the safety screen flagged', () => {
    // The rule used to apply to the Fifteen alone. The stones are free text
    // too, and the Obstacles stone asks what gets in the way, which is exactly
    // where the worst sentence of somebody's week lands. It was read back the
    // next morning and printed in the Book.
    const flagged = {
      ...base,
      analyses: base.analyses.map((a, i) =>
        i === 0 ? { ...a, safetyRisk: 'crisis' as const } : a,
      ),
    };
    const chapters = buildChapters(flagged);
    const kinds = chapters.flatMap((c) => c.lines.map((l) => l.kind));
    expect(kinds).not.toContain(base.analyses[0]?.kind);
    // And the rest of their writing still gets to be a Book.
    expect(chapters.some((c) => c.lines.length > 0)).toBe(true);
  });

  it('keeps everything the screen did not flag', () => {
    const chapters = buildChapters(base);
    expect(chapters.flatMap((c) => c.lines).length).toBeGreaterThan(0);
  });

  it('does not count fixed framing labels against the user', () => {
    const book = buildBookVersion(base, sequentialIds());
    const labelled = book.chapters.some((c) => c.lines.some((l) => l.framingLabel));
    expect(labelled).toBe(true);
    expect(book.authorshipRatio).toBe(1);
  });
});

describe('writing done in crisis', () => {
  const t = (safetyRisk: 'none' | 'concern' | 'crisis', body: string) => ({ kind: 'ideal' as const, body, safetyRisk });

  it('is never handed back to the person who wrote it', () => {
    expect(isQuotable(t('crisis', 'the worst sentence of my life'))).toBe(false);
    expect(isQuotable(t('concern', 'I have been hard on myself'))).toBe(true);
    expect(isQuotable(t('none', 'the kitchen is still blue'))).toBe(true);
  });

  it('treats a missing text as unquotable rather than assuming it is safe', () => {
    expect(isQuotable(null)).toBe(false);
    expect(isQuotable(undefined)).toBe(false);
  });

  it('filters a whole sitting list without dropping the ordinary ones', () => {
    const all = [t('none', 'a'), t('crisis', 'b'), t('concern', 'c')];
    const kept = quotable(all);
    expect(kept).toHaveLength(2);
    expect(kept.map((x) => x.body)).toEqual(['a', 'c']);
  });
});

describe('the authorship ratio', () => {
  const base = {
    version: 1,
    title: 'Untitled',
    track: 'starter' as const,
    iWill: 'start',
    shadow: null,
    memories: undefined,
  };
  const goal = (id: string, title: string, titleAuthored: boolean) => ({
    id,
    title,
    domain: 'health' as const,
    horizon: '1y',
    targetDate: null,
    status: 'authored' as const,
    rank: 0,
    titleAuthored,
    createdAt: '2026-09-06T00:00:00.000Z',
  });
  const analysis = (goalId: string, line: string) => ({
    id: `a-${goalId}`,
    goalId,
    kind: 'motives' as const,
    framingLabel: null,
    line,
    line2: null,
    paragraph: null,
    specificity: 2,
    createdAt: '2026-09-06T00:00:00.000Z',
  });
  const REAL =
    "It's 6:40 and the kitchen is still blue. I lace the left shoe first, like always, and the door is already open before I have decided anything.";

  it('gives no credit for a name the person only tapped out of the bank', () => {
    const tapped = { ...base, ideal: REAL, goals: [goal('g1', 'Three months of breathing room', false)], analyses: [analysis('g1', 'Because I said I would.')] };
    const typed = { ...base, ideal: REAL, goals: [goal('g1', 'Three months of breathing room', true)], analyses: [analysis('g1', 'Because I said I would.')] };
    const massOf = (i: typeof tapped) => authorshipRatio(i as never, buildChapters(i as never));
    // Both are honest Books, so both seal; the tapped name simply earns nothing.
    expect(massOf(tapped)).toBe(1);
    expect(massOf(typed)).toBe(1);
    const tappedChapters = buildChapters(tapped as never);
    expect(tappedChapters[0]?.nameAuthored).toBe(false);
  });

  it('refuses the seal the moment prose the person did not write reaches a chapter', () => {
    const input = { ...base, ideal: REAL, goals: [goal('g1', 'Half marathon', true)], analyses: [analysis('g1', 'Because I said I would.')] };
    const chapters = buildChapters(input as never);
    // What a "let me polish that for you" feature would do.
    const poisoned = chapters.map((c) => ({
      ...c,
      lines: c.lines.map((l) => ({
        ...l,
        generated:
          'You have always been the kind of person who follows through, and this year that finally becomes visible to everyone around you.',
      })),
    }));
    expect(authorshipRatio(input as never, poisoned)).toBeLessThan(MIN_AUTHORSHIP_RATIO);
  });

  it('still seals a short but real Book', () => {
    const input = { ...base, ideal: REAL, goals: [goal('g1', 'Three months of breathing room', false)], analyses: [analysis('g1', 'Because I am tired of the first of the month deciding my mood.')] };
    const book = buildBookVersion(input as never, (p: string) => `${p}-1`);
    expect(book.authorshipRatio).toBeGreaterThanOrEqual(MIN_AUTHORSHIP_RATIO);
  });

  it('treats a Book sealed before the flag existed as the person own', () => {
    const g = goal('g1', 'Half marathon', true);
    const { titleAuthored: _drop, ...legacy } = g;
    const input = { ...base, ideal: REAL, goals: [legacy], analyses: [analysis('g1', 'Because I said I would.')] };
    expect(() => buildBookVersion(input as never, (p: string) => `${p}-1`)).not.toThrow();
  });
});
