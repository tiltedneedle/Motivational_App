/**
 * Door four: "Not sure? Let's explore." (client decision, 2026-09-15.)
 *
 * A paragraph on each of the three, then the route the source itself suggests
 * — faults, Future, virtues, Past — offered as one way through and never as a
 * rule, with the one exception they name: if the past is what is on your mind,
 * start there. Then the same three doors again, so this screen is a way in
 * rather than a detour.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EXPLAINER_COPY, SUGGESTED_ROUTE, type VolumeName } from '@morrow/core';
import { Body, InkButton, Label, Rule, Statement, Studio, TopBar, accent, day } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

const ORDER: { name: VolumeName; title: string }[] = [
  { name: 'present', title: 'Present' },
  { name: 'future', title: 'Future' },
  { name: 'past', title: 'Past' },
];

/** The route as one line, in the app's own names, with both halves of Present shown. */
function routeLine(): string {
  return SUGGESTED_ROUTE.map((s) => {
    const title = s.volume[0]!.toUpperCase() + s.volume.slice(1);
    return s.half ? `${title} · the ${s.half}` : title;
  }).join('  →  ');
}

export default function Explore() {
  const router = useRouter();
  useFirstRunStep('explore');
  const consented = useMorrow((s) => Boolean(s.profile.consentedAt));

  const open = (name: VolumeName) => {
    if (name === 'future') router.push(consented ? '/interview' : '/consent');
    else router.push(name === 'past' ? '/past' : '/present');
  };

  return (
    <Studio testID="screen-explore">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/choose')), testID: 'explore-back' }} where="The three" />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 20 }}>
          <Statement testID="explore-heading">{EXPLAINER_COPY.heading}</Statement>

          {ORDER.map((v) => (
            <View key={v.name} testID={`explore-${v.name}`} style={{ gap: 6 }}>
              <Rule />
              <Label style={{ marginTop: 8 }}>{v.title}</Label>
              <Body style={{ color: day.ink }}>{EXPLAINER_COPY[`${v.name}.para`]}</Body>
            </View>
          ))}

          {/*
            The suggested route. A path, not a checklist: nothing here is
            ticked off, and nothing is measured against it later.
          */}
          <View testID="explore-order" style={{ gap: 8, backgroundColor: day.surface2, borderRadius: 18, padding: 18 }}>
            <Label style={{ color: accent.coralText }}>{EXPLAINER_COPY['order.title']}</Label>
            <Body testID="explore-order-steps" style={{ color: day.ink, fontSize: 15 }}>
              {routeLine()}
            </Body>
            <Body style={{ fontSize: 14 }}>{EXPLAINER_COPY['order.why']}</Body>
            <Body style={{ fontSize: 14 }}>{EXPLAINER_COPY['order.exception']}</Body>
            <Body style={{ fontSize: 13 }}>{EXPLAINER_COPY.anyorder}</Body>
          </View>

          <View style={{ gap: 10, paddingTop: 2 }}>
            <Label>{EXPLAINER_COPY['choose.title']}</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ORDER.map((v) => (
                <Pressable
                  key={v.name}
                  testID={`explore-pick-${v.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Start with ${v.title}`}
                  onPress={() => open(v.name)}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: day.line,
                    backgroundColor: day.surface,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Statement style={{ fontSize: 17, lineHeight: 22 }}>{v.title}</Statement>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingBottom: 18 }}>
          <InkButton testID="explore-back-to-doors" label="Back to the three" onPress={() => (router.canGoBack() ? router.back() : router.replace('/choose'))} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
