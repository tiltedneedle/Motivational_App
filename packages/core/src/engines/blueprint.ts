/**
 * The Blueprint (PRD §7.4): the plan, generated only from the user's own
 * Strategies, Obstacles and Monitoring lines.
 *
 * `sourceLineId` is required on every move and every obstacle plan. A plan with
 * an unsourced move fails validation and is rejected — that check is the whole
 * defence of the authorship rule on the plan side.
 */
import type { GoalAnalysis, Goal, Milestone, Move, ObstaclePlan, Plan } from '../types';
import { splitFirstMoves } from './portrait';
import { ifThenOf } from '../ids';

export interface BlueprintOptions {
  /** ISO date the plan is generated on. */
  today: string;
  seasonWeeks?: number;
  newId: (prefix: string) => string;
}

export class BlueprintInvalid extends Error {
  constructor(public readonly problems: string[]) {
    super(`Blueprint rejected: ${problems.join('; ')}`);
    this.name = 'BlueprintInvalid';
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`bad date: ${iso}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const x = new Date(`${a}T00:00:00Z`).getTime();
  const y = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((y - x) / 86_400_000);
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Next occurrence of a named weekday, at least tomorrow. */
function nextWeekday(from: string, weekday: string): string {
  const target = WEEKDAY_INDEX[weekday.toLowerCase()];
  if (target === undefined) return addDays(from, 1);
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 1; i <= 7; i++) {
    const c = new Date(d);
    c.setUTCDate(c.getUTCDate() + i);
    if (c.getUTCDay() === target) return c.toISOString().slice(0, 10);
  }
  return addDays(from, 1);
}

function effortFor(text: string): Move['effort'] {
  const m = text.match(/\b(\d+)\s?(min|mins|minutes)\b/i);
  if (m && m[1]) {
    const n = Number(m[1]);
    if (n <= 15) return 'S';
    if (n <= 45) return 'M';
    return 'L';
  }
  if (/\b(hour|hours|long|whole)\b/i.test(text)) return 'L';
  if (/\b(two|five|ten|quick|small)\b/i.test(text)) return 'S';
  return 'M';
}

function energyFor(text: string): Move['energy'] {
  return /\b(morning|dawn|6[:.]|7[:.]|before work|first thing|run|gym|write|draft)\b/i.test(text)
    ? 'high'
    : 'low';
}

/**
 * Whether a two-minute version is Morrow's own stand-in rather than a line
 * the person typed: the three sentences `minVersionOf` can supply. Matched
 * by shape, not by re-deriving from a source line that may since have been
 * rewritten, so the screens can set the stand-in in the sans wherever it is.
 */
export function isMinVersionStandIn(text: string | null | undefined): boolean {
  const t = (text ?? '').trim();
  return t === 'Two minutes of it, wherever you are.' || t === 'Two minutes of it, and that counts.' || /^Two minutes: \S+, that's the whole ask\.$/.test(t);
}

/** A two-minute version, cut from the user's own line where possible. */
export function minVersionOf(line: string): string {
  const t = line.trim();
  if (!t) return 'Two minutes of it, wherever you are.';
  // A whole verb, in its base form. `\\w*` on the stem printed "Two minutes:
  // moved" from "moved from the kitchen table"; a verb list this short is a
  // list of things that can be done for two minutes, not of stems.
  const verb = t.match(MIN_VERB);
  if (verb?.[1]) return `Two minutes: ${verb[1].toLowerCase()}, that's the whole ask.`;
  return 'Two minutes of it, and that counts.';
}

const MIN_VERB =
  /\b(run|jog|walk|swim|cycle|stretch|lift|train|write|draft|read|revise|study|practise|practice|play|sing|draw|paint|sew|knit|piece|plant|weed|dig|water|cook|bake|clean|tidy|sit|breathe|meditate|pray|journal|call|ring|phone|text|save|transfer|move|book|list|plan|sort|file|deploy|code|ship|sketch|rehearse)(?:s|es)?\b/i;

export interface BuildInput {
  goal: Goal;
  analyses: GoalAnalysis[];
}

/**
 * Deterministic plan construction. A model may later propose a richer shape,
 * but it must satisfy `validatePlan` — which requires a user line behind
 * every move — or it is thrown away and this builder runs instead.
 */
export function buildPlan(input: BuildInput, opts: BlueprintOptions): Plan {
  const { goal, analyses } = input;
  const strategies = analyses.find((a) => a.kind === 'strategies' && a.line.trim());
  const obstacles = analyses.find((a) => a.kind === 'obstacles' && a.line.trim());
  const monitoring = analyses.find((a) => a.kind === 'monitoring' && a.line.trim());

  if (!strategies) throw new BlueprintInvalid(['nothing to plan from: the How stone is not written yet']);

  const seasonWeeks = opts.seasonWeeks ?? 12;
  const planId = opts.newId('plan');
  // The line, on both tracks. The Full track's paragraph answers four prompts
  // — the week, the smallest version, the night before, what to stop — and
  // cutting moves from it put whole paragraphs on Today as a single move
  // ("days off are the four in the pattern and on each one I'm at the
  // library…", sixty words, with the reason for the pick-up time in it). The
  // line is the one sentence with a time and a place that the stone asked
  // for; the paragraph is the Book's, and the sentence under a move.
  const strategyText = strategies.line.trim();

  // Milestones: the user's Monitoring line is the proof of the first one.
  const horizonDays = goal.targetDate ? Math.max(14, daysBetween(opts.today, goal.targetDate)) : seasonWeeks * 7;
  const milestoneCount = horizonDays < 21 ? 2 : horizonDays < 120 ? 3 : 4;
  // "The date you set" only when the last milestone lands on it. A target
  // date sooner than a fortnight, or already past, is stretched to the
  // fourteen-day floor above, and that is not the date they set.
  const onTheirDate = Boolean(goal.targetDate) && addDays(opts.today, horizonDays) === goal.targetDate;
  const milestones: Milestone[] = [];
  for (let i = 0; i < milestoneCount; i++) {
    const share = (i + 1) / milestoneCount;
    milestones.push({
      id: opts.newId('ms'),
      planId,
      goalId: goal.id,
      title: milestoneTitle(i, milestoneCount, Math.max(7, Math.round(horizonDays * share)), onTheirDate),
      // Empty when they have not written the Monitoring line yet. It used to
      // fall back to "One entry in the ledger.", which is the app deciding what
      // counts as proof for somebody else's goal — and `validatePlan` then
      // waved it through because the field was not empty. A milestone with no
      // proof says so, and the Goal screen asks for the line.
      proof: monitoring?.line.trim() ?? '',
      proofSourceLineId: monitoring?.id ?? null,
      targetDate: addDays(opts.today, Math.max(7, Math.round(horizonDays * share))),
      order: i,
      reachedAt: null,
    });
  }

  // Moves: cut from the Strategies line. Never more than three in week one.
  const pieces = splitFirstMoves(strategyText);
  const firstMilestone = milestones[0];
  // A piece dated by its own words — "Tuesday", "the 28th" — keeps that
  // date. A piece with no date of its own gets the app's: the first
  // tomorrow, the rest a day apart after it.
  const scheduledPieces = pieces.slice(0, 3).map((text, i) => ({
    text,
    scheduled: ownDate(text, opts.today) ?? addDays(opts.today, i === 0 ? 1 : 2 + i),
    effort: effortFor(text),
  }));
  const byDate = (a: { scheduled: string }, b: { scheduled: string }) => (a.scheduled < b.scheduled ? -1 : a.scheduled > b.scheduled ? 1 : 0);
  scheduledPieces.sort(byDate);

  // The 48-hour rule (§7.4) is honoured by the app's own dates, never by
  // putting the person's sentence on a day it contradicts. When the soonest
  // piece is dated by their words and more than two days out, a piece with no
  // date of its own moves to tomorrow; when every piece names its day, the
  // plan opens on the first of those days, and `validatePlan` knows a move
  // that carries its own date. The opening copy this used to make — "Sunday
  // at 4 pm in the kitchen" as a card for Friday — was a move that
  // contradicted itself in their own words.
  const soonest = scheduledPieces[0];
  if (soonest && daysBetween(opts.today, soonest.scheduled) > 2) {
    const undated = scheduledPieces.find((p) => !ownDate(p.text, opts.today));
    if (undated) {
      undated.scheduled = addDays(opts.today, 1);
      scheduledPieces.sort(byDate);
    }
  }
  // "First move doable in ≤ 30 minutes" (§7.4): when the soonest piece is a
  // long one and a smaller piece has no date of its own, the smaller one
  // opens. Their sentences stay whole; only the app's dates move.
  const opening = scheduledPieces[0];
  if (opening && opening.effort === 'L') {
    const smaller = scheduledPieces.find((p) => p !== opening && p.effort !== 'L' && !ownDate(p.text, opts.today));
    if (smaller) {
      smaller.scheduled = addDays(opts.today, 1);
      if (!ownDate(opening.text, opts.today)) opening.scheduled = addDays(opts.today, 2);
      scheduledPieces.sort((a, b) => byDate(a, b) || (a === smaller ? -1 : b === smaller ? 1 : 0));
    }
  }
  const weekOnePieces = scheduledPieces.slice(0, 3);

  // The first fortnight (§7.4: at most three moves a week in the first
  // fortnight), not the first week alone. Dated for week one only, a
  // twelve-week season had nothing after day five: Today read "Nothing
  // scheduled" and the morning line fell silent. Week two is the same
  // pieces a week on — their sentences, on the same days; `carryForward`
  // rolls each finished week into the next from there.
  const moveOf = ({ text, scheduled, effort }: { text: string; scheduled: string; effort: Move['effort'] }, week: number, i: number): Move => ({
    id: opts.newId('mv'),
    goalId: goal.id,
    milestoneId: firstMilestone?.id ?? null,
    title: text,
    effort,
    energy: energyFor(text),
    ifThen: obstacles?.line2?.trim() ? ifThenOf(obstacles.line, obstacles.line2).sentence.replace(/^if/, 'If') : null,
    scheduledFor: addDays(scheduled, (week - 1) * 7),
    week,
    status: 'todo',
    completedAt: null,
    minVersion: minVersionOf(text),
    sourceLineId: strategies.id,
    order: i,
  });
  const moves: Move[] = [
    ...weekOnePieces.map((p, i) => moveOf(p, 1, i)),
    ...(seasonWeeks > 1 ? weekOnePieces.map((p, i) => moveOf(p, 2, i)) : []),
  ];

  if (moves.length === 0) {
    moves.push({
      id: opts.newId('mv'),
      goalId: goal.id,
      milestoneId: firstMilestone?.id ?? null,
      title: strategyText.slice(0, 90),
      effort: 'S',
      energy: energyFor(strategyText),
      ifThen: null,
      scheduledFor: addDays(opts.today, 1),
      week: 1,
      status: 'todo',
      completedAt: null,
      minVersion: minVersionOf(strategyText),
      sourceLineId: strategies.id,
      order: 0,
    });
  }

  const obstaclePlans: ObstaclePlan[] = obstacles
    ? [
        {
          id: opts.newId('ob'),
          goalId: goal.id,
          obstacle: obstacles.line.trim(),
          response: obstacles.line2?.trim() ?? '',
          sourceLineId: obstacles.id,
        },
      ]
    : [];

  const plan: Plan = {
    id: planId,
    goalId: goal.id,
    version: 1,
    seasonWeeks,
    status: 'active',
    createdAt: new Date().toISOString(),
    replannedAt: [],
    milestones,
    moves,
    obstaclePlans,
  };

  const problems = validatePlan(plan, analyses, opts.today);
  if (problems.length) throw new BlueprintInvalid(problems);
  return plan;
}

const WEEKDAY = /\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b/i;

/**
 * A milestone's title is app chrome and says only how far along it is.
 *
 * It used to say "First 45 minutes without stopping" — a running sentence,
 * put on a deadlift, a raise and a memoir — and "Step 2 toward lisbon with
 * tom and jay", the person's own name for their goal with its capitals
 * taken off. The goal's name is already the page's; the milestone's job is
 * the distance, and the last one is the date they set, when they set one.
 */
function milestoneTitle(index: number, count: number, daysIn: number, onTheirDate: boolean): string {
  if (index === count - 1) return onTheirDate ? 'The date you set' : "The season's end";
  const weeks = Math.max(1, Math.round(daysIn / 7));
  return weeks === 1 ? 'One week in' : `${weeksInWords(weeks)} weeks in`;
}

/** Two … ninety-nine, so a Path never mixes "Thirteen weeks in" with "26 weeks in". */
function weeksInWords(n: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const word = n < 20 ? ones[n] : n < 100 ? `${tens[Math.floor(n / 10)]}${n % 10 ? `-${ones[n % 10]}` : ''}` : String(n);
  return (word ?? String(n)).replace(/^./, (c) => c.toUpperCase());
}

/**
 * The date a piece carries in its own words, if any: a weekday ("Tuesday at
 * 6:40"), or a day of the month ("on the 28th", "the 1st and 15th" — the
 * nearest to come). Null when the words name no date, and the app's date is
 * the only one it has.
 */
export function ownDate(text: string, today: string): string | null {
  const day = text.match(WEEKDAY)?.[0];
  if (day) return nextWeekday(today, day);
  // "the 28th", and every ordinal beside it: "the 1st and 15th".
  if (!/\bthe\s+\d{1,2}(?:st|nd|rd|th)\b/i.test(text)) return null;
  const ordinals = [...text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= 31);
  if (ordinals.length === 0) return null;
  return ordinals.map((n) => nextDayOfMonth(today, n)).sort()[0] ?? null;
}

/** The next date on or after tomorrow whose day of the month is `n`. */
function nextDayOfMonth(from: string, n: number): string {
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < 3; i++) {
    const c = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, n));
    if (c.getUTCDate() !== n) continue; // a month without that day
    const iso = c.toISOString().slice(0, 10);
    if (iso > from) return iso;
  }
  return addDays(from, 1);
}

