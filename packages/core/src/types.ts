/**
 * Morrow domain types. See PRD §10.3.
 *
 * The one rule that shapes every type here: the user writes the words.
 * Anything the model produced is either (a) a quotation of the user's own text,
 * verified as a substring, or (b) structure that points at a user line by id.
 *
 * Type-only, on purpose: the shapes are declared as zod schemas in
 * `schemas.ts` and inferred here, and nothing in this file runs. Before this
 * split every screen imported its types from a module that built thirty
 * zod schemas on load, and zod was a sixth of the web app's first load for
 * one `safeParse` during an account pull.
 */
import type { z } from 'zod';
import type * as S from './schemas';

export type DomainId = z.infer<typeof S.DomainId>;
export type DepthTrack = z.infer<typeof S.DepthTrack>;
export type AnalysisKind = z.infer<typeof S.AnalysisKind>;
export type WritingKind = z.infer<typeof S.WritingKind>;
export type WritingMode = z.infer<typeof S.WritingMode>;
export type SafetyRisk = z.infer<typeof S.SafetyRisk>;
export type PresentPickRow = z.infer<typeof S.PresentPickRow>;
export type PastEpochRow = z.infer<typeof S.PastEpochRow>;
export type PastEventRow = z.infer<typeof S.PastEventRow>;
export type MoveStatus = z.infer<typeof S.MoveStatus>;
export type Persona = z.infer<typeof S.Persona>;
export type Goal = z.infer<typeof S.Goal>;
export type AuthoringSession = z.infer<typeof S.AuthoringSession>;
export type AuthoringText = z.infer<typeof S.AuthoringText>;
export type GoalAnalysis = z.infer<typeof S.GoalAnalysis>;
export type Portrait = z.infer<typeof S.Portrait>;
export type Move = z.infer<typeof S.Move>;
export type Milestone = z.infer<typeof S.Milestone>;
export type ObstaclePlan = z.infer<typeof S.ObstaclePlan>;
export type Plan = z.infer<typeof S.Plan>;
export type BookChapterLine = z.infer<typeof S.BookChapterLine>;
export type BookChapter = z.infer<typeof S.BookChapter>;
export type BookVersion = z.infer<typeof S.BookVersion>;
export type MemoryEdit = z.infer<typeof S.MemoryEdit>;
export type Practice = z.infer<typeof S.Practice>;
export type Evidence = z.infer<typeof S.Evidence>;
export type DaySummary = z.infer<typeof S.DaySummary>;
export type Scene = z.infer<typeof S.Scene>;
export type Letter = z.infer<typeof S.Letter>;
export type Brief = z.infer<typeof S.Brief>;
export type CoachMessage = z.infer<typeof S.CoachMessage>;
export type Profile = z.infer<typeof S.Profile>;

export const ANALYSIS_ORDER: AnalysisKind[] = [
  'motives',
  'impact',
  'strategies',
  'obstacles',
  'monitoring',
];

/** Analyses every goal gets, on either track. The rest are top-three (starter) or all (full). */
export const CORE_ANALYSES: AnalysisKind[] = ['strategies', 'obstacles'];

export const DEFAULT_PROFILE: Profile = {
  displayName: '',
  persona: 'gentle',
  track: 'starter',
  wakeTime: '07:00',
  eveningTime: '21:30',
  dayBoundaryHour: 3,
  sundayHour: 10,
  shiftDays: [],
  shiftWakeTime: '13:00',
  shiftEveningTime: '23:00',
  soundOn: true,
  hapticsOn: true,
  reducedMotion: false,
  appearance: 'light',
  writeWhen: 'evening',
  firstArea: null,
  consentedAt: null,
  entitled: false,
  supportOfferedAt: null,
  mutedMoments: [],
  notificationsOff: false,
  notificationsAsked: false,
  paywallSeen: [],
  todayIntroSeen: false,
  hideClock: false,
  witnessName: '',
  declaredAt: null,
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
    hex: '#C27B0C',
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
    hex: '#5C9A2D',
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
