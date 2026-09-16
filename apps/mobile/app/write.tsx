/**
 * The Fifteen (PRD §7.2). The room protects the writing: no toolbar, no back
 * button, no spell-check. The only help is the user's own earlier words in the
 * margin, and a nudge that is always a question.
 */
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DOORWAY,
  canClose,
  canExtend,
  extend,
  canResume,
  draftWorthKeeping,
  resumeWriting,
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
import { Body, Chip, InkButton, Label, Question, Ring, Statement, Stone, Studio, TopBar, UserText, accent, focusRing, night, type as fonts, useReducedMotion, webOnlyStyle } from '@morrow/ui';
import { latestText, useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { dictation } from '../src/dictation';

const TICK_MS = 250;

export default function Write() {
  const router = useRouter();
  useFirstRunStep('fifteen');
  const showResources = useMorrow((st) => st.showResources);
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = (params.kind === 'shadow' ? 'shadow' : params.kind === 'addition' ? 'addition' : 'ideal') as WritingKind;

  const track = useMorrow((s) => s.profile.track);
  const hideClock = useMorrow((s) => s.profile.hideClock);
  const setProfile = useMorrow((s) => s.setProfile);
  const saveText = useMorrow((s) => s.saveText);
  const saveDraft = useMorrow((s) => s.saveDraft);
  const clearDraft = useMorrow((s) => s.clearDraft);
  const goals = useMorrow((s) => s.goals);
  const draft = useMorrow((s) => s.drafts[kind]);
  // An earlier sitting that may still be quoted, so someone whose latest one
  // was paused is not sent back to the beginning.
  const hasEarlierWriting = useMorrow((s) => latestText(s.texts, 'ideal') !== null);

  const [phase, setPhase] = useState<'doorway' | 'writing' | 'closed'>('doorway');
  // Saying it is the default (PRD §7.2) wherever there is a microphone to
  // say it into; a browser tab starts on the keyboard.
  const [mode, setMode] = useState<WritingMode>(Platform.OS === 'web' ? 'type' : 'say');
  const [session, setSession] = useState<WritingSessionState>(() => startWriting(kind, track, Platform.OS === 'web' ? 'type' : 'say'));
  const [endedEarly, setEndedEarly] = useState(false);
  /** The safety screen stopped this sitting going on to the read-back. */
  const [paused, setPaused] = useState(false);
  // The person's own pause — the clock waits, the nudges wait, the recogniser
  // stops — as distinct from the safety pause above. WCAG 2.2.1: a time limit
  // has to be one a person can stop. Fifteen minutes of continuous writing is
  // the studied mechanism, and it is still what is asked; this is the door
  // out of it for a moment, for whoever needs one.
  const [held, setHeld] = useState(false);
  // How the room closed: by the clock, by the person, or by the day catching up.
  const [closedBy, setClosedBy] = useState<'clock' | 'person' | null>(null);
  const typingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  /**
   * Talking as writing. The recogniser hands back the running text of the
   * current stretch; `anchor` is everything committed before it, so the
   * body is always anchor + stretch and a final stretch simply moves the
   * anchor. A problem — no microphone, permission refused — is one sentence
   * under the ring and the room becomes a typed one; nothing is lost.
   */
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const anchorRef = useRef('');
  const dictationRef = useRef(dictation());

  /**
   * The stone bobs on a 4.5 s cycle and stops when writing starts (PRD 8.5).
   * A room waiting is a room breathing; a room being written in is still.
   */
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [bob] = useState(() => new Animated.Value(0));
  const writing = phase === 'writing' && session.body.trim().length > 0;
  useEffect(() => {
    if (reduced || !focused || phase !== 'writing' || writing) {
      Animated.timing(bob, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -5, duration: 2250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, focused, phase, reduced, writing]);
  // The autosave reads the newest session without re-arming its timer on
  // every keystroke, which would make the timer useless.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });

  const doorway = DOORWAY[kind];
  const seeds = goals
    .map((g) => ({ title: g.title, authored: g.titleAuthored !== false }))
    .slice(0, 4);
  const resumable = draftWorthKeeping(draft);

  useEffect(() => {
    if (phase !== 'writing' || held) return;
    const id = setInterval(() => {
      setSession((s) => {
        const next = tick(s, TICK_MS, typingRef.current);
        typingRef.current = false;
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, held]);

  useEffect(() => {
    if (session.closed && phase === 'writing') {
      setClosedBy((c) => c ?? 'clock');
      setPhase('closed');
    }
  }, [session.closed, phase]);

  // One warning before the clock ends, for whoever cannot see the ring: what
  // is left, and that there is more to be had (WCAG 2.2.1's "warned before").
  const secondsLeft = remaining(session);
  useEffect(() => {
    if (phase !== 'writing' || secondsLeft !== 60) return;
    AccessibilityInfo.announceForAccessibility('One minute left on the clock. When it ends you can add five more minutes, or close.');
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase !== 'writing' || mode === 'type' || held) {
      if (listening) {
        dictationRef.current.stop();
        setListening(false);
      }
      return;
    }
    let gone = false;
    anchorRef.current = sessionRef.current.body;
    void dictationRef.current
      .start({
        onText: (text, final) => {
          if (gone) return;
          typingRef.current = true;
          const joined = [anchorRef.current.trim(), text.trim()].filter(Boolean).join(' ');
          setSession((s) => ({ ...s, body: joined, idleMs: 0, nudge: null }));
          if (final) anchorRef.current = joined;
        },
        onProblem: (message) => {
          if (gone) return;
          setMicNote(message);
          setListening(false);
        },
      })
      .then((ok) => {
        if (!gone) setListening(ok);
      });
    return () => {
      gone = true;
      dictationRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode]);

  // A sitting may be picked up once. Arriving on a draft that has already been
  // resumed ends it — but what was written still counts, so the person lands on
  // the read-back with their words rather than in an empty room.
  useEffect(() => {
    if (phase !== 'doorway' || !resumable || !draft || canResume(draft)) return;
    setSession(resumeWriting(draft));
    setEndedEarly(true);
    setPhase('closed');
  }, [phase, resumable, draft]);

  // Autosave. Fifteen minutes is the most expensive thing a person gives this
  // product, and a phone that gets killed in the background must not take it.
  const flush = useCallback(() => {
    const live = sessionRef.current;
    if (!live.body.trim() && live.elapsed < 5) return;
    saveDraft(live);
  }, [saveDraft]);

  useEffect(() => {
    // While the room is open, every four seconds. While it is closed and the
    // words are still only in memory — the read-back has not been reached —
    // on backgrounding only. The cleanup used to check the phase through a
    // ref, which had already moved on to 'closed' by the time it ran, so the
    // last flush on the way out of the room was the one that never happened.
    // And never while the screen has fired: close() has cleared the draft
    // on purpose, and a flush from the background — a helpline tap opens
    // the dialler — wrote the crisis text straight back as a draft.
    if (phase === 'doorway' || paused) return;
    const id = phase === 'writing' ? setInterval(flush, 4_000) : null;
    const sub = AppState.addEventListener('change', (next) => {
      // Backgrounding is the moment the process can be reaped, so write now.
      if (next !== 'active') flush();
    });
    return () => {
      if (id) clearInterval(id);
      sub.remove();
      if (phase === 'writing') flush();
    };
  }, [phase, paused, flush]);

  const onChange = useCallback((body: string) => {
    typingRef.current = true;
    // Typed over a transcript: what is on screen is the whole of it now.
    anchorRef.current = body;
    setSession((s) => ({ ...s, body, idleMs: 0, nudge: null }));
  }, []);

  /**
   * Where the room goes when it closes (PRD 7.2).
   *
   * The ideal goes to the read-back — unless this is the Full track, where the
   * shadow is required *before* What I heard, so it goes to the shadow's
   * doorway instead. The shadow itself always goes on to the read-back. And
   * an addition goes back to the Book it was added to.
   *
   * The shadow was reachable from nowhere: the room accepted `kind=shadow` and
   * nothing in the app ever sent anyone there, on either track.
   */
  const after = (): string => {
    if (kind === 'shadow') return '/heard';
    if (kind === 'addition') return '/book';
    return track === 'full' ? '/write?kind=shadow' : '/heard';
  };

  const close = () => {
    const saved = saveText(kind, session.body, mode, session.elapsed);
    // saveText clears the draft on success; a crisis pause must clear it too,
    // or the words come back the next time the room is opened.
    clearDraft(kind);
    if (!saved) {
      // A crisis result pauses the sitting. It used to send the person to
      // Today with no explanation, and because their writing is not quotable
      // the read-back had no source, so the Book became permanently
      // unreachable — the app quietly ended for whoever needed it most.
      // The pause stays a pause: the card comes up over this screen, and when
      // they close it this screen says where they stand.
      setPaused(true);
      return;
    }
    router.replace(after());
  };

  if (phase === 'doorway') {
    return (
      <Studio dark testID="screen-write-doorway">
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
          <TopBar
            back={{ onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'write-back' }}
            right={<Label style={{ color: night.ink3 }}>{doorway.eyebrow}</Label>}
            help={{ onPress: showResources }}
          />
          {/* Scrolls: at 200% type, or a phone on its side, Begin used to be off the bottom with no way to it. */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 20 }}>
            <Stone size={120} domain="health" polish={0.4} style={{ alignSelf: 'center' }} />
            {/* The prompt is read once, calmly: a question's weight, not a headline's. */}
            <Question style={{ color: night.ink, textAlign: 'center', fontSize: 22, lineHeight: 30 }}>
              {doorway.prompt}
            </Question>
            <Body style={{ color: night.ink2, textAlign: 'center' }}>{doorway.note}</Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
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
            {/*
              The countdown can be put away. It is still there for a screen
              reader and the room still closes at the end; the digits were
              the thing that made some people write for the clock.
            */}
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Chip
                testID="write-hide-clock"
                label={hideClock ? 'Show the clock' : 'Hide the clock'}
                role="checkbox"
                selected={hideClock}
                ghost
                onPress={() => setProfile({ hideClock: !hideClock })}
              />
            </View>
          </View>
          <View style={{ paddingTop: 10, paddingBottom: 18, gap: 6 }}>
            {resumable && draft && canResume(draft) ? (
              <>
                <InkButton
                  testID="write-resume"
                  label={`Carry on · ${formatRemaining(
                    Math.max(0, targetSeconds(kind, track) - draft.elapsed),
                  )} left`}
                  onPress={() => {
                    setSession(resumeWriting(draft));
                    setMode(draft.mode);
                    setPhase('writing');
                    setTimeout(() => inputRef.current?.focus(), 60);
                  }}
                />
                <Label style={{ color: night.ink3, textAlign: 'center' }}>
                  {wordCount(draft.body)} words are still here. You can pick this up once.
                </Label>
              </>
            ) : (
              <>
                <InkButton
                  testID="write-begin"
                  label={`Begin · ${Math.round(targetSeconds(kind, track) / 60)} minutes`}
                  onPress={() => {
                    // The microphone is asked for here, on the doorway, so
                    // the OS dialog is not the first thing to happen on the
                    // clock. Refused, the room is a typed one and says so.
                    void (async () => {
                      let chosen = mode;
                      if (mode !== 'type') {
                        const answer = await dictation().permission();
                        if (answer !== 'granted') {
                          chosen = 'type';
                          setMode('type');
                          setMicNote(answer === 'refused' ? 'The microphone was not allowed, so this is a typed room. It can be allowed under You.' : 'This device cannot listen, so this is a typed room.');
                        }
                      }
                      setSession(startWriting(kind, track, chosen));
                      setPhase('writing');
                      setTimeout(() => inputRef.current?.focus(), 60);
                    })();
                  }}
                />
                <Label style={{ color: night.ink3, textAlign: 'center' }}>
                  {mode === 'type'
                    ? 'Forward only: the page keeps what you type.'
                    : 'Saying it uses the microphone and your phone’s own recogniser. Nothing is recorded. Talking counts as writing.'}
                </Label>
              </>
            )}
          </View>
          </ScrollView>
        </SafeAreaView>
      </Studio>
    );
  }

  if (phase === 'closed') {
    const words = wordCount(session.body);
    return (
      <Studio dark testID="screen-write-closed">
        <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, justifyContent: 'center', gap: 24 }} showsVerticalScrollIndicator={false}>
          <Stone size={132} domain="health" polish={polish(words)} seated style={{ alignSelf: 'center' }} />
          <Statement style={{ color: night.ink, textAlign: 'center', fontSize: 28, lineHeight: 34 }}>
            {endedEarly ? 'The room closed while you were away.' : 'That is the most you have said about this in one go.'}
          </Statement>
          <Body style={{ color: night.ink2, textAlign: 'center' }}>
            {endedEarly
              ? `Every word you wrote is here — ${words} of them. A sitting can be picked up once, and this one already was, so it counts as it stands.`
              : 'Sealed as a draft for a day. You can read it, not edit it.'}
          </Body>
          {paused ? (
            <View style={{ gap: 10 }}>
              <Body style={{ color: night.ink2, textAlign: 'center' }}>
                What you wrote is on this device and nothing was sent anywhere. It is not going into the Book, and it
                does not have to. You can write this one again whenever you want to.
              </Body>
              <InkButton
                testID="write-again"
                label="Write it again"
                onPress={() => {
                  setPaused(false);
                  setSession(startWriting(kind, track, mode));
                  setPhase('doorway');
                }}
              />
              {hasEarlierWriting ? (
                <InkButton
                  testID="write-carry-on"
                  label="Carry on with what I wrote before"
                  onPress={() => router.replace('/heard')}
                  style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: night.line }}
                />
              ) : null}
              <InkButton
                testID="write-later"
                label="Not now"
                onPress={() => router.dismissTo('/today')}
                style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: night.line }}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {closedBy === 'clock' && !endedEarly && canExtend(session) ? (
                <InkButton
                  testID="write-extend"
                  label="Five more minutes"
                  onPress={() => {
                    setSession((s) => extend(s));
                    setClosedBy(null);
                    setPhase('writing');
                  }}
                  style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: night.line }}
                />
              ) : null}
              <InkButton
                testID="write-continue"
                label={
                  kind === 'shadow'
                    ? 'Closed. Read the ideal back to me'
                    : kind === 'addition'
                      ? 'Back to the Book'
                      : track === 'full'
                        ? 'On to the other road'
                        : 'Read it back to me'
                }
                onPress={close}
              />
              {/*
                PRD 7.2: the shadow is optional on Starter, eight minutes, always
                after the ideal and never the default view. Offered here once,
                as the second of two buttons, and again on Envision's other
                road card if they walk past it now.
              */}
              {kind === 'ideal' && track !== 'full' ? (
                <InkButton
                  testID="write-shadow"
                  label="Write the other road first · 8 minutes"
                  onPress={() => {
                    const saved = saveText(kind, session.body, mode, session.elapsed);
                    clearDraft(kind);
                    if (!saved) {
                      setPaused(true);
                      return;
                    }
                    router.replace('/write?kind=shadow');
                  }}
                  style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: night.line }}
                />
              ) : null}
            </View>
          )}
        </ScrollView>
        </SafeAreaView>
      </Studio>
    );
  }

  const words = wordCount(session.body);
  const ready = canClose(session);

  return (
    <Studio dark testID="screen-write">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        {/*
          Leaving mid-sitting keeps the draft — the autosave already does, and
          the doorway offers it back — so the way out says what it does
          rather than "Back", which would sound like losing the writing.
        */}
        <TopBar
          back={{
            label: 'Leave for now',
            testID: 'write-leave',
            onPress: () => {
              flush();
              if (router.canGoBack()) router.back();
              else router.dismissTo('/today');
            },
          }}
          right={
            <Label testID="write-remaining" style={{ color: night.ink3 }} accessibilityLabel={`${formatRemaining(remaining(session))} left`}>
              {hideClock ? 'Clock hidden' : `${formatRemaining(remaining(session))} left`}
            </Label>
          }
          style={{ paddingTop: 6, minHeight: 44 }}
          help={{ onPress: showResources }}
        />

        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          {/*
            The ring is the only thing in the room that says how long is left,
            and as a drawing it said nothing at all to a screen reader.
          */}
          <Ring
            size={92}
            progress={hideClock ? 0 : ringFraction(session)}
            color={accent.coral}
            track="rgba(255,255,255,0.12)"
            width={3}
            accessibilityLabel={held ? 'The clock is paused' : 'Time left in this sitting'}
            valueText={`${formatRemaining(remaining(session))} left, ${words} words`}
          >
            <Animated.View style={{ transform: [{ translateY: bob }] }}>
              <Stone size={64} domain="health" polish={polish(words)} />
            </Animated.View>
          </Ring>
          <Pressable
            testID="write-hold"
            accessibilityRole="button"
            accessibilityLabel={held ? 'Carry on: start the clock again' : 'Pause the clock'}
            onPress={() => setHeld((h) => !h)}
            hitSlop={8}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, opacity: pressed ? 0.6 : 1 })}
          >
            <Label style={{ color: held ? night.ink : night.ink3 }}>{held ? 'Paused — tap to carry on' : 'Pause'}</Label>
          </Pressable>
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
                // Chrome's default focus ring is amber and reads as a warning
                // in the night studio. Redrawn in the product's coral rather
                // than removed: the room is auto-focused, but a keyboard user
                // still has to be able to see where they are.
                ...(Platform.OS === 'web' ? webOnlyStyle({ ...focusRing }) : {}),
              }}
            />
          </ScrollView>

          {seeds.length ? (
            <View style={{ width: 92, borderLeftWidth: 1, borderLeftColor: night.line, paddingLeft: 12, gap: 10 }}>
              <Label style={{ color: night.ink3 }}>Seeds</Label>
              {/*
                These are read, never inserted. Tapping one used to paste it
                into the writing, which put words the person only *chose* from
                a list into prose the Book then counts as theirs.
              */}
              {seeds.map((s) =>
                // A goal named by tapping through the fixed bank is the app's
                // phrase. Quoting it back in the serif, in the margin of the
                // room where they are writing, says they wrote it.
                s.authored ? (
                  <UserText
                    key={s.title}
                    italic
                    accessibilityLabel={`One of your goals: ${s.title}`}
                    style={{ fontSize: 13, lineHeight: 17, color: night.ink3 }}
                  >
                    “{s.title}”
                  </UserText>
                ) : (
                  <Body
                    key={s.title}
                    accessibilityLabel={`One of your goals: ${s.title}`}
                    style={{ fontSize: 13, lineHeight: 17, color: night.ink3 }}
                  >
                    {s.title}
                  </Body>
                ),
              )}
            </View>
          ) : null}
        </View>

        <View style={{ paddingBottom: 16, gap: 10, alignItems: 'center' }}>
          {mode !== 'type' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* The one sign the room is listening, and the way to stop it. */}
              <Chip
                testID="write-mic"
                label={listening ? 'Listening' : micNote ? 'Type instead' : 'Starting…'}
                selected={listening}
                role="checkbox"
                onPress={() => {
                  if (listening) {
                    dictationRef.current.stop();
                    setListening(false);
                    setMode('type');
                    setTimeout(() => inputRef.current?.focus(), 60);
                  } else if (micNote) {
                    setMode('type');
                    setTimeout(() => inputRef.current?.focus(), 60);
                  }
                }}
              />
              {micNote ? (
                <Label testID="write-mic-note" style={{ color: night.ink3, flex: 1 }}>
                  {micNote}
                </Label>
              ) : null}
            </View>
          ) : null}
          <Label testID="write-nudge" style={{ color: night.ink3, textAlign: 'center', minHeight: 16 }}>
            {session.nudge ?? ''}
          </Label>
          {ready ? (
            <InkButton
              testID="write-close"
              label="Close it here"
              onPress={() => {
                setClosedBy('person');
                setPhase('closed');
              }}
              style={{ alignSelf: 'stretch' }}
            />
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
