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
  return withoutDanglingWord(cut, Math.floor(max * 0.5)).replace(/[\s,;:]+$/, '') + '…';
}

/**
 * Words a quotation must not stop on. A sentence cut at a hundred and sixty
 * characters landed on "…and not just watch the”, and the ellipsis after an
 * article reads as the app losing its place in their sentence rather than
 * choosing where to stop. Backed off a word at a time, never past `floor`.
 */
const DANGLING =
  /\b(?:the|a|an|and|or|but|nor|so|of|to|in|on|at|for|with|by|from|as|into|onto|than|that|which|who|whom|whose|what|when|where|while|if|not|just|very|my|our|your|his|her|their|its|is|are|was|were|be|been|am|i|i['’]ve|i['’]m|i['’]d|i['’]ll|has|have|had|do|does|did|will|would|can|could|should|may|might|no|any|some|each|every|this|these|those|it|they|we|he|she|you|me|him|them|us|under|over|about|after|before|between|through|during|without|within|against|toward|towards|until|till|across|along|around|behind|beside|near|off|out|up|down|per|one|all|both|more|most|other|another|such|because|then|there|here|only|even|also|still|yet|too|how|whether|although|though|since|unless|whose|much|many|few|less)$/i;

export function withoutDanglingWord(text: string, floor: number): string {
  let out = text.replace(/[\s,;:]+$/, '');
  while (out.length > floor) {
    const space = out.lastIndexOf(' ');
    if (space <= floor) break;
    if (!DANGLING.test(out)) break;
    out = out.slice(0, space).replace(/[\s,;:]+$/, '');
  }
  return out;
}

/** The fixed words the identity clause is set against. Chrome, never the user's. */
export const IDENTITY_FRAMING = "I'm becoming someone who is";
/** The same framing for a clause that carries its own verb: "…someone who" + "runs three mornings a week". */
export const IDENTITY_FRAMING_BARE = "I'm becoming someone who";

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
 * It hands back a clause the person actually wrote, verbatim, beside a fixed
 * framing the interface prints in front of it. The two are kept apart on
 * purpose: the clause is set in the serif because it is theirs, and the
 * framing is not. Two shapes qualify, in this order:
 *
 *  1. who they said they want to be — "I want to be someone who runs three
 *     mornings a week", "a woman who is still strong at seventy". The clause
 *     after "who" is the answer in the words they chose; the framing ends at
 *     "who" when the clause carries its own verb, and at "who is" when they
 *     wrote the copula, so the printed line is grammatical either way;
 *  2. a state they stated — "I am …" at the head of a sentence or clause of
 *     their own. Requiring the copula keeps it grammatical (an action, "I run
 *     every morning", would need conjugating, and the moment the app
 *     conjugates a verb it is writing, not quoting), and requiring the head
 *     keeps it theirs: "pretend I'm looking at the pictures", "stopped saying
 *     that I am too old", "asking if I'm alright" all contain an "I am" and
 *     none is a state to become.
 *
 * From the Fifteen alone (PRD §7.4: "proposed from the Fifteen's text"). The
 * How line used to be searched first, and a schedule that happened to say
 * "every Sunday I am not on shift" or "so I am not doing anything else"
 * became "I'm becoming someone who is not on shift" — the person's own words,
 * cut from the wrong sentence, in front of a portrait of who they mean to be.
 */
