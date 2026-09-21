/**
 * Before your future (PRD §7.2, F1.0; the rebuild, 2026-09-21): one screen
 * that says what the fifteen minutes are, and the depth question as two
 * tiles with Starter preselected. It used to be three paragraphs.
 */
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { DepthTrack } from '@morrow/core';
import { Body, Heading, Label, OptionTile, Screen, Stone, accent, day, useReducedMotion } from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

const TRACKS: { id: DepthTrack; title: string; caption: string }[] = [
  { id: 'starter', title: 'Starter · three sessions', caption: 'Fifteen minutes of writing, then one line per question. The way in.' },
  { id: 'full', title: 'Full · two weeks', caption: 'The dose the studies tested: a paragraph per question, the other road, five to seven sessions.' },
];

export default function Authoring() {
  const router = useRouter();
  useFirstRunStep('doorway');
  const track = useMorrow((s) => s.profile.track);
  const setProfile = useMorrow((s) => s.setProfile);
  const goals = useGoals();
  const reduced = useReducedMotion();

  return (
    <Screen
      testID="screen-authoring"
      back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'authoring-back' }}
      where="Your future"
      progress={{ value: 2.4 / 5, label: 'Step 3 of 5 · Write your future', testID: 'authoring-progress' }}
      // "Continue", not "Begin": the room's own doorway (type it, say it,
      // the clock) is where the fifteen minutes begin, and two screens in a
      // row that both said "Begin · 15 minutes" read as one that did not work.
      cta={{ label: 'Continue', onPress: () => router.push('/write?kind=ideal'), testID: 'authoring-begin' }}
      secondary={{ label: 'Not tonight', onPress: () => router.dismissTo('/today'), testID: 'authoring-later' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        {goals.slice(0, 4).map((g) => (
          <Stone key={g.id} size={30} domain={g.domain} polish={0.8} sweep={!reduced} />
        ))}
        <Label style={{ flex: 1 }}>{goals.length === 1 ? 'One goal named' : `${goals.length} goals named`}</Label>
      </View>
      <Heading
        title="Fifteen minutes on the life you want."
        line="Three to five years from now, if things went well. Write or talk; spelling can wait. Stop whenever you like — every word is kept. Next: choose type or talk, and begin."
      />
      <View style={{ gap: 10 }}>
        <Label>How deep do you want to go?</Label>
        {TRACKS.map((t) => (
          <OptionTile key={t.id} testID={`track-${t.id}`} title={t.title} caption={t.caption} selected={track === t.id} onPress={() => setProfile({ track: t.id })} tint={accent.coral} />
        ))}
        <Body style={{ fontSize: 13, color: day.ink2 }}>You can change this any time. Nothing you write is lost by switching.</Body>
      </View>
    </Screen>
  );
}
