/**
 * The single store. Local-first: every write lands here and in AsyncStorage
 * first, so the Interview, the Fifteen, the stones, the Book and Today all work
 * with the network off. Sync is a later layer that reads this same shape.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { useSyncExternalStore } from 'react';
import { isDark, setDark, subscribeDark } from '@morrow/ui';
import { STORE_KEY, failureReason, guardedStorage, hasFailed, markUnreadable, onStorageFailure, openStorage } from './storage';
import { scheduler, syncNotices } from './notify';
import type { Notice } from '@morrow/core';
import { billing, type BillingResult, type PlanId } from './billing';
import { FUNCTIONS_URL, deleteAccount, functionHeaders, hasSupabase, sessionState, signOut } from './supabase';
import { newDeviceId, pullAll, pushAll, stampAccount, restoreAccount, CLOSED } from './sync';
import { track, analyticsConsent } from './analytics';
import {
  DEFAULT_PROFILE,
  AnthropicProvider,
  LocalProvider,
  buildBookVersion,
  quietFor,
  timesFor,
  weekdayOf,
  reauthorDue,
  reauthorLabel,
  diffBooks,
  applyMemoryEdits,
  buildMemory,
  forgottenLineIds,
  memoryDocument,
  buildDawnBrief,
  buildPlan,
  buildPortrait,
  buildPractice,
  dueOn,
  logOf,
  FEWER_STEPS,
  applyReplan,
  canBuildBlueprint,
  canDeliverOn,
  canReplan,
  reachMilestones,
  quotable,
  composeLetter,
  deliverable,
  detectReturns,
  dueLetters,
  canTakeCoachTurn,
  paywallMoment,
  fewer,
  closedOn,
  movesForDay,
  proposeReplan,
  planNotices,
  type Moment,
  movesOpenOn,
  orderForToday,
  firstRunStep,
  volumeStates,
  type FirstRunStep,
  type VolumeName,
  type VolumeState,
  practiceValue,
  dayOf,
  sealedOn,
  draftLockUntil,
  draftOf,
  guarded,
  isQuotable,
  recutEvents,
  isWorse,
  shouldOfferSupport,
  softenFrom,
  type RiskStamp,
  type EntitlementContext,
  type Gate,
  type PaywallMoment,
  mergeGoalDrafts,
  newId,
  FAULT_CARDS_FULL,
  FAULT_CARDS_STARTER,
  FAULT_FRAMINGS,
  VIRTUE_CARDS_FULL,
  VIRTUE_CARDS_STARTER,
  VIRTUE_FRAMINGS,
  reading,
  screen,
  scoreSpecificity,
  wordCount,
  type AnalysisKind,
  type AuthoringText,
  type BookVersion,
  type Brief,
  type DaySummary,
  type DomainId,
  type Evidence,
  type Goal,
  type MemoryEdit,
  type MemoryLine,
  type GoalAnalysis,
  type Letter,
  type Plan,
  type ReplanChange,
  type Portrait,
  type Practice,
  type PracticeLog,
  type RunnerState,
  type Profile,
  type Persona,
  type SyncBundle,
  type SafetyRisk,
  type Scene,
  type WritingDraft,
  type WritingKind,
  type WritingMode,
  type WritingSessionState,
  type InterviewState,
  type Span,
  type PresentPickRow,
  type PastEpochRow,
  type PastEventRow,
  halfDone,
  formatDay,
  PortraitIncomplete,
  BlueprintInvalid,
  ANALYSIS_TITLES,
  carryForward,
  isReturning,
} from '@morrow/core';

/**
 * The screen fired, and on what.
 *
 * `source` is the row that raised it, so "this was not about me" can clear
 * exactly that row. Without it the appeal always un-flagged the newest
 * flagged sitting, which for a flag raised on a ledger line or a stone was
 * some other piece of writing entirely — or nothing, when no sitting was
 * flagged, leaving the actual row excluded with no way back. The coach chat
 * has no row, so its pause has no source and the appeal only closes the card.
 */
export interface SafetyPause {
  risk: SafetyRisk;
  at: string;
  source?: { kind: 'text' | 'analysis' | 'evidence' | 'day' | 'present' | 'past' | 'lesson' | 'memory' | 'iwill'; id: string } | null;
  /** Asked for by the person ("Need someone?"), not raised by the screen. */
  voluntary?: boolean;
  /** Raised by the remote screen's reading, not the device's own: the text did leave the phone, once. */
  remote?: boolean;
}

/**
 * A volume mid-sitting, so leaving is never losing.
 *
 * The Future volume has had this from the start: the writing room writes a
 * draft to disk as it goes and offers it back. The other two volumes held
 * everything in screen state, so a phone call in the middle of writing about
 * a fault took the writing with it — and the method these come from is
 * explicit that its programs are meant to be done across several sittings.
 */
export interface PresentDraft {
  half: 'faults' | 'virtues';
  /** The cards picked, before any of them is written about. */
  selected: string[];
  /** Whether the writing was open, or the deck, when they left. */
  open: boolean;
  /**
   * The lines typed under each card, by card. A card un-ticked and ticked
   * again comes back with its own words, and never with another card's.
   */
  lines: Record<string, { story: string; apply: string; framingId: string | null; goalId: string | null }>;
  /**
   * The lines under the card up next, whether or not the writing was open:
   * Back to the deck must not be the thing that loses them.
   */
  writing: { cardId: string; story: string; apply: string; framingId: string | null; goalId: string | null } | null;
  updatedAt: string;
}

export interface PastDraft {
  /** Their age, kept only until the periods are cut from it. */
  age: number | null;
  /** Which period the walk is on. */
  cursor: number;
  /** Whether they have pressed on from the picking screen. */
  picked: boolean;
  /** An event named but not yet added, on whichever period is open. */
  title: string;
  /** Periods renamed on the age screen, by period id, until they are cut. */
  labels: Record<string, string>;
  writing: { eventId: string; what: string; shaped: string; believe: string; framingId: string | null } | null;
  updatedAt: string;
}

/**
 * A stone being written. The line, its second half, the paragraph on the long
 * track and the follow-up's own words — all of it typed and none of it in the
 * store until the stone is kept, so a phone call in the middle of one lost
 * the lot. Held per stone, so a draft can only ever return to its own.
 */
export interface StoneDraft {
  goalId: string;
  kind: AnalysisKind;
  framingId: string | null;
  line: string;
  line2: string;
  paragraph: string;
  whenWhere: string;
  updatedAt: string;
}

/**
 * The evening, half written. The one ritual a person does every day, and the
 * one whose words lived only on the screen until the hold sealed them. Held
 * per day: yesterday's half-written proof is not tonight's.
 */
export interface DayDraft {
  day: string;
  word: string;
  proof: string;
  gladOf: string;
  updatedAt: string;
}

/** The Interview mid-way: its state and the steps behind it, so a kill is not a restart. */
export interface InterviewDraft {
  s: InterviewState;
  history: InterviewState[];
  updatedAt: string;
}

/** The read-back's rows mid-way, for the same reason. */
export interface ReadBackRow {
  span: Span;
  state: 'open' | 'kept' | 'dropped';
  name: string;
}

export interface AccountState {
  userId: string;
  email: string | null;
  signedInAt: string;
  /** When the last full push landed, or null if none has yet. */
  lastPushAt: string | null;
  /**
   * Both this device and the account held writing at sign-in and the person
   * has not yet said which copy to keep. Nothing is pushed while this is
   * set; `resolveSignIn` clears it.
   */
  needsChoice?: boolean;
  /** The account was closed (Close the account, on some device) and not yet reopened; nothing is pushed while this is set. */
  closedAt?: string | null;
}

export interface ToastState {
  text: string;
  actionLabel?: string;
  /** Undo handle: the id of whatever changed. */
  undoId?: string;
  kind?: 'park' | 'add' | 'info' | 'capture' | 'shrink';
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
  /** What the OS says, fed in by the root layout. Not persisted. */
  systemDark: boolean;
  /**
   * The app's day, as of the last tick. Not persisted. Every screen works
   * out "today" from the clock in render; nothing re-rendered them when the
   * day changed underneath, so a phone left on Today overnight woke up on
   * yesterday. The root layout ticks this on foreground and at the boundary,
   * and a screen that reads it is rendered again on the new day.
   */
  clockDay: string;
  /** What the root layout found when it handled a sign-in link. Not persisted; the account screen shows it once. */
  signInNotice: string | null;
  /** A newer build has been deployed since this page loaded (the web). Not persisted. */
  newVersionReady: boolean;
  /** The browser-storage notice on Today (Safari clears a site's storage after a week away) was dismissed. Device-only. */
  keepNoticeDismissed: boolean;
  /**
   * This install's name for itself, made once. Device-only: the account's
   * profile row records which device copied last, and this is how a phone
   * knows the stamp is its own across launches (a random id, so two
   * browsers on one laptop are two devices).
   */
  deviceId: string;
  /**
   * When this device last pushed, per account it has been signed into.
   * Kept across sign-out, so signing back in on the same phone is not read
   * as a second device. Device-only.
   */
  lastSync: Record<string, string>;
  books: BookVersion[];
  portraits: Portrait[];
  plans: Plan[];
  practices: Practice[];
  practiceLogs: PracticeLog[];
  evidence: Evidence[];
  days: Record<string, DaySummary>;
  scenes: Scene[];
  briefs: Brief[];
  /** The Present volume: what they picked from the two decks, and what they wrote about each. */
  presentPicks: PresentPickRow[];
  /** The Past volume: the periods of a life, and the events hanging on them. */
  pastEpochs: PastEpochRow[];
  pastEvents: PastEventRow[];
  /** True once the person has walked every period and said they are done listing. */
  pastListed: boolean;
  /** What Morrow knows about me (PRD §7.9): the person's changes to the memory profile. */
  memoryEdits: MemoryEdit[];
  /**
   * Letters from the future self, and to it (PRD §7.8).
   *
   * Written when an occasion arrives and read when their delivery date comes —
   * which for the ones the person writes themselves may be a year away. Kept
   * whole rather than regenerated, because a letter is a thing that was written
   * on a particular day and rewriting it later would make it a template.
   */
  letters: Letter[];
  /**
   * The account, when there is one (PRD §7.12).
   *
   * The device is the truth and the account is the copy, so this holds only
   * what the app needs to say "signed in as" and when the copy last landed.
   * `accountAsked` is the once: the question is put after the Portrait and
   * never again on the way through; Settings has it for whenever.
   */
  account: AccountState | null;
  accountAsked: boolean;
  /** Set when the safety screen fires; the UI shows the resources card. */
  safetyPause: SafetyPause | null;
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
  /**
   * The two first-run steps that used to live only in a screen's state.
   * A phone call, a kill or the OS back gesture mid-Interview restarted it
   * from the first question (NN/g: save state so the process can resume).
   */
  presentDraft: PresentDraft | null;
  pastDraft: PastDraft | null;
  stoneDraft: StoneDraft | null;
  /**
   * The line being written on letting a goal go (PRD §7.3), by goal, until it
   * is kept or the field is closed on purpose. Back never loses it.
   */
  letGoDrafts: Record<string, string>;
  /** A memory line mid-change (PRD §7.9), for the same reason. */
  memoryDraft: { key: string; text: string } | null;
  /**
   * Set-up's answers so far (the rebuild): kept as they are given, so a
   * reload, a kill or the privacy-details detour brings them back. Cleared
   * when set-up finishes.
   */
  setupDraft: { step: number; areas: string[]; custom: string; when: 'morning' | 'evening' | 'any' | null; voice: Persona | null; name: string; sixteen: boolean } | null;
  dayDraft: DayDraft | null;
  /** A letter to the future mid-way, so Back or a kill is not the letter lost. Device-only. */
  letterDraft: { body: string; days: number; updatedAt: string } | null;
  interviewDraft: InterviewDraft | null;
  readBackDraft: { rows: ReadBackRow[]; leftOut?: string; source: string; updatedAt: string } | null;
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
  /** The person's word that the last line, screened as crisis, is not about them: the seal takes it. Reset when the line changes. */
  iWillCleared: boolean;

  // profile
  setProfile: (patch: Partial<Profile>) => void;
  consent: () => void;

