# Morrow build — PROGRESS

Read this first on resume. Source of truth for scope: `PRD.md` v4.1 (§7 features, §10 stack, §11 AI, §14 plan).
Companions: The Authoring Script (every prompt), the Flow Atlas (every flow), the Studio canvas (design).

## Ground rules for the build
- The user writes every goal, plan line and Book sentence. AI only asks, quotes (verified substrings), sorts, typesets.
- Choices first, writing last. Honest time. Starter/Full depth tracks.
- Studio design system: stones, sockets, rings, hold-to-seal, Outfit + Newsreader.
- Local-first; the app must work fully offline for the Interview, the Fifteen, the stones, the Book and Today.
- No account/keys exist in this environment: Supabase, Anthropic, fal, RevenueCat are behind adapters with deterministic local fallbacks. Real providers are wired but untested until keys are supplied (see "Blocked on the user").

## Status
- [x] 0. Toolchain check, monorepo scaffold (pnpm workspaces, apps/mobile Expo, packages/core, packages/ui, supabase/)
- [x] 1. packages/core: domain model, stores (zustand + persist), engines
- [x] 2. packages/ui: Studio tokens, Stone/Socket/Ring, HoldBar, Chip, Field, Sheet, text primitives
- [x] 3. apps/mobile screens (all 16 routes)
- [x] 4. Tests: 352 core + 43 ui + 8 storage unit tests, 37 real-Postgres checks, 144 Playwright e2e checks, all green
- [x] 5. supabase/: migrations with RLS and three structural authorship guards, edge functions
- [x] 6. Hardening: the eight-lens audit's findings, worst first (see below) — 95 of 95
- [x] 7. Research pass: libraries/versions; the migration against a real Postgres; prebuild
- [x] 8. Second audit, six lenses over the repairs — 37 of 37
- [x] 9. Walking the built app in a browser, at three widths (see below)
- [x] 10. PRD §7 read against the app: notifications, the paywall, the tablet layout,
      Sunday reading, the Goal Path, letters, the Portrait reveal, Replan, the PDF
      and the other road — all ten were unbuilt, all ten are built
- [x] 11. Third audit, ten lenses over the whole tree — 47 of 47 (see below)
- [x] 12. The account (§7.12): email code and Sign in with Apple behind a seam,
      push/pull sync of the whole store, the delete-account function, the
      migration brought level with the app — everything but the key
- [x] 13. Fourth audit, five lenses over the day's new code — 43 of 43 (see below)
- [x] 14. The five stones renamed in Morrow's own words; the Full-track prompts
      rewritten; no "Self Authoring" anywhere a person or a store could see it
- [x] 15. Saying the Fifteen (§7.2): dictation through expo-speech-recognition,
      on-device where the phone can, with a typed room as the fallback
- [x] 17. The Horizon Review (§7.9): on the last page of the Sunday reading —
      the consistency trend as a number, the next milestone per goal with its
      distance, one sentence they wrote this week quoted, and what a replan
      would change, with the door to it
- [x] 18. The plus (§7.6): the New move sheet — which goal, what (cut from their
      own line, or their words), how long — and quick capture into the ledger
      with undo
- [x] 19. Dark mode (§7.14): the night studio as the whole app when the system
      is dark or the person pins it; System / Day / Night in Settings
- [x] 20. Voice into the coach (§7.9): the same recogniser as the room, into the
      field where it can be read before it is sent
- [x] 21. The lock screen (§7.8): the I will line typeset on the night ground at
      lock-screen pixels — to Photos on a phone, a PNG download on the web —
      from the Book and from Envision
- [x] 25. The product looked at in five more stores (`scripts/fixtures/`:
      empty, many-goals, long-lines, long-game, full-track; `SEED=` on the
      screenshots and the axe pass) and at three phone sizes, reduce motion
      on, both studios — what that caught is under "The studio, lit"; a night
      splash; predictive back on Android
- [x] 24. The React Compiler on (`experiments.reactCompiler`), after the ref and
      effect patterns it objects to were rewritten; 151 e2e and axe green on the
      compiled bundle
- [x] 23. An accessibility pass with axe-core over every screen, both studios
      (`pnpm test:a11y`, in `verify`; four more states inside e2e): 11 serious findings fixed, 0 left
- [x] 22. The studio, lit (§8): the ground's light, one elevated card a screen,
      a physical ink edge, chips on hairlines, stones that cast a shadow and
      sweep, entry sequences, the tab bar with all five tabs, the Almanac as a
      year of shelves, documents on hairlines instead of stacks of cards
- [x] 16. The feel of the controls (§8): haptics on seat, park and seal, with the
      off switch in Settings; analytics as a seam with a fixed vocabulary and no
      free text (PostHog HTTP, nothing without a key); the Google sign-in half
      that needs no client id

## In flight

Nothing is half-done. Four audits are closed — 95, 37, 47, then 43 — and the
app has been walked end to end in a browser on the built bundle rather than
only tested. What is left needs a machine or a key this one does not have;
see "Next steps".

- The tree is green and committed: `pnpm verify` runs the toolchain guard,
  typecheck, lint, 353 core tests, 47 ui tests (contrast, the quoted-span
  split, the type that fits a long line), 8 storage tests, the edge-function
  guards, the SQL structural guards, 37 checks against a real Postgres, the
  serif authorship guard, the web build, 151 end-to-end checks and the axe
  pass over 26 screens.
- **The account's spend limit is the month's, not the run's.** The fourth
  audit was ten agents and 1.59M tokens and tripped the monthly limit with
  two verifiers still running; their lenses' findings were verified by hand.
  No more fan-outs this month — the remaining loop is solo.
