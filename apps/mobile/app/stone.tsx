/**
 * The analysis half-sheet (PRD §7.2). One component, used twelve times.
 *
 * Three or four framings to tap, then the user's own words. The framing is a
 * hand on the shoulder; nothing counts until the line is written. Vague
 * Strategies and Monitoring lines earn ONE follow-up and never a second.
 */
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ANALYSIS_ORDER,
  ANALYSIS_TITLES,
  analysisPlan,
  followUpPrompt,
  framingSet,
  scoreSpecificity,
  specificityCaption,
  type AnalysisKind,
  FAULT_FRAMINGS,
  ifThenFromFault,
  formatDay,
  sealedOn,
  thenHalf,
  sameLine,
  stoneNow,
} from '@morrow/core';
import { Body, Chip, InkButton, Label, Pop, ProgressBar, Question, Settle, Statement, Stone, Studio, TextButton, TopBar, UserField, UserText, accent, announce, day, useReducedMotion } from '@morrow/ui';
import { analysesFor, useGoals, useLatestBook, useMorrow, cardText, useSnapshot } from '../src/store';
import { useFirstRunStep } from '../src/analytics';

// The plan of analyses per goal lives in core now (`firstRunStep` needs it
// too); re-exported so the screens that import it from here keep working.

/** PRD 7.2: the Full track's soft floor. Polish, never an error. */
const FULL_FLOOR = 600;

/**
 * The gate (PRD §12) stands at every writing door: opened by a link on a
 * fresh browser, this room went straight to the field and the age
 * affirmation and the privacy line came days later, from Today's card.
 * Set-up resumes its draft and dismisses to Today when it is done.
 */
export default function StoneScreenGate() {
  const consented = useMorrow((s) => Boolean(s.profile.consentedAt));
  if (!consented) return <Redirect href="/setup" />;
  return <StoneScreen />;
}

