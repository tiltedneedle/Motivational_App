/**
 * "I will…" and Seal the Book (PRD §7.2, F3.5–F3.6).
 *
 * The one screen in the product with no framings: the blank line is the point.
 * The hold is the same gesture as sealing a day, so it means one thing.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ordinal, type AnalysisKind, type PaywallMoment } from '@morrow/core';
import { Body, HoldBar, InkButton, Label, Notice, ProgressBar, SealBurst, Settle, Statement, Stone, Studio, TopBar, UserField, accent, night, useReducedMotion } from '@morrow/ui';
import { feelDrained, feelSealed, feelTick } from '../src/feel';
import { useGoals, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

export default function SealBook() {
  const router = useRouter();
  const onPath = useMorrow((s) => s.books.length === 0);
  useFirstRunStep('seal');
  const showResources = useMorrow((st) => st.showResources);
  const goals = useGoals();

  /** Back, on the path, is the plan it came from; the router's own back was "Name your Book". */
  const goBack = () => {
    if (onPath && goals.length) {
      router.replace(`/portrait?goal=${goals[0]!.id}&next=/seal-book`);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.dismissTo('/today');
  };
  // Every seal is a new edition and nothing is overwritten (PRD §7.3), so the
  // label has to count. It said "first edition" on every seal there was.
  const editions = useMorrow((s) => s.books.length);
  const iWill = useMorrow((s) => s.iWill);
  const setIWill = useMorrow((s) => s.setIWill);
  const sealBook = useMorrow((s) => s.sealBook);
  const makePlan = useMorrow((s) => s.makePortraitAndPlan);
  const reduced = useReducedMotion();

  const [error, setError] = useState<string | null>(null);
  const [sealed, setSealed] = useState(false);
  /** Goals whose plan could not be built from the lines they have. */
  const [unplanned, setUnplanned] = useState<{ id: string; title: string; why: string; moment?: PaywallMoment; missing?: AnalysisKind[] }[]>(
    [],
  );
  // Read as they stood before the hold: the loop below builds plans as it goes.
  const plans = useMorrow((s) => s.plans);
  const hadPlanBefore = useMemo(() => new Set(plans.map((p) => p.goalId)), [plans]);
  const firstDaySealed = useMorrow((s) => Object.values(s.days).some((d) => d.sealedAt));

  const onSeal = () => {
    const res = sealBook();
    if (!res.ok) {
      setError(res.error);
      feelDrained();
      // Tell the bar the seal was refused so it drains and can be held again.
      return false;
    }
    feelSealed();
    setSealed(true);

    // The Book is sealed either way — it is their writing and it is valid. But
    // a goal whose plan could not be built used to fail in silence, and the
    // person met the gap days later as an empty Today with no explanation.
    const failed: { id: string; title: string; why: string; moment?: PaywallMoment; missing?: AnalysisKind[] }[] = [];
    for (const g of goals) {
      const built = makePlan(g.id);
      if (built.ok) continue;
      // The free plan's one plan is expected, not a fault to explain here:
      // on the first evening the after-plan moment carries it, once the
      // first Today has been a Today (`paywallMoment` waits for that on
      // purpose), and on every later edition a goal that had no plan
      // before this seal is not news. Only a goal whose lines are missing
      // is worth a paragraph on the finish screen.
      if (built.moment && (!firstDaySealed || !hadPlanBefore.has(g.id))) continue;
      failed.push({ id: g.id, title: g.title, why: built.error, ...(built.moment ? { moment: built.moment } : {}), ...(built.missing ? { missing: built.missing } : {}) });
    }
    setUnplanned(failed);
    if (failed.length === 0) setTimeout(() => router.replace('/book?from=seal'), 900);
    return true;
  };

  return (
    <Studio dark testID="screen-seal-book">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: goBack, testID: 'seal-book-back' }} right={<Label style={{ color: night.ink3 }}>Finish</Label>} help={{ onPress: showResources }} />
        {onPath ? <ProgressBar value={4.7 / 5} label="Step 5 of 5 · Finish your Book" testID="seal-progress" style={{ paddingTop: 4 }} /> : null}
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24, gap: 20 }}>
          <Label style={{ color: night.ink3 }}>Last line</Label>
          <Statement style={{ color: night.ink }}>Finish it, in your words.</Statement>
          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>I will…</Label>
            <UserField
              testID="i-will"
              labelHidden
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

          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }}>
            {/* PRD 8.5: the stones settle as the Book seals, and two rings pulse out of the first. */}
            {goals.slice(0, 6).map((g, i) => (
              <View key={g.id} style={{ alignItems: 'center', justifyContent: 'center' }}>
                {i === 0 ? <SealBurst size={34} color={accent.coral} play={sealed} reduced={reduced} /> : null}
                <Settle reduced={reduced} play={sealed ? 1 : 0}>
                  <Stone size={sealed ? 34 : 30} domain={g.domain} polish={1} seated={sealed} />
                </Settle>
              </View>
            ))}
          </View>

          <Body style={{ color: night.ink2, textAlign: 'center' }}>
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'}. Hold, and the Book is yours. Nothing in it is fixed for good; a new edition is one session away.
          </Body>

          <Notice testID="seal-error" kind="error" text={error} style={{ color: '#FF8A6E' }} />

          {unplanned.length ? (
            <View testID="seal-unplanned" style={{ gap: 12, borderTopWidth: 1, borderTopColor: night.line, paddingTop: 18 }}>
              {/*
                Two different reasons a goal can be here, and they need two
                different sentences. "Nothing in it to start from yet" is true
                of a goal missing its Strategies line and flatly false of one
                held back by the plan limit — that one has everything it needs,
                and telling somebody otherwise sends them off to rewrite a line
                they have already written.
              */}
              {unplanned.every((u) => u.moment) ? (
                <>
                  <Statement style={{ color: night.ink, fontSize: 22, lineHeight: 28 }}>
                    Your Book is finished. {unplanned.length === 1 ? 'One goal is' : `${unplanned.length} goals are`}{' '}
                    written and waiting for a plan.
                  </Statement>
                  <Body style={{ color: night.ink2 }}>
                    Everything you wrote for {unplanned.length === 1 ? 'it' : 'them'} is in the Book. The free plan
                    builds one goal’s plan, and the first goal has it.
                  </Body>
                </>
              ) : (
                <>
                  <Statement style={{ color: night.ink, fontSize: 22, lineHeight: 28 }}>
                    Your Book is finished. {unplanned.length === 1 ? 'One goal' : `${unplanned.length} goals`} still
                    {unplanned.length === 1 ? ' needs' : ' need'} a first step.
                  </Statement>
                  <Body style={{ color: night.ink2 }}>
                    Nothing is lost. A plan is built out of the line you wrote about how you will do it, and{' '}
                    {unplanned.filter((u) => !u.moment).length === 1 ? 'this one has' : 'these have'} nothing in{' '}
                    {unplanned.filter((u) => !u.moment).length === 1 ? 'it' : 'them'} to start from yet.
                  </Body>
                </>
              )}
              {unplanned.map((u) => (
                <View key={u.id} style={{ gap: 4 }}>
                  <Label style={{ color: night.ink }}>{u.title}</Label>
                  <Label style={{ color: night.ink3 }}>{u.why}</Label>
                </View>
              ))}
              {/*
                A goal held back by the plan limit is a different thing from a
                goal with no line to build from, and sending somebody to write
                a Strategies line they have already written would be the app
                lying about why it stopped.
              */}
              {unplanned.some((u) => u.moment) ? (
                <InkButton
                  testID="seal-see-plans"
                  label="See what Pro adds"
                  onPress={() => router.push(`/paywall?moment=${unplanned.find((u) => u.moment)!.moment}`)}
                />
              ) : null}
              {/* Only for a goal that is actually missing its line. */}
              {unplanned.some((u) => !u.moment) ? (
                <InkButton
                  testID="seal-fix-plan"
                  label={
                    unplanned.filter((u) => !u.moment).length === 1 ? 'Write that line now' : 'Start with the first one'
                  }
                  onPress={() => {
                    // The stone that is actually missing, not always the How one.
                    const first = unplanned.find((u) => !u.moment);
                    if (first) router.replace(`/stone?goal=${first.id}&kind=${first.missing?.[0] ?? 'strategies'}&from=${encodeURIComponent('/seal-book')}`);
                  }}
                />
              ) : null}
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
            onTick={feelTick}
            label={iWill.trim() ? 'Hold to finish' : 'Write the last line first'}
            // `editions` counts the Books in the store, which the seal has
            // just added to: read after the seal, "first edition" said second.
            doneLabel={`Finished · ${ordinal(sealed ? editions : editions + 1).toLowerCase()} edition`}
            done={sealed}
            reducedMotion={reduced}
            // Both branches have to RETURN the refusal. The bar releases its
            // latch on `false` and stays shut on anything else, so a call site
            // that drops the value leaves the person on this screen with the
            // one control that can seal their Book permanently dead — which is
            // exactly what happens if you hold the bar before typing the line.
            onComplete={() => {
              if (!iWill.trim()) {
                setError('The "I will…" line is required. It can be three words.');
                return false;
              }
              return onSeal();
            }}
          />
          {sealed ? <InkButton testID="seal-open-book" label="Read the Book" onPress={() => router.replace('/book?from=seal')} /> : null}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
