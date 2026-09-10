/**
 * Morrow domain types. See PRD §10.3.
 *
 * The one rule that shapes every type here: the user writes the words.
 * Anything the model produced is either (a) a quotation of the user's own text,
 * verified as a substring, or (b) structure that points at a user line by id.
 */
import { z } from 'zod';

// ---------------------------------------------------------------- primitives

export const DomainId = z.enum(['health', 'money', 'craft', 'mind', 'people', 'home', 'custom']);
export type DomainId = z.infer<typeof DomainId>;

export const DepthTrack = z.enum(['starter', 'full']);
export type DepthTrack = z.infer<typeof DepthTrack>;

export const AnalysisKind = z.enum(['motives', 'impact', 'strategies', 'obstacles', 'monitoring']);
export type AnalysisKind = z.infer<typeof AnalysisKind>;

export const ANALYSIS_ORDER: AnalysisKind[] = [
  'motives',
  'impact',
  'strategies',
  'obstacles',
  'monitoring',
];

/** Analyses every goal gets, on either track. The rest are top-three (starter) or all (full). */
export const CORE_ANALYSES: AnalysisKind[] = ['strategies', 'obstacles'];

export const WritingKind = z.enum([
  'ideal',
  'shadow',
  'addition',
  'memory_start',
  'memory_broke',
]);
export type WritingKind = z.infer<typeof WritingKind>;

export const WritingMode = z.enum(['type', 'say', 'walk']);
export type WritingMode = z.infer<typeof WritingMode>;

export const SafetyRisk = z.enum(['none', 'concern', 'crisis']);
export type SafetyRisk = z.infer<typeof SafetyRisk>;

export const MoveStatus = z.enum(['todo', 'done', 'skip']);
export type MoveStatus = z.infer<typeof MoveStatus>;

export const Persona = z.enum(['gentle', 'straight', 'fierce']);
export type Persona = z.infer<typeof Persona>;

// ---------------------------------------------------------------- entities

export const Goal = z.object({
  id: z.string(),
  /** The user's own name for it, typed by them on the What I heard screen. */
  title: z.string(),
  domain: DomainId,
  /** Free label for a custom domain the user named ("Guitar"). */
  domainLabel: z.string().optional(),
  /** ISO date or a horizon phrase the user chose ("no deadline"). */
  horizon: z.string(),
  targetDate: z.string().nullable(),
  status: z.enum(['named', 'authored', 'active', 'paused', 'archived', 'completed']),
  rank: z.number().int(),
  /** The span of the user's own writing this goal came from, if any. */
  sourceSpan: z.string().optional(),
  /**
   * Whether the person wrote this name themselves — typed it, or lifted it from
   * their own writing — rather than tapping it out of the fixed bank. A bank
   * title is the app's prose about their life, and the Book's authorship ratio
   * counts it as such. Absent means authored, so Books sealed before this
   * existed are unaffected.
   */
  titleAuthored: z.boolean().optional(),
  createdAt: z.string(),
});
export type Goal = z.infer<typeof Goal>;

export const AuthoringSession = z.object({
  id: z.string(),
  volume: z.enum(['future', 'bench', 'quarry']),
  track: DepthTrack,
  sitting: z.number().int().min(1).max(7),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  mode: WritingMode,
  secondsWriting: z.number().int().nonnegative(),
  idleNudges: z.number().int().nonnegative(),
});
export type AuthoringSession = z.infer<typeof AuthoringSession>;

export const AuthoringText = z.object({
  id: z.string(),
  sessionId: z.string(),
  kind: WritingKind,
  /** Verbatim. Never rewritten by the app or the model. */
  body: z.string(),
  wordCount: z.number().int().nonnegative(),
  secondsWriting: z.number().int().nonnegative(),
  mode: WritingMode,
  /** Read-only until this instant (24h after close). */
  sealedUntil: z.string().nullable(),
  safetyRisk: SafetyRisk,
  createdAt: z.string(),
});
export type AuthoringText = z.infer<typeof AuthoringText>;

