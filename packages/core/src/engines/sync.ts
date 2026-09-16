/**
 * The store's shape as rows, and back (PRD §10.3, §7.12).
 *
 * The app is local-first: every write lands on the device and the account is
 * a later layer that reads the same shape. This is that layer's only real
 * job — turning what the store holds into the rows the migration declares, in
 * an order the foreign keys accept, and turning rows back into the store's
 * shape on a new device. Nothing here decides *what* to sync or when; a pure
 * mapping is the part worth testing, and the part that goes wrong quietly.
 *
 * Two rules keep it honest:
 *
 *   - lossless. `fromRows(toRows(x))` is `x`. Anything the app can write must
 *     survive a round trip through the server, or a lost device loses it — and
 *     the whole point of the account is that a lost device loses nothing;
 *   - nothing invented. A column the app has no value for is null, never a
 *     guess. The server's own constraints are the place for defaults.
 */
import type {
  AuthoringText,
  BookVersion,
  Brief,
  DaySummary,
  Evidence,
  Goal,
  GoalAnalysis,
  Letter,
  Plan,
  Practice,
  Profile,
  Scene,
  PresentPickRow,
  PastEpochRow,
  PastEventRow,
} from '../types';
import type { PracticeLog } from './practices';

/** Everything the store persists that belongs to the person's account. */
export interface SyncBundle {
  profile: Profile;
  goals: Goal[];
  texts: AuthoringText[];
  analyses: GoalAnalysis[];
  books: BookVersion[];
  plans: Plan[];
  evidence: Evidence[];
  days: Record<string, DaySummary>;
  practices: Practice[];
  practiceLogs: PracticeLog[];
  scenes: Scene[];
  letters: Letter[];
  briefs: Brief[];
  presentPicks: PresentPickRow[];
  pastEpochs: PastEpochRow[];
  pastEvents: PastEventRow[];
  /**
   * Whether the Past volume's periods have been walked to the end. One fact
   * per person, so it rides on the profile row. Without it a restore reopened
   * a finished Past on the walk and the chooser called it "Picked up".
   */
  pastListed: boolean;
}

export type Row = Record<string, unknown>;

export interface TableRows {
  table: string;
  rows: Row[];
}

/**
 * The order tables must be written in, so every foreign key already has
 * something to point at. Reversed for deletion.
 */
export const TABLE_ORDER = [
  'profiles',
  'goals',
  'authoring_sessions',
  'authoring_texts',
  'goal_analyses',
  'books',
  'book_versions',
  'plans',
  'milestones',
  'moves',
  'obstacle_plans',
  'practices',
  'practice_logs',
  'evidence',
  'day_summaries',
  'scenes',
  'letters',
  'briefs',
  'present_picks',
  'past_epochs',
  'past_events',
] as const;

/** One person has one Book with many editions; the row above the editions. */
export const BOOK_ID = 'book_main';

const orNull = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

/**
 * The store's shape as rows.
 *
 * `userId` is stamped on every row because row level security keys on it and
 * the ownership triggers compare it. `timezone` is a fact about the device the
 * profile row carries and the store does not, so it is passed in rather than
 * read from a global — this function has no globals.
 */