export interface ValidateOptions {
  /**
   * Construction rules, true only for a plan being born (PRD §7.4: the first
   * move small and within 48 hours, at most three in week one).
   *
   * A plan halfway through a season legitimately breaks all of them — its
   * first move was kept weeks ago and its later weeks are full — so applying a
   * replan checks authorship and dates but not these.
   */
  asNewPlan?: boolean;
}

/**
 * The gate. Runs on every plan, whoever built it.
 *
 * Two rules always hold, and they are the ones that carry the authorship
 * promise: every move and every obstacle plan has a line the user wrote behind
 * it, and no move the user still has to do is dated in the past.
 */
export function validatePlan(
  plan: Plan,
  analyses: GoalAnalysis[],
  today: string,
  options: ValidateOptions = {},
): string[] {
  const { asNewPlan = true } = options;
  const problems: string[] = [];
  const ids = new Set(analyses.map((a) => a.id));

  for (const m of plan.moves) {
    if (!m.sourceLineId || !ids.has(m.sourceLineId)) {
      problems.push(`move "${m.title.slice(0, 40)}" has no user line behind it`);
    }
    // Only moves still to do. A move kept last Tuesday is supposed to be dated
    // last Tuesday, and calling that a broken plan would reject every plan that
    // has ever been used.
    if (m.status === 'todo' && m.scheduledFor && daysBetween(today, m.scheduledFor) < 0) {
      problems.push(`move "${m.title.slice(0, 40)}" is scheduled in the past`);
    }
  }

  if (asNewPlan) {
    const first = [...plan.moves].sort((a, b) => a.order - b.order)[0];
    if (first) {
      // A long first move is a fault only when a smaller one was there to
      // open with: the app cannot shorten their sentence, and refusing the
      // plan leaves them with none.
      if (first.effort === 'L' && plan.moves.some((m) => m.week === 1 && m.effort !== 'L')) {
        problems.push('the first move is too big to start with when a smaller one is there');
      }
      // Within 48 hours, unless the person dated it themselves: a move that
      // says "Saturday" or "the 28th" is theirs to date, and the app never
      // puts their sentence on a day it contradicts.
      if (first.scheduledFor && daysBetween(today, first.scheduledFor) > 2 && !ownDate(first.title, today)) {
        problems.push('the first move is more than 48 hours away');
      }
    }
    const weekOne = plan.moves.filter((m) => m.week === 1);
    if (weekOne.length > 3) problems.push('more than three moves in the first week');
  }

  for (const ms of plan.milestones) {
    // A proof is theirs or it is nothing. Checking only that the string is
    // non-empty let the app's own fallback sentence satisfy the rule, which is
    // the same class of mistake as an unsourced move.
    if (ms.proof.trim() && (!ms.proofSourceLineId || !ids.has(ms.proofSourceLineId))) {
      problems.push(`milestone "${ms.title}" has a proof with no user line behind it`);
    }
  }
  for (const op of plan.obstaclePlans) {
    if (!op.sourceLineId || !ids.has(op.sourceLineId)) {
      problems.push('an obstacle plan has no user line behind it');
    }
  }
  return problems;
}

