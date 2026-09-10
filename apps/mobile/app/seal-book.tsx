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
  /** Goals whose Blueprint could not be built from the lines they have. */
  const [unplanned, setUnplanned] = useState<{ id: string; title: string; why: string }[]>([]);

  const onSeal = () => {
    const res = sealBook();
    if (!res.ok) {
      setError(res.error);
      // Tell the bar the seal was refused so it drains and can be held again.
      return false;
    }
    setSealed(true);

    // The Book is sealed either way — it is their writing and it is valid. But
    // a goal whose plan could not be built used to fail in silence, and the
    // person met the gap days later as an empty Today with no explanation.
    const failed: { id: string; title: string; why: string }[] = [];
    for (const g of goals) {
      const built = makePlan(g.id);
      if (!built.ok) failed.push({ id: g.id, title: g.title, why: built.error });
    }
    setUnplanned(failed);
    if (failed.length === 0) setTimeout(() => router.replace('/book'), 900);
    return true;
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
              label="Your I will line"
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

          {unplanned.length ? (
            <View testID="seal-unplanned" style={{ gap: 12, borderTopWidth: 1, borderTopColor: night.line, paddingTop: 18 }}>
              <Statement style={{ color: night.ink, fontSize: 22, lineHeight: 28 }}>
                Your Book is sealed. {unplanned.length === 1 ? 'One goal' : `${unplanned.length} goals`} still
                {unplanned.length === 1 ? ' needs' : ' need'} a first step.
              </Statement>
              <Body style={{ color: night.ink2 }}>
                Nothing is lost. A plan is built out of the line you wrote about how you will do it, and{' '}
                {unplanned.length === 1 ? 'this one has' : 'these have'} nothing in {unplanned.length === 1 ? 'it' : 'them'} to
                start from yet.
              </Body>
              {unplanned.map((u) => (
                <View key={u.id} style={{ gap: 4 }}>
                  <Label style={{ color: night.ink }}>{u.title}</Label>
                  <Label style={{ color: night.ink3 }}>{u.why}</Label>
                </View>
              ))}
              <InkButton
                testID="seal-fix-plan"
                label={unplanned.length === 1 ? 'Write that line now' : 'Start with the first one'}
                onPress={() => {
                  const first = unplanned[0];
                  if (first) router.replace(`/stone?goal=${first.id}&kind=strategies`);
                }}
              />
              <InkButton
                testID="seal-continue-anyway"
                label="Read my Book first"
                onPress={() => router.replace('/book')}
                style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: night.line }}
              />
            </View>
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