function StoneScreen() {
  const router = useRouter();
  useFirstRunStep('stone');
  const showResources = useMorrow((st) => st.showResources);
  const params = useLocalSearchParams<{ goal?: string; kind?: string; rewrite?: string; from?: string }>();
  const goals = useGoals();
  const track = useMorrow((s) => s.profile.track);
  const write = useMorrow((s) => s.writeAnalysis);
  const draft = useMorrow((s) => s.stoneDraft);
  const saveDraft = useMorrow((s) => s.saveStoneDraft);
  const clearDraft = useMorrow((s) => s.clearStoneDraft);
  const state = useSnapshot();

  const goalId = params.goal ?? goals[0]?.id ?? '';
  const goal = goals.find((g) => g.id === goalId);
  // One of the five, or the first: `/stone?kind=wrong` from a mistyped
  // link crashed on `set.question`.
  const kind = (ANALYSIS_ORDER as readonly string[]).includes(params.kind ?? '') ? (params.kind as AnalysisKind) : 'motives';

  const existing = analysesFor(state, goalId).find((a) => a.kind === kind);
  /**
   * Day-90 re-authoring (PRD §7.3): "the same screens with the old line
   * above the new". Opened from the re-authoring with `rewrite=1`, this
   * stone shows the line as the latest edition sealed it and starts on an
   * empty field — and goes back where it came from instead of on to the next
   * stone. The sealed line comes from the Book, not the stone: the stone is
   * what gets written again, and once it has been, the edition is the only
   * copy of what it said before.
   */
  const latest = useLatestBook();
  const boundary = useMorrow((s) => s.profile.dayBoundaryHour);
  const returnTo = typeof params.from === 'string' && params.from.startsWith('/') ? params.from : null;
  const before =
    params.rewrite === '1' && returnTo && latest
      ? (latest.chapters.find((c) => c.goalId === goalId)?.lines.find((l) => l.kind === kind) ?? null)
      : null;
  // Empty while the stone still says what was sealed — line, then-half and
  // paragraph, the comparison the diff makes; once it says something else,
  // that is what is edited, so coming back does not blank a new line.
  const fresh = !!before && (() => {
    const now = stoneNow(existing);
    return now === null || sameLine(before, now);
  })();
  /**
   * The sitting they left, if it was this stone's. Read once, at mount: after
   * that this screen is the thing writing it. A draft of some other stone is
   * not ours to open.
   */
  const [resumed] = useState(() => (draft && draft.goalId === goalId && draft.kind === kind ? draft : null));
  const [framingId, setFramingId] = useState<string | null>(resumed?.framingId ?? existing?.framingId ?? null);
  const reduced = useReducedMotion();
  const [line, setLine] = useState(resumed?.line ?? (fresh ? '' : (existing?.line ?? '')));
  const [line2, setLine2] = useState(resumed?.line2 ?? (fresh ? '' : (existing?.line2 ?? '')));
  const [paragraph, setParagraph] = useState(resumed?.paragraph ?? (fresh ? '' : (existing?.paragraph ?? '')));
  const [followUpAsked, setFollowUpAsked] = useState(false);
  // The follow-up's own words ("Tuesdays at 7, in the kitchen"), joined to
  // the line when it is kept. Bound to the same state as the line, the
  // same text used to appear in two fields at once.
  const [whenWhere, setWhenWhere] = useState(resumed?.whenWhere ?? '');

  /**
   * The Present volume feeds the plan (PRD §7.15). Each fault the person wrote
   * about carries a sign they tapped and an answer in their own words, and an
   * answer plus its sign is an if-then — which is what this stone holds. So
   * the written faults are offered here, on the Obstacles stone only, as
   * chips: a tap puts their own "what I do instead" into the then-line, and
   * the sign they tapped becomes the If field's hint for them to phrase.
   * Nothing of the app's lands in a field that counts as theirs.
   */
  const faults = useMemo(
    () => (kind === 'obstacles' ? state.presentPicks.filter((p) => p.half === 'faults' && p.storyLine.trim() && p.applyLine.trim()).sort((a, b) => a.rank - b.rank) : []),
    [kind, state.presentPicks],
  );
  const [faultHint, setFaultHint] = useState<string | null>(null);
  const takeFault = (p: (typeof faults)[number]) => {
    const card = { id: p.cardId, text: cardText(p.cardId), group: 'drive' as const };
    const made = ifThenFromFault(card, p, FAULT_FRAMINGS);
    if (!made) return;
    setLine2(made.line2);
    setFaultHint('If ' + made.line.charAt(0).toLowerCase() + made.line.slice(1) + '…');
    setFramingId(null);
    announce('Your answer from Present, under this goal. Now the If, in your words.');
  };

  const set = useMemo(() => framingSet(kind, goal?.domain ?? 'custom'), [kind, goal?.domain]);
  const plan = goal ? analysisPlan(goal.rank, track) : ANALYSIS_ORDER;
  const stepIndex = plan.indexOf(kind);
  // The whole plan's count, for the progress bar: every goal's questions,
  // and how many already have a line.
  const allAnalyses = useMorrow((s) => s.analyses);
  // The path's step labels belong to the first run; a line rewritten after
  // the Book exists is an edit, not step four of anything.
  const onPath = useMorrow((s) => s.books.length === 0);
  const totalPlanned = goals.reduce((n, g) => n + analysisPlan(g.rank, track).length, 0);
  const written = goals.reduce((n, g) => n + analysisPlan(g.rank, track).filter((k) => allAnalyses.some((a) => a.goalId === g.id && a.kind === k && a.line.trim().length > 0)).length, 0);
  const spec = scoreSpecificity(paragraph.trim() || line);
  const needsFollowUp =
    (kind === 'strategies' || kind === 'monitoring') && spec.needsFollowUp && line.trim().length > 0 && !followUpAsked;

  const ready = line.trim().length > 0 && (kind !== 'obstacles' || line2.trim().length > 0);

  const makePlan = useMorrow((s) => s.makePortraitAndPlan);

  // A new stone replaces the last on the stack; nothing moves for a screen
  // reader, so the stone says where it is and what it asks.
  useEffect(() => {
    if (!goal) return;
    announce(`${goal.title}. ${ANALYSIS_TITLES[kind]}, question ${stepIndex + 1} of ${plan.length}. ${set.question}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, kind]);

  /**
   * Back is the previous stone — this goal's, or the last of the goal before
   * — not whatever screen happens to be under this one. The stones replace
   * each other on the stack so the path does not pile up, which meant the
   * router's own back from stone 3 landed on the order screen, two stones
   * ago. What was written on a stone stays written; Back only turns the page.
   * Before the first stone of the first goal, the router's back is right.
   */
  const goBack = () => {
    // What is on the stone stays on the stone. Back used to turn the page
    // and drop the line being typed (WCAG 3.3.7; NN/g: never lose input) —
    // and then it went on dropping the follow-up, which is the sharper half
    // of the answer: "Tuesdays at 7, in the kitchen" was held in the draft
    // alone, and the draft is one slot. So the follow-up's words join the
    // line here exactly as "Keep this line" joins them.
    const kept = line.trim() && whenWhere.trim() ? `${line.trim()} — ${whenWhere.trim()}` : line;
    if (kept.trim()) {
      write(goalId, kind, {
        framingId,
        line: kept,
        ...(kind === 'obstacles' ? { line2 } : {}),
        ...(track === 'full' && paragraph.trim() ? { paragraph } : {}),
      });
    }
    // A stone opened from the re-authoring goes back to it, not to the
    // stone before it in the walk.
    if (returnTo) {
      if (router.canGoBack()) router.back();
      else router.replace(returnTo);
      return;
    }
    if (stepIndex > 0) {
      router.replace(`/stone?goal=${goalId}&kind=${plan[stepIndex - 1]}`);
      return;
    }
    const idx = goals.findIndex((g) => g.id === goalId);
    const prevGoal = idx > 0 ? goals[idx - 1] : undefined;
    if (prevGoal) {
      const prevPlan = analysisPlan(prevGoal.rank, track);
      router.replace(`/stone?goal=${prevGoal.id}&kind=${prevPlan[prevPlan.length - 1]}`);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.dismissTo('/today');
  };

  // Written as they type, the way every other room in the app is. Nothing
  // is drafted for a stone that is still blank, so opening one and leaving
  // leaves nothing behind.
  useEffect(() => {
    const blank = !line.trim() && !line2.trim() && !paragraph.trim() && !whenWhere.trim() && framingId === null;
    // Nothing new to keep: a stone that was written before opens with its own
    // words already in the fields, and saving those as a sitting took the one
    // draft slot away from the stone the person was actually in the middle of.
    const unchanged =
      !whenWhere.trim() &&
      line.trim() === (existing?.line ?? '').trim() &&
      line2.trim() === (existing?.line2 ?? '').trim() &&
      paragraph.trim() === (existing?.paragraph ?? '').trim() &&
      framingId === (existing?.framingId ?? null);
    if (blank || unchanged) {
      if (draft && draft.goalId === goalId && draft.kind === kind) clearDraft();
      return;
    }
    saveDraft({ goalId, kind, framingId, line, line2, paragraph, whenWhere });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, kind, framingId, line, line2, paragraph, whenWhere]);

  const goNext = () => goNextWith(line);
  const goNextWith = (text: string) => {
    // Kept: the stone is in the store now, and the sitting has nothing left
    // to hold. Cleared before the route changes, so the next stone opens on
    // its own draft and never on this one's.
    clearDraft();
    write(goalId, kind, {
      framingId,
      line: text,
      ...(kind === 'obstacles' ? { line2 } : {}),
      ...(track === 'full' && paragraph.trim() ? { paragraph } : {}),
    });

    // Written again from the re-authoring: the plan is refreshed from the
    // new line (it keeps its kept moves) and the sitting goes back to the
    // two Books side by side, where this stone now reads "Written again".
    if (returnTo) {
      makePlan(goalId);
      if (router.canGoBack()) router.back();
      else router.replace(returnTo);
      return;
    }

    // A question outside this goal's plan ("Go deeper" on the Goal page),
    // or any stone opened once the Book exists, is one line written and
    // then back where it was opened from — not the whole walk to the finish.
    if (stepIndex < 0 || !onPath) {
      if (router.canGoBack()) router.back();
      else router.replace(`/goal?id=${goalId}`);
      return;
    }
    const nextKind = plan[stepIndex + 1];
    if (nextKind) {
      router.replace(`/stone?goal=${goalId}&kind=${nextKind}`);
      return;
    }

    // The last stone for this goal is written, so build or refresh its plan
    // here rather than only when the Book is sealed.
    //
    // Sealing was the single call site, which meant a goal whose Blueprint had
    // failed the first time — because the Strategies line was missing then —
    // could only ever get one by sealing a second edition of the whole Book.
    // Safe to call now: it keeps an existing plan and its kept moves, and only
    // fills in what is newly derivable.
    makePlan(goalId);

    const idx = goals.findIndex((g) => g.id === goalId);
    const nextGoal = goals[idx + 1];
    if (nextGoal) {
      const nextPlan = analysisPlan(nextGoal.rank, track);
      router.replace(`/stone?goal=${nextGoal.id}&kind=${nextPlan[0]}`);
      return;
    }
    // The Portrait reveal (PRD §7.4), which is what all five stones were for
    // and which nothing in the app had ever shown. It is built here, from the
    // lines they have just written, and the sitting carries on from it.
    router.replace(`/portrait?goal=${goals[0]?.id ?? goalId}&next=/seal-book`);
  };

  if (!goal) {
    return (
      <Studio testID="screen-stone">
        <SafeAreaView style={{ flex: 1, padding: 22, justifyContent: 'center' }}>
          <Statement>That goal is gone.</Statement>
          <InkButton label="Back to today" onPress={() => router.dismissTo('/today')} style={{ marginTop: 18 }} />
        </SafeAreaView>
      </Studio>
    );
  }

  return (
    <Studio testID="screen-stone">
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 22 }}>
        <TopBar back={{ onPress: goBack, testID: 'stone-back' }} style={{ paddingTop: 6, minHeight: 44 }} help={{ onPress: showResources }} />
        {onPath ? (
          <ProgressBar
            value={3.4 / 5 + (0.6 / 5) * (written / Math.max(1, totalPlanned))}
            label={`Step 4 of 5 · Plan each goal · ${written} of ${totalPlanned} lines`}
            testID="stone-progress"
            style={{ paddingTop: 2, paddingBottom: 12 }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 2 }}>
          {/* Just kept a line: the stone seats (PRD 8.2) as the next one opens. */}
          <Settle reduced={reduced} play={stepIndex}>
            <Stone size={30} domain={goal.domain} polish={1} />
          </Settle>
          <View style={{ flex: 1 }}>
            {/* Where this goal sits among the others, so "stone 3 of 5" is not the whole count (OFR-06). */}
            <Label testID="stone-goal">{goals.length > 1 ? `${goal.title} · goal ${goals.findIndex((g) => g.id === goalId) + 1} of ${goals.length}` : goal.title}</Label>
            <Label testID="stone-step" style={{ color: accent.coralText, marginTop: 2 }}>
              {stepIndex < 0 ? `${ANALYSIS_TITLES[kind]} · one more question` : `${ANALYSIS_TITLES[kind]} · question ${stepIndex + 1} of ${plan.length}`}
            </Label>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {plan.map((k, i) => {
              const dot = (
                <View
                  key={k}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: i < stepIndex ? accent.coral : 'transparent',
                    borderWidth: i < stepIndex ? 0 : 1.5,
                    borderColor: day.line,
                  }}
                />
              );
              // The dot for the line just kept pops in; the others sit still.
              return i === stepIndex - 1 ? (
                <Pop key={k} reduced={reduced}>
                  {dot}
                </Pop>
              ) : (
                dot
              );
            })}
          </View>
        </View>

        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 18, gap: 16 }}>
          {stepIndex === 0 && goals.findIndex((g) => g.id === goalId) === 0 && !existing ? (
            <Body testID="stone-intro" style={{ fontSize: 14, color: day.ink2 }}>
              {track === 'full'
                ? 'Five short questions per goal, one line each, in your words.'
                : goals.length > 3
                  ? 'Five short questions for each of the top three goals; the rest get the two that make a plan.'
                  : 'Five short questions per goal, one line each, in your words.'}{' '}
              A chip is a way in; the line is yours.
            </Body>
          ) : null}
          <Statement testID="stone-question">{set.question}</Statement>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {set.framings.map((f) => (
              <Chip
                key={f.id}
                testID={`framing-${f.id}`}
                label={f.label}
                selected={framingId === f.id}
                onPress={() => setFramingId(framingId === f.id ? null : f.id)}
              />
            ))}
          </View>

          {faults.length ? (
            <View testID="stone-faults" style={{ gap: 8, backgroundColor: day.surface2, borderRadius: 18, padding: 14 }}>
              <Label>From what gets in your way</Label>
              <Body style={{ fontSize: 13 }}>You wrote these in Present. Tap one and your answer to it goes under this goal.</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {faults.map((p) => (
                  <Chip key={p.id} testID={'stone-fault-' + p.cardId} label={cardText(p.cardId).replace(/\.$/, '')} ghost onPress={() => takeFault(p)} />
                ))}
              </View>
            </View>
          ) : null}

          {before && latest ? (
            <View testID="stone-before" style={{ gap: 4, backgroundColor: day.surface2, borderRadius: 18, padding: 14 }}>
              <Label>What you finished, {formatDay(sealedOn(latest.sealedAt, boundary))}</Label>
              <UserText style={{ fontSize: 17, lineHeight: 26, color: day.ink2 }}>{before.text}</UserText>
              {before.text2 ? (
                <UserText italic framing={thenHalf(before.text2).framing} style={{ fontSize: 15, lineHeight: 23, color: day.ink3 }}>
                  {thenHalf(before.text2).act}
                </UserText>
              ) : null}
              <Body style={{ fontSize: 13 }}>Write it again below. Back leaves the finished line as it is.</Body>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            {/*
              A tapped chip is a way in, not an answer, and the label says so
              at the moment it matters — a person who had tapped one and
              found the button still waiting read it as a form left blank.
            */}
            <Label testID="stone-line-label">
              {framingId && !line.trim() ? 'That is the way in. Now the line, in your words' : before ? 'Now, in your words' : 'In your words'}
            </Label>
            <UserField
              testID="stone-line"
              labelHidden
              label="Your line for this question"
              value={line}
              onChangeText={setLine}
              placeholder={faultHint ?? set.hint}
              multiline={kind !== 'obstacles'}
            />
            {kind === 'obstacles' ? (
              <>
                <Label style={{ marginTop: 10 }}>…then I</Label>
                <UserField
                  testID="stone-line2"
              labelHidden
                  label="What you do instead"
                  value={line2}
                  onChangeText={setLine2}
                  placeholder="what you do instead"
                />
              </>
            ) : null}
            {line.trim() && (kind === 'strategies' || kind === 'monitoring') ? (
              <Label testID="stone-specificity" style={{ marginTop: 4 }}>
                {specificityCaption(spec)}
              </Label>
            ) : null}
          </View>

          {/* the single follow-up, never a second */}
          {needsFollowUp ? (
            <View testID="stone-followup" style={{ backgroundColor: day.surface2, borderRadius: 18, padding: 16, gap: 8 }}>
              <Question style={{ fontSize: 18 }}>{followUpPrompt(kind === 'monitoring' ? 'monitoring' : 'strategies')}</Question>
              <UserField
                testID="stone-followup-input"
                labelHidden
                label="When and where"
                value={whenWhere}
                onChangeText={setWhenWhere}
                placeholder="add the when and the where"
                multiline
              />
              <TextButton testID="stone-followup-skip" label="Leave it as it is" onPress={() => setFollowUpAsked(true)} />
            </View>
          ) : null}

          {track === 'full' ? (
            <View testID="stone-full" style={{ gap: 8 }}>
              <Label>Go deeper</Label>
              {set.fullPrompts.map((p) => (
                <Body key={p} style={{ fontSize: 14, lineHeight: 19 }}>
                  · {p}
                </Body>
              ))}
              <UserField
                testID="stone-paragraph"
              labelHidden
                label="Your paragraph for this question"
                value={paragraph}
                onChangeText={setParagraph}
                placeholder="A paragraph, at least. Write until it is true."
                multiline
                minHeight={140}
              />
              {/*
                PRD 7.2: "a soft floor of 600 characters shown as polish, never
                an error". So: a count, in the quiet ink, that stops being
                shown once it is past. Nothing blocks on it and nothing turns
                red.
              */}
              {paragraph.trim().length < FULL_FLOOR ? (
                <Label testID="stone-paragraph-polish" style={{ color: day.ink3 }}>
                  {paragraph.trim().length} of {FULL_FLOOR} · the studied dose is about a paragraph
                </Label>
              ) : (
                <Label testID="stone-paragraph-polish" style={{ color: accent.success }}>
                  The studied dose
                </Label>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingTop: 10, paddingBottom: 18, gap: 4 }}>
          <InkButton
            testID="stone-seat"
            label={ready ? (!returnTo && stepIndex + 1 < plan.length ? 'Keep this line · next' : 'Keep this line') : kind === 'obstacles' ? 'Write both lines' : 'Write your line'}
            disabled={!ready}
            onPress={() => {
              // The follow-up is already on the screen when it is due; the
              // button keeps the line as it stands, with the when and where
              // if they wrote one. It used to close the box and stop there,
              // so the first press of "Keep this line" kept nothing.
              if (needsFollowUp) setFollowUpAsked(true);
              // The follow-up's words join the line: "… — Tuesdays at 7, in the kitchen".
              if (whenWhere.trim()) {
                const joined = `${line.trim()} — ${whenWhere.trim()}`;
                setLine(joined);
                setWhenWhere('');
                goNextWith(joined);
                return;
              }
              goNext();
            }}
          />
        </View>
      </SafeAreaView>
    </Studio>
  );
}
