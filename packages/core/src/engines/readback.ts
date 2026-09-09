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

const DOMAIN_HINTS: Record<Exclude<DomainId, 'custom'>, RegExp> = {
  health: /\b(run|running|ran|walk|gym|lift|weight|body|knee|shoe|race|marathon|swim|cycle|strong|fit|breath|sleep in|stretch)\w*\b/i,
  money: /\b(money|balance|rent|save|saving|debt|card|overdraft|salary|raise|bill|afford|account|pension|invoice|budget)\w*\b/i,
  craft: /\b(write|writing|wrote|pitch|book|essay|draft|portfolio|guitar|paint|code|build|ship|launch|study|learn|practice|practise|play)\w*\b/i,
  mind: /\b(calm|quiet|anxious|anxiety|spiral|meditat|pray|phone|screen|sleep|bed|rest|breathe|still|peace|tired)\w*\b/i,
  people: /\b(sam|mum|mom|dad|family|friend|partner|wife|husband|kids|child|call|visit|dinner|together|upstairs|love)\w*\b/i,
  home: /\b(kitchen|home|house|flat|room|garden|move|cook|clean|table|door|shelf|wall|window)\w*\b/i,
};

/** Signals that a clause is about wanting something, not just describing. */
const WANT = /\b(i(?:'| a)?m|i|we)\b.{0,24}\b(want|will|would|can|could|finally|no longer|don't|do not|stop|start|again|becom\w*|keep|hold|make|earn|run|write|save|call|sleep|build|learn|move)\b/i;

const CONCRETE = /\b(\d|£|\$|€|km|minutes?|hours?|weeks?|months?|every|morning|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

const NOISE = /^(and|but|so|then|because|which|that|it|there|this)\b/i;

export function domainOf(text: string): DomainId {
  let best: DomainId = 'custom';
  let bestScore = 0;
  for (const [id, re] of Object.entries(DOMAIN_HINTS) as [Exclude<DomainId, 'custom'>, RegExp][]) {
    const matches = text.match(new RegExp(re.source, 'gi'));
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return bestScore > 0 ? best : 'custom';
}

/** Split into clauses while keeping exact offsets, so every span stays verbatim. */
export function clauses(text: string): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /[^.!?;\n]+[.!?;\n]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim().replace(/[.!?;]+$/, '');
    if (trimmed.length < 12) continue;
    const start = m.index + lead;
    out.push({ text: trimmed, start, end: start + trimmed.length });
    // Long clauses often hold two wants joined by "and": offer the halves too.
    const andIdx = trimmed.search(/\s+and\s+(?=i|we|the|my)/i);
    if (trimmed.length > 90 && andIdx > 30) {
      const left = trimmed.slice(0, andIdx).trim();
      const rightRaw = trimmed.slice(andIdx).replace(/^\s+and\s+/i, '');
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
    chosen.push({ text: c.text, start: c.start, end: c.end, domain: domainOf(c.text) });
  }
  chosen.sort((a, b) => a.start - b.start);

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
    // Take the first occurrence that is not already spoken for.
    while (from <= source.length) {
      const idx = source.indexOf(text, from);
      if (idx === -1) break;
      const end = idx + text.length;
      if (!used.some((u) => idx < u.end && u.start < end)) {
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
  out.sort((a, b) => a.start - b.start);
  return out;
}

/** How much of the read-back survived verification. Logged; a low ratio is a prompt bug. */
export function verificationRate(proposed: number, verified: number): number {
  if (proposed <= 0) return 1;
  return Number((verified / proposed).toFixed(3));
}
