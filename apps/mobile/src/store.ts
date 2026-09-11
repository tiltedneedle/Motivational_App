/**
 * The single store. Local-first: every write lands here and in AsyncStorage
 * first, so the Interview, the Fifteen, the stones, the Book and Today all work
 * with the network off. Sync is a later layer that reads this same shape.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { STORE_KEY, failureReason, guardedStorage, hasFailed } from './storage';
import { syncNotices } from './notify';
import { billing, type BillingResult, type PlanId } from './billing';
import {
  DEFAULT_PROFILE,
  AnthropicProvider,
  LocalProvider,
  buildBookVersion,
  buildDawnBrief,
  buildPlan,
  buildPortrait,
  buildPractice,
  dueOn,
  logOf,
  FEWER_STEPS,
  canBuildBlueprint,
  canDeliverOn,
  composeLetter,
  deliverable,
  detectReturns,
  dueLetters,
  canTakeCoachTurn,
  fewer,
  movesForDay,
  planNotices,
  type Moment,
  movesOpenOn,
  practiceValue,
  dayOf,
  draftLockUntil,
  draftOf,
  guarded,
  isQuotable,
  isWorse,
  shouldOfferSupport,
  softenFrom,
  type RiskStamp,
  type EntitlementContext,
  type Gate,
  type PaywallMoment,
  mergeGoalDrafts,
  newId,
  reading,
  screen,
  scoreSpecificity,
  wordCount,
  type AnalysisKind,
  type AuthoringText,
  type BookVersion,
  type Brief,
  type DaySummary,
  type DepthTrack,
  type DomainId,
  type Evidence,
  type Goal,
  type GoalAnalysis,
  type Move,
  type Letter,
  type Plan,
  type Portrait,
  type Practice,
  type PracticeLog,
  type RunnerState,
  type Profile,
  type SafetyRisk,
  type Scene,
  type WritingDraft,
  type WritingKind,
  type WritingMode,
  type WritingSessionState,
} from '@morrow/core';

export interface ToastState {
  text: string;
  actionLabel?: string;
  /** Undo handle: the id of whatever changed. */
  undoId?: string;
  kind?: 'park' | 'add' | 'info';
}

/**
 * What came back when a scene was asked for.
 *
 * Three different nothings, kept apart because the screen owes each of them a
 * different sentence: no such goal, nothing of theirs to build it from, and a
 * request that failed. They were one `null` and Envision printed the middle
 * message for all three.
 */
export type SceneResult =
  | { ok: true; scene: Scene }
  | { ok: false; reason: 'no-goal' | 'nothing-to-build-from' | 'failed' };

export interface MorrowState {
  hydrated: boolean;
  profile: Profile;

  goals: Goal[];
  analyses: GoalAnalysis[];
  texts: AuthoringText[];
  /** In-flight sittings, one per kind. Written as the person types. */
  drafts: Record<string, WritingDraft>;
  /** True when the local store could not be read. Writing is unsafe. */
  storageError: boolean;
  books: BookVersion[];
  portraits: Portrait[];
  plans: Plan[];
  practices: Practice[];
  practiceLogs: PracticeLog[];
  evidence: Evidence[];
  days: Record<string, DaySummary>;
  scenes: Scene[];
  briefs: Brief[];
  /**
   * Letters from the future self, and to it (PRD §7.8).
   *
   * Written when an occasion arrives and read when their delivery date comes —
   * which for the ones the person writes themselves may be a year away. Kept
   * whole rather than regenerated, because a letter is a thing that was written
   * on a particular day and rewriting it later would make it a template.
   */
  letters: Letter[];
  /** Set when the safety screen fires; the UI shows the resources card. */
  safetyPause: { risk: SafetyRisk; at: string } | null;
  /**
   * The last day the coach heard something in the concern band.
   *
   * Everything else the person writes is stored on a row that carries its own
   * verdict, so `softenNow` can simply read those back. The chat is the one
   * exception: the thread lives in the Coach screen's own state and is gone
   * when the screen is, so a concern verdict there would have nowhere to live
   * and tomorrow's brief would never know. This is that place.
   */
  concernAt: string | null;
  /**
   * Coach turns per day, for the free cap (PRD §13.3). Kept as a map rather
   * than a counter with a date beside it, so a device that crosses midnight
   * mid-conversation cannot end up counting yesterday's turns against today.
   */
  coachTurns: Record<string, number>;
  toast: ToastState | null;
  /** The coach's single invitation to the Full track, once ever. */
  fullTrackInvited: boolean;
  bookTitle: string;
  /**
   * The fixed words in front of the spine title — "The one where I…" and the
   * like — kept apart from the title so the Book can typeset the two
   * differently and the authorship ratio never counts the app's half as theirs.
   */
  bookTitleFraming: string | null;
  iWill: string;

  // profile
  setProfile: (patch: Partial<Profile>) => void;
  consent: () => void;

  // goals
  addGoals: (
    drafts: { title: string; domain: DomainId; domainLabel?: string; horizon: string; sourceSpan?: string; authored?: boolean }[],
  ) => void;
  renameGoal: (id: string, title: string) => void;
  dropGoal: (id: string) => void;
  rankGoals: (ids: string[]) => void;

  // authoring
  saveText: (kind: WritingKind, body: string, mode: WritingMode, seconds: number) => AuthoringText | null;
  saveDraft: (session: WritingSessionState) => void;
  clearDraft: (kind: WritingKind) => void;
  writeAnalysis: (
    goalId: string,
    kind: AnalysisKind,
    input: { framingId: string | null; line: string; line2?: string; paragraph?: string },
  ) => void;
  setBookTitle: (t: string) => void;
  setBookTitleFraming: (f: string | null) => void;
  setIWill: (t: string) => void;
  sealBook: () => { ok: true; book: BookVersion } | { ok: false; error: string };

  // plan
  /**
   * Build the Portrait and the plan for a goal.
   *
   * `moment` is set when a paywall refused it, so the caller can raise exactly
   * that moment rather than guessing which limit was hit.
   */
  makePortraitAndPlan: (
    goalId: string,
  ) => { ok: true } | { ok: false; error: string; moment?: PaywallMoment };

  // practices
  /**
   * Build and keep a practice. Returns null when the goal has no Strategies
   * line yet, because a practice with nothing of theirs behind it is the one
   * thing this product will not store.
   */
  addPractice: (input: {
    goalId: string;
    title: string;
    kind: Practice['kind'];
    steps: { text: string; seconds: number }[];
    schedule: Practice['schedule'];
    minVersion?: string;
  }) => Practice | null;
  archivePractice: (id: string) => void;
  /** Record what actually happened in a run, finished or abandoned. */
  logRun: (state: RunnerState) => void;

