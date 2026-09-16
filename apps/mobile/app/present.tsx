/**
 * The Present volume (PRD §7.15, revised against the source 2026-09-15).
 *
 * Three moves, theirs: pick from a deck, narrow to what matters most, then
 * write twice about each survivor. Two halves — what gets in your way, then
 * what you are good at — and the source puts the whole Future volume between
 * them, so each half stands on its own and this screen does one at a time.
 *
 * On Starter the deck itself stops at three and that is the narrowing. On
 * Full the deck takes everything that is plainly true and the narrowing is a
 * step of its own, the way the source has it.
 *
 * What is not here, deliberately: any trait name, any factor, any score, any
 * tally per group. The moment a deck counts you it stops being a deck.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  halfComplete,
  narrowTo,
  nextHalf,
  screen,
  sections,
  type PresentCard,
  type PresentHalf,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Notice, Statement, Studio, TextButton, TopBar, UserField, announce, day } from '@morrow/ui';
import { usePlatformBack } from '../src/platform-back';
import { useGoals, useMorrow } from '../src/store';
import { track, useFirstRunStep } from '../src/analytics';

/** The two lines and the two taps under one card. */
interface Lines {
  story: string;
  apply: string;
  framingId: string | null;
  goalId: string | null;
}
const NO_LINES: Lines = { story: '', apply: '', framingId: null, goalId: null };

export default function PresentRoute() {
  const params = useLocalSearchParams<{ half?: string }>();
  const picks = useMorrow((s) => s.presentPicks);
  const draft = useMorrow((s) => s.presentDraft);
  const depth = useMorrow((s) => s.profile.track);
  /**
   * A bare door opens the sitting that was left, or else the half not yet
   * finished, faults first. The chooser and the explainer both send
   * '/present' with no half, and a fully ticked faults deck was what somebody
   * who had finished it got.
   *
   * Keyed on the half: a replaced route is not always a new component, and
   * every piece of screen state below has to start over for the other one —
   * the picks from the half just finished used to stay ticked on the next deck.
   *
   * Decided once, when the door opens. Derived live, the moment the faults
   * were finished the door became the virtues and the closing screen was
   * swapped out from under the person. A named half in the route still wins,
   * which is how the closing screen's own button moves to the other half.
   */
  const [opened] = useState<PresentHalf>(() => draft?.half ?? nextHalf(picks, depth));
  const half: PresentHalf = params.half === 'virtues' || params.half === 'faults' ? params.half : opened;
  return <Present key={half} half={half} />;
}

