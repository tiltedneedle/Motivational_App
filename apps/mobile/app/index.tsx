/**
 * Welcome (PRD §7.1, one screen since 2026-09-20). A stone settles on the
 * studio floor and says what this is; your first name if you want to give
 * it; two doors — Begin, and Look around first — and no sign-up wall.
 *
 * It was three pages, read one at a time, with Skip and Next and dots: the
 * sittings and their lengths, then a name and a persona. The client read it
 * as a wall between a new person and the app ("they can't even reach the
 * main page"). Everything a person needs before the first tap fits on one
 * screen; the three evenings are explained on Today, which is the room they
 * are for, and the persona lives in You, where it can be changed.
 */
import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, GhostButton, InkButton, Label, Rise, Statement, Stone, Studio, TextButton, UserField, useReducedMotion } from '@morrow/ui';
import { useFirstRun, useLatestBook, useMorrow, useHasBegun } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { hasSupabase } from '../src/supabase';

export default function Welcome() {
  const router = useRouter();
  useFirstRunStep('welcome');
  const book = useLatestBook();
  const profile = useMorrow((s) => s.profile);
  const account = useMorrow((s) => s.account);
  const setProfile = useMorrow((s) => s.setProfile);
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  // Halfway along — goals named, the Fifteen written, some stones — is not
  // the start. Begin goes to the next step of the path.
  const step = useFirstRun();
  // "See the introduction again", from You: the screen, not the redirect.
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  // Begun anywhere, not only on the Future path: the store decides, so this
  // gate and Today agree about what "begun" means.
  const begun = useHasBegun();
  const [name, setName] = useState(profile.displayName);

  const keepName = () => {
    const trimmed = name.trim();
    if (trimmed !== profile.displayName) setProfile({ displayName: trimmed });
  };
  const begin = () => {
    keepName();
    router.push(step.route);
  };

  // Welcome is for the person who has never been here. Anyone with a Book,
  // or halfway to one, opens on Today — which is their Book and their day,
  // or the path card with the next step on it (NN/g, Apple HIG: never
  // re-show onboarding once it is done).
  if ((book || begun) && intro !== '1') return <Redirect href="/today" />;

  const here = book || begun;

  return (
    <Studio testID="screen-welcome">
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, justifyContent: 'center', gap: 22, paddingVertical: 24 }} showsVerticalScrollIndicator={false}>
          <Rise index={0} reducedMotion={reduced} style={{ alignItems: 'center', gap: 18 }}>
            <Stone size={124} domain="health" polish={1} sweep={!reduced && focused} testID="welcome-stone" />
            <Statement style={{ fontSize: 48, lineHeight: 52, textAlign: 'center' }}>Morrow</Statement>
            <Statement testID="welcome-page-0" level={2} style={{ fontSize: 24, lineHeight: 30, textAlign: 'center', maxWidth: 320 }}>
              Meet who you’re becoming.
            </Statement>
            <Body style={{ textAlign: 'center', fontSize: 17, lineHeight: 25, maxWidth: 320 }}>
              You write your future in your own words. Then the app helps you live by it, one ordinary day at a time.
            </Body>
          </Rise>

          {!here ? (
            <Rise index={1} reducedMotion={reduced}>
              <UserField
                testID="welcome-name"
                label="Your first name (optional)"
                value={name}
                onChangeText={setName}
                placeholder="What the coach should call you"
                autoCapitalize="words"
              />
            </Rise>
          ) : null}

          <Rise index={2} reducedMotion={reduced} style={{ gap: 12 }}>
            <InkButton testID="welcome-begin" label={here ? 'Back to today' : 'Begin tonight · about 30 minutes'} onPress={here ? () => router.dismissTo('/today') : begin} />
            {/*
              The home screen, before anything is written: Today shows what
              the three evenings make and the one button to the first, rather
              than a wall that says "begin" and nothing else. Nobody is made
              to write before they have seen the room they are writing for.
            */}
            {!here ? (
              <GhostButton
                testID="welcome-look"
                label="Look around first"
                onPress={() => {
                  keepName();
                  router.push('/today');
                }}
              />
            ) : null}
            {/*
              A new phone (PRD §7.12): the one door back to a Book kept on the
              account, before anything is written here — once a goal exists the
              device has writing of its own and the account will not overwrite it.
            */}
            {hasSupabase && !account ? (
              <TextButton testID="welcome-bring-back" label="Bring my Book back from my account" onPress={() => router.push('/account')} />
            ) : null}
            <Label style={{ textAlign: 'center', marginTop: 4 }}>
              {hasSupabase ? 'No sign-up wall. An account is offered once, after the Portrait, and you can say no' : 'No sign-up. Everything stays on this phone'}
            </Label>
          </Rise>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
