/**
 * Sign in (the rebuild, 2026-09-21). One screen for the account: Google
 * first, Apple on an iPhone, the email code for everyone, and a plain way
 * past all of it. Never a wall — the app works without an account, and
 * says so — but a real door for the person who has one.
 *
 * Google on the web is the redirect: away to Google and back to /account
 * with the session in the URL. On a phone it is an auth session in the
 * system browser, coming back to `morrow://account`. Either way the
 * account screen is where the session lands, and it does the copy.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Body, Chip, GoogleButton, Heading, Label, Notice, Rule, Screen, Stone, TextButton, accent, day, useReducedMotion } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { hasGoogle, hasSupabase, signInWithApple, signInWithGoogleRedirect, signInWithGoogleSession } from '../src/supabase';
import { track } from '../src/analytics';

export default function SignIn() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const account = useMorrow((s) => s.account);
  const setAccount = useMorrow((s) => s.setAccount);
  const afterSignIn = useMorrow((s) => s.afterSignIn);
  const signInNotice = useMorrow((s) => s.signInNotice);
  const setSignInNotice = useMorrow((s) => s.setSignInNotice);
  const markAccountAsked = useMorrow((s) => s.markAccountAsked);
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (!signInNotice) return;
    setProblem(signInNotice);
    setSignInNotice(null);
  }, [signInNotice, setSignInNotice]);

  const to = typeof next === 'string' && /^\/[a-z-]+$/i.test(next) ? next : '';
  const topGoalId = useMorrow((s) => s.goals.find((g) => g.status !== 'archived')?.id ?? null);
  const back = () => {
    // The ask on the way to the finish: back is the plan it came from, not
    // "Name your Book" five stones ago.
    if (to === '/seal-book' && topGoalId) {
      router.replace(`/portrait?goal=${topGoalId}&next=/seal-book`);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace(to || '/today');
  };
  /** The email code lives on the account screen; it carries `next` on. */
  const onwards = () => router.replace((to ? `/account?next=${to}` : '/account') as never);
  /**
   * Past it. When this screen is the once-only ask after the plan (`next`
   * is the seal) that is recorded, so it is never asked again; opened from
   * Welcome, Today or You it is simply left, back to where they were.
   */
  const notNow = () => {
    if (to === '/seal-book') markAccountAsked();
    if (to) {
      router.replace(to as never);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  };

  /** Signed in here (a phone's auth session, Apple): the account screen finishes the copy. */
  const settle = async (method: 'apple' | 'google') => {
    await setAccount();
    const synced = await afterSignIn();
    track({ name: 'account_signed_in', method, pulled: synced.ok && synced.pulled });
    // The outcome goes with the person to the account screen: a choice
    // still owed shows as the two choices there, a pull as "your Book is
    // back", a failure as the line under the button. Set on this screen
    // alone it was on a screen being replaced.
    const outcome = !synced.ok ? (synced.conflict ? 'conflict' : synced.closed ? 'closed' : 'failed') : synced.pulled ? 'pulled' : synced.moved;
    if (!synced.ok && !synced.conflict && !synced.closed) setSignInNotice(synced.error);
    const q = [to ? `next=${to}` : '', `settled=${outcome}`].filter(Boolean).join('&');
    router.replace(`/account?${q}` as never);
  };

  const google = async () => {
    if (busy) return;
    setBusy('google');
    setProblem(null);
    try {
      if (Platform.OS === 'web') {
        const out = await signInWithGoogleRedirect(to || undefined);
        // On success the browser is leaving for Google; nothing more to do here.
        if (!out.ok) setProblem(out.error);
        return;
      }
      const out = await signInWithGoogleSession();
      if (!out.ok) {
        setProblem(out.error);
        return;
      }
      await settle('google');
    } finally {
      setBusy(null);
    }
  };

  const apple = async () => {
    if (busy) return;
    setBusy('apple');
    setProblem(null);
    try {
      const mod = await import('expo-apple-authentication');
      const credential = await mod.signInAsync({ requestedScopes: [mod.AppleAuthenticationScope.EMAIL] });
      if (!credential.identityToken) throw new Error('Apple gave no token');
      const out = await signInWithApple(credential.identityToken);
      if (!out.ok) {
        setProblem(out.error);
        return;
      }
      await settle('apple');
    } catch (err) {
      // Cancel on the system sheet is not a fault, and not "not available".
      const code = (err as { code?: string } | null)?.code ?? '';
      if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
        setProblem(null);
        return;
      }
      setProblem('Sign in with Apple is not available in this build. Google or the email code work everywhere.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      testID="screen-signin"
      back={{ onPress: back, testID: 'signin-back' }}
      where="Sign in"
      secondary={{ label: hasSupabase ? 'Not now — keep it on this phone' : 'Carry on', onPress: notNow, testID: 'signin-not-now' }}
    >
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
        <Stone size={88} domain="health" polish={1} sweep={!reduced} />
      </View>
      <Heading
        title={account ? 'You are signed in.' : 'Sign in to Morrow.'}
        line={
          hasSupabase
            ? 'A copy of your Book on your account, so it follows you to any phone. The app works without one; nothing here is a wall.'
            : 'There is no account service in this build. Everything you write stays on this phone, and that is a complete way to use it.'
        }
        testID="signin-heading"
        lineTestID="signin-line"
      />

      {hasSupabase && !account ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          {hasGoogle ? <GoogleButton testID="signin-google" onPress={() => void google()} busy={busy === 'google'} /> : null}
          {Platform.OS === 'ios' ? <Chip testID="signin-apple" label={busy === 'apple' ? 'One moment…' : 'Sign in with Apple'} onPress={() => void apple()} style={{ minHeight: 54 }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
            <Rule style={{ flex: 1 }} />
            <Label>or</Label>
            <Rule style={{ flex: 1 }} />
          </View>
          <Chip testID="signin-email" label="Continue with email" onPress={onwards} style={{ minHeight: 54 }} />
          <Notice testID="signin-problem" kind="error" text={problem} style={{ color: accent.coralText }} />
          <Body style={{ fontSize: 13, color: day.ink2, textAlign: 'center', marginTop: 6 }}>
            {hasGoogle ? 'Google or Apple hand the app your email address and name, nothing more. ' : ''}No password is ever made or kept. The account holds a copy of your writing and your settings — nothing else, and never for advertising.
          </Body>
        </View>
      ) : hasSupabase && account ? (
        <View style={{ gap: 12, marginTop: 6 }}>
          <Body testID="signin-who">{account.email ? `Signed in as ${account.email}.` : 'Signed in.'} Your Book is copied to the account whenever the app goes to the background.</Body>
          <Chip testID="signin-account" label="Open the account" onPress={() => router.replace('/account')} style={{ minHeight: 54 }} />
        </View>
      ) : null}
      <TextButton testID="signin-privacy" label="What leaves the phone, and when" onPress={() => router.push('/consent?from=setup')} style={{ alignSelf: 'center', marginTop: 8 }} />
    </Screen>
  );
}