- The account is wired end to end but has never talked to a real Supabase:
  `hasSupabase` is false in every build so far, so the account screen, the
  Settings row and the launch-time push are all present and all dormant. The
  moment `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist
  they come on, and the edge functions are called through the same host with
  the session's token.
- Three findings were **withdrawn, not fixed**: buildPlan does not construct
  plans its own validator rejects (verified across 560 combinations of strategy
  line, weekday and target date), and splitFirstMoves no longer eats the first
  letter of a sentence. Those lenses lost their verifiers to the spend limit, so
  nothing had refuted them; they were checked by hand instead.
- **Twelve product files were edited by the audit's own subagents**, which had
  been told not to modify anything. The edits were good and are reviewed, tested
  and committed, but the lesson stands: after a fan-out, check `git status` and
  file mtimes before staging, and review what changed.

## How to run it
```
pnpm install
pnpm verify        # everything below, in order, as one command
```

`verify` is: typecheck, unit tests (core + the contrast measurements), the edge
function guards, the SQL structural guards, the serif authorship guard, the web
build, then the end-to-end suite. Nothing ships without it passing.

```
pnpm test:deps                  # one toolchain; the RN side left to Expo
pnpm test:dates                 # no local date turned into a UTC day
pnpm test:copy                  # no full stop on top of theirs, no raw day in prose
pnpm lint                       # eslint; rules-of-hooks is an error
pnpm test                       # 299 core + 33 contrast + 6 storage unit tests
pnpm test:sql                   # RLS on every table, the three authorship guards
pnpm test:migration             # 30 checks against a real Postgres, via PGlite
pnpm test:authorship            # nothing but the user's words in the serif
pnpm build:web && pnpm test:e2e # 128 end-to-end checks, serves dist itself
node scripts/serve.mjs          # the built app on :8790, to walk it by hand
cd apps/mobile && npx expo start
```

## Done in detail
- **Workspace**: pnpm 11 workspaces, TS 5.9 strict (`noUncheckedIndexedAccess`), vitest. `pnpm-workspace.yaml` carries `onlyBuiltDependencies` (pnpm 11 moved settings out of package.json).
- **packages/core** (`@morrow/core`), 65 tests green:
  - `types.ts` domain + zod, `ids.ts` (sortable offline ids, `dayOf` honours the 3am day boundary)
  - `engines/interview.ts` tap-only state machine, 6 areas x 4 branches + custom areas, clarity, seeds
  - `engines/specificity.ts` deterministic time/place/number/cadence check earning ONE follow-up
  - `engines/framings.ts` the framing bank (5 kinds, per-domain questions, full-track prompts)
  - `engines/readback.ts` local span extractor + `verifySpans` (the substring gate)
  - `engines/portrait.ts`, `engines/blueprint.ts` (`validatePlan` requires `sourceLineId` on every move)
  - `engines/book.ts` (`authorshipRatio`, `SealRefused`, diff, text export)
  - `engines/consistency.ts` (EWMA 28d, returns, almanac), `engines/writing.ts` (the Fifteen), `engines/coach.ts`, `engines/safety.ts`
  - `ai/provider.ts`: `LocalProvider`, `AnthropicProvider`, and `guarded()` which enforces the rules on ANY provider
- **packages/ui** (`@morrow/ui`): Studio tokens (day + night studio), `Stone` and `Socket` (SVG so they render on every target incl. the web build the e2e drives), `Ring` (single or segmented), `HoldBar` (the 1.6s hold, drains on early release, and an accessibility tap for people who cannot hold), `UserText` (the ONLY serif in the product — if a screen wants to render app prose as the user's words, it cannot), Chip/InkButton/UserField/Toast/EmptyState.
- **apps/mobile**: Expo SDK 57 + Router, 16 routes: Welcome, Consent, Interview, Authoring opening (depth question), the Fifteen (ring, seeds, idle nudges, voice/type modes), What I heard, Rank + title, the analysis stone (used 12×), Seal the Book, the Book (paper page), Today (stones, drag-to-park, Now card, consistency), Seal the day, Coach, Goal, Settings (export + delete). Store is zustand + AsyncStorage; `guarded(LocalProvider)` means the whole flow works offline.
- **Bugs found by tests and fixed**: (1) the first move was the first one *named* rather than the *soonest*, so a "Tuesday, Thursday, Saturday" line put the first move 6 days out and failed the 48h rule; moves are now date-sorted. (2) `authorshipRatio` counted fixed framing labels as rival authorship and refused legitimate short Books; it now measures user prose vs a `generated` slot. (3) the safety category regex missed inflected forms ("bingeing").
- **Bugs found by the end-to-end run and fixed**: (4) zustand v5 compares selector results by reference, so `activeGoals` building a fresh array each call crashed the app with React error #185 (infinite render) the moment a second screen used it — all derived selectors now go through `useShallow`. (5) `todaysMoves` only showed moves dated today or earlier, so Today was empty on the evening you seal the Book (the first move is dated tomorrow); it now brings the next upcoming move forward. (6) `splitFirstMoves` left the other weekday names in every title ("Thursday: Thursday, Saturday at 6:40…"); the day names now become the schedule and leave the body. (7) the Interview and What I heard both created goals, so naming a span the same thing produced duplicates; `addGoals` now merges by name. (8) the safety card used an RN Modal that painted above its own dismiss button on web, and a `flex:1` container that collapsed the card so the button fell outside it — the last control a person in trouble touches was the most fragile one. Rewritten as a plain overlay that sizes to its content, with the button outside the scroll view.

- **supabase/**: `migrations/0001_init.sql`, 45 statements, parsed and verified with pglast. Row level security on every table, and three guards that make the authorship rule structural rather than conventional: `moves.source_line_id` is `NOT NULL` with a trigger checking the line belongs to the same person and the same goal; `book_versions.authorship_ratio` carries a `>= 0.95` check constraint; `authoring_texts` cannot be rewritten once the 24-hour draft lock passes, only added to. Three Deno edge functions (`readback`, `safety`, `scene`), each `verify_jwt = true`, each returning a `degraded` response rather than an error when `ANTHROPIC_API_KEY` is absent, so the device falls back to its local engines. `scripts/check-functions.mjs` parses the functions and asserts those guards are still present.
- **Error boundary**: `apps/mobile/src/components/ErrorBoundary.tsx` wraps the router. It leads with "This screen broke, not your writing", says plainly that everything is still on the device and nothing was sent, shows the message in a scroll box, and offers one way out. A crash must never read as lost work.
- **Space**: `design/` went from 24.9 MB to 7.4 MB. Removed `design/preview/` (staging copies, hash-identical to their sources), `design/canvas/` and `design/poster/` (identical to the archived copies), the two duplicated top-level HTML bundles, and the two seeded bundles inside `design/archive/` — each archive README now carries a note saying the seeded canvas was byte-identical to its published artifact and how to rebuild it. Also removed 21 orphaned packages from the pnpm virtual store (~120 MB): two dead `react-native@0.87.1` trees with their `hermes-compiler`, `debugger-frontend`, `react-native-svg@15.15.5` and `virtualized-lists` dependants, and a duplicate `vite`/`vitest` variant. Reachability was walked from the workspace roots first; nothing in `apps/` or `packages/` reached any of them. `pnpm install` restores them if ever needed.

## Audit findings (2026-09-10)

An eight-lens adversarial audit (authorship, state, engine edges, safety, flow, accessibility, error handling, tests) produced 95 unique defects after three-way verification. Grouped below in the order they are being fixed. Tick as they land.

Note on how it was run: the fan-out was too wide (294 agents) and hit the account spend limit, which killed the verifiers for five of the eight lenses. Their findings are still listed and are being verified by hand as each is fixed. Do not re-run an audit at that width.

### A. Authorship leaks — the product's central promise

- [x] **critical** `apps/mobile/app/write.tsx:190` — Tapping a "Seed" in the Fifteen pastes app-written text into the user's own writing, and it becomes Chapter One of the Book
- [x] **critical** `packages/core/src/engines/book.ts:96` — authorshipRatio can never fall below the floor: nothing ever fills `generated`, and app-authored titles are counted as the user's prose
- [x] **critical** `packages/core/test/authorship.test.ts:278` — The authorship test poisons a field no product code ever writes, so it cannot catch model prose entering the Book
- [x] **high** `apps/mobile/app/rank.tsx:105` — The rank screen writes the Book's spine title from a framing chip, so a tap becomes the title
- [x] **high** `apps/mobile/app/coach.tsx:45` — The coach's "I'm stuck" action files an app-written move under the wrong goal and re-sources it from an unrelated user line
- [x] **high** `apps/mobile/app/goal.tsx:118` — A milestone with no Monitoring line prints the app's sentence under the label "Proof, in your words"
- [x] **high** `packages/core/src/engines/portrait.ts:45` — proposeIdentityLine emits ungrammatical text for any "I <verb>" opening and truncates the clause at a colon, and the result is shown to the user in the serif reserved for their own words
- [x] **high** `scripts/e2e.mjs:238` — Nothing anywhere asserts that the user's own sentences reach the Book or the plan verbatim
- [x] **medium** `apps/mobile/app/coach.tsx:45` — Coach discards reply.action.sourceLineId and files the move under goals[0], attributing it to the wrong user line
- [x] **medium** `packages/core/src/ai/provider.ts:210` — guarded() accepts a one-character sourcedDetail and never checks that the narrative contains it
- [x] **medium** `packages/core/src/engines/portrait.ts:49` — proposeIdentityLine emits ungrammatical app prose about the user, rendered in the serif with no way to edit it
- [x] **medium** `apps/mobile/app/interview.tsx:111` — The Interview renders app prose in UserText, the typeface reserved for the user's own words
- [x] **medium** `apps/mobile/app/coach.tsx:45` — Coach chip actions add the move to the wrong goal and attach the wrong source line
- [x] **medium** `apps/mobile/app/coach.tsx:45` — The Coach reports 'Added · <move>' after addMove has refused to create it
- [x] **medium** `packages/core/src/ai/provider.ts:212` — guarded() returns its fallback's scene unverified, and the test's final assertion passes on an empty sourcedDetail

### B. Data loss and state — the user's writing must survive

- [x] **critical** `apps/mobile/app/write.tsx:71` — The Fifteen is never persisted until the user taps "Read it back to me" — a background kill loses all fifteen minutes
- [x] **critical** `apps/mobile/src/store.ts:221` — saveText silently destroys the previous text of the same kind — re-entering the Fifteen overwrites the original ideal
- [x] **high** `apps/mobile/src/store.ts:298` — makePortraitAndPlan replaces the plan wholesale, so re-sealing the Book resets every completed move to todo
- [x] **high** `apps/mobile/src/store.ts:460` — recomputeDay counts every move ever completed or skipped into today's planned/done, inflating consistency toward 100
- [x] **high** `apps/mobile/src/store.ts:531` — todaysMoves returns every non-todo move ever, so Today's "Later today" list grows without bound
- [x] **high** `apps/mobile/src/store.ts:460` — Every move ever completed is counted into today's planned/done, so the Consistency Score drifts to 100 and never falls
- [x] **high** `apps/mobile/src/store.ts:460` — recomputeDay counts every move ever completed into today's planned/done, so a day with no activity can score 100%
- [x] **high** `apps/mobile/app/write.tsx:42` — The Fifteen has no persistence and no resume; leaving the room destroys the whole draft
- [x] **high** `apps/mobile/app/stone.tsx:67` — Filling one missing stone from the Goal screen restarts the whole chain and re-seals the Book, resetting every completed move
- [x] **high** `apps/mobile/src/store.ts:444` — onRehydrateStorage ignores the error argument, so an AsyncStorage read failure boots the app as a new user and the next write erases the stored Book
- [x] **medium** `apps/mobile/app/_layout.tsx:33` — The 4-second boot escape hatch renders the app before rehydration, and the landing rehydrate then discards anything written in that window
- [x] **medium** `apps/mobile/src/store.ts:335` — setMoveStatus removes evidence by title and day rather than by move id, deleting another move's ledger row
- [x] **medium** `apps/mobile/src/store.ts:357` — addMove dates moves with UTC todayISO() while Today filters with local dayOf(), so an evening-added move never appears
- [x] **medium** `apps/mobile/src/store.ts:193` — dropGoal orphans the goal's plan, portrait, evidence and briefs, leaving its moves on Today forever
- [x] **medium** `apps/mobile/src/store.ts:531` — Today lists moves completed on previous days forever
- [x] **medium** `apps/mobile/src/store.ts:357` — todayISO() is UTC while dayOf() is local, so a move added in the evening west of UTC is scheduled for tomorrow and vanishes from Today
- [x] **medium** `apps/mobile/src/store.ts:532` — Today never reads as finished — tomorrow's move jumps into the Now card the moment today's last move is closed
- [x] **medium** `apps/mobile/src/store.ts:357` — addMove stamps scheduledFor in UTC while Today filters by local day, so an added move can be invisible
- [x] **medium** `packages/core/src/ids.ts:28` — todayISO() returns the UTC date while every other "today" in the app is dayOf() local time, so plans and added moves are dated a day late for users west of UTC
- [x] **medium** `apps/mobile/app/write.tsx:42` — The Fifteen is held only in component state, so backgrounding or a crash loses the whole sitting

### C. Safety — a person in crisis must always reach help

- [x] **critical** `apps/mobile/src/store.ts:220` — Crisis writing is persisted to disk and later sealed into the Book and quoted back in the dawn brief, while the card promises it was not
- [x] **critical** `apps/mobile/src/store.ts:207` — The Haiku second-opinion safety screen is never called from the app: ten regexes are the entire crisis detector
- [x] **high** `packages/core/src/engines/safety.ts:13` — CRISIS regexes miss the gerund, contracted and past-tense forms of phrasings they already intend to catch
- [x] **high** `apps/mobile/src/components/SafetyGate.tsx:114` — The resources card's dismiss button lands on top of the Send button that raised it, so a repeat tap closes the card
- [x] **high** `apps/mobile/src/store.ts:220` — The crisis card promises nothing was remembered, but the text is already persisted and later becomes the Book's first sentence
- [x] **high** `apps/mobile/src/components/SafetyGate.tsx:256` — SafetyGate relies on accessibilityViewIsModal, which is iOS-only — the crisis pause does not trap focus on Android or web
- [x] **high** `apps/mobile/src/components/SafetyGate.tsx:72` — The crisis helpline rows swallow Linking.openURL failure, so tapping the number in the safety card can do nothing at all
- [x] **medium** `apps/mobile/src/components/SafetyGate.tsx:27` — The gate is only modal on iOS: on Android and web the screen behind the scrim stays in the accessibility tree and tab order, and nothing announces the card
- [x] **medium** `packages/core/src/engines/safety.ts:86` — contentGuard is dead code: the calorie, medication and financial-advice redirects in PRD §11.6 never run
- [x] **medium** `apps/mobile/src/store.ts:217` — The 'concern' verdict is computed and then discarded everywhere; safetyRisk is written but never read
- [x] **medium** `apps/mobile/app/write.tsx:73` — A crisis flag during the Fifteen ends the sitting permanently — /heard and /rank become unreachable

### D. Accessibility and the hold — every control reachable by every user

- [x] **critical** `packages/ui/src/primitives.tsx:363` — A rejected seal permanently disables the HoldBar, stranding the user on Seal the Book with no back control
- [x] **critical** `packages/ui/src/primitives.tsx:397` — HoldBar has no onPress, so TalkBack, keyboard and switch users can never seal a day or a Book
- [x] **critical** `packages/ui/src/primitives.tsx:380` — HoldBar latches itself permanently when onComplete declines, killing the only control that can seal the Book
- [x] **high** `packages/ui/src/tokens.ts:17` — day.ink3 is 2.14:1 on the day ground — every Label, TextButton, placeholder and completed row fails AA
- [x] **high** `apps/mobile/app/goal.tsx:50` — Domain accent colors are used as 12px Label text — amber measures 1.97:1 on the day ground
- [x] **high** `apps/mobile/src/components/MoveStone.tsx:96` — MoveStone announces 'parked' identically to 'not done' — checked is a boolean that ignores the skip state
- [x] **high** `packages/ui/src/primitives.tsx:413` — HoldBar's fixed height 60 with overflow:'hidden' clips its own label at large type
- [x] **medium** `packages/ui/src/Ring.tsx:40` — Ring never exposes its progress to assistive tech, and the Fifteen's countdown is not a live region
- [x] **medium** `packages/ui/src/primitives.tsx:475` — Toast's only announcement mechanism is accessibilityLiveRegion, which iOS ignores — Undo is unreachable on VoiceOver
- [x] **medium** `packages/ui/src/primitives.tsx:373` — HoldBar's reducedMotion branch is dead code — both arms build the identical animation
- [x] **medium** `apps/mobile/app/interview.tsx:142` — Interview option rows have a fixed height of 54, so answers cannot reflow at 200% Dynamic Type
- [x] **medium** `apps/mobile/app/write.tsx:190` — The Fifteen's seed quotes are actionable Pressables with no accessibilityRole, so they announce as static text
- [x] **medium** `apps/mobile/src/components/MoveStone.tsx:117` — MoveStone's hidden 'Not today' hint stays in the accessibility tree at opacity 0
- [x] **medium** `apps/mobile/src/components/MoveStone.tsx:109` — MoveStone gives a routine's step progress no accessibilityValue — the segmented ring is the only signal
- [x] **medium** `apps/mobile/app/authoring.tsx:46` — Depth track uses accessibilityRole="radio" with accessibilityState.selected instead of checked
- [x] **medium** `apps/mobile/app/coach.tsx:215` — Fixed-width Label columns cannot reflow, cutting the dawn brief's row labels at large type

### E. Engine edges — wrong output for real input

- [x] **critical** `packages/core/src/engines/blueprint.ts:138` — buildPlan throws BlueprintInvalid whenever the soonest weekday named in the Strategies line is more than 2 days out, and the caller discards the error, so the goal silently gets no Portrait and no Blueprint
- [x] **high** `packages/core/src/engines/blueprint.ts:138` — buildPlan schedules the first move on a weekday its own validator then rejects
- [x] **high** `packages/core/src/engines/portrait.ts:104` — splitFirstMoves strips leading 'a', 'n' and 'd' letters off the user's own words because [\s,;:.and] is a character class, not an alternation
- [x] **high** `packages/core/src/engines/blueprint.ts:143` — buildPlan constructs plans that its own validatePlan rejects whenever a named weekday is more than 48 hours out
- [x] **medium** `packages/core/src/engines/specificity.ts:22` — The PLACE regex matches any preposition followed by a word, so hasPlace is true for lines with no place and the single specificity follow-up is never asked
- [x] **medium** `packages/core/src/engines/specificity.ts:13` — The CLOCK regex matches a decimal number, so a distance or weight registers as a clock time
- [x] **medium** `packages/core/src/engines/interview.ts:455` — beginBranches hard-resets cursor to 0, so the Interview's "Add another" re-asks every already-shaped area and appends duplicate drafts
- [x] **medium** `apps/mobile/app/coach.tsx:37` — The Coach reports the sealed-day count as the number of Returns, so the two numbers in the celebrate reply are always identical
- [x] **medium** `packages/core/src/engines/blueprint.ts:326` — applyReplan bypasses validatePlan and can store a plan the gate would reject; both replan functions are untested
- [x] **low** `packages/core/src/engines/portrait.ts:33` — firstSentence cuts at 180 characters mid-word when the opening sentence is long, and returns the entire entry when it is short
- [x] **low** `packages/core/src/engines/consistency.ts:115` — consistencyCaption says "Nothing logged yet" for a day the user logged and sealed but completed nothing on
- [x] **low** `packages/core/src/engines/writing.ts:158` — draftLockUntil adds 24 to the local hour field, so the 24-hour draft lock is 23 or 25 real hours across a DST transition

### F. Error handling — failures that vanish

- [x] **critical** `apps/mobile/app/seal-book.tsx:34` — Seal the Book discards every plan-build failure, shipping a Book with no Portrait and no Blueprint
- [x] **high** `apps/mobile/app/seal-book.tsx:34` — seal-book discards every makePortraitAndPlan failure, so a Book can seal with no plan and no message
- [x] **high** `apps/mobile/app/seal-book.tsx:34` — seal-book discards makePortraitAndPlan's failure, so a rejected Blueprint seals the Book and silently empties Today
- [x] **medium** `apps/mobile/app/settings.tsx:36` — 'Export everything' fails silently: an empty catch swallows the Share rejection and the button does nothing
- [x] **medium** `apps/mobile/app/book.tsx:35` — Book export writes its failure message to a Toast surface that only the Today screen renders
- [x] **low** `apps/mobile/app/book.tsx:43` — router.replace('/today') from pushed screens grows the stack by one duplicate Today per visit
- [x] **low** `apps/mobile/app/goal.tsx:18` — /goal with an unknown id silently renders a different goal instead of the empty state written for it

### G. Tests and infrastructure — tests that would pass if the behaviour broke

- [x] **high** `packages/core/test/authorship.test.ts:239` — validatePlan's first-move rules are exercised by no test, and the fixture date hides a live BlueprintInvalid
- [x] **high** `scripts/e2e.mjs:108` — The e2e never pins the clock, so the suite's result depends on the weekday it is run
- [x] **high** `packages/core/test/engines.test.ts:323` — contentGuard is unit-tested but has no call site — the coach does not actually refuse calorie, dosing or financial advice
- [x] **high** `apps/mobile/app/coach.tsx:62` — The coach screen inlines its own reply and never calls replyToText, so the Returns branch is dead and untested
- [x] **high** `scripts/check-functions.mjs:26` — check-functions.mjs greps the edge functions for substrings instead of running them, and no npm script runs it
- [x] **medium** `scripts/e2e.mjs:227` — The e2e's first-sentence check passes when the element renders nothing
- [x] **medium** `packages/core/test/engines.test.ts:201` — The ten-minute Starter floor has no test; the test named for it asserts fifteen minutes
- [x] **medium** `apps/mobile/src/store.ts:163` — The duplicate-goal merge fixed in a previous pass has no regression test in either suite
- [x] **low** `scripts/e2e.mjs:245` — Two e2e checks assert the weakest possible predicate for the behaviour they name

### H. Backend — the structural guards

- [x] **medium** `supabase/migrations/0001_init.sql:125` — The SQL authorship floor validates a number the client chose; nothing on the server can see the Book's contents
- [x] **medium** `supabase/migrations/0001_init.sql:297` — The sealed-writing trigger is inverted: the body is rewritable exactly during the 24-hour draft lock and frozen only after it expires
## Research pass (2026-09-10)

`npx expo-doctor` from `apps/mobile` is the check that found all of this, and it
is worth running before any native build. It reported 4 of 18 checks failing on
a tree whose web build and 40 end-to-end checks were green, because none of what
it found shows up until you build natively.

- **Every Expo package was pinned to the pre-SDK-57 numbering.** `expo-constants`
  at `~18.0.9` where SDK 57 wants `~57.0.17`, and the same for `expo-font`,
  `expo-haptics`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`. That
  put two major versions of each in the tree at once. `npx expo install --fix`
  aligned them, which also moved react-native 0.82.0 to 0.86.3, react 19.1.0 to
  19.2.3 and TypeScript to what the SDK expects.
