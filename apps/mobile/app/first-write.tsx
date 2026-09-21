/**
 * The first line (the rebuild, 2026-09-21). One of the source's warm-up
 * prompts, chosen by the area picked first; a page; a microphone; no
 * countdown. A sentence counts. What is typed is kept as it is typed, so
 * a kill or a call mid-line loses nothing, and Continue keeps it as a
 * `warmup` text and opens the mirror.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AREAS, screen, startWriting, warmupPrompt, wordCount, type DomainId } from '@morrow/core';
import { Body, Glyph, Label, Screen, Stone, accent, day, type as fonts, useReducedMotion, webOnlyStyle } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { dictation } from '../src/dictation';
import { usePlatformBack } from '../src/platform-back';

const MIN_WORDS = 3;

export default function FirstWrite() {
  const router = useRouter();
  useFirstRunStep('first-write');
  const reduced = useReducedMotion();
  const profile = useMorrow((s) => s.profile);
  const interviewDraft = useMorrow((s) => s.interviewDraft);
  const draft = useMorrow((s) => s.drafts.warmup);
  const saveDraft = useMorrow((s) => s.saveDraft);
  const saveText = useMorrow((s) => s.saveText);
  const showResources = useMorrow((s) => s.showResources);

  // The prompt follows the first area picked in set-up.
  const domain: DomainId | null = useMemo(() => {
    const first = interviewDraft?.s?.picked?.[0];
    if (!first) return null;
    return AREAS.find((a) => a.id === first)?.domain ?? 'custom';
  }, [interviewDraft]);
  const prompt = warmupPrompt(domain);

  const [body, setBody] = useState(draft?.body ?? '');
  const [seconds, setSeconds] = useState(draft?.elapsed ?? 0);
  const [mode, setMode] = useState<'type' | 'say'>('type');
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [canListen, setCanListen] = useState(false);
  const anchorRef = useRef('');
  const dictationRef = useRef(dictation());
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let alive = true;
    void dictationRef.current.available().then((ok) => alive && setCanListen(ok));
    return () => {
      alive = false;
      dictationRef.current.stop();
    };
  }, []);

  // Seconds spent, for the record; never shown as a countdown.
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Kept as it is typed. A kill mid-line comes back to the line.
  useEffect(() => {
    const session = { ...startWriting('warmup', profile.track, mode), body, elapsed: seconds };
    const t = setTimeout(() => saveDraft(session), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, mode]);

  const listen = async () => {
    if (listening) {
      dictationRef.current.stop();
      setListening(false);
      return;
    }
    setMicNote(null);
    anchorRef.current = body;
    const ok = await dictationRef.current.start({
      onText: (text, final) => {
        const joined = [anchorRef.current.trim(), text.trim()].filter(Boolean).join(' ');
        setBody(joined);
        if (final) anchorRef.current = joined;
      },
      onProblem: (message) => {
        setMicNote(message);
        setListening(false);
      },
    });
    setListening(ok);
    if (ok) setMode('say');
  };

  const words = wordCount(body);
  const ready = words >= MIN_WORDS;

  const keep = () => {
    if (!ready) return;
    if (listening) {
      dictationRef.current.stop();
      setListening(false);
    }
    const text = saveText('warmup', body.trim(), mode, seconds);
    if (!text) return;
    // A crisis line raises the card from the store; the mirror is not the
    // place for it. Anything else goes to the mirror.
    if (screen(body).risk === 'crisis') return;
    router.push('/mirror');
  };

  const back = () => {
    if (listening) dictationRef.current.stop();
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  };
  usePlatformBack(false, back);

  const name = profile.displayName.trim();

  return (
    <Screen
      testID="screen-first-write"
      back={{ onPress: back, testID: 'first-write-back' }}
      where="A first line"
      help={{ onPress: () => showResources() }}
      progress={{ value: 1 / 5, label: 'Step 1 of 5 · A first line', testID: 'first-write-progress' }}
      keyboard
      cta={{ label: ready ? 'Keep this line' : 'Write a few words first', onPress: keep, disabled: !ready, testID: 'first-write-continue' }}
      footer={
        <Label testID="first-write-note" style={{ textAlign: 'center' }}>
          {ready ? `${words} words · yours, kept as written` : 'Two minutes is plenty. A sentence counts.'}
        </Label>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
        <Stone size={44} domain={domain ?? 'health'} polish={0.5} sweep={!reduced} />
        <Body style={{ flex: 1, fontSize: 15, color: day.ink2 }}>{name ? `${name}, one question to start with.` : 'One question to start with.'}</Body>
      </View>
      <Text testID="first-write-prompt" accessibilityRole="header" style={{ fontFamily: fonts.sansBold, fontSize: 28, lineHeight: 34, color: day.ink }}>
        {prompt}
      </Text>
      <Pressable accessibilityRole="none" onPress={() => inputRef.current?.focus()} style={{ minHeight: 180, borderBottomWidth: 2, borderBottomColor: body ? accent.coral : day.line, paddingTop: 6, paddingBottom: 10 }}>
        <TextInput
          ref={inputRef}
          testID="first-write-input"
          accessibilityLabel={prompt}
          value={body}
          onChangeText={(t) => {
            setBody(t);
            if (mode !== 'type' && !listening) setMode('type');
          }}
          multiline
          autoFocus={!reduced}
          placeholder="Start anywhere."
          placeholderTextColor={day.ink3}
          style={{ fontFamily: fonts.serif, fontSize: 21, lineHeight: 31, color: day.ink, minHeight: 160, textAlignVertical: 'top', padding: 0, ...(Platform.OS === 'web' ? webOnlyStyle({ outlineStyle: 'none' }) : {}) }}
          scrollEnabled={false}
        />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {canListen ? (
          <Pressable
            testID="first-write-mic"
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Say it instead'}
            onPress={() => void listen()}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: listening ? accent.coralSoft : day.surface2, opacity: pressed ? 0.8 : 1 })}
          >
            <Glyph name="mic" size={18} color={listening ? accent.coralText : day.ink} />
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: listening ? accent.coralText : day.ink }}>{listening ? 'Listening…' : 'Say it'}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Label>{words > 0 ? `${words} ${words === 1 ? 'word' : 'words'}` : ''}</Label>
      </View>
      {micNote ? <Body style={{ fontSize: 13, color: day.ink2 }}>{micNote}</Body> : null}
    </Screen>
  );
}
