/**
 * The Past volume (PRD §7.16, revised against the source 2026-09-15).
 *
 * The source's three moves, in their order: cut a life into periods, name the
 * events in each that still matter, then say what a few of them made of you.
 * Seven periods on the long track as they have it, four on an evening.
 *
 * It is the heaviest of the three and the source says so, so this screen does
 * what the others do not: a doorway with a plain warning before anything is
 * asked, the helplines in the top bar of every step, a way out that keeps what
 * was written, and a per-event choice about the Book whose default is out.
 *
 * Nothing written here is quoted anywhere else unless the person put it in the
 * Book, and a line the safety screen flags is held out whatever they chose —
 * which the screen says, rather than overriding quietly.
 */
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PAST_COPY,
  PAST_FRAMINGS,
  PAST_LINE_CEILING,
  PAST_WRITE_CEILING,
  analyseTarget,
  epochsFor,
  eventsPerEpoch,
  pastStep,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Notice, Rule, Statement, Studio, TextButton, TopBar, UserField, accent, announce, day } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { track, useFirstRunStep } from '../src/analytics';

export default function Past() {
  const router = useRouter();
  const depth = useMorrow((s) => s.profile.track);
  const epochs = useMorrow((s) => s.pastEpochs);
  const events = useMorrow((s) => s.pastEvents);
  const setEpochs = useMorrow((s) => s.setPastEpochs);
  const listed = useMorrow((s) => s.pastListed);
  const setListed = useMorrow((s) => s.setPastListed);
  const addEvent = useMorrow((s) => s.addPastEvent);
  const dropEvent = useMorrow((s) => s.dropPastEvent);
  const chooseEvent = useMorrow((s) => s.choosePastEvent);
  const saveAnalysis = useMorrow((s) => s.savePastAnalysis);
  const setJoins = useMorrow((s) => s.setPastJoinsBook);
  const showResources = useMorrow((s) => s.showResources);
  const draft = useMorrow((s) => s.pastDraft);
  const saveDraft = useMorrow((s) => s.savePastDraft);
  const clearDraft = useMorrow((s) => s.clearPastDraft);
  useFirstRunStep('past_doorway');

  const [entered, setEntered] = useState(() => epochs.length > 0);
  /**
   * Which period is on screen. The person walks them; the app does not decide
   * for them by looking at which one happens to be empty — that made a second
   * event impossible to add, and pulled anyone back to a period they had
   * deliberately left blank.
   */
  /**
   * The sitting they left, read once at mount. This is the longest of the
   * three volumes and the one people are likeliest to put down part-way, so
   * putting it down has to cost nothing.
   */
  const [resumed] = useState(() => draft);
  const [cursor, setCursor] = useState(() => resumed?.cursor ?? 0);
  /**
   * The picking screen stays until the person presses on. Without this it
   * jumped to the writing the instant the last one was tapped, so its own
   * button was unreachable and a pick could not be reconsidered.
   */
  const [picked, setPicked] = useState(() => resumed?.picked ?? false);
  const [age, setAge] = useState(() => (resumed?.age != null ? String(resumed.age) : ''));
  const [title, setTitle] = useState(() => resumed?.title ?? '');
  const [weight, setWeight] = useState<'helped' | 'hurt'>('helped');
  const [what, setWhat] = useState(() => resumed?.writing?.what ?? '');
  const [shaped, setShaped] = useState(() => resumed?.writing?.shaped ?? '');
  const [believe, setBelieve] = useState(() => resumed?.writing?.believe ?? '');
  const [framingId, setFramingId] = useState<string | null>(() => resumed?.writing?.framingId ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  /** Which event the three boxes hold, so a resumed draft cannot land on the wrong one. */
  const [writingFor, setWritingFor] = useState<string | null>(() => resumed?.writing?.eventId ?? null);

  const analyses = useMemo(
    () =>
      events.map((v) => ({
        eventId: v.id,
        whatHappened: v.whatHappened,
        shapedMe: v.shapedMe,
        stillBelieve: v.stillBelieve,
        joinsBook: v.joinsBook,
      })),
    [events],
  );
  const step = pastStep(
    epochs.map((e) => ({ id: e.id, label: e.label, fromAge: e.fromAge, toAge: e.toAge })),
    events.map((v) => ({ id: v.id, epochId: v.epochId, title: v.title, weight: v.weight, analysed: v.analysed })),
    analyses,
    depth,
    listed,
  );

  /**
   * The picking screen also stands in front of the two steps after it until
   * they press on, so "which step is showing" is not quite `step.step`.
   */
  const choosing = step.step === 'choose' || (!picked && (step.step === 'analyse' || step.step === 'done') && listed);
  const canStepBack = entered && (choosing || step.step === 'age' || step.step === 'events' || step.step === 'analyse');

  /** One step back, wherever they are. The bar and the platform share it. */
  const stepBack = () => {
    setProblem(null);
    if (step.step === 'age') {
      setEntered(false);
      return;
    }
    if (step.step === 'events') {
      const index = Math.min(cursor, Math.max(0, epochs.length - 1));
      if (index > 0) setCursor(index - 1);
      else setEntered(false);
      return;
    }
    if (choosing) {
      setListed(false);
      setCursor(Math.max(0, epochs.length - 1));
      return;
    }
    if (step.step === 'analyse') setPicked(false);
  };

  // The Android button, the iOS edge swipe and the browser's arrow undo one
  // step, the same as the bar's, and only leave once there is nothing left.
  const navigation = useNavigation();
  useEffect(() => {
    const off = navigation.addListener('beforeRemove', (e: { preventDefault: () => void }) => {
      if (!canStepBack) return;
      e.preventDefault();
      stepBack();
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, canStepBack, step.step, cursor, epochs.length, choosing, entered]);

  // Written as they go. The method these come from is explicit that its
  // programs are meant to take several sittings, so the walk, the age, the
  // picks and the three boxes all survive the app being killed mid-sentence.
  const analysingId = step.step === 'analyse' ? step.eventId : null;
  useEffect(() => {
    if (!entered && epochs.length === 0) return;
    saveDraft({
      age: Number.isFinite(Number(age)) && age !== '' ? Number(age) : null,
      cursor,
      picked,
      title,
      writing: analysingId ? { eventId: analysingId, what, shaped, believe, framingId } : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, cursor, picked, age, title, analysingId, what, shaped, believe, framingId]);

  // Moving to the next event empties the boxes, and a draft that belonged to
  // some other event never lands in them.
  useEffect(() => {
    if (!analysingId || writingFor === analysingId) return;
    setWritingFor(analysingId);
    setWhat('');
    setShaped('');
    setBelieve('');
    setFramingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysingId]);

  // Each step says itself once, the way the Interview says each question.
  const said = step.step === 'events' ? String(Math.min(cursor, Math.max(0, epochs.length - 1))) : '';
  useEffect(() => {
    if (!entered) {
      announce(PAST_COPY['doorway.title'] ?? '');
      return;
    }
    if (step.step === 'age') announce(PAST_COPY['age.prompt'] ?? '');
    else if (step.step === 'events') {
      const epoch = epochs[Math.min(cursor, Math.max(0, epochs.length - 1))];
      announce((epoch?.label ? epoch.label + '. ' : '') + (PAST_COPY['events.prompt'] ?? ''));
    } else if (choosing) announce(PAST_COPY['choose.prompt'] ?? '');
    else if (step.step === 'analyse') {
      const ev = events.find((v) => v.id === step.eventId);
      announce((ev?.title ?? '') + '. ' + String(step.done + 1) + ' of ' + String(step.total) + '.');
    } else announce(PAST_COPY['join.question'] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, step.step, choosing, analysingId, said]);

  const top = (where: string, onBack: () => void, testID = 'past-back') => (
    <TopBar back={{ onPress: onBack, testID }} where={where} help={{ onPress: showResources }} />
  );
  const leave = () => router.dismissTo('/today');

  // ---- the doorway: the warning, before anything is asked
  if (!entered) {
    return (
      <Studio testID="screen-past-doorway">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top('Past', () => (router.canGoBack() ? router.back() : router.dismissTo('/choose')), 'past-doorway-back')}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 16 }}>
            <Statement testID="past-doorway-title">{PAST_COPY['doorway.title']}</Statement>
            <Body style={{ color: day.ink }}>{PAST_COPY['doorway.body']}</Body>
            <Rule />
            <Body testID="past-doorway-note" style={{ fontSize: 14 }}>
              {PAST_COPY['doorway.note']}
            </Body>
          </ScrollView>
          <View style={{ paddingBottom: 18, gap: 4 }}>
            <InkButton
              testID="past-begin"
              label={PAST_COPY['doorway.begin'] ?? 'Begin'}
              onPress={() => {
                track({ name: 'volume_opened', volume: 'past', first: epochs.length === 0 });
                setEntered(true);
              }}
            />
            <TextButton testID="past-later" label={PAST_COPY['doorway.later'] ?? 'Another time'} onPress={leave} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- move one: the periods, cut from their age
  if (step.step === 'age') {
    const n = Number(age);
    const ok = Number.isFinite(n) && n >= 10 && n <= 110;
    return (
      <Studio testID="screen-past-age">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top('Past · the periods', stepBack, 'past-age-back')}
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 16 }}>
            <Statement>{PAST_COPY['age.prompt']}</Statement>
            <UserField
              testID="past-age"
              label={PAST_COPY['age.prompt'] ?? ''}
              labelHidden
              value={age}
              onChangeText={(t) => setAge(t.replace(/\D/g, '').slice(0, 3))}
              placeholder="30"
              keyboardType="number-pad"
            />
            <Body style={{ fontSize: 13 }}>{PAST_COPY['age.note']}</Body>
          </ScrollView>
          <View style={{ paddingBottom: 18 }}>
            <InkButton
              testID="past-age-continue"
              label={ok ? 'Cut my life into periods' : 'Your age, in years'}
              disabled={!ok}
              onPress={() => setEpochs(epochsFor(n, depth))}
            />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- move two: the events in one period
  if (step.step === 'events') {
    const index = Math.min(cursor, epochs.length - 1);
    const epoch = epochs[index]!;
    const here = events.filter((v) => v.epochId === epoch.id);
    const room = eventsPerEpoch(depth);
    const position = index + 1;
    const last = position >= epochs.length;
    return (
      <Studio testID="screen-past-events">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top(String(position) + ' of ' + String(epochs.length), stepBack, 'past-events-back')}
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Label style={{ color: accent.coralText }}>{epoch.label}</Label>
              <Statement testID="past-events-prompt">{PAST_COPY['events.prompt']}</Statement>
              <Body style={{ fontSize: 14 }}>{PAST_COPY['events.note']}</Body>
            </View>

            {here.map((v) => (
              <View key={v.id} testID={'past-event-' + v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: day.line, paddingTop: 10 }}>
                <Body style={{ flex: 1, color: day.ink }}>{v.title}</Body>
                <Label>{v.weight === 'helped' ? PAST_COPY['events.helped'] : PAST_COPY['events.hurt']}</Label>
                <TextButton testID={'past-drop-' + v.id} label="Remove" accessibilityLabel={'Remove ' + v.title} onPress={() => dropEvent(v.id)} />
              </View>
            ))}

            {here.length < room ? (
              <View style={{ gap: 8 }}>
                <UserField
                  testID="past-event-title"
                  label={PAST_COPY['events.prompt'] ?? ''}
                  labelHidden
                  value={title}
                  onChangeText={(t) => setTitle(t.slice(0, PAST_LINE_CEILING))}
                  placeholder="In a few words"
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip testID="past-weight-helped" label={PAST_COPY['events.helped'] ?? 'It helped'} selected={weight === 'helped'} onPress={() => setWeight('helped')} />
                  <Chip testID="past-weight-hurt" label={PAST_COPY['events.hurt'] ?? 'It hurt'} selected={weight === 'hurt'} onPress={() => setWeight('hurt')} />
                </View>
                <Chip
                  testID="past-event-add"
                  label={PAST_COPY['events.add'] ?? 'Add an event'}
                  ghost
                  onPress={() => {
                    if (!title.trim()) return;
                    addEvent(epoch.id, title, weight);
                    setTitle('');
                  }}
                />
              </View>
            ) : null}

            <Body style={{ fontSize: 13 }}>{PAST_COPY['events.empty']}</Body>
          </ScrollView>

          <View style={{ paddingBottom: 18 }}>
            <InkButton
              testID="past-events-continue"
              label={last ? 'On to the ones that still have weight' : 'Next period'}
              onPress={() => {
                // An empty period is a real answer, and nothing is written to
                // stand in for one.
                setTitle('');
                if (last) setListed(true);
                else setCursor(index + 1);
              }}
            />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- between two and three: which ones to go into
  if (step.step === 'choose' || (!picked && (step.step === 'analyse' || step.step === 'done') && listed)) {
    const real = events;
    const chosen = events.filter((v) => v.analysed).length;
    const target = Math.min(analyseTarget(depth), real.length);
    return (
      <Studio testID="screen-past-choose">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top('Past · which ones', stepBack, 'past-choose-back')}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 12 }}>
            <Statement testID="past-choose-prompt">{PAST_COPY['choose.prompt']}</Statement>
            <Body style={{ fontSize: 14 }}>{PAST_COPY['choose.note']}</Body>
            <Notice testID="past-problem" text={problem} />
            {real.map((v) => {
              const epoch = epochs.find((e) => e.id === v.epochId);
              return (
                <Pressable
                  key={v.id}
                  testID={'past-choose-' + v.id}
                  accessibilityRole="checkbox"
                  aria-checked={v.analysed}
                  accessibilityLabel={v.title + ', ' + (epoch?.label ?? '')}
                  onPress={() => {
                    setProblem(null);
                    if (!v.analysed && chosen >= target) {
                      setProblem('That is ' + target + ' already. Take one off to add another.');
                      return;
                    }
                    chooseEvent(v.id, !v.analysed);
                  }}
                  style={{
                    minHeight: 54,
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: v.analysed ? day.ink : day.surface,
                    borderWidth: 1,
                    borderColor: v.analysed ? day.ink : day.line2,
                  }}
                >
                  <Body style={{ color: v.analysed ? day.onInk : day.ink, fontSize: 16 }}>{v.title}</Body>
                  <Label style={{ color: v.analysed ? day.onInk : day.ink3, marginTop: 2 }}>
                    {(epoch?.label ?? '') + ' · ' + (v.weight === 'helped' ? PAST_COPY['events.helped'] : PAST_COPY['events.hurt'])}
                  </Label>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ paddingBottom: 18 }}>
            <Label style={{ textAlign: 'center', paddingBottom: 6 }}>{String(chosen) + ' of ' + String(target)}</Label>
            <InkButton
              testID="past-choose-continue"
              label={chosen >= target ? 'Go into these' : 'Pick ' + String(target - chosen) + ' more'}
              disabled={chosen < target}
              onPress={() => {
                setProblem(null);
                setPicked(true);
              }}
            />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- move three: what it made of you
  if (step.step === 'analyse') {
    const event = events.find((v) => v.id === step.eventId)!;
    const ready = what.trim().length > 0 && shaped.trim().length > 0 && believe.trim().length > 0;
    return (
      <Studio testID="screen-past-analyse">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top(String(step.done + 1) + ' of ' + String(step.total), stepBack, 'past-analyse-back')}
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 18 }}>
            <Statement testID="past-analyse-title">{event.title}</Statement>

            <View style={{ gap: 8 }}>
              <Label>{PAST_COPY['analyse.one.prompt']}</Label>
              <UserField
                testID="past-what"
                label={PAST_COPY['analyse.one.prompt'] ?? ''}
                labelHidden
                value={what}
                onChangeText={(t) => setWhat(t.slice(0, PAST_WRITE_CEILING))}
                placeholder={PAST_COPY['analyse.one.hint']}
                multiline
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>{PAST_COPY['analyse.two.prompt']}</Label>
              <UserField
                testID="past-shaped"
                label={PAST_COPY['analyse.two.prompt'] ?? ''}
                labelHidden
                value={shaped}
                onChangeText={(t) => setShaped(t.slice(0, PAST_WRITE_CEILING))}
                placeholder={PAST_COPY['analyse.two.hint']}
                multiline
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>{PAST_COPY['analyse.three.prompt']}</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PAST_FRAMINGS.map((f) => (
                  <Chip key={f.id} testID={'past-framing-' + f.id} label={f.label} selected={framingId === f.id} onPress={() => setFramingId(framingId === f.id ? null : f.id)} />
                ))}
              </View>
              <UserField
                testID="past-believe"
                label={PAST_COPY['analyse.three.prompt'] ?? ''}
                labelHidden
                value={believe}
                onChangeText={(t) => setBelieve(t.slice(0, PAST_LINE_CEILING))}
                placeholder={PAST_COPY['analyse.three.hint']}
                multiline
              />
            </View>
          </ScrollView>

          <View style={{ paddingBottom: 18, gap: 4 }}>
            <InkButton
              testID="past-keep"
              label={ready ? 'Keep this one' : 'All three, in your words'}
              disabled={!ready}
              onPress={() => {
                saveAnalysis(event.id, { whatHappened: what, shapedMe: shaped, stillBelieve: believe });
                announce('Kept.');
                setWhat('');
                setShaped('');
                setBelieve('');
                setFramingId(null);
              }}
            />
            <TextButton testID="past-stop" label="Stop here" onPress={leave} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- done: the Book, event by event
  const written = events.filter((v) => v.analysed && v.stillBelieve.trim());
  return (
    <Studio testID="screen-past-done">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        {top('Past', leave, 'past-done-back')}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 16 }}>
          <Statement testID="past-done">{PAST_COPY['join.question']}</Statement>
          {written.map((v) => (
            <View key={v.id} testID={'past-join-' + v.id} style={{ gap: 8, borderTopWidth: 1, borderTopColor: day.line, paddingTop: 14 }}>
              <Label>{v.title}</Label>
              <Body style={{ color: day.ink }}>{v.stillBelieve}</Body>
              {v.safetyRisk === 'none' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip testID={'past-join-yes-' + v.id} label={PAST_COPY['join.yes'] ?? 'Let it join the Book'} selected={v.joinsBook} onPress={() => setJoins(v.id, true)} />
                  <Chip testID={'past-join-no-' + v.id} label={PAST_COPY['join.no'] ?? 'Keep this one to myself'} selected={!v.joinsBook} ghost onPress={() => setJoins(v.id, false)} />
                </View>
              ) : (
                // The one case where the choice is not theirs, said plainly
                // rather than overridden in silence.
                <Body testID={'past-join-held-' + v.id} style={{ fontSize: 13 }}>
                  {PAST_COPY['join.crisisNote']}
                </Body>
              )}
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="past-finish"
            label="Done"
            onPress={() => {
              track({ name: 'volume_finished', volume: 'past' });
              track({ name: 'first_value', kind: 'past_written' });
              clearDraft();
              leave();
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
