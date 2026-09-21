/**
 * Seal the day (PRD §7.6). A word, a proof, a thing you are glad of, then the
 * same hold that seals a Book. Unsealed days seal themselves as quiet days.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, HoldBar, Label, Quoted, SealBurst, Settle, Statement, Stone, Studio, TopBar, UserField, accent, night, useReducedMotion } from '@morrow/ui';
import { dayOf } from '@morrow/core';
import { feelSealed } from '../src/feel';
import { dictation } from '../src/dictation';
import { track } from '../src/analytics';
import { useMorrow } from '../src/store';

const WORDS = ['Calm', 'Tired', 'Proud', 'Steady'];

export default function SealDay() {
  const router = useRouter();
  const showResources = useMorrow((st) => st.showResources);
  const reduced = useReducedMotion();
  const sealDay = useMorrow((s) => s.sealDay);
  const analyses = useMorrow((s) => s.analyses);
  // A day already sealed opens on what was written, so sealing it again is
  // visibly an edit of that and not an empty form that would replace it.
  const today = useMorrow((s) => s.days[dayOf(new Date(), s.profile.dayBoundaryHour)]);
  const day = useMorrow((s) => dayOf(new Date(), s.profile.dayBoundaryHour));
  const draft = useMorrow((s) => s.dayDraft);
  const saveDraft = useMorrow((s) => s.saveDayDraft);
  const clearDraft = useMorrow((s) => s.clearDayDraft);
  /**
   * The evening they left half written, if it was tonight's. This is the one
   * ritual a person does every day, and its words lived only on this screen
   * until the hold sealed them.
   */
  const [resumed] = useState(() => (draft && draft.day === day ? draft : null));
  const [word, setWord] = useState(resumed?.word ?? today?.moodWord ?? 'Steady');
  const [proof, setProof] = useState(resumed?.proof ?? today?.proof ?? '');
  const [gladOf, setGladOf] = useState(resumed?.gladOf ?? today?.gladOf ?? '');
  const [sealed, setSealed] = useState(false);
  /** PRD §7.6: "optional sixty seconds by voice". Into the proof field, to be read before it is sealed. */
  const witnessName = useMorrow((s) => s.profile.witnessName);
  const iWillLine = useMorrow((s) => s.books[s.books.length - 1]?.iWill ?? '');
  const sealedCount = useMorrow((s) => Object.values(s.days).filter((d) => d.sealedAt).length);
  const [told, setTold] = useState<string | null>(null);
  /**
   * The witness (PRD §7.17) gets the sealed days when the person chooses:
   * one line, through whatever they already use to reach them. The count
   * and the I will line — nothing that was written today.
   */
  const tell = async () => {
    const count = sealedCount;
    const message = String(count) + (count === 1 ? ' day closed.' : ' days closed.') + (iWillLine.trim() ? ' ' + iWillLine.trim() : '') + ' — Morrow';
    try {
      const r = await Share.share({ message, title: 'To ' + witnessName });
      // iOS says whether the sheet was dismissed. Android cannot, and the web
      // answers nothing at all, so both say only that the sheet had it.
      const action = (r as { action?: string } | undefined)?.action;
      setTold(
        action === Share.dismissedAction
          ? 'Not sent.'
          : Platform.OS === 'ios' && action !== undefined
            ? 'Sent to ' + witnessName + '.'
            : 'Handed to the share sheet, for ' + witnessName + '.',
      );
    } catch (err) {
      // The web's sheet, closed without sending, rejects with AbortError: the
      // sheet opened; nothing went. Anything else is the sheet not opening.
      const aborted = err instanceof Error && err.name === 'AbortError';
      setTold(aborted ? 'Not sent.' : 'This device would not open the share sheet. Nothing was sent.');
    }
  };
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const anchorRef = useRef('');

  // Written as they type. Nothing is drafted for an evening nobody has
  // written in, so opening the seal and leaving leaves nothing behind.
  useEffect(() => {
    if (!proof.trim() && !gladOf.trim() && word === (today?.moodWord ?? 'Steady')) {
      if (draft && draft.day === day) clearDraft();
      return;
    }
    saveDraft({ day, word, proof, gladOf });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, word, proof, gladOf]);
  const dictationRef = useRef(dictation());
  const listen = async () => {
    if (listening) {
      dictationRef.current.stop();
      setListening(false);
      return;
    }
    setMicNote(null);
    anchorRef.current = proof;
    const ok = await dictationRef.current.start({
      onText: (text, final) => {
        const joined = [anchorRef.current.trim(), text.trim()].filter(Boolean).join(' ');
        setProof(joined);
        if (final) anchorRef.current = joined;
      },
      onProblem: (message) => {
        setMicNote(message);
        setListening(false);
      },
    });
    setListening(ok);
  };
  useEffect(() => () => dictationRef.current.stop(), []);

  // The evidence rule is the user's own Monitoring line.
  const rule = analyses.find((a) => a.kind === 'monitoring')?.line;

  return (
    <Studio dark testID="screen-seal-day">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: () => (router.canGoBack() ? router.back() : router.dismissTo('/today')), testID: 'seal-day-back' }} help={{ onPress: showResources }} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6, gap: 20 }}>
          <Label style={{ color: night.ink3 }}>Close the day</Label>
          <Statement style={{ color: night.ink }}>
            {sealed ? 'Closed. See you at dawn.' : 'Quiet day or not, it goes in the ledger.'}
          </Statement>

          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>Today, in a word</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WORDS.map((wd) => (
                <Chip key={wd} testID={`mood-${wd}`} label={wd} selected={word === wd} onPress={() => setWord(wd)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>One piece of proof</Label>
            {/* Their own rule for what counts, in their face. */}
            {rule ? <Quoted text={`Your rule: “${rule}”`} spans={[rule]} style={{ color: night.ink3, fontSize: 13, lineHeight: 19 }} /> : null}
            <UserField
              testID="seal-proof"
              labelHidden
              label="What actually happened today"
              value={proof}
              onChangeText={(t) => {
                anchorRef.current = t;
                setProof(t);
              }}
              placeholder="What actually happened"
              multiline
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Chip testID="seal-mic" label={listening ? 'Listening' : 'Say it instead'} selected={listening} role="checkbox" onPress={() => void listen()} />
              {micNote ? (
                <Label testID="seal-mic-note" style={{ color: night.ink3, flex: 1 }}>
                  {micNote}
                </Label>
              ) : null}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label style={{ color: night.ink3 }}>One thing you are glad of</Label>
            <UserField
              testID="seal-glad"
              labelHidden
              label="Something you are glad of"
              value={gladOf}
              onChangeText={setGladOf}
              placeholder="Anything at all"
              multiline
            />
          </View>

          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 44 }}>
            {/* PRD 8.5: "completion drops the stone with a spring, two rings pulse out". The rings reach 1.8×, inside the scroll view's edge. */}
            <SealBurst size={110} color={accent.coral} play={sealed} reduced={reduced} reach={1.8} />
            <Settle reduced={reduced} play={sealed ? 1 : 0}>
              <Stone size={110} domain="health" polish={sealed ? 1 : 0.6} seated={sealed} />
            </Settle>
          </View>
        </ScrollView>

        <View style={{ paddingBottom: 22, gap: 8 }}>
          {sealed && witnessName.trim() ? (
            <View testID="seal-witness" style={{ gap: 6 }}>
              <Chip testID="seal-tell" label={told ? told : 'Tell ' + witnessName} onPress={() => void tell()} />
              <Chip testID="seal-witness-today" label="Back to Today" ghost onPress={() => router.dismissTo('/today')} />
            </View>
          ) : null}
          <HoldBar
            testID="seal-day-hold"
            label="Hold to close the day"
            doneLabel={`Closed · ${word}`}
            done={sealed}
            reducedMotion={reduced}
            onComplete={() => {
              sealDay({ moodWord: word, proof, gladOf });
              clearDraft();
              feelSealed();
              {
                const d = useMorrow.getState().days[dayOf(new Date(), useMorrow.getState().profile.dayBoundaryHour)];
                track({ name: 'day_sealed', planned: d?.planned ?? 0, done: d?.done ?? 0, wrote_proof: proof.trim().length > 0 });
                if (Object.values(useMorrow.getState().days).filter((x) => x.sealedAt).length <= 1) track({ name: 'first_value', kind: 'first_day_sealed' });
              }
              setSealed(true);
              // With a witness named the evening does not close itself: the
              // count is theirs to send or not, and then Today.
              if (!witnessName.trim()) setTimeout(() => router.dismissTo('/today'), 900);
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
