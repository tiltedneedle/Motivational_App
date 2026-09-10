/**
 * The Coach (PRD §7.9). It quotes before it suggests, and every reply is built
 * from the user's own material. With nothing of theirs to quote it asks a
 * question instead of inventing encouragement.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CHIPS,
  contentGuard,
  dayOf,
  detectReturns,
  replyToChip,
  replyToText,
  screen,
  type ChipId,
  type CoachReply,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Stone, Studio, TextButton, UserField, UserText, accent, day } from '@morrow/ui';
import { useConsistency, useGoals, useLatestBook, useMorrow, useTodaysMoves } from '../src/store';

export default function Coach() {
  const router = useRouter();
  const state = useMorrow((s) => s);
  const book = useLatestBook();
  const moves = useTodaysMoves();
  const goals = useGoals();
  const score = useConsistency();
  const addMove = useMorrow((s) => s.addMove);
  const setToast = useMorrow((s) => s.setToast);

  const [thread, setThread] = useState<{ who: 'me' | 'coach'; text: string }[]>([]);
  const [draft, setDraft] = useState('');

  // Today used to be the only screen that built the brief, so arriving here
  // first — from a notification, a deep link, or just the tab bar — showed a
  // coach with nothing to say. Making one is idempotent: it returns the day's
  // brief if there already is one.
  const makeBrief = useMorrow((s) => s.makeBrief);
  useEffect(() => {
    makeBrief();
  }, [makeBrief]);

  const brief = state.briefs[state.briefs.length - 1] ?? null;
  const days = useMemo(() => Object.values(state.days), [state.days]);
  const today = dayOf(new Date(), state.profile.dayBoundaryHour);

  const ctx = {
    book,
    analyses: state.analyses,
    moves,
    days,
    today,
    // A return is a gap the person came back from, not a sealed day. Passing
    // the sealed-day count made the celebrate reply print the same number
    // twice: "12 sealed days and 12 returns".
    returns: detectReturns(days, today).length,
    persona: state.profile.persona,
  };

  const say = (chip: ChipId, label: string) => {
    const reply: CoachReply = replyToChip(chip, ctx);
    setThread((t) => [...t, { who: 'me', text: label }, { who: 'coach', text: reply.text }]);
    if (!reply.action) return;
    // The move goes to the goal it came from, carrying the line the user wrote
    // it from. Filing it under the first goal put one goal's move on another
    // goal's plan and attributed it to a sentence it did not come from.
    const added = addMove(reply.action.goalId, reply.action.title, '10 min', {
      sourceLineId: reply.action.sourceLineId,
      minVersion: reply.action.minVersion,
    });
    // addMove raises its own toast either way. Announcing "Added" over the top
    // of its refusal told people a move existed when none did.
    if (!added) return;
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const risk = screen(text);
    if (risk.risk === 'crisis') {
      useMorrow.setState({ safetyPause: { risk: risk.risk, at: new Date().toISOString() } });
      return;
    }
    // The rules the coach obeys whatever was asked (PRD 11.6): no calorie
    // targets, no dosages, no financial recommendations. This was written and
    // unit-tested and then never called, so the coach answered all three.
    const guard = contentGuard(text);
    if (!guard.allowed) {
      setThread((t) => [...t, { who: 'me', text }, { who: 'coach', text: guard.redirect ?? '' }]);
      return;
    }
    // replyToText carries the Returns branch: someone coming back after a gap
    // is met with that, not with the same generic question as everyone else.
    // The screen used to inline the generic line and never call this at all.
    const reply = replyToText(text, ctx);
    if (!reply.text) return;
    setThread((t) => [...t, { who: 'me', text }, { who: 'coach', text: reply.text }]);
  };

  return (
    <Studio testID="screen-coach">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12 }}>
          <Stone size={46} gradient={['#FFFFFF', '#F3F1EC', '#CFCBC2', '#8E8A80']} polish={1} />
          <View style={{ flex: 1 }}>
            <Label>Your coach</Label>
            <Body style={{ fontSize: 13 }}>{thread.length ? 'Listening' : `Remembers ${days.length} days`}</Body>
          </View>
          <TextButton testID="coach-back" label="Today" onPress={() => router.replace('/today')} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 16 }}>
          {thread.length === 0 && brief ? (
            <View testID="dawn-brief" style={{ gap: 14 }}>
              <Statement style={{ fontSize: 27, lineHeight: 33 }}>{brief.today}</Statement>
              <Rule />
              {/*
                Label above value, not beside it. A fixed-width column cannot
                reflow, so at 200% type the row labels were cut off rather than
                wrapping.
              */}
              <View style={{ gap: 4 }}>
                <Label style={{ color: accent.coralText }}>Yesterday</Label>
                <Body style={{ color: day.ink }}>{brief.yesterday}</Body>
              </View>
              <Rule />
              <View style={{ gap: 4 }}>
                <Label style={{ color: accent.coralText }}>If</Label>
                <Body style={{ color: day.ink }}>{brief.ifThen}</Body>
              </View>
              <Rule />
              <Label>Consistency {score.score}</Label>
            </View>
          ) : null}

          {thread.map((m, i) => (
            <View key={i} style={{ alignItems: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
              <View
                testID={`msg-${m.who}-${i}`}
                style={{
                  maxWidth: '86%',
                  padding: 14,
                  borderRadius: 20,
                  backgroundColor: m.who === 'me' ? day.ink : day.surface,
                }}
              >
                {m.who === 'me' ? (
                  <UserText style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 22 }}>{m.text}</UserText>
                ) : (
                  <Body style={{ color: day.ink, fontSize: 16, lineHeight: 22 }}>{m.text}</Body>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingBottom: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHIPS.map((c) => (
              <Chip key={c.id} testID={`chip-${c.id}`} label={c.label} onPress={() => say(c.id, c.label)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <UserField
                testID="coach-input"
                label="Talk to the coach"
                value={draft}
                onChangeText={setDraft}
                placeholder="Say anything"
                onSubmitEditing={send}
              />
            </View>
            <InkButton testID="coach-send" label="Send" onPress={send} style={{ height: 46, paddingHorizontal: 20 }} />
          </View>
        </View>
      </SafeAreaView>
    </Studio>
  );
}
