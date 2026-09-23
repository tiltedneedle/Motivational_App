/**
 * "What I heard" (PRD §7.2): the coach reads the user's own phrases back.
 *
 * The hard rule, enforced here in code and never trusted to a model:
 * every span must be a verbatim substring of the user's text. A model may
 * propose spans; `verifySpans` throws them away if they are not exact.
 * When the network is gone (or the model misbehaves twice) the local
 * extractor below runs instead — it is a chooser, not a writer.
 */
import type { DomainId } from '../types';

export interface Span {
  text: string;
  start: number;
  end: number;
  domain: DomainId;
  /** Index of another span this might be the same goal as. */
  mergeWith?: number;
}

export interface ReadBackResult {
  spans: Span[];
  /** Asked once, only when fewer than three spans survive. */
  leftOutQuestion?: string;
}

/**
 * The words that put a sentence in one part of a life rather than another.
 *
 * Every form is spelled out rather than left to a trailing `\w*` on the whole
 * alternation, which is how the first version worked and why it read "cardio"
 * as money (`card`), "the same" as people (`sam`) and "billion" as money
 * (`bill`). This label is the app telling somebody what it thinks their own
 * sentence was about, printed next to their words, so it is worth the length.
 *
 * `still` is gone from mind entirely. In English it is almost always the
 * adverb — "still blue", "still asleep", "still here" — and it was strong
 * enough to take "It is 6:40 and the kitchen is still blue" away from home.
 */
const DOMAIN_HINTS: Record<Exclude<DomainId, 'custom'>, RegExp> = {
  health: /\b(run|runs|running|ran|walk|walks|walking|walked|gym|lift|lifts|lifting|weights?|body|knees?|shoes?|race|races|racing|marathons?|swim|swims|swimming|cycle|cycles|cycling|cardio|strong|stronger|fitness|fitter|breath|breathing|stretch|stretches|stretching)\b/i,
  money: /\b(money|balance|rent|save|saves|saving|savings|debt|debts|overdraft|salary|raise|bills?|afford|accounts?|pension|invoices?|budget|budgets|budgeting)\b/i,
  craft: /\b(write|writes|writing|wrote|pitch|pitches|books?|essays?|draft|drafts|portfolio|guitar|paint|paints|painting|code|coding|build|builds|building|ship|ships|shipping|launch|launches|study|studies|studying|learn|learns|learning|practice|practise|practising|practicing|play|plays|playing)\b/i,
  mind: /\b(calm|calmer|quiet|quieter|anxious|anxiety|spiral|spiralling|spiraling|meditate|meditation|meditating|pray|prayer|phones?|screens?|sleep|sleeps|sleeping|slept|bed|bedtime|rest|resting|restless|breathe|peace|peaceful|tired)\b/i,
  people: /\b(sam|mum|mom|dad|family|friend|friends|partner|wife|husband|kids|child|children|call|calls|calling|called|visit|visits|visiting|dinner|together|upstairs|love)\b/i,
  // Without "door", "table" and "move", which say nothing about a home on
  // their own and were deciding whole sentences by themselves: "I want to be
  // out the back door before the kettle boils, three mornings a week" came
  // back as "This sounds like it is about home", with "What is the one corner
  // you would fix first?" kept for the fifteen minutes, from somebody who had
  // just chosen Health. "Moving house" still matches on "house"; a kitchen
  // table still matches on "kitchen".
  home: /\b(kitchen|home|house|flat|rooms?|garden|cook|cooks|cooking|clean|cleans|cleaning|shelf|shelves|walls?|windows?)\b/i,
};

/**
 * Signals that a clause is about wanting something, not just describing.
 *
 * Both apostrophes, everywhere one can appear: a phone's keyboard types the
 * curly one by default, so "I’m" and "don’t" are what most of this
 * product's writing actually contains, and a rule that only knew "I'm"
 * behaved differently on a laptop than on the phone it was written for.
 * `safety.ts` has been careful about this since it was written; these two
 * were not.
 */
