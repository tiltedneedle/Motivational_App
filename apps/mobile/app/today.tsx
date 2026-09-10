/**
 * Today (PRD §7.6). One honest read: what now?
 * Every goal is a stone; the stone is the check control.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { consistencyCaption, dayOf, domainMeta, isReturning, returnsLetter, sourceLineFor } from '@morrow/core';
import {
  Body,
  Chip,
  InkButton,
  Label,
  Readout,
  Ring,
  Rule,
  Statement,
  Stone,
  Studio,
  Toast,
  UserText,
  accent,
  day,
  radius,
  type as fonts,
  useReducedMotion,
} from '@morrow/ui';
import { MoveStone } from '../src/components/MoveStone';
import { useConsistency, useGoals, useLatestBook, useMorrow, useTodaysMoves } from '../src/store';

export default function Today() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const state = useMorrow((s) => s);
  const goals = useGoals();
  const moves = useTodaysMoves();
  const book = useLatestBook();
  const score = useConsistency();
  const toast = useMorrow((s) => s.toast);
  const setToast = useMorrow((s) => s.setToast);
  const setStatus = useMorrow((s) => s.setMoveStatus);
  const makeBrief = useMorrow((s) => s.makeBrief);

  const [returnCard, setReturnCard] = useState<{ body: string } | null>(null);

  const today = dayOf(new Date(), state.profile.dayBoundaryHour);
  const days = useMemo(() => Object.values(state.days), [state.days]);

  useEffect(() => {
    makeBrief();
    const r = isReturning(days, today);
    if (r.returning) {
      const count = days.filter((d) => d.sealedAt).length;
      setReturnCard({ body: returnsLetter(book, r.gapDays, Math.max(1, count)).body });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  const open = moves.filter((m) => m.status === 'todo');
  const now = open[0];
  const later = open.slice(1);
  const done = moves.filter((m) => m.status !== 'todo');

  const plansById = useMemo(() => new Map(state.plans.map((p) => [p.goalId, p])), [state.plans]);

  if (!book && goals.length === 0) {
    return (
      <Studio testID="screen-today">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 14 }}>
          <Statement>Nothing here yet, and that is the right starting point.</Statement>
          <Body>Three evenings from now there will be a Book, a plan, and a first move for the morning.</Body>
          <InkButton testID="today-begin" label="Begin the Interview" onPress={() => router.push('/consent')} />
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio testID="screen-today">
      <SafeAreaView style={{ flex: 1 }}>
        {toast ? (
          <View style={{ position: 'absolute', top: 8, left: 22, right: 22, zIndex: 20 }}>
            <Toast
              testID="toast"
              text={toast.text}
              actionLabel={toast.kind === 'park' ? 'Undo' : undefined}
              onAction={() => {
                if (toast.undoId) setStatus(toast.undoId, 'todo');
                setToast(null);
              }}
            />
          </View>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
            <Label testID="today-date">{new Date().toDateString().slice(0, 10)}</Label>
            <Label>{days.filter((d) => d.sealedAt).length} sealed days</Label>
          </View>

          <Statement style={{ marginTop: 12 }}>
            {state.profile.displayName ? `Good morning, ${state.profile.displayName}.` : 'Good morning.'}
          </Statement>

          {book ? (
            <Pressable testID="today-book-line" onPress={() => router.push('/book')} style={{ marginTop: 8 }}>
              <UserText italic numberOfLines={2} style={{ fontSize: 17, lineHeight: 24, color: day.ink2 }}>
                “{book.firstSentence}”
              </UserText>
              <Label style={{ marginTop: 4 }}>You, in the Book</Label>
            </Pressable>
          ) : null}

          {returnCard ? (
            <View testID="return-card" style={{ marginTop: 16, backgroundColor: day.surface, borderRadius: radius.card, padding: 18, gap: 10 }}>
              <Label style={{ color: accent.coralText }}>Welcome back</Label>
              <Body style={{ color: day.ink }}>{returnCard.body}</Body>
              <Chip label="Start small" onPress={() => setReturnCard(null)} />
            </View>
          ) : null}

          {/* the goal row */}
          {goals.length ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              {goals.slice(0, 4).map((g) => {
                const plan = plansById.get(g.id);
                const total = plan?.moves.length ?? 0;
                const doneCount = plan?.moves.filter((m) => m.status === 'done').length ?? 0;
                const pct = total ? doneCount / total : 0;
                return (
                  <Pressable
                    key={g.id}
                    testID={`goal-chip-${g.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${g.title}, ${Math.round(pct * 100)} percent`}
                    onPress={() => router.push(`/goal?id=${g.id}`)}
                    style={{ alignItems: 'center', gap: 8, width: 78 }}
                  >
                    <Ring size={64} progress={pct} color={domainMeta(g.domain).hex} width={3.5}>
                      <Stone size={44} domain={g.domain} polish={0.5 + pct * 0.5} />
                    </Ring>
                    <Text numberOfLines={1} style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: day.ink2 }}>
                      {g.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/*
            The day is finished. Not an empty screen and not tomorrow's move
            pulled forward — the work that was asked for is closed, and saying
            so is what makes the seal at the end of it mean anything.
          */}
          {!now && done.length > 0 ? (
            <View
              testID="day-done-card"
              style={{
                marginTop: 22,
                backgroundColor: day.surface,
                borderRadius: 28,
                padding: 20,
                gap: 8,
              }}
            >
              <Label style={{ color: accent.coralText }}>Done for today</Label>
              <Statement style={{ fontSize: 26, lineHeight: 30 }}>
                {done.filter((m) => m.status === 'done').length === done.length
                  ? 'Everything you asked of today is closed.'
                  : 'Today is closed.'}
              </Statement>
              <Body style={{ fontSize: 14 }}>
                Nothing else is due. The next one is tomorrow, and it will be here then.
              </Body>
            </View>
          ) : null}

          {/* Now */}
          {now ? (
            <View
              testID="now-card"
              style={{
                marginTop: 22,
                backgroundColor: day.surface,
                borderRadius: 28,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Label style={{ color: accent.coralText }}>Now</Label>
                <Statement style={{ fontSize: 26, lineHeight: 30 }}>{now.title}</Statement>
                <Body style={{ fontSize: 14 }}>
                  {sourceLineFor(now, state.analyses) ? 'Tap the stone. Drag it up for not today.' : ''}
                </Body>
              </View>
              <MoveStone
                testID={`stone-${now.id}`}
                size={62}
                domain={goals.find((g) => g.id === now.goalId)?.domain ?? 'health'}
                status={now.status}
                label={now.title}
                reducedMotion={reduced}
                onSeat={() => setStatus(now.id, now.status === 'done' ? 'todo' : 'done')}
                onPark={() => {
                  setStatus(now.id, 'skip');
                  setToast({ text: `${now.title} · not today`, kind: 'park', undoId: now.id });
                }}
              />
            </View>
          ) : (
            <View testID="all-placed" style={{ marginTop: 22 }}>
              <Body style={{ color: day.ink }}>
                {moves.length ? 'Every stone placed. Seal the day when you are ready.' : 'Nothing scheduled. One small thing is a whole day.'}
              </Body>
            </View>
          )}

          {/* Later */}
          {later.length || done.length ? (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 }}>
                <Label>Later today</Label>
                <Label testID="left-count">{open.length ? `${open.length} left` : 'all placed'}</Label>
              </View>
              {[...later, ...done].map((m) => {
                const g = goals.find((x) => x.id === m.goalId);
                return (
                  <View
                    key={m.id}
                    testID={`row-${m.id}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 10,
                      borderTopWidth: 1,
                      borderTopColor: day.line,
                    }}
                  >
                    <MoveStone
                      testID={`stone-${m.id}`}
                      size={26}
                      domain={g?.domain ?? 'health'}
                      status={m.status}
                      label={m.title}
                      reducedMotion={reduced}
                      onSeat={() => setStatus(m.id, m.status === 'done' ? 'todo' : 'done')}
                      onPark={() => {
                        setStatus(m.id, 'skip');
                        setToast({ text: `${m.title} · not today`, kind: 'park', undoId: m.id });
                      }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: fonts.sansMedium,
                        fontSize: 16,
                        color: m.status === 'todo' ? day.ink : day.ink3,
                        textDecorationLine: m.status === 'done' ? 'line-through' : 'none',
                      }}
                    >
                      {m.title}
                    </Text>
                    <Label>{m.status === 'skip' ? 'not today' : m.status === 'done' ? 'done' : m.effort === 'S' ? '10 min' : '25 min'}</Label>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Consistency. Tapping it opens the thing it is a summary of. */}
          <Pressable
            testID="today-consistency"
            accessibilityRole="button"
            accessibilityLabel={`Consistency ${score.score}. Open the ledger and the almanac.`}
            onPress={() => router.push('/progress')}
            style={{ marginTop: 26, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}
          >
            <View>
              <Label>Consistency</Label>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Readout testID="consistency">{score.score}</Readout>
                {score.delta !== 0 ? (
                  <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: accent.success }}>
                    {score.delta > 0 ? `+${score.delta}` : score.delta}
                  </Text>
                ) : null}
              </View>
              <Body style={{ fontSize: 13 }}>{consistencyCaption(score)}</Body>
            </View>
            <View style={{ width: 140, height: 10, borderRadius: 5, backgroundColor: day.surface2, overflow: 'hidden' }}>
              <View style={{ width: `${score.score}%`, height: '100%', backgroundColor: accent.coral }} />
            </View>
          </Pressable>
        </ScrollView>

        {/* tab bar */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingBottom: 10, alignItems: 'center' }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              height: 60,
              borderRadius: 30,
              backgroundColor: day.surface,
            }}
          >
            <TabButton label="Today" active testID="tab-today" onPress={() => undefined} />
            <TabButton label="Book" testID="tab-book" onPress={() => router.push('/book')} />
            <TabButton label="Coach" testID="tab-coach" onPress={() => router.push('/coach')} />
            <TabButton label="You" testID="tab-you" onPress={() => router.push('/settings')} />
          </View>
          <Pressable
            testID="seal-day-button"
            accessibilityRole="button"
            accessibilityLabel="Seal the day"
            onPress={() => router.push('/seal-day')}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: accent.coral,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontFamily: fonts.sansBold }}>✓</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Studio>
  );
}

function TabButton({ label, active, onPress, testID }: { label: string; active?: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="tab" accessibilityState={{ selected: Boolean(active) }} onPress={onPress} style={{ padding: 10 }}>
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: active ? day.ink : day.ink3 }}>{label}</Text>
    </Pressable>
  );
}
