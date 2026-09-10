/**
 * The single store. Local-first: every write lands here and in AsyncStorage
 * first, so the Interview, the Fifteen, the stones, the Book and Today all work
 * with the network off. Sync is a later layer that reads this same shape.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  DEFAULT_PROFILE,
  LocalProvider,
  buildBookVersion,
  buildDawnBrief,
  buildPlan,
  buildPortrait,
  dayOf,
  draftLockUntil,
  draftOf,
  guarded,
  isQuotable,
  isWorse,
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
  type Plan,
  type Portrait,
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
  evidence: Evidence[];
  days: Record<string, DaySummary>;
  scenes: Scene[];
  briefs: Brief[];
  /** Set when the safety screen fires; the UI shows the resources card. */
  safetyPause: { risk: SafetyRisk; at: string } | null;
  toast: ToastState | null;
  /** The coach's single invitation to the Full track, once ever. */
  fullTrackInvited: boolean;
  bookTitle: string;
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
  setIWill: (t: string) => void;
  sealBook: () => { ok: true; book: BookVersion } | { ok: false; error: string };

  // plan
  makePortraitAndPlan: (goalId: string) => { ok: true } | { ok: false; error: string };

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
  addEvidence: (text: string, goalId?: string) => void;
  sealDay: (input: { moodWord: string; proof: string; gladOf: string }) => void;
  makeBrief: () => Brief | null;

  // ui
  setToast: (t: ToastState | null) => void;
  clearSafety: () => void;
  inviteFullTrack: () => void;
  reset: () => void;
}

