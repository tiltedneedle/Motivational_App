/**
 * Progress (PRD §7.7): the Consistency Score, Returns, the Evidence Ledger and
 * the Almanac.
 *
 * This is the half of the product that answers "did any of it happen?", and the
 * answer has to be made of things the person actually did, not a number the app
 * felt like showing. Every row in the ledger is a moment: a move they kept, a
 * line they wrote when they sealed a day, something they captured. The Almanac
 * is a year of small stones, one per day, polished by evidence — deliberately
 * not a green heatmap, because a heatmap is a report card and this is a shelf.
 *
 * The copy rule from the PRD holds throughout: it never says you broke
 * anything. A quiet day is a quiet day.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  almanac,
  consistencyCaption,
  detectReturns,
  formatDay,
  plural,
  dayOf,
  quotable,
  type AlmanacMark,
} from '@morrow/core';
import {
  Body,
  Label,
  Readout,
  Rule,
  Statement,
  Stone,
  Studio,
  TextButton,
  UserText,
  accent,
  day,
  type as fonts,
  COLUMN,
  keyboardScroll,
} from '@morrow/ui';
import { useConsistency, useMorrow } from '../src/store';

/** Kinds of evidence, and what each one is called when it is read back. */
const EVIDENCE_LABEL: Record<string, string> = {
  move: 'Kept',
  practice: 'Practice',
  milestone: 'Milestone',
  capture: 'Caught',
  seal: 'Sealed the day',
};

function monthName(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? '';
}

export default function Progress() {
  const router = useRouter();
  const state = useMorrow((s) => s);
  const score = useConsistency();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const today = dayOf(new Date(), state.profile.dayBoundaryHour);
  const year = Number(today.slice(0, 4));
  const days = useMemo(() => Object.values(state.days), [state.days]);
  const returns = useMemo(() => detectReturns(days, today), [days, today]);
  const marks = useMemo(() => almanac(days, year), [days, year]);

  // Newest first: the ledger is read from the top, like a diary opened at today.
  // Only what the screen let through: a flagged line is kept on the device
  // and shown nowhere, and this was the one place it was still printed.
  const ledger = useMemo(
    () => quotable(state.evidence).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.evidence],
  );

  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? ledger : ledger.slice(0, 25);

  const goalTitle = (goalId: string | null | undefined) =>
    goalId ? state.goals.find((g) => g.id === goalId)?.title : undefined;

  return (
    <Studio testID="screen-progress">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton testID="progress-back" label="← Today" onPress={goBack} />
          <Label>Progress</Label>
        </View>

        <ScrollView {...keyboardScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 26 }}>
          {/* ---- the score */}
          <View style={{ gap: 6 }}>
            <Label>Consistency</Label>
            <Readout testID="progress-score">{score.score}</Readout>
            <Body testID="progress-caption" style={{ color: day.ink }}>
              {consistencyCaption(score)}
            </Body>
            <Bar value={score.score} low={score.baselineLow} high={score.baselineHigh} />
            {/*
              A band needs two ends. With one week of history low and high are
              the same number and "between 86 and 86" is not a sentence anyone
              would write, so say the simpler true thing instead.
            */}
            {score.baselineHigh > 0 && score.baselineHigh > score.baselineLow ? (
              <Label style={{ textTransform: 'none', letterSpacing: 0 }}>
                Your own eight weeks have run between {score.baselineLow} and {score.baselineHigh}.
              </Label>
            ) : score.baselineHigh > 0 ? (
              <Label style={{ textTransform: 'none', letterSpacing: 0 }}>
                Not enough weeks yet to say what your usual is.
              </Label>
            ) : null}
          </View>

          <Rule />

          {/* ---- returns */}
          <View style={{ gap: 8 }}>
            <Label>Returns</Label>
            {returns.length === 0 ? (
              <Body>
                No gaps to come back from yet. When there is one, coming back is the thing that gets counted.
              </Body>
            ) : (
              <>
                <Statement testID="progress-returns" style={{ fontSize: 24, lineHeight: 30 }}>
                  {returns.length === 1 ? 'One return.' : `${returns.length} returns.`}
                </Statement>
                <Body>Most people never come back once.</Body>
                {returns.slice(-3).reverse().map((r) => (
                  <Body key={r.returnedOn} style={{ fontSize: 13 }}>
                    Away {plural(r.gapDays, 'day')}, back on {formatDay(r.returnedOn, { today })}.
                  </Body>
                ))}
              </>
            )}
          </View>

          <Rule />

          {/* ---- the almanac */}
          <View style={{ gap: 10 }}>
            <Label>The Almanac · {year}</Label>
            <Body style={{ fontSize: 13 }}>
              One stone a day. They polish with what you put into the day and seat when you close it.
            </Body>
            <Almanac marks={marks} today={today} />
          </View>

          <Rule />

          {/* ---- the ledger */}
          <View style={{ gap: 10 }}>
            <Label>The ledger · {ledger.length} {ledger.length === 1 ? 'entry' : 'entries'}</Label>
            {ledger.length === 0 ? (
              <Body testID="progress-ledger-empty">
                Nothing in here yet. It fills with what you actually did, in your words, and nothing else.
              </Body>
            ) : (
              <View testID="progress-ledger">
                {shown.map((e) => {
                  const goal = goalTitle(e.goalId);
                  return (
                    <View
                      key={e.id}
                      testID={`ledger-${e.id}`}
                      style={{ paddingVertical: 11, borderTopWidth: 1, borderTopColor: day.line2, gap: 3 }}
                    >
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <Label style={{ color: accent.coralText }}>{EVIDENCE_LABEL[e.kind] ?? e.kind}</Label>
                        <Label>{formatDay(e.day, { weekday: true, today })}</Label>
                        {goal ? <Label style={{ textTransform: 'none', letterSpacing: 0 }}>{goal}</Label> : null}
                      </View>
                      {/*
                        Their words, so the serif. A capture and a sealed-day
                        line are sentences the person typed; a kept move carries
                        the title cut from their own Strategies line.
                      */}
                      <UserText style={{ fontSize: 16, lineHeight: 23 }}>{e.text}</UserText>
                    </View>
                  );
                })}
                {ledger.length > shown.length ? (
                  <Pressable
                    testID="ledger-more"
                    accessibilityRole="button"
                    accessibilityLabel={`Show all ${plural(ledger.length, 'entry', 'entries')}`}
                    onPress={() => setShowAll(true)}
                    style={{ paddingVertical: 14 }}
                  >
                    <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: accent.coralText }}>
                      Show all {ledger.length}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}

/**
 * The score against the band the person's own eight weeks have run in. Not a
 * target, and not anybody else's number.
 */
function Bar({ value, low, high }: { value: number; low: number; high: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const bandLeft = Math.max(0, Math.min(100, low));
  const bandWidth = Math.max(0, Math.min(100, high) - bandLeft);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Consistency"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ height: 10, borderRadius: 999, backgroundColor: day.surface2, overflow: 'hidden', marginTop: 4 }}
    >
      {bandWidth > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: `${bandLeft}%`,
            width: `${bandWidth}%`,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(23,24,28,0.10)',
          }}
        />
      ) : null}
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: accent.coral, borderRadius: 999 }} />
    </View>
  );
}