/**
 * Shown under every move in the Blueprint: the sentence it came from.
 *
 * A sentence, not the stone. On the Full track the stone carries a paragraph,
 * and printing the whole of it under each of nine moves was a wall of the
 * same text nine times. The line is the answer and is preferred; when the
 * move was cut from the paragraph instead, the one sentence of it that holds
 * the move's words; failing that the line, and only then the paragraph.
 */
export function sourceLineFor(move: Move, analyses: GoalAnalysis[]): string | null {
  const a = analyses.find((x) => x.id === move.sourceLineId);
  if (!a) return null;
  const line = a.line.trim();
  const paragraph = a.paragraph?.trim() ?? '';
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const needle = norm(move.title).replace(/^(?:mon|tues|wednes|thurs|fri|satur|sun)day:\s*/, '');
  if (line && (!needle || norm(line).includes(needle))) return line;
  if (paragraph && needle) {
    const sentence = paragraph.split(/(?<=[.!?])\s+/).find((s) => norm(s).includes(needle));
    if (sentence) return sentence.trim();
  }
  return line || paragraph || null;
}

export interface ReplanChange {
  op: 'add' | 'move' | 'remove' | 'edit';
  target: 'move' | 'milestone';
  id: string | null;
  before: string | null;
  after: string | null;
  reason: string;
  sourceLineId: string | null;
}

