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
import { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Notice, Rule, Statement, Studio, TextButton, TopBar, UserField, day } from '@morrow/ui';
import { confirmCode, hasGoogleWeb, hasSupabase, sendCode, signInWithApple, signInWithGoogleRedirect, takeSignInNext } from '../src/supabase';
import { useMorrow } from '../src/store';
import { track } from '../src/analytics';

type Stage = 'email' | 'code' | 'done';

export default function Account() {
  const router = useRouter();
  const { next: nextParam, settled } = useLocalSearchParams<{ next?: string; settled?: string }>();
  // A web sign-in through Google comes back here cold, with the `next` it
  // left with kept in the tab; read once, on mount.
  const [next] = useState<string | undefined>(() => (typeof nextParam === 'string' ? nextParam : (takeSignInNext() ?? undefined)));
  const topGoalId = useMorrow((s) => s.goals.find((g) => g.status !== 'archived')?.id ?? null);
  const markAccountAsked = useMorrow((s) => s.markAccountAsked);
  const setAccount = useMorrow((s) => s.setAccount);
  const afterSignIn = useMorrow((s) => s.afterSignIn);
  const resolveSignIn = useMorrow((s) => s.resolveSignIn);
  // What the root layout found when it handled a sign-in link, shown here
  // where the person is rather than on a toast only Today draws.
  const signInNotice = useMorrow((s) => s.signInNotice);
  const setSignInNotice = useMorrow((s) => s.setSignInNotice);
  /** Both the phone and the account hold writing: their call. */
  const [conflict, setConflict] = useState(() => settled === 'conflict');
  const account = useMorrow((s) => s.account);

  // Arrived from the sign-in screen with the copy already settled there.
  const [stage, setStage] = useState<Stage>(() => (typeof settled === 'string' && settled !== 'failed' ? 'done' : 'email'));
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (!signInNotice) return;
    setProblem(signInNotice);
    setSignInNotice(null);
  }, [signInNotice, setSignInNotice]);
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

  const [pulled, setPulled] = useState(() => settled === 'pulled');
  /** What the sign-in moved, so the line under it is true of it. */
  const [moved, setMoved] = useState<'pushed' | 'pulled' | 'nothing'>(() => (settled === 'pushed' || settled === 'pulled' ? settled : 'nothing'));
  const hasBook = useMorrow((s) => s.books.length > 0);

  /** Signed in: the copy, one way or the other, with the button held busy throughout. */
  const settle = async (method: 'email' | 'apple' | 'google') => {
    await setAccount();
    const synced = await afterSignIn();
    track({ name: 'account_signed_in', method, pulled: synced.ok && synced.pulled });
    if (!synced.ok) {
      // Signed in, but the copy did not land. Said plainly: the sign-in is real,
      // the writing is still here, and the next launch will try again. When
      // both sides hold writing, nothing moved and the choice is theirs.
      setProblem(synced.error);
      setConflict(synced.conflict === true);
    } else {
      setProblem(null);
      setPulled(synced.pulled);
      setMoved(synced.pulled ? 'pulled' : synced.moved);
    }
    setStage('done');
  };

  /** The conflict, answered. */
  const resolve = async (choice: 'pull' | 'push') => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const out = await resolveSignIn(choice);
      if (!out.ok) {
        setProblem(out.error);
        return;
      }
      setConflict(false);
      setPulled(out.pulled);
      setMoved(out.moved);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Already signed in — a device that was cleared but kept its session, or
   * somebody who came back through Welcome's "bring my Book back" while the
   * account was still live. The screen used to show them the email form as
   * though they were nobody; this is the one button they came for.
   */
  const bringBack = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await settle('email');
    } finally {
      setBusy(false);
    }
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

  /** The web: away to Google and back to this screen with a session in the URL. */
  const google = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const out = await signInWithGoogleRedirect();
    if (!out.ok) {
      setBusy(false);
      setProblem(out.error);
    }
    // On success the page is leaving; the button stays busy until it does.
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
        <TopBar
          back={{
            onPress: () => {
              // A Book brought back lands on Today, whatever asked: the path is done.
              if (pulled) {
                router.replace('/today');
                return;
              }
              // On the way to the finish, back is the sign-in screen's plan, not the stack under it.
              if (next === '/seal-book' && topGoalId) {
                router.replace(`/portrait?goal=${topGoalId}&next=/seal-book`);
                return;
              }
              if (router.canGoBack()) router.back();
              else router.dismissTo('/today');
            },
            testID: 'account-back',
          }}
        />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 18 }}>
          <Label>An account, if you want one</Label>
          <Statement style={{ fontSize: 27, lineHeight: 33 }}>Keep the Book somewhere a lost phone cannot reach.</Statement>
          <Body>
            That is all an account does: a copy of your writing, for a new phone or a cleared one. Nothing you write is
            used for anything else — not for advertising, not for anyone&apos;s model — and you can delete the account and
            its copy from You, the last tab, without asking anyone.
          </Body>

          {!hasSupabase ? (
            <View testID="account-unavailable" style={{ gap: 10 }}>
              <Rule />
              <Body style={{ color: day.ink }}>
                There is no account service in this build, so there is nothing to sign in to. Everything stays on
                this device, and You, the last tab, can copy it all out whenever you like.
              </Body>
              <InkButton testID="account-continue" label="Carry on" onPress={onwards} />
            </View>
          ) : stage !== 'done' && account ? (
            <View testID="account-signed-in" style={{ gap: 12 }}>
              <Rule />
              <Body style={{ color: day.ink }}>
                Signed in{account.email ? ` as ${account.email}` : ''}. This button brings the account’s copy here; if this phone
                already has writing of its own you will be asked which copy to keep.
              </Body>
              <InkButton testID="account-bring-back" label={busy ? 'One moment…' : 'Bring my Book back'} busy={busy} onPress={() => void bringBack()} />
              <Notice testID="account-problem" kind="error" text={problem} />
              <TextButton testID="account-not-now" label="Not now" onPress={onwards} />
            </View>
          ) : stage === 'done' && conflict ? (
            <View testID="account-conflict" style={{ gap: 12 }}>
              <Rule />
              <Body style={{ color: day.ink }}>
                Signed in. This phone and the account both have writing, and neither has been touched. Which copy do you
                want to keep?
              </Body>
              <InkButton testID="account-keep-account" label={busy ? 'One moment…' : 'Bring the account’s Book here'} busy={busy} onPress={() => void resolve('pull')} />
              <Body style={{ fontSize: 13 }}>The account’s copy replaces what is on this phone. A first line written here is kept.</Body>
              <Chip testID="account-keep-phone" label="Keep this phone’s writing and replace the copy" onPress={() => void resolve('push')} />
              <Body style={{ fontSize: 13 }}>What is on the account now is replaced by this phone’s writing, for good.</Body>
              <Notice testID="account-problem" kind="error" text={problem} />
              <TextButton testID="account-not-now" label="Decide later" onPress={onwards} />
            </View>
          ) : stage === 'done' ? (
            <View testID="account-done" style={{ gap: 10 }}>
              <Rule />
              <Body style={{ color: day.ink }}>
                {pulled
                  ? 'Signed in. Your Book is back on this phone.'
                  : moved === 'pushed'
                    ? hasBook
                      ? 'Signed in. The Book has a second home now.'
                      : 'Signed in. Your writing has a copy on the account; the Book will follow when it is finished.'
                    : 'Signed in. Nothing to copy yet — once you have written something, it is copied up whenever you leave the app.'}
              </Body>
              <Notice testID="account-problem" kind="error" text={problem} />
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
                    autoComplete="email"
                    textContentType="emailAddress"
                    inputMode="email"
                    returnKeyType="go"
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
                  {hasGoogleWeb ? <Chip testID="account-google" label="Continue with Google" onPress={() => void google()} /> : null}
                </>
              ) : (
                <>
                  <Body style={{ fontSize: 14 }}>
                    An email is on its way to {sent}. Tap the link in it on this phone and you are signed in. If the email
                    shows a six-digit code instead, type it here.
                  </Body>
                  <UserField
                    testID="account-code"
                    label="The six-digit code"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    inputMode="numeric"
                    maxLength={6}
                    returnKeyType="go"
                    value={code}
                    onChangeText={setCode}
                    placeholder="000000"
                    keyboardType="number-pad"
                  />
                  <InkButton testID="account-confirm" label={busy ? 'Checking…' : 'Sign in'} busy={busy} onPress={() => void confirm()} />
                  <TextButton label="Use a different email" onPress={() => setStage('email')} />
                </>
              )}
              <Notice testID="account-problem" kind="error" text={problem} />
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
