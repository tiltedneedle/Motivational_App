/**
 * safety — the second opinion (PRD §11.6).
 *
 * The device has already run its own screen before anything was sent here, and
 * it keeps the worse of the two verdicts. This function exists to catch what a
 * regex cannot: the quiet sentence with no keyword in it.
 *
 * It never returns the user's words, only a verdict and a category.
 */
import { askJson, provider } from '../_shared/llm.ts';
import { allow, callerOf, tooMany } from '../_shared/limit.ts';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `You are a safety screen for a goal-setting app. You read one piece of
writing and return a verdict. You never reply to the person and you never quote them.

crisis: any indication of suicidal intent, self-harm, or that the person may be
in danger now. Err toward crisis when unsure — the cost of being wrong is a card
offering help, which a person can dismiss.

concern: heavy self-criticism, hopelessness, disordered eating cues, substance
patterns, or a numeric weight or calorie target. Not crisis, but the coach
should soften and avoid numbers.

none: ordinary difficulty. People writing honestly about a hard year, a failure,
grief or fear are usually 'none'. Sadness is not a crisis.`;

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
  if (!(await allow('safety', callerOf(req), { calls: 60, seconds: 600 }))) return tooMany();

  let text = '';
  try {
    text = String((await req.json())?.text ?? '');
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  if (!text.trim()) return json({ risk: 'none', category: null, action: 'continue' });

  // Whichever model the secrets name (see _shared/llm.ts). Without a
  // provider the device's own screen is the whole answer, and it is
  // deliberately the over-sensitive one. Failing open here is safe; failing
  // open on the device would not be.
  const key = provider(MODEL);
  if (!key) return json({ risk: 'none', category: null, action: 'continue', degraded: true });

  try {
    const input = (await askJson(key, {
      name: 'verdict',
      system: SYSTEM,
      user: text.slice(0, 6000),
      maxTokens: 200,
      schema: {
        type: 'object',
        properties: {
          risk: { type: 'string', enum: ['none', 'concern', 'crisis'] },
          category: {
            type: ['string', 'null'],
            enum: ['self-harm', 'despair', 'disordered-eating', 'substance', null],
          },
        },
        required: ['risk'],
      },
    })) as { risk?: string; category?: string | null } | null;
    const risk = input?.risk === 'crisis' ? 'crisis' : input?.risk === 'concern' ? 'concern' : 'none';
    return json({
      risk,
      category: input?.category ?? null,
      action: risk === 'crisis' ? 'resources' : risk === 'concern' ? 'soften' : 'continue',
    });
  } catch (err) {
    console.error('safety screen failed', err instanceof Error ? err.message : 'unknown');
    return json({ risk: 'none', category: null, action: 'continue', degraded: true });
  }
});
