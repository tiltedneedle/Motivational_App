/**
 * The Portrait (PRD §7.4): built only after the five stones exist, and built
 * only out of the user's own lines.
 *
 * Every field here is either a quotation of the user or a proposal the user can
 * edit (the identity line). Nothing is invented prose about their life.
 */
import type { AnalysisKind, Goal, GoalAnalysis, Portrait } from '../types';
import { ifThenOf } from '../ids';

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

/** "if …" → "If …", for the one place the if-then stands as its own line. */
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Everything in the Fifteen after the first sentence, for the Book.
 *
 * Not `ideal.slice(firstSentence.length)`. `firstSentence` normalises
 * whitespace and cuts a long sentence at a word with an ellipsis, so its
 * length is not an offset into the raw text: a sentence that was cut printed
 * its own tail twice, and a Fifteen with a line break in its opening lost a
 * character at the join. The shown sentence is walked against the raw text
 * instead, whitespace run for whitespace run, and the body starts where it
 * stops — so nothing the person wrote is printed twice or dropped.
 */
export function restOfIdeal(ideal: string, shown: string): string {
  const raw = ideal ?? '';
  // Walk the shown sentence whole first. Its ellipsis is usually the cut's,
  // but a Fifteen that ends "someone who runs…" in the person's own hand has
  // an ellipsis that is theirs, and stripping it printed "…" as the body.
  const walk = (first: string): number => {
    let i = 0;
    let j = 0;
    const ws = (c: string) => /\s/.test(c);
    while (i < raw.length && ws(raw[i]!)) i++;
    while (j < first.length && i < raw.length) {
      if (ws(first[j]!)) {
        while (i < raw.length && ws(raw[i]!)) i++;
        j++;
      } else if (raw[i] === first[j]) {
        i++;
        j++;
      } else {
        break;
      }
    }
    return j < first.length ? -1 : i;
  };
  let at = walk(shown);
  if (at < 0 && shown.endsWith('…')) at = walk(shown.slice(0, -1));
  if (at < 0) {
    // The shown sentence is not a prefix of the text it came from, which
    // means the Book was built by an older rule. Fall back to the whole text
    // rather than to a guess at an offset: printing a sentence twice is a
    // smaller wrong than dropping one.
    return raw.trim();
  }
  // A cut sentence lost its trailing comma to the ellipsis; the body should
  // not begin with it.
  return raw.slice(at).replace(/^[\s,;:]+/, '').trim();
}

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

  // The whole run of terminators, with any closing quote, and only when
  // whitespace or the end follows. One terminator alone cut "every
  // morning..." to "every morning." and "1.5x fitter" to "1." — and the Book
  // then opened its body paragraph with the leftover "..".
  const terminated = t.match(/^.*?[.!?]+["'”’)\]]*(?=\s|$)/);
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
    // Up to the end of the clause rather than a fixed number of words. Capped
    // at eleven it silently cut longer sentences in half and presented the
    // fragment as something they had written, which is the one thing this
    // function must not do.
    /\b[iI]\s*(?:am|'m|’m)\s+((?:not\s+|no\s+longer\s+|already\s+|finally\s+|still\s+)?[a-z][\w'’-]*(?:\s+[\w'’,-]+)*?)(?=\s*[.!?;]|\s+(?:and|but|so|because|which|when|while)\b|$)/,
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
  const written = obstacles?.line2?.trim() ? ifThenOf(obstacles.line, obstacles.line2) : null;
  const ifThen = written ? capitalise(written.sentence) : obstacleText;

  const moves = splitFirstMoves(strategies?.line ?? '');

  // The if-then's two halves are quoted too, so the Portrait can set them in
  // the person's face and the "If … then I" around them in the app's.
  const quoted = [opener, why, strategies?.line ?? '', ...(written ? written.spans : [obstacleText])].filter((s) => s.trim().length > 0);
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
    letterFromFuture: letterFromFuture(opener, input.firstName),
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
    // three days, so the day names come out of the body and become the
    // schedule — but only when they lead the sentence. Lifted from the middle
    // of one ("I run on Monday and Wednesday at 6:40") they left "I run on
    // and at 6:40", a sentence the person never wrote, on Today in their
    // face. Mid-sentence, the whole line stays as they wrote it.
    const lead = line.match(/^(?:(?:every|each|on)\s+)?(?:(?:mon|tues|wednes|thurs|fri|satur|sun)days?\b[\s,]*(?:(?:and|then|&)\s+)?)+/i);
    const rest = lead
      ? line
          .slice(lead[0].length)
          // Alternation, not a character class: `[\s,;:.and]` is the set
          // {a, n, d, punctuation, whitespace}, so it ate the first letter of
          // the person's own sentence — "at 6:40, out the back door" was
          // stored, and read back to them, as "t 6:40, out the back door".
          .replace(/^(?:[\s,;:.]+|\b(?:and|then)\b)+/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      : '';
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
 *
 * It does not name the goal. PRD §7.8: letters "never contain a goal or a plan
 * line", and this one used to print the goal title in the middle sentence —
 * which is the app reading its own database back at somebody in a warmer voice,
 * the exact thing the rule exists to stop. `checkLetter` refuses a letter that
 * does it; this one was written before that check existed and would have failed
 * it. "The finish" says the same thing and is not a row in a table.
 */
export function letterFromFuture(opener: string, name?: string): string {
  const who = name?.trim() ? `${name.trim()}, ` : '';
  // Their full stop comes off inside the quotation: “…still blue.” for a
  // while now is two sentences' punctuation in one, and the sentence is ours.
  const quoted = opener ? `“${opener.replace(/[.!?]+$/, '')}”` : 'what you wrote tonight';
  return [
    `${who}I have been reading ${quoted} for a while now.`,
    'It is not the finish I remember most. It is the ordinary morning you did it anyway, when nobody would have known either way.',
    'Start there tomorrow. I will keep the rest.',
  ].join(' ');
}
