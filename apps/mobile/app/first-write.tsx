/**
 * The first line (the rebuild, 2026-09-21). One of the source's warm-up
 * prompts, chosen by the area picked first; a page; a microphone; no
 * countdown. A sentence counts. What is typed is kept as it is typed, so
 * a kill or a call mid-line loses nothing, and Continue keeps it as a
 * `warmup` text and opens the mirror.
 */
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AREAS, screen, startWriting, warmupPrompt, wordCount, type DomainId } from '@morrow/core';
import { Body, Glyph, Label, Screen, Stone, accent, day, type as fonts, useReducedMotion, webOnlyStyle } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { dictation } from '../src/dictation';
import { usePlatformBack } from '../src/platform-back';

const MIN_WORDS = 3;

/**
 * The gate (PRD §12) stands at every writing door: opened by a link on a
 * fresh browser, this room went straight to the field and the age
 * affirmation and the privacy line came days later, from Today's card.
 * Set-up resumes its draft and dismisses to Today when it is done.
 */
export default function FirstWriteGate() {
  const consented = useMorrow((s) => Boolean(s.profile.consentedAt));
  if (!consented) return <Redirect href="/setup" />;
  return <FirstWrite />;
}

function FirstWrite() {
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
  const firstArea = useMorrow((s) => s.profile.firstArea);
  const domain: DomainId | null = useMemo(() => {
    if (firstArea) return firstArea;
    const first = interviewDraft?.s?.picked?.[0];
    if (!first) return null;
    return AREAS.find((a) => a.id === first)?.domain ?? 'custom';
  }, [firstArea, interviewDraft]);
  const prompt = warmupPrompt(domain);

  const [body, setBody] = useState(draft?.body ?? '');
  const [seconds, setSeconds] = useState(draft?.elapsed ?? 0);
  const [mode, setMode] = useState<'type' | 'say'>('type');
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [canListen, setCanListen] = useState(false);
  const [focused, setFocused] = useState(false);
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

  // Kept as it is typed, a beat after the last change; and flushed on the
  // way out, so the last stretch typed or heard before Back is on disk too.
  // Once the line is kept the draft is done with: a timer still pending
  // must not write it back after saveText has cleared it.
  const keptRef = useRef(false);
  const pendingRef = useRef<{ body: string; mode: 'type' | 'say'; seconds: number } | null>(null);
  const flush = () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending || keptRef.current || !pending.body.trim()) return;
    saveDraft({ ...startWriting('warmup', profile.track, pending.mode), body: pending.body, elapsed: pending.seconds });
  };
  useEffect(() => {
    if (keptRef.current) return;
    pendingRef.current = { body, mode, seconds };
    const t = setTimeout(flush, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, mode]);
  // Unmounted with a change younger than the timer: written now.
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

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
    keptRef.current = true;
    pendingRef.current = null;
    const text = saveText('warmup', body.trim(), mode, seconds);
    if (!text) {
      // The store kept the line and raised the card over this screen. The
      // path has moved on (a first line is a first line, whatever the screen
      // said of it), so once the card is answered this screen is done: it
      // used to stay, with the same line and a live Keep, and every further
      // tap kept the line again and raised the card again.
      router.replace('/today');
      return;
    }
    // A crisis line raises the card from the store; the mirror is not the
    // place for it. Anything else goes to the mirror — in this screen's
    // place, so Back from the mirror does not land on a page that would
    // keep the same line twice.
    if (screen(body).risk === 'crisis') {
      router.replace('/today');
      return;
    }
    router.replace('/mirror');
  };

  const back = () => {
    if (listening) dictationRef.current.stop();
    flush();
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
      {/* Focus is shown by the line under the page, as every field's is; the wrapper only widens the tap and is not itself a stop. */}
      <Pressable accessible={false} focusable={false} onPress={() => inputRef.current?.focus()} style={{ minHeight: 180, borderBottomWidth: focused ? 3 : 2, borderBottomColor: focused ? accent.coral : body ? accent.coralSoftLine : day.line, paddingTop: 6, paddingBottom: 10 }}>
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: listening ? accent.coralSoft : day.surface2, opacity: pressed ? 0.8 : 1 })}
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