- **Two physical copies of react-native and react-native-svg. Resolved, and now
  confirmed at the native link stage.** `packages/ui` dev-pinned react, react-native and react-native-svg at
  versions the app had moved past, so the tree held two different majors. That
  part is fixed: the pins are gone, they are peer dependencies, and the
  workspace root carries one copy for typechecking. What is left is subtler.
  pnpm gives every workspace package its own peer resolution, so `apps/mobile`
  and `packages/ui` still link to two store entries of the *same* version under
  different peer hashes. Three things were tried and none of them collapsed the
  two: moving `nodeLinker: hoisted` into `pnpm-workspace.yaml` (it was sitting
  in `.npmrc`, which pnpm 11 does not read), dropping the dev pins, and removing
  the peer declarations entirely.

  `config.resolver.extraNodeModules` in `metro.config.js` pins react, react-dom,
  react-native and react-native-svg to the app's copy, so an import from inside
  `@morrow/ui` cannot reach the second instance. That covers the JS bundle.

  The native half is now answered too, without needing an Android SDK.
  `npx expo prebuild --platform android` generates the native project and runs
  autolinking, which is the step that would actually produce a duplicate native
  module. Expo autolinking resolves 45 modules with zero duplicates, and
  community autolinking resolves 9 native modules with **none** resolving to
  more than one copy — `react-native-svg` picks the app's. The `expo-doctor`
  warning describes the on-disk layout and does not translate into a duplicate
  at link time. It is still worth watching on the first real build.
- **`app.json` carried two keys SDK 57 rejects**, `newArchEnabled` and
  `android.edgeToEdgeEnabled`. Both are the default now and the flags are gone.
- **`metro.config.js` replaced `watchFolders` instead of appending to it**, so
  every folder Expo watches by default was dropped.
