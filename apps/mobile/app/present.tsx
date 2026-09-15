/**
 * The Present volume (PRD §7.15, revised against the source 2026-09-15).
 *
 * Three moves, theirs: pick from a deck, narrow to what matters most, then
 * write twice about each survivor. Two halves — what gets in your way, then
 * what you are good at — and the source puts the whole Future volume between
 * them, so each half stands on its own and this screen does one at a time.
 *
 * What is not here, deliberately: any trait name, any factor, any score, any
 * tally per group. The moment a deck counts you it stops being a deck.
 */
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FAULT_CARDS_FULL,
  FAULT_CARDS_STARTER,
  FAULT_COPY,
  FAULT_FRAMINGS,
  PRESENT_WRITE_CEILING,
  VIRTUE_CARDS_FULL,
  VIRTUE_CARDS_STARTER,
  VIRTUE_COPY,
  VIRTUE_FRAMINGS,
  narrowTo,
  sections,
  type PresentCard,
  type PresentHalf,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Notice, Statement, Studio, TextButton, TopBar, UserField, announce, day } from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';
import { track, useFirstRunStep } from '../src/analytics';

export default function PresentRoute() {
  const params = useLocalSearchParams<{ half?: string }>();
  const half: PresentHalf = params.half === 'virtues' ? 'virtues' : 'faults';
  /**
   * The other half arrives by replacing this route, and a replaced route is
   * not always a new component. Keyed on the half, it is: every piece of
   * screen state below starts over, and the draft is read for the half that
   * is actually opening — the picks from the half just finished used to stay
   * ticked on the deck of the one starting.
   */
  return <Present key={half} half={half} />;
}

