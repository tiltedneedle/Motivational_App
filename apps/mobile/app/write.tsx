/**
 * The Fifteen (PRD §7.2). The room protects the writing: no toolbar, no back
 * button, no spell-check. The only help is the user's own earlier words in the
 * margin, and a nudge that is always a question.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DOORWAY,
  canClose,
  formatRemaining,
  minSecondsToCount,
  polish,
  remaining,
  ringFraction,
  startWriting,
  targetSeconds,
  tick,
  wordCount,
  type WritingKind,
  type WritingMode,
  type WritingSessionState,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Ring, Statement, Stone, Studio, UserText, accent, night, type as fonts } from '@morrow/ui';
import { useMorrow } from '../src/store';

const TICK_MS = 250;

export default function Write() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = (params.kind === 'shadow' ? 'shadow' : params.kind === 'addition' ? 'addition' : 'ideal') as WritingKind;

  const track = useMorrow((s) => s.profile.track);
  const saveText = useMorrow((s) => s.saveText);
  const goals = useMorrow((s) => s.goals);

  const [phase, setPhase] = useState<'doorway' | 'writing' | 'closed'>('doorway');
  const [mode, setMode] = useState<WritingMode>('type');
  const [session, setSession] = useState<WritingSessionState>(() => startWriting(kind, track, 'type'));
  const typingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const doorway = DOORWAY[kind];
  const seeds = goals.map((g) => g.title).slice(0, 4);

  useEffect(() => {
    if (phase !== 'writing') return;
    const id = setInterval(() => {
      setSession((s) => {
        const next = tick(s, TICK_MS, typingRef.current);
        typingRef.current = false;
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (session.closed && phase === 'writing') setPhase('closed');
  }, [session.closed, phase]);

  const onChange = useCallback((body: string) => {
    typingRef.current = true;
    setSession((s) => ({ ...s, body, idleMs: 0, nudge: null }));
  }, []);

  const close = () => {
    const saved = saveText(kind, session.body, mode, session.elapsed);
    if (!saved) {
      // A crisis result pauses the sitting; the gate above shows the card.
      router.replace('/today');
      return;
    }
    if (kind === 'ideal') router.replace('/heard');
    else router.replace('/heard');
  };

  if (phase === 'doorway') {
    return (
      <Studio dark testID="screen-write-doorway">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' }}>
          <View style={{ paddingTop: 14 }}>
            <Label style={{ color: night.ink3 }}>{doorway.eyebrow}</Label>
          </View>
          <View style={{ gap: 20 }}>
            <Stone size={120} domain="health" polish={0.4} style={{ alignSelf: 'center' }} />
            <Statement style={{ color: night.ink, textAlign: 'center', fontSize: 26, lineHeight: 32 }}>
              {doorway.prompt}
            </Statement>
            <Body style={{ color: night.ink2, textAlign: 'center' }}>{doorway.note}</Body>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              {(['type', 'say', 'walk'] as const).map((m) => (
                <Chip
                  key={m}
                  testID={`mode-${m}`}
                  label={m === 'type' ? 'Type it' : m === 'say' ? 'Say it' : 'Walk and say it'}
                  selected={mode === m}
                  onPress={() => setMode(m)}
                />
              ))}
            </View>
          </View>
          <View style={{ paddingBottom: 18, gap: 6 }}>
            <InkButton
              testID="write-begin"
              label={`Begin · ${Math.round(targetSeconds(kind, track) / 60)} minutes`}
              onPress={() => {
                setSession(startWriting(kind, track, mode));
                setPhase('writing');
                setTimeout(() => inputRef.current?.focus(), 60);
              }}
            />
            <Label style={{ color: night.ink3, textAlign: 'center' }}>
              {mode === 'type' ? 'No editing. No going back.' : 'Talking counts as writing. Edit the transcript after.'}
            </Label>
          </View>
        </SafeAreaView>
      </Studio>
    );
  }

  if (phase === 'closed') {
    const words = wordCount(session.body);
    return (
      <Studio dark testID="screen-write-closed">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22, justifyContent: 'center', gap: 24 }}>
          <Stone size={132} domain="health" polish={polish(words)} seated style={{ alignSelf: 'center' }} />
          <Statement style={{ color: night.ink, textAlign: 'center', fontSize: 28, lineHeight: 34 }}>
            That is the most you have said about this in one go.
          </Statement>
          <Body style={{ color: night.ink2, textAlign: 'center' }}>
            Sealed as a draft for a day. You can read it, not edit it.
          </Body>
          <InkButton testID="write-continue" label="Read it back to me" onPress={close} />
        </SafeAreaView>
      </Studio>
    );
  }

  const words = wordCount(session.body);
  const ready = canClose(session);

  return (
    <Studio dark testID="screen-write">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }}>
          <Label style={{ color: night.ink3 }}>{doorway.eyebrow}</Label>
          <Label testID="write-remaining" style={{ color: night.ink3 }}>
            {formatRemaining(remaining(session))} left
          </Label>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Ring size={92} progress={ringFraction(session)} color={accent.coral} track="rgba(255,255,255,0.12)" width={3}>
            <Stone size={64} domain="health" polish={polish(words)} />
          </Ring>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 14 }}>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <TextInput
              ref={inputRef}
              testID="write-input"
              value={session.body}
              onChangeText={onChange}
              multiline
              autoCorrect={false}
              spellCheck={false}
              placeholder="Start anywhere."
              placeholderTextColor={night.ink3}
              accessibilityLabel="Your writing"
              style={{
                fontFamily: fonts.serif,
                fontSize: 19,
                lineHeight: 29,
                color: '#F3E6D3',
                minHeight: 260,
                textAlignVertical: 'top',
              }}
            />
          </ScrollView>

          {seeds.length ? (
            <View style={{ width: 92, borderLeftWidth: 1, borderLeftColor: night.line, paddingLeft: 12, gap: 10 }}>
              <Label style={{ color: night.ink3 }}>Seeds</Label>
              {seeds.map((s) => (
                <Pressable key={s} testID={`seed-${s}`} onPress={() => onChange(`${session.body}${session.body ? ' ' : ''}${s}`)}>
                  <UserText italic style={{ fontSize: 13, lineHeight: 17, color: night.ink3 }}>
                    “{s}”
                  </UserText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ paddingBottom: 16, gap: 10, alignItems: 'center' }}>
          <Label testID="write-nudge" style={{ color: night.ink3, textAlign: 'center', minHeight: 16 }}>
            {session.nudge ?? ''}
          </Label>
          {ready ? (
            <InkButton testID="write-close" label="Close it here" onPress={() => setPhase('closed')} style={{ alignSelf: 'stretch' }} />
          ) : (
            <Label style={{ color: night.ink3 }}>
              {Math.max(0, Math.ceil((minSecondsToCount(kind, track) - session.elapsed) / 60))} min before this counts
            </Label>
          )}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
