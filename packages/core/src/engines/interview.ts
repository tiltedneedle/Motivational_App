/**
 * The Interview: tap-only goal discovery (PRD §7.1).
 *
 * Every answer is a tap. "Something else…" is always the last option and is the
 * only place a person types, and a custom answer skips the follow-up.
 * The bank is data, so the whole Interview runs offline; the server engine
 * (§7.1 "adaptive engine") can replace `nextQuestion` later without changing callers.
 */
import { plural } from '../ids';
import type { DomainId } from '../types';

export interface Branch {
  /** What a win would look like. */
  label: string;
  /** The follow-up that sharpens it. */
  question: string;
  options: string[];
  /** Builds the goal's working name from the follow-up answer. */
  title: (answer: string) => string;
}

export interface AreaDef {
  id: string;
  domain: DomainId;
  label: string;
  /** The area's opening question. */
  question: string;
  branches: Branch[];
}

export const HORIZONS = ['Three months', 'Six months', 'A year', 'No deadline'] as const;

export const ADMIRE_OPTIONS = [
  'Someone in my family',
  'A friend',
  "Someone I’ve only read about",
] as const;

/** The last option on the admire question: nobody is written down, and the Interview goes on. */
export const ADMIRE_SKIP = 'Skip this one';

export const AREAS: AreaDef[] = [
  {
    id: 'health',
    domain: 'health',
    label: 'Health',
    question: 'In six months, what would feel like a win?',
    branches: [
      {
        label: 'Finish a race',
        question: 'How far?',
        options: ['5 km', '10 km', 'A half marathon', 'A marathon'],
        title: (a) =>
          a === 'A half marathon' ? 'Half marathon' : a === 'A marathon' ? 'Marathon' : `${a} race`,
      },
      {
        label: 'Feel strong',
        question: 'What does strong look like?',
        options: ['Lift my own weight', 'Stairs without thinking', 'An hour on the floor with the kids'],
        title: (a) => a,
      },
      {
        label: 'Sleep properly',
        question: 'What is the one number?',
        options: ['Lights out by 11', 'Seven hours', 'No phone in bed'],
        title: (a) => a,
      },
      {
        label: 'Move every day',
        question: 'How long, on a normal day?',
        options: ['Ten minutes', 'Twenty minutes', 'Half an hour'],
        title: (a) => `${a} a day`,
      },
    ],
  },
  {
    id: 'money',
    domain: 'money',
    label: 'Money',
    question: 'What would breathing room look like?',
    branches: [
      {
        label: 'An emergency fund',
        question: 'How many months of it?',
        options: ['One month', 'Three months', 'Six months'],
        title: (a) => `${a} of breathing room`,
      },
      {
        label: 'Clear a debt',
        question: 'Which one first?',
        options: ['The card', 'The overdraft', 'The loan'],
        title: (a) => `Clear ${a.toLowerCase()}`,
      },
      {
        label: 'Save for something',
        question: 'For what?',
        options: ['A trip', 'A home', 'A course'],
        title: (a) => `Save for ${a.toLowerCase()}`,
      },
      {
        label: 'Earn more',
        question: 'How?',
        options: ['A raise', 'A side project', 'A new job'],
        title: (a) => a,
      },
    ],
  },
  {
    id: 'craft',
    domain: 'craft',
    label: 'Work & craft',
    question: 'What do you want to have made?',
    branches: [
      {
        label: 'A pitch or a talk',
        question: 'Where will it land?',
        options: ['Investors', 'My team', 'A stage'],
        title: (a) => (a === 'A stage' ? 'Ship the pitch on stage' : 'Ship the pitch'),
      },
      {
        label: 'A book or a long piece',
        question: 'How long?',
        options: ['An essay', 'A short book', 'The whole thing'],
        title: (a) => `Finish ${a.toLowerCase()}`,
      },
      {
        label: 'A portfolio',
        question: 'How many pieces?',
        options: ['Three', 'Six', 'Ten'],
        title: (a) => `A ${a.toLowerCase()}‑piece portfolio`,
      },
      {
        label: 'A skill I am learning',
        question: 'Which one?',
        options: ['A language', 'An instrument', 'Code', 'Drawing'],
        title: (a) => `Learn ${a.toLowerCase().replace(/^an? /, '')}`,
      },
    ],
  },
  {
    id: 'mind',
    domain: 'mind',
    label: 'Mind & sleep',
    question: 'What would quieter feel like?',
    branches: [
      {
        label: 'Sleep by eleven',
        question: 'How many nights a week?',
        options: ['Most nights', 'Every weeknight', 'Every night'],
        title: () => 'Sleep by eleven',
      },
      {
        label: 'A daily practice',
        question: 'Which kind?',
        options: ['Sitting still', 'Writing', 'Prayer', 'A walk'],
        title: (a) => `${a}, daily`,
      },
      {
        label: 'Less phone',
        question: 'What is the rule?',
        options: ['Not in bed', 'Not at meals', 'Not before nine'],
        title: (a) => `Phone ${a.toLowerCase()}`,
      },
      {
        label: 'Fewer spirals',
        question: 'When do they hit?',
        options: ['At night', 'Sunday evenings', 'Before work'],
        title: (a) => `Calm ${a.toLowerCase()}`,
      },
    ],
  },
  {
    id: 'people',
    domain: 'people',
    label: 'People',
    question: 'Who is this about?',
    branches: [
      {
        label: 'Family',
        question: 'What would change?',
        options: ['A weekly call', 'A real visit', 'Being there more'],
        title: (a) => `${a} with family`,
      },
      {
        label: 'A partner',
        question: 'What would change?',
        options: ['A night a week', 'Saying it out loud', 'Planning something'],
        title: (a) => `${a} together`,
      },
      {
        label: 'Friends',
        question: 'What would change?',
        options: ['Seeing them monthly', 'Replying the same day', 'One trip'],
        title: (a) => a,
      },
      {
        label: 'New people',
        question: 'Where?',
        options: ['A club', 'A class', 'Work'],
        title: (a) => `New people at ${a.toLowerCase()}`,
      },
    ],
  },
  {
    id: 'home',
    domain: 'home',
    label: 'Home',
    question: 'What is the picture?',
    branches: [
      {
        label: 'A calm space',
        question: 'Start where?',
        options: ['The bedroom', 'The desk', 'The kitchen'],
        title: (a) => `A calm ${a.toLowerCase().replace('the ', '')}`,
      },
      {
        label: 'A move',
        question: 'How far?',
        options: ['Across town', 'Another city', 'Another country'],
        title: (a) => `Move ${a.toLowerCase()}`,
      },
      {
        label: 'Cooking again',
        question: 'How often?',
        options: ['Twice a week', 'Most nights', 'Sundays'],
        title: (a) => `Cook ${a.toLowerCase()}`,
      },
      {
        label: 'A garden',
        question: 'What kind?',
        options: ['Herbs on the sill', 'A balcony', 'A real bed'],
        title: (a) => a,
      },
    ],
  },
];

