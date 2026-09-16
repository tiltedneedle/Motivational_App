/**
 * Settings, export and delete (PRD §7.12). Everything is exportable and
 * everything is deletable, in the app, without asking anyone.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HELPLINES, bookToText, formatDay, plural, sealedOn, type Moment } from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, accent, day, TopBar } from '@morrow/ui';
import { useLatestBook, useMorrow } from '../src/store';
import { hasSupabase } from '../src/supabase';

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
  const state = useMorrow((s) => s);
  const setProfile = useMorrow((s) => s.setProfile);
  const reset = useMorrow((s) => s.reset);
  const fewerNotifications = useMorrow((s) => s.fewerNotifications);
  const account = useMorrow((s) => s.account);
  const pushToAccount = useMorrow((s) => s.pushToAccount);
  const allowNotifications = useMorrow((s) => s.allowNotifications);
  const signOutAccount = useMorrow((s) => s.signOutAccount);
  const deleteAccountAndCopy = useMorrow((s) => s.deleteAccountAndCopy);
  const [accountNote, setAccountNote] = useState<string | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [confirmingAccount, setConfirmingAccount] = useState(false);

  const backUp = async () => {
    setAccountBusy(true);
    setAccountNote(null);
    const out = await pushToAccount();
    setAccountBusy(false);
    setAccountNote(out.ok ? 'Copied. The Book has a second home.' : out.error);
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
    const target = contact.includes('.') ? `https://${contact}` : `tel:${contact.replace(/\s/g, '')}`;
    try {
      const handled = await Linking.canOpenURL(target).catch(() => true);
      if (!handled) {
        setDialFailed(contact);
        return;
      }
      await Linking.openURL(target);
      setDialFailed(null);
    } catch {
      setDialFailed(contact);
    }
  };

  const exportAll = async () => {
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
    try {
      await Share.share({ message, title: 'Morrow export' });
      setExportError(null);
    } catch {
      // Swallowing this made the button do nothing at all, on the one screen
      // that promises the person their writing is theirs to take away.
      setExportError(
        'This device would not open the share sheet, so nothing left the app. Everything is still here, and you can try again.',
      );
    }
  };

  return (
    <Studio testID="screen-settings">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: () => router.dismissTo('/today'), testID: 'settings-back' }} where="You" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 22 }}>
          <Statement>What Morrow knows about you.</Statement>
          <Body>
            {plural(state.texts.length, 'piece')} of writing, {plural(state.goals.length, 'goal')},{' '}
            {plural(state.analyses.length, 'line')}, {plural(state.presentPicks.length, 'card')} of Present,{' '}
            {plural(state.pastEvents.length, 'event')} of Past, {plural(state.books.length, 'edition')} of the Book. All of it
            on this device.
          </Body>

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
            PRD §7.11. One control rather than five switches: the steps are
            ordered by how unwelcome each moment is, so "fewer" is a direction
            somebody can hold down until it is quiet enough, and it says in
            words what is left rather than showing a row of toggles.
          */}
          <View style={{ gap: 10 }}>
            <Label>When Morrow speaks</Label>
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
          {/* Welcome, again. It never comes back on its own once it has been seen. */}
          <View style={{ gap: 6 }}>
            <Label>The introduction</Label>
            <Body style={{ fontSize: 14 }}>The three pages from the first launch: what this is, the three evenings, and how you want to be spoken to.</Body>
            <Chip testID="settings-intro" label="See the introduction again" ghost onPress={() => router.push('/?intro=1')} />
          </View>

          <Rule />
          {/* The other half of PRD §11.6's disclosure. The first is on the Coach. */}
          <View style={{ gap: 6 }}>
            <Label>About the coach</Label>
            <Body testID="settings-is-ai" style={{ fontSize: 14 }}>
              Morrow’s coach is an AI. It asks and it quotes you. It never writes a goal, a plan line or a sentence of
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
                      Not signed in. Everything is on this phone and nowhere else; a lost phone loses the Book.
                    </Body>
                    <Chip testID="settings-account-signin" label="Keep a copy" onPress={() => router.push('/account')} />
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
                        setConfirming(false);
                        router.replace('/');
                      });
                    }}
                  />
                </View>
              </View>
            ) : (
              <TextButton testID="settings-delete" label="Delete everything" onPress={() => setConfirming(true)} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
