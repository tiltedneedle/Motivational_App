/**
 * "I will…" and Seal the Book (PRD §7.2, F3.5–F3.6).
 *
 * The one screen in the product with no framings: the blank line is the point.
 * The hold is the same gesture as sealing a day, so it means one thing.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, HoldBar, InkButton, Label, Statement, Stone, Studio, UserField, useReducedMotion, night } from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';

export default function SealBook() {
  const router = useRouter();
  const goals = useGoals();
  const iWill = useMorrow((s) => s.iWill);
  const setIWill = useMorrow((s) => s.setIWill);
  const sealBook = useMorrow((s) => s.sealBook);
  const makePlan = useMorrow((s) => s.makePortraitAndPlan);
  const reduced = useReducedMotion();

  const [error, setError] = useState<string | null>(null);
  const [sealed, setSealed] = useState(false);

  const onSeal = () => {
    const res = sealBook();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSealed(true);
    // Build the Portrait and Blueprint for every goal that has the lines for it.
    for (const g of goals) makePlan(g.id);
    setTimeout(() => router.replace('/book'), 900);
  };

  return (
    <Studio dark testID="screen-seal-book">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 20, gap: 20 }}>
          <Label style={{ color: night.ink3 }}>Last thing</Label>
          <Statement style={{ color: night.ink }}>Finish this, in your words.</Statement>
          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>I will…</Label>
            <UserField
              testID="i-will"
              value={iWill}
              onChangeText={(t) => {
                setIWill(t);
                setError(null);
              }}
              placeholder="It can be three words."
              multiline
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 10 }}>
            {goals.slice(0, 6).map((g) => (
              <Stone key={g.id} size={sealed ? 34 : 30} domain={g.domain} polish={1} seated={sealed} />
            ))}
          </View>

          <Body style={{ color: night.ink2, textAlign: 'center' }}>
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'}. Hold, and it&apos;s yours. You can rewrite it in ninety days.
          </Body>

          {error ? (
            <Body testID="seal-error" style={{ color: '#FF8A6E' }}>
              {error}
            </Body>
          ) : null}
        </ScrollView>

        <View style={{ paddingBottom: 22, gap: 10 }}>
          <HoldBar
            testID="seal-hold"
            label={iWill.trim() ? 'Hold to seal' : 'Write the last line first'}
            doneLabel="Sealed · first edition"
            done={sealed}
            reducedMotion={reduced}
            onComplete={() => {
              if (!iWill.trim()) {
                setError('The "I will…" line is required. It can be three words.');
                return;
              }
              onSeal();
            }}
          />
          {sealed ? <InkButton testID="seal-open-book" label="Read the Book" onPress={() => router.replace('/book')} /> : null}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
