/**
 * The AI consent screen. Required by App Store 5.1.2(i) and by the fact that
 * people are about to write the most honest thing they have written this year.
 */
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, InkButton, Label, Rule, Statement, Studio, TextButton, day } from '@morrow/ui';
import { useMorrow } from '../src/store';

const ROWS: { label: string; body: string }[] = [
  {
    label: 'What stays on this device',
    body: 'Everything you write. The Interview, the Fifteen, your lines, the Book. Writing works with the network off.',
  },
  {
    label: 'What is sent, and when',
    body: 'Only when a screen needs it: your writing goes to an AI service to be read back to you as your own phrases, and to build the plan from the lines you wrote. Never for advertising.',
  },
  {
    label: 'What the AI is not allowed to do',
    body: 'It never writes a goal, a plan line or a sentence of your Book. It asks, it quotes you, it sorts, it typesets. If it produces text that is not yours, the app throws it away.',
  },
  {
    label: 'You can take it all back',
    body: 'Export everything, or delete the account and its writing, from Settings. Deletion is immediate here and complete within seven days.',
  },
];

export default function Consent() {
  const router = useRouter();
  const consent = useMorrow((s) => s.consent);

  return (
    <Studio testID="screen-consent">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24, gap: 18 }}>
          <Statement>Before you write anything.</Statement>
          {ROWS.map((r) => (
            <View key={r.label} style={{ gap: 6 }}>
              <Rule />
              <Label style={{ marginTop: 8 }}>{r.label}</Label>
              <Body style={{ color: day.ink }}>{r.body}</Body>
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="consent-continue"
            label="I understand, continue"
            onPress={() => {
              consent();
              router.push('/interview');
            }}
          />
          <TextButton label="Not now" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
