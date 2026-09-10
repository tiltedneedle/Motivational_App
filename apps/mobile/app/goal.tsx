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
  // Never fall back to another goal. An id that no longer resolves means the
  // goal was dropped, and showing a different one in its place attributes
  // somebody's plan and their own sentences to a goal they did not open.
  const goal = id ? goals.find((g) => g.id === id) : goals[0];
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  if (!goal) {
    return (
      <Studio testID="screen-goal">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center' }}>
          <Statement>{id ? 'That goal is no longer here.' : 'No goal here.'}</Statement>
          {id ? (
            <Body style={{ marginTop: 8 }}>
              You may have dropped it. Everything you wrote for it is still in your Book.
            </Body>
          ) : null}
          <InkButton label="Back to today" onPress={goBack} style={{ marginTop: 16 }} />
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
          <TextButton testID="goal-back" label="← Today" onPress={goBack} />
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
              {/*
                The framing is the app's words and the clause is the user's, so
                they are set in different faces. Only the serif is theirs.
              */}
              {portrait.identityFraming ? (
                <Label style={{ textTransform: 'none', letterSpacing: 0 }}>{portrait.identityFraming}</Label>
              ) : null}
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
                  {/*
                    "In your words" is only true when a Monitoring line is
                    behind it. Without one the plan carries a placeholder, and
                    calling the app's own sentence the user's is the exact thing
                    the authorship rule exists to prevent.
                  */}
                  {ms.proofSourceLineId ? (
                    <Body style={{ fontSize: 13 }}>
                      Proof, in your words: <UserText italic style={{ fontSize: 13 }}>“{ms.proof}”</UserText>
                    </Body>
                  ) : (
                    <Body style={{ fontSize: 13 }}>
                      No proof yet. Write the Monitoring line and it goes here.
                    </Body>
                  )}
                </View>
              ))}
              {plan.moves.map((m) => {
                const from = sourceLineFor(m, analyses);
                return (
                  <View key={m.id} testID={`plan-move-${m.id}`} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: day.line2, gap: 3 }}>
                    <Body style={{ color: day.ink, fontSize: 16 }}>{m.title}</Body>
                    {from ? (
                      <Body style={{ fontSize: 13, color: day.ink2 }}>
                        from <UserText italic style={{ fontSize: 13, color: day.ink2 }}>“{from}”</UserText>
                      </Body>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