export function proposeIdentity(ideal: string): IdentityProposal {
  const source = (ideal ?? '').replace(/\s+/g, ' ').trim();
  const tidy = (s: string | undefined) => s?.trim().replace(/[.,;:]+$/, '').replace(/\s+/g, ' ') ?? '';

  // First, the sentence the doorway asks for and almost everyone writes: "I
  // want to be someone who runs three mornings a week", "a woman who is
  // still strong at seventy", "a dad who is there". The clause after "who"
  // is who they said they are becoming, in the words they chose for it.
  const said = source.match(WHO_CLAUSE);
  if (said) {
    const clause = tidy(said[2]);
    if (clause) {
      // The copula is its own group, so a clause that opens with a name, a
      // number or a capital ("who is Ana's equal", "who is 10 kg lighter")
      // cannot push "is" back into the clause and print "who is is".
      return { clause, framing: said[1] ? IDENTITY_FRAMING : IDENTITY_FRAMING_BARE };
    }
  }

  // Failing that, a state they stated: "I am …" at the head of a sentence or
  // a clause of their own, not inside somebody else's — "pretend I'm looking
  // at the pictures", "stopped saying that I am too old", "asking if I'm
  // alright" all have an "I am" in them and none is a state to become.
  for (const m of source.matchAll(STATE_CLAUSE)) {
    const before = source.slice(0, m.index ?? 0);
    // Not inside somebody else's clause: "pretend I'm looking at the
    // pictures", "stopped saying that I am too old", "asking if I'm alright".
    if (INSIDE_ANOTHER_CLAUSE.test(before)) continue;
    // Nor a hedge, an opener or a fact about now: "I am not sure what time
    // it is", "I am going to be honest", "I am 38", "I am writing this at
    // the kitchen table" are none of them who they are becoming. And the
    // clause stops at a comma that starts the next one of theirs.
    const clause = tidy(m[1]).replace(/,\s+(?:i|we|it|they|but)\b.*$/i, '').trim();
    if (NOT_A_STATE.test(clause)) continue;
    if (clause) return { clause, framing: IDENTITY_FRAMING };
  }
  return { clause: '', framing: null };
}

/**
 * A word of theirs, with the punctuation a word can carry inside it: "6:40",
 * "6.40", "1.5x", "e.g.", "Ana's". A clause used to stop at the first bare
 * ":" or ".", so "out the door at 6:40" was quoted back as "out the door at
 * 6"; the sentence ends only where the stop is followed by a space or the
 * end of the text.
 */
const WORD = "[\\w'’£$€-]+(?:[.:][\\w'’-]+)*";
/** The same, after a first letter that is spelled out (`[a-z]` + this). */
const WORD_REST = "[\\w'’£$€-]*(?:[.:][\\w'’-]+)*";
const LEAD = '(?:not\\s+|no\\s+longer\\s+|already\\s+|finally\\s+|still\\s+)?';
/**
 * Where a clause ends: a stop that ends the sentence; a subordinator; "and",
 * "but" or "so" only when a new subject follows ("and I mean it"), because
 * "knows what he earns and what he spends" is one thing they said; ", who"
 * starting the next relative clause. A contrast stays: "there, not a dad on
 * the bench with his phone" is the whole of what they meant.
 */
const END =
  '(?=,?\\s*[.!?;:]+(?:\\s|$)|,?\\s+(?:because|which|when|while|whom|unless|although|though)\\b|,\\s+who\\b|,?\\s+(?:and|but|so|or)\\s+(?:i|we|he|she|they|it|you|nobody|no\\s+one|everyone|that|then|now)\\b|$)';
const WHO_CLAUSE = new RegExp(
  "\\b[iI]\\s*(?:(?:want|wanted|would\\s+like|['’]d\\s+like|mean|intend)\\s+to\\s+be(?:come)?|am|'m|’m|will\\s+be|am\\s+becoming)\\s+(?:someone|somebody|a\\s+(?:person|man|woman|bloke|mum|dad|mother|father|parent|friend|grandmother|grandfather|nurse|teacher|driver|writer|runner|reader)|the\\s+(?:kind|sort)\\s+of\\s+(?:person|man|woman|dad|mum))\\s+who(['’]s|\\s+is)?\\s+(" +
    LEAD +
    WORD +
    '(?:,?\\s+' +
    WORD +
    ')*?)' +
    END,
  'i',
);
const STATE_CLAUSE = new RegExp("\\b[iI]\\s*(?:am|'m|’m)\\s+(" + LEAD + '[a-z]' + WORD_REST + '(?:,?\\s+' + WORD + ')*?)' + END, 'gi');
const NOT_A_STATE =
  /^(?:not\s+(?:sure|certain|convinced|entirely|really|quite|totally)\b|going\s+to\s+be\s+honest|afraid|sorry|aware|told|asked|writing\s+this|typing\s+this|sitting\s+(?:here|at|in|on)|\d+\b|still\s+in\s+\p{Lu})/iu;
