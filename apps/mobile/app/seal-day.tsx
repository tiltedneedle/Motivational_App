/**
 * Seal the day (PRD §7.6). A word, a proof, a thing you are glad of, then the
 * same hold that seals a Book. Unsealed days seal themselves as quiet days.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, HoldBar, Label, Statement, Stone, Studio, UserField, night, useReducedMotion } from '@morrow/ui';
import { dayOf } from '@morrow/core';
import { useMorrow } from '../src/store';

const WORDS = ['Calm', 'Tired', 'Proud', 'Steady'];

export default function SealDay() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const sealDay = useMorrow((s) => s.sealDay);
  const analyses = useMorrow((s) => s.analyses);
  // A day already sealed opens on what was written, so sealing it again is
  // visibly an edit of that and not an empty form that would replace it.
  const today = useMorrow((s) => s.days[dayOf(new Date(), s.profile.dayBoundaryHour)]);
  const [word, setWord] = useState(today?.moodWord ?? 'Steady');
  const [proof, setProof] = useState(today?.proof ?? '');
  const [gladOf, setGladOf] = useState(today?.gladOf ?? '');
  const [sealed, setSealed] = useState(false);

  // The evidence rule is the user's own Monitoring line.
  const rule = analyses.find((a) => a.kind === 'monitoring')?.line;

  return (
    <Studio dark testID="screen-seal-day">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 20 }}>
          <Label style={{ color: night.ink3 }}>Seal the day</Label>
          <Statement style={{ color: night.ink }}>
            {sealed ? 'Sealed. See you at dawn.' : 'Quiet day or not, it goes in the ledger.'}
          </Statement>

          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>Today, in a word</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {WORDS.map((wd) => (
                <Chip key={wd} testID={`mood-${wd}`} label={wd} selected={word === wd} onPress={() => setWord(wd)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>One piece of proof</Label>
            {rule ? <Body style={{ color: night.ink3, fontSize: 13 }}>Your rule: “{rule}”</Body> : null}
            <UserField
              testID="seal-proof"
              label="What actually happened today"
              value={proof}
              onChangeText={setProof}
              placeholder="What actually happened"
              multiline
            />
          </View>

          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>One thing you are glad of</Label>
            <UserField
              testID="seal-glad"
              label="Something you are glad of"
              value={gladOf}
              onChangeText={setGladOf}
              placeholder="Anything at all"
              multiline
            />
          </View>

          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Stone size={110} domain="health" polish={sealed ? 1 : 0.6} seated={sealed} />
          </View>
        </ScrollView>

        <View style={{ paddingBottom: 22 }}>
          <HoldBar
            testID="seal-day-hold"
            label="Hold to seal"
            doneLabel={`Sealed · ${word}`}
            done={sealed}
            reducedMotion={reduced}
            onComplete={() => {
              sealDay({ moodWord: word, proof, gladOf });
              setSealed(true);
              setTimeout(() => router.replace('/today'), 900);
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