/** A custom area the user named. Gets a generic but honest branch set. */
export function customArea(name: string, index: number): AreaDef {
  const clean = name.trim();
  return {
    id: `custom-${index}`,
    domain: 'custom',
    label: clean,
    question: `What would a win look like for “${clean}”?`,
    branches: [
      {
        label: 'Start it',
        question: 'What is the first real step?',
        options: ['Book the time', 'Tell someone', 'Buy the thing'],
        title: () => `Start: ${clean}`,
      },
      {
        label: 'Finish it',
        question: 'How far along are you?',
        options: ['Barely started', 'Halfway', 'Nearly there'],
        title: () => `Finish: ${clean}`,
      },
      {
        label: 'Do it every week',
        question: 'How many times?',
        options: ['Once', 'Twice', 'Three times'],
        title: (a) => `${clean}, ${a.toLowerCase()} a week`,
      },
    ],
  };
}

// ---------------------------------------------------------------- state machine

export type InterviewStage = 'areas' | 'branch' | 'follow' | 'horizon' | 'admire' | 'summary';

export interface InterviewDraft {
  id: string;
  areaId: string;
  domain: DomainId;
  domainLabel?: string;
  title: string;
  horizon: string;
  branchLabel: string | null;
  followAnswer: string | null;
  custom: boolean;
}

export interface InterviewState {
  stage: InterviewStage;
  /** Chosen area ids, in the order picked. */
  picked: string[];
  customAreas: AreaDef[];
  /** Index into `picked` for the area being shaped. */
  cursor: number;
  branchLabel: string | null;
  followAnswer: string | null;
  customBranch: string | null;
  drafts: InterviewDraft[];
  admire: { who: string; line: string } | null;
  /** Questions answered, for the clarity ring. */
  answered: number;
}

export function initialInterview(): InterviewState {
  return {
    stage: 'areas',
    picked: [],
    customAreas: [],
    cursor: 0,
    branchLabel: null,
    followAnswer: null,
    customBranch: null,
    drafts: [],
    admire: null,
    answered: 0,
  };
}

