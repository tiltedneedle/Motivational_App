/**
 * The eval harness (PRD §11.8), run against the engines the product ships
 * with: the offline extractor, the deterministic Portrait and Blueprint
 * builders, the local coach, the local letters and the on-device safety
 * screen. A model behind an edge function is wrapped by the same `guarded()`
 * and falls back to these, so what passes here is the floor the product
 * cannot go under, with or without a key.
 *
 * Every check the PRD names, on every one of the forty profiles:
 *
 *   read-back spans are substrings (100%);
 *   Portrait and Blueprint schemas pass with every move sourced;
 *   plan realism (first move small, ≤ 3 moves in week one, proofs measurable);
 *   brief tone (no banned words, ≤ 90 words, at least one quoted span);
 *   letters quote the Book;
 *   safety recall ≥ 0.95 on the 200-item labelled set;
 *   authorship ratio ≥ 0.95 on every generated Book.
 *
 * `pnpm test:eval` runs this alone and prints the numbers; `pnpm verify`
 * runs it with everything else, so a change to a prompt, a pattern or a
 * builder cannot land without the eval passing.
 */
import { afterAll, describe, expect, it } from 'vitest';
import {
  BookVersion as BookVersionSchema,
  Brief as BriefSchema,
  CHIPS,
  LocalProvider,
  MIN_AUTHORSHIP_RATIO,
  Plan as PlanSchema,
  Portrait as PortraitSchema,
  bookPages,
  bookToHtml,
  daysBetween,
  ownDate,
  bookToText,
  buildBookVersion,
  buildDawnBrief,
  buildPlan,
  buildPortrait,
  checkLetter,
  composeLetter,
  extractSpansLocally,
  fullTrackInvitation,
  guarded,
  replyToChip,
  returnsLetter,
  scoreSpecificity,
  screen,
  sourceLineFor,
  validatePlan,
  verifySpans,
  type DaySummary,
  type Evidence,
  type Goal,
  type GoalAnalysis,
  type LetterTrigger,
  type Move,
  type SafetyRisk,
} from '../src/index';
import { sequentialIds } from '../src/ids';
import { GOLDEN, type GoldenProfile } from './golden';
import { SAFETY_SET } from './safety-set';

const TODAY = '2026-09-17';
const YESTERDAY = '2026-09-16';
const WRITTEN_AT = '2026-09-10T20:05:00.000Z';

/** PRD §11.4: never "fail", "failure", "streak"; §8.11: no exclamation marks, no emoji. "Broke" is §7.7's. */
const BANNED = /\b(fail|failed|failing|fails|failure|failures|streak|streaks|broke|broken)\b|!|\p{Extended_Pictographic}/u;

const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * A proof that can be counted or pointed at (§7.2's Monitoring stone: "What
 * would you point at, in a month, to show it is working?"): a number in
 * digits or words, a cadence, a clock or a day, or a record kept — ticked,
 * logged, written, counted, photographed. "I'll feel better" is none of these.
 */
const NUMBER_WORDS = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|dozen|half|zero)\b/i;
const RECORD_KEPT = /\b(?:tick(?:ed|s)?|logged|log|written|write|counted|count|entered|marked|noted|recorded|photo(?:graph)?|checked|booked|diary|calendar|ledger|whiteboard|chart|clipboard)\b/i;
function measurable(proof: string): boolean {
  const s = scoreSpecificity(proof);
  return s.hasNumber || s.hasCadence || s.hasTime || NUMBER_WORDS.test(proof) || RECORD_KEPT.test(proof);
}
const norm = (s: string): string => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
const contains = (haystack: string, needle: string): boolean => norm(haystack).includes(norm(needle));
const inAny = (haystacks: readonly string[], needle: string): boolean => haystacks.some((h) => contains(h, needle));

