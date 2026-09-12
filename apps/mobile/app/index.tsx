/**
 * Welcome (PRD §7.1): three screens. A stone settles on the studio floor and
 * says what this is; the three sittings with their real lengths, and what
 * comes out of them; then your name and how you want to be spoken to. No
 * sign-up wall, and every page has a way past it.
 *
 * It was one screen — the stone, the sittings and the persona chips at once
 * — which is everything a person needs to know and nothing they can take in
 * before they have tapped anything. Three pages read one at a time.
 */
import { useIsFocused, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Chip, InkButton, Label, Rise, Statement, Stone, Studio, TextButton, UserField, day, useReducedMotion } from '@morrow/ui';
import { useLatestBook, useMorrow } from '../src/store';
import { hasSupabase } from '../src/supabase';

const SITTINGS: { when: string; what: string; long: string }[] = [
  { when: 'Tonight', what: 'Find it, then write it', long: '25–35 min' },
  { when: 'Morning', what: 'Put it in order', long: '15–20 min' },
  { when: 'Evening', what: 'Make the plan and seal the Book', long: '20–30 min' },
];

const OUT: { name: string; what: string }[] = [
  { name: 'Your Book', what: 'the future, in your own words' },
  { name: 'Your Blueprint', what: 'the plan, cut from what you wrote' },
  { name: 'Today', what: 'one stone a day; seal the day each evening' },
];

const PAGES = 3;

export default function Welcome() {
  const router = useRouter();
  const book = useLatestBook();
  const profile = useMorrow((s) => s.profile);
  const account = useMorrow((s) => s.account);
  const setProfile = useMorrow((s) => s.setProfile);
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  // Somebody with a Book has read all this; they land on the last page,
  // where the way back to Today is.
  const [page, setPage] = useState(book ? PAGES - 1 : 0);
  const [name, setName] = useState(profile.displayName);

  const next = () => setPage((p) => Math.min(PAGES - 1, p + 1));
  const begin = () => {
    const trimmed = name.trim();
    if (trimmed !== profile.displayName) setProfile({ displayName: trimmed });
    router.push(book ? '/today' : '/consent');
  };

  return (
    <Studio testID="screen-welcome">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        {/* Where you are among the three, and a way past them. */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, minHeight: 56 }}>
          {page > 0 ? <TextButton testID="welcome-back" label="← Back" onPress={() => setPage((p) => Math.max(0, p - 1))} /> : <View />}
          {page < PAGES - 1 ? <TextButton testID="welcome-skip" label="Skip" onPress={() => setPage(PAGES - 1)} /> : <View />}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
          {page === 0 ? (
            <Rise key="p0" index={0} reducedMotion={reduced} style={{ alignItems: 'center', gap: 20 }}>
              <Stone size={112} domain="health" polish={1} sweep={!reduced && focused} testID="welcome-stone" />
              <Statement style={{ fontSize: 48, lineHeight: 52, textAlign: 'center' }}>Morrow</Statement>
              <Statement testID="welcome-page-0" style={{ fontSize: 24, lineHeight: 30, textAlign: 'center', maxWidth: 320 }}>
                Meet who you’re becoming.
              </Statement>
              <Body style={{ textAlign: 'center', fontSize: 17, lineHeight: 25, maxWidth: 300 }}>
                You write your future in your own words. Then the app helps you live by it, one ordinary day at a time.
              </Body>
            </Rise>
          ) : null}

          {page === 1 ? (
            <Rise key="p1" index={0} reducedMotion={reduced} style={{ gap: 20 }}>
              <Statement testID="welcome-page-1">Three evenings, honestly timed. Then every day.</Statement>
              <View>
                {SITTINGS.map((s) => (
                  <View
                    key={s.when}
                    style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: day.line2 }}
                  >
                    <Label style={{ width: 66 }}>{s.when}</Label>
                    <Body style={{ flex: 1, fontSize: 15, color: day.ink }}>{s.what}</Body>
                    <Label>{s.long}</Label>
                  </View>
                ))}
              </View>
              <View style={{ gap: 6 }}>
                <Label>What you end up with</Label>
                {OUT.map((o) => (
                  <View key={o.name} style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
                    <Body style={{ color: day.ink, fontSize: 15, width: 118 }}>{o.name}</Body>
                    <Body style={{ flex: 1, fontSize: 15 }}>{o.what}</Body>
                  </View>
                ))}
              </View>
              <Body style={{ fontSize: 13 }}>Nothing is written for you. The app asks, listens, sorts and typesets; every word is yours.</Body>
            </Rise>
          ) : null}

          {page === 2 ? (
            <Rise key="p2" index={0} reducedMotion={reduced} style={{ gap: 22 }}>
              <Statement testID="welcome-page-2">{book ? 'Welcome back.' : 'Last thing before we start.'}</Statement>
              <UserField
                testID="welcome-name"
                label="What should the coach call you? (optional)"
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                autoCapitalize="words"
              />
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
                <Body style={{ fontSize: 13 }}>You can change this any time in You.</Body>
              </View>
            </Rise>
          ) : null}
        </View>

        {/* The dots, and the one button. */}
        <View style={{ paddingBottom: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }} accessibilityLabel={`Page ${page + 1} of ${PAGES}`} accessible>
            {Array.from({ length: PAGES }, (_, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Page ${i + 1}`}
                onPress={() => setPage(i)}
                hitSlop={8}
                style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? day.ink : day.line }}
              />
            ))}
          </View>
          {page < PAGES - 1 ? (
            <InkButton testID="welcome-next" label="Next" onPress={next} />
          ) : (
            <>
              <InkButton testID="welcome-begin" label={book ? 'Back to today' : 'Begin tonight'} onPress={begin} />
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
            </>
          )}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
