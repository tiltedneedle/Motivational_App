/**
 * The four doors (client decision, 2026-09-15).
 *
 * "Work on your:" — Past, Present, Future, and a fourth door for somebody who
 * does not yet know what those mean here. The source sells its programs
 * separately and tells people to pick; this screen is that sentence made into
 * a screen. Nothing is locked behind anything, the order is never enforced,
 * and each door says what you get and how long it takes rather than naming
 * itself twice.
 *
 * Reachable again from You, so it is a door and not a fork.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHOOSER_COPY, doorStanding, firstVisit, halfDone, presentStanding, type VolumeName } from '@morrow/core';
import { Body, Card, InkButton, Label, Rise, Statement, Studio, TextButton, TopBar, accent, day, useReducedMotion } from '@morrow/ui';
import { useFirstRun, useMorrow, useVolumeStates } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

const DOORS: { name: VolumeName; title: string; route: string }[] = [
  { name: 'past', title: 'Past', route: '/past' },
  { name: 'present', title: 'Present', route: '/present' },
  { name: 'future', title: 'Future', route: '/consent' },
];


export default function Choose() {
  const router = useRouter();
  useFirstRunStep('choose');
  const states = useVolumeStates();
  const consented = useMorrow((s) => Boolean(s.profile.consentedAt));
  const picks = useMorrow((s) => s.presentPicks);
  const depth = useMorrow((s) => s.profile.track);
  const open = useMorrow((s) => s.presentDraft);
  const sitting = open ? { half: open.half, selected: open.selected } : null;
  const faultsDone = halfDone(picks, 'faults', depth, sitting);
  const virtuesDone = halfDone(picks, 'virtues', depth, sitting);
  const reduced = useReducedMotion();
  const first = firstVisit(states);
  // The Future door leads to wherever the person is on its path — set-up if
  // nothing is, else the first line, the Interview, and so on.
  const firstRun = useFirstRun();

  return (
    <Studio testID="screen-choose">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar
          back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'choose-back' }}
          where={first ? 'Where to start' : 'The three volumes'}
        />
        {/* Scrolls: three doors, the explore button and the footer overran the bar at phone height, and the footer ran under "Not now". */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingTop: 4, paddingBottom: 8 }}>
          <Rise index={0} reducedMotion={reduced} style={{ gap: 6 }}>
            <Statement testID="choose-heading">{CHOOSER_COPY.heading}</Statement>
            {first ? null : <Body testID="choose-reentry">{CHOOSER_COPY.reentry}</Body>}
          </Rise>

          {DOORS.map((door, i) => {
            const mark = door.name === 'present' ? presentStanding(states.present, faultsDone, virtuesDone) : doorStanding(states[door.name]);
            return (
              <Rise key={door.name} index={i + 1} reducedMotion={reduced}>
                <Pressable
                  testID={`door-${door.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${door.title}. ${CHOOSER_COPY[`${door.name}.line`] ?? ''} ${CHOOSER_COPY[`${door.name}.time`] ?? ''}`}
                  // Every volume's door goes through the gate once (PRD §12: the
                  // person is asked to write about their own life, whichever
                  // volume), and never again.
                  onPress={() => {
                    if (door.name !== 'future') {
                      router.push(consented ? door.route : `/consent?then=${door.name}`);
                      return;
                    }
                    // With a Book the path is done and its route is Today: the
                    // Today already under this screen, not a second one.
                    if (firstRun.step === 'done') router.dismissTo('/today');
                    else router.push(firstRun.route as never);
                  }}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}
                >
                <Card style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Statement style={{ fontSize: 26, lineHeight: 32 }}>{door.title}</Statement>
                    {door.name === 'future' ? (
                      <Label testID="door-future-badge" style={{ color: accent.coralText }}>
                        {CHOOSER_COPY['future.badge']}
                      </Label>
                    ) : null}
                    {mark ? (
                      <Label testID={`door-${door.name}-mark`} style={{ color: day.ink3 }}>
                        {mark}
                      </Label>
                    ) : null}
                  </View>
                  <Body style={{ color: day.ink }}>{CHOOSER_COPY[`${door.name}.line`]}</Body>
                  <Label>{CHOOSER_COPY[`${door.name}.time`]}</Label>
                </Card>
                </Pressable>
              </Rise>
            );
          })}

          <Rise index={4} reducedMotion={reduced} style={{ gap: 8, marginTop: 2 }}>
            <InkButton
              testID="choose-explore"
              label={CHOOSER_COPY['explore.label'] ?? 'Not sure? Let’s explore.'}
              compact
              onPress={() => router.push('/explore')}
              style={{ backgroundColor: 'transparent' }}
            />
            <Body style={{ fontSize: 13, textAlign: 'center' }}>{CHOOSER_COPY.footer}</Body>
          </Rise>
        </ScrollView>

        <View style={{ paddingTop: 10, paddingBottom: 18 }}>
          <TextButton testID="choose-later" label="Not now" onPress={() => router.dismissTo('/today')} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
