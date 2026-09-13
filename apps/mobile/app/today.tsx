/**
 * Today (PRD §7.6). One honest read: what now?
 * Every goal is a stone; the stone is the check control.
 */
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  consistencyCaption,
  paywallMoment,
  dayOf,
  domainMeta,
  formatDay,
  greeting,
  isReturning,
  plural,
  returnNumberToday,
  returnsLetter,
  scheduleLabel,
  sourceLineFor,
  firstRunCaption,
} from '@morrow/core';
import {
  Body,
  Card,
  Chip,
  InkButton,
  Label,
  Quoted,
  Readout,
  Ring,
  Rise,
  Statement,
  Stone,
  Studio,
  TextButton,
  Toast,
  UserText,
  accent,
  day,
  useHover,
  webHover,
  radius,
  shadow,
  type as fonts,
  useReducedMotion,
  webOnlyStyle,
} from '@morrow/ui';
import { MoveStone } from '../src/components/MoveStone';
import { hasSupabase } from '../src/supabase';
import {
  entitlementOf,
  useConsistency,
  useFirstRun,
  useGoals,
  useLatestBook,
  useMorrow,
  useTodaysMoves,
  useTodaysPractices,
} from '../src/store';

export default function Today() {
  const router = useRouter();
  const reduced = useReducedMotion();
  // The sweep runs only while Today is the screen in front: a loop under a
  // screen that is not showing is battery spent on nothing.
  const focused = useIsFocused();
  const state = useMorrow((s) => s);
  const goals = useGoals();
  const moves = useTodaysMoves();
  const book = useLatestBook();
  const score = useConsistency();
  const practices = useTodaysPractices();
  const allPractices = useMorrow((s) => s.practices).filter((p) => !p.archivedAt);
  const practiceLogs = useMorrow((s) => s.practiceLogs);
  const toast = useMorrow((s) => s.toast);
  const setToast = useMorrow((s) => s.setToast);
  const setStatus = useMorrow((s) => s.setMoveStatus);
  const removeEvidence = useMorrow((s) => s.removeEvidence);
  const makeBrief = useMorrow((s) => s.makeBrief);
  const setProfile = useMorrow((s) => s.setProfile);
  const firstRun = useFirstRun();
  // Progressive disclosure, keyed on state that already exists: a person on
  // their first Today has a Now card, a check and five tabs to learn. The
  // practices invitation and the consistency score wait for the first sealed
  // day — a score of a first week, on the first morning, was one more thing
  // with nothing behind it.
  const settledIn = Object.values(state.days).some((d) => Boolean(d.sealedAt));

  const today = dayOf(new Date(), state.profile.dayBoundaryHour);
  const intendedMoveId = state.days[today]?.intentionMoveId ?? null;
  const isSunday = new Date(`${today}T00:00:00Z`).getUTCDay() === 0;

  // Any the occasions have earned, written on arrival here. Keyed, so calling
  // it on every visit cannot produce a second letter for the same milestone.
  const catchUpLetters = useMorrow((s) => s.catchUpLetters);
  useEffect(() => {
    if (!state.hydrated) return;
    catchUpLetters();
  }, [state.hydrated, catchUpLetters]);
  const unreadLetters = state.letters.filter((l) => !l.readAt && l.deliverAt.slice(0, 10) <= today).length;

  /**
   * The one appearance nobody asked for: once, after the first Blueprint
   * (PRD §7.13). Soft and dismissible, and "Not now" comes straight back here
   * with nothing lost — which is what `from` is for.
   *
   * `paywallMoment` returns null for somebody entitled, somebody who has seen
   * it, and anybody without a Blueprint yet, so this is every moment except
   * exactly one.
   */
  const moment = paywallMoment(entitlementOf(state, today));
  useEffect(() => {
    // Only while Today is the screen in front. Today stays mounted under the
    // path once it has been visited, and the moment the last stone built the
    // first plan this effect pushed the paywall over the Portrait — a screen
    // Today had no business interrupting.
    if (!state.hydrated || !moment || !focused) return;
    router.push(`/paywall?moment=${moment}&from=/today`);
  }, [state.hydrated, moment, router, focused]);
  const intendedMove = intendedMoveId
    ? state.plans.flatMap((p) => p.moves).find((m) => m.id === intendedMoveId)
    : undefined;
  const days = useMemo(() => Object.values(state.days), [state.days]);

  // The return card is decided once, on arrival: a person who reads it and
  // starts small should not have it come back as the day's state changes.
  const [returnCard, setReturnCard] = useState<{ body: string; quotes: string[] } | null>(() => {
    const r = isReturning(days, today);
    if (!r.returning) return null;
    // "Return #n" is the nth time they came back from a gap, not the
    // number of sealed days — and this one is not in the ledger yet.
    const letter = returnsLetter(book, r.gapDays, returnNumberToday(days, today));
    return { body: letter.body, quotes: letter.quotes };
  });

  useEffect(() => {
    makeBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  const open = moves.filter((m) => m.status === 'todo');
  const now = open[0];
  const later = open.slice(1);
  const done = moves.filter((m) => m.status !== 'todo');

  const plansById = useMemo(() => new Map(state.plans.map((p) => [p.goalId, p])), [state.plans]);

  /*
    No Book yet. Whether nothing has been written or half of it has, Today is
    not a Today — there is no plan to draw a Now card from — so it is the
    path: where you are on it, and the one button to the next step. It used
    to show the full screen to somebody with goals and no Book: a goal row,
    no Now, no way to the stones.
  */
  if (!book) {
    return (
      <Studio testID="screen-today">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 14 }}>
          <Stone size={96} domain={goals[0]?.domain ?? 'health'} polish={firstRun.step === 'interview' ? 0.4 : 0.7} sweep={!reduced && focused} style={{ alignSelf: 'center', marginBottom: 10 }} />
          <Statement testID="today-path">{firstRun.step === 'interview' ? 'Nothing here yet, and that is the right starting point.' : 'Your Book is not finished yet.'}</Statement>
          <Body>
            {firstRun.step === 'interview'
              ? 'Three evenings from now there will be a Book, a plan, and a first move for the morning.'
              : firstRunCaption(firstRun, goals.length)}
          </Body>
          <InkButton testID="today-begin" label={firstRun.label} onPress={() => router.push(firstRun.route)} />
          {hasSupabase && !state.account ? (
            <TextButton testID="today-bring-back" label="Bring my Book back from my account" onPress={() => router.push('/account')} />
          ) : null}
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio testID="screen-today">
      <SafeAreaView style={{ flex: 1 }}>
        {toast ? (
          <View style={{ position: 'absolute', top: 8, left: 22, right: 22, zIndex: 20 }}>
            <Toast
              testID="toast"
              text={toast.text}
              actionLabel={toast.kind === 'park' || toast.kind === 'capture' ? 'Undo' : undefined}
              onAction={() => {
                if (toast.undoId && toast.kind === 'capture') removeEvidence(toast.undoId);
                else if (toast.undoId) setStatus(toast.undoId, 'todo');
                setToast(null);
              }}
            />
          </View>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 168 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
            {/*
              The app's day, not the wall clock's. Somebody writing at half past
              midnight with a 4 a.m. boundary is still in yesterday as far as
              every move, seal and ledger entry is concerned; printing the
              calendar date here had the header say Friday while the entry they
              had just sealed filed itself under Thursday.
            */}
            <Label testID="today-date">{formatDay(today, { weekday: true })}</Label>
            <Label>{plural(days.filter((d) => d.sealedAt).length, 'sealed day')}</Label>
          </View>

          <Rise index={0} reducedMotion={reduced}>
            <Statement style={{ marginTop: 12 }}>{greeting(new Date(), state.profile.displayName)}</Statement>
          </Rise>

          {/* The greeting's own line, before anything that has arrived: a letter or the Sunday card sits under it, not between the greeting and its sentence. */}
          {book ? (
            <Pressable testID="today-book-line" onPress={() => router.push('/book')} style={{ marginTop: 8 }}>
              <UserText
                testID="today-book-quote"
                italic
                numberOfLines={2}
                style={{ fontSize: 17, lineHeight: 24, color: day.ink2 }}
              >
                “{book.firstSentence}”
              </UserText>
              <Label style={{ marginTop: 4 }}>You, in the Book</Label>
            </Pressable>
          ) : null}

          {/*
            A letter that has arrived (PRD §7.8). Offered once, on the day it
            arrives, and never counted or nagged about: a letter you are
            reminded to read three times is a notification.
          */}
          {unreadLetters > 0 ? (
            <Pressable
              testID="today-letters"
              accessibilityRole="button"
              accessibilityLabel={`${plural(unreadLetters, 'letter')} waiting`}
              onPress={() => router.push('/letters')}
              style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 6 }}
            >
              <Label style={{ color: accent.coralText }}>
                {unreadLetters === 1 ? 'A letter' : plural(unreadLetters, 'letter')}
              </Label>
              <Body style={{ color: day.ink, fontSize: 16 }}>Waiting, from the other end of this.</Body>
            </Pressable>
          ) : null}

          {/*
            Sunday (PRD §7.3). Offered rather than imposed: it is a card on the
            day it belongs to and nothing on any other, and it is the only place
            in the app that asks for ten minutes rather than two.
          */}
          {book && isSunday ? (
            <Pressable
              testID="today-sunday"
              accessibilityRole="button"
              accessibilityLabel="Sunday reading: ten minutes with the Book"
              onPress={() => router.push('/reading')}
              style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 6 }}
            >
              <Label style={{ color: accent.coralText }}>Sunday</Label>
              <Body style={{ color: day.ink, fontSize: 16 }}>Ten minutes with what you wrote.</Body>
            </Pressable>
          ) : null}

          {/*
            The first Today, explained once. A person arrives here from the
            seal with a Book, a plan and a screen full of new things; without
            this the stone was a picture and the check a mystery, and the
            fastest way to lose somebody is a screen they cannot read.
          */}
          {book && !state.profile.todayIntroSeen ? (
            <View testID="today-intro" style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 10 }}>
              <Label style={{ color: accent.coralText }}>This is Today</Label>
              <Body style={{ color: day.ink }}>
                The stone on the Now card is your first move, cut from your own line. Tap it when it is done; drag it up for not
                today. In the evening the coral check seals the day: a word, one line of proof, a hold. Your Book, the scenes and
                the coach are in the bar below.
              </Body>
              <Chip testID="today-intro-done" label="Got it" onPress={() => setProfile({ todayIntroSeen: true })} />
            </View>
          ) : null}

          {returnCard ? (
            <View testID="return-card" style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 10 }}>
              <Label style={{ color: accent.coralText }}>Welcome back</Label>
              <Quoted text={returnCard.body} spans={returnCard.quotes} style={{ color: day.ink }} />
              <Chip label="Start small" onPress={() => setReturnCard(null)} />
            </View>
          ) : null}

          {/* the goal row: one stone per goal (PRD 7.6), however many; past four it scrolls, bleeding under the gutter */}
          {goals.length ? (
            <Rise index={1} reducedMotion={reduced} style={{ marginTop: 24, marginHorizontal: -22 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingHorizontal: 22 }}
                testID="goal-row"
              >
              {goals.map((g) => {
                const plan = plansById.get(g.id);
                const total = plan?.moves.length ?? 0;
                const doneCount = plan?.moves.filter((m) => m.status === 'done').length ?? 0;
                const pct = total ? doneCount / total : 0;
                return (
                  <GoalStone
                    key={g.id}
                    testID={`goal-chip-${g.id}`}
                    accessibilityLabel={`${g.title}, ${Math.round(pct * 100)} percent`}
                    onPress={() => router.push(`/goal?id=${g.id}`)}
                  >
                    <Ring size={62} progress={pct} color={domainMeta(g.domain).hex} width={3} track={day.line2}>
                      <Stone size={42} domain={g.domain} polish={0.5 + pct * 0.5} />
                    </Ring>
                    <Text numberOfLines={2} style={{ fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 15, color: day.ink2, textAlign: 'center' }}>
                      {g.title}
                    </Text>
                  </GoalStone>
                );
              })}
              </ScrollView>
            </Rise>
          ) : null}

          {/*
            The day is finished. Not an empty screen and not tomorrow's move
            pulled forward — the work that was asked for is closed, and saying
            so is what makes the seal at the end of it mean anything.
          */}
          {!now && done.length > 0 ? (
            <Card
              testID="day-done-card"
              style={{
                marginTop: 22,
                borderRadius: 28,
                padding: 22,
                gap: 8,
              }}
            >
              <Label style={{ color: accent.coralText }}>Done for today</Label>
              <Statement style={{ fontSize: 26, lineHeight: 30 }}>
                {done.filter((m) => m.status === 'done').length === done.length
                  ? 'Everything you asked of today is closed.'
                  : 'Today is closed.'}
              </Statement>
              <Body style={{ fontSize: 14 }}>
                Nothing else is due. The next one is tomorrow, and it will be here then.
              </Body>
              {/*
                The morning intention closes here too. Saying it back on the
                Now card and then forgetting it the moment the day is finished
                would make the ritual look like a to-do list item rather than
                the thing they chose this morning and did.
              */}
              {intendedMove ? (
                <View testID="day-done-intention" style={{ gap: 3, marginTop: 4 }}>
                  <Label style={{ color: accent.coralText }}>You said this one</Label>
                  <UserText style={{ fontSize: 16, lineHeight: 23, color: day.ink2 }}>{intendedMove.title}</UserText>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/*
            The morning's intention, once it is done and something else is
            open. The Now card says it while the move is open and the day-done
            card says it when the day is finished; between the two — the said
            move kept, another one added — it was said nowhere.
          */}
          {now && intendedMove && intendedMove.id !== now.id && intendedMove.status === 'done' ? (
            <View testID="said-and-done" style={{ marginTop: 18, gap: 3 }}>
              <Label style={{ color: accent.coralText }}>You said this one</Label>
              <UserText style={{ fontSize: 16, lineHeight: 23, color: day.ink2, textDecorationLine: 'line-through' }}>
                {intendedMove.title}
              </UserText>
              <Body style={{ fontSize: 13 }}>Said this morning, and done.</Body>
            </View>
          ) : null}

          {/* Now */}
          {now ? (
            <Rise index={2} reducedMotion={reduced}>
            <Card
              testID="now-card"
              style={{
                marginTop: 22,
                borderRadius: 28,
                padding: 22,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                {/*
                  PRD §7.10: the morning intention is one tap in the dawn brief,
                  and this is the other half of it — Today saying so. Nothing
                  counts it and nothing nags about it; the choosing was the
                  ritual, and being remembered is the whole reward for it.
                */}
                <Label style={{ color: accent.coralText }}>{intendedMoveId === now.id ? 'You said this one' : 'Now'}</Label>
                {/* Their sentence, cut from their own line: the serif, as everywhere else. */}
                <UserText style={{ fontSize: 24, lineHeight: 30 }}>{now.title}</UserText>
                {/*
                  When they said they were stuck and took the smaller version,
                  it is shown here rather than written over their title. The
                  title is their sentence; the small version is the app's.
                */}
                {now.doingMinVersion && now.minVersion ? (
                  <Body testID="now-min-version" style={{ fontSize: 15, color: day.ink }}>
                    Today: {now.minVersion}
                  </Body>
                ) : null}
                <Body style={{ fontSize: 14 }}>
                  {sourceLineFor(now, state.analyses) ? 'Tap the stone. Drag it up for not today.' : ''}
                </Body>
              </View>
              <MoveStone
                testID={`stone-${now.id}`}
                size={62}
                hero={focused}
                domain={goals.find((g) => g.id === now.goalId)?.domain ?? 'health'}
                status={now.status}
                label={now.title}
                reducedMotion={reduced}
                onSeat={() => setStatus(now.id, now.status === 'done' ? 'todo' : 'done')}
                onPark={() => {
                  setStatus(now.id, 'skip');
                  setToast({ text: `${now.title} · not today`, kind: 'park', undoId: now.id });
                }}
              />
            </Card>
            </Rise>
          ) : (
            <View testID="all-placed" style={{ marginTop: 22 }}>
              <Body style={{ color: day.ink }}>
                {moves.length ? 'Every stone placed. Seal the day when you are ready.' : 'Nothing scheduled. One small thing is a whole day.'}
              </Body>
            </View>
          )}

          {/* Later */}
          {later.length || done.length ? (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 }}>
                <Label>Later today</Label>
                <Label testID="left-count">{open.length ? `${open.length} left` : 'all placed'}</Label>
              </View>
              {[...later, ...done].map((m) => {
                const g = goals.find((x) => x.id === m.goalId);
                return (
                  <View
                    key={m.id}
                    testID={`row-${m.id}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderTopColor: day.line,
                    }}
                  >
                    <MoveStone
                      testID={`stone-${m.id}`}
                      size={26}
                      domain={g?.domain ?? 'health'}
                      status={m.status}
                      label={m.title}
                      reducedMotion={reduced}
                      onSeat={() => setStatus(m.id, m.status === 'done' ? 'todo' : 'done')}
                      onPark={() => {
                        setStatus(m.id, 'skip');
                        setToast({ text: `${m.title} · not today`, kind: 'park', undoId: m.id });
                      }}
                    />
                    <UserText
                      style={{
                        flex: 1,
                        fontSize: 17,
                        lineHeight: 23,
                        color: m.status === 'todo' ? day.ink : day.ink3,
                        textDecorationLine: m.status === 'done' ? 'line-through' : 'none',
                      }}
                    >
                      {m.title}
                    </UserText>
                    <Label>{m.status === 'skip' ? 'not today' : m.status === 'done' ? 'done' : m.effort === 'S' ? '10 min' : '25 min'}</Label>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/*
            Practices. A routine is one stone that seats in steps rather than a
            list of chores: each tap sinks it a little further, and the ring
            fills one segment per step. Tapping it opens the runner.
          */}
          {practices.length ? (
            <View testID="today-practices" style={{ marginTop: 26, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label>Practices</Label>
                <TextButton testID="today-add-practice" label="Add one" onPress={() => router.push('/practice')} />
              </View>
              {practices.map((practice) => {
                const goal = goals.find((g) => g.id === practice.goalId);
                const total = practice.steps.length || 1;
                const log = practiceLogs.find((l) => l.practiceId === practice.id && l.day === today) ?? null;
                const done = log?.minimal ? total : (log?.stepsDone ?? 0);
                return (
                  <View
                    key={practice.id}
                    testID={`practice-row-${practice.id}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderTopColor: day.line,
                    }}
                  >
                    <MoveStone
                      testID={`practice-stone-${practice.id}`}
                      size={26}
                      domain={goal?.domain ?? 'health'}
                      status={done >= total ? 'done' : 'todo'}
                      steps={{ done: Math.min(done, total), total }}
                      label={practice.title}
                      reducedMotion={reduced}
                      onSeat={() => router.push(`/run?id=${practice.id}`)}
                      onPark={() => router.push(`/run?id=${practice.id}&minimal=1`)}
                    />
                    <Pressable
                      testID={`practice-open-${practice.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${practice.title}, ${done} of ${plural(total, 'step')}. Open the runner.`}
                      onPress={() => router.push(`/run?id=${practice.id}`)}
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.sansMedium,
                          fontSize: 16,
                          color: done >= total ? day.ink2 : day.ink,
                          textDecorationLine: done >= total ? 'line-through' : 'none',
                        }}
                      >
                        {practice.title}
                      </Text>
                      <Body style={{ fontSize: 13 }}>
                        {done >= total ? 'Kept' : `${total} ${total === 1 ? 'step' : 'steps'}`}
                      </Body>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/*
            Two different nothings. No practice at all: say what one is and
            offer to build it. A practice that is not asked for today: say
            when it is, in one line — on a Sunday the explainer for a person
            who has never made a practice was being read by somebody who runs
            three mornings a week.
          */}
          {!practices.length && goals.length && settledIn ? (
            allPractices.length ? (
              <View testID="today-practices-rest" style={{ marginTop: 26, gap: 6 }}>
                <Label>Practices</Label>
                <Body style={{ fontSize: 13 }}>
                  {allPractices.length === 1
                    ? `Nothing today. ${allPractices[0]!.title}: ${scheduleLabel(allPractices[0]!.schedule)}.`
                    : `Nothing today. ${allPractices.map((p) => `${p.title}: ${scheduleLabel(p.schedule)}`).join('; ')}.`}
                </Body>
              </View>
            ) : (
              <View testID="today-no-practices" style={{ marginTop: 26, gap: 6 }}>
                <Label>Practices</Label>
                <Body style={{ fontSize: 13 }}>
                  The things you do rather than finish. Built out of the line you already wrote about how you will do it.
                </Body>
                <Chip testID="today-add-first-practice" label="Add one" ghost onPress={() => router.push('/practice')} />
              </View>
            )
          ) : null}

          {/* Consistency. Tapping it opens the thing it is a summary of. After the first sealed day: before that there is nothing to summarise. */}
          {settledIn ? (
          <Pressable
            testID="today-consistency"
            accessibilityRole="button"
            accessibilityLabel={`Consistency ${score.score}. Open the ledger and the almanac.`}
            onPress={() => router.push('/progress')}
            style={{ marginTop: 30, gap: 8 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Label>Consistency</Label>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Readout testID="consistency">{score.score}</Readout>
                  {/* No "+100" beside a first week: there was nothing to be up from. */}
                  {score.delta !== 0 && score.previous !== 0 ? (
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: score.delta > 0 ? accent.success : day.ink2 }}>
                      {score.delta > 0 ? `+${score.delta}` : score.delta}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Label style={{ paddingBottom: 6 }}>Progress →</Label>
            </View>
            {/* The bar under the number, the width of the page, like a rule. */}
            <View style={{ height: 8, borderRadius: 4, backgroundColor: day.surface2, overflow: 'hidden' }}>
              <View style={{ width: `${score.score}%`, height: '100%', borderRadius: 4, backgroundColor: accent.coral }} />
            </View>
            <Body style={{ fontSize: 13 }}>{consistencyCaption(score)}</Body>
          </Pressable>
          ) : null}
        </ScrollView>

        {/*
          The tab bar (PRD 8.7), and the two controls that belong to Today
          alone. Five words in one white pill, each given the same room; the
          plus and the seal float above the bar's right end so that neither
          the bar nor the fifth tab has to give way to them — with the plus
          and the seal inside the bar, "You" was pushed off the edge of a
          390-point phone.
        */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 10, gap: 12 }}>
          <View pointerEvents="box-none" style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            <FloatingButton
              testID="new-move-button"
              accessibilityLabel="A new move, or something to keep"
              onPress={() => router.push('/new-move')}
              size={50}
              backgroundColor={day.surface}
              borderColor={day.line2}
              shadowWeb={shadow.cardWeb}
              shadowWebHover="0 12px 28px rgba(23,24,28,0.16)"
              shadowNative={shadow.card}
            >
              <Text style={{ color: day.ink, fontSize: 26, lineHeight: 30, fontFamily: fonts.sansMedium }}>+</Text>
            </FloatingButton>
            <FloatingButton
              testID="seal-day-button"
              accessibilityLabel="Seal the day"
              onPress={() => router.push('/seal-day')}
              size={58}
              backgroundColor={accent.coral}
              shadowWeb="0 10px 28px rgba(234,75,46,0.35)"
              shadowWebHover="0 14px 34px rgba(234,75,46,0.48)"
              shadowNative={{ shadowColor: accent.coral, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 26, fontFamily: fonts.sansBold }}>✓</Text>
            </FloatingButton>
          </View>
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 58,
              borderRadius: 29,
              paddingHorizontal: 6,
              backgroundColor: day.surface,
              borderWidth: 1,
              borderColor: day.line2,
              ...(Platform.OS === 'web' ? webOnlyStyle({ boxShadow: shadow.cardWeb }) : shadow.card),
            }}
          >
            <TabButton label="Today" active testID="tab-today" onPress={() => undefined} />
            <TabButton label="Book" testID="tab-book" onPress={() => router.push('/book')} />
            <TabButton label="Envision" testID="tab-envision" onPress={() => router.push('/envision')} />
            <TabButton label="Coach" testID="tab-coach" onPress={() => router.push('/coach')} />
            <TabButton label="You" testID="tab-you" onPress={() => router.push('/settings')} />
          </View>
        </View>
      </SafeAreaView>
    </Studio>
  );
}

/** The round buttons above the tab bar: a lift and a deeper shadow under a pointer, a press down. */
function FloatingButton({
  children,
  onPress,
  accessibilityLabel,
  testID,
  size,
  backgroundColor,
  borderColor,
  shadowWeb,
  shadowWebHover,
  shadowNative,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  size: number;
  backgroundColor: string;
  borderColor?: string;
  shadowWeb: string;
  shadowWebHover: string;
  shadowNative: Record<string, unknown>;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        ...(borderColor ? { borderWidth: 1, borderColor } : {}),
        transform: [{ translateY: hovered && !pressed ? -2 : 0 }, { scale: pressed ? 0.95 : 1 }],
        ...(Platform.OS === 'web'
          ? { ...webOnlyStyle({ boxShadow: hovered && !pressed ? shadowWebHover : shadowWeb }), ...webHover.transition }
          : shadowNative),
      })}
    >
      {children}
    </Pressable>
  );
}

