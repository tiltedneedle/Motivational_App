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
 * Book, and a line written in crisis is held out whatever they chose — which
 * the screen says, rather than overriding quietly.
 */
import { Redirect, useRouter } from 'expo-router';
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
  type Epoch,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Notice, Rule, Statement, Studio, TextButton, TopBar, UserField, accent, announce, day } from '@morrow/ui';
import { usePlatformBack } from '../src/platform-back';
import { useMorrow } from '../src/store';
import { track, useFirstRunStep } from '../src/analytics';

/** How long a period's own name may be. A label, not a line. */
const PERIOD_LABEL_CEILING = 60;

export default function Past() {
  const router = useRouter();
  const consented = useMorrow((s) => Boolean(s.profile.consentedAt));
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
   * The sitting they left, read once at mount. This is the longest of the
   * three volumes and the one people are likeliest to put down part-way, so
   * putting it down has to cost nothing.
   */
  const [resumed] = useState(() => draft);
  /**
   * Which period is on screen. The person walks them; the app does not decide
   * for them by looking at which one happens to be empty — that made a second
   * event impossible to add, and pulled anyone back to a period they had
   * deliberately left blank.
   */
  const [cursor, setCursor] = useState(() => resumed?.cursor ?? 0);
  /**
   * The picking screen stays until the person presses on. Without this it
   * jumped to the writing the instant the last one was tapped, so its own
   * button was unreachable and a pick could not be reconsidered.
   */
  const [picked, setPicked] = useState(
    () =>
      resumed?.picked ??
      // A finished Past opens finished. Without this it reopened on the
      // picking screen, and one Back there un-finished it: the chooser fell
      // from "Written" to "Picked up" and the next visit demanded the walk.
      pastStep(
        epochs,
        events.map((v) => ({ id: v.id, epochId: v.epochId, title: v.title, weight: v.weight, analysed: v.analysed })),
        events.map((v) => ({ eventId: v.id, whatHappened: v.whatHappened, shapedMe: v.shapedMe, stillBelieve: v.stillBelieve, joinsBook: v.joinsBook })),
        depth,
        listed,
      ).step === 'done',
  );
  /**
   * The age screen, held open by the person rather than by the data. Once
   * the periods were cut the engine never showed it again, so Back from the
   * first period went to the doorway and Begin skipped straight past the
   * age — exactly what somebody who wanted to change it could not do.
   */
  const [ageOpen, setAgeOpen] = useState(false);
  const [age, setAge] = useState(() =>
    resumed?.age != null ? String(resumed.age) : epochs.length ? String(Math.max(...epochs.map((e) => e.toAge))) : '',
  );
  /** Periods renamed on the age screen, by period id, until they are cut. */
  const [labels, setLabels] = useState<Record<string, string>>(() => resumed?.labels ?? {});
  const [title, setTitle] = useState(() => resumed?.title ?? '');
  const [weight, setWeight] = useState<'helped' | 'hurt'>('helped');
  const [what, setWhat] = useState(() => resumed?.writing?.what ?? '');
  const [shaped, setShaped] = useState(() => resumed?.writing?.shaped ?? '');
  const [believe, setBelieve] = useState(() => resumed?.writing?.believe ?? '');
  const [framingId, setFramingId] = useState<string | null>(() => resumed?.writing?.framingId ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  /** Which event the three boxes hold, so a resumed draft cannot land on the wrong one. */
  const [writingFor, setWritingFor] = useState<string | null>(() => resumed?.writing?.eventId ?? null);
  /**
   * Whether this sitting has done anything. A Past opened only to reread, and
   * backed out of, must not leave a "Carry on" on Today behind it.
   */
  const [touched, setTouched] = useState(false);
  const touch = () => setTouched(true);
  const editions = useMorrow((s) => s.books.length);
  /**
   * An event being changed from the closing screen. The engine never returns
   * 'analyse' for a finished event, so the screen holds this itself; a kill
   * mid-change resumes on it, because the draft's writing names the event.
   */
  const [editingId, setEditingId] = useState<string | null>(() => {
    const id = resumed?.writing?.eventId ?? null;
    return id && events.some((v) => v.id === id && v.analysed && v.stillBelieve.trim()) ? id : null;
  });
  const editing = editingId ? (events.find((v) => v.id === editingId) ?? null) : null;

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
   * Which screen is showing is not quite `step.step`: the age screen can be
   * held open over the walk, and the picking screen stands in front of the
   * two steps after it until they press on.
   */
  const showingAge = entered && (step.step === 'age' || ageOpen);
  const choosing = !showingAge && !editing && (step.step === 'choose' || (!picked && (step.step === 'analyse' || step.step === 'done') && listed));
  const showingDone = entered && !showingAge && !choosing && !editing && step.step === 'done';
  const canStepBack = entered && (showingAge || choosing || Boolean(editing) || step.step === 'events' || step.step === 'analyse');

  /** One step back, wherever they are. The bar and the platform share it. */
  const stepBack = () => {
    setProblem(null);
    if (editing) {
      // Back from a change is the closing screen, the change not kept.
      setEditingId(null);
      setWhat('');
      setShaped('');
      setBelieve('');
      setFramingId(null);
      return;
    }
    if (showingAge) {
      setAgeOpen(false);
      setEntered(false);
      return;
    }
    if (step.step === 'events') {
      const index = Math.min(cursor, Math.max(0, epochs.length - 1));
      // Back from the first period is the periods themselves, with the age
      // still in the box — not the doorway.
      if (index > 0) setCursor(index - 1);
      else setAgeOpen(true);
      return;
    }
    if (choosing) {
      setListed(false);
      setPicked(false);
      setCursor(Math.max(0, epochs.length - 1));
      return;
    }
    if (step.step === 'analyse') setPicked(false);
  };

  // The Android button, the iOS edge swipe and the browser's arrow undo one
  // step, the same as the bar's, and only leave once there is nothing left.
  usePlatformBack(canStepBack, stepBack);

  // Written as they go. The method these come from is explicit that its
  // programs are meant to take several sittings, so the walk, the age, the
  // picks and the three boxes all survive the app being killed mid-sentence.
  const analysingId = editing ? editing.id : !showingAge && step.step === 'analyse' ? step.eventId : null;
  useEffect(() => {
    // The closing screen is not a sitting to carry on: a finished Past opens
    // finished on its own, and Today must not offer it.
    if (showingDone) {
      clearDraft();
      return;
    }
    if (!touched && !resumed) return;
    // Nothing cut, nothing typed, nothing renamed: a draft that holds nothing
    // is not a sitting to carry on, whether they are on the doorway or on an
    // empty age screen — and Begin alone must not put one in the store.
    if (epochs.length === 0 && age === '' && Object.keys(labels).length === 0) {
      clearDraft();
      return;
    }
    if (!entered) return;
    saveDraft({
      age: Number.isFinite(Number(age)) && age !== '' ? Number(age) : null,
      cursor,
      picked,
      title,
      labels,
      writing: analysingId ? { eventId: analysingId, what, shaped, believe, framingId } : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingDone, touched, entered, cursor, picked, age, title, labels, analysingId, what, shaped, believe, framingId]);

  // Moving to the next event empties the boxes, and a draft that belonged to
  // some other event never lands in them. Adjusted during the render that
  // sees the new event rather than in an effect after it, so the old lines
  // are never painted under the new title, even for a frame.
  if (analysingId && writingFor !== analysingId) {
    setWritingFor(analysingId);
    setWhat('');
    setShaped('');
    setBelieve('');
    setFramingId(null);
  }

  // Each step says itself once, the way the Interview says each question.
  const said = step.step === 'events' ? String(Math.min(cursor, Math.max(0, epochs.length - 1))) : '';
  useEffect(() => {
    if (!entered) {
      announce(PAST_COPY['doorway.title'] ?? '');
      return;
    }
    if (editing) announce(editing.title + '. ' + (PAST_COPY['join.change'] ?? 'Change this') + '.');
    else if (showingAge) announce(PAST_COPY['age.prompt'] ?? '');
    else if (step.step === 'events') {
      const epoch = epochs[Math.min(cursor, Math.max(0, epochs.length - 1))];
      announce((epoch?.label ? epoch.label + '. ' : '') + (PAST_COPY['events.prompt'] ?? ''));
    } else if (choosing) announce(PAST_COPY['choose.prompt'] ?? '');
    else if (step.step === 'analyse') {
      const ev = events.find((v) => v.id === step.eventId);
      announce((ev?.title ?? '') + '. ' + String(step.done + 1) + ' of ' + String(step.total) + '.');
    } else announce(PAST_COPY['join.question'] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, showingAge, step.step, choosing, analysingId, said, editingId]);

  const top = (where: string, onBack: () => void, testID = 'past-back') => (
    <TopBar back={{ onPress: onBack, testID }} where={where} help={{ onPress: showResources }} />
  );
  const leave = () => router.dismissTo('/today');

  // The gate (PRD §12) stands at every writing door. A link straight to
  // this one goes through it first and comes back here.
  if (!consented) return <Redirect href={'/consent?then=past' as never} />;

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
          <View style={{ paddingTop: 10, paddingBottom: 18, gap: 4 }}>
            <InkButton
              testID="past-begin"
              label={PAST_COPY['doorway.begin'] ?? 'Begin'}
              onPress={() => {
                track({ name: 'volume_opened', volume: 'past', first: epochs.length === 0 });
                touch();
                setEntered(true);
                // Begin is the periods, every time: with the age in the box
                // if it is known, and the periods under it to keep or change.
                setAgeOpen(true);
              }}
            />
            <TextButton testID="past-later" label={PAST_COPY['doorway.later'] ?? 'Another time'} onPress={leave} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  // ---- move one: the periods, cut from their age, and named by them
  if (showingAge) {
    const n = Number(age);
    const ok = Number.isFinite(n) && n >= 10 && n <= 110;
    const preview: Epoch[] = ok ? epochsFor(n, depth) : [];
    const same = epochs.length > 0 && preview.length === epochs.length && preview.every((e, i) => e.id === epochs[i]!.id);
    const labelOf = (e: Epoch) => labels[e.id] ?? epochs.find((x) => x.id === e.id)?.label ?? e.label;
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
              onChangeText={(t) => {
                touch();
                setAge(t.replace(/\D/g, '').slice(0, 3));
              }}
              placeholder="30"
              keyboardType="number-pad"
            />
            <Body style={{ fontSize: 13 }}>{PAST_COPY['age.note']}</Body>

            {preview.length ? (
              <View testID="past-periods" style={{ gap: 10 }}>
                <Rule />
                <Label style={{ color: accent.coralText, marginTop: 8 }}>{PAST_COPY['epochs.title']}</Label>
                <Body style={{ fontSize: 14 }}>{PAST_COPY['epochs.note']}</Body>
                {preview.map((e, i) => (
                  <UserField
                    key={e.id}
                    testID={'past-period-' + e.id}
                    label={'Ages ' + String(e.fromAge) + ' to ' + (i === preview.length - 1 ? 'now' : String(e.toAge))}
                    value={labelOf(e)}
                    onChangeText={(t) => {
                      touch();
                      setLabels((cur) => ({ ...cur, [e.id]: t.slice(0, PERIOD_LABEL_CEILING) }));
                    }}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
          <View style={{ paddingTop: 10, paddingBottom: 18 }}>
            {/* Fewer periods than before: nothing listed is lost, and it says where it goes. */}
            {ok && epochs.length > preview.length && events.length > 0 ? (
              <Body testID="past-recut-note" style={{ fontSize: 13, textAlign: 'center', paddingBottom: 8 }}>
                {'Fewer periods than before. What was listed in the later ones moves to the last.'}
              </Body>
            ) : null}
            <InkButton
              testID="past-age-continue"
              label={
                !ok
                  ? 'Your age, in years'
                  : epochs.length === 0
                    ? 'Cut my life into periods'
                    : same
                      ? 'Keep these periods'
                      : preview.length !== epochs.length
                        ? 'Cut them again, into ' + String(preview.length)
                        : 'Cut them again from this age'
              }
              disabled={!ok}
              onPress={() => {
                touch();
                setEpochs(preview.map((e) => ({ ...e, label: labelOf(e).trim() || e.label })));
                if (!same) setCursor(0);
                setAgeOpen(false);
              }}
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
    const full = here.length >= room;
    const position = index + 1;
    const last = position >= epochs.length;
    const pending = title.trim();
    const add = () => {
      if (!pending) {
        setProblem(PAST_COPY['events.needWords'] ?? 'Give it a few words first.');
        return;
      }
      touch();
      setProblem(null);
      addEvent(epoch.id, pending, weight);
      setTitle('');
    };
    return (
      <Studio testID="screen-past-events">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top(String(position) + ' of ' + String(epochs.length), stepBack, 'past-events-back')}
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Label testID="past-period-label" style={{ color: accent.coralText }}>
                {epoch.label}
              </Label>
              <Statement testID="past-events-prompt">{PAST_COPY['events.prompt']}</Statement>
              <Body style={{ fontSize: 14 }}>{PAST_COPY['events.note'] + ' Up to ' + String(room) + ' from this period.'}</Body>
            </View>

            {here.map((v) => (
              <View key={v.id} testID={'past-event-' + v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: day.line, paddingTop: 10 }}>
                <Body style={{ flex: 1, color: day.ink }}>{v.title}</Body>
                <Label>{v.weight === 'helped' ? PAST_COPY['events.helped'] : PAST_COPY['events.hurt']}</Label>
                <TextButton
                  testID={'past-drop-' + v.id}
                  label="Remove"
                  accessibilityLabel={'Remove ' + v.title}
                  onPress={() => {
                    touch();
                    dropEvent(v.id);
                  }}
                />
              </View>
            ))}

            <Notice testID="past-events-problem" text={problem} />

            {full ? (
              // The cap, said, rather than the field quietly disappearing.
              <Notice testID="past-events-full" text={'That is ' + String(room) + ' for this period. Remove one to add another.'} />
            ) : (
              <View style={{ gap: 8 }}>
                <UserField
                  testID="past-event-title"
                  label={PAST_COPY['events.prompt'] ?? ''}
                  labelHidden
                  value={title}
                  onChangeText={(t) => {
                    touch();
                    setProblem(null);
                    setTitle(t.slice(0, PAST_LINE_CEILING));
                  }}
                  placeholder="In a few words"
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip testID="past-weight-helped" label={PAST_COPY['events.helped'] ?? 'It helped'} selected={weight === 'helped'} onPress={() => setWeight('helped')} />
                  <Chip testID="past-weight-hurt" label={PAST_COPY['events.hurt'] ?? 'It hurt'} selected={weight === 'hurt'} onPress={() => setWeight('hurt')} />
                </View>
                <Chip testID="past-event-add" label={PAST_COPY['events.add'] ?? 'Add an event'} ghost onPress={add} />
              </View>
            )}

            {full ? null : <Body style={{ fontSize: 13 }}>{PAST_COPY['events.empty']}</Body>}
          </ScrollView>

          <View style={{ paddingTop: 10, paddingBottom: 18 }}>
            <InkButton
              testID="past-events-continue"
              label={
                pending && !full
                  ? last
                    ? 'Keep it, then on to the ones that still have weight'
                    : 'Keep it, then next period'
                  : last
                    ? 'On to the ones that still have weight'
                    : 'Next period'
              }
              onPress={() => {
                touch();
                setProblem(null);
                // A title typed and not yet added goes in, rather than out:
                // the big button was the natural next tap, and it lost it.
                if (pending && !full) addEvent(epoch.id, pending, weight);
                // An empty period is a real answer, and nothing is written to
                // stand in for one. An empty walk is not: say so here rather
                // than sending them on to a Book question with nothing in it.
                if (last && events.length === 0 && !(pending && !full)) {
                  setProblem(PAST_COPY['events.needOne'] ?? '');
                  return;
                }
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
  if (choosing) {
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
                    touch();
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
          <View style={{ paddingTop: 10, paddingBottom: 18 }}>
            {/* A ceiling, not a quota: one that still has weight is enough. */}
            <Label testID="past-choose-count" style={{ textAlign: 'center', paddingBottom: 6 }}>
              {String(chosen) + ' of up to ' + String(target)}
            </Label>
            <InkButton
              testID="past-choose-continue"
              label={chosen === 0 ? 'Pick at least one' : chosen === 1 ? 'Go into this one' : 'Go into these ' + String(chosen)}
              disabled={chosen === 0}
              onPress={() => {
                touch();
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
  if (editing || step.step === 'analyse') {
    const event = editing ?? events.find((v) => step.step === 'analyse' && v.id === step.eventId)!;
    const ready = what.trim().length > 0 && shaped.trim().length > 0 && believe.trim().length > 0;
    const where = step.step === 'analyse' && !editing ? String(step.done + 1) + ' of ' + String(step.total) : 'Past · a change';
    return (
      <Studio testID="screen-past-analyse">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          {top(where, stepBack, 'past-analyse-back')}
          <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 18 }}>
            <Statement testID="past-analyse-title">{event.title}</Statement>

            <View style={{ gap: 8 }}>
              <Label>{PAST_COPY['analyse.one.prompt']}</Label>
              <UserField
                testID="past-what"
                label={PAST_COPY['analyse.one.prompt'] ?? ''}
                labelHidden
                value={what}
                onChangeText={(t) => {
                  touch();
                  setWhat(t.slice(0, PAST_WRITE_CEILING));
                }}
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
                onChangeText={(t) => {
                  touch();
                  setShaped(t.slice(0, PAST_WRITE_CEILING));
                }}
                placeholder={PAST_COPY['analyse.two.hint']}
                multiline
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>{PAST_COPY['analyse.three.prompt']}</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PAST_FRAMINGS.map((f) => (
                  <Chip
                    key={f.id}
                    testID={'past-framing-' + f.id}
                    label={f.label}
                    selected={framingId === f.id}
                    onPress={() => {
                      touch();
                      setFramingId(framingId === f.id ? null : f.id);
                    }}
                  />
                ))}
              </View>
              <UserField
                testID="past-believe"
                label={PAST_COPY['analyse.three.prompt'] ?? ''}
                labelHidden
                value={believe}
                onChangeText={(t) => {
                  touch();
                  setBelieve(t.slice(0, PAST_LINE_CEILING));
                }}
                placeholder={PAST_COPY['analyse.three.hint']}
                multiline
              />
            </View>
          </ScrollView>

          <View style={{ paddingTop: 10, paddingBottom: 18, gap: 4 }}>
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
                setEditingId(null);
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
  const finish = () => {
    clearDraft();
    leave();
  };
  return (
    <Studio testID="screen-past-done">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        {top('Past', finish, 'past-done-back')}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 16 }}>
          <Statement testID="past-done">{PAST_COPY['join.question']}</Statement>
          {/* The question decides on all three parts, so all three are here; and which Book, said plainly. */}
          <Body style={{ fontSize: 14 }}>{PAST_COPY['join.parts']}</Body>
          <Body testID="past-done-book" style={{ fontSize: 14 }}>
            {editions ? PAST_COPY['join.nextEdition'] : PAST_COPY['join.noBook']}
          </Body>
          {written.map((v) => (
            <View key={v.id} testID={'past-join-' + v.id} style={{ gap: 8, borderTopWidth: 1, borderTopColor: day.line, paddingTop: 14 }}>
              <Label>{(epochs.find((e) => e.id === v.epochId)?.label ?? '') + ' · ' + v.title}</Label>
              <Body testID={'past-join-what-' + v.id} style={{ color: day.ink }}>
                {v.whatHappened}
              </Body>
              <Body style={{ color: day.ink2 }}>{v.shapedMe}</Body>
              <Body style={{ color: day.ink }}>{v.stillBelieve}</Body>
              <TextButton
                testID={'past-change-' + v.id}
                label={PAST_COPY['join.change'] ?? 'Change this'}
                onPress={() => {
                  touch();
                  setWhat(v.whatHappened);
                  setShaped(v.shapedMe);
                  setBelieve(v.stillBelieve);
                  setFramingId(null);
                  setWritingFor(v.id);
                  setEditingId(v.id);
                }}
              />
              {v.safetyRisk !== 'crisis' ? (
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
        <View style={{ paddingTop: 10, paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="past-finish"
            label="Done"
            onPress={() => {
              track({ name: 'volume_finished', volume: 'past' });
              track({ name: 'first_value', kind: 'past_written' });
              finish();
            }}
          />
          {editions ? <TextButton testID="past-seal" label="Seal a new edition now" onPress={() => router.push('/seal-book')} /> : null}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
