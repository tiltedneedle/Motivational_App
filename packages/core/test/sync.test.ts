/**
 * The store's shape as rows, and back.
 *
 * One property matters more than any other here: `fromRows(toRows(x))` is `x`.
 * The account exists so that a lost device loses nothing, and anything the
 * app can write that does not survive the round trip is exactly the thing
 * that will be lost. So the fixture below has every optional field set, and
 * the test compares the whole thing.
 */
import { describe, expect, it } from 'vitest';
import { BOOK_ID, TABLE_ORDER, fromRows, toRows, type SyncBundle } from '../src/engines/sync';
import { DEFAULT_PROFILE } from '../src/types';
import type { BookVersion, Plan } from '../src/types';

const USER = '00000000-0000-4000-8000-000000000001';

const plan: Plan = {
  id: 'p_1',
  goalId: 'g_1',
  version: 2,
  seasonWeeks: 12,
  status: 'active',
  createdAt: '2026-09-10T20:00:00.000Z',
  replannedAt: ['2026-09-14T09:00:00.000Z'],
  milestones: [
    {
      id: 'ms_1',
      planId: 'p_1',
      goalId: 'g_1',
      title: 'First two weeks',
      proof: 'one run in the ledger',
      proofSourceLineId: 'an_mon',
      targetDate: '2026-09-24',
      order: 0,
      reachedAt: null,
    },
  ],
  moves: [
    {
      id: 'mv_1',
      goalId: 'g_1',
      milestoneId: 'ms_1',
      title: 'Tuesday: at 6:40, out the back door',
      effort: 'S',
      energy: 'high',
      ifThen: null,
      scheduledFor: '2026-09-15',
      week: 1,
      status: 'done',
      completedAt: '2026-09-15T06:50:00.000Z',
      minVersion: 'Two minutes of it',
      doingMinVersion: true,
      sourceLineId: 'an_str',
      order: 0,
    },
  ],
  obstaclePlans: [{ id: 'op_1', goalId: 'g_1', obstacle: 'I stay up too late', response: 'phone in the hall', sourceLineId: 'an_obs' }],
};

const book: BookVersion = {
  id: 'book_v1',
  version: 1,
  title: 'the back door',
  titleAuthored: true,
  titleFraming: 'A year of',
  track: 'starter',
  sealedAt: '2026-09-10T21:00:00.000Z',
  firstSentence: 'It is 6:40 and the kitchen is still blue.',
  ideal: 'It is 6:40 and the kitchen is still blue. Sam is still asleep.',
  shadow: 'The alarm goes and I turn it off.',
  chapters: [
    {
      goalId: 'g_1',
      name: '5 km race',
      nameAuthored: false,
      horizon: 'Three months',
      lines: [{ kind: 'obstacles', framingLabel: 'I start and drift', text: 'I stay up too late', text2: 'phone in the hall' }],
      memories: [],
    },
  ],
  iWill: 'I will be out the back door before the kettle boils',
  authorshipRatio: 0.98,
  diff: null,
};

