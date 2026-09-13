# Accessibility and first-run audit — 2026-09-13

Four research passes (WCAG 2.2 + WCAG2Mobile + Apple HIG + Material + the European Accessibility Act; onboarding and retention practice; React Native implementation; cognitive accessibility and plain language), each audited against the app by a separate reader, then merged and de-duplicated. 73 findings before the merge, 36 after. What was done about each is in PROGRESS.md ("The research, and what it changed"); this file is the list as it was handed over, kept so the reasoning and the sources are not lost.

---

# Morrow — merged first-run & accessibility work list

Scope: one engineer, one sitting, in this order. Line numbers are the audits' and were spot-checked against the tree on 2026-09-13 (`Redirect`, `usePreventRemove`, `KeyboardAvoidingView`, `announceForAccessibility`, `maxFontSizeMultiplier`, `role="timer"` all confirmed absent outside Toast/SafetyGate/StorageWarning; `orientation: "portrait"`, checkbox role on every Interview option, `selected` on the delete-confirm Chip, `3400` toast, `requestPermissionsAsync` inside `notify.ts:74` and `dictation.ts:108` all confirmed present).

Severity here: **P0** = a new person loses work or is hit with an ask they did not expect on the first run (the "delete it" moments); **P1** = they cannot understand what is being asked, or an assistive-tech / large-type user is blocked; **P2** = polish and gates.

---

## P0

### 1. Every cold launch opens on Welcome page 3, not Today
- **Where:** `apps/mobile/app/index.tsx:50` (`useState(book || begun ? PAGES - 1 : 0)`), `:113-164` (name field, persona chips, 'Back to today'); `_layout.tsx` has no `Redirect`; `scripts/e2e.mjs` asserts the current behaviour.
- **Raised by:** onboarding (OFR-22).
- **Research:** Apple HIG Onboarding — never re-show the intro on later launches.
- **Fix:** at the top of `index.tsx`, if `book` (or `step.step !== 'interview'`) and no `intro=1` param, `return <Redirect href={book ? '/today' : step.route} />`. Add a TextButton 'See the introduction again' → `router.push('/?intro=1')` under 'About the coach' in `settings.tsx`. Update the e2e assertion that currently pins the old behaviour.

### 2. The Interview and the read-back lose everything on OS back or a kill
- **Where:** `interview.tsx:48-66` (`useState<InterviewState>`, `history` local; `stepBack` only wired to the TopBar button), `heard.tsx:27-29` (`rows` local); `store.ts` has no interview/read-back draft; `firstrun.ts:42` routes to `/consent` when no goals.
- **Raised by:** wcag-mobile (WM-07), onboarding (OFR-07, OFR-08).
- **Research:** GOV.UK / Baymard — platform back must do what on-page Back does; NN/g Wizards — save state so the process can be resumed; WCAG 3.3.7 spirit.
- **Fix:** (a) `usePreventRemove(history.length > 0, () => stepBack())` in `interview.tsx` (from `@react-navigation/native`, re-exported by expo-router) so hardware/edge back = the same one-step undo; (b) persist `interviewDraft: InterviewState + history` and `readBackDraft: Row[]` in the store next to `drafts` (write on every `advance`/`setRows`, clear in `finish()`/`done()`), init `useState(() => store.interviewDraft ?? initialInterview())`; (c) in `firstrun.ts` return `/interview` when consent is already recorded.

### 3. '← Back' on a stone silently discards the line being typed
- **Where:** `stone.tsx:70-84` (`goBack` → `router.replace` without `write()`); `write()` is only called in `goNext` (`:87`); also the OS back from a stone lands on Rank, not the previous stone (stones are pushed with `replace`).
- **Raised by:** cognitive (CPL-11), onboarding (OFR-07).
- **Research:** NN/g — routine actions must be undoable / not lose input; WCAG 3.3.7.
- **Fix:** in `goBack` (and an AppState 'background' listener) call `write(goalId, kind, { framingId, line, ...(kind==='obstacles'?{line2}:{}), ...(paragraph.trim()?{paragraph}:{}) })` when `line.trim()` is non-empty; add `usePreventRemove(stepIndex > 0 || !!prevGoal, goBack)`.

### 4. iOS keyboard covers the field being typed in and the button that submits it
- **Where:** every writing screen is `SafeAreaView > ScrollView > … > footer` with no avoidance: `interview.tsx:159-261` ('Something else…' `autoFocus` field is the last item), `stone.tsx:163-278` ('then I' field, 'Seat the stone'), `heard.tsx:105-191`, `write.tsx:446-547` (caret goes under the keyboard once text grows), `seal-day.tsx:65-140`, `account.tsx:156-248`, `portrait.tsx:129-145`. Android is fine (default resize).
- **Raised by:** wcag-mobile (WM-05).
- **Research:** Expo keyboard-handling guide; WCAG 2.4.11 Focus Not Obscured.
- **Fix:** add `automaticallyAdjustKeyboardInsets` to those ScrollViews; wrap the SafeAreaView children of Interview, Stone, Account, Seal-day in `<KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1}}>`; in the Interview move 'Use this' under the custom field instead of beside it.