- **`allowBuilds` was left on a pnpm-generated placeholder** ("set this to true
  or false"), so `pnpm install` exited non-zero, which failed every command that
  runs a dependency check first, `expo export` included.

Still not done here, and it needs a machine that can do it:

- The app has only ever been built for web. No iOS or Android build has been
  run, so none of the native module work above is confirmed beyond what
  expo-doctor reports. This is the single biggest untested area in the project:
  every screen, gesture and font has only ever run through react-native-web.
- The whole stack moved in this pass — react-native 0.82.0 to 0.86.3, react
  19.1.0 to 19.2.3, TypeScript to what SDK 57 pins — and the evidence that it
  still works is the suite: typecheck clean, 112 core tests, 30 contrast tests,
  40 end-to-end checks. That is real evidence for the JS, and no evidence at all
  for the native side.
- ~~The Supabase migration has never been executed.~~ **Done.** PGlite is
  Postgres 18 compiled to WebAssembly, so `pnpm test:migration` runs the whole
  migration and exercises every guard with no Docker and no installed server.
  21 checks. Running it found three things no amount of reading would have: the
  `pgcrypto` extension line (only `gen_random_uuid()` was ever used, and that has
  been core Postgres since 13), that `moves` had no `plan_id` at all, and that a
  harness connecting as the table owner silently tests no row level security at
  all, because Postgres exempts owners from it.


### Running the migration found what reading it could not (2026-09-10)

- **`moves` had no `plan_id`.** A move reached its plan only through
  `milestone_id`, which is nullable, so a move without a milestone had no path
  back to its plan — and the client model is `Plan.moves`. A sync layer built on
  that schema would have silently dropped those moves. The column is now NOT
  NULL, indexed, and the source-guard trigger checks the plan belongs to the
  same person and the same goal, exactly as it already checked the line.
- **The row level security tests were testing nothing.** Postgres exempts a
  table's owner from RLS and PGlite connects as a superuser who owns everything.
  The first version of the harness reported every policy working; it was reading
  its own rows as the owner. It now creates the `authenticated` role, grants it
  what Supabase grants, and runs every statement as that role.
- **`create extension pgcrypto` is unnecessary.** The only thing it was there
  for is `gen_random_uuid()`, which has been core Postgres since 13. Left in
  place because Supabase has it and removing it buys nothing, but it is not a
  dependency.


### What prebuild found, without an Android SDK (2026-09-10)

`npx expo prebuild --platform android --no-install --clean` generates the native
project and runs autolinking. It compiles nothing, so it needs no SDK, and it
exercises the config plugins and the module resolution that a real build would.

- **The app asked for three permissions it does not need**: `SYSTEM_ALERT_WINDOW`
  (draw over other apps), `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`.
  They arrive through default Expo modules rather than anything the product
  does. For an app whose whole promise is that a person's writing stays on their
  device, asking to draw over other apps and write external storage undermines
  the pitch before anyone opens it, and it is the kind of thing a store reviewer
  asks about. `android.blockedPermissions` in `app.json` strips all three at
  manifest merge; the shipped app asks only for Internet and Vibrate.
- **`userInterfaceStyle: light` was declared but not enforced.** It needs
  `expo-system-ui`, which was not installed, so Android would have applied the
  system theme to native surfaces regardless of what the config said. The
  product has a deliberate day studio and night studio; the system does not get
  to choose between them. Installed.
- **The native folders are output, not source.** They are generated on demand
  and now gitignored, so `app.json` stays the one place native configuration
  lives.

## Second audit (2026-09-10)

Six lenses over the REPAIRS rather than the codebase cold, with one consolidated skeptic per lens: 13 agents against the first audit's 294, and it found sharper things. Sized this way it cost about a tenth as much and still hit the spend limit only on the final sweep agent.

The headline: **the storage-error path I added was destroying the data it existed to protect.** zustand's persist middleware replaces `api.setState` so every write persists, including the one setting a "storage is broken" flag — and on a failed read the store is holding its empty defaults, which then went straight over the Book on disk. The guard now sits below zustand in `apps/mobile/src/storage.ts`, latches on a bad read, drops every write after it, and copies the unreadable bytes to a dated key first.

- [x] **critical** `apps/mobile/app/seal-book.tsx:132` — Seal the Book latches its HoldBar shut: the refusal signal is thrown away at the call site
- [x] **critical** `apps/mobile/src/store.ts:640` — The storage-error branch overwrites the very data it exists to protect
- [x] **critical** `apps/mobile/src/store.ts:640` — The storage-error branch overwrites the user's stored data with an empty store
- [x] **high** `apps/mobile/app/book.tsx:82` — The Book prints app-composed goal names in the serif reserved for the user's own words
- [x] **high** `scripts/check-authorship.mjs:56` — check-authorship.mjs strips every {…} expression, so app prose reaching UserText through a variable is invisible — and the Coach ships one
- [x] **high** `scripts/check-authorship.mjs:50` — UserText is not the only serif: UserField and the Fifteen's TextInput set it and render app-written placeholders in it, where the authorship guard cannot see them
- [x] **high** `apps/mobile/src/store.ts:662` — latestText — the only thing keeping crisis writing out of the Book — lives in a module no suite imports, and deleting its guard leaves every test green
- [x] **high** `packages/ui/src/primitives.tsx:443` — HoldBar's reduced-motion easing fills the bar to 100% on the first frame, so reduced-motion users release 1.3 s before the seal fires
- [x] **high** `packages/ui/src/primitives.tsx:518` — HoldBar's pointerDown guard swallows keyboard activation on react-native-web 0.21, which emits onPressIn/onPressOut for Enter and Space
- [x] **high** `apps/mobile/src/store.ts:640` — The storageError path writes the empty default state over the intact record it was added to protect
- [x] **high** `apps/mobile/src/store.ts:684` — recomputeDay credits one completed move to two different days, so a day with no activity scores 100%
- [x] **high** `apps/mobile/src/store.ts:325` — Only the Fifteen is safety-screened; analysis lines and the seal-day proof are never screened, and both are quoted back verbatim the next morning and sealed into the Book
- [x] **high** `apps/mobile/src/store.ts:290` — The added "second opinion" can never differ from the local screen — the app never constructs a remote provider, so ten regexes are still the entire crisis detector
- [x] **high** `packages/core/src/engines/safety.ts:47` — The widened crisis regexes fire on ordinary gym and self-improvement sentences, and a false positive now silently deletes the whole sitting from the Book
- [x] **high** `apps/mobile/src/store.ts:684` — A move completed before its scheduled day credits two days; the scheduled day scores 100% with no activity
- [x] **high** `apps/mobile/app/coach.tsx:61` — The Coach's "I'm stuck" chip creates a byte-identical duplicate of the move already on Today
- [x] **medium** `apps/mobile/app/write.tsx:322` — The Fifteen's Seeds column sets bank-written goal titles in the serif and calls them the user's own
- [x] **medium** `packages/core/src/engines/coach.ts:174` — "I'm stuck" duplicates the move the person is already stuck on, and the duplicate lowers their Consistency Score
- [x] **medium** `packages/core/src/engines/book.ts:153` — BookVersion carries no titleAuthored, so the SQL authorship guard credits the app's spine title to the user
- [x] **medium** `packages/core/src/engines/portrait.ts:78` — proposeIdentity silently truncates the user's clause at eleven words and presents the fragment as verbatim
- [x] **medium** `scripts/e2e.mjs:323` — The e2e check that Today's moves come from the user's own line is satisfied by the Book quotation card, not by any move
- [x] **medium** `scripts/check-sql.mjs:46` — check-sql's two NOT NULL assertions are unanchored and are satisfied by other tables — moves.source_line_id and moves.plan_id can both be made nullable with all guards green
- [x] **medium** `scripts/test-migration.mjs:302` — The writing-immutability guard is only ever tested on a row shape the app never writes, and check-sql's 'unconditional' assertion bans only < and >
- [x] **medium** `packages/ui/test/contrast.test.ts:74` — The contrast suite measures only the six domain accents; accent.success is used as 14px body text at 3.02:1
- [x] **medium** `scripts/check-functions.mjs:28` — check-functions.mjs's guard for the safety edge function is /crisis/, satisfied by the word inside its own prompt string
- [x] **medium** `packages/core/src/engines/blueprint.ts:288` — validatePlan's milestone check is satisfied by the app's own fallback sentence, and no test or SQL guard covers a milestone with no source line
- [x] **medium** `apps/mobile/src/components/SafetyGate.tsx:55` — The helpline dial-failure fallback is unreachable on the web build because react-native-web's Linking.openURL never rejects
- [x] **medium** `apps/mobile/src/store.ts:426` — makePortraitAndPlan never rebuilds an existing plan, so a Monitoring line written later can never reach the milestone it is promised to fill
- [x] **medium** `apps/mobile/src/store.ts:764` — A parked move disappears from the app the next day and can never be reached again
- [x] **medium** `packages/core/src/engines/safety.ts:128` — The resources card still promises the writing was not remembered, while saveText has already persisted it and Settings counts and exports it
- [x] **medium** `packages/core/src/engines/safety.ts:87` — The 'concern' verdict is still computed and discarded — actionFor has no call site and nothing distinguishes concern from none
- [x] **medium** `apps/mobile/src/store.ts:514` — Undoing a move on a later day deletes the earlier day's ledger row but leaves that day's score frozen
- [x] **medium** `apps/mobile/app/seal-book.tsx:42` — makePortraitAndPlan has one call site, so a goal that failed to plan can only get one by sealing a second edition of the Book
- [x] **medium** `apps/mobile/app/coach.tsx:67` — addMove's toast is the only feedback for a Coach action, and the Coach renders no Toast surface
- [x] **medium** `apps/mobile/app/settings.tsx:23` — "Copy out what is open" exports everything except the writing that is open
- [x] **low** `packages/core/src/engines/blueprint.ts:377` — proposeReplan and applyReplan still have no test and no call site; the G-168 repair added the gate but not the tests it named
- [x] **low** `supabase/migrations/0001_init.sql:200` — evidence.move_id, the key undo correctness now depends on, has no column in the migration

### Walking the app by hand (2026-09-10)

`pnpm build:web` then `node scripts/serve.mjs` puts the built app on
http://localhost:8790, and `.claude/launch.json` opens it in the browser pane.
Every screen was opened and used: Welcome, consent, the Interview, the doorway,
the writing room, Today, the Book, the Goal screen, Progress, Envision, the
Coach, Settings, the practice builder, the runner, Seal the day.

Everything works. The whole three-sitting flow runs, the Book seals, the plan
lands on Today, the runner counts down and waits, and the ledger fills. Nine
defects came out of looking that no test could have caught:

- **The focus ring was Chrome's amber default**, wrapped around the writing
  surface in the night studio, where it reads as a warning. Redrawn in the
  product's coral; fields that already carry a coral underline show focus by
  thickening that line instead of adding a box.
- **Envision quoted people badly.** "You remember writing about the kitchen is
  still." The detail extractor cut their sentence mid-phrase.
- **The dawn brief lowercased a weekday** — "Start with tuesday: at 6:40" — and
  punctuated on top of a quotation that already ended in a full stop.
- **The Coach never built its own brief**, so arriving there first showed a
  coach with nothing to say.
- **Counts were not pluralised**: "1 pieces of writing, 1 goals".
- **Dates were printed in their stored form**: "BY 2026-10-10".
- **The practice builder clipped the person's own words** in each step field.
- **Three `\b` escapes had become literal backspace bytes** in the coach engine
  from a shell heredoc, which is why one fix silently did nothing. Swept the
  tree; no others.

Two of the loop's own habits are worth keeping after this: heredocs mangle
escapes on this machine, so patch scripts go through the Write tool; and the
browser pane being hidden means screenshots can show a stale frame, so read the
DOM to confirm what is actually there.

### The second walkthrough, on the built bundle (2026-09-11)

The first walkthrough proved the flow ran. This one went after the things a
green suite cannot see: what the app says when the clock disagrees with it,
what happens on the screens either side of the happy path, and what the page
does at widths the e2e viewport never visits. Driven through the DOM rather
than screenshots, because the browser pane is hidden and its frames go stale.

Verified live, on the built app:

- **Crash recovery.** The page was killed mid-sitting; "Carry on · 14:58 left"
  was offered on return, all 265 characters came back, and the clock resumed at
  14:57.
- **Sealing from the keyboard alone.** A `keydown` of Enter on a focused
  `seal-hold` seals the Book. Somebody who cannot press and hold has exactly one
  route through the product, and it works.
- **The HoldBar re-arms after a refusal.** Refused twice — "The 'I will…' line
  is required", then "No goal has been written about yet" — and still accepted
  the next activation. The latch fix, confirmed with a real bar rather than a
  unit test.
- **Parking a move.** Long-press parks it, the toast offers Undo, the Now card
  advances to the next move, and the parked one is still in the plan with the
  day it was for. "Not today" is not "never".
- **Sealing the day**, then the ledger and the almanac carrying it.

Seven more defects came out of it:

- **Today's header printed the wall clock.** With a 4 a.m. boundary, somebody
  writing at half past midnight is still in yesterday as far as every move, seal
  and ledger row is concerned — so the header said FRI SEP 11 while the entry
  they had just sealed filed itself under THU 10 SEP. Found at 01:08, which is
  the only hour it is visible.
- **"Good morning." at every hour**, including the evening when the day is
  sealed and the small hours when people actually write.
- **The concern band was a column in a table.** PRD §11.6 owes three things to
  somebody whose writing lands there; the verdict was computed on every write,
  stored on the row, and read by nothing. All three happen now, and the chat —
  the one thing a person writes that is not kept — leaves one date behind so
  tomorrow's brief knows.
- **The helplines were reachable only in crisis.** They lived in the card the
  safety screen raises, so the only way to a number was to already be having the
  worst evening of your life. They are in Settings now, ungated and uncounted.
- **The Goal screen's plan gave no state**: every move read the same whether it
  was done last week, parked this morning, or still ahead.
- **The Book's three actions ran 12 pt off a 320 pt screen**, putting
  "Something moved" half off the page.
- **The writing had no measure on a wide screen.** At 1280 pt the Book's first
  sentence set itself 1192 pt wide, about a hundred and fifty characters on one
  line of serif.

Two of those were pattern gaps rather than screen bugs, and both were found by
writing the sentence a person would actually write: the despair pattern wanted
its verb immediately after the modal, so "nobody would even notice" fell
through it, and "no one" was not matched at all.

Three e2e checks were added for the widths the suite's own 420 pt viewport
cannot see, and both fixes were verified to fail without them before being kept.
A guard that cannot fail is not a guard.

### Writing the Fifteen from a blank install (2026-09-11)

Cleared the device and went through the whole thing as a new person: Welcome,
consent, the Interview, the doorway, the Fifteen, the read-back, ranking, ten
stones across two goals, sealing the Book. Six more defects, all of them things
only writing real sentences would surface:

- **The read-back mislabelled the person's own writing.** "It is 6:40 and the
  kitchen is still blue" came back as MIND & SLEEP. Two causes: `still` was a
  stillness word, when in English it is almost always the adverb; and the tie
  between mind and home was broken by the order the domains happen to be
  written in the source file. The longer match wins now, and a genuine tie says
  "something else" — saying nothing beats guessing out loud at what somebody's
  sentence was about.
- **A trailing `\w*` on each alternation read words out of the middle of
  longer ones**: cardio as money (`card`), "the same" as people (`sam`),
  billion as money (`bill`), restaurant as mind (`rest`).
- **A quotation ended in a comma.** “I am out the back door before the kettle
  boils,” — the comma before "and" belongs to the join, not to either half of
  it. Trimming the tail leaves a verbatim substring, and there is a test that
  says so.
- **The Book never showed the title the person was asked to write.** Sitting 2
  asks what is on the spine, stores it, prints it in the plain-text export, and
  the Book itself did not. The framing chip was worse — it set the field's
  placeholder and nothing else, so the opening they chose vanished the moment
  they left the screen.
- **PRD §11.6 requires "Morrow's coach is an AI" at first chat and in
  Settings.** It was in neither.
- **A line kept on the read-back but not named** is silently not a goal,
  because the app does not get to name it. The screen now says so rather than
  dropping what they just chose without explanation.

### The toolchain, and two different nothings (2026-09-11)

`apps/mobile` was typechecking with TypeScript 6.0.3 while `packages/core` and
`packages/ui` used 5.9.3 — and mobile compiles those packages from source, so
the same files were being checked by two compilers with two ideas of what is
legal. Nothing had failed yet; it only meant `pnpm typecheck` could go green on
a construct the app's own compiler would later reject. One version now, and
`scripts/check-deps.mjs` is the guard, wired in as `verify`'s first step.

`pnpm outdated` recommended six upgrades on the React Native side — react 19.3,
react-native 0.87, gesture-handler 3.x, async-storage 3.x — while
`npx expo install --check` said the tree was already correct. Those versions are
ahead of what Expo SDK 57 supports and taking them breaks autolinking, so the
guard also refuses a caret on any Expo-owned package: a tilde takes patches
within the SDK's minor, a caret takes the next minor, and the next minor is the
jump that breaks it. **TypeScript 7 and vitest 5 are both available and both
deliberately not taken.**

Two error paths were saying the wrong thing:

- **`makeScene` returned `null` for two unrelated reasons** and Envision
  printed the same message for both, so somebody who had written plenty was
  told their writing was not enough because a request had failed.
- **The error boundary said "export it first if you would rather be certain"
  and offered no way to do it.** It now reads the blob straight off disk — not
  through the store, which is one of the things that could be broken — and
  spills it onto the screen when the platform has no share sheet, which is
  every desktop browser. Verified live by giving the sealed Book a null chapter
  list and pressing the button.

### Three P1 sections that were not built at all (2026-09-11)

Reading §7 against the app rather than against the tests found three whole
sections with nothing behind them. All three are now built, and all three
follow the same shape the rest of the codebase uses: the arguable part is a
pure engine in `packages/core` where it can be tested, and the platform is an
adapter at the edge that is allowed to be absent.

**§7.11 Notifications.** There were none. Every rule in that section is a
promise not to be the kind of app people mute, and they are all in
`engines/notifications.ts` now: one per moment; nothing inside quiet hours, and
a time that falls inside them *waits* rather than being cancelled, because
somebody whose wake time is 06:30 has told the app when their morning is; never
a count of what was missed; a missed one never resent, so a phone that was off
overnight does not deliver yesterday's morning line at breakfast; and after a
gap exactly one word on day three and none after. Only the morning carries a
register — a fierce evening notification is a stranger being sharp with
somebody who has already decided the day is over. `expo-notifications` is
loaded lazily behind a try/catch: absent means quieter, never a Book that fails
to open. Settings gets one control that steps down and says in words what is
left.

**§7.13 / §8.9 The paywall.** There was none, and `Profile.entitled` was a
field nothing read. The list of moments is closed on purpose — a paywall that
can appear anywhere is one that eventually does. What is *not* gated is the
argument: every goal can be authored, every stone written, and the Book sealed
with all of them in it, on the free plan. Pro buys the plan the app builds out
of those lines, never the right to write them down. The per-month maths is
computed rather than typed beside the price. With no store keys, Continue says
plainly that nothing was charged rather than spinning.

**§7.14 The tablet layout.** "Content max-width 640 pt, two-column Goal and
Book." The column was 560 and neither screen had a second column. `useTwoColumn`
reads the window rather than the platform — a platform check gets a folding
phone, a split-screen tablet and a resized browser all three wrong.

Two defects came out of building them, both caught by the suite rather than by
reading:

- **The paywall replaced instead of popping**, which left the screen it came
  from mounted underneath a second copy of itself — two Todays in the stack,
  the lower one unreachable and still answering to its own test ids. Popping is
  also the honest reading of "returns the user to where they were".
- **Once was not once.** Marking the moment seen on the dismiss button meant a
  system back gesture, or closing the app on that screen, brought it back the
  next time Today opened.

### Three more P1 sections, found the same way (2026-09-11)

Reading §7 line by line rather than section by section turned up three more
features with a type, a helper or a promise behind them and nothing a person
could actually reach.

**§7.3 Sunday reading.** "A reading view with no controls but a page turn; at
the end, *Still true* or *Something moved*." There was no such view — and the
Sunday notification written an hour earlier pointed at it, which made it a
promise the app did not keep. `bookPages()` turns the Book into the pages it is
already printed as, in the same order, because a reading view that reorders
somebody's own document is a different document. Two pieces of chrome: which
page of how many, and a way out.

**§7.7 The Goal Path.** "A single route from now to the target date with
milestone nodes, the user's dot at the current fraction, You are here, distance
to next, and the last five evidence entries." The dot is **time, not
completions**, and that is the whole argument for drawing it: a dot that moved
with what had been done would put somebody who has done nothing at the start of
a route whose deadline is a fortnight away. Time says where they are; the nodes
say what is behind them; the picture is honest because the two may disagree.

**§7.8 Letters.** The `Letter` type existed and nothing wrote one. The clause
worth enforcing rather than trusting is "they never contain a goal or a plan
line": a letter that names the plan is the app writing the plan back at
somebody in a warmer voice, and the plan is in the same store, so it is the
easiest thing in the world to do by accident. `checkLetter` refuses that, a
quote that is not a verbatim substring, and anything outside 120–180 words. A
letter that fails is not stored — there is no third option where it is shown
with a warning, because the person cannot be expected to audit their own
encouragement.

That check found an existing defect immediately: **`letterFromFuture` in the
Portrait printed the goal title** in its middle sentence and would have failed
its own rule.

Three more small ones came out of building these:

- **`test-migration` counted tables against a hard-coded 14**, so it failed the
  moment a table was legitimately added — which trains whoever runs it to edit
  the number rather than look. It counts what the migration declares.
- **The letter body was walked once per quote**, consuming as it went, so a
  short quotation sitting before a longer one silently lost the serif.
- **`check-authorship` counted braces with one non-greedy `{...}`**, so a
  template literal inside a `UserText` left its own tail behind and the guard
  reported the leftover punctuation as app prose.

### The last two in §7.4, and a rule about days (2026-09-11)

**The Portrait reveal.** This is what the five stones were for, and nothing in
the app had ever shown it: the Portrait was built at the last stone and the
sitting went straight to sealing the Book. It has its own screen and the
sitting ends there. Everything on it except the letter and the labels is a
sentence the person wrote, so almost all of it is in the serif — and the one
exception is the point. The identity clause is the only line in the product the
app *proposed* rather than quoted, which is exactly why it is the only thing on
the screen they can edit in place. Writing their own retires the proposal for
good and drops the framing with it.

**Replan as a diff.** `proposeReplan` and `applyReplan` were written, tested,
and called from nowhere. Every row starts at "keep mine" — a diff that arrives
pre-accepted is an edit with a confirmation dialogue — every row shows the line
of theirs it came from, and an empty diff says so plainly, because most weeks
nothing needs changing and a replan with a suggestion every time is a replan
worth ignoring. Accepted rows land as a new version, not an edit in place.

**One rule about days.** `toISOString()` converts to UTC, so a date built in
local time and sliced to ten characters is tomorrow west of Greenwich in the
evening. That is how a three-month horizon landed a day late and dated every
milestone on the plan built from it, and how a letter due today read as due
tomorrow on the letters screen. `scripts/check-dates.mjs` is the rule, wired
into `verify`; writing it turned up two ways a guard quietly stops guarding
(it fired on its own explanatory comment, and its comment-stripping matched
nothing because a trailing CR is a line terminator to a JS regex). Verified to
fail on both of the bugs it was written for before being kept.

And the route table walked against the code that refers to it: every screen
has a door, including the letters once they have all been read.

### The final walkthrough, from nothing (2026-09-11)

Cleared the device and went through everything on the final bundle, in the
browser, reading the DOM at every step: Welcome → consent → the Interview → the
Fifteen (killed and resumed) → What I heard (a kept line named in my own words)
→ rank and the spine title → ten stones across two goals → the Portrait reveal
(the identity line rewritten) → seal the Book → the Book → the one paywall →
Today → the letter → the Coach (the intention and the one invitation) → seat
the stone → seal the day → Progress → Settings. Every screen did what it says,
and the ledger carried the proof line typed at the seal.

One more defect, which only a two-goal walk could show: **sealing the Book said
"this one has nothing in it to start from yet"** and offered "Write that line
now" — for a goal that had every line it needed and was held back only by the
free plan's one-Blueprint limit. That sends somebody off to rewrite a Strategies
line they have already written. Two reasons, two sentences now. And the seal's
own label said "first edition" on every seal there was.

The route table was walked against the code that refers to it. Every screen has
a door.

### The migration, run for real one more time (2026-09-11)

Three tables the app had been writing locally with nowhere to sync to —
`practices`, `practice_logs`, `scenes` — and the three per-person facts that
have to be the same on every device (paywall moments shown, what "Fewer" turned
off) are in the migration now. Running it against a real Postgres found the
real thing: **Bob could insert a `practice_logs` row pointing at Alice's
practice.** Row level security says whether Bob may write a row; it says
nothing about what the row points at, and a foreign key only checks the parent
exists. One parameterised trigger now sits on every column that references
something a person owns — twenty of them — and `check-sql` derives that list
from the migration rather than from anything written down, so a new foreign key
cannot be added without a trigger or a deliberate exemption. Its first run found
two the hand-written list had missed.

### The PDF, and a linter (2026-09-11)

**§7.3's PDF export.** `bookToHtml` sets the same page as the screen with the
same rule — the serif on exactly the words the person wrote — as a
self-contained document, and the platform renders it. On the web it is the
print dialogue, which has Save as PDF everywhere. Nothing they wrote is trusted
as markup; there is a test that hands it a script tag.

**A linter, for one rule above all.** Writing the PDF button put a `useState`
below a screen's early return — a rules-of-hooks violation that would have
thrown the moment a Book appeared or was deleted — and it was found by reading.
TypeScript cannot see that class of bug. The Expo ESLint config is in `verify`
now with `react-hooks/rules-of-hooks` as an error, confirmed by putting the bug
back. The React Compiler's newer opinions about refs-during-render and
state-in-effects are **warnings, deliberately**: both are the standard
react-native pattern in the gesture and timer code, both work, and silencing
twenty of them to quiet a linter is not fixing them. They are worth one careful
pass on a device, not a blanket rewrite here.

### The coach, read off the screen (2026-09-11)

Tapped every chip and typed three things at the coach on the built app. Four
defects in its replies, in the one place the product is supposed to be most
careful: **"then you put the phone in the hall"** — the coach rewriting the
person's own if-then into the second person and quoting the edit back as
theirs; a raw ISO date; today's own proof line quoted back as a day they had
already got through, with the app's full stop on top of theirs; "1 sealed
days". And "how many calories should I eat to lose 5kg fast" got the generic
reply, because `contentGuard` knew the sentence that names a number and not the
commoner one that asks for it.

Then the free-text reply itself: every message got the same sentence back.
Without a key the coach can still do the two things it is ever allowed to —
quote and ask — so it now quotes the line of theirs a message touches and asks
one of four questions chosen by the text, never at random. Nothing invented,
nothing flagged ever quoted.

### Guards for what kept coming back (2026-09-11)

Three defects recurred often enough this session to earn a rule rather than
another fix: the app's full stop landing on top of the person's own
(`endSentence`, now shared and checked), a stored day printed as prose
(`formatDay`), and a hook declared below an early return (`rules-of-hooks`).
Each guard was run against the tree from before its fixes to confirm it would
have caught them, and `check-copy` found one more the sweep had missed.

### The other road (2026-09-11)

The writing room accepted `kind=shadow` and nothing in the app had ever sent
anyone there — on either track. §7.2: optional on Starter at eight minutes,
required on Full at fifteen and *before* What I heard; §7.8: if it was never
written, Envision offers the write once rather than drawing a scene in its
place. The room now knows where it goes when it closes; the Starter closed
screen offers the other road as the second of two buttons; Envision's
unwritten other road offers the write and does not offer to draw what does not
exist. Walked live and covered by eight e2e checks on the product's own clock.
The Full track's 600-character soft floor is shown as polish, never an error.

## Third audit (2026-09-11)

Ten agents over the whole tree — authorship, state, safety, copy, contrast,
the migration, the edge, the screens — with an adversarial verify on every
finding; 47 confirmed and one left unverified (the paywall's BENEFITS line,
fixed anyway). All 47 are closed. The ones that mattered most:

- **The Book printed part of the Fifteen twice.** `ideal.slice(firstSentence.length)`
  used the length of the *displayed* first sentence, which is whitespace-
  normalised and cut with an ellipsis when long. `restOfIdeal` walks the
  shown sentence against the raw text and starts the body where it stops.
  Book screen, reading view, plain text and PDF all go through it.
- **The letter composer could write a letter its own check refused.** A
  thirty-word first sentence and two long ledger lines came to 230 words
  against a 180 ceiling, and the letter was silently never written. Pieces
  now carry a rank and are shed longest-optional-first, quotations last; a
  short letter is brought up to the floor one plain sentence at a time; the
  ledger count is the whole ledger, not the two lines quoted; and the empty
  ledger gets prose that does not describe mornings it has no record of.
- **The person's words were set in the app's face** in the dawn brief, the
  coach's replies, the welcome-back card, the Portrait letter, the Now card,
  the Later rows and the replan rows — and the app's "…then I" framing was
  set in theirs. One primitive, `Quoted`, splits a sentence on the verified
  spans and sets each half in its face; `UserText` took a `framing` prop for
  the chrome in front of a line. The serif now means one thing everywhere.
- **"then I I'll put the phone in the hall."** and a double stop after it:
  three engines composed the if-then three ways. `ifThenOf` composes it once,
  supplies the framing only where the person did not type it, keeps their
  contraction, takes their full stop off, and hands back spans that are still
  substrings of what they wrote.
- **`Milestone.reachedAt` was never set.** The letters engine had an occasion
  for it and the Path a branch, both dead. `reachMilestones` stamps a
  milestone on the first launch after its date with something in the ledger
  for that goal since the milestone before; never unstamped.
- **Crisis-flagged lines reached the Portrait, the plan, a practice, a scene
  and a letter.** Every builder now takes `quotable()` rows only.
- **The safety appeal un-flagged the wrong row.** "This was not about me"
  always cleared the newest flagged *sitting*, whatever had raised the card.
  `safetyPause` carries its source row and the appeal clears exactly that.
- **A write failure never surfaced.** The storage latch closed and every save
  after it was dropped, but the banner only read the latch at rehydrate.
  `onStorageFailure` tells the store the moment it closes, and the banner
  says whether it was a read or a write that failed and what that means was
  kept.
- **Android could not dial a helpline.** `canOpenURL('tel:')` is false on
  Android 11+ without a manifest query, so every number read as undiallable.
  Only iOS asks first now; Android and the web go straight to `openURL`.
- **The web PDF printed the app.** expo-print's web build ignores the html it
  is handed. The Book is written into a frame of its own and that prints.
- **Tapping a notification did nothing.** No response listener existed.
  `onNotificationOpened` handles both the running and the cold-start case and
  follows only routes of the app's own shape.
- State: a second tap on a stone doubled the ledger; sealing a day twice
  appended a second proof line; the replan argued from every goal's week and
  had no monthly cap; a rewritten Monitoring line never reached its
  milestone; dropping a goal left its practices on Today; a recount after a
  seal dropped the proof line's safety verdict; chips took no coach turn;
  `partial` was a fraction in an int column.
- The migration: app ids are `text` (the device mints them); `goals.title_authored`,
  `moves.doing_min_version`, `plans.replanned_at`, `profiles.sunday_hour`,
  `reduced_motion`, `deleted_at`; whitespace-only checks on every free-text
  column; `entitlement` constrained to free/pro and refused from any user
  session by trigger (the sync no longer sends it up); a letter from the
  future must quote something.
- Copy and contrast: the paper's label ink cleared 3.71:1 and now clears 4.5:1
  (`paper` tokens, measured); "Sealed" uses the app's day, not UTC's; the
  seal-book label said "second edition" on the first; "The last 1 thing";
  the gentle notification's colon; the paywall promised re-authoring, which
  is not built; the crisis card said nothing was sent anywhere, which is
  untrue with a remote screen; the consent screen now names the safety
  screening and the scene.

## The account (2026-09-11)

PRD §7.12, built to the key. `src/supabase.ts` is the seam: a client only when
both public values exist, email one-time code, Sign in with Apple from the
identity token, sign out, and `deleteAccount` through a function. `src/sync.ts`
pushes every table in foreign-key order as an upsert on the device's own ids,
and pulls only onto a device with nothing of its own — two devices with two
Books is a merge, which this product does not have, and pretending otherwise
would risk the one thing the account exists to protect. `packages/core/
engines/sync.ts` is the store as rows and back, round-trip tested field for
field. The account screen asks once after the Portrait and only when there is
a service to ask about; "Not now" keeps everything local; Settings has the row
for whenever, with the last time the copy landed, a sign-out and a close. The
app pushes on launch and on backgrounding when signed in. `delete-account` is
the fourth function: soft delete now, the sweep after seven days, the person
read out of their own token and never out of the body.

## Fourth audit (2026-09-11)

Five lenses over the code written since the third — the account and sync
layer, the store repairs, the typesetting, the platform edges, the engines —
each with one adversarial verifier. 44 findings; 17 confirmed by a verifier,
one refuted, 26 left unverified when the spend limit took the last two
verifiers, and those were read against the code by hand. 43 closed. The
ones that mattered:

- **A crisis-paused sitting came back as a draft.** The autosave stayed
  subscribed while the screen was up, so a helpline tap — which backgrounds
  the app — flushed the crisis text straight back into `drafts`, and "Write
  it again" handed it to the person as "N words are still here". The flush
  now stops the moment the screen fires.
- **The dawn brief and the coach chips quoted a crisis-flagged stone.**
  `replyToText` checked; the brief and the chips did not. Every engine read
  of an analysis now goes through `isQuotable`, the store passes
  `quotable()` rows, and the Progress and Goal ledgers no longer print a
  flagged line in the serif.
- **Every letter after the first kept move was refused.** A kept move's
  ledger row *is* the move's title, which `checkLetter` rightly forbids, so
  the composer quoted it and the check threw the letter away — silently, on
  every launch, for anyone whose plan was in use. Letters now quote only the
  rows the person typed (seal and capture); the count is still the whole
  ledger. A first sentence too long to quote whole is quoted from its start
  ("You began …"), and the composer sheds its own prose before theirs.
- **A second seal of a day destroyed the first.** Proof A at 21:00, proof B
  at 23:00: A was gone from the ledger and the day. A re-seal is now an
  edit — a different sentence is a second entry, a blank field keeps what
  was written, and the seal screen opens on the day's words.
- **Sync would have failed on the first real push.** A practice run carried
  its practice's id in `move_id` (a different table); a milestone with no
  proof yet sent `''` into a column that refuses it; a second practice log
  on one day collided with the (practice, day) key; two letters to the future
  on one day shared a trigger; a dropped goal left pointers at rows no longer
  in the bundle; the pull read at most a thousand rows a table and the next
  push wrote the cut as the truth; nothing ever deleted, so a dropped goal
  came straight back on a new device; the launch-time push raced the
  sign-in's pull and could land an empty device's defaults over the account's
  profile; "Delete everything" left the session behind. All eight are fixed
  and the migration test grew four checks (37).
- **A new phone had no way to its Book.** The account screen was reachable
  only after the Portrait or from Settings, and both need writing first —
  after which the sync refuses to pull. Welcome and the empty Today now offer
  "Bring my Book back from my account".
- The Book printed "…then I then I …" and "…then I I'll …": the second half of
  an if-then is printed through `thenHalf` everywhere it stands alone.
  `firstSentence` stopped at a decimal point ("1." / "5x fitter") and at the
  first dot of an ellipsis; `restOfIdeal` ate an ellipsis that was theirs;
  `splitFirstMoves` lifted day names out of the middle of a sentence and
  printed the wreckage as their move; `reachMilestones` anchored on the UTC
  creation date; the replan proposed "You kept 0 of 3" against a plan that
  had not started, and accepting it burned the month's one replan; the web
  print frame's `afterprint` listener was erased by `document.open()`;
  chip labels rendered in the serif; `formatDay` decided "this year" from
  UTC; `ifThenOf` missed "then," and a lower-case "i".

### One Today, not two (2026-09-11)

Every "Back to today" was a `router.replace('/today')` from a screen that had
been pushed on top of Today, which leaves two Todays on the stack — the
hidden one first in the DOM. People never saw it; the e2e did, the moment
it re-sealed a day and then tried to open a practice from the Today
underneath. `router.dismissTo('/today')` pops back to the Today that is
there and only replaces when there is none. Eleven screens, one call each,
and a check that counts Todays after a seal. Also: sealing a day twice is
covered end to end now (the second visit opens on the first's words, a blank
re-seal keeps them, one ledger row).

### Saying it (2026-09-11)

"Say it" was the Fifteen's default mode in the PRD and a label in the app: the
chip changed nothing. `src/dictation.ts` is the seam — `expo-speech-recognition`
loaded lazily behind a try/catch, on-device recognition where the phone
supports it, the OS recogniser where not, the Web Speech API in a browser —
and the room is anchor + current stretch, a final stretch moving the anchor
and the recogniser starting again, which is the one behaviour every platform
shares. No microphone, no permission, no module: one sentence under the ring
and the room is a typed one, nothing lost. The consent screen says the
recogniser is the phone's own. Walked on the web build (the pane has no
microphone, so the fallback is what was seen); the recogniser itself needs a
phone. Expo's patch releases of the day were taken with `expo install --fix`;
expo-doctor is 18/18 again.

