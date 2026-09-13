/**
 * Letters (PRD §7.8).
 *
 * From the future self at the Portrait, the first Return, each milestone and
 * monthly — and, going the other way, one the person writes to themselves with
 * a delivery date.
 *
 * Two faces on this screen and the rule is the same as everywhere: a letter
 * from the future self is the coach writing, so it is set in the sans with
 * their quoted spans in the serif; a letter the person wrote is theirs from end
 * to end, so all of it is serif.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WRITE_TO_FUTURE_MAX_DAYS, dayOf, formatDay, plural, type Letter } from '@morrow/core';
import { Body, Card, Chip, InkButton, Label, Quoted, Rule, Statement, Studio, TextButton, UserField, UserText, accent, day } from '@morrow/ui';
import { useMorrow } from '../src/store';

/** The delivery distances offered, in days. A year is the ceiling. */
const WHEN: { label: string; days: number }[] = [
  { label: 'A month', days: 30 },
  { label: 'Three months', days: 90 },
  { label: 'Six months', days: 182 },
  { label: 'A year', days: WRITE_TO_FUTURE_MAX_DAYS },
];

/**
 * A letter's body with their quoted spans set in the serif.
 *
 * Split on the spans rather than styled with markup, because the spans are
 * verified substrings and nothing else on the screen is entitled to that face.
 * A span that is not found is simply not highlighted; it is never invented.
 */
function LetterBody({ letter }: { letter: Letter }) {
  if (letter.direction === 'to_future') {
    return <UserText style={{ fontSize: 17, lineHeight: 27, color: day.ink }}>{letter.body}</UserText>;
  }

  // The app's sentences around the person's own: the quotations in their
  // face, the rest in ours. The split itself lives in the ui package, where
  // every other mixed sentence in the product uses it.
  return <Quoted text={letter.body} spans={letter.quotes} style={{ fontSize: 16, lineHeight: 26, color: day.ink }} />;
}

export default function Letters() {
  const router = useRouter();
  const letters = useMorrow((s) => s.letters);
  const catchUpLetters = useMorrow((s) => s.catchUpLetters);
  const writeToFuture = useMorrow((s) => s.writeToFuture);
  const markLetterRead = useMorrow((s) => s.markLetterRead);
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);

  const [draft, setDraft] = useState('');
  const [days, setDays] = useState(WHEN[0]!.days);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  // Writing any the occasions have earned. Idempotent, so arriving here twice
  // is not two letters.
  useEffect(() => {
    catchUpLetters();
  }, [catchUpLetters]);

  // `dayOf`, not a hand-rolled copy of it. The version this screen had built
  // the local date and then called `toISOString()`, which converts to UTC — so
  // west of Greenwich a letter due today read as due tomorrow, on the one
  // screen whose whole job is knowing which day it is.
  const today = useMemo(() => dayOf(new Date(), boundary), [boundary]);

  const arrived = letters.filter((l) => l.deliverAt.slice(0, 10) <= today);
  const waiting = letters.filter((l) => l.deliverAt.slice(0, 10) > today);

  const send = () => {
    const out = writeToFuture(draft, days);
    if (!out.ok) {
      setProblem(out.error);
      return;
    }
    setProblem(null);
    setDraft('');
    setSent(out.letter.deliverAt);
  };

  return (
    <Studio testID="screen-letters">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton testID="letters-back" label="← Today" onPress={() => router.dismissTo('/today')} />
          <Label>Letters</Label>
        </View>

        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 18 }}>
          {arrived.length === 0 ? (
            <Statement testID="letters-none" style={{ fontSize: 22, lineHeight: 29 }}>
              Nothing has arrived yet.
            </Statement>
          ) : null}

          {arrived.map((l) => (
            <Card key={l.id} testID={`letter-${l.id}`} style={{ padding: 20, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Label style={{ color: accent.coralText }}>
                  {l.direction === 'to_future' ? 'From you' : 'From later'}
                </Label>
                <Label style={{ color: day.ink3 }}>{formatDay(l.deliverAt.slice(0, 10), { today })}</Label>
              </View>
              <LetterBody letter={l} />
              {!l.readAt ? (
                <TextButton testID={`letter-read-${l.id}`} label="Keep it" onPress={() => markLetterRead(l.id)} />
              ) : null}
            </Card>
          ))}

          {waiting.length ? (
            <Body testID="letters-waiting" style={{ fontSize: 13 }}>
              {plural(waiting.length, 'letter')} on the way, the first on{' '}
              {formatDay(waiting.map((l) => l.deliverAt.slice(0, 10)).sort()[0]!, { today })}.
            </Body>
          ) : null}

          <Rule />

          <View style={{ gap: 10 }}>
            <Label>Write to yourself</Label>
            {/*
              Their words, so the field is the serif one. Nothing here is
              screened for quality or rewritten: a letter to your future self
              that somebody else edited is not a letter to your future self.
            */}
            <UserField
              testID="letter-draft"
              label="Your letter to your future self"
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder="What do you want to be true by then?"
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WHEN.map((w) => (
                <Chip
                  key={w.days}
                  testID={`letter-when-${w.days}`}
                  label={w.label}
                  selected={days === w.days}
                  onPress={() => setDays(w.days)}
                />
              ))}
            </View>
            {problem ? (
              <Body testID="letter-problem" style={{ color: day.ink }}>
                {problem}
              </Body>
            ) : null}
            {sent ? (
              <Body testID="letter-sent" style={{ color: day.ink }}>
                Sealed until {formatDay(sent, { today })}. You will not see it again before then.
              </Body>
            ) : null}
            <InkButton testID="letter-send" label="Seal it until then" onPress={send} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
