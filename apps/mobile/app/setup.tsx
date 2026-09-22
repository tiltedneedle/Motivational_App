/**
 * Set-up (the rebuild, 2026-09-21): four questions, one tap each, under a
 * progress bar. Answered questions fold to a line above the current one,
 * so the screen reads as a short conversation rather than a form.
 *
 *  1. What do you want to work on?   → seeds the Interview's areas
 *  2. When do you have a quiet moment?→ profile.writeWhen
 *  3. How should Morrow speak to you? → profile.persona
 *  4. Your name, "I'm 16 or over", and one line on privacy with the
 *     details a tap away (the consent screen, which is now that page).
 *
 * The end of set-up is consent (PRD §12: the gate stands before any
 * writing door). Then the first line.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { AREAS, addCustomArea, beginBranches, domainMeta, initialInterview, toggleArea, type DomainId, type Persona } from '@morrow/core';
import { Body, Glyph, Heading, Label, OptionTile, Screen, Slide, TextButton, UserField, accent, day, type as fonts, useReducedMotion } from '@morrow/ui';
import { useMorrow } from '../src/store';
import { useFirstRunStep } from '../src/analytics';
import { usePlatformBack } from '../src/platform-back';

type Step = 0 | 1 | 2 | 3;

const WHEN: { id: 'morning' | 'evening' | 'any'; title: string; caption: string; glyph: 'morning' | 'evening' | 'any' }[] = [
  { id: 'morning', title: 'Mornings', caption: 'Before the day starts', glyph: 'morning' },
  { id: 'evening', title: 'Evenings', caption: 'When the day is done', glyph: 'evening' },
  { id: 'any', title: 'It varies', caption: 'Whenever there is a gap', glyph: 'any' },
];

const VOICE: { id: Persona; title: string; caption: string }[] = [
  { id: 'gentle', title: 'Gently', caption: '“That is a real start.”' },
  { id: 'straight', title: 'Straight', caption: '“You said Tuesday. It is Tuesday.”' },
  { id: 'fierce', title: 'Fierce', caption: '“Nobody is coming. Out the door.”' },
];

const AREA_GLYPH: Record<DomainId, 'health' | 'money' | 'craft' | 'mind' | 'people' | 'home' | 'custom'> = {
  health: 'health',
  money: 'money',
  craft: 'craft',
  mind: 'mind',
  people: 'people',
  home: 'home',
  custom: 'custom',
};

export default function Setup() {
  const router = useRouter();
  useFirstRunStep('setup');
  const reduced = useReducedMotion();
  const profile = useMorrow((s) => s.profile);
  const setProfile = useMorrow((s) => s.setProfile);
  const consent = useMorrow((s) => s.consent);
  const saveInterviewDraft = useMorrow((s) => s.saveInterviewDraft);
  // The answers so far live in the store, like every other draft: a reload,
  // a kill with the keyboard up, or the privacy-details detour (the router
  // remounts this screen on the way back) brings them back.
  const saved = useMorrow((s) => s.setupDraft);
  const setSetupDraft = useMorrow((s) => s.setSetupDraft);
  const done = Boolean(profile.consentedAt);

  const [step, setStep] = useState<Step>(() => (saved && saved.step >= 0 && saved.step <= 3 ? (saved.step as Step) : 0));
  const [areas, setAreas] = useState<string[]>(() => saved?.areas ?? []);
  const [custom, setCustom] = useState(() => saved?.custom ?? '');
  const [customOpen, setCustomOpen] = useState(() => Boolean(saved?.custom));
  const [when, setWhen] = useState<'morning' | 'evening' | 'any' | null>(() => saved?.when ?? null);
  const [voice, setVoice] = useState<Persona | null>(() => saved?.voice ?? null);
  const [name, setName] = useState(() => saved?.name ?? profile.displayName);
  const [sixteen, setSixteen] = useState(() => saved?.sixteen ?? false);
  useEffect(() => {
    if (done) return;
    setSetupDraft({ step, areas, custom, when, voice, name, sixteen });
  }, [done, step, areas, custom, when, voice, name, sixteen, setSetupDraft]);

  // Set-up is over once consent is recorded. Reached again — the browser's
  // back from the first line, a stale link — it goes to Today (the one
  // already in the stack when there is one) rather than asking four
  // questions that were answered. Not on the way out, though: finish()
  // records consent and pushes the first line in the same breath, and this
  // screen is still the one in front for that instant.
  // Read through a ref so the focus effect runs only on a real focus, not
  // on the render in which consent flips.
  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  });
  const doneAtMount = useRef(done).current;
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const returning = focusedBefore.current;
      focusedBefore.current = true;
      // Opened already done (a cold link, or the web's remount on the way
      // back), or returned to after finishing here (a phone's Back).
      if (doneRef.current && (doneAtMount || returning)) router.dismissTo('/today');
    }, [router, doneAtMount]),
  );

  const back = () => {
    if (step === 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    setStep((step - 1) as Step);
  };
  usePlatformBack(step > 0 && !done, back);

  const areaLabels = useMemo(() => AREAS.map((a) => ({ id: a.id, domain: a.domain, label: a.label })), []);
  const pickedNames = [...areas.map((id) => areaLabels.find((a) => a.id === id)?.label ?? id), ...(custom.trim() ? [custom.trim()] : [])];

  const finish = () => {
    const trimmed = name.trim();
    const firstArea = areas[0] ? (AREAS.find((a) => a.id === areas[0])?.domain ?? 'custom') : custom.trim() ? 'custom' : null;
    setProfile({ displayName: trimmed, persona: voice ?? 'gentle', writeWhen: when ?? 'evening', firstArea });
    // The Interview opens with these areas already ticked and its first
    // question answered, so it begins on the question after.
    let s = initialInterview();
    for (const id of areas) s = toggleArea(s, id);
    if (custom.trim()) s = addCustomArea(s, custom.trim());
    if (s.picked.length > 0) {
      const before = s;
      s = beginBranches(s);
      saveInterviewDraft(s, [before]);
    }
    setSetupDraft(null);
    consent();
    router.push('/first-write');
  };

  const canGoOn = step === 0 ? areas.length > 0 || custom.trim().length > 0 : step === 1 ? when !== null : step === 2 ? voice !== null : sixteen;
  if (done) return null;

  const answered = (label: string, value: string, at: Step) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change`}
      onPress={() => setStep(at)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, minHeight: 44, borderBottomWidth: 1, borderBottomColor: day.line2 }}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: day.ink2, flexShrink: 1 }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: day.ink, flexShrink: 1 }}>
        {value}
      </Text>
    </Pressable>
  );

  const titles = ['What do you want to work on?', 'When do you have a quiet moment?', 'How should Morrow speak to you?', 'Last thing.'];
  const lines = ['Pick as many as are true. The first questions come from here.', 'Not a schedule. It only shapes how the app talks about the next step.', 'The coach only ever asks and quotes you; this is its tone.', 'A name for the coach to use, and one line before you write.'];

  return (
    <Screen
      testID="screen-setup"
      back={{ onPress: back, testID: 'setup-back' }}
      where="Set-up"
      progress={{ value: (step + 1) / 4, label: `Step ${step + 1} of 4`, testID: 'setup-progress' }}
      keyboard
      cta={{
        label: step === 3 ? 'Write my first line · 2 min' : step === 0 && pickedNames.length ? `Continue with ${pickedNames.length}` : 'Continue',
        onPress: () => (step === 3 ? finish() : setStep((step + 1) as Step)),
        disabled: !canGoOn,
        testID: 'setup-continue',
      }}
      footer={step === 3 && !sixteen ? <Label style={{ textAlign: 'center' }}>Continue waits for the tick above</Label> : null}
    >
      {step > 0 ? (
        <View testID="setup-answered" style={{ marginBottom: 6 }}>
          {answered('Working on', pickedNames.join(', '), 0)}
          {step > 1 && when ? answered('Quiet moment', WHEN.find((w) => w.id === when)!.title, 1) : null}
          {step > 2 && voice ? answered('Spoken to', VOICE.find((v) => v.id === voice)!.title, 2) : null}
        </View>
      ) : null}

      <Slide key={step} reduced={reduced} style={{ gap: 14 }}>
        <Heading title={titles[step]!} line={lines[step]} testID="setup-question" />

        {step === 0 ? (
          <View style={{ gap: 10 }}>
            {areaLabels.map((a) => (
              <OptionTile
                key={a.id}
                testID={`setup-area-${a.id}`}
                glyph={AREA_GLYPH[a.domain]}
                tint={domainMeta(a.domain).ink}
                title={a.label}
                role="checkbox"
                selected={areas.includes(a.id)}
                onPress={() => setAreas((cur) => (cur.includes(a.id) ? cur.filter((x) => x !== a.id) : [...cur, a.id]))}
              />
            ))}
            {customOpen ? (
              <UserField testID="setup-custom" label="Something else" value={custom} onChangeText={setCustom} placeholder="In a word or two" autoFocus autoCapitalize="sentences" maxLength={40} />
            ) : (
              <OptionTile testID="setup-area-custom" glyph="custom" tint={domainMeta('custom').ink} title="Something else…" role="button" onPress={() => setCustomOpen(true)} compact />
            )}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 10 }}>
            {WHEN.map((w) => (
              <OptionTile key={w.id} testID={`setup-when-${w.id}`} glyph={w.glyph} tint={accent.amber} title={w.title} caption={w.caption} selected={when === w.id} onPress={() => setWhen(w.id)} />
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 10 }}>
            {VOICE.map((v) => (
              <OptionTile key={v.id} testID={`setup-voice-${v.id}`} letter={v.title[0]!} title={v.title} caption={v.caption} selected={voice === v.id} onPress={() => setVoice(v.id)} />
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 18 }}>
            <UserField testID="setup-name" label="Your first name (optional)" value={name} onChangeText={setName} placeholder="What the coach should call you" autoCapitalize="words" maxLength={40} />
            <Pressable
              testID="setup-sixteen"
              accessibilityRole="checkbox"
              aria-checked={sixteen}
              accessibilityLabel="I am sixteen or over"
              onPress={() => setSixteen((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, minHeight: 44 }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: sixteen ? day.ink : day.ink3, backgroundColor: sixteen ? day.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {sixteen ? <Glyph name="check" size={16} color={day.onInk} /> : null}
              </View>
              <Body style={{ flex: 1, fontSize: 16 }}>I’m sixteen or over</Body>
            </Pressable>
            <View style={{ gap: 6, backgroundColor: day.surface2, borderRadius: 16, padding: 14 }}>
              <Body testID="setup-privacy" style={{ fontSize: 14, lineHeight: 20 }}>
                Your writing stays {Platform.OS === 'web' ? 'in this browser' : 'on this phone'}. When you finish a piece of writing, it goes once to an AI service, to be read back to you in your own phrases and checked for signs you may need a person; when you ask for a scene, what you wrote about your future goes with it. It never writes a goal or a line of your Book.
              </Body>
              <TextButton testID="setup-details" label="What leaves the phone, and when" onPress={() => router.push('/consent?from=setup')} style={{ alignSelf: 'flex-start' }} />
            </View>
          </View>
        ) : null}
      </Slide>
    </Screen>
  );
}
