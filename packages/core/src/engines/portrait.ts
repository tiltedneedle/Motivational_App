/**
 * The Portrait (PRD §7.4): built only after the five stones exist, and built
 * only out of the user's own lines.
 *
 * Every field here is either a quotation of the user or a proposal the user can
 * edit (the identity line). Nothing is invented prose about their life.
 */
import type { AnalysisKind, Goal, GoalAnalysis, Portrait } from '../types';

export interface PortraitInput {
  goal: Goal;
  analyses: GoalAnalysis[];
  /** The Fifteen, verbatim. Used only for quotation. */
  ideal: string;
  firstName?: string;
}

export class PortraitIncomplete extends Error {
  constructor(public readonly missing: AnalysisKind[]) {
    super(`Portrait needs ${missing.join(', ')}`);
    this.name = 'PortraitIncomplete';
  }
}

function lineOf(analyses: GoalAnalysis[], kind: AnalysisKind): GoalAnalysis | undefined {
  return analyses.find((a) => a.kind === kind && a.line.trim().length > 0);
}

export const FIRST_SENTENCE_MAX = 180;

/**
 * The first sentence of the user's writing, verbatim.
 *
 * A sentence longer than the cap is cut at a word boundary, never mid-word: a
 * quotation that ends in the middle of someone's word reads as a bug in the
 * app rather than as their sentence, which is the opposite of the point.
 */
export function firstSentence(text: string, max = FIRST_SENTENCE_MAX): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';

  const terminated = t.match(/^[^.!?\n]{1,}?[.!?]/);
  const candidate = terminated?.[0]?.trim() ?? t;
  if (candidate.length <= max) return candidate;

  const window = candidate.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(' ');
  const cut = lastSpace > Math.floor(max * 0.5) ? window.slice(0, lastSpace) : window.slice(0, max);
  return cut.replace(/[\s,;:]+$/, '') + '…';
}

/** The fixed words the identity clause is set against. Chrome, never the user's. */
export const IDENTITY_FRAMING = "I'm becoming someone who is";

export interface IdentityProposal {
  /** The user's own clause, verbatim. Empty when nothing they wrote fits. */
  clause: string;
  /** The framing to print in front of it, or null when there is no clause. */
  framing: string | null;
}

/**
 * The identity line is the one proposal in the product, and even here the app
 * does not get to write a sentence about someone's life.
 *
 * It looks for a clause the person actually wrote after "I am" or "I'm" — a
 * state, not an action — and hands it back verbatim alongside a fixed framing
 * the interface prints in front of it. The two are kept apart on purpose: the
 * clause is set in the serif because it is theirs, and the framing is not.
 *
 * Requiring the copula is what keeps the result grammatical. An action clause
 * ("I run every morning") would need conjugating to fit the frame, and the
 * moment the app conjugates a verb it is writing, not quoting.
 */
export function proposeIdentity(ideal: string, strategies?: string): IdentityProposal {
  const source = `${strategies ?? ''} ${ideal ?? ''}`;
  const m = source.match(
    /\b[iI]\s*(?:am|'m|’m)\s+((?:not\s+|no\s+longer\s+|already\s+|finally\s+|still\s+)?[a-z][\w'’-]*(?:\s+[\w'’,-]+){1,10})/,
  );
  const clause = m?.[1]?.trim().replace(/[.,;:]+$/, '').replace(/\s+/g, ' ');
  if (!clause) return { clause: '', framing: null };
  return { clause, framing: IDENTITY_FRAMING };
}

/**
 * The whole line as one string, for exports and for the plain-text Book where
 * there is no second typeface to carry the distinction.
 */
export function identityLineText(p: IdentityProposal): string {
  if (!p.clause) return '';
  return p.framing ? `${p.framing} ${p.clause}` : p.clause;
}

export function buildPortrait(input: PortraitInput): Portrait {
  const { goal, analyses, ideal } = input;
  const motives = lineOf(analyses, 'motives');
  const strategies = lineOf(analyses, 'strategies');
  const obstacles = lineOf(analyses, 'obstacles');

  const missing: AnalysisKind[] = [];
  if (!strategies) missing.push('strategies');
  if (!obstacles) missing.push('obstacles');
  if (missing.length) throw new PortraitIncomplete(missing);

  const opener = firstSentence(ideal);
  const why = motives?.paragraph?.trim() || motives?.line?.trim() || '';
  const obstacleText = obstacles?.line?.trim() ?? '';
  const ifThen = obstacles?.line2?.trim()
    ? `If ${obstacleText.replace(/^if\s+/i, '')}, then I ${obstacles.line2.trim().replace(/^then i\s+/i, '')}`
    : obstacleText;

  const moves = splitFirstMoves(strategies?.line ?? '');

  const quoted = [opener, why, strategies?.line ?? ''].filter((s) => s.trim().length > 0);
  const identity = proposeIdentity(ideal, strategies?.line);

  return {
    goalId: goal.id,
    title: goal.title,
    why,
    identityLine: identity.clause,
    identityFraming: identity.framing,
    identityLineEdited: false,
    obstacle: obstacleText,
    ifThen,
    firstMoves: moves,
    letterFromFuture: letterFromFuture(opener, goal.title, input.firstName),
    quotedSpans: quoted,
  };
}

/**
 * The first three moves are cut from the user's Strategies line, not invented.
 * A line like "Tuesday, Thursday, Saturday at 6:40, out the back door" yields
 * three dated moves; a line with one action yields one.
 */
export function splitFirstMoves(strategyLine: string): string[] {
  const line = (strategyLine ?? '').trim();
  if (!line) return [];
  const days = line.match(
    // `days?` so a person who writes "Mondays and Wednesdays" is understood to
    // mean one habit on two days, rather than two unrelated moves.
    /\b(mon|tues|wednes|thurs|fri|satur|sun)days?\b/gi,
  );
  if (days && days.length >= 2) {
    // "Tuesday, Thursday, Saturday at 6:40, out the back door" is one habit on
    // three days, so the day names come out of the body and become the schedule.
    const rest = line
      .replace(/\b(mon|tues|wednes|thurs|fri|satur|sun)day(s)?\b/gi, '')
      // Alternation, not a character class: `[\s,;:.and]` is the set
      // {a, n, d, punctuation, whitespace}, so it ate the first letter of the
      // person's own sentence — "at 6:40, out the back door" was stored, and
      // read back to them, as "t 6:40, out the back door".
      .replace(/^(?:[\s,;:.]+|\b(?:and|then)\b)+/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const body = rest || line;
    return days.slice(0, 3).map((d) => {
      const singular = d.replace(/s$/i, '');
      const day = singular.charAt(0).toUpperCase() + singular.slice(1).toLowerCase();
      return `${day}: ${body}`.trim();
    });
  }
  const parts = line
    .split(/[;\n]|\s+then\s+|\s+and then\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 6);
  return parts.slice(0, 3);
}

/**
 * The letter is the one piece of coach prose in the Portrait. It must quote the
 * user (checked by `Letter.quotes` at the call site) and promises nothing.
 */
export function letterFromFuture(opener: string, goalTitle: string, name?: string): string {
  const who = name?.trim() ? `${name.trim()}, ` : '';
  const quoted = opener ? `“${opener}”` : 'what you wrote tonight';
  return [
    `${who}I have been reading ${quoted} for a while now.`,
    `It is not the ${goalTitle.toLowerCase()} I remember most. It is the ordinary morning you did it anyway, when nobody would have known either way.`,
    'Start there tomorrow. I will keep the rest.',
  ].join(' ');
}