const bundle: SyncBundle = {
  profile: {
    ...DEFAULT_PROFILE,
    displayName: 'Sam',
    persona: 'fierce',
    track: 'full',
    sundayHour: 9,
    reducedMotion: true,
    consentedAt: '2026-09-10T19:00:00.000Z',
    entitled: true,
    supportOfferedAt: '2026-09-11T08:00:00.000Z',
    paywallSeen: ['after-blueprint'],
    mutedMoments: ['evening'],
    notificationsOff: false,
  },
  goals: [
    {
      id: 'g_1',
      title: '5 km race',
      domain: 'health',
      domainLabel: 'Running',
      horizon: 'Three months',
      targetDate: '2026-12-10',
      status: 'active',
      rank: 0,
      sourceSpan: 'I run the towpath',
      titleAuthored: false,
      createdAt: '2026-09-10T19:10:00.000Z',
    },
  ],
  texts: [
    {
      id: 'text_1',
      sessionId: 'sess_1',
      kind: 'ideal',
      body: 'It is 6:40 and the kitchen is still blue. Sam is still asleep.',
      wordCount: 12,
      secondsWriting: 900,
      mode: 'type',
      sealedUntil: '2026-09-11T20:00:00.000Z',
      safetyRisk: 'none',
      createdAt: '2026-09-10T20:00:00.000Z',
    },
    {
      id: 'text_2',
      sessionId: 'sess_1',
      kind: 'shadow',
      body: 'The alarm goes and I turn it off.',
      wordCount: 8,
      secondsWriting: 480,
      mode: 'say',
      sealedUntil: null,
      safetyRisk: 'concern',
      createdAt: '2026-09-10T20:20:00.000Z',
    },
  ],
  analyses: [
    {
      id: 'an_mon',
      goalId: 'g_1',
      kind: 'monitoring',
      track: 'full',
      framingId: null,
      line: 'one run in the ledger',
      specificity: 0.5,
      followupShown: false,
      writtenAt: '2026-09-10T20:25:00.000Z',
      safetyRisk: 'none',
    },
    {
      id: 'an_str',
      goalId: 'g_1',
      kind: 'strategies',
      track: 'full',
      framingId: null,
      line: 'Tuesday, Thursday, Saturday at 6:40, out the back door',
      specificity: 0.7,
      followupShown: false,
      writtenAt: '2026-09-10T20:28:00.000Z',
      safetyRisk: 'none',
    },
    {
      id: 'an_obs',
      goalId: 'g_1',
      kind: 'obstacles',
      track: 'full',
      framingId: 'o-drift',
      line: 'I stay up too late',
      line2: 'phone in the hall',
      paragraph: 'A whole paragraph about it.',
      specificity: 0.6,
      followupShown: true,
      writtenAt: '2026-09-10T20:30:00.000Z',
      safetyRisk: 'none',
    },
  ],
  books: [book],
  plans: [plan],
  evidence: [
    { id: 'ev_1', goalId: 'g_1', moveId: 'mv_1', kind: 'move', text: 'Went anyway.', day: '2026-09-15', safetyRisk: 'none', createdAt: '2026-09-15T06:50:00.000Z' },
    { id: 'ev_2', goalId: 'g_1', practiceId: 'pr_1', kind: 'practice', text: 'Out the door', day: '2026-09-15', safetyRisk: 'none', createdAt: '2026-09-15T06:46:00.000Z' },
  ],
  days: {
    '2026-09-15': {
      day: '2026-09-15',
      planned: 1,
      done: 1,
      skipped: 0,
      partial: 0,
      evidenceCount: 1,
      sealedAt: '2026-09-15T21:00:00.000Z',
      moodWord: 'Proud',
      proof: 'Went anyway.',
      gladOf: 'The cold.',
      intentionMoveId: 'mv_1',
      safetyRisk: 'none',
    },
  },
  practices: [
    {
      id: 'pr_1',
      goalId: 'g_1',
      kind: 'routine',
      title: 'Out the door',
      steps: [{ text: 'shoes', seconds: 60 }],
      minVersion: 'Shoes on',
      schedule: { type: 'days', days: [2, 4, 6] },
      energySlot: 'morning',
      sourceLineId: 'an_str',
      archivedAt: null,
    },
  ],
  practiceLogs: [{ id: 'pl_1', practiceId: 'pr_1', day: '2026-09-15', stepsDone: 1, stepsTotal: 1, minimal: false, completedAt: '2026-09-15T06:45:00.000Z' }],
  scenes: [
    {
      id: 'sc_1',
      goalId: 'g_1',
      type: 'practice',
      imagePrompt: '35mm',
      imageUri: null,
      narrative: 'An ordinary morning.',
      sourcedDetail: 'the kitchen',
      tone: 'warmer',
      createdAt: '2026-09-11T07:00:00.000Z',
    },
  ],
  letters: [
    {
      id: 'letter_1',
      goalId: null,
      direction: 'to_future',
      body: 'By now you will know.',
      quotes: [],
      trigger: 'self:2026-12-10',
      deliverAt: '2026-12-10',
      readAt: null,
    },
  ],
  briefs: [
    {
      id: 'brief_1',
      day: '2026-09-15',
      kind: 'dawn',
      yesterday: 'Quiet day.',
      today: 'Start with the back door.',
      ifThen: 'You wrote: if I stay up too late, then I put the phone in the hall.',
      quotedSpans: ['I stay up too late'],
      firstMoveId: 'mv_1',
      support: null,
      soften: false,
      createdAt: '2026-09-15T07:00:00.000Z',
    },
  ],
  presentPicks: [
    {
      id: 'pp1',
      half: 'faults',
      cardId: 'f-start-and-drift',
      storyLine: 'the week I said I would and did not',
      applyLine: 'put the shoes by the door',
      framingId: 'fs-night-before',
      goalId: 'g1',
      rank: 0,
      safetyRisk: 'none',
      writtenAt: '2026-09-15T20:00:00.000Z',
    },
  ],
  pastEpochs: [
    { id: 'ep1', label: 'School', fromAge: 6, toAge: 12, position: 1, createdAt: '2026-09-15T20:00:00.000Z' },
  ],
  pastEvents: [
    {
      id: 'ev1',
      epochId: 'ep1',
      title: 'the move',
      weight: 'hurt',
      analysed: true,
      whatHappened: 'we moved in the middle of a term',
      shapedMe: 'I make friends slowly and keep them',
      stillBelieve: 'starting again is survivable',
      joinsBook: true,
      safetyRisk: 'none',
      position: 0,
      createdAt: '2026-09-15T20:00:00.000Z',
    },
  ],
};