### 5. Three unasked-for asks land on the first value moment
- **Where:** mic + speech OS dialogs fire only after 'Begin · 15 minutes' has started the clock (`write.tsx:53` defaults `mode='say'` off web, `:289-296` sets phase before `dictation.start` → `dictation.ts:108 requestPermissionsAsync`); the OS notification dialog fires on the next launch/foreground with no primer or 'Not now' (`notify.ts:74` inside `allowed()`, called from `syncNotifications` in `_layout.tsx:47-57`; `wakeTime`/`eveningTime` exist but no screen edits them); the paywall is pushed over the very first paint of Today (`today.tsx:106-115`, `entitlement.ts:184-189 paywallMoment` true at `blueprintsBuilt >= 1`).
- **Raised by:** onboarding (OFR-23, OFR-18, OFR-20).
- **Research:** Apple HIG Onboarding / privacy — ask for permission in context, once, with a reason; Growth.Design (Headspace) stacked-requests case; NN/g — value before asks.
- **Fix:** (a) doorway: on selecting 'Say it'/'Walk and say it' (or Begin while `mode!=='type'`) call `dictation().permission()` first, only then `startWriting`; Label under the chips: 'Saying it uses the microphone and your phone's own recogniser; nothing is recorded.'; refused → fall to 'Type it' before the ring starts. (b) `notify.ts allowed()` uses only `getPermissionsAsync`; add a one-time Today card (gated `book && !profile.notificationsAsked`) '7:00 — your first move · 21:30 — seal the day' with time chips, 'Yes, at those times' → new `requestNotificationPermission()`, 'Not now' → `notificationsOff:true`; bind `wakeTime`/`eveningTime` fields in Settings' 'When Morrow speaks'. (c) `EntitlementContext.firstDaySealed`; `paywallMoment` returns null until it is true; Today supplies it from `Object.values(state.days).some(d=>d.sealedAt)`.

