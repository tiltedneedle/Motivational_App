/**
 * The account, behind a seam (PRD §7.12).
 *
 * The app is whole without one: every screen works on the device alone, and
 * "a declined account keeps everything local with a quiet banner". So the
 * client here is optional in the strictest sense — built only when the two
 * public values exist, never assumed, and every caller has a path for `null`.
 *
 * The two values are public by design (the anon key is meant to ship in the
 * app; row level security is what protects the rows) and they are the only
 * secrets-shaped things the app ever holds. Nothing else lives in the bundle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

/** Whether there is an account service to talk to at all. */
export const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Where the edge functions live when Supabase is the host for them.
 * `EXPO_PUBLIC_MORROW_API` still wins when set, so the functions can be hosted
 * anywhere; this is the default that needs no extra configuration.
 */
export const FUNCTIONS_URL = hasSupabase ? `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1` : '';

let client: Promise<SupabaseClient | null> | null = null;

/**
 * The client, made once — and the library loaded only then. The account is
 * dormant for everyone who has not asked for one, and `@supabase/supabase-js`
 * with auth, storage and realtime behind it was a tenth of the web bundle on
 * every first load. Now it arrives when a sign-in, a push or a pull needs it.
 *
 * Sessions persist in AsyncStorage — the same store the writing lives in — so
 * signing in survives a relaunch. `detectSessionInUrl` is off because the
 * app's own scheme handles its links, and a web tab's URL is not a place to
 * look for a session.
 */
export function supabase(): Promise<SupabaseClient | null> {
  if (!hasSupabase) return Promise.resolve(null);
  if (client) return client;
  client = import('@supabase/supabase-js')
    .then((m) =>
      m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }),
    )
    .catch(() => {
      // The chunk did not arrive (offline before it was ever cached): the
      // account is unreachable this time, not gone. Asked again next time.
      client = null;
      return null;
    });
  return client;
}

/** The current session, or null when there is no account service or nobody is signed in. */
export async function currentSession(): Promise<Session | null> {
  return (await sessionState()).session;
}

/**
 * The session, and whether the answer can be trusted.
 *
 * "No session" means two different things: nobody is signed in, or the auth
 * layer could not say — a refresh that failed for want of a network. The
 * store clears the account on the first and leaves it alone on the second.
 */
export async function sessionState(): Promise<{ session: Session | null; reachable: boolean }> {
  const c = await supabase();
  if (!c) return { session: null, reachable: true };
  try {
    const { data, error } = await c.auth.getSession();
    if (error) return { session: data.session ?? null, reachable: false };
    return { session: data.session ?? null, reachable: true };
  } catch {
    return { session: null, reachable: false };
  }
}

/**
 * The headers an edge function needs to accept a call.
 *
 * Every function is deployed with `verify_jwt = true`, so a call with no
 * Authorization header is refused. Signed out, the anon key is offered; the
 * functions then answer as the anonymous role, which is enough for the
 * read-back and the safety screen and nothing else.
 */
export async function functionHeaders(): Promise<Record<string, string>> {
  if (!hasSupabase) return {};
  const session = await currentSession();
  return {
    apikey: SUPABASE_ANON_KEY,
    authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
  };
}

export type AuthResult = { ok: true } | { ok: false; error: string };

const NO_SERVICE = 'There is no account service in this build, so nothing was sent. Everything stays on this device.';

/**
 * Email, one-time code (PRD §7.12: "email OTP after the Portrait").
 *
 * A code rather than a magic link: a link opens the mail app and then has to
 * find its way back to this one, which on a phone is two apps and a scheme
 * handler away from working. Six digits typed into the field they are already
 * looking at always works.
 */