  // envision
  /**
   * Draw a scene for a goal, or hand back the one already drawn — and say
   * which kind of nothing came back when none did.
   *
   * A scene with no detail of their life in it is stock footage, so "nothing
   * of theirs to build it from" is a real answer the screen shows its own
   * typographic card for rather than pretending. But it is not the only one.
   *
   * `null` used to mean two unrelated things — "there is nothing of yours to
   * build this from" and "the call failed" — and Envision printed the first
   * message for both. Somebody who had written plenty was told their writing
   * was not enough, because a request had failed. Those are different
   * sentences and they need different answers, so they are different results.
   */
  makeScene: (goalId: string, type: Scene['type']) => Promise<SceneResult>;

  // today
  setMoveStatus: (moveId: string, status: 'todo' | 'done' | 'skip') => void;
  /**
   * Returns whether the move was actually created. The coach used to announce
   * "Added" over the top of this action's own refusal toast, so a person was
   * told a move existed when none did.
   */
  addMove: (
    goalId: string,
    title: string,
    minutes: string,
    opts?: { sourceLineId?: string; minVersion?: string | null },
  ) => boolean;
  /**
   * Take the smaller version of a move that is already on Today.
   *
   * Not a new move: the coach used to add one carrying the same title, so the
   * person stuck on one thing ended up with two identical rows and the extra
   * one counted against their score for not being done.
   */
  shrinkMove: (moveId: string) => boolean;
  addEvidence: (text: string, goalId?: string) => void;
  sealDay: (input: { moodWord: string; proof: string; gladOf: string }) => void;
  /** PRD §7.10: the move they pointed at in the dawn brief this morning. */
  setIntention: (moveId: string) => void;
  noteConcern: () => void;
  /**
   * Work out what should be scheduled today and make the OS agree (PRD §7.11).
   *
   * Safe to call on every launch: the planner produces stable ids and the
   * adapter drops anything already scheduled or already past. That is also how
   * the schedule survives a reboot, which the PRD asks for and which nothing
   * else in the app would provide.
   */
  syncNotifications: () => Promise<{ scheduled: number; cancelled: number; silent: boolean }>;
  /** One step quieter (PRD §7.11's "Fewer" action). */
  fewerNotifications: () => void;

  // money
  /** Remember that a paywall moment has been shown. Once means once. */
  markPaywallSeen: (moment: PaywallMoment) => void;
  purchase: (plan: PlanId) => Promise<BillingResult>;
  restore: () => Promise<BillingResult>;
  /** Take one coach turn, or refuse with the moment that refused it. */
  takeCoachTurn: () => Gate;
  makeBrief: () => Brief | null;
  /**
   * Write any letters today has earned, and hand back what is ready to read.
   *
   * Safe on every launch: occasions are keyed, so the same milestone cannot
   * produce two letters however many times this is called. A letter that fails
   * its own check is not stored — the person cannot be expected to audit their
   * own encouragement, so a letter that names their plan simply does not exist.
   */
  catchUpLetters: () => Letter[];
  /** Their own letter, to themselves, delivered in `days`. */
  writeToFuture: (body: string, days: number) => { ok: true; letter: Letter } | { ok: false; error: string };
  markLetterRead: (id: string) => void;

  // ui
  setToast: (t: ToastState | null) => void;
  clearSafety: () => void;
  /**
   * The person says the screen was wrong about their writing.
   *
   * A crisis verdict excludes a sitting from the read-back and from every
   * future Book, permanently, on the word of ten regular expressions. That is
   * a large thing to do to somebody's writing without an appeal, and the
   * patterns have been wrong before — "I hurt my wrists in the gym again" was
   * flagged until this was written. So the judgement is reversible by the only
   * person who actually knows.
   *
   * It does not reverse itself and nothing automatic calls this: the second
   * opinion may only ever tighten a verdict. Only a deliberate human act
   * loosens one.
   */
  reconsiderLatestFlag: () => void;
  inviteFullTrack: () => void;
  reset: () => void;
}

/**
 * Where the edge functions live, when they live anywhere.
 *
 * Unset in every build so far, which is the whole point of what follows: the
 * app has to be honest about running on ten regular expressions rather than
 * implying a second opinion it cannot actually get.
 */
const EDGE_URL = process.env.EXPO_PUBLIC_MORROW_API ?? '';

/**
 * The provider the app asks, and the rules it is held to.
 *
 * `guarded()` re-verifies everything either provider returns, so the rules do
 * not depend on which one answered. With no endpoint configured the remote side
 * is simply absent and the device's own engines are the whole answer.
 *
 * This plumbing exists because the "second opinion" on the safety screen was
 * for a while a call that could not possibly disagree: both sides resolved to
 * the same ten regular expressions over the same string, so the verdict was
 * always identical and the extra call bought nothing but the appearance of
 * rigour. `hasRemoteProvider` is what the app checks before claiming otherwise.
 */
export const hasRemoteProvider = EDGE_URL.length > 0;

export const ai = guarded(hasRemoteProvider ? new AnthropicProvider({ endpoint: EDGE_URL }) : new LocalProvider(), {
  fallback: new LocalProvider(),
  onViolation: (info) => {
    // In the product this is a PostHog event with no free text.
    if (__DEV__) console.warn('[authorship]', info.call, info.reason);
  },
});

const EMPTY = {
  goals: [] as Goal[],
  analyses: [] as GoalAnalysis[],
  texts: [] as AuthoringText[],
  drafts: {} as Record<string, WritingDraft>,
  storageError: false,
  books: [] as BookVersion[],
  portraits: [] as Portrait[],
  plans: [] as Plan[],
  practices: [] as Practice[],
  practiceLogs: [] as PracticeLog[],
  evidence: [] as Evidence[],
  days: {} as Record<string, DaySummary>,
  scenes: [] as Scene[],
  briefs: [],
  letters: [],
  safetyPause: null,
  concernAt: null,
  coachTurns: {},
  toast: null,
  fullTrackInvited: false,
  bookTitle: '',
  bookTitleFraming: null,
  iWill: '',
};