  // goals
  addGoals: (
    drafts: { title: string; domain: DomainId; domainLabel?: string; horizon: string; sourceSpan?: string; authored?: boolean }[],
  ) => void;
  renameGoal: (id: string, title: string) => void;
  dropGoal: (id: string) => void;
  /**
   * Day-90 re-authoring (PRD §7.3): "Let it go — the goal is archived with a
   * line about what it taught, written now." The goal stays in the list as
   * archived, with the line, so the next seal can print both on its first
   * page; everything that ran off it stops.
   */
  letGoGoal: (id: string, lesson: string) => void;
  /** A memory line in the person's own words, which the rebuild then never touches. */
  editMemory: (key: string, text: string) => void;
  /** A memory line gone, and its material out of the coach's hands. */
  forgetMemory: (key: string) => void;
  /** The rebuilt line back, in place of the person's edit or forget. */
  restoreMemory: (key: string) => void;
  setLetGoDraft: (goalId: string, text: string | null) => void;
  setMemoryDraft: (draft: { key: string; text: string } | null) => void;
  setSetupDraft: (draft: MorrowState['setupDraft']) => void;
  /** The way back from Let it go, until the edition is sealed. */
  takeBackGoal: (id: string) => void;
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
  /**
   * The person's own identity line, typed by them (PRD §7.4's "Not quite").
   *
   * `identityLineEdited` is what stops the next rebuild proposing over the top
   * of it: the proposal is the app's guess at a clause they wrote, and the
   * moment they write one themselves the guess is retired rather than allowed
   * to come back. Clearing it hands the proposal back.
   */
  editIdentityLine: (goalId: string, line: string) => void;
  /**
   * What a replan would change, for one goal (PRD §7.4).
   *
   * Proposes only; nothing moves until the person accepts a row. Empty when
   * there is nothing worth changing, which is most weeks — a replan that always
   * has a suggestion is a replan nobody trusts.
   */
  proposeReplanFor: (goalId: string) => ReplanChange[];
  /** Apply the rows they accepted, as a new version of the plan. */
  applyReplanFor: (goalId: string, accepted: ReplanChange[]) => { ok: true } | { ok: false; error: string; moment?: PaywallMoment };
  makePortraitAndPlan: (
    goalId: string,
  ) => { ok: true } | { ok: false; error: string; moment?: PaywallMoment; missing?: AnalysisKind[] };

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
   * Each plan whose week is finished rolls into the next, in the person's
   * own moves (see `carryForward`). Run on every open and after a move
   * closes; nothing happens while a move is open or the season is over.
   */
  carryPlansForward: () => number;
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
  /** The move back to its whole self, after a shrink they did not mean. */
  unshrinkMove: (moveId: string) => void;
  addEvidence: (text: string, goalId?: string) => void;
  /** Take a captured line back out of the ledger — the toast's Undo. */
  removeEvidence: (id: string) => void;
  /** `day` is the one the screen opened for: a hold a minute past the boundary still closes that evening. */
  sealDay: (input: { moodWord: string; proof: string; gladOf: string; day?: string }) => void;
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
  /** The primer's "Yes": ask the OS, remember the answer, then schedule. */
  allowNotifications: () => Promise<boolean>;
  /** The primer's "Not now": nothing is scheduled, and the primer never returns. */
  declineNotifications: () => void;
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

  // account (PRD §7.12)
  markAccountAsked: () => void;
  /** Read the session the auth layer holds and remember who it is. */
  setAccount: () => Promise<void>;
  /**
   * Right after signing in: a device with writing pushes it up; an empty
   * device pulls the account's copy down. Never a merge — see src/sync.ts.
   */
  /**
   * After a sign-in: the copy, one way or the other. `conflict` means both
   * this device and the account hold writing and nothing was moved — the
   * account screen offers the two honest choices, through `resolveSignIn`.
   */
  afterSignIn: () => Promise<{ ok: true; pulled: boolean; moved: 'pushed' | 'pulled' | 'nothing' } | { ok: false; error: string; conflict?: true; closed?: true }>;
  /** Reopen an account closed inside its week, then carry on as a sign-in would. */
  reopenAccount: () => Promise<{ ok: true; pulled: boolean; moved: 'pushed' | 'pulled' | 'nothing' } | { ok: false; error: string; conflict?: true; closed?: true }>;
  /** The person's answer to a conflict: bring the account's Book here, or replace the account's copy with this device's. */
  resolveSignIn: (choice: 'pull' | 'push') => Promise<{ ok: true; pulled: boolean; moved: 'pushed' | 'pulled' | 'nothing' } | { ok: false; error: string }>;
  /** Everything on the device, up. Safe to call on every launch. */
  /** `conflict`: another device copied to the account since this one last did; `resolveSignIn` is the answer. */
  pushToAccount: () => Promise<{ ok: true } | { ok: false; error: string; conflict?: true }>;
  signOutAccount: () => Promise<void>;
  /** The account and its copy, gone. The device keeps everything. */
  deleteAccountAndCopy: () => Promise<{ ok: true } | { ok: false; error: string }>;

  // ui
  /**
   * The Present volume. A pick is written in one go — the card, the story and
   * the answer — so a half-written one never reaches the Book; the screen keeps
   * its own draft until then.
   */
  savePresentPick: (pick: {
    half: 'faults' | 'virtues';
    cardId: string;
    storyLine: string;
    applyLine: string;
    framingId: string | null;
    goalId: string | null;
    rank: number;
  }) => void;
  dropPresentPick: (cardId: string, half: 'faults' | 'virtues') => void;
  /** The deck's order becomes the half's order, so "2 of 3" and the Book's page agree. */
  rankPresentPicks: (half: 'faults' | 'virtues', order: string[]) => void;

  /** The Past volume's three moves. */
  setPastEpochs: (epochs: { id: string; label: string; fromAge: number; toAge: number }[]) => void;
  setPastListed: (listed: boolean) => void;
  addPastEvent: (epochId: string, title: string, weight: 'helped' | 'hurt') => void;
  dropPastEvent: (id: string) => void;
  choosePastEvent: (id: string, analysed: boolean) => void;
  savePastAnalysis: (
    id: string,
    fields: { whatHappened: string; shapedMe: string; stillBelieve: string },
  ) => void;
  setPastJoinsBook: (id: string, joins: boolean) => void;

