/**
 * Day-90 re-authoring (PRD §7.3).
 *
 * "Two Books side by side. Per stone: Keep, Rewrite (the same screens with
 * the old line above the new) or Let it go (the goal is archived with a line
 * about what it taught, written now). The new edition is sealed with the
 * hold; the diff is its first page."
 *
 * Every line the person sealed, printed as it stands, with one choice under
 * it. Keep is the default and costs nothing: a Book that is read again and
 * stands is a re-authoring too, and its first page says "Kept". Rewrite
 * opens the same stone it was written on, with the sealed line above the
 * field. Let it go asks for the one line the PRD asks for, and no more.
 *
 * Nothing here is committed until the hold on the seal screen: the sealed
 * edition is never touched, a stone written again is a stone written again,
 * and a goal let go can be taken back until the new edition exists.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ANALYSIS_TITLES,
  canReauthor,
  dayOf,
  formatDay,
  ordinal,
  plural,
  reauthorDue,
  reauthorLabel,
  sealedOn,
  sideBySide,
  thenHalf,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Rule, Statement, Studio, TextButton, TopBar, UserField, UserText, accent, day, radius } from '@morrow/ui';
import { activeGoals, entitlementOf, useMorrow } from '../src/store';

export default function ReauthorScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const showResources = useMorrow((st) => st.showResources);
  const books = useMorrow((s) => s.books);
  const goals = useMorrow((s) => s.goals);
  const analyses = useMorrow((s) => s.analyses);
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);
  const letGo = useMorrow((s) => s.letGoGoal);
  const takeBack = useMorrow((s) => s.takeBackGoal);
  const write = useMorrow((s) => s.writeAnalysis);
  const state = useMorrow((s) => s);

  const previous = books[books.length - 1];
  const today = dayOf(new Date(), boundary);
  const due = reauthorDue(books, today, boundary);
  const gate = canReauthor(entitlementOf(state, today));

  const chapters = useMemo(() => (previous ? sideBySide(previous, goals, analyses) : []), [previous, goals, analyses]);
  const newSince = useMemo(
    () => (previous ? activeGoals(state).filter((g) => !previous.chapters.some((c) => c.goalId === g.id)) : []),
    [previous, state],
  );

  /** The goal whose Let it go line is open, and the line. */
  const [lettingGo, setLettingGo] = useState<string | null>(null);
  const [lesson, setLesson] = useState('');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.dismissTo('/today');
  };

  if (!previous) {
    return (
      <Studio testID="screen-reauthor">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ label: 'Today', onPress: goBack, testID: 'reauthor-back' }} help={{ onPress: showResources }} />
          <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
            <Statement testID="reauthor-none">There is no Book to write again yet.</Statement>
            <Body>Ninety days after the first one is sealed, this is where it is read against the stones as they stand then.</Body>
            <InkButton label="Back to today" onPress={() => router.dismissTo('/today')} style={{ marginTop: 18 }} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  if (!gate.allowed) {
    return (
      <Studio testID="screen-reauthor">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar back={{ label: 'Today', onPress: goBack, testID: 'reauthor-back' }} help={{ onPress: showResources }} />
          <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
            <Label>{due ? reauthorLabel(due.cycle) : 'Writing it again'}</Label>
            <Statement testID="reauthor-gated">Time to write it again.</Statement>
            <Body>{gate.reason}</Body>
            <InkButton
              testID="reauthor-see-pro"
              label="See Morrow Pro"
              onPress={() => router.push(`/paywall?moment=${gate.moment}&from=${encodeURIComponent(from ?? '/today')}`)}
              style={{ marginTop: 18 }}
            />
            <TextButton label="Not now" onPress={goBack} />
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  const rewrittenCount = chapters.reduce((n, c) => n + (c.letGo ? 0 : c.lines.filter((l) => l.rewritten).length), 0);
  const letGoCount = chapters.filter((c) => c.letGo).length;
  const nextEdition = ordinal(previous.version + 1).toLowerCase();

  return (
    <Studio testID="screen-reauthor">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar
          back={{ label: 'Today', onPress: goBack, testID: 'reauthor-back' }}
          where={due ? reauthorLabel(due.cycle) : `${ordinal(previous.version)} edition`}
          help={{ onPress: showResources }}
        />
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24, gap: 18 }}
        >
          <View style={{ gap: 8 }}>
            <Label testID="reauthor-sealed">
              {ordinal(previous.version)} edition · sealed {formatDay(sealedOn(previous.sealedAt, boundary))}
            </Label>
            <Statement testID="reauthor-title">Time to write it again.</Statement>
            <Body>
              Every line you sealed, and a choice for each: keep it, or write it again with the old one above. A goal that has done its work can be let go, with a line about what it taught.
            </Body>
          </View>

          {chapters.map((ch) => (
            <View key={ch.goalId} testID={`reauthor-goal-${ch.goalId}`} style={{ gap: 12, backgroundColor: day.surface2, borderRadius: radius.card, padding: 16 }}>
              {ch.nameAuthored ? (
                <UserText style={{ fontSize: 21, lineHeight: 28, color: day.ink }}>{ch.name}</UserText>
              ) : (
                <Body style={{ fontSize: 20, lineHeight: 28, color: day.ink }}>{ch.name}</Body>
              )}

              {ch.letGo ? (
                <View style={{ gap: 6 }}>
                  <Label style={{ color: accent.coralText }}>Let go</Label>
                  {ch.letGo.lesson ? (
                    <UserText italic testID={`reauthor-lesson-${ch.goalId}`} style={{ fontSize: 17, lineHeight: 26, color: day.ink2 }}>
                      {ch.letGo.lesson}
                    </UserText>
                  ) : null}
                  <View style={{ alignItems: 'flex-start' }}>
                    <TextButton testID={`reauthor-take-back-${ch.goalId}`} label="Take it back" onPress={() => takeBack(ch.goalId)} />
                  </View>
                </View>
              ) : (
                <>
                  {ch.lines.map((l) => (
                    <View key={l.kind} style={{ gap: 6 }}>
                      <Label>
                        {ANALYSIS_TITLES[l.kind]}
                        {l.before.framingLabel ? ` · ${l.before.framingLabel}` : ''}
                      </Label>
                      <UserText
                        testID={`reauthor-before-${ch.goalId}-${l.kind}`}
                        style={{ fontSize: 17, lineHeight: 26, color: l.rewritten ? day.ink3 : day.ink }}
                      >
                        {l.before.text}
                      </UserText>
                      {l.before.text2 ? (
                        <UserText italic framing={thenHalf(l.before.text2).framing} style={{ fontSize: 15, lineHeight: 23, color: day.ink3 }}>
                          {thenHalf(l.before.text2).act}
                        </UserText>
                      ) : null}
                      {l.rewritten && l.now ? (
                        <View style={{ gap: 2, borderLeftWidth: 2, borderLeftColor: accent.coral, paddingLeft: 10 }}>
                          <Label style={{ color: accent.coralText }}>Now</Label>
                          <UserText testID={`reauthor-now-${ch.goalId}-${l.kind}`} style={{ fontSize: 17, lineHeight: 26, color: day.ink }}>
                            {l.now}
                          </UserText>
                        </View>
                      ) : null}
                      {/*
                        Two radios. Keep is on until the stone is written again;
                        then it becomes the way back to the sealed line, which
                        is put back on the stone word for word. Rewrite opens
                        the stone with the sealed line above the field, and
                        stays on once there is a new line, so it can be
                        changed again from here.
                      */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <Chip
                          testID={`reauthor-keep-${ch.goalId}-${l.kind}`}
                          label={l.rewritten ? 'Keep the old' : 'Keep'}
                          accessibilityLabel={`${l.rewritten ? 'Keep the old' : 'Keep'}, ${ANALYSIS_TITLES[l.kind]}`}
                          selected={!l.rewritten}
                          ghost={l.rewritten}
                          onPress={() => {
                            if (!l.rewritten) return;
                            const a = analyses.find((x) => x.goalId === ch.goalId && x.kind === l.kind);
                            write(ch.goalId, l.kind, {
                              framingId: a?.framingId ?? null,
                              line: l.before.text,
                              ...(l.before.text2 ? { line2: l.before.text2 } : {}),
                              ...(l.before.paragraph ? { paragraph: l.before.paragraph } : {}),
                            });
                          }}
                        />
                        <Chip
                          testID={`reauthor-rewrite-${ch.goalId}-${l.kind}`}
                          label={l.rewritten ? 'Written again' : 'Rewrite'}
                          accessibilityLabel={`${l.rewritten ? 'Written again' : 'Rewrite'}, ${ANALYSIS_TITLES[l.kind]}`}
                          selected={l.rewritten}
                          ghost={!l.rewritten}
                          onPress={() => router.push(`/stone?goal=${ch.goalId}&kind=${l.kind}&rewrite=1&from=${encodeURIComponent('/reauthor')}`)}
                        />
                      </View>
                    </View>
                  ))}

                  <Rule />
                  {lettingGo === ch.goalId ? (
                    <View style={{ gap: 8 }}>
                      <Label>What it taught</Label>
                      <UserField
                        testID={`reauthor-lesson-field-${ch.goalId}`}
                        labelHidden
                        label="What this goal taught you"
                        value={lesson}
                        onChangeText={setLesson}
                        placeholder="one line, written now"
                        multiline
                      />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <Chip
                          testID={`reauthor-let-go-confirm-${ch.goalId}`}
                          label="Let it go"
                          selected
                          onPress={() => {
                            if (!lesson.trim()) return;
                            letGo(ch.goalId, lesson);
                            setLettingGo(null);
                            setLesson('');
                          }}
                        />
                        <TextButton
                          testID={`reauthor-let-go-cancel-${ch.goalId}`}
                          label="Keep it"
                          onPress={() => {
                            setLettingGo(null);
                            setLesson('');
                          }}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'flex-start' }}>
                      <TextButton
                        testID={`reauthor-let-go-${ch.goalId}`}
                        label="Let it go"
                        onPress={() => {
                          setLettingGo(ch.goalId);
                          setLesson('');
                        }}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          ))}

          {newSince.length ? (
            <View testID="reauthor-new" style={{ gap: 6 }}>
              <Label>New since then</Label>
              {newSince.map((g) =>
                g.titleAuthored === false ? (
                  <Body key={g.id} style={{ fontSize: 16, color: day.ink }}>
                    {g.title}
                  </Body>
                ) : (
                  <UserText key={g.id} style={{ fontSize: 17, lineHeight: 26, color: day.ink }}>
                    {g.title}
                  </UserText>
                ),
              )}
              <Body style={{ fontSize: 13 }}>Written on its own stones; it joins the {nextEdition} edition as it stands.</Body>
            </View>
          ) : null}

          <View style={{ gap: 8, marginTop: 6 }}>
            <Body testID="reauthor-summary" style={{ fontSize: 14 }}>
              {rewrittenCount === 0 && letGoCount === 0
                ? 'Nothing changed so far. A Book read again and left standing is a re-authoring too; its first page will say so.'
                : [
                    rewrittenCount ? `${plural(rewrittenCount, 'line')} written again` : '',
                    letGoCount ? `${plural(letGoCount, 'goal')} let go` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </Body>
            <InkButton testID="reauthor-seal" label={`Seal the ${nextEdition} edition`} onPress={() => router.push('/seal-book?from=reauthor')} />
            <Body style={{ fontSize: 13 }}>
              Nothing is overwritten. The {ordinal(previous.version).toLowerCase()} edition stays as it was, and what changed is the new one’s first page.
            </Body>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
