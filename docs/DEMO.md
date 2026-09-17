# Showing Morrow in twelve minutes

For a room where nobody has seen it: the PRD's own demo script (§14.7), with the
build that makes it possible and the words to say at each step.

## Before the meeting (ten minutes, once)

```bash
pnpm build:web:demo && pnpm demo      # http://localhost:8790
```

`build:web:demo` is the normal web build with one flag, `EXPO_PUBLIC_DEMO=1`. Two
things change and nothing else:

- **The clocks are short.** The Fifteen is two minutes instead of fifteen, the shadow
  one minute instead of eight, and a sitting counts at eighty seconds instead of ten
  minutes. The ring, the nudges, the pause, "Close it here", "Five more minutes" — all
  exactly as shipped, at a length a meeting can hold.
- **There is a `/demo` screen** (also "Demo scenarios" on Welcome and under You) with
  a Pro switch for the device and lived-in stores to open: the first morning, five goals,
  three months in, a week away, day ninety, all three volumes — and "A new phone", which
  wipes the device. Every date
  in a scenario is moved so its "today" is the day of the demo: "sealed ninety days ago"
  is ninety days before whatever day it is.

The product build (`pnpm build:web`, the store builds) has neither. The scenarios are the
same fixtures the screenshot and accessibility sweeps use, so nothing in them is new to
the tests.

Use **Chrome, Edge or Safari** — "Say it" needs the browser's own recogniser, and Firefox
has none. Open the page once before the meeting and allow the microphone when it asks,
so the dialog is not the first thing the room sees. If the demo is on a deployed URL
rather than this machine, set `EXPO_PUBLIC_DEMO=1` on that deployment and it builds the
same way; it must be HTTPS for the microphone.

## What to say first (one minute)

"There is a writing program with real evidence behind it — students who did it stayed in
university and did better, and the effect held for years. It is a 2013 website of text
boxes: you write about the future you want, it emails you an essay, and then nothing.
Morrow is that program rebuilt as a phone coach, with one rule: everything in it is in
your own words. It never writes a sentence about your life. It asks, it quotes you back to
yourself, and it turns what you wrote into a plan you can start tomorrow."

## The walk

### 1. Cold open on Today — 30 s

Open `/demo`, choose **The first morning**. Today: the date, one sealed day, the person's
own first sentence quoted at the top ("Your line"), the Now card with a move cut from their
own writing, the stones for each goal, the Consistency number.

Say: "This is the home screen on the morning after the writing. Everything on it is a
quotation."

### 2. A new user, live — 4 min

`/demo` → **A new phone**. Welcome (three pages; skip them). "Have a look around first"
shows the empty home screen — no sign-up wall, nothing hidden. Then **Begin tonight**:
Consent (the age gate; what goes to an AI service, in plain words), then the Interview.
Let the boss pick his own areas and answer by tapping — it is under four minutes and never
asks for writing.

Then the doorway: **Say it**, Begin. Two minutes of talking about a Tuesday a year from
now. The ring fills, a nudge appears if he stops (always a question, never a word from his
own text), the clock can be paused. When it ends: **What I heard** — his own phrases, read
back as goal candidates. Point at the underline: their words are in a serif; the app's are
in the sans, everywhere, always.

Say: "Fifteen minutes is the studied dose. In this build it is two. A first user can stop
at ten and it still counts, can pause, can come back within a day."

### 3. One stone, then a sealed Book — 3 min

Order the goals, then one stone live — Strategies is the good one: tap a framing ("the
chips are ways in; the line is yours"), say or type a line with a time and a place, and
watch the follow-up ask "When, exactly, and where?" if it is vague. Keep the line.

Then `/demo` → **The first morning** again and open the Book from the tab bar: the
Fifteen typeset with its first sentence large, one chapter per goal with the five lines,
the if-then in a box, the "I will…" alone on the last page. **Lock screen** puts that line
on a wallpaper. **Declare it** puts it across a photograph.

Then the goal's page: the Blueprint. Every move shows the sentence it was cut from
underneath. Say: "No move exists without a line of his behind it. That is checked in code,
and a plan that fails the check is thrown away."

### 4. Today's gestures — 30 s

Back on Today: tap the stone on the Now card — it seats, the score moves. Drag one to
"Not today"; Undo. The coral plus adds a move in the person's words.

### 5. Envision — 1.5 min

The scenes built from the Impact lines, *The other road* in a lowered tone, and the
letter from the future self that quotes the Fifteen (120–180 words, never a goal or a
plan line — also checked in code). Export a wallpaper.

### 6. The coach — 1.5 min

Coach tab. Tap **I don't feel like it**: the reply quotes a day he actually kept and its
proof line, and offers the two-minute version of today's move, with Undo. Tap **I'm
stuck**: it reads back his own if-then. Then **What Morrow knows about me** under You:
the memory profile, every line of it his, every line forgettable.

Say: "The coach quotes before it suggests. It has no memory it cannot show you."

### 7. A missed week, and a Sunday — 1 min

`/demo` → **A week away**: Today opens on the return — "7 days. Nothing reset while you
were gone" — with the Returns letter. Then **Three months in**: Progress with eighty days
of ledger and two gaps come back from; the Book → Sunday reading, page by page, with the
Horizon Review on the last page and the Replan diff.

### 8. Day ninety, and the close — 1 min

`/demo` → **Day ninety**: the morning brief says the Book is waiting to be written again.
Open it. Re-authoring is a Pro feature, so on this free account the paywall is what
appears — the product's one soft ask: what Pro buys (every goal's plan, unlimited replans,
letters, wallpapers, the deep coach, the ninety-day rewrite), a seven-day trial, and a way
past it; never timers, fake discounts or interstitials. Say: "Nothing is charged in this
build; the store keys are the client's."

If there is time, switch **Morrow Pro** on at the top of `/demo` and open it again: each goal kept, rewritten in
fresh words, or let go with one line about what it turned out to be — and the new edition
prints "Since the first edition" on its first page. Close on the Full-track invitation,
which arrives once, after the first Book.

## If he asks

- **"Would I really give it fifteen minutes on day one?"** That is the bet of the
  program, and the product softens it without breaking it: the first sitting counts at ten
  minutes, it can be spoken rather than typed, paused, and finished within a day; the
  Interview before it is four minutes of taps and produces the goals on its own. The
  minimum is one constant (`STARTER_MIN_SECONDS`) if the client wants a shorter first
  evening; the fifteen is what the evidence is for.
- **"What needs a key?"** The real read-back, scene images, payments, the account email
  template, crash reporting. Everything shown here runs on the device.
- **"Is my writing sent anywhere?"** Only what the consent screen lists, only when an AI
  key is configured, and never audio: "Say it" uses the phone's or browser's own
  recogniser.