function Present({ half }: { half: PresentHalf }) {
  const router = useRouter();
  const depth = useMorrow((s) => s.profile.track);
  const picks = useMorrow((s) => s.presentPicks);
  const savePick = useMorrow((s) => s.savePresentPick);
  const draft = useMorrow((s) => s.presentDraft);
  const saveDraft = useMorrow((s) => s.savePresentDraft);
  const clearDraft = useMorrow((s) => s.clearPresentDraft);
  const showResources = useMorrow((s) => s.showResources);
  const goals = useGoals();
  useFirstRunStep('present_deck');

  const copy = half === 'faults' ? FAULT_COPY : VIRTUE_COPY;
  const framings = half === 'faults' ? FAULT_FRAMINGS : VIRTUE_FRAMINGS;
  const deck = useMemo(() => {
    if (depth === 'full') return half === 'faults' ? FAULT_CARDS_FULL : VIRTUE_CARDS_FULL;
    return half === 'faults' ? FAULT_CARDS_STARTER : VIRTUE_CARDS_STARTER;
  }, [depth, half]);
  const { max } = narrowTo(depth);

  const mine = useMemo(() => picks.filter((p) => p.half === half), [picks, half]);

  /**
   * The sitting they left, if they left one. Read once, at mount: after that
   * this screen is the thing writing it, and reading it again would fight the
   * typing. A draft belonging to the other half is not ours to resume.
   */
  const [resumed] = useState(() => (draft && draft.half === half ? draft : null));

  const [selected, setSelected] = useState<string[]>(() => resumed?.selected ?? mine.map((p) => p.cardId));
  const [story, setStory] = useState(() => resumed?.writing?.story ?? '');
  const [apply, setApply] = useState(() => resumed?.writing?.apply ?? '');
  const [framingId, setFramingId] = useState<string | null>(() => resumed?.writing?.framingId ?? null);
  const [goalId, setGoalId] = useState<string | null>(() => resumed?.writing?.goalId ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  const [writingOpen, setWritingOpen] = useState(() => Boolean(resumed?.writing));

  // The card being written about: the first chosen one with nothing written yet.
  const writingId = useMemo(() => {
    const written = new Set(mine.filter((p) => p.storyLine && p.applyLine).map((p) => p.cardId));
    return selected.find((id) => !written.has(id)) ?? null;
  }, [selected, mine]);
  const writing: PresentCard | null = writingId ? (deck.find((c) => c.id === writingId) ?? null) : null;

  // Written as they type, the way the Future volume's writing room is. The
  // method these come from says plainly that its programs are meant to be
  // done across several sittings; a draft is what makes that true here.
  useEffect(() => {
    if (!writingOpen && selected.length === 0) {
      clearDraft();
      return;
    }
    saveDraft({
      half,
      selected,
      writing: writingOpen && writingId ? { cardId: writingId, story, apply, framingId, goalId } : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [half, selected, writingOpen, writingId, story, apply, framingId, goalId]);

  const toggle = (id: string) => {
    setProblem(null);
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= max) {
        setProblem('That is ' + max + ' already. Take one off to add another.');
        return cur;
      }
      return [...cur, id];
    });
  };

  const keep = () => {
    if (!writing) return;
    savePick({
      half,
      cardId: writing.id,
      storyLine: story,
      applyLine: apply,
      framingId,
      goalId,
      rank: selected.indexOf(writing.id),
    });
    announce('Kept.');
    setStory('');
    setApply('');
    setFramingId(null);
    setGoalId(null);
  };

  const finished = writingOpen && selected.length > 0 && writingId === null;

  /**
   * Back out of the writing to the deck, keeping both the picks and whatever
   * is half-typed. Back used to drop the card being written about, which read
   * as a delete rather than an undo — and to a person who tapped it to check
   * what they had picked, a silent one.
   */
  const stepBack = () => {
    setProblem(null);
    setWritingOpen(false);
  };

  // The Android button, the iOS edge swipe and the browser's arrow are the
  // same one step back as the bar's, and only leave once there is nothing
  // left to step back through (GOV.UK, Baymard).
  const navigation = useNavigation();
  useEffect(() => {
    const off = navigation.addListener('beforeRemove', (e: { preventDefault: () => void }) => {
      if (!writingOpen || finished) return;
      e.preventDefault();
      stepBack();
    });
    return off;
  }, [navigation, writingOpen, finished]);

  // Each screen says itself once, the way the Interview says each question.
  useEffect(() => {
    if (finished) announce(half === 'faults' ? 'That is what gets in your way, in your words.' : 'That is what you are good at, in your words.');
    else if (writingOpen && writing) announce(writing.text + '. ' + String(selected.indexOf(writing.id) + 1) + ' of ' + String(selected.length) + '.');
    else announce(copy.deckQuestion ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, writingOpen, writingId, half]);

  // ---- this half is written
  if (finished) {
    const other: PresentHalf = half === 'faults' ? 'virtues' : 'faults';
    const otherDone = picks.some((p) => p.half === other);
    return (
      <Studio testID="screen-present-done">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ onPress: () => router.dismissTo('/today'), testID: 'present-back' }} where="Present" help={{ onPress: showResources }} />
          <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
            <Statement testID="present-done">
              {half === 'faults' ? 'That is what gets in your way, in your words.' : 'That is what you are good at, in your words.'}
            </Statement>
            <Body>
              {half === 'faults'
                ? 'Each one has a sign to watch for and an answer to it now. They join your Book, and the answers sit with the goal they belong to.'
                : 'Each one is paired with the goal that needs it. The coach has them for the days that go badly.'}
            </Body>
            <InkButton
              testID="present-next-half"
              label={otherDone ? 'Back to Today' : half === 'faults' ? 'Now what you are good at' : 'Now what gets in your way'}
              onPress={() => {
                clearDraft();
                if (otherDone) {
                  track({ name: 'volume_finished', volume: 'present' });
                  router.dismissTo('/today');
                  return;
                }
                router.replace('/present?half=' + other);
              }}
            />
            {otherDone ? null : (
              <TextButton
                testID="present-later"
                label="Another time"
                onPress={() => {
                  clearDraft();
                  router.dismissTo('/today');
                }}
              />
            )}
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- the two writes
  if (writingOpen && writing) {
    const ready = story.trim().length > 0 && apply.trim().length > 0;
    return (
      <Studio testID="screen-present-write">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar
            back={{ onPress: stepBack, testID: 'present-write-back' }}
            where={String(selected.indexOf(writing.id) + 1) + ' of ' + String(selected.length)}
            help={{ onPress: showResources }}
          />
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8, gap: 18 }}
          >
            <Statement testID="present-card">{writing.text}</Statement>

            <View style={{ gap: 8 }}>
              <Label>{copy.writeOnePrompt}</Label>
              <UserField
                testID="present-story"
                label={copy.writeOnePrompt ?? ''}
                labelHidden
                value={story}
                onChangeText={(t) => setStory(t.slice(0, PRESENT_WRITE_CEILING))}
                placeholder={copy.writeOneHint}
                multiline
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>{copy.writeTwoPrompt}</Label>
              {half === 'faults' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {framings.map((f) => (
                    <Chip
                      key={f.id}
                      testID={'present-framing-' + f.id}
                      label={f.label}
                      selected={framingId === f.id}
                      onPress={() => setFramingId(framingId === f.id ? null : f.id)}
                    />
                  ))}
                </View>
              ) : goals.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {goals.map((g) => (
                    <Chip
                      key={g.id}
                      testID={'present-goal-' + g.id}
                      label={g.title}
                      selected={goalId === g.id}
                      onPress={() => setGoalId(goalId === g.id ? null : g.id)}
                    />
                  ))}
                </View>
              ) : null}
              <UserField
                testID="present-apply"
                label={copy.writeTwoPrompt ?? ''}
                labelHidden
                value={apply}
                onChangeText={(t) => setApply(t.slice(0, PRESENT_WRITE_CEILING))}
                placeholder={copy.writeTwoHint}
                multiline
              />
            </View>
          </ScrollView>

          <View style={{ paddingBottom: 18, gap: 4 }}>
            <InkButton testID="present-keep" label={ready ? 'Keep this one' : 'Write both lines'} disabled={!ready} onPress={keep} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- the deck
  const grouped = sections(deck, depth);
  const cardRow = (c: PresentCard) => {
    const on = selected.includes(c.id);
    return (
      <Pressable
        key={c.id}
        testID={'present-card-' + c.id}
        accessibilityRole="checkbox"
        aria-checked={on}
        accessibilityLabel={c.text}
        onPress={() => toggle(c.id)}
        style={({ pressed }) => ({
          minHeight: 54,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 18,
          backgroundColor: on ? day.ink : day.surface,
          borderWidth: 1,
          borderColor: on ? day.ink : day.line2,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <Body style={{ color: on ? day.onInk : day.ink, fontSize: 16 }}>{c.text}</Body>
      </Pressable>
    );
  };

  return (
    <Studio testID="screen-present">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar
          back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/choose')), testID: 'present-deck-back' }}
          where={half === 'faults' ? 'What stops you' : 'What you are good at'}
          help={{ onPress: showResources }}
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
          <Statement testID="present-question">{copy.deckQuestion}</Statement>
          <Body style={{ fontSize: 14 }}>{copy.deckNote}</Body>
          <Notice testID="present-problem" text={problem} />
          {grouped.length
            ? grouped.map((s, i) => (
                <View key={s.group} style={{ gap: 10, marginTop: i === 0 ? 4 : 14 }}>
                  {/*
                    A silent divider. Naming a group, or counting how many came
                    from one, turns a deck into a test — which is the one thing
                    this volume must never be.
                  */}
                  {i === 0 ? null : <View style={{ height: 1, backgroundColor: day.line, marginVertical: 4 }} />}
                  {s.cards.map(cardRow)}
                </View>
              ))
            : deck.map(cardRow)}
        </ScrollView>

        <View style={{ paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="present-continue"
            label={selected.length === 0 ? 'Pick at least one' : 'Write about ' + (selected.length === 1 ? 'this one' : 'these ' + String(selected.length))}
            disabled={selected.length === 0}
            onPress={() => {
              setProblem(null);
              setWritingOpen(true);
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
