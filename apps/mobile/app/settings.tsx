/**
 * Settings, export and delete (PRD §7.12). Everything is exportable and
 * everything is deletable, in the app, without asking anyone.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HELPLINES, bookToText, plural } from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, accent, day } from '@morrow/ui';
import { useLatestBook, useMorrow } from '../src/store';

export default function Settings() {
  const router = useRouter();
  const state = useMorrow((s) => s);
  const setProfile = useMorrow((s) => s.setProfile);
  const reset = useMorrow((s) => s.reset);
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton testID="settings-back" label="← Today" onPress={() => router.replace('/today')} />
          <Label>You</Label>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 22 }}>
          <Statement>What Morrow knows about you.</Statement>
          <Body>
            {plural(state.texts.length, 'piece')} of writing, {plural(state.goals.length, 'goal')},{' '}
            {plural(state.analyses.length, 'line')}, {plural(state.books.length, 'edition')} of the Book. All of it on
            this device.
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
              <View style={{ gap: 8, backgroundColor: day.surface, padding: 16, borderRadius: 18 }}>
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
                      reset();
                      setConfirming(false);
                      router.replace('/');
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
