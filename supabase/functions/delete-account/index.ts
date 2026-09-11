/**
 * delete-account — the person takes it all back (PRD §7.12, §10.5).
 *
 * "Immediate soft delete, hard delete after 7 days." The caller is whoever
 * the JWT says, and only they can ask for this: the function reads the user
 * out of the request and never takes an id from the body. The soft delete
 * happens here, at once — the profile is stamped and the session ends. The
 * hard delete is the sweep at the bottom, run by a schedule with the service
 * role, which removes the auth user and lets every foreign key cascade.
 *
 * Deleting an auth user needs the service role, which the app must never
 * hold; that is the whole reason this is a function rather than a query.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const GRACE_DAYS = 7;

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
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  }
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: 'not configured' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Who is asking. The user is read from their own token, never from the
  // body: the token is verified by the auth server, so a body that named
  // somebody else would name nobody.
  const token = (req.headers.get('authorization') ?? '').replace(/^bearer\s+/i, '');
  if (!token) return json({ error: 'not signed in' }, 401);
  const { data: who, error: whoError } = await admin.auth.getUser(token);
  if (whoError || !who?.user) return json({ error: 'not signed in' }, 401);
  const userId = who.user.id;

  // The sweep: anyone whose grace period has run out, gone for good. Run on
  // every call rather than only on a schedule, so the promise holds even on a
  // project where nobody set the cron up.
  const cutoff = new Date(Date.now() - GRACE_DAYS * 86_400_000).toISOString();
  const { data: due } = await admin.from('profiles').select('id').lte('deleted_at', cutoff).not('deleted_at', 'is', null);
  for (const row of due ?? []) {
    // auth.users → profiles → everything, by cascade.
    await admin.auth.admin.deleteUser(row.id);
  }

  // The soft delete, now. Stamped rather than removed, so a person who
  // changes their mind inside the week can sign in and be restored — the
  // writing is still there until the sweep.
  const { error } = await admin.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', userId);
  if (error) return json({ error: 'could not mark the account' }, 500);

  // Every session ends. The app signs out locally as well; this is the half
  // the app cannot do for other devices.
  await admin.auth.admin.signOut(token, 'global').catch(() => {});

  return json({ ok: true, hardDeleteAfter: new Date(Date.now() + GRACE_DAYS * 86_400_000).toISOString() });
});