/**
 * Replan proposes changes as a diff, each with a reason and the user's own
 * line behind it. The user accepts or keeps theirs per row.
 */
export function proposeReplan(plan: Plan, opts: { done: number; planned: number; newId: (p: string) => string; today: string }): ReplanChange[] {
  const changes: ReplanChange[] = [];
  const rate = opts.planned > 0 ? opts.done / opts.planned : 0;
  const active = plan.moves.filter((m) => m.status === 'todo');

  // Nothing asked for yet is not a bad week. On the evening the Book is
  // sealed every move is dated tomorrow or later, and "You kept 0 of 3" was
  // proposed against work that had not been asked for.
  if (opts.planned > 0 && rate < 0.5 && active.length > 1) {
    const drop = active[active.length - 1];
    if (drop) {
      changes.push({
        op: 'remove',
        target: 'move',
        id: drop.id,
        before: drop.title,
        after: null,
        reason: `You kept ${opts.done} of ${opts.planned}. One fewer this week, not one more.`,
        sourceLineId: drop.sourceLineId,
      });
    }
  }
  // Room in the week ahead, not in the season: the fortnight already
  // dated is six rows.
  if (rate >= 0.8 && active.filter((m) => m.week === highestWeek(plan.moves)).length < 6) {
    const seed = plan.moves[0];
    if (seed) {
      changes.push({
        op: 'add',
        target: 'move',
        id: null,
        before: null,
        after: seed.title,
        reason: `You kept ${opts.done} of ${opts.planned}. Room for one more of the same.`,
        sourceLineId: seed.sourceLineId,
      });
    }
  }
  // Nothing open and nothing dated ahead, with weeks of the season left:
  // the same moves again, a week on. The rows carry the plan's own titles,
  // so the gate that checks an added title against its line lets them
  // through, and "Keep mine" on every row leaves the plan as it is.
  if (active.length === 0 && weeksLeft(plan, opts.today) > 0) {
    const seen = new Set<string>();
    const kept = [...plan.moves].sort((a, b) => a.order - b.order).filter((m) => {
      if (m.status !== 'done' || seen.has(m.title)) return false;
      seen.add(m.title);
      return true;
    });
    for (const m of kept.slice(0, 3)) {
      changes.push({
        op: 'add',
        target: 'move',
        id: null,
        before: null,
        after: m.title,
        reason: 'Nothing is dated ahead. The same move again, next week, or drop it.',
        sourceLineId: m.sourceLineId,
      });
    }
  }
  for (const m of active) {
    if (m.scheduledFor && daysBetween(opts.today, m.scheduledFor) < 0) {
      changes.push({
        op: 'move',
        target: 'move',
        id: m.id,
        before: m.scheduledFor,
        after: addDays(opts.today, 1),
        reason: 'This date has passed. Tomorrow, or drop it.',
        sourceLineId: m.sourceLineId,
      });
    }
  }
  return changes;
}

