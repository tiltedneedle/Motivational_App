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
import { bookIdFor, TABLE_ORDER, fromRows, toRows, type SyncBundle } from '../src/engines/sync';
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
  portraits: [
    {
      goalId: 'g_1',
      title: 'Run the loop',
      why: 'Because I said I would.',
      identityLine: 'somebody who starts before deciding',
      identityFraming: null,
      identityLineEdited: true,
      obstacle: 'I stay up too late',
      ifThen: 'If I stay up too late, then I put the phone in the hall',
      firstMoves: ['out the back door'],
      letterFromFuture: 'I have been reading it.',
      quotedSpans: ['Because I said I would.'],
    },
  ],
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
  pastListed: true,
  memoryEdits: [],
  memoryDocument: '',
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
    expect(books[0]).toMatchObject({ id: bookIdFor(USER), title: 'the back door', title_framing: 'A year of', current_version: 1 });
    const versions = tables.find((t) => t.table === 'book_versions')!.rows;
    expect(versions[0]!.contents).toBe(book);
    expect(versions[0]!.book_id).toBe(bookIdFor(USER));
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
    // The walk's end travels too, or a new phone reopens a finished Past.
    expect(byTable.profiles![0]!.past_listed).toBe(true);
    expect(back.pastListed).toBe(true);
  });

  it('carries the witness and the Declaration, and reads their absence as none', () => {
    const declared = { ...bundle, profile: { ...bundle.profile, witnessName: 'Sam', declaredAt: '2026-09-16T20:00:00.000Z' } };
    const tables = toRows(declared, USER, 'UTC');
    const byTable = Object.fromEntries(tables.map((t) => [t.table, t.rows]));
    expect(byTable.profiles![0]!.witness_name).toBe('Sam');
    const back = fromRows(byTable as Parameters<typeof fromRows>[0], bundle.profile);
    expect(back.profile.witnessName).toBe('Sam');
    expect(back.profile.declaredAt).toBe('2026-09-16T20:00:00.000Z');
    // A profile row from before 0007 has neither column.
    const older = { ...byTable, profiles: [Object.fromEntries(Object.entries(byTable.profiles![0]!).filter(([k]) => k !== 'witness_name' && k !== 'declared_at'))] };
    const fromOlder = fromRows(older as Parameters<typeof fromRows>[0], bundle.profile);
    expect(fromOlder.profile.witnessName).toBe('');
    expect(fromOlder.profile.declaredAt).toBeNull();
  });

  it('carries the shift calendar, and reads its absence as every day the same', () => {
    const shifted = { ...bundle, profile: { ...bundle.profile, shiftDays: [2, 3], shiftWakeTime: '13:00', shiftEveningTime: '02:00' } };
    const tables = toRows(shifted, USER, 'UTC');
    const byTable = Object.fromEntries(tables.map((t) => [t.table, t.rows]));
    expect(byTable.profiles![0]!.shift_days).toEqual([2, 3]);
    expect(byTable.profiles![0]!.shift_wake_time).toBe('13:00');
    const back = fromRows(byTable as Parameters<typeof fromRows>[0], bundle.profile);
    expect(back.profile.shiftDays).toEqual([2, 3]);
    expect(back.profile.shiftEveningTime).toBe('02:00');
    const older = { ...byTable, profiles: [Object.fromEntries(Object.entries(byTable.profiles![0]!).filter(([k]) => !k.startsWith('shift_')))] };
    const fromOlder = fromRows(older as Parameters<typeof fromRows>[0], bundle.profile);
    expect(fromOlder.profile.shiftDays).toEqual([]);
    // A row with rubbish in the column keeps only real weekdays.
    const odd = { ...byTable, profiles: [{ ...byTable.profiles![0]!, shift_days: [1, 9, 'x', 6] }] };
    expect(fromRows(odd as Parameters<typeof fromRows>[0], bundle.profile).profile.shiftDays).toEqual([1, 6]);
  });

  it('carries a goal let go with the line it taught, and reads a goal from before 0008 as still in play', () => {
    const g0 = bundle.goals[0]!;
    const letGo = {
      ...bundle,
      goals: [
        { ...g0, status: 'archived' as const, lesson: 'It was never the guitar I wanted; it was the evenings.', letGoAt: '2026-12-15T09:00:00.000Z', lessonRisk: 'none' as const },
        { ...g0, id: 'goal-still', title: 'Row on the river', rank: 1 },
      ],
    };
    const tables = toRows(letGo, USER, 'UTC');
    const byTable = Object.fromEntries(tables.map((t) => [t.table, t.rows]));
    const row = byTable.goals![0]!;
    expect(row.status).toBe('archived');
    expect(row.lesson).toContain('the evenings');
    expect(row.let_go_at).toBe('2026-12-15T09:00:00.000Z');
    // A goal still in play carries nulls, never an empty string.
    expect(byTable.goals![1]!.lesson).toBeNull();
    expect(byTable.goals![1]!.let_go_at).toBeNull();
    const back = fromRows(byTable as Parameters<typeof fromRows>[0], bundle.profile);
    expect(back.goals[0]!.status).toBe('archived');
    expect(back.goals[0]!.lesson).toContain('the evenings');
    expect(back.goals[0]!.letGoAt).toBe('2026-12-15T09:00:00.000Z');
    expect(row.lesson_risk).toBe('none');
    expect(back.goals[0]!.lessonRisk).toBe('none');
    expect(byTable.goals![1]!.lesson_risk).toBeNull();
    expect(back.goals[1]!.lesson).toBeUndefined();
    // A goals row from before 0008 has neither column.
    const older = { ...byTable, goals: byTable.goals!.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'lesson' && k !== 'let_go_at'))) };
    const fromOlder = fromRows(older as Parameters<typeof fromRows>[0], bundle.profile);
    expect(fromOlder.goals[1]!.lesson).toBeUndefined();
    expect(fromOlder.goals[1]!.letGoAt).toBeUndefined();
  });

  it('carries the memory profile’s edits and document, and reads their absence as none', () => {
    const withMemory = {
      ...bundle,
      memoryEdits: [
        { key: 'you.name', text: 'Call me S.', editedAt: '2026-09-17T09:00:00.000Z' },
        { key: 'line.a2', text: null, editedAt: '2026-09-17T09:01:00.000Z' },
      ],
      memoryDocument: '- You asked to be called “S.”',
    };
    const tables = toRows(withMemory, USER, 'UTC');
    const byTable = Object.fromEntries(tables.map((t) => [t.table, t.rows]));
    expect(byTable.memory_profiles).toHaveLength(1);
    expect(byTable.memory_profiles![0]!.user_id).toBe(USER);
    expect(byTable.memory_profiles![0]!.document).toContain('asked to be called');
    const back = fromRows(byTable as Parameters<typeof fromRows>[0], bundle.profile);
    expect(back.memoryEdits).toEqual(withMemory.memoryEdits);
    expect(back.memoryDocument).toBe(withMemory.memoryDocument);
    // No row at all, from before 0009: nothing changed, nothing forgotten.
    const older = { ...byTable, memory_profiles: [] };
    const fromOlder = fromRows(older as Parameters<typeof fromRows>[0], bundle.profile);
    expect(fromOlder.memoryEdits).toEqual([]);
    expect(fromOlder.memoryDocument).toBe('');
    // A malformed edit on the row is dropped, not crashed on.
    const odd = { ...byTable, memory_profiles: [{ ...byTable.memory_profiles![0]!, edits: [{ key: 'x' }, withMemory.memoryEdits[0]] }] };
    expect(fromRows(odd as Parameters<typeof fromRows>[0], bundle.profile).memoryEdits).toEqual([withMemory.memoryEdits[0]]);
  });

  it('brings the periods back in their order, whatever order the rows arrive in', () => {
    const at = '2026-09-15T20:00:00.000Z';
    const epochs = [
      { id: 'ep-teens', label: 'The teenage years', fromAge: 13, toAge: 18, position: 2, createdAt: at },
      { id: 'ep-19-40', label: '19 to now', fromAge: 19, toAge: 40, position: 3, createdAt: at },
      { id: 'ep-early', label: 'Before school', fromAge: 0, toAge: 5, position: 0, createdAt: at },
      { id: 'ep-school', label: 'School', fromAge: 6, toAge: 12, position: 1, createdAt: at },
    ];
    const tables = toRows({ ...bundle, pastEpochs: epochs, pastEvents: [] }, USER, 'UTC');
    const byTable = Object.fromEntries(tables.map((t) => [t.table, t.rows]));
    // As the account returns them: by id, digits before letters.
    byTable.past_epochs = [...byTable.past_epochs!].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const back = fromRows(byTable as Parameters<typeof fromRows>[0], bundle.profile);
    expect(back.pastEpochs.map((e) => e.id)).toEqual(['ep-early', 'ep-school', 'ep-teens', 'ep-19-40']);
  });

  it('brings a row back with nothing in the Book unless the person put it there', () => {
    const back = fromRows({ past_events: [{ id: 'e', epoch_id: 'ep', title: 't', weight: 'helped', created_at: 'x' }] }, bundle.profile);
    expect(back.pastEvents[0]!.joinsBook).toBe(false);
    expect(back.pastEvents[0]!.analysed).toBe(false);
    expect(back.pastEvents[0]!.safetyRisk).toBe('none');
  });
});

describe('the portraits', () => {
  it('travel as their document and come back whole, with the line the person wrote', () => {
    const rows = toRows(bundle, USER, 'Europe/London');
    const table = rows.find((t) => t.table === 'portraits')!;
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]!.goal_id).toBe('g_1');
    const back = fromRows(Object.fromEntries(rows.map((t) => [t.table, t.rows])), bundle.profile);
    expect(back.portraits[0]?.identityLine).toBe('somebody who starts before deciding');
    expect(back.portraits[0]?.identityLineEdited).toBe(true);
  });

  it('leaves out a portrait whose goal is not in the copy', () => {
    const rows = toRows({ ...bundle, portraits: [{ ...bundle.portraits[0]!, goalId: 'g_gone' }] }, USER, 'Europe/London');
    expect(rows.find((t) => t.table === 'portraits')!.rows).toHaveLength(0);
  });
});
