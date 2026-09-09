/**
 * The Authoring opening (PRD §7.2, F1.0): the three sittings with their real
 * lengths, and the depth question with Starter preselected.
 */
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, InkButton, Label, Rule, Statement, Studio, TextButton, day } from '@morrow/ui';
import { Pressable, Text } from 'react-native';
import { type as fonts } from '@morrow/ui';
import { useMorrow } from '../src/store';
import type { DepthTrack } from '@morrow/core';

const TRACKS: { id: DepthTrack; title: string; blurb: string }[] = [
  { id: 'starter', title: 'Starter · three evenings', blurb: 'Fifteen minutes of writing, then one line per question. The way in.' },
  {
    id: 'full',
    title: 'Full · two weeks',
    blurb: 'The dose the studies tested: a paragraph per question on every goal, the shadow write, five to seven sittings.',
  },
];

export default function Authoring() {
  const router = useRouter();
  const track = useMorrow((s) => s.profile.track);
  const setProfile = useMorrow((s) => s.setProfile);

  return (
    <Studio testID="screen-authoring">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
          <Statement>Three evenings from now you will have a plan you wrote yourself.</Statement>
          <Body>
            Tonight about twenty-five minutes. Tomorrow morning fifteen. Tomorrow evening twenty. Everything you write
            stays yours, and you can stop at any point and pick it up.
          </Body>

          <View style={{ gap: 10 }}>
            <Label>How deep do you want to go?</Label>
            {TRACKS.map((t) => {
              const on = track === t.id;
              return (
                <Pressable
                  key={t.id}
                  testID={`track-${t.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setProfile({ track: t.id })}
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    backgroundColor: on ? day.ink : day.surface,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: on ? '#FFFFFF' : day.ink }}>
                    {t.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 14,
                      lineHeight: 19,
                      color: on ? 'rgba(255,255,255,0.75)' : day.ink2,
                    }}
                  >
                    {t.blurb}
                  </Text>
                </Pressable>
              );
            })}
            <Body style={{ fontSize: 13 }}>You can change this any time. Nothing you write is lost by switching.</Body>
          </View>
          <Rule />
        </View>

        <View style={{ paddingBottom: 18, gap: 4 }}>
          <InkButton testID="authoring-begin" label="Begin" onPress={() => router.push('/write?kind=ideal')} />
          <TextButton testID="authoring-later" label="Not tonight" onPress={() => router.push('/today')} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
