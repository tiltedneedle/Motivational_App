/**
 * The safety layer (PRD §11.6).
 *
 * Runs on the raw text, on device, before anything is sent anywhere and before
 * anything is written to the coach's memory. A local screen cannot be perfect,
 * so it is deliberately over-sensitive on crisis and quiet on concern: the cost
 * of a false positive is a resources card the user can dismiss; the cost of a
 * false negative is unacceptable.
 */
import type { SafetyRisk } from '../types';

/**
 * Written to catch the way people actually write, not the dictionary form.
 *
 * Three things this list has to survive, because a person in trouble writes
 * quickly and in the past tense:
 *
 *  - Contractions. "I don't want to be here" is the ordinary phrasing and the
 *    earlier `\bnot want\b` could never match it, because the word in the
 *    sentence is "don't". The commonest form was the one that got through.
 *  - Inflection. "killing myself", "ended my life", "wanted to die".
 *  - The gap between "myself" and a body part: people write "cutting my arms".
 *
 * Negations are deliberately NOT excluded. "I don't want to kill myself" still
 * raises the card, because the cost of being wrong here is a card someone
 * dismisses in one tap, and the cost of the other mistake has no floor.
 */
const CRISIS = [
  // Inflections only for "myself", which is unambiguous. "kill me" stays in
  // its bare form: "it killed me", "this deadline is killing me" and "that
  // joke killed me" are ordinary English, and a card that fires on those
  // teaches people to dismiss it without reading, which is the one way this
  // screen can be made worse at its job.
  /\bkill(?:ing|ed|s)?\s+my ?self\b/i,
  /\bkill\s+me\b/i,
  /\b(?:end|ending|ended|ends|take|taking|took)\s+(?:my|this)\s+(?:own\s+)?life\b/i,
  /\bend(?:ing|ed)?\s+it\s+all\b/i,
  /\bsuicid\w*/i,
  /\bunalive\w*/i,
  /\bwant(?:ed|ing|s)?\s+to\s+(?:die|be\s+dead|not\s+exist)\b/i,
  // "do not want", "don't want", "didn't want", "doesn't want".
  /\b(?:do|does|did)(?:\s+not|n['’]?t)\s+want\s+to\s+(?:be\s+here|be\s+alive|live|wake\s+up|exist|go\s+on|carry\s+on)\b/i,
  /\bnot\s+want(?:ing)?\s+to\s+(?:be\s+here|be\s+alive|live|wake\s+up|exist)\b/i,
  /\bwish(?:ed|ing)?\s+(?:i|I)\s+(?:was|were|wasn['’]?t|weren['’]?t)\s+(?:dead|here|alive|born|never\s+born)\b/i,
  /\bbetter\s+off\s+(?:without\s+me|dead|if\s+i\s+(?:was|were)n['’]?t)\b/i,
  /\bself[- ]?harm\w*/i,
  /\b(?:cut|cutting|cuts|hurt|hurting|hurts|harm|harming)\s+(?:my ?self|my\s+(?:arms?|legs?|wrists?|thighs?|skin))\b/i,
  /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:go(?:ing)?\s+on|carry(?:ing)?\s+on|liv(?:e|ing)|be(?:ing)?\s+here)\b/i,
  /\bnothing\s+(?:left\s+)?to\s+live\s+for\b/i,
  /\boverdos\w*/i,
  /\b(?:don['’]?t|do\s+not)\s+want\s+to\s+be\s+(?:here|alive)\s+any\s?more\b/i,
];

const CONCERN = [
  /\bhat(?:e|ed|ing)\s+my ?self\b/i,
  /\bworthless\b/i,
  /\bi(?:['’]| a)?m\s+a\s+failure\b/i,
  /\bcan(?:['’]?t|not)\s+(?:cope|go\s+on|carry\s+on|do\s+this\s+any\s?more)\b/i,
  // "bingeing" keeps its e, and it is the spelling people use.
  /\b(?:starv(?:e|es|ed|ing)|purg(?:e|es|ed|ing)|bing(?:e|es|ed|ing|eing)|restrict(?:ing|ed)?\s+(?:my\s+)?(?:food|calories|intake))\b/i,
  /\b\d{2,4}\s?(?:kg|lbs?|pounds|kcal|calories)\b.{0,24}\b(?:lose|lost|losing|target|goal|under|max)\b/i,
  /\b(?:drink|drinking|drank)\s+(?:too\s+much|every\s?(?:day|night)|to\s+forget)\b/i,
  /\bpanic\s+attacks?\b/i,
  /\bhopeless(?:ness)?\b/i,
  /\bnobody\s+(?:would|will|even)\s+(?:care|notice|miss)\b/i,
  /\bnumb\s+(?:all\s+the\s+time|most\s+days)\b/i,
];

export interface SafetyResult {
  risk: SafetyRisk;
  /** Never the matched text: we log the category, not the person's words. */
  category: 'self-harm' | 'despair' | 'disordered-eating' | 'substance' | null;
  action: 'continue' | 'soften' | 'resources';
}

const RANK: Record<SafetyRisk, number> = { none: 0, concern: 1, crisis: 2 };

/** The stricter of two verdicts. A second opinion may only ever tighten. */
export function worseRisk(a: SafetyRisk, b: SafetyRisk): SafetyRisk {
  return RANK[a] >= RANK[b] ? a : b;
}

export function isWorse(candidate: SafetyRisk, current: SafetyRisk): boolean {
  return RANK[candidate] > RANK[current];
}

export function actionFor(risk: SafetyRisk): SafetyResult['action'] {
  return risk === 'crisis' ? 'resources' : risk === 'concern' ? 'soften' : 'continue';
}

export function screen(text: string): SafetyResult {
  const t = text ?? '';
  if (!t.trim()) return { risk: 'none', category: null, action: 'continue' };

  for (const re of CRISIS) {
    if (re.test(t)) return { risk: 'crisis', category: 'self-harm', action: 'resources' };
  }
  for (const re of CONCERN) {
    if (re.test(t)) {
      const category = /\b(?:starv|purg|bing)\w*|\b(?:kg|lbs|pounds)\b/i.test(t)
        ? 'disordered-eating'
        : /\bdrink\w*/i.test(t)
          ? 'substance'
          : 'despair';
      return { risk: 'concern', category, action: 'soften' };
    }
  }
  return { risk: 'none', category: null, action: 'continue' };
}

export interface Helpline {
  region: string;
  name: string;
  contact: string;
}

export const HELPLINES: Helpline[] = [
  { region: 'US', name: '988 Suicide & Crisis Lifeline', contact: '988' },
  { region: 'UK & IE', name: 'Samaritans', contact: '116 123' },
  { region: 'PK', name: 'Umang', contact: '0311 7786264' },
  { region: 'Anywhere', name: 'Find a helpline', contact: 'findahelpline.com' },
];

export const RESOURCES_COPY = {
  title: 'Let’s stop here for a moment.',
  body: 'What you wrote sounds heavy, and it deserves a person, not an app. If you are in danger right now, contact your local emergency number. Otherwise these lines are free and answered by people:',
  dismiss: "I'm okay to continue",
  note: 'Nothing you wrote was sent anywhere or added to what Morrow remembers.',
};

/** Content rules the coach obeys regardless of what was asked (PRD §11.6). */
export function contentGuard(text: string): { allowed: boolean; redirect?: string } {
  if (/\b(\d{3,4})\s?(kcal|calories)\b/i.test(text) && /\b(under|below|max|limit)\b/i.test(text)) {
    return {
      allowed: false,
      redirect: 'Morrow does not set calorie targets. It can coach the behaviour: book the appointment, track for a week, ask a professional what number is right for you.',
    };
  }
  if (/\b(mg|dose|dosage|prescription|prescribe)\b/i.test(text)) {
    return {
      allowed: false,
      redirect: 'That is a question for a doctor or a pharmacist, not for me. I can help with the part you control: getting the appointment into this week.',
    };
  }
  if (/\b(invest|stock|crypto|shares?|portfolio returns?)\b/i.test(text) && /\b(should i|recommend|which)\b/i.test(text)) {
    return {
      allowed: false,
      redirect: 'I am not able to recommend financial products. The behaviour I can help with is the one you wrote down: move the money on the day you said.',
    };
  }
  return { allowed: true };
}

/**
 * Whether a piece of writing may be handed back to the person.
 *
 * Writing done in crisis stays on the device — it is theirs, it exports with
 * everything else, and deleting it is their decision, not ours. What must never
 * happen is the app returning it to them as material: quoted in the read-back,
 * sealed into the Book, mined for a Portrait, or read out in the morning. A
 * person who wrote the worst sentence of their life at 2am should not meet it
 * again over breakfast in a serif face, presented as the life they want.
 */
export function isQuotable(text: { safetyRisk?: SafetyRisk | null } | null | undefined): boolean {
  return !!text && text.safetyRisk !== 'crisis';
}

/** The same rule over a list, for the places that seal or read back in bulk. */
export function quotable<T extends { safetyRisk?: SafetyRisk | null }>(texts: readonly T[]): T[] {
  return texts.filter(isQuotable);
}
