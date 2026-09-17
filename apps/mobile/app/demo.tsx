/**
 * The demo scenarios (PRD §14.7). A demo build only: everywhere else this
 * route is Today.
 *
 * Each row replaces the store on this device with a lived-in one — a first
 * morning, three months in, a week away, day ninety — with every date moved
 * so the fixture's own today is today. The last row is a new phone. Nothing
 * here touches an account.
 */
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TopBar, day } from '@morrow/ui';
import { DEMO_SCENARIOS, hasDemo, shiftFor, shifted, type DemoScenario } from '../src/demo';
import { useMorrow } from '../src/store';

export default function DemoScreen() {
  const router = useRouter();
  const loadState = useMorrow((s) => s.loadState);
  const reset = useMorrow((s) => s.reset);
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);
  const entitled = useMorrow((s) => s.profile.entitled);
  const setProfile = useMorrow((s) => s.setProfile);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (!hasDemo) return <Redirect href="/today" />;

  const open = async (scenario: DemoScenario) => {
    setBusy(scenario.id);
    setProblem(null);
    try {
      const state = await scenario.load();
      loadState(shifted(state, shiftFor(scenario.anchor, boundary)));
      router.dismissTo(scenario.route);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'That scenario could not be loaded.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Studio testID="screen-demo">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Back', onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'demo-back' }} where="Demo" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingBottom: 28, gap: 18 }}>
          <Label>A demo build</Label>
          <Statement>Days of a life, ready to open.</Statement>
          <Body>
            Each of these replaces what is on this device with a store the tests have already walked, every date moved so its
            today is today. In this build the Fifteen is two minutes and the shadow one; everything else — the ring, the
            nudges, the close, what counts — is as it ships.
          </Body>
          {problem ? (
            <Body testID="demo-problem" style={{ color: day.ink }}>
              {problem}
            </Body>
          ) : null}
          {/*
            Purchases are not configured in a demo build, so the paywall can
            only refuse honestly. This is the one way to show what Pro opens —
            the ninety-day rewrite, letters, wallpapers, every goal's plan.
          */}
          <View style={{ gap: 8 }}>
            <Label>Morrow Pro, for this device</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip testID="demo-pro-on" label="On" selected={entitled} onPress={() => setProfile({ entitled: true })} />
              <Chip testID="demo-pro-off" label="Off · the free plan" selected={!entitled} onPress={() => setProfile({ entitled: false })} />
            </View>
            <Body style={{ fontSize: 13 }}>Off, the paywall appears where it would: after the Blueprint, at the free limits, on day ninety.</Body>
          </View>
          {DEMO_SCENARIOS.map((s) => (
            <View key={s.id} style={{ gap: 6 }}>
              <Rule />
              <Statement style={{ fontSize: 20, lineHeight: 26 }}>{s.title}</Statement>
              <Body style={{ fontSize: 14 }}>{s.shows}</Body>
              <InkButton testID={`demo-${s.id}`} label={busy === s.id ? 'Opening…' : `Open · ${s.title}`} disabled={busy !== null} onPress={() => void open(s)} style={{ alignSelf: 'flex-start' }} />
            </View>
          ))}
          <Rule />
          <Statement style={{ fontSize: 20, lineHeight: 26 }}>A new phone</Statement>
          <Body style={{ fontSize: 14 }}>Nothing on it. Welcome, the Interview, the two-minute Fifteen, the stones, the seal — the whole first evening, live.</Body>
          <InkButton
            testID="demo-new-phone"
            label="Open · A new phone"
            disabled={busy !== null}
            onPress={() => {
              reset();
              router.dismissTo('/');
            }}
            style={{ alignSelf: 'flex-start' }}
          />
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