export async function sendCode(email: string): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: NO_SERVICE };
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: 'That does not look like an email address.' };
  try {
    const { error } = await c.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

/**
 * Sign in from the link in the email (the deep link, `morrow://`).
 *
 * The code is the design (PRD §7.12), and the email template that carries
 * it cannot be set on the project's free tier with the default email
 * provider, so until the project is on Pro the email carries Supabase's own
 * link. Tapped on the phone, the link opens the app at `morrow://` with the
 * session in the URL's fragment (`#access_token=…&refresh_token=…`), or with
 * a `token_hash` to verify. Either becomes a session here; anything else is
 * not a sign-in link and is left alone. Nothing is trusted from the URL
 * beyond handing it to the auth server, which is the one that decides.
 */
export async function signInFromUrl(url: string | null | undefined): Promise<AuthResult | null> {
  const c = await supabase();
  if (!c || !url) return null;
  let params: URLSearchParams;
  try {
    const u = new URL(url);
    const fragment = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
    params = new URLSearchParams(fragment || u.search);
    if (!params.has('access_token') && !params.has('token_hash')) {
      // some senders put the fragment's keys in the query instead
      params = new URLSearchParams(u.search);
    }
  } catch {
    return null;
  }
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { ok: false, error: plain(error.replace(/\+/g, ' ')) };
  try {
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (access && refresh) {
      const { error: e } = await c.auth.setSession({ access_token: access, refresh_token: refresh });
      return e ? { ok: false, error: plain(e.message) } : { ok: true };
    }
    const hash = params.get('token_hash');
    const type = params.get('type');
    if (hash && (type === 'magiclink' || type === 'email' || type === 'signup')) {
      const { error: e } = await c.auth.verifyOtp({ token_hash: hash, type: type === 'signup' ? 'signup' : 'magiclink' });
      return e ? { ok: false, error: plain(e.message) } : { ok: true };
    }
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
  return null;
}

export async function confirmCode(email: string, code: string): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: NO_SERVICE };
  const token = code.replace(/\D/g, '');
  if (token.length < 6) return { ok: false, error: 'The code is six digits.' };
  try {
    const { error } = await c.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

/**
 * Sign in with Apple (PRD §7.12), from the identity token the OS hands back.
 * The native half — `expo-apple-authentication` — is only present on iOS, so
 * the screen asks for it lazily; this is the half that is the same everywhere.
 */
export async function signInWithApple(identityToken: string, nonce?: string): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: NO_SERVICE };
  try {
    const { error } = await c.auth.signInWithIdToken({ provider: 'apple', token: identityToken, ...(nonce ? { nonce } : {}) });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

/**
 * Sign in with Google (PRD §7.12), from the id token the Google sign-in
 * module hands back. The same half as Apple's: this part is the same
 * everywhere; the native part (`@react-native-google-signin/google-signin`)
 * needs the client's OAuth client ids and is wired the day they exist —
 * see PROGRESS.md, "Blocked on the user".
 */
export async function signInWithGoogle(idToken: string, nonce?: string): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: NO_SERVICE };
  try {
    const { error } = await c.auth.signInWithIdToken({ provider: 'google', token: idToken, ...(nonce ? { nonce } : {}) });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

export async function signOut(): Promise<void> {
  const c = await supabase();
  if (!c) return;
  try {
    await c.auth.signOut();
  } catch {
    // Signed out locally either way; the server's copy of the session expires.
  }
}

/**
 * Delete the account (PRD §7.12: "immediate soft delete, hard delete after 7
 * days"). Deleting a user needs the service role, which the app must never
 * hold, so it is an edge function; the app only asks.
 */
export async function deleteAccount(): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: NO_SERVICE };
  try {
    const { error } = await c.functions.invoke('delete-account', { body: {} });
    if (error) return { ok: false, error: plain(error.message) };
    await c.auth.signOut();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

/**
 * The service's error strings are written for developers. The person sees
 * one sentence that says what to do next, and never a stack trace.
 */
function plain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate') || m.includes('too many')) return 'Too many tries just now. Give it a minute and ask again.';
  if (m.includes('expired')) return 'That code has expired. Ask for a new one.';
  if (m.includes('invalid') || m.includes('otp')) return 'That code did not match. Check it and try once more.';
  if (m.includes('network') || m.includes('fetch')) return 'No connection just now. Everything you wrote is still on this device.';
  return 'That did not go through. Nothing was lost; try again in a moment.';
}