/**
 * Apply the changes the user accepted.
 *
 * The result goes through `validatePlan` exactly like a freshly built plan.
 * A replan is the one moment the plan changes after the Book is sealed, so it
 * is the last place that should be allowed to skip the gate: an accepted "add"
 * with a stale source line, or a fourth move landing in week one, would
 * otherwise be stored unchecked.
 */
export function applyReplan(
  plan: Plan,
  accepted: ReplanChange[],
  newId: (p: string) => string,
  analyses: GoalAnalysis[] = [],
  // Required, and deliberately not defaulted. It used to fall back to
  // `new Date().toISOString().slice(0, 10)`, which is the UTC date rather than
  // the person's day — a day late for everyone west of Greenwich, on the
  // function that decides when their moves are scheduled. Core does not know
  // anybody's day boundary, so it asks rather than guesses.
  today: string,
): Plan {
  let moves = [...plan.moves];
  for (const c of accepted) {
    if (c.target !== 'move') continue;
    if (c.op === 'remove' && c.id) moves = moves.filter((m) => m.id !== c.id);
    if (c.op === 'move' && c.id && c.after) {
      moves = moves.map((m) => (m.id === c.id ? { ...m, scheduledFor: c.after } : m));
    }
    if (c.op === 'add' && c.after && c.sourceLineId) {
      // The title has to be in the line it is attributed to. `validatePlan`
      // checks that the source line exists; it did not check that the words
      // came from it, so an accepted row could put any sentence on Today
      // under the person's own name.
      const line = analyses.find((a) => a.id === c.sourceLineId);
      // A title the plan already carries was checked when it was made, and
      // "room for one more of the same" proposes exactly that title.
      const known = plan.moves.some((m) => m.title === c.after);
      if (line && !known && !isCutFrom(c.after, line)) {
        throw new BlueprintInvalid([`added move is not in its source line: "${c.after.slice(0, 40)}"`]);
      }
      const base = plan.moves[0];
      moves.push({
        id: newId('mv'),
        goalId: plan.goalId,
        milestoneId: base?.milestoneId ?? null,
        title: c.after,
        effort: 'S',
        energy: base?.energy ?? 'low',
        ifThen: base?.ifThen ?? null,
        // Dated, not null: an undated move never surfaces on Today, so an
        // accepted "room for one more" would quietly go nowhere.
        scheduledFor: addDays(today, 1),
        // The week-one cap counts moves in week one. A move added during a
        // replan belongs to the week it was added to, not to the first.
        week: highestWeek(moves) + (weekIsFull(moves, highestWeek(moves)) ? 1 : 0),
        status: 'todo',
        completedAt: null,
        minVersion: minVersionOf(c.after),
        sourceLineId: c.sourceLineId,
        order: moves.length,
      });
    }
  }

  const next: Plan = { ...plan, version: plan.version + 1, moves };
  const problems = validatePlan(next, analyses, today, { asNewPlan: false });
  if (problems.length) throw new BlueprintInvalid(problems);
  return next;
}

