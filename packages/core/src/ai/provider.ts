/**
 * The AI adapter (PRD §11).
 *
 * Two providers exist: `LocalProvider`, which uses the offline engines and is
 * the default in this build, and `AnthropicProvider`, which calls the real model
 * through an edge function. Neither is trusted: `guarded()` wraps any provider
 * and enforces the authorship rules in code — spans must be verbatim substrings,
 * letters must quote, and anything that fails falls back to the local engine.
 */
import { extractSpansLocally, verifySpans, type ReadBackResult, type Span } from '../engines/readback';
import { screen, worseRisk, type SafetyResult } from '../engines/safety';
import type { DomainId } from '../types';

export interface ReadBackRequest {
  text: string;
  /** Names the user already gave, so the model does not re-offer them. */
  taken?: string[];
  limit?: number;
}

export interface SceneRequest {
  goalTitle: string;
  impactLine: string;
  idealExcerpt: string;
  type: 'practice' | 'moment' | 'tuesday' | 'other_road';
  tone?: 'warmer' | 'simpler' | 'closer' | null;
}

export interface SceneResult {
  narrative: string;
  imagePrompt: string;
  /** Must appear in the user's own text; verified by `guarded`. */
  sourcedDetail: string;
}

export interface AiProvider {
  readonly name: string;
  readonly online: boolean;
  readBack(req: ReadBackRequest): Promise<ReadBackResult>;
  scene(req: SceneRequest): Promise<SceneResult>;
  safety(text: string): Promise<SafetyResult>;
}

// ---------------------------------------------------------------- local

/**
 * The shortest thing that can count as a detail from someone's writing.
 *
 * Paired with the two-word rule in `verify`, not standing alone: "the kitchen"
 * is eleven characters and is unmistakably a detail of one person's morning,
 * while "a" is in everybody's writing. It is the pair that does the work.
 */
export const MIN_SOURCED_DETAIL = 8;

export class LocalProvider implements AiProvider {
  readonly name = 'local';
  readonly online = false;

  async readBack(req: ReadBackRequest): Promise<ReadBackResult> {
    return extractSpansLocally(req.text, req.limit ?? 7);
  }

  async scene(req: SceneRequest): Promise<SceneResult> {
    const detail = pickDetail(req.idealExcerpt) ?? pickDetail(req.impactLine) ?? '';
    const opening =
      req.type === 'other_road'
        ? 'The alarm goes twice and you let it.'
        : req.type === 'moment'
          ? 'It is the morning of it, and your hands are steady.'
          : 'It is an ordinary morning and nothing is difficult about this yet.';
    const narrative = [
      opening,
      detail ? `You remember writing about ${detail}.` : '',
      req.type === 'other_road'
        ? 'Nothing dramatic happened. That is the whole cost.'
        : 'You do the small thing. Nobody claps. You go on with the day.',
    ]
      .filter(Boolean)
      .join(' ');
    return {
      narrative,
      imagePrompt: sceneImagePrompt(req),
      sourcedDetail: detail,
    };
  }

  async safety(text: string): Promise<SafetyResult> {
    return screen(text);
  }
}

/**
 * Words that end a phrase mid-thought, so a quotation stops before them.
 */
const PHRASE_BREAK = new Set([
  'is', 'was', 'are', 'were', 'am', 'be', 'been', 'being',
  'and', 'but', 'or', 'so', 'then', 'when', 'while', 'because',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'as', 'from',
  'that', 'which', 'who', 'i', 'it', 'still', 'not',
]);

/**
 * A concrete detail from the person's own writing, cut where it still reads.
 *
 * The scene says "You remember writing about X", so X has to be a noun phrase.
 * Taking a fixed three words returned "the kitchen is still" out of "the
 * kitchen is still blue", and the scene read "You remember writing about the
 * kitchen is still." — their own sentence, chopped where it means nothing, and
 * handed back as the thing they wrote. The phrase now stops at the first word
 * that breaks it.
 */
function pickDetail(text: string): string | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  const m = t.match(/\b(?:the|my|a)\s+[a-z][\w'-]*(?:\s+[a-z][\w'-]*){0,3}\b/i);
  if (!m || !m[0]) return null;

  const words = m[0].trim().split(/\s+/);
  const kept = [words[0] as string];
  for (const w of words.slice(1)) {
    if (PHRASE_BREAK.has(w.toLowerCase())) break;
    kept.push(w);
  }
  // A determiner and a noun is the shortest thing that still reads as a detail
  // of somebody's morning. Below that it is a word, not a detail.
  return kept.length >= 2 ? kept.join(' ') : null;
}



export function sceneImagePrompt(req: SceneRequest): string {
  const grade =
    req.type === 'other_road'
      ? 'cold blue-grey grade, overcast, flat light'
      : req.tone === 'warmer'
        ? 'golden hour, warm Kodak Portra palette'
        : req.tone === 'simpler'
          ? 'muted desaturated palette, few objects'
          : 'natural light, muted Kodak Portra palette';
  return [
    '35 mm film photograph',
    grade,
    'slight grain',
    'environmental scene, over-the-shoulder or hands in frame, no faces',
    req.impactLine.slice(0, 120),
  ].join(', ');
}

export const NEGATIVE_PROMPT =
  'illustration, 3d render, cgi, neon, text, watermark, logo, distorted hands, extra fingers, face, portrait';