export function toRows(bundle: SyncBundle, userId: string, timezone: string): TableRows[] {
  const p = bundle.profile;
  // What is actually in the bundle, so a pointer at something that is not —
  // a dropped goal's practice, an undone move's ledger row, a replaced plan's
  // milestone — is sent as null, which is what the server would have done to
  // it itself (`on delete set null`). Sent as an id, the ownership trigger
  // refused the row for pointing at nothing and the whole push stopped.
  const goalIds = new Set(bundle.goals.map((g) => g.id));
  const lineIds = new Set(bundle.analyses.map((a) => a.id));
  const moveIds = new Set(bundle.plans.flatMap((pl) => pl.moves.map((m) => m.id)));
  const milestoneIds = new Set(bundle.plans.flatMap((pl) => pl.milestones.map((m) => m.id)));
  const practiceIds = new Set(bundle.practices.map((pr) => pr.id));
  const goalOrNull = (id: string | null | undefined) => (id && goalIds.has(id) ? id : null);
  const lineOrNull = (id: string | null | undefined) => (id && lineIds.has(id) ? id : null);
  const moveOrNull = (id: string | null | undefined) => (id && moveIds.has(id) ? id : null);
  const books = [...bundle.books].sort((a, b) => a.version - b.version);
  const first = books[0];
  const latest = books[books.length - 1];

  const out: TableRows[] = [
    {
      table: 'profiles',
      rows: [
        {
          id: userId,
          display_name: p.displayName,
          persona: p.persona,
          track: p.track,
          past_listed: bundle.pastListed,
          witness_name: p.witnessName,
          declared_at: p.declaredAt,
          wake_time: p.wakeTime,
          evening_time: p.eveningTime,
          day_boundary_hour: p.dayBoundaryHour,
          sunday_hour: p.sundayHour,
          timezone,
          sound_on: p.soundOn,
          haptics_on: p.hapticsOn,
          reduced_motion: p.reducedMotion,
          appearance: p.appearance ?? 'system',
          // A push from a signed-in device is a person still here: a soft
          // delete inside its week is undone by it.
          deleted_at: null,
          consented_at: p.consentedAt,
          // Not sent. The entitlement is the billing webhook's column, and the
          // server refuses a user session that tries to change it — a push
          // that carried the device's idea of it would fail on every profile
          // whose two sides disagreed. It is read on the way back down.
          support_offered_at: p.supportOfferedAt ?? null,
          paywall_seen: p.paywallSeen ?? [],
          muted_moments: p.mutedMoments ?? [],
          notifications_off: p.notificationsOff ?? false,
        },
      ],
    },
    {
      table: 'goals',
      rows: bundle.goals.map((g) => ({
        id: g.id,
        user_id: userId,
        title: g.title,
        title_authored: g.titleAuthored !== false,
        domain: g.domain,
        domain_label: orNull(g.domainLabel),
        horizon: g.horizon,
        target_date: g.targetDate,
        status: g.status,
        rank: g.rank,
        source_span: orNull(g.sourceSpan),
        created_at: g.createdAt,
      })),
    },
    {
      // The store keeps no session objects; every text carries the id of the
      // sitting it came from. One row per distinct sitting, built from the
      // texts, so the foreign key on authoring_texts has something to hold.
      table: 'authoring_sessions',
      rows: uniqueBy(bundle.texts, (t) => t.sessionId).map((t) => ({
        id: t.sessionId,
        user_id: userId,
        volume: 'future',
        track: p.track,
        sitting: 1,
        mode: t.mode,
        seconds_writing: t.secondsWriting,
        idle_nudges: 0,
        started_at: t.createdAt,
        completed_at: t.createdAt,
      })),
    },
    {
      table: 'authoring_texts',
      rows: bundle.texts.map((t) => ({
        id: t.id,
        user_id: userId,
        session_id: t.sessionId,
        kind: t.kind,
        body: t.body,
        word_count: t.wordCount,
        seconds_writing: t.secondsWriting,
        mode: t.mode,
        sealed_until: t.sealedUntil,
        safety_risk: t.safetyRisk,
        created_at: t.createdAt,
      })),
    },
    {
      table: 'goal_analyses',
      rows: bundle.analyses.map((a) => ({
        id: a.id,
        user_id: userId,
        goal_id: a.goalId,
        kind: a.kind,
        track: a.track,
        framing_id: a.framingId,
        line: a.line,
        line2: orNull(a.line2),
        paragraph: orNull(a.paragraph),
        specificity: a.specificity,
        followup_shown: a.followupShown,
        written_at: a.writtenAt,
        safety_risk: a.safetyRisk ?? 'none',
      })),
    },
    {
      table: 'books',
      rows: latest
        ? [
            {
              id: BOOK_ID,
              user_id: userId,
              title: latest.title,
              title_framing: latest.titleFraming ?? null,
              current_version: latest.version,
              first_sealed_at: first?.sealedAt ?? latest.sealedAt,
            },
          ]
        : [],
    },
    {
      table: 'book_versions',
      rows: books.map((b) => ({
        id: b.id,
        user_id: userId,
        book_id: BOOK_ID,
        version: b.version,
        track: b.track,
        sealed_at: b.sealedAt,
        first_sentence: b.firstSentence,
        i_will: b.iWill,
        // The whole edition, so a pull can rebuild it without a second guess.
        // The server recomputes the ratio from this same object.
        contents: b,
        diff: b.diff,
        authorship_ratio: b.authorshipRatio,
      })),
    },
    {
      table: 'plans',
      rows: bundle.plans.map((pl) => ({
        id: pl.id,
        user_id: userId,
        goal_id: pl.goalId,
        version: pl.version,
        season_weeks: pl.seasonWeeks,
        status: pl.status,
        created_at: pl.createdAt,
        replanned_at: pl.replannedAt ?? [],
      })),
    },
    {
      table: 'milestones',
      rows: bundle.plans.flatMap((pl) =>
        pl.milestones.map((m) => ({
          id: m.id,
          user_id: userId,
          plan_id: pl.id,
          goal_id: m.goalId,
          title: m.title,
          // Empty until the person writes how they will know; the column is
          // nullable for exactly that, and an empty string is not a proof.
          proof: m.proof.trim() ? m.proof : null,
          proof_source_line_id: lineOrNull(m.proofSourceLineId),
          target_date: m.targetDate,
          order: m.order,
          reached_at: m.reachedAt,
        })),
      ),
    },
    {
      table: 'moves',
      rows: bundle.plans.flatMap((pl) =>
        pl.moves.map((m) => ({
          id: m.id,
          user_id: userId,
          goal_id: m.goalId,
          plan_id: pl.id,
          milestone_id: m.milestoneId && milestoneIds.has(m.milestoneId) ? m.milestoneId : null,
          title: m.title,
          effort: m.effort,
          energy: m.energy,
          if_then: m.ifThen,
          scheduled_for: m.scheduledFor,
          week: m.week,
          status: m.status,
          completed_at: m.completedAt,
          min_version: m.minVersion,
          doing_min_version: m.doingMinVersion ?? false,
          source_line_id: m.sourceLineId,
          order: m.order,
        })),
      ),
    },
    {
      table: 'obstacle_plans',
      rows: bundle.plans.flatMap((pl) =>
        pl.obstaclePlans.map((o) => ({
          id: o.id,
          user_id: userId,
          goal_id: o.goalId,
          obstacle: o.obstacle,
          response: o.response,
          source_line_id: o.sourceLineId,
        })),
      ),
    },
    {
      table: 'evidence',
      rows: bundle.evidence.map((e) => ({
        id: e.id,
        user_id: userId,
        goal_id: goalOrNull(e.goalId),
        // Only a move's row names a move. Older rows carried the practice's
        // id in this column; those are practice rows and go by kind.
        move_id: e.kind === 'move' ? moveOrNull(e.moveId) : null,
        practice_id: e.kind === 'practice' ? ((e.practiceId ?? e.moveId) && practiceIds.has((e.practiceId ?? e.moveId) as string) ? (e.practiceId ?? e.moveId) : null) : null,
        kind: e.kind,
        text: e.text,
        day: e.day,
        safety_risk: e.safetyRisk ?? 'none',
        created_at: e.createdAt,
      })),
    },
    {
      table: 'day_summaries',
      rows: Object.values(bundle.days).map((d) => ({
        user_id: userId,
        day: d.day,
        planned: d.planned,
        done: d.done,
        skipped: d.skipped,
        partial: d.partial,
        evidence_count: d.evidenceCount,
        sealed_at: d.sealedAt,
        mood_word: d.moodWord,
        proof: d.proof,
        glad_of: d.gladOf,
        intention_move_id: moveOrNull(d.intentionMoveId),
        safety_risk: d.safetyRisk ?? 'none',
      })),
    },
    {
      table: 'practices',
      rows: bundle.practices.map((pr) => ({
        id: pr.id,
        user_id: userId,
        goal_id: goalOrNull(pr.goalId),
        kind: pr.kind,
        title: pr.title,
        steps: pr.steps,
        min_version: pr.minVersion,
        schedule: pr.schedule,
        energy_slot: pr.energySlot,
        source_line_id: lineOrNull(pr.sourceLineId),
        archived_at: pr.archivedAt,
      })),
    },
    {
      table: 'practice_logs',
      rows: bundle.practiceLogs.map((l) => ({
        id: l.id,
        user_id: userId,
        practice_id: l.practiceId,
        day: l.day,
        steps_done: l.stepsDone,
        steps_total: l.stepsTotal,
        minimal: l.minimal,
        completed_at: l.completedAt,
      })),
    },
    {
      table: 'present_picks',
      rows: bundle.presentPicks.map((p) => ({
        id: p.id,
        user_id: userId,
        half: p.half,
        card_id: p.cardId,
        story_line: p.storyLine,
        apply_line: p.applyLine,
        framing_id: p.framingId,
        goal_id: p.goalId,
        rank: p.rank,
        safety_risk: p.safetyRisk,
        written_at: p.writtenAt,
      })),
    },
    {
      table: 'past_epochs',
      rows: bundle.pastEpochs.map((e) => ({
        id: e.id,
        user_id: userId,
        label: e.label,
        from_age: e.fromAge,
        to_age: e.toAge,
        position: e.position,
        created_at: e.createdAt,
      })),
    },
    {
      table: 'past_events',
      rows: bundle.pastEvents.map((e) => ({
        id: e.id,
        user_id: userId,
        epoch_id: e.epochId,
        title: e.title,
        weight: e.weight,
        analysed: e.analysed,
        what_happened: e.whatHappened,
        shaped_me: e.shapedMe,
        still_believe: e.stillBelieve,
        joins_book: e.joinsBook,
        safety_risk: e.safetyRisk,
        position: e.position,
        created_at: e.createdAt,
      })),
    },
    {
      table: 'scenes',
      rows: bundle.scenes.map((sc) => ({
        id: sc.id,
        user_id: userId,
        goal_id: sc.goalId,
        type: sc.type,
        image_prompt: sc.imagePrompt,
        image_uri: sc.imageUri,
        narrative: sc.narrative,
        sourced_detail: sc.sourcedDetail,
        tone: sc.tone,
        created_at: sc.createdAt,
      })),
    },
    {
      table: 'letters',
      rows: bundle.letters.map((l) => ({
        id: l.id,
        user_id: userId,
        goal_id: goalOrNull(l.goalId),
        direction: l.direction,
        body: l.body,
        quotes: l.quotes,
        trigger: l.trigger,
        deliver_at: l.deliverAt,
        read_at: l.readAt,
      })),
    },
    {
      table: 'briefs',
      rows: bundle.briefs.map((b) => ({
        id: b.id,
        user_id: userId,
        day: b.day,
        kind: b.kind,
        yesterday: b.yesterday,
        today: b.today,
        if_then: b.ifThen,
        quoted_spans: b.quotedSpans,
        first_move_id: moveOrNull(b.firstMoveId),
        support: b.support ?? null,
        soften: b.soften ?? false,
        created_at: b.createdAt,
      })),
    },
  ];

  const order = new Map(TABLE_ORDER.map((t, i) => [t, i]));
  return out.sort((a, b) => (order.get(a.table as never) ?? 99) - (order.get(b.table as never) ?? 99));
}

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Rows back into the store's shape.
 *
 * Defensive on every field, because a row that arrives from the server was
 * written by some version of this app and read by this one, and the two need
 * not agree. A missing column is the zero value, never a crash on the screen
 * that shows the Book.
 */