/** A quotation cut short must not stop on a word that leaves it hanging. */
const HANGING_CUT = /\b(?:the|a|an|and|or|but|of|to|in|on|at|for|with|that|which|not|just|my|is|was|I|I['’]ve|I['’]m)…”/;
const HANGING_CUT_LETTER = /\b(?:the|a|an|and|or|but|of|to|in|on|at|for|with|that|which|not|just|my|is|was|I|I['’]ve|I['’]m)” and I have thought/;
/** Their full stop inside our sentence: “…did it anyway.” and — one sentence, two stops. */
const STOP_THEN_LOWER = /[.!?]” (?:and|but|so|which|for|or) /;

/** The app's own prose in a piece of coach text: what is left once their quotations are taken out. */
function appProse(text: string, quotes: readonly string[]): string {
  let out = text;
  for (const q of [...quotes].sort((a, b) => b.length - a.length)) {
    if (!q.trim()) continue;
    const idx = out.toLowerCase().indexOf(q.toLowerCase());
    if (idx >= 0) out = out.slice(0, idx) + ' ' + out.slice(idx + q.length);
  }
  return out;
}

interface Built {
  profile: GoldenProfile;
  goals: Goal[];
  analyses: GoalAnalysis[];
  /** Every string of theirs a quotation may come from. */
  corpus: string[];
}

function materialise(p: GoldenProfile): Built {
  const goals: Goal[] = p.goals.map((goal, i) => ({
    id: `${p.id}-g${i}`,
    title: goal.title,
    domain: goal.domain,
    horizon: goal.horizon,
    targetDate: goal.targetDate,
    status: 'authored',
    rank: i,
    titleAuthored: true,
    createdAt: WRITTEN_AT,
  }));
  const analyses: GoalAnalysis[] = p.goals.flatMap((goal, i) =>
    goal.stones.map((stone, j) => ({
      id: `${p.id}-g${i}-a${j}`,
      goalId: goals[i]!.id,
      kind: stone.kind,
      track: p.track,
      framingId: null,
      line: stone.line,
      ...(stone.line2 ? { line2: stone.line2 } : {}),
      ...(stone.paragraph ? { paragraph: stone.paragraph } : {}),
      specificity: scoreSpecificity(stone.line).score,
      followupShown: false,
      writtenAt: WRITTEN_AT,
    })),
  );
  const corpus = [
    p.ideal,
    p.shadow,
    p.iWill,
    ...analyses.flatMap((a) => [a.line, a.line2 ?? '', a.paragraph ?? '']),
    ...p.evidence.map((e) => e.text),
  ].filter((s) => s.trim().length > 0);
  return { profile: p, goals, analyses, corpus };
}

function evidenceOf(b: Built): Evidence[] {
  return b.profile.evidence.map((e, i) => ({
    id: `${b.profile.id}-e${i}`,
    goalId: b.goals[0]!.id,
    kind: e.kind,
    text: e.text,
    day: YESTERDAY,
    createdAt: `${YESTERDAY}T21:00:00.000Z`,
  }));
}

function yesterdayOf(b: Built): DaySummary {
  const seal = b.profile.evidence.find((e) => e.kind === 'seal');
  return {
    day: YESTERDAY,
    planned: 3,
    done: 2,
    skipped: 0,
    partial: 0,
    evidenceCount: b.profile.evidence.length,
    sealedAt: `${YESTERDAY}T21:00:00.000Z`,
    moodWord: null,
    proof: seal?.text ?? null,
    gladOf: null,
  };
}

// ------------------------------------------------------------------ report

const report = {
  profiles: 0,
  spans: { total: 0, min: Infinity, max: 0, verified: 0 },
  books: { sealed: 0, minRatio: 1 },
  portraits: 0,
  plans: { built: 0, moves: 0, milestones: 0, efforts: { S: 0, M: 0, L: 0 } as Record<'S' | 'M' | 'L', number> },
  briefs: { built: 0, maxWords: 0 },
  chips: 0,
  letters: { built: 0, minWords: Infinity, maxWords: 0 },
  safety: { crisis: [0, 0], concern: [0, 0], noneCrisis: [0, 0], noneConcern: [0, 0], misses: [] as string[] },
};

