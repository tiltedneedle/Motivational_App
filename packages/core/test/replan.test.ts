/**
 * The replan (PRD §7.4): the one moment a plan changes after the Book is
 * sealed, and until now the only part of the Blueprint with no tests at all.
 *
 * The gate was added and the tests it named were not, which is a worse state
 * than either alone: a guard nobody has watched fail is a guard nobody knows
 * works.
 */
import { describe, expect, it } from 'vitest';
import {
  BlueprintInvalid,
  applyReplan,
  buildPlan,
  proposeReplan,
  validatePlan,
  type GoalAnalysis,
  type Goal,
} from '../src/index';
import { sequentialIds } from '../src/ids';

const TODAY = '2026-09-10';

const analyses: GoalAnalysis[] = [
  {
    id: 'a_str', goalId: 'g1', kind: 'strategies', track: 'starter', framingId: null,
    line: 'Tuesday, Thursday, Saturday at 6:40, out the back door',
    specificity: 0.9, followupShown: false, writtenAt: TODAY,
  } as GoalAnalysis,
  {
    id: 'a_obs', goalId: 'g1', kind: 'obstacles', track: 'starter', framingId: null,
    line: 'I stay up too late', line2: 'put the phone in the hall',
    specificity: 0.5, followupShown: false, writtenAt: TODAY,
  } as GoalAnalysis,
];

const goal = {
  id: 'g1', title: 'Half marathon', domain: 'health', horizon: 'this season',
  targetDate: null, status: 'active', rank: 0, createdAt: TODAY,
} as unknown as Goal;

const plan = () => buildPlan({ goal, analyses }, { today: TODAY, newId: sequentialIds() });

describe('proposing a replan', () => {
  it('offers to drop one when the week went badly, never to add', () => {
    const p = plan();
    const changes = proposeReplan(p, { done: 1, planned: 5, newId: sequentialIds(), today: TODAY });
    expect(changes.some((c) => c.op === 'remove')).toBe(true);
    expect(changes.some((c) => c.op === 'add')).toBe(false);
    // Every proposal carries the line it came from, like everything else here.
    for (const c of changes) expect(c.sourceLineId).toBeTruthy();
  });

  it('offers room for one more when the week went well', () => {
    const p = plan();
    const changes = proposeReplan(p, { done: 5, planned: 5, newId: sequentialIds(), today: TODAY });
    expect(changes.some((c) => c.op === 'add')).toBe(true);
  });

  it('offers to move a date that has already passed', () => {
    const p = plan();
    const stale = { ...p, moves: p.moves.map((m) => ({ ...m, scheduledFor: '2026-09-01' })) };
    const changes = proposeReplan(stale, { done: 3, planned: 4, newId: sequentialIds(), today: TODAY });
    expect(changes.some((c) => c.op === 'move')).toBe(true);
  });
});

describe('applying a replan', () => {
  it('puts the result through the gate', () => {
    // The whole reason the gate was added: an accepted change that claims a
    // line the person never wrote must not be stored.
    const p = plan();
    expect(() =>
      applyReplan(
        p,
        [{ op: 'add', target: 'move', id: null, before: null, after: 'Something invented', reason: 'x', sourceLineId: 'not_a_line' }],
        sequentialIds(),
        analyses,
        TODAY,
      ),
    ).toThrow(BlueprintInvalid);
  });

  it('accepts a change that does carry a real line', () => {
    const p = plan();
    const next = applyReplan(
      p,
      [{ op: 'add', target: 'move', id: null, before: null, after: 'One more of the same', reason: 'x', sourceLineId: 'a_str' }],
      sequentialIds(),
      analyses,
      TODAY,
    );
    expect(next.moves.length).toBe(p.moves.length + 1);
    expect(next.version).toBe(p.version + 1);
    expect(validatePlan(next, analyses, TODAY, { asNewPlan: false })).toEqual([]);
  });

  it('dates an added move rather than leaving it nowhere', () => {
    // An undated move never surfaces on Today, so "room for one more" would
    // have quietly gone nowhere at all.
    const p = plan();
    const next = applyReplan(
      p,
      [{ op: 'add', target: 'move', id: null, before: null, after: 'One more', reason: 'x', sourceLineId: 'a_str' }],
      sequentialIds(),
      analyses,
      TODAY,
    );
    const added = next.moves[next.moves.length - 1];
    expect(added?.scheduledFor).toBeTruthy();
    expect(added?.scheduledFor! > TODAY).toBe(true);
  });

  it('does not pile a fourth move into week one', () => {
    const p = plan();
    let next = p;
    for (let i = 0; i < 3; i++) {
      next = applyReplan(
        next,
        [{ op: 'add', target: 'move', id: null, before: null, after: `Extra ${i}`, reason: 'x', sourceLineId: 'a_str' }],
        sequentialIds(),
        analyses,
        TODAY,
      );
    }
    const weekOne = next.moves.filter((m) => m.week === 1);
    expect(weekOne.length).toBeLessThanOrEqual(3);
  });

  it('removes what the person accepted removing', () => {
    const p = plan();
    const victim = p.moves[p.moves.length - 1]!;
    const next = applyReplan(
      p,
      [{ op: 'remove', target: 'move', id: victim.id, before: victim.title, after: null, reason: 'x', sourceLineId: victim.sourceLineId }],
      sequentialIds(),
      analyses,
      TODAY,
    );
    expect(next.moves.find((m) => m.id === victim.id)).toBeUndefined();
  });

  it('refuses to move a date into the past', () => {
    const p = plan();
    const first = p.moves[0]!;
    expect(() =>
      applyReplan(
        p,
        [{ op: 'move', target: 'move', id: first.id, before: first.scheduledFor, after: '2026-01-01', reason: 'x', sourceLineId: first.sourceLineId }],
        sequentialIds(),
        analyses,
        TODAY,
      ),
    ).toThrow(BlueprintInvalid);
  });

  it('changes nothing when nothing was accepted', () => {
    const p = plan();
    const next = applyReplan(p, [], sequentialIds(), analyses, TODAY);
    expect(next.moves).toEqual(p.moves);
  });
});