### The React Compiler (2026-09-12)

The linter's compiler-era warnings — refs read during render, state set inside effects — had been left as warnings on purpose (see "The PDF, and a linter"). With the fan-outs gone this was the pass to do them by hand: `useRef(new Animated.Value(0)).current` built a fresh value every render and threw it away (a lazy `useState` builds one; six sites), the "latest ref" assignments in the runner and the writing room are written after commit rather than during render, the return card on Today is decided once in the state's initialiser rather than set from an effect, and duplicate imports merged. 39 warnings to 9; the nine left are async results landing and resets, which is what an effect is for.

With the rules met, the compiler itself: `babel-plugin-react-compiler` at Expo's pin and `experiments.reactCompiler: true`. The web bundle carries 252 memo caches; the e2e suite (151), the axe pass (both studios), the screenshots (Today differs by six pixels) and `expo-doctor` (18/18) are unchanged on the compiled bundle. What it buys: Today re-renders on every store change, and now only the parts whose inputs changed are rebuilt — which matters most on the phone, where it cannot yet be measured. If a device shows anything odd, the switch is one line in `app.json`.

### The night splash (2026-09-12)

A phone in dark mode opened on the day studio's splash for a moment before the night one drew. `make-icons.mjs` draws a night splash now — the pale stone on the night ground, the same ink the night studio's buttons wear — and `expo-splash-screen` gets it under `dark`. The day splash is byte-identical to before.

