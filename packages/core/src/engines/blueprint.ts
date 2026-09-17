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
  const verb = t.match(/\b(run|walk|write|read|stretch|call|save|move|play|practise|practice|cook|clean|sit|breathe)\w*/i);
  if (verb?.[0]) return `Two minutes: ${verb[0].toLowerCase()}, that's the whole ask.`;
  return 'Two minutes of it, and that counts.';
}

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
  const milestones: Milestone[] = [];
  for (let i = 0; i < milestoneCount; i++) {
    const share = (i + 1) / milestoneCount;
    milestones.push({
      id: opts.newId('ms'),
      planId,
      goalId: goal.id,
      title: i === 0 ? firstMilestoneTitle(goal.title, strategyText) : `Step ${i + 1} toward ${goal.title.toLowerCase()}`,
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
  const scheduledPieces = pieces.slice(0, 3).map((text, i) => {
    const dayName = text.match(/\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i)?.[0];
    return {
      text,
      scheduled: dayName ? nextWeekday(opts.today, dayName) : addDays(opts.today, i === 0 ? 1 : 2 + i),
    };
  });
  // "Start with the first move" has to mean the one that comes soonest, not the
  // one the user happened to name first in their sentence.
  scheduledPieces.sort((a, b) => (a.scheduled < b.scheduled ? -1 : a.scheduled > b.scheduled ? 1 : 0));

  // The repair the PRD asks for (§7.4: "repaired once, then a minimal plan is
  // built from the user's lines"). Someone who writes "every Saturday" on a
  // Sunday named a first move six days out, which the 48-hour rule would
  // reject — and rejecting it means they seal their Book and get no plan at
  // all. So open with the same line, tomorrow. It is still their sentence and
  // still their source line; only the date is the app's, and the whole point
  // of the rule is that the first step is close enough to actually happen.
  const soonest = scheduledPieces[0];
  if (soonest && daysBetween(opts.today, soonest.scheduled) > 2) {
    // Without the day it was cut for. "Tuesday: at 6:40, out the back door"
    // dated a Friday is a move that contradicts itself; the body of it, at
    // 6:40 out the back door, is still their sentence and is true on Friday.
    scheduledPieces.unshift({ text: withoutDayPrefix(soonest.text), scheduled: addDays(opts.today, 1) });
  }
  // Never more than three in week one, counted after the repair.
  const weekOnePieces = scheduledPieces.slice(0, 3);

  const moves: Move[] = weekOnePieces.map(({ text, scheduled }, i) => {
    return {
      id: opts.newId('mv'),
      goalId: goal.id,
      milestoneId: firstMilestone?.id ?? null,
      title: text,
      effort: i === 0 ? 'S' : effortFor(text),
      energy: energyFor(text),
      ifThen: obstacles?.line2?.trim() ? ifThenOf(obstacles.line, obstacles.line2).sentence.replace(/^if/, 'If') : null,
      scheduledFor: scheduled,
      week: 1,
      status: 'todo',
      completedAt: null,
      minVersion: minVersionOf(text),
      sourceLineId: strategies.id,
      order: i,
    };
  });

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

/** "Tuesday: at 6:40, out the back door" → "at 6:40, out the back door". Only the prefix `splitFirstMoves` put there. */
function withoutDayPrefix(text: string): string {
  const body = text.replace(/^(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day:\s*/, '').trim();
  return body.length > 6 ? body : text;
}

function firstMilestoneTitle(goalTitle: string, strategy: string): string {
  const n = strategy.match(/\b(\d+(?:\.\d+)?)\s?(km|k|miles?|mi|min|minutes|words|pages|£|\$|€)\b/i);
  if (n) return `First ${n[1]}${n[2] ? ` ${n[2]}` : ''} without stopping`;
  return `First two weeks of ${goalTitle.toLowerCase()}`;
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
      if (first.effort === 'L') problems.push('the first move is too big to start tomorrow');
      if (first.scheduledFor && daysBetween(today, first.scheduledFor) > 2) {
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
  if (rate >= 0.8 && plan.moves.length < 6) {
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

/** A move with no week belongs to none, so it cannot raise the count. */
function highestWeek(moves: Move[]): number {
  return moves.reduce((n, m) => (m.week === null ? n : Math.max(n, m.week)), 1);
}

function weekIsFull(moves: Move[], week: number): boolean {
  return moves.filter((m) => m.week === week).length >= 3;
}

export { addDays, daysBetween };