/**
 * A year of days as a shelf of stones, grouped by month so a thumb can find
 * September without counting. Deliberately not a heatmap.
 */
function Almanac({ marks, today }: { marks: AlmanacMark[]; today: string }) {
  const months = useMemo(() => {
    const out: { name: string; marks: AlmanacMark[] }[] = [];
    for (const m of marks) {
      const name = monthName(m.day);
      const last = out[out.length - 1];
      if (last && last.name === name) last.marks.push(m);
      else out.push({ name, marks: [m] });
    }
    return out;
  }, [marks]);

  // A shelf: one month to a row, every day on it, however wide the phone.
  // Wrapping 31 stones at a fixed size put five of them on a second line
  // under every month and called it a year.
  const { width } = useWindowDimensions();
  const LABEL = 38;
  const GAP = 2;
  const room = Math.min(width, COLUMN) - 44 - LABEL - GAP * 30;
  const stone = Math.max(6, Math.min(10, Math.floor(room / 31)));

  return (
    <View testID="progress-almanac" style={{ gap: 8 }}>
      {months.map((month) => (
        <View key={month.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
          <Label style={{ fontSize: 10, width: LABEL }}>{month.name}</Label>
          <View style={{ flexDirection: 'row', gap: GAP, alignItems: 'center' }}>
            {month.marks.map((m) => (
              <View
                key={m.day}
                accessible
                accessibilityRole="image"
                // Spoken, so a date a person would say and a count in the
                // right number. "2026-09-11, 1 in the ledger" is what a screen
                // reader used to read out for every stone on the shelf.
                accessibilityLabel={
                  m.sealed
                    ? `${formatDay(m.day, { weekday: true, today })}, sealed, ${plural(m.evidence, 'entry', 'entries')} in the ledger`
                    : m.quiet
                      ? `${formatDay(m.day, { weekday: true, today })}, a quiet day`
                      : `${formatDay(m.day, { weekday: true, today })}, ${plural(m.evidence, 'entry', 'entries')} in the ledger`
                }
                style={{
                  // Three weights on the shelf: a day not yet here is a
                  // shadow, a quiet day is a dull stone, a day with
                  // something in it is the stone at full weight. At eight
                  // points the polish alone cannot tell them apart, so the
                  // opacity carries it, on both studios.
                  opacity: m.day > today ? 0.18 : m.quiet && m.day !== today ? 0.42 : 1,
                  borderRadius: 999,
                  padding: m.day === today ? 1.5 : 0,
                  borderWidth: m.day === today ? 1.5 : 0,
                  borderColor: accent.coral,
                }}
              >
                <Stone
                  size={stone}
                  domain="custom"
                  // Polish is what the day held; seating is the person closing it.
                  polish={m.quiet ? 0.25 : Math.min(1, 0.6 + m.evidence * 0.15)}
                  seated={m.sealed}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
