/**
 * The title on the spine (PRD §7.2). One question, on its own page: the
 * order screen used to ask for the order, a framing and the title at once,
 * which is three things where a first-time person expects one (GOV.UK
 * question pages; NN/g wizards). The framing is a way in, never the answer;
 * the title is theirs.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Statement, Studio, TopBar, UserField } from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

const TITLE_FRAMINGS = ['A year of…', 'The one where I…', 'Back to…'];

export default function Title() {
  const router = useRouter();
  useFirstRunStep('order');
  const goals = useGoals();
  const bookTitle = useMorrow((s) => s.bookTitle);
  const bookTitleFraming = useMorrow((s) => s.bookTitleFraming);
  const setBookTitleFraming = useMorrow((s) => s.setBookTitleFraming);
  const setBookTitle = useMorrow((s) => s.setBookTitle);
  const [framing, setFraming] = useState<string | null>(() =>
    TITLE_FRAMINGS.find((f) => f.replace(/…$/, '').trim() === bookTitleFraming) ?? null,
  );

  return (
    <Studio testID="screen-title">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'title-back' }} where="The name" />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, gap: 22 }}>
          <View style={{ gap: 8 }}>
            <Statement>If this plan were a book on your shelf, what is on the spine?</Statement>
            <Body style={{ fontSize: 14 }}>A few words. It goes on the cover of your Book and at the top of every export; you can leave it for now and the Book is called Untitled.</Body>
          </View>

          <View style={{ gap: 10 }}>
            <Label>A way in, if you want one</Label>
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
                  // counted as their prose. It only sets the opening words
                  // shown in front of the field they type into.
                  onPress={() => {
                    const next = framing === f ? null : f;
                    setFraming(next);
                    // Kept, so the Book can print it in front of their words.
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

        <View style={{ paddingTop: 10, paddingBottom: 18 }}>
          <InkButton
            testID="title-continue"
            label={bookTitle.trim() ? 'Write the stones' : 'Leave it for now · write the stones'}
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
