/**
 * The framing bank: five analyses × the domains (PRD §7.2, the Authoring Script).
 *
 * A framing is three or four things a person might say, offered as taps so the
 * page is never blank. Tapping one is NOT an answer — the user's line is.
 * Full-track prompts sit above the paragraph box; they are the program's own
 * five questions, rewritten in Morrow's voice.
 */
import type { AnalysisKind, DomainId } from '../types';

export interface Framing {
  id: string;
  label: string;
}

export interface FramingSet {
  kind: AnalysisKind;
  question: string;
  framings: Framing[];
  /** Shown above the box on the Full track, as prompts, not questions to answer one by one. */
  fullPrompts: string[];
  /** Placeholder for the user's line. */
  hint: string;
}

const MOTIVE_FRAMINGS: Framing[] = [
  { id: 'm-shame', label: "Mine, and it would shame me to drop it" },
  { id: 'm-enjoy', label: "Mine, and I'd enjoy the doing" },
  { id: 'm-other', label: 'Someone wants it for me' },
  { id: 'm-demand', label: 'Life is demanding it' },
];

const IMPACT_FRAMINGS: Framing[] = [
  { id: 'i-home', label: 'The people I live with' },
  { id: 'i-work', label: 'The people I work with' },
  { id: 'i-unmet', label: "People I haven't met" },
  { id: 'i-me', label: "Mostly me, and that's enough" },
];

const STRATEGY_FRAMINGS: Framing[] = [
  { id: 's-daily', label: 'A small thing daily' },
  { id: 's-thrice', label: 'A bigger thing three times a week' },
  { id: 's-weekend', label: 'One long thing at the weekend' },
  { id: 's-stop', label: 'Something I stop doing' },
];

const OBSTACLE_FRAMINGS: Framing[] = [
  { id: 'o-drift', label: 'I start and drift' },
  { id: 'o-others', label: "Other people's needs come first" },
  { id: 'o-runout', label: 'Money or time runs out' },
  { id: 'o-talkout', label: "I'll talk myself out of it" },
];

const MONITOR_FRAMINGS: Framing[] = [
  { id: 'n-number', label: 'A number I can check' },
  { id: 'n-notice', label: 'Something someone else would notice' },
  { id: 'n-feel', label: "A feeling I'd recognise" },
  { id: 'n-date', label: "A date I'd hit" },
];

/** The Motives question changes by domain so the fourth goal never reads like the first. */
const MOTIVE_QUESTION: Record<DomainId, string> = {
  health: 'Whose goal is this, honestly?',
  money: "What does this buy that money can't?",
  craft: "Who is the one person you'd want to show it to?",
  mind: 'What would you stop carrying?',
  people: 'What would you have said sooner?',
  home: 'What would you stop noticing?',
  custom: 'Whose goal is this, honestly?',
};

const IMPACT_QUESTION: Record<DomainId, string> = {
  health: "Say it's done. Who changes besides you?",
  money: "Say it's done. What stops being a conversation?",
  craft: "Say it's done. Who sees it first?",
  mind: "Say it's done. Who gets the calmer version of you?",
  people: "Say it's done. What does the other person feel?",
  home: "Say it's done. Who else lives in it?",
  custom: "Say it's done. Who changes besides you?",
};

export function framingSet(kind: AnalysisKind, domain: DomainId): FramingSet {
  switch (kind) {
    case 'motives':
      return {
        kind,
        question: MOTIVE_QUESTION[domain],
        framings: MOTIVE_FRAMINGS,
        fullPrompts: [
          'Do you truly believe it matters?',
          'Would you feel it if you dropped it?',
          'Is it yours, or to please someone?',
          'Is it demanded by where you are?',
          'Would the doing itself satisfy you?',
          'Is it part of something you have wanted for a long time?',
        ],
        hint: 'Why this, why now',
      };
    case 'impact':
      return {
        kind,
        question: IMPACT_QUESTION[domain],
        framings: IMPACT_FRAMINGS,
        fullPrompts: [
          'How would success change how you see yourself?',
          'What else in your life changes?',
          'How would the people around you see it?',
          'Who benefits that you have not thought about?',
        ],
        hint: "The first thing that would be different in someone else's week",
      };
    case 'strategies':
      return {
        kind,
        question: 'What happens on an ordinary Tuesday because of this?',
        framings: STRATEGY_FRAMINGS,
        fullPrompts: [
          'What daily and weekly behaviours does this need?',
          'When will you do them, and where?',
          'How often, and for how long?',
          'What has to be true the night before?',
        ],
        hint: 'One line with a time and a place in it',
      };
    case 'obstacles':
      return {
        kind,
        question: 'What stops this? You already know.',
        framings: OBSTACLE_FRAMINGS,
        fullPrompts: [
          'What natural, social and personal barriers are real here?',
          'How might you sabotage yourself?',
          'Who will help, and who will get in the way?',
          'What is the realistic worst case, and the plan for it?',
        ],
        hint: 'If ___ happens, then I ___',
      };
    case 'monitoring':
      return {
        kind,
        question: "How will you know it's working before it's done?",
        framings: MONITOR_FRAMINGS,
        fullPrompts: [
          'What counts as evidence of progress?',
          'How often will you look?',
          'What measurable change would satisfy you?',
          'How will you tell pushing hard from being unkind to yourself?',
        ],
        hint: "What counts as proof, and how often you'll look",
      };
  }
}

export function framingLabel(kind: AnalysisKind, domain: DomainId, id: string | null): string | null {
  if (!id) return null;
  return framingSet(kind, domain).framings.find((f) => f.id === id)?.label ?? null;
}

export const ANALYSIS_TITLES: Record<AnalysisKind, string> = {
  motives: 'Motives',
  impact: 'Impact',
  strategies: 'Strategies',
  obstacles: 'Obstacles',
  monitoring: 'Monitoring',
};