### Predictive back (2026-09-12)

§7.14 asks for predictive back and edge to edge on Android. Edge to edge is what SDK 57 builds by default (the old key is gone). Predictive back is one key that defaults to off — `android.predictiveBackGestureEnabled: true` — and the config plugin writes `enableOnBackInvokedCallback` into the manifest (`expo config --type introspect` shows it). What the gesture actually looks like through expo-router's stack on a device is on the Mac list.

### Axe over every screen (2026-09-12)

Step 4 of the loop — what current practice would add — with no agents to spend: an automated accessibility pass is the obvious one, and it costs a dev dependency. `scripts/a11y.mjs` loads the built bundle with the seeded store, the same 26 routes the screenshots use, and runs axe-core 4.13 (WCAG 2.1 AA + best-practice; landmark and heading rules off, since a phone screen has neither). First run: 10 serious or critical findings on 9 screens. What they were, and what was wrong underneath:

- **react-native-web 0.21 turns `accessibilityState` into nothing.** Every `checked`, `selected`, `disabled`, `busy` and `expanded` the app set through `accessibilityState` was absent from the DOM — the move stones announced as checkboxes with no checked state, the track cards as radios with none, the tab bar as tabs with no selected one. The app uses RN's `aria-checked` / `aria-selected` / `aria-disabled` / `aria-busy` / `aria-expanded` props now, which are native on the phones and real attributes on the web.
- **A chip's "selected" was a state a button cannot have.** `Chip` takes a role now: one of a set is a radio (the default when `selected` is given), a toggle is a checkbox (the mic chips, Accept, Keeping), a plain action is a button.
- **The tab bar's tabs had no tablist**; the Almanac's 365 labelled stones had no role for the label to hang on (they are images now); three scroll views with nothing focusable inside could not be reached from a keyboard (`keyboardScroll`, a web-only `tabIndex`).
- **A disabled ink button was the same button at 35% opacity** — "Pick at least one" measured 1.4:1, an instruction set in a colour nobody could read. Disabled is a flat face on the ground with no edge to press and its label in the second ink.
- **The night studio caught one more:** the selected track card's description was white at 75%, which on the night studio's light ink is white on white. Two tokens — `onInkSoft`, `onInkWash` — replace every hard-coded white-on-ink, with a contrast test for both studios.

