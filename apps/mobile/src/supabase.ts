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
import { authStorage } from './session-store';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

/** Whether there is an account service to talk to at all. */
export const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Google sign-in on the web. The value is the OAuth web client id — public,
 * like the anon key — and its presence is the switch: no id, no button. The
 * project side (the provider enabled with the same id and its secret) is
 * set up once, per the README.
 */
export const GOOGLE_WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
export const hasGoogleWeb = hasSupabase && Platform.OS === 'web' && GOOGLE_WEB_CLIENT_ID.length > 0;

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
        // A deadline on every call. Without one a stalled connection held
        // "Copy now", "Send me a code" and "Bring my Book back" busy for as
        // long as the browser's own limit, with nothing said.
        global: { fetch: fetchWithDeadline },
        auth: {
          // Encrypted at rest on a phone (session-store.ts); the browser's
          // own storage on the web.
          storage: authStorage(),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          // PKCE (the rebuild's review): a sign-in through Google comes back
          // with a one-time code, not with tokens in the URL — which on a
          // phone is a custom-scheme URL any app can register for. The
          // verifier lives in the same storage as the session, so the
          // exchange happens here and nowhere else.
          flowType: 'pkce',
        },
      }),
    )
    .catch(() => {
      // The chunk did not arrive (offline before it was ever cached, or an
      // open tab outlived a deploy): the account is unreachable this time,
      // not gone. Asked again next time, and said as what it is.
      chunkMissing = true;
      client = null;
      return null;
    });
  return client;
}

/** Whether the account's code could not be fetched this session. */
let chunkMissing = false;

/** What to tell a person when the client is not there: a missing chunk is a reload, not a missing service. */
export function noClientMessage(): string {
  if (chunkMissing) return 'This copy of Morrow could not fetch its account part. Reload the page and try again; your writing is safe.';
  return NO_SERVICE;
}

const CALL_DEADLINE_MS = 15_000;

/** `fetch` with a deadline, for the account client. */
function fetchWithDeadline(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_DEADLINE_MS);
  // A caller's own signal, if any, is honoured too.
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
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
    if (error) {
      // A refresh that failed for want of a network is a blip; a refresh
      // the service refused — the token revoked, the account closed from
      // another phone — is the answer. Read as a blip, the second kept
      // Settings saying "Signed in" while every copy failed.
      const retryable = (error as { name?: string }).name === 'AuthRetryableFetchError' || /network|fetch|abort|timeout/i.test(error.message ?? '');
      if (retryable) return { session: data.session ?? null, reachable: false };
      return { session: null, reachable: true };
    }
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
  if (!c) return { ok: false, error: noClientMessage() };
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: 'That does not look like an email address.' };
  try {
    // On the web the email's link comes back to this browser, where the
    // verifier is; sent to `morrow://` it was a dead end on a laptop.
    const origin = Platform.OS === 'web' ? (globalThis as { location?: { origin?: string } }).location?.origin : undefined;
    const { error } = await c.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true, ...(origin ? { emailRedirectTo: `${origin}/account` } : {}) },
    });
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
  if (!url) return null;
  // Once per URL. On Android the auth session's own listener and the root
  // layout's both receive the redirect, and the second exchange of a
  // one-time code fails — telling a person who had just signed in that the
  // sign-in did not go through.
  const seen = handled.get(url);
  if (seen) return seen;
  const result = signInFromUrlOnce(url);
  handled.set(url, result);
  if (handled.size > 8) handled.delete(handled.keys().next().value as string);
  // A failure the connection caused is not remembered: the code was never
  // spent, and the same link tapped again once the network is back should
  // exchange it.
  void result.then((r) => {
    if (r && !r.ok && /connection|too long/i.test(r.error)) handled.delete(url);
  });
  return result;
}

const handled = new Map<string, Promise<AuthResult | null>>();

