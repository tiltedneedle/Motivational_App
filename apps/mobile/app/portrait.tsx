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
import { domainMeta } from '@morrow/core';
import { Body, InkButton, Label, Quoted, Rule, Statement, Stone, Studio, TextButton, UserField, UserText, accent, day, radius } from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';
import { hasSupabase } from '../src/supabase';

export default function PortraitScreen() {
  const router = useRouter();
  const { goal: goalId, next } = useLocalSearchParams<{ goal?: string; next?: string }>();
  const goals = useGoals();
  const portraits = useMorrow((s) => s.portraits);
  const editIdentityLine = useMorrow((s) => s.editIdentityLine);
  const account = useMorrow((s) => s.account);
  const accountAsked = useMorrow((s) => s.accountAsked);

  const goal = goalId ? goals.find((g) => g.id === goalId) : goals[0];
  const portrait = goal ? portraits.find((p) => p.goalId === goal.id) : undefined;

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
      router.replace(`/account?next=${to}`);
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
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement>Not yet.</Statement>
          <Body>
            A Portrait is built out of the five stones. Write them and it makes itself — nothing here is invented to
            fill the gap.
          </Body>
          <InkButton testID="portrait-onwards" label="Go on" onPress={onwards} />
        </SafeAreaView>
      </Studio>
    );
  }

  const meta = domainMeta(goal.domain);

  return (
    <Studio testID="screen-portrait">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Stone size={44} domain={goal.domain} polish={1} />
            <View style={{ flex: 1 }}>
              <Label style={{ color: meta.ink }}>Your portrait</Label>
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
          </View>

          {portrait.why ? (
            <View style={{ gap: 4 }}>
              <Label>Why</Label>
              <UserText testID="portrait-why" style={{ fontSize: 18, lineHeight: 26, color: day.ink }}>
                {portrait.why}
              </UserText>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
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
          </View>

          {portrait.ifThen ? (
            <View
              testID="portrait-if-then"
              style={{ backgroundColor: day.surface, borderRadius: radius.field, padding: 16, gap: 4 }}
            >
              <Label style={{ color: accent.coralText }}>When it gets in the way</Label>
              {/* "If … then I" is the app's; the two halves inside it are theirs. */}
              <Quoted
                text={portrait.ifThen}
                spans={portrait.quotedSpans}
                italic={false}
                style={{ fontSize: 17, lineHeight: 25, color: day.ink }}
              />
            </View>
          ) : null}

          {portrait.firstMoves.length ? (
            <View style={{ gap: 6 }}>
              <Label>The first three, out of your own line</Label>
              {portrait.firstMoves.map((m, i) => (
                <UserText key={`${m}-${i}`} style={{ fontSize: 16, lineHeight: 24, color: day.ink2 }}>
                  {m}
                </UserText>
              ))}
            </View>
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
            <InkButton testID="portrait-accept" label="Make this my Blueprint" onPress={onwards} />
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
