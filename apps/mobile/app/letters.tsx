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
import { WRITE_TO_FUTURE_MAX_DAYS, formatDay, plural, type Letter } from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, UserField, UserText, accent, day, radius } from '@morrow/ui';
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

  const parts: { text: string; theirs: boolean }[] = [];
  let rest = letter.body;
  // Longest first, so a short span inside a long one cannot split it in half.
  for (const q of [...letter.quotes].sort((a, b) => b.length - a.length)) {
    const at = rest.indexOf(q);
    if (at === -1) continue;
    if (at > 0) parts.push({ text: rest.slice(0, at), theirs: false });
    parts.push({ text: q, theirs: true });
    rest = rest.slice(at + q.length);
  }
  if (rest) parts.push({ text: rest, theirs: false });

  return (
    <Body style={{ fontSize: 16, lineHeight: 26, color: day.ink }}>
      {parts.map((p, i) =>
        p.theirs ? (
          <UserText key={i} italic style={{ fontSize: 16, lineHeight: 26, color: day.ink }}>
            {p.text}
          </UserText>
        ) : (
          <Body key={i} style={{ fontSize: 16, lineHeight: 26, color: day.ink }}>
            {p.text}
          </Body>
        ),
      )}
    </Body>
  );
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

  const today = useMemo(() => {
    const d = new Date();
    if (d.getHours() < boundary) d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [boundary]);

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
          <TextButton testID="letters-back" label="← Today" onPress={() => router.replace('/today')} />
          <Label>Letters</Label>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 18 }}>
          {arrived.length === 0 ? (
            <Statement testID="letters-none" style={{ fontSize: 22, lineHeight: 29 }}>
              Nothing has arrived yet.
            </Statement>
          ) : null}

          {arrived.map((l) => (
            <View
              key={l.id}
              testID={`letter-${l.id}`}
              style={{ backgroundColor: day.surface, borderRadius: radius.card, padding: 18, gap: 10 }}
            >
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
            </View>
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
