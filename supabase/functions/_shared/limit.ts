/**
 * A ceiling on how often one caller can ask an AI function.
 *
 * The read-back, the safety second opinion and the scenes answer to the
 * publishable key alone — there is no account wall (PRD §7.12), so they have
 * to work for a person who never signed in — and the key ships in the app.
 * Anyone holding it could spend the providers' quota.
 *
 * The count lives in the database (migration 0003: `public.rate_limits` and
 * `rate_limit_hit`, callable only by the service role), not in memory: the
 * edge runtime gives every request its own execution, so a Map here held
 * nothing from one call to the next. One small query before each spend.
 *
 * The caller is the signed-in user when the bearer token carries one, else
 * the address the platform reports. Nothing here reads the body. If the
 * database cannot be asked, the call goes through: a limiter that fails
 * closed would take the feature down with it.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

export interface Limit {
  /** Calls allowed inside the window. */
  calls: number;
  /** The window, in seconds. */
  seconds: number;
}

/** Who is asking: the user id from the JWT's payload if it has one, else the address. */
export function callerOf(req: Request): string {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^bearer\s+/i, '');
  const sub = subjectOf(bearer);
  if (sub) return `user:${sub}`;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  return `ip:${ip}`;
}

/** The JWT's subject, read without verifying — the gateway has verified it already; this is only a bucket key. */
function subjectOf(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const sub = typeof payload?.sub === 'string' ? payload.sub : null;
    const role = typeof payload?.role === 'string' ? payload.role : null;
    return sub && role !== 'anon' ? sub : null;
  } catch {
    return null;
  }
}

/** True when this call is inside the limit. Records it either way. */
export async function allow(fn: string, caller: string, limit: Limit): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) return true;
  try {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.rpc('rate_limit_hit', { p_key: `${fn}:${caller}`, p_calls: limit.calls, p_seconds: limit.seconds });
    if (error) {
      console.error('rate limit unavailable', error.message);
      return true;
    }
    return data !== false;
  } catch (err) {
    console.error('rate limit unavailable', err instanceof Error ? err.message : String(err));
    return true;
  }
}

/** The 429, with the same headers the functions use everywhere. */
export function tooMany(): Response {
  return new Response(JSON.stringify({ error: 'too many requests', degraded: 'rate limited' }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'retry-after': '60' },
  });
}
