/**
 * The runner (PRD §7.5): one step at a time, in the night studio.
 *
 * The clock counts down but does not decide. A step whose time runs out stays
 * where it is until the person says they are done with it, because they are the
 * one doing the thing and a routine that marches on without you is a routine
 * you end up fighting. The countdown going red is information, not a failure.
 *
 * It survives backgrounding: the run is kept in the store and restored on
 * return, so a phone call in the middle of a routine does not end it.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatRemaining,
  nextStep,
  pauseRun,
  resumeRun,
  runProgress,
  startRun,
  tickRun,
  type RunnerState,
  isMinVersionStandIn,
} from '@morrow/core';
import {
  Body,
  InkButton,
  Label,
  Readout,
  Ring,
  Statement,
  Stone,
  Studio,
  TextButton,
  UserText,
  accent,
  night,
} from '@morrow/ui';
import { useMorrow } from '../src/store';
import { KeepAwake } from '../src/components/KeepAwake';

const TICK_MS = 250;

export default function Runner() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; minimal?: string }>();
  const practices = useMorrow((s) => s.practices);
  const logRun = useMorrow((s) => s.logRun);
  const practice = practices.find((p) => p.id === params.id);

  const [run, setRun] = useState<RunnerState | null>(() =>
    practice ? startRun(practice, params.minimal === '1') : null,
  );
  // The latest run, for the AppState handler. Written after each commit
  // rather than during render, which is the only time a ref may be written.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  // The clock. It only ever reduces the number on screen; what happens when it
  // reaches zero is the person's decision, not this timer's.
  useEffect(() => {
    if (!run || !run.running || run.done) return;
    const id = setInterval(() => setRun((s) => (s ? tickRun(s, TICK_MS) : s)), TICK_MS);
    return () => clearInterval(id);
  }, [run?.running, run?.done, run?.stepIndex]);

  // Backgrounding pauses rather than abandons, and what was done so far is
  // written down, so a phone call in the middle does not cost the run.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      const live = runRef.current;
      if (!live || live.done) return;
      setRun(pauseRun(live));
      logRun(live);
    });
    return () => sub.remove();
  }, [logRun]);

  const finish = useCallback(
    (state: RunnerState) => {
      logRun(state);
      router.dismissTo('/today');
    },
    [logRun, router],
  );

  if (!practice || !run) {
    return (
      <Studio dark testID="screen-run">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 12 }}>
          <Statement style={{ color: night.ink }}>That practice is no longer here.</Statement>
          <InkButton label="Back to today" onPress={() => router.dismissTo('/today')} />
        </SafeAreaView>
      </Studio>
    );
  }

  const step = practice.steps[run.stepIndex];
  const total = run.minimal ? 1 : practice.steps.length;
  const overrun = run.remaining <= 0;

  if (run.done) {
    return (
      <Studio dark testID="screen-run">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center', gap: 20 }}>
          <Stone size={128} domain="health" polish={1} seated style={{ alignSelf: 'center' }} />
          <Statement style={{ color: night.ink, textAlign: 'center', fontSize: 28, lineHeight: 34 }}>
            {run.minimal ? 'The small version counts.' : 'Done.'}
          </Statement>
          <Body style={{ color: night.ink2, textAlign: 'center' }}>
            {run.minimal
              ? 'It counts as a full day, and that is not a consolation. It is the whole mechanism.'
              : 'It goes in the ledger in your own words.'}
          </Body>
          <InkButton testID="run-close" label="Back to today" onPress={() => finish(run)} />
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio dark testID="screen-run">
      {/* PRD §7.5: the runner keeps the screen awake. */}
      <KeepAwake tag="run" />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
          <TextButton
            testID="run-stop"
            label="Stop"
            onPress={() => finish(pauseRun(run))}
          />
          <Label style={{ color: night.ink3 }}>
            {run.minimal ? 'The small version' : `Step ${run.stepIndex + 1} of ${total}`}
          </Label>
        </View>

        <View style={{ alignItems: 'center', gap: 26 }}>
          <Ring
            size={190}
            progress={runProgress(run, practice)}
            color={accent.coralNight}
            track="rgba(255,255,255,0.12)"
            width={4}
            segments={total > 1 ? total : 1}
            accessibilityLabel="Steps done"
            valueText={`${run.stepIndex} of ${total}`}
          >
            <Readout
              testID="run-remaining"
              style={{ color: overrun ? accent.coralNight : night.ink, fontSize: 44, lineHeight: 50 }}
            >
              {formatRemaining(Math.max(0, Math.round(run.remaining)))}
            </Readout>
          </Ring>

          {/*
            Their words. The step titles were cut from their own line. The
            two-minute version is theirs when they typed it; when they left
            the field empty it is Morrow's stand-in, known by its shape, and
            that goes in the sans.
          */}
          {run.minimal && isMinVersionStandIn(practice.minVersion) ? (
            <Body testID="run-step" style={{ color: night.ink, fontSize: 22, lineHeight: 30, textAlign: 'center' }}>
              {practice.minVersion}
            </Body>
          ) : (
            <UserText
              testID="run-step"
              style={{ color: night.ink, fontSize: 24, lineHeight: 32, textAlign: 'center' }}
            >
              {run.minimal ? practice.minVersion : (step?.text ?? practice.title)}
            </UserText>
          )}

          {overrun ? (
            <Body style={{ color: night.ink3, textAlign: 'center', fontSize: 13 }}>
              The time is up. The step is not, until you say so.
            </Body>
          ) : null}
        </View>

        <View style={{ paddingBottom: 22, gap: 10 }}>
          <InkButton
            testID="run-next"
            label={run.stepIndex + 1 >= total || run.minimal ? 'Done' : 'Next step'}
            onPress={() => {
              const next = nextStep(run, practice);
              setRun(next);
              if (next.done) logRun(next);
            }}
          />
          <TextButton
            testID="run-pause"
            label={run.running ? 'Pause' : 'Carry on'}
            onPress={() => setRun(run.running ? pauseRun(run) : resumeRun(run))}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