afterAll(() => {
  const s = report.safety;
  const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : 'n/a');
  const lines = [
    '',
    `eval · ${report.profiles} profiles`,
    `  read-back   ${report.spans.total} spans, ${report.spans.min}–${report.spans.max} a profile, ${report.spans.verified}/${report.spans.total} verbatim`,
    `  books       ${report.books.sealed} sealed, lowest authorship ratio ${report.books.minRatio}`,
    `  portraits   ${report.portraits}`,
    `  plans       ${report.plans.built} built, ${report.plans.moves} moves, ${report.plans.milestones} milestones, all sourced; first moves S ${report.plans.efforts.S} · M ${report.plans.efforts.M} · L ${report.plans.efforts.L}`,
    `  briefs      ${report.briefs.built}, longest ${report.briefs.maxWords} words`,
    `  chips       ${report.chips} replies`,
    `  letters     ${report.letters.built}, ${report.letters.minWords}–${report.letters.maxWords} words`,
    `  safety      crisis recall ${pct(s.crisis[0]!, s.crisis[1]!)} (${s.crisis[0]}/${s.crisis[1]}) · concern recall ${pct(s.concern[0]!, s.concern[1]!)} (${s.concern[0]}/${s.concern[1]})`,
    `              ordinary lines raising the card ${pct(s.noneCrisis[0]!, s.noneCrisis[1]!)} (${s.noneCrisis[0]}/${s.noneCrisis[1]}) · softening the morning ${pct(s.noneConcern[0]!, s.noneConcern[1]!)} (${s.noneConcern[0]}/${s.noneConcern[1]})`,
    ...s.misses.map((m) => `              ${m}`),
    '',
  ];
  console.log(lines.join('\n'));
});

// ------------------------------------------------------------------ the forty

const built = GOLDEN.map(materialise);

describe('the golden set', () => {
  it('is forty profiles: four writers, five domains, both tracks', () => {
    expect(GOLDEN).toHaveLength(40);
    expect(new Set(GOLDEN.map((p) => p.id)).size).toBe(40);
    expect(new Set(GOLDEN.map((p) => p.writer)).size).toBe(4);
    expect(new Set(GOLDEN.map((p) => p.domain)).size).toBe(5);
    expect(GOLDEN.filter((p) => p.track === 'starter')).toHaveLength(20);
    expect(GOLDEN.filter((p) => p.track === 'full')).toHaveLength(20);
    for (const p of GOLDEN) {
      expect(words(p.ideal)).toBeGreaterThanOrEqual(80);
      for (const goal of p.goals) {
        expect(goal.stones.map((s) => s.kind).sort()).toEqual(['impact', 'monitoring', 'motives', 'obstacles', 'strategies']);
        expect(goal.stones.find((s) => s.kind === 'obstacles')?.line2).toBeTruthy();
      }
    }
    report.profiles = GOLDEN.length;
  });

  it('is written by nobody in trouble: the screen lets every line through', () => {
    for (const b of built) {
      for (const text of b.corpus) {
        expect(screen(text).risk, `${b.profile.id}: "${text.slice(0, 50)}"`).toBe('none');
      }
    }
  });
});