function Present({ half }: { half: PresentHalf }) {
  const router = useRouter();
  const depth = useMorrow((s) => s.profile.track);
  const picks = useMorrow((s) => s.presentPicks);
  const savePick = useMorrow((s) => s.savePresentPick);
  const dropPick = useMorrow((s) => s.dropPresentPick);
  const rankPicks = useMorrow((s) => s.rankPresentPicks);
  const draft = useMorrow((s) => s.presentDraft);
  const saveDraft = useMorrow((s) => s.savePresentDraft);
  const clearDraft = useMorrow((s) => s.clearPresentDraft);
  const showResources = useMorrow((s) => s.showResources);
  const goals = useGoals();
  const editions = useMorrow((s) => s.books.length);
  useFirstRunStep('present_deck');

  const copy = half === 'faults' ? FAULT_COPY : VIRTUE_COPY;
  const framings = half === 'faults' ? FAULT_FRAMINGS : VIRTUE_FRAMINGS;
  const deck = useMemo(() => {
    if (depth === 'full') return half === 'faults' ? FAULT_CARDS_FULL : VIRTUE_CARDS_FULL;
    return half === 'faults' ? FAULT_CARDS_STARTER : VIRTUE_CARDS_STARTER;
  }, [depth, half]);
  const { max } = narrowTo(depth);
  // Starter's deck stops at three and that is the whole move. Full's takes
  // everything that is plainly true; the narrowing comes after.
  const deckCap = depth === 'full' ? deck.length : max;
  const inDeck = (id: string) => deck.some((c) => c.id === id);

  const mine = useMemo(() => picks.filter((p) => p.half === half), [picks, half]);

  /**
   * The sitting they left, if they left one. Read once, at mount: after that
   * this screen is the thing writing it, and reading it again would fight the
   * typing. A draft belonging to the other half is not ours to resume.
   *
   * A draft or picks made on the other depth can name cards this deck does
   * not show. Nothing from those is seeded — a phantom pick could not be
   * taken off, and left the deck unable to advance.
   */
  const [resumed] = useState(() => (draft && draft.half === half ? draft : null));
  const [resumedWriting] = useState(() => (resumed?.writing && inDeck(resumed.writing.cardId) ? resumed.writing : null));

  const [selected, setSelected] = useState<string[]>(() => (resumed?.selected ?? mine.map((p) => p.cardId)).filter(inDeck));
  /**
   * What has been typed, by card. Four loose fields used to follow the
   * person from card to card: un-tick the card you had started, and the next
   * one opened with your words already in its boxes, and Keep filed them
   * under it. Each card holds its own, and a card ticked again has its own.
   */
  const [texts, setTexts] = useState<Record<string, Lines>>(() => {
    const kept = Object.fromEntries(Object.entries(resumed?.lines ?? {}).filter(([id]) => inDeck(id)));
    if (resumedWriting && !kept[resumedWriting.cardId]) {
      const { cardId, ...lines } = resumedWriting;
      kept[cardId] = lines;
    }
    return kept;
  });
  const [problem, setProblem] = useState<string | null>(null);
  const [narrowing, setNarrowing] = useState(false);
  /**
   * The writing is open when a sitting is resumed into it — and when the half
   * is already finished, so a door opened on a written half lands on its
   * closing screen rather than on a deck of inked cards with nothing to say.
   */
  const [writingOpen, setWritingOpen] = useState(() =>
    resumed ? Boolean(resumedWriting) && Boolean(resumed.open) : halfComplete(picks, half, depth),
  );

  // The card being written about: the first chosen one with nothing written yet.
  const writingId = useMemo(() => {
    const written = new Set(mine.filter((p) => p.storyLine && p.applyLine).map((p) => p.cardId));
    return selected.find((id) => !written.has(id)) ?? null;
  }, [selected, mine]);
  const writing: PresentCard | null = writingId ? (deck.find((c) => c.id === writingId) ?? null) : null;
  const cur: Lines = (writingId && texts[writingId]) || NO_LINES;
  const setLine = (patch: Partial<Lines>) => {
    if (!writingId) return;
    const id = writingId;
    setTexts((t) => ({ ...t, [id]: { ...(t[id] ?? NO_LINES), ...patch } }));
  };

  // Written as they type, the way the Future volume's writing room is. The
  // method these come from says plainly that its programs are meant to be
  // done across several sittings; a draft is what makes that true here.
  useEffect(() => {
    // Nothing of this half's to draft: no pick, or every pick already kept.
    // The store may be holding the other half's sitting, reached past the
    // chooser's door — that one is not ours to touch.
    if (writingId === null) {
      if (!draft || draft.half === half) clearDraft();
      return;
    }
    // The lines travel whether the writing is open or not: Back to the deck
    // must not be the thing that loses them.
    saveDraft({
      half,
      selected,
      open: writingOpen,
      lines: texts,
      writing: { cardId: writingId, ...cur },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [half, selected, writingOpen, writingId, texts]);

  const toggle = (id: string) => {
    setProblem(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= deckCap) {
        setProblem('That is ' + deckCap + ' already. Take one off to add another.');
        return prev;
      }
      return [...prev, id];
    });
  };

  /** The picks stored for this half that the deck no longer ticks. */
  const letGo = useMemo(() => mine.filter((p) => !selected.includes(p.cardId)), [mine, selected]);

  /**
   * The deck's picks become the half's picks here, at the commit, and not on
   * the tap: an un-tick is reversible until the person presses on, the way
   * Back is an undo everywhere else. A written card taken off the deck used
   * to stay in the store and print in the Book regardless.
   */
  const commit = () => {
    setProblem(null);
    for (const p of letGo) dropPick(p.cardId, half);
    rankPicks(half, selected);
    if (letGo.length) announce(String(letGo.length) + ' let go.');
    setNarrowing(false);
    setWritingOpen(true);
  };

  const keep = () => {
    if (!writing) return;
    // The store screens the same text. The screen asks first so it can say
    // the true thing: a line written in crisis is kept, and kept out of the
    // Book, which is not "Kept."
    const held = screen(cur.story + ' ' + cur.apply).risk === 'crisis';
    savePick({
      half,
      cardId: writing.id,
      storyLine: cur.story,
      applyLine: cur.apply,
      framingId: cur.framingId,
      goalId: cur.goalId,
      rank: selected.indexOf(writing.id),
    });
    announce(held ? 'Kept on your phone, and out of the Book.' : 'Kept.');
    const id = writing.id;
    setTexts((t) => {
      const { [id]: _kept, ...rest } = t;
      return rest;
    });
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
    if (writingOpen) setWritingOpen(false);
    else setNarrowing(false);
  };
  const canStepBack = (writingOpen && !finished) || narrowing;

  // The Android button, the iOS edge swipe and the browser's arrow are the
  // same one step back as the bar's, and only leave once there is nothing
  // left to step back through.
  usePlatformBack(canStepBack, stepBack);

  // Each screen says itself once, the way the Interview says each question.
  useEffect(() => {
    if (finished) announce(half === 'faults' ? 'That is what gets in your way, in your words.' : 'That is what you are good at, in your words.');
    else if (writingOpen && writing) announce(writing.text + '. ' + String(selected.indexOf(writing.id) + 1) + ' of ' + String(selected.length) + '.');
    else if (narrowing) announce(copy.narrowPrompt ?? '');
    else announce(copy.deckQuestion ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, writingOpen, writingId, narrowing, half]);

  const cardRow = (c: PresentCard, prefix: string) => {
    const on = selected.includes(c.id);
    return (
      <Pressable
        key={c.id}
        testID={prefix + c.id}
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

  // ---- this half is written
  if (finished) {
    const other: PresentHalf = half === 'faults' ? 'virtues' : 'faults';
    const otherDone = halfComplete(picks, other, depth);
    // Kept, and kept out of the Book: said here, per card, rather than left
    // for the person to notice a page missing.
    const held = mine.filter((p) => p.safetyRisk === 'crisis');
    return (
      <Studio testID="screen-present-done">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ onPress: () => router.dismissTo('/today'), testID: 'present-back' }} where="Present" help={{ onPress: showResources }} />
          {/* Scrolls: at 200% type, or a phone on its side, the two buttons were off the bottom with no way to them. */}
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 16 }} showsVerticalScrollIndicator={false}>
            <Statement testID="present-done">
              {half === 'faults' ? 'That is what gets in your way, in your words.' : 'That is what you are good at, in your words.'}
            </Statement>
            <Body>{copy.done}</Body>
            {/* "They join your Book" is one of two very different things, and this says which. */}
            <Body testID="present-done-book" style={{ fontSize: 14 }}>
              {editions ? copy.doneNextEdition : copy.doneNoBook}
            </Body>
            {half === 'virtues' && goals.length === 0 ? <Body testID="present-done-no-goal">{copy.doneNoGoal}</Body> : null}
            {held.map((p) => (
              <Body key={p.id} testID={'present-held-' + p.cardId} style={{ fontSize: 13 }}>
                {(deck.find((c) => c.id === p.cardId)?.text ?? '') + ' — ' + (copy.heldNote ?? '')}
              </Body>
            ))}
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
            {editions ? <TextButton testID="present-seal" label="Seal a new edition now" onPress={() => router.push('/seal-book')} /> : null}
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
          </ScrollView>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- the two writes
  if (writingOpen && writing) {
    const ready = cur.story.trim().length > 0 && cur.apply.trim().length > 0;
    // With no goals yet there is nothing to pick, so the prompt must not ask.
    const secondPrompt = half === 'virtues' && goals.length === 0 ? (copy.writeTwoPromptNoGoal ?? copy.writeTwoPrompt) : copy.writeTwoPrompt;
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
                value={cur.story}
                onChangeText={(t) => setLine({ story: t.slice(0, PRESENT_WRITE_CEILING) })}
                placeholder={copy.writeOneHint}
                multiline
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label testID="present-second-prompt">{secondPrompt}</Label>
              {half === 'faults' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {framings.map((f) => (
                    <Chip
                      key={f.id}
                      testID={'present-framing-' + f.id}
                      label={f.label}
                      selected={cur.framingId === f.id}
                      onPress={() => setLine({ framingId: cur.framingId === f.id ? null : f.id })}
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
                      selected={cur.goalId === g.id}
                      onPress={() => setLine({ goalId: cur.goalId === g.id ? null : g.id })}
                    />
                  ))}
                </View>
              ) : null}
              <UserField
                testID="present-apply"
                label={secondPrompt ?? ''}
                labelHidden
                value={cur.apply}
                onChangeText={(t) => setLine({ apply: t.slice(0, PRESENT_WRITE_CEILING) })}
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

  // ---- the narrowing: Full's second move, only the ticked cards
  if (narrowing) {
    const over = selected.length - max;
    const shown = deck.filter((c) => selected.includes(c.id));
    return (
      <Studio testID="screen-present-narrow">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ onPress: stepBack, testID: 'present-narrow-back' }} where={half === 'faults' ? 'Present · the faults' : 'Present · the virtues'} help={{ onPress: showResources }} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
            <Statement testID="present-narrow-prompt">{copy.narrowPrompt}</Statement>
            <Body style={{ fontSize: 14 }}>{copy.narrowNote}</Body>
            <Notice testID="present-problem" text={problem} />
            {shown.map((c) => cardRow(c, 'present-narrow-card-'))}
          </ScrollView>
          <View style={{ paddingBottom: 18, gap: 4 }}>
            <Label testID="present-narrow-count" style={{ textAlign: 'center', paddingBottom: 6 }}>
              {String(selected.length) + ' ticked · keep up to ' + String(max)}
            </Label>
            <InkButton
              testID="present-narrow-continue"
              label={over > 0 ? 'Take ' + String(over) + ' off' : 'Write about these ' + String(selected.length)}
              disabled={over > 0 || selected.length === 0}
              onPress={commit}
            />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- the deck
  const grouped = sections(deck, depth);
  const goLabel =
    selected.length === 0
      ? 'Pick at least one'
      : selected.length > max
        ? 'Narrow these ' + String(selected.length)
        : 'Write about ' + (selected.length === 1 ? 'this one' : 'these ' + String(selected.length));
  return (
    <Studio testID="screen-present">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar
          back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/choose')), testID: 'present-deck-back' }}
          where={half === 'faults' ? 'Present · the faults' : 'Present · the virtues'}
          help={{ onPress: showResources }}
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
          <Statement testID="present-question">{copy.deckQuestion}</Statement>
          <Body testID="present-deck-note" style={{ fontSize: 14 }}>
            {depth === 'full' ? copy.deckNoteFull : copy.deckNote}
          </Body>
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
                  {s.cards.map((c) => cardRow(c, 'present-card-'))}
                </View>
              ))
            : deck.map((c) => cardRow(c, 'present-card-'))}
        </ScrollView>

        <View style={{ paddingBottom: 18, gap: 4 }}>
          {/* Two lines of theirs go with a written card taken off: said before the commit, not after. */}
          {letGo.length ? (
            <Label testID="present-let-go" style={{ textAlign: 'center', paddingBottom: 6 }}>
              {'Going on lets go of ' + String(letGo.length) + ' you wrote about.'}
            </Label>
          ) : null}
          <InkButton
            testID="present-continue"
            label={goLabel}
            disabled={selected.length === 0}
            onPress={() => {
              setProblem(null);
              if (selected.length > max) setNarrowing(true);
              else commit();
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