export const MAX_AREAS = 8;

export function allAreas(s: InterviewState): AreaDef[] {
  return [...AREAS, ...s.customAreas];
}

export function areaById(s: InterviewState, id: string): AreaDef | undefined {
  return allAreas(s).find((a) => a.id === id);
}

export function pickedAreas(s: InterviewState): AreaDef[] {
  return s.picked.map((id) => areaById(s, id)).filter((a): a is AreaDef => Boolean(a));
}

export function currentArea(s: InterviewState): AreaDef | undefined {
  return pickedAreas(s)[s.cursor];
}

/** Total questions this run will ask, for the clarity ring. */
export function totalQuestions(s: InterviewState): number {
  return 1 + Math.max(1, s.picked.length) * 3 + 1;
}

export function clarity(s: InterviewState): number {
  if (s.stage === 'summary') return 1;
  return Math.min(1, Math.max(0.08, s.answered / totalQuestions(s)));
}

/** The coach's running guess, built only from the user's own picks. Never generated prose. */
export function guessLine(s: InterviewState): string {
  if (s.stage === 'areas') {
    if (s.picked.length === 0) return 'Pick as many as are true. I will narrow it down from there.';
    return `Something about ${pickedAreas(s)
      .map((a) => a.label.toLowerCase())
      .join(', ')}…`;
  }
  if (s.stage === 'summary') {
    return s.drafts.length === 1
      ? 'One goal, held clearly.'
      : `${plural(s.drafts.length, 'goal')}. I think I’ve got you.`;
  }
  const area = currentArea(s);
  if (!area) return '';
  const bits = [area.label.toLowerCase()];
  if (s.branchLabel) bits.push(s.branchLabel.toLowerCase());
  if (s.followAnswer) bits.push(s.followAnswer.toLowerCase());
  return bits.length === 1 ? `${area.label}. I’m listening…` : `I’m seeing ${bits.join(' → ')}…`;
}

export interface Question {
  stage: InterviewStage;
  prompt: string;
  options: string[];
  /** Multi-select only on the areas question. */
  multi: boolean;
  customHint: string;
  /** Custom answers on a branch question skip the follow-up. */
  customSkipsFollow: boolean;
}

export function question(s: InterviewState): Question {
  switch (s.stage) {
    case 'areas':
      return {
        stage: 'areas',
        prompt: 'Which parts of life are pulling at you right now?',
        options: allAreas(s).map((a) => a.label),
        multi: true,
        customHint: 'Name it in a word or two',
        customSkipsFollow: false,
      };
    case 'branch': {
      const area = currentArea(s);
      return {
        stage: 'branch',
        prompt: area?.question ?? '',
        options: area?.branches.map((b) => b.label) ?? [],
        multi: false,
        customHint: 'Your own words',
        customSkipsFollow: true,
      };
    }
    case 'follow': {
      const area = currentArea(s);
      const branch = area?.branches.find((b) => b.label === s.branchLabel);
      return {
        stage: 'follow',
        prompt: branch?.question ?? '',
        options: branch?.options ?? [],
        multi: false,
        customHint: 'Your own answer',
        customSkipsFollow: false,
      };
    }
    case 'horizon':
      return {
        stage: 'horizon',
        prompt: 'By when?',
        options: [...HORIZONS],
        multi: false,
        customHint: 'A date or a season',
        customSkipsFollow: false,
      };
    case 'admire':
      return {
        stage: 'admire',
        prompt: 'Who already lives a piece of this?',
        options: [...ADMIRE_OPTIONS, ADMIRE_SKIP],
        multi: false,
        customHint: 'Someone else',
        customSkipsFollow: false,
      };
    case 'summary':
      return {
        stage: 'summary',
        prompt: "Here’s what I heard.",
        options: [],
        multi: false,
        customHint: '',
        customSkipsFollow: false,
      };
  }
}

export function toggleArea(s: InterviewState, areaId: string): InterviewState {
  const has = s.picked.includes(areaId);
  if (!has && s.picked.length >= MAX_AREAS) return s;
  return {
    ...s,
    picked: has ? s.picked.filter((id) => id !== areaId) : [...s.picked, areaId],
  };
}

export function addCustomArea(s: InterviewState, name: string): InterviewState {
  const clean = name.trim();
  if (!clean) return s;
  if (s.picked.length >= MAX_AREAS) return s;
  const area = customArea(clean, s.customAreas.length + 1);
  return { ...s, customAreas: [...s.customAreas, area], picked: [...s.picked, area.id] };
}

