/**
 * The New move sheet, and quick capture (PRD §7.6).
 *
 * "Which goal (four small stones), what (three suggestions per goal or your
 * own words), how long (2 / 10 / 25 / 45 min); the new stone lands at the
 * top of Later today." The suggestions are cut from the person's own line
 * for that goal — `splitFirstMoves` over their Strategies stone — so every
 * option on the sheet is a sentence they wrote; the field is for the ones
 * they have not written yet, and what they type there is the move.
 *
 * Capture is the same sheet's other half: "text or voice, classified as
 * move, evidence, thought or question, filed with undo." One line into the
 * ledger, quoted nowhere unless the screen lets it through.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { splitFirstMoves, canBuildBlueprint, dayOf } from '@morrow/core';
import { Body, Chip, InkButton, Label, Statement, Stone, Studio, UserField, UserText, accent, day, radius, TopBar } from '@morrow/ui';
import { analysesFor, useGoals, useMorrow, entitlementOf, useSnapshot } from '../src/store';

const LENGTHS = ['2 min', '10 min', '25 min', '45 min'] as const;

export default function NewMove() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const goals = useGoals();
  const state = useSnapshot();
  const addMove = useMorrow((s) => s.addMove);
  const addEvidence = useMorrow((s) => s.addEvidence);

  const [mode, setMode] = useState<'move' | 'capture'>(params.mode === 'capture' ? 'capture' : 'move');
  const [goalId, setGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const [picked, setPicked] = useState<string | null>(null);
  const [own, setOwn] = useState('');
  const [minutes, setMinutes] = useState<(typeof LENGTHS)[number]>('10 min');
  const [capture, setCapture] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  // Their own line for the goal, cut into the three moves it names. Nothing
  // here is suggested by the app; a goal with no line yet has no chips.
  const source = useMemo(
    () => (goalId ? analysesFor(state, goalId).find((a) => a.kind === 'strategies' && a.line.trim()) : undefined),
    [state, goalId],
  );
  // Cut from the line, as the plan is: the Full track's paragraph
  // made sixty-word chips.
  const suggestions = useMemo(() => (source ? splitFirstMoves(source.line) : []), [source]);
  // A line written and no plan built: the free plan builds one, and a move
  // needs a plan to sit in. Said here, with the door, rather than refused
  // after the person has picked one of their own lines.
  const planless = Boolean(goalId && source && !state.plans.some((p) => p.goalId === goalId));
  const canBuild = canBuildBlueprint(entitlementOf(state, dayOf(new Date(), state.profile.dayBoundaryHour)));
  const entitled = canBuild.allowed;
  const makePortraitAndPlan = useMorrow((s) => s.makePortraitAndPlan);
  const setToast = useMorrow((s) => s.setToast);

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/today'));

  const keep = () => {
    if (!goalId) return;
    const title = (picked ?? own).trim();
    if (!title) {
      setProblem('Say what the move is, in your words.');
      return;
    }
    if (planless) {
      setProblem('This goal is written and waiting for its plan. The free plan builds one; Pro builds one for every goal.');
      return;
    }
    const ok = addMove(goalId, title, minutes, source ? { sourceLineId: source.id } : undefined);
    if (ok) back();
    else setProblem('This goal has no How line yet, and a move needs one of your lines behind it.');
  };

  const file = () => {
    const text = capture.trim();
    if (!text) {
      setProblem('Write the thing first.');
      return;
    }
    addEvidence(text, goalId ?? undefined);
    back();
  };

  return (
    <Studio testID="screen-new-move">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Close', onPress: back, testID: 'new-move-close' }} where={mode === 'move' ? 'A new move' : 'Capture'} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 18 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip testID="new-move-mode-move" label="A move for today" selected={mode === 'move'} onPress={() => setMode('move')} />
            <Chip testID="new-move-mode-capture" label="Something to keep" selected={mode === 'capture'} onPress={() => setMode('capture')} />
          </View>

          {/* Which goal: the stones. */}
          {goals.length ? (
            <View style={{ gap: 8 }}>
              <Label>Which one</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {goals.map((g) => (
                  <Chip
                    key={g.id}
                    testID={`new-move-goal-${g.id}`}
                    label={g.title}
                    selected={goalId === g.id}
                    onPress={() => {
                      setGoalId(g.id);
                      setPicked(null);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : mode === 'move' ? (
            // No goal, no move: a move is cut from a line written for a goal.
            // The sheet used to go on to show a What, a How long and a button
            // that did nothing when pressed. The only honest door is the one
            // to the Interview.
            <View style={{ gap: 12, alignItems: 'flex-start' }}>
              <Body>There is no goal yet to put a move under. A move is cut from a line you write for one.</Body>
              <Chip testID="new-move-name-goal" label="Name a goal" onPress={() => router.push('/interview')} />
            </View>
          ) : null}

          {mode === 'move' && goals.length && planless ? (
            <View testID="new-move-planless" style={{ gap: 12, alignItems: 'flex-start' }}>
              {entitled ? (
                <>
                  <Body>This goal is written and waiting for its plan. Build it, and its first moves land on Today — then a move of your own can go under it.</Body>
                  <Chip
                    testID="new-move-build-plan"
                    label="Build the plan"
                    onPress={() => {
                      if (!goalId) return;
                      const built = makePortraitAndPlan(goalId);
                      if (!built.ok) setToast({ text: built.error, kind: 'info' });
                    }}
                  />
                </>
              ) : (
                <>
                  <Body>
                    This goal is written and waiting for its plan. The free plan builds one plan; Pro builds one for every goal, and
                    then a move can go under this one.
                  </Body>
                  <Chip testID="new-move-see-pro" label="See what Pro adds" onPress={() => router.push(`/paywall?moment=second-blueprint&from=/today`)} />
                </>
              )}
            </View>
          ) : mode === 'move' && goals.length ? (
            <>
              <View style={{ gap: 8 }}>
                <Label>What</Label>
                {suggestions.length ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: day.line }}>
                    {/*
                      Cut from their line: their words, in their face. Rows on
                      hairlines rather than chips, because a chip is the app's
                      sans and these are sentences the person wrote.
                    */}
                    {suggestions.map((s, i) => {
                      const on = picked === s;
                      return (
                        <Pressable
                          key={s}
                          testID={`new-move-pick-${i}`}
                          accessibilityRole="radio"
                          aria-checked={on}
                          onPress={() => {
                            setPicked(on ? null : s);
                            setProblem(null);
                          }}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14,
                            paddingVertical: 12,
                            paddingHorizontal: 4,
                            borderBottomWidth: 1,
                            borderBottomColor: day.line,
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Stone size={22} domain={goals.find((g) => g.id === goalId)?.domain ?? 'health'} polish={on ? 1 : 0.35} seated={on} />
                          <UserText style={{ flex: 1, fontSize: 17, lineHeight: 24, color: on ? day.ink : day.ink2 }}>{s}</UserText>
                          {on ? <Label style={{ color: accent.coralText }}>Chosen</Label> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {/*
                      A move needs a line of theirs behind it, and this goal
                      has none yet — so the door is to the stone, not to a
                      field that would refuse what they typed into it.
                    */}
                    <Body style={{ fontSize: 13 }}>Nothing to cut from yet: this goal has no How line. Write it and the moves come from it.</Body>
                    {goalId ? (
                      <Chip
                        testID="new-move-write-how"
                        label="Write how"
                        onPress={() => router.push(`/stone?goal=${goalId}&kind=strategies`)}
                      />
                    ) : null}
                  </View>
                )}
                <UserField
                  testID="new-move-own"
                  label="Or in your words"
                  value={own}
                  onChangeText={(t) => {
                    setOwn(t);
                    setPicked(null);
                    setProblem(null);
                  }}
                  placeholder="One small thing, with a time in it"
                />
              </View>

              <View style={{ gap: 8 }}>
                <Label>How long</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {LENGTHS.map((m) => (
                    <Chip key={m} testID={`new-move-length-${m.split(' ')[0]}`} label={m} selected={minutes === m} onPress={() => setMinutes(m)} />
                  ))}
                </View>
              </View>

              {picked ? (
                <View style={{ backgroundColor: day.surface2, borderRadius: radius.card, padding: 14, gap: 4 }}>
                  {/* What always holds: on Today, under this goal. Where in the list depends on an intention already said. */}
                  <Label>{`On Today, under ${goals.find((g) => g.id === goalId)?.title ?? 'this goal'}`}</Label>
                  <UserText style={{ fontSize: 17, lineHeight: 24 }}>{picked}</UserText>
                </View>
              ) : null}

              {problem ? (
                <Body testID="new-move-problem" style={{ color: day.ink }}>
                  {problem}
                </Body>
              ) : null}
              <InkButton testID="new-move-keep" label="Put it on today" onPress={keep} />
            </>
          ) : mode === 'capture' ? (
            <>
              <Statement style={{ fontSize: 22, lineHeight: 28 }}>A thought, a thing that happened, a question.</Statement>
              <Body style={{ fontSize: 14 }}>It goes in the ledger under today, in your words. A letter from later may quote it back to you.</Body>
              <UserField
                testID="capture-text"
                label="What to keep"
                value={capture}
                onChangeText={(t) => {
                  setCapture(t);
                  setProblem(null);
                }}
                multiline
                placeholder="Just the thing"
              />
              {problem ? (
                <Body testID="new-move-problem" style={{ color: day.ink }}>
                  {problem}
                </Body>
              ) : null}
              <InkButton testID="capture-keep" label="Keep it" onPress={file} />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