export const GoalAnalysis = z.object({
  id: z.string(),
  goalId: z.string(),
  kind: AnalysisKind,
  track: DepthTrack,
  /** Id of the tapped framing from the bank. The framing is a hand on the shoulder, not an answer. */
  framingId: z.string().nullable(),
  /** The user's line. Required: nothing counts until this exists. */
  line: z.string(),
  /** The "then I…" half of an if-then, on obstacles. */
  line2: z.string().optional(),
  /** Full-track paragraph. */
  paragraph: z.string().optional(),
  /**
   * Prose about this person's life that they did not write. Nothing in the
   * product writes here today, and that is the point: the day something does,
   * it flows into the Book's `generated` slot, the authorship ratio falls, and
   * the seal refuses (PRD §11.1).
   */
  generated: z.string().optional(),
  /**
   * The safety verdict on these lines.
   *
   * The stones are free text and the person writes the worst of it here as
   * often as in the Fifteen — the Obstacles stone asks what gets in the way.
   * Without this the rule that crisis writing is never quoted back applied to
   * the Fifteen alone, and a line typed here was read out in the dawn brief the
   * next morning and sealed into the Book. Absent means never screened, which
   * reads as `none`.
   */
  safetyRisk: SafetyRisk.optional(),
  specificity: z.number().min(0).max(1),
  followupShown: z.boolean(),
  writtenAt: z.string(),
});
export type GoalAnalysis = z.infer<typeof GoalAnalysis>;

export const Portrait = z.object({
  goalId: z.string(),
  /** All of these quote or restate the user's own lines; `identityLine` is the only proposal, and it is editable. */
  title: z.string(),
  why: z.string(),
  /**
   * The user's own clause, verbatim, and nothing else. This is what gets set in
   * the serif. It is empty until either the extractor finds a clause the person
   * actually wrote or the person writes one.
   */
  identityLine: z.string(),
  /**
   * The fixed words in front of it ("I'm becoming someone who is"). Chrome:
   * printed small and grey in the interface face, never in the serif, and
   * excluded from the authorship ratio like every other framing label.
   * Null once the user has written their own line, which needs no framing.
   */
  identityFraming: z.string().nullable(),
  identityLineEdited: z.boolean(),
  obstacle: z.string(),
  ifThen: z.string(),
  firstMoves: z.array(z.string()),
  letterFromFuture: z.string(),
  quotedSpans: z.array(z.string()),
});
export type Portrait = z.infer<typeof Portrait>;

export const Move = z.object({
  id: z.string(),
  goalId: z.string(),
  milestoneId: z.string().nullable(),
  title: z.string(),
  effort: z.enum(['S', 'M', 'L']),
  energy: z.enum(['low', 'high']),
  ifThen: z.string().nullable(),
  scheduledFor: z.string().nullable(),
  week: z.number().int().nullable(),
  status: MoveStatus,
  completedAt: z.string().nullable(),
  minVersion: z.string().nullable(),
  /**
   * True when the person said they were stuck and took the smaller version.
   *
   * A flag rather than a rewritten title, because the title is their sentence
   * and `minVersion` is the app's. Swapping one for the other would put app
   * prose on their plan, which is the thing the whole product is built not to
   * do. Today shows the small version underneath instead.
   */
  doingMinVersion: z.boolean().optional(),
  /** REQUIRED: the id of the user's analysis line this move came from. Validated in code. */
  sourceLineId: z.string(),
  order: z.number().int(),
});
export type Move = z.infer<typeof Move>;

export const Milestone = z.object({
  id: z.string(),
  planId: z.string(),
  goalId: z.string(),
  title: z.string(),
  /** The user's Monitoring line, verbatim: what counts as proof. */
  proof: z.string(),
  proofSourceLineId: z.string().nullable(),
  targetDate: z.string(),
  order: z.number().int(),
  reachedAt: z.string().nullable(),
});
export type Milestone = z.infer<typeof Milestone>;

export const ObstaclePlan = z.object({
  id: z.string(),
  goalId: z.string(),
  obstacle: z.string(),
  response: z.string(),
  sourceLineId: z.string(),
});
export type ObstaclePlan = z.infer<typeof ObstaclePlan>;

export const Plan = z.object({
  id: z.string(),
  goalId: z.string(),
  version: z.number().int(),
  seasonWeeks: z.number().int(),
  status: z.enum(['active', 'superseded']),
  createdAt: z.string(),
  milestones: z.array(Milestone),
  moves: z.array(Move),
  obstaclePlans: z.array(ObstaclePlan),
});
export type Plan = z.infer<typeof Plan>;

export const BookChapterLine = z.object({
  kind: AnalysisKind,
  /** From the fixed bank. Chrome, printed small and grey; not rival authorship. */
  framingLabel: z.string().nullable(),
  /** The user's words. */
  text: z.string(),
  text2: z.string().optional(),
  /**
   * Any prose about this person's life that the user did not write. Nothing
   * fills this today; it exists so `authorshipRatio` can catch the day it does.
   */
  generated: z.string().optional(),
});
export type BookChapterLine = z.infer<typeof BookChapterLine>;

export const BookChapter = z.object({
  goalId: z.string(),
  name: z.string(),
  /** Carried from the goal, so the ratio can see whose words the name is. */
  nameAuthored: z.boolean().optional(),
  horizon: z.string(),
  lines: z.array(BookChapterLine),
  memories: z.array(z.string()).default([]),
});
export type BookChapter = z.infer<typeof BookChapter>;