/**
 * Move from picking areas to shaping them.
 *
 * The cursor lands on the first picked area that has not been shaped yet, not
 * on zero. Picking more areas and coming back here used to re-ask every area
 * the person had already answered and append a second draft for each, so
 * "add another" quietly doubled their list.
 */
export function beginBranches(s: InterviewState): InterviewState {
  if (s.picked.length === 0) return s;
  const shaped = new Set(s.drafts.map((d) => d.areaId));
  const next = s.picked.findIndex((id) => !shaped.has(id));
  if (next === -1) {
    // Everything picked has been shaped, so there is nothing left to ask.
    return { ...s, stage: 'admire', branchLabel: null, followAnswer: null };
  }
  return {
    ...s,
    stage: 'branch',
    cursor: next,
    answered: s.answered + 1,
    branchLabel: null,
    followAnswer: null,
    customBranch: null,
  };
}

/** One tap. `custom` marks an answer the user typed. */
export function answer(s: InterviewState, value: string, custom = false): InterviewState {
  const area = currentArea(s);
  switch (s.stage) {
    case 'branch': {
      const branch = area?.branches.find((b) => b.label === value);
      if (custom || !branch) {
        return { ...s, stage: 'horizon', branchLabel: value, customBranch: value, answered: s.answered + 1 };
      }
      return { ...s, stage: 'follow', branchLabel: value, customBranch: null, answered: s.answered + 1 };
    }
    case 'follow':
      // Typed rather than tapped, the answer is the goal's name as they
      // wrote it. Passed through the bank's template it came back lowercased
      // and wrapped — "Save for my mum’s 70th in lisbon" — and marked as the
      // app's words.
      return { ...s, stage: 'horizon', followAnswer: value, customBranch: custom ? value : s.customBranch, answered: s.answered + 1 };
    case 'horizon': {
      if (!area) return s;
      const branch = area.branches.find((b) => b.label === s.branchLabel);
      const title =
        s.customBranch != null
          ? s.customBranch
          : branch && s.followAnswer
            ? branch.title(s.followAnswer)
            : (s.branchLabel ?? area.label);
      const draft: InterviewDraft = {
        id: `${area.id}-${s.drafts.length}`,
        areaId: area.id,
        domain: area.domain,
        ...(area.domain === 'custom' ? { domainLabel: area.label } : {}),
        title,
        horizon: value,
        branchLabel: s.branchLabel,
        followAnswer: s.followAnswer,
        custom: s.customBranch != null,
      };
      const drafts = [...s.drafts, draft];
      // Skip past anything already shaped, so a second pass through the
      // Interview only asks about what is genuinely new.
      const shaped = new Set(drafts.map((d) => d.areaId));
      let nextCursor = s.cursor + 1;
      while (nextCursor < s.picked.length && shaped.has(s.picked[nextCursor] as string)) nextCursor++;
      const more = nextCursor < s.picked.length;
      return {
        ...s,
        drafts,
        cursor: nextCursor,
        branchLabel: null,
        followAnswer: null,
        customBranch: null,
        answered: s.answered + 1,
        stage: more ? 'branch' : 'admire',
      };
    }
    case 'admire':
      return { ...s, admire: value === ADMIRE_SKIP ? null : { who: value, line: '' }, stage: 'summary', answered: s.answered + 1 };
    default:
      return s;
  }
}

export function setAdmireLine(s: InterviewState, line: string): InterviewState {
  return { ...s, admire: { who: s.admire?.who ?? '', line } };
}

export function dropDraft(s: InterviewState, id: string): InterviewState {
  const draft = s.drafts.find((d) => d.id === id);
  return {
    ...s,
    drafts: s.drafts.filter((d) => d.id !== id),
    picked: draft ? s.picked.filter((p) => p !== draft.areaId) : s.picked,
  };
}

/** Back to question 1, keeping what was already shaped. */
export function addAnother(s: InterviewState): InterviewState {
  return { ...s, stage: 'areas', cursor: s.picked.length, branchLabel: null, followAnswer: null };
}

/**
 * Seeds handed to the Fifteen's margin: the user's own answers, quoted back.
 * Never model text.
 */
export function seeds(s: InterviewState): string[] {
  const out = s.drafts.map((d) => d.title);
  if (s.admire?.line?.trim()) out.push(s.admire.line.trim());
  return out;
}