/** A goal's stone on the row: a pressable that rises a little under a pointer. */
function GoalStone({
  children,
  onPress,
  accessibilityLabel,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...hoverProps}
      // Four of these have to share a 320-point screen with 44 points of
      // margin: a fixed 78 each did not, and the fourth stone was pushed
      // off the right edge.
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: 8,
        width: 80,
        transform: [{ translateY: hovered && !pressed ? -2 : 0 }, { scale: pressed ? 0.96 : 1 }],
        ...(Platform.OS === 'web' ? webHover.transition : {}),
      })}
    >
      {children}
    </Pressable>
  );
}

function TabButton({ label, active, onPress, testID }: { label: string; active?: boolean; onPress: () => void; testID?: string }) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      aria-selected={Boolean(active)}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        // The pill under the active tab; a fainter one under the pointer.
        backgroundColor: active ? day.surface2 : hovered ? day.line2 : 'transparent',
        opacity: pressed ? 0.7 : 1,
        ...(Platform.OS === 'web' ? webHover.transition : {}),
      })}
    >
      <Text numberOfLines={1} style={{ fontFamily: active ? fonts.sansSemi : fonts.sansMedium, fontSize: 13, lineHeight: 16, color: active ? day.ink : day.ink2 }}>
        {label}
      </Text>
    </Pressable>
  );
}
