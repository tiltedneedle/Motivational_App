/**
 * The AI consent screen. Required by App Store 5.1.2(i) and by the fact that
 * people are about to write the most honest thing they have written this year.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, TopBar, day, keyboardScroll } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

const ROWS: { label: string; body: string; items?: string[] }[] = [
  {
    label: 'What stays on this device',
    body: 'Everything you write: the Interview and the Fifteen, the decks of Present, the periods and events of Past, your lines, the Book. Writing works with the network off.',
  },
  {
    label: 'What is sent to an AI service, and when',
    body: 'Only when a screen needs it, and never for advertising:',
    items: [
      'when you ask for your own phrases to be read back to you;',
      'when your plan is built from the lines you wrote;',
      'when a sitting is checked for signs you may need a person rather than an app;',
      'when you ask for a scene drawn from a detail you wrote.',
    ],
  },
  {
    label: 'If you say it rather than type it',
    body: 'Your phone’s own recogniser turns it into words, on the phone where it can. Nothing is recorded.',
  },
  {
    label: 'What the AI is not allowed to do',
    body: 'It never writes a goal, a plan line or a sentence of your Book. It asks, it quotes you, it sorts, it typesets. If it produces text that is not yours, the app throws it away.',
  },
  {
    // PRD §12, §3.5: the 16+ gate. Said here, once, where consent is given,
    // and the button below waits for it.
    label: 'Who this is for',
    body: 'People sixteen and over. Morrow asks you to write about your own life, and that is not a thing to ask of a child.',
  },
  {
    label: 'You can take it all back',
    body: 'Export everything, or delete the account and its writing, from You, the last tab. Deletion is immediate here and complete within seven days.',
  },
];

export default function Consent() {
  const router = useRouter();
  useFirstRunStep('consent');
  const consent = useMorrow((s) => s.consent);
  /**
   * The age gate (PRD §12). One tap that the button waits for, rather than a
   * date-of-birth field, which is a form and which a child can fill in as
   * easily as anyone. The consent timestamp is the record of this screen,
   * this affirmation included.
   */
  const [sixteen, setSixteen] = useState(false);

  return (
    <Studio testID="screen-consent">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        {/* Opened straight from a link, or reloaded, there is nothing behind this
        screen and Back did nothing at all. Every other screen guards it. */}
        <TopBar
          back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/')), testID: 'consent-back' }}
          where="Before you write"
        />
        <ScrollView {...keyboardScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 18 }}>
          <Statement>Before you write anything.</Statement>
          {ROWS.map((r) => (
            <View key={r.label} style={{ gap: 6 }}>
              <Rule />
              <Label style={{ marginTop: 8 }}>{r.label}</Label>
              <Body style={{ color: day.ink }}>{r.body}</Body>
              {r.items?.map((item) => (
                <Body key={item} style={{ color: day.ink, paddingLeft: 14 }}>
                  {'– '}
                  {item}
                </Body>
              ))}
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingTop: 10, paddingBottom: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Chip
              testID="consent-age"
              label="I am sixteen or over"
              role="checkbox"
              selected={sixteen}
              onPress={() => setSixteen((v) => !v)}
            />
          </View>
          {sixteen ? null : (
            <Body testID="consent-age-note" style={{ fontSize: 13 }}>
              Continue waits for that.
            </Body>
          )}
          <InkButton
            testID="consent-continue"
            label="I understand, continue"
            disabled={!sixteen}
            onPress={() => {
              if (!sixteen) return;
              consent();
              // The three doors, not straight into one of them: the source
              // sells its programs separately and tells people to choose.
              router.push('/choose');
            }}
          />
          <TextButton label="Not now" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