### 6. The path's primary buttons and tabs are undefined coined nouns; the same things have different names
- **Where:** `interview.tsx:381` 'Begin the Fifteen' (first gloss is on `authoring.tsx`, the next screen); `consent.tsx:14,18` uses 'the Fifteen' twice unexplained; `rank.tsx:43` 'Sitting 2', `:135` 'On to the stones'; `stone.tsx:143,268` 'stone 1 of 5' / 'Seat the stone'; `portrait.tsx:206` 'Make this my Blueprint'; `seal-book.tsx:178` 'Hold to seal' (nothing says what sealing does); `today.tsx:675` tab 'You' vs 'Settings' in `consent.tsx:26`, `account.tsx:162,170`, `book.tsx:91`, `safety.ts:138` SUPPORT_LINE; 'stone' = goal / analysis line / move (`today.tsx:275,437`, `stone.tsx`, Interview tray); 'Keep it' = save practice / file capture / mark letter read / cancel deletion; `interview.tsx:137` 'N% clarity'; `write.tsx:376` 'Write the other road first'; `index.tsx:29` 'one stone a day; seal the day'.
- **Raised by:** cognitive (CPL-05, CPL-06 ×2, CPL-04), onboarding (OFR-12).
- **Research:** NN/g — define the full phrase before the shorthand; GOV.UK content design — one name per thing, plain verbs on buttons.
- **Fix (copy only, no data change):** buttons lead with the verb, brand noun stays in TopBar `where`: 'Write for 15 minutes' / 'Write five lines per goal' / 'Save this line · next' / 'Keep this plan' / 'Hold to finish your Book' + Body 'Holding finishes your Book. Tomorrow the app opens on Today with your first move.' Consent row 1: 'the Interview (a few taps), the Fifteen (fifteen minutes of writing)'. Rename the tab and Settings Label to 'Settings' so `SUPPORT_LINE` is literal (or change the four 'Settings' strings to 'You' — pick one). Reserve 'stone' for the drawing: 'line 1 of 5', 'Every move is done. Tap ✓ below to close the day.' Relabel 'Keep it' → 'Save this practice' / 'Save it' / 'Mark as read' / 'Cancel'. Drop '% clarity' (see P2 #26). `write.tsx:376` → 'Write the opposite first · 8 minutes on how it goes if your habits win'. Show `stone-intro` on the first stone of every goal (drop the `findIndex(...) === 0` condition at `stone.tsx:164`).

### 7. 'Tonight about twenty-five minutes' leads straight into a 60–90-minute chain
- **Where:** `authoring.tsx:35`, `index.tsx:20-24` (the promise); `heard.tsx:82` (`router.replace('/rank')`), `rank.tsx:43`, `stone.tsx goNext` chains up to 15 stones → Portrait → account → seal with no marked stop.
- **Raised by:** onboarding (OFR-09).
- **Research:** GOV.UK / NHS — an estimate that is not kept makes slower users feel pressured; NN/g Wizards — mark stopping points.
- **Fix:** `heard.tsx done()` → `/today`; the Bookless Today already shows `firstRunCaption` + 'Put the goals in order' — add one Label 'That was tonight. This one is fifteen minutes — tomorrow morning, or now.' Same after the last stone if the clock is past `profile.eveningTime`. `rank.tsx:43` 'Sitting 2' → `where="The order"`.

### 8. The seal lands on Sunday-reading verdicts, and the first Today shows ~13 controls
- **Where:** `seal-book.tsx:57` → `/book`; `book.tsx:302-313` chips 'Read it' / 'Still true' / 'Something moved', `:99` '← Today' small top-left; `today.tsx` on day one: 5 tabs + '+' FAB (no visible label) + ✓ + goal row + Now stone + Book quote + Consistency (score 0) + Practices ('Add one') + 'Got it' (`:180-281, 370-431, 565-678`); intro card `:272-279` bundles two gestures, a three-part ritual and the nav in one paragraph.
- **Raised by:** onboarding (OFR-14, OFR-13), cognitive (CPL-19, CPL-04).
- **Research:** Material Onboarding — land where the person can act on what they just set up; NN/g progressive disclosure; first working screen ≤5 targets.
- **Fix:** seal-book navigates with `?from=seal`; in `book.tsx` when `from==='seal'` (or no day sealed yet) replace the three chips with one InkButton 'On to Today — your first move' (`router.dismissTo('/today')`) + Label 'Read it, then start. Sunday brings the reading.' In `today.tsx` render Practices and the '+' FAB only after a sealed day (or a done move), Consistency only after a sealed day (until then one Body 'Seal the day tonight and the ledger starts.'). Rewrite `today-intro` as three labelled lines: 'Tap the stone when the move is done' / 'Tap “Not today” to set it aside' (see #13) / 'Evening: tap ✓ to close the day', plus one line naming the tabs ('Book — your writing. Envision — pictures from it. Coach — a question a day. Settings.').

---

## P1

### 9. Screen and in-screen step changes are silent to VoiceOver/TalkBack; routes have no titles
- **Where:** `interview.tsx:115-131` (advance/stepBack re-keys the option list under the cursor), `index.tsx:53` (`next` keeps focus on itself), `stone.tsx:96,114` (stone→stone `router.replace`, `headerShown:false`, no `title`), `write.tsx:118-120` (phase → 'closed'); `_layout.tsx:161-167` no per-screen `title`; Statement/Question have `accessibilityRole="header"` but no ref/`accessible`/`tabIndex`.
- **Raised by:** wcag-mobile (WM-13), rn-implementation (RN-13, RN-06). PRD §7.1 itself requires 'VoiceOver announces each question'.
- **Research:** WCAG 4.1.3 / 3.2.2; RN docs `AccessibilityInfo.sendAccessibilityEvent` + `setAccessibilityFocus`.
- **Fix:** add `useScreenHeading()` to `@morrow/ui`: Statement/Question accept a ref (`accessible`, `tabIndex={-1}` on web); the hook runs in `useFocusEffect` with ~400 ms delay (after the Stack fade) and calls `sendAccessibilityEvent(node,'focus')` native / `node.focus()` web (RNW's `setAccessibilityFocus` is a no-op). Re-run on `page` (index), `s.answered`/`s.stage` (interview), `kind` (stone), `phase` (write). Set `Stack.Screen options={{ title }}` per route using the same strings as TopBar `where`. Give the coach a Statement and the room a quiet Question so the focus target exists (RN-14).

### 10. Wrong stateful roles: Interview options say 'checkbox, unchecked' then advance; the delete confirm is a 'checked radio'
- **Where:** `interview.tsx:169-170` (`accessibilityRole="checkbox" aria-checked={isSelected(label)}` unconditional; `isSelected` is false outside 'areas' and `choose()` calls `advance` immediately); 'Something else…' (`:218-233`) has no `aria-expanded`; `settings.tsx:326` `<Chip label="Close the account" selected …>` → radio, checked; `MoveStone.tsx:107-116` bakes 'Done.'/'Set aside for today.' into the name.
- **Raised by:** wcag-mobile (WM-10), rn-implementation (RN-04).
- **Research:** WCAG 4.1.2 Name, Role, Value; RN accessibility roles.
- **Fix:** `accessibilityRole={q.stage==='areas'?'checkbox':'button'}`, `aria-checked` only in 'areas', `accessibilityHint="Answers and moves to the next question"` on branch options, `aria-expanded={customOpen}` on the custom toggle. Settings: `<InkButton compact label="Close the account">` (no `selected`). MoveStone: title as the label, the three-state phrase in `accessibilityValue={{ text }}`.

### 11. Inline errors, seals and status changes are never announced
- **Where:** `seal-book.tsx:94` `seal-error` (bar drains, red text, nothing spoken), `account.tsx:183/196/237` `account-problem`, `heard.tsx:106,174`, `write.tsx:531-546` mic note / nudge / 'Close it here' appearing, `seal-day.tsx:97-138` (haptic + 900 ms navigate — nothing on web/Low Power Mode), `rank.tsx:20-30 move()`. Only Toast, SafetyGate and StorageWarning announce.
- **Raised by:** wcag-mobile (WM-15), rn-implementation (RN-20).
- **Research:** WCAG 4.1.3 Status Messages, 3.3.1 Error Identification.
- **Fix:** add a `Notice` primitive next to Toast: Text with `accessibilityLiveRegion="polite"` + `role="status"` (`role="alert"` for errors) mounted empty on screen open, plus `announceForAccessibility` on text change for iOS. Route the six strings above through it; HoldBar announces `doneLabel` when it completes and the refusal text when `settle()` returns false; delay the post-seal `replace`/`dismissTo` to ≥1.5 s (or the iOS `announcementFinished` event); `rank.tsx move()` announces `${title} is now ${j+1} of ${n}`; announce once when `ready` flips true in the room.

### 12. The Fifteen: no timer semantics, hard close at 15:00, Close hidden for 10 min, prompt vanishes
- **Where:** `write.tsx:418-441` (remaining-time Label is plain text, Ring valueText only on focus), `writing.ts:183-196` (`closed` at `targetSeconds` → `write.tsx:120 setPhase('closed')` unmounts the editor mid-sentence), `writing.ts:14` `STARTER_MIN_SECONDS=600` → `write.tsx:541-545` ('N min before this counts' instead of the button), `:283` one resume only; the 26-word, five-part prompt (`writing.ts:39-41`) is only on the doorway — the room shows 'Start anywhere.' and unrelated nudges.
- **Raised by:** rn-implementation (RN-07, RN-08), cognitive (CPL-10, CPL-20), onboarding (OFR-21). PRD requires 'ring progress announced each minute'.
- **Research:** WCAG 2.2.1 Timing Adjustable (turn off / adjust / extend with ≥20 s warning); Understanding 2.2.1.
- **Fix:** `write-remaining` gets `role="timer"`, `accessible`, `accessibilityValue={{text:`${m} minutes left`}}`; editor `accessibilityHint="A fifteen-minute clock is running; you will be told at five minutes and one minute"`; a polite live Text set at 10/5/1 min, 30 s, 0 (+ `announceForAccessibilityWithOptions(msg,{queue:true})`); `accessible={true}` on Ring/Path when labelled. At 15:00 do not `setPhase('closed')` — keep the input live, Label 'Fifteen minutes are up. Keep going, or close it here.' (let `closed` only satisfy `canClose`); when ≤60 s remain show 'Two more minutes' (repeatable). Doorway Chip 'Hide the clock' (keep Ring valueText). First ideal sitting on Starter: `minSecondsToCount` 5 min or `wordCount>=150`, label worded as an offer. Pin a two-line Label of the prompt above the TextInput ('A Tuesday: where you wake · what you do · who is there · what you made · what is no longer a problem.'); render the doorway prompt as a heading + five one-line rows.

### 13. 'Not today' is drag-or-long-press only, and its Undo dies in 3.4 s
- **Where:** `MoveStone.tsx:54-68` (pan), `:134-138` (long press 420 ms, invisible), `today.tsx:275,415` (intro/caption teach only the drag), `:137-141` (`setTimeout(…,3400)`), `:471` (row `onSeat` toggles skip→done, so the toast is the only way back to 'todo'), `:488` 'not today' is a static Label; no keyboard park path on web (RNW fires only `onPress` from Enter/Space).
- **Raised by:** wcag-mobile (WM-04, WM-23), rn-implementation (RN-19, RN-08), cognitive (CPL-10). WM-04's P2 is promoted: the timer dependence and the gesture-only path are the same defect.
- **Research:** WCAG 2.5.1 Pointer Gestures, 2.5.7 Dragging, 2.2.1; Apple HIG — 'also make a button available'.
- **Fix:** TextButton 'Not today' under the Now card caption and in each Later row's trailing slot → `onPark` (+`feelPark`); on a row whose status is 'skip', replace the Label with `TextButton label="Put it back"` → `setStatus(id,'todo')` so undo never expires; MoveStone adds HoldBar's DOM keydown pattern on web (Delete → park); toast delay via `AccessibilityInfo.getRecommendedTimeoutMillis(3400)` on Android and no auto-dismiss when `isScreenReaderEnabled()` (add a Dismiss action); intro copy names the button (see #8).

### 14. Fields are placeholder-only; no input purpose; the six-digit code has no autofill
- **Where:** `primitives.tsx:660-736` (UserField never renders `label`; `accessibilityLabel={label ?? placeholder}`; no `autoComplete`/`textContentType`/`inputMode`/`maxLength`/`error` props); `index.tsx:119-126` (visible text is only 'Your first name'), `heard.tsx:145-150` (no `label`, same placeholder ×N), `portrait.tsx:129-134`, `account.tsx:207-231` ('you@somewhere', '000000'; error rendered under the button), `letters.tsx:132-138`.
- **Raised by:** wcag-mobile (WM-16, WM-08), cognitive (CPL-07), rn-implementation (RN-23).
- **Research:** WCAG 3.3.2 Labels, 1.3.5 Identify Input Purpose, 3.3.8 Accessible Authentication; Apple/Android one-time-code autofill.
- **Fix:** UserField renders `label` as a `<Label style={{marginBottom:4}}>` above the input (add `labelHidden` for stone/seal-day which already draw one), and passes through `autoComplete`, `textContentType`, `inputMode`, `returnKeyType`, `maxLength`, plus `error?: string` (Body under the line, `aria-invalid`, appended to `accessibilityHint`). Labels: 'Your first name (optional)', `Name for “${row.span.text.slice(0,40)}”`, 'Who you are becoming', 'Your letter to your future self', 'Email' (`autoComplete="email" textContentType="emailAddress" inputMode="email"`), 'The six-digit code' (`textContentType="oneTimeCode" autoComplete="one-time-code" inputMode="numeric" maxLength={6}`); move `account-problem` into the field's `error`.

### 15. At 130–200% text, chip rows overflow, four screens cannot scroll, the tab bar truncates
- **Where:** chip rows without `flexWrap`: `index.tsx:129` (persona), `write.tsx:255` (mode, centred), `seal-day.tsx:73` (mood — default 'Steady' is last and leaves the screen), `heard.tsx:132`, `settings.tsx:149,165,181,197,324,364`; non-scrolling centred Views: `authoring.tsx:32`, `today.tsx:160-172` (Bookless), `write.tsx:243,312`; `index.tsx:92,102` fixed `width:66/118` columns; `today.tsx:662,782,792` tab bar `height:58/46`, 13 px `numberOfLines={1}` ('Envi…'); `run.tsx:139-156` 44 px readout inside a 190 pt ring. Nothing caps or disables scaling (good), so layouts must reflow.
- **Raised by:** wcag-mobile (WM-18), rn-implementation (RN-16, RN-15). PRD promises 'Dynamic Type to 200% with reflow'.
- **Research:** WCAG 1.4.4 Resize Text, 1.4.10 Reflow; Apple HIG Typography (Dynamic Type).
- **Fix:** `flexWrap:'wrap'` on every chip row (copy `rank.tsx:98`); wrap the four centred screens in `ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'center'}}` (footer outside); `minWidth` instead of the two fixed widths and stack the row when `useWindowDimensions().fontScale > 1.3`; tab bar `minHeight` + `maxFontSizeMultiplier={1.4}` on the five nav labels only; `run.tsx` readout `maxFontSizeMultiplier={1.5}`. Add `useFontScale()` to `@morrow/ui` for the practice ±/× row.

### 16. Repeated controls share one name; the Book line is roleless; Back is 'leftwards arrow Back'; page dots are unreachable
- **Where:** `heard.tsx:135-150` ('Keep' / 'Not a goal' / name field ×N), `interview.tsx:358` ('Drop' ×N); `today.tsx:214` `today-book-line` Pressable with no role/label; `primitives.tsx:24` TopBar label `← ${back.label ?? 'Back'}` feeds the accessible name; `index.tsx:148-158` three dot Pressables inside an `accessible` View (one node, children unreachable; 22 pt targets; no `aria-selected`).
- **Raised by:** wcag-mobile (WM-09, WM-02), rn-implementation (RN-02, RN-09).
- **Research:** WCAG 2.4.6 / 4.1.2; RN docs — no nested touchables inside an `accessible` group.
- **Fix:** optional `accessibilityLabel` on Chip/TextButton that must start with the visible text (keeps 2.5.3): `Keep, “${text}”`, `Not a goal, “${text}”`, `Drop ${d.title}`; TopBar passes `back.label ?? 'Back'` as the accessible name (arrow stays visible). `today-book-line`: `accessibilityRole="button" accessibilityLabel={`Open your Book: “${book.firstSentence}”`}`. Dots: drop `accessible` from the row; row `role="tablist"`, each dot `role="tab" aria-selected={i===page} hitSlop={19}`, or mark dots `aria-hidden` and put 'Page n of 3' in a visible polite Label.

### 17. Consent carries a 56-word sentence before the first tap; Welcome page 2 repeats the authoring screen
- **Where:** `consent.tsx:18` (56 words, four ideas), `:20` (29); ~170 words on the screen; `index.tsx:92-118` (SITTINGS/OUT lists, ~85 words, five new nouns) duplicates `authoring.tsx:33-37`; `safety.ts:138` SUPPORT_LINE 31 words, condition-first; `settings.tsx` 'About the coach' 35 words.
- **Raised by:** cognitive (CPL-01, CPL-19), onboarding (OFR-03).
- **Research:** GOV.UK content design — ≤25 words, one idea per sentence, rule before condition; NN/g mobile tutorials — front-loaded instruction pages do not help.
- **Fix:** consent row 2 → Label 'Sent to an AI service only when:' + four one-line Body rows ('You ask for your phrases to be read back.' / 'Your plan is built from your lines.' / 'A safety check reads a sitting.' / 'You ask for a scene.'); dictation on its own row; lead with a one-sentence Statement so the button is reachable without reading all four. Welcome → two pages (page 0 + name/persona), rely on `authoring.tsx` for the sittings. SUPPORT_LINE → 'Talking to someone is a reasonable thing to do. A doctor, a therapist, or one of the helplines under Settings. They are there whenever you want them.' Consent cannot move (App Store 5.1.2(i)).

### 18. Helplines are three taps and a scroll from every first-run screen
- **Where:** `settings.tsx:264-275` is the only voluntary route; Interview, Fifteen, stones, Portrait, seal have TopBar Back only; from the room it costs 'Leave for now' (the single resume).
- **Raised by:** cognitive (CPL-18).
- **Research:** Parrish et al. 2021 (crisis resources buried in mental-health apps); Apple HIG — help in context.
- **Fix:** optional `help` prop on TopBar rendering a right-slot TextButton 'Need someone?' → store action `showResources()` that opens the existing SafetyGate card without a pause (skip the SETTLE latch and the 'not about me' button when opened voluntarily). Pass it on write, interview, stone, seal-book, seal-day, coach; same button under Consistency on Today.

### 19. The shadow doorway asks for self-blame that the safety layer then flags; the ideal doorway stacks four prohibitions
- **Where:** `writing.ts:47` ('…unkind to the version of you that let it happen'), `:41` ('Don't fix spelling. Don't go back.'), `write.tsx:298` ('No editing. No going back.'), `:213-219` (Full track sends ideal → shadow with no skip); `safety.ts` CONCERN patterns include 'hate myself'.
- **Raised by:** cognitive (CPL-17).
- **Research:** GOV.UK — positive phrasing; negatives are misread.
- **Fix:** shadow note 'Be specific. Say what it cost and who paid. You will not have to read this often.'; ideal note 'Write or talk. Spelling can wait. Keep moving forward. If you run out, say the next true thing.'; button caption 'Forward only — the room closes when you stop.'; TextButton 'Skip the other road' on the shadow doorway → `/heard`.

### 20. On web the safety card hides the screen but leaves it focused and tabbable; the card never takes focus
- **Where:** `_layout.tsx:155-166` (`aria-hidden` wrapper — RNW does not remove hidden nodes from tab order), `SafetyGate.tsx:84-131` (no focus move, no `onAccessibilityEscape`, no restore). Native is correct (`accessibilityViewIsModal` + `no-hide-descendants`) — WM-14 pass stands for native only.
- **Raised by:** rn-implementation (RN-12).
- **Research:** WAI-ARIA dialog pattern (focus in, trap, restore, Escape).
- **Fix:** ref the title (`accessible`, `tabIndex={-1}`), focus it ~300 ms after mount; set `inert` on the Stack wrapper's DOM node while paused; `onAccessibilityEscape={armed?clear:undefined}`; store `document.activeElement` on open and restore on clear.

### 21. The app is locked to portrait
- **Where:** `apps/mobile/app.json:6` `"orientation": "portrait"`. Layouts already use `useWindowDimensions()` and cap at 640.
- **Raised by:** wcag-mobile (WM-19). Kept P1 (a clear 1.3.4 AA miss) but last: one line, low impact on the owner's new-user concern, and needs a device check.
- **Research:** WCAG 1.3.4 Orientation.
- **Fix:** `"orientation": "default"`; check Today's absolute tab bar/FABs (`today.tsx:629-677`) and the safety card's `maxHeight: height - 210` at 375 pt height; if the room genuinely wants portrait, lock only it with `expo-screen-orientation` and say why.

---

## P2

22. **Touch targets under 44/48 pt** — Chip `minHeight:40` (`primitives.tsx:471`), TextButton no horizontal padding ('Skip' ≈30 pt), Rank ↑/↓ `padding:10` adjacent with no gap (`rank.tsx:79,88`), Later-row stones ≈39 pt (`today.tsx:464-476`), practice steppers 40×36, Toast Undo ≈30 pt. *(WM-02, RN-25; WCAG 2.5.8 / Apple 44 / Material 48.)* Fix: Chip `minHeight: Platform.select({android:48,default:44})`, TextButton `paddingHorizontal:12,minWidth:44`, arrows `minWidth/minHeight:48, gap:8`, row stone `hitSlop={4}`, Undo `minHeight:44`.
23. **'Not a goal' and 'Drop' remove a line with no undo** — `heard.tsx:61-62,109` (dropped rows vanish), `interview.tsx:358` (`dropDraft` bypasses `advance`, so Back cannot restore; re-adding via 'Add another goal' is the only path — OFR-16's 'recoverable' and CPL-12's 'no undo' are both true). *(OFR-16, CPL-12; NN/g — undo, not confirm.)* Fix: keep dropped rows at reduced opacity, struck through, with TextButton 'Put it back'.
24. **Progress counts are not a map of the run** — 'question N' with no total (`interview.tsx:128`; `totalQuestions(s)` exists unused), 'N% clarity' (`:137`), 'stone 1 of 5' ×3 with 15 ahead (`stone.tsx:143`), 'On to the stones' with no count. *(OFR-06, CPL-09.)* Fix: `where` 'The Interview · 3 of 8', Ring `accessibilityLabel="Interview progress"` + `valueText`, eyebrow 'Goal 1 of 3 · line 1 of 5', button 'On to the stones · 15 short lines'.
25. **The order screen stacks three tasks and hides what the top three means** — `rank.tsx:40-120` (rank + framing chips + Book title), `:61-68` coral ring with no label or copy, heading is the rule not the task. *(OFR-05, WM-21, CPL-03; GOV.UK one question per page; WCAG 1.4.1.)* Fix: heading 'Put your goals in order. The top one matters most.'; Label 'The top three get all five stones.'; Ring `accessibilityLabel="Full plan"`; move the title to `seal-book.tsx` under 'Last thing' (store actions already exist).
26. **Headings that state a mood; a question with no answer control** — `heard.tsx:96` ('Two of them might be one' implies a Merge that does not exist), `:157` 'What did you leave out on purpose?' as plain Body, `seal-day.tsx:68` ('ledger'). *(CPL-03, CPL-04.)* Fix: 'Keep the lines that are goals, then name each one.'; 'Add one I left out' TextButton revealing a UserField; 'Close the day: a word, one line of proof, a hold.'
27. **Non-text contrast and focus appearance** — rest underline `coralSoftLine` 1.75:1 (`tokens.ts:112`, `primitives.tsx:727-728`), active tab pill 1.17:1 (`today.tsx:787`); no `focused` branch in any Pressable style (Android keyboard/switch users get no ring); UserField `outlineStyle:'none'` on web with only +1 px underline. *(WM-20, WM-24, RN-22; WCAG 1.4.11, 2.4.7, 2.4.11.)* Fix: `coralSoftLine` → `rgba(234,75,46,0.9)`; tab pill `borderColor: p.line` + ink dot; read `focused` in Chip/InkButton/TextButton/TabButton/FloatingButton and draw `borderWidth:2, borderColor: accent.coral`; UserField spreads `focusRing` on web when focused.
28. **Stone follow-up duplicates the field; live caption on every kind; seal error away from its field** — `stone.tsx:186-193` and `:218-221` both bound to `line`; `:206-210` caption fires from the first keystroke on Why/Who stones; `seal-book.tsx:191` 'required' rendered under the stones row. *(CPL-20, CPL-14.)* Fix: follow-up gets its own `whenWhere` state appended on seat (or hide the main field); caption only for `strategies`/`monitoring` and on blur; error 'Finish the “I will…” line to seal. Three words is enough.' via UserField `error`.
29. **'Who do you admire' cannot be skipped; the doorway never says where the writing goes** — `interview.ts` admire stage has no skip; `write.tsx:255-305`. *(CPL-16.)* Fix: 'Skip this one' option → summary with `admire:null`; Label under Begin: 'Stays on this phone. Read back to you afterwards by the AI, in your own words only.'
30. **Paywall omits renewal and where to cancel** — `paywall.tsx:176-181`. *(OFR-19; App Review 3.1.2.)* Fix: '7 days free, then $49.99 a year, renewing until you cancel in your phone's Subscriptions settings.' computed from `cents` via a `trialThen` field on `PricePlan`.
31. **StorageWarning toggle's name is unrelated to its visible text** — `StorageWarning.tsx:42`. *(WM-17; WCAG 2.5.3.)* Fix: visible sentence first, then 'Show/Hide the details'.
32. **Almanac exposes 365 separate accessible stones** — `progress.tsx:246-311`. *(RN-09.)* Fix: one accessible row per month with a computed label; today's stone stays its own element.
33. **Heading levels: every Statement/Question is an h1; coach and room have none** — `primitives.tsx:242-271`; `a11y.mjs:76` disables `page-has-heading-one`. *(RN-14.)* Fix: `level` prop (aria-level; screen title 1, sections 2); re-enable the axe rule.
34. **No first-run analytics** — `analytics.ts:36-46` has no per-step or first-value event. *(OFR-25.)* Fix: add `first_run_step {step,index,total}` and `first_value {kind}` to the union (no free text), `track` on mount of each path screen.
35. **Gates: no a11y lint, no native semantic tests, no device pass, no stated target** — `eslint.config.js` (expo only), `packages/ui/test` (contrast/fit/quoted only), PROGRESS.md ground rules. *(WM-01, RN-24, WM-25.)* Fix: `eslint-plugin-react-native-a11y` with `plugin:react-native-a11y/all`; RNTL tests for Chip (`getByRole('radio',{checked:true})`), InkButton (`toBeDisabled`/`toBeBusy`), HoldBar (press seals with no pressIn), UserField (`getByLabelText`); write 'WCAG 2.2 AA, per screen, both platforms' into the ground rules; short Accessibility paragraph in Settings; the device walk in the Verification section below becomes part of the first native build's checklist.
36. **Two accessibility vocabularies (legacy `accessibility*` next to `aria-*`)** — `primitives.tsx:462-468, 521-528, 946-953, 1036-1039` and ~130 sites. *(RN-01.)* Downgraded to "later": the audit itself confirms no element sets both forms and nothing conflicts today; a 130-site migration is out of scope for one sitting and the a11y lint plugin in #35 only understands the legacy spellings. Decide the direction after #35 lands; do not migrate now.

Dropped / merged for skepticism: WM-06 ('no help mechanism, N/A') and CPL-18 do not contradict — 3.2.6 is satisfied vacuously, the product gap is #18. WM-04's pointer-cancellation pass and WM-04's finding are different halves of the same rule; the finding is folded into #13. RN-06's "nothing to mis-time" pass is only true because #9 has not been done — its 400 ms post-transition delay is in #9's fix. WM-14's modal pass is native-only; the web half is #20.

---

## Already right (all four audits agree — do not redo)

- No drag-only interactions: ranking uses ↑/↓ buttons; MoveStone's pan has a long-press and an accessibility action (WM-03).
- Every Pressable commits on release; HoldBar's `onPressIn` only starts the fill and drains on early release; single-tap/Enter/double-tap paths exist for the seal (WM-04, RN-18).
- States are exposed through props, not visuals: Chip `aria-checked`, InkButton `aria-disabled`+`aria-busy`, HoldBar disabled when done, TabButton `aria-selected` in a tablist, StorageWarning `aria-expanded` (WM-11, RN-03).
- Titles are `accessibilityRole="header"`; Path is a labelled image; Ring is a labelled progressbar where it carries meaning; reading order follows visual order (WM-12).
- SafetyGate on native: `alertdialog`, `aria-modal`, `accessibilityViewIsModal`, `no-hide-descendants` behind it, visible Close outside the scroll view (WM-14). Its copy is plain, lists region-labelled numbers, offers a way on and a reversal (CPL-18 pass).
- Accessible names equal visible text on Chip, InkButton, TextButton, HoldBar, TabButton (WM-17).
- Text contrast is measured in `packages/ui/test/contrast.test.ts` (every pair ≥4.5:1; seal error 7.7:1) (WM-20).
- Colour is never the only cue for selection, reached path nodes, consistency delta, parked stones, step dots (WM-21).
- Reduced motion is read live and honoured in every animation; the navigator uses `fade`; no Lottie/autoplay (WM-22, RN-17).
- Toast announces on all three platforms (iOS `announceForAccessibility`, Android live region, web `role="alert"`) (RN-05).
- No `importantForAccessibility="no"` on content, no icon fonts; every glyph-only control has a label (RN-10).
- Value before any ask; account deferred to after the Portrait with 'Not now'; no survey/tracking before the first goal (OFR-01, OFR-02).
- Welcome has Skip top-right; page dots carry 'Page n of 3' text (OFR-04).
- Sensible defaults (persona gentle, track starter, name optional) (OFR-10); personalisation pays off (seeds, own sentences read back, Now card) (OFR-11).
- Day-one empty states each say what/why/where the first item comes from (OFR-15); first completion moments are distinct (OFR-17); steps carry their own explanation inline (OFR-24).
- The Fifteen autosaves every 4 s and on background; drafts are offered back; a crisis pause says nothing was sent (CPL-11 pass).
- Way back on every non-root screen (`test:back`); destructive actions need a second tap after a sentence saying what is lost (CPL-12 pass).
- Error strings are plain, non-blaming and keep the input; tone has no streaks, caps or exclamation marks (CPL-14, CPL-15, CPL-17 passes).
- Resume-where-you-left-off via `firstRunStep` + `firstRunCaption` (CPL-19); back-references show the person's own text (CPL-20 pass).

---

## Verification

| # | How to prove it |
|---|---|
| 1 | e2e: seed a Book, load `/`, expect `today-now` (or `today-path`) visible and no `welcome-skip`/persona chips; `/?intro=1` shows page 0. Replace the e2e assertion at `scripts/e2e.mjs:203-208`. |
| 2 | e2e: answer 3 questions, `history.back()` → `interview-question` shows question 3 again, store has `interviewDraft`; reload mid-Interview → same question. Device: Android hardware back on question 4 → question 3. |
| 3 | e2e: type on stone 2, tap `top-back`, tap forward → `stone-line` value restored. |
| 4 | Device (iOS only): iPhone SE, Interview 'Something else…', Stone 'then I', Account code — field and its button visible above the keyboard. Cannot be automated on web. |
| 5 | e2e: doorway with mode 'say' — `write-remaining` does not exist until a `dictation.permission()` stub resolves; fresh Book on Today → no `/paywall` push until a day is sealed; `notify.allowed()` never calls `requestPermissionsAsync` (unit test with a mock). Device: fresh install, count OS dialogs before the first seal (target: 1, consent excluded). |
| 6 | e2e: assert button text on `interview-finish`, `rank-continue`, `stone-seat`, `portrait-keep`, `seal-hold`; grep the app for `'Settings'`/`'You'` returns one name; snapshot the strings. |
| 7 | e2e: `heard-done` lands on `/today` with `today-path` and the 'That was tonight' Label. |
| 8 | e2e: after `seal-hold`, `/book` shows `book-to-today` and not `book-still-true`; fresh Today counts ≤5 `role=button` elements outside the tablist; `today-add-first-practice` absent until a sealed day. |
| 9 | axe: `page-has-heading-one` re-enabled passes on 26 routes. Device: VoiceOver on Interview — after each answer the new prompt is spoken; TalkBack on stone→stone announces the title. |
| 10 | RNTL: `getByRole('button', {name: /option/})` on a branch question; `queryByRole('checkbox')` only in 'areas'; axe `aria-allowed-attr` clean. Device: VoiceOver reads 'button' on question 2. |
| 11 | e2e: `seal-error` element has `role=alert`; `account-problem` has `aria-live`. Device: refused seal is spoken; sealing says 'Sealed' before the Book appears. |
| 12 | e2e: `write-remaining` has `role=timer`; at fake-clock 15:00 the TextInput still exists and `write-close` is visible; `write-prompt` Label present in the room. Device: VoiceOver hears the 5-min and 1-min milestones. |
| 13 | e2e: `today-park-now` button exists; after park, `today-putback-<id>` restores 'todo' with no toast; keyboard Delete on a focused MoveStone parks on web. Device: TalkBack with the toast open — toast stays until Dismiss. |
| 14 | axe `label` rule (already on) plus e2e: each of the four fields has a visible `<Label>` and `getByLabelText`; email/code inputs carry `autocomplete="email"` / `"one-time-code"` and `inputmode`. Device: iOS Mail code autofills. |
| 15 | Shots at `fontScale: 2` (PROGRESS item 1): authoring/doorway/closed/Bookless Today scroll to the footer; all four mood chips visible; tab labels not ellipsised. Device: iOS AX5 on write, today, seal-day. |
| 16 | axe `nested-interactive` + `duplicate-id`; e2e: `getAllByRole('button',{name:/^Keep/})` names are unique; `top-back` accessible name is 'Back'; `today-book-line` has `role=button`. |
| 17 | Unit: no consent/safety string >25 words (a `packages/core` test over the copy tables). |
| 18 | e2e: `top-help` exists on write/interview/stone/seal-book/seal-day/coach and opens `safety-title` without setting `paused`. |
| 19 | Unit: DOORWAY notes contain no "don't"/"no "/"unkind"; e2e: Full-track shadow doorway shows `write-skip-shadow`. |
| 20 | Web: raise the card with the editor focused → `document.activeElement` is the title; Tab never reaches a control behind it; Escape clears when armed. |
| 21 | Device: rotate on Today and the safety card at 375 pt height; nothing clipped. |

Device walk (once, on the first native build, VoiceOver curtain on, then TalkBack): Welcome ×3 → Consent → Interview incl. 'Something else…' → Authoring → doorway → the Fifteen by dictation → Heard (keep, drop, name) → Rank → five stones → Portrait → Account (email + code) → Seal → Today (seat, park, put back) → Seal the day. Log every element not reachable, not activatable, or changed without an announcement; attach Accessibility Inspector and Accessibility Scanner reports per screen.

---

## Sources

- W3C, WCAG 2.2 — https://www.w3.org/TR/WCAG22/ and Understanding docs — https://www.w3.org/WAI/WCAG22/Understanding/
- W3C, ARIA Authoring Practices (dialog pattern) — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Apple, Human Interface Guidelines: Accessibility — https://developer.apple.com/design/human-interface-guidelines/accessibility ; Onboarding — https://developer.apple.com/design/human-interface-guidelines/onboarding ; Typography (Dynamic Type) — https://developer.apple.com/design/human-interface-guidelines/typography
- Apple, App Store Review Guidelines §3.1.2, §5.1.2 — https://developer.apple.com/app-store/review/guidelines/
- Google, Material Design: Onboarding — https://m2.material.io/design/communication/onboarding.html ; Accessibility basics (48 dp targets) — https://m3.material.io/foundations/accessible-design/accessibility-basics ; Accessibility Scanner — https://support.google.com/accessibility/android/answer/7101858
- Nielsen Norman Group: Mobile-App Onboarding tutorials — https://www.nngroup.com/articles/mobile-tutorials/ ; Wizards — https://www.nngroup.com/articles/wizards/ ; Confirmation dialogs vs undo — https://www.nngroup.com/articles/confirmation-dialog/ ; Progressive disclosure — https://www.nngroup.com/articles/progressive-disclosure/
- GOV.UK Design System: Question pages — https://design-system.service.gov.uk/patterns/question-pages/ ; Writing for GOV.UK (sentence length, plain words) — https://www.gov.uk/guidance/content-design/writing-for-gov-uk
- Growth.Design case studies (Headspace stacked requests) — https://growth.design/case-studies
- React Native, Accessibility — https://reactnative.dev/docs/accessibility ; AccessibilityInfo — https://reactnative.dev/docs/accessibilityinfo
- react-native-web, Accessibility — https://necolas.github.io/react-native-web/docs/accessibility/
- React Navigation, `usePreventRemove` — https://reactnavigation.org/docs/use-prevent-remove/
- Expo, Keyboard handling — https://docs.expo.dev/guides/keyboard-handling/ ; expo-router — https://docs.expo.dev/router/introduction/
- eslint-plugin-react-native-a11y — https://github.com/FormidableLabs/eslint-plugin-react-native-a11y
- Parrish, E. M. et al., "Are mental health apps adequately equipped to handle users in crisis?", Crisis (2021) — depth of crisis resources in consumer apps.