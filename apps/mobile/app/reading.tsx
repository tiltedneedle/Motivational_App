/**
 * Sunday reading (PRD §7.3).
 *
 * "Ten minutes with the Book before the Horizon Review: a reading view with no
 * controls but a page turn; at the end, *Still true* or *Something moved*."
 *
 * So: no chrome. One page at a time, tap anywhere to turn, and the only two
 * decisions in the product that belong at the end of a re-reading rather than
 * at the start of one. The Sunday notification points here, and until this
 * screen existed it pointed at nothing in particular.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ANALYSIS_TITLES, bookPages, dayOf, distanceLabel, formatDay, horizonReview, plural, sealedOn, thenHalf } from '@morrow/core';
import { Body, Chip, InkButton, Label, Quoted, Rule, Statement, Studio, TextButton, UserText, night, paper, radius } from '@morrow/ui';
import { useGoals, useLatestBook, useMorrow } from '../src/store';

export default function Reading() {
  const router = useRouter();
  const book = useLatestBook();
  const goals = useGoals();
  const setToast = useMorrow((s) => s.setToast);
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);

  const pages = useMemo(() => (book ? bookPages(book) : []), [book]);
  const [index, setIndex] = useState(0);
  const [choosing, setChoosing] = useState(false);

  /**
   * The Horizon Review (PRD §7.9), on the last page: the week in four facts
   * — a number, the next milestones, one sentence they wrote this week, and
   * what a replan would change. Computed once for the sitting; the reading
   * is ten minutes and the ground should not move under it.
   */
  const days = useMorrow((s) => s.days);
  const plans = useMorrow((s) => s.plans);
  const propose = useMorrow((s) => s.proposeReplanFor);
  const review = useMemo(
    () =>
      horizonReview({
        today: dayOf(new Date(), boundary),
        days: Object.values(days),
        goals,
        plans,
        proposals: goals.map((g) => ({ goalId: g.id, changes: propose(g.id).length })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book?.id],
  );

  if (!book || pages.length === 0) {
    return (
      <Studio dark testID="screen-reading">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement style={{ color: night.ink }}>There is no Book to read yet.</Statement>
          <Body style={{ color: night.ink2 }}>Three evenings and there will be one.</Body>
          <InkButton testID="reading-back" label="Today" onPress={() => router.dismissTo('/today')} />
        </SafeAreaView>
      </Studio>
    );
  }

  const page = pages[Math.min(index, pages.length - 1)]!;
  const last = index >= pages.length - 1;

  const turn = () => {
    if (last) return;
    setIndex((i) => i + 1);
  };

  return (
    <Studio dark testID="screen-reading">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 18 }}>
        {/*
          The only chrome: which page of how many, and a way out. A reading view
          with no exit is a trap, and somebody who opened this on a Sunday and
          then remembered the kettle should not have to force-quit an app about
          keeping promises to themselves.
        */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
          <TextButton testID="reading-leave" label="← Today" onPress={() => router.dismissTo('/today')} />
          <Label testID="reading-progress" style={{ color: night.ink3 }}>
            {index + 1} of {plural(pages.length, 'page')}
          </Label>
        </View>

        <Pressable
          testID="reading-page"
          accessibilityRole="button"
          accessibilityLabel={last ? 'The last page' : 'Turn the page'}
          onPress={turn}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: paper.ground, borderRadius: radius.card }}
            contentContainerStyle={{ padding: 26, paddingBottom: 40, gap: 16, flexGrow: 1, justifyContent: 'center' }}
          >
            {page.kind === 'opening' ? (
              <>
                <Label style={{ color: paper.ink3 }}>Chapter one · the Fifteen</Label>
                <UserText testID="reading-first-sentence" style={{ fontSize: 28, lineHeight: 36, color: '#15181F' }}>
                  {page.firstSentence}
                </UserText>
                <UserText style={{ fontSize: 17, lineHeight: 28, color: paper.ink }}>{page.rest}</UserText>
              </>
            ) : null}

            {page.kind === 'shadow' ? (
              <>
                <Label style={{ color: paper.ink3 }}>The other road</Label>
                <UserText style={{ fontSize: 17, lineHeight: 28, color: paper.ink2 }}>{page.text}</UserText>
              </>
            ) : null}

            {page.kind === 'contents' ? (
              <>
                <Label style={{ color: paper.ink3 }}>Contents</Label>
                {page.chapters.map((c) => (
                  <View key={c.goalId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      {c.nameAuthored === false ? (
                        <Body style={{ fontSize: 17, color: paper.ink }}>{c.name}</Body>
                      ) : (
                        <UserText style={{ fontSize: 18, lineHeight: 25, color: '#15181F' }}>{c.name}</UserText>
                      )}
                    </View>
                    <Label style={{ color: paper.ink3 }}>{c.horizon}</Label>
                  </View>
                ))}
              </>
            ) : null}

            {page.kind === 'chapter' ? (
              <>
                {page.chapter.nameAuthored === false ? (
                  <Body style={{ fontSize: 21, color: paper.ink }}>{page.chapter.name}</Body>
                ) : (
                  <UserText style={{ fontSize: 22, lineHeight: 30, color: '#15181F' }}>{page.chapter.name}</UserText>
                )}
                {page.chapter.lines.map((l, i) => (
                  <View key={`${page.chapter.goalId}-${i}`} style={{ gap: 3 }}>
                    <Label style={{ color: paper.ink3 }}>
                      {ANALYSIS_TITLES[l.kind]}
                      {l.framingLabel ? ` · ${l.framingLabel}` : ''}
                    </Label>
                    <UserText style={{ fontSize: 17, lineHeight: 27, color: paper.ink }}>{l.text}</UserText>
                    {l.text2 ? (
                      <UserText italic framing={thenHalf(l.text2).framing} style={{ fontSize: 16, lineHeight: 25, color: paper.ink2 }}>
                        {thenHalf(l.text2).act}
                      </UserText>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            {page.kind === 'i-will' ? (
              <>
                <Label style={{ color: paper.ink3 }}>I will</Label>
                <UserText testID="reading-i-will" style={{ fontSize: 26, lineHeight: 36, color: '#15181F' }}>
                  {page.text}
                </UserText>
                <Rule style={{ backgroundColor: '#E2DACB' }} />
                <Label style={{ color: paper.ink3 }}>Sealed {formatDay(sealedOn(page.sealedAt, boundary))}</Label>

                <View testID="horizon-review" style={{ marginTop: 26, gap: 10 }}>
                  <Label style={{ color: paper.ink3 }}>This week</Label>
                  <Body testID="review-consistency" style={{ color: paper.ink }}>
                    {review.consistency.line}
                  </Body>
                  {review.next.slice(0, 3).map((n) => (
                    <Body key={n.goalId} testID={`review-next-${n.goalId}`} style={{ color: paper.ink2, fontSize: 14 }}>
                      {/* The first milestone's title already names the goal. */}
                      {n.title.toLowerCase().includes(n.goalTitle.toLowerCase()) ? n.title : `${n.goalTitle}: ${n.title}`} ·{' '}
                      {distanceLabel(n.daysAway).toLowerCase()}
                    </Body>
                  ))}
                  {review.insight ? (
                    <Quoted
                      testID="review-insight"
                      text={review.insight.text}
                      spans={review.insight.quotes}
                      style={{ color: paper.ink, fontSize: 15, lineHeight: 23 }}
                    />
                  ) : null}
                  {review.replans.map((r) => (
                    <View key={r.goalId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Body testID={`review-replan-${r.goalId}`} style={{ color: paper.ink2, fontSize: 14 }}>
                        A replan would change {plural(r.changes, 'row')} for {r.goalTitle}.
                      </Body>
                      <Chip testID={`review-replan-open-${r.goalId}`} label="See it" onPress={() => router.push(`/replan?goal=${r.goalId}`)} />
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </Pressable>

        <View style={{ paddingVertical: 14, gap: 10 }}>
          {last ? (
            choosing ? (
              <View testID="reading-pick-goal" style={{ gap: 8 }}>
                <Body style={{ color: night.ink2, fontSize: 14 }}>Which one moved?</Body>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {goals.map((g) => (
                    <Chip
                      key={g.id}
                      testID={`reading-moved-${g.id}`}
                      label={g.title}
                      onPress={() => router.replace(`/goal?id=${g.id}`)}
                    />
                  ))}
                </View>
                <TextButton testID="reading-never-mind" label="Never mind" onPress={() => setChoosing(false)} />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <InkButton
                  testID="reading-still-true"
                  label="Still true"
                  onPress={() => {
                    setToast({ text: 'Good. Nothing to change today.', kind: 'info' });
                    router.dismissTo('/today');
                  }}
                />
                <TextButton testID="reading-moved" label="Something moved" onPress={() => setChoosing(true)} />
              </View>
            )
          ) : (
            <Body testID="reading-hint" style={{ color: night.ink3, fontSize: 13, textAlign: 'center' }}>
              Tap the page to turn it.
            </Body>
          )}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
