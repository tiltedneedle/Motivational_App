/**
 * The paywall (PRD §8.9, §7.13).
 *
 * One screen. Their own "I will" line at the top in the serif, three benefit
 * lines, a plan toggle with the annual highlighted and the per-month maths, the
 * trial line in a caption, Continue in ink, Not now in the tertiary.
 *
 * No timers, no fake discounts, no interstitial. And "Not now" always returns
 * the person to where they were with nothing lost — which is why this screen
 * takes a `from` and goes back to it rather than dropping everyone on Today.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BENEFITS,
  HIGHLIGHTED,
  MOMENT_HEADING,
  PLANS,
  plural,
  type PaywallMoment,
  type PricePlan,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, UserText, accent, day, radius } from '@morrow/ui';
import { useLatestBook, useMorrow } from '../src/store';

function isMoment(s: string | undefined): s is PaywallMoment {
  return Boolean(s && s in MOMENT_HEADING);
}

export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ moment?: string; from?: string }>();
  const moment: PaywallMoment = isMoment(params.moment) ? params.moment : 'after-blueprint';
  const book = useLatestBook();
  const markPaywallSeen = useMorrow((s) => s.markPaywallSeen);
  const purchase = useMorrow((s) => s.purchase);
  const restore = useMorrow((s) => s.restore);

  const [choice, setChoice] = useState<PricePlan['id']>(HIGHLIGHTED);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = PLANS.find((p) => p.id === choice) ?? PLANS[0]!;

  /**
   * Shown counts as shown, whichever way they leave.
   *
   * Marking it on "Not now" meant a person who used the system back gesture,
   * or closed the app on this screen, met it again the next time Today opened —
   * a paywall that reappears until you press its own button is not the "once"
   * the PRD asks for, and it is the exact behaviour that makes people delete an
   * app rather than pay for it.
   */
  useEffect(() => {
    markPaywallSeen(moment);
  }, [markPaywallSeen, moment]);

  /**
   * Back to exactly where they were.
   *
   * Popping is the honest reading of "returns the user to where they were with
   * nothing lost": it puts back the screen they were actually on, in the state
   * it was in. Replacing instead left the screen they came from still mounted
   * underneath a second copy of it — two Todays in the stack, the lower one
   * unreachable and still answering to its own test ids.
   *
   * `from` is the fallback for a paywall opened cold (a deep link, a relaunch).
   * It is checked against a shape this app owns rather than followed, because a
   * route arriving in a query string is not something to navigate to on trust.
   */
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const from = typeof params.from === 'string' ? params.from : '';
    const safe = /^\/[a-z-]+(\?[\w=&%.-]*)?$/i.test(from) ? from : '/today';
    router.replace(safe);
  };

  const notNow = () => goBack();

  const buy = async () => {
    setBusy(true);
    setProblem(null);
    const out = await purchase(choice);
    setBusy(false);
    if (out.ok) {
      // Same door out. Somebody who has just paid should land back in the thing
      // they were doing, not be dropped on Today as though they had restarted.
      goBack();
      return;
    }
    setProblem(out.error);
  };

  return (
    <Studio testID="screen-paywall">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <Label>Morrow Pro</Label>
          <TextButton testID="paywall-restore" label="Restore" onPress={() => void restore().then((r) => setProblem(r.ok ? null : r.error))} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 18 }}>
          {/*
            Their sentence, at the top, in the serif. It is the one thing on
            this screen that is not the app selling something, and it is the
            reason any of the rest is worth anything.
          */}
          {book?.iWill?.trim() ? (
            <UserText testID="paywall-i-will" style={{ fontSize: 24, lineHeight: 32, color: day.ink }}>
              {book.iWill.trim()}
            </UserText>
          ) : null}

          <Statement testID="paywall-heading" style={{ fontSize: 27, lineHeight: 33 }}>
            {MOMENT_HEADING[moment]}
          </Statement>

          <View style={{ gap: 8 }}>
            {BENEFITS.map((b) => (
              <Body key={b} style={{ color: day.ink }}>
                {b}
              </Body>
            ))}
          </View>

          <Rule />

          <View style={{ gap: 10 }}>
            <Label>Choose one</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PLANS.map((p) => (
                <Chip
                  key={p.id}
                  testID={`plan-${p.id}`}
                  label={p.label}
                  selected={choice === p.id}
                  onPress={() => setChoice(p.id)}
                />
              ))}
            </View>
            <View
              testID="plan-note"
              style={{ backgroundColor: day.surface, borderRadius: radius.field, padding: 14, gap: 4 }}
            >
              <Body style={{ color: day.ink, fontSize: 17 }}>{selected.note}</Body>
              {/* The trial line, in a caption. Never a countdown. */}
              {selected.trialDays ? (
                <Body testID="plan-trial" style={{ fontSize: 13 }}>
                  {plural(selected.trialDays, 'day')} free first. Cancel any time; nothing you have written depends on
                  it.
                </Body>
              ) : null}
              {selected.id === HIGHLIGHTED ? (
                <Body style={{ fontSize: 13, color: accent.coralText }}>Most people choose this one.</Body>
              ) : null}
            </View>
          </View>

          {problem ? (
            <Body testID="paywall-problem" style={{ color: day.ink }}>
              {problem}
            </Body>
          ) : null}

          <InkButton testID="paywall-continue" label={busy ? 'One moment…' : 'Continue'} onPress={() => void buy()} />
          {/*
            Tertiary, and it always works. PRD §7.13: "Not now always returns
            the user to where they were with nothing lost."
          */}
          <TextButton testID="paywall-not-now" label="Not now" onPress={notNow} />

          <Body style={{ fontSize: 12, lineHeight: 18 }}>
            The Interview, the Fifteen, the Book and its export are free forever, and stay yours whatever you choose
            here.
          </Body>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
