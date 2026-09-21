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
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

/**
 * The answers so far, kept across a detour to the details page: the router
 * remounts this screen on the way back, and a person who read one page
 * about privacy should not find their four answers gone. Session-only;
 * set-up is thirty seconds and consent is the record of it.
 */
let remembered: { step: Step; areas: string[]; custom: string; when: 'morning' | 'evening' | 'any' | null; voice: Persona | null; name: string | null; sixteen: boolean } | null = null;

export default function Setup() {
  const router = useRouter();
  useFirstRunStep('setup');
  const reduced = useReducedMotion();
  const profile = useMorrow((s) => s.profile);
  const setProfile = useMorrow((s) => s.setProfile);
  const consent = useMorrow((s) => s.consent);
  const saveInterviewDraft = useMorrow((s) => s.saveInterviewDraft);

  const [step, setStep] = useState<Step>(() => remembered?.step ?? 0);
  const [areas, setAreas] = useState<string[]>(() => remembered?.areas ?? []);
  const [custom, setCustom] = useState(() => remembered?.custom ?? '');
  const [customOpen, setCustomOpen] = useState(() => Boolean(remembered?.custom));
  const [when, setWhen] = useState<'morning' | 'evening' | 'any' | null>(() => remembered?.when ?? null);
  const [voice, setVoice] = useState<Persona | null>(() => remembered?.voice ?? null);
  const [name, setName] = useState(() => remembered?.name ?? profile.displayName);
  const [sixteen, setSixteen] = useState(() => remembered?.sixteen ?? false);
  useEffect(() => {
    remembered = { step, areas, custom, when, voice, name, sixteen };
  }, [step, areas, custom, when, voice, name, sixteen]);

  const back = () => {
    if (step === 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    setStep((step - 1) as Step);
  };
  usePlatformBack(step > 0, back);

  const areaLabels = useMemo(() => AREAS.map((a) => ({ id: a.id, domain: a.domain, label: a.label })), []);
  const pickedNames = [...areas.map((id) => areaLabels.find((a) => a.id === id)?.label ?? id), ...(custom.trim() ? [custom.trim()] : [])];

  const finish = () => {
    const trimmed = name.trim();
    setProfile({ displayName: trimmed, persona: voice ?? 'gentle', writeWhen: when ?? 'evening' });
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
    consent();
    remembered = null;
    router.push('/first-write');
  };

  const canGoOn = step === 0 ? areas.length > 0 || custom.trim().length > 0 : step === 1 ? when !== null : step === 2 ? voice !== null : sixteen;

  const answered = (label: string, value: string, at: Step) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change`}
      onPress={() => setStep(at)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: day.line2 }}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: day.ink2, flexShrink: 1 }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: day.ink, flexShrink: 1 }}>
        {value}
      </Text>
    </Pressable>
  );

  const titles = ['What do you want to work on?', 'When do you have a quiet moment?', 'How should Morrow speak to you?', 'Last thing.'];
  const lines = ['Pick as many as are true. The first questions come from here.', 'Not a schedule. It only shapes when the app suggests writing.', 'The coach only ever asks and quotes you; this is its tone.', 'A name for the coach to use, and one line before you write.'];

  return (
    <Screen
      testID="screen-setup"
      back={{ onPress: back, testID: 'setup-back' }}
      where="Set-up"
      progress={{ value: (step + 1) / 5, label: `Step ${step + 1} of 4`, testID: 'setup-progress' }}
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
              <OptionTile testID="setup-area-custom" glyph="custom" tint={accent.violet} title="Something else…" role="button" onPress={() => setCustomOpen(true)} compact />
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: sixteen ? day.ink : day.ink3, backgroundColor: sixteen ? day.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {sixteen ? <Glyph name="check" size={16} color={day.onInk} /> : null}
              </View>
              <Body style={{ flex: 1, fontSize: 16 }}>I’m sixteen or over</Body>
            </Pressable>
            <View style={{ gap: 6, backgroundColor: day.surface2, borderRadius: 16, padding: 14 }}>
              <Body testID="setup-privacy" style={{ fontSize: 14, lineHeight: 20 }}>
                Everything you write stays on this phone. The AI never writes a goal or a line of your Book — it only asks and quotes you.
              </Body>
              <TextButton testID="setup-details" label="What leaves the phone, and when" onPress={() => router.push('/consent?from=setup')} style={{ alignSelf: 'flex-start' }} />
            </View>
          </View>
        ) : null}
      </Slide>
    </Screen>
  );
}
