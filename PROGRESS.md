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
- [x] 4. Tests: 104 core + 30 contrast unit tests, 40 Playwright e2e checks, all green
- [x] 5. supabase/: migrations with RLS and three structural authorship guards, edge functions
- [x] 6. Hardening: the eight-lens audit's findings, worst first (see below)
- [ ] 7. Research pass: libraries/versions; improvements; repeat

## In flight
- Nothing. The tree is green and committed: `pnpm verify` runs typecheck, 112
  core tests, 30 contrast measurements, the edge-function guards, the SQL
  structural guards, the serif authorship guard, the web build and 40
  end-to-end checks. Start at "Next steps".
- The audit list below is worked through: 95 of 95 closed.
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
pnpm test                       # 104 core + 30 contrast unit tests
pnpm test:sql                   # RLS on every table, the three authorship guards
pnpm test:authorship            # nothing but the user's words in the serif
pnpm build:web && pnpm test:e2e # 40 end-to-end checks, serves dist itself
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

## Blocked on the user
- Supabase project URL/anon key, Anthropic API key, fal.ai key, RevenueCat keys: needed to test real providers. Everything runs on local fallbacks without them.

## Decisions log
- 2026-09-09: start. Stones via react-native-svg (works on web for Playwright tests) rather than Skia; Skia can replace later for grain.
- 2026-09-09: local store = zustand + AsyncStorage persistence for Phase 1 speed; SQLite/Drizzle migration is a hardening step once screens exist.
- 2026-09-10: the authorship rule is enforced in four independent places rather than one — `verifySpans`, `validatePlan`, `authorshipRatio`, and again in SQL. `guarded()` re-checks what the server already checked. Deliberate duplication: a person writing their own life should not depend on any single process being correct.
- 2026-09-10: the timed rituals are tested with Playwright's `page.clock` rather than a test-only fast-forward hook, so the fifteen minutes in the test is the same fifteen minutes the product ships.

## Next steps

In the order they matter. The first two need a machine or a key this one does
not have, and they are the only things standing between the current tree and
something a person could actually use.

1. **Build it natively, once.** `cd apps/mobile && npx expo run:ios` (or
   `run:android`, which needs an Android SDK this machine does not have).
   Everything so far has run through react-native-web. Autolinking and the
   manifest are verified via prebuild, so what remains is what only a device can
   show: the fonts, the hold gesture, the drag on Today, the safety card, and
   Dynamic Type at 200%. This is the largest untested surface in the project.
2. ~~Run the Supabase migration against a real Postgres.~~ **Done** — see the
   research pass. Still worth one `supabase db reset` against the real service
   before launch, because PGlite is Postgres but Supabase is Postgres plus its
   own roles, extensions and `auth` schema, and this test stubs the last of
   those.
3. **Wire the real providers** once the keys below arrive, and confirm
   `guarded()` still refuses what it should when a real model is behind it.
   Every one of those paths is currently exercised only against LocalProvider.
4. **A second audit, at a fifth of the width.** The last one was 294 agents and
   died on the spend limit, which cost the verifiers for 5 of 8 lenses; those
   findings had to be checked by hand. Eight lenses with one verifier each is
   ~30 agents and would have caught the same things.
5. Then loop: implement, test, harden, research, repeat.
