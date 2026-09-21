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
  firstRunHeading,
  firstRunPath,
  firstVisit,
  streakOf,
  weekOf,
  isQuotable,
    presentStanding,
  halfDone,
  reauthorDue,
  reauthorLabel,
  clockLabel,
  hourOf,
  shiftDaysLabel,
} from '@morrow/core';
import {
  Body,
  Card,
  Chip,
  Label,
  PathCard,
  Quoted,
  RoundButton,
  StreakPill,
  TabBar,
  WeekStrip,
  type TabName,
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
  type as fonts,
  useReducedMotion,
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
  useVolumeStates,
  interviewKept,
  latestText,
  pendingLetGo,
} from '../src/store';
import { scheduler } from '../src/notify';

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
  const unshrinkMove = useMorrow((s) => s.unshrinkMove);
  const makeBrief = useMorrow((s) => s.makeBrief);
  const setProfile = useMorrow((s) => s.setProfile);
  const allowNotifications = useMorrow((s) => s.allowNotifications);
  const declineNotifications = useMorrow((s) => s.declineNotifications);
  const [canNotify, setCanNotify] = useState(false);
  useEffect(() => {
    let alive = true;
    void scheduler().then((sched) => {
      if (alive) setCanNotify(sched.real);
    });
    return () => {
      alive = false;
    };
  }, []);
  const firstRun = useFirstRun();
  const presentDraft = useMorrow((s) => s.presentDraft);
  const pastDraft = useMorrow((s) => s.pastDraft);

  /**
   * A volume put down part-way. The Future volume has always had this — its
   * writing room keeps a draft and the path card leads back to it — and the
   * other two now do too, so Today can offer all three the same way.
   *
   * Only one is offered at a time, the one touched last: a screen that lists
   * every unfinished thing is a to-do list, and this is not one.
   */
  const carryOn = useMemo(() => {
    const open = [
      presentDraft
        ? {
            at: presentDraft.updatedAt,
            route: '/present?half=' + presentDraft.half,
            label: presentDraft.half === 'faults' ? 'Carry on with what stops you' : 'Carry on with what you are good at',
          }
        : null,
      pastDraft ? { at: pastDraft.updatedAt, route: '/past' as const, label: 'Carry on with your past' } : null,
    ].filter((x): x is { at: string; route: string; label: string } => x !== null);
    return open.sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  }, [presentDraft, pastDraft]);

  const carryOnRow = carryOn ? (
    <TextButton testID="today-carry-on" label={carryOn.label} onPress={() => router.push(carryOn.route as never)} />
  ) : null;

  /**
   * What is there, when the Future path has not begun but something has. A
   * person who did Present or Past first used to be told "Nothing here yet"
   * over the very row that carried on their sitting. The words come from the
   * same place as the chooser's door marks, so the two screens agree.
   */
  const volumes = useVolumeStates();
  const picksAll = useMorrow((s) => s.presentPicks);
  const sitting = presentDraft ? { half: presentDraft.half, selected: presentDraft.selected } : null;
  const faultsDone = halfDone(picksAll, 'faults', state.profile.track, sitting);
  const virtuesDone = halfDone(picksAll, 'virtues', state.profile.track, sitting);
  const interviewDraft = useMorrow((s) => s.interviewDraft);
  const warmLine = useMorrow((s) => latestText(s.texts, 'warmup')?.body.trim() ?? null);
  const elsewhere = !firstVisit(volumes) || Boolean(presentDraft) || Boolean(pastDraft) || interviewKept(interviewDraft);
  const whatIsThere = (): string => {
    if (volumes.past === 'done' && volumes.present === 'done') return 'Your past and your Present are written.';
    if (volumes.past === 'done') return 'Your past is written.';
    if (volumes.present === 'done') return 'Your Present is written.';
    const half = presentStanding(volumes.present, faultsDone, virtuesDone);
    if (half === 'The faults written') return 'The faults are written.';
    if (half === 'The virtues written') return 'The virtues are written.';
    return 'A session is kept.';
  };
  // Progressive disclosure, keyed on state that already exists: a person on
  // their first Today has a Now card, a check and five tabs to learn. The
  // practices invitation and the consistency score wait for the first sealed
  // day — a score of a first week, on the first morning, was one more thing
  // with nothing behind it.
  const settledIn = Object.values(state.days).some((d) => Boolean(d.sealedAt));

  const today = dayOf(new Date(), state.profile.dayBoundaryHour);
  const reauthor = reauthorDue(state.books, today, state.profile.dayBoundaryHour);
  const entitled = state.profile.entitled === true;
  /** A goal let go since the latest edition: the door to Take it back, or the seal, stays open. */
  const pending = pendingLetGo(state);
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
  const sealedKeys = new Set(days.filter((d) => d.sealedAt).map((d) => d.day));
  const streak = streakOf(sealedKeys, today);
  const week = weekOf(today, sealedKeys);
  const goTab = (tab: TabName) => {
    if (tab === 'book') router.push('/book');
    else if (tab === 'envision') router.push('/envision');
    else if (tab === 'coach') router.push('/coach');
    else if (tab === 'you') router.push('/settings');
  };
  /**
   * From your words (the rebuild): one line of theirs, quotable, offered as
   * something to think on today, with the door to the coach. Chosen by the
   * day so it changes each morning and holds still through it.
   */
  const fromYourWords = (() => {
    const lines = state.analyses.filter((a) => isQuotable(a) && a.line.trim().length >= 12).map((a) => a.line.trim());
    if (!lines.length) return null;
    let h = 0;
    for (let i = 0; i < today.length; i++) h = (h * 31 + today.charCodeAt(i)) >>> 0;
    return lines[h % lines.length] ?? null;
  })();

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
    // Eight seconds, not three and a half: Undo is on this toast, and a
    // person with a screen reader or a tremor needs the time (WCAG 2.2.1);
    // the parked row's own "Put it back" is the undo that never expires.
    const t = setTimeout(() => setToast(null), 8000);
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
    // The path card (the rebuild): where you are on the way to a Book, the
    // five steps with ticks, and one button. It used to be a paragraph and
    // a wall that said "begin".
    const fresh = (firstRun.step === 'setup' || firstRun.step === 'warmup') && !elsewhere;
    const name = state.profile.displayName.trim();
    const path = firstRunPath(firstRun);
    const heading = firstRun.step !== 'setup' ? firstRunHeading(firstRun) : elsewhere ? whatIsThere() : name ? `Hello, ${name}.` : 'Hello.';
    const caption =
      firstRun.step !== 'setup'
        ? firstRunCaption(firstRun, goals.length)
        : elsewhere
          ? interviewKept(interviewDraft)
            ? 'Your answers so far are kept. Begin picks the Interview up at the question you were on.'
            : 'It joins your Book when the Book is finished, at the end of Future. Today itself comes from Future.'
          : 'This is your home screen. Once your Book is written, your day lives here: one move each morning, a word each evening.';
    return (
      <Studio testID="screen-today">
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label testID="today-date">{formatDay(today, { weekday: true })}</Label>
              <StreakPill count={0} testID="today-streak" />
            </View>
            <Rise index={0} reducedMotion={reduced} style={{ gap: 8 }}>
              <Statement testID="today-path">{heading}</Statement>
              <Body testID="today-path-caption">{caption}</Body>
            </Rise>
            <Rise index={1} reducedMotion={reduced}>
              <PathCard
                testID="today-evenings"
                title={
                  fresh
                    ? 'Three short sessions to a Book you wrote.'
                    : firstRun.step === 'interview'
                      ? 'Find your goals, by tapping.'
                      : firstRun.step === 'fifteen'
                        ? 'Fifteen minutes on your future.'
                        : firstRun.step === 'order' || firstRun.step === 'stones'
                          ? 'Plan each goal, one line at a time.'
                          : 'Finish your Book.'
                }
                caption={fresh ? 'About forty minutes in all, tonight or over a few days. You write every word.' : undefined}
                steps={path.steps.map((st) => ({ label: st.label, minutes: st.minutes, done: st.done }))}
                at={path.at}
                cta={{ label: firstRun.label, onPress: () => router.push(firstRun.route as never), testID: 'today-begin' }}
              />
            </Rise>
            {warmLine ? (
              <View testID="today-first-line" style={{ backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 6 }}>
                <Label style={{ color: accent.coralText }}>Your first line</Label>
                <UserText italic numberOfLines={4} style={{ fontSize: 18, lineHeight: 26 }}>{`“${warmLine}”`}</UserText>
                <Label>Kept as you wrote it. It goes with you into the fifteen minutes.</Label>
              </View>
            ) : null}
            {carryOnRow}
            {/* A finished volume is one tap away, not two taps and a door mark away. */}
            {volumes.past === 'done' ? <TextButton testID="today-reread-past" label="Reread your past" onPress={() => router.push('/past')} /> : null}
            {volumes.present === 'done' ? (
              <TextButton testID="today-reread-present" label="Reread your Present" onPress={() => router.push('/present')} />
            ) : faultsDone ? (
              <TextButton testID="today-reread-present" label="Reread the faults" onPress={() => router.push('/present?half=faults')} />
            ) : virtuesDone ? (
              <TextButton testID="today-reread-present" label="Reread the virtues" onPress={() => router.push('/present?half=virtues')} />
            ) : null}
            {/* Today comes from the Future volume, but it is not the only door. */}
            <TextButton testID="today-other-volumes" label={elsewhere ? 'The three volumes' : 'Or start with your past or present'} onPress={() => router.push('/choose')} style={{ alignSelf: 'center' }} />
            {hasSupabase && !state.account ? (
              <TextButton testID="today-bring-back" label="Bring my Book back from my account" onPress={() => router.push('/account')} style={{ alignSelf: 'center' }} />
            ) : null}
          </ScrollView>
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 10 }}>
            <TabBar active="today" onPress={goTab} />
          </View>
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
              actionLabel={toast.kind === 'park' || toast.kind === 'capture' || toast.kind === 'shrink' ? 'Undo' : undefined}
              onAction={() => {
                if (toast.undoId && toast.kind === 'capture') removeEvidence(toast.undoId);
                else if (toast.undoId && toast.kind === 'shrink') unshrinkMove(toast.undoId);
                else if (toast.undoId) setStatus(toast.undoId, 'todo');
                setToast(null);
              }}
            />
          </View>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 168 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
            {/*
              The app's day, not the wall clock's. Somebody writing at half past
              midnight with a 4 a.m. boundary is still in yesterday as far as
              every move, seal and ledger entry is concerned; printing the
              calendar date here had the header say Friday while the entry they
              had just sealed filed itself under Thursday.
            */}
            <Label testID="today-date">{formatDay(today, { weekday: true })}</Label>
            <StreakPill count={streak} testID="today-streak" />
          </View>

          <Rise index={0} reducedMotion={reduced}>
            <Statement style={{ marginTop: 12 }}>{greeting(new Date(), state.profile.displayName)}</Statement>
          </Rise>

          {/* The week, as seven dots: a shape for the days rather than a count of them. */}
          <View style={{ marginTop: 16 }}>
            <WeekStrip testID="today-week" days={week} />
          </View>

          {/* The greeting's own line, before anything that has arrived: a letter or the Sunday card sits under it, not between the greeting and its sentence. */}
          {book ? (
            <Pressable
              testID="today-book-line"
              accessibilityRole="button"
              accessibilityLabel={`“${book.firstSentence}” — You, in the Book. Opens your Book`}
              onPress={() => router.push('/book')}
              style={{ marginTop: 8 }}
            >
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

          {/* A volume left part-way, offered once and never counted. */}
          {carryOnRow ? <View style={{ marginTop: 10, alignItems: 'flex-start' }}>{carryOnRow}</View> : null}

          {/*
            A letter that has arrived (PRD §7.8). Offered once, on the day it
            arrives, and never counted or nagged about: a letter you are
            reminded to read three times is a notification.
          */}
          {unreadLetters > 0 ? (
            <Pressable
              testID="today-letters"
              accessibilityRole="button"
              accessibilityLabel={`${unreadLetters === 1 ? 'A letter' : plural(unreadLetters, 'letter')}: waiting, from the other end of this`}
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
            Day 90 (PRD §7.3): "the dawn brief opens it on day 90 and every 90
            after." A card for the week it belongs to and nothing outside it,
            like Sunday's. On the free plan the door is the paywall, which is
            one of the moments the PRD names; Not now comes straight back here.
          */}
          {reauthor || pending.length ? (
            <Pressable
              testID="today-reauthor"
              accessibilityRole="button"
              accessibilityLabel={
                reauthor
                  ? `${reauthorLabel(reauthor.cycle)}: time to write the Book again`
                  : `Unsealed: ${pending.length === 1 ? 'a goal was' : plural(pending.length, 'goal') + ' were'} let go and no edition sealed since`
              }
              // A let-go waiting goes to the screen that can take it back
              // whatever the plan; the gated branch offers exactly that.
              onPress={() => router.push(entitled || pending.length ? '/reauthor?from=/today' : '/paywall?moment=reauthor&from=/today')}
              style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 6 }}
            >
              <Label style={{ color: accent.coralText }}>{reauthor ? reauthorLabel(reauthor.cycle) : 'Unsealed'}</Label>
              <Body style={{ color: day.ink, fontSize: 16 }}>
                {reauthor
                  ? 'Time to write it again. Two Books, side by side.'
                  : pending.length === 1
                    ? 'A goal was let go and no edition sealed since. Seal it, or take it back.'
                    : `${plural(pending.length, 'goal')} were let go and no edition sealed since. Seal the edition, or take them back.`}
              </Body>
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
              {/* One instruction per line (COGA: separate each instruction). */}
              <Body style={{ color: day.ink }}>Your first move is on the card below, cut from your own line. Tap the stone when it is done.</Body>
              <Body style={{ color: day.ink }}>In the evening, the coral ✓ closes the day: a word, one line of proof, a hold.</Body>
              {/* At the left, clear of the two floating buttons on the right: on a small phone they sat over a full-width chip. */}
              <Chip testID="today-intro-done" label="Got it" onPress={() => setProfile({ todayIntroSeen: true })} style={{ alignSelf: 'flex-start', paddingHorizontal: 24 }} />
            </View>
          ) : null}

          {/*
            Notifications, asked for in words before the OS asks (Apple HIG;
            Growth.Design on stacked requests): what will be sent, and when.
            After the first sealed day, when "tomorrow at seven, your first
            move" is a concrete thing rather than a promise. On the web there
            is nothing to ask for.
          */}
          {book && settledIn && state.profile.todayIntroSeen && !state.profile.notificationsAsked && canNotify ? (
            <View testID="today-notify-primer" style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 10 }}>
              <Label style={{ color: accent.coralText }}>Two notes a day, if you want them</Label>
              <Body style={{ color: day.ink }}>{`${clockLabel(state.profile.wakeTime)} — your first move, in your words.`}</Body>
              <Body style={{ color: day.ink }}>{`${clockLabel(state.profile.eveningTime)} — a line to close the day.`}</Body>
              {state.profile.shiftDays.length ? (
                <Body style={{ color: day.ink }}>
                  {`On ${shiftDaysLabel(state.profile.shiftDays)}, ${clockLabel(state.profile.shiftWakeTime)} and ${clockLabel(state.profile.shiftEveningTime)}${
                    (hourOf(state.profile.shiftEveningTime) ?? 24) < 12 ? ', the night after' : ''
                  }.`}
                </Body>
              ) : null}
              {/* What the planner sends, all of it (PRD §7.11): the two lines, the Sunday reading, one word after three days away. */}
              <Body style={{ fontSize: 13 }}>The Sunday reading, and one line if you have been away three days, are the only others. The times are yours to change under You.</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip testID="today-notify-yes" label="Yes, at those times" onPress={() => void allowNotifications()} />
                <Chip testID="today-notify-no" label="Not now" ghost onPress={declineNotifications} />
              </View>
            </View>
          ) : null}

          {returnCard ? (
            <View testID="return-card" style={{ marginTop: 16, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 10 }}>
              <Label style={{ color: accent.coralText }}>Welcome back</Label>
              <Quoted text={returnCard.body} spans={returnCard.quotes} style={{ color: day.ink }} />
              <Chip label="Start small" onPress={() => setReturnCard(null)} />
            </View>
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
              <Body style={{ fontSize: 13 }}>Said today, and done.</Body>
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
                  {sourceLineFor(now, state.analyses) ? 'Tap the stone when it is done.' : ''}
                </Body>
                {/*
                  The drag and the long press are accelerators; this is the
                  path (WCAG 2.5.1, 2.5.7; Apple HIG: also make a button
                  available). A move with no button for "not today" was one
                  a keyboard or a switch could never set aside.
                */}
                {now.status === 'todo' ? (
                  <TextButton
                    testID="now-not-today"
                    label="Not today"
                    onPress={() => {
                      setStatus(now.id, 'skip');
                      setToast({ text: `${now.title} · not today`, kind: 'park', undoId: now.id });
                    }}
                  />
                ) : null}
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
                {moves.length ? 'Everything placed. Seal the day when you are ready.' : 'Nothing scheduled. One small thing is a whole day.'}
              </Body>
            </View>
          )}

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
                    {m.status === 'skip' ? (
                      // The undo that never expires: the row itself.
                      <TextButton testID={`restore-${m.id}`} label="Put it back" onPress={() => setStatus(m.id, 'todo')} />
                    ) : m.status === 'todo' ? (
                      <TextButton
                        testID={`park-${m.id}`}
                        label="Not today"
                        accessibilityLabel={`Not today, ${m.title}`}
                        onPress={() => {
                          setStatus(m.id, 'skip');
                          setToast({ text: `${m.title} · not today`, kind: 'park', undoId: m.id });
                        }}
                      />
                    ) : (
                      <Label>{m.status === 'done' ? 'done' : m.effort === 'S' ? '10 min' : '25 min'}</Label>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}

          {fromYourWords ? (
            <Pressable
              testID="today-from-your-words"
              accessibilityRole="button"
              accessibilityLabel={`From your words: “${fromYourWords}”. Opens the coach.`}
              onPress={() => router.push('/coach')}
              style={{ marginTop: 22, backgroundColor: day.surface2, borderRadius: radius.card, padding: 18, gap: 6 }}
            >
              <Label style={{ color: accent.coralText }}>From your words</Label>
              <UserText italic style={{ fontSize: 18, lineHeight: 26 }}>{`“${fromYourWords}”`}</UserText>
              <Label>Think on it today · the coach is one tap away</Label>
            </Pressable>
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
            <RoundButton testID="new-move-button" glyph="plus" accessibilityLabel="A new move, or something to keep" onPress={() => router.push('/new-move')} size={50} />
            <RoundButton testID="seal-day-button" glyph="check" accessibilityLabel="Seal the day" onPress={() => router.push('/seal-day')} size={58} primary />
          </View>
          <TabBar active="today" onPress={goTab} />
        </View>
      </SafeAreaView>
    </Studio>
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