/**
 * Which milestones have been reached, by the only evidence there is.
 *
 * A milestone is a date with the person's Monitoring line as its proof. It is
 * reached on the first day its date has passed with something in the ledger
 * for this goal since the milestone before it — a kept move, a practice run,
 * a line they wrote. Nothing set `reachedAt` before this: the letters engine
 * had a whole occasion for it and the Goal screen a whole branch, and both
 * were dead code because no plan ever recorded that a milestone was reached.
 *
 * Stamped once, never unstamped: a milestone reached is a letter written and
 * a date on the Path, and a ledger row deleted later does not unhappen the
 * morning it recorded.
 */
export function reachMilestones(
  plan: Plan,
  ledger: readonly { goalId: string | null; day: string }[],
  today: string,
  now: string,
  // The day the plan was built, as the person counts days. Core cannot
  // derive it from `createdAt`, which is an instant: its UTC date is a day
  // ahead for everyone west of Greenwich in the evening, and a first move
  // kept on its own day then fell outside the first window for good.
  createdOn: string,
): Plan {
  const days = ledger.filter((e) => e.goalId === plan.goalId).map((e) => e.day);
  if (days.length === 0) return plan;
  const ordered = [...plan.milestones].sort((a, b) => a.order - b.order);
  let changed = false;
  const stamped = new Map<string, string>();
  let since = createdOn;
  for (const ms of ordered) {
    if (!ms.reachedAt && ms.targetDate <= today && days.some((d) => d > since && d <= ms.targetDate)) {
      stamped.set(ms.id, now);
      changed = true;
    }
    since = ms.targetDate;
  }
  if (!changed) return plan;
  return { ...plan, milestones: plan.milestones.map((ms) => (stamped.has(ms.id) ? { ...ms, reachedAt: stamped.get(ms.id)! } : ms)) };
}