export function fromRows(tables: Partial<Record<(typeof TABLE_ORDER)[number], Row[]>>, defaults: Profile): SyncBundle {
  const t = (name: (typeof TABLE_ORDER)[number]): Row[] => tables[name] ?? [];
  const pr = t('profiles')[0];

  const profile: Profile = pr
    ? {
        ...defaults,
        displayName: str(pr.display_name),
        persona: (pr.persona as Profile['persona']) ?? defaults.persona,
        track: (pr.track as Profile['track']) ?? defaults.track,
        wakeTime: str(pr.wake_time) || defaults.wakeTime,
        eveningTime: str(pr.evening_time) || defaults.eveningTime,
        dayBoundaryHour: num(pr.day_boundary_hour, defaults.dayBoundaryHour),
        sundayHour: num(pr.sunday_hour, defaults.sundayHour),
        soundOn: bool(pr.sound_on, defaults.soundOn),
        hapticsOn: bool(pr.haptics_on, defaults.hapticsOn),
        witnessName: str(pr.witness_name),
        declaredAt: typeof pr.declared_at === 'string' ? pr.declared_at : null,
        reducedMotion: bool(pr.reduced_motion, defaults.reducedMotion),
        appearance: (['system', 'light', 'dark'] as const).find((a) => a === pr.appearance) ?? defaults.appearance,
        consentedAt: strOrNull(pr.consented_at),
        entitled: pr.entitlement === 'pro',
        supportOfferedAt: strOrNull(pr.support_offered_at),
        paywallSeen: arr<string>(pr.paywall_seen),
        mutedMoments: arr<string>(pr.muted_moments),
        notificationsOff: bool(pr.notifications_off),
      }
    : defaults;

  const goals: Goal[] = t('goals').map((r) => ({
    id: str(r.id),
    title: str(r.title),
    domain: r.domain as Goal['domain'],
    ...(strOrNull(r.domain_label) ? { domainLabel: str(r.domain_label) } : {}),
    horizon: str(r.horizon),
    targetDate: strOrNull(r.target_date),
    status: (r.status as Goal['status']) ?? 'named',
    rank: num(r.rank),
    ...(strOrNull(r.source_span) ? { sourceSpan: str(r.source_span) } : {}),
    ...(r.title_authored === false ? { titleAuthored: false } : {}),
    createdAt: str(r.created_at),
  }));

  const texts: AuthoringText[] = t('authoring_texts').map((r) => ({
    id: str(r.id),
    sessionId: str(r.session_id),
    kind: r.kind as AuthoringText['kind'],
    body: str(r.body),
    wordCount: num(r.word_count),
    secondsWriting: num(r.seconds_writing),
    mode: (r.mode as AuthoringText['mode']) ?? 'type',
    sealedUntil: strOrNull(r.sealed_until),
    safetyRisk: (r.safety_risk as AuthoringText['safetyRisk']) ?? 'none',
    createdAt: str(r.created_at),
  }));

  const analyses: GoalAnalysis[] = t('goal_analyses').map((r) => ({
    id: str(r.id),
    goalId: str(r.goal_id),
    kind: r.kind as GoalAnalysis['kind'],
    track: (r.track as GoalAnalysis['track']) ?? 'starter',
    framingId: strOrNull(r.framing_id),
    line: str(r.line),
    ...(strOrNull(r.line2) ? { line2: str(r.line2) } : {}),
    ...(strOrNull(r.paragraph) ? { paragraph: str(r.paragraph) } : {}),
    specificity: num(r.specificity),
    followupShown: bool(r.followup_shown),
    writtenAt: str(r.written_at),
    ...(r.safety_risk ? { safetyRisk: r.safety_risk as GoalAnalysis['safetyRisk'] } : {}),
  }));

  // An edition is its `contents` — the object the app wrote — with the row's
  // own columns winning where they overlap, since the server may have
  // recomputed the ratio.
  const books: BookVersion[] = t('book_versions')
    .map((r) => {
      const c = (r.contents ?? {}) as Partial<BookVersion>;
      return {
        ...(c as BookVersion),
        id: str(r.id) || str(c.id),
        version: num(r.version, c.version ?? 1),
        track: (r.track as BookVersion['track']) ?? c.track ?? 'starter',
        sealedAt: str(r.sealed_at) || str(c.sealedAt),
        firstSentence: str(r.first_sentence) || str(c.firstSentence),
        iWill: str(r.i_will) || str(c.iWill),
        authorshipRatio: num(r.authorship_ratio, c.authorshipRatio ?? 1),
        diff: (r.diff as BookVersion['diff']) ?? c.diff ?? null,
        chapters: arr(c.chapters),
        titleFraming: c.titleFraming ?? null,
      } as BookVersion;
    })
    .sort((a, b) => a.version - b.version);

  const milestonesByPlan = groupBy(t('milestones'), (r) => str(r.plan_id));
  const movesByPlan = groupBy(t('moves'), (r) => str(r.plan_id));
  const obstaclesByGoal = groupBy(t('obstacle_plans'), (r) => str(r.goal_id));

  const plans: Plan[] = t('plans').map((r) => {
    const id = str(r.id);
    const goalId = str(r.goal_id);
    return {
      id,
      goalId,
      version: num(r.version, 1),
      seasonWeeks: num(r.season_weeks, 12),
      status: (r.status as Plan['status']) ?? 'active',
      createdAt: str(r.created_at),
      replannedAt: Array.isArray(r.replanned_at) ? (r.replanned_at as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      milestones: (milestonesByPlan.get(id) ?? [])
        .map((m) => ({
          id: str(m.id),
          planId: id,
          goalId: str(m.goal_id),
          title: str(m.title),
          proof: str(m.proof),
          proofSourceLineId: strOrNull(m.proof_source_line_id),
          targetDate: str(m.target_date),
          order: num(m.order),
          reachedAt: strOrNull(m.reached_at),
        }))
        .sort((a, b) => a.order - b.order),
      moves: (movesByPlan.get(id) ?? [])
        .map((m) => ({
          id: str(m.id),
          goalId: str(m.goal_id),
          milestoneId: strOrNull(m.milestone_id),
          title: str(m.title),
          effort: (m.effort as Plan['moves'][number]['effort']) ?? 'S',
          energy: (m.energy as Plan['moves'][number]['energy']) ?? 'low',
          ifThen: strOrNull(m.if_then),
          scheduledFor: strOrNull(m.scheduled_for),
          week: typeof m.week === 'number' ? m.week : null,
          status: (m.status as Plan['moves'][number]['status']) ?? 'todo',
          completedAt: strOrNull(m.completed_at),
          minVersion: strOrNull(m.min_version),
          ...(m.doing_min_version === true ? { doingMinVersion: true } : {}),
          sourceLineId: str(m.source_line_id),
          order: num(m.order),
        }))
        .sort((a, b) => a.order - b.order),
      obstaclePlans: (obstaclesByGoal.get(goalId) ?? []).map((o) => ({
        id: str(o.id),
        goalId,
        obstacle: str(o.obstacle),
        response: str(o.response),
        sourceLineId: str(o.source_line_id),
      })),
    };
  });

  const evidence: Evidence[] = t('evidence').map((r) => ({
    id: str(r.id),
    goalId: strOrNull(r.goal_id),
    ...(strOrNull(r.move_id) ? { moveId: str(r.move_id) } : {}),
    ...(strOrNull(r.practice_id) ? { practiceId: str(r.practice_id) } : {}),
    kind: r.kind as Evidence['kind'],
    text: str(r.text),
    day: str(r.day),
    ...(r.safety_risk ? { safetyRisk: r.safety_risk as Evidence['safetyRisk'] } : {}),
    createdAt: str(r.created_at),
  }));

  const days: Record<string, DaySummary> = {};
  for (const r of t('day_summaries')) {
    const day = str(r.day);
    days[day] = {
      day,
      planned: num(r.planned),
      done: num(r.done),
      skipped: num(r.skipped),
      partial: num(r.partial),
      evidenceCount: num(r.evidence_count),
      sealedAt: strOrNull(r.sealed_at),
      moodWord: strOrNull(r.mood_word),
      proof: strOrNull(r.proof),
      gladOf: strOrNull(r.glad_of),
      ...(strOrNull(r.intention_move_id) ? { intentionMoveId: str(r.intention_move_id) } : {}),
      ...(r.safety_risk ? { safetyRisk: r.safety_risk as DaySummary['safetyRisk'] } : {}),
    };
  }

  const practices: Practice[] = t('practices').map((r) => ({
    id: str(r.id),
    goalId: strOrNull(r.goal_id),
    kind: (r.kind as Practice['kind']) ?? 'habit',
    title: str(r.title),
    steps: arr<Practice['steps'][number]>(r.steps),
    minVersion: str(r.min_version),
    schedule: (r.schedule as Practice['schedule']) ?? { type: 'days', days: [] },
    energySlot: (r.energy_slot as Practice['energySlot']) ?? 'morning',
    sourceLineId: strOrNull(r.source_line_id),
    archivedAt: strOrNull(r.archived_at),
  }));

  const practiceLogs: PracticeLog[] = t('practice_logs').map((r) => ({
    id: str(r.id),
    practiceId: str(r.practice_id),
    day: str(r.day),
    stepsDone: num(r.steps_done),
    stepsTotal: num(r.steps_total),
    minimal: bool(r.minimal),
    completedAt: strOrNull(r.completed_at),
  }));

  const scenes: Scene[] = t('scenes').map((r) => ({
    id: str(r.id),
    goalId: str(r.goal_id),
    type: r.type as Scene['type'],
    imagePrompt: str(r.image_prompt),
    imageUri: strOrNull(r.image_uri),
    narrative: str(r.narrative),
    sourcedDetail: str(r.sourced_detail),
    tone: (r.tone as Scene['tone']) ?? null,
    createdAt: str(r.created_at),
  }));

  const letters: Letter[] = t('letters').map((r) => ({
    id: str(r.id),
    goalId: strOrNull(r.goal_id),
    direction: (r.direction as Letter['direction']) ?? 'from_future',
    body: str(r.body),
    quotes: arr<string>(r.quotes),
    trigger: str(r.trigger),
    deliverAt: str(r.deliver_at),
    readAt: strOrNull(r.read_at),
  }));

  const briefs: Brief[] = t('briefs').map((r) => ({
    id: str(r.id),
    day: str(r.day),
    kind: (r.kind as Brief['kind']) ?? 'dawn',
    yesterday: str(r.yesterday),
    today: str(r.today),
    ifThen: str(r.if_then),
    quotedSpans: arr<string>(r.quoted_spans),
    firstMoveId: strOrNull(r.first_move_id),
    support: strOrNull(r.support),
    soften: bool(r.soften),
    createdAt: str(r.created_at),
  }));

  const presentPicks: PresentPickRow[] = t('present_picks').map((r) => ({
    id: str(r.id),
    half: r.half === 'virtues' ? 'virtues' : 'faults',
    cardId: str(r.card_id),
    storyLine: str(r.story_line),
    applyLine: str(r.apply_line),
    framingId: strOrNull(r.framing_id),
    goalId: strOrNull(r.goal_id),
    rank: Number(r.rank ?? 0),
    safetyRisk: (r.safety_risk as PresentPickRow['safetyRisk']) ?? 'none',
    writtenAt: str(r.written_at),
  }));

  const pastEpochs: PastEpochRow[] = t('past_epochs').map((r) => ({
    id: str(r.id),
    label: str(r.label),
    fromAge: Number(r.from_age ?? 0),
    toAge: Number(r.to_age ?? 0),
    position: Number(r.position ?? 0),
    createdAt: str(r.created_at),
  }));

  const pastEvents: PastEventRow[] = t('past_events').map((r) => ({
    id: str(r.id),
    epochId: str(r.epoch_id),
    title: str(r.title),
    weight: r.weight === 'hurt' ? 'hurt' : 'helped',
    analysed: r.analysed === true,
    whatHappened: str(r.what_happened),
    shapedMe: str(r.shaped_me),
    stillBelieve: str(r.still_believe),
    joinsBook: r.joins_book === true,
    safetyRisk: (r.safety_risk as PastEventRow['safetyRisk']) ?? 'none',
    position: Number(r.position ?? 0),
    createdAt: str(r.created_at),
  }));

  // The account hands rows back ordered by id, and a period's id carries its
  // ages, so digits collate before letters and "19 to 24" arrived first. The
  // order is the person's own: by position, and by age where a build wrote
  // no positions. Events likewise, so a period's list reads as it was made.
  pastEpochs.sort((a, b) => a.position - b.position || a.fromAge - b.fromAge);
  pastEvents.sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));

  return {
    profile,
    goals,
    texts,
    analyses,
    books,
    plans,
    evidence,
    days,
    practices,
    practiceLogs,
    scenes,
    letters,
    briefs,
    presentPicks,
    pastEpochs,
    pastEvents,
    // A missing column is the zero value: a profile row from before 0006
    // reads as not yet listed, which is one Back away from right.
    pastListed: bool(pr?.past_listed),
  };
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}
