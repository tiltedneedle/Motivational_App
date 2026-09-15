/**
 * readback — "What I heard" (PRD §7.2, §11.3).
 *
 * The model is asked to CHOOSE phrases, never to write one. Whatever comes back
 * is verified here against the source before it leaves the function, and again
 * on the device by `guarded()`. Two independent checks, because this is the one
 * place a model could put words in someone's mouth.
 */
import { askJson, provider } from '../_shared/llm.ts';
import { allow, callerOf, tooMany } from '../_shared/limit.ts';

const MODEL = 'claude-sonnet-5';

const SYSTEM = `You are helping someone hear their own writing back.

You will be given a piece of writing by one person about the life they want.
Your job is to CHOOSE up to 7 phrases from it that name something they want.

Rules, in order of importance:
1. Every phrase you return must be copied EXACTLY from the writing, character
   for character. Never rephrase, never tidy, never fix grammar or spelling.
2. Choose whole clauses a person would recognise as one wish. 4 to 18 words.
3. Do not overlap: two phrases must not share any text.
4. Guess a domain for each: health, money, craft, mind, people, home, or custom.
5. If two phrases are probably the same goal, set merge_with to the index of the
   earlier one. Do not merge them yourself.
6. If you can find fewer than three, return what you found and set
   left_out_question to exactly: "What did you leave out on purpose?"

You are not a coach here and you are not writing. You are pointing.`;

interface SpanOut {
  text: string;
  start: number;
  end: number;
  domain: string;
  merge_with?: number;
}

const DOMAINS = new Set(['health', 'money', 'craft', 'mind', 'people', 'home', 'custom']);

/** The gate. Offsets are recomputed from the source, never trusted. */
function verify(source: string, proposed: { text?: string; domain?: string; merge_with?: number }[]): SpanOut[] {
  const out: SpanOut[] = [];
  const used: { start: number; end: number }[] = [];
  for (const p of proposed) {
    const text = (p.text ?? '').trim();
    if (text.length < 8) continue;
    let from = 0;
    let start = -1;
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
    out.push({
      text,
      start,
      end,
      domain: DOMAINS.has(p.domain ?? '') ? (p.domain as string) : 'custom',
      ...(typeof p.merge_with === 'number' ? { merge_with: p.merge_with } : {}),
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  }
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  // A ceiling per caller (see _shared/limit.ts): the key ships in the app.
  if (!(await allow('readback', callerOf(req), { calls: 30, seconds: 600 }))) return tooMany();

  let text = '';
  let limit = 7;
  try {
    const body = await req.json();
    text = String(body?.text ?? '');
    limit = Math.min(9, Math.max(3, Number(body?.limit ?? 7)));
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  if (text.trim().length < 40) return json({ spans: [] });

  // Whichever model the secrets name (see _shared/llm.ts). No key, no
  // network, no model: the device falls back to its local extractor, which
  // chooses from the same text. The feature degrades, it never breaks.
  const key = provider(MODEL);
  if (!key) return json({ spans: [], degraded: 'no provider configured' });

  try {
    const input = (await askJson(key, {
      name: 'report_spans',
      system: SYSTEM,
      user: `Writing:\n\n${text}\n\nChoose up to ${limit} phrases.`,
      maxTokens: 1200,
      schema: {
        type: 'object',
        properties: {
          spans: {
            type: 'array',
            maxItems: 9,
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                domain: { type: 'string', enum: [...DOMAINS] },
                merge_with: { type: 'integer' },
              },
              required: ['text', 'domain'],
            },
          },
          left_out_question: { type: 'string' },
        },
        required: ['spans'],
      },
    })) as { spans?: unknown[]; left_out_question?: string } | null;
    const spans = verify(text, Array.isArray(input?.spans) ? (input!.spans as []) : []);

    return json({
      spans,
      ...(spans.length < 3 ? { leftOutQuestion: 'What did you leave out on purpose?' } : {}),
      // observability: a low rate here is a prompt regression, not a user problem
      proposed: Array.isArray(input?.spans) ? input!.spans.length : 0,
      verified: spans.length,
    });
  } catch (err) {
    console.error('readback failed', err instanceof Error ? err.message : 'unknown');
    return json({ spans: [], degraded: 'provider error' });
  }
});