export const useMorrow = create<MorrowState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: DEFAULT_PROFILE,
      ...EMPTY,

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      consent: () => set((s) => ({ profile: { ...s.profile, consentedAt: new Date().toISOString() } })),

      /**
       * The Interview names goals, and What I heard names them again from the
       * writing. When a name matches one that exists, the span is attached to
       * that goal rather than creating a second copy of the same ambition.
       */
      addGoals: (drafts) =>
        set((s) => {
          // The merge rule itself lives in the core package so it can be
          // tested; the store adds the things only it knows about — ids,
          // timestamps, and the date a horizon phrase resolves to.
          const merged = mergeGoalDrafts(
            s.goals.map((g) => ({ ...g, titleAuthored: g.titleAuthored !== false })),
            drafts,
          );
          const byName = new Map(s.goals.map((g) => [g.title.trim().toLowerCase(), g]));
          const goals: Goal[] = merged.map((m) => {
            const existing = byName.get(m.title.trim().toLowerCase());
            if (existing) {
              return {
                ...existing,
                ...m,
                ...(existing.horizon !== m.horizon ? { targetDate: horizonToDate(m.horizon) } : {}),
              } as Goal;
            }
            return {
              ...m,
              id: newId('goal'),
              targetDate: horizonToDate(m.horizon),
              status: 'named' as const,
              createdAt: new Date().toISOString(),
            } as Goal;
          });
          return { goals };
        }),

      renameGoal: (id, title) =>
        // Typing a name makes it theirs.
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, title: title.trim(), titleAuthored: true } : g)) })),

      /**
       * Dropping a goal takes everything hanging off it with it.
       *
       * Removing the goal and its analyses alone left the plan, the Portrait
       * and every move behind: the moves kept appearing on Today with nothing
       * to tap through to, and the Consistency Score kept counting them as
       * work the person had failed to do.
       *
       * The ledger is the exception. Evidence is a record of days that
       * actually happened, and a goal being let go does not unhappen them, so
       * those rows stay and simply stop pointing at a goal.
       */
      dropGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id).map((g, i) => ({ ...g, rank: i })),
          analyses: s.analyses.filter((a) => a.goalId !== id),
          plans: s.plans.filter((p) => p.goalId !== id),
          portraits: s.portraits.filter((p) => p.goalId !== id),
          scenes: s.scenes.filter((sc) => sc.goalId !== id),
          evidence: s.evidence.map((e) => (e.goalId === id ? { ...e, goalId: null } : e)),
        })),

      rankGoals: (ids) =>
        set((s) => ({
          goals: s.goals
            .map((g) => ({ ...g, rank: ids.indexOf(g.id) === -1 ? g.rank : ids.indexOf(g.id) }))
            .sort((a, b) => a.rank - b.rank),
        })),

      saveText: (kind, body, mode, seconds) => {
        const risk = screen(body);
        const text: AuthoringText = {
          id: newId('text'),
          sessionId: newId('sess'),
          kind,
          body,
          wordCount: wordCount(body),
          secondsWriting: Math.round(seconds),
          mode,
          sealedUntil: draftLockUntil(),
          safetyRisk: risk.risk,
          createdAt: new Date().toISOString(),
        };
        set((s) => {
          // The sitting is on disk properly now, so the crash-draft goes.
          const { [kind]: _done, ...drafts } = s.drafts;
          return {
            // Append-only. The old code dropped any earlier sitting of the same
            // kind, so opening the Fifteen a second time destroyed the first
            // fifteen minutes with no warning and no undo. Writing is never
            // overwritten here; the newest one is simply the one that is read.
            texts: [...s.texts, text],
            drafts,
            safetyPause: risk.risk === 'crisis' ? { risk: risk.risk, at: new Date().toISOString() } : s.safetyPause,
          };
        });
        // The second opinion (PRD §11.6). The local screen above is ten
        // regexes and it has already decided, because it has to be instant and
        // has to work with the network off. This asks a model the question the
        // regexes cannot answer — the quiet sentence with no keyword in it —
        // and it may only ever tighten the verdict, never relax one.
        //
        // Deliberately not awaited: the person is already moving to the
        // read-back, and a slow network must not hold the door shut. If the
        // answer comes back worse, the card is raised then and the writing is
        // reclassified so it can no longer be quoted or sealed.
        // Only worth the round trip when there is actually another opinion to
        // get. Without an endpoint both sides are the same regular expressions
        // over the same string, and the call could never disagree.
        if (risk.risk !== 'crisis' && hasRemoteProvider) {
          void ai
            .safety(body)
            .then((second) => {
              if (!isWorse(second.risk, risk.risk)) return;
              set((s) => ({
                texts: s.texts.map((t) => (t.id === text.id ? { ...t, safetyRisk: second.risk } : t)),
                safetyPause:
                  second.risk === 'crisis'
                    ? { risk: second.risk, at: new Date().toISOString() }
                    : s.safetyPause,
              }));
            })
            .catch(() => {
              // No network, no key, no answer. The local screen stands, and it
              // is the over-sensitive one, so failing this way is safe.
            });
        }

        // A crisis result never returns the text onward for read-back.
        return risk.risk === 'crisis' ? null : text;
      },

      // Called on a timer while the room is open. It never runs the safety
      // screen and never creates an AuthoringText: a draft is not a sitting.
      saveDraft: (session) => {
        set((s) => ({ drafts: { ...s.drafts, [session.kind]: draftOf(session) } }));
      },

      clearDraft: (kind) => {
        set((s) => {
          const { [kind]: _gone, ...drafts } = s.drafts;
          return { drafts };
        });
      },

      writeAnalysis: (goalId, kind, input) => {
        const line = input.line.trim();
        if (!line) return;
        // The stones are free text, and the Obstacles stone asks what gets in
        // the way — which is where the worst sentence of somebody's week
        // routinely lands. Screening only the Fifteen meant a line typed here
        // was read back in the dawn brief and sealed into the Book.
        const risk = screen([line, input.line2 ?? '', input.paragraph ?? ''].join(' '));
        const spec = scoreSpecificity(input.paragraph?.trim() || line);
        set((s) => {
          const existing = s.analyses.find((a) => a.goalId === goalId && a.kind === kind);
          const row: GoalAnalysis = {
            id: existing?.id ?? newId('an'),
            goalId,
            kind,
            track: s.profile.track,
            framingId: input.framingId,
            line,
            ...(input.line2?.trim() ? { line2: input.line2.trim() } : {}),
            ...(input.paragraph?.trim() ? { paragraph: input.paragraph.trim() } : {}),
            specificity: spec.score,
            safetyRisk: risk.risk,
            followupShown: existing?.followupShown ?? false,
            writtenAt: new Date().toISOString(),
          };
          const analyses = existing
            ? s.analyses.map((a) => (a.id === existing.id ? row : a))
            : [...s.analyses, row];
          const goals = s.goals.map((g) => (g.id === goalId ? { ...g, status: 'authored' as const } : g));
          return {
            analyses,
            goals,
            safetyPause:
              risk.risk === 'crisis' ? { risk: risk.risk, at: new Date().toISOString() } : s.safetyPause,
          };
        });
      },

      setBookTitle: (t) => set({ bookTitle: t }),
      setBookTitleFraming: (f) => set({ bookTitleFraming: f }),
      setIWill: (t) => set({ iWill: t }),

      sealBook: () => {
        const s = get();
        // Writing done in crisis stays on the device but is never sealed into
        // the Book. It is theirs to keep and to export; it is not material.
        const ideal = latestText(s.texts, 'ideal');
        const shadow = latestText(s.texts, 'shadow');
        const additions = s.texts.filter((t) => t.kind === 'addition' && isQuotable(t)).map((t) => t.body);
        try {
          const book = buildBookVersion(
            {
              version: s.books.length + 1,
              title: s.bookTitle || 'Untitled',
              // "Untitled" is the app's word, so it earns no authorship credit.
              // Anything else in this field was typed by the person: the
              // framing chips on the rank screen no longer fill it in.
              titleAuthored: !!s.bookTitle.trim(),
              titleFraming: s.bookTitleFraming,
              track: s.profile.track,
              ideal: [ideal?.body ?? '', ...additions].filter(Boolean).join('\n\n'),
              shadow: shadow?.body ?? null,
              iWill: s.iWill,
              goals: s.goals,
              analyses: s.analyses,
            },
            newId,
          );
          set((st) => ({
            books: [...st.books, book],
            goals: st.goals.map((g) => (g.status === 'authored' ? { ...g, status: 'active' as const } : g)),
          }));
          return { ok: true, book };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'The Book could not be sealed.' };
        }
      },

      /**
       * Build the Portrait and the Blueprint for a goal.
       *
       * A plan is built once. It used to be replaced wholesale every time this
       * ran, and it runs again whenever the Book is re-sealed or a missing
       * stone is filled in from the Goal screen — so a person who added their
       * Monitoring line in week three lost every move they had kept, along with
       * the dates they kept them on. Changing a plan that is already under way
       * is what the replan is for, and that asks first.
       *
       * The Portrait is derived and safe to rebuild, except for an identity
       * line the person has written themselves. That is theirs and survives.
       */
      makePortraitAndPlan: (goalId) => {
        const s = get();
        const goal = s.goals.find((g) => g.id === goalId);
        const ideal = latestText(s.texts, 'ideal')?.body ?? '';
        if (!goal) return { ok: false, error: 'That goal is gone.' };

        // PRD §13.3: the free plan builds one Blueprint. Note what is *not*
        // gated — the goal is still authored, the stones are still written, and
        // the Book still seals with every one of them in it. What Pro buys is
        // the plan the app builds out of those lines, never the right to write
        // them down. A goal that already has a plan is always allowed to rebuild
        // it, or a Monitoring line written later could never reach its own
        // milestone.
        const rebuilding = s.plans.some((p) => p.goalId === goalId);
        if (!rebuilding) {
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          const gate = canBuildBlueprint(entitlementOf(s, day));
          if (!gate.allowed) return { ok: false, error: gate.reason, moment: gate.moment };
        }
        const analyses = s.analyses.filter((a) => a.goalId === goalId);
        const existingPlan = s.plans.find((p) => p.goalId === goalId);
        const existingPortrait = s.portraits.find((p) => p.goalId === goalId);
        try {
          const built = buildPortrait({ goal, analyses, ideal, firstName: s.profile.displayName });
          const portrait =
            existingPortrait?.identityLineEdited
              ? {
                  ...built,
                  identityLine: existingPortrait.identityLine,
                  identityFraming: existingPortrait.identityFraming,
                  identityLineEdited: true,
                }
              : built;
          // The day boundary is the user's, not UTC's. Dating the first move by
          // UTC put it a day late for anyone west of it, and Today filters by
          // the local day, so the move simply never appeared.
          const today = dayOf(new Date(), s.profile.dayBoundaryHour);
          const plan = existingPlan ?? buildPlan({ goal, analyses }, { today, newId });

          // An existing plan keeps its moves — rebuilding them would throw away
          // every one the person had already kept, and their dates with them.
          // But what is safely derivable IS refreshed, or a Monitoring line
          // written in week three could never reach the milestone the Goal
          // screen promises it will fill: the plan was built before that line
          // existed and nothing ever went back for it.
          const monitoring = analyses.find((a) => a.kind === 'monitoring' && a.line.trim());
          const refreshed =
            existingPlan && monitoring
              ? {
                  ...existingPlan,
                  milestones: existingPlan.milestones.map((ms) =>
                    ms.proofSourceLineId
                      ? ms
                      : { ...ms, proof: monitoring.line.trim(), proofSourceLineId: monitoring.id },
                  ),
                }
              : existingPlan;

          set((st) => ({
            portraits: [...st.portraits.filter((p) => p.goalId !== goalId), portrait],
            plans: refreshed
              ? st.plans.map((p) => (p.goalId === goalId ? refreshed : p))
              : [...st.plans, plan],
          }));
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'The plan could not be built.' };
        }
      },

      addPractice: (input) => {
        const s = get();
        const source = s.analyses.find(
          (a) => a.goalId === input.goalId && a.kind === 'strategies' && a.line.trim(),
        );
        if (!source) {
          set({ toast: { text: 'Write the Strategies line for this goal first.', kind: 'info' } });
          return null;
        }
        try {
          const practice = buildPractice({ ...input, source, newId });
          set((st) => ({
            practices: [...st.practices, practice],
            toast: { text: `Added \u00b7 ${practice.title}`, kind: 'add' },
          }));
          return practice;
        } catch (err) {
          set({
            toast: {
              text: err instanceof Error ? err.message.replace('Practice rejected: ', '') : 'That could not be saved.',
              kind: 'info',
            },
          });
          return null;
        }
      },

      archivePractice: (id) =>
        set((st) => ({
          practices: st.practices.map((p) =>
            p.id === id ? { ...p, archivedAt: new Date().toISOString() } : p,
          ),
        })),

      logRun: (runner) => {
        const s = get();
        const practice = s.practices.find((p) => p.id === runner.practiceId);
        if (!practice) return;
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        const log = logOf(runner, practice, day, newId);

        // One log per practice per day: doing it twice is still one day of
        // having done it, and two rows would count it twice in the score.
        const logs = [...s.practiceLogs.filter((l) => !(l.practiceId === practice.id && l.day === day)), log];

        // A finished practice is proof, and proof belongs in the ledger in the
        // person's own words - the step titles are cut from their line.
        const evidence =
          log.stepsDone > 0
            ? [
                ...s.evidence.filter((e) => !(e.kind === 'practice' && e.moveId === practice.id && e.day === day)),
                {
                  id: newId('ev'),
                  goalId: practice.goalId,
                  moveId: practice.id,
                  kind: 'practice' as const,
                  text: log.minimal ? practice.minVersion : practice.title,
                  day,
                  createdAt: new Date().toISOString(),
                },
              ]
            : s.evidence;

        set({ practiceLogs: logs, evidence, days: recomputeDay(s, s.plans, evidence, day, logs) });
      },

      makeScene: async (goalId, type) => {
        const s = get();
        const existing = s.scenes.find((sc) => sc.goalId === goalId && sc.type === type);
        if (existing) return { ok: true as const, scene: existing };

        const goal = s.goals.find((g) => g.id === goalId);
        if (!goal) return { ok: false as const, reason: 'no-goal' as const };

        // Built from their own material and nothing else: the Impact line for
        // who else it changes, and the Fifteen for the texture of the morning.
        const impact = s.analyses.find((a) => a.goalId === goalId && a.kind === 'impact' && a.line.trim());
        const ideal = latestText(s.texts, 'ideal')?.body ?? '';
        if (!ideal.trim() && !impact?.line.trim()) return { ok: false as const, reason: 'nothing-to-build-from' as const };

        try {
          const out = await ai.scene({
            goalTitle: goal.title,
            impactLine: impact?.line.trim() ?? '',
            idealExcerpt: ideal,
            type,
          });
          // `guarded` empties the narrative when nothing of theirs is in it.
          // That is the same answer as having written nothing: there was no
          // sentence of theirs for it to be made of.
          if (!out.narrative.trim()) return { ok: false as const, reason: 'nothing-to-build-from' as const };

          const scene: Scene = {
            id: newId('scene'),
            goalId,
            type,
            imagePrompt: out.imagePrompt,
            // No image service is wired, and the PRD says the feature never
            // shows an empty state, so the screen sets the words instead.
            imageUri: null,
            narrative: out.narrative,
            sourcedDetail: out.sourcedDetail,
            tone: null,
            createdAt: new Date().toISOString(),
          };
          set((st) => ({ scenes: [...st.scenes.filter((x) => !(x.goalId === goalId && x.type === type)), scene] }));
          return { ok: true as const, scene };
        } catch (err) {
          // The call failed. Not the same thing at all, and the screen says so.
          if (__DEV__) console.warn('[morrow] scene failed', err);
          return { ok: false as const, reason: 'failed' as const };
        }
      },

      setMoveStatus: (moveId, status) =>
        set((s) => {
          const boundary = s.profile.dayBoundaryHour;
          const day = dayOf(new Date(), boundary);
          let title = '';

          // Every day this change touches, not only today. Undoing a move that
          // was kept on an earlier day removed that day's ledger row and left
          // its score exactly where it was, so the number went on counting work
          // whose record had just been deleted.
          const before = s.plans.flatMap((p) => p.moves).find((m) => m.id === moveId);
          const touched = new Set<string>([day]);
          if (before?.completedAt) touched.add(dayOf(new Date(before.completedAt), boundary));
          if (before?.scheduledFor) touched.add(before.scheduledFor);

          const plans = s.plans.map((p) => ({
            ...p,
            moves: p.moves.map((m) => {
              if (m.id !== moveId) return m;
              title = m.title;
              return {
                ...m,
                status,
                completedAt: status === 'done' ? new Date().toISOString() : null,
              };
            }),
          }));
          const ev =
            status === 'done'
              ? [
                  ...s.evidence,
                  {
                    id: newId('ev'),
                    goalId: plans.find((p) => p.moves.some((m) => m.id === moveId))?.goalId ?? null,
                    moveId,
                    kind: 'move' as const,
                    text: title,
                    day,
                    createdAt: new Date().toISOString(),
                  },
                ]
              : // Undo removes this move's own row. Matching on the title used to
                // delete a different move that happened to be called the same thing.
                s.evidence.filter((e) =>
                  e.moveId ? e.moveId !== moveId : !(e.kind === 'move' && e.text === title && e.day === day),
                );
          let days = s.days;
          for (const d of touched) days = recomputeDay({ ...s, days }, plans, ev, d);
          return { plans, evidence: ev, days };
        }),

      addMove: (goalId, title, minutes, opts) => {
        const s = get();
        const clean = title.trim();
        if (!clean) return false;
        const plan = s.plans.find((p) => p.goalId === goalId);
        // The caller's line wins when it is real: a move offered by the coach
        // already knows which sentence it came from, and re-deriving it here
        // attributed the move to whatever Strategies line happened to belong
        // to the goal being written to.
        const given = opts?.sourceLineId
          ? s.analyses.find((a) => a.id === opts.sourceLineId && a.goalId === goalId)
          : undefined;
        const source = given ?? s.analyses.find((a) => a.goalId === goalId && a.kind === 'strategies');
        if (!plan || !source) {
          // Without a line of theirs behind it there is no move.
          set({ toast: { text: 'Write the Strategies line for this goal first.', kind: 'info' } });
          return false;
        }
        const move = {
          id: newId('mv'),
          goalId,
          milestoneId: plan.milestones[0]?.id ?? null,
          title: clean,
          effort: (minutes === '2 min' ? 'S' : minutes === '45 min' ? 'L' : 'M') as 'S' | 'M' | 'L',
          energy: 'low' as const,
          ifThen: null,
          scheduledFor: dayOf(new Date(), s.profile.dayBoundaryHour),
          week: 1,
          status: 'todo' as const,
          completedAt: null,
          minVersion: opts?.minVersion ?? null,
          sourceLineId: source.id,
          order: plan.moves.length,
        };
        set((st) => ({
          plans: st.plans.map((p) => (p.id === plan.id ? { ...p, moves: [...p.moves, move] } : p)),
          toast: { text: `Added · ${clean}`, kind: 'add' },
        }));
        return true;
      },

      shrinkMove: (moveId) => {
        const s = get();
        const move = s.plans.flatMap((p) => p.moves).find((m) => m.id === moveId);
        if (!move) return false;
        if (!move.minVersion) {
          set({ toast: { text: 'There is no smaller version of this one yet.', kind: 'info' } });
          return false;
        }
        set((st) => ({
          plans: st.plans.map((p) => ({
            ...p,
            moves: p.moves.map((m) => (m.id === moveId ? { ...m, doingMinVersion: true } : m)),
          })),
          toast: { text: `The small version it is · ${move.title}`, kind: 'info' },
        }));
        return true;
      },

      addEvidence: (text, goalId) =>
        set((s) => {
          const clean = text.trim();
          if (!clean) return {};
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          const risk = screen(clean);
          const evidence = [
            ...s.evidence,
            {
              id: newId('ev'),
              goalId: goalId ?? null,
              kind: 'capture' as const,
              text: clean,
              day,
              safetyRisk: risk.risk,
              createdAt: new Date().toISOString(),
            },
          ];
          return {
            evidence,
            days: recomputeDay(s, s.plans, evidence, day),
            safetyPause:
              risk.risk === 'crisis' ? { risk: risk.risk, at: new Date().toISOString() } : s.safetyPause,
          };
        }),

      sealDay: ({ moodWord, proof, gladOf }) =>
        set((s) => {
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          // The proof line is typed at night, is free text, and the coach reads
          // it back the next morning as "and you wrote …". It gets the same
          // screen as everything else the app quotes.
          const risk = screen([proof, gladOf].join(' '));
          const evidence = proof.trim()
            ? [
                ...s.evidence,
                {
                  id: newId('ev'),
                  goalId: null,
                  kind: 'seal' as const,
                  text: proof.trim(),
                  day,
                  safetyRisk: risk.risk,
                  createdAt: new Date().toISOString(),
                },
              ]
            : s.evidence;
          const days = recomputeDay(s, s.plans, evidence, day);
          const existing = days[day];
          if (existing) {
            days[day] = {
              ...existing,
              sealedAt: new Date().toISOString(),
              moodWord: moodWord || null,
              proof: proof.trim() || null,
              gladOf: gladOf.trim() || null,
              safetyRisk: risk.risk,
            };
          }
          return {
            evidence,
            days,
            safetyPause:
              risk.risk === 'crisis' ? { risk: risk.risk, at: new Date().toISOString() } : s.safetyPause,
          };
        }),

      /**
       * Remember that the coach heard something in the concern band today.
       *
       * Deliberately not a text, a category, or anything the person wrote —
       * one date. PRD §11.6 logs a flag, never text, and the whole reason this
       * field exists is that the chat itself is not kept.
       */
      /**
       * The morning intention (PRD §7.10): one tap on the first move, in the
       * dawn brief.
       *
       * Nothing scores them against it and nothing nags about it later. Today
       * simply says "you said this one this morning", because the choosing is
       * the ritual — an intention the app then held over somebody's head would
       * be a different product.
       */
      setIntention: (moveId) =>
        set((s) => {
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          const existing = s.days[day];
          const base: DaySummary = existing ?? {
            day,
            planned: 0,
            done: 0,
            skipped: 0,
            partial: 0,
            evidenceCount: 0,
            sealedAt: null,
            moodWord: null,
            proof: null,
            gladOf: null,
            intentionMoveId: null,
          };
          return { days: { ...s.days, [day]: { ...base, intentionMoveId: moveId } } };
        }),

      inviteFullTrack: () => set({ fullTrackInvited: true }),

      syncNotifications: async () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        const daysArr = Object.values(s.days);
        // Days since anything at all was logged. A person who has never logged
        // anything is not "away": they have not started, and the day-three
        // nudge is for coming back, not for arriving.
        const lastActive = daysArr
          .filter((d) => d.done > 0 || d.evidenceCount > 0 || d.sealedAt)
          .map((d) => d.day)
          .sort()
          .pop();
        const daysSinceAnything = lastActive ? daysBetween(lastActive, day) : 0;

        const planned = planNotices({
          day,
          wakeTime: s.profile.wakeTime,
          eveningTime: s.profile.eveningTime,
          sundayHour: s.profile.sundayHour,
          persona: s.profile.persona,
          book: s.books[s.books.length - 1] ?? null,
          moves: todaysMoves(s),
          yesterday: s.days[day] ?? null,
          daysSinceAnything,
          muted: s.profile.notificationsOff === true,
        });

        const out = await syncNotices(planned, (s.profile.mutedMoments ?? []) as Moment[]);
        return { scheduled: out.scheduled.length, cancelled: out.cancelled.length, silent: out.silent };
      },

      fewerNotifications: () =>
        set((s) => {
          const next = fewer((s.profile.mutedMoments ?? []) as Moment[]);
          // The last step is everything, which is the same as off. Saying so
          // lets Settings show one honest state rather than a list of five
          // switches that all happen to be down.
          const off = next.length >= FEWER_STEPS[FEWER_STEPS.length - 1]!.length;
          return { profile: { ...s.profile, mutedMoments: next, notificationsOff: off } };
        }),

      markPaywallSeen: (moment) =>
        set((s) => {
          const seen = s.profile.paywallSeen ?? [];
          return seen.includes(moment)
            ? {}
            : { profile: { ...s.profile, paywallSeen: [...seen, moment] } };
        }),

      purchase: async (plan) => {
        const out = await billing().purchase(plan);
        if (out.ok) set((s) => ({ profile: { ...s.profile, entitled: true } }));
        return out;
      },

      restore: async () => {
        const out = await billing().restore();
        if (out.ok) set((s) => ({ profile: { ...s.profile, entitled: true } }));
        return out;
      },

      takeCoachTurn: () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        const gate = canTakeCoachTurn(entitlementOf(s, day));
        if (!gate.allowed) return gate;
        set((st) => ({ coachTurns: { ...st.coachTurns, [day]: (st.coachTurns[day] ?? 0) + 1 } }));
        return gate;
      },

      catchUpLetters: () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        const occasions = dueLetters({
          today: day,
          portraitReady: s.portraits.length > 0,
          returns: detectReturns(Object.values(s.days), day).length,
          reachedMilestones: s.plans
            .flatMap((p) => p.milestones)
            .filter((m) => m.reachedAt)
            .map((m) => ({ id: m.id, goalId: m.goalId, reachedAt: m.reachedAt as string })),
          existing: s.letters.map((l) => l.trigger),
          firstSealedOn: s.books[0]?.sealedAt?.slice(0, 10) ?? null,
        });

        if (occasions.length === 0) return deliverable(s.letters, day);

        const sources = {
          ideal: latestText(s.texts, 'ideal')?.body ?? '',
          evidence: [...s.evidence].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
          goals: s.goals,
          moves: s.plans.flatMap((p) => p.moves),
        };

        const written: Letter[] = [];
        for (const occasion of occasions) {
          const { body, quotes, check } = composeLetter(occasion.trigger, sources, s.profile.displayName);
          // Refused rather than shown with a caveat. See `checkLetter`.
          if (!check.ok) {
            if (__DEV__) console.warn('[morrow] letter refused', occasion.key, check.problems.join('; '));
            continue;
          }
          written.push({
            id: newId('letter'),
            goalId: occasion.goalId,
            direction: 'from_future',
            body,
            quotes,
            trigger: occasion.key,
            deliverAt: day,
            readAt: null,
          });
        }

        if (written.length === 0) return deliverable(s.letters, day);
        set((st) => ({ letters: [...st.letters, ...written] }));
        return deliverable(get().letters, day);
      },

      writeToFuture: (body, days) => {
        const text = body.trim();
        if (!text) return { ok: false, error: 'Write something first.' };
        const when = canDeliverOn(days);
        if (!when.ok) return { ok: false, error: when.reason ?? 'Pick a day.' };

        const s = get();
        // Their own words to themselves, screened like everything else they
        // write — and a crisis line is not put in a box to be handed back to
        // them in six months.
        const risk = screen(text);
        if (risk.risk === 'crisis') {
          set({ safetyPause: { risk: risk.risk, at: new Date().toISOString() } });
          return { ok: false, error: 'Not this one.' };
        }

        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        const deliverAt = new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
        const letter: Letter = {
          id: newId('letter'),
          goalId: null,
          direction: 'to_future',
          body: text,
          quotes: [],
          trigger: `self:${deliverAt}`,
          deliverAt,
          readAt: null,
        };
        set((st) => ({ letters: [...st.letters, letter] }));
        return { ok: true, letter };
      },

      markLetterRead: (id) =>
        set((s) => ({
          letters: s.letters.map((l) => (l.id === id ? { ...l, readAt: new Date().toISOString() } : l)),
        })),

      noteConcern: () =>
        set((s) => ({ concernAt: dayOf(new Date(), s.profile.dayBoundaryHour) })),

      makeBrief: () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        if (s.briefs.some((b) => b.day === day && b.kind === 'dawn')) {
          return s.briefs.find((b) => b.day === day && b.kind === 'dawn') ?? null;
        }
        const daysArr = Object.values(s.days);
        const r = reading(daysArr, day);
        const yesterdayKey = new Date(new Date(`${day}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
        // PRD 11.6: concern softens the next prompt, avoids numeric targets and
        // suggests professional support once. For a long time the verdict was
        // computed on every write, stored on the row, and then ignored by every
        // screen — the band existed in the data and nowhere else.
        const soften = softenNow(s, day);
        const offerSupport = shouldOfferSupport(soften, s.profile.supportOfferedAt ?? null);
        const brief = buildDawnBrief(
          {
            day,
            book: s.books[s.books.length - 1] ?? null,
            yesterday: s.days[yesterdayKey] ?? null,
            moves: s.plans.flatMap((p) => p.moves),
            analyses: s.analyses,
            persona: s.profile.persona,
            score: r.score,
            previousScore: r.previous,
            soften,
            offerSupport,
          },
          newId,
        );
        set((st) => ({
          briefs: [...st.briefs, brief],
          // Stamped when the line is actually written into a brief, not when
          // the band opens — otherwise a brief that failed to build would still
          // burn the one offer the person gets.
          profile: offerSupport ? { ...st.profile, supportOfferedAt: new Date().toISOString() } : st.profile,
        }));
        return brief;
      },

      setToast: (t) => set({ toast: t }),
      reconsiderLatestFlag: () =>
        set((st) => {
          // The most recent flagged sitting: the one the card is about.
          const flagged = [...st.texts]
            .filter((t) => t.safetyRisk === 'crisis')
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
          if (!flagged) return { safetyPause: null };
          return {
            texts: st.texts.map((t) => (t.id === flagged.id ? { ...t, safetyRisk: 'none' as const } : t)),
            safetyPause: null,
          };
        }),

      clearSafety: () => set({ safetyPause: null }),
      reset: () => set({ profile: DEFAULT_PROFILE, ...EMPTY }),
    }),
    {
      name: STORE_KEY,
      // Not `createJSONStorage(AsyncStorage)`. The guard has to sit BELOW
      // zustand, because zustand's persist middleware replaces `api.setState`
      // with one that writes on every call — including the call that would set
      // a "storage is broken" flag. Setting that flag from up here serialised
      // the store's empty defaults straight over the person's Book, so the
      // recovery path was the thing destroying the data. See src/storage.ts.
      storage: createJSONStorage(() => guardedStorage),
      partialize: (s) => {
        const { hydrated: _h, toast: _t, storageError: _e, ...rest } = s as MorrowState & Record<string, unknown>;
        return rest as Partial<MorrowState>;
      },
      /**
       * zustand's default merge is one level deep, so a profile written by an
       * older build replaces DEFAULT_PROFILE wholesale and every field added
       * since is `undefined` on that device — no error, no crash, just a
       * setting that silently reads as unset. Merging the profile explicitly
       * is what makes adding a field to it a safe thing to do.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MorrowState>;
        return {
          ...current,
          ...p,
          profile: { ...DEFAULT_PROFILE, ...current.profile, ...(p.profile ?? {}) },
        };
      },
      onRehydrateStorage: () => (state, error) => {
        // Ask the storage layer, not this callback, whether the disk is sound:
        // a blob that reads but does not parse never reaches `error` here, and
        // that is the commonest shape of the failure.
        const broken = Boolean(error) || hasFailed();
        if (broken) {
          console.error('[morrow] could not read local storage', error ?? failureReason());
        } else {
          state?.setToast(null);
        }
        // Safe either way now: with the latch closed this write is dropped
        // rather than persisted, so it cannot overwrite anything.
        useMorrow.setState({ hydrated: true, storageError: broken });
      },
    },
  ),
);

// ---------------------------------------------------------------- helpers

/**
 * What the entitlement rules need to know, gathered in one place.
 *
 * A Blueprint counts as built when a plan exists for that goal, which is the
 * same thing the Goal screen shows. Deriving it rather than keeping a counter
 * means the number cannot drift from what the person can actually see.
 */
export function entitlementOf(s: MorrowState, day: string): EntitlementContext {
  return {
    entitled: s.profile.entitled === true,
    blueprintsBuilt: new Set(s.plans.map((p) => p.goalId)).size,
    coachTurnsToday: s.coachTurns[day] ?? 0,
    afterBlueprintShown: (s.profile.paywallSeen ?? []).includes('after-blueprint'),
  };
}

/** Whole days from one `YYYY-MM-DD` to another. Negative if `to` is earlier. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Whether this morning is inside the concern band.
 *
 * Everything the person writes is screened, and the verdict is stored on the
 * row it came from — a sitting, an analysis line, the proof typed at the end of
 * a day. This reads those verdicts back rather than keeping a separate flag,
 * so there is nothing to drift out of step and nothing extra to migrate.
 *
 * Crisis is not included: crisis has its own path — the sitting is paused, the
 * resources card is shown, and the text never reaches the Book. A softened
 * brief is what the *next* morning owes somebody, and after a crisis the app
 * has already said more than a softened brief would.
 */
export function softenNow(s: MorrowState, today: string): boolean {
  const boundary = s.profile.dayBoundaryHour;
  const stamps: RiskStamp[] = [
    ...s.texts.map((t) => ({ risk: t.safetyRisk, day: dayOf(new Date(t.createdAt), boundary) })),
    ...s.analyses.map((a) => ({ risk: a.safetyRisk, day: dayOf(new Date(a.writtenAt), boundary) })),
    ...s.evidence.map((e) => ({ risk: e.safetyRisk, day: e.day })),
    ...Object.values(s.days).map((d) => ({ risk: d.safetyRisk, day: d.day })),
    // The chat leaves nothing else behind. See `concernAt`.
    ...(s.concernAt ? [{ risk: 'concern' as const, day: s.concernAt }] : []),
  ];
  return softenFrom(stamps, today);
}

/**
 * The sitting that speaks for a kind: the most recent one that may be quoted.
 *
 * `texts` is append-only, so a person who writes the Fifteen twice has both on
 * the device. The Book reads the latest; the earlier one is still theirs and
 * still exports.
 */
export function latestText(texts: AuthoringText[], kind: WritingKind): AuthoringText | null {
  let best: AuthoringText | null = null;
  for (const t of texts) {
    if (t.kind !== kind || !isQuotable(t)) continue;
    if (!best || t.createdAt >= best.createdAt) best = t;
  }
  return best;
}


/** The last day this practice was actually done, for an interval schedule. */
function lastDoneDay(logs: PracticeLog[], practiceId: string, before: string): string | null {
  const days = logs
    .filter((l) => l.practiceId === practiceId && l.stepsDone > 0 && l.day < before)
    .map((l) => l.day)
    .sort();
  return days[days.length - 1] ?? null;
}

function recomputeDay(
  s: MorrowState,
  plans: Plan[],
  evidence: Evidence[],
  day: string,
  practiceLogs: PracticeLog[] = s.practiceLogs,
): Record<string, DaySummary> {
  // A move belongs to exactly one day: see `movesForDay` for why that sentence
  // needed writing down and testing.
  const boundary = s.profile.dayBoundaryHour;
  const moves = movesForDay(plans.flatMap((p) => p.moves), day, boundary);
  const done = moves.filter((m) => m.status === 'done').length;
  const skipped = moves.filter((m) => m.status === 'skip').length;

  // Practices count toward the day too, or the score would say nothing about a
  // person whose whole plan is a morning routine. A practice that was asked for
  // is planned; what they did of it is what it is worth, and the two-minute
  // version is worth the whole thing.
  const asked = s.practices.filter((practice) =>
    dueOn(practice, day, lastDoneDay(practiceLogs, practice.id, day)),
  );
  const logsToday = practiceLogs.filter((l) => l.day === day);
  const practiceDone = asked.reduce(
    (n, practice) => n + practiceValue(logsToday.find((l) => l.practiceId === practice.id)),
    0,
  );

  const planned = moves.length + asked.length;
  const prev = s.days[day];
  return {
    ...s.days,
    [day]: {
      day,
      planned,
      // A partly-kept routine is neither done nor skipped, so it lands here
      // rather than being rounded away in either direction.
      done: done + Math.floor(practiceDone),
      skipped,
      partial: Number((practiceDone % 1).toFixed(2)),
      evidenceCount: evidence.filter((e) => e.day === day).length,
      sealedAt: prev?.sealedAt ?? null,
      moodWord: prev?.moodWord ?? null,
      proof: prev?.proof ?? null,
      gladOf: prev?.gladOf ?? null,
      // Carried, not recomputed. It is a thing the person did this morning, and
      // recounting the moves later must not quietly forget it.
      intentionMoveId: prev?.intentionMoveId ?? null,
    },
  };
}

function horizonToDate(horizon: string): string | null {
  const now = new Date();
  const add = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    // `dayOf` with no boundary, not `toISOString()`. The months are added in
    // local time and toISOString converts to UTC, so west of Greenwich in the
    // evening a three-month horizon landed a day late — which then dated every
    // milestone on the plan built from it.
    return dayOf(d, 0);
  };
  switch (horizon) {
    case 'Three months':
      return add(3);
    case 'Six months':
      return add(6);
    case 'A year':
      return add(12);
    default:
      return null;
  }
}

// ---------------------------------------------------------------- selectors
//
// zustand v5 compares selector results by reference. A selector that builds a
// fresh array or object on every call re-renders forever, so every derived
// selector here goes through `useShallow`. Learned the hard way: the first
// end-to-end run died with React error #185 on this exact mistake.

export function activeGoals(s: MorrowState): Goal[] {
  return [...s.goals].sort((a, b) => a.rank - b.rank);
}

export function analysesFor(s: MorrowState, goalId: string): GoalAnalysis[] {
  return s.analyses.filter((a) => a.goalId === goalId);
}

export function latestBook(s: MorrowState): BookVersion | null {
  return s.books[s.books.length - 1] ?? null;
}

/**
 * What Today shows.
 *
 * Due today or overdue, plus anything already touched. And when nothing is due
 * — which is exactly the case on the evening you seal the Book, because the
 * first move is dated tomorrow — the next upcoming move comes forward, so the
 * screen is never empty and starting early is allowed.
 */
export function todaysMoves(s: MorrowState) {
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  const all = s.plans.flatMap((p) => p.moves);
  const boundary = s.profile.dayBoundaryHour;
  // What the day is still asking for, plus what was finished today. A parked
  // move is still open: "not today" is not "never". See `movesOpenOn`.
  const due = movesOpenOn(all, day, boundary);
  if (due.some((m) => m.status === 'todo')) {
    return due.sort((a, b) => a.order - b.order);
  }

  // Everything the day asked for is closed. Show it as closed.
  //
  // This used to promote tomorrow's move into today's list the moment the last
  // one was seated, so the day never read as finished and there was always one
  // more thing waiting. A day you can finish is the entire point of the screen,
  // and the seal at the end of it only means something if the work stops.
  if (due.length > 0) {
    return due.sort((a, b) => a.order - b.order);
  }

  // Nothing was scheduled for today at all — the evening the Book is sealed,
  // for instance, when the first move is dated tomorrow. Bringing the next one
  // forward is what keeps that evening from looking empty.
  const next = all
    .filter((m) => m.status === 'todo' && m.scheduledFor && m.scheduledFor > day)
    .sort((a, b) => (a.scheduledFor! < b.scheduledFor! ? -1 : 1))[0];
  return next ? [next] : [];
}

/**
 * Whether the day's work is finished: something was asked of them and none of
 * it is still open. Distinct from an empty day, which asks nothing.
 */
export function dayIsDone(s: MorrowState): boolean {
  const moves = todaysMoves(s);
  if (moves.length === 0) return false;
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  const scheduledToday = moves.filter((m) => m.scheduledFor === day || m.status !== 'todo');
  return scheduledToday.length > 0 && moves.every((m) => m.status !== 'todo');
}

export function consistency(s: MorrowState) {
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  return reading(Object.values(s.days), day);
}

/** Hooks screens should use. Each one is reference-stable between real changes. */
/**
 * The practices this day asks for.
 *
 * Returns the stored Practice objects themselves, NOT freshly-built pairs of
 * practice-and-log. `useShallow` compares the members of the array by
 * reference, so a selector that wraps each one in a new object is unequal to
 * itself on every render and the screen loops until React gives up. That was
 * bug 4 of the first audit and this is the same trap one row over; the pairing
 * with logs happens in the screen, where a `useMemo` can hold it still.
 */
export function todaysPractices(s: MorrowState): Practice[] {
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  return s.practices.filter((p) => dueOn(p, day, lastDoneDay(s.practiceLogs, p.id, day)));
}

/** Today's log for a practice, or null. Cheap enough to call per row. */
export function logForToday(s: MorrowState, practiceId: string): PracticeLog | null {
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  return s.practiceLogs.find((l) => l.practiceId === practiceId && l.day === day) ?? null;
}

export const useGoals = () => useMorrow(useShallow(activeGoals));
export const useTodaysPractices = () => useMorrow(useShallow(todaysPractices));
export const useTodaysMoves = () => useMorrow(useShallow(todaysMoves));
export const useConsistency = () => useMorrow(useShallow(consistency));
export const useLatestBook = () => useMorrow(latestBook);
export const useAnalysesFor = (goalId: string) =>
  useMorrow(useShallow((s: MorrowState) => analysesFor(s, goalId)));

declare const __DEV__: boolean;
