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

  if (!strategies) throw new BlueprintInvalid(['no Strategies line: nothing to plan from']);

  const seasonWeeks = opts.seasonWeeks ?? 12;
  const planId = opts.newId('plan');
  const strategyText = strategies.paragraph?.trim() || strategies.line.trim();

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
      proof: monitoring?.line.trim() ?? 'One entry in the ledger.',
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
    scheduledPieces.unshift({ text: soonest.text, scheduled: addDays(opts.today, 1) });
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
      ifThen: obstacles?.line2?.trim()
        ? `If ${obstacles.line.trim().replace(/^if\s+/i, '')}, then I ${obstacles.line2.trim().replace(/^then i\s+/i, '')}`
        : null,
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
    milestones,
    moves,
    obstaclePlans,
  };

  const problems = validatePlan(plan, analyses, opts.today);
  if (problems.length) throw new BlueprintInvalid(problems);
  return plan;
}

function firstMilestoneTitle(goalTitle: string, strategy: string): string {
  const n = strategy.match(/\b(\d+(?:\.\d+)?)\s?(km|k|miles?|mi|min|minutes|words|pages|£|\$|€)\b/i);
  if (n) return `First ${n[1]}${n[2] ? ` ${n[2]}` : ''} without stopping`;
  return `First two weeks of ${goalTitle.toLowerCase()}`;
}

/**
 * The gate. Runs on every plan, whoever built it.
 * PRD §7.4: first move ≤30 min and within 48 hours; every move sourced;
 * no past dates; ≤3 moves in week one; every milestone has a proof.
 */
export function validatePlan(plan: Plan, analyses: GoalAnalysis[], today: string): string[] {
  const problems: string[] = [];
  const ids = new Set(analyses.map((a) => a.id));

  for (const m of plan.moves) {
    if (!m.sourceLineId || !ids.has(m.sourceLineId)) {
      problems.push(`move "${m.title.slice(0, 40)}" has no user line behind it`);
    }
    if (m.scheduledFor && daysBetween(today, m.scheduledFor) < 0) {
      problems.push(`move "${m.title.slice(0, 40)}" is scheduled in the past`);
    }
  }
  const first = [...plan.moves].sort((a, b) => a.order - b.order)[0];
  if (first) {
    if (first.effort === 'L') problems.push('the first move is too big to start tomorrow');
    if (first.scheduledFor && daysBetween(today, first.scheduledFor) > 2) {
      problems.push('the first move is more than 48 hours away');
    }
  }
  const weekOne = plan.moves.filter((m) => m.week === 1);
  if (weekOne.length > 3) problems.push('more than three moves in the first week');
  for (const ms of plan.milestones) {
    if (!ms.proof.trim()) problems.push(`milestone "${ms.title}" has no proof`);
  }
  for (const op of plan.obstaclePlans) {
    if (!op.sourceLineId || !ids.has(op.sourceLineId)) {
      problems.push('an obstacle plan has no user line behind it');
    }
  }
  return problems;
}

/** Shown under every move in the Blueprint: the sentence it came from. */
export function sourceLineFor(move: Move, analyses: GoalAnalysis[]): string | null {
  const a = analyses.find((x) => x.id === move.sourceLineId);
  if (!a) return null;
  return a.paragraph?.trim() || a.line.trim() || null;
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

  if (rate < 0.5 && active.length > 1) {
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

export function applyReplan(plan: Plan, accepted: ReplanChange[], newId: (p: string) => string): Plan {
  let moves = [...plan.moves];
  for (const c of accepted) {
    if (c.target !== 'move') continue;
    if (c.op === 'remove' && c.id) moves = moves.filter((m) => m.id !== c.id);
    if (c.op === 'move' && c.id && c.after) {
      moves = moves.map((m) => (m.id === c.id ? { ...m, scheduledFor: c.after } : m));
    }
    if (c.op === 'add' && c.after && c.sourceLineId) {
      const base = plan.moves[0];
      moves.push({
        id: newId('mv'),
        goalId: plan.goalId,
        milestoneId: base?.milestoneId ?? null,
        title: c.after,
        effort: 'S',
        energy: base?.energy ?? 'low',
        ifThen: base?.ifThen ?? null,
        scheduledFor: null,
        week: 1,
        status: 'todo',
        completedAt: null,
        minVersion: minVersionOf(c.after),
        sourceLineId: c.sourceLineId,
        order: moves.length,
      });
    }
  }
  return { ...plan, version: plan.version + 1, moves };
}

export { addDays, daysBetween };
