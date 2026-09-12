/**
 * The Interview (PRD §7.1). Tap-only. "Something else…" is the last pill and
 * the only place anyone types; a custom answer skips the follow-up.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
  day,
  radius,
  type as fonts,
} from '@morrow/ui';
import { useMorrow } from '../src/store';

const LETTERS = 'ABCDEFGH';

export default function Interview() {
  const router = useRouter();
  const [s, setS] = useState<InterviewState>(initialInterview);
  // Every answer is a step forward that can be stepped back from, with
  // everything before it kept (§7.1: "Back always keeps answers"). A wrong
  // tap used to be final, and the only way out was to leave.
  const [history, setHistory] = useState<InterviewState[]>([]);
  const advance = (next: InterviewState) => {
    setHistory((h) => [...h, s]);
    setS(next);
    setCustomOpen(false);
    setCustomText('');
  };
  const stepBack = () => {
    const prev = history[history.length - 1];
    if (!prev) {
      if (router.canGoBack()) router.back();
      else router.dismissTo('/');
      return;
    }
    setHistory((h) => h.slice(0, -1));
    setS(prev);
    setCustomOpen(false);
  };
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
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
      if (area) setS(toggleArea(s, area.id));
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
          where={s.stage === 'summary' ? 'The Interview · what I heard' : `The Interview · question ${s.answered + 1}`}
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
            onDrop={(id) => setS(dropDraft(s, id))}
            onAddAnother={() => setS(addAnother(s))}
            onFinish={finish}
          />
        ) : (
          <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 10 }}>
              <Statement testID="interview-question" style={{ marginBottom: 8 }}>
                {q.prompt}
              </Statement>

              {options.map((label, i) => (
                <Pressable
                  key={label}
                  testID={`option-${i}`}
                  // Pick at least one, so each option is a box to tick.
                  accessibilityRole="checkbox"
                  aria-checked={isSelected(label)}
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

            <View style={{ paddingBottom: 18, gap: 10 }}>
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18 }}>
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
            <TextButton testID={`drop-${d.id}`} label="Drop" onPress={() => onDrop(d.id)} />
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
      <View style={{ paddingBottom: 18 }}>
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
