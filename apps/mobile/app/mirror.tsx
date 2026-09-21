/**
 * The mirror (the rebuild, 2026-09-21): the app answers the first line.
 *
 * Their words back, verbatim, in the serif that is only ever theirs; one
 * question, in the app's own words, about their words; and the path from
 * here — five steps, with the first one already ticked. Nothing on this
 * screen was written about them: the engine quotes, labels and asks.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { AREAS, firstRunPath, mirrorLocally, type DomainId } from '@morrow/core';
import { Body, Card, Glyph, Label, PathCard, Rise, Screen, Statement, UserText, accent, day, useReducedMotion } from '@morrow/ui';
import { latestText, useFirstRun, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

export default function MirrorScreen() {
  const router = useRouter();
  useFirstRunStep('mirror');
  const reduced = useReducedMotion();
  const texts = useMorrow((s) => s.texts);
  const profile = useMorrow((s) => s.profile);
  const interviewDraft = useMorrow((s) => s.interviewDraft);
  const firstRun = useFirstRun();
  const warm = useMemo(() => latestText(texts, 'warmup'), [texts]);
  // The area they came here for is the mirror's hint, as it was the prompt's.
  const hint: DomainId | null = useMemo(() => {
    const first = interviewDraft?.s?.picked?.[0];
    return first ? (AREAS.find((a) => a.id === first)?.domain ?? 'custom') : null;
  }, [interviewDraft]);
  const mirror = useMemo(() => mirrorLocally(warm?.body ?? '', hint), [warm, hint]);
  const path = firstRunPath(firstRun);
  const name = profile.displayName.trim();

  const onward = () => router.push(firstRun.route as never);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  return (
    <Screen testID="screen-mirror" back={{ onPress: back, testID: 'mirror-back' }} where="Heard" secondary={{ label: 'Show me around first', onPress: () => router.dismissTo('/today'), testID: 'mirror-look' }}>
      <Rise index={0} reducedMotion={reduced} style={{ gap: 10 }}>
        <Label>{name ? `${name}, here is what I heard` : 'Here is what I heard'}</Label>
        <Statement testID="mirror-heading">{mirror.quotes.length ? 'Your first line is kept.' : 'Kept, as you wrote it.'}</Statement>
      </Rise>

      {mirror.quotes.length ? (
        <Rise index={1} reducedMotion={reduced}>
          <Card testID="mirror-quotes" style={{ gap: 12 }}>
            {mirror.quotes.map((q, i) => (
              <View key={q} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: accent.coral, marginTop: 4 }} />
                <UserText testID={`mirror-quote-${i}`} style={{ flex: 1, fontSize: 22, lineHeight: 31 }}>
                  {`“${q}”`}
                </UserText>
              </View>
            ))}
            <Body testID="mirror-note" style={{ fontSize: 14, color: day.ink2 }}>
              {mirror.note}
            </Body>
          </Card>
        </Rise>
      ) : null}

      <Rise index={2} reducedMotion={reduced} style={{ gap: 8, backgroundColor: day.surface2, borderRadius: 18, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Glyph name="chat" size={18} color={accent.coralText} />
          <Label>One question, for the fifteen minutes later</Label>
        </View>
        <Body testID="mirror-question" style={{ fontSize: 18, lineHeight: 26, color: day.ink }}>
          {mirror.question}
        </Body>
        <Body style={{ fontSize: 13, color: day.ink2 }}>No need to answer now. It will be on the page when you write your future.</Body>
      </Rise>

      <Rise index={3} reducedMotion={reduced}>
        <PathCard
          testID="mirror-path"
          title="Three short sessions to a Book you wrote."
          caption="Tonight or tomorrow, in any order you like. Nothing you write is ever lost."
          steps={path.steps.map((s) => ({ label: s.label, minutes: s.minutes, done: s.done }))}
          at={path.at}
          cta={{ label: firstRun.label, onPress: onward, testID: 'mirror-continue' }}
        />
      </Rise>
    </Screen>
  );
}
