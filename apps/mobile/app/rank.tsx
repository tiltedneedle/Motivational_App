/**
 * The order (PRD §7.2, Sitting 2). One question: which goal matters most.
 * The top three get all five analyses on the Starter track. The title has
 * its own page after this one.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View , Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, InkButton, Label, Ring, Statement, Stone, Studio, TopBar, accent, day , type as fonts } from '@morrow/ui';


import { useGoals, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

export default function Rank() {
  const router = useRouter();
  useFirstRunStep('order');
  const goals = useGoals();
  const track = useMorrow((s) => s.profile.track);
  const rankGoals = useMorrow((s) => s.rankGoals);

  const move = (id: string, dir: -1 | 1) => {
    const ids = goals.map((g) => g.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    rankGoals(next);
  };

  return (
    <Studio testID="screen-rank">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'rank-back' }} where="The order" />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 22 }}>
          <View style={{ gap: 8 }}>
            <Label>Your goals</Label>
            <Statement>Put your goals in order. The top one matters most.</Statement>
            <Body style={{ fontSize: 14 }}>{track === 'full' || goals.length <= 3 ? 'Every goal gets all five lines.' : 'The top three get all five lines; the rest get the two that make a plan.'}</Body>
          </View>

          <View>
            {goals.map((g, i) => (
              <View
                key={g.id}
                testID={`rank-row-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: day.line,
                }}
              >
                {i < 3 ? (
                  <Ring size={44} progress={1} color={accent.coral} width={2}>
                    <Stone size={30} domain={g.domain} polish={1} />
                  </Ring>
                ) : (
                  <View style={{ width: 44, alignItems: 'center' }}>
                    <Stone size={30} domain={g.domain} polish={0.5} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: day.ink }}>{g.title}</Text>
                  <Body style={{ fontSize: 13 }}>{g.horizon}</Body>
                </View>
                <Pressable
                  testID={`rank-up-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${g.title} up`}
                  onPress={() => move(g.id, -1)}
                  // 44 points each way, apart from each other (WCAG 2.5.8; Apple HIG).
                  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 18, color: day.ink2 }}>↑</Text>
                </Pressable>
                <Pressable
                  testID={`rank-down-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${g.title} down`}
                  onPress={() => move(g.id, 1)}
                  // 44 points each way, apart from each other (WCAG 2.5.8; Apple HIG).
                  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 18, color: day.ink2 }}>↓</Text>
                </Pressable>
              </View>
            ))}
          </View>

        </ScrollView>

        <View style={{ paddingTop: 10, paddingBottom: 18 }}>
          <InkButton testID="rank-continue" label="Name the Book" disabled={goals.length === 0} onPress={() => router.push('/title')} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
