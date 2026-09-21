/**
 * Welcome (the rebuild, 2026-09-21). One screen: the stone, the name, one
 * line about what this is, and one button. Set-up — what to work on, when
 * you write, how the coach speaks, your name — is four taps on the next
 * screen, and the first line is written two minutes in. Nothing to read
 * first.
 */
import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, GhostButton, InkButton, Label, Rise, Settle, Statement, Stone, Studio, TextButton, useReducedMotion } from '@morrow/ui';
import { useHasBegun, useLatestBook, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { hasSupabase } from '../src/supabase';

export default function Welcome() {
  const router = useRouter();
  useFirstRunStep('welcome');
  const book = useLatestBook();
  const account = useMorrow((s) => s.account);
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  // "See the introduction again", from You: the screen, not the redirect.
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const begun = useHasBegun();

  // Welcome is for the person who has never been here. Anyone with a Book,
  // or set up, opens on Today (NN/g, Apple HIG: never re-show onboarding
  // once it is done).
  if ((book || begun) && intro !== '1') return <Redirect href="/today" />;
  const here = Boolean(book || begun);

  return (
    <Studio testID="screen-welcome">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 22, paddingVertical: 24, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <Rise index={0} reducedMotion={reduced} style={{ alignItems: 'center', gap: 20 }}>
              <Settle reduced={reduced}>
                <Stone size={132} domain="health" polish={1} sweep={!reduced && focused} testID="welcome-stone" />
              </Settle>
              <Label style={{ letterSpacing: 2 }}>MORROW</Label>
              <Statement testID="welcome-page-0" style={{ fontSize: 40, lineHeight: 44, textAlign: 'center', maxWidth: 340 }}>
                Write your future. Then live by it.
              </Statement>
              <Body style={{ textAlign: 'center', fontSize: 17, lineHeight: 25, maxWidth: 320 }}>
                A writing program with evidence behind it, on your phone. You write every word; the app asks, listens and keeps you to it.
              </Body>
            </Rise>
          </View>

          <Rise index={1} reducedMotion={reduced} style={{ gap: 12 }}>
            <InkButton testID="welcome-begin" label={here ? 'Back to today' : 'Get started'} onPress={() => (here ? router.dismissTo('/today') : router.push('/setup'))} />
            {!here ? <GhostButton testID="welcome-look" label="Look around first" onPress={() => router.push('/today')} /> : null}
            {hasSupabase && !account && !here ? (
              <TextButton testID="welcome-bring-back" label="I already have a Book on my account" onPress={() => router.push('/account')} style={{ alignSelf: 'center' }} />
            ) : null}
            <Label style={{ textAlign: 'center', marginTop: 2 }}>{hasSupabase ? 'No sign-up wall. Your writing stays on this phone' : 'No sign-up. Everything stays on this phone'}</Label>
          </Rise>
        </View>
      </SafeAreaView>
    </Studio>
  );
}