  setToast: (t: ToastState | null) => void;
  /** Note the day the clock says. A change re-renders every screen that reads `clockDay`. */
  tickClock: () => void;
  setSignInNotice: (text: string | null) => void;
  setNewVersionReady: (ready: boolean) => void;
  dismissKeepNotice: () => void;
  clearSafety: () => void;
  /** The helplines card, asked for. No pause, no "not about me". */
  showResources: () => void;
  /** Written as the person types, the way the writing room's draft is. */
  saveStoneDraft: (draft: Omit<StoneDraft, 'updatedAt'>) => void;
  clearStoneDraft: () => void;
  saveDayDraft: (draft: Omit<DayDraft, 'updatedAt'>) => void;
  saveLetterDraft: (draft: { body: string; days: number } | null) => void;
  clearDayDraft: () => void;
  savePresentDraft: (draft: Omit<PresentDraft, 'updatedAt'>) => void;
  clearPresentDraft: () => void;
  savePastDraft: (draft: Omit<PastDraft, 'updatedAt'>) => void;
  clearPastDraft: () => void;
  saveInterviewDraft: (s: InterviewState, history: InterviewState[]) => void;
  clearInterviewDraft: () => void;
  saveReadBackDraft: (rows: ReadBackRow[], source: string, leftOut?: string) => void;
  clearReadBackDraft: () => void;
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
const EDGE_URL = (process.env.EXPO_PUBLIC_MORROW_API ?? '').trim() || FUNCTIONS_URL;

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

export const ai = guarded(
  hasRemoteProvider
    ? // Every function is deployed with verify_jwt on, so each call carries
      // the session's token — or the anon key when nobody is signed in,
      // which is enough for the read-back and the screen.
      new AnthropicProvider({ endpoint: EDGE_URL, headers: functionHeaders })
    : new LocalProvider(),
  {
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
  systemDark: false,
  clockDay: '',
  signInNotice: null as string | null,
  newVersionReady: false,
  keepNoticeDismissed: false,
  deviceId: '',
  lastSync: {} as Record<string, string>,
  books: [] as BookVersion[],
  portraits: [] as Portrait[],
  plans: [] as Plan[],
  practices: [] as Practice[],
  practiceLogs: [] as PracticeLog[],
  evidence: [] as Evidence[],
  days: {} as Record<string, DaySummary>,
  scenes: [] as Scene[],
  briefs: [],
  presentPicks: [],
  pastEpochs: [],
  pastEvents: [],
  pastListed: false,
  memoryEdits: [],
  letters: [],
  account: null,
  accountAsked: false,
  safetyPause: null,
  concernAt: null,
  coachTurns: {},
  toast: null,
  presentDraft: null,
  pastDraft: null,
  stoneDraft: null,
  letGoDrafts: {},
  memoryDraft: null,
  setupDraft: null,
  dayDraft: null,
  letterDraft: null,
  interviewDraft: null,
  readBackDraft: null,
  fullTrackInvited: false,
  bookTitle: '',
  bookTitleFraming: null,
  iWill: '',
  iWillCleared: false,
};

const store = create<MorrowState>()(
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
          // Over the goals in play only. A goal let go at a re-authoring keeps
          // its row, and a new goal named the same way is a new goal — merged
          // into the archived row it would never appear anywhere.
          // In rank order, whatever order the array is in: `mergeGoalDrafts`
          // ranks by position, and a pulled or rehydrated array may not agree
          // with its rank field.
          const live = activeGoals(s);
          const archived = s.goals.filter((g) => g.status === 'archived');
          const merged = mergeGoalDrafts(
            live.map((g) => ({ ...g, titleAuthored: g.titleAuthored !== false })),
            drafts,
          );
          const byName = new Map(live.map((g) => [g.title.trim().toLowerCase(), g]));
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
          return { goals: [...goals, ...archived] };
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
        set((s) => withToday(s, {
          goals: denseRanks(s.goals.filter((g) => g.id !== id)),
          analyses: s.analyses.filter((a) => a.goalId !== id),
          letGoDrafts: Object.fromEntries(Object.entries(s.letGoDrafts).filter(([k]) => k !== id)),
          plans: s.plans.filter((p) => p.goalId !== id),
          portraits: s.portraits.filter((p) => p.goalId !== id),
          scenes: s.scenes.filter((sc) => sc.goalId !== id),
          // A practice built from this goal's line is archived, not deleted:
          // its runs are days that happened, and they stay in the log the
          // same way the ledger rows stay. Left active, it kept appearing on
          // Today with nothing behind it to tap through to.
          practices: s.practices.map((p) =>
            p.goalId === id && !p.archivedAt ? { ...p, archivedAt: new Date().toISOString() } : p,
          ),
          evidence: s.evidence.map((e) => (e.goalId === id ? { ...e, goalId: null } : e)),
        })),

      letGoGoal: (id, lesson) => {
        const at = new Date().toISOString();
        const line = lesson.trim();
        // Free text like every other: screened, and a crisis line raises the
        // same resources card the stones do. The line stays theirs either way.
        const risk = screen(line);
        set((s) => {
          const goals = s.goals.map((g) =>
            g.id === id ? { ...g, status: 'archived' as const, lesson: line, letGoAt: at, lessonRisk: risk.risk } : g,
          );
          const { [id]: _draft, ...letGoDrafts } = s.letGoDrafts;
          return withToday(s, {
            // Ranks stay dense over the goals in play: `analysisPlan` gives
            // the full five stones to `rank < 3`, and an archived goal holding
            // a slot pushed a live one past it.
            goals: denseRanks(goals),
            // Its practices stop, the same way as under dropGoal: their runs
            // are days that happened and stay in the log. Stamped with the same
            // instant as the goal, so taking it back can find exactly these.
            practices: s.practices.map((p) => (p.goalId === id && !p.archivedAt ? { ...p, archivedAt: at } : p)),
            letGoDrafts,
            safetyPause: risk.risk === 'crisis' ? pauseOn(risk.risk, 'lesson', id) : s.safetyPause,
          });
        });
      },

      // As typed, spaces and returns included: a controlled field that
      // refuses a first keystroke reads as broken. The readers trim.
      setLetGoDraft: (goalId, text) =>
        set((s) => {
          if (text === null) {
            const { [goalId]: _gone, ...rest } = s.letGoDrafts;
            return { letGoDrafts: rest };
          }
          return { letGoDrafts: { ...s.letGoDrafts, [goalId]: text } };
        }),
      setMemoryDraft: (draft) => set({ memoryDraft: draft }),
      setSetupDraft: (draft) => set({ setupDraft: draft }),

      editMemory: (key, text) => {
        const line = text.trim();
        if (!line) return;
        const risk = screen(line);
        set((s) => ({
          memoryEdits: [
            ...s.memoryEdits.filter((e) => e.key !== key),
            { key, text: line, editedAt: new Date().toISOString(), ...(risk.risk !== 'none' ? { risk: risk.risk } : {}) },
          ],
          memoryDraft: s.memoryDraft?.key === key ? null : s.memoryDraft,
          safetyPause: risk.risk === 'crisis' ? pauseOn(risk.risk, 'memory', key) : s.safetyPause,
        }));
      },
      forgetMemory: (key) =>
        set((s) => ({
          memoryEdits: [...s.memoryEdits.filter((e) => e.key !== key), { key, text: null, editedAt: new Date().toISOString() }],
        })),
      restoreMemory: (key) => set((s) => ({ memoryEdits: s.memoryEdits.filter((e) => e.key !== key) })),

      takeBackGoal: (id) =>
        set((s) => {
          const goal = s.goals.find((g) => g.id === id);
          if (!goal || goal.status !== 'archived') return {};
          const at = goal.letGoAt;
          const liveCount = s.goals.filter((g) => g.status !== 'archived').length;
          return withToday(s, {
            goals: denseRanks(
              s.goals.map((g) => {
                if (g.id !== id) return g;
                const { lesson: _lesson, letGoAt: _letGoAt, lessonRisk: _risk, ...rest } = g;
                return { ...rest, status: 'active' as const, rank: liveCount };
              }),
            ),
            practices: s.practices.map((p) => (p.goalId === id && at && p.archivedAt === at ? { ...p, archivedAt: null } : p)),
          });
        }),

      rankGoals: (ids) =>
        set((s) => ({
          goals: s.goals
            .map((g) => ({ ...g, rank: ids.indexOf(g.id) === -1 ? g.rank : ids.indexOf(g.id) }))
            .sort((a, b) => a.rank - b.rank),
        })),

      saveText: (kind, body, mode, seconds) => {
        // Nothing is nothing: an empty text was counted as the future
        // written, hid an earlier real one from the read-back (the newest
        // wins), and finished a Book that opened on an empty quote.
        if (!body.trim()) return null;
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
            safetyPause: risk.risk === 'crisis' ? pauseOn(risk.risk, 'text', text.id) : s.safetyPause,
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
                // Raised by the service's reading, and the card says so.
                safetyPause: second.risk === 'crisis' ? { ...pauseOn(second.risk, 'text', text.id), remote: true } : s.safetyPause,
              }));
            })
            .catch(() => {
              // No network, no key, no answer. The local screen stands, and it
              // is the over-sensitive one, so failing this way is safe.
            });
        }

        // A crisis result never returns the text onward for read-back.
        if (risk.risk !== 'crisis') {
          track({ name: 'sitting_completed', kind, mode, words: text.wordCount, seconds: text.secondsWriting, track: get().profile.track });
        }
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
        const screened = screen([line, input.line2 ?? '', input.paragraph ?? ''].join(' '));
        const spec = scoreSpecificity(input.paragraph?.trim() || line);
        set((s) => {
          const existing = s.analyses.find((a) => a.goalId === goalId && a.kind === kind);
          // The verdict belongs to the words it was given. The stone screen
          // writes on Back whether or not anything was typed, so an appealed
          // line ("This was not about me") was screened again on the way
          // out and re-flagged. The same three texts keep the verdict they
          // have; changed ones are screened afresh.
          const unchanged =
            existing !== undefined &&
            existing.line === line &&
            (existing.line2 ?? '') === (input.line2?.trim() ?? '') &&
            (existing.paragraph ?? '') === (input.paragraph?.trim() ?? '');
          const risk = unchanged ? { risk: existing.safetyRisk ?? screened.risk } : screened;
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
            safetyPause: !unchanged && risk.risk === 'crisis' ? pauseOn(risk.risk, 'analysis', row.id) : s.safetyPause,
          };
        });
      },

      setBookTitle: (t) => set({ bookTitle: t }),
      setBookTitleFraming: (f) => set({ bookTitleFraming: f }),
      setIWill: (t) => set((s) => ({ iWill: t, iWillCleared: s.iWillCleared && t.trim() === s.iWill.trim() })),

      sealBook: () => {
        const s = get();
        // The "I will" line is the most-quoted line in the product — the
        // lock screen after three days away, the Returns card, the Celebrate
        // chip, the memory screen — and it was the one free-text line never
        // screened. Screened here, before the seal, and refused with the
        // resources card when it lands in the crisis band; the person's own
        // word that it is not about them ("This was not about me") lets the
        // same line through.
        const lastLine = screen(s.iWill);
        if (lastLine.risk === 'crisis' && !s.iWillCleared) {
          set({ safetyPause: pauseOn(lastLine.risk, 'iwill', 'iwill') });
          return { ok: false, error: 'The last line can wait. What is on the card above matters more tonight.' };
        }
        // Writing done in crisis stays on the device but is never sealed into
        // the Book. It is theirs to keep and to export; it is not material.
        const ideal = latestText(s.texts, 'ideal');
        const shadow = latestText(s.texts, 'shadow');
        const additions = s.texts.filter((t) => t.kind === 'addition' && isQuotable(t)).map((t) => t.body);
        try {
          const built = buildBookVersion(
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
              // A goal let go is not in the new edition; it is on its first
              // page, under "let go", with the line written about it.
              goals: activeGoals(s),
              // Only lines the screen let through; the engine checks too.
              analyses: quotable(s.analyses),
              // The other two volumes, if they have anything in them. A card's
              // sentence travels with the entry so the Book can print it as the
              // heading it is; the engine counts only the two lines beneath.
              ...(s.presentPicks.length
                ? {
                    present: {
                      entries: s.presentPicks
                        .filter((p) => isQuotable(p) && p.storyLine.trim() && p.applyLine.trim())
                        .sort((a, b) => a.rank - b.rank)
                        .map((p) => ({
                          half: p.half,
                          card: cardText(p.cardId),
                          ...(framingLabelFor(p.framingId) ? { framing: framingLabelFor(p.framingId)! } : {}),
                          story: p.storyLine,
                          apply: p.applyLine,
                          ...(p.goalId ? { goalName: s.goals.find((g) => g.id === p.goalId)?.title ?? '' } : {}),
                        })),
                    },
                  }
                : {}),
              // Only the ones the person put in, and never one written in crisis
              // — the same rule as every other line in the Book.
              ...(s.pastEvents.some((v) => v.joinsBook)
                ? {
                    past: {
                      entries: s.pastEvents
                        .filter((v) => v.joinsBook && v.analysed && isQuotable(v))
                        .map((v) => ({
                          period: s.pastEpochs.find((e) => e.id === v.epochId)?.label ?? '',
                          title: v.title,
                          whatHappened: v.whatHappened,
                          shapedMe: v.shapedMe,
                          stillBelieve: v.stillBelieve,
                        })),
                    },
                  }
                : {}),
            },
            newId,
          );
          // Every edition after the first opens on what changed (PRD §7.3).
          // The comparison needs the built chapters, so it runs after the
          // build and is laid onto it; the engine's ratio does not count the
          // diff on either side, and neither does the server's.
          const previous = s.books[s.books.length - 1];
          const lessons = previous
            ? s.goals
                .filter((g) => g.status === 'archived' && g.letGoAt && g.letGoAt > previous.sealedAt && g.lessonRisk !== 'crisis')
                .map((g) => ({ name: g.title, line: g.lesson ?? '' }))
            : [];
          const book: BookVersion = previous ? { ...built, diff: diffBooks(previous, built, lessons) } : built;
          set((st) => ({
            books: [...st.books, book],
            // The re-authoring is over; a line typed on letting go and never
            // kept does not wait for the next one.
            letGoDrafts: {},
            goals: st.goals.map((g) => (g.status === 'authored' ? { ...g, status: 'active' as const } : g)),
          }));
          track({ name: 'book_sealed', edition: book.version, goals: book.chapters.length, track: book.track, authorship: book.authorshipRatio });
          if (book.version === 1) track({ name: 'first_value', kind: 'book_sealed' });
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
      proposeReplanFor: (goalId) => {
        const s = get();
        const plan = s.plans.find((p) => p.goalId === goalId);
        if (!plan) return [];
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        // The last seven days of this plan's own work, not the whole app's:
        // a replan for one goal argued from another goal's week would be the
        // app telling somebody they are behind on the wrong thing.
        // `days[].planned` counts every plan's moves and every practice, so
        // a second goal's busy week used to be argued against this one. Only
        // this plan's own moves count: the ones asked for in the window, by
        // the same rule that scores a day.
        const boundary = s.profile.dayBoundaryHour;
        const since = shiftDay(day, -7);
        let week = 0;
        for (let d = shiftDay(since, 1); d <= day; d = shiftDay(d, 1)) week += movesForDay(plan.moves, d, boundary).length;
        const kept = plan.moves.filter((m) => m.status === 'done' && (closedOn(m, boundary) ?? '') > since).length;
        // With no scored day in the window, what was actually asked for by
        // today — not the whole plan, most of which is still ahead.
        const asked = plan.moves.filter((m) => m.scheduledFor && m.scheduledFor <= day).length;
        return proposeReplan(plan, {
          done: kept,
          planned: Math.max(kept, week > 0 ? week : asked),
          newId,
          today: day,
        });
      },

      applyReplanFor: (goalId, accepted) => {
        if (accepted.length === 0) return { ok: false, error: 'Nothing was accepted, so nothing changed.' };
        const s = get();
        const plan = s.plans.find((p) => p.goalId === goalId);
        if (!plan) return { ok: false, error: 'That plan is gone.' };
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        // PRD §13.3: one replan a month on the free plan. Proposing was never
        // gated and still is not; applying is, and the proposal keeps.
        const gate = canReplan(entitlementOf(s, day));
        if (!gate.allowed) return { ok: false, error: gate.reason, moment: gate.moment };
        try {
          // A new version, not an edit in place: the plan they had is a record
          // of what they decided last time, and a replan is a second decision
          // rather than a correction of the first.
          const next = applyReplan(
            plan,
            accepted,
            newId,
            s.analyses.filter((a) => a.goalId === goalId),
            day,
          );
          const stamped = new Date().toISOString();
          set((st) => {
            const plans = st.plans.map((p) =>
              p.goalId === goalId
                ? {
                    ...next,
                    version: plan.version + 1,
                    status: 'active' as const,
                    replannedAt: [...(plan.replannedAt ?? []), stamped],
                  }
                : p,
            );
            // Every day a move was dated on, before and after: a move
            // re-dated off today leaves today's tally, and lands on its new day's.
            const touched = new Set<string>([day]);
            for (const m of [...plan.moves, ...next.moves]) if (m.scheduledFor) touched.add(m.scheduledFor);
            let days = st.days;
            const live = livePlans({ ...st, plans });
            for (const d of touched) if (d <= day) days = recomputeDay({ ...st, days }, live, st.evidence, d);
            return { plans, days };
          });
          return { ok: true };
        } catch (err) {
          // `applyReplan` re-validates: an accepted row that would put a move
          // in the past, or leave one with no line of theirs behind it, is
          // refused here rather than stored and discovered on Today.
          return { ok: false, error: err instanceof Error ? err.message : 'That change did not hold up.' };
        }
      },

      editIdentityLine: (goalId, line) =>
        set((s) => ({
          portraits: s.portraits.map((p) =>
            p.goalId === goalId
              ? {
                  ...p,
                  identityLine: line.trim(),
                  // Their sentence needs no framing in front of it. The framing
                  // exists to make the app's fragment grammatical, and printing
                  // it over somebody's own line would put the app's words at the
                  // head of the one sentence on the screen that is theirs.
                  identityFraming: line.trim() ? null : p.identityFraming,
                  identityLineEdited: line.trim().length > 0,
                }
              : p,
          ),
        })),

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
        // Only lines the screen let through. A stone in the crisis band is
        // excluded from the Book and the brief; it must not be the one the
        // Portrait quotes or the plan is cut from either.
        const analyses = quotable(s.analyses.filter((a) => a.goalId === goalId));
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
                  // A milestone with no proof takes the line; one whose proof
                  // came from this same line takes the rewrite. The stone can
                  // be edited, and a milestone that kept the first draft after
                  // the person changed it was quoting words they had retracted.
                  milestones: existingPlan.milestones.map((ms) =>
                    !ms.proofSourceLineId || ms.proofSourceLineId === monitoring.id
                      ? { ...ms, proof: monitoring.line.trim(), proofSourceLineId: monitoring.id }
                      : ms,
                  ),
                }
              : existingPlan;

          set((st) => ({
            portraits: [...st.portraits.filter((p) => p.goalId !== goalId), portrait],
            plans: refreshed
              ? st.plans.map((p) => (p.goalId === goalId ? refreshed : p))
              : [...st.plans, plan],
          }));
          if (!refreshed) track({ name: 'blueprint_built', moves: plan.moves.length, milestones: plan.milestones.length });
          return { ok: true };
        } catch (err) {
          // In the app's words, never the engine's: "Portrait needs
          // strategies, obstacles" was printed on the finish screen as the
          // reason, internal names and all.
          if (err instanceof PortraitIncomplete) {
            const names = err.missing.map((k) => ANALYSIS_TITLES[k]);
            return {
              ok: false,
              error: `Needs ${names.length === 1 ? 'its' : 'two more'} ${names.join(' and ')} ${names.length === 1 ? 'line' : 'lines'}.`,
              missing: err.missing,
            };
          }
          if (err instanceof BlueprintInvalid) {
            return { ok: false, error: 'Nothing to plan from yet: the How line is not written.', missing: ['strategies'] };
          }
          return { ok: false, error: 'The plan could not be built.' };
        }
      },

      addPractice: (input) => {
        const s = get();
        const source = s.analyses.find(
          (a) => a.goalId === input.goalId && a.kind === 'strategies' && a.line.trim() && isQuotable(a),
        );
        if (!source) {
          set({ toast: { text: 'Write how you’ll do this goal first — the How stone.', kind: 'info' } });
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
        set((st) => {
          const practices = st.practices.map((p) => (p.id === id ? { ...p, archivedAt: new Date().toISOString() } : p));
          return { practices, days: recomputeToday({ ...st, practices }) };
        }),

      logRun: (runner) => {
        const s = get();
        const practice = s.practices.find((p) => p.id === runner.practiceId);
        if (!practice) return;
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        // One log per practice per day: doing it twice is still one day of
        // having done it, and two rows would count it twice in the score.
        // The day's log keeps its id when it is replaced, so the copy on the
        // account is the same row updated and not a second one the server's
        // (practice, day) constraint refuses.
        const existing = s.practiceLogs.find((l) => l.practiceId === practice.id && l.day === day);
        const fresh = logOf(runner, practice, day, existing ? () => existing.id : newId);
        // Never lower than what the day already holds. The runner writes on
        // every backgrounding, so a routine finished in the morning and opened
        // again at night — then interrupted by a notification on step one —
        // used to be recorded as step one, and the day lost its credit.
        // A finished full run outranks a finished two-minute one; a full run
        // interrupted on step one does not, or the day's credit fell.
        const upgrade = existing?.minimal && !fresh.minimal && fresh.stepsTotal > 0 && fresh.stepsDone >= fresh.stepsTotal;
        if (existing && !upgrade && practiceValue(existing) >= practiceValue(fresh)) return;
        const log = fresh;
        const logs = [...s.practiceLogs.filter((l) => l.id !== existing?.id), log];

        // A finished practice is proof, and proof belongs in the ledger in the
        // person's own words - the step titles are cut from their line.
        const evidence =
          log.stepsDone > 0
            ? [
                ...s.evidence.filter(
                  (e) => !(e.kind === 'practice' && (e.practiceId ?? e.moveId) === practice.id && e.day === day),
                ),
                {
                  id: newId('ev'),
                  goalId: practice.goalId,
                  practiceId: practice.id,
                  kind: 'practice' as const,
                  text: log.minimal ? practice.minVersion : practice.title,
                  day,
                  createdAt: new Date().toISOString(),
                },
              ]
            : s.evidence;

        set({ practiceLogs: logs, evidence, days: recomputeDay(s, livePlans(s), evidence, day, logs) });
      },

      makeScene: async (goalId, type) => {
        const s = get();
        const existing = s.scenes.find((sc) => sc.goalId === goalId && sc.type === type);
        if (existing) return { ok: true as const, scene: existing };

        const goal = s.goals.find((g) => g.id === goalId);
        if (!goal) return { ok: false as const, reason: 'no-goal' as const };

        // Built from their own material and nothing else: the Impact line for
        // who else it changes, and the Fifteen for the texture of the morning.
        const impact = s.analyses.find((a) => a.goalId === goalId && a.kind === 'impact' && a.line.trim() && isQuotable(a));
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

      setMoveStatus: (moveId, status) => {
        set((s) => {
          const boundary = s.profile.dayBoundaryHour;
          const day = dayOf(new Date(), boundary);
          let title = '';
          let done = '';

          // Every day this change touches, not only today. Undoing a move that
          // was kept on an earlier day removed that day's ledger row and left
          // its score exactly where it was, so the number went on counting work
          // whose record had just been deleted.
          const before = s.plans.flatMap((p) => p.moves).find((m) => m.id === moveId);
          // The same status twice is nothing — a double tap, or a Today and a
          // Goal screen both wired to the same stone. Appending a second
          // ledger row for it doubled the day's evidence count and the
          // ledger's length.
          if (!before || before.status === status) return {};
          const touched = new Set<string>([day]);
          // The day it was counted on (closedOn prefers the day stamped at
          // the time), not the instant worked out again in today's zone.
          const was = closedOn(before, boundary);
          if (was) touched.add(was);
          if (before?.scheduledFor) touched.add(before.scheduledFor);

          const plans = s.plans.map((p) => ({
            ...p,
            moves: p.moves.map((m) => {
              if (m.id !== moveId) return m;
              title = m.title;
              // What was actually done: the small version when it was in
              // force, as a practice run records its two-minute version.
              done = m.doingMinVersion && m.minVersion ? m.minVersion : m.title;
              return {
                ...m,
                status,
                // A move brought forward from a later day and parked is
                // parked today, not on its own day: scored there, it wrote
                // "not today" into a day that had not begun and closed it.
                ...(status === 'skip' && m.scheduledFor && m.scheduledFor > day ? { scheduledFor: day } : {}),
                completedAt: status === 'done' ? new Date().toISOString() : null,
                // The day, as the app counted it here and now. Worked out
                // again later from the instant, a move kept at 22:00 in
                // New York belonged to the next day once the phone was in
                // London, and the day's count could take it twice.
                completedOn: status === 'done' ? day : null,
              };
            }),
          }));
          const ev =
            status === 'done'
              ? [
                  ...s.evidence.filter((e) => e.moveId !== moveId),
                  {
                    id: newId('ev'),
                    goalId: plans.find((p) => p.moves.some((m) => m.id === moveId))?.goalId ?? null,
                    moveId,
                    kind: 'move' as const,
                    text: done || title,
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
          // The goals in play only, the same as every other write to the day.
          const live = livePlans({ ...s, plans });
          for (const d of touched) days = recomputeDay({ ...s, days }, live, ev, d);
          return { plans, evidence: ev, days };
        });
        get().carryPlansForward();
      },

      carryPlansForward: () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        const live = new Set(livePlans(s).map((p) => p.id));
        let rolled = 0;
        const plans = s.plans.map((p) => {
          if (!live.has(p.id)) return p;
          const next = carryForward(p, day, newId);
          if (!next) return p;
          rolled += next.length;
          return { ...p, moves: [...p.moves, ...next] };
        });
        if (rolled > 0) set({ plans });
        return rolled;
      },

      addMove: (goalId, title, minutes, opts) => {
        const s = get();
        const clean = title.trim();
        if (!clean) return false;
        const plan = s.plans.find((p) => p.goalId === goalId);
        // The caller's line wins when it is real: a move offered by the coach
        // already knows which sentence it came from, and re-deriving it here
        // attributed the move to whatever Strategies line happened to belong
        // to the goal being written to.
        // And only a line the screen let through, as addPractice and the
        // plan builder require: this was the one path by which a flagged
        // line reached Today's Now card and the morning brief.
        const given = opts?.sourceLineId
          ? s.analyses.find((a) => a.id === opts.sourceLineId && a.goalId === goalId && isQuotable(a))
          : undefined;
        const source = given ?? s.analyses.find((a) => a.goalId === goalId && a.kind === 'strategies' && a.line.trim() && isQuotable(a));
        if (!source) {
          // Without a line of theirs behind it there is no move.
          set({ toast: { text: 'Write how you’ll do this goal first — the How stone.', kind: 'info' } });
          return false;
        }
        if (!plan) {
          // The line is written; the plan is not built (the free plan builds
          // one). The sheet says so itself, with the door to Pro — this used
          // to be a toast about the How stone they had just written.
          return false;
        }
        // Ordered before every move the plan already has, so it is the first
        // of this goal's moves on Today — under an intention already said
        // this morning, which Today keeps first, and under the moves of any
        // goal ranked above it. The sheet promises only what always holds:
        // "On Today, under <goal>".
        const topOrder = Math.min(0, ...plan.moves.map((m) => m.order)) - 1;
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
          order: topOrder,
        };
        set((st) => {
          const plans = st.plans.map((p) => (p.id === plan.id ? { ...p, moves: [...p.moves, move] } : p));
          return {
            plans,
            // Today asks for one more: the day's tally says so at once.
            days: recomputeDay(st, livePlans({ ...st, plans }), st.evidence, move.scheduledFor as string),
            toast: { text: `Added · ${clean}`, kind: 'add' },
          };
        });
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
          // With a way back (PRD §11.4: an action written to Today "when the
          // user agrees"): the chip was the ask, and Undo is the second look.
          toast: { text: `The small version it is · ${move.title}`, kind: 'shrink', undoId: moveId },
        }));
        return true;
      },

      unshrinkMove: (moveId) =>
        set((st) => ({
          plans: st.plans.map((p) => ({
            ...p,
            moves: p.moves.map((m) => (m.id === moveId ? { ...m, doingMinVersion: false } : m)),
          })),
        })),

      addEvidence: (text, goalId) =>
        set((s) => {
          const clean = text.trim();
          if (!clean) return {};
          const day = dayOf(new Date(), s.profile.dayBoundaryHour);
          const risk = screen(clean);
          const row = {
            id: newId('ev'),
            goalId: goalId ?? null,
            kind: 'capture' as const,
            text: clean,
            day,
            safetyRisk: risk.risk,
            createdAt: new Date().toISOString(),
          };
          const evidence = [...s.evidence, row];
          return {
            evidence,
            days: recomputeDay(s, livePlans(s), evidence, day),
            safetyPause: risk.risk === 'crisis' ? pauseOn(risk.risk, 'evidence', row.id) : s.safetyPause,
            // Filed with undo (PRD 7.6). A flagged line raises the card
            // instead and is not announced.
            toast: risk.risk === 'crisis' ? s.toast : { text: 'Kept in the ledger.', kind: 'capture', undoId: row.id },
          };
        }),

      removeEvidence: (id) =>
        set((s) => {
          const row = s.evidence.find((e) => e.id === id);
          if (!row || row.kind !== 'capture') return {};
          const evidence = s.evidence.filter((e) => e.id !== id);
          return { evidence, days: recomputeDay(s, livePlans(s), evidence, row.day), toast: null };
        }),

      sealDay: ({ moodWord, proof, gladOf, day: forDay }) =>
        set((s) => {
          const day = forDay ?? dayOf(new Date(), s.profile.dayBoundaryHour);
          // The proof line is typed at night, is free text, and the coach reads
          // it back the next morning as "and you wrote …". It gets the same
          // screen as everything else the app quotes.
          const text = proof.trim();
          const glad = gladOf.trim();
          // Changed text, not non-empty text: the closing screen opens on
          // what was written, so a mood word changed on a re-close used to
          // screen the same proof again and re-raise an appealed verdict.
          const prev = s.days[day];
          const priorRow = s.evidence.find((e) => e.kind === 'seal' && e.day === day);
          const proofChanged = text.length > 0 && text !== (prev?.proof ?? '');
          const gladChanged = glad.length > 0 && glad !== (prev?.gladOf ?? '');
          const wrote = proofChanged || gladChanged;
          // Each field screened on its own, so the ledger row carries the
          // proof's verdict and not the glad line's.
          const worst = (a: SafetyRisk, b: SafetyRisk): SafetyRisk => (a === 'crisis' || b === 'crisis' ? 'crisis' : a === 'concern' || b === 'concern' ? 'concern' : 'none');
          const proofRisk: SafetyRisk = proofChanged ? screen(text).risk : (priorRow?.safetyRisk ?? prev?.safetyRisk ?? 'none');
          const gladRisk: SafetyRisk = gladChanged ? screen(glad).risk : 'none';
          const risk = { risk: worst(proofRisk, gladRisk) };
          // A second close of the same day is an edit of the first: the
          // screen opens on what was written, so a changed sentence is the
          // same line corrected, and the day's one proof row takes the new
          // words under its own id (the account copy updates rather than
          // doubling). A blank field keeps what was written before rather
          // than nulling it. The first version of this replaced the day's
          // earlier proof line outright, which is the one kind of loss this
          // store exists to prevent; the second appended a row per edit, so
          // a typo fixed a minute later was two entries in the ledger for
          // good, and a letter could quote the discarded one.
          const mine = s.evidence.find((e) => e.kind === 'seal' && e.day === day);
          const evidence = !text
            ? s.evidence
            : mine
              ? s.evidence.map((e) => (e.id === mine.id ? { ...e, text, safetyRisk: proofRisk } : e))
              : [
                  ...s.evidence,
                  {
                    id: newId('ev'),
                    goalId: null,
                    kind: 'seal' as const,
                    text,
                    day,
                    safetyRisk: proofRisk,
                    createdAt: new Date().toISOString(),
                  },
                ];
          const days = recomputeDay(s, livePlans(s), evidence, day);
          const existing = days[day];
          if (existing) {
            days[day] = {
              ...existing,
              sealedAt: new Date().toISOString(),
              moodWord: moodWord || existing.moodWord || null,
              proof: text || existing.proof || null,
              gladOf: glad || existing.gladOf || null,
              // The verdict belongs to the words it was given. With nothing
              // new written the old one stands — including one the person
              // has already appealed, which re-screening would re-raise.
              ...(wrote ? { safetyRisk: risk.risk } : {}),
            };
          }
          return {
            evidence,
            days,
            safetyPause: wrote && risk.risk === 'crisis' ? pauseOn(risk.risk, 'day', day) : s.safetyPause,
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

      allowNotifications: async () => {
        const sched = await scheduler();
        // A build with no scheduler (the web) has nothing to ask the OS for;
        // the setting is kept as the person left it.
        if (!sched.real) {
          set((s) => ({ profile: { ...s.profile, notificationsAsked: true, notificationsOff: false } }));
          return true;
        }
        const granted = await sched.request().catch(() => false);
        set((s) => ({ profile: { ...s.profile, notificationsAsked: true, notificationsOff: !granted } }));
        if (granted) await get().syncNotifications();
        return granted;
      },
      declineNotifications: () => set((s) => ({ profile: { ...s.profile, notificationsAsked: true, notificationsOff: true } })),
      syncNotifications: async () => {
        const s = get();
        const day = dayOf(new Date(), s.profile.dayBoundaryHour);
        // Not while the one paywall moment is still owed. The first thing worth
        // scheduling appears the moment the first plan exists, which is the
        // same moment the paywall opens; asking for notification permission
        // over the top of it is two prompts on the one screen that should have
        // none. The next launch or foreground is soon enough.
        if (paywallMoment(entitlementOf(s, day))) return { scheduled: 0, cancelled: 0, silent: true };
        const daysArr = Object.values(s.days);
        // Days since anything at all was logged. A person who has never logged
        // anything is not "away": they have not started, and the day-three
        // nudge is for coming back, not for arriving.
        const lastActive = daysArr
          .filter((d) => d.done > 0 || d.evidenceCount > 0 || d.sealedAt)
          .map((d) => d.day)
          .sort()
          .pop();

        // A week ahead, not just today. The sync runs when the app is opened,
        // and a person who closes Monday at 22:00 and puts the phone down has
        // no Tuesday morning line unless Tuesday was planned on Monday night:
        // planned for the day of the open only, the morning line, the Sunday
        // reading and the day-three word never reached anybody. Each day is
        // planned as if nothing happens between now and then — the next open
        // replans, and whatever it no longer wants is cancelled below.
        const plans = livePlans(s);
        const all = plans.flatMap((p) => p.moves);
        const boundary = s.profile.dayBoundaryHour;
        const rankOf = (goalId: string) => s.goals.find((g) => g.id === goalId)?.rank ?? Number.MAX_SAFE_INTEGER;
        const planned: Notice[] = [];
        for (let ahead = 0; ahead <= NOTICE_HORIZON_DAYS; ahead++) {
          const d = shiftDay(day, ahead);
          const daysSinceAnything = lastActive ? daysBetween(lastActive, d) : 0;
          // The day's own hours: a shift day keeps the shift's (PRD §7.12).
          const times = timesFor(s.profile, d);
          // A milestone falling due that day, from the goals in play: Settings
          // promised "a milestone when one lands" and nothing ever passed one.
          const dueMilestone = plans.flatMap((p) => p.milestones).find((m) => m.targetDate === d && !m.reachedAt);
          // Today's list is Today's; a later day gets what will be open on it,
          // in the order Today would show it, so the morning line names the
          // move that will be on the Now card.
          const moves = ahead === 0 ? todaysMoves(s) : orderForToday(movesOpenOn(all, d, boundary), rankOf, null);
          planned.push(
            ...planNotices({
              day: d,
              wakeTime: times.wakeTime,
              eveningTime: times.eveningTime,
              sundayHour: s.profile.sundayHour,
              // Quiet hours are the person's own, not the default's: a lark's
              // morning line at 05:30 used to be moved to seven.
              quiet: quietFor({ ...times, sundayHour: s.profile.sundayHour, onSunday: weekdayOf(d) === 0 }),
              reauthorDay: reauthorLabelFor(s, d),
              persona: s.profile.persona,
              book: s.books[s.books.length - 1] ?? null,
              moves,
              yesterday: s.days[d] ?? null,
              daysSinceAnything,
              milestone: dueMilestone ? { title: dueMilestone.title, proof: dueMilestone.proof } : null,
              muted: s.profile.notificationsOff === true,
            }),
          );
        }

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
          if (seen.includes(moment)) return {};
          track({ name: 'paywall_shown', moment });
          return { profile: { ...s.profile, paywallSeen: [...seen, moment] } };
        }),

      purchase: async (plan) => {
        const out = await billing().purchase(plan);
        if (out.ok) set((s) => ({ profile: { ...s.profile, entitled: true } }));
        track({ name: 'purchase', plan, ok: out.ok });
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
        const day = dayOf(new Date(), get().profile.dayBoundaryHour);
        // Milestones are reached by what is in the ledger, and this is the
        // launch-time pass that notices. Stamped before the occasions are
        // read, so the letter for a milestone is written the day it is due.
        {
          const st = get();
          const now = new Date().toISOString();
          const stamped = st.plans.map((p) =>
            reachMilestones(p, st.evidence, day, now, dayOf(new Date(p.createdAt), st.profile.dayBoundaryHour)),
          );
          if (stamped.some((p, i) => p !== st.plans[i])) set({ plans: stamped });
        }
        const s = get();
        const occasions = dueLetters({
          today: day,
          portraitReady: s.portraits.length > 0,
          // The morning the person comes back is a return already — the
          // Today card says "Return #1" — and the letter for it is due that
          // morning, not the next day after something was done.
          returns: detectReturns(Object.values(s.days), day).length + (isReturning(Object.values(s.days), day).returning ? 1 : 0),
          reachedMilestones: livePlans(s)
            .flatMap((p) => p.milestones)
            .filter((m) => m.reachedAt)
            .map((m) => ({ id: m.id, goalId: m.goalId, reachedAt: m.reachedAt as string })),
          existing: s.letters.map((l) => l.trigger),
          firstSealedOn: s.books[0] ? sealedOn(s.books[0].sealedAt, s.profile.dayBoundaryHour) : null,
        });

        if (occasions.length === 0) return deliverable(s.letters, day);

        const sources = {
          ideal: latestText(s.texts, 'ideal')?.body ?? '',
          // Only what the screen let through. A letter that quoted a flagged
          // ledger line back at somebody months later would be the worst
          // possible use of the one place the app writes prose.
          evidence: quotable(s.evidence).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
          goals: activeGoals(s),
          moves: livePlans(s).flatMap((p) => p.moves),
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
          set({ safetyPause: pauseOn(risk.risk, null) });
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
          // Keyed by the letter, not the day: two letters for the same day
          // shared a key and the account refused the second.
          trigger: `self:${newId('self')}`,
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
        const existing = s.briefs.find((b) => b.day === day && b.kind === 'dawn') ?? null;
        // A brief written before the plan existed — Today opened halfway along
        // the path, the Book sealed later the same day — named no first move,
        // and stayed that way all day. Written again once there is one.
        const nowHasMove = todaysMoves(s).some((m) => m.status === 'todo');
        // And written again when the Book's waiting has changed since — sealed
        // on day 90, the morning's "the Book is waiting" is no longer true.
        const waitingNow = reauthorLabelFor(s, day) !== null;
        const saidWaiting = existing ? /^Day [a-z0-9 ]+: the Book is waiting/.test(existing.today) : false;
        // And when the move it opens on has been kept or parked since: "Start
        // with …" over a move already done was the brief a day behind.
        const openMoves = todaysMoves(s);
        const firstStillOpen = existing?.firstMoveId ? openMoves.some((m) => m.id === existing.firstMoveId && m.status === 'todo') : false;
        if (existing && (firstStillOpen || !nowHasMove) && saidWaiting === waitingNow) return existing;
        const daysArr = Object.values(s.days);
        const r = reading(daysArr, day);
        const yesterdayKey = new Date(new Date(`${day}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
        // PRD 11.6: concern softens the next prompt, avoids numeric targets and
        // suggests professional support once. For a long time the verdict was
        // computed on every write, stored on the row, and then ignored by every
        // screen — the band existed in the data and nowhere else.
        const soften = softenNow(s, day);
        // A brief written again today keeps the offer the first one made: the
        // one time support is named must not be consumed by a brief that no
        // longer exists.
        const offerSupport = existing?.support != null || shouldOfferSupport(soften, s.profile.supportOfferedAt ?? null);
        const brief = buildDawnBrief(
          {
            day,
            book: s.books[s.books.length - 1] ?? null,
            yesterday: s.days[yesterdayKey] ?? null,
            // The day's moves in Today's order, so the brief's "start with"
            // is the move on the Now card, not the first move of any plan.
            moves: todaysMoves(s),
            analyses: coachAnalyses(s),
            persona: s.profile.persona,
            score: r.score,
            previousScore: r.previous,
            soften,
            offerSupport,
            reauthorDay: reauthorLabelFor(s, day),
          },
          newId,
        );
        set((st) => ({
          briefs: [...st.briefs.filter((b) => !(b.day === day && b.kind === 'dawn')), brief],
          // Stamped when the line is actually written into a brief, not when
          // the band opens — otherwise a brief that failed to build would still
          // burn the one offer the person gets.
          profile: offerSupport && !st.profile.supportOfferedAt ? { ...st.profile, supportOfferedAt: new Date().toISOString() } : st.profile,
        }));
        return brief;
      },

      markAccountAsked: () => set({ accountAsked: true }),

      setAccount: async () => {
        const known = await sessionState();
        if (known.reachable && !known.session && get().account) {
          // The session is gone for good — the account was closed from
          // another device, or the sweep took it — and Settings must not go
          // on saying "Signed in" while every push says the opposite.
          set({ account: null });
          return;
        }
        const session = known.session;
        if (!session) return;
        set((s) => ({
          accountAsked: true,
          account: {
            userId: session.user.id,
            email: session.user.email ?? null,
            signedInAt: new Date().toISOString(),
            // Carried across a sign-out and back in: `lastSync` remembers
            // when this device last copied to this account.
            lastPushAt: s.account?.userId === session.user.id ? s.account.lastPushAt : (s.lastSync[session.user.id] ?? null),
            ...(s.account?.userId === session.user.id && s.account.needsChoice ? { needsChoice: true } : {}),
          },
        }));
      },

      afterSignIn: async () => {
        const s = get();
        // Ask the account what it holds before deciding which way the copy
        // goes. This used to push whenever the device held anything at all —
        // and since the first run puts a two-minute line on every new phone
        // before the account, a replacement phone's first sign-in pushed that
        // one line and then pruned the whole Book off the account.
        const pulled = await pullAll(false);
        if (!pulled.ok) return { ok: false, error: pulled.error };
        // Closed inside its week: the person is asked, and nothing moves
        // either way until they answer.
        if (pulled.stamp.closedAt) {
          const closedAt = pulled.stamp.closedAt;
          set((st) => (st.account ? { account: { ...st.account, closedAt } } : {}));
          return {
            ok: false,
            closed: true,
            error: `This account was closed on ${formatDay(closedAt.slice(0, 10))} and its copy will be deleted a week after. Reopen it, or leave it closed.`,
          };
        }
        set((st) => (st.account?.closedAt ? { account: { ...st.account, closedAt: null } } : {}));
        const b = pulled.bundle;
        const accountHas = hasWriting(b);
        const deviceHas = hasSubstance(s);
        const userId = get().account?.userId ?? null;
        if (!accountHas) {
          if (!hasWriting(s)) return { ok: true, pulled: false, moved: 'nothing' as const };
          const pushed = await get().pushToAccount();
          return pushed.ok ? { ok: true, pulled: false, moved: 'pushed' as const } : pushed;
        }
        if (deviceHas) {
          // The account's copy may be this very device's — signed out and
          // back in — in which case there is nothing to choose: the stamp
          // names this device, or this device remembers copying to this
          // account, and its writing is the newer.
          const mine = pulled.stamp.by === get().deviceId || Boolean(userId && s.lastSync[userId]);
          if (mine) {
            const pushed = await get().pushToAccount();
            return pushed.ok ? { ok: true, pulled: false, moved: 'pushed' as const } : pushed;
          }
          set((st) => (st.account ? { account: { ...st.account, needsChoice: true } } : {}));
          return {
            ok: false,
            conflict: true,
            error: 'This phone and the account both have writing. Choose which copy to keep — nothing has been moved yet.',
          };
        }
        takeBundle(set, s, b);
        await inStep(set, get);
        return { ok: true, pulled: true, moved: 'pulled' as const };
      },

      reopenAccount: async () => {
        const out = await restoreAccount();
        if (!out.ok) return { ok: false, error: out.error };
        set((st) => (st.account ? { account: { ...st.account, closedAt: null } } : {}));
        return get().afterSignIn();
      },

      resolveSignIn: async (choice) => {
        if (choice === 'push') {
          // Their word that this device is the copy: the prune may run, and
          // another device's newer copy is replaced. Through the same gate
          // as every other push, so two never run at once.
          if (pushInFlight) await pushInFlight.catch(() => undefined);
          // `needsChoice` clears when the push lands (`markPushed`), not
          // before: cleared first, a push that failed offline forgot that a
          // choice was still owed, and Settings showed the account as settled.
          pushInFlight = (async () => {
            try {
              const out = await pushAll(bundleOf(get()), { device: get().deviceId, reconcile: true, force: true });
              if (!out.ok) return { ok: false as const, error: out.error };
              markPushed(set, get);
              return { ok: true as const };
            } finally {
              pushInFlight = null;
            }
          })();
          const out = await pushInFlight;
          if (!out.ok) return { ok: false, error: out.error };
          return { ok: true, pulled: false, moved: 'pushed' as const };
        }
        const pulled = await pullAll(false);
        if (!pulled.ok) return { ok: false, error: pulled.error };
        set((st) => (st.account ? { account: { ...st.account, needsChoice: false } } : {}));
        takeBundle(set, get(), pulled.bundle);
        await inStep(set, get);
        return { ok: true, pulled: true, moved: 'pulled' as const };
      },

      pushToAccount: async () => {
        if (!hasSupabase || !get().account) return { ok: false, error: 'Not signed in.' };
        // A device with nothing on it that has never copied anything up has
        // nothing to say about the account, and its default profile must not
        // land over the one the account already holds.
        if (!hasWriting(get()) && !get().account?.lastPushAt) return { ok: false, error: 'Nothing to copy yet.' };
        // A choice still owed (both sides held writing at sign-in) stops
        // every push until it is made: a background push used to run in
        // the middle of it and prune the other phone's Book.
        if (get().account?.needsChoice) {
          return { ok: false, error: 'This phone and the account both have writing. Choose which copy to keep — under You.', conflict: true };
        }
        if (get().account?.closedAt) return { ok: false, error: CLOSED };
        // One at a time. iOS backgrounds with 'inactive' then 'background',
        // and two whole pushes ran at once, each pruning from its own snapshot.
        if (pushInFlight) return pushInFlight;
        // Nothing changed since the copy that landed: nothing to send. Every
        // backgrounding used to upload every row of every table again — a
        // year's ledger, ten times a day.
        const bundle = bundleOf(get());
        const shape = bundleShape(bundle);
        const account = get().account;
        if (account?.lastPushAt && account.userId === lastPushed.userId && shape === lastPushed.shape) return { ok: true };
        pushInFlight = (async () => {
          try {
            // The prune runs only from a device that has copied up before,
            // and never over another device's newer copy.
            const out = await pushAll(bundle, {
              device: get().deviceId,
              reconcile: Boolean(get().account?.lastPushAt),
              lastPushAt: get().account?.lastPushAt ?? null,
            });
            if (!out.ok) {
              if (out.closed) set((st) => (st.account ? { account: { ...st.account, closedAt: new Date().toISOString() } } : {}));
              return { ok: false as const, error: out.error, ...(out.conflict ? { conflict: true as const } : {}) };
            }
            markPushed(set, get);
            lastPushed = { userId: get().account?.userId ?? null, shape };
            return { ok: true as const };
          } finally {
            pushInFlight = null;
          }
        })();
        return pushInFlight;
      },

      signOutAccount: async () => {
        await signOut();
        // The writing stays. Signing out is about the copy, not the device.
        set({ account: null });
      },

      deleteAccountAndCopy: async () => {
        const out = await deleteAccount();
        if (!out.ok) return out;
        set({ account: null });
        return { ok: true };
      },

      savePresentPick: (pick) =>
        set((s) => {
          const now = new Date().toISOString();
          const existing = s.presentPicks.find((p) => p.cardId === pick.cardId && p.half === pick.half);
          // The same screen that reads a sitting reads these: they are sentences
          // about a person's own life, and a flagged one never reaches the Book.
          const risk = screen(`${pick.storyLine} ${pick.applyLine}`).risk;
          const row: PresentPickRow = {
            id: existing?.id ?? newId('pp'),
            half: pick.half,
            cardId: pick.cardId,
            storyLine: pick.storyLine.trim(),
            applyLine: pick.applyLine.trim(),
            framingId: pick.framingId,
            goalId: pick.goalId,
            rank: pick.rank,
            safetyRisk: risk,
            writtenAt: existing?.writtenAt ?? now,
          };
          const next = existing ? s.presentPicks.map((p) => (p.id === existing.id ? row : p)) : [...s.presentPicks, row];
          // Finished is a fact about the picks, counted the once it becomes
          // true — a reread of a written half used to count as finishing it
          // again on every "Back to Today".
          // The sitting says which cards are still to write, so this is the
          // last Keep of the half and not merely the first.
          const open = s.presentDraft ? { half: s.presentDraft.half, selected: s.presentDraft.selected } : null;
          const done = (list: PresentPickRow[]) =>
            halfDone(list, 'faults', s.profile.track, open) && halfDone(list, 'virtues', s.profile.track, open);
          if (!done(s.presentPicks) && done(next)) track({ name: 'volume_finished', volume: 'present' });
          return {
            presentPicks: next,
            safetyPause: risk === 'crisis' ? pauseOn(risk, 'present', row.id) : s.safetyPause,
          };
        }),
      dropPresentPick: (cardId, half) =>
        set((s) => ({ presentPicks: s.presentPicks.filter((p) => !(p.cardId === cardId && p.half === half)) })),
      rankPresentPicks: (half, order) =>
        set((s) => ({
          presentPicks: s.presentPicks.map((p) =>
            p.half === half && order.includes(p.cardId) && p.rank !== order.indexOf(p.cardId) ? { ...p, rank: order.indexOf(p.cardId) } : p,
          ),
        })),

      setPastEpochs: (epochs) =>
        set((s) => {
          const now = new Date().toISOString();
          const known = new Map(s.pastEpochs.map((e) => [e.id, e]));
          return {
            pastEpochs: epochs.map((e, i) => ({
              id: e.id,
              label: e.label.trim(),
              fromAge: e.fromAge,
              toAge: e.toAge,
              position: i,
              createdAt: known.get(e.id)?.createdAt ?? now,
            })),
            // A period cut again keeps its place in the order, so the events in
            // "19 to 26" follow it to "19 to 24" rather than vanishing, and a cut
            // with fewer periods lands the overflow on the last. Then each
            // period's list is numbered again in the order it now reads.
            pastEvents: (() => {
              const moved = recutEvents(s.pastEpochs, epochs, s.pastEvents);
              const seen = new Map<string, number>();
              return moved.map((v) => {
                const position = seen.get(v.epochId) ?? 0;
                seen.set(v.epochId, position + 1);
                return { ...v, position };
              });
            })(),
          };
        }),
      setPastListed: (listed) => set({ pastListed: listed }),
      addPastEvent: (epochId, title, weight) =>
        set((s) => ({
          pastEvents: [
            ...s.pastEvents,
            {
              id: newId('pe'),
              epochId,
              title: title.trim(),
              weight,
              analysed: false,
              whatHappened: '',
              shapedMe: '',
              stillBelieve: '',
              joinsBook: false,
              safetyRisk: 'none',
              position: s.pastEvents.filter((v) => v.epochId === epochId).length,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      dropPastEvent: (id) => set((s) => ({ pastEvents: s.pastEvents.filter((v) => v.id !== id) })),
      choosePastEvent: (id, analysed) =>
        set((s) => ({ pastEvents: s.pastEvents.map((v) => (v.id === id ? { ...v, analysed } : v)) })),
      savePastAnalysis: (id, fields) =>
        set((s) => {
          /**
           * Only what changed is screened again. A line the person had already
           * said was not about them stays cleared unless that line is the one
           * that changed, and a change to one box does not raise the card for
           * another. The Past is the volume where "overdose" appears in an
           * ordinary account of a death in the family.
           */
          const was = s.pastEvents.find((v) => v.id === id);
          const old = { whatHappened: was?.whatHappened ?? '', shapedMe: was?.shapedMe ?? '', stillBelieve: was?.stillBelieve ?? '' };
          const rank: Record<SafetyRisk, number> = { none: 0, concern: 1, crisis: 2 };
          // The stored verdict is milder than the text screens at: the person cleared it.
          const cleared = was ? rank[screen(`${old.whatHappened} ${old.shapedMe} ${old.stillBelieve}`).risk] > rank[was.safetyRisk] : false;
          const keys = ['whatHappened', 'shapedMe', 'stillBelieve'] as const;
          const changed = (k: (typeof keys)[number]) => fields[k].trim() !== old[k];
          const per = (k: (typeof keys)[number]): SafetyRisk => (changed(k) ? screen(fields[k]).risk : cleared ? 'none' : screen(old[k]).risk);
          const verdicts = keys.map(per);
          const risk = [...verdicts].sort((a, b) => rank[b] - rank[a])[0]!;
          // The card is for a line just written in crisis, not for a verdict
          // carried over from a box that did not change: a held event whose
          // comma was fixed used to raise it again on every Keep.
          const raised = keys.some((k, i) => changed(k) && verdicts[i] === 'crisis');
          return {
            pastEvents: s.pastEvents.map((v) =>
              v.id === id
                ? {
                    ...v,
                    whatHappened: fields.whatHappened.trim(),
                    shapedMe: fields.shapedMe.trim(),
                    stillBelieve: fields.stillBelieve.trim(),
                    safetyRisk: risk,
                    // The choice stays theirs. A line written in crisis never
                    // reaches the Book whatever was chosen — the seal and the
                    // chips both gate on the verdict — so nothing has to be
                    // taken away here, and a cleared flag gives the choice back.
                    joinsBook: v.joinsBook,
                  }
                : v,
            ),
            safetyPause: raised ? pauseOn('crisis', 'past', id) : s.safetyPause,
          };
        }),
      setPastJoinsBook: (id, joins) =>
        set((s) => ({
          pastEvents: s.pastEvents.map((v) => (v.id === id ? { ...v, joinsBook: joins && v.safetyRisk !== 'crisis' } : v)),
        })),

      setToast: (t) => set({ toast: t }),
      setSignInNotice: (text) => set({ signInNotice: text }),
      setNewVersionReady: (ready) => set({ newVersionReady: ready }),
      dismissKeepNotice: () => set({ keepNoticeDismissed: true }),
      tickClock: () => {
        const day = dayOf(new Date(), get().profile.dayBoundaryHour);
        if (day !== get().clockDay) set({ clockDay: day });
        // Every open, every foreground, every boundary: a finished week
        // rolls into the next before Today reads.
        if (get().hydrated) get().carryPlansForward();
      },
      showResources: () => set({ safetyPause: { risk: 'none', at: new Date().toISOString(), source: null, voluntary: true } }),
      saveStoneDraft: (draft) => set({ stoneDraft: { ...draft, updatedAt: new Date().toISOString() } }),
      clearStoneDraft: () => set({ stoneDraft: null }),
      saveDayDraft: (draft) => set({ dayDraft: { ...draft, updatedAt: new Date().toISOString() } }),
      saveLetterDraft: (draft) => set({ letterDraft: draft ? { ...draft, updatedAt: new Date().toISOString() } : null }),
      clearDayDraft: () => set({ dayDraft: null }),
      savePresentDraft: (draft) => set({ presentDraft: { ...draft, updatedAt: new Date().toISOString() } }),
      clearPresentDraft: () => set({ presentDraft: null }),
      savePastDraft: (draft) => set({ pastDraft: { ...draft, updatedAt: new Date().toISOString() } }),
      clearPastDraft: () => set({ pastDraft: null }),
      saveInterviewDraft: (s, history) => set({ interviewDraft: { s, history, updatedAt: new Date().toISOString() } }),
      clearInterviewDraft: () => set({ interviewDraft: null }),
      saveReadBackDraft: (rows, source, leftOut) => set({ readBackDraft: { rows, source, ...(leftOut ? { leftOut } : {}), updatedAt: new Date().toISOString() } }),
      clearReadBackDraft: () => set({ readBackDraft: null }),
      reconsiderLatestFlag: () =>
        set((st) => {
          // The row the card is about, and only that row. A pause with no
          // source — the coach chat, a refused letter — has nothing to clear.
          const source = st.safetyPause?.source ?? null;
          if (!source) return { safetyPause: null };
          const clear = <T extends { safetyRisk?: SafetyRisk | null }>(row: T): T => ({ ...row, safetyRisk: 'none' as const });
          switch (source.kind) {
            case 'text':
              return { texts: st.texts.map((t) => (t.id === source.id ? clear(t) : t)), safetyPause: null };
            case 'analysis':
              return { analyses: st.analyses.map((a) => (a.id === source.id ? clear(a) : a)), safetyPause: null };
            case 'evidence':
              return { evidence: st.evidence.map((e) => (e.id === source.id ? clear(e) : e)), safetyPause: null };
            case 'day': {
              // The proof line lives twice — on the day and in the ledger —
              // and both carried the one verdict, so both are cleared.
              const d = st.days[source.id];
              return {
                days: d ? { ...st.days, [source.id]: clear(d) } : st.days,
                evidence: st.evidence.map((e) => (e.kind === 'seal' && e.day === source.id ? clear(e) : e)),
                safetyPause: null,
              };
            }
            case 'present':
              return { presentPicks: st.presentPicks.map((p) => (p.id === source.id ? clear(p) : p)), safetyPause: null };
            case 'past':
              // Clearing the flag does not put the event in the Book: that is
              // still the person's separate choice, made on its own screen.
              return { pastEvents: st.pastEvents.map((v) => (v.id === source.id ? clear(v) : v)), safetyPause: null };
            case 'lesson':
              return { goals: st.goals.map((g) => (g.id === source.id ? { ...g, lessonRisk: 'none' as const } : g)), safetyPause: null };
            case 'memory':
              return {
                memoryEdits: st.memoryEdits.map((e) => (e.key === source.id ? { ...e, risk: 'none' as const } : e)),
                safetyPause: null,
              };
            case 'iwill':
              return { iWillCleared: true, safetyPause: null };
          }
        }),

      clearSafety: () => set({ safetyPause: null }),
      // The storage flag survives a reset: with the latch closed the reset
      // cannot reach the disk, and a banner that went away said it had.
      // A new device name: what this phone holds after a reset is a
      // different body of writing, and under the old name the account's
      // stamp still said "this device's copy" — so a sign-in after Delete
      // everything pushed the fresh start over the Book without the choice,
      // and the next push pruned the Book from the account.
      reset: () => set((s) => ({ profile: DEFAULT_PROFILE, ...EMPTY, storageError: s.storageError, deviceId: newDeviceId() })),
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
        const { hydrated: _h, toast: _t, storageError: _e, systemDark: _d, clockDay: _c, signInNotice: _n, newVersionReady: _v, ...rest } = s as MorrowState & Record<string, unknown>;
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
        // A persisted null never replaces a default that is not null. A field
        // that was once nullable and is a string now — the spine, the last
        // line — came back from an older store as null, and every screen that
        // trimmed it fell into the error boundary on a fresh install. Fields
        // whose default is null keep their null; nothing legitimate is lost.
        const sound = Object.fromEntries(
          Object.entries(p).filter(([k, v]) => !(v === null && (current as unknown as Record<string, unknown>)[k] !== null)),
        ) as Partial<MorrowState>;
        return {
          ...current,
          ...sound,
          profile: { ...DEFAULT_PROFILE, ...current.profile, ...(sound.profile ?? {}) },
          // A store written by an earlier build may hold the goals out of rank
          // order; the array agrees with its ranks from here on. Only rows
          // that are rows: a null in the array threw here, and the throw was
          // reported as an error that then wrote the defaults over the blob.
          ...(Array.isArray(sound.goals) ? { goals: denseRanks((sound.goals as unknown[]).filter((g): g is Goal => Boolean(g) && typeof g === 'object')) } : {}),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        // Ask the storage layer, not this callback, whether the disk is sound:
        // a blob that reads but does not parse never reaches `error` here, and
        // that is the commonest shape of the failure. An error zustand
        // reports itself — the merge threw on a shape it could not take —
        // has to close the latch here, before the write below, or that write
        // put the empty defaults over the blob it could not read.
        if (error && !hasFailed()) markUnreadable(error instanceof Error ? error.message : String(error));
        const broken = Boolean(error) || hasFailed();
        if (broken) {
          console.error('[morrow] could not read local storage', error ?? failureReason());
        } else {
          state?.setToast(null);
          // The store has been read: writes may land from here on.
          openStorage();
        }
        // Safe either way now: with the latch closed this write is dropped
        // rather than persisted, so it cannot overwrite anything.
        store.setState({ hydrated: true, storageError: broken, ...(store.getState().deviceId ? {} : { deviceId: newDeviceId() }) });
      },
    },
  ),
);

/**
 * The store hook every screen uses — and, through it, the one subscription
 * to the studio mode. `day.ink` and the rest are read at render time, so a
 * screen has to render again when the mode changes; every screen calls this
 * at least once, which makes it the one place that can promise that.
 */
export const useMorrow: typeof store = Object.assign(
  (<T,>(selector: (s: MorrowState) => T): T => {
    useSyncExternalStore(subscribeDark, isDark, isDark);
    return store(selector);
  }) as typeof store,
  store,
);

/**
 * The mode the studios are in, kept in step with the setting and the system.
 * The tokens are a view over it, and every screen's store hook subscribes to
 * it below, so a change repaints the screen that is open.
 */
export function darkOf(s: Pick<MorrowState, 'profile' | 'systemDark'>): boolean {
  const a = s.profile.appearance ?? 'system';
  return a === 'dark' || (a === 'system' && s.systemDark);
}
useMorrow.subscribe((s) => setDark(darkOf(s)));

/**
 * A write that fails after launch closes the latch just as a failed read does,
 * and from then on nothing is saved. The banner has to go up then, not on
 * the next launch. With the latch closed this setState is dropped by the
 * storage layer rather than persisted, so it is safe to make at any time.
 */
onStorageFailure((failure) => {
  const has = useMorrow.getState().storageError;
  if (failure && !has) useMorrow.setState({ storageError: true });
  if (!failure && has) useMorrow.setState({ storageError: false });
});

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
    // A goal let go is not holding the free plan's one Blueprint.
    blueprintsBuilt: new Set(livePlans(s).map((p) => p.goalId)).size,
    coachTurnsToday: s.coachTurns[day] ?? 0,
    afterBlueprintShown: (s.profile.paywallSeen ?? []).includes('after-blueprint'),
    firstDaySealed: Object.values(s.days).some((d) => Boolean(d.sealedAt)),
    replansThisMonth: s.plans.flatMap((p) => p.replannedAt ?? []).filter((at) => dayOf(new Date(at), s.profile.dayBoundaryHour).slice(0, 7) === day.slice(0, 7)).length,
  };
}

/**
 * Whether there is anything of theirs on this device — the sync's one
 * question. All three volumes count: a phone that had done only the Past
 * volume used to be told "Nothing to copy yet", and signing it in to an
 * account with a Book on it replaced that Past with the account's nothing.
 */
function hasWriting(s: Pick<SyncBundle, 'texts' | 'goals' | 'analyses' | 'books' | 'presentPicks' | 'pastEpochs' | 'pastEvents' | 'memoryEdits'>): boolean {
  return (
    // A memory line in their own words, or a line forgotten, is theirs and
    // travels on memory_profiles; a device holding only that is not empty.
    s.memoryEdits.length > 0 ||
    s.texts.length > 0 ||
    s.goals.length > 0 ||
    s.analyses.length > 0 ||
    s.books.length > 0 ||
    s.presentPicks.length > 0 ||
    s.pastEpochs.length > 0 ||
    s.pastEvents.length > 0
  );
}

/** The push in progress, so a second call joins it rather than starting another. */
let pushInFlight: Promise<{ ok: true } | { ok: false; error: string; conflict?: true }> | null = null;

type Set = (partial: Partial<MorrowState> | ((s: MorrowState) => Partial<MorrowState>)) => void;

/** A push landed: this device is the account's latest copy, and remembers it per account. */
/** The copy that last landed on the account, by its shape — a hash of the bundle, per launch. */
let lastPushed: { userId: string | null; shape: string } = { userId: null, shape: '' };

/** A cheap hash of a bundle: the same bytes give the same string. */
function bundleShape(bundle: unknown): string {
  const s = JSON.stringify(bundle);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `${s.length}:${h.toString(16)}`;
}

function markPushed(set: Set, get: () => MorrowState): void {
  const at = new Date().toISOString();
  const userId = get().account?.userId;
  set((st) => ({
    ...(st.account ? { account: { ...st.account, lastPushAt: at, needsChoice: false } } : {}),
    ...(userId ? { lastSync: { ...st.lastSync, [userId]: at } } : {}),
  }));
}

/**
 * After a pull: this device holds the account's copy, and says so on the
 * account's row, or its next push would be read as another device's
 * overwrite of the copy it had just taken. A stamp that cannot be written
 * (offline) leaves `lastPushAt` set anyway: the row's stamp is still the
 * other device's, but it is not newer than this pull.
 */
async function inStep(set: Set, get: () => MorrowState): Promise<void> {
  const stamped = await stampAccount(get().deviceId);
  const at = stamped.ok ? stamped.at : new Date().toISOString();
  const userId = get().account?.userId;
  set((st) => ({
    ...(st.account ? { account: { ...st.account, lastPushAt: at, needsChoice: false } } : {}),
    ...(userId ? { lastSync: { ...st.lastSync, [userId]: at } } : {}),
  }));
}

/**
 * Writing that is more than the first run's two-minute line: a Book, goals,
 * lines on the stones, a Fifteen, the volumes, a memory edit. A phone that
 * holds only a warm-up line has not written anything the account would
 * miss, and the account's Book should come to it.
 */
function hasSubstance(s: Pick<SyncBundle, 'texts' | 'goals' | 'analyses' | 'books' | 'presentPicks' | 'pastEpochs' | 'pastEvents' | 'memoryEdits'>): boolean {
  return hasWriting({ ...s, texts: s.texts.filter((t) => t.kind !== 'warmup') });
}

/**
 * The account's copy, taken onto this device. The profile merges over the
 * defaults the same way a rehydrate does, so a field this build added since
 * the copy was made is not undefined; the goals come back in rank order with
 * the archived rows after; a warm-up line written on this phone before the
 * sign-in is kept (nothing written is lost); and the spine title, its
 * framing and the "I will" line come back from the latest edition, or the
 * next edition finished on this phone was "Untitled" with an empty line.
 */
function takeBundle(set: (partial: Partial<MorrowState>) => void, s: MorrowState, b: SyncBundle): void {
  const latest = b.books[b.books.length - 1];
  const mine = s.texts.filter((t) => t.kind === 'warmup' && !b.texts.some((x) => x.id === t.id));
  set({
    profile: { ...DEFAULT_PROFILE, ...b.profile },
    goals: denseRanks(b.goals),
    texts: [...b.texts, ...mine],
    analyses: b.analyses,
    books: b.books,
    plans: b.plans,
    evidence: b.evidence,
    days: b.days,
    practices: b.practices,
    practiceLogs: b.practiceLogs,
    scenes: b.scenes,
    // A copy made before the portraits travelled has none: rebuilt below for
    // every goal with a plan, the person's own identity line kept where the
    // row carries one.
    portraits: b.portraits,
    letters: b.letters,
    briefs: b.briefs,
    presentPicks: b.presentPicks,
    pastEpochs: b.pastEpochs,
    pastEvents: b.pastEvents,
    pastListed: b.pastListed,
    memoryEdits: b.memoryEdits,
    bookTitle: latest?.titleAuthored ? latest.title : s.bookTitle,
    bookTitleFraming: latest?.titleFraming ?? s.bookTitleFraming,
    iWill: latest?.iWill?.trim() ? latest.iWill : s.iWill,
  });
  // A goal with a plan and no portrait in the copy (made before portraits
  // travelled): built again from its lines, which are all here.
  for (const plan of b.plans) {
    if (b.portraits.some((pt) => pt.goalId === plan.goalId)) continue;
    const goal = b.goals.find((g) => g.id === plan.goalId);
    if (!goal || goal.status === 'archived') continue;
    try {
      const built = buildPortrait({
        goal,
        analyses: quotable(b.analyses.filter((a) => a.goalId === goal.id)),
        ideal: latestText(b.texts, 'ideal')?.body ?? '',
        firstName: b.profile.displayName,
      });
      useMorrow.setState((st) => ({ portraits: [...st.portraits.filter((pt) => pt.goalId !== goal.id), built] }));
    } catch {
      // lines missing: the Goal page offers to write them
    }
  }
}

/** The store as the sync sees it: everything that is theirs, nothing that is the screen's. */
function bundleOf(s: MorrowState): SyncBundle {
  return {
    profile: s.profile,
    goals: s.goals,
    // A sitting the screen flagged stays on the device: the pause says
    // "nothing was sent anywhere", and it was true only until the next
    // background push. Appealed ("This was not about me"), it goes up with
    // the rest.
    texts: s.texts.filter((t) => t.safetyRisk !== 'crisis'),
    analyses: s.analyses,
    books: s.books,
    plans: s.plans,
    evidence: s.evidence,
    days: s.days,
    practices: s.practices,
    practiceLogs: s.practiceLogs,
    scenes: s.scenes,
    portraits: s.portraits,
    letters: s.letters,
    briefs: s.briefs,
    presentPicks: s.presentPicks,
    pastEpochs: s.pastEpochs,
    pastEvents: s.pastEvents,
    pastListed: s.pastListed,
    memoryEdits: s.memoryEdits,
    memoryDocument: memoryDocument(memoryLines(s)),
  };
}

/** The app's sentence for a card id, for printing it in the Book as a heading. */
export function cardText(id: string): string {
  return (
    [...FAULT_CARDS_FULL, ...VIRTUE_CARDS_FULL, ...FAULT_CARDS_STARTER, ...VIRTUE_CARDS_STARTER].find((c) => c.id === id)?.text ?? ''
  );
}

/** The app's label for a tapped framing, likewise. */
function framingLabelFor(id: string | null): string | null {
  if (!id) return null;
  return [...FAULT_FRAMINGS, ...VIRTUE_FRAMINGS].find((f) => f.id === id)?.label ?? null;
}

/** A pause on the screen, stamped with the row that raised it. */
/** Today's summary, recomputed from the state as it will be. */
function recomputeToday(s: MorrowState): Record<string, DaySummary> {
  return recomputeDay(s, livePlans(s), s.evidence, dayOf(new Date(), s.profile.dayBoundaryHour), s.practiceLogs);
}

/**
 * A change laid onto the state, with today's tally recomputed from the
 * result. Letting a goal go, taking one back, archiving a practice: each
 * changes what today asks for, and the Consistency number on Today read
 * the old ask until some unrelated action recomputed the day.
 */
function withToday<T extends Partial<MorrowState>>(s: MorrowState, change: T): T & { days: Record<string, DaySummary> } {
  return { ...change, days: recomputeToday({ ...s, ...change }) };
}

function pauseOn(risk: SafetyRisk, kind: NonNullable<SafetyPause['source']>['kind'] | null, id?: string): SafetyPause {
  return { risk, at: new Date().toISOString(), source: kind && id ? { kind, id } : null };
}

/** How many days ahead the notification planner looks on every open. */
const NOTICE_HORIZON_DAYS = 7;

/** `YYYY-MM-DD`, moved by whole days. UTC arithmetic on a UTC-anchored date. */
function shiftDay(day: string, by: number): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return day;
  return new Date(t + by * 86_400_000).toISOString().slice(0, 10);
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
    // The line on letting a goal go and a memory line in their words carry
    // the screen's word like every other write, and the band reads them too.
    ...s.goals.filter((g) => g.lessonRisk && g.letGoAt).map((g) => ({ risk: g.lessonRisk, day: dayOf(new Date(g.letGoAt!), boundary) })),
    ...s.memoryEdits.filter((e) => e.risk).map((e) => ({ risk: e.risk, day: dayOf(new Date(e.editedAt), boundary) })),
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
      // Carried too. The seal's verdict on the proof line is what keeps a
      // flagged line out of tomorrow's brief; recounting the moves after a
      // seal used to drop it, and the line came back at breakfast.
      ...(prev?.safetyRisk ? { safetyRisk: prev.safetyRisk } : {}),
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

/**
 * The goals in play, in rank order. A goal let go at a re-authoring (PRD
 * §7.3) stays in `goals` as archived — its row, its line about what it
 * taught, and the chapters it has in older editions are all still theirs —
 * but it is not on Today, not on the stones, and not in the next edition.
 */
/**
 * What Morrow knows about me (PRD §7.9): the profile as it stands, with the
 * person's edits laid over it. Rebuilt on every read — it is a view of the
 * store, and the only thing kept is what they changed.
 */
export function memoryLines(s: MorrowState): MemoryLine[] {
  const today = dayOf(new Date(), s.profile.dayBoundaryHour);
  return applyMemoryEdits(
    buildMemory({ profile: s.profile, goals: s.goals, analyses: s.analyses, books: s.books, days: s.days, today }),
    s.memoryEdits,
  );
}

/**
 * The lines the coach may quote: quotable, and not forgotten. Forgetting a
 * line on the memory screen is meant to be real, so the brief and every chip
 * reply build from this and never from `s.analyses` directly.
 */
export function coachAnalyses(s: MorrowState): GoalAnalysis[] {
  const forgotten = forgottenLineIds(s.memoryEdits);
  // And only the goals in play: a goal let go keeps its lines for the old
  // editions, and the coach does not open the morning with them.
  const live = new Set(activeGoals(s).map((g) => g.id));
  return quotable(s.analyses).filter((a) => live.has(a.goalId) && !forgotten.has(a.id));
}

export function activeGoals(s: MorrowState): Goal[] {
  return s.goals.filter((g) => g.status !== 'archived').sort((a, b) => a.rank - b.rank);
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
/**
 * The plans of the goals in play. A goal let go at a re-authoring (PRD §7.3)
 * keeps its plan — it is theirs, and Take it back puts it straight back on
 * the table — but its moves are not on Today, not in the brief, not in the
 * morning notice, and not in the day's tally, or letting go changed nothing
 * the person could see before the seal and everything after.
 */
export function livePlans(s: MorrowState): Plan[] {
  const live = new Set(activeGoals(s).map((g) => g.id));
  return s.plans.filter((p) => live.has(p.goalId));
}

/** "Day ninety" on a morning the brief opens the re-authoring; null otherwise. */
function reauthorLabelFor(s: MorrowState, day: string): string | null {
  const due = reauthorDue(s.books, day, s.profile.dayBoundaryHour);
  return due ? reauthorLabel(due.cycle) : null;
}

/**
 * Ranks dense over the goals in play, and the array in that order with the
 * archived rows after it. Two writers — `addGoals` through `mergeGoalDrafts`,
 * and the Interview's own ordering — rank by array position, so the array
 * has to agree with the rank field or the next of them quietly rewrites
 * the person's order.
 */
function denseRanks(goals: Goal[]): Goal[] {
  const live = goals.filter((g) => g.status !== 'archived').sort((a, b) => a.rank - b.rank);
  const archived = goals.filter((g) => g.status === 'archived');
  return [...live.map((g, i) => ({ ...g, rank: i })), ...archived];
}

/**
 * A re-authoring begun and not sealed: a goal let go since the latest
 * edition. Today keeps the door to /reauthor open while one is waiting, so
 * Take it back is never out of reach once the week's card has gone.
 */
export function pendingLetGo(s: MorrowState): Goal[] {
  const latest = s.books[s.books.length - 1];
  return s.goals.filter((g) => g.status === 'archived' && g.letGoAt && (!latest || g.letGoAt > latest.sealedAt));
}

export function todaysMoves(s: MorrowState) {
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  const all = livePlans(s).flatMap((p) => p.moves);
  const boundary = s.profile.dayBoundaryHour;
  // What the day is still asking for, plus what was finished today. A parked
  // move is still open: "not today" is not "never". See `movesOpenOn`.
  const due = movesOpenOn(all, day, boundary);
  const rankOf = (goalId: string) => s.goals.find((g) => g.id === goalId)?.rank ?? Number.MAX_SAFE_INTEGER;
  const said = s.days[day]?.intentionMoveId ?? null;
  if (due.some((m) => m.status === 'todo')) {
    return orderForToday(due, rankOf, said);
  }

  // Everything the day asked for is closed. Show it as closed.
  //
  // This used to promote tomorrow's move into today's list the moment the last
  // one was seated, so the day never read as finished and there was always one
  // more thing waiting. A day you can finish is the entire point of the screen,
  // and the seal at the end of it only means something if the work stops.
  //
  // Only a day that asked something, though. A move parked "not today" stays
  // open on every later day (that is what parking means), but yesterday's
  // "not today" is not today's answer: with nothing else on the list it used
  // to close every following morning — "Today is closed" over a move never
  // done, and the next scheduled one invisible until its own day.
  const askedToday = due.some((m) => m.status === 'done' || !m.scheduledFor || m.scheduledFor === day || closedOn(m, boundary) === day);
  if (due.length > 0 && askedToday) {
    return orderForToday(due, rankOf, said);
  }

  // Nothing was scheduled for today at all — the evening the Book is sealed,
  // for instance, when the first move is dated tomorrow. Bringing the next one
  // forward is what keeps that evening from looking empty. Anything parked
  // earlier stays on the list under it, with its "Put it back".
  const next = all
    .filter((m) => m.status === 'todo' && m.scheduledFor && m.scheduledFor > day)
    .sort((a, b) => (a.scheduledFor! < b.scheduledFor! ? -1 : 1))[0];
  return orderForToday(next ? [...due, next] : due, rankOf, said);
}

/**
 * Whether the day's work is finished: something was asked of them and none of
 * it is still open. Distinct from an empty day, which asks nothing.
 */
export function dayIsDone(s: MorrowState): boolean {
  const moves = todaysMoves(s);
  if (moves.length === 0) return false;
  const day = dayOf(new Date(), s.profile.dayBoundaryHour);
  // Something was asked of today: dated today, or finished today. A move
  // parked on an earlier day is neither, and a list of only those is not
  // a day closed.
  const asked = moves.filter((m) => m.scheduledFor === day || m.status === 'done');
  return asked.length > 0 && moves.every((m) => m.status !== 'todo');
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
/** Where the person is on the first-run path (core's `firstRunStep`), from the store. */
export function firstRunOf(s: MorrowState): FirstRunStep {
  return firstRunStep({
    goals: activeGoals(s),
    // Any first line counts, whatever the safety screen said of it: the card
    // has been raised and answered, and the path must not ask for the line
    // again. (The mirror quotes only what is quotable, so it shows no quote.)
    hasWarmup: s.texts.some((t) => t.kind === 'warmup' && t.body.trim().length > 0),
    // A Fifteen with words in it. The clock can close over an empty page,
    // and an empty text counted as the future written.
    hasIdeal: (latestText(s.texts, 'ideal')?.body.trim().length ?? 0) > 0,
    hasShadow: (latestText(s.texts, 'shadow')?.body.trim().length ?? 0) > 0,
    // Open while there are kept rows not yet made goals — and open when
    // it was never reached at all: a kill while "Reading it back…" spun
    // used to skip the one step that turns their phrases into goals, for
    // good. A read-back seen and left with nothing kept was their choice.
    readBackOpen: (() => {
      const ideal = latestText(s.texts, 'ideal')?.body ?? '';
      if (!ideal.trim()) return false;
      const draft = s.readBackDraft;
      if (draft && draft.source === ideal) return draft.rows.some((r) => r.state === 'kept');
      return !s.goals.some((g) => g.sourceSpan && ideal.includes(g.sourceSpan)) && s.analyses.length === 0 && !s.bookTitle.trim();
    })(),
    hasTitle: s.bookTitle.trim().length > 0,
    consented: Boolean(s.profile.consentedAt),
    // Only the lines the plan can use. A line the screen held out of the
    // Book counted as written here while the Portrait refused to build, so
    // "One step from your Book" led to "Not yet".
    analyses: quotable(s.analyses),
    books: s.books,
    track: s.profile.track,
  });
}
export const useFirstRun = () => useMorrow(useShallow(firstRunOf));

/**
 * The whole store, for a screen that reads most of it — without a render
 * for every keystroke. `useMorrow((s) => s)` re-rendered on every write,
 * and the per-keystroke draft saves on a stone or the closing screen
 * re-rendered Today, Settings and whatever else was mounted beneath. The
 * drafts, the toast and the clock are read through their own hooks by the
 * screens that need them; a change to them alone is not a change here.
 */
const VOLATILE = new Set<keyof MorrowState>([
  'drafts',
  'stoneDraft',
  'dayDraft',
  'letterDraft',
  'memoryDraft',
  'letGoDrafts',
  'setupDraft',
  'interviewDraft',
  'readBackDraft',
  'presentDraft',
  'pastDraft',
  'toast',
  'clockDay',
  'signInNotice',
  'newVersionReady',
  'systemDark',
]);
function sameButVolatile(a: MorrowState, b: MorrowState): boolean {
  if (a === b) return true;
  for (const k of Object.keys(a) as (keyof MorrowState)[]) {
    if (VOLATILE.has(k)) continue;
    if (a[k] !== b[k]) return false;
  }
  return true;
}
export const useSnapshot = (): MorrowState => useStoreWithEqualityFn(useMorrow, (s) => s, sameButVolatile);

/**
 * Whether anything has begun, anywhere — the gate between Welcome and Today.
 * The Future path alone used to decide it, so a person who had done only
 * Present or Past opened the app the next day on Welcome page one, with a
 * "Begin tonight" that went into the Interview and no way to last night's
 * lines. A draft counts: on the deck a tick lives only in the draft until the
 * commit.
 */
export function hasBegunOf(s: MorrowState): boolean {
  const v = volumesOf(s);
  // Set-up done (consent given) is begun: the person answered four questions
  // and should come back to Today's path card, not to Welcome.
  return (
    Boolean(s.profile.consentedAt) ||
    !['setup', 'warmup', 'interview'].includes(firstRunOf(s).step) ||
    v.present !== 'untouched' ||
    v.past !== 'untouched' ||
    s.presentDraft !== null ||
    s.pastDraft !== null ||
    interviewKept(s.interviewDraft)
  );
}

/**
 * Whether an Interview draft holds anything. Undoing every answer leaves a
 * draft of the first question on disk, and that is not a sitting; the shape
 * guard is the same as the Interview's own, since the draft is persisted
 * state from whichever build wrote it.
 */
export function interviewKept(d: InterviewDraft | null): boolean {
  return Boolean(d) && Array.isArray(d?.history) && Array.isArray(d?.s?.picked) && ((d?.history.length ?? 0) > 0 || (d?.s.picked.length ?? 0) > 0);
}
export const useHasBegun = () => useMorrow(hasBegunOf);

/**
 * Where each of the three volumes stands, for the chooser and for You. The
 * engine holds the rules; this only feeds it what the store keeps.
 */
export function volumesOf(s: MorrowState): Record<VolumeName, VolumeState> {
  return volumeStates({
    track: s.profile.track,
    goals: s.goals.length,
    hasIdeal: latestText(s.texts, 'ideal') !== null,
    books: s.books.length,
    presentOpen: s.presentDraft ? { half: s.presentDraft.half, selected: s.presentDraft.selected } : null,
    presentPicks: s.presentPicks.map((p) => ({
      cardId: p.cardId,
      half: p.half,
      storyLine: p.storyLine,
      applyLine: p.applyLine,
      framingId: p.framingId,
      goalId: p.goalId,
      rank: p.rank,
    })),
    pastEpochs: s.pastEpochs.map((e) => ({ id: e.id, label: e.label, fromAge: e.fromAge, toAge: e.toAge })),
    pastEvents: s.pastEvents.map((v) => ({ id: v.id, epochId: v.epochId, title: v.title, weight: v.weight, analysed: v.analysed })),
    pastListed: s.pastListed,
    pastAnalyses: s.pastEvents.map((v) => ({
      eventId: v.id,
      whatHappened: v.whatHappened,
      shapedMe: v.shapedMe,
      stillBelieve: v.stillBelieve,
      joinsBook: v.joinsBook,
    })),
  });
}
export const useVolumeStates = () => useMorrow(useShallow(volumesOf));

export const useTodaysMoves = () => useMorrow(useShallow(todaysMoves));
export const useConsistency = () => useMorrow(useShallow(consistency));
export const useLatestBook = () => useMorrow(latestBook);
export const useAnalysesFor = (goalId: string) =>
  useMorrow(useShallow((s: MorrowState) => analysesFor(s, goalId)));

declare const __DEV__: boolean;

// Analytics count nothing until the person has consented (the consent page
// lists them among what leaves the phone).
analyticsConsent(() => Boolean(useMorrow.getState().profile.consentedAt));
