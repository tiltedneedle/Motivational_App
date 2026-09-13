/**
 * The Coach (PRD §7.9). It quotes before it suggests, and every reply is built
 * from the user's own material. With nothing of theirs to quote it asks a
 * question instead of inventing encouragement.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CHIPS,
  contentGuard,
  dayOf,
  detectReturns,
  plural,
  quotable,
  replyToChip,
  replyToText,
  screen,
  type ChipId,
  type PaywallMoment,
  fullTrackInvitation,
  type CoachReply,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Quoted, Rule, Stone, Studio, Toast, TopBar, UserField, UserText, accent, day, type as fonts } from '@morrow/ui';
import { useConsistency, useLatestBook, useMorrow, useTodaysMoves } from '../src/store';
import { dictation } from '../src/dictation';

export default function Coach() {
  const router = useRouter();
  const state = useMorrow((s) => s);
  const book = useLatestBook();
  const moves = useTodaysMoves();
  const score = useConsistency();
  const shrinkMove = useMorrow((s) => s.shrinkMove);
  const toast = useMorrow((s) => s.toast);
  const setToast = useMorrow((s) => s.setToast);
  const noteConcern = useMorrow((s) => s.noteConcern);
  const setIntention = useMorrow((s) => s.setIntention);
  const takeCoachTurn = useMorrow((s) => s.takeCoachTurn);
  const inviteFullTrack = useMorrow((s) => s.inviteFullTrack);

  /**
   * The thread. A coach message carries the spans that are the person's own
   * words, so they can be set in their face rather than the app's — a reply
   * that quotes their if-then is half theirs and the type has to say so.
   */
  const [thread, setThread] = useState<{ who: 'me' | 'coach'; text: string; spans?: string[]; typed?: boolean }[]>([]);
  const [draft, setDraft] = useState('');
  const [capped, setCapped] = useState<PaywallMoment | null>(null);
  /**
   * Voice input (PRD §7.9). The same recogniser as the writing room: what is
   * heard lands in the field, where it can be read and changed before it is
   * sent, because a coach that acts on a mis-hearing is worse than one that
   * makes you look at the words first.
   */
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const anchorRef = useRef('');
  const dictationRef = useRef(dictation());
  const listen = async () => {
    if (listening) {
      dictationRef.current.stop();
      setListening(false);
      return;
    }
    setMicNote(null);
    anchorRef.current = draft;
    const ok = await dictationRef.current.start({
      onText: (text, final) => {
        const joined = [anchorRef.current.trim(), text.trim()].filter(Boolean).join(' ');
        setDraft(joined);
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

  // Today used to be the only screen that built the brief, so arriving here
  // first — from a notification, a deep link, or just the tab bar — showed a
  // coach with nothing to say. Making one is idempotent: it returns the day's
  // brief if there already is one.
  const makeBrief = useMorrow((s) => s.makeBrief);
  useEffect(() => {
    makeBrief();
  }, [makeBrief]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  const brief = state.briefs[state.briefs.length - 1] ?? null;
  const days = useMemo(() => Object.values(state.days), [state.days]);
  const today = dayOf(new Date(), state.profile.dayBoundaryHour);

  // PRD 7.10, the morning intention: one tap on the first move, inside the
  // brief. The brief already names the move; there was simply nothing to tap.
  const firstMove = brief?.firstMoveId ? moves.find((m) => m.id === brief.firstMoveId) : undefined;
  const intended = state.days[today]?.intentionMoveId ?? null;

  // PRD 7.10, the other ritual on this screen: one invitation to the Full
  // track, after the first sealed Book, ever. `fullTrackInvitation` was written
  // and tested and then never called, so it never arrived at all.
  //
  // The longest line they wrote is the argument: they already went that deep on
  // one thing, in their own words, and this asks whether they want to on the
  // rest. Not a sales line the app made up about them.
  const longestLine = useMemo(() => {
    const lines = quotable(state.analyses)
      .map((a) => a.paragraph?.trim() || a.line.trim())
      .filter((l) => l.length > 0);
    return lines.sort((a, b) => b.length - a.length)[0] ?? '';
  }, [state.analyses]);
  const invitation =
    book && !state.fullTrackInvited && state.profile.track === 'starter' && longestLine.length >= 40
      ? fullTrackInvitation(longestLine)
      : null;

  const ctx = {
    book,
    analyses: quotable(state.analyses),
    moves,
    days,
    today,
    // A return is a gap the person came back from, not a sealed day. Passing
    // the sealed-day count made the celebrate reply print the same number
    // twice: "12 sealed days and 12 returns".
    returns: detectReturns(days, today).length,
    persona: state.profile.persona,
  };

  const say = (chip: ChipId, label: string) => {
    // A chip is a turn like any other (PRD §13.3's cap is on turns, not on
    // typing). Without this the four chips were an unlimited coach for
    // anyone who never used the field.
    const turn = takeCoachTurn();
    if (!turn.allowed) {
      setThread((t) => [...t, { who: 'me', text: label }, { who: 'coach', text: turn.reason }]);
      setCapped(turn.moment);
      return;
    }
    const reply: CoachReply = replyToChip(chip, ctx);
    setThread((t) => [...t, { who: 'me', text: label }, { who: 'coach', text: reply.text, spans: reply.quotedSpans }]);
    if (!reply.action) return;
    // Shrink the move they are stuck on rather than adding another one like it.
    // The store raises its own toast either way.
    shrinkMove(reply.action.moveId);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (listening) {
      dictationRef.current.stop();
      setListening(false);
    }
    // The free plan's daily turns (PRD §13.3). Taken before anything else, so
    // the cap cannot be walked past by writing something the guards refuse —
    // and refused with a sentence rather than a dead Send button, because a
    // control that silently does nothing is the worst way to say no.
    const turn = takeCoachTurn();
    if (!turn.allowed) {
      setThread((t) => [...t, { who: 'me', text, typed: true }, { who: 'coach', text: turn.reason }]);
      setDraft('');
      setCapped(turn.moment);
      return;
    }
    setDraft('');
    const risk = screen(text);
    if (risk.risk === 'crisis') {
      // No row: the thread is not kept, so there is nothing for the appeal
      // to clear — it closes the card and that is all.
      useMorrow.setState({ safetyPause: { risk: risk.risk, at: new Date().toISOString(), source: null } });
      return;
    }
    // Not a crisis, but not nothing either. The thread is not kept, so without
    // this the band closes the moment they leave the screen and tomorrow's
    // brief is written as though the conversation never happened.
    if (risk.risk === 'concern') noteConcern();
    // The rules the coach obeys whatever was asked (PRD 11.6): no calorie
    // targets, no dosages, no financial recommendations. This was written and
    // unit-tested and then never called, so the coach answered all three.
    const guard = contentGuard(text);
    if (!guard.allowed) {
      setThread((t) => [...t, { who: 'me', text, typed: true }, { who: 'coach', text: guard.redirect ?? '' }]);
      return;
    }
    // replyToText carries the Returns branch: someone coming back after a gap
    // is met with that, not with the same generic question as everyone else.
    // The screen used to inline the generic line and never call this at all.
    const reply = replyToText(text, ctx);
    if (!reply.text) return;
    setThread((t) => [...t, { who: 'me', text, typed: true }, { who: 'coach', text: reply.text, spans: reply.quotedSpans }]);
  };

  return (
    <Studio testID="screen-coach">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ label: 'Today', onPress: () => router.dismissTo('/today'), testID: 'coach-back' }} where="The coach" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4 }}>
          <Stone size={46} gradient={['#FFFFFF', '#F3F1EC', '#CFCBC2', '#8E8A80']} polish={1} />
          <View style={{ flex: 1 }}>
            <Label>Your coach</Label>
            <Body style={{ fontSize: 13 }}>{thread.length ? 'Listening' : `Remembers ${plural(days.length, 'day')}`}</Body>
          </View>
        </View>

        {/*
          PRD §11.6: "Morrow's coach is an AI" at first chat and in Settings.
          It was in neither. Shown while the thread is empty, which is every
          first chat and no later one, and it says the thing that actually
          matters about it rather than only the disclosure.
        */}
        {thread.length === 0 ? (
          <Body testID="coach-is-ai" style={{ fontSize: 13, color: day.ink2, paddingTop: 10 }}>
            Morrow’s coach is an AI. It asks and it quotes you. It never writes a goal, a plan line or a sentence of
            your Book.
          </Body>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 16 }}>
          {thread.length === 0 && brief ? (
            <View testID="dawn-brief" style={{ gap: 14 }}>
              {/*
                The brief is the app's sentences around the person's own —
                "Your line" is theirs, "Start with" is not — and the two are
                set in their two faces so nobody has to guess which is which.
              */}
              <Quoted
                text={brief.today}
                spans={brief.quotedSpans}
                italic={false}
                style={{ fontFamily: fonts.sansSemi, fontSize: 24, lineHeight: 31, letterSpacing: -0.4, color: day.ink }}
              />
              <Rule />
              {/*
                Label above value, not beside it. A fixed-width column cannot
                reflow, so at 200% type the row labels were cut off rather than
                wrapping.
              */}
              <View style={{ gap: 4 }}>
                <Label style={{ color: accent.coralText }}>Yesterday</Label>
                <Quoted text={brief.yesterday} spans={brief.quotedSpans} style={{ color: day.ink }} />
              </View>
              <Rule />
              <View style={{ gap: 4 }}>
                <Label style={{ color: accent.coralText }}>If</Label>
                <Quoted text={brief.ifThen} spans={brief.quotedSpans} style={{ color: day.ink }} />
              </View>
              {firstMove ? (
                <>
                  <Rule />
                  <View style={{ gap: 6 }}>
                    <Label style={{ color: accent.coralText }}>{intended === firstMove.id ? 'You said' : 'This one'}</Label>
                    {/* Their sentence, cut from their own Strategies line. */}
                    <UserText style={{ fontSize: 18, lineHeight: 25, color: day.ink }}>{firstMove.title}</UserText>
                    {intended === firstMove.id ? (
                      <Body testID="intention-set" style={{ fontSize: 13 }}>
                        Said this morning. Nothing is counting; it is on Today when you want it.
                      </Body>
                    ) : (
                      <Chip
                        testID="intention"
                        label="This one today"
                        onPress={() => {
                          setIntention(firstMove.id);
                          setToast({ text: 'Said. It is on Today.', kind: 'info' });
                        }}
                      />
                    )}
                  </View>
                </>
              ) : null}

              {invitation ? (
                <>
                  <Rule />
                  <View style={{ gap: 6 }}>
                    <Label style={{ color: accent.coralText }}>One invitation</Label>
                    {/*
                      Their own longest line, quoted, and one sentence of the
                      app's around it. Split so the serif means what it means
                      everywhere else in the product.
                    */}
                    <UserText testID="full-track-quote" style={{ fontSize: 17, lineHeight: 25, color: day.ink }}>
                      {`“${invitation.quoted}”`}
                    </UserText>
                    <Body style={{ color: day.ink }}>{invitation.ask}</Body>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Chip
                        testID="full-track-yes"
                        label="Show me the Full track"
                        onPress={() => {
                          inviteFullTrack();
                          router.push('/settings');
                        }}
                      />
                      <Chip testID="full-track-no" label="Not now" ghost onPress={() => inviteFullTrack()} />
                    </View>
                  </View>
                </>
              ) : null}

              {brief.support ? (
                <>
                  <Rule />
                  <View style={{ gap: 4 }}>
                    <Label style={{ color: accent.coralText }}>One thing</Label>
                    <Body testID="brief-support" style={{ color: day.ink }}>
                      {brief.support}
                    </Body>
                  </View>
                </>
              ) : null}
              {/*
                No number on a heavy week. The score is still computed and
                still on Progress if they go and look for it; it does not lead
                the morning. PRD 11.6.
              */}
              {brief.soften ? null : (
                <>
                  <Rule />
                  <Label testID="brief-consistency">Consistency {score.score}</Label>
                </>
              )}
            </View>
          ) : null}

          {thread.map((m, i) => (
            <View key={i} style={{ alignItems: m.who === 'me' ? 'flex-end' : 'flex-start' }}>
              <View
                testID={`msg-${m.who}-${i}`}
                style={{
                  maxWidth: '86%',
                  padding: 14,
                  borderRadius: 20,
                  backgroundColor: m.who === 'me' ? day.ink : day.surface,
                }}
              >
                {m.who === 'me' && m.typed ? (
                  <UserText style={{ color: day.onInk, fontSize: 16, lineHeight: 22 }}>{m.text}</UserText>
                ) : m.who === 'me' ? (
                  // A chip is the app's sentence, tapped rather than typed:
                  // their turn, not their words, so not their face.
                  <Body style={{ color: day.onInk, fontSize: 16, lineHeight: 22 }}>{m.text}</Body>
                ) : (
                  <Quoted text={m.text} spans={m.spans ?? []} style={{ color: day.ink, fontSize: 16, lineHeight: 22 }} />
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingBottom: 18, gap: 10 }}>
          {/*
            The daily cap, offered rather than enforced in silence. The coach
            has already said what happened in the thread; this is the way on for
            somebody who wants one, and there is no way to lose anything by
            ignoring it.
          */}
          {capped ? (
            <Chip
              testID="coach-capped"
              label="See what Pro adds"
              onPress={() => router.push(`/paywall?moment=${capped}&from=/coach`)}
            />
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHIPS.map((c) => (
              <Chip key={c.id} testID={`chip-${c.id}`} label={c.label} onPress={() => say(c.id, c.label)} />
            ))}
          </View>
          {/*
          The Coach's own actions raise a toast, and this screen rendered no
          surface for one, so every confirmation and every refusal it produced
          went nowhere at all. Today was the only screen that showed them.
        */}
        {toast ? (
          <View style={{ paddingBottom: 10 }}>
            <Toast text={toast.text} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <UserField
                testID="coach-input"
              labelHidden
                label="Talk to the coach"
                value={draft}
                onChangeText={setDraft}
                placeholder="Say anything"
                onSubmitEditing={send}
              />
            </View>
            <Chip testID="coach-mic" label={listening ? 'Listening' : 'Say it'} selected={listening} role="checkbox" onPress={() => void listen()} />
            <InkButton testID="coach-send" label="Send" onPress={send} compact />
          </View>
          {micNote ? (
            <Label testID="coach-mic-note" style={{ color: day.ink3 }}>
              {micNote}
            </Label>
          ) : null}
        </View>
      </SafeAreaView>
    </Studio>
  );
}
