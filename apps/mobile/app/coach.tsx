/**
 * The Coach (PRD §7.9). It quotes before it suggests, and every reply is built
 * from the user's own material. With nothing of theirs to quote it asks a
 * question instead of inventing encouragement.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHIPS, dayOf, replyToChip, screen, type ChipId, type CoachReply } from '@morrow/core';
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

  const brief = state.briefs[state.briefs.length - 1] ?? null;
  const days = useMemo(() => Object.values(state.days), [state.days]);
  const today = dayOf(new Date(), state.profile.dayBoundaryHour);

  const ctx = {
    book,
    analyses: state.analyses,
    moves,
    days,
    today,
    returns: days.filter((d) => d.sealedAt).length,
    persona: state.profile.persona,
  };

  const say = (chip: ChipId, label: string) => {
    const reply: CoachReply = replyToChip(chip, ctx);
    setThread((t) => [...t, { who: 'me', text: label }, { who: 'coach', text: reply.text }]);
    if (reply.action && goals[0]) {
      addMove(goals[0].id, reply.action.title, '10 min');
      setToast({ text: `Added · ${reply.action.title}`, kind: 'add' });
    }
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
    setThread((t) => [
      ...t,
      { who: 'me', text },
      { who: 'coach', text: 'Say more about that. What would have to be true for the next hour to go differently?' },
    ]);
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
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Label style={{ width: 76, color: accent.coral }}>Yesterday</Label>
                <Body style={{ flex: 1, color: day.ink }}>{brief.yesterday}</Body>
              </View>
              <Rule />
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Label style={{ width: 76, color: accent.coral }}>If</Label>
                <Body style={{ flex: 1, color: day.ink }}>{brief.ifThen}</Body>
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
              <UserField testID="coach-input" value={draft} onChangeText={setDraft} placeholder="Talk to the coach" onSubmitEditing={send} />
            </View>
            <InkButton testID="coach-send" label="Send" onPress={send} style={{ height: 46, paddingHorizontal: 20 }} />
          </View>
        </View>
      </SafeAreaView>
    </Studio>
  );
}
