/**
 * The Goal screen (PRD §7.4): the five stones, the plan, and under every move
 * the sentence the user wrote that it came from.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ANALYSIS_ORDER,
  ANALYSIS_TITLES,
  closedOn,
  dayOf,
  distanceLabel,
  domainMeta,
  formatDay,
  goalPath,
  pathEvidence,
  plural,
  sourceLineFor,
  thenHalf,
  virtuesForGoal,
} from '@morrow/core';
import {
  Body,
  Chip,
  InkButton,
  Label,
  Path as PathTrack,
  Ring,
  Rule,
  Statement,
  Stone,
  Studio,
  UserText,
  accent,
  day,
  useTwoColumn,
  TopBar,
} from '@morrow/ui';
import { analysisPlan } from './stone';
import { analysesFor, useGoals, useMorrow, cardText } from '../src/store';

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
  const boundary = state.profile.dayBoundaryHour;
  const today = dayOf(new Date(), boundary);

  const twoColumn = useTwoColumn();
  const picks = useMorrow((s) => s.presentPicks);
  const virtues = id ? virtuesForGoal(picks, id).filter((p) => p.applyLine.trim()) : [];

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
  // The milestone the plan is on: the first not yet reached, or the last one
  // once they all are. "Milestone 1" ninety days in, with the first two
  // reached in July and August, was the plan reading from the wrong page.
  const current = plan ? (plan.milestones.find((m) => !m.reachedAt) ?? plan.milestones[plan.milestones.length - 1]) : undefined;
  const milestoneLabel = (ms: { order: number; targetDate: string; reachedAt: string | null }) =>
    ms.reachedAt
      ? `Milestone ${ms.order + 1} · reached ${formatDay(dayOf(new Date(ms.reachedAt), boundary))}`
      : `Milestone ${ms.order + 1} · by ${formatDay(ms.targetDate)}`;
  const wanted = analysisPlan(goal.rank, state.profile.track);
  const meta = domainMeta(goal.domain);
  const path = goalPath(plan, today, goal.targetDate ?? null);
  const recent = pathEvidence(state.evidence, goal.id);
  const daysLeftLabel =
    path.daysLeft > 0
      ? `${plural(path.daysLeft, 'day')} to go`
      : path.daysLeft === 0
        ? 'The last day'
        : `${plural(Math.abs(path.daysLeft), 'day')} past`;
  /**
   * What the drawing says, for somebody who cannot see it. Everything in the
   * picture is in this sentence, which is the test of whether the picture was
   * carrying anything it should not have been.
   */
  const pathLabel = `${Math.round(path.at * 100)}% of the way from ${formatDay(path.from)} to ${formatDay(
    path.to,
  )}. ${plural(path.nodes.filter((n) => n.reached).length, 'milestone')} reached of ${path.nodes.length}.`;
  const doneCount = plan?.moves.filter((m) => m.status === 'done').length ?? 0;
  const pct = plan?.moves.length ? doneCount / plan.moves.length : 0;

  return (
    <Studio wide={twoColumn} testID="screen-goal">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: goBack, testID: 'goal-back' }} where={goal.domainLabel ?? meta.label} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Label style={{ color: meta.ink }}>{goal.horizon}</Label>
              {/* Their name for it, when they named it — as the Portrait shows it. */}
              {goal.titleAuthored === false ? (
                <Statement testID="goal-title">{goal.title}</Statement>
              ) : (
                <UserText testID="goal-title" style={{ fontSize: 28, lineHeight: 34 }}>
                  {goal.title}
                </UserText>
              )}
            </View>
            <Ring
              size={72}
              progress={pct}
              color={meta.hex}
              width={4}
              accessibilityLabel={plan ? `${plural(doneCount, 'move')} done of ${plan.moves.length}` : 'No plan yet'}
            >
              <Stone size={50} domain={goal.domain} polish={0.5 + pct * 0.5} />
            </Ring>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {portrait ? (
              <Chip
                testID="goal-portrait"
                label="See the portrait"
                onPress={() => router.push(`/portrait?goal=${goal.id}`)}
              />
            ) : null}
            {plan ? (
              <Chip
                testID="goal-replan"
                label="Replan"
                ghost
                onPress={() => router.push(`/replan?goal=${goal.id}`)}
              />
            ) : null}
          </View>

          {/*
            The Present volume's other half. Each virtue the person wrote about
            names the goal that needs it, and this is where that pairing shows:
            the card's sentence as a heading, and under it their own line about
            where they will use it next week. Nothing here unless they wrote it.
          */}
          {virtues.length ? (
            <View testID="goal-virtues" style={{ gap: 10 }}>
              <Label>What you are good at, for this</Label>
              {virtues.map((p) => (
                <View key={p.cardId} style={{ gap: 3 }}>
                  <Body style={{ fontSize: 15, color: day.ink2 }}>{cardText(p.cardId)}</Body>
                  <UserText italic style={{ fontSize: 16, lineHeight: 24 }}>{p.applyLine}</UserText>
                </View>
              ))}
            </View>
          ) : null}

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

          {/*
            PRD §7.14: two-column Goal on a tablet.

            The five stones are what they wrote; the plan is what it became.
            Side by side, a move and the line it came from are on screen at the
            same time, which is the claim the plan column makes about itself and
            was previously two scrolls apart. One column below tablet width, in
            the order it always ran.
          */}
          {twoColumn ? (
            <View testID="goal-two-column" style={{ flexDirection: 'row', gap: 34 }}>
              <View style={{ flex: 1, gap: 20 }}>
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
                            <UserText style={{ fontSize: 16, lineHeight: 23 }}>{a.line.trim() || a.paragraph?.trim()}</UserText>
                            {a.line.trim() && a.paragraph?.trim() ? (
                              <UserText style={{ fontSize: 15, lineHeight: 23, color: day.ink2 }}>{a.paragraph.trim()}</UserText>
                            ) : null}
                            {a.line2 ? (
                              <UserText italic framing={thenHalf(a.line2).framing} style={{ fontSize: 15, lineHeight: 22, color: day.ink2 }}>
                                {thenHalf(a.line2).act}
                              </UserText>
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
              </View>
              <View style={{ flex: 1, gap: 20 }}>
              {!path.empty ? (
                <View testID="goal-path" style={{ gap: 10 }}>
                  <Rule />
                  <Label>The path · {formatDay(path.from)} to {formatDay(path.to)}</Label>
                  <PathTrack
                    testID="goal-path-track"
                    at={path.at}
                    nodes={path.nodes.map((n) => ({ id: n.id, at: n.at, reached: n.reached }))}
                    color={meta.hex}
                    accessibilityLabel={pathLabel}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                    <Label testID="goal-path-here" style={{ color: meta.ink }}>
                      You are here
                    </Label>
                    <Label style={{ color: day.ink2 }}>{daysLeftLabel}</Label>
                  </View>

                  {path.next ? (
                    <View testID="goal-path-next" style={{ gap: 3 }}>
                      <Label style={{ color: accent.coralText }}>Next · {distanceLabel(path.next.daysAway)}</Label>
                      <Body style={{ color: day.ink, fontSize: 16 }}>{path.next.node.title}</Body>
                      {path.next.node.proof ? (
                        <Body style={{ fontSize: 13, color: day.ink2 }}>
                          Proof, in your words:{' '}
                          <UserText italic style={{ fontSize: 13, lineHeight: 20, color: day.ink2 }}>
                            “{path.next.node.proof}”
                          </UserText>
                        </Body>
                      ) : null}
                    </View>
                  ) : (
                    <Body testID="goal-path-done" style={{ fontSize: 14 }}>
                      Every milestone on this one is behind you.
                    </Body>
                  )}

                  {/*
                    And what they actually did. A route without this is a progress
                    bar with a nicer name; the ledger rows are the reason the dot
                    means anything.
                  */}
                  {recent.length ? (
                    <View testID="goal-path-evidence" style={{ gap: 6, marginTop: 4 }}>
                      <Label style={{ color: day.ink2 }}>
                        {recent.length === 1 ? 'The last thing you did' : `The last ${recent.length} things you did`}
                      </Label>
                      {recent.map((e) => (
                        <View key={e.id} style={{ flexDirection: 'row', gap: 10 }}>
                          <Label style={{ color: day.ink3, minWidth: 62 }}>{formatDay(e.day, { today })}</Label>
                          <UserText style={{ flex: 1, fontSize: 15, lineHeight: 22, color: day.ink2 }}>{e.text}</UserText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Body testID="goal-path-nothing-yet" style={{ fontSize: 13 }}>
                      Nothing in the ledger for this one yet. The first thing you do goes here.
                    </Body>
                  )}
                </View>
              ) : null}

              {plan ? (
                <View style={{ gap: 10 }}>
                  <Rule />
                  <Label>The plan · every move shows the line it came from</Label>
                  {(current ? [current] : []).map((ms) => (
                    <View key={ms.id} style={{ gap: 4 }}>
                      <Label style={{ color: accent.coralText }}>{milestoneLabel(ms)}</Label>
                      <Statement style={{ fontSize: 22, lineHeight: 27 }}>{ms.title}</Statement>
                      {/*
                        "In your words" is only true when a Monitoring line is
                        behind it. Without one the plan carries a placeholder, and
                        calling the app's own sentence the user's is the exact thing
                        the authorship rule exists to prevent.
                      */}
                      {ms.proofSourceLineId ? (
                        <Body style={{ fontSize: 13 }}>
                          Proof, in your words: <UserText italic style={{ fontSize: 13, lineHeight: 20 }}>“{ms.proof}”</UserText>
                        </Body>
                      ) : (
                        <Body style={{ fontSize: 13 }}>
                          No proof yet. Write how you’ll know, and it goes here.
                        </Body>
                      )}
                    </View>
                  ))}
                  {plan.moves.map((m) => {
                    const from = sourceLineFor(m, analyses);
                    // What the plan screen was not saying: which of these has
                    // happened. Every move read the same whether it was done last
                    // week, parked this morning, or still ahead — on the one screen
                    // whose whole title is "the plan".
                    const when = m.status === 'done' ? closedOn(m, boundary) : m.scheduledFor;
                    const state =
                      m.status === 'done'
                        ? `Done${when ? ` ${formatDay(when, { weekday: true, today })}` : ''}`
                        : m.status === 'skip'
                          ? `Not today${when ? ` · was ${formatDay(when, { today })}` : ''}`
                          : when
                            ? formatDay(when, { weekday: true, today })
                            : 'Not scheduled';
                    return (
                      <View
                        key={m.id}
                        testID={`plan-move-${m.id}`}
                        accessibilityLabel={`${m.title}. ${state}.`}
                        style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: day.line2, gap: 3 }}
                      >
                        {/*
                          Under the title, not beside it. Set in a row, the longest
                          state — "Not today · was 12 Sep" — took half the width at
                          375 pt and squeezed somebody's own sentence into a column
                          narrower than the label describing it.
                        */}
                        <Body style={{ color: m.status === 'done' ? day.ink2 : day.ink, fontSize: 16 }}>{m.title}</Body>
                        <Label
                          testID={`plan-move-state-${m.id}`}
                          style={{ color: m.status === 'done' ? accent.success : m.status === 'skip' ? day.ink3 : day.ink2 }}
                        >
                          {state}
                        </Label>
                        {from ? (
                          <Body style={{ fontSize: 13, color: day.ink2 }}>
                            from <UserText italic style={{ fontSize: 13, lineHeight: 20, color: day.ink2 }}>“{from}”</UserText>
                          </Body>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
              </View>
            </View>
          ) : (
            <>
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
                        <UserText style={{ fontSize: 16, lineHeight: 23 }}>{a.line.trim() || a.paragraph?.trim()}</UserText>
                        {a.line.trim() && a.paragraph?.trim() ? (
                          <UserText style={{ fontSize: 15, lineHeight: 23, color: day.ink2 }}>{a.paragraph.trim()}</UserText>
                        ) : null}
                        {a.line2 ? (
                          <UserText italic framing={thenHalf(a.line2).framing} style={{ fontSize: 15, lineHeight: 22, color: day.ink2 }}>
                                {thenHalf(a.line2).act}
                              </UserText>
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
          {!path.empty ? (
            <View testID="goal-path" style={{ gap: 10 }}>
              <Rule />
              <Label>The path · {formatDay(path.from)} to {formatDay(path.to)}</Label>
              <PathTrack
                testID="goal-path-track"
                at={path.at}
                nodes={path.nodes.map((n) => ({ id: n.id, at: n.at, reached: n.reached }))}
                color={meta.hex}
                accessibilityLabel={pathLabel}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <Label testID="goal-path-here" style={{ color: meta.ink }}>
                  You are here
                </Label>
                <Label style={{ color: day.ink2 }}>{daysLeftLabel}</Label>
              </View>

              {path.next ? (
                <View testID="goal-path-next" style={{ gap: 3 }}>
                  <Label style={{ color: accent.coralText }}>Next · {distanceLabel(path.next.daysAway)}</Label>
                  <Body style={{ color: day.ink, fontSize: 16 }}>{path.next.node.title}</Body>
                  {path.next.node.proof ? (
                    <Body style={{ fontSize: 13, color: day.ink2 }}>
                      Proof, in your words:{' '}
                      <UserText italic style={{ fontSize: 13, lineHeight: 20, color: day.ink2 }}>
                        “{path.next.node.proof}”
                      </UserText>
                    </Body>
                  ) : null}
                </View>
              ) : (
                <Body testID="goal-path-done" style={{ fontSize: 14 }}>
                  Every milestone on this one is behind you.
                </Body>
              )}

              {/*
                And what they actually did. A route without this is a progress
                bar with a nicer name; the ledger rows are the reason the dot
                means anything.
              */}
              {recent.length ? (
                <View testID="goal-path-evidence" style={{ gap: 6, marginTop: 4 }}>
                  <Label style={{ color: day.ink2 }}>
                    {recent.length === 1 ? 'The last thing you did' : `The last ${recent.length} things you did`}
                  </Label>
                  {recent.map((e) => (
                    <View key={e.id} style={{ flexDirection: 'row', gap: 10 }}>
                      <Label style={{ color: day.ink3, minWidth: 62 }}>{formatDay(e.day, { today })}</Label>
                      <UserText style={{ flex: 1, fontSize: 15, lineHeight: 22, color: day.ink2 }}>{e.text}</UserText>
                    </View>
                  ))}
                </View>
              ) : (
                <Body testID="goal-path-nothing-yet" style={{ fontSize: 13 }}>
                  Nothing in the ledger for this one yet. The first thing you do goes here.
                </Body>
              )}
            </View>
          ) : null}

          {plan ? (
            <View style={{ gap: 10 }}>
              <Rule />
              <Label>The plan · every move shows the line it came from</Label>
              {(current ? [current] : []).map((ms) => (
                <View key={ms.id} style={{ gap: 4 }}>
                  <Label style={{ color: accent.coralText }}>{milestoneLabel(ms)}</Label>
                  <Statement style={{ fontSize: 22, lineHeight: 27 }}>{ms.title}</Statement>
                  {/*
                    "In your words" is only true when a Monitoring line is
                    behind it. Without one the plan carries a placeholder, and
                    calling the app's own sentence the user's is the exact thing
                    the authorship rule exists to prevent.
                  */}
                  {ms.proofSourceLineId ? (
                    <Body style={{ fontSize: 13 }}>
                      Proof, in your words: <UserText italic style={{ fontSize: 13, lineHeight: 20 }}>“{ms.proof}”</UserText>
                    </Body>
                  ) : (
                    <Body style={{ fontSize: 13 }}>
                      No proof yet. Write how you’ll know, and it goes here.
                    </Body>
                  )}
                </View>
              ))}
              {plan.moves.map((m) => {
                const from = sourceLineFor(m, analyses);
                // What the plan screen was not saying: which of these has
                // happened. Every move read the same whether it was done last
                // week, parked this morning, or still ahead — on the one screen
                // whose whole title is "the plan".
                const when = m.status === 'done' ? closedOn(m, boundary) : m.scheduledFor;
                const state =
                  m.status === 'done'
                    ? `Done${when ? ` ${formatDay(when, { weekday: true, today })}` : ''}`
                    : m.status === 'skip'
                      ? `Not today${when ? ` · was ${formatDay(when, { today })}` : ''}`
                      : when
                        ? formatDay(when, { weekday: true, today })
                        : 'Not scheduled';
                return (
                  <View
                    key={m.id}
                    testID={`plan-move-${m.id}`}
                    accessibilityLabel={`${m.title}. ${state}.`}
                    style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: day.line2, gap: 3 }}
                  >
                    {/*
                      Under the title, not beside it. Set in a row, the longest
                      state — "Not today · was 12 Sep" — took half the width at
                      375 pt and squeezed somebody's own sentence into a column
                      narrower than the label describing it.
                    */}
                    <Body style={{ color: m.status === 'done' ? day.ink2 : day.ink, fontSize: 16 }}>{m.title}</Body>
                    <Label
                      testID={`plan-move-state-${m.id}`}
                      style={{ color: m.status === 'done' ? accent.success : m.status === 'skip' ? day.ink3 : day.ink2 }}
                    >
                      {state}
                    </Label>
                    {from ? (
                      <Body style={{ fontSize: 13, color: day.ink2 }}>
                        from <UserText italic style={{ fontSize: 13, lineHeight: 20, color: day.ink2 }}>“{from}”</UserText>
                      </Body>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
