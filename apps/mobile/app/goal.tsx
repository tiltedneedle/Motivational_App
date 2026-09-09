/**
 * The Goal screen (PRD §7.4): the five stones, the plan, and under every move
 * the sentence the user wrote that it came from.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ANALYSIS_ORDER, ANALYSIS_TITLES, domainMeta, sourceLineFor } from '@morrow/core';
import { Body, Chip, InkButton, Label, Ring, Rule, Statement, Stone, Studio, TextButton, UserText, accent, day } from '@morrow/ui';
import { analysisPlan } from './stone';
import { analysesFor, useGoals, useMorrow } from '../src/store';

export default function GoalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const state = useMorrow((s) => s);
  const goals = useGoals();
  const goal = goals.find((g) => g.id === id) ?? goals[0];

  if (!goal) {
    return (
      <Studio testID="screen-goal">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center' }}>
          <Statement>No goal here.</Statement>
          <InkButton label="Back to today" onPress={() => router.replace('/today')} style={{ marginTop: 16 }} />
        </SafeAreaView>
      </Studio>
    );
  }

  const analyses = analysesFor(state, goal.id);
  const plan = state.plans.find((p) => p.goalId === goal.id);
  const portrait = state.portraits.find((p) => p.goalId === goal.id);
  const wanted = analysisPlan(goal.rank, state.profile.track);
  const meta = domainMeta(goal.domain);
  const doneCount = plan?.moves.filter((m) => m.status === 'done').length ?? 0;
  const pct = plan?.moves.length ? doneCount / plan.moves.length : 0;

  return (
    <Studio testID="screen-goal">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton testID="goal-back" label="← Today" onPress={() => router.replace('/today')} />
          <Label>{goal.domainLabel ?? meta.label}</Label>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Label style={{ color: meta.hex }}>{goal.horizon}</Label>
              <Statement testID="goal-title">{goal.title}</Statement>
            </View>
            <Ring size={72} progress={pct} color={meta.hex} width={4}>
              <Stone size={50} domain={goal.domain} polish={0.5 + pct * 0.5} />
            </Ring>
          </View>

          {portrait?.identityLine ? (
            <View style={{ gap: 4 }}>
              <Label>Who you are becoming</Label>
              <UserText italic testID="goal-identity">{portrait.identityLine}</UserText>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <Label>The five stones</Label>
            {ANALYSIS_ORDER.map((kind) => {
              const a = analyses.find((x) => x.kind === kind);
              const included = wanted.includes(kind);
              return (
                <View
                  key={kind}
                  testID={`analysis-${kind}`}
                  style={{
                    flexDirection: 'row',
                    gap: 14,
                    alignItems: 'flex-start',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: day.line,
                    opacity: included || a ? 1 : 0.5,
                  }}
                >
                  <Stone size={24} domain={goal.domain} polish={a ? 1 : 0.4} seated={Boolean(a)} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Label>{ANALYSIS_TITLES[kind]}</Label>
                    {a ? (
                      <>
                        <UserText style={{ fontSize: 16, lineHeight: 23 }}>{a.paragraph?.trim() || a.line}</UserText>
                        {a.line2 ? (
                          <UserText italic style={{ fontSize: 15, color: day.ink2 }}>…then I {a.line2}</UserText>
                        ) : null}
                      </>
                    ) : (
                      <Chip
                        testID={`write-${kind}`}
                        label={included ? 'Write this one' : 'Go deeper'}
                        ghost
                        onPress={() => router.push(`/stone?goal=${goal.id}&kind=${kind}`)}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {plan ? (
            <View style={{ gap: 10 }}>
              <Rule />
              <Label>The plan · every move shows the line it came from</Label>
              {plan.milestones.slice(0, 1).map((ms) => (
                <View key={ms.id} style={{ gap: 4 }}>
                  <Label style={{ color: accent.coral }}>
                    Milestone 1 · by {ms.targetDate}
                  </Label>
                  <Statement style={{ fontSize: 22, lineHeight: 27 }}>{ms.title}</Statement>
                  <Body style={{ fontSize: 13 }}>Proof, in your words: “{ms.proof}”</Body>
                </View>
              ))}
              {plan.moves.map((m) => (
                <View key={m.id} testID={`plan-move-${m.id}`} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: day.line2, gap: 3 }}>
                  <Body style={{ color: day.ink, fontSize: 16 }}>{m.title}</Body>
                  <UserText italic style={{ fontSize: 13, color: day.ink3 }}>
                    from “{sourceLineFor(m, analyses) ?? 'your line'}”
                  </UserText>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
