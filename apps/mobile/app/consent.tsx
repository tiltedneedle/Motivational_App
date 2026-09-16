/**
 * The AI consent screen. Required by App Store 5.1.2(i) and by the fact that
 * people are about to write the most honest thing they have written this year.
 */
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, InkButton, Label, Rule, Statement, Studio, TextButton, TopBar, day, keyboardScroll } from '@morrow/ui';
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
    label: 'You can take it all back',
    body: 'Export everything, or delete the account and its writing, from You, the last tab. Deletion is immediate here and complete within seven days.',
  },
];

export default function Consent() {
  const router = useRouter();
  useFirstRunStep('consent');
  const consent = useMorrow((s) => s.consent);

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
        <View style={{ paddingTop: 10, paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="consent-continue"
            label="I understand, continue"
            onPress={() => {
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
