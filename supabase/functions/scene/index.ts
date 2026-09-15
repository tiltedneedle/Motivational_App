/**
 * scene — Envision (PRD §7.8).
 *
 * The narrative must contain a detail lifted from the user's own writing, and
 * that is checked here and again on the device. A scene that could belong to
 * anyone is not this person's future; it is stock footage.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import { allow, callerOf, tooMany } from '../_shared/limit.ts';

const MODEL = 'claude-sonnet-5';

const SYSTEM = `You write one short scene for someone, in the second person, present tense.

You are given: their goal, a line they wrote about who else it changes, and an
excerpt of their own writing about the life they want.

Rules:
1. 90 to 120 words. No more.
2. Include one concrete detail taken from THEIR writing, and report it exactly
   in sourced_detail. If you cannot find one, say so and write nothing.
3. Ordinary, not triumphant. No crowds, no applause, no music swelling.
4. Never promise an outcome and never predict. Describe a morning.
5. No "we". No exclamation marks.

For type "other_road" the same rules apply, but the scene is the cost of the
habits winning: quiet, specific, and never cruel about the person.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

function imagePrompt(type: string, tone: string | null, impact: string): string {
  const grade =
    type === 'other_road'
      ? 'cold blue-grey grade, overcast, flat light'
      : tone === 'warmer'
        ? 'golden hour, warm Kodak Portra palette'
        : tone === 'simpler'
          ? 'muted desaturated palette, few objects'
          : 'natural light, muted Kodak Portra palette';
  return [
    '35 mm film photograph',
    grade,
    'slight grain',
    'environmental scene, over-the-shoulder or hands in frame, no faces',
    impact.slice(0, 120),
  ].join(', ');
}

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
  if (!(await allow('scene', callerOf(req), { calls: 10, seconds: 3600 }))) return tooMany();

  let body: {
    goalTitle?: string;
    impactLine?: string;
    idealExcerpt?: string;
    type?: string;
    tone?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const goalTitle = String(body.goalTitle ?? '');
  const impactLine = String(body.impactLine ?? '');
  const idealExcerpt = String(body.idealExcerpt ?? '');
  const type = String(body.type ?? 'practice');
  const tone = body.tone ?? null;

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ degraded: 'no provider configured' }, 503);

  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Goal: ${goalTitle}\nType: ${type}\nWho else it changes: ${impactLine}\n\nTheir writing:\n${idealExcerpt}`,
        },
      ],
      tools: [
        {
          name: 'scene',
          description: 'Return the scene.',
          input_schema: {
            type: 'object',
            properties: {
              narrative: { type: 'string' },
              sourced_detail: { type: 'string' },
            },
            required: ['narrative', 'sourced_detail'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'scene' },
    });

    const block = res.content.find((c) => c.type === 'tool_use');
    const input = (block as { input?: { narrative?: string; sourced_detail?: string } } | undefined)?.input;
    const narrative = (input?.narrative ?? '').trim();
    const detail = (input?.sourced_detail ?? '').trim();

    const haystack = `${idealExcerpt} ${impactLine}`.toLowerCase();
    if (!narrative || !detail || !haystack.includes(detail.toLowerCase())) {
      // The device falls back to its own typographic scene rather than showing
      // a picture of a life that is not theirs.
      return json({ degraded: 'sourced detail not found in the user text' }, 422);
    }

    return json({
      narrative,
      sourcedDetail: detail,
      imagePrompt: imagePrompt(type, tone, impactLine),
      negativePrompt:
        'illustration, 3d render, cgi, neon, text, watermark, logo, distorted hands, extra fingers, face, portrait',
    });
  } catch (err) {
    console.error('scene failed', err instanceof Error ? err.message : 'unknown');
    return json({ degraded: 'provider error' }, 502);
  }
});
