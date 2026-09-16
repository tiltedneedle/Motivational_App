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
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHOOSER_COPY, doorStanding, firstVisit, halfDone, presentStanding, type VolumeName } from '@morrow/core';
import { Body, Card, InkButton, Label, Rise, Statement, Studio, TextButton, TopBar, accent, day, useReducedMotion } from '@morrow/ui';
import { useMorrow, useVolumeStates } from '../src/store';
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

  return (
    <Studio testID="screen-choose">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar
          back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'choose-back' }}
          where={first ? 'Where to start' : 'The three volumes'}
        />
        <View style={{ flex: 1, gap: 14, paddingTop: 4 }}>
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
                  onPress={() => router.push(door.name === 'future' && consented ? '/interview' : door.route)}
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
              label={CHOOSER_COPY['explore.label'] ?? "Not sure? Let's explore."}
              compact
              onPress={() => router.push('/explore')}
              style={{ backgroundColor: 'transparent' }}
            />
            <Body style={{ fontSize: 13, textAlign: 'center' }}>{CHOOSER_COPY.footer}</Body>
          </Rise>
        </View>

        <View style={{ paddingBottom: 18 }}>
          <TextButton testID="choose-later" label="Not now" onPress={() => router.dismissTo('/today')} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