const WANT = /\b(i(?:['’]| a)?m|i|we)\b.{0,24}\b(want|will|would|can|could|finally|no longer|don['’]t|do not|stop|start|again|becom\w*|keep|hold|make|earn|run|write|save|call|sleep|build|learn|move)\b/i;

const CONCRETE = /\b(\d|£|\$|€|km|minutes?|hours?|weeks?|months?|every|morning|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

const NOISE = /^(and|but|so|then|because|which|that|it|there|this)\b/i;

/**
 * Which part of a life a sentence belongs to, or none.
 *
 * A tie used to be broken by the order the domains happen to be written in
 * this file, which is not a fact about anybody's sentence. "It is 6:40 and the
 * kitchen is still blue" matched mind once and home once, and mind won because
 * it is declared first. The longer match wins now — a longer word is a more
 * specific claim — and a genuine tie is answered with `custom`, which the
 * screen shows as "something else". Saying nothing is better than guessing
 * out loud at what somebody's sentence was about.
 */
/** Whether the text touches a domain's word list at all. */
export function domainMatches(text: string, domain: DomainId): boolean {
  if (domain === 'custom') return false;
  return DOMAIN_HINTS[domain].test(text);
}


export function domainOf(text: string): DomainId {
  let best: DomainId = 'custom';
  let bestScore = 0;
  let bestLength = 0;
  let tied = false;

  for (const [id, re] of Object.entries(DOMAIN_HINTS) as [Exclude<DomainId, 'custom'>, RegExp][]) {
    const matches = text.match(new RegExp(re.source, 'gi'));
    if (!matches) continue;
    const score = matches.length;
    const length = matches.reduce((n, m) => n + m.length, 0);
    if (score > bestScore || (score === bestScore && length > bestLength)) {
      bestScore = score;
      bestLength = length;
      best = id;
      tied = false;
    } else if (score === bestScore && length === bestLength) {
      tied = true;
    }
  }

  return bestScore === 0 || tied ? 'custom' : best;
}

/**
 * Where spoken text breaks. A browser's recogniser hands back fifteen minutes
 * with no full stops in it — one clause of a hundred and thirty words, which
 * the read-back offered whole, as one stone, and then asked what had been
 * left out. Speech breaks at its joins instead: "and I", "but we", "so the",
 * "because it". Only a join followed by a subject counts, so "bread and
 * butter" stays together. And a new sentence that simply starts — "still
 * blue i lace the left shoe" — is cut before its "I" when the word before
 * it is not one that would carry the sentence on ("that I", "when I").
 */
const SPOKEN_JOIN =
  /\s+(?:and then|and|but|so|because|then)\s+(?=(?:i|i['’]m|i['’]ve|i['’]ll|i['’]d|we|we['’]re|we['’]ll|my|our|the|there|there['’]s|it|it['’]s|she|he|they|you|a|an|nobody|everyone|someone)\b)|(?<!\b(?:and|but|so|because|then|that|if|when|where|which|while|as|than|or|what|how|why|whether|unless|until|before|after|once|since|though|although|like|says?|said|think|thought|know|knew|hope|wish|suppose|guess|mean|meant))\s+(?=(?:i|i['’]m|i['’]ve|i['’]ll|i['’]d|there['’]s|that['’]s)\b)/gi;

/** Clauses longer than this are spoken, or breathless, and are cut at their joins. */
const SPOKEN_WORDS = 26;

/** Cut one long clause at its spoken joins; offsets stay exact. */
function cutSpoken(text: string, start: number): { text: string; start: number; end: number }[] {
  const pieces: { text: string; start: number; end: number }[] = [];
  let at = 0;
  let m: RegExpExecArray | null;
  SPOKEN_JOIN.lastIndex = 0;
  const push = (from: number, to: number) => {
    const piece = text.slice(from, to).trim().replace(/[\s.!?;,:]+$/, '');
    if (piece.length < 12) return;
    const lead = text.slice(from, to).length - text.slice(from, to).trimStart().length;
    pieces.push({ text: piece, start: start + from + lead, end: start + from + lead + piece.length });
  };
  while ((m = SPOKEN_JOIN.exec(text)) !== null) {
    // "my wife and I want…", "the bike and the fence": a join this close to
    // the start of a piece is a compound subject, not a seam between wants.
    if (text.slice(at, m.index).trim().split(/\s+/).length < 4) continue;
    push(at, m.index);
    at = m.index + m[0].length;
  }
  push(at, text.length);
  return pieces;
}

/**
 * Whether `[start, end)` begins and ends on a word boundary of the source: a
 * word character on one side of each edge and not on the other, or the edge
 * of the text. Letters and digits are word characters; so is an apostrophe
 * between two of them ("mum's"), so "mum" inside "mum's" is not a whole word.
 */
export function onWordEdges(source: string, start: number, end: number): boolean {
  const wordAt = (i: number) => i >= 0 && i < source.length && /[\p{L}\p{N}]/u.test(source[i]!);
  const joinedAt = (i: number) => i > 0 && i < source.length - 1 && /['’]/.test(source[i]!) && wordAt(i - 1) && wordAt(i + 1);
  const leftOk = start === 0 || !(wordAt(start - 1) && wordAt(start)) && !(joinedAt(start - 1) && wordAt(start));
  const rightOk = end >= source.length || !(wordAt(end - 1) && wordAt(end)) && !(wordAt(end - 1) && joinedAt(end));
  return leftOk && rightOk;
}

/** Split into clauses while keeping exact offsets, so every span stays verbatim. */
export function clauses(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  // A stop ends a clause only when whitespace, a closing quote or the end
  // follows it. The dot inside "6.40", "5.5 miles", "£1.5k" and "v2.0" is
  // part of the word: split there, the mirror's first words back to a
  // person were “30 and I am out the door by 7”.
  const re = /[^\n]+?(?:[.!?;]+["'”’)\]]*(?=\s|$)|\n|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    // Commas and colons too. A span is printed inside quotation marks, and
    // “I am out the back door before the kettle boils,” reads as a bug in the
    // app rather than as their sentence. Trimming the tail leaves a verbatim
    // substring, so nothing about the authorship rule changes.
    const trimmed = raw.trim().replace(/[\s.!?;,:]+$/, '');
    if (trimmed.length < 12) continue;
    const start = m.index + lead;
    // Spoken, or breathless: a clause too long to be one want is offered in
    // its pieces, never whole.
    if (trimmed.split(/\s+/).length > SPOKEN_WORDS) {
      const pieces = cutSpoken(trimmed, start);
      if (pieces.length > 1) {
        out.push(...pieces);
        continue;
      }
    }
    out.push({ text: trimmed, start, end: start + trimmed.length });
    // Long clauses often hold two wants joined by "and": offer the halves too.
    const andIdx = trimmed.search(/\s+and\s+(?=i|we|the|my)/i);
    if (trimmed.length > 90 && andIdx > 30) {
      // The comma before "and" belongs to the join, not to either half of it.
      const left = trimmed.slice(0, andIdx).trim().replace(/[,;:]+$/, '');
      const rightRaw = trimmed
        .slice(andIdx)
        .replace(/^\s+and\s+/i, '')
        .replace(/[,;:]+$/, '');
      const rightStart = start + trimmed.length - rightRaw.length;
      if (left.length >= 16) out.push({ text: left, start, end: start + left.length });
      if (rightRaw.length >= 16) out.push({ text: rightRaw, start: rightStart, end: rightStart + rightRaw.length });
    }
  }
  return out;
}

function score(text: string): number {
  let s = 0;
  if (WANT.test(text)) s += 2;
  if (CONCRETE.test(text)) s += 1.2;
  if (NOISE.test(text)) s -= 0.8;
  const words = text.split(/\s+/).length;
  if (words >= 5 && words <= 18) s += 1;
  else if (words > 26) s -= 0.6;
  if (/\b(i|my|me|we|our)\b/i.test(text)) s += 0.6;
  return s;
}

function overlaps(a: Span, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * The offline extractor. Chooses at most `limit` non-overlapping clauses from
 * the user's own text. It writes nothing.
 */
export function extractSpansLocally(text: string, limit = 7): ReadBackResult {
  const source = text ?? '';
  const ranked = clauses(source)
    .map((c) => ({ ...c, s: score(c.text) }))
    .filter((c) => c.s > 0.8)
    .sort((a, b) => b.s - a.s);

  const chosen: Span[] = [];
  for (const c of ranked) {
    if (chosen.length >= limit) break;
    if (chosen.some((x) => overlaps(x, c))) continue;
    // A refrain is one thing they want, not three: the same sentence
    // written again is offered once.
    if (chosen.some((x) => x.text.trim().toLowerCase() === c.text.trim().toLowerCase())) continue;
    chosen.push({ text: c.text, start: c.start, end: c.end, domain: domainOf(c.text) });
  }
  chosen.sort(wantsFirst);

  // Suggest a merge when two spans land in the same domain.
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const a = chosen[i];
      const b = chosen[j];
      if (a && b && a.domain !== 'custom' && a.domain === b.domain && b.mergeWith === undefined) {
        b.mergeWith = i;
        break;
      }
    }
  }

  return {
    spans: chosen,
    ...(chosen.length < 3 ? { leftOutQuestion: 'What did you leave out on purpose?' } : {}),
  };
}

/**
 * The gate. Any span that is not an exact substring of the source is dropped,
 * and its offsets are recomputed from the source rather than trusted.
 * A model that invents text simply loses that span.
 */
export function verifySpans(source: string, spans: { text: string; domain?: DomainId }[]): Span[] {
  const out: Span[] = [];
  const used: { start: number; end: number }[] = [];
  for (const s of spans) {
    const text = (s.text ?? '').trim();
    if (text.length < 8) continue;
    let from = 0;
    let start = -1;
    // Take the first occurrence that is not already spoken for, and that
    // begins and ends on a word of theirs: "call my mum on Sunday" is inside
    // "call my mum on Sundays" but it is not what they wrote, and a quote
    // that starts mid-word reads as a bug in the app.
    while (from <= source.length) {
      const idx = source.indexOf(text, from);
      if (idx === -1) break;
      const end = idx + text.length;
      if (onWordEdges(source, idx, end) && !used.some((u) => idx < u.end && u.start < end)) {
        start = idx;
        break;
      }
      from = idx + 1;
    }
    if (start === -1) continue;
    const end = start + text.length;
    used.push({ start, end });
    out.push({ text, start, end, domain: s.domain ?? domainOf(text) });
  }
  out.sort(wantsFirst);
  return out;
}

/**
 * The order the stones are read back in: the sentences that say "I want"
 * first, in the order they were written; then the rest, in theirs. A
 * Fifteen opens with the scene — the kitchen, the shoe, the door — and read
 * back in page order the first four stones were scenery and the wants were
 * below the fold. Applied at the gate too, which is the last word.
 */
function wantsFirst(a: { text: string; start: number }, b: { text: string; start: number }): number {
  const wa = SAID_WANT.test(a.text) ? 0 : 1;
  const wb = SAID_WANT.test(b.text) ? 0 : 1;
  return wa - wb || a.start - b.start;
}

/**
 * A sentence that says it wants, in so many words. Narrower than WANT, which
 * scores "I can see it from the table" for its "I … can" and is right to as
 * a hint; for the order of the list only the plain forms count.
 */
const SAID_WANT = /\b(?:i|we)\s*(?:['’]d|['’]ll|['’]m|would|will|am|are|really|just|also|still)?\s*(?:want|wants|wanted|need|needs|like to|going to|gonna|intend|hope|plan|wish|aim|mean to|will be|['’]ll be|would be|am going|['’]m going|would like|['’]d like|would love|['’]d love)\b/i;

/** How much of the read-back survived verification. Logged; a low ratio is a prompt bug. */
export function verificationRate(proposed: number, verified: number): number {
  if (proposed <= 0) return 1;
  return Number((verified / proposed).toFixed(3));
}
