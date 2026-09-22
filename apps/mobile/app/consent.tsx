/**
 * The AI consent screen. Required by App Store 5.1.2(i) and by the fact that
 * people are about to write the most honest thing they have written this year.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, TopBar, day, keyboardScroll } from '@morrow/ui';
import { hasAnalytics, useFirstRunStep } from '../src/analytics';
import { useMorrow } from '../src/store';

const ROWS: { label: string; body: string; items?: string[] }[] = [
  {
    label: 'What stays on this device',
    body: 'Everything you write: your first line, the Interview, the fifteen minutes on your future, the decks of Present, the periods and events of Past, your answers, the Book. Writing works with the network off.',
  },
  {
    label: 'What is sent to an AI service, and when',
    body: 'Only when a screen needs it, and never for advertising:',
    items: [
      'when you finish a piece of writing, so your own phrases can be read back to you;',
      'when a piece of writing is checked, once, for signs you may need a person rather than an app;',
      'when you ask for a scene, drawn from what you wrote about your future.',
    ],
  },
  ...(hasAnalytics
    ? [
        {
          label: 'Counts, so we can see where people stop',
          body: 'Which step of the first evening was reached, whether a day was closed, whether a card was shown — counts and step names, never a word you wrote, never your email, sent to an analytics service (PostHog, in the United States). Nothing is sent before you tap Continue on set-up.',
        },
      ]
    : []),
  {
    label: 'If you say it rather than type it',
    body: 'Your phone’s or browser’s own recogniser turns it into words — on the device where it can; where it cannot, its maker’s speech service does, and hands back words. Morrow keeps no audio.',
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

/** Where Continue may lead besides the three doors: the two other volumes' own doors. */
const THEN: Record<string, string> = { past: '/past', present: '/present' };

export default function Consent() {
  const router = useRouter();
  useFirstRunStep('consent');
  const consent = useMorrow((s) => s.consent);
  // The volume that sent the person here, if one did (PRD §12: the gate
  // stands at every writing door, not only the Future's). Checked against a
  // shape this app owns, never followed as a free string.
  const { then, from } = useLocalSearchParams<{ then?: string; from?: string }>();
  const onward = (then && THEN[then]) || '/choose';
  // From set-up (the rebuild): the details behind its one privacy line.
  // Nothing to affirm here; the tick and the consent are on that screen.
  const reading = from === 'setup';
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
          where={reading ? 'What leaves the phone' : 'Before you write'}
        />
        <ScrollView {...keyboardScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 18 }}>
          <Statement>{reading ? 'What leaves the phone, and when.' : 'Before you write anything.'}</Statement>
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
        {reading ? (
          <View style={{ paddingTop: 10, paddingBottom: 18 }}>
            <InkButton testID="consent-got-it" label="Got it" onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/setup'))} />
          </View>
        ) : (
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
              // Unless a door sent them here, in which case it is that door.
              router.replace(onward as never);
            }}
          />
          {/* Opened from a link there is nothing behind this screen: the same guard as the arrow above. */}
          <TextButton testID="consent-not-now" label="Not now" onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))} />
        </View>
        )}
      </SafeAreaView>
    </Studio>
  );
}
