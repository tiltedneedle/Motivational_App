/**
 * One way to ask a language model for a JSON answer, whichever model it is.
 *
 * The three AI functions used to speak only to Anthropic. They still can —
 * ANTHROPIC_API_KEY and the tool-use path are unchanged — but the same call
 * works against any OpenAI-compatible endpoint, which is nearly every
 * provider there is: OpenAI, Groq (free tier), Google's Gemini through its
 * OpenAI-compatible URL, OpenRouter, Mistral, Together, an Ollama or vLLM
 * on a box of your own. Set three secrets and the functions use it:
 *
 *   LLM_BASE_URL   e.g. https://api.groq.com/openai/v1
 *   LLM_API_KEY    the provider's key
 *   LLM_MODEL      e.g. llama-3.3-70b-versatile
 *
 * With neither key set the functions say so and the app runs on its device
 * engines, as before. The answer is asked for as JSON against a schema; what
 * comes back is parsed defensively and every function still verifies it
 * against the person's own text, so a model that invents is caught the same
 * way whichever provider it came from.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';

export type Provider =
  | { kind: 'anthropic'; apiKey: string; model: string }
  | { kind: 'openai'; baseUrl: string; apiKey: string; model: string };

/** The provider the secrets name, or null. An OpenAI-compatible one wins when both are set. */
export function provider(anthropicModel: string): Provider | null {
  const base = (Deno.env.get('LLM_BASE_URL') ?? '').trim().replace(/\/+$/, '');
  const key = (Deno.env.get('LLM_API_KEY') ?? '').trim();
  const model = (Deno.env.get('LLM_MODEL') ?? '').trim();
  if (base && key && model) return { kind: 'openai', baseUrl: base, apiKey: key, model };
  const anthropic = (Deno.env.get('ANTHROPIC_API_KEY') ?? '').trim();
  if (anthropic) return { kind: 'anthropic', apiKey: anthropic, model: anthropicModel };
  return null;
}

export interface JsonAsk {
  system: string;
  user: string;
  /** The shape wanted back, as JSON Schema; the tool's input on Anthropic, the instruction on the rest. */
  schema: Record<string, unknown>;
  /** A name for the tool on Anthropic. */
  name: string;
  maxTokens: number;
}

/** Ask, and get the parsed object back (or null when nothing usable came). */
export async function askJson(p: Provider, ask: JsonAsk): Promise<Record<string, unknown> | null> {
  if (p.kind === 'anthropic') {
    const client = new Anthropic({ apiKey: p.apiKey });
    const res = await client.messages.create({
      model: p.model,
      max_tokens: ask.maxTokens,
      system: [{ type: 'text', text: ask.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: ask.user }],
      tools: [{ name: ask.name, description: 'Report the answer.', input_schema: ask.schema as Anthropic.Tool['input_schema'] }],
      tool_choice: { type: 'tool', name: ask.name },
    });
    const block = res.content.find((c) => c.type === 'tool_use');
    const input = (block as { input?: unknown } | undefined)?.input;
    return input && typeof input === 'object' ? (input as Record<string, unknown>) : null;
  }

  const body = {
    model: p.model,
    temperature: 0.2,
    max_tokens: ask.maxTokens,
    messages: [
      { role: 'system', content: `${ask.system}\n\nAnswer with one JSON object and nothing else. It must match this JSON Schema:\n${JSON.stringify(ask.schema)}` },
      { role: 'user', content: ask.user },
    ],
    response_format: { type: 'json_object' },
  };
  let res = await chat(p, body);
  // A provider that does not know response_format says so with a 400; the
  // instruction in the system prompt is enough for most, so ask once more without it.
  if (res.status === 400) {
    const { response_format: _rf, ...plain } = body;
    res = await chat(p, plain);
  }
  if (!res.ok) throw new Error(`${p.baseUrl} ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string | { text?: string }[] } }[] };
  const raw = data.choices?.[0]?.message?.content;
  const text = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((c) => c?.text ?? '').join('') : '';
  return parseJson(text);
}

async function chat(p: Extract<Provider, { kind: 'openai' }>, body: unknown): Promise<Response> {
  return fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${p.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
}

/** The first JSON object in a reply, fences and preamble notwithstanding. */
export function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const out = JSON.parse(cleaned.slice(start, end + 1));
    return out && typeof out === 'object' && !Array.isArray(out) ? (out as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
