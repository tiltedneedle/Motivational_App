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
} from '@morrow/ui';
import { useGoals, useMorrow } from '../src/store';

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
  const makeScene = useMorrow((s) => s.makeScene);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const [goalId, setGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  const [drawing, setDrawing] = useState<SceneType | null>(null);
  /** Types that came back with nothing of theirs to build from. */
  const [empty, setEmpty] = useState<Record<string, boolean>>({});

  const draw = useCallback(
    async (type: SceneType) => {
      if (!goal) return;
      setDrawing(type);
      try {
        const made = await makeScene(goal.id, type);
        setEmpty((e) => ({ ...e, [`${goal.id}:${type}`]: made === null }));
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
    if (!has && !empty[`${goal.id}:practice`]) void draw('practice');
    // Only when the goal changes: drawing is idempotent but not free.
  }, [goal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!goal) {
    return (
      <Studio dark testID="screen-envision">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement style={{ color: night.ink }}>Nothing to picture yet.</Statement>
          <Body style={{ color: night.ink2 }}>
            Envision is built out of what you have already written. Name a goal and write the Fifteen, and this fills
            itself.
          </Body>
          <TextButton label="← Today" onPress={goBack} />
        </SafeAreaView>
      </Studio>
    );
  }

  const meta = domainMeta(goal.domain);

  return (
    <Studio dark testID="screen-envision">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton testID="envision-back" label="← Today" onPress={goBack} />
          <Label style={{ color: night.ink3 }}>Envision</Label>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Stone size={54} domain={goal.domain} polish={0.85} />
            <View style={{ flex: 1, gap: 3 }}>
              <Label style={{ color: meta.inkNight }}>{goal.domainLabel ?? meta.label}</Label>
              <Statement style={{ color: night.ink, fontSize: 24, lineHeight: 29 }}>{goal.title}</Statement>
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
            const nothing = empty[`${goal.id}:${type}`];
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
                ) : nothing ? (
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
                      There is not enough of your own writing behind this one yet. Write the Fifteen, or the line about
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
                  <View style={{ gap: 6 }}>
                    <Body style={{ color: night.ink3, fontSize: 13 }}>{blurb}</Body>
                    <Chip testID={`scene-draw-${type}`} label="Picture it" ghost onPress={() => void draw(type)} />
                  </View>
                )}
              </View>
            );
          })}

          <Body style={{ color: night.ink3, fontSize: 12, lineHeight: 18 }}>
            Every one of these is built from something you wrote. If there is nothing of yours to build it from, nothing
            gets made up to fill the space.
          </Body>
        </ScrollView>
      </SafeAreaView>
    </Studio>
  );
}
