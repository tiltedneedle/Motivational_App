/**
 * The account (PRD §7.12): "Sign in with Apple, Google, email OTP after the
 * Portrait … A declined account keeps everything local with a quiet banner."
 *
 * This screen asks for exactly one thing and explains exactly what it is for:
 * a copy of the writing somewhere a lost phone cannot reach. It is not a gate.
 * Every button on it, including the one that says no, goes on to the same
 * place, and "Not now" is never asked twice on the way through — it is in
 * Settings for whenever they change their mind.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, UserField, day } from '@morrow/ui';
import { confirmCode, hasSupabase, sendCode, signInWithApple } from '../src/supabase';
import { useMorrow } from '../src/store';
import { track } from '../src/analytics';

type Stage = 'email' | 'code' | 'done';

export default function Account() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const markAccountAsked = useMorrow((s) => s.markAccountAsked);
  const setAccount = useMorrow((s) => s.setAccount);
  const afterSignIn = useMorrow((s) => s.afterSignIn);

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  /**
   * On. `next` is where the sitting was going — sealing the Book — and it is
   * checked against a shape this app owns, never followed on trust.
   */
  const onwards = () => {
    markAccountAsked();
    // A Book brought back from the account lands on Today, whatever screen
    // asked: the thing behind this one was an empty device.
    if (pulled) {
      router.replace('/today');
      return;
    }
    const to = typeof next === 'string' && /^\/[a-z-]+$/i.test(next) ? next : '';
    if (to) {
      router.replace(to);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/today');
  };

  const send = async () => {
    setBusy(true);
    setProblem(null);
    const out = await sendCode(email);
    setBusy(false);
    if (!out.ok) {
      setProblem(out.error);
      return;
    }
    setSent(email.trim().toLowerCase());
    setStage('code');
  };

  const [pulled, setPulled] = useState(false);

  /** Signed in: the copy, one way or the other, with the button held busy throughout. */
  const settle = async (method: 'email' | 'apple') => {
    await setAccount();
    const synced = await afterSignIn();
    track({ name: 'account_signed_in', method, pulled: synced.ok && synced.pulled });
    if (!synced.ok) {
      // Signed in, but the copy did not land. Said plainly: the sign-in is real,
      // the writing is still here, and the next launch will try again.
      setProblem(synced.error);
    } else {
      setProblem(null);
      setPulled(synced.pulled);
    }
    setStage('done');
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const out = await confirmCode(sent ?? email, code);
      if (!out.ok) {
        setProblem(out.error);
        return;
      }
      await settle('email');
    } finally {
      setBusy(false);
    }
  };

  const apple = async () => {
    setBusy(true);
    setProblem(null);
    try {
      // Only on iOS, and only when the native module is in the build. Loaded
      // here rather than at the top so the screen exists everywhere else.
      const mod: any = await import('expo-apple-authentication');
      const credential = await mod.signInAsync({
        requestedScopes: [mod.AppleAuthenticationScope.EMAIL],
      });
      if (!credential?.identityToken) throw new Error('no identity token');
      const out = await signInWithApple(credential.identityToken);
      if (!out.ok) {
        setProblem(out.error);
        return;
      }
      await settle('apple');
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      // The person closed the sheet. Not an error, and not worth a sentence.
      if (/cancel/i.test(m)) return;
      setProblem('Sign in with Apple is not available in this build. The email code works everywhere.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Studio testID="screen-account">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 22, gap: 18 }}>
          <Label>An account, if you want one</Label>
          <Statement style={{ fontSize: 27, lineHeight: 33 }}>Keep the Book somewhere a lost phone cannot reach.</Statement>
          <Body>
            That is all an account does: a copy of your writing, for a new phone or a cleared one. Nothing you write is
            used for anything else — not for advertising, not for anyone&apos;s model — and you can delete the account and
            its copy from Settings, in the app, without asking anyone.
          </Body>

          {!hasSupabase ? (
            <View testID="account-unavailable" style={{ gap: 10 }}>
              <Rule />
              <Body style={{ color: day.ink }}>
                There is no account service in this build, so there is nothing to sign in to. Everything stays on
                this device, and Settings can copy it all out whenever you like.
              </Body>
              <InkButton testID="account-continue" label="Carry on" onPress={onwards} />
            </View>
          ) : stage === 'done' ? (
            <View testID="account-done" style={{ gap: 10 }}>
              <Rule />
              <Body style={{ color: day.ink }}>
                {pulled ? 'Signed in. Your Book is back on this phone.' : 'Signed in. The Book has a second home now.'}
              </Body>
              {problem ? (
                <Body testID="account-problem" style={{ color: day.ink }}>
                  {problem}
                </Body>
              ) : null}
              <InkButton testID="account-continue" label="Carry on" onPress={onwards} />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Rule />
              {stage === 'email' ? (
                <>
                  <UserField
                    testID="account-email"
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@somewhere"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <InkButton testID="account-send" label={busy ? 'Sending…' : 'Send me a code'} busy={busy} onPress={() => void send()} />
                  {Platform.OS === 'ios' ? (
                    <Chip testID="account-apple" label="Sign in with Apple" onPress={() => void apple()} />
                  ) : null}
                </>
              ) : (
                <>
                  <Body style={{ fontSize: 14 }}>A six-digit code is on its way to {sent}.</Body>
                  <UserField
                    testID="account-code"
                    label="The code"
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    keyboardType="number-pad"
                  />
                  <InkButton testID="account-confirm" label={busy ? 'Checking…' : 'Sign in'} busy={busy} onPress={() => void confirm()} />
                  <TextButton label="Use a different email" onPress={() => setStage('email')} />
                </>
              )}
              {problem ? (
                <Body testID="account-problem" style={{ color: day.ink }}>
                  {problem}
                </Body>
              ) : null}
              {/*
                Never a gate. PRD §7.12: a declined account keeps everything
                local, with a quiet banner rather than a second ask.
              */}
              <TextButton testID="account-not-now" label="Not now — keep it on this phone" onPress={onwards} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