async function signInFromUrlOnce(url: string): Promise<AuthResult | null> {
  const c = await supabase();
  if (!c) return null;
  let params: URLSearchParams;
  try {
    const u = new URL(url);
    const fragment = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
    params = new URLSearchParams(fragment || u.search);
    if (!params.has('access_token') && !params.has('token_hash') && !params.has('code')) {
      // some senders put the fragment's keys in the query instead
      params = new URLSearchParams(u.search);
    }
  } catch {
    return null;
  }
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { ok: false, error: plain(error.replace(/\+/g, ' ')) };
  try {
    // The PKCE code, from Google (or any provider) coming back: exchanged
    // here with the verifier this device kept. A code from a URL that did
    // not start on this device exchanges for nothing.
    const code = params.get('code');
    if (code) {
      const { error: e } = await c.auth.exchangeCodeForSession(code);
      return e ? { ok: false, error: plain(e.message) } : { ok: true };
    }
    // Only a PKCE code is a sign-in this device started: it exchanges for
    // nothing without the verifier kept here. Tokens or a token hash in a
    // URL would sign this device into whoever's session they were — and the
    // background copy would then push the person's writing into that
    // account — so they are not honoured at all.
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
  return null;
}

export async function confirmCode(email: string, code: string): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: noClientMessage() };
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
  if (!c) return { ok: false, error: noClientMessage() };
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
  if (!c) return { ok: false, error: noClientMessage() };
  try {
    const { error } = await c.auth.signInWithIdToken({ provider: 'google', token: idToken, ...(nonce ? { nonce } : {}) });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

/**
 * Sign in with Google on the web, by the redirect: the browser goes to
 * Google, then back to /account with the session in the URL's fragment,
 * which the launch handler turns into a session the same way it does the
 * email link. Nothing about Google is trusted here beyond handing the
 * person to it; the auth server does the exchange.
 */
export async function signInWithGoogleRedirect(next?: string): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: noClientMessage() };
  const origin = (globalThis as unknown as { location?: { origin?: string } }).location?.origin ?? '';
  // Where to go once back: kept in this tab's session storage, since the
  // allow-list matches the redirect by path and a query would not survive.
  try {
    if (next) sessionStorage.setItem(SIGNIN_NEXT, next);
    else sessionStorage.removeItem(SIGNIN_NEXT);
  } catch {
    // storage refused (a private window): the account screen falls back to Today
  }
  try {
    const { error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/account`, queryParams: { prompt: 'select_account' } },
    });
    if (error) return { ok: false, error: plain(error.message) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

/**
 * Sign in with Google on a phone, through the system browser: the auth
 * server's Google URL opens in an auth session, Google comes back to
 * `morrow://account` with the session in the fragment, and the same URL
 * handler as the email link turns it into a session. Uses the web OAuth
 * client, so it works the day the web one does; the native id-token route
 * (`signInWithGoogle`) stays for a build with the Google SDK in it.
 */
export async function signInWithGoogleSession(): Promise<AuthResult> {
  const c = await supabase();
  if (!c) return { ok: false, error: noClientMessage() };
  const redirectTo = 'morrow://account';
  try {
    const { data, error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error) return { ok: false, error: plain(error.message) };
    if (!data.url) return { ok: false, error: 'Google did not answer. Try again in a moment.' };
    const browser = await import('expo-web-browser');
    const result = await browser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return { ok: false, error: 'Sign-in was closed before it finished.' };
    const landed = await signInFromUrl(result.url);
    return landed ?? { ok: false, error: 'Google came back without a session. Try again.' };
  } catch (err) {
    return { ok: false, error: plain(err instanceof Error ? err.message : 'no network') };
  }
}

const SIGNIN_NEXT = 'morrow-signin-next';

/** The `next` a web sign-in was leaving for, read once on the way back. */
export function takeSignInNext(): string | null {
  try {
    const v = sessionStorage.getItem(SIGNIN_NEXT);
    if (v) sessionStorage.removeItem(SIGNIN_NEXT);
    return v && /^\/[a-z-]+$/i.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** Whether a Google button belongs on this build: the web client id is set, on any platform. */
export const hasGoogle = hasSupabase && GOOGLE_WEB_CLIENT_ID.length > 0;

export async function signOut(): Promise<void> {
  const c = await supabase();
  if (!c) return;
  try {
    // This device only. The default scope is every device, and signing out
    // on a library computer used to sign the phone out too — silently, and
    // with it every evening's copy from then on.
    await c.auth.signOut({ scope: 'local' });
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
  if (!c) return { ok: false, error: noClientMessage() };
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
export function plain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate') || m.includes('too many')) return 'Too many tries just now. Give it a minute and ask again.';
  if (m.includes('abort') || m.includes('timed out') || m.includes('timeout')) return 'That took too long. Check the connection and try again; nothing was lost.';
  if (m.includes('code verifier') || m.includes('both auth code')) return 'That sign-in link has already been used, or was opened in a different browser. Start the sign-in again here.';
  if (m.includes('row-level security') || m.includes('permission denied')) return 'The account refused the copy. Sign out and in again; if it keeps happening, tell us.';
  if (m.includes('jwt') || m.includes('refresh_token') || m.includes('session') && m.includes('missing')) return 'Your sign-in has lapsed. Sign in again to keep copying.';
  if (m.includes('expired')) return 'That code has expired. Ask for a new one.';
  if (m.includes('invalid') || m.includes('otp')) return 'That code did not match. Check it and try once more.';
  if (m.includes('network') || m.includes('fetch') || m.includes('load failed')) return 'No connection just now. Everything you wrote is still on this device.';
  return 'That did not go through. Nothing was lost; try again in a moment.';
}
