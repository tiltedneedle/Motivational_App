/**
 * The Interview (PRD §7.1). Tap-only. "Something else…" is the last pill and
 * the only place anyone types; a custom answer skips the follow-up.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
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
import { Body, Heading, InkButton, Label, OptionTile, Pop, Question, Screen, Slide, Statement, Stone, TextButton, UserField, accent, announce, day, radius, useReducedMotion } from '@morrow/ui';
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
  const reduced = useReducedMotion();
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

  const areasStage = q.stage === 'areas';
  const where = s.stage === 'summary' ? 'What I heard' : `Question ${s.answered + 1}`;

  if (s.stage === 'summary') {
    return (
      <Screen
        testID="screen-interview"
        back={{ onPress: stepBack, testID: 'interview-back' }}
        where={where}
        help={{ onPress: showResources }}
        progress={{ value: 0.4, label: 'Step 2 of 5 · Find your goals', testID: 'interview-progress' }}
        cta={{ label: s.drafts.length ? 'Write your future · 15 min' : 'Add a goal first', onPress: finish, disabled: s.drafts.length === 0, testID: 'interview-finish' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Stone size={22} gradient={['#FFFFFF', '#F3F1EC', '#CFCBC2', '#8E8A80']} polish={0.8} />
          <Body style={{ flex: 1, fontSize: 14, lineHeight: 19, color: day.ink2 }} testID="guess-line">
            {guessLine(s)}
          </Body>
        </View>
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
        />
      </Screen>
    );
  }

  return (
    <Screen
      testID="screen-interview"
      back={{ onPress: stepBack, testID: 'interview-back' }}
      where={where}
      help={{ onPress: showResources }}
      // The bar fills with the Interview's own clarity; the step is the path's.
      progress={{ value: 0.2 + clarity(s) * 0.2, label: 'Step 2 of 5 · Find your goals', testID: 'interview-progress' }}
      keyboard
      cta={
        areasStage
          ? {
              label: s.picked.length === 0 ? 'Pick at least one' : s.picked.length === 1 ? 'Continue with one' : `Continue with ${s.picked.length}`,
              disabled: s.picked.length === 0,
              onPress: () => advance(beginBranches(s)),
              testID: 'interview-continue',
            }
          : undefined
      }
      footer={areasStage ? null : <Tray s={s} />}
    >
      {/*
        The app talking, so it cannot be in the serif. UserText is the
        typeface reserved for the person's own words, and putting the
        app's running commentary in it is exactly the confusion the whole
        rule exists to prevent.
      */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Stone size={22} gradient={['#FFFFFF', '#F3F1EC', '#CFCBC2', '#8E8A80']} polish={0.8} />
        <Body style={{ flex: 1, fontSize: 14, lineHeight: 19, color: day.ink2 }} testID="guess-line">
          {guessLine(s)}
        </Body>
      </View>
      {/* PRD 7.1: "the next question slides in from the right". A new prompt is a new slide. */}
      <Slide key={q.prompt} reduced={reduced} style={{ gap: 10 }}>
        <Statement testID="interview-question" style={{ marginBottom: 6 }}>
          {q.prompt}
        </Statement>
        {options.map((label, i) => (
          <OptionTile
            key={label}
            testID={`option-${i}`}
            letter={LETTERS[i] ?? '+'}
            title={label}
            // "Pick as many as are true" is a box to tick; every other
            // question answers and moves on at one tap, which is a button.
            role={areasStage ? 'checkbox' : 'button'}
            selected={areasStage ? isSelected(label) : undefined}
            accessibilityLabel={areasStage ? label : `${label}. Answers, and moves to the next question`}
            onPress={() => choose(label)}
            compact
          />
        ))}
        {/* always last, always outlined: the only place anyone types */}
        <OptionTile testID="option-custom" glyph="custom" tint={accent.violet} title="Something else…" role="button" onPress={() => setCustomOpen((v) => !v)} compact />
        {customOpen ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: day.surface, borderRadius: radius.field, paddingHorizontal: 14, paddingBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <UserField testID="custom-input" label="Say it in your own words" value={customText} onChangeText={setCustomText} placeholder={q.customHint} autoFocus onSubmitEditing={useCustom} />
            </View>
            <InkButton testID="custom-use" label="Use this" onPress={useCustom} compact />
          </View>
        ) : null}
      </Slide>
    </Screen>
  );
}

function Tray({ s }: { s: InterviewState }) {
  const reduced = useReducedMotion();
  const picked = pickedAreas(s);
  return (
    <View style={{ gap: 8, paddingBottom: 4 }} testID="interview-tray">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Label>Your goals</Label>
        <Label>
          {s.drafts.length} of {picked.length}
        </Label>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {picked.map((a, i) => {
          const draft = s.drafts.find((d) => d.areaId === a.id);
          // A stone forms in the tray (PRD 7.1): from small, on the settle spring.
          if (draft)
            return (
              <Pop key={a.id} reduced={reduced}>
                <Stone size={26} domain={a.domain} polish={1} />
              </Pop>
            );
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

function Summary({ s, onDrop, onAddAnother }: { s: InterviewState; onDrop: (id: string) => void; onAddAnother: () => void }) {
  return (
    <View style={{ gap: 10 }}>
      <Heading title="Here’s what I heard." line="Each becomes a goal in your Book. Drop one, or add another." />
      {s.drafts.map((d) => (
        <View
          key={d.id}
          testID={`draft-${d.id}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: day.surface, borderRadius: 18, borderWidth: 1, borderColor: day.line2 }}
        >
          <Stone size={36} domain={d.domain} polish={1} />
          <View style={{ flex: 1 }}>
            <Question style={{ fontSize: 17 }}>{d.title}</Question>
            <Body style={{ fontSize: 13 }}>
              {d.domainLabel ?? domainMeta(d.domain).label} · {d.horizon.toLowerCase()}
            </Body>
          </View>
          <TextButton testID={`drop-${d.id}`} label="Drop" accessibilityLabel={`Drop ${d.title}`} onPress={() => onDrop(d.id)} />
        </View>
      ))}
      <OptionTile testID="add-another" glyph="plus" tint={accent.teal} title="Add another goal" role="button" onPress={onAddAnother} compact />
    </View>
  );
}
