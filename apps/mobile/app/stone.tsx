/**
 * The analysis half-sheet (PRD §7.2). One component, used twelve times.
 *
 * Three or four framings to tap, then the user's own words. The framing is a
 * hand on the shoulder; nothing counts until the line is written. Vague
 * Strategies and Monitoring lines earn ONE follow-up and never a second.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ANALYSIS_ORDER,
  ANALYSIS_TITLES,
  CORE_ANALYSES,
  followUpPrompt,
  framingSet,
  scoreSpecificity,
  specificityCaption,
  type AnalysisKind,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Question, Statement, Stone, Studio, TextButton, UserField, accent, day } from '@morrow/ui';
import { analysesFor, useGoals, useMorrow } from '../src/store';

/** Which analyses this goal gets, on this track, at this rank. */
export function analysisPlan(rank: number, track: 'starter' | 'full'): AnalysisKind[] {
  if (track === 'full' || rank < 3) return ANALYSIS_ORDER;
  return CORE_ANALYSES;
}

/** PRD 7.2: the Full track's soft floor. Polish, never an error. */
const FULL_FLOOR = 600;

export default function StoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ goal?: string; kind?: string }>();
  const goals = useGoals();
  const track = useMorrow((s) => s.profile.track);
  const write = useMorrow((s) => s.writeAnalysis);
  const state = useMorrow((s) => s);

  const goalId = params.goal ?? goals[0]?.id ?? '';
  const goal = goals.find((g) => g.id === goalId);
  const kind = (params.kind ?? 'motives') as AnalysisKind;

  const existing = analysesFor(state, goalId).find((a) => a.kind === kind);
  const [framingId, setFramingId] = useState<string | null>(existing?.framingId ?? null);
  const [line, setLine] = useState(existing?.line ?? '');
  const [line2, setLine2] = useState(existing?.line2 ?? '');
  const [paragraph, setParagraph] = useState(existing?.paragraph ?? '');
  const [followUpAsked, setFollowUpAsked] = useState(false);

  const set = useMemo(() => framingSet(kind, goal?.domain ?? 'custom'), [kind, goal?.domain]);
  const plan = goal ? analysisPlan(goal.rank, track) : ANALYSIS_ORDER;
  const stepIndex = plan.indexOf(kind);
  const spec = scoreSpecificity(paragraph.trim() || line);
  const needsFollowUp =
    (kind === 'strategies' || kind === 'monitoring') && spec.needsFollowUp && line.trim().length > 0 && !followUpAsked;

  const ready = line.trim().length > 0 && (kind !== 'obstacles' || line2.trim().length > 0);

  const makePlan = useMorrow((s) => s.makePortraitAndPlan);

  const goNext = () => {
    write(goalId, kind, {
      framingId,
      line,
      ...(kind === 'obstacles' ? { line2 } : {}),
      ...(track === 'full' && paragraph.trim() ? { paragraph } : {}),
    });

    const nextKind = plan[stepIndex + 1];
    if (nextKind) {
      router.replace(`/stone?goal=${goalId}&kind=${nextKind}`);
      return;
    }

    // The last stone for this goal is written, so build or refresh its plan
    // here rather than only when the Book is sealed.
    //
    // Sealing was the single call site, which meant a goal whose Blueprint had
    // failed the first time — because the Strategies line was missing then —
    // could only ever get one by sealing a second edition of the whole Book.
    // Safe to call now: it keeps an existing plan and its kept moves, and only
    // fills in what is newly derivable.
    makePlan(goalId);

    const idx = goals.findIndex((g) => g.id === goalId);
    const nextGoal = goals[idx + 1];
    if (nextGoal) {
      const nextPlan = analysisPlan(nextGoal.rank, track);
      router.replace(`/stone?goal=${nextGoal.id}&kind=${nextPlan[0]}`);
      return;
    }
    // The Portrait reveal (PRD §7.4), which is what all five stones were for
    // and which nothing in the app had ever shown. It is built here, from the
    // lines they have just written, and the sitting carries on from it.
    router.replace(`/portrait?goal=${goals[0]?.id ?? goalId}&next=/seal-book`);
  };

  if (!goal) {
    return (
      <Studio testID="screen-stone">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center' }}>
          <Statement>That goal is gone.</Statement>
          <InkButton label="Back to today" onPress={() => router.dismissTo('/today')} style={{ marginTop: 18 }} />
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio testID="screen-stone">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 }}>
          <Stone size={30} domain={goal.domain} polish={1} />
          <View style={{ flex: 1 }}>
            <Label testID="stone-goal">{goal.title}</Label>
            <Label testID="stone-step" style={{ color: accent.coralText, marginTop: 2 }}>
              {ANALYSIS_TITLES[kind]} · stone {stepIndex + 1} of {plan.length}
            </Label>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {plan.map((k, i) => (
              <View
                key={k}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: i < stepIndex ? accent.coral : 'transparent',
                  borderWidth: i < stepIndex ? 0 : 1.5,
                  borderColor: day.line,
                }}
              />
            ))}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 16 }}>
          <Statement testID="stone-question">{set.question}</Statement>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {set.framings.map((f) => (
              <Chip
                key={f.id}
                testID={`framing-${f.id}`}
                label={f.label}
                selected={framingId === f.id}
                onPress={() => setFramingId(framingId === f.id ? null : f.id)}
              />
            ))}
          </View>

          <View style={{ gap: 6 }}>
            <Label>In your words</Label>
            <UserField
              testID="stone-line"
              label="Your line for this stone"
              value={line}
              onChangeText={setLine}
              placeholder={set.hint}
              multiline={kind !== 'obstacles'}
            />
            {kind === 'obstacles' ? (
              <>
                <Label style={{ marginTop: 10 }}>…then I</Label>
                <UserField
                  testID="stone-line2"
                  label="What you do instead"
                  value={line2}
                  onChangeText={setLine2}
                  placeholder="what you do instead"
                />
              </>
            ) : null}
            {line.trim() ? (
              <Label testID="stone-specificity" style={{ marginTop: 4 }}>
                {specificityCaption(spec)}
              </Label>
            ) : null}
          </View>

          {/* the single follow-up, never a second */}
          {needsFollowUp ? (
            <View testID="stone-followup" style={{ backgroundColor: day.surface, borderRadius: 18, padding: 16, gap: 8 }}>
              <Question style={{ fontSize: 18 }}>{followUpPrompt(kind === 'monitoring' ? 'monitoring' : 'strategies')}</Question>
              <UserField
                testID="stone-followup-input"
                label="When and where"
                value={line}
                onChangeText={setLine}
                placeholder="add the when and the where"
                multiline
              />
              <TextButton testID="stone-followup-skip" label="Leave it as it is" onPress={() => setFollowUpAsked(true)} />
            </View>
          ) : null}

          {track === 'full' ? (
            <View testID="stone-full" style={{ gap: 8 }}>
              <Label>Go deeper</Label>
              {set.fullPrompts.map((p) => (
                <Body key={p} style={{ fontSize: 14, lineHeight: 19 }}>
                  · {p}
                </Body>
              ))}
              <UserField
                testID="stone-paragraph"
                label="Your paragraph for this stone"
                value={paragraph}
                onChangeText={setParagraph}
                placeholder="A paragraph, at least. Write until it is true."
                multiline
                minHeight={140}
              />
              {/*
                PRD 7.2: "a soft floor of 600 characters shown as polish, never
                an error". So: a count, in the quiet ink, that stops being
                shown once it is past. Nothing blocks on it and nothing turns
                red.
              */}
              {paragraph.trim().length < FULL_FLOOR ? (
                <Label testID="stone-paragraph-polish" style={{ color: day.ink3 }}>
                  {paragraph.trim().length} of {FULL_FLOOR} · the studied dose is about a paragraph
                </Label>
              ) : (
                <Label testID="stone-paragraph-polish" style={{ color: accent.success }}>
                  The studied dose
                </Label>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="stone-seat"
            label={ready ? 'Seat the stone' : kind === 'obstacles' ? 'Write both lines' : 'Write your line'}
            disabled={!ready}
            onPress={() => {
              if (needsFollowUp) {
                setFollowUpAsked(true);
                return;
              }
              goNext();
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