/** Whether a move's words are somewhere in the line they are attributed to. */
function isCutFrom(title: string, line: GoalAnalysis): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  // `splitFirstMoves` sets a day name in front of the body — "Tuesday: at
  // 6:40, out the back door" — which is the app sorting their sentence into
  // days, not writing one. The day is chrome; the body has to be theirs.
  const needle = norm(title).replace(/^(?:mon|tues|wednes|thurs|fri|satur|sun)day:\s*/, '');
  if (!needle) return false;
  return [line.line, line.line2 ?? '', line.paragraph ?? ''].some((s) => norm(s).includes(needle));
}

/** Whole weeks of the season still to come after `today`, by the day the plan was built. */
export function weeksLeft(plan: Plan, today: string): number {
  const end = addDays(plan.createdAt.slice(0, 10), plan.seasonWeeks * 7);
  return Math.max(0, Math.ceil(daysBetween(today, end) / 7));
}

/**
 * The plan's next week, cut from its own moves — or null when nothing is owed.
 *
 * `buildPlan` dates the first fortnight and no more. After it, each week
 * that is finished rolls into the next: every piece kept in the latest week
 * is dated again a week on, in the same words, on the same weekday. The
 * app writes no new move — it cannot; a move is the person's sentence — it
 * only dates the ones they kept. A piece parked stays open where it is
 * (that is what parking means) and is not doubled; a piece still to do
 * holds the week open. Null while a move is open or dated ahead, when
 * nothing in the latest week was kept, and once the season is over.
 */
export function carryForward(plan: Plan, today: string, newId: (p: string) => string): Move[] | null {
  if (plan.status !== 'active') return null;
  if (plan.moves.some((m) => m.status === 'todo')) return null;
  const latestWeek = plan.moves.reduce((n, m) => Math.max(n, m.week ?? 0), 0);
  if (latestWeek === 0 || latestWeek >= plan.seasonWeeks || weeksLeft(plan, today) === 0) return null;
  const seen = new Set<string>();
  const kept = plan.moves
    .filter((m) => m.week === latestWeek && m.status === 'done' && m.scheduledFor)
    .sort((a, b) => a.order - b.order)
    .filter((m) => {
      if (seen.has(m.title)) return false;
      seen.add(m.title);
      return true;
    });
  if (kept.length === 0) return null;
  return kept.map((m, i) => {
    let date = m.scheduledFor as string;
    while (date <= today) date = addDays(date, 7);
    return {
      ...m,
      id: newId('mv'),
      scheduledFor: date,
      week: latestWeek + 1,
      status: 'todo' as const,
      completedAt: null,
      completedOn: null,
      doingMinVersion: false,
      order: i,
    };
  });
}

/** A move with no week belongs to none, so it cannot raise the count. */
function highestWeek(moves: Move[]): number {
  return moves.reduce((n, m) => (m.week === null ? n : Math.max(n, m.week)), 1);
}

function weekIsFull(moves: Move[], week: number): boolean {
  return moves.filter((m) => m.week === week).length >= 3;
}

export { addDays, daysBetween };