describe('the store as rows', () => {
  const tables = toRows(bundle, USER, 'Asia/Karachi');

  it('writes tables in an order the foreign keys accept', () => {
    const names = tables.map((t) => t.table);
    expect(names).toEqual([...TABLE_ORDER]);
  });

  it('stamps the user on every row', () => {
    for (const { table, rows } of tables) {
      for (const r of rows) {
        const owner = table === 'profiles' ? r.id : r.user_id;
        expect(owner, table).toBe(USER);
      }
    }
  });

  it('builds a session row for every sitting the texts came from', () => {
    const sessions = tables.find((t) => t.table === 'authoring_sessions')!.rows;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).toBe('sess_1');
  });

  it('keeps one Book above the editions, carrying the spine and its framing', () => {
    const books = tables.find((t) => t.table === 'books')!.rows;
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({ id: BOOK_ID, title: 'the back door', title_framing: 'A year of', current_version: 1 });
    const versions = tables.find((t) => t.table === 'book_versions')!.rows;
    expect(versions[0]!.contents).toBe(book);
    expect(versions[0]!.book_id).toBe(BOOK_ID);
  });

  it('sends a pointer at something the device no longer has as null', () => {
    // A dropped goal leaves its practice archived and its letters pointing
    // at it. Sent as an id the server refuses the row; sent as null it is
    // what the server would have done itself.
    const orphaned = toRows({ ...bundle, goals: [], analyses: [] }, USER, 'UTC');
    const practice = orphaned.find((t) => t.table === 'practices')!.rows[0]!;
    expect(practice.goal_id).toBeNull();
    expect(practice.source_line_id).toBeNull();
    const milestone = orphaned.find((t) => t.table === 'milestones')!.rows[0]!;
    expect(milestone.proof_source_line_id).toBeNull();
  });

  it('names a practice run by its practice, never in the move column', () => {
    const rows = tables.find((t) => t.table === 'evidence')!.rows;
    const run = rows.find((r) => r.kind === 'practice')!;
    expect(run.practice_id).toBe('pr_1');
    expect(run.move_id).toBeNull();
    // An older row that carried the practice id in moveId is read by kind.
    const old = toRows({ ...bundle, evidence: [{ ...bundle.evidence[1]!, practiceId: undefined, moveId: 'pr_1' }] }, USER, 'UTC');
    const row = old.find((t) => t.table === 'evidence')!.rows[0]!;
    expect(row.practice_id).toBe('pr_1');
    expect(row.move_id).toBeNull();
  });

  it('sends an unwritten proof as null, not an empty string the server refuses', () => {
    const unwritten = { ...plan, milestones: [{ ...plan.milestones[0]!, proof: '', proofSourceLineId: null }] };
    const rows = toRows({ ...bundle, plans: [unwritten] }, USER, 'UTC').find((t) => t.table === 'milestones')!.rows;
    expect(rows[0]!.proof).toBeNull();
  });

  it('writes practices before the ledger rows that point at them', () => {
    expect(TABLE_ORDER.indexOf('practices')).toBeLessThan(TABLE_ORDER.indexOf('evidence'));
  });

  it('invents nothing: a value the app does not have is null', () => {
    const goal = tables.find((t) => t.table === 'goals')!.rows[0]!;
    expect(goal.target_date).toBe('2026-12-10');
    const bare = toRows({ ...bundle, goals: [{ ...bundle.goals[0]!, domainLabel: undefined, sourceSpan: undefined }] }, USER, 'UTC');
    const bareGoal = bare.find((t) => t.table === 'goals')!.rows[0]!;
    expect(bareGoal.domain_label).toBeNull();
    expect(bareGoal.source_span).toBeNull();
  });

  it('never sends the entitlement up, and reads it as the server spells it', () => {
    const profile = tables.find((t) => t.table === 'profiles')!.rows[0]!;
    expect('entitlement' in profile).toBe(false);
    expect(profile.timezone).toBe('Asia/Karachi');
    expect(fromRows({ profiles: [{ id: USER, entitlement: 'pro' }] }, DEFAULT_PROFILE).profile.entitled).toBe(true);
    expect(fromRows({ profiles: [{ id: USER, entitlement: 'free' }] }, DEFAULT_PROFILE).profile.entitled).toBe(false);
  });
});

