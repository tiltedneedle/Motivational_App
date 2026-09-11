/**
 * Replan (PRD §7.4).
 *
 * "Replan proposes changes as a diff, each with a reason and its source line,
 * Accept or Keep mine per row, applied as a new version."
 *
 * Three things this screen is careful about:
 *
 *   - nothing changes until a row is accepted, and every row starts at "keep
 *     mine". A diff that arrives pre-accepted is not a diff, it is an edit with
 *     a confirmation dialogue;
 *   - every row shows the line of theirs it came from, because a proposal about
 *     somebody's plan that cannot point at their own sentence is the app having
 *     an opinion about their life;
 *   - an empty diff says so plainly. Most weeks nothing needs changing, and a
 *     replan that always has a suggestion is a replan nobody trusts.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayOf, formatDay, plural, type ReplanChange } from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, UserText, accent, day, radius } from '@morrow/ui';
import { analysesFor, useGoals, useMorrow } from '../src/store';

const VERB: Record<ReplanChange['op'], string> = {
  add: 'One more',
  remove: 'One fewer',
  move: 'Another day',
  edit: 'Reworded',
};

export default function Replan() {
  const router = useRouter();
  const { goal: goalId } = useLocalSearchParams<{ goal?: string }>();
  const goals = useGoals();
  const state = useMorrow((s) => s);
  const propose = useMorrow((s) => s.proposeReplanFor);
  const apply = useMorrow((s) => s.applyReplanFor);

  const goal = goalId ? goals.find((g) => g.id === goalId) : goals[0];
  // Proposed once, on arrival. Re-proposing as they tick rows would move the
  // ground under them while they are reading it.
  const changes = useMemo(() => (goal ? propose(goal.id) : []), [goal?.id, propose]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);

  const analyses = goal ? analysesFor(state, goal.id) : [];
  const plan = goal ? state.plans.find((p) => p.goalId === goal.id && p.status === 'active') : undefined;
  const today = dayOf(new Date(), state.profile.dayBoundaryHour);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const toggle = (i: number) =>
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const commit = () => {
    if (!goal) return;
    const rows = changes.filter((_, i) => accepted.has(i));
    const out = apply(goal.id, rows);
    if (!out.ok) {
      setProblem(out.error);
      // The monthly cap (PRD §13.3). The proposal stays on screen behind the
      // paywall, and Not now brings them straight back to it.
      if (out.moment) router.push(`/paywall?moment=${out.moment}`);
      return;
    }
    router.replace(`/goal?id=${goal.id}`);
  };

  if (!goal) {
    return (
      <Studio testID="screen-replan">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement>No plan to change.</Statement>
          <InkButton label="Back to today" onPress={() => router.replace('/today')} />
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio testID="screen-replan">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton testID="replan-back" label="← Back" onPress={back} />
          <Label>Replan</Label>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 16 }}>
          {changes.length === 0 ? (
            <View testID="replan-nothing" style={{ gap: 8 }}>
              <Statement style={{ fontSize: 24, lineHeight: 31 }}>Nothing here needs changing.</Statement>
              <Body>
                The plan you wrote still fits the week you have had. That is the usual answer, and it is not the app
                being lazy — a replan with a suggestion every time is a replan worth ignoring.
              </Body>
              <InkButton testID="replan-done" label="Leave it as it is" onPress={back} />
            </View>
          ) : (
            <>
              <Statement style={{ fontSize: 24, lineHeight: 31 }}>
                {plural(changes.length, 'change')} to consider.
              </Statement>
              <Body style={{ fontSize: 14 }}>
                Nothing moves unless you say so. Every row starts as yours.
              </Body>

              {changes.map((c, i) => {
                // Looked up by id, not reconstructed. A row whose source line
                // no longer exists shows no quotation rather than the nearest
                // one: attributing a proposal to a sentence they did not write
                // is worse than attributing it to nothing.
                const from = c.sourceLineId ? (analyses.find((a) => a.id === c.sourceLineId)?.line ?? null) : null;
                const on = accepted.has(i);
                return (
                  <View
                    key={`${c.op}-${c.id ?? i}`}
                    testID={`replan-row-${i}`}
                    style={{
                      backgroundColor: day.surface,
                      borderRadius: radius.card,
                      padding: 16,
                      gap: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: on ? accent.coral : day.line2,
                    }}
                  >
                    <Label style={{ color: on ? accent.coralText : day.ink3 }}>{VERB[c.op]}</Label>

                    {/*
                      A date change: before and after are days, not their
                      words, so they are set in the app's face and read as
                      days. The sentence being moved is theirs, and is the
                      only serif on the row.
                    */}
                    {c.op === 'move' ? (
                      <>
                        {(() => {
                          const moved = c.id ? plan?.moves.find((m) => m.id === c.id) : undefined;
                          return moved ? (
                            <UserText style={{ fontSize: 16, lineHeight: 24, color: day.ink }}>{moved.title}</UserText>
                          ) : null;
                        })()}
                        <Body style={{ fontSize: 14, color: day.ink2 }}>
                          {c.before ? formatDay(c.before, { today }) : 'Undated'}
                          {c.after ? ` → ${formatDay(c.after, { today })}` : ''}
                        </Body>
                      </>
                    ) : null}

                    {/* Their sentence, struck through when it is the one going. */}
                    {c.op !== 'move' && c.before ? (
                      <UserText
                        style={{
                          fontSize: 16,
                          lineHeight: 24,
                          color: day.ink2,
                          textDecorationLine: c.op === 'remove' || c.after ? 'line-through' : 'none',
                        }}
                      >
                        {c.before}
                      </UserText>
                    ) : null}
                    {c.op !== 'move' && c.after ? (
                      <UserText style={{ fontSize: 16, lineHeight: 24, color: day.ink }}>{c.after}</UserText>
                    ) : null}

                    <Body style={{ fontSize: 13 }}>{c.reason}</Body>

                    {from ? (
                      <Body style={{ fontSize: 13, color: day.ink2 }}>
                        from{' '}
                        <UserText italic style={{ fontSize: 13, lineHeight: 20, color: day.ink2 }}>
                          “{from}”
                        </UserText>
                      </Body>
                    ) : null}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Chip
                        testID={`replan-accept-${i}`}
                        label={on ? 'Accepted' : 'Accept'}
                        selected={on}
                        onPress={() => toggle(i)}
                      />
                      {on ? <TextButton testID={`replan-keep-${i}`} label="Keep mine" onPress={() => toggle(i)} /> : null}
                    </View>
                  </View>
                );
              })}

              {problem ? (
                <Body testID="replan-problem" style={{ color: day.ink }}>
                  {problem}
                </Body>
              ) : null}

              <Rule />
              <InkButton
                testID="replan-apply"
                label={accepted.size === 0 ? 'Keep all of mine' : `Apply ${plural(accepted.size, 'change')}`}
                onPress={accepted.size === 0 ? back : commit}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