const INSIDE_ANOTHER_CLAUSE =
  /\b(?:that|if|whether|what|when|where|while|because|how|why|who|which|although|though|as|like|say|says|said|saying|pretend|pretending|think|thinks|thought|wish|hope|know|knows|feel|felt|feels|ask|asks|asked|asking|sure|realise|realize|remember|forget|tell|tells|told|until|till|unless|since|so\s+that)\s+$/i;

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
  const why = motives?.line?.trim() || motives?.paragraph?.trim() || '';
  const obstacleText = obstacles?.line?.trim() ?? '';
  const written = obstacles?.line2?.trim() ? ifThenOf(obstacles.line, obstacles.line2) : null;
  const ifThen = written ? capitalise(written.sentence) : obstacleText;

  const moves = splitFirstMoves(strategies?.line ?? '');

  // The if-then's two halves are quoted too, so the Portrait can set them in
  // the person's face and the "If … then I" around them in the app's.
  const quoted = [opener, why, strategies?.line ?? '', ...(written ? written.spans : [obstacleText])].filter((s) => s.trim().length > 0);
  const identity = proposeIdentity(ideal);

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
  // Semicolons and line breaks are the person listing things: "Sunday at 4
  // pm, batch cook two meals; Monday to Thursday, eat from the fridge at 7
  // pm" is two moves, and lifting the days out of the whole line made three
  // copies of both. Each piece is cut on its own. "then" is not a separator:
  // "one module unit done, then the boys at 12.30" is one sentence, and
  // splitting it put "the boys at 12.30" on Today as a move.
  const pieces = (strategyLine ?? '')
    .split(/[;\n]/)
    .map((p) => p.trim().replace(/[\s,;:]+$/, ''))
    .filter((p) => p.length > 6);
  return pieces.flatMap(movesFromPiece).slice(0, 3);
}

const DAY_RANGE =
  /\b(?:mon|tues|wednes|thurs|fri|satur|sun)days?\s*(?:to|through|thru|till|until|or|-|–|—|\/)\s*(?:mon|tues|wednes|thurs|fri|satur|sun)days?\b/i;

function movesFromPiece(line: string): string[] {
  if (!line) return [];
  // "Monday to Thursday", "Mon–Fri", "Saturday or Sunday" is a span or a
  // choice of days, not a list of them: one move, as written, dated by the
  // first day it names.
  if (DAY_RANGE.test(line)) return [line];
  const dayMentions = line.match(
    // `days?` so a person who writes "Mondays and Wednesdays" is understood to
    // mean one habit on two days, rather than two unrelated moves.
    /\b(mon|tues|wednes|thurs|fri|satur|sun)days?\b/gi,
  );
  // Each day once. "Saturday at 5 pm … new strings by this Saturday" names
  // one day twice, and two moves with the same title on the same date is a
  // duplicate card on Today, not a schedule.
  const days = [...new Set((dayMentions ?? []).map((d) => d.toLowerCase()))];
  if (days.length >= 2) {
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
  return [line];
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
  const quoted = opener ? `“${opener.replace(/[.!?]+$/, '')}”` : 'what you wrote';
  return [
    `${who}I have been reading ${quoted} for a while now.`,
    'It is not the finish I remember most. It is the ordinary morning you did it anyway, when nobody would have known either way.',
    'Start there tomorrow. I will keep the rest.',
  ].join(' ');
}
