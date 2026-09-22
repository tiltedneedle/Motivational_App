/**
 * Settings, export and delete (PRD §7.12). Everything is exportable and
 * everything is deletable, in the app, without asking anyone.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hourOf, boundaryFor, HELPLINES, bookToText, formatDay, plural, sealedOn, type Moment, CHRONOTYPES, DAY_ENDS, EVENING_TIMES, MORNING_TIMES, SUNDAY_HOURS, chronotypeOf, clockLabel, type Profile, SHIFT_EVENINGS, SHIFT_MORNINGS, WEEKDAY_NAMES, WEEK_ORDER, shiftDaysLabel } from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, accent, day, TopBar } from '@morrow/ui';
import { manageSubscriptionUrl } from '../src/billing';
import { useLatestBook, useMorrow, useSnapshot } from '../src/store';
import { FloatingTabs, TAB_BAR_ROOM } from '../src/tabs';
import { takeAway, takeawayNote } from '../src/takeaway';
import { hasSupabase } from '../src/supabase';
import { clearQuarantine, storageFailure } from '../src/storage';
import { clearAnalyticsId } from '../src/analytics';
import { openHelpline as dial } from '../src/dial';

/**
 * The moments, in the words the person would use for them.
 *
 * Keyed by the id the planner uses, so the list on screen is derived from what
 * is actually muted rather than from a parallel array that has to be kept in
 * the same order — which is exactly the sort of pairing that drifts and then
 * tells somebody the evening line is off when it is the morning one.
 */
const MOMENT_WORDS: Record<Moment, string> = {
  wake: 'the morning',
  evening: 'the evening',
  sunday: 'Sunday',
  milestone: 'milestones',
  return: 'a word after a gap',
};
const ALL_MOMENTS = Object.keys(MOMENT_WORDS) as Moment[];

