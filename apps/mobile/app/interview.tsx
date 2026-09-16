/**
 * The Interview (PRD §7.1). Tap-only. "Something else…" is the last pill and
 * the only place anyone types; a custom answer skips the follow-up.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View , Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addAnother,
  addCustomArea,
  allAreas,
  answer,
  beginBranches,
  clarity,
  domainMeta,
  dropDraft,
  guessLine,
  initialInterview,
  pickedAreas,
  question,
  toggleArea,
  type InterviewState,
} from '@morrow/core';
import {
  Body,
  InkButton,
  Label,
  Question,
  Ring,
  Statement,
  Stone,
  Studio,
  TextButton,
  TopBar,
  UserField,
  accent,
  announce,
  day,
  radius,
  type as fonts,
} from '@morrow/ui';
import { usePlatformBack } from '../src/platform-back';
import { useMorrow } from '../src/store';
import { track, useFirstRunStep } from '../src/analytics';

const LETTERS = 'ABCDEFGH';

export default function Interview() {
  const router = useRouter();
  useFirstRunStep('interview');
  const showResources = useMorrow((st) => st.showResources);
  // Picked up where it was left: a kill or a call mid-Interview used to
  // restart it from the first question.
  const savedRaw = useMorrow((st) => st.interviewDraft);
  const saveDraft = useMorrow((st) => st.saveInterviewDraft);
  const clearDraft = useMorrow((st) => st.clearInterviewDraft);
  // A draft is persisted state from whichever build wrote it. One with the
  // wrong shape would crash this screen on every open, and it lives on disk;
  // it is looked at before it is trusted, and ignored if it does not look
  // like an Interview.
  const saved =
    savedRaw && typeof savedRaw.s?.stage === 'string' && Array.isArray(savedRaw.s.picked) && Array.isArray(savedRaw.s.drafts) && Array.isArray(savedRaw.history)
      ? savedRaw
      : null;
  const [s, setS] = useState<InterviewState>(() => saved?.s ?? initialInterview());
  // Every answer is a step forward that can be stepped back from, with
  // everything before it kept (§7.1: "Back always keeps answers"). A wrong
  // tap used to be final, and the only way out was to leave.
  const [history, setHistory] = useState<InterviewState[]>(() => saved?.history ?? []);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const advance = (next: InterviewState) => {
    const h = [...history, s];
    setHistory(h);
    setS(next);
    setCustomOpen(false);
    setCustomText('');
    saveDraft(next, h);
  };
  // Each new question is said (PRD §7.1: "VoiceOver announces each question");
  // the list under the cursor changes and nothing else moves.
  useEffect(() => {
    announce(s.stage === 'summary' ? 'Here is what I heard.' : question(s).prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answered, s.stage, s.cursor]);
  const stepBack = () => {
    const prev = history[history.length - 1];
    if (!prev) {
      // Backed all the way out: the draft of the first question is not a
      // sitting unless an area is ticked, and must not read as one on
      // Welcome or Today.
      if (s.picked.length === 0) clearDraft();
      if (router.canGoBack()) router.back();
      else router.dismissTo('/');
      return;
    }
    const h = history.slice(0, -1);
    setHistory(h);
    setS(prev);
    setCustomOpen(false);
    saveDraft(prev, h);
  };
  // The platform's back — the Android button, the iOS edge swipe, the
  // browser's arrow — is the same one-step undo as the screen's Back, and
  // only leaves once there is nothing left to undo (GOV.UK, Baymard).
  usePlatformBack(history.length > 0, stepBack);
  const addGoals = useMorrow((st) => st.addGoals);

  const q = question(s);
  const areas = allAreas(s);

  const options = useMemo(() => {
    if (q.stage === 'areas') return areas.map((a) => a.label);
    return q.options;
  }, [areas, q]);

  const isSelected = (label: string) => {
    if (q.stage !== 'areas') return false;
    const area = areas.find((a) => a.label === label);
    return area ? s.picked.includes(area.id) : false;
  };

  const choose = (label: string) => {
    setCustomOpen(false);
    setCustomText('');
    if (q.stage === 'areas') {
      const area = areas.find((a) => a.label === label);
      if (area) {
        const next = toggleArea(s, area.id);
        setS(next);
        // Kept as they are made, so a kill, the platform's back and the
        // screen's Back all leave the same thing behind: a sitting when an
        // area is ticked, nothing when none is.
        // Cleared only when there is nothing behind the question either:
        // "Add another goal" returns here with shaped goals still in the
        // draft, and un-ticking the last area used to throw them away.
        if (next.picked.length > 0 || history.length > 0) saveDraft(next, history);
        else clearDraft();
      }
      return;
    }
    advance(answer(s, label));
  };

  const useCustom = () => {
    const text = customText.trim();
    if (!text) return;
    setCustomOpen(false);
    setCustomText('');
    if (q.stage === 'areas') advance(addCustomArea(s, text));
    else advance(answer(s, text, true));
  };

  const finish = () => {
    clearDraft();
    track({ name: 'first_value', kind: 'goals_named' });
    addGoals(
      s.drafts.map((d) => ({
        title: d.title,
        domain: d.domain,
        ...(d.domainLabel ? { domainLabel: d.domainLabel } : {}),
        horizon: d.horizon,
        // A custom answer is the person's own words; a tapped option is the
        // bank's. The Book's authorship ratio needs to know which.
        authored: d.custom,
      })),
    );
    router.push('/authoring');
  };

  return (
    <Studio testID="screen-interview">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar
          back={{ onPress: stepBack, testID: 'interview-back' }}
          where={s.stage === 'summary' ? 'What I heard' : `Question ${s.answered + 1}`} help={{ onPress: showResources }}
          style={{ paddingTop: 6, minHeight: 48 }}
        />
        {/* the coach's pearl inside the clarity ring, and its guess */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 2 }}>
          <Ring size={64} progress={clarity(s)} color={accent.coral} width={3.5} testID="clarity-ring">
            <Stone size={46} gradient={['#FFFFFF', '#F3F1EC', '#CFCBC2', '#8E8A80']} polish={0.8} />
          </Ring>
          <View style={{ flex: 1, gap: 3 }}>
            <Label testID="clarity-value">{Math.round(clarity(s) * 100)}% clarity</Label>
            {/*
              The app talking, so it cannot be in the serif. UserText is the
              typeface reserved for the person's own words, and putting the
              app's running commentary in it is exactly the confusion the whole
              rule exists to prevent.
            */}
            <Body style={{ fontSize: 15, lineHeight: 20, color: day.ink2 }} testID="guess-line">
              {guessLine(s)}
            </Body>
          </View>
        </View>

        {s.stage === 'summary' ? (
          <Summary
            s={s}
            onDrop={(id) => {
              const next = dropDraft(s, id);
              setS(next);
              saveDraft(next, history);
            }}
            onAddAnother={() => {
              const next = addAnother(s);
              setS(next);
              saveDraft(next, history);
            }}
            onFinish={finish}
          />
        ) : (
          <>
            <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 10 }}>
              <Statement testID="interview-question" style={{ marginBottom: 8 }}>
                {q.prompt}
              </Statement>

              {options.map((label, i) => (
                <Pressable
                  key={label}
                  testID={`option-${i}`}
                  // "Pick as many as are true" is a box to tick; every other
                  // question answers and moves on at one tap, which is a button.
                  // Announced as "checkbox, unchecked" a branch option promised
                  // a tick it never gave.
                  accessibilityRole={q.stage === 'areas' ? 'checkbox' : 'button'}
                  {...(q.stage === 'areas' ? { 'aria-checked': isSelected(label) } : { accessibilityHint: 'Answers, and moves to the next question' })}
                  onPress={() => choose(label)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    // A floor, not a fixed height: an answer has to be able to
                    // wrap to a second line at 200% type instead of being cut.
                    minHeight: 54,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 18,
                    backgroundColor: isSelected(label) ? day.ink : day.surface,
                    borderWidth: 1,
                    borderColor: isSelected(label) ? day.ink : day.line2,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: 13,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected(label) ? day.onInkWash : day.line2,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 12, color: isSelected(label) ? day.onInk : day.ink2 }}>
                      {LETTERS[i] ?? '+'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: fonts.sansSemi,
                      fontSize: 17,
                      color: isSelected(label) ? day.onInk : day.ink,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}

              {/* always last, always outlined: the only place anyone types */}
              <Pressable
                testID="option-custom"
                accessibilityRole="button"
                onPress={() => setCustomOpen((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  minHeight: 54,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: day.line,
                }}
              >
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: day.ink2 }}>Something else…</Text>
              </Pressable>

              {customOpen ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: day.surface,
                    borderRadius: radius.field,
                    paddingHorizontal: 14,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <UserField
                      testID="custom-input"
                      label="Say it in your own words"
                      value={customText}
                      onChangeText={setCustomText}
                      placeholder={q.customHint}
                      autoFocus
                      onSubmitEditing={useCustom}
                    />
                  </View>
                  <InkButton testID="custom-use" label="Use this" onPress={useCustom} compact />
                </View>
              ) : null}
            </ScrollView>

            <View style={{ paddingTop: 10, paddingBottom: 18, gap: 10 }}>
              {q.stage === 'areas' ? (
                <InkButton
                  testID="interview-continue"
                  label={
                    s.picked.length === 0
                      ? 'Pick at least one'
                      : s.picked.length === 1
                        ? 'Continue with one'
                        : `Continue with ${s.picked.length}`
                  }
                  disabled={s.picked.length === 0}
                  onPress={() => advance(beginBranches(s))}
                />
              ) : (
                <Tray s={s} />
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </Studio>
  );
}

