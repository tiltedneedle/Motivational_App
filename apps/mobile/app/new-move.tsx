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
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { domainMeta, splitFirstMoves } from '@morrow/core';
import { Body, Chip, InkButton, Label, Statement, Stone, Studio, TextButton, UserField, UserText, day, radius } from '@morrow/ui';
import { analysesFor, useGoals, useMorrow } from '../src/store';

const LENGTHS = ['2 min', '10 min', '25 min', '45 min'] as const;

export default function NewMove() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const goals = useGoals();
  const state = useMorrow((s) => s);
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
  const suggestions = useMemo(() => (source ? splitFirstMoves(source.paragraph?.trim() || source.line) : []), [source]);

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/today'));

  const keep = () => {
    if (!goalId) return;
    const title = (picked ?? own).trim();
    if (!title) {
      setProblem('Say what the move is, in your words.');
      return;
    }
    const ok = addMove(goalId, title, minutes, source ? { sourceLineId: source.id } : undefined);
    if (ok) back();
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <Label>{mode === 'move' ? 'A new move' : 'Capture'}</Label>
          <TextButton testID="new-move-close" label="Close" onPress={back} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 18 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip testID="new-move-mode-move" label="A move for today" selected={mode === 'move'} onPress={() => setMode('move')} />
            <Chip testID="new-move-mode-capture" label="Something to keep" selected={mode === 'capture'} onPress={() => setMode('capture')} />
          </View>

          {/* Which goal: the stones. */}
          {goals.length ? (
            <View style={{ gap: 8 }}>
              <Label>Which one</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {goals.slice(0, 4).map((g) => (
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
          ) : (
            <Body>There is no goal yet to put a move under.</Body>
          )}

          {mode === 'move' ? (
            <>
              {goalId ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Stone size={40} domain={goals.find((g) => g.id === goalId)?.domain ?? 'health'} polish={0.7} />
                  <Body style={{ fontSize: 13, flex: 1 }}>{domainMeta(goals.find((g) => g.id === goalId)?.domain ?? 'health').label}</Body>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <Label>What</Label>
                {suggestions.length ? (
                  <View style={{ gap: 8 }}>
                    {/* Cut from their line: their words, in their face. */}
                    {suggestions.map((s) => (
                      <Chip
                        key={s}
                        testID={`new-move-pick-${suggestions.indexOf(s)}`}
                        label={s}
                        selected={picked === s}
                        onPress={() => {
                          setPicked(picked === s ? null : s);
                          setProblem(null);
                        }}
                      />
                    ))}
                  </View>
                ) : (
                  <Body style={{ fontSize: 13 }}>Nothing to cut from yet for this one — write the move in your own words.</Body>
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
                <View style={{ backgroundColor: day.surface, borderRadius: radius.card, padding: 14, gap: 4 }}>
                  <Label>Lands at the top of Later today</Label>
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
          ) : (
            <>
              <Statement style={{ fontSize: 22, lineHeight: 28 }}>A thought, a thing that happened, a question.</Statement>
              <Body style={{ fontSize: 14 }}>It goes in the ledger under today, in your words, and nowhere else.</Body>
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
          )}
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
