/**
 * Rank and title (PRD §7.2, Sitting 2). Order the stones, then name the plan.
 * The top three get all five analyses on the Starter track.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View , Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Ring, Statement, Stone, Studio, TopBar, UserField, accent, day , type as fonts } from '@morrow/ui';


import { useGoals, useMorrow } from '../src/store';

const TITLE_FRAMINGS = ['A year of…', 'The one where I…', 'Back to…'];

export default function Rank() {
  const router = useRouter();
  const goals = useGoals();
  const rankGoals = useMorrow((s) => s.rankGoals);
  const bookTitle = useMorrow((s) => s.bookTitle);
  const setBookTitleFraming = useMorrow((s) => s.setBookTitleFraming);
  const setBookTitle = useMorrow((s) => s.setBookTitle);
  const [framing, setFraming] = useState<string | null>(null);

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
            <Label>The order</Label>
            <Statement>Put your goals in order. The top one matters most.</Statement>
            <Body style={{ fontSize: 14 }}>The top three get all five lines; the rest get the two that make a plan.</Body>
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
                  style={{ padding: 10 }}
                >
                  <Text style={{ fontSize: 18, color: day.ink2 }}>↑</Text>
                </Pressable>
                <Pressable
                  testID={`rank-down-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${g.title} down`}
                  onPress={() => move(g.id, 1)}
                  style={{ padding: 10 }}
                >
                  <Text style={{ fontSize: 18, color: day.ink2 }}>↓</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            <Label>If this plan were a book on your shelf, what is on the spine?</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {TITLE_FRAMINGS.map((f) => (
                <Chip
                  key={f}
                  testID={`title-framing-${f}`}
                  label={f}
                  selected={framing === f}
                  // The chip is a way in, not an answer. It used to fill the
                  // field, which meant a tap became the title printed on the
                  // spine of their Book — a sentence fragment the app wrote,
                  // counted as their prose. Now it only sets the opening words
                  // shown in front of the field they type into.
                  onPress={() => {
                    const next = framing === f ? null : f;
                    setFraming(next);
                    // Kept, so the Book can print it in front of their words.
                    // It was only ever a placeholder before, which meant the
                    // opening the person chose vanished the moment they left
                    // this screen.
                    setBookTitleFraming(next ? next.replace(/…$/, '').trim() : null);
                  }}
                />
              ))}
            </View>
            <UserField
              testID="book-title"
              label="The title on the spine of your Book"
              value={bookTitle}
              onChangeText={setBookTitle}
              placeholder={framing ? `${framing.replace('…', '')} what?` : 'Your own words'}
            />
          </View>
        </ScrollView>

        <View style={{ paddingBottom: 18 }}>
          <InkButton
            testID="rank-continue"
            label="Write five lines per goal"
            disabled={goals.length === 0}
            onPress={() => {
              const first = goals[0];
              if (first) router.push(`/stone?goal=${first.id}&kind=motives`);
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