Second run, both studios: 0. The pass is in `pnpm verify` after the e2e suite. It takes `SEED=` as the screenshots do; the empty, many-goals, long-lines and ninety-days-in stores are all at 0 too.

The e2e suite runs axe as well, at four states only a flow reaches — the room mid-sitting, the seal with its line written, a toast with its undo, the resources card — which found one more: `aria-modal` on a container with no dialog role (it is an `alertdialog` named by its title now). 148 checks.

### The studio, lit (2026-09-12)

The user asked for the UI improved completely. First a way to look at it: `scripts/shots.mjs` renders every screen from a seeded store at phone size (`scripts/fixtures/seeded-state.json`, `DARK=1` for the night studio), so the review was of pictures, not of code. What the pictures showed against PRD §8:

- **No light.** The ground was flat; §8.3 asks for a radial fall of light. `Studio` now paints it behind every screen, day and night, as the studio's only gradient apart from the stones.
- **No elevation.** Nothing cast a shadow, so nothing was on anything. `Card` is the one elevated surface a screen is allowed (§8.7): the Now card, the day-done card, the Portrait's if-then, a letter, the paywall's plan. Everything else that was a white box became a well or a hairline — the read-back and the New move sheet are documents now, not stacks of rounded cards (§8.10).
- **The ink button's edge** was a hard black shadow painted beside it. It is a real slab the face presses into now (§8.1), on both studios.
- **Chips** carry a hairline so they lift off the lit ground without a shadow; the selected one is ink; text is one line height.
- **Stones** cast a contact shadow tinted by their own colour (§8.3) and the hero stones — Today's Now stone, Welcome's, the empty Today's — carry the slow light sweep (§8.1). The writing room's stone bobs until the writing starts (§8.5).
- **Entry sequences** (§8.5): `Rise` staggers a screen's parts in — Today, the Portrait reveal, Welcome. A crossfade under reduce motion.
- **Broken layouts the pictures caught:** the tab bar lost its fifth tab on a 390-point phone (the plus and the seal float above the bar now, and each tab gets the same room); the goal row spread two stones to opposite edges; the consistency bar floated at the right of its number; the Almanac wrapped thirty-one stones onto two lines and called it a month (one month a row, sized to the phone); the interview's coach hint and the read-back's aside were synthesised italics of a face with no italic; the practice builder had six chips per step (one dial); the New move sheet set the person's own lines in the app's face (serif rows on hairlines, with stones).
- **Smaller:** the doorway's prompt at a question's weight rather than a nine-line headline; saying it is the default where there is a microphone; the coach's brief headline balanced between its two faces; the Book's exports as a quiet row under the three chips that matter; the Goal's doors as chips; "up from 0" is "the first week in the ledger".
- **The second look (both studios, `scripts/shots/` and `scripts/shots/dark/`):** the lock-screen print filled the phone and pushed its own Download button below the fold (sized to leave room for the controls, with a hairline frame outside the capture so a night print reads on the night studio); the coach's Send was a 56-point button forced into a 46-point row (`InkButton compact`, a chip's height with the same edge, also the interview's "Use this"); a chip stretched to its row left its label at the left (chips centre their labels; Envision's "Picture it" hugs its words); the Almanac's quiet days weighed the same as the sealed one, and in the night studio every empty month shone (three weights now — a day not yet here, a quiet day, a day with something in it); "+100" beside a first week.