// ---------------------------------------------------------------- anthropic

export interface AnthropicOptions {
  /** The edge function that holds the key. The app never calls the provider directly. */
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Headers to send with every call — the person's session, when there is one.
   * Every function is deployed with `verify_jwt = true`, so a call without an
   * Authorization header is refused at the door, and this provider used to
   * send none: deployed as written, every read-back would have come back 401
   * and the app would have fallen back to the local extractor forever, silently.
   */
  headers?: () => Promise<Record<string, string>>;
}

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly online = true;
  private readonly f: typeof fetch;

  constructor(private readonly opts: AnthropicOptions) {
    this.f = opts.fetchImpl ?? globalThis.fetch;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 20_000);
    try {
      const extra = this.opts.headers ? await this.opts.headers() : {};
      const res = await this.f(`${this.opts.endpoint}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...extra },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${path} ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async readBack(req: ReadBackRequest): Promise<ReadBackResult> {
    const raw = await this.post<{ spans: { text: string; domain?: DomainId }[]; leftOutQuestion?: string }>(
      'readback',
      req,
    );
    // Offsets are recomputed from the source; anything invented is dropped.
    const spans = verifySpans(req.text, raw.spans ?? []);
    return { spans, ...(raw.leftOutQuestion ? { leftOutQuestion: raw.leftOutQuestion } : {}) };
  }

  async scene(req: SceneRequest): Promise<SceneResult> {
    return this.post<SceneResult>('scene', req);
  }

  async safety(text: string): Promise<SafetyResult> {
    return this.post<SafetyResult>('safety', { text });
  }
}

// ---------------------------------------------------------------- the guard

export interface GuardOptions {
  fallback?: AiProvider;
  onViolation?: (info: { call: string; reason: string }) => void;
}

/**
 * Wraps any provider so the rules hold no matter who answered:
 *  - read-back spans must be verbatim substrings, and at least one must survive;
 *  - a scene's `sourcedDetail` must appear in the user's own text;
 *  - the local safety screen runs in parallel and wins on the worse verdict;
 *  - any throw, timeout or violation falls back to the local engine.
 */
export function guarded(provider: AiProvider, opts: GuardOptions = {}): AiProvider {
  const fallback = opts.fallback ?? new LocalProvider();
  const violated = (call: string, reason: string) => opts.onViolation?.({ call, reason });

  return {
    name: `guarded(${provider.name})`,
    online: provider.online,

    async readBack(req) {
      try {
        const out = await provider.readBack(req);
        const spans: Span[] = verifySpans(req.text, out.spans);
        if (spans.length === 0) {
          violated('readBack', 'no proposed span survived substring verification');
          return fallback.readBack(req);
        }
        if (spans.length < out.spans.length) {
          violated('readBack', `${out.spans.length - spans.length} span(s) were not verbatim`);
        }
        return { spans, ...(out.leftOutQuestion ? { leftOutQuestion: out.leftOutQuestion } : {}) };
      } catch (err) {
        violated('readBack', err instanceof Error ? err.message : 'unknown error');
        return fallback.readBack(req);
      }
    },

    async scene(req) {
      const haystack = `${req.idealExcerpt} ${req.impactLine}`.toLowerCase();

      /**
       * A scene has to contain something of this person's life, and the check
       * has to be worth passing.
       *
       * The first version accepted any `sourcedDetail` that appeared anywhere
       * in their writing, so the single character "a" satisfied it, and it
       * never checked the narrative actually used the detail — a scene could
       * be stock footage carrying a receipt for a detail it never mentioned.
       */
      const verify = (out: SceneResult): string | null => {
        const detail = out.sourcedDetail?.trim() ?? '';
        const narrative = out.narrative?.trim() ?? '';
        if (!narrative) return 'empty narrative';
        if (detail.length < MIN_SOURCED_DETAIL) return 'sourcedDetail is too short to be a detail';
        if (detail.split(/\s+/).filter(Boolean).length < 2) return 'sourcedDetail is a single word';
        if (!haystack.includes(detail.toLowerCase())) return 'sourcedDetail is not in the user text';
        if (!narrative.toLowerCase().includes(detail.toLowerCase())) {
          return 'the narrative does not contain the detail it claims to be built on';
        }
        return null;
      };

      try {
        const out = await provider.scene(req);
        const problem = verify(out);
        if (!problem) return out;
        violated('scene', problem);
      } catch (err) {
        violated('scene', err instanceof Error ? err.message : 'unknown error');
      }

      // The fallback goes through the same gate. Returning it unchecked meant
      // the guard could be walked around simply by making the first call fail.
      const local = await fallback.scene(req);
      const localProblem = verify(local);
      if (!localProblem) return local;
      violated('scene', `fallback also refused: ${localProblem}`);
      // Nothing that can be shown as this person's future. The device draws its
      // own typographic scene rather than a picture of somebody else's life.
      return { ...local, narrative: '', sourcedDetail: '' };
    },

    async safety(text) {
      const local = screen(text);
      if (local.risk === 'crisis') return local;
      try {
        const remote = await provider.safety(text);
        // The worse verdict wins, by the one comparator both sides use.
        return worseRisk(remote.risk, local.risk) === remote.risk && remote.risk !== local.risk
          ? remote
          : local;
      } catch {
        return local;
      }
    },
  };
}