export const BookVersion = z.object({
  id: z.string(),
  version: z.number().int(),
  title: z.string(),
  /**
   * Whether the person typed the spine title. Carried on the sealed Book, not
   * only on the input, because the server recomputes the authorship ratio from
   * these contents and an absent flag reads as "they wrote it" — which credits
   * the app's own word "Untitled" to them.
   */
  titleAuthored: z.boolean().optional(),
  track: DepthTrack,
  sealedAt: z.string(),
  firstSentence: z.string(),
  ideal: z.string(),
  shadow: z.string().nullable(),
  chapters: z.array(BookChapter),
  iWill: z.string(),
  /** user characters ÷ all characters. Must be ≥ 0.95 (PRD §11.1). */
  authorshipRatio: z.number().min(0).max(1),
  diff: z
    .object({ kept: z.array(z.string()), rewritten: z.array(z.string()), letGo: z.array(z.string()) })
    .nullable(),
});
export type BookVersion = z.infer<typeof BookVersion>;

export const Practice = z.object({
  id: z.string(),
  goalId: z.string().nullable(),
  kind: z.enum(['routine', 'habit']),
  title: z.string(),
  steps: z.array(z.object({ text: z.string(), seconds: z.number().int().nullable() })),
  minVersion: z.string(),
  schedule: z.object({
    type: z.enum(['days', 'interval', 'anchor']),
    days: z.array(z.number().int().min(0).max(6)).optional(),
    intervalDays: z.number().int().optional(),
    anchorText: z.string().optional(),
  }),
  energySlot: z.enum(['morning', 'midday', 'evening']),
  sourceLineId: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export type Practice = z.infer<typeof Practice>;

export const Evidence = z.object({
  id: z.string(),
  goalId: z.string().nullable(),
  /**
   * The move this row is proof of, when it is one. Undoing a move has to
   * remove its own ledger row and no one else's — two moves can carry the
   * same title on the same day, and matching on the words deleted the wrong
   * one.
   */
  moveId: z.string().nullish(),
  kind: z.enum(['move', 'practice', 'milestone', 'capture', 'seal']),
  text: z.string(),
  day: z.string(),
  /** Same rule as the analysis lines: a captured thought is free text too. */
  safetyRisk: SafetyRisk.optional(),
  createdAt: z.string(),
});
export type Evidence = z.infer<typeof Evidence>;

export const DaySummary = z.object({
  day: z.string(),
  planned: z.number().int(),
  done: z.number().int(),
  skipped: z.number().int(),
  partial: z.number().int(),
  evidenceCount: z.number().int(),
  sealedAt: z.string().nullable(),
  moodWord: z.string().nullable(),
  proof: z.string().nullable(),
  gladOf: z.string().nullable(),
  /**
   * The verdict on the proof line typed when the day was sealed. The dawn brief
   * reads that line back the next morning, so it needs to know.
   */
  safetyRisk: SafetyRisk.optional(),
});
export type DaySummary = z.infer<typeof DaySummary>;

export const Scene = z.object({
  id: z.string(),
  goalId: z.string(),
  type: z.enum(['practice', 'moment', 'tuesday', 'other_road']),
  imagePrompt: z.string(),
  imageUri: z.string().nullable(),
  narrative: z.string(),
  /** A detail lifted from the user's own writing; required by schema. */
  sourcedDetail: z.string(),
  tone: z.enum(['warmer', 'simpler', 'closer']).nullable(),
  createdAt: z.string(),
});
export type Scene = z.infer<typeof Scene>;

export const Letter = z.object({
  id: z.string(),
  goalId: z.string().nullable(),
  direction: z.enum(['from_future', 'to_future']),
  body: z.string(),
  quotes: z.array(z.string()),
  trigger: z.string(),
  deliverAt: z.string(),
  readAt: z.string().nullable(),
});
export type Letter = z.infer<typeof Letter>;

export const Brief = z.object({
  id: z.string(),
  day: z.string(),
  kind: z.enum(['dawn', 'evening', 'weekly']),
  yesterday: z.string(),
  today: z.string(),
  ifThen: z.string(),
  quotedSpans: z.array(z.string()),
  firstMoveId: z.string().nullable(),
  /**
   * The one-time line pointing at professional support (PRD 11.6: concern
   * "suggests professional support once"). Null on every other brief, which is
   * almost all of them.
   */
  support: z.string().nullable().default(null),
  /**
   * Whether this brief was written in the concern band. The screen needs to
   * know as well as the engine: the Consistency figure at the foot of the card
   * is a numeric target like any other, and "avoids numeric targets" means it
   * too, not only the one in the Yesterday line.
   */
  soften: z.boolean().default(false),
  createdAt: z.string(),
});
export type Brief = z.infer<typeof Brief>;

export const CoachMessage = z.object({
  id: z.string(),
  role: z.enum(['user', 'coach']),
  text: z.string(),
  quotedSpans: z.array(z.string()).default([]),
  safetyRisk: SafetyRisk.default('none'),
  createdAt: z.string(),
});
export type CoachMessage = z.infer<typeof CoachMessage>;

export const Profile = z.object({
  displayName: z.string(),
  persona: Persona,
  track: DepthTrack,
  wakeTime: z.string(),
  eveningTime: z.string(),
  dayBoundaryHour: z.number().int().min(0).max(6),
  sundayHour: z.number().int(),
  soundOn: z.boolean(),
  hapticsOn: z.boolean(),
  reducedMotion: z.boolean(),
  consentedAt: z.string().nullable(),
  entitled: z.boolean(),
  /**
   * When the app last pointed at professional support. PRD 11.6 says once, and
   * this is what makes it once rather than every morning that a flat week
   * happens to trip the concern band.
   */
  supportOfferedAt: z.string().nullable().default(null),
});
export type Profile = z.infer<typeof Profile>;

export const DEFAULT_PROFILE: Profile = {
  displayName: '',
  persona: 'gentle',
  track: 'starter',
  wakeTime: '07:00',
  eveningTime: '21:30',
  dayBoundaryHour: 3,
  sundayHour: 10,
  soundOn: true,
  hapticsOn: true,
  reducedMotion: false,
  consentedAt: null,
  entitled: false,
  supportOfferedAt: null,
};

// ---------------------------------------------------------------- domain meta

export interface DomainMeta {
  id: DomainId;
  label: string;
  /**
   * The stone colour (PRD 8.3). A mark, not a text colour: it clears 3:1
   * against the day ground, which is the threshold for a graphical object and
   * nothing like enough to read a 12px label in.
   */
  hex: string;
  /**
   * The same hue, dark enough to be read as small text on a light ground.
   * Screens that set a domain colour on type take this one. Mind's amber
   * measured 1.97:1 as a label, which is not a colour anybody can read.
   */
  ink: string;
  /** The same hue, light enough to be read in the night studio. */
  inkNight: string;
  gradient: [string, string, string, string];
}

export const DOMAINS: Record<Exclude<DomainId, 'custom'>, DomainMeta> = {
  health: {
    id: 'health',
    label: 'Health',
    hex: '#EA4B2E',
    ink: '#CB3014',
    inkNight: '#ED6147',
    gradient: ['#FFDCCF', '#FF8A66', '#EA4B2E', '#7A1D10'],
  },
  money: {
    id: 'money',
    label: 'Money',
    hex: '#169A89',
    ink: '#11796C',
    inkNight: '#179F8D',
    gradient: ['#D6FAF4', '#4FDCCB', '#169A89', '#0A4A42'],
  },
  craft: {
    id: 'craft',
    label: 'Work & craft',
    hex: '#6D4BE8',
    ink: '#6D4BE8',
    inkNight: '#957CEE',
    gradient: ['#EAE3FF', '#A98FFF', '#6D4BE8', '#2E1F7A'],
  },
  mind: {
    id: 'mind',
    label: 'Mind & sleep',
    hex: '#F09A12',
    ink: '#966009',
    inkNight: '#F09A12',
    gradient: ['#FFF3D2', '#FFC85E', '#F09A12', '#7A4A05'],
  },
  people: {
    id: 'people',
    label: 'People',
    hex: '#E23A6E',
    ink: '#CF1E55',
    inkNight: '#E75E88',
    gradient: ['#FFE3EC', '#FF8FB0', '#E23A6E', '#6E1230'],
  },
  home: {
    id: 'home',
    label: 'Home',
    hex: '#5E9E2E',
    ink: '#477823',
    inkNight: '#5E9E2E',
    gradient: ['#E6F5D6', '#A9DC7A', '#5E9E2E', '#244A0E'],
  },
};

export const CUSTOM_DOMAIN: DomainMeta = {
  id: 'custom',
  label: 'Something else',
  hex: '#8E8A80',
  ink: '#67645C',
  inkNight: '#A8A49A',
  gradient: ['#FFFFFF', '#F3F1EC', '#CFCBC2', '#8E8A80'],
};

export function domainMeta(id: DomainId): DomainMeta {
  if (id === 'custom') return CUSTOM_DOMAIN;
  return DOMAINS[id];
}
