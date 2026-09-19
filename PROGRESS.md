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
- [x] 4. Tests, as of 2026-09-18: 483 core + 48 ui + 8 storage unit tests, the eval harness
      (647 checks over forty profiles and two hundred labelled lines), 68 real-Postgres
      checks, **517 Playwright e2e checks**, 84 cold-open checks, 7 service-worker checks, axe 0 across 37 screens,
      the account round-trip 46/46 against the live project — all green, all in `pnpm verify`
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
- [x] 57. **The microphone rests when you do, and hears your own English, 2026-09-20.**
      Away from the screen — a call, another tab — the recogniser used to fail in
      the background and report "the microphone was not allowed" to a person who
      had only looked away; now it rests on `AppState` and listens again on
      return, every word kept, the screen lock asked for again once (the old one
      released on this side first, so the module's map never holds two). In a
      browser the room asks in the browser's own English — en-GB, en-IN, en-AU —
      with en-US behind it: a browser that turns the regional one down
      (`language-not-supported`) is asked again in en-US, once. e2e: away and
      back with the words kept and one lock held; the browser's English; en-GB
      turned down and en-US listening. 517/517.
- [x] 56. **The front door, one screen; the voice doorway honest, 2026-09-20.** The
      client read Welcome's three pages as a wall ("they can't even reach the main
      page"). Welcome is one screen now: the stone, what this is, a first name if
      they like, and two real buttons — Begin tonight · about 30 minutes, and Look
      around first (a new `GhostButton`: the ink button's size and edge, outlined).
      No pages, no Skip, no dots; the persona lives in You. Today's empty state is
      the introduction it used to be: "Hello, Sam.", what the room is for, a card of
      the three evenings with their lengths, the first evening as the one button,
      everything rising in on the standard stagger. Voice: a browser that cannot
      listen (Firefox) is not offered Say it — one line names the browsers that can
      — instead of a chip that led to a typed room with an apology; a coral pulse
      breathes beside "Listening" and is still under reduced motion; and on Chrome
      139+ the recogniser is asked to keep the sound on the device
      (`processLocally`, only where `SpeechRecognition.available` says it can, no
      language pack downloaded) with a fallback to the ordinary way if the browser
      then says it cannot. e2e: Welcome's one screen and both doors, Today's
      greeting, card and button, the no-voice doorway, the pulse on and off, the
      on-device ask. 511/511.
- [x] 55. **Two lines the room owed, 2026-09-19.** Say it chosen and the
      microphone refused: the room became a typed one without a word, because
      the line that says why lived only in the microphone row, which a typed
      room does not have. Found in the desktop app's own browser pane, where
      the microphone is blocked outright — the first real browser to refuse
      it. The line now stands on its own under the page, and on the web it
      says where to allow the microphone ("Allow it for this site in your
      browser, then choose Say it again"). And a sitting left with nothing
      on the page came back as "0 words are still here"; the clock is what
      comes back (PRD: "the timer resumes once"), and the doorway says so:
      "Nothing was written yet; the clock picks up where it stopped." e2e:
      the refused microphone (typed room, the line, no screen lock), the empty
      sitting offered back for its clock with the honest line, Carry on
      picking the clock up where it stopped. 503/503.
- [x] 54. **Offline, awake, and walking (§7.5, §10.4), 2026-09-18.** A service
      worker (`apps/mobile/public/sw.js`): the page is network-first so a new
      deploy is picked up on the next open, the hashed statics, icons and
      manifest are cache-first, and the app opens with no connection once it
      has loaded once — checked with the server stopped. Playwright's walks
      skip the worker (`navigator.webdriver`), so the tests see the server,
      not a cache; `pnpm test:sw` drives the worker itself in a Chromium that
      does not say it is automated — first load, a second deploy under a new
      hashed name (the old statics' cache dropped, the new one kept), then
      the server gone and the app still opening. The statics live in a cache
      named for the shell that loaded them, so a deploy does not leave four
      megabytes behind for good. The practice runner keeps the screen awake (§7.5: "the
      runner keeps the screen awake"), and so does a room being spoken into —
      nobody is touching the screen, and a phone that locked would take the
      microphone with it. `expo-keep-awake` behind one component
      (`KeepAwake`), mounted for the runner and for a spoken sitting only;
      on the web it asks for the lock again when the tab comes back, which
      the module alone does not. "Walk and say it" is now a different room
      from "Say it": the words are set at 24/36 for a phone held at arm's
      length. e2e: the lock is scripted and counted — the runner holds one
      and lets it go on the way out, a spoken room holds one and Done for
      now lets it go, a typed room asks for none, the walk holds one and
      sets its words larger, and its doorway says so ("The screen stays on and
      the words are set large").
- [x] 53. **The web shell (§7.14, §9.1), 2026-09-18.** `apps/mobile/public/index.html`
      replaces Expo's template: the studio ground as the first paint in both
      schemes (no white flash on a dark phone), `viewport-fit=cover`, a
      description, and the manifest and icons that let a phone keep the site
      on its home screen as an app (standalone, portrait, 192/512/maskable and
      an Apple touch icon, generated from the app icon). The two static
      servers serve `.webmanifest` with its type. Walked: the manifest loads
      as `application/manifest+json`, the icons answer, both theme-colours are
      in the head, the body is the ground before the bundle. Also today: the
      doorway's eyebrow is "The Fifteen" (it wrapped), its two notes are one,
      and a tapped chip on a stone says "That is the way in. Now the line, in
      your words" while the button still waits — the thing a first user read
      as a form left blank. The whole walk, frame by frame (`pnpm journey`,
      262 frames), read through: nothing broken on any screen.
- [x] 52. **Done for now (§7.2), 2026-09-18.** The writing room's floor is a length,
      not a lock. Before the ten minutes the only door was "Leave for now", which
      kept a draft and went nowhere, behind a countdown ("N min before this
      counts"). Once there are words, "Done for now" closes the room and the
      sitting goes on like any other — the read-back, the Book — with a closed
      card that says what happened: every word kept, the whole fifteen there
      whenever they want it. The doorway says so before the clock starts. A
      separate demo build with short clocks was built and reverted the same day:
      the user wants the prototype itself to be the thing shown, so the door is
      in the product. Eight e2e checks.
- [x] 51. **The home screen is not behind the introduction, 2026-09-17.** "Have a
      look around first" on Welcome's last page opens Today, honestly empty —
      the path and its doors — and Back is Welcome with the name kept. The full
      Today still comes with the Book, as the PRD has it; nobody is made to
      write before seeing the room they are writing for.
- [x] 50. **Say it, in a browser (§7.2), 2026-09-17.** The Fifteen's microphone
      heard one sentence and stopped: the speech module's web shim starts a
      fresh recogniser on every `start()` without stopping the last, so the
      restart after each final stretch aborted the one before it, the abort
      fired an `end`, the `end` started another, and the room went deaf after
      its first line. The browser path now drives the Web Speech API itself —
      one recogniser, every stretch kept, listening again when the browser
      stops on its own — and the room's Listening chip is a switch (off for a
      breath, on again) rather than a one-way door to typing; a pause of the
      clock is a pause of the microphone, and carrying on listens again. Eleven
      e2e checks drive a scripted recogniser through all of it.
- [x] 49. **The eval harness, reviewed (2026-09-17).** One adversarial sweep over
      the harness and the fixes it drove — four code reviewers, two judges
      reading every artefact the forty profiles produce, a skeptic per finding —
      ran into the account's spend limit with 33 verdicts unwritten; those were
      verified by hand. Thirty-one findings fixed, from the identity line cut at
      "6:40" to the brief's "not a failure" on every first morning to a
      recogniser that could not hear a second sentence. See "The eval harness,
      reviewed" below.
- [x] 48. **The eval harness (§11.8), 2026-09-17.** `pnpm test:eval`: forty synthetic
      profiles — four writers who write nothing alike, five parts of a life, both
      tracks — through the engines the product ships with, every check the PRD
      names asserted on each, and a 200-line labelled set for the safety screen.
      It found seven things on its first run, all fixed: the Full track's plan was
      cut from the paragraph, so a sixty-word move sat on Today; the 48-hour opening
      copy said "Tuesday:" on a Friday; a day named twice made the same card twice;
      the brief ran to 149 words against the PRD's 90; the identity line was lifted
      from the How line ("someone who is not on shift"); the screen missed seven shapes
      of the sentences it is for and flagged "starving after the swim". See "The eval
      harness" below.
- [x] 47. **Every sentence true of the code, and every name beginning with its label,
      2026-09-17.** Two rules the day's reviews kept finding on old screens, swept
      across all thirty-eight: twenty sentences that promised what the code did
      not do, or denied what it did, each made true — by the code where the
      promise was the right one (a milestone notice the settings named and the
      planner never sent; a new move that "lands at the top" and was appended
      to the bottom; a "Keep this line" that kept nothing on its first press),
      by the words where the code was right (a capture a letter may quote; a
      share sheet that cannot say what was sent; the account ask that comes
      before the Book). See "The sentences" below.
- [x] 46. **The shift calendar (§7.12), 2026-09-17.** The weekdays that keep other
      hours, and the hours they keep, under Your day: ticked days, then the
      shift's morning (a midday, if that is the morning) and evening (a small
      hour, if that is the evening). `timesFor(profile, day)` is the day's own
      pair, and the planner, the brief, the quiet hours and Today's primer all
      ask for it; a night-shift Wednesday hears its morning line at one in the
      afternoon and its quiet runs through the morning. Migration 0011, applied
      live. The Sunday hour shortens the quiet on a Sunday only, which the
      shift test found it had not been.
- [x] 45. **The review of the day's five commits, 2026-09-17.** One adversarial sweep
      over the diff since 5a7de00 (five reviewers, a skeptic per finding, a
      completeness critic): 14 findings confirmed, 12 gaps. All fixed, the two
      severe ones first: a goal let go kept its Blueprint running on Today and
      in the brief; and `+native-intent` returned null for every link that
      already named a route, which expo-router reads as "drop the link". Also
      the PRD's own Let it go question ("What did it turn out to be instead?")
      where a line of my own had stood. See "The review" below.
- [x] 44. **The 16+ gate (§12, §3.5), and every disabled button announced as such, 2026-09-17.**
      Consent now says who Morrow is for and waits for one tap — "I am sixteen or
      over" — before Continue is live; the consent timestamp is the record of the
      screen, that affirmation included. Checking that Continue waited found that
      no disabled button in the app had ever reached the DOM as disabled:
      react-native-web's Pressable writes `aria-disabled` from its own `disabled`
      prop and overwrites the one passed in. `InkButton` and `HoldBar` now pass
      `disabled`, so a waiting button, and a seal already made, are heard as such.
- [x] 43. **Your day (§7.12), 2026-09-17.** Wake and evening times, the Sunday hour,
      the day boundary, and the chronotype as a preset over them (Lark, In
      between, Owl), as chips under You. Quiet hours follow the person's own
      times — an hour after the evening line until the morning one, which is
      the PRD's 22:00–07:00 exactly on the defaults — so a lark's 05:30 line is
      no longer moved to seven and an owl's 22:30 line is not pushed to the next
      morning. Today had promised "the times are yours to change under You"
      before there was anywhere to change them. The shift calendar is not built.
- [x] 42. **Deep links (§9.3) and a link to nowhere, 2026-09-17.** The PRD's link
      shapes (`morrow://goal/{id}`, `/goals/[id]/stone/[kind]`, `/book/sunday`,
      `/practice/{id}/run`, `/settings/memory`, and the rest of the inventory)
      resolve to the routes the app has, on native through `+native-intent` and
      on the web through `+not-found`; a link that names nothing lands on Today,
      never on the router's "Unmatched Route" page; a sign-in link is left alone.
- [x] 41. **What Morrow knows about me (§7.9, §7.12), 2026-09-17.** The memory
      profile, screen 27 of the inventory and the product's answer to the
      companion-chatbot row of §3.5: every line built from something the person
      wrote or did, none inferred; theirs to change (locked against the rebuild)
      or forget — and a forgotten stone leaves the coach's hands, so the brief
      and the chips stop quoting it. One row per person on `memory_profiles`
      (migration 0009, applied live), carrying the edits and the document a
      model coach would be handed. See "What Morrow knows" below.
- [x] 40. **Day-90 re-authoring (§7.3), 2026-09-17.** The calendar is Morrow's:
      ninety days after the latest seal, and every ninety after, Today carries a
      card for a week. Two Books side by side — every sealed line printed as it
      stands, Keep on, Rewrite beside it — and Rewrite opens the same stone with
      the sealed line above an empty field. Let it go asks for the one line about
      what it turned out to be instead (migration 0008, applied live), archives the goal, and can be
      taken back until the seal. The new edition is sealed with the hold; the
      diff — kept, written again, new, let go, and the lines — is its first page
      on the Book, in the Sunday reading, and in both exports. On the free plan
      the door is the paywall at the moment the PRD names, and Not now is Today
      with nothing lost. See "Day-90 re-authoring" below.
- [x] 39. **The Declaration (§7.17), the part of it that needs no key.** On the day
      the Book is sealed, and any day after: the I will line across the person's
      own photo (camera or library, through the platform's picker; the night
      ground with no photo), kept in Photos, shared, or sent to one named witness
      — through whatever the person already uses to reach them. The witness is a
      name on the profile (migration 0007, applied live); a sealed evening with a
      witness offers "Tell <name>" — the count and the line, nothing written that
      day — and waits instead of closing itself. The Book and Settings both open
      it. Gift a chapter stays behind the store keys. See "The Declaration" below.
- [x] 38. **The volumes verified the way a person uses them (2026-09-16).** Twelve
      rounds after the three volumes shipped — seven adversarial passes while the
      account allowed them, then by hand — each a new class of check, each finding
      real defects: a data-loss draft gap in both new volumes; the platform back
      that never fired on web; four sync bugs a restore would have shown; "Written"
      meaning the first card; the stones and the evening seal keeping nothing typed;
      four screens crashing into the error boundary on a fresh install; the chooser's
      footer under "Not now". All fixed and pinned. New gate steps: `test:cold`
      (every route on an empty store and with ids pointing at nothing) and the
      screenshot pass read by eye at 320 × 568. Both loose threads tied: a fault is
      offered on its goal's Obstacles stone, a paired virtue sits on its goal's page.
      `pnpm demo` serves the verified build; `scripts/fixtures/filled.mjs` builds the
      store with all three volumes written for progress screenshots. The full
      account is under "The three volumes" and the paragraphs after it.
- [x] 37. **Every screen keeps what is typed, and every Back goes somewhere.**
      Present, Past, the stones, the evening seal, the Interview's ticks; consent's
      dead Back; the closing screens that wiped the other half's sitting. See the
      same section.
- [x] 36. The web build is ready for Vercel: `vercel.json` (build, output,
      immutable asset caching, the SPA rewrite), the two EXPO_PUBLIC vars, and
      the auth allow-list note; `http://localhost:8790` added to the project
      redirect URLs and pushed
- [x] 35. **The Past and Present volumes, complete.** Named in the product
      exactly Past, Present and Future, chosen from "Work on your:" with a
      fourth door that explains all three; each path proceeds the way the
      source's own program does. Engines, decks and copy, migration 0004 and
      0005, store and sync, five screens, both volumes in the sealed Book on
      both sides of the authorship guard, e2e 233, axe 0 × 33. Was: The client asked for all
      three, named plainly (Past / Present / Future, no "Authoring"), chosen from
      a four-door screen, each path proceeding the way the source program does.
      The researched flows and Morrow's versions are written down in
      "The three volumes" below; build order and state are there too. If this
      session is cut off, read that section first.
- [x] 34. The three AI functions speak to any OpenAI-compatible provider
      (LLM_BASE_URL / LLM_API_KEY / LLM_MODEL) or to Anthropic; the user is
      not using an Anthropic key, so none is required
- [x] 33. The ceiling on the AI functions counted in the database (0003) and
      proven on the project; the seven-day sweep on pg_cron (0002); the
      migration test runs every file (44 checks)
- [x] 32. Supabase, the rest: the four edge functions deployed, the auth
      config pushed (a PAT from the owner; `pnpm sb`), sign-in from the email's
      link (the free tier keeps the templates), a CORS bug in every function
      found and fixed by the round trip, Close the account through the
      deployed function; `pnpm test:account` 36
- [x] 31. After the list: every non-root screen on TopBar (eleven hand-rolled
      rows converted), the clock can be hidden, orientation unlocked, the
      doorway and the closed card scroll; the title on its own page; the
      Book and Progress have headings; the persisted drafts are checked before
      they are trusted; looked at at 320×568, 844×390 and in the night studio;
      e2e 198, axe 0 × 28
- [x] 30. The research, and what it changed: four passes over current
      accessibility and first-run practice (WCAG 2.2, WCAG2Mobile, Apple HIG,
      Material, NN/g, GOV.UK, COGA, RN's own docs), each audited against the
      app, merged into 36 items (`design/audits/accessibility-first-run-2026-09-13.md`);
      all 8 P0 and 12 of the 13 P1 items done, most of the P2 — see "The
      research, and what it changed". Gate now 374 core / 48 ui / 8 storage,
      37 migration, way-back guard, a11y lint (13 rules), 191 e2e, axe 0 × 26.
- [x] 29. The account, round-tripped against the real project
      (`pnpm test:account`, 30 checks): push, RLS from a stranger's side,
      wipe, pull, field-by-field the same; the schema applied to the project
      with `pnpm db:push`; only `functions deploy` / `config push` wait, on
      the owner's CLI login
- [x] 28. Halfway along the path the app opens on the next step
      (`firstRunStep`): Welcome and a Bookless Today both point at it, with a
      line about where they are; a guard that every screen has a way back
- [x] 27. The first run, for somebody who has never used a thing like this:
      Welcome as the PRD's three screens (what it is; three evenings and what
      they make; your name and how you want to be spoken to), `← Back` in the
      same place on every screen that is not Today — the Interview's Back
      undoes one answer and keeps the rest — a "where you are" label on the
      first-run path, and the first Today explaining its stone and its check
      once (173 e2e)
- [x] 26. Supabase, as far as the CLI-free parts go: the project's URL and
      publishable key in `apps/mobile/.env`, `pnpm db:push` / `pnpm db:find`
      (the direct host is IPv6-only; the pooler is in Singapore), the build in
      two modes so the tests never reach the network; hover on the web build
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

Nothing is half-done. Four audits are closed — 95, 37, 47, then 43 — the
eval harness has been run and reviewed, and the app has been walked end to
end in a browser on the built bundle, frame by frame, rather than only
tested. What is left needs a machine or a key this one does not have; see
"Next steps".

- The tree is green and committed. `pnpm verify` runs the toolchain guard,
  the date guard, the copy guard, typecheck, lint, 483 core tests, 48 ui
  tests, 8 storage tests, the eval harness (647 checks), the edge-function
  guards, the SQL structural guards, 68 checks against a real Postgres, the
  serif authorship guard, the way-back guard (33 screens), the web build
  (offline), 517 end-to-end checks, the axe pass over 37 screens and 84
  cold-open checks. Against the real project: `pnpm test:account`, 46 more.
- **The account's spend limit is the month's, not the run's.** The fourth
  audit was ten agents and 1.59M tokens and tripped the monthly limit with
  two verifiers still running; a review workflow did it again on 2026-09-17.
  No more fan-outs; the loop is solo, and findings are verified by hand.
- The account is wired end to end and has talked to the real project: the
  round-trip (`pnpm test:account`) signs in, writes, reads back and deletes
  against the live Supabase. In every test build `hasSupabase` is false, so
  the account screen, the Settings row and the launch-time push are present
  and dormant until `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist.
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
  was not built then (it is now, 2026-09-17, and the line is back); the crisis
  card said nothing was sent anywhere, which is
  untrue with a remote screen; the consent screen now names the safety
  screening and the scene.

## What Morrow knows (2026-09-17)
Built and verified; see the dated entry above. The pieces:
- **Core** — `engines/memory.ts`: `buildMemory`, `applyMemoryEdits`, `memoryEditOf`,
  `forgottenLineIds`, `memoryDocument` (`MEMORY_DOCUMENT_CHARS`), `MEMORY_ABOUT_ORDER`.
  `types.ts`: `MemoryEdit`. `sync.ts`: `memory_profiles` (second in `TABLE_ORDER`),
  `memoryEdits` and `memoryDocument` on the bundle.
- **Store** — `memoryEdits`; `editMemory`, `forgetMemory`, `restoreMemory`; `memoryLines(s)`
  and `coachAnalyses(s)` — the brief and the coach screen read the latter.
- **Screens** — `app/memory.tsx`; the door on `app/settings.tsx` (`settings-memory`).
- **Sync** — `src/sync.ts`: the row's conflict target and key are `user_id`.
- **Schema** — `0009_memory_profiles.sql`, applied live.
- **Checks** — `test/memory.test.ts`; the sync round-trip; the migration test; the e2e block
  after the day-90 one; `/memory` in the cold and a11y sweeps; the account round-trip's row.

## Day-90 re-authoring (2026-09-17)
Built and verified; see the dated entry above. The pieces, for whoever opens it next:
- **Core** — `engines/reauthor.ts`: `reauthorDue` (the calendar), `reauthorLabel`
  ("Day ninety"), `sideBySide` (the two Books), `plusDays`. `engines/book.ts`:
  `diffBooks(previous, next, lessons)` with `added` and `lessons`, `diffLines`, and the
  diff as `bookPages`' first page for any edition after the first; the text and HTML
  exports print it. `entitlement.ts`: `canReauthor`. `types.ts`: `Goal.lesson`,
  `Goal.letGoAt`; the diff's two optional fields. `sync.ts`: the two goal columns.
- **Store** — `letGoGoal`, `takeBackGoal`; `activeGoals` excludes archived; the seal
  builds from active goals and lays the diff onto the edition.
- **Screens** — `app/reauthor.tsx`; `app/stone.tsx` in rewrite mode (`rewrite=1&from=`);
  the card on `app/today.tsx`; `src/components/DiffPage.tsx` on the Book and in the reading.
- **Schema** — `0008_let_go.sql`, applied live.
- **Checks** — `test/reauthor.test.ts`; the e2e's day-90 block at the end of the walk;
  `/reauthor` in the cold and a11y sweeps.

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

### The three volumes: Past, Present, Future (2026-09-15)

The client's decision: all three volumes ship, named in the product exactly **Past**,
**Present** and **Future** with nothing appended, chosen from a screen that reads
"Work on your:" with a fourth door, "Not sure? Let's explore." Each path proceeds the way
the source program does. Read selfauthoring.com on 2026-09-15 for the real flows rather
than working from memory; what it says, so that our differences are deliberate:

- **Order.** Their FAQ: "You should do it in the order that you think will benefit you the
  most." Suggested: faults, then Future, then virtues, then Past. Exception: if something
  in the past is still causing trouble, start there. Their Past page: "the most difficult
  and time-consuming of all the programs… complete it after the Present and Future
  Authoring programs". Each program 4–5 hours over several sessions, and they cap the
  length of every answer so nobody exhausts themselves.
- **Present — faults.** Pick from lists clustered by factor; **narrow** to the ones that
  affect you most; per fault write (a) a time it caused you trouble, (b) what you might
  have done differently.
- **Present — virtues.** Same shape; per virtue write (a) a time it helped you get
  something you wanted, (b) how to use it more effectively.
- **Past.** Divide your life into **seven epochs**; identify the most significant events in
  each; describe how each shaped who you are today.

Ours, and the differences on purpose: no trait names, no factor names, no scores — the
cards are plain first-person sentences of our own ("I start things and drift"). The
fault's second write is "what you would do instead", which becomes the If/then of that
goal's Obstacles stone, so the Present volume feeds the plan the Future volume made. The
virtue's second write names the goal that needs it. Past keeps the epoch structure
(Starter 4 epochs, Full 7; Starter analyses 3 events, Full 10) behind a doorway with a
plain warning, the helplines one tap away on every screen, an exit that keeps what was
written, and a per-event choice about whether it joins the Book.

**Build order** (each step gated the way Future is — core tests, store, migration against a
real Postgres, e2e, axe, the way-back guard, the a11y lint):
1. ~~types + engines (`present.ts`, `past.ts`) with tests~~ — done, 403 core tests
2. ~~store, migration (0004), sync~~ — done; `present_picks`, `past_epochs`, `past_events`,
   RLS written out per table, owner checked by trigger, round-tripped in a test
3. ~~screens: `/choose`, `/explore`, `/present`, `/past`~~ — done, and reachable: consent
   leads to the three doors, a Bookless Today offers the other two, You keeps a way back
4. ~~e2e through all three doors; axe~~ — done: 233 checks, axe 0 across 33 screens
5. ~~the two new Book chapters~~ — done, and the interesting part was the
   authorship guard. Was: A `BookChapter` is goal-shaped
   (`goalId`, `name`, `horizon`, `lines`, `memories`) and neither new volume is, so
   `BookVersion` needs a place for volume writing — and the authorship ratio is
   computed twice, in `engines/book.ts` and again in SQL
   (`0001_init.sql`, the `contents` jsonb walk near line 650). Both sides must count
   the new prose identically or a sealed Book will disagree with its own row. Card
   text and framing labels are the app's words and must NOT count as the person's
   (the deck agent flagged this: a chapter made mostly of card text would fail the
   0.95 floor). Done exactly that: `BookVersion.volumes` holds the two, the ratio counts
   only what the person wrote (the card's sentence and the framing label are printed as
   headings and count as neither side, like a framing label in a chapter), migration 0005
   teaches the SQL the same arithmetic, and it was checked against the live project — a
   Book whose only "generated" text is a twenty-character card comes back at 1.0, not
   0.33. The two new pages sit after the goals and before the "I will", in the reading and
   in the export. A Book still needs a goal to exist, so somebody who does only Present or
   Past keeps that writing until a Book is sealed, and it joins the first one.

**Two bugs the walk-through found, both fixed and tested** — worth knowing about because
the same shape could recur in any multi-step screen: the walk through the Past periods was
derived from "the first period with no events", so adding one event ended the period (a
second could never be added) and a period left empty on purpose pulled the person back to
it forever; and the picking screen jumped to the writing the instant the last event was
tapped, leaving its own button unreachable and a pick impossible to reconsider. Both are
now the person's to advance (`pastListed` in the store, `picked` on the screen).

**Parity with Future, closed (2026-09-15).** The audit that followed compared the two new
volumes line by line against the reference path and found four things Future had that they
did not — one of them a data-loss bug:

- **No draft.** Present and Past held twenty pieces of state on the screen and persisted
  none of it; a phone call mid-sentence lost the sentence. Future's writing room has
  always autosaved. The source is explicit that its programs are meant to be done across
  several sittings, so this was a fidelity break as much as a parity one. Now
  `presentDraft` / `pastDraft` in the store, written as they type (the picks, the card
  being written, both lines and the sign; the age, the period the walk is on, the events
  picked, and all three boxes). A reload lands on the same card with the words still in
  the box; the e2e kills each volume mid-write and checks exactly that.
- **No announce().** Future says each question and each stone to VoiceOver; the new
  volumes said nothing. Each step now announces itself once, and "Kept." on a save.
- **No platform back.** The Android button, iOS edge swipe and browser arrow left the
  volume instead of undoing one step. `beforeRemove` now mirrors the bar's Back in both.
- **No way back in from Today.** Today's path card knew only the Future volume. A single
  "Carry on with …" row now offers whichever volume was touched last — one, never a list.

Two bugs found on the way: Back from a Present write *dropped the card* (a delete dressed
as an undo); it now returns to the deck with the picks and the half-typed text intact. And
`router.replace('/present?half=…')` did not remount, so the faults just finished stayed
ticked on the virtues deck; the screen is now keyed on the half.

Gate after: 407 core / 48 ui / 8 storage, e2e 245/245 (was 233), axe 0 across 33 screens,
way-back 30 screens, typecheck clean, lint 0 errors (the 38 "ref during render" warnings
the first cut introduced are gone — lazy `useState` captures, not `useRef().current`).

**The second audit, and the flow the client walked (2026-09-16).** A four-lens fan-out
(Future parity, source fidelity, hardening, a brand-new user) with one skeptic per finding
returned 19 confirmed and 0 refuted; they fold into thirteen changes. The client's own
report the same evening — age entered in Past, Back, Begin, and no way to enter the age
again — was one of them. What changed, and the two product calls taken:

- **Two product calls.** The Full track's floor drops from six picks to one
  (`narrowTo('full')` is now `{ min: 1, max: 9 }`): a floor of six made a person with four
  true faults tick two false ones, and left an honestly finished half counted as unfinished
  on the chooser. And **crisis is the only verdict that holds a line out of the Book** —
  Present and Past used `safetyRisk === 'none'`, so a concern-band line was excluded
  silently with no way to reconsider, while the same line as a Future stone sealed. Both
  volumes now use `isQuotable`, the same rule as everything else.
- **The source's narrow move exists on Full.** The deck takes everything that is plainly
  true (forty cards, no cap), and past nine the button reads "Narrow these N" and opens a
  step of only the ticked cards, down to nine. Starter's deck still stops at three: there,
  three is the narrowing. The deck note says which it is doing.
- **An un-tick is a real un-tick.** A written card taken off the deck stayed in the store
  and printed in the Book. Now the deck's picks become the half's picks at the commit
  ("Write about these N"), with a line above the button saying what going on lets go of;
  until then it is reversible, the way Back is an undo everywhere else. Ranks are
  recomputed from the deck's order at the same moment.
- **A bare door goes to the right half.** `/present` with no half opened the faults deck
  even when the faults were written; it now opens the sitting that was left, else the half
  not yet finished — decided once, when the door opens, because deriving it live swapped the
  closing screen out from under the person the moment the faults finished. A finished half
  opened by name lands on its closing screen, not on a deck of inked cards. The chooser's
  door says which half is written.
- **Past's Back was dead** once every period held an event: the engine derived the walk's
  end from the data. Now `pastStep` stays on the walk until `listed`, and Back from the
  picking screen is the last period with the picks intact.
- **The age screen is the periods screen** (the client's report). Begin lands on it every
  time with the age in the box if known; the periods it cuts are listed under it and can be
  renamed (`epochs.title`/`epochs.note` were shipped copy with no screen); Back from the
  first period returns to it, not the doorway; changing the age re-cuts the periods and the
  events follow their period's place in the order rather than vanishing.
- **Nothing typed is thrown away.** "Next period" keeps a title typed and not yet added
  (the button says so: "Keep it, then next period"); an empty Add says "Give it a few words
  first"; a full period says "That is 2 for this period" instead of hiding the field; the
  last period refuses to go on with nothing listed anywhere. The choose step's floor is one
  ("Go into this one"), the ceiling stays the dose.
- **Held lines are said.** A Present line written in crisis announces "Kept on your phone,
  and out of the Book" rather than "Kept.", and the closing screen lists each held card.
  The closing copy no longer claims things the app does not do (the coach does not read
  these; nothing pairs a fault with a goal yet). Virtues with no goals ask "Where will you
  use this next week?" instead of "Pick the goal".
- **`pastListed` travels with the account** (migration 0006, a boolean on the profile row,
  pushed to the live project). A restore used to reopen a finished Past on the walk.
- Smaller: the Present closing screen scrolls at large type; a resumed selection is
  filtered against the deck, so a Full-only card cannot strand a Starter deck; a Past
  reopened to reread and backed out of leaves no "Carry on" behind it; the other half's
  draft is never overwritten by opening a door.

Gate after: 411 core / 48 ui / 8 storage, migration 53 checks with 0006, e2e **286/286**
(was 245; the new checks walk the un-tick, the finished-half door, the crisis hold, Full's
narrowing and the whole Past walk including the age report), axe 0 across 33 screens,
way-back 30 screens, typecheck clean, lint 0 errors.

Still open from the audit, deliberately: one Present draft slot (a live virtues draft is
replaced by ticking a card on the faults deck — the door routing makes that a chosen act);
the fault's answer is not yet wired into the Obstacles stone and no virtue is offered for
pairing at the read-back, so the copy claims neither.

**The verify pass on that round (2026-09-16).** A second, smaller fan-out over only the
changed files — one skeptic per finding — returned 8 confirmed and 2 refuted. Four were
sync bugs the round had introduced or exposed; none of the local suites could have seen
them, because none of them pull from the account:

- **A restore scrambled the periods.** The account returns rows ordered by id, a period's
  id carries its ages, and digits collate before letters — so a restored Full-track walk
  read "19 to 24" as period one, and the ordinal remap then moved "Before school"'s events
  under "25 to 30". `fromRows` now orders periods by position (then age) and events by
  position (then time), and the remap (`recutEvents`, now in the engine with its own
  tests) takes the old periods by their own position, never by array order.
- **A second unique key the upsert missed.** `present_picks` is unique on
  (user, half, card); a card let go and written about again is a new row with the same
  card, and the account's old row refused every push after. The upsert matches on the card
  now, and the account round-trip does exactly that sequence against the live project.
- **The push gate counted only the Future.** A phone that had done only the Past volume
  was told "Nothing to copy yet", and signing it in to an account with a Book replaced
  that Past with the account's nothing. `hasWriting` counts all three volumes.
- **A re-cut to fewer periods dropped the overflow.** It now lands on the last period
  (the events screen tolerates a period over its cap), the age screen says so above the
  button, and the label says "into N" when the count changes.

And four on the screens: typed lines followed the person from card to card (un-tick the
card you started and the next opened with your words in its boxes) — each card now holds
its own, and the draft carries all of them; Back to the deck rewrote the draft with no
writing, so a kill on the deck lost the half-typed lines — the draft keeps them whether the
writing is open or not; the platform's back on Full's writing screen was swallowed by a
stale listener; and a finished Past reopened on the picking screen, where one Back
un-finished it — it opens finished now.

**The platform back never worked on web, anywhere.** Chasing that "stale listener" with a
probe (a Playwright script that pushes a screen from the chooser and presses the browser's
back) showed the truth: `beforeRemove` never fires on web. expo-router's forked
`useLinking` answers a popstate with `navigation.resetRoot(record.state)`, and a reset
emits no `beforeRemove`, so the Interview's, Present's and Past's listeners were all native-
only — the Interview's e2e check passed by accident of a reload. Now one hook,
`usePlatformBack(canStepBack, stepBack)` in `src/platform-back.ts`, does both: `beforeRemove`
for native, and on web a `popstate` listener that runs before the container's, steps the
browser forward again and lets the screen step back itself. It is registered from the root
layout, because listeners run in registration order and the route screens are lazy chunks
loaded long after the container subscribes — registered from a screen it ran second and
found the screen already unmounted. All three volumes use it; the e2e presses the browser's
back on Full's writing screen, reached by the door.

**The newcomer walk (2026-09-16).** Three walks as three different people — a first
evening with twenty minutes, someone who came for the past, someone with a Book from last
week — with one skeptic per finding: 8 confirmed, 0 refuted. Every one of them is the
client's stated case, a brand-new person doing a volume and losing their footing:

- **A cold launch after a Present- or Past-only sitting showed Welcome page one again**,
  with a "Begin tonight" that went into the Interview and no way to last night's lines.
  The gate between Welcome and Today counted only the Future path. Now `hasBegunOf` in
  the store counts all three volumes and both drafts (a tick on the deck lives only in the
  draft until the commit), and Welcome reads it.
- **Today, with no Book, said "Nothing here yet"** over the very row that carried on the
  sitting. It now says what is there — "Your past is written.", "The faults are written.",
  "A sitting is kept." — using the same words as the chooser's door marks
  (`presentStanding` / `doorStanding`, now in the engine), explains that it joins the Book
  when one is sealed at the end of Future, offers "Reread your past" / "Reread your
  Present", and names the door "The three volumes" once anything exists.
- **"They join your Book" meant two different things and said neither.** With no Book the
  closing screens now say one is sealed at the end of Future; with a Book already sealed
  they say the writing waits for the next edition and offer **"Seal a new edition now"**,
  which goes straight to the seal — there was no way to seal again except by writing a
  whole new goal.
- **The Book tab never printed the two volumes** it counted pages for, and neither did the
  plain-text export; "Export everything" carried no Present or Past rows at all, which made
  the held line's "it still exports" untrue. The paper now prints "What I am like" and
  "Where I came from" in both layouts, `bookToText` prints them before "I will" (pinned by
  a core test), and the export carries the three volumes' rows, the listed flag and both
  drafts. "What Morrow knows about you" counts the cards and the events.
- **The Past's Book question decided on paragraphs it did not show.** It now prints the
  period, the title and all three parts of each event, says "All three parts go in as they
  are written here", and offers **"Change this"** per event — the analyse screen reopens on
  it with the boxes filled, Keep lands back on the question, Back abandons the change, and
  a kill mid-change resumes on it.
- Consent's top bar said "Before the Interview" while its button led to the three doors;
  it says "Before you write", and the on-device row names the decks, the periods and the
  events. The unrendered `stop.*` copy is gone.

**The verify pass on that round (2026-09-16).** Three lenses, one skeptic per finding:
8 confirmed, 0 refuted, and two of them the same shape as the round they checked:

- **The gate ignored the Interview.** `hasBegunOf` counted the other two volumes' drafts
  but not `interviewDraft`, so a person killed mid-Interview relaunched onto Welcome page
  one — the exact case just fixed for Present and Past. It now counts an Interview draft
  that holds something (`interviewKept`: an answer behind it, or an area picked); undoing
  every answer clears the draft rather than leaving the first question on disk as a
  "sitting"; Today's card says "A sitting is kept." over the resuming button.
- **"Reread your Present" opened a closing screen with no lines on it** ("in your words",
  over no words). The Present closing screen now prints every kept card with its two lines,
  the sign or the goal, and a held card's note under its own lines; and when both halves are
  written it offers the other half from there. Today's row follows suit: a written half is
  one tap away too ("Reread the faults" / "Reread the virtues"), not only a finished volume.
- **Begin, then Back, on the Past doorway left an empty draft** that Welcome and Today read
  as a kept sitting for ever. A draft that holds nothing — no periods, no age, no rename —
  is cleared wherever the person stands, and Begin alone no longer writes one.
- **A change re-screened the whole event** and silently undid a prior "not about me" and
  the Book choice. Only the boxes that changed are screened again; a verdict the person had
  cleared stays cleared unless that line is the one that changed; and the Book choice is
  never overwritten by the store — the seal and the chips gate on the verdict, so a cleared
  flag gives the choice back.
- "Export everything" now carries the Interview draft, the read-back rows, the spine and the
  "I will" line — the unsealed words a refused seal or the storage banner sends people there
  to save. A change from the Book question announces the event, not the question. The PDF
  sets the two volumes as the paper does (a rule and a plain heading, the card at reading
  size, the last line in full ink).
- Left as it is, on purpose: a renamed period prints as a heading in every printer and earns
  no authorship credit — the same rule as a chapter name, and the server counts the same.

**And the pass on that (2026-09-16).** Two lenses, one skeptic each: 6 confirmed, 0
refuted, one of them high:

- **The Present closing screen's two buttons wiped the other half's sitting.** "Now what
  you are good at" and "Another time" both cleared the store's one draft slot — fine when it
  held this half's draft, ruinous once "Reread the faults" made reaching a finished half's
  closing screen while a virtues sitting was live an ordinary two-tap path. The buttons no
  longer clear anything: this half's draft went when the writing ran out, and what the slot
  holds now is the other half's.
- **A held Past event raised the resources card again on every Keep**, even for a comma
  fixed in another box. The card now fires only for a box that changed and screens as
  crisis; the verdict and the Book choice are handled as before.
- A half written on Full and reread on Starter printed headless rows, or landed on an empty
  deck while the door said "written": the card's sentence is looked up across every deck,
  and the closing screen also closes when the half is written but none of its cards is in
  this depth's deck.
- The Interview keeps its ticks as they are made, so a kill, the platform's back and the
  screen's Back leave the same thing behind; Today's caption for an Interview-only sitting
  says Begin picks it up where it was, not that it "joins your Book"; and finishing the
  Present is counted by the store once, when the picks make it true, not on every reread's
  "Back to Today".

**"Written" meant the first card, not the last (2026-09-16).** The pass after that filed
the analytics event firing too early; reading the code for it found the event was the
smallest of its symptoms. `halfComplete` asks only about the picks — and a pick is a card
already written about, with a floor of one — so **writing the first of three cards marked
the half written everywhere**: the chooser's door said "The faults written", Today said
"Your Present is written." and offered to reread it, `volumeStates` called the volume done,
the closing screen's button read "Back to Today" with two cards still to write, and the
sealed Book's own door mark agreed. It was true on Starter from the day the volume shipped,
and Full only hid it until its floor dropped to one in the second audit; five passes missed
it because every one of them walked the volume to the end.

The cards still to write live in the sitting, so the sitting is what settles it:
`halfDone(picks, half, track, open)` is `halfComplete` plus "and every card this half's
open sitting holds has been written". `volumeStates` takes the sitting, the store hands it
over, and the chooser, Today and the Present screen all ask `halfDone` now. The analytics
event falls out of the same rule: the transition to written can only happen on the last
Keep of the second half.

Two more, both in the Interview: "Add another goal" returns to the areas question with the
shaped goals still in the draft, and un-ticking the last area threw them away — it clears
only when there is nothing behind the question either; and Drop and Add another on the
summary were the only two changes in the file that never persisted, so a kill there
resurrected a dropped goal. Today's caption now keys each half of itself on the state it
describes, rather than going quiet about a kept Interview when a Present sitting is open
beside it.

Gate after: 421 core / 48 ui / 8 storage, e2e **328/328** (was 326; the new checks stop half-way through a half and find the door still says "Picked up" and the route still goes back to the writing), axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors, copy check clean.

**The sweep of the screens the audits never walked (2026-09-16).** Every audit so far was
pointed at the three volumes, so the rest of the app had been checked only by the guard that
each screen has a back button — not by asking where that button goes, or what a screen holds
that is not in the store. Reading all thirty by hand found three, each the same shape as the
Past-age case the client reported:

- **Consent's Back did nothing.** Opened by its own link, or reloaded, there was nothing
  behind it and `router.back()` was a no-op — the one screen a person can land on before
  anything exists, and the only one missing the `canGoBack()` guard every other screen has.
- **The stones kept nothing.** The line, its "then I" half, the follow-up's own words and,
  on the long track, a whole paragraph lived on the screen alone until the stone was seated.
  Now a `stoneDraft`, held per stone so a draft can only return to its own, cleared when the
  stone is kept.
- **The evening seal kept nothing.** The proof line is the thing a person writes most often,
  and an interruption before the hold took it. Now a `dayDraft`, held per day, so last
  night's half-written proof is never offered as tonight's.

Both drafts join the export. The Fifteen, the Interview, the read-back, Present, Past, the
stones and the evening now all keep what is typed; nothing in the app asks for writing and
holds it only on screen.

Also: the authoring doorway's back fell through to Welcome rather than Today — it worked
only because Welcome redirects, which is luck, not design.

Gate after: 421 core / 48 ui / 8 storage, e2e **330/330** (was 328; a stone killed mid-line
comes back to the line with the sitting naming its own stone, an evening half written comes
back to it, and Back on a consent screen opened by its own link goes somewhere), axe 0 across
33 screens, way-back 30 screens, typecheck clean, lint 0 errors, copy check clean.

One habit worth the note: three of those checks failed at first not because the app was
wrong but because each sat in the middle of a sequence the walk depends on — the seal's own
state, the safety card's settle window. A check that navigates belongs at the end of the
walk, after everything that reads the state it would disturb.

**Every route, opened cold (2026-09-16).** A new gate step, `pnpm test:cold`, and the reason it
exists: `SEED=scripts/fixtures/empty.json` was documented on the axe pass and never run by
anything, so no check had ever asked what a route does on a fresh install or with an id in
its URL that points at nothing — a stale notification, a bookmarked link. It opens all 34
routes on both stores and requires a screen, a way out, no page error and no error boundary.

First run: **60/68**. Four routes on the empty store — Today, the spine, the seal, Welcome —
were rendering the error boundary ("This screen broke, not your writing") on a fresh install.
The axe pass had passed them for two days because the boundary is accessible. Cause: the
fixture held `bookTitle: null` and `iWill: null` from when those fields were nullable, the
store's `merge` spreads persisted over defaults, and every screen that trimmed either fell
over. Two fixes, one for the fixture and one for the class: `merge` now never lets a
persisted null replace a default that is not null (a field whose default is null keeps it),
so an older store can no longer take a screen down with a field that changed type. The other
four were the check's own vocabulary ("Skip" and "Go on" are ways out) and two cold landings
that had none at the top — the Book's "No Book yet" (whose Begin also went to a consent
already given; it goes to the next step of the path now) and the Portrait's "Not yet".

Gate after: 421 core / 48 ui / 8 storage, e2e **330/330**, cold **68/68** (34 routes × two stores), axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors. `pnpm verify` now ends with `test:cold`.

**Looking at it (2026-09-16).** Every check to this point ran in headless Chromium and read
the DOM; nothing had looked at a screen since the volumes were built. `pnpm shots` over the
changed screens, then all thirty-three at 320 × 568 — the smallest phone still in use —
tiled into one sheet and read. Two things the DOM checks cannot see:

- **The chooser's footer ran under "Not now"** at phone height: the doors column did not
  scroll, so its last line overlapped the bar. On the client's most important screen. The
  column is a scroll now, and it was confirmed at 375 × 667.
- **Content cut flush against a bottom bar reads as covered.** Twenty-three bars across
  fifteen screens sat with no gap above them, so on a small phone the authoring doorway's
  Starter/Full choice looked hidden behind Begin and consent's AI list looked hidden behind
  Continue. Both scroll; neither said so. Every bar has a top gap now, so a cut edge reads
  as an edge.

The other thirty-one were clean at the smallest size. And two things a web demo needs that
did not exist: `pnpm demo` serves the built bundle — the same server every check runs
against, so the demo is exactly the build that passed, with the SPA fallback so a reload
on /present opens Present, and every LAN address printed so a phone's browser can open it —
and the README has a section on what a web demo shows honestly and what it cannot. There is
no live URL: no Vercel token is configured; `pnpm vc deploy --prebuilt --prod` needs one.

Gate after: e2e **330/330**, cold **68/68**, axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors, copy check clean; all 33 screens read by eye at 320 × 568.

**The Present feeds the plan (2026-09-16).** The one designed-but-unwired connection that
needed no key or device. PRD §7.15 and the engine's own docblock say a fault's second write
becomes the If/then of that goal's Obstacles stone; `ifThenFromFault` had existed since the
volume shipped with no consumer, and the closing copy claimed nothing. Now the Obstacles
stone — that stone only — offers each written fault as a chip, "From what gets in your way".
A tap puts the person's own "what I do instead" into the then-line, and the sign they tapped
becomes the If field's *hint* for them to phrase; nothing of the app's lands in a field that
counts as theirs, which is the same line the framing chips have always walked. The faults'
closing copy says so now. The other loose thread — a virtue offered for pairing at the
read-back — stays open; it needs a place in the read-back's flow that does not yet exist.

Gate after: e2e **338/338** (was 330 — the reorder surfaced eight checks a silent `if` had skipped since the stone draft landed: the store is wiped for the cold-launch check at the very end now, and the two guards are checks), cold **70/70**, axe 0 across 34 screens, way-back 30 screens, lint 0 errors. Also: `scripts/fixtures/filled.mjs` builds the store with all three volumes written and a second edition carrying them, for the progress screenshots; `stone-obstacles` joins the three route lists.

**The virtues have somewhere to go (2026-09-16).** The last loose thread of the volumes.
Each virtue the person writes about names the goal that needs it, and until now that pairing
went nowhere: `virtuesForGoal` had no consumer and the closing copy could not say where a
virtue would be seen again. The goal's own page now carries "What you are good at, for this"
— the card's sentence as a heading and, under it, the person's line about where they will
use it next week — for every virtue paired with that goal, and nothing at all when none is.
The virtues' closing copy says so. That closes the list in "Next steps" item 8: both volumes
now feed the plan the way PRD §7.15 describes, and the copy claims exactly what the app does.

Gate after: e2e **339/339**, cold 70/70, axe 0 across 34 screens, way-back 30 screens, typecheck clean, lint 0 errors, copy check clean.

**The journey, read frame by frame (2026-09-16).** The brief's last line: run it and browse
it fully. The e2e now takes a screenshot after every tap when `JOURNEY` is set, and
`pnpm journey` runs the walk and tiles the frames twenty to a sheet with each step's name
under it (`scripts/journey.mjs`, `scripts/sheet.mjs`). 192 frames of the real first run and
all three volumes — Welcome to the second edition — read one by one: every step renders as
designed, and every one of the day's changes is visible where it belongs (the Obstacles
stone offering the written faults at frame 190, the renamable periods, Full's narrowing,
the held line's note, the carry-on row). `pnpm verify` passes end to end as one command,
exit 0, on the offline build. Nothing on this machine is left to build or to check; what
remains is on the far side of a key or a device, listed under "Blocked on the user".

### The Declaration (2026-09-16)

PRD §7.17, the product's only social surface, was the one specified feature with no
code behind it. Built the part that needs no key: **the Declaration** — the I will line
set across the person's own portrait (camera or library through `expo-image-picker`,
the platform's own picker; the night ground when there is no photo), the seal date under
it, captured square at 1080 through the same `react-native-view-shot` path as the lock
screen, kept in Photos, downloaded on the web, or shared. **One witness**, by the name the
person calls them, kept on the profile (`witnessName`, `declaredAt`; migration 0007, two
columns on `profiles`, applied to the live project, carried by the sync). What the witness
gets: the image when it is sent, and — on a sealed evening, if the person taps "Tell
<name>" — one line with the count of sealed days and the I will line, through the OS
share sheet. Nothing else, nothing without a tap, no server-side relationship, no feed.
The photo is never stored by the app.

Decisions taken without asking, and why: the witness is a *name*, not an account or an
email — the PRD's "receives it" is honoured through whatever the person already uses,
which needs no SMTP and puts nothing about a third party on Morrow's servers; and the
sealed evening stops closing itself once a witness is named, because "tell them" is a
choice to make on the spot or not. **Gift a chapter** (a second Future volume for a friend
who becomes the witness) is a purchase and stays behind the RevenueCat keys.

Reachable from the Book ("Declare it", beside "Lock screen") and Settings ("The
Declaration", which names the witness). A11y: the photograph is marked to be left alone
by Smart Invert. `declare` joins the three route lists.

Gate after: 422 core / 48 ui / 8 storage, migration 54 checks with 0007, e2e **349/349** (was 339; the new checks open the Declaration from the Book, find the line across it, name a witness, download it on the web, find the witness in Settings, seal an evening and find "Tell Sam" waiting), cold 72/72, axe 0 across 35 screens, way-back 31 screens, typecheck clean, lint 0 errors.

**The paywall's required pieces (2026-09-16).** PRD §7.13 names three things beside the
purchase itself: restore, a manage-subscription deep link, and price localization. Restore
was there; the other two were not. Now: "Manage subscription" on the paywall and in Settings
(with "Restore purchases" beside it) opens the platform's own subscription page — the only
place a subscription can actually be changed, never a screen of Morrow's pretending to.
And the `Billing` seam gains `offerings()`: the store's own price strings in the person's
currency, shown when a store is behind the build; until then the US figures carry a caption
saying so, rather than letting a dollar sign pass for a local price. The purchase SDK itself
still waits on the RevenueCat keys — `billing()` is one function to fill in when they come.

Also: the one lint warning that was mine (the Past's box reset, an effect) is now React's
documented render-time adjustment, so the old lines are never painted under a new event's
title even for a frame. Ten warnings remain, all older than the volumes, all in the app's
most-tested screens; converting them is churn for no user-visible gain.

Gate after: e2e **353/353** (was 349), cold 72/72, axe 0 across 35 screens, way-back 31 screens, 422 core / 48 ui / 8 storage, typecheck clean, lint 0 errors and 10 warnings.

**Day-90 re-authoring (2026-09-17).** PRD §7.3's last unbuilt paragraph: "Two Books side
by side. Per stone: Keep, Rewrite (the same screens with the old line above the new) or
Let it go ("What did it turn out to be instead?"). The new
edition is sealed with the hold; the diff is its first page. The calendar is Morrow's: the
dawn brief opens it on day 90 and every 90 after." `diffBooks` existed and nothing
consumed it; nothing fired on day 90; the `reauthor` paywall moment had no door.

Now, in order of what the person meets. `reauthorDue` (core, `engines/reauthor.ts`) is
the calendar: counted from the latest edition's sealed day in the person's own day
boundary, due at 90 and every 90 after, offered for a week so a missed morning is not a
missed quarter, quiet again once a new edition is sealed. Today carries the card
(`today-reauthor`, "Day ninety" / "Day one hundred and eighty"); on the free plan it opens
the paywall at the `reauthor` moment — one of the free limits §7.13 names — and Not now
is Today with the card still there. `/reauthor` is the two Books side by side
(`sideBySide` in core: the sealed chapter's lines against the stones as they stand now):
each line printed with its framing, Keep on and Rewrite beside it as two radios. Rewrite
opens the same stone with `rewrite=1&from=/reauthor`: the sealed line sits above an empty
field ("What you sealed, 18 Jun"), Back leaves the sealed line as it is, Keep this line
refreshes the plan and returns. Once written again, Keep becomes "Keep the old" and puts the
sealed line back word for word. Let it go opens one field — the PRD's own "What did it turn out to be instead?" — and archives
the goal with the line and the instant (`letGoGoal`; `status = 'archived'`, which the
schema always allowed and nothing had ever set; `lesson`, `let_go_at` in migration 0008,
applied live); its practices stop the way `dropGoal` stops them; "Take it back" restores
exactly that. `activeGoals` now means not archived, and the seal, the letters, the naming
screens and the first-run step all read it. Seal is the seal screen with the hold; the store
computes the diff against the previous edition at the seal (added is now its own part, not
"rewritten"; a changed then-half counts; the lessons ride in the diff, which is jsonb on
`book_versions` already, so no migration for them) and the Book opens on it: kept, written
again, new, let go, what it turned out to be — names in the serif when the person typed them and the
sans when they came from the bank, the same rule as the chapter headings. The Sunday
reading turns to it as page one; the plain text and the PDF print it under "Since the
second edition". The paywall's fourth line, held back until this existed, is back.

The decision worth recording: re-authoring is Pro, because §7.13 lists "re-authoring on
day 90" among the free limits, and the gate's reason says what stays theirs — the Book,
and sealing it again by walking the stones, which was never gated. What Pro adds is the
guided sitting. A person who lets go their only goal cannot seal (a Book needs one) and
the seal screen says so, the same refusal as before; Take it back is one tap above.

Found on the way: the walk ends with one goal and two editions, so the e2e seeds a second
goal through the store and seals it in through the app's own seal before moving the clock;
and `innerText` honours the Label's `text-transform`, so the diff's parts are compared
lower-cased. Verified by hand in the browser pane on the filled fixture moved to day 91:
the card, the gate, the side-by-side, the rewrite with the sealed line above, the let-go and
its line, the hold, the diff as the first page, Today with the card gone and one goal left.

Gate after: e2e **401/401** (was 353; the new checks: nothing on day 89, the card on day 90, the paywall on Free and Not now with nothing lost, the gated screen by its own URL, the side-by-side for Pro with axe on it, Rewrite with the sealed line above an empty field and Back changing nothing, Written again and Keep the old restoring word for word, Let it go with its line and Take it back, Back from the seal with everything still there, the hold, the diff as the Book's first page with axe on it, the reading opening on it, the store's editions, Today with the card gone and the goal off its row), cold 74/74, axe 0 across 36 screens, way-back 32 screens, migration **58 checks** with 0008 (a goal let go by its owner only, and taken back), the live account round-trip **45/45** with 0008 applied, 439 core / 48 ui / 8 storage, typecheck clean, lint 0 errors and 10 warnings, copy / dates / deps / authorship / sql / functions clean.

**What Morrow knows about me (2026-09-17).** §7.9: "*What Morrow knows about me*: the
memory profile, editable line by line … user edits are locked." §7.12 lists it among the
settings; §9.2 has it as screen 27 at P1; §3.5 answers the companion-chatbot scrutiny with
"memory editable and deletable". Settings had a heading with those words and three counts
under it, and no such screen.

Now `engines/memory.ts`: `buildMemory` is deterministic over the store — the name, the
register, the track, the times, the witness; each goal and every quotable line under it
(the if-then with both halves); a goal let go with its line; the edition, what the Book
opens and closes with; the sealed days, the returns, the weekday they fall on, the word a
day is closed with most often, the last proof. No line is inferred, and a line the safety
screen flagged is never one of them. Each line has a stable key, the app's framing in the
sans and their words, where quoted, in the serif. `applyMemoryEdits` lays the person's
changes over the rebuild: an edit replaces the line and survives every rebuild; a forget
removes it; an edit whose line no longer builds is kept anyway, because a line they wrote
is not the rebuild's to drop. `forgottenLineIds` is what makes Forget real: the store's
`coachAnalyses` filters by it, and the dawn brief and every chip reply build from that and
never from `s.analyses` directly — forgetting the if-then means "I'm stuck" stops quoting
it, checked in the unit test and again in the walk. `memoryDocument` is the ≈1,500-token
document a coach behind a model would be handed, cut on a line boundary.

The screen, `/memory`, from Settings: the lines by group, Change (a field, Keep this / Leave
it; the changed line marked "In your words" with "As Morrow had it" beside it), Forget, and
a count of what is forgotten with one way to bring it back. The footer says what the page is
not: the writing itself is never changed from it. The sync carries one row per person on
`memory_profiles` (0009, applied live) — the edits and the document — keyed by the person
rather than an id, which the push had to be told: with the default conflict target the push
stopped at that table and nothing after it landed, and only the live round-trip could see it
(now its 46th check).

Gate after: e2e **417/417** (was 401; the new checks open the page from Settings with axe on it, find the name, the goal, the stones, the Book and the days, change the name and find it in their words and still there after a relaunch, restore it, forget the if-then and find "I'm stuck" without it, bring it back, and go Back to Settings), cold 76/76, axe 0 across 37 screens, way-back 33 screens, migration **62 checks** with 0009 (the row is the person's alone), the live account round-trip **46/46**, 450 core / 48 ui / 8 storage, typecheck clean, lint 0 errors and 10 warnings, copy / dates / deps / authorship / sql / functions clean.

**Deep links, and a link to nowhere (2026-09-17).** §9.3 lists eight `morrow://` links and
§9.2 writes every screen's path the way a document does — `/goals/[id]/stone/[kind]`,
`/book/sunday`, `/settings/memory` — while the app's routes are flat with query strings.
A notification, a widget, an email or a stale link in somebody's notes may carry either
shape, and until now anything but the app's own shape reached expo-router's "Unmatched
Route" page. `engines/links.ts`: `resolveLink` takes any of them — scheme, host and dev
prefix stripped; `morrow://goal/x` read as a path, not a host — and returns the route
(`/goal?id=`, `/stone?goal=&kind=`, `/reading`, `/run?id=`, `/memory`…), null for one of
the app's own, and Today for nothing. A sign-in link is never touched: its fragment is the
root layout's to read. `app/+native-intent.tsx` applies it to system paths on native;
`app/+not-found.tsx` is a redirect through it on every platform, so the unmatched page is
never shown. The way-back check knows both files are not screens.

Gate after: e2e **422/422** (was 417; a stone by its inventory path with the goal behind it, `/book/sunday` on the reading, `/settings/memory` on the memory screen, a link to nowhere on Today, and never the unmatched page), cold **84/84** (four link shapes on both stores), axe 0 across 37 screens, way-back 33 screens, 457 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**Your day (2026-09-17).** §7.12 lists "wake and evening times, day boundary, chronotype,
shift calendar" among the settings. The profile carried all four times, the notifications
were planned from them, Today's primer printed them and said "the times are yours to change
under You" — and nothing let anyone change them. Worse, the planner's quiet hours were the
default's 22:00–07:00 whatever the times were, so a 06:30 morning line was moved to seven
and a 22:30 evening line would have been moved to the next morning.

Now, under You: **Your day** — the three chronotypes as presets (Lark 05:30 / 20:30 /
Sunday 8; In between 07:00 / 21:30 / 10; Owl 08:30 / 22:30 / 11), and beneath them the
morning to the half hour, the evening, the Sunday hour and the hour a day ends at, each a
row of chips like every other choice in the app. A preset is named only while every time
still matches it. `quietFor` (core) makes quiet hours the person's own: from the hour after
their evening line to the hour of their morning line, which on the defaults is the PRD's
window exactly; a day with no room for quiet keeps the default rather than a window over
the whole clock. The store plans notices with it, and a time changed reschedules them on
the spot. The **shift calendar** is not built: per-day times are a feature of their own,
and a half of one is worse than the chips.

Gate after: e2e **427/427** (was 422; the day's chips, the default preset marked, Lark moving all three, one time moved on its own leaving the preset, every value kept), cold 84/84, axe 0 across 37 screens, 459 core / 48 ui / 8 storage, typecheck clean, lint 0 errors, copy and authorship clean.

**The 16+ gate, and a button that was never disabled (2026-09-17).** §12 and §3.5 both
name a 16+ gate; the consent screen had none. It now has a row saying who Morrow is for —
"People sixteen and over. Morrow asks you to write about your own life, and that is not a
thing to ask of a child." — and one chip, "I am sixteen or over", that Continue waits for,
with a line under the button saying so until it is tapped. A tap rather than a date of
birth: a date field is a form, and a child fills one in as easily as anyone; the consent
timestamp already records the screen, and now records this with it.

The walk's check that Continue waited — `aria-disabled` on the button — found no such
attribute. react-native-web's Pressable sets `aria-disabled` from its own `disabled` prop
and overwrites whatever the caller passed, so `InkButton`'s `aria-disabled` had never
reached the DOM: every disabled button in the app (a stone's "Write your line", a seal's
"I will…" before it is written, this Continue) was announced to a screen reader as live,
and the hold bar after a seal as still a hold. Both pass `disabled` now; RNW writes the
attribute and, on a `<button>`, the native `disabled` too. Found by the gate, not by the
axe pass, which cannot know a button is meant to be disabled.

Also: the re-authoring seal in the walk focused the hold bar 700 ms after the push, while
the stack's slide was still running on the fake clock — a focus placed mid-slide lands
nowhere and the Enter after it seals nothing. It waits for the clock and the bar now.

Gate after: e2e **430/430** (was 427; the age gate, Continue waiting for it, one tap clearing the note), cold 84/84, axe 0 across 37 screens, way-back 33 screens, 459 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The review (2026-09-17).** The five commits of the day had the gate and not the adversarial
pass the earlier work got. One workflow, read-only: five reviewers over one dimension each,
one skeptic per finding prompted to refute it, a completeness critic over the PRD paragraphs
each entry cites. Twenty agents, 32 raw findings, 28 unique, the top 14 verified — every one
of them confirmed — and 12 gaps. Fixed, in order of what a person would meet:

- **A goal let go kept its Blueprint** (high). `letGoGoal` archived the goal and its
  practices and left its plan; Today's Now card, the dawn brief, the morning notice, the
  day's tally and the letters all read every plan. `livePlans(s)` — the plans of the goals in
  play — is what all of them read now; the plan itself stays, so Take it back puts it straight
  back. `coachAnalyses` filters by the goals in play too, so the brief and the chips no longer
  open the morning with a let-go goal's if-then. The walk seeds a second goal with a Blueprint
  and checks its moves leave Today and the brief.
- **`+native-intent` dropped every link it did not rewrite** (high). `resolveLink` answers
  null for a link that already names a route; expo-router reads a null return from
  `redirectSystemPath` as "no URL" — `getLinkingConfig` replaces the initial URL with it, the
  subscribe path fires only on a truthy href — so `morrow://today`, `morrow://book` and
  `https://…/stone?goal=…` opened nothing on a device. The path itself goes back now whenever
  there is nothing to change. (The app's own notifications were never affected: they route
  through `onNotificationOpened`.) Not reachable by any web gate; found by reading the router.
- **The side-by-side and the diff disagreed.** `sideBySide` compared the first line only;
  `diffBooks` compared text, then-half and paragraph. One `sameLine` in `book.ts` now, used
  by both and by the stone's `fresh`; `now` carries all three parts and the screen prints them.
- **Let it go was committed at once while the docblock said nothing was** — and once the
  week's card was gone, `/reauthor` and Take it back were unreachable. `pendingLetGo(s)`: a
  goal let go since the latest edition keeps a card on Today ("Unsealed … Seal it, or take it
  back") whatever the calendar says, and the gated branch of `/reauthor` offers Take it back
  too. The docblock says what happens.
- **The PRD's question.** §7.3's Let it go asks "What did it turn out to be instead?"; my
  earlier entries quoted a line that is not in the PRD ("archived with a line about what it
  taught, written now") and the screen, the first page and the profile all carried it. The
  field, the Book's first page ("What it turned out to be"), the memory line ("You let go
  <goal> — it turned out to be:") and the entries above are the PRD's words now. The column
  stays `lesson`.
- **Naming a goal with a let-go goal's title merged it into the archived row** and it appeared
  nowhere. `addGoals` merges over the goals in play and appends the archived rows untouched.
  Ranks stay dense over the goals in play (`denseRanks`), so `analysisPlan`'s `rank < 3` is
  not lost to an archived slot; Take it back lands at the end.
- **The let-go line and a memory edit were the only free-text writes never screened.** Both go
  through `screen()` now; a crisis line raises the resources card like every other, stays
  theirs, and is never printed on the first page, listed on the profile, or handed to a coach
  (`Goal.lessonRisk`, `MemoryEdit.risk`; migration 0010, applied live, with the not-blank
  check every other free-text column has and the `updated_at` trigger `memory_profiles` lacked).
- **The memory screen's copy over-promised.** "The coach reads the Book and these lines, and
  nothing else" was not true of Change (the coach quotes the stones directly), nor of Forget on
  a non-stone line. The copy now says exactly what the code does. Change seeds the field with
  their words only — a line that is all Morrow's framing starts empty — and Keep this with the
  line unchanged is not an edit, so the app's own sentence can never become a serif quote "in
  your words". The coach's Full-track invitation read `quotable(state.analyses)` and could
  quote a forgotten line; it reads `coachAnalyses` now.
- **Smaller.** The memory if-then is composed by `ifThenOf`, not by hand ("then take…"); the
  goal's name sits beside the framing in its own face and a bank title's quote is in the sans;
  the clock label, not "07:00"; an orphaned edit keeps its group by key; the export carries
  `memoryEdits`; "Keep this" and the Let it go confirm are buttons, not checked radios; the
  let-go line and a memory line mid-change live in the store, so Back never loses them; "it
  joins" is plural for several new goals; Seal is disabled with a line saying why when every
  goal is let go; "Keep the old" restores the sealed framing by its label; `quietFor` never
  puts the Sunday hour inside the quiet; a malformed escape in a linked id is kept, encoded,
  rather than thrown on in `+not-found`; `morrow://letter/{id}` opens that letter first and
  `/book/{n}` opens that edition; the dawn brief and the morning notice say "Day ninety" when
  the Book is waiting, which is the PRD's "the dawn brief opens it".

Not done, and said so: the shift calendar (§7.12) and the policy and terms link (§12) — the
first is a feature of its own, the second needs the client's text and URL. Both are listed
under "Blocked on the user".

Gate after: e2e **443/443** (was 430; the new checks: the brief on day 90, a let-go goal's moves off Today and out of the brief, the let-go line surviving Back, the door open on day 99 with Take it back behind it, Change starting from their words and an unchanged Keep this not an edit, a framing-only line starting empty, the goal's name in its own face on the profile, a letter by id first on the page), cold 84/84, axe 0 across 37 screens, way-back 33 screens, migration **65 checks** with 0010, the live account round-trip **46/46**, 461 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The second pass (2026-09-17).** The fixes above were a new body of work, so the same shape
of sweep ran over that one commit: three reviewers, a skeptic per finding — ten confirmed,
none refuted, eight smaller ones unverified and fixed anyway. What it found in the fixes:

- `denseRanks` rewrote the rank field and left the array where it was; two writers rank by
  array position (`mergeGoalDrafts` under `addGoals`, and `dropGoal`), so a taken-back goal
  jumped back to its old place at the next naming. The array is now kept in rank order with
  the archived rows after it, and `dropGoal` ranks the same way.
- `setMoveStatus` still tallied the day with every plan while the other four writes used the
  live ones, so a day's planned count — and the Consistency score — alternated between two
  definitions depending on the last write. One definition now.
- The re-authoring intro still said "a line about what it taught" two paragraphs above the
  field that asks the PRD's question; and Keep the old restored the rewritten framing when
  the sealed line had none. Both as the sealed edition has them now.
- The memory if-then carried the app's "if" and "then I" inside the quotation marks. The two
  halves are theirs (`ifThenOf(...).spans`) and the framing sits between them in the sans,
  on the screen and in the document; the stone rows got their colon back; a bank title is
  never quoted as theirs in the document either.
- The concern band did not read the two new verdicts; it does. The export did not carry the
  two drafts; it does. The drafts dropped a leading space or Return; they are stored as typed.
  A let-go line never kept outlived the seal and reopened its field a quarter later; the seal
  clears it, `dropGoal` drops the goal's, and only a draft for a goal on the page opens its
  field. The morning's brief kept saying the Book was waiting after it was sealed that day; it
  is written again when that changes. `quietFor` only ever shortens the quiet, never to
  nothing, whatever Sunday hour the sync brings in. The Let it go and Keep it controls carry
  the goal's name for a screen reader; the unsealed card's plural reads; an earlier edition
  opened by number is read, not acted on — the verdicts and the doors belong to the edition
  that stands, and the page says so and leads there; the migration test writes `lesson_risk`
  before it tests the check, so a missing column cannot pass as a refusal.

Gate after: e2e **443/443**, cold 84/84, axe 0 across 37 screens, way-back 33 screens, migration **66 checks**, 461 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The third pass (2026-09-17).** Over the second round's commit alone: two reviewers, a
skeptic per finding — seven confirmed, none refuted. Each was in code written in the two
rounds before, which is the point of running the pass again:

- The memory if-then printed "then I" before a half that already began with "I'll" — the
  doubled subject `ifThenOf` exists to prevent, back on the one screen that claims to show
  exactly what is said about them. The framing `thenHalf` chooses now travels with the line
  (`quote2Framing`) and the screen and the document both use it.
- Change on an if-then seeded the field with the condition alone, so a typo fixed in one
  half dropped the other from the profile. It seeds the whole line they wrote, both halves
  with the framing between, and compares Keep this against the same seed.
- The brief written again mid-day (a first move arriving, or the Book sealed on day 90)
  recomputed the once-only support offer against a profile already stamped, and the offer
  vanished for good. A rebuild carries the first brief's offer forward, and the stamp is
  written once.
- `addGoals` still ranked by array position, and two paths leave the array out of rank
  order — a pull (rows come back by id) and a store written by an earlier build. It merges
  over `activeGoals` now, which is in rank order, and the pull and the persist merge both
  run `denseRanks` so the array agrees with its ranks from wherever it came.
- `quietFor`'s Sunday shortening could wrap the window over the morning when the evening
  line was after midnight and the Sunday hour before it — reachable only through a synced
  row, and the entry above said "never". Only a Sunday hour inside the window can end it early.
- An earlier edition by number lost its PDF along with the two latest-only doors, though
  `onPdf` prints the edition on the page as Export does. PDF stays; Lock screen and Declare
  are the guarded two.
- The unsealed card's accessible name did not begin with its visible label, and the letters
  card two blocks up had the same shape. Both begin with the word on the card now.

**The fourth pass (2026-09-17).** Over the third round's commit: one reviewer came back
empty, the other with two, both in the memory screen's Change. A bank title typed back
verbatim had become an edit (the unchanged check compared against the seed alone, and a bank
title seeds nothing); `unchangedOf` counts the title itself as Morrow's. And a decision,
recorded because the reviewer argued it both ways: an if-then the person edits and keeps is
theirs entire, framing included — a whole-line edit is one sentence they read and submitted,
and there is no honest way to hand half of it back to the app. That is the one place the
app's "if" and "then I" reach the serif, and it is by their hand; the comments say so.

Four passes, thirty-three findings, none refuted, the last round down to two. Dry enough:
the next pass is the next body of work's.

Gate after: e2e **446/446** (was 443; a bank title seeds nothing and typed back is not an edit), cold 84/84, axe 0 across 37 screens, way-back 33 screens, 461 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The shift calendar (2026-09-17).** §7.12's list of settings ends "day boundary, chronotype,
shift calendar"; the entry above declared the last of them out of scope. It is a small
feature after all: three fields on the profile — the weekdays that keep other hours, and
the two hours they keep — and one function, `timesFor(profile, day)`, that every reader of
the single pair now asks instead. The planner plans the day's own morning and evening
lines; the quiet hours are the day's own, so a night-shift day's quiet runs from an hour
after its small-hours evening line to its midday morning; Today's primer names today's
times; the memory profile says which days keep which hours. Under Your day: the seven days
as checkboxes in the week's order, and, once one is ticked, the shift's morning and evening
as rows of chips whose hours reach where a shift's do. Migration 0011 (three columns on the
profile, under its policy), applied live; the sync carries them and reads their absence as
every day the same, keeping only real weekdays from a row that carries anything else.

Found on the way: the Sunday hour shortened the quiet on every day of the week, so a
night-shift Wednesday's morning quiet ended at ten. `quietFor` takes `onSunday` now and
the store passes the day's weekday; the reading is a Sunday's business.

Still not built, and now the only §7.12 item that is not: strings externalized for a second
language, which is a mechanical pass over ninety files with nothing a person can see until
there is a second language to show.

Gate after: e2e **449/449** (was 446; a shift day ticked shows the hours it keeps, the shift's morning is its own, unticked every day is the same), cold 84/84, axe 0 across 37 screens, way-back 33 screens, migration **68 checks** with 0011, the live account round-trip **46/46**, 463 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The shift calendar, reviewed (2026-09-17).** The same pass over that commit: five confirmed,
none refuted, and the first of them severe. An evening line in the small hours — 00:30,
02:00 — was planned on the day column's own calendar date, which is the small hour at the
start of that day, eleven hours before the shift's own morning line and already past by the
time the day was planned; it never fired, on any shift day, while Settings said when it
would. The planner puts an evening earlier in the clock than the morning on the next
calendar date now, and the test keeps it through the afternoon's schedule. With it: 04:00
is not offered — the latest a day can end is 5, and an evening at or after the boundary is
cancelled by the next morning's sync before it fires and seals the next day's column when
tapped; a small-hours evening and the day's end now agree, whichever was chosen last (a
two o'clock evening moves the day's end to three; a day ending at one moves the evening
back to half past midnight), and the sentence under Your day says the evening is the night
after and why it still counts as that day. The walk taps a non-default morning and evening
and reads all three fields back, which the first version's check could not have caught.

Gate after: e2e **452/452**, cold 84/84, axe 0 across 37 screens, way-back 33 screens, 463 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The seams (2026-09-17).** Every commit of the day had its own pass; none had looked at
where the pieces meet each other and the older app. One sweep with three reviewers on
three seams — the free plan against Pro, the sync of everything added, a brand-new
person's path — and a skeptic per finding: seven confirmed, none refuted.

- **A let-go waiting, on a plan that cannot open the sitting.** Today's card said "Seal it,
  or take it back" and led a Free person to the gated branch, which had Take it back and
  no seal. Sealing is not Pro's (the docblock said so; the seal builds the diff whatever
  the plan), so the gated branch seals now — disabled with the same note when no goal is
  live. Reachable today: `entitled` is never set from the server until a billing webhook
  exists, so a Pro person who let a goal go and then signs in on a new phone lands Free with
  the let-go waiting.
- **The gate stood on the Future door only.** The consent screen and its 16+ affirmation
  are on the Future path; the Past and Present doors, and the day's own link shapes
  (`/authoring/quarry`, `/authoring/bench`, a link to nowhere landing on Today's "Or start
  with your past or present"), reached a full sitting without it. Every door goes through
  the gate once now: the chooser and the explainer send an unconsented person to
  `/consent?then=past` or `?then=present` and Continue leads to that door; the two volumes
  redirect there themselves for a link straight to them; once through, never asked again.
- **A device whose only writing was a memory line** counted as empty: the pull replaced its
  edits with the account's and "Keep a copy" refused it. `hasWriting` counts them.
- **Not now on a consent opened cold** did nothing; it has the arrow's guard.
- **The memory screen's empty state** could only ever show above "N lines forgotten" and
  said "Nothing yet"; it says every line is forgotten and how to bring them back.
- **The notification primer** on a shift day showed only that day's hours while asking
  consent for every day, and "Nothing else, ever" was not true of the planner (the Sunday
  reading and the day-three return line). It names both pairs and the two others.
- **A goal let go, on its own screen**, read as "You may have dropped it". It says it was
  let go and when, and offers Take it back and the re-authoring.

Gate after: e2e **460/460** (was 452; a link straight to Past or Present unconsented is the gate first, Not now from it goes somewhere, Continue leads to the door that sent them and never asks again; the let-go goal's own screen; the gated re-authoring's seal), cold 84/84, axe 0 across 37 screens, way-back 33 screens, 463 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The sentences (2026-09-17).** Two rules the day's reviews kept finding in older screens —
an accessible name must begin with its visible label, and a sentence must be literally true
of the code — swept across every screen by three readers with a skeptic per finding: twelve
confirmed, eight more concrete enough to fix without the pass, none refuted. Where the
promise was the right one the code changed; where the code was right the words did.

The code changed: the planner now receives the milestone falling due today from the goals in
play, so Settings' "a milestone when one lands" is sent; a new move is ordered before every
move the plan has, so it goes to the top of today (the Now card, or first under an intention
already said) — the sheet says "Goes to the top of today" and the walk checks it; "Keep this
line" keeps the line on its first press whether or not the follow-up is showing, with the
when and where if they wrote one — it used to close the box and stop; the Book's "Something
moved" opens the reading's own chooser of what moved instead of going back to Today; the
sign-in's last line says what moved — the Book back, the writing up with the Book to follow,
or nothing yet; the seal's "Tell <name>" reads the share sheet's answer and says "Not sent"
when the sheet was dismissed (Android cannot say, and the line says only that the sheet had
it); the Declaration is marked made when it is kept, not when a share sheet opened, and
"Send it to Sam" is "Share it — for Sam".

The words changed: a capture "goes in the ledger … and nowhere else" — a letter may quote it,
and now says so; "No sign-up until your Book exists" — the account is offered after the
Portrait, before the seal, and can be declined, and now says that; consent listed the plan
among what is sent to an AI service, and the planner is local; the order screen's "the rest
get two" is Starter's rule alone; the microphone note pointed at You for a switch that is in
the phone's own Settings; "Eight minutes" for the other road is fifteen on Full; "Said this
morning" is "Said today", the store holding no hour; the practice's placeholder promised a
line cut from theirs and Morrow supplies a stand-in; "The first three" counts what is there;
"Write five lines per goal" is "Write the stones", since Starter's fourth goal gets two, and
the stone's intro and the first-run caption count the plan the same way. The Book line on
Today and the explainer's three picks have names that begin with what is on the screen.

Gate after: e2e **461/461** (was 460; the new move at the top of today), cold 84/84, axe 0 across 37 screens, way-back 33 screens, 463 core / 48 ui / 8 storage, typecheck clean, lint 0 errors, copy and authorship clean.

**The sentences, reviewed (2026-09-17).** The pass over that commit: eight confirmed, none
refuted, three more fixed without one. The Book's "Something moved" sent people to page one
of the reading — the chooser lives on the last page, so it opens there now, and the walk
checks it. "Goes to the top of today" was true only for the top goal (Today sorts by rank
first); the sheet says what happens — first among that goal's moves — and the walk's check
says which case it proves. On the web the share sheet answers nothing, so "Tell <name>"
reported the sheet had not opened after it had; it reads the answer where there is one and
says "handed to the share sheet" where there is not, and a sheet closed without sending is
"Not sent". The wake line takes the first open move in Today's own order, so it names the
Now card. Today's "Said this morning, and done" holds no hour either. Morrow's two-minute
stand-in is set in the sans on the runner, as it is on Today. The sign-in's last line says
when the copy is made — whenever the app is left, not at the seal. Welcome's account line
appears only in a build that offers one; the Starter rule is stated only where a fourth goal
makes it real; the caption reads "for your goal" for one.

Gate after: e2e **462/462** (was 461; Something moved from the Book lands on the chooser), cold 84/84, axe 0 across 37 screens, way-back 33 screens, 463 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**And once more (2026-09-17).** The pass over those fixes found three, none refuted, and
then nothing: the runner told Morrow's two-minute stand-in from theirs by re-deriving it
from the stone's line, while the builder had derived it from the paragraph on the Full
track — `isMinVersionStandIn` knows the stand-in by its shape now, whichever line it was
cut from and however that line has been rewritten since; and the new move sheet promised
"first among this goal's moves" on a day an intention already said comes first — it
promises only what always holds, "On Today, under <goal>", and the store's comment carries
the exception again. Dry.

Gate after: e2e **462/462**, cold 84/84, axe 0 across 37 screens, way-back 33 screens, 464 core / 48 ui / 8 storage, typecheck clean, lint 0 errors.

**The eval harness (2026-09-17).** PRD §11.8 asks for "a golden set of 40 synthetic
profiles (personas × domains × both tracks) with authored Books" and seven checks over
them, plus "safety recall ≥ 0.95 on a 200-item labelled set", and §14.8 counts "the prompt
eval green" in the definition of done. Nothing of it existed: the authorship rules had unit
tests, but no set of people. Now `packages/core/eval/` holds four writers — a nurse on nights
who writes in long commas and dotted times, a developer in short lines and numbers, a
retired teacher in semicolons with no contractions, a driver in run-ons and ellipses — each
across health, money, craft, mind and people, each on both tracks (the Full cut adds the
paragraphs and the shadow): forty profiles, two goals apiece, five stones a goal, a ledger
line or two. Every word invented. `golden.test.ts` runs each through the offline extractor,
the seal, the Portrait, the Blueprint, the dawn brief in the person's register and again in
the concern band, the four chips, the four letters, the Returns letter and the Full-track
invitation, and asserts what the PRD asks: spans verbatim (246/246), the authorship floor
(40/40 at 1.0), the schemas, every move sourced with its sentence under it and the first one
small, at most three in week one, proofs the person can point at, briefs ≤ 90 words with a
quoted span and none of the banned words in the app's own prose, letters 120–180 words
quoting the Fifteen or the ledger and naming no goal or move. `safety-set.ts` is two
hundred labelled lines — seventy that must raise the card, sixty that must soften the
morning, seventy ordinary sentences that share their words (the gym, the deadline, the
joke, the van, a binge of a series) — and the screen is measured both ways. It prints the
numbers, and `pnpm verify` runs it after the unit tests, so a pattern or a builder cannot
change without it passing.

What the first run found, in the engines, all fixed:
- **The Full track's plan was cut from the paragraph.** `buildPlan` preferred
  `strategies.paragraph` to the line, and the paragraph answers four prompts in prose, so a
  single move read "days off are the four in the pattern and on each one I'm at the library
  on Market Street at 10 when it opens with the laptop and the folder, until 12 and no
  later, because I pick the boys up at 12.30 from Ana's mum. One unit of the module per
  session…" — sixty words, on a card. The plan is cut from the line on both tracks; the
  paragraph is the Book's and the sentence under a move.
- **The 48-hour opening copy carried a day it was not on.** "Tuesday: at 6:40, out the back
  door" dated a Friday. The copy is the body of the line, which is still their sentence.
- **A day named twice was two moves on one date.** "Saturday at 5 pm … new strings by this
  Saturday" made the same card twice. Each day counts once.
- **The brief ran to 149 words.** The PRD's ninety is now a budget: the opening sentence is
  cut at a word first, then yesterday's proof line comes off, then the opening quotation; the
  move and the if-then are the plan and are never cut. Longest brief on the set: 90.
- **The identity line came from the How line.** `proposeIdentity` searched the Strategies
  line before the Fifteen, so "every Sunday I am not on shift" became "I'm becoming someone
  who is not on shift". From the Fifteen alone, as §7.4 says.
- **Seven shapes the screen missed** — five of the worst sentence, two of the concern
  band — each now caught: "harmed myself", "wish I were not
  alive", "wish I'd never been born", "rather not exist", "think about stepping in front of
  a train", "I'm such a failure", "55 kg by Christmas or I have failed". One it still misses,
  and the report says so: "I've started cutting again" — a lifter's sentence as often as
  not, and a local screen has no way to tell.
- **Four ordinary sentences it flagged**: "wanted to die of embarrassment" raised the card;
  "binge-watched", "a binge of the last three episodes" and "starving after the swim"
  softened the morning. "Starving" now needs "myself", "all day" or a reason; a binge of a
  series is a Sunday; the idioms are named. On the set: recall 98.6% crisis, 100% concern;
  0 of 70 ordinary lines raise the card, 0 soften the morning.

What the eval does not do, and why: §11.8's "LLM-as-judge with Opus 5 plus human review of
20%" needs a model behind the edge function, which is the same key everything else waits
on; the deterministic checks are the floor the product cannot go under with or without one.

Gate after: 470 core / 48 ui / 8 storage, eval **567/567**, e2e **462/462**, cold 84/84, axe 0 across 37 screens, way-back 33 screens, migration 68 checks, typecheck clean, lint 0 errors.

**The judge's read (2026-09-17).** §11.8 also asks for "LLM-as-judge with Opus 5". Without a
key the judging was done here, by reading: every artefact the forty profiles produce — the
Portrait, the plan, both briefs, the four chips, the five letters — dumped to one file and
read end to end, the way a person would see them. What the reading found, all fixed and each
now asserted by the eval so it stays fixed:
- **The identity line was the wrong sentence.** `proposeIdentity` took the first "I am" in
  the Fifteen wherever it stood, so "I have stopped saying that I am too old for things"
  became "I'm becoming someone who is too old for things"; "pretend I'm looking at the
  pictures", "asking if I'm alright for money" and "when I'm coming" did the same. It now
  takes who they said they want to be — the doorway's own sentence, "I want to be someone
  who runs three mornings a week without negotiating", "a woman who is still strong at
  seventy", "a bloke who finishes what he starts" — with the framing ending at "who" when
  the clause carries its own verb; failing that, an "I am" at the head of a sentence or
  clause of their own; failing that, nothing, and the person writes it. On the set: 38 of 40
  are now the sentence they wrote at the doorway; 2 propose nothing.
- **Milestone titles were a running sentence on every goal.** "First 45 minutes without
  stopping" on a deadlift, on a raise, on a memoir; "Step 2 toward lisbon with tom and jay"
  with the person's capitals taken off. A milestone's title now says only how far along it
  is — "Six weeks in", "Thirteen weeks in", "The date you set" — and the goal's name stays
  the page's, in their case.
- **The coach claimed a feeling.** "On Wed 16 Sep you did not feel like it either" is a
  memory the app does not have (§11.4). It says what the ledger holds: "you kept 2 of 3 moves
  and wrote “…”".
- **Their full stop inside the letter's sentence.** "You wrote “…pleased about it.” and I
  have thought" — two stops in one sentence; the same for the first of two ledger lines. And
  "the ledger has 2 entries … and two of them are" now says "both".
- **A cut quotation stopping on "the".** The 160-character cut in the letters and the
  100-character cut in the brief landed on "…and not just watch the”; both back off a word at
  a time past articles, prepositions and auxiliaries.
- **"then" split a sentence into two moves.** "one module unit done, then the boys at 12.30"
  put "the boys at 12.30" on Today as a move and left the first half ending in a comma.
  Moves are cut on the person's own separators (semicolons, line breaks) and the days are
  lifted out of each piece on its own — "Sunday at 4 pm, batch cook; Monday to Thursday, eat
  from the fridge" is two moves, not three copies of both — and a span of days ("Monday to
  Thursday") is one move as written.
- **The 48-hour opening doubled a card.** A piece with no day of its own had the app's date
  to begin with, so it moves to tomorrow rather than being copied; only a day-named piece is
  copied, without its day. On the set: 130 moves, no two alike on a date, a sentence repeated
  only for a day the person named.

Gate after: 477 core / 48 ui / 8 storage, eval **567/567**, e2e **462/462**, cold 84/84, axe 0 across 37 screens, typecheck clean, lint 0 errors.

**The eval harness, reviewed (2026-09-17).** The sweep: four reviewers over the code (the
engines, the harness itself, the safety screen adversarially, the rest of the app), two judges
over the dumped output of all forty profiles, 84 findings, a skeptic on each. The account's
monthly limit stopped the skeptics at 50; the other 33 were read and traced by hand. What
stood, all fixed:

- **The identity line.** Cut at ":" or "." inside a time — "out the door at 6:40" became "out
  the door at 6" — and "who is is" whenever the word after "who is" began with a capital or a
  digit (a name, "10 kg", "OK"); "I am someone who runs" gave "someone who is someone who
  runs"; "knows what he earns and what he spends" was cut at the "and". A word can carry its
  own punctuation now, a stop ends a clause only before a space, the copula is its own group,
  "I am someone who" counts as the doorway's sentence, and "and" cuts only before a new
  subject. The contrast stays: "there, not a dad on the bench with his phone".
- **The 48-hour opening.** The copy for tomorrow still carried a day when the day sat
  mid-sentence — "Sunday at 4 pm in the kitchen" as a card for Friday, six profiles — and the
  eval check meant to catch it passed any weekday. Decided: the rule is the app's rule for the
  app's dates. A sentence that names its day ("Tuesday", "the 28th", "the 1st and 15th") is
  dated by the person and never copied; a piece with no date of its own is what moves to
  tomorrow; `validatePlan` knows a move that carries its own date. One card per sentence, on
  the set.
- **Effort was a label.** The first move was stamped "S" whatever it said, so the eval's "first
  move ≤ 30 min" asserted nothing. Effort is read off the sentence now; a long piece opens only
  when every piece is long, and a smaller undated piece opens ahead of it.
- **"then I we do".** `ifThenOf` put the app's subject on a half that had one. A half that
  opens with its own subject — "we", "the boys", "nobody", "Ana and I" — keeps it, in the
  sentence, the Book and the profile alike.
- **Milestones**: "1 weeks in" for a ten-day share; "The date you set" on a milestone that was
  not on it (a target sooner than a fortnight is stretched to the floor); "Thirteen weeks in"
  beside "26 weeks in". One week in; the date only when it lands; words to ninety-nine.
- **The brief.** "Quiet day yesterday … not a failure" — the banned word, on the first morning
  of all — never reached the eval because every profile had a kept day; the first morning and a
  quiet day are on the set now, and the line is "and that is all it is". The trim dropped the
  person's opening sentence before the app's own flourish; the register's push goes first. The
  move is printed as a quotation — "Start with “On payday, £250 goes…”" — rather than grafted
  onto "start with" with its first letter lowered. A two-word opener ("It's March.") gives way
  to the first sentence with something in it, in the brief and the letters.
- **The chips.** "Something changed" promised a replan tonight that nothing performs; it now
  says where the Replan is. "I don't feel like it" said "Same size today" while its action
  shrank the move; it says "Two minutes of it counts today". The shrink from a chip has an Undo,
  on the coach screen and on Today.
- **The letters.** Two ledger lines over ninety characters made "The ledger is still empty";
  kept moves and practice runs were counted "in your own handwriting"; "None of it was the day
  you felt like it" was a feeling the app has no record of; "Priya, You came back"; "what you
  decided tonight" in a letter written a month on; a cut quotation stopped on "the" (the
  dangling-word list was short); the sentence chosen could name the goal, and the check then
  refused the letter. Each fixed; the letters say what the ledger holds and nothing of how
  anyone felt.
- **The two-minute version** matched stems — "Two minutes: moved" — and knew sixteen verbs; it
  matches whole verbs now, forty-odd of them, in their base form.
- **Day ranges**: "Mon–Fri", "Monday to Friday", "Saturday or Sunday", "Mondays to Fridays" are
  one move as written, not "Monday: -Friday".
- **The new-move sheet and the practice builder** still cut from the Full track's paragraph;
  the line, as the plan.
- **The Horizon Review** printed a milestone without its goal when the goal's name happened to
  be inside the chrome; every line names the goal.
- **The safety screen**, adversarially: thirty new shapes. Caught now — "wanna die", "hanging
  myself", "walking into traffic", "jumping off the bridge", "took all my pills", "OD'd",
  "rather be dead", "wish I didn't exist", "wish I hadn't been born", "better off if I was
  gone", "happier if I was dead", "never wake up", "tired of being alive", "life isn't worth
  living", "want my life to end", "what's the point of living", "taken my own life"; in the
  concern band "I'm a burden", "feel like a failure", "can't take it anymore", "drunk every
  night", "relapsed", "a bottle of wine a night". Left alone now — "don't want to wake up at
  5am", "didn't want to go on the trip", "don't want to live in this flat", "wish I was born in
  the 90s", "my mum will kill me", "just kill me now", "no point in going on holiday", "hurt
  myself deadlifting", "cut my leg shaving", "rather die than wear that", "drink too much
  coffee", "hopeless at parking", "purged my wardrobe", "binged three seasons", "100 kg squat is
  the goal", "the warranty is worthless", "hate my self-doubt", "cannot face it". The verb
  clauses that matter end where the clause ends, and the category logged is the pattern's, not
  a second guess at the text.

Refuted, and left: the authorship-ratio check is "tautological" (it is the floor, and it holds
by construction — the day something writes into `generated` is the day it fails); the proof
check "tests the golden author" (it does, and the follow-up the product asks is the product's
answer); the 0.95 floor "tolerates a named miss" ("I've started cutting again" is a lifter's
sentence as often as not, and the report names it every run).

Gate after: 483 core / 48 ui / 8 storage, eval **647/647** (the first morning and a quiet day
for every profile), e2e **473/473** (eleven new: Say it in a browser), cold 84/84, axe 0
across 37 screens, typecheck clean, lint 0 errors.

Gate after: 416 core / 48 ui / 8 storage, e2e **326/326** (was 317; the new checks seed a live virtues sitting and press both closing-screen buttons on the faults, write a Past line in crisis and change it without the card returning, and read the Interview-only caption), axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors.

Gate after: 416 core / 48 ui / 8 storage, e2e **317/317** (was 311; the new checks relaunch cold mid-Interview and resume, press Begin then Back on the Past doorway and find no sitting behind it, and reread a written Present from Today), axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors.

Gate after: 416 core / 48 ui / 8 storage, e2e **311/311** (was 297; the new checks relaunch cold with only the two volumes in the store, change an event from the Book question, seal a second edition from the Past's closing screen and find it on the Book's paper), axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors, copy check clean.

Gate after: 415 core / 48 ui / 8 storage, migration 53 checks, e2e **297/297** (was 286; the new checks press the browser's back on Full's writing screen reached by the door, re-cut the periods with events listed, un-tick a card mid-write, kill on the deck, and reopen a finished Past), the live account round-trip **45/45** (now the three volume tables, `past_listed`, and the let-go-and-rewrite push; run before the platform-back change, which touches no sync), axe 0 across 33 screens, way-back 30 screens, typecheck clean, lint 0 errors.

### The research, and what it changed (2026-09-13)

The user asked, twice, for the flow to be looked at with a brand-new person in mind — and to research what apps should do for accessibility first, then check ours. So: four research passes over primary, current sources (WCAG 2.2 and its 2.2-only criteria, the W3C mobile guidance, Apple HIG accessibility and onboarding, Material, the EAA; NN/g, Baymard, Growth.Design and Apple on onboarding and retention; React Native 0.8x / Expo / react-native-web accessibility; COGA, GOV.UK content design, plain language, trauma-informed design), each producing a checklist, each checklist audited against this codebase by a separate reader, the four audits merged and de-duplicated by a fifth. 73 findings before the merge, 36 after, in `design/audits/accessibility-first-run-2026-09-13.md` with the sources. What changed, in the order the list gave:

**P0 — the "delete it" moments.**
- Every cold launch opened on Welcome's last page, name field and all. Anyone with a Book, or halfway to one, is redirected to Today; "See the introduction again" lives under You.
- The Interview and the read-back lost everything on a kill or the platform's back. Both persist mid-way (`interviewDraft`, `readBackDraft`), the Interview resumes on the same question, and the platform's back — button, edge swipe, browser arrow — is the same one-step undo (`beforeRemove`), leaving only when there is nothing left to undo.
- Back on a stone discarded the line being typed. It keeps it.
- The keyboard covered the field on iOS: `automaticallyAdjustKeyboardInsets` on every writing ScrollView; the four centred screens scroll.
- Three unasked-for asks landed on the first value moment. The microphone is asked for on the doorway, before the clock, with one sentence about what "Say it" uses; refused, the room is a typed one and says so. Notifications are primed in words on Today after the first sealed day ("7:00 — your first move; 21:30 — a line to close the day"), and the OS is asked only on "Yes" — `allowed()` never asks any more. The paywall waits for the first sealed day (`firstDaySealed`), so the first Today is a Today.
- The path's buttons were undefined coined nouns: "Write five lines per goal", "Keep this line · next", "Keep this plan", "Hold to close the day"; the four places that said "Settings" say "You, the last tab", which is what the tab says.
- "Tonight about twenty-five minutes" ran straight on into the second and third sittings. The read-back lands on Today's path card, which offers the next step now or tomorrow.
- The seal landed on the Book's Sunday-reading verdicts; from the seal the Book has one door, "On to Today — your first move". The first Today shows the Now card, the check and the tabs; the practices invitation and the consistency score wait for the first sealed day.

**P1 — understanding, and assistive technology.**
- Nothing was announced when a step changed inside a screen. `announce()` in @morrow/ui; each Welcome page, each Interview question, each stone says itself.
- Interview options were "checkbox, unchecked" buttons that answered and advanced: checkbox only on the multi-pick, button with a hint elsewhere.
- Inline errors and status were silent: a `Notice` primitive (live region + announcement) carries the seal's refusal, the account's problems, the read-back's messages.
- The Fifteen: the clock can be paused, "Five more minutes" when it ends (ten times, WCAG 2.2.1), one minute's warning announced, and the countdown can be put away from the doorway (the minutes stay in the accessible name). Not done: a shorter floor for the first sitting — the studied program's dose, left as it is.
- "Not today" was drag-or-long-press only and its Undo died in 3.4 s: a visible "Not today" under the Now card and on each row, "Put it back" on a parked row that never expires, the toast at eight seconds.
- Fields were placeholder-only: UserField draws its label (or `labelHidden` where the screen already does), carries an `error` that is heard, and the email and one-time-code fields have their purpose for autofill.
- At large type chip rows ran off the screen: they wrap; tab labels cap at 1.4×. Not testable on the web build; the device list below.
- Repeated controls shared a name: Keep / Not a goal / Drop / Not today name their line; the Book line on Today is a named button; Back's name has no arrow in it; the Welcome dots are decoration with the count in words.
- Consent carried a 56-word sentence: one idea per line, the four "when" items as a list.
- The helplines were three taps away: "Need someone?" in the TopBar of the Interview, the room, the read-back, the stones, both seals and the coach opens the resources card without a pause and without "not about me".
- The shadow doorway asked for self-blame; the ideal doorway stacked prohibitions: rewritten positively.
- The safety card on the web took no focus and left the screen behind tabbable: focus to the title, Escape, the screen behind `inert`.
- Orientation unlocked (`"orientation": "default"`, WCAG 1.3.4) after Today, the doorway and Seal the day were looked at at 844×390 in the web build: the column caps at 640 and everything scrolls, and the doorway and the closed card were made to scroll (Begin was off the bottom on a phone on its side, and would have been at 200% type). The device check stays on the list.

**P2, done:** the admire question can be skipped; the stone's follow-up has its own field; "Two of them might be one" no longer implies a Merge; the specificity hint only where a time or place is the point; the order screen says what the top three means; the field underline reaches 3:1 (tested); the storage banner's name is its text; the paywall says what happens after the trial; heading levels (Statement 1, Question 2); the almanac speaks one row per month; first-run analytics (`first_run_step`, `first_value`); `eslint-plugin-react-native-a11y` in the lint (13 rules as errors; the hint-on-everything rule off, with the reason). The order/title split is done too: the order page asks one thing and the name has a page of its own (`/title`), with a Book that can stay Untitled for now. **P2, not done:** native focus styles for hardware keyboards; the aria-* vocabulary migration (the lint plugin only reads the legacy spellings; decide after).

**What only a device can verify** (from the audit's verification list): VoiceOver and TalkBack through the whole first run; iOS keyboard on the Interview's custom field, a stone's "then I" and the account code; Dynamic Type at 200% on the room, Today and the seal; the one-time-code autofill from Mail; rotation. Written into "Next steps 1".

### The account service, live (2026-09-12)

The user handed over the Supabase project (`fxsaxganeyajxbcbignq`, Singapore). What is done, and how:

- **The schema is on the project.** `0001_init.sql` applied in one transaction over the session pooler (`aws-0-ap-southeast-1`; the direct host is IPv6-only and this machine has no IPv6 route) — 18 tables, 18 policies, RLS on every one — and recorded in `supabase_migrations.schema_migrations` so the CLI's own `db push` finds nothing to do. Checked from outside with the publishable key: every table answers `[]`, an anonymous insert is refused with 42501.
- **The app points at it.** `apps/mobile/.env` (gitignored) carries the URL and the publishable key; the configured bundle has them and nothing else — no secret, no service role, no password, checked by grep. The tests build with every key blanked (`pnpm build:web:offline`).
- **The CLI is a dev dependency** (`pnpm exec supabase`, 2.117), with the six-digit-code email template in `config.toml` + `supabase/templates/` so `config push` sets it.
- **The functions are deployed and the auth config is on the project** (2026-09-14, with a personal access token the user generated; `pnpm sb` runs the CLI with it from `supabase/.env.local`, never touching the login stored on this machine for another account). `config push`: otp length 6, expiry 10 min, the deep-link URLs, Apple with the bundle id. The four functions answer; without provider keys they say so (`degraded: 'no provider configured'`) and the app falls back to its device engines. What `secrets set` still needs: Anthropic and fal keys.
- **The email carries a link, not the code, for now.** The free tier on the default email provider refuses template changes ("Email template modification is not available for free tier projects using the default email provider"), so the two template tables in `config.toml` are commented out until Pro — which the PRD plans before the demo. The app signs in from the link as well: `signInFromUrl` in `supabase.ts`, wired to `Linking` in the root layout, takes the session from the `morrow://` URL's fragment (or verifies a `token_hash`) and lands on the account screen. The account screen's copy says what the email carries.
- **The AI functions answer to the publishable key alone**, by design: there is no account wall, so the read-back, the safety second opinion and the scenes have to work for a person who never signed in. The key ships in the app, so anyone holding it could spend the providers' quota — so each function asks the database before it spends (migration 0003: `public.rate_limits` + `rate_limit_hit`, service role only; the read-back 30 per 10 minutes, the safety screen 60 per 10 minutes, a scene 10 an hour, per signed-in user or per address). An in-memory limiter was tried first and held nothing: the edge runtime gives every request its own execution (`x-deno-execution-id` differs per call). Proven on the project: 30 calls pass, the 31st is a 429, and a 429 is one more thing `guarded()` falls back from. `delete-account` is the one that verifies a user.
- **No Anthropic key is required** (the user said they are not using one). `_shared/llm.ts` asks whichever model the secrets name — an OpenAI-compatible endpoint through `LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL` (OpenAI, Groq's free tier, Gemini's compatible URL, OpenRouter, Mistral, an Ollama of one's own), or Anthropic through `ANTHROPIC_API_KEY` — for a JSON answer against a schema, parsed defensively; every function still verifies the answer against the person's own text. What a model is for, exactly: the read-back's choice of phrases, the safety second opinion, the scene narrative. Everything else is on the device. Exercised under Node with a fake provider (a 400 on `response_format` retried without it, JSON in fences parsed); deployed; degrades the same with no key.
- **The seven-day promise is on the database's own clock** (migration 0002): a nightly pg_cron job deletes the auth users whose `deleted_at` is past the grace period, so a closed account no longer waits for somebody else to close one; the old windows of the limiter go with a second job. Both guarded so PGlite (no pg_cron) runs the file and creates nothing. `scripts/test-migration.mjs` runs every migration in order now (44 checks).
- **A CORS bug the round trip found:** the functions' preflight allowed only `authorization, content-type`, and supabase-js also sends `apikey` and `x-client-info`, so from a browser every `functions.invoke` failed before it started (native has no preflight). All four allow the four headers now.
- **The whole first run against the configured build**, functions live and no provider keys: 199/199 — the read-back asks the deployed function, which says it has no provider, and the device extractor answers instead; the account is offered after the Portrait with a plain way past it. Two things a free-tier project should know about before a demo: it **pauses after a week without traffic** (sign-in then fails until it is restored from the dashboard — Pro does not pause), and the default email provider sends a **handful of emails an hour** (custom SMTP lifts that and unlocks the code template).
- `pnpm test:account` is 36 checks: the link signs the app in, push, RLS from a stranger's side, wipe, pull, the same store back, **Close the account through the deployed function** (the profile stamped, the session revoked, the writing kept on the device), then the throwaway user removed.
- The database password lives in `supabase/.env.local` (gitignored) for `pnpm db:push`; it was never on a command line and is in no tracked file.
- **The account round trip, for real** (`pnpm test:account`, 30 checks): a throwaway user minted with the service role and a session verified with the publishable key — the six-digit code's own path — the built app opened signed in with the seeded store, Settings' "Copy it now" landing every table under RLS (a stranger with the publishable key sees nothing), the device wiped, the account screen's new signed-in state offering "Bring my Book back", the pull, and the store that came back compared field by field with the one that went up: goals, Book, chapters, moves, ledger, days, the Fifteen, the analyses, the persona. Then the user deleted and its rows gone with it. This was "Next steps 2"; the only part of it still open is the edge functions, which wait on the owner's CLI login.
- **The account screen knows when you are already signed in** — a wiped device with a live session used to be shown the email form as though it were nobody; it offers "Bring my Book back" now.

### The first run (2026-09-12)

The user, looking at the app fresh: "the UI seems very complex, there doesn't seem any ease with the flow… the go back option should display on all the pages… a brand new user might not even understand the flow and delete it… once someone joins we need an intro as well." Fair, and specific. What was true: the first-run path — Consent, the Interview, the track, the doorway, the room, the read-back, five stones, the Portrait, the seal — had no way back on any of it and no sense of where you were on it; a wrong tap in the Interview was final; Welcome put the stone, the three sittings and the persona chips on one screen; and the first Today arrived with a stone, a check, a plus and five tabs and said nothing about any of them.

- **Welcome is the PRD's three screens now** (§7.1): what this is; the three evenings with their real lengths and what they make (the Book, the Blueprint, Today); your name and how you want to be spoken to. Dots, Next, Back, Skip. Somebody with a Book lands on the last page, where Back to today is.
- **`TopBar`** in `@morrow/ui`: `← Back` on the left, where you are on the right, the same row on every screen that is not Today. Consent, the Interview, the track, the doorway, the read-back, every stone, the order, the Portrait, the seal, Seal the day, the account, the paywall and the coach all have it; the screens that already said "← Today" keep saying it. In the writing room the way out is "← Leave for now", because that is what it does — the draft is kept and the doorway offers it back.
- **The Interview's Back undoes one answer and keeps the rest** (§7.1: "Back always keeps answers"); a history of states in the screen, popped one at a time, and on the first question it leaves.
- **Back on a stone is the previous stone** — this goal's, or the last of the goal before — with its line still on it. The stones replace each other on the stack so the path does not pile up, which meant the router's own back from stone 3 landed on the order screen, two stones ago.
- **The first stone says what a stone is**, once: five questions, one line each, the chips are ways in, the line is yours. And the "where you are" labels say the place — the read-back, the order, the Portrait, the seal — not a sitting number, because the sittings are a pace offered, not a wall, and somebody doing it all in one evening was being told they were on Sitting 3.
- **Halfway along, the app opens on the next step.** `firstRunStep` (core, tested) knows where somebody is — the Interview, the Fifteen, the order and the title, the first unwritten stone, the Portrait and the seal — and Welcome's one button and a Bookless Today both point at it, with one line about where they are ("2 of 10 stones are written. The rest are where you left them."). Somebody who named goals one night and came back the next used to be offered "Begin tonight" and the Interview again, or a Today with a goal row and nothing to do on it. Two bugs the e2e for this surfaced: Today, still mounted under the path, pushed the paywall over the Portrait the moment the last stone built the first plan (its effect runs only while Today is in front now); and a dawn brief written before the plan existed named no first move all day (rewritten once there is one).
- **The first Today explains itself once:** what the Now stone is, the tap and the drag, what the coral check does in the evening, where the rest lives. "Got it" and it never comes back (`profile.todayIntroSeen`, on the device).
- The e2e suite walks all of it (173): the three pages and their Back and Skip, the name carried through, Consent's Back, the Interview's undo, the card and its dismissal surviving a reload.

What this does not do: change the shape of the path itself. Three sittings, five stones, a seal — that is the studied program and the reason the app exists (§2). It is now possible to see where you are on it and to step back along it.

### The dependencies, audited (2026-09-12)

`pnpm audit --prod`: four advisories, none fixable here and none that reach a person's data.

- `image-size` 1.2.1 (two highs, infinite loops on malformed ICNS/JXL/HEIF) and `uuid` 7.0.3 (moderate) sit under metro and the xcode config plugin — build-time tools that only ever read this repo's own assets. Nothing of either ships in the app.
- `decode-uri-component` 0.2.2 (moderate, CVE-2026-45822: super-linear decoding of malformed percent-encoded input) is inside `query-string` 7, which `expo-router` uses to parse URLs — that one does ship, and a crafted deep link could pin the CPU for seconds. The fixed line (0.5.0) is ESM-only and `query-string` 7 `require`s it, so a pnpm override would break URL parsing at runtime; the fix has to come from `expo-router` moving to `query-string` 8+. Availability only — no memory corruption, no disclosure. Re-check on the next SDK patch.

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

The third look was not at the design but at the product under other lives than the seed's — other stores, other days, other phones. Each line is a store or a condition and what it caught:

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
- **"From …" under every move, on Full:** the whole paragraph, nine times. `sourceLineFor` gives one sentence now — the line when it holds the move's words, else the one sentence of the paragraph that does (tested); and the Portrait's why is the Why line, with the paragraph as the fallback rather than the other way round.
- **One line that was not true:** "Most people choose this one" under the annual plan, on a product with no customers. §8.9 says no fake discounts; a statistic nobody measured is the same kind of thing. The line is arithmetic now — `annualAgainstMonthly()`, "A year for the price of five months." — and cannot drift from the prices.

Every change went through the same gates (151 e2e and the axe pass by the end), and the pictures were taken again after.

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

## Where it lives

`github.com/tiltedneedle/Motivational_App`, branch `main`, pushed 2026-09-12 from this machine over the `github-tn` SSH alias (never an https remote here — see the machine notes). First push was `77a0070`, 35 commits after the UI pass began; the tree was clean and `pnpm verify` green at that commit. No CI yet: the gate runs locally.

## Blocked on the user
- A model endpoint (`pnpm sb secrets set LLM_BASE_URL=… LLM_API_KEY=… LLM_MODEL=…`, any
  OpenAI-compatible provider, or `ANTHROPIC_API_KEY`), a fal.ai key, RevenueCat keys: needed
  to test real providers. Everything runs on local fallbacks without them. The Supabase
  project itself is connected and live (schema through 0011, four functions, the account
  round-trip in `pnpm test:account`).
- Supabase Pro, or custom SMTP, before the six-digit-code email template can be pushed; the
  free tier refuses template changes, so the email carries a link and the app signs in from it.
- A Mac with Xcode, or an Android SDK, and a device: for the native build and the
  VoiceOver / TalkBack walk. Nothing here can show the native tab bar, the hold gesture,
  Dynamic Type at 200%, or the Android hardware back through the three volumes.
- Google sign-in: `signInWithGoogle(idToken)` is in `src/supabase.ts`; the native half (`@react-native-google-signin/google-signin`) needs the client's iOS and web OAuth client ids before it can be added and built.
- Crash reporting: Sentry's React Native SDK is a native dependency and a DSN; not added until there is a project to send to. Analytics is a seam already (PostHog key).
- Sound on the seal: an asset decision. Haptics are in; a placeholder click is worse than silence.
- The privacy policy and terms (§12): nothing in the app links to them because there is no text and no URL yet; a placeholder page would be worse than the gap. One row in Settings and one on Consent, the day the client's URL exists.

## Decisions log
- 2026-09-09: start. Stones via react-native-svg (works on web for Playwright tests) rather than Skia; Skia can replace later for grain.
- 2026-09-09: local store = zustand + AsyncStorage persistence for Phase 1 speed; SQLite/Drizzle migration is a hardening step once screens exist.
- 2026-09-10: the authorship rule is enforced in four independent places rather than one — `verifySpans`, `validatePlan`, `authorshipRatio`, and again in SQL. `guarded()` re-checks what the server already checked. Deliberate duplication: a person writing their own life should not depend on any single process being correct.
- 2026-09-10: the timed rituals are tested with Playwright's `page.clock` rather than a test-only fast-forward hook, so the fifteen minutes in the test is the same fifteen minutes the product ships.
- 2026-09-11: the concern band softens the register whatever persona is set. Somebody who chose "fierce" on a good week did not choose to be pushed on this one, and the alternative — honouring the setting — means printing "No negotiation with yourself this morning" at the person the band exists for.
- 2026-09-11: `Studio` holds one 560 pt column rather than each screen carrying its own max-width. Forty screens each remembering a number is forty chances to forget it, and the ground stays full-bleed so the constraint is on the writing, not on the room.
- 2026-09-12: the account is a copy of one device, not a merge. A push upserts and then prunes what the device no longer has, so two phones each writing their own Book take turns being the copy; nothing is lost on either phone. The day a merge is built, `pushAll`'s prune is what it replaces.
- 2026-09-12: the tab bar is Morrow's own pill on every platform for now, not expo-router's `NativeTabs`. The PRD asks for the native bar (glass on iOS 26, Material on Android, §7.14) and that is still the intent; it is native chrome that cannot be seen from this machine, moving Today, Book, Envision, Coach and You into a tab group changes what `dismissTo('/today')` means on every screen, and building it blind would mean shipping a navigation model nobody has run. It is the first thing to do on a Mac (Next steps, 1), with the e2e suite as the net.
- 2026-09-17: the 48-hour rule (§7.4) is the app's rule for the app's dates. A move whose
  sentence names its own day — "Saturday at 7am", "on the 28th" — is dated by the person and
  is never copied onto a day it contradicts; the plan opens on the first day they named, and
  the mornings before it are Today's "Nothing is scheduled" rather than a card that lies.
- 2026-09-11: the app's day, not the wall clock's, is what any screen prints. `dayOf(new Date(), boundary)` is the only definition of "today" in the product; a screen that reaches for `new Date()` to display a date is a bug even when it happens to agree.
- 2026-09-20: Welcome is one screen, not three (client: "seems very complex as a new
  person… don't force people through a long intro that they can't even reach the main
  page"). PRD §7.1 asked for three screens with the sittings and a persona; the sittings
  now stand on Today's empty state, which is the room they are for, and the persona lives
  in You with its default. Two doors on Welcome, both real buttons: Begin tonight, and
  Look around first. Nothing a person must read before the first tap is more than one
  screen long.

## Next steps

Everything that can be done on this machine, without a key, is done. Seven
audits are closed (the last four on the three volumes, each adversarially
verified), the built app is walked end to end by 517 checks, and the account
round-trips against the live project. What remains needs either hardware, a
credential, or a product call.

1. **Build it natively, once.** The tree is ready for it: `npx expo-doctor`
   passes 18/18, the Android prebuild generates cleanly, the icon and splash
   are committed, and `README.md` has the Mac steps. `cd apps/mobile && npx
   expo run:ios` on a Mac with Xcode, or `run:android` with an Android SDK.
   What only a device can show: the fonts, the hold gesture, the drag on Today,
   the safety card, Dynamic Type at 200% (the room, Today, the seal), the
   notification primer's "Yes" raising the OS dialog once, the microphone
   asked on the doorway and the recogniser in the room, the one-time-code
   autofill from Mail, the iOS keyboard on the Interview's custom field and a
   stone's "then I", VoiceOver and then TalkBack through the whole first run
   (Welcome → Consent → Interview → doorway → the Fifteen → read-back → order →
   stones → Portrait → seal → Today → seal the day), then the same through
   the other two volumes (the chooser's four doors, the Present deck and Full's
   narrowing step, the Past's periods and its Book question, and the Android
   hardware back on every step of both — on web it is intercepted by
   `usePlatformBack`; on native it is the stack's own `beforeRemove`, which
   nothing here can press), rotation, the haptics, the wallpaper landing in
   Photos, and dark mode following the OS. Then the one piece of P1 chrome that waits on a device:
   the native tab bar (`expo-router/unstable-native-tabs`, glass on iOS 26,
   Material on Android) in place of Today's pill — a `(tabs)` group for
   Today, Book, Envision, Coach and You, `dismissTo('/today')` re-pointed,
   and the e2e suite run against the web fallback.
2. **Wire the real providers** once the keys arrive (the account itself is live and round-trips — see "The account service, live"), and confirm `guarded()`
   still refuses what it should with a real model behind it. Every one of those
   paths is currently exercised only against `LocalProvider`, and
   `hasRemoteProvider` is false in every build so far — which is why the app
   says ten regular expressions rather than implying a second opinion it cannot
   get. With the Supabase values set, the functions are reached through the
   project's own host with the session's token; `EXPO_PUBLIC_MORROW_API` still
   wins when set. Then: sign in on the built app, push, wipe, sign in on a
   second install, pull, and compare the two stores; close the account and
   confirm the sweep.
3. ~~One `supabase db reset` against the real service~~ — done, and so are
   `functions deploy` and `config push` ("The account service, live"). What
   remains: `pnpm sb secrets set ANTHROPIC_API_KEY=… FAL_KEY=…` when the keys
   exist, and the project on Pro (or custom SMTP) so the six-digit-code email
   template can be pushed — until then the email carries a link, and the app
   signs in from it.
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
8. **Both of the volumes' loose threads are tied** (2026-09-16): a written
   fault is offered on that goal's Obstacles stone, and a paired virtue sits on
   its goal's page. One thing stays as it is by choice: a single Present draft
   slot, so ticking a card on one deck replaces a live draft of the other half,
   which the door routing makes a chosen act.
9. Then loop: implement, test, harden, research, repeat.

## Where the walkthrough habits are written down

Worth keeping on the next resume, because each cost an hour to learn:

- **Heredocs mangle escapes on this machine.** `\b` became a literal backspace
  byte (0x08) in the coach engine and a fix silently did nothing. Patch scripts
  go through the Write tool; `cat -A` finds the damage.
- **The browser pane is a real Chromium, not a webdriver**: the service worker
  registers in it, the wake lock and the fonts are real, and the microphone is
  blocked outright — which makes it the one place on this machine to see the
  refused-microphone path as a person would. It found the missing line.
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
- **`Label` renders in small caps, so `innerText` comes back upper-cased.** An e2e
  check that reads a Label compares case-blind (`.toLowerCase()`), or it fails on text
  that is exactly right.
- **`page.goBack()` can only be intercepted within one document.** `page.goto` makes a
  new document; the browser's back then unloads it, and no `beforeRemove` in the app can
  stop that. A platform-back check must reach the screen by an in-app tap (a door, a
  push), never by `goto`, and the entry behind it must be a different route.
- **A check behind a silent `if` is not a check.** `if (await seen(x)) { …checks… }` skipped two
  rounds of stone checks for a day because an earlier block had wiped the goals; the total
  went up by two instead of four and nobody noticed. Every guard is itself a `check(...)`
  now, and a block that navigates or wipes the store goes last in the walk. Read the count.
- **After a fan-out, check `git status` and file mtimes before staging.** The
  first audit's subagents edited twelve product files they had been told not to
  touch.
- **pnpm reads the first `minimumReleaseAgeExclude` rule whose name matches and
  stops.** A second entry for the same package is never seen. pnpm appends the
  entries itself when a fresh pick is approved, so after two rounds of Expo
  patches `expo@57.0.22` sat above `expo@57.0.24` and every install — even
  `--frozen-lockfile` — failed the lockfile policy check for eight packages
  that were all, by name, on the list. One entry per package, and
  `minimumReleaseAgeExcludePrune` so the list cannot grow into it again.