describe('and back', () => {
  const tables = toRows(bundle, USER, 'Asia/Karachi');
  const asMap = Object.fromEntries(tables.map((t) => [t.table, t.rows])) as Parameters<typeof fromRows>[0];
  const back = fromRows(asMap, DEFAULT_PROFILE);

  it('is the same store, field for field', () => {
    // Except the entitlement, which the device does not get to say.
    expect(back).toEqual({ ...bundle, profile: { ...bundle.profile, entitled: false } });
  });

  it('survives a second trip unchanged', () => {
    const again = toRows(back, USER, 'Asia/Karachi');
    expect(again).toEqual(tables);
  });

  it('does not crash on rows from a version of the app that had fewer fields', () => {
    const sparse = {
      profiles: [{ id: USER }],
      goals: [{ id: 'g_1', title: 'x', domain: 'health', horizon: 'No deadline', rank: 0 }],
      book_versions: [{ id: 'b', version: 1, contents: {} }],
      plans: [{ id: 'p', goal_id: 'g_1' }],
      moves: [{ id: 'm', plan_id: 'p', goal_id: 'g_1', title: 'x', source_line_id: 'an' }],
    } as Parameters<typeof fromRows>[0];
    const out = fromRows(sparse, DEFAULT_PROFILE);
    expect(out.profile).toEqual(DEFAULT_PROFILE);
    expect(out.goals[0]!.status).toBe('named');
    expect(out.books[0]!.chapters).toEqual([]);
    expect(out.plans[0]!.moves[0]!.status).toBe('todo');
    expect(out.plans[0]!.milestones).toEqual([]);
  });

  it('starts from the defaults when there is no profile row at all', () => {
    expect(fromRows({}, DEFAULT_PROFILE).profile).toEqual(DEFAULT_PROFILE);
    expect(fromRows({}, DEFAULT_PROFILE).goals).toEqual([]);
  });
});

describe('the Past and Present volumes on the wire', () => {
  it('round-trips a pick, a period and an event without losing a field', () => {
    const tables = toRows(bundle, USER, 'UTC');
    const byTable = Object.fromEntries(tables.map((t) => [t.table, t.rows]));
    // The tables exist, carry the owner, and are written after the goals they
    // point at — a pick may name a goal.
    expect(byTable.present_picks).toHaveLength(1);
    expect(byTable.past_epochs).toHaveLength(1);
    expect(byTable.past_events).toHaveLength(1);
    expect(tables.findIndex((t) => t.table === 'present_picks')).toBeGreaterThan(tables.findIndex((t) => t.table === 'goals'));
    expect(tables.findIndex((t) => t.table === 'past_events')).toBeGreaterThan(tables.findIndex((t) => t.table === 'past_epochs'));
    for (const table of ['present_picks', 'past_epochs', 'past_events']) {
      for (const row of byTable[table]!) expect(row.user_id).toBe(USER);
    }

    const back = fromRows(
      Object.fromEntries(tables.map((t) => [t.table, t.rows])) as Parameters<typeof fromRows>[0],
      bundle.profile,
    );
    expect(back.presentPicks).toEqual(bundle.presentPicks);
    expect(back.pastEpochs).toEqual(bundle.pastEpochs);
    expect(back.pastEvents).toEqual(bundle.pastEvents);
  });

  it('brings a row back with nothing in the Book unless the person put it there', () => {
    const back = fromRows({ past_events: [{ id: 'e', epoch_id: 'ep', title: 't', weight: 'helped', created_at: 'x' }] }, bundle.profile);
    expect(back.pastEvents[0]!.joinsBook).toBe(false);
    expect(back.pastEvents[0]!.analysed).toBe(false);
    expect(back.pastEvents[0]!.safetyRisk).toBe('none');
  });
});