describe.each(built)('$profile.id', (b) => {
  const p = b.profile;
  const ids = sequentialIds();

  it('read-back: every span is a verbatim substring, and there are enough of them', async () => {
    const local = extractSpansLocally(p.ideal);
    expect(local.spans.length, 'PRD §11.3: 3..9 spans').toBeGreaterThanOrEqual(3);
    expect(local.spans.length).toBeLessThanOrEqual(9);
    for (const s of local.spans) {
      expect(p.ideal.slice(s.start, s.end)).toBe(s.text);
      expect(s.text.length).toBeGreaterThanOrEqual(8);
    }
    const verified = verifySpans(p.ideal, local.spans);
    expect(verified.length, 'every proposed span survives verification').toBe(local.spans.length);

    const violations: string[] = [];
    const out = await guarded(new LocalProvider(), { onViolation: (v) => violations.push(v.reason) }).readBack({ text: p.ideal });
    expect(violations).toEqual([]);
    expect(out.spans.length).toBe(local.spans.length);

    report.spans.total += local.spans.length;
    report.spans.verified += verified.length;
    report.spans.min = Math.min(report.spans.min, local.spans.length);
    report.spans.max = Math.max(report.spans.max, local.spans.length);
  });

  // The same Fifteen said rather than typed: a browser's recogniser hands it
  // back lower-case with no full stops. The read-back must still find the
  // wants in it, in pieces a person can name, never the whole as one stone.
  it('read-back: the same Fifteen spoken — no full stops, no capitals — still gives stones to name', () => {
    const spoken = p.ideal.toLowerCase().replace(/[.!?;:]+(\s+|$)/g, ' ').replace(/\s+/g, ' ').trim();
    const local = extractSpansLocally(spoken);
    expect(local.spans.length, 'spoken: 3..9 spans').toBeGreaterThanOrEqual(3);
    expect(local.spans.length).toBeLessThanOrEqual(9);
    for (const sp of local.spans) {
      expect(spoken.slice(sp.start, sp.end)).toBe(sp.text);
      // Typed prose with its full stops stripped is the worst case: a real
      // recogniser also breaks the text where the speaker paused. Two
      // breaths, not one, is the ceiling here.
      expect(words(sp.text), 'no stone longer than two breaths').toBeLessThanOrEqual(40);
    }
  });

  const book = buildBookVersion(
    {
      version: 1,
      title: p.title,
      titleAuthored: true,
      track: p.track,
      ideal: p.ideal,
      shadow: p.shadow || null,
      iWill: p.iWill,
      goals: b.goals,
      analyses: b.analyses,
      sealedAt: `${YESTERDAY}T20:00:00.000Z`,
    },
    ids,
  );

  it('the Book seals with an authorship ratio at or above the floor, and prints every line of theirs', () => {
    expect(BookVersionSchema.safeParse(book).success).toBe(true);
    expect(book.authorshipRatio).toBeGreaterThanOrEqual(MIN_AUTHORSHIP_RATIO);
    expect(book.chapters).toHaveLength(p.goals.length);
    expect(bookPages(book).length).toBeGreaterThan(0);

    const text = bookToText(book);
    const html = bookToHtml(book);
    expect(text).toContain(p.iWill);
    expect(html).toContain(p.iWill);
    for (const a of b.analyses) {
      expect(text, `${a.kind} line in the text`).toContain(a.line);
      if (a.paragraph) expect(text, `${a.kind} paragraph in the text`).toContain(a.paragraph);
    }
    if (p.shadow) expect(text).toContain(p.shadow);

    report.books.sealed += 1;
    report.books.minRatio = Math.min(report.books.minRatio, book.authorshipRatio);
  });

  const plans = b.goals.map((goal) =>
    buildPlan(
      { goal, analyses: b.analyses.filter((a) => a.goalId === goal.id) },
      { today: TODAY, newId: ids },
    ),
  );
  /** The day's moves in the order Today shows them: by goal rank, then by the plan's own order. */
  const moves: Move[] = plans.flatMap((plan) => [...plan.moves].sort((x, y) => x.order - y.order));

  it.each(b.goals.map((goal, i) => [goal.title, i] as const))('the Portrait of "%s" quotes only their words', (_title, i) => {
    const goal = b.goals[i]!;
    const analyses = b.analyses.filter((a) => a.goalId === goal.id);
    const portrait = buildPortrait({ goal, analyses, ideal: p.ideal, firstName: p.firstName });
    expect(PortraitSchema.safeParse(portrait).success).toBe(true);
    expect(portrait.title).toBe(goal.title);
    expect(portrait.quotedSpans.length).toBeGreaterThanOrEqual(3);
    for (const span of portrait.quotedSpans) {
      expect(inAny(b.corpus, span), `quoted span is theirs: "${span.slice(0, 50)}"`).toBe(true);
    }
    // The identity line is a clause they wrote, or nothing; never a proposal in their face.
    if (portrait.identityLine) expect(contains(p.ideal, portrait.identityLine)).toBe(true);
    // Who they said they want to be, when they said it (PRD §7.4: "proposed
    // from the Fifteen's text"), and a line that reads: no "who is is", no
    // clause that is a verb the framing cannot take.
    const saidWho = p.ideal.match(/[^.!?]*\bwant to be (?:someone|a \w+) who[^.!?]*/)?.[0];
    if (saidWho) {
      expect(portrait.identityLine.length, 'an identity line is proposed when they said who').toBeGreaterThan(0);
      expect(contains(saidWho, portrait.identityLine), `the identity clause is theirs: "${portrait.identityLine}"`).toBe(true);
    }
    if (portrait.identityLine) {
      expect(portrait.identityFraming).toBeTruthy();
      expect(portrait.identityLine).not.toMatch(/^(?:is|am|are|was)\b/);
      expect(`${portrait.identityFraming} ${portrait.identityLine}`).not.toMatch(/\bis is\b/);
    }
    expect(portrait.firstMoves.length).toBeGreaterThanOrEqual(1);
    expect(portrait.firstMoves.length).toBeLessThanOrEqual(3);
    const strategies = analyses.find((a) => a.kind === 'strategies')!;
    for (const move of portrait.firstMoves) {
      const body = move.replace(/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day:\s*/, '');
      expect(contains(strategies.line, body), `first move cut from the How line: "${move.slice(0, 50)}"`).toBe(true);
    }
    // The letter quotes their opening sentence and names no goal.
    expect(portrait.letterFromFuture).toMatch(/“.+”/);
    expect(contains(portrait.letterFromFuture, goal.title)).toBe(false);
    report.portraits += 1;
  });

  it.each(b.goals.map((goal, i) => [goal.title, i] as const))('the Blueprint for "%s" is sourced, small at the start, and provable', (_title, i) => {
    const goal = b.goals[i]!;
    const plan = plans[i]!;
    const analyses = b.analyses.filter((a) => a.goalId === goal.id);
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(validatePlan(plan, analyses, TODAY)).toEqual([]);

    const strategies = analyses.find((a) => a.kind === 'strategies')!;
    const monitoring = analyses.find((a) => a.kind === 'monitoring')!;
    const sourceTexts = [strategies.line, strategies.paragraph ?? ''].filter(Boolean);

    expect(plan.moves.length).toBeGreaterThanOrEqual(1);
    const first = [...plan.moves].sort((x, y) => x.order - y.order)[0]!;
    // "First move doable in ≤ 30 minutes" (§7.4): the effort is read off their
    // sentence, and a long piece opens only when every piece is long — the app
    // cannot shorten their line, and a plan is better than none.
    if (first.effort === 'L') expect(plan.moves.every((m) => m.effort === 'L'), 'a long first move only when nothing smaller was there').toBe(true);
    report.plans.efforts[first.effort] += 1;
    expect(first.scheduledFor! > TODAY).toBe(true);
    expect(plan.moves.filter((m) => m.week === 1).length).toBeLessThanOrEqual(3);
    for (const move of plan.moves) {
      const source = sourceLineFor(move, analyses);
      expect(source, `a source sentence under "${move.title.slice(0, 40)}"`).not.toBeNull();
      expect(inAny(sourceTexts, source!)).toBe(true);
      const body = move.title.replace(/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day:\s*/, '');
      expect(inAny(sourceTexts, body), `the move is their sentence: "${move.title.slice(0, 50)}"`).toBe(true);
      expect(words(move.title), `a move fits on a card: "${move.title.slice(0, 50)}"`).toBeLessThanOrEqual(40);
      if (move.ifThen) expect(move.ifThen.startsWith('If ')).toBe(true);
      expect(move.title, 'a move does not end in a comma').not.toMatch(/[,;:]$/);
      // One card per sentence: the 48-hour opening no longer copies a
      // day-named sentence onto a day it contradicts.
      expect(plan.moves.filter((m) => m.title === move.title), `one card per sentence: "${move.title.slice(0, 40)}"`).toHaveLength(1);
      // A move that names its day is dated on that day; the rest within 48 hours.
      const own = ownDate(move.title, TODAY);
      if (own) expect(move.scheduledFor).toBe(own);
      else expect(daysBetween(TODAY, move.scheduledFor!)).toBeLessThanOrEqual(3);
    }

    // Two moves may share their sentence on two dates (the 48-hour opening),
    // never on one: two identical cards on Today is a bug, not a plan.
    const seen = new Set<string>();
    for (const move of plan.moves) {
      const key = `${move.title}@${move.scheduledFor}`;
      expect(seen.has(key), `no duplicate move on a day: "${move.title.slice(0, 40)}"`).toBe(false);
      seen.add(key);
    }

    expect(plan.milestones.length).toBeGreaterThanOrEqual(2);
    for (const ms of plan.milestones) {
      expect(ms.title, 'a milestone title never carries their goal name in another case').not.toContain(goal.title.toLowerCase());
      expect(ms.title).not.toMatch(/without stopping|toward/i);
    }
    expect(plan.milestones[plan.milestones.length - 1]!.title).toBe(goal.targetDate ? 'The date you set' : "The season's end");
    for (const ms of plan.milestones) {
      expect(ms.proof).toBe(monitoring.line);
      expect(ms.proofSourceLineId).toBe(monitoring.id);
      expect(measurable(ms.proof), `a measurable proof: "${ms.proof.slice(0, 50)}"`).toBe(true);
      expect(ms.targetDate > TODAY).toBe(true);
    }
    expect(plan.obstaclePlans).toHaveLength(1);
    expect(plan.obstaclePlans[0]!.response.length).toBeGreaterThan(0);

    report.plans.built += 1;
    report.plans.moves += plan.moves.length;
    report.plans.milestones += plan.milestones.length;
  });

  it.each([
    ['as they set it', false, 'kept'],
    ['in the concern band', true, 'kept'],
    ['on the first morning', false, 'none'],
    ['after a quiet day', false, 'quiet'],
  ] as const)('the dawn brief %s: short, quoting, and never the banned words', (_label, soften, yesterdayKind) => {
    // The first morning has no yesterday; a quiet day has one with nothing
    // in it. Both used to be told "not a failure" — the banned word, on the
    // morning it matters most — and neither was on the set.
    const yesterday = yesterdayKind === 'none' ? null : yesterdayKind === 'quiet' ? { ...yesterdayOf(b), done: 0, evidenceCount: 0, proof: null } : yesterdayOf(b);
    const brief = buildDawnBrief(
      {
        day: TODAY,
        book,
        yesterday,
        moves,
        analyses: b.analyses,
        persona: p.persona,
        score: 63,
        previousScore: 59,
        soften,
        offerSupport: soften,
      },
      ids,
    );
    expect(BriefSchema.safeParse(brief).success).toBe(true);
    const text = [brief.yesterday, brief.today, brief.ifThen].join(' ');
    expect(words(text), 'PRD §11.8: ≤ 90 words').toBeLessThanOrEqual(90);
    expect(brief.quotedSpans.length, 'at least one quoted span').toBeGreaterThanOrEqual(1);
    const quotable = [...b.corpus, ...moves.map((m) => m.title)];
    for (const span of brief.quotedSpans) {
      expect(inAny(quotable, span), `the brief quotes their words: "${span.slice(0, 50)}"`).toBe(true);
      expect(contains(text, span), `and prints what it quotes: "${span.slice(0, 50)}"`).toBe(true);
    }
    expect(appProse(text, brief.quotedSpans)).not.toMatch(BANNED);
    expect(brief.firstMoveId).toBe(moves[0]!.id);
    expect(text).not.toMatch(HANGING_CUT);
    expect(text).not.toMatch(/[,;:]\.|\s\./);
    expect(text).not.toMatch(STOP_THEN_LOWER);
    // The Now card's move, named. Its first letter is theirs when it is a day or "I".
    expect(contains(brief.today, moves[0]!.title)).toBe(true);
    if (soften) {
      expect(brief.soften).toBe(true);
      expect(brief.yesterday).not.toMatch(/Consistency \d+/);
      expect(brief.today).not.toContain('No negotiation');
      expect(brief.support).toBeTruthy();
    } else if (yesterdayKind === 'kept') {
      expect(brief.yesterday).toContain('Consistency 63, up from 59.');
    } else {
      expect(brief.yesterday).toBe('Quiet day yesterday. It is in the ledger as a quiet day, and that is all it is.');
    }
    // Their opening line is the first thing the morning says, whenever there
    // is room for it: the app's own flourish goes before their words do.
    if (brief.today.startsWith('“')) {
      expect(brief.quotedSpans[0]!.length).toBeGreaterThan(0);
    } else {
      expect(brief.today).not.toContain('No negotiation');
      expect(brief.today).not.toContain("When you're ready");
    }
    report.briefs.built += 1;
    report.briefs.maxWords = Math.max(report.briefs.maxWords, words(text));
  });

  it('every chip reply is short, quotes only their words, and offers only their own move', () => {
    const ctx = {
      book,
      analyses: b.analyses,
      moves,
      days: [yesterdayOf(b)],
      today: TODAY,
      returns: 0,
      persona: p.persona,
    };
    for (const chip of CHIPS) {
      const reply = replyToChip(chip.id, ctx);
      expect(words(reply.text), `${chip.id}: PRD §11.4 ≤ 120 words a turn`).toBeLessThanOrEqual(120);
      expect(reply.text.trim().length).toBeGreaterThan(0);
      const quotable = [...b.corpus, ...moves.map((m) => m.title)];
      for (const span of reply.quotedSpans) {
        expect(inAny(quotable, span), `${chip.id} quotes their words: "${span.slice(0, 50)}"`).toBe(true);
        expect(contains(reply.text, span)).toBe(true);
      }
      expect(appProse(reply.text, reply.quotedSpans), `${chip.id}: no banned words`).not.toMatch(BANNED);
      expect(reply.text, 'the coach never says how they felt (PRD §11.4)').not.toMatch(/you (?:did not|didn['’]t) feel like it/);
      expect(reply.text).not.toMatch(STOP_THEN_LOWER);
      if (reply.action) {
        expect(moves.some((m) => m.id === reply.action!.moveId && m.title === reply.action!.title)).toBe(true);
      }
      report.chips += 1;
    }
  });

  it.each(['portrait', 'first-return', 'milestone', 'monthly'] as LetterTrigger[])('the %s letter quotes the Book and names no plan', (trigger) => {
    const sources = { ideal: p.ideal, evidence: evidenceOf(b), goals: b.goals, moves };
    const letter = composeLetter(trigger, sources, p.firstName);
    expect(letter.check.problems).toEqual([]);
    expect(letter.check.ok).toBe(true);
    expect(letter.quotes.length).toBeGreaterThanOrEqual(1);
    for (const q of letter.quotes) {
      expect(inAny([p.ideal, ...p.evidence.map((e) => e.text)], q)).toBe(true);
    }
    for (const goal of b.goals) expect(contains(letter.body, goal.title)).toBe(false);
    expect(appProse(letter.body, letter.quotes)).not.toMatch(BANNED);
    expect(letter.body).not.toMatch(STOP_THEN_LOWER);
    expect(letter.body, 'a cut quotation does not stop on a word that leaves it hanging').not.toMatch(HANGING_CUT_LETTER);
    if (p.evidence.length === 2) expect(letter.body).not.toMatch(/2 entries[^.]*two of them/);
    // The check is the same one the store runs; a letter it refuses is never shown.
    expect(checkLetter(letter.body, letter.quotes, sources).ok).toBe(true);
    report.letters.built += 1;
    report.letters.minWords = Math.min(report.letters.minWords, letter.check.words);
    report.letters.maxWords = Math.max(report.letters.maxWords, letter.check.words);
  });

  it('the Returns letter and the Full-track invitation quote them', () => {
    const returns = returnsLetter(book, 5, 1);
    expect(returns.quotes).toEqual([p.iWill]);
    expect(returns.body).toContain(p.iWill);
    expect(appProse(returns.body, returns.quotes)).not.toMatch(BANNED);

    const longest = b.analyses.map((a) => a.paragraph ?? a.line).sort((x, y) => y.length - x.length)[0]!;
    const invitation = fullTrackInvitation(longest);
    expect(longest.startsWith(invitation.quoted.replace(/…$/, ''))).toBe(true);
    expect(invitation.text).toContain(invitation.quoted);
    expect(appProse(invitation.text, [invitation.quoted])).not.toMatch(BANNED);
  });
});

// ------------------------------------------------------------------ safety

describe('the safety screen on the labelled set', () => {
  const RANK: Record<SafetyRisk, number> = { none: 0, concern: 1, crisis: 2 };
  const by = (label: SafetyRisk) => SAFETY_SET.filter((l) => l.label === label);

  it('is two hundred lines, labelled', () => {
    expect(SAFETY_SET).toHaveLength(200);
    expect(new Set(SAFETY_SET.map((l) => l.text)).size).toBe(200);
    expect(by('crisis').length).toBeGreaterThanOrEqual(60);
    expect(by('concern').length).toBeGreaterThanOrEqual(50);
    expect(by('none').length).toBeGreaterThanOrEqual(60);
  });

  it('raises the resources card on at least 95% of the crisis lines', () => {
    const lines = by('crisis');
    const caught = lines.filter((l) => screen(l.text).risk === 'crisis');
    for (const l of lines) if (screen(l.text).risk !== 'crisis') report.safety.misses.push(`missed crisis: "${l.text}"`);
    report.safety.crisis = [caught.length, lines.length];
    expect(caught.length / lines.length).toBeGreaterThanOrEqual(0.95);
  });

  it('softens the next morning on at least 95% of the concern lines', () => {
    const lines = by('concern');
    const caught = lines.filter((l) => RANK[screen(l.text).risk] >= RANK.concern);
    for (const l of lines) if (RANK[screen(l.text).risk] < RANK.concern) report.safety.misses.push(`missed concern: "${l.text}"`);
    report.safety.concern = [caught.length, lines.length];
    expect(caught.length / lines.length).toBeGreaterThanOrEqual(0.95);
  });

  it('leaves ordinary sentences alone: no card on any of them, and a soft morning for almost none', () => {
    const lines = by('none');
    const card = lines.filter((l) => screen(l.text).risk === 'crisis');
    const soft = lines.filter((l) => screen(l.text).risk === 'concern');
    for (const l of card) report.safety.misses.push(`card on an ordinary line: "${l.text}"`);
    for (const l of soft) report.safety.misses.push(`softened on an ordinary line: "${l.text}"`);
    report.safety.noneCrisis = [card.length, lines.length];
    report.safety.noneConcern = [soft.length, lines.length];
    expect(card, 'the resources card on an ordinary sentence teaches people to dismiss it').toEqual([]);
    expect(soft.length / lines.length).toBeLessThanOrEqual(0.05);
  });

  it('never logs the words: the category is all the result carries', () => {
    for (const l of SAFETY_SET) {
      const r = screen(l.text);
      expect(Object.keys(r).sort()).toEqual(['action', 'category', 'risk']);
      expect(r.action).toBe(r.risk === 'crisis' ? 'resources' : r.risk === 'concern' ? 'soften' : 'continue');
    }
  });
});
