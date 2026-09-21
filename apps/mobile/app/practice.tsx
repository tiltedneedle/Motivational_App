/**
 * The practice builder (PRD §7.5).
 *
 * It opens with the person's own Strategies line already cut into steps, so the
 * first thing they see is their sentence rather than an empty form. Every step
 * is editable and every step is theirs; what the app supplies is the shape —
 * how long, which days, what the small version is called.
 *
 * A habit is one step. A routine is more than one. The form does not ask which,
 * it just notices.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DURATION_CHIPS, durationLabel, scheduleLabel, suggestSteps, totalSeconds, type Practice } from '@morrow/core';
import {
  Body,
  Chip,
  InkButton,
  Label,
  Rule,
  Statement,
  Studio,
  UserField,
  accent,
  day,
  type as fonts,
  TopBar,
} from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DraftStep {
  text: string;
  seconds: number;
}

export default function PracticeBuilder() {
  const router = useRouter();
  const params = useLocalSearchParams<{ goal?: string }>();
  const goals = useGoals();
  const analyses = useMorrow((s) => s.analyses);
  const addPractice = useMorrow((s) => s.addPractice);
  const goBack = () => (router.canGoBack() ? router.back() : router.dismissTo('/today'));

  const [goalId, setGoalId] = useState<string | null>(params.goal ?? goals[0]?.id ?? null);
  const goal = goals.find((g) => g.id === goalId) ?? goals[0];

  const source = useMemo(
    () => (goal ? analyses.find((a) => a.goalId === goal.id && a.kind === 'strategies' && a.line.trim()) : undefined),
    [analyses, goal],
  );

  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<DraftStep[]>(() => (source ? suggestSteps(source) : []));
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [minVersion, setMinVersion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const schedule: Practice['schedule'] = { type: 'days', days };
  const kind: Practice['kind'] = steps.length > 1 ? 'routine' : 'habit';

  const setStep = (i: number, patch: Partial<DraftStep>) =>
    setSteps((all) => all.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  const save = () => {
    if (!goal) return;
    setError(null);
    const made = addPractice({
      goalId: goal.id,
      title,
      kind,
      steps,
      schedule,
      ...(minVersion.trim() ? { minVersion } : {}),
    });
    if (!made) {
      setError(
        source
          ? 'That could not be saved yet. Every step needs words and a length.'
          : 'A practice is built from the How line for this goal, and there is none yet. Write it first.',
      );
      return;
    }
    router.dismissTo('/today');
  };

  if (!goal) {
    return (
      <Studio testID="screen-practice">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement>Name a goal first.</Statement>
          <Body>A practice belongs to something. It is built out of the line you wrote about how you will do it.</Body>
          <InkButton label="Back to today" onPress={goBack} />
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio testID="screen-practice">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: goBack, testID: 'practice-back' }} where={kind === 'routine' ? 'A routine' : 'A habit'} />

        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 22 }}>
          <Statement>Something you do, not something you finish.</Statement>

          {goals.length > 1 ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {goals.map((g) => (
                <Chip
                  key={g.id}
                  testID={`practice-goal-${g.id}`}
                  label={g.title}
                  selected={g.id === goal.id}
                  onPress={() => {
                    setGoalId(g.id);
                    const next = analyses.find((a) => a.goalId === g.id && a.kind === 'strategies' && a.line.trim());
                    setSteps(next ? suggestSteps(next) : []);
                  }}
                />
              ))}
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <Label>What do you call it?</Label>
            <UserField
              testID="practice-title"
              labelHidden
              label="What you call this practice"
              value={title}
              onChangeText={setTitle}
              placeholder="The morning round"
            />
          </View>

          <Rule />

          <View style={{ gap: 12 }}>
            <Label>The steps</Label>
            {source ? (
              <Body style={{ fontSize: 13 }}>
                Cut from what you already wrote. Change any of it; it is yours.
              </Body>
            ) : (
              <View testID="practice-no-source" style={{ gap: 10, alignItems: 'flex-start' }}>
                <Body style={{ fontSize: 13 }}>
                  You have not written how yet for this goal, so there is nothing to cut steps from — and a practice is
                  built from that line. Write it, and this form comes back already filled in.
                </Body>
                <Chip testID="practice-write-how" label="Write how" onPress={() => router.push(`/stone?goal=${goal.id}&kind=strategies`)} />
              </View>
            )}

            {steps.map((s, i) => (
              <View key={i} testID={`practice-step-${i}`} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: day.ink2, width: 18 }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    {/*
                      Multiline, because these are cut from the person's own
                      sentence and a single line clipped them: "Tuesday: at
                      6:40, out the back do…". Their words are the one thing on
                      this screen that must not be trimmed to fit.
                    */}
                    <UserField
                      testID={`practice-step-text-${i}`}
                      label={`Step ${i + 1}`}
                      value={s.text}
                      onChangeText={(t) => setStep(i, { text: t })}
                      placeholder="What you actually do"
                      multiline
                      minHeight={54}
                    />
                  </View>
                  <Pressable
                    testID={`practice-step-remove-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove step ${i + 1}`}
                    onPress={() => setSteps((all) => all.filter((_, n) => n !== i))}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ fontSize: 18, color: day.ink2 }}>×</Text>
                  </Pressable>
                </View>
                {/*
                  How long, as a dial rather than six chips a step: the step
                  is the thing on this row, and its length is one small
                  readout with a way down and a way up.
                */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 28 }}>
                  <Label>How long</Label>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 999,
                      backgroundColor: day.surface,
                      borderWidth: 1,
                      borderColor: day.line2,
                    }}
                  >
                    <Pressable
                      testID={`practice-step-${i}-shorter`}
                      accessibilityRole="button"
                      accessibilityLabel={`Shorter step ${i + 1}`}
                      onPress={() => {
                        const at = DURATION_CHIPS.indexOf(s.seconds as (typeof DURATION_CHIPS)[number]);
                        const next = DURATION_CHIPS[Math.max(0, (at < 0 ? 2 : at) - 1)]!;
                        setStep(i, { seconds: next });
                      }}
                      style={({ pressed }) => ({ width: 40, height: 36, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
                    >
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 18, lineHeight: 22, color: day.ink2 }}>−</Text>
                    </Pressable>
                    <Text
                      testID={`practice-step-${i}-length`}
                      style={{ fontFamily: fonts.sansSemi, fontSize: 14, lineHeight: 18, color: day.ink, minWidth: 52, textAlign: 'center', fontVariant: ['tabular-nums'] }}
                    >
                      {durationLabel(s.seconds)}
                    </Text>
                    <Pressable
                      testID={`practice-step-${i}-longer`}
                      accessibilityRole="button"
                      accessibilityLabel={`Longer step ${i + 1}`}
                      onPress={() => {
                        const at = DURATION_CHIPS.indexOf(s.seconds as (typeof DURATION_CHIPS)[number]);
                        const next = DURATION_CHIPS[Math.min(DURATION_CHIPS.length - 1, (at < 0 ? 2 : at) + 1)]!;
                        setStep(i, { seconds: next });
                      }}
                      style={({ pressed }) => ({ width: 40, height: 36, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
                    >
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 18, lineHeight: 22, color: day.ink2 }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {source ? (
              <Chip
                testID="practice-add-step"
                label="Add a step"
                ghost
                onPress={() => setSteps((all) => [...all, { text: '', seconds: 300 }])}
              />
            ) : null}
            {steps.length > 0 ? (
              <Label testID="practice-total">
                {steps.length} {steps.length === 1 ? 'step' : 'steps'} · {durationLabel(totalSeconds({ steps }))}
              </Label>
            ) : null}
          </View>

          <Rule />

          <View style={{ gap: 10 }}>
            <Label>Which days</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DAY_LETTERS.map((letter, i) => {
                const on = days.includes(i);
                return (
                  <Pressable
                    key={i}
                    testID={`practice-day-${i}`}
                    accessibilityRole="checkbox"
                    aria-checked={on}
                    accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}
                    onPress={() => setDays((d) => (on ? d.filter((x) => x !== i) : [...d, i]))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? day.ink : day.surface,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: on ? day.onInk : day.ink2 }}>
                      {letter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Label testID="practice-schedule">{scheduleLabel(schedule)}</Label>
          </View>

          <Rule />

          <View style={{ gap: 8 }}>
            <Label>The two-minute version</Label>
            <Body style={{ fontSize: 13 }}>
              The one you would still do on the worst day. It counts as a full day, because keeping the small version is
              the thing that keeps this going.
            </Body>
            <UserField
              testID="practice-min"
              labelHidden
              label="The two-minute version"
              value={minVersion}
              onChangeText={setMinVersion}
              placeholder={source ? 'Leave it and Morrow supplies a two-minute stand-in' : 'Just the first bit'}
            />
          </View>

          {error ? (
            <Body testID="practice-error" style={{ color: accent.destructive }}>
              {error}
            </Body>
          ) : null}
        </ScrollView>

        <View style={{ paddingTop: 10, paddingBottom: 18 }}>
          <InkButton
            testID="practice-save"
            label={source ? 'Keep it' : 'Write how first'}
            disabled={!source || !title.trim() || steps.length === 0 || days.length === 0}
            onPress={save}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
