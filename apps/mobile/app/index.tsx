/**
 * Welcome (PRD §7.1). No sign-up wall, honest times, and the sittings named
 * before anyone commits to anything.
 */
import { useIsFocused, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Rise, Statement, Stone, Studio, TextButton, day, useReducedMotion } from '@morrow/ui';
import { useLatestBook, useMorrow } from '../src/store';
import { hasSupabase } from '../src/supabase';

const SITTINGS: { when: string; what: string; long: string }[] = [
  { when: 'Tonight', what: 'Find it, then write it', long: '25–35 min' },
  { when: 'Morning', what: 'Put it in order', long: '15–20 min' },
  { when: 'Evening', what: 'Make the plan and seal the Book', long: '20–30 min' },
];

export default function Welcome() {
  const router = useRouter();
  const book = useLatestBook();
  const profile = useMorrow((s) => s.profile);
  const account = useMorrow((s) => s.account);
  const setProfile = useMorrow((s) => s.setProfile);
  const reduced = useReducedMotion();
  const focused = useIsFocused();

  return (
    <Studio testID="screen-welcome">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
          <Rise index={0} reducedMotion={reduced} style={{ alignItems: 'center', gap: 20 }}>
            <Stone size={112} domain="health" polish={1} sweep={!reduced && focused} testID="welcome-stone" />
            <Statement style={{ fontSize: 48, lineHeight: 52, textAlign: 'center' }}>Morrow</Statement>
            <Body style={{ textAlign: 'center', fontSize: 19, lineHeight: 26, maxWidth: 300 }}>
              Write your future in your own words. Then live by it.
            </Body>
          </Rise>

          <Rise index={1} reducedMotion={reduced} style={{ marginTop: 8 }}>
            <Label>Three evenings, honestly timed</Label>
            {SITTINGS.map((s) => (
              <View
                key={s.when}
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 12,
                  paddingVertical: 11,
                  borderTopWidth: 1,
                  borderTopColor: day.line2,
                }}
              >
                <Label style={{ width: 66 }}>{s.when}</Label>
                <Body style={{ flex: 1, fontSize: 15, color: day.ink }}>{s.what}</Body>
                <Label>{s.long}</Label>
              </View>
            ))}
          </Rise>

          <View style={{ gap: 8 }}>
            <Label>How do you want to be spoken to?</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['gentle', 'straight', 'fierce'] as const).map((p) => (
                <Chip
                  key={p}
                  testID={`persona-${p}`}
                  label={p[0]!.toUpperCase() + p.slice(1)}
                  selected={profile.persona === p}
                  onPress={() => setProfile({ persona: p })}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={{ paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="welcome-begin"
            label={book ? 'Back to today' : 'Begin tonight'}
            onPress={() => router.push(book ? '/today' : '/consent')}
          />
          {book ? null : <TextButton testID="welcome-have-book" label="I already have a Book" onPress={() => router.push('/today')} />}
          {/*
            A new phone (PRD §7.12): the one door back to a Book kept on the
            account, before anything is written here — once a goal exists the
            device has writing of its own and the account will not overwrite it.
          */}
          {!book && hasSupabase && !account ? (
            <TextButton testID="welcome-bring-back" label="Bring my Book back from my account" onPress={() => router.push('/account')} />
          ) : null}
          <Label style={{ textAlign: 'center', marginTop: 4 }}>No sign-up until your Book exists</Label>
        </View>
      </SafeAreaView>
    </Studio>
  );
}
