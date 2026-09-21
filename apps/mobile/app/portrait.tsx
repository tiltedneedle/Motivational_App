/**
 * The Portrait reveal (PRD §7.4).
 *
 * "Built only after the five stones exist. Full screen: the goal in the user's
 * own name for it; the why quoted from the Motives line; an identity line
 * proposed from the Fifteen's text and editable; the obstacle and its if-then
 * from the Obstacles stone; the first three moves from the Strategies line; a
 * short letter from the future self that quotes the Fifteen. Two actions: Make
 * this my Blueprint, or Not quite."
 *
 * Everything on this screen except the letter and the two labels is a sentence
 * the person wrote, so almost all of it is in the serif. The one proposal —
 * the identity clause — is the only thing here the app guessed at, which is
 * exactly why it is the one thing they can edit in place.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analysisPlan, domainMeta } from '@morrow/core';
import { Body, Card, InkButton, Label, ProgressBar, Quoted, Rise, Rule, Statement, Stone, Studio, TextButton, TopBar, UserField, UserText, accent, day, useReducedMotion } from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { hasSupabase } from '../src/supabase';

export default function PortraitScreen() {
  const router = useRouter();
  useFirstRunStep('portrait');
  const { goal: goalId, next } = useLocalSearchParams<{ goal?: string; next?: string }>();
  const goals = useGoals();
  const portraits = useMorrow((s) => s.portraits);
  const editIdentityLine = useMorrow((s) => s.editIdentityLine);
  const account = useMorrow((s) => s.account);
  const accountAsked = useMorrow((s) => s.accountAsked);
  // The path's step label belongs to the first run, not to a plan reread later.
  const onPath = useMorrow((s) => s.books.length === 0);
  const reduced = useReducedMotion();

  const goal = goalId ? goals.find((g) => g.id === goalId) : goals[0];
  const portrait = goal ? portraits.find((p) => p.goalId === goal.id) : undefined;
  const track = useMorrow((s) => s.profile.track);

  /**
   * Back, on the path, is the last stone — the screen the person was just
   * on. Every stone replaced the one before it, so the router's own back
   * from here was "Name your Book", two screens and five stones ago.
   */
  const goBack = () => {
    if (onPath && goals.length) {
      const last = goals[goals.length - 1]!;
      const plan = analysisPlan(last.rank, track);
      router.replace(`/stone?goal=${last.id}&kind=${plan[plan.length - 1]}`);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.dismissTo('/today');
  };

  const [editing, setEditing] = useState(false);
  const [line, setLine] = useState(portrait?.identityLine ?? '');

  /**
   * On, after the reveal.
   *
   * `next` is where the sitting was going — sealing the Book — and it is
   * checked against a shape this app owns rather than followed, because a route
   * arriving in a query string is not something to navigate to on trust.
   *
   * Opened from a Goal screen instead, there is no `next` and the right answer
   * is to go back to the screen they were on, in the state it was in, rather
   * than to replace it with a fresh one that has forgotten which goal it was.
   */
  const onwards = () => {
    const to = typeof next === 'string' && /^\/[a-z-]+$/i.test(next) ? next : '';
    // PRD §7.12: "account creation follows the reveal". Once, on the way to
    // the seal, and only when there is an account service to ask about —
    // a build with none has nothing to offer and does not pretend to.
    if (to === '/seal-book' && hasSupabase && !account && !accountAsked) {
      router.replace(`/signin?next=${to}`);
      return;
    }
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

  if (!goal || !portrait) {
    return (
      <Studio testID="screen-portrait">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {/* A way back at the top, like every other screen: this branch is what a stale link lands on. */}
          <TopBar back={{ onPress: goBack, testID: 'portrait-back' }} where="Your plan" />
          <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
          <Statement>Not yet.</Statement>
          <Body>
            Your plan is built out of the five answers. Write them and it makes itself — nothing here is invented to
            fill the gap.
          </Body>
          <InkButton testID="portrait-onwards" label="Go on" onPress={onwards} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  const meta = domainMeta(goal.domain);

  return (
    <Studio testID="screen-portrait">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'portrait-back' }} where="Your plan" />
        {onPath ? <ProgressBar value={4.2 / 5} label="Step 5 of 5 · Finish your Book" testID="portrait-progress" style={{ paddingTop: 4, paddingBottom: 6 }} /> : null}
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 20 }}>
          <Rise index={0} reducedMotion={reduced} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Stone size={44} domain={goal.domain} polish={1} />
            <View style={{ flex: 1 }}>
              <Label style={{ color: meta.ink }}>Your plan, in your words</Label>
              {/* Their name for it, when they named it. */}
              {goal.titleAuthored === false ? (
                <Body testID="portrait-title" style={{ fontSize: 21, color: day.ink }}>
                  {goal.title}
                </Body>
              ) : (
                <UserText testID="portrait-title" style={{ fontSize: 23, lineHeight: 30, color: day.ink }}>
                  {goal.title}
                </UserText>
              )}
            </View>
          </Rise>

          {portrait.why ? (
            <Rise index={1} reducedMotion={reduced} style={{ gap: 4 }}>
              <Label>Why</Label>
              <UserText testID="portrait-why" style={{ fontSize: 18, lineHeight: 26, color: day.ink }}>
                {portrait.why}
              </UserText>
            </Rise>
          ) : null}

          <Rise index={2} reducedMotion={reduced} style={{ gap: 6 }}>
            <Label>Who you are becoming</Label>
            {editing ? (
              <View style={{ gap: 8 }}>
                {/*
                  The one field on this screen, because the identity clause is
                  the one line the app proposed rather than quoted. Writing over
                  it retires the proposal for good.
                */}
                <UserField
                  testID="portrait-identity-field"
                  label="Who you are becoming, in your words"
                  value={line}
                  onChangeText={setLine}
                  placeholder="Say it the way you would say it"
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <InkButton
                    testID="portrait-identity-save"
                    label="That's better"
                    onPress={() => {
                      editIdentityLine(goal.id, line);
                      setEditing(false);
                    }}
                  />
                  <TextButton label="Leave it" onPress={() => setEditing(false)} />
                </View>
              </View>
            ) : (
              <>
                {portrait.identityFraming ? (
                  <Label style={{ textTransform: 'none', letterSpacing: 0 }}>{portrait.identityFraming}</Label>
                ) : null}
                {portrait.identityLine ? (
                  <UserText testID="portrait-identity" italic style={{ fontSize: 20, lineHeight: 28, color: day.ink }}>
                    {portrait.identityLine}
                  </UserText>
                ) : (
                  <Body testID="portrait-identity-empty">
                    Nothing you wrote fitted this one, so it is blank rather than filled in for you.
                  </Body>
                )}
              </>
            )}
          </Rise>

          {portrait.ifThen ? (
            <Rise index={3} reducedMotion={reduced}>
            <Card testID="portrait-if-then" style={{ padding: 18, gap: 4 }}>
              <Label style={{ color: accent.coralText }}>When it gets in the way</Label>
              {/* "If … then I" is the app's; the two halves inside it are theirs. */}
              <Quoted
                text={portrait.ifThen}
                spans={portrait.quotedSpans}
                italic={false}
                style={{ fontSize: 17, lineHeight: 25, color: day.ink }}
              />
            </Card>
            </Rise>
          ) : null}

          {portrait.firstMoves.length ? (
            <Rise index={4} reducedMotion={reduced} style={{ gap: 6 }}>
              <Label>
                {portrait.firstMoves.length === 1 ? 'The first move, out of your own line' : `The first ${portrait.firstMoves.length === 2 ? 'two' : 'three'}, out of your own line`}
              </Label>
              {portrait.firstMoves.map((m, i) => (
                <UserText key={`${m}-${i}`} style={{ fontSize: 16, lineHeight: 24, color: day.ink2 }}>
                  {m}
                </UserText>
              ))}
            </Rise>
          ) : null}

          <Rule />

          {/*
            The one piece of prose on this screen the app wrote. It quotes the
            Fifteen and names nothing from the plan — see `letterFromFuture`.
          */}
          <Quoted
            testID="portrait-letter"
            text={portrait.letterFromFuture}
            // The opener, as the letter prints it: without its own full stop.
            spans={portrait.quotedSpans.slice(0, 1).map((s) => s.replace(/[.!?]+$/, ''))}
            style={{ fontSize: 16, lineHeight: 26, color: day.ink }}
          />

          <View style={{ gap: 10, paddingTop: 4 }}>
            <InkButton testID="portrait-accept" label="Keep this plan" onPress={onwards} />
            <TextButton
              testID="portrait-not-quite"
              label="Not quite"
              onPress={() => {
                setLine(portrait.identityLine);
                setEditing(true);
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