export const ai = guarded(new LocalProvider(), {
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
  evidence: [] as Evidence[],
  days: {} as Record<string, DaySummary>,
  scenes: [] as Scene[],
  briefs: [] as Brief[],
  safetyPause: null,
  toast: null,
  fullTrackInvited: false,
  bookTitle: '',
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
          const goals = [...s.goals];
          const key = (t: string) => t.trim().toLowerCase();
          for (const d of drafts) {
            const title = d.title.trim();
            if (!title) continue;
            const i = goals.findIndex((g) => key(g.title) === key(title));
            if (i >= 0) {
              const existing = goals[i]!;
              goals[i] = {
                ...existing,
                ...(d.sourceSpan && !existing.sourceSpan ? { sourceSpan: d.sourceSpan } : {}),
                // Naming it in their own words upgrades a bank title.
                ...(d.sourceSpan || d.authored ? { titleAuthored: true } : {}),
                ...(existing.horizon === 'No deadline' && d.horizon !== 'No deadline'
                  ? { horizon: d.horizon, targetDate: horizonToDate(d.horizon) }
                  : {}),
              };
              continue;
            }
            goals.push({
              id: newId('goal'),
              title,
              domain: d.domain,
              ...(d.domainLabel ? { domainLabel: d.domainLabel } : {}),
              horizon: d.horizon,
              targetDate: horizonToDate(d.horizon),
              status: 'named',
              rank: goals.length,
              ...(d.sourceSpan ? { sourceSpan: d.sourceSpan } : {}),
              titleAuthored: !!d.sourceSpan || d.authored === true,
              createdAt: new Date().toISOString(),
            });
          }
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
        if (risk.risk !== 'crisis') {
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
            followupShown: existing?.followupShown ?? false,
            writtenAt: new Date().toISOString(),
          };
          const analyses = existing
            ? s.analyses.map((a) => (a.id === existing.id ? row : a))
            : [...s.analyses, row];
          const goals = s.goals.map((g) => (g.id === goalId ? { ...g, status: 'authored' as const } : g));
          return { analyses, goals };
        });
      },

      setBookTitle: (t) => set({ bookTitle: t }),
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
          set((st) => ({
            portraits: [...st.portraits.filter((p) => p.goalId !== goalId), portrait],
            plans: existingPlan ? st.plans : [...st.plans, plan],
          }));
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'The plan could not be built.' };
        }
      },

      setMoveStatus: (moveId, status) =>
        set((s) => {
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          let title = '';
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
          return { plans, evidence: ev, days: recomputeDay(s, plans, ev, day) };
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

      addEvidence: (text, goalId) =>
        set((s) => {
          const clean = text.trim();
          if (!clean) return {};
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          const evidence = [
            ...s.evidence,
            { id: newId('ev'), goalId: goalId ?? null, kind: 'capture' as const, text: clean, day, createdAt: new Date().toISOString() },
          ];
          return { evidence, days: recomputeDay(s, s.plans, evidence, day) };
        }),

      sealDay: ({ moodWord, proof, gladOf }) =>
        set((s) => {
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          const evidence = proof.trim()
            ? [
                ...s.evidence,
                { id: newId('ev'), goalId: null, kind: 'seal' as const, text: proof.trim(), day, createdAt: new Date().toISOString() },
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
            };
          }
          return { evidence, days };
        }),

      makeBrief: () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        if (s.briefs.some((b) => b.day === day && b.kind === 'dawn')) {
          return s.briefs.find((b) => b.day === day && b.kind === 'dawn') ?? null;
        }
        const daysArr = Object.values(s.days);
        const r = reading(daysArr, day);
        const yesterdayKey = new Date(new Date(`${day}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
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
          },
          newId,
        );
        set((st) => ({ briefs: [...st.briefs, brief] }));
        return brief;
      },

      setToast: (t) => set({ toast: t }),
      clearSafety: () => set({ safetyPause: null }),
      inviteFullTrack: () => set({ fullTrackInvited: true }),
      reset: () => set({ profile: DEFAULT_PROFILE, ...EMPTY }),
    }),
    {
      name: 'morrow-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const { hydrated: _h, toast: _t, storageError: _e, ...rest } = s as MorrowState & Record<string, unknown>;
        return rest as Partial<MorrowState>;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // The disk is there but unreadable. Booting as a new user would be
          // the worst possible response: the next write would overwrite a Book
          // that is still on the device. So the app comes up refusing to save,
          // and says so, rather than quietly starting the person's life again.
          console.error('[morrow] could not read local storage', error);
          useMorrow.setState({ hydrated: true, storageError: true });
          return;
        }
        state?.setToast(null);
        useMorrow.setState({ hydrated: true, storageError: false });
      },
    },
  ),
);

// ---------------------------------------------------------------- helpers

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


function recomputeDay(
  s: MorrowState,
  plans: Plan[],
  evidence: Evidence[],
  day: string,
): Record<string, DaySummary> {
  // A day counts what was due that day, plus anything actually finished that
  // day. It used to count `status !== 'todo'`, which swept in every move ever
  // completed — so the Consistency Score climbed toward 100 and could never
  // fall, which is exactly the number the product must not be able to fake.
  const boundary = s.profile.dayBoundaryHour;
  const moves = plans
    .flatMap((p) => p.moves)
    .filter(
      (m) =>
        m.scheduledFor === day ||
        (m.status === 'done' && m.completedAt && dayOf(new Date(m.completedAt), boundary) === day),
    );
  const done = moves.filter((m) => m.status === 'done').length;
  const skipped = moves.filter((m) => m.status === 'skip').length;
  const planned = moves.length;
  const prev = s.days[day];
  return {
    ...s.days,
    [day]: {
      day,
      planned,
      done,
      skipped,
      partial: 0,
      evidenceCount: evidence.filter((e) => e.day === day).length,
      sealedAt: prev?.sealedAt ?? null,
      moodWord: prev?.moodWord ?? null,
      proof: prev?.proof ?? null,
      gladOf: prev?.gladOf ?? null,
    },
  };
}

function horizonToDate(horizon: string): string | null {
  const now = new Date();
  const add = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
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
  const touchedToday = (m: (typeof all)[number]) =>
    m.status === 'done' && !!m.completedAt && dayOf(new Date(m.completedAt), boundary) === day;
  // Due today or overdue and still open, plus what was finished today so the
  // screen shows the day's work. Anything closed on an earlier day is history,
  // not today — it used to stay on the list forever.
  const due = all.filter(
    (m) => (m.status === 'todo' && (!m.scheduledFor || m.scheduledFor <= day)) || m.scheduledFor === day || touchedToday(m),
  );
  if (due.some((m) => m.status === 'todo')) {
    return due.sort((a, b) => a.order - b.order);
  }
  const upcoming = all
    .filter((m) => m.status === 'todo' && m.scheduledFor && m.scheduledFor > day)
    .sort((a, b) => (a.scheduledFor! < b.scheduledFor! ? -1 : 1));
  const next = upcoming[0];
  return [...(next ? [next] : []), ...due].sort((a, b) => a.order - b.order);
}

export function consistency(s: MorrowState) {
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  return reading(Object.values(s.days), day);
}

/** Hooks screens should use. Each one is reference-stable between real changes. */
export const useGoals = () => useMorrow(useShallow(activeGoals));
export const useTodaysMoves = () => useMorrow(useShallow(todaysMoves));
export const useConsistency = () => useMorrow(useShallow(consistency));
export const useLatestBook = () => useMorrow(latestBook);
export const useAnalysesFor = (goalId: string) =>
  useMorrow(useShallow((s: MorrowState) => analysesFor(s, goalId)));

declare const __DEV__: boolean;
