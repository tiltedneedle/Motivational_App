/**
 * Envision (PRD §7.8): the life on the other side of the work, and the one on
 * the other road.
 *
 * Three scenes per goal — an ordinary morning of doing it, the morning it is
 * reached, and an unremarkable Tuesday afterwards — plus the road where the
 * habits won. Each has to contain a detail lifted from what this person
 * actually wrote, checked by `guarded` before it is ever stored. A scene that
 * could belong to anyone is not their future; it is stock footage, and the
 * screen would rather say nothing than show it.
 *
 * No image service is wired here, and the PRD is explicit that the feature
 * never shows an empty state. So the fallback is typographic and is treated as
 * the design rather than as a gap: the scene is set as a card, and the phrase
 * that came from their own writing is set in the serif inside it, because that
 * half is theirs.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { domainMeta, type Scene } from '@morrow/core';
import {
  Body,
  Chip,
  Label,
  Rule,
  Statement,
  Stone,
  Studio,
  TextButton,
  UserText,
  accent,
  night,
  TopBar,
} from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';
import { FloatingTabs, TAB_BAR_ROOM } from '../src/tabs';

type SceneType = Scene['type'];

const SCENES: { type: SceneType; title: string; blurb: string }[] = [
  { type: 'practice', title: 'The practice', blurb: 'An ordinary morning of doing the work.' },
  { type: 'moment', title: 'The moment', blurb: 'The morning it is actually reached.' },
  { type: 'tuesday', title: 'An ordinary Tuesday', blurb: 'Life after, unremarkable and good.' },
  { type: 'other_road', title: 'The other road', blurb: 'The same distance ahead, if the habits win.' },
];

export default function Envision() {
  const router = useRouter();
  const goals = useGoals();
  const scenes = useMorrow((s) => s.scenes);
  const track = useMorrow((s) => s.profile.track);
  const makeScene = useMorrow((s) => s.makeScene);
  const hasShadow = useMorrow((s) => s.texts.some((t) => t.kind === 'shadow' && t.body.trim().length > 0));
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const [goalId, setGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const [drawing, setDrawing] = useState<SceneType | null>(null);
  /**
   * Why a type has no scene, when it has none.
   *
   * Two different reasons, and for a long time one message: "there is not
   * enough of your own writing behind this one yet" was printed whether the
   * person had written nothing or the request had simply failed. Telling
   * somebody who has written plenty that their writing is not enough is the
   * app blaming them for its own bad evening.
   */
  const [why, setWhy] = useState<Record<string, 'nothing-to-build-from' | 'failed'>>({});

  const draw = useCallback(
    async (type: SceneType) => {
      if (!goal) return;
      setDrawing(type);
      try {
        const made = await makeScene(goal.id, type);
        setWhy((w) => {
          const next = { ...w };
          if (made.ok) delete next[`${goal.id}:${type}`];
          else next[`${goal.id}:${type}`] = made.reason === 'failed' ? 'failed' : 'nothing-to-build-from';
          return next;
        });
      } finally {
        setDrawing(null);
      }
    },
    [goal, makeScene],
  );

  // Draw the first one on arrival, so the screen opens with something to read
  // rather than four buttons.
  useEffect(() => {
    if (!goal) return;
    const has = scenes.some((s) => s.goalId === goal.id && s.type === 'practice');
    if (!has && !why[`${goal.id}:practice`]) void draw('practice');
    // Only when the goal changes: drawing is idempotent but not free.
  }, [goal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!goal) {
    return (
      <Studio dark testID="screen-envision">
        <SafeAreaView style={{ flex: 1, padding: 22, paddingBottom: TAB_BAR_ROOM, justifyContent: 'center', gap: 12 }}>
          <Statement style={{ color: night.ink }}>Nothing to picture yet.</Statement>
          <Body style={{ color: night.ink2 }}>
            Envision is built out of what you have already written. Name a goal and write your future, and this fills
            itself.
          </Body>
          <TextButton label="← Today" onPress={goBack} />
          <FloatingTabs active="envision" />
        </SafeAreaView>
      </Studio>
    );
  }

  const meta = domainMeta(goal.domain);

  return (
    <Studio dark testID="screen-envision">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: goBack, testID: 'envision-back' }} right={<Label style={{ color: night.ink3 }}>Envision</Label>} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, paddingBottom: 18 + TAB_BAR_ROOM, gap: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Stone size={54} domain={goal.domain} polish={0.85} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label style={{ color: meta.inkNight }}>{goal.domainLabel ?? meta.label}</Label>
              {goal.titleAuthored === false ? (
                <Statement style={{ color: night.ink, fontSize: 24, lineHeight: 29 }}>{goal.title}</Statement>
              ) : (
                <UserText style={{ color: night.ink, fontSize: 24, lineHeight: 30 }}>{goal.title}</UserText>
              )}
            </View>
          </View>

          {goals.length > 1 ? (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {goals.map((g) => (
                <Chip
                  key={g.id}
                  testID={`envision-goal-${g.id}`}
                  label={g.title}
                  selected={g.id === goal.id}
                  onPress={() => setGoalId(g.id)}
                />
              ))}
            </View>
          ) : null}

          <Rule />

          {SCENES.map(({ type, title, blurb }) => {
            const scene = scenes.find((s) => s.goalId === goal.id && s.type === type);
            // PRD 7.8: the other road is drawn from the shadow, and if the
            // shadow was never written, the eight-minute write is offered here
            // rather than a scene made up in its place.
            if (type === 'other_road' && !hasShadow) {
              return (
                <View key={type} testID="envision-other_road" style={{ gap: 8 }}>
                  <Label style={{ color: night.ink3 }}>{title}</Label>
                  <View style={{ borderWidth: 1, borderColor: night.line, borderRadius: 22, padding: 18, gap: 6 }}>
                    <Body style={{ color: night.ink2 }}>
                      Nothing is drawn here until you have written it. {track === 'full' ? 'Fifteen' : 'Eight'} minutes, the same distance ahead, and the
                      habits won.
                    </Body>
                    <TextButton
                      testID="scene-write-shadow"
                      label="Write the other road"
                      onPress={() => router.push('/write?kind=shadow')}
                    />
                  </View>
                </View>
              );
            }
            const missing = why[`${goal.id}:${type}`];
            const busy = drawing === type;
            return (
              <View key={type} testID={`envision-${type}`} style={{ gap: 8 }}>
                <Label style={{ color: type === 'other_road' ? night.ink3 : meta.inkNight }}>{title}</Label>

                {scene ? (
                  <View
                    testID={`scene-${type}`}
                    style={{
                      backgroundColor: type === 'other_road' ? 'rgba(255,255,255,0.03)' : night.surface,
                      borderRadius: 22,
                      borderLeftWidth: 3,
                      borderLeftColor: type === 'other_road' ? night.line : accent.coralNight,
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Body style={{ color: night.ink, fontSize: 16, lineHeight: 24 }}>{scene.narrative}</Body>
                    {scene.sourcedDetail ? (
                      <View style={{ gap: 2 }}>
                        <Label style={{ color: night.ink3, fontSize: 10 }}>From your own writing</Label>
                        {/* Their phrase, so the serif. The rest of the card is not. */}
                        <UserText italic style={{ fontSize: 15, lineHeight: 22, color: night.ink2 }}>
                          “{scene.sourcedDetail}”
                        </UserText>
                      </View>
                    ) : null}
                  </View>
                ) : missing === 'failed' ? (
                  <View
                    testID={`scene-failed-${type}`}
                    style={{ borderWidth: 1, borderColor: night.line, borderRadius: 22, padding: 18, gap: 6 }}
                  >
                    <Body style={{ color: night.ink2 }}>
                      This one would not draw just now. Nothing of yours was lost, and nothing was made up in its place.
                    </Body>
                    <TextButton testID={`scene-retry-${type}`} label="Try again" onPress={() => void draw(type)} />
                  </View>
                ) : missing ? (
                  <View
                    testID={`scene-empty-${type}`}
                    style={{
                      borderWidth: 1,
                      borderColor: night.line,
                      borderRadius: 22,
                      padding: 18,
                      gap: 6,
                    }}
                  >
                    <Body style={{ color: night.ink2 }}>
                      There is not enough of your own writing behind this one yet. Write your future, or the line about
                      who else it changes, and it will have something true to be made of.
                    </Body>
                    <TextButton
                      testID={`scene-write-${type}`}
                      label="Write that line"
                      onPress={() => router.push(`/stone?goal=${goal.id}&kind=impact`)}
                    />
                  </View>
                ) : busy ? (
                  <View style={{ paddingVertical: 22, alignItems: 'flex-start' }}>
                    <ActivityIndicator color={night.ink3} />
                  </View>
                ) : (
                  <View style={{ gap: 10, alignItems: 'flex-start' }}>
                    <Body style={{ color: night.ink3, fontSize: 13 }}>{blurb}</Body>
                    <Chip testID={`scene-draw-${type}`} label="Picture it" ghost onPress={() => void draw(type)} />
                  </View>
                )}
              </View>
            );
          })}

          <Rule style={{ backgroundColor: night.line }} />

          {/*
            The way to the letters when none is waiting.

            Today offers them only while one is unread, so once they had all
            been read the screen was unreachable — and the half of it where a
            person writes to their own future self went with it. §7.8 puts
            scenes and letters in the same room, so this is that room.
          */}
          {/* One quiet row, the way the Book's exports sit — not two centred lines with a gulf between them. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <TextButton testID="envision-letters" label="Letters →" onPress={() => router.push('/letters')} />
            <TextButton
              testID="envision-wallpaper"
              label="Lock screen →"
              onPress={() => router.push(goal ? `/wallpaper?goal=${goal.id}` : '/wallpaper')}
            />
          </View>

          <Body style={{ color: night.ink3, fontSize: 12, lineHeight: 18 }}>
            Every one of these is built from something you wrote. If there is nothing of yours to build it from, nothing
            gets made up to fill the space.
          </Body>
        </ScrollView>
        <FloatingTabs active="envision" />
      </SafeAreaView>
    </Studio>
  );
}
