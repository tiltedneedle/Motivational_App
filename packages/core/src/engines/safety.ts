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

const CRISIS = [
  /\bkill (myself|me)\b/i,
  /\b(end|ending|take) (my|this) (life|own life)\b/i,
  /\bsuicid\w*/i,
  /\bwant to die\b/i,
  /\bnot want(ing)? to (be here|live|wake up)\b/i,
  /\bbetter off (without me|dead)\b/i,
  /\bself[- ]?harm\w*/i,
  /\b(cut|cutting|hurt|hurting) myself\b/i,
  /\bno reason to (go on|live)\b/i,
  /\boverdos\w*/i,
];

const CONCERN = [
  /\bhate myself\b/i,
  /\bworthless\b/i,
  /\bi(?:'| a)?m a failure\b/i,
  /\bcan'?t (cope|go on|do this any ?more)\b/i,
  /\b(starve|starving|purge|purging|binge|bingeing)\b/i,
  /\b(\d{2,3})\s?(kg|lbs|pounds)\b.{0,24}\b(lose|lost|target|goal)\b/i,
  /\bdrink(ing)? (too much|every ?(day|night))\b/i,
  /\bpanic attacks?\b/i,
  /\bhopeless\b/i,
  /\bnobody (would|will) (care|notice|miss)\b/i,
];

export interface SafetyResult {
  risk: SafetyRisk;
  /** Never the matched text: we log the category, not the person's words. */
  category: 'self-harm' | 'despair' | 'disordered-eating' | 'substance' | null;
  action: 'continue' | 'soften' | 'resources';
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