export default function Settings() {
  const router = useRouter();
  const state = useSnapshot();
  const setProfile = useMorrow((s) => s.setProfile);
  const reset = useMorrow((s) => s.reset);
  const storageError = useMorrow((s) => s.storageError);
  // When this device last copied to an account, if ever: signed out, the
  // account still holds that copy, and "nowhere else" would be untrue.
  const copiedBefore = useMorrow((s) => Object.values(s.lastSync).sort().reverse()[0] ?? null);
  // Only an unreadable store blocks a delete (its writes are dropped); after
  // a failed write the store still saves, and the delete would land.
  const storeUnreadable = storageError && storageFailure()?.kind === 'read';
  const fewerNotifications = useMorrow((s) => s.fewerNotifications);
  const account = useMorrow((s) => s.account);
  const restore = useMorrow((s) => s.restore);
  const syncNotifications = useMorrow((s) => s.syncNotifications);
  /** A time changed is a schedule changed; the notices move with it. */
  const setTimes = (patch: Partial<Pick<Profile, 'wakeTime' | 'eveningTime' | 'sundayHour' | 'dayBoundaryHour' | 'shiftDays' | 'shiftWakeTime' | 'shiftEveningTime'>>) => {
    // A shift evening in the small hours and the hour the day ends at have
    // to agree, or the evening's seal lands on the next day's column. Whichever
    // was just chosen wins: a later evening moves the boundary up; an earlier
    // boundary moves the evening back to half past midnight.
    const next = { ...state.profile, ...patch };
    const needed = boundaryFor(next.shiftEveningTime, next.dayBoundaryHour);
    const reconciled =
      needed === null
        ? patch
        : patch.dayBoundaryHour !== undefined
          ? { ...patch, shiftEveningTime: '00:30' }
          : { ...patch, dayBoundaryHour: needed };
    setProfile(reconciled);
    void syncNotifications();
  };
  const pushToAccount = useMorrow((s) => s.pushToAccount);
  const allowNotifications = useMorrow((s) => s.allowNotifications);
  const signOutAccount = useMorrow((s) => s.signOutAccount);
  const deleteAccountAndCopy = useMorrow((s) => s.deleteAccountAndCopy);
  const [accountNote, setAccountNote] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [confirmingAccount, setConfirmingAccount] = useState(false);

  const [accountConflict, setAccountConflict] = useState(false);
  const resolveSignIn = useMorrow((s) => s.resolveSignIn);
  const backUp = async () => {
    setAccountBusy(true);
    setAccountNote(null);
    const out = await pushToAccount();
    setAccountBusy(false);
    setAccountConflict(!out.ok && out.conflict === true);
    setAccountNote(out.ok ? 'Copied. The Book has a second home.' : out.error);
  };
  /** Another device copied since: bring its copy here, or replace it with this one. */
  const settle = async (choice: 'pull' | 'push') => {
    setAccountBusy(true);
    setAccountNote(null);
    const out = await resolveSignIn(choice);
    setAccountBusy(false);
    setAccountConflict(false);
    setAccountNote(out.ok ? (out.pulled ? 'Brought here. This phone now holds the account’s copy.' : 'Copied. The account now holds this phone’s writing.') : out.error);
  };

  const removeAccount = async () => {
    setAccountBusy(true);
    setAccountNote(null);
    const out = await deleteAccountAndCopy();
    setAccountBusy(false);
    setConfirmingAccount(false);
    setAccountNote(
      out.ok
        ? 'The account is closed and its copy will be gone within seven days. Everything is still on this phone.'
        : out.error,
    );
  };
  const muted = (state.profile.mutedMoments ?? []) as Moment[];
  const left = ALL_MOMENTS.filter((m) => !muted.includes(m));
  const book = useLatestBook();
  const [confirming, setConfirming] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [dialFailed, setDialFailed] = useState<string | null>(null);

  /**
   * Same shape as the one on the resources card, and for the same reason:
   * `openURL` resolves on the web whether or not anything handled it, so
   * waiting for a rejection that never comes left somebody tapping a number
   * that quietly did nothing.
   */
  const openHelpline = async (contact: string) => {
    const took = await dial(contact);
    setDialFailed(took ? null : contact);
  };

  const exportAll = async () => {
    // Read at the moment of the tap, drafts included: the screen's own
    // snapshot leaves the drafts out of what re-renders it.
    const state = useMorrow.getState();
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: state.profile,
      goals: state.goals,
      analyses: state.analyses,
      texts: state.texts,
      // A sitting still in progress is the writing most worth getting out, and
      // it was the one thing this left behind. The storage banner offers this
      // export as "copy out what is open"; without these it copied out
      // everything except what was open.
      drafts: state.drafts,
      practices: state.practices,
      practiceLogs: state.practiceLogs,
      scenes: state.scenes,
      books: state.books,
      portraits: state.portraits,
      plans: state.plans,
      evidence: state.evidence,
      days: state.days,
      // Letters are theirs twice over: the ones they wrote to themselves, and
      // the ones written to them out of their own lines. Neither was in here.
      letters: state.letters,
      briefs: state.briefs,
      // The other two volumes, and their sittings in progress. The Past
      // volume's copy promises a held line "still exports"; without these it
      // did not, and a person who did Past first had no Book to carry it.
      presentPicks: state.presentPicks,
      pastEpochs: state.pastEpochs,
      // What they changed about what is said about them (PRD §7.9): a line in
      // their own words is theirs, and was the one thing this left behind.
      memoryEdits: state.memoryEdits,
      letGoDrafts: state.letGoDrafts,
      memoryDraft: state.memoryDraft,
      pastEvents: state.pastEvents,
      pastListed: state.pastListed,
      presentDraft: state.presentDraft,
      pastDraft: state.pastDraft,
      // And the Future volume's own unsealed words: the Interview mid-way, the
      // read-back rows, the spine and the last line — typed, and not yet in
      // any Book when a seal is refused or the storage banner sends them here.
      // Kept out on purpose: the account session and what has been asked.
      interviewDraft: state.interviewDraft,
      stoneDraft: state.stoneDraft,
      dayDraft: state.dayDraft,
      readBackDraft: state.readBackDraft,
      bookTitle: state.bookTitle,
      bookTitleFraming: state.bookTitleFraming,
      iWill: state.iWill,
    };
    const message = book ? `${bookToText(book)}\n\n---\n${JSON.stringify(payload, null, 2)}` : JSON.stringify(payload, null, 2);
    // The sheet, a file, or the clipboard — whichever this device has. The
    // button used to do nothing at all on a browser with no share sheet, on
    // the one screen that promises the person their writing is theirs to
    // take away.
    const out = await takeAway(message, 'Morrow export', 'morrow-export.txt');
    setExportError(out.ok ? (out.how === 'shared' ? null : takeawayNote(out, 'everything')) : out.error);
  };

  return (
    <Studio testID="screen-settings">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: () => router.dismissTo('/today'), testID: 'settings-back' }} where="You" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, paddingBottom: 18 + TAB_BAR_ROOM, gap: 22 }}>
          <Statement>What Morrow knows about you.</Statement>
          <Body>
            {plural(state.texts.length, 'piece')} of writing, {plural(state.goals.length, 'goal')},{' '}
            {plural(state.analyses.length, 'line')}, {plural(state.presentPicks.length, 'card')} of Present,{' '}
            {plural(state.pastEvents.length, 'event')} of Past, {plural(state.books.length, 'edition')} of the Book. All of it
            on this device.
          </Body>
          {/* PRD §7.9, §7.12: the memory profile, line by line, theirs to change or forget. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip testID="settings-memory" label="Every line, and what to forget" ghost onPress={() => router.push('/memory')} />
          </View>

          <View style={{ gap: 10 }}>
            <Label>Depth</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['starter', 'full'] as const).map((t) => (
                <Chip
                  key={t}
                  testID={`settings-track-${t}`}
                  label={t === 'starter' ? 'Starter' : 'Full'}
                  selected={state.profile.track === t}
                  onPress={() => setProfile({ track: t })}
                />
              ))}
            </View>
            <Body style={{ fontSize: 13 }}>Nothing you have written is lost by switching.</Body>
          </View>

          <View style={{ gap: 10 }}>
            <Label>How you are spoken to</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['gentle', 'straight', 'fierce'] as const).map((p) => (
                <Chip
                  key={p}
                  testID={`settings-persona-${p}`}
                  label={`${p[0]!.toUpperCase()}${p.slice(1)}`}
                  selected={state.profile.persona === p}
                  onPress={() => setProfile({ persona: p })}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Label>The studio</Label>
            {/* PRD 7.14: the day studio, the night studio, or whichever the system is in. */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['system', 'light', 'dark'] as const).map((a) => (
                <Chip
                  key={a}
                  testID={`settings-appearance-${a}`}
                  label={a === 'system' ? 'With the system' : a === 'light' ? 'Day' : 'Night'}
                  selected={(state.profile.appearance ?? 'system') === a}
                  onPress={() => setProfile({ appearance: a })}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Label>The feel of it</Label>
            {/* A stone seating and a seal completing are felt as well as seen; this is the off switch. */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip
                testID="settings-haptics-on"
                label="Haptics on"
                selected={state.profile.hapticsOn !== false}
                onPress={() => setProfile({ hapticsOn: true })}
              />
              <Chip
                testID="settings-haptics-off"
                label="Off"
                selected={state.profile.hapticsOn === false}
                onPress={() => setProfile({ hapticsOn: false })}
              />
            </View>
          </View>

          <Rule />
          {/*
            PRD §7.12: wake and evening times, the Sunday hour, the day boundary,
            and the chronotype as a preset over them. Chips, not pickers: the
            app's other choices are all taps, and a time to the half hour is
            what a morning line needs. Quiet hours follow these (§7.11), so
            the morning line comes at the morning and not at seven regardless.
            Today promised "the times are yours to change under You" before
            there was anywhere to change them.
          */}
          <View style={{ gap: 12 }}>
            <Label>Your day</Label>
            <Body testID="day-times" style={{ fontSize: 14 }}>
              {`The morning line at ${clockLabel(state.profile.wakeTime)}, the evening line at ${clockLabel(state.profile.eveningTime)}, the Sunday reading at ${state.profile.sundayHour}. Quiet from an hour after the evening line until the morning one.${
                state.profile.shiftDays.length
                  ? ` On ${shiftDaysLabel(state.profile.shiftDays)}, the morning line at ${clockLabel(state.profile.shiftWakeTime)} and the evening line at ${clockLabel(state.profile.shiftEveningTime)}${
                      (hourOf(state.profile.shiftEveningTime) ?? 24) < 12 ? `, the night after; the day ends at ${state.profile.dayBoundaryHour} in the morning so it still counts as that day` : ''
                    }.`
                  : ''
              }`}
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CHRONOTYPES.map((c) => (
                <Chip
                  key={c.id}
                  testID={`day-type-${c.id}`}
                  label={c.label}
                  selected={chronotypeOf(state.profile) === c.id}
                  onPress={() => setTimes({ wakeTime: c.wakeTime, eveningTime: c.eveningTime, sundayHour: c.sundayHour })}
                />
              ))}
            </View>
            <View style={{ gap: 6 }}>
              <Label style={{ fontSize: 11 }}>Morning</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MORNING_TIMES.map((t) => (
                  <Chip key={t} testID={`day-morning-${t}`} label={clockLabel(t)} selected={state.profile.wakeTime === t} onPress={() => setTimes({ wakeTime: t })} />
                ))}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Label style={{ fontSize: 11 }}>Evening</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EVENING_TIMES.map((t) => (
                  <Chip key={t} testID={`day-evening-${t}`} label={clockLabel(t)} selected={state.profile.eveningTime === t} onPress={() => setTimes({ eveningTime: t })} />
                ))}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Label style={{ fontSize: 11 }}>Sunday</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUNDAY_HOURS.map((h) => (
                  <Chip key={h} testID={`day-sunday-${h}`} label={`${h}:00`} selected={state.profile.sundayHour === h} onPress={() => setTimes({ sundayHour: h })} />
                ))}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Label style={{ fontSize: 11 }}>A day ends at</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAY_ENDS.map((h) => (
                  <Chip key={h} testID={`day-ends-${h}`} label={`${h} in the morning`} selected={state.profile.dayBoundaryHour === h} onPress={() => setTimes({ dayBoundaryHour: h })} />
                ))}
              </View>
              <Body style={{ fontSize: 13 }}>A night that runs past midnight still belongs to the evening before, until then.</Body>
            </View>
            {/*
              The shift calendar (PRD §7.12). Some days keep other hours: the
              days are ticked, and the hours they keep sit under them. The
              planner, the brief and the quiet hours all ask for the day's own
              pair, so a night-shift Tuesday hears its morning line at one in
              the afternoon and its quiet runs through the morning.
            */}
            <View style={{ gap: 6 }}>
              <Label style={{ fontSize: 11 }}>Shift days</Label>
              <Body style={{ fontSize: 13 }}>Days that keep other hours.</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {WEEK_ORDER.map((d) => (
                  <Chip
                    key={d}
                    testID={`day-shift-${d}`}
                    label={WEEKDAY_NAMES[d].slice(0, 3)}
                    accessibilityLabel={`${WEEKDAY_NAMES[d].slice(0, 3)}, ${WEEKDAY_NAMES[d]} keeps the shift's hours`}
                    role="checkbox"
                    selected={state.profile.shiftDays.includes(d)}
                   
                    onPress={() =>
                      setTimes({
                        shiftDays: state.profile.shiftDays.includes(d)
                          ? state.profile.shiftDays.filter((x) => x !== d)
                          : [...state.profile.shiftDays, d].sort((a, b) => a - b),
                      })
                    }
                  />
                ))}
              </View>
              {state.profile.shiftDays.length ? (
                <View testID="day-shift-times" style={{ gap: 6, marginTop: 4 }}>
                  <Label style={{ fontSize: 11 }}>On those days, morning</Label>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {SHIFT_MORNINGS.map((t) => (
                      <Chip key={t} testID={`day-shift-morning-${t}`} label={clockLabel(t)} selected={state.profile.shiftWakeTime === t} onPress={() => setTimes({ shiftWakeTime: t })} />
                    ))}
                  </View>
                  <Label style={{ fontSize: 11 }}>And evening</Label>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {SHIFT_EVENINGS.map((t) => (
                      <Chip key={t} testID={`day-shift-evening-${t}`} label={clockLabel(t)} selected={state.profile.shiftEveningTime === t} onPress={() => setTimes({ shiftEveningTime: t })} />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <Rule />
          {/*
            PRD §7.11. One control rather than five switches: the steps are
            ordered by how unwelcome each moment is, so "fewer" is a direction
            somebody can hold down until it is quiet enough, and it says in
            words what is left rather than showing a row of toggles.
          */}
          <View style={{ gap: 10 }}>
            <Label>When Morrow speaks</Label>
            {Platform.OS === 'web' ? (
              <Body testID="notify-web-note" style={{ fontSize: 13, color: day.ink2 }}>
                A browser cannot send these; the phone app can, and the choice below is kept for it.
              </Body>
            ) : null}
            <Body testID="notify-state" style={{ fontSize: 14 }}>
              {state.profile.notificationsOff
                ? 'Nothing. You will hear from it when you open it, and not before.'
                : muted.length === 0
                  ? 'A line in the morning, one in the evening, the Sunday reading, and a milestone when one lands. Never inside quiet hours, and never a count of what you missed.'
                  : `${plural(left.length, 'moment')} left: ${left.map((m) => MOMENT_WORDS[m]).join(', ')}.`}
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {state.profile.notificationsOff ? (
                <Chip
                  testID="notify-on"
                  label="Turn them back on"
                  onPress={() => {
                    setProfile({ mutedMoments: [] });
                    void allowNotifications();
                  }}
                />
              ) : (
                <Chip testID="notify-fewer" label="Fewer" ghost onPress={() => fewerNotifications()} />
              )}
            </View>
          </View>

          <Rule />
          {/* The other two volumes, for whoever started with one of them. */}
          <View style={{ gap: 6 }}>
            <Label>Past, present and future</Label>
            <Body style={{ fontSize: 14 }}>Three ways to write about the same life. Any of them can be picked up at any time, and doing one does not change another.</Body>
            <Chip testID="settings-volumes" label="See the three" ghost onPress={() => router.push('/choose')} />
          </View>

          <Rule />
          {/* Morrow Pro (PRD §7.13): manage or restore, on the platform's own page. */}
          <View style={{ gap: 6 }}>
            <Label>Morrow Pro</Label>
            <Body style={{ fontSize: 14 }}>
              The Interview, the fifteen minutes, the Book and its export are free forever. A subscription is changed or cancelled on your phone’s own subscription page, never here.
            </Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip testID="settings-manage-subscription" label="Manage subscription" ghost onPress={() => void Linking.openURL(manageSubscriptionUrl())} />
              <Chip testID="settings-restore" label="Restore purchases" ghost onPress={() => void restore()} />
            </View>
          </View>

          <Rule />
          {/* The Declaration (PRD §7.17). One witness or nobody; the only social surface there is. */}
          <View style={{ gap: 6 }}>
            <Label>The Declaration</Label>
            <Body style={{ fontSize: 14 }}>
              {state.profile.witnessName
                ? 'Your witness is ' + state.profile.witnessName + '. They get what you send them and nothing else.'
                : 'Your line across your own face, for you alone or for one person you name. No feed.'}
            </Body>
            <Chip testID="settings-declare" label={state.profile.declaredAt ? 'Make it again' : 'Make it'} ghost onPress={() => router.push('/declare')} />
          </View>

          <Rule />
          {/* Welcome, again. It never comes back on its own once it has been seen. */}
          <View style={{ gap: 6 }}>
            <Label>The introduction</Label>
            <Body style={{ fontSize: 14 }}>The screen from the first launch: what this is, and the two doors in.</Body>
            <Chip testID="settings-intro" label="See the introduction again" ghost onPress={() => router.push('/?intro=1')} />
          </View>

          <Rule />
          {/* The other half of PRD §11.6's disclosure. The first is on the Coach. */}
          <View style={{ gap: 6 }}>
            <Label>About the coach</Label>
            <Body testID="settings-is-ai" style={{ fontSize: 14 }}>
              Morrow’s coach is software, not a person. It asks and it quotes you. It never writes a goal, a plan line or a sentence of
              your Book — and if it produces text that is not yours, the app throws it away rather than showing it to
              you.
            </Body>
          </View>

          <Rule />
          {/*
            The helplines, findable without being in crisis.

            They lived in one place: the card the safety screen raises. So the
            only way to reach a number was to already be having the worst
            evening of your life — and the concern band's one line says "one of
            the lines in Settings", which was a promise the app did not keep.
            Nothing here is gated, logged, or counted.
          */}
          <View style={{ gap: 10 }}>
            <Label>If you need someone</Label>
            <Body style={{ fontSize: 13 }}>
              Here whether or not anything is wrong. Nothing you do on this screen is recorded.
            </Body>
            {HELPLINES.map((h) => (
              <Pressable
                key={h.region}
                testID={`settings-helpline-${h.region}`}
                accessibilityRole="link"
                accessibilityLabel={`${h.name}, ${h.region}: ${h.contact}`}
                onPress={() => openHelpline(h.contact)}
                style={{ paddingVertical: 8 }}
              >
                <Body style={{ color: day.ink }}>{h.name}</Body>
                <Body selectable style={{ fontSize: 15, color: accent.coralText }}>
                  {h.contact}
                  <Body style={{ fontSize: 13, color: day.ink2 }}>{`  ${h.region}`}</Body>
                </Body>
              </Pressable>
            ))}
            {dialFailed ? (
              <Body testID="settings-dial-failed" style={{ fontSize: 13, color: day.ink }}>
                {`This device would not dial ${dialFailed}. The number is above and can be selected and copied.`}
              </Body>
            ) : Platform.OS === 'web' ? (
              <Body style={{ fontSize: 13, color: day.ink2 }}>
                On a computer these numbers may not dial. Every one of them can be selected and copied.
              </Body>
            ) : null}
          </View>

          {/*
            The account (PRD §7.12). Never a gate: a build with no account
            service shows nothing here, and one with a service says plainly
            what the account is for and where things stand. The "quiet
            banner" for a declined account is the second line below.
          */}
          {hasSupabase ? (
            <>
              <Rule />
              <View testID="settings-account" style={{ gap: 10 }}>
                <Label>A copy, off this phone</Label>
                {account ? (
                  <>
                    <Body testID="settings-account-who" style={{ fontSize: 14, color: day.ink }}>
                      Signed in{account.email ? ` as ${account.email}` : ''}.{' '}
                      {account.lastPushAt
                        ? `Last copied ${formatDay(sealedOn(account.lastPushAt, state.profile.dayBoundaryHour))}.`
                        : 'Nothing copied yet.'}
                    </Body>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Chip testID="settings-account-push" label={accountBusy ? 'Copying…' : 'Copy it now'} onPress={() => void backUp()} />
                      <Chip testID="settings-account-signout" label="Sign out" ghost onPress={() => void signOutAccount()} />
                    </View>
                    {accountConflict ? (
                      <View testID="settings-account-conflict" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <Chip testID="settings-account-pull" label="Bring that copy here" onPress={() => void settle('pull')} />
                        <Chip testID="settings-account-replace" label="Replace it with this phone’s" ghost onPress={() => void settle('push')} />
                      </View>
                    ) : null}
                    {confirmingAccount ? (
                      <View style={{ gap: 8, backgroundColor: day.surface2, padding: 16, borderRadius: 18 }}>
                        <Body style={{ color: day.ink }}>
                          This closes the account and deletes its copy of your writing within seven days. Nothing on
                          this phone is touched.
                        </Body>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Chip label="Keep it" onPress={() => setConfirmingAccount(false)} />
                          <Chip testID="settings-account-delete-confirm" label="Close the account" selected onPress={() => void removeAccount()} />
                        </View>
                      </View>
                    ) : (
                      <TextButton testID="settings-account-delete" label="Close the account and delete its copy" onPress={() => setConfirmingAccount(true)} />
                    )}
                  </>
                ) : (
                  <>
                    <Body testID="settings-account-none" style={{ fontSize: 14, color: day.ink }}>
                      {copiedBefore
                        ? `Signed out. The account still holds the copy made ${formatDay(copiedBefore.slice(0, 10))}. Sign in and choose Close the account to delete it.`
                        : 'Not signed in. Everything is on this phone and nowhere else; a lost phone loses the Book.'}
                    </Body>
                    <Chip testID="settings-account-signin" label="Sign in" onPress={() => router.push('/signin')} />
                  </>
                )}
                {accountNote ? (
                  <Body testID="settings-account-note" style={{ fontSize: 13, color: day.ink }}>
                    {accountNote}
                  </Body>
                ) : null}
              </View>
            </>
          ) : null}

          <Rule />
          <View style={{ gap: 10 }}>
            <Label>Your data</Label>
            <InkButton testID="settings-export" label="Export everything" onPress={exportAll} />
            {exportError ? (
              <Body testID="settings-export-error" style={{ color: day.ink }}>
                {exportError}
              </Body>
            ) : null}
            {confirming ? (
              <View style={{ gap: 8, backgroundColor: day.surface2, padding: 16, borderRadius: 18 }}>
                <Body style={{ color: day.ink }}>
                  This deletes your writing, your goals and every edition of the Book on this device. It cannot be undone.
                </Body>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip testID="settings-delete-cancel" label="Keep it" onPress={() => setConfirming(false)} />
                  <Chip
                    testID="settings-delete-confirm"
                    label="Delete everything"
                    selected
                    onPress={() => {
                      // The session goes with it, or the next launch would
                      // adopt it again and copy an empty device's defaults
                      // over the account.
                      void signOutAccount().finally(() => {
                        reset();
                        // The copies kept when storage failed, and the
                        // analytics id, go with it: "nothing remains on this
                        // device" has to be true of both.
                        void clearQuarantine();
                        void clearAnalyticsId();
                        setConfirming(false);
                        router.replace('/');
                      });
                    }}
                  />
                </View>
              </View>
            ) : (
              storeUnreadable ? (
                <Body testID="settings-delete-blocked" style={{ fontSize: 13 }}>
                  Nothing is being saved on this device right now, so nothing can be deleted from it either. Copy out what is open first; the banner at the top has the way out.
                </Body>
              ) : (
                <TextButton testID="settings-delete" label="Delete everything" onPress={() => setConfirming(true)} />
              )
            )}
          </View>
        </ScrollView>
        <FloatingTabs active="you" />
      </SafeAreaView>
    </Studio>
  );
}
