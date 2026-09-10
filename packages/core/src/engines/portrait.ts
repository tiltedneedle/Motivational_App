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

/** The first sentence of the user's writing, verbatim. */
export function firstSentence(text: string): string {
  const t = (text ?? '').trim();
  if (!t) return '';
  const m = t.match(/^[^.!?\n]{8,180}[.!?]?/);
  return (m?.[0] ?? t.slice(0, 180)).trim();
}

/**
 * The identity line is the one proposal in the product, and it is assembled
 * from the user's own words: we look for something they said they do, and
 * frame it. If nothing fits we hand back a blank for them to write.
 */
export function proposeIdentityLine(ideal: string, strategies?: string): string {
  const source = `${strategies ?? ''} ${ideal ?? ''}`;
  const m = source.match(
    /\b(?:i|I)\s+(?:am\s+|'m\s+)?((?:out|up|in|at|on|back|already|never|always)?\s*[a-z][\w'’-]*(?:\s+[\w'’,-]+){2,10})/,
  );
  const clause = m?.[1]?.trim().replace(/[.,;]$/, '');
  if (!clause) return '';
  return `I'm becoming someone who is ${clause}`.replace(/\s+/g, ' ');
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

  return {
    goalId: goal.id,
    title: goal.title,
    why,
    identityLine: proposeIdentityLine(ideal, strategies?.line),
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