function Tray({ s }: { s: InterviewState }) {
  const picked = pickedAreas(s);
  return (
    <View style={{ gap: 10 }} testID="interview-tray">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>Your goals</Label>
        <Label>
          {s.drafts.length} of {picked.length}
        </Label>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {picked.map((a, i) => {
          const draft = s.drafts.find((d) => d.areaId === a.id);
          if (draft) return <Stone key={a.id} size={26} domain={a.domain} polish={1} />;
          return (
            <View
              key={a.id}
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: i === s.cursor ? 2 : 1.5,
                borderColor: i === s.cursor ? day.ink : day.line,
              }}
            />
          );
        })}
        <Body numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
          {s.drafts[s.drafts.length - 1]?.title ?? `${picked.length - s.drafts.length} to shape`}
        </Body>
      </View>
    </View>
  );
}

function Summary({
  s,
  onDrop,
  onAddAnother,
  onFinish,
}: {
  s: InterviewState;
  onDrop: (id: string) => void;
  onAddAnother: () => void;
  onFinish: () => void;
}) {
  return (
    <>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18 }}>
        <Statement style={{ marginBottom: 14 }}>Here&apos;s what I heard.</Statement>
        {s.drafts.map((d) => (
          <View
            key={d.id}
            testID={`draft-${d.id}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: day.line,
            }}
          >
            <Stone size={40} domain={d.domain} polish={1} />
            <View style={{ flex: 1 }}>
              <Question style={{ fontSize: 18 }}>{d.title}</Question>
              <Body style={{ fontSize: 13 }}>
                {d.domainLabel ?? domainMeta(d.domain).label} · {d.horizon.toLowerCase()}
              </Body>
            </View>
            <TextButton testID={`drop-${d.id}`} label="Drop" accessibilityLabel={`Drop ${d.title}`} onPress={() => onDrop(d.id)} />
          </View>
        ))}
        <Pressable
          testID="add-another"
          onPress={onAddAnother}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: day.line,
          }}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: day.line }} />
          <Body style={{ color: day.ink2 }}>Add another goal</Body>
        </Pressable>
      </ScrollView>
      <View style={{ paddingTop: 10, paddingBottom: 18 }}>
        <InkButton
          testID="interview-finish"
          label={s.drafts.length ? 'Begin the Fifteen' : 'Add a goal first'}
          disabled={s.drafts.length === 0}
          onPress={onFinish}
        />
      </View>
    </>
  );
}