- **A smaller phone** (`W=375 H=667`, an SE): Today, Welcome, the doorway, the seal, the paywall, the sheet and the coach all hold. What that look caught was the sweep itself — a hard-edged white stripe across the hero stone, which light is not. It is a gradient band now, transparent at both sides.
- **When the writing is long** (`scripts/fixtures/long-lines.mjs`, a store with a forty-word "I will", a goal named in a sentence, a two-line move, a paragraph for a first sentence; `SEED=` on `shots.mjs`): Today, the Goal, the paywall and the sheet hold. The lock screen did not — a forty-word line at 26 pt climbed into the clock — and the Book set a paragraph at a headline's size. `fitLine` and `fitSentence` step the size down with the length, in steps so the same line always gets the same size.
- **When the shelf is full** (`scripts/fixtures/many-goals.mjs`: five goals over five domains, a plan each, ten moves today, three practices, five chapters): the goal row on Today showed four goals and dropped the fifth, and so did the New move sheet — a fifth goal a person could not reach from Today. The row is one stone per goal now, however many, scrolling past four with the fifth peeking under the gutter (PRD §7.6); the sheet lists them all. Later today, the Book's contents, Envision's chips and the practices hold.
- **Ninety days in** (`scripts/fixtures/long-game.mjs`: the Book sealed in June, 81 closed days, two gaps come back from, 137 ledger entries): Progress reads as a season — 92 holding, "your own eight weeks have run between 89 and 93", two returns, the Almanac with the gaps in it, the ledger paged at 25. On Today a waiting letter had wedged itself between "Good morning." and the greeting's own line from the Book; the line comes first now and what has arrived sits under it.
- **Before anything is written** (`scripts/fixtures/empty.json`): every empty state says something true and offers one door — except the New move sheet, which said there was no goal to put a move under and then showed a What, a How long and a button that did nothing when pressed. It offers the Interview now, and nothing else, until there is a goal.
- **On the Full track** (`scripts/fixtures/full-track.mjs`: a paragraph under every stone): the Goal screen and the Book printed the paragraph *instead of* the line — the one sentence the coach quotes and the Blueprint is cut from vanished under its own reasoning. A chapter line keeps both now (`BookChapterLine.paragraph`, the person's words, counted as theirs): the line first, the paragraph under it in the second ink, in the Book, the Sunday reading, the text export and the PDF; where there is no line the paragraph stands in as before.
- **The whole screen** (`FULL=1`, the viewport grown to the scroll region's content): the Goal's plan section ninety days in still said "Milestone 1 · by 14 Jul" with the first two milestones reached; it shows the milestone the plan is on now — the first not yet reached, or the last once they all are — and a reached one says so with its date.
- **Which move is Now.** With five goals the Now card showed the money plan's first move over the health goal's, because the day's moves were sorted on each plan's own `order` and every plan's first move tied. `orderForToday` (core, tested): the move the person said this morning first while it is open, then the top-ranked goal's moves before the next goal's, then the plan's order.
- **The brief's "start with" and the Now card named different moves** with five goals: the dawn brief sorted every plan's moves on their own `order` (and could pick one dated next week). The store hands it the day's moves in Today's order now and the brief takes the first open one, so the coach and the card agree.
- **On a Sunday** (`DAY=2026-09-13` on the shots): Today's practices block showed the explainer for somebody who has never made a practice ("The things you do rather than finish… Add one") to a person whose practice simply is not asked for on Sundays. Two different nothings now: no practice at all gets the explainer; a practice not due today gets one line saying when it is.
- **A return day** (`DAY=2026-09-17` on the ninety-days store, five days after the last sealed day): the welcome-back card on somebody's third return said "Return #2" — `detectReturns` counts the returns already in the ledger, and today's is not in it until something is done. `returnNumberToday` (core, tested) is that count plus one.
- **One line that was not true:** "Most people choose this one" under the annual plan, on a product with no customers. §8.9 says no fake discounts; a statistic nobody measured is the same kind of thing. The line is arithmetic now — `annualAgainstMonthly()`, "A year for the price of five months." — and cannot drift from the prices.

Every change went through the same gates (144 e2e), and the pictures were taken again after.

### The lock screen (2026-09-12)

§7.8's wallpaper. `/wallpaper` is the print — the I will line in the serif on
the night ground, the goal's stone, the seal date, nothing else — drawn at a
third of lock-screen pixels or as wide as the phone allows, and captured at
the full 1170×2532 by `react-native-view-shot`. `src/wallpaper.ts` is the
edge: Photos on a phone through `expo-media-library`'s add-only permission,
the share sheet as the other door, a PNG download on the web (html2canvas
under view-shot). Both modules lazy behind a try/catch. The e2e intercepts
the download and checks it is a PNG. What only a phone can show: the capture
of a native view, and the permission prompt.

### Dark mode (2026-09-12)

§7.14: "the user can pin light or dark". A hundred and seventy reads of `day.ink`
and its siblings across forty screens, none through a hook. Rather than teach
every screen one, `day` is now a view over whichever studio is on — the day
studio, or the night studio when the person pinned dark or the system is dark
and they left it to the system — and `accent` answers each `…Text` hue with
its `…Night` form on charcoal. The store derives the mode from the setting and
the OS; every screen re-renders on a change because the store hook they all
use subscribes to it. White-on-ink became `day.onInk`, which is charcoal on
the night ink; the storage banner keeps its deep coral. The Book stays paper
in both. Walked live in the pane (which prefers dark): System, Day, Night,
and back. Three contrast tests more.

### The plus (2026-09-12)

§7.6's New move sheet and quick capture existed as one store action each and
no screen. `/new-move` is the sheet: which goal, what — three moves cut from
the person's own How line by `splitFirstMoves`, or their own words in the
serif field — and how long; the move lands on Today. Its other half files a
line in the ledger with an Undo on the toast. Today gained the plus beside
the seal, and a line for the morning's intention once it is done while
another move is open, which was the one state in which it was said nowhere.
Six end-to-end checks.

### The Horizon Review (2026-09-11)

§7.9 asked for it on Sunday after the reading and the reading ended on two
buttons. `engines/review.ts` computes four facts and writes none of them: the
consistency trend as a sentence with numbers in it, the next milestone for
each goal with its distance, one insight that is either a proof line the
person wrote this week (quoted, never a flagged one) or a count of moves
kept, and how many rows a replan would change per goal with a door to the
replan. It sits under the I will line on the last page. Three engine tests
and four end-to-end checks.

## The stones, renamed (2026-09-11)

The five analysis headings were the published program's own section names,
word for word. Headings are not what copyright protects, but they were the
one fingerprint the product carried, and the client asked. They are now
Morrow's: *Why · Who it reaches · How · What gets in the way · How I'll
know*. The Full-track prompts under them were rewritten in the same voice,
the two sentences that named a stone by its old heading were reworded, and
the README no longer says "the Self Authoring method" — it cites the
research the method comes from. The internal keys (`motives`, `strategies`…)
are unchanged and never shown. The e2e reads a stone's kind from its route
rather than its heading now, for the same reason. What remains for counsel:
a comparison of `framings.ts` and the interview scripts against the
program's actual prompt text by someone with a licensed copy.

## Blocked on the user
- Supabase project URL/anon key, Anthropic API key, fal.ai key, RevenueCat keys: needed to test real providers. Everything runs on local fallbacks without them.
- Google sign-in: `signInWithGoogle(idToken)` is in `src/supabase.ts`; the native half (`@react-native-google-signin/google-signin`) needs the client's iOS and web OAuth client ids before it can be added and built.
- Crash reporting: Sentry's React Native SDK is a native dependency and a DSN; not added until there is a project to send to. Analytics is a seam already (PostHog key).
- Sound on the seal: an asset decision. Haptics are in; a placeholder click is worse than silence.

## Decisions log
- 2026-09-09: start. Stones via react-native-svg (works on web for Playwright tests) rather than Skia; Skia can replace later for grain.
- 2026-09-09: local store = zustand + AsyncStorage persistence for Phase 1 speed; SQLite/Drizzle migration is a hardening step once screens exist.
- 2026-09-10: the authorship rule is enforced in four independent places rather than one — `verifySpans`, `validatePlan`, `authorshipRatio`, and again in SQL. `guarded()` re-checks what the server already checked. Deliberate duplication: a person writing their own life should not depend on any single process being correct.
- 2026-09-10: the timed rituals are tested with Playwright's `page.clock` rather than a test-only fast-forward hook, so the fifteen minutes in the test is the same fifteen minutes the product ships.
- 2026-09-11: the concern band softens the register whatever persona is set. Somebody who chose "fierce" on a good week did not choose to be pushed on this one, and the alternative — honouring the setting — means printing "No negotiation with yourself this morning" at the person the band exists for.
- 2026-09-11: `Studio` holds one 560 pt column rather than each screen carrying its own max-width. Forty screens each remembering a number is forty chances to forget it, and the ground stays full-bleed so the constraint is on the writing, not on the room.
- 2026-09-12: the account is a copy of one device, not a merge. A push upserts and then prunes what the device no longer has, so two phones each writing their own Book take turns being the copy; nothing is lost on either phone. The day a merge is built, `pushAll`'s prune is what it replaces.
- 2026-09-12: the tab bar is Morrow's own pill on every platform for now, not expo-router's `NativeTabs`. The PRD asks for the native bar (glass on iOS 26, Material on Android, §7.14) and that is still the intent; it is native chrome that cannot be seen from this machine, moving Today, Book, Envision, Coach and You into a tab group changes what `dismissTo('/today')` means on every screen, and building it blind would mean shipping a navigation model nobody has run. It is the first thing to do on a Mac (Next steps, 1), with the e2e suite as the net.
- 2026-09-11: the app's day, not the wall clock's, is what any screen prints. `dayOf(new Date(), boundary)` is the only definition of "today" in the product; a screen that reaches for `new Date()` to display a date is a bug even when it happens to agree.

## Next steps

Everything that can be done on this machine, without a key, is done. Four
audits are closed and the built app has been walked end to end. What remains
needs either hardware or a credential.

1. **Build it natively, once.** The tree is ready for it: `npx expo-doctor`
   passes 18/18, the Android prebuild generates cleanly, the icon and splash
   are committed, and `README.md` has the Mac steps. `cd apps/mobile && npx
   expo run:ios` on a Mac with Xcode, or `run:android` with an Android SDK.
   What only a device can show: the fonts, the hold gesture, the drag on Today,
   the safety card, Dynamic Type at 200%, the notification permission prompt
   landing at the right moment, the microphone prompt and the recogniser in
   the room, the haptics, the wallpaper landing in Photos, and dark mode
   following the OS. Then the one piece of P1 chrome that waits on a device:
   the native tab bar (`expo-router/unstable-native-tabs`, glass on iOS 26,
   Material on Android) in place of Today's pill — a `(tabs)` group for
   Today, Book, Envision, Coach and You, `dismissTo('/today')` re-pointed,
   and the e2e suite run against the web fallback.
2. **Wire the real providers** once the keys arrive, and confirm `guarded()`
   still refuses what it should with a real model behind it. Every one of those
   paths is currently exercised only against `LocalProvider`, and
   `hasRemoteProvider` is false in every build so far — which is why the app
   says ten regular expressions rather than implying a second opinion it cannot
   get. With the Supabase values set, the functions are reached through the
   project's own host with the session's token; `EXPO_PUBLIC_MORROW_API` still
   wins when set. Then: sign in on the built app, push, wipe, sign in on a
   second install, pull, and compare the two stores; close the account and
   confirm the sweep.
3. **One `supabase db reset` against the real service** before launch. PGlite is
   Postgres, but Supabase is Postgres plus its own roles, extensions and `auth`
   schema, and `scripts/test-migration.mjs` stubs the last of those. Then the
   email template with `{{ .Token }}` and the Apple provider (README).
4. **The store keys.** `apps/mobile/src/billing.ts` is one function and one
   seam; the paywall, the gates and their tests all go through the `Billing`
   interface. Until then Continue says plainly that nothing was charged, which
   is the honest thing for it to say.
5. **Google sign-in, crash reporting, sound.** Each is a key or an asset away:
   the Google OAuth client ids for the native module, a Sentry DSN for the
   SDK, a recording for the seal. See "Blocked on the user".
6. **Widgets and the Live Activity** (§7.11). WidgetKit and a foreground
   service are native code with no web equivalent, so nothing about them can
   be built or checked on this machine. What they need is already computed:
   the first move and the Consistency figure are on Today, and the "I will"
   line is on the Book and the lock screen.
7. **Counsel's read of the prompts** against the program's real text, with a
   licensed copy (see "The stones, renamed").
8. Then loop: implement, test, harden, research, repeat.

## Where the walkthrough habits are written down

Worth keeping on the next resume, because each cost an hour to learn:

- **Heredocs mangle escapes on this machine.** `\b` became a literal backspace
  byte (0x08) in the coach engine and a fix silently did nothing. Patch scripts
  go through the Write tool; `cat -A` finds the damage.
- **The browser pane is hidden**, so screenshots can show a stale frame and
  pointer actions can time out. Read the DOM to confirm state; drive presses by
  dispatching the full pointer sequence, and use `history.pushState` +
  `popstate` to move between routes without losing the helpers defined on
  `globalThis`.
- **A long pointer hold does not drive react-native-web's responder** from
  synthetic events; the keyboard route does, and Playwright's real mouse plus
  `page.clock.runFor` does. Both are exercised in `scripts/e2e.mjs`.
- **Look at the product, not only its tests.** `pnpm shots` renders every screen from a seeded store; `SEED=scripts/fixtures/<store>.json` for the empty, many-goals, long-lines, long-game and full-track stores (each is a `.mjs` that derives from the seed — regenerate the `.json` after editing); `FULL=1` for the whole screen however long it scrolls; `DARK=1`, `REDUCED=1`, `W= H=` for the other conditions. Most of what the fourth audit missed was found this way in an afternoon. `pnpm test:a11y` takes the same `SEED=` and `DARK=`.
- **`sed -i` on this machine eats backslashes in replacement text** the same way heredocs do (a `.json` became `.json`). Regexes and escapes go through a Write-tool patch script.
- **After a fan-out, check `git status` and file mtimes before staging.** The
  first audit's subagents edited twelve product files they had been told not to
  touch.
