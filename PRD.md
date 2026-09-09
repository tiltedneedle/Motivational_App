# MORROW — Product Requirements Document

**Working title:** Morrow (naming alternatives and trademark checks in §16)
**Category being created:** Self-authoring coaching. A writing program with evidence behind it, rebuilt as a phone-native coach that turns what you wrote into what you do.
**One line:** Morrow asks you the right questions, has you write your own future in your own words, turns that writing into a plan you can start tomorrow, and coaches you along it, one honest day at a time.

| Field | Value |
|---|---|
| Document version | 4.1 — 9 September 2026. A single complete rewrite. Supersedes v1.0 (8 Sept, future-self coaching) and the v3.x patches (9 Sept, Self Authoring re-base). |
| Status | Draft for client review |
| Phase covered | Phase 1 (four-week build, end to end, store-submittable); Phases 2 and 3 designed in §17 |
| Platforms | iOS 17+ (iOS 26 enhanced), Android 10+ (API 29+); web landing page |
| Team assumed | 1 lead engineer + 1 designer-engineer (solo cut list in §14.6) |
| Companion documents | *The Authoring Brief* (research), *The Morrow Authoring Script* (every prompt), *Morrow Flow Atlas* (every flow), the Studio design canvas; links in Appendix A |

---

## 0. How to read this document

Sections 1 to 4 explain *why*: the vision, the market, the science. Sections 5 to 7 define *what*: users, scope and the feature specifications with acceptance criteria. Sections 8 and 9 define *how it looks and moves*: the Studio design system and the screens. Sections 10 to 12 define *how it is built*: stack, data, AI, compliance. Sections 13 to 19 define *how we ship*: metrics, monetization, the four-week plan, risks, naming, later phases, resources, open questions.

**[P1]** is in the Phase 1 deliverable. **[P1-stretch]** ships if the schedule holds. **[P2]** and **[P3]** are designed now and built after the client demo.

**What this version is.** On 9 September the client decided that Morrow should be built entirely on the Self Authoring system (selfauthoring.com: Past, Present and Future Authoring by Peterson, Higgins and Pihl). This document is that product, written as one whole. The method comes from published research and is used freely; every prompt, name and line of copy is Morrow's own. The words "Self Authoring" and "Peterson" appear here as citations and nowhere in the product.

---

## 1. Executive summary

**The problem.** Every app in this category does a third of the job. Habit trackers count checkmarks but do not know why. Planners schedule days but have no idea of a life goal. AI journals (Rosebud, Stoic, Reflectly) talk every night and produce nothing you can act on in the morning. Vision-board and affirmation apps sell the feeling of a better future and abandon you at the first hard Tuesday. And the one product with real evidence behind it, the Self Authoring Suite, is a 2013 website of text boxes that emails you an essay and then does nothing: no plan, no days, no coach. In its most rigorous trial, participants asked for exactly the follow-up it does not provide.

**The insight.** Three bodies of evidence converge, and one of them sets a design law.
1. *Writing your own future in your own words changes what you do.* A randomised study of struggling students cut the share ending the term below a full course load from 20% to 0%; two large cohort studies found about 22% more credits earned, with the effect rising with stages completed, words written and the specificity of the plans, regardless of what the goals were about; a double-blind field experiment of 1,134 students found a smaller but durable effect independent of gender and ethnicity, and its focus groups named a chatbot coach as the missing follow-up (Morisano 2010; Schippers 2015, 2020; Dekker 2023).
2. *Specific plans, monitored progress and a vivid future self carry the rest.* Mental contrasting with if-then plans (d ≈ 0.65), progress monitoring (d = 0.40, larger when recorded and shared), and future self-continuity (MIT's Future You trial, n = 188) are the three best-evidenced levers on goal attainment (Oettingen; Gollwitzer; Harkin 2016; Pataranutaporn 2024).
3. *The design law.* When an AI writes the goals instead of the person, the goals score better and get acted on far less: 72.8% of self-authors acted on two or more goals within two weeks against 46.6% for AI-written goals, ownership mediated everything, and the people most likely to hand the pen to an AI lost the most (arXiv 2605.12344, May 2026). **The user writes it. The AI may ask, mirror, sort and typeset.**

**What Morrow is.** The complete Self Authoring system rebuilt for a phone, with a life after the writing:
1. **The Interview** [P1]: tap-only, Akinator-style. Which parts of life are pulling at you, what a win looks like in each, by when. Finds the goals in three minutes and seeds the writing.
2. **Authoring, Volume 1: Future** [P1]: *the Fifteen*, fifteen minutes of continuous writing by voice or text about life three to five years on; the optional *shadow* of the future to avoid; *What I heard*, the coach reading the user's own phrases back as goal stones; and five tap-then-write analyses per goal: motives, impact, strategies, obstacles, monitoring. Two depths: **Starter** (three evenings) and **Full** (the studied dose).
3. **The Book** [P1]: the user's writing typeset and sealed with a hold, read every Sunday, re-authored every ninety days with a diff, exportable as a PDF and a lock screen. Self Authoring sells this object for $15; here it is the spine of the product.
4. **The Blueprint** [P1]: the plan, generated only from the user's Strategies, Obstacles and Monitoring lines, each move showing the sentence it came from; editable, versioned, replanned with diffs.
5. **Today** [P1]: goals are stones you seat, drag and park; routines sink one step at a time; the day is sealed with a hold.
6. **Envision** [P1]: generated scenes of the practice and the outcome sourced from the user's own Impact lines; the shadow rendered on request as *The other road*.
7. **The Coach** [P1]: memory-bearing; reads the Book; writes dawn briefs that quote the user's own sentences; answers "I'm stuck" with the user's own if-then; never writes a goal.
8. **The Bench** [P2] (Present volume: faults and virtues in plain words), **the Declaration and a witness** [P2], **the Quarry** [P3] (Past volume, two memories per goal), **cohorts for institutions** [P3].

Progress is a **Consistency Score** and an **Evidence Ledger**, never a streak; the Monitoring line each user writes defines what counts as evidence for that goal.

**An honest note on dose.** The studied program asks for paragraphs at every step; its users write 18,000 to 35,000 words. Morrow's default Starter track asks for fifteen minutes of continuous writing and one specific line per analysis, with full depth on the top three goals. That is a reduction of the mechanism the 2020 study measured. So the Full track keeps the studied dose, the coach invites people up one level after their first sealed Book, and only the Full track is ever described as the evidence-tested program.

**Why it will look like nothing else.** The *Studio* direction (§8): a softly lit studio ground, every goal a dimensional stone you physically seat, a night studio for the writing rooms and the seal, Outfit for the interface and a text serif reserved for the user's own words. Nothing on screen is a form. The Fifteen is a room; the Book is a book.

**Business shape.** Freemium. The first Book is free; the second goal's Blueprint, re-authoring, the Bench and the Quarry are premium. $9.99 a month, $49.99 a year with a 7-day trial, an optional $149.99 lifetime. *Gift a chapter* mirrors Self Authoring's two-for-one and pairs the receiver as a witness. Institutional cohorts, the setting of every study, are the Phase 3 channel.

**Phase 1 in one month.** Interview, the Future volume end to end on both tracks, the Book, Portrait and Blueprint from the user's lines, Today, Seal, Consistency and Ledger, Envision with the shadow render, the Coach reading the Book, paywall, widgets, offline-first, analytics, TestFlight and the Play internal track. Week by week in §14.

---

## 2. Vision, positioning, principles

### 2.1 Vision
By 2028, "Morrow" should mean writing your own future and then living by what you wrote, the way "Strava" means logging a run. North star: **Days with Evidence**, days on which a user logged at least one act of becoming the person they described in their Book. Leading indicator: **Books sealed**.

### 2.2 Positioning
For people who keep buying planners and abandoning them, Morrow is the writing program with evidence behind it, rebuilt as a coach: it asks you the right questions, has you write your own future, turns that writing into a plan and a daily practice, and remembers what you wrote. Unlike habit trackers, AI journals and the original website, which ends when the essay is emailed, Morrow is the follow-up.

### 2.3 What Morrow is not
- Not therapy or a mental-health product. No diagnosis, no treatment claims (App Store 1.4.1; §12.5). It coaches goals and routines, with a safety layer for everything else.
- Not a journal. The user writes a few times, deeply, and then lives by it. A daily diary is not the loop.
- Not a ghostwriter. The AI never writes a goal, a plan line or a Book sentence (§11.1).
- Not a social network. Sharing in Phase 2 is one witness, no feed.
- Not a general assistant. The coach acts only on the plan, the ledger, the Book and reflections; no web, no calendar write in Phase 1.
- Not Self Authoring. Method from public research; prompts, names and voice are Morrow's.

### 2.4 Product principles (used to settle every design argument)
1. **You write it.** Every goal, plan line and Book sentence is typed or spoken by the user. Choices help people find the words; the words are theirs. Authorship ratio (§13.1) is a health metric.
2. **Choices to find, words to own.** Finding a goal is a tap. Owning it is a line in your own words. Never a blank page first; never a tap instead of the line.
3. **Plans, not chats.** Every AI interaction ends in something on the plan, the ledger or the calendar. Chat is a means.
4. **Forgiveness is the mechanic.** Missed days are expected and designed for. Returns are celebrated. Nothing resets to zero.
5. **The future self is a person.** They have a room (the Fifteen), a Book, letters and scenes, and in Phase 2 a face and a voice.
6. **One honest read.** Today: what now? Goal: am I on the path? Envision: why? Coach: what do you see? Book: what did I say?
7. **Process before outcome.** Every vision of an outcome is paired with a vision of the practice; every wish is contrasted with its obstacle (WOOP).
8. **Quiet AI.** Capture, read-back, plan generation, replans and briefs happen inside the product's own forms. Chat is never the home screen.
9. **Honest time and honest dose.** Every sitting shows its real length. Starter is labelled a starter.
10. **Nothing looks generated.** Every screen passes the anti-template checklist (§8.10).
11. **Privacy is a feature.** Writing is private by default, exportable, deletable in-app, never used for ads; AI sharing is disclosed explicitly.
12. **Ship polished or don't ship.** Every state (empty, loading, error, offline, first-run, reduce-motion, large type) is designed.

---

## 3. Market and competitive synthesis

Full landscape for 40+ apps in `docs/research/01-competitive-landscape.md`; incumbents in `05`; the Self Authoring research in *The Authoring Brief* (Appendix A).

### 3.1 The category in 2026
- Subscription apps launch at about 14,700 a month (RevenueCat, Jan 2026) against 2,000 in 2022; the top quartile grew 80% year on year and the bottom quartile shrank 33%. AI apps earn 41% more per payer and churn 30% faster: novelty without a retained habit.
- Digital journal apps are a $6–7 billion market growing about 11% a year; AI prompts and sentiment features are the growth story. Rosebud (Bessemer, $6M, 150K+ users, $12.99 a month) leads AI journaling; Stoic claims 4 million users on a morning-and-evening prompt loop; Day One is the $34.99-a-year incumbent. All are diaries: daily entries, no goal, no plan, no coach acting on what was written.
- Incumbents have moved: Headspace's Ebb (MI companion with voice and memory), Insight Timer's AI librarian tied to a daily intention, Oura Advisor, Structured's foundation-model suggestions. None has a goal-to-plan-to-evidence loop, and none asks the user to author anything.
- The self-authoring lane is open. Self Authoring itself has no app, no coach and a 2013 interface; its companion Understand Myself is a $9.95 personality report. MIT's Future You proved the future-self mechanism (RCT, 60K users) as a research demo. FutureMe has 20M letters and a 2.8-star app.
- Digital wellbeing interventions die early: unguided programs lose most users after one or two sessions; one analysis of 100,000 mental-health-app users found a median retention of 5.5 days. Reminders and a human or coach presence trend toward better adherence. The Self Authoring dropout numbers (half of the Mohawk treatment group never analysed their goals) are the same pattern. Morrow's sittings, dawn-brief threading and the coach exist for this.

### 3.2 Direct competitors

| Competitor | Rating / scale | Price | Where it wins | Where it loses |
|---|---|---|---|---|
| Self Authoring Suite | 10,000+ students; research base | $14.95 per program, $29.90 suite | The only evidence-tested writing program; the essay people keep | 2013 form wizard; ten-hour reality vs two-hour promise; nothing after the email |
| Rosebud | 150K+ users; VC-backed | $12.99/mo, $8.99/mo annual | Conversational AI journaling, voice, insights | Daily diary loop, no goals or plans, usage caps, data-training worries in reviews |
| Stoic | 4M users | freemium | Morning/evening prompt ritual, mood tracking | Generic prompts, no authored future, no plan |
| MyFutureSelf | 4.7 (1.1K) | $9.99/mo | The only shipped "future self + roadmap" app | Generic UI, thin |
| Fabulous | 4.4 (89K) | $49.99/yr | Immersive rituals, science branding | Dated journeys, billing complaints |
| Structured | 4.8 (165K) | $9.99–49.99/yr | Best day-timeline UI, quiet AI | No goals layer, no coaching |
| Headspace (Ebb) | 4.8 (974K) | $69.99/yr | Trusted brand, MI companion | "Everything locked", no plan output |
| Finch | 4.9 (749K) | freemium | Forgiving companion loop | Juvenile for ambitious adults |
| Opal | 4.7 (87K) | $99.99/yr | Premium UI, commitment onboarding | Narrow, pricey |

### 3.3 Gaps Morrow fills

| Unmet need | Morrow answer |
|---|---|
| The evidence-tested program has no follow-up | The daily loop, the coach that quotes your Book, Sunday reading, Day-90 re-authoring |
| AI journals produce diaries, not direction | Author once, deeply; then live by it |
| No product connects goal → plan → routine → today → evidence | Book → Blueprint → Today → Ledger, all from the user's lines |
| Streak loss churns users | Consistency Score and Returns, no zero reset |
| AI is "underwhelming" or forgets | The coach reads the Book; briefs quote it; memory profile the user can edit |
| Future self proven but unbuilt | The Fifteen, scenes from the user's Impact lines, letters quoting the Fifteen |
| Long-form writing dies on phones | Voice-first Fifteen, three sittings, tap-first framings, depth as polish |
| Data loss and sync bugs | Local-first store; the Book exportable after every seal |

### 3.4 Pricing benchmarks (used in §13)
RevenueCat 2026: median monthly $10.00, yearly $34.80 (Health & Fitness $39.94); hard paywall 10.7% download-to-paid versus 2.1% freemium; trial-to-paid 37.4% for 5–9-day trials, 42.5% for 17–32-day trials. Adapty 2026: annual subscribers retain 44.1% at 12 months versus 17.5% monthly; 89.4% of trial starts happen in the first session. Self Authoring: $14.95 per program, $29.90 for the suite as a two-for-one; Understand Myself $9.95 with a $19.90 partner bundle.

### 3.5 Trends we design with and against (2026)

| Trend | What is happening | What Morrow does about it |
|---|---|---|
| **The LLM as journal and therapist** | In one survey, 48.7% of AI users reporting mental-health challenges use general chatbots therapeutically; the APA's November 2025 advisory says chatbots may be an adjunct, never a substitute. People already write their lives into ChatGPT. | Morrow's differentiation is not "a chat"; it is an authored, sealed document the coach reads back. The safety layer and the "not therapy" boundary are product features, not disclaimers. |
| **AI companion scrutiny** | The FTC's September 2025 inquiry into companion chatbots; the Character.AI settlements (January 2026) with new under-18 safeguards; Apple's 2026 rules requiring explicit consent for third-party AI data sharing and AI-model declarations. | Age gate 16+, 17+ rating, consent screen, no romantic or dependency role-play, the coach never pretends to be a person, memory editable and deletable, AI disclosure in one tap (§11.6, §12.5). |
| **Voice-first and memory-bearing agents** | Persistent-memory companions and voice interfaces are the default expectation; wearables (Whoop Coach, Oura Advisor, Strava's Athlete Intelligence) ship conversational coaches on the user's own data. | Voice is the default mode of the Fifteen; the coach's memory is the Book, which the user wrote and can read; wearable data is Phase 2, and only ever to place moves, never to judge. |
| **Apple Journal and the Journaling Suggestions API** | iOS ships a free journal with on-device suggestions; Day One and others adopt the API. | Morrow is not a diary and does not compete for daily entries; the Journaling Suggestions API is used, with consent, to seed captures on Today [P1-stretch]. |
| **The "lock-in" and future-self content wave** | TikTok's 2026 forecast names public commitment with small accountability tribes (#TheGreatLockIn); "interviewing my future self" and end-of-year letters trend with Gen Z. | The Declaration and one witness [P2] are the product's only social surface; the "I will" lock screen and the Fifteen's first sentence are the shareable objects; no feed. |
| **Life OS templates** | 2026 Notion "Life OS" templates connecting vision to daily action are a top marketplace category, with vision boards, 12-week planners and annual reviews. | Morrow is the Life OS that writes itself from your words: Book → Blueprint → Today → Sunday → Day 90, with no setup. |
| **Subscription fatigue and AI churn** | AI apps earn more per payer and churn 30% faster; hard paywalls convert five times better than freemium but burn goodwill. | The first Book is free and exportable forever; the paywall is one moment after the Blueprint; nothing trivial is paywalled. |
| **Peterson's ecosystem** | Peterson Academy (84,000+ students, $399 a year) and Understand Myself ($9.95) grow around the same audience; Self Authoring itself has not shipped an app. | The audience exists and pays; Morrow serves it without the name, on method alone, and can reach it through cohorts and coaches. |

---

## 4. Evidence base

### 4.1 Strong evidence (the core is built on these)

| Finding | Source | How Morrow uses it |
|---|---|---|
| Writing about personal goals and plans (ideal future, goals, strategies) raised term GPA and cut the share of struggling students dropping below a full course load from 20% to 0% | Morisano, Hirsh, Peterson, Pihl & Shore, *J. Applied Psychology* 2010 (n=85, randomised) | The Future volume is the core of onboarding, not an optional journal |
| A 4–6 hour staged online goal-setting program raised credits earned by ~22%; ethnic-minority men gained most | Schippers, Scheepers & Peterson, *Palgrave Communications* 2015 (n=703 vs 3 control cohorts) | Staged sittings; a public "I will" statement becomes the Declaration [P2] |
| The effect grew with stages completed, words written and the specificity of goal-attainment plans; goal *type* did not matter | Schippers, Morisano, Locke, Scheepers, Latham & de Jong, *Contemp. Educational Psychology* 2020 (n=2,928) | Depth shown as polish; the specificity follow-up; stage completion is the activation funnel; the Full track keeps the dose |
| Randomised at college orientation: leaving rate down 3.3–4.3 points (men 5.9–8.0); GPA unchanged; 22% wrote no goals and 29% never analysed them | Finnie, Poirier, Bozkurt, Peterson, Fricker & Pratt, HEQCO 2017 (Mohawk College) | Sittings under thirty minutes, dawn-brief threading, five analyses only for the top three goals on Starter |
| Double-blind randomised field experiment: +1.08 credits after one semester, +2.70 after a year, lower dropout, d ≈ 0.13, independent of gender and ethnicity; focus groups asked for a mentor follow-up and named a chatbot coach | Dekker, Schippers & Van Schooten, *J. Research on Educational Effectiveness* 2023 (n=1,134) | Honest effect sizing; the coach and the daily loop are the follow-up; two parts three to seven days apart is a tested spacing |
| AI-written goals scored higher on SMART criteria (d=2.26) but lowered ownership (d=1.38) and action (46.6% vs 72.8% acted on two or more goals); ownership mediated; low self-efficacy users lost most | *Optimized but Unowned*, arXiv 2605.12344, May 2026 (n=470, preregistered) | Principle 1; authorship rules (§11.1); authorship ratio instrumented |
| Monitoring goal progress raises attainment (d=0.40 across 138 studies); larger when progress is physically recorded and reported to others | Harkin et al., *Psychological Bulletin* 2016 (n=19,951) | The Monitoring stone names the proof; the Ledger records it; the witness [P2] receives it |
| Setting goals has a unique effect on behaviour change (d=0.34 across 141 papers) | Epton, Currie & Armitage, *J. Consulting and Clinical Psychology* 2017 | Goals named in the user's words before anything else |
| Mental contrasting with implementation intentions beats positive thinking alone (d ≈ 0.65 for if-then plans) | Oettingen; Gollwitzer & Sheeran 2006 | The shadow write; the Obstacles stone as *If ___, then I ___* |
| A brief conversation with an AI future self reduced anxiety and raised future self-continuity | Pataranutaporn et al., MIT Media Lab, *IEEE FIE* 2024 (n=188, preregistered RCT; 60K users) | Letters from the future self that quote the Fifteen; Future You face and voice in Phase 2 |
| Best Possible Self writing: well-being d=0.33, optimism d=0.33, positive affect d=0.51 | Carrillo et al., *PLOS One* 2019 (meta-analysis); King 2001 | The Fifteen opens Sitting 1, before anything hard |
| Expressive writing about the past: overall r=0.075 across 146 studies | Frattaroli, *Psychological Bulletin* 2006 | The Quarry is per goal and Phase 3; past writing earns its place through the goal it feeds |
| Reflective growth-goal setting raised self-efficacy and performance; reflection and goal-setting reinforced each other | Travers, Morisano & Locke, *Brit. J. Educational Psychology* 2015 (n=92) | Sunday reading before the Horizon Review |
| Dictation runs at ~150 words a minute against 40–60 typed, holds a 3× advantage after corrections, and lowers cognitive load for long-form composition; on-device recognition is ~98% accurate | Stanford/UW/Baidu dictation study; CMU StepWrite, UIST 2025; Whisper benchmarks | Voice is the default mode of the Fifteen; the transcript is the user's editable text |
| Progress simulation (imagining the work) beats outcome simulation (imagining the result) | Pham & Taylor 1999 | Every outcome scene is paired with a practice scene |

### 4.2 Useful but mixed evidence (used lightly, never as claims)
- Growth mindset: small average effects (Sisk 2018), larger for at-risk students. Coach language only ("yet").
- Grit: overlaps with conscientiousness (Credé 2017). Not measured.
- Fear appeals: work only with high efficacy (Witte; Tannenbaum 2015). The shadow is optional, opt-in and always followed by a first step.
- Accountability "65%/95%" statistic: unverifiable; never cited. Public commitment helps modestly (Harkin; Rotterdam stage 3); designed as one witness, not a feed.
- Chronotype scheduling: reasonable heuristics; Morrow asks chronotype and places hard moves in the peak window, and claims nothing biological.
- Streak freezes: loss aversion retains and churns; Consistency and Returns instead.
- "AI features raise retention 15–20 points" (market reports): vendor-sourced; not used for targets.

### 4.3 Coaching method
Motivational Interviewing structure (Miller & Rollnick): open questions, affirmations, reflections, summaries; importance and confidence rulers captured in the Interview; change talk before advice; advice with permission. The coach's system prompt (§11.4) encodes these rules, the authorship rules and the "not therapy" boundary.

---

## 5. Users, personas, jobs to be done

### 5.1 Primary personas
**Maya, 29, product manager, "The Restarter".** Has bought Fabulous, Notion templates and a paper planner in eighteen months. Starts strong every January and quits by week three when a streak breaks. Wants to feel her effort accumulate. Fears another app that shames her. iPhone 15, peak time the 7–8 am commute. *Track: Starter, by voice on the walk.*

**Daniel, 41, small-business owner, "The Builder".** A big vague ambition (sell the company in five years, be healthy enough to enjoy it). Does not know how to break it down. Skeptical of AI fluff; will trust a plan that shows where every line came from. Pixel 9 and iPad. *Track: Full, three evenings a week for two weeks.*

**Priya, 22, final-year student, "The Dreamer".** Vision boards, affirmation apps, TikTok routines. High motivation, low structure. Wants to *see* her future and be told what to do today. Price sensitive; will pay annual if the first week feels transformative. *Track: Starter; the scenes are her reason to stay.*

**Tom, 35, nurse on shifts, "The Off-Schedule".** Routine apps assume 9 to 5. Needs routines anchored to shift patterns and energy, and forgiveness when a night shift wrecks the plan. *Track: Starter; the Bench in Phase 2 names "I disappear when it gets close".*

**Nadia, 47, dean of students, "The Buyer" [P3].** Runs orientation for 1,200 first-years. Has read the Rotterdam and Mohawk studies. Wants the program with the evidence, an admin view of completion and depth (never content), and a research-ready export. *Track: Full, scheduled by the institution.*

### 5.2 Jobs to be done
- When I have a vague ambition, help me find what I actually want, so I can commit to something specific.
- When I have found it, make me say it in my own words, so it is mine.
- When I have written it, give me a plan I believe in because I can see where each line came from.
- When I open the app in the morning, tell me the one to three things that matter today, in my own words.
- When I miss days, help me return without shame.
- When motivation fades, show me what I wrote and who I am becoming.
- When a week goes badly, adapt the plan to reality instead of leaving it as a monument.
- When I want proof, show me the evidence I said would count.

---

## 6. Scope and loops

### 6.1 Phase 1 scope (MoSCoW)

**Must [P1]**
1. Welcome, consent and the tap-only Interview (§7.1).
2. Authoring, Volume 1 (Future) on both depth tracks: the Fifteen (voice or text), the shadow write, What I heard, rank and title, the five analyses, the "I will" line, Seal the Book (§7.2).
3. The Book: typeset, versioned, PDF and lock-screen export; Sunday reading (§7.3).
4. Portrait and Blueprint from the user's lines, editable, versioned, Replan with diff (§7.4).
5. Practices: routines and habits with schedules, energy slots, two-minute versions, stacking (§7.5).
6. Today: stones as the check control, drag to park, routine steps, the Now card, the new-move sheet, Seal the Day (§7.6).
7. Progress: Consistency Score, Returns, Evidence Ledger, Almanac, goal Path (§7.7).
8. Envision: scenes from the user's Impact lines, *The other road* on request, letters that quote the Fifteen, wallpapers (§7.8).
9. The Coach: dawn brief, evening reflection, Horizon Review, chat with memory of the Book, voice input, persona, safety layer (§7.9).
10. Notifications with the one-per-moment rule; iOS widgets (§7.11).
11. Account (Apple, Google, email OTP), export, in-app deletion, privacy controls (§7.12).
12. Monetization: paywall after the Blueprint, free tier, restore (§7.13).
13. Themes: day studio and night studio, light and dark, iOS 26 glass on chrome only, Material-aware Android (§7.14).
14. Quality: haptics and sound, motion system, accessibility, offline-first, analytics, crash reporting, Maestro smoke tests, TestFlight and Play internal track.

**Should [P1-stretch]**
15. Live Activity for a running routine. 16. Spoken coach replies (on-device TTS). 17. Share cards for the "I will" line. 18. Android widget. 19. Device calendar read.

**Won't (Phases 2 and 3, §17)**
The Bench, the Declaration and witness, gift a chapter, Day-90 re-authoring, the Quarry, cohorts, the Council of mentors, Future You face and voice, vision films, wearables, pods, web app, marketplace.

### 6.2 The first three days (Starter) or two weeks (Full)

| Sitting | When | What | Length |
|---|---|---|---|
| 1 | Day 0, evening | Interview → the Fifteen → optional shadow → What I heard → goodnight | 25–35 min |
| 2 | Day 1, morning | Dawn brief quotes the first sentence → rank → title → Motives and Impact for the top three | 15–20 min |
| 3 | Day 1, evening | Strategies, Obstacles, Monitoring → "I will…" → Seal the Book → Portrait → Blueprint → account → paywall | 20–30 min |
| Full track | Two weeks | Five to seven sittings three to seven days apart; a paragraph per stone on every goal; the shadow required; "Add to it" second pass of the Fifteen | under 40 min each |

### 6.3 A day

| Moment | Surface | What happens | Time |
|---|---|---|---|
| Wake | Notification → Coach | Dawn brief: yesterday's proof, today's first move, one if-then, all quoting the Book | 60–90 s |
| Through the day | Today, widgets | Stones seated, parked or stepped; captures by text or voice | 10–30 s each |
| A hard moment | Coach | "I'm stuck" → the coach quotes the user's own if-then → one action written to Today | 2–3 min |
| Evening | Seal the Day | A word, a proof, a thing you are glad of; the hold; the evening reflection | 90 s |
| Day boundary | — | Unsealed days seal themselves as quiet days; no penalty | 0 |

### 6.4 A week, ninety days, a year

| Cadence | What |
|---|---|
| Sunday | Sunday reading of the Book (ten minutes) → Horizon Review → Replan diff |
| After two or more missed days | Returns letter on open, one move at the two-minute version |
| Milestone dates | New scene; letter from the future self |
| Day 90 and every 90 [P2] | Re-authoring: two Books side by side, keep / rewrite / let go, a new edition sealed with its diff |
| Year | The Almanac as a shelf of stones; a Wrapped-style recap [P2] |

---

## 7. Feature specifications

Each specification has purpose, contract or flow, UI, AI, data, edge cases and acceptance criteria. Screens are named as in §9; every flow is drawn in the *Flow Atlas*; every prompt is written in the *Authoring Script* (Appendix A).

### 7.1 Welcome and the Interview [P1]

**Purpose.** Find the goals by taps, in under four minutes, the way Akinator narrows a character, and hand them to Authoring where the user writes them. The Interview never asks for writing; it seeds the writing.

**Flow.**
1. **Welcome, three screens.** A stone settles on the studio floor; "Meet who you're becoming"; the three sittings with their real lengths; your name and how you want to be spoken to (gentle, straight, fierce). No sign-up wall.
2. **Consent.** One screen: what goes to an AI service and why, a link to the policy (App Store 5.1.2(i)). Continue is consent.
3. **Question 1.** Which parts of life are pulling at you right now? Health, Money, Work & craft, Mind & sleep, People, Home; multi-select; "Something else…" opens a one-line field and adds a custom area as its own stone. Continue with N.
4. **Per chosen area.** What would a win look like (four choices plus Something else); a follow-up that sharpens it (three or four choices), skipped for a custom answer; by when (three months, six months, a year, no deadline). A stone forms in the tray.
5. **One last question.** Who already lives a piece of this? Family, a friend, someone I have read about, someone else; one line: what they have that you want. This seeds the Fifteen.
6. **Here is what I heard.** The stones with names and horizons, each with Drop, plus Add another goal. The ink button reads "Begin the Fifteen".

**Adaptive engine.** Twenty-four scripted branches cover the six areas in the prototype. In the product a server-side question engine keeps a belief state (domain × archetype × horizon) and picks the next question by information gain, constrained to the tap-only answer types and returning `InterviewTurn` (§11.3). Hard rules: never more than twelve questions; every answer is a pill; "Something else…" is always last; the three rulers (importance, confidence, readiness) are captured as taps on a five-stone scale.

**UI.** The coach's pearl sits top-left inside a clarity ring that fills as questions are answered, with its running guess in italics built from the user's own picks ("Something about health, money, guitar…"). Every choice is a pill with a letter badge; tapping fills it ink for a beat and the next question slides in from the right. A tray at the bottom shows one slot per area: outlined for those still to shape, ink for the current one, a stone once formed.

**Data.** `interview_sessions` (belief_state, transcript, clarity, completed_at); stones become `goals` rows in state `named`.

**Edge cases.** Works offline (it is data, not AI, until the engine is enabled; the scripted bank is the offline fallback). Zero areas: Continue is dimmed. More than eight areas: capped, with an offer to drop one. Back always keeps answers.

**Acceptance.** Median completion under 4 minutes, 90th percentile under 7; completion ≥ 70% of users reaching question 1; VoiceOver announces each question and the ring's progress.

### 7.2 Authoring, Volume 1: Future [P1]

**Purpose.** The Future Authoring program rebuilt for a phone and connected to a life. The user writes their own future in their own words and analyses each goal five ways; the writing becomes the Book, the Portrait, the Blueprint and the coach's memory.

**The contract.**
- The user writes every line. The AI never proposes goal text; it quotes, sorts, asks and typesets.
- Choices first, writing last: each analysis screen offers three or four tappable framings, then the user's own words: one specific line on Starter, at least a paragraph on Full. Nothing counts until the words are written.
- Continuous writing: the Fifteen is fifteen minutes without stopping, voice or text, no editing during, sealed as a read-only draft for 24 hours after.
- Honest time: sittings show their real length and are enforced by sitting boundaries.
- Specificity: a Strategies or Monitoring line without a time, place or number gets one follow-up, "When, exactly, and where?", and never a second.
- The shadow is optional on Starter, required on Full, always after the ideal, never the default view anywhere.
- Voice is writing: the transcript is the user's editable text; audio is discarded unless kept.
- No jargon on screen.

**Depth tracks.** Chosen at the opening, changeable any time in Settings; nothing written is lost by switching.

| | Starter (default) | Full (the studied dose) |
|---|---|---|
| The Fifteen | 15 min; ring closes or 10 min counts | 15 min floor; "Add to it" second pass the next evening |
| The shadow | Optional, 8 min | Required, 15 min, before What I heard |
| Goals analysed | Five stones for the top three; Strategies and Obstacles for the rest | Five stones for every goal, six to eight goals |
| Answer length | One specific line; one follow-up | A paragraph; the program's five follow-up questions shown as prompts; a soft floor of 600 characters shown as polish, never an error |
| Sittings | Three, under 30 min | Five to seven, under 40 min, three to seven days apart |
| The Bench [P2] | 12 cards a deck, pick up to three | 40 cards a deck by trait; pick two to eight per trait, narrow to six to nine, rank; ten minutes each |
| The Quarry [P3] | Two memories per goal | The seven-epoch program as a separately consented program |

The coach invites a user to Full once, after the first sealed Book, quoting their longest stone: "You wrote this much about the run. Want to go that deep on the rest?" Never again unprompted. Store copy calls Full the program with the research behind it and Starter the way in.

**Sitting 1 (evening, 25–35 min).**
1. *Opening.* Three sittings and their real lengths; Begin or Not tonight (schedules a reminder); the depth question, Starter preselected.
2. *The Interview* as the warm-up (§7.1).
3. *The Fifteen.* Night studio: one large stone over a slot, a ring that fills over fifteen minutes, no toolbar, no back. Doorway: three to five years on, it went as well as it could, describe a Tuesday. Modes: say it (default), type it, walk and say it. Seeds from the Interview sit in the margin as quotes; tapping one drops it into the page. After eight seconds idle the stone dims and one of eight rotating question-only nudges appears ("Keep going. Say the next true thing." "Who notices the change first?"), never containing nouns from the user's text. Close: the stone seats; polish reflects depth; Read it back (coach voice) or continue.
4. *The shadow.* Same room, light lowered, no nudges; "Closed. You can render this as a scene later, or never."
5. *What I heard.* The coach lists phrases quoted verbatim from the Fifteen as stones coloured by guessed domain, each with Keep, Merge (which words stay?) or Not a goal. Every span must be a substring of the user's text, verified in code. The user names each kept stone in one line. Fewer than three stones: one question, "What did you leave out on purpose?", and stop.
6. *Goodnight.* The tray, matte; the dawn brief will open with the user's first sentence.

**Sitting 2 (morning, 15–20 min).** The dawn brief quotes the first sentence. Rank by dragging the stones; the top three gain a ring. Title the plan: framings ("A year of…", "The one where I…", "Back to…") then one line, which becomes the Book's spine. Motives and Impact for the top three: the question varies by domain (Money: "What does this buy that money can't?"; People: "What would you have said sooner?"), three or four framings, then the user's words. Impact lines feed the scene prompts.

**Sitting 3 (evening, 20–30 min).** Strategies for every goal ("What happens on an ordinary Tuesday because of this?"; the specificity follow-up; feeds the Blueprint, which shows this line under each move). Obstacles for every goal ("What stops this? You already know."; two lines as *If ___, then I ___*; feeds the coach's "I'm stuck" reply; pre-filled from the Bench in Phase 2). Monitoring for the top three ("How will you know it's working before it's done?"; names the proof and the cadence; becomes the goal's evidence rule and first milestone; the date framing sets the due date). Goals four to eight on Starter get a "Go deeper" stone that unlocks the other three analyses any later day. Then "I will…", the one screen with no framings, and Seal the Book with the hold.

**UI.** Night studio for the writing rooms; the studio ground for the analysis half-sheets. One component used twelve times: question in Outfit 22, framings as chips, the user's words in the serif with a coral underline, a paragraph box on Full with the prompts above it, a stone that seats when the words are saved. Polish, not counters.

**AI.** One structured call for What I heard (`ReadBack`, §11.3) with the substring rule enforced in code; a deterministic specificity check (times, places, numbers, weekdays) for the follow-up; no generation anywhere else in the volume.

**Data.** `authoring_sessions`, `authoring_texts`, `goal_analyses` (§10.3). Every user line stored verbatim; framings stored as option ids; words, seconds writing and idle nudges logged per text; track on every row.

**Edge cases.** Leaving mid-Fifteen: the draft is kept and the timer resumes once; a second abandonment ends the sitting and the dawn brief invites a fresh start. Under two minutes written: allowed; the chapter is marked short and Sunday reading offers "Add to it". Network down at What I heard: the read-back queues; the user names stones from the Interview tray; the coach's spans arrive later as "I also heard…". Safety: every text passes the screen in parallel; concern softens the next prompt; crisis pauses the sitting and shows resources.

**Acceptance.** Fifteen completion (ring closed or ≥ 10 minutes) ≥ 60% of entrants; top-three goals fully authored ≥ 45% of Sitting 1 completers; median Sitting 1 under 35 minutes, Sitting 2 under 20, Sitting 3 under 30; 100% of read-back spans verified as substrings; authorship ratio ≥ 0.95 at every seal; Full-track uptake ≥ 20% of sealers by day 30; switching tracks preserves every character; VoiceOver: the Fifteen fully usable with dictation, ring progress announced each minute.

### 7.3 The Book, Sunday reading and re-authoring [P1 / P2]

**Purpose.** Self Authoring's only product is an emailed essay. The Book is that essay made into an object that comes back into the user's week.

**The Book [P1].** A typeset document: Outfit for headings, the text serif for the user's words, a spine title and the seal date. Pages in order: the Fifteen unedited with its first sentence set large; *The other road* on a facing page in a lowered tone if written; contents (the goals in rank order with names and due dates); one chapter per goal with the five lines or paragraphs as written, the tapped framings small and grey, the if-then in a box, and in Phase 3 any Quarry memories marked "from before"; the "I will…" line alone on the last page. Exports: PDF, a lock-screen image of the "I will" line, a one-page print. Every seal creates a version; nothing is overwritten.

**Sunday reading [P1].** Ten minutes with the Book before the Horizon Review: a reading view with no controls but a page turn; at the end, *Still true* or *Something moved*, the second opening the review with that goal preselected. On Full, a chapter a week is suggested.

**Day-90 re-authoring [P2].** Two Books side by side. Per stone: Keep, Rewrite (the same screens with the old line above the new) or Let it go ("What did it turn out to be instead?"). The new edition is sealed with the hold; the diff is its first page. The calendar is Morrow's: the dawn brief opens it on day 90 and every 90 after.

**Data.** `books`, `book_versions`. **Acceptance.** The Book renders within 1 s from local data; PDF export under 5 s; Sunday reading opened in the first fortnight by ≥ 50% of sealers.

### 7.4 Portrait and Blueprint [P1]

**Portrait.** Built only after the five stones exist. Full screen: the goal in the user's own name for it; the why quoted from the Motives line; an identity line proposed from the Fifteen's text and editable ("I'm becoming someone who…"); the obstacle and its if-then from the Obstacles stone; the first three moves from the Strategies line; a short letter from the future self that quotes the Fifteen. Two actions: Make this my Blueprint, or Not quite (edit any line inline). Schema-validated; a missing field blocks the reveal, regenerates once, then the user fills it themselves. Account creation follows the reveal; the paywall follows the Blueprint.

**Blueprint.** Milestones (3–6, each with a proof from the Monitoring line, a target date and a distance in days); moves (concrete, ≤ 2 hours, effort S/M/L, energy low/high, a suggested week, an if-then trigger, and a required `source_line_id`); routines (§7.5) with a two-minute version and a stacking anchor; obstacle plans from the Obstacles stones; a season (12 weeks default) and a review cadence. Generation streams milestones first onto the Path, then moves, then routines; the user can edit before it finishes. Every move shows the user's sentence beneath it; a move without a source line is rejected by validation and repaired once, then a minimal plan is built from the user's lines without AI. Replan (from the Horizon Review or the coach) proposes changes as a diff, each with a reason and its source line, Accept or Keep mine per row, applied as a new version. Rules validated in code: first move doable in ≤ 30 minutes and dated within 48 hours; every routine has a two-minute version; at most three moves a week in the first fortnight; no past dates.

**UI.** A vertical document with the Path as a left spine, milestone sections as headings, moves as single lines with a stone socket, a date in tabular figures and an energy mark; the diff uses rows sliding into place with added lines in coral and removed lines struck in the tertiary neutral.

**Data.** `plans`, `milestones`, `moves` (with `source_line_id`), `obstacle_plans`.

**Acceptance.** p50 time-to-first-milestone ≤ 6 s; p95 full plan ≤ 30 s; 100% of plans pass validation including the source-line rule; Replan diff fully VoiceOver navigable; version history within two taps.

### 7.5 Practices: routines and habits [P1]

Routines (a sequence of steps done together) and habits (single repeated actions) are practices. Builder: steps with duration chips, a required two-minute version prefilled from the user's Strategies line, schedules by days, interval, shift pattern ("on nights, the short version") or anchor ("after coffee"), an energy slot, and stacking onto an existing routine. On Today a routine is one stone that seats in steps: each tap completes the next step, the stone sinks a proportional fraction, and a thin ring fills one segment per step. Runner: full screen, one step at a time, a large countdown, haptic tick at step change, keeps the screen awake. Data: `practices`, `practice_logs`. Acceptance: a habit in ≤ 3 taps from Today; gesture success ≥ 98% in Maestro; the runner survives backgrounding.

### 7.6 Today [P1]

**Purpose.** The home screen. One honest read: what now? It is the surface seen three to eight times a day, so it carries the brand: every goal is a stone.

**Anatomy.** Date and "Day N · Return #M"; the greeting and the coach's one line for the day ("The ten-minute version counts today."); the **goal row**: one stone per goal inside a progress ring, polished by progress, tap to fly it into the Goal screen; the **Now card**: the single most relevant move with a large stone in a socket, tap to seat, drag up to park; **Later today**: rows with small stones, routines with step rings, scrolling past four; **Consistency** with its bar; the tab bar (Today, Goals, Envision, Coach) and the coral plus.

**Gestures (all live on the Studio canvas).** Tap a stone to seat it (spring, contact shadow, check glint, text strikes through, ring and score advance; tap again to lift). Drag a stone up past 40 pt to park it as *not today* (label appears at the threshold; the stone parks on the rim, lifted and desaturated; the row reads "not today" and greys without striking; an Undo toast at the top; tap the parked stone to return it). Tap a routine stone to sink one step. Tap a goal stone to fly it into the Goal screen; Back flies it home. The plus rotates to a cross and raises the **New move sheet**: which goal (four small stones), what (three suggestions per goal or your own words), how long (2 / 10 / 25 / 45 min); the new stone lands at the top of Later today; the Consistency number springs.

**Seal the Day.** After the evening time: a word from a Feel-matrix row, one line of proof, one thing you are glad of, optional sixty seconds by voice, then the hold (1.6 s: the bar fills, the stone lowers, release early and it drains back; hold to the end and the stone drops into its slot with two pulsing rings). Sealing produces the evening reflection and tomorrow's first move. Unsealed days seal themselves at the day boundary as quiet days.

**Quick capture** via the plus: text or voice, classified as move, evidence, thought or question, filed with undo.

**Data.** Derived from moves, practices, plans and evidence; `day_summaries` rebuilt nightly and on open.

**Acceptance.** Cold start to interactive ≤ 1.5 s on iPhone 12 / Pixel 6a; 60 fps (120 on ProMotion); fully offline; every gesture reachable by VoiceOver actions.

### 7.7 Progress: Consistency, Returns, Ledger, Almanac, Path [P1]

**Consistency Score (0–100).** Exponentially weighted completion over the trailing 28 days: each day = done ÷ planned (two-minute versions count fully; not-today choices count 0.5; unsealed days count what was logged), weighted 0.93^age. Shown as a 40 pt tabular number with a bar and a 28-day band against the user's own eight-week baseline. Copy never says "you broke"; it says "63, up from 59".

**Returns.** Times the user came back after two or more missed days, celebrated: "Return #4. Most people never come back once." The first Return triggers a letter.

**Evidence Ledger.** Chronological, searchable proof: completed moves, milestone proofs, captures, sealed-day lines. The Monitoring line each user wrote is the goal's evidence rule and is shown at the top of that goal's ledger. Year view, the **Almanac**: a shelf of small stones, one per day, polished by evidence, seated when sealed; no green heatmap.

**Goal Path.** A single route from now to the target date with milestone nodes, the user's dot at the current fraction, "You are here", distance to next, and the last five evidence entries.

**Data.** `evidence`, `consistency_daily`, `returns`. **Acceptance.** Score matches the reference implementation on a 200-day fixture within ±1; the Almanac renders 365 stones at 60 fps; Returns detection tested.

### 7.8 Envision: scenes, the other road, letters, wallpapers [P1]

**Scenes.** For each goal, three scene types: *The Practice* (an ordinary morning of doing the work), *The Moment* (the milestone reached), *The Ordinary Tuesday* (life after, unremarkable and good). Each is a generated image (2:3, film-grain treatment, consistent style prompt) plus a 90–120-word second-person narrative in the future-self voice that must include at least one detail from the user's Impact line or Interview answers (`sourced_detail`, checked by schema). Prompt template: 35 mm film photograph, natural light, muted palette, slight grain, over-the-shoulder or hands-in-frame, no faces of the user, no text, no neon. Generated at 1024×1536 via FLUX.1 schnell (fal.ai) with a typographic fallback so the feature never shows an empty state.

**The other road.** If the shadow was written, one scene in a colder palette rendered on request, labelled, opt-in, never the default view. If not written, the eight-minute write is offered once.

**Letters.** From the future self at the Portrait reveal, the first Return, each milestone and monthly: 120–180 words, quoting the Fifteen and real ledger entries. The user can also write to their future self with a delivery date. Letters are AI-written and always quote the user; they never contain a goal or a plan line.

**Wallpapers.** From any scene or the "I will" line: lock-screen sizes with the line typeset in the serif; export to Photos on iOS, set directly on Android.

**UI (live on the canvas).** A tall rounded print with a three-segment strip and the goal's stone on its corner; tap to advance; tone chips re-render in place (Warmer, Simpler, Closer); Wallpaper toggles to Saved.

**Data.** `scenes`, `letters`. **Edge cases.** Provider safety rejections regenerate once then fall back to typographic; free users get one scene set per goal. **Acceptance.** First scene set ≤ 45 s after the Blueprint; p95 image ≤ 15 s; `sourced_detail` present in 100% of narratives.

### 7.9 The Coach [P1]

**Surfaces.** *Dawn brief* (three short paragraphs as a document: Yesterday, Today, If; the first line quotes the user's own sentence). *Evening reflection* after the seal. *Horizon Review* on Sunday after the reading: Consistency trend, milestone distances, one insight, a proposed Replan diff. *Chat* from the Coach tab and any "I'm stuck" prompt, with four chips: I'm stuck (quotes the user's if-then and offers the two-minute version), I don't feel like it (quotes a day they went anyway), Something changed (asks what, proposes a Replan tonight), Celebrate with me (quotes the Fifteen and names the return count); free text or voice follows MI structure for at most six turns and ends in one action written to Today with an "Added" toast. *What Morrow knows about me*: the memory profile, editable line by line.

**Memory.** A profile document (≤ 1,500 tokens) regenerated nightly from the ledger, seals and chats; the Book is always in context; user edits are locked. No vector search in Phase 1.

**Persona.** Gentle, straight, fierce change the register, never the rules. **Boundaries.** §11.6.

**UI (live on the canvas).** The pearl stone, the brief as a card, chips; on a chip tap the brief folds into a pill, the user's line posts as an ink bubble, a typing indicator, the reply in white. Never a sparkle icon; the AI's mark is the pearl.

**Data.** `coach_threads`, `coach_messages`, `memory_profiles`, `briefs`. **Acceptance.** Dawn brief ready before wake time for 99% of users; first token p50 ≤ 1.2 s; every chat that ends in an action shows the confirmation with undo; thumbs-up on briefs ≥ 80% in the TestFlight cohort; no coach output ever contains a goal or plan sentence not traceable to the user's text (eval, §11.8).

### 7.10 Rituals [P1]
Morning intention inside the dawn brief (one tap on the first move). Seal the Day (§7.6). Sunday reading (§7.3). Seal the Book (§7.2) uses the same hold as Seal the Day so the gesture means one thing: this is finished for now. The coach's single invitation to the Full track arrives inside the dawn brief after the first sealed Book.

### 7.11 Notifications, widgets, Live Activity [P1 / P1-stretch]
Local scheduling; push only for letters and the review. At most one notification per moment (wake, evening, Sunday, milestone); quiet hours 22:00–07:00 by default; a "Fewer" action on every notification; copy in the persona and never shaming; a missed notification is not resent; after a gap, one gentle nudge on day three and none after. iOS widgets via WidgetKit: small (first move and Consistency), medium (the goal row of stones with the one-line brief), lock screen (Consistency; next move), rendered from an app-group snapshot. Android widget and Live Activity for a running routine are stretch. Acceptance: widget updates within 60 s of a check-in; schedule survives reboot.

### 7.12 Account, privacy, settings [P1]
Sign in with Apple, Google, email OTP after the Portrait (Apple parity, 4.8). Settings: persona, wake and evening times, day boundary, chronotype, shift calendar, depth track, theme, sound and haptics, notifications, language (English; strings externalized), What Morrow knows about me, AI data disclosure, export (Books as PDF, all data as JSON plus media), Delete account (immediate soft delete, hard delete after 7 days, storage purged; 5.1.1(v)). Writing and chats are never used for advertising; no ad SDKs; analytics events carry no free text; AI providers receive only what the feature needs (§10.6). A declined account keeps everything local with a quiet banner; export is one tap after every seal because a lost device with no account loses the Book.

### 7.13 Monetization surfaces [P1]
Paywall shown once after the Blueprint ("Your Blueprint is ready"), then only at a free limit: the second goal's Blueprint, re-authoring on day 90, the Bench doorway, the coach's turn cap. Design in §8.9; economics in §13.3. Restore purchases, manage subscription deep link and price localization are required. Not now always returns the user to where they were with nothing lost.

### 7.14 Themes and platform adaptation [P1]
**Day studio** (default light) and **night studio** (the writing rooms, the seal, and dark mode); the user can pin light or dark. iOS 26: glass on the native tab bar, toolbar and the plus accessory only, never on content; iOS 17–18 fall back to blur. Android: native tab bar in Morrow's colours, predictive back, edge to edge, dynamic colour off, Material springs for sheets. Tablet: content max-width 640 pt, two-column Goal and Book.

### 7.15 Authoring, Volume 2: The Bench [P2]
Present Authoring in plain words. Two decks written as things a person would say about themselves ("I start things and drift"; "I can do boring things for a long time"), no trait names; Starter shows twelve cards a deck and the user picks up to three; Full shows forty a deck grouped by the five traits with the original's pick, narrow and rank sequence. Per fault: when it cost most (two lines) and the earliest sign you could catch (framings, then your words), which becomes the *If* of that goal's Obstacles stone. Per virtue: one time it mattered (two lines) and which goal needs exactly this (tap a stone); the coach remembers the pairing and names it on hard days. A Bench chapter joins the Book. Data: `bench_cards`, `bench_entries`.

### 7.16 Authoring, Volume 3: The Quarry [P3]
Past Authoring scoped to what a motivation app can hold safely: two memories per goal. A doorway with a plain warning and a link to resources; *The moment it started* and *The time it didn't hold*, ten minutes each in the writing room with the light lowered, each ending in one line the user still believes or would say to that version of themselves; the second line is quoted, with on-screen permission, in the Returns letter; the user chooses whether the memories join the Book. On Full, the seven-epoch autobiography (six experiences per epoch, ten analysed) exists only as a separately consented program with its own name, the safety layer, an exit on every screen and a clinical review before release. Data: `quarry_memories`.

### 7.17 The Declaration, the witness and gift a chapter [P2]
Rotterdam's third stage was a portrait photo and a public "I will" sentence. On the day the Book is sealed the user may take a portrait in-app with their "I will" line set across it, keep it private, share the image, or send it to one named witness who receives it and the user's sealed days and nothing else. Gift a chapter (from the paywall or Settings) gives a second Future volume to a friend, who becomes the witness. No feed, no likes, no leaderboard.

### 7.18 Cohorts [P3]
An institution code enrols a class; the Future volume on the Full track is the orientation workshop with sittings scheduled by the institution three to seven days apart; an admin view shows completion and depth, never content; a research-ready export with consent. Every study behind this product ran in this setting, and Dekker's participants asked for the follow-up Morrow provides.

---

## 8. Design system: Studio

The current direction. Two earlier directions (Landscape, Poster) are archived under `design/archive/` with their own canvases and are not part of this specification.

### 8.1 The idea in one paragraph
A softly lit studio. Every goal is a **stone**: a dimensional sphere with a radial gradient, inner shading, a specular highlight and a slow light sweep, coloured by domain. Stones start matte and get polished as goals are kept. They are the check control, the progress mark, the goal chip, the Almanac's days and the hero of every ritual. Surfaces are white with soft layered shadows; controls are ink with a physical bottom edge they press into. The interface speaks in Outfit; the user's own words are always set in a text serif, and nothing the user did not write ever appears in the serif. The **night studio** is reserved for the writing rooms and the seals.

### 8.2 Signature elements (each carries product meaning)
1. **The stone in its socket.** Raised and matte while waiting; seated, polished and glinting when done. The gesture is the meaning.
2. **Two voices in type.** Outfit for the interface and the coach; the serif for the user. Users learn within a day whose words they are reading.
3. **The Book.** A spine, a first sentence set large, page turns. The product's object.
4. **The ring.** Fills over fifteen minutes in the Fifteen, over 1.6 seconds in a seal, one segment per step on a routine, to the goal's fraction on a chip.
5. **The Path.** One route from now to the target date with milestone nodes and "You are here".
6. **The Almanac.** The year as a shelf of small stones.

### 8.3 Colour

| Token | Light (day studio) | Dark (night studio) | Use |
|---|---|---|---|
| `ground` | radial `#F8F7F4` → `#EEEDEA` → `#E4E3DF` | radial `#23252C` → `#17181C` → `#0E0F12` | page background |
| `surface` | `#FFFFFF` | `#1E1F24` | cards, sheets |
| `surface.2` | `#EEEDE8` | `#26272D` | chips, wells |
| `ink` | `#17181C` | `#F2F1ED` | text, controls |
| `ink.2` | `#6B6E76` | `#B4B6BC` | secondary text |
| `ink.3` | `#A3A6AD` | `#7E8189` | captions, labels |
| `line` | `rgba(23,24,28,.12)` | `rgba(255,255,255,.14)` | rules |
| `coral` | `#EA4B2E` | `#FF6D4F` | health stones, primary accent, the seal |
| `teal` | `#169A89` | `#3FC2AF` | money stones, evidence |
| `violet` | `#6D4BE8` | `#A98FFF` | craft stones |
| `amber` | `#F09A12` | `#F0A83A` | mind stones |
| `rose` / `moss` | `#E23A6E` / `#5E9E2E` | lighter variants | people / home stones |
| `pearl` | `#CFCBC2` highlight to `#8E8A80` | same | the coach |
| `success` | `#1E9E5A` | `#3FC27A` | deltas only |
| `destructive` | `#B23A1E` | `#FF8A6E` | delete only |

Stone gradients: `radial-gradient(circle at 32% 26%, highlight 0%, light 24%, base 60%, deep 100%)` with inset shadows for shading and a soft outer shadow tinted by the stone. Matte state: saturate .55; polished: saturate 1.05. Contrast: every text and ground pair meets WCAG AA at 4.5:1; accent colours are never body text.

### 8.4 Typography

| Role | Face | Sizes | Notes |
|---|---|---|---|
| Interface, headings, the coach | **Outfit** 400–700 | Statement 34/38 (up to 72 on Welcome and Portrait), H2 28/32, body 17/23, label 12 caps +0.08 em, numbers tabular | Everything the app and the coach say |
| The user's words | **Newsreader** 400–600, italic for quotations of the user by the coach | Book body 18/1.55, first sentence 30/35, analysis lines 17 | Only ever the user's own text: the Fifteen, the stones, the Book, quoted lines in briefs |
| Data | Outfit with `tabular-nums` | 40 for Consistency, 13 readouts | Times, counts, dates |

Rules: measure ≤ 68 characters; headings balanced; Dynamic Type to 200%; never letter-space lowercase. Fonts shipped as static instances (Google Fonts, OFL).

### 8.5 Motion and gesture specification
- **Springs.** Standard damping 18 / stiffness 180 for rows and chips; settle 14 / 260 for stones seating (0.55 s with overshoot); heavy 24 / 120 for sheets. Fades 180 / 240 / 400 ms. Entry sequences stagger at 0.08–0.1 s.
- **Stone control.** Seat: translate 0, saturate 1.05, contact shadow, check glint; lift is the same gesture reversed. Drag to park: follows the finger, enlarges 4%, label at 40 pt, parks on the rim at −11 to −16 pt, 17 to 24 pt right, 14° rotation, 72% opacity; shorter pulls snap back. Routine: sinks by fraction, ring fills a segment per step.
- **Hold to seal.** 1.6 s fill with a `selection` tick every 20%; release early drains in 0.45 s; completion drops the stone with a spring, two rings pulse out, `impactHeavy` and a wooden tock.
- **The flight.** A goal chip's stone flies to the Goal screen's header in 0.62 s with a 12° roll at 1.74×; the screen's parts rise in sequence; Back flies it home.
- **The Fifteen.** The ring fills over fifteen minutes on a linear clock; the stone bobs on a 4.5 s cycle and stops when writing starts; idle dims it over 0.4 s.
- **Rules.** Nothing bounces more than once; motion shows causality or state, never decoration; reduce motion turns every move into a crossfade and stops the sweep and the bob.

### 8.6 Haptics and sound
Seat: `impactMedium` and the tock. Lift: `impactSoft`. Park threshold: `selection`. Seal: ticks then `impactHeavy` and a low chime. Book sealed: `impactHeavy` then `impactSoft` and a two-note rise. Letter arrived: paper. Error: `notificationWarning`, dull. Six custom sounds, CC0-sourced, ≤ 400 ms, −16 LUFS, opt-out in Settings, silent switch respected.

### 8.7 Layout and components
4-pt base; gutter 22 pt; section gap 32; row 52–62 pt; radii 16 (fields), 22–30 (prints and sheets), 999 (pills and buttons); at most one elevated surface per screen. Components (`@morrow/ui`): Stone, Socket, Ring, StoneRow, NowCard, GoalChip, Tray, WritingRoom, SeedMargin, NudgeLine, ReadBackList, AnalysisSheet (framings + serif line + paragraph box), HoldBar, BookReader, Path, ConsistencyBar, Almanac, Tab bar, PlusButton, NewMoveSheet, Toast with undo, Chip, Field, Sheet (glass on iOS 26), VoiceButton, StreamingText, DiffRow, ScenePrint, LetterEnvelope, EmptyState, Paywall.

### 8.8 Imagery
Generated photography with grain from the user's own lines; prints shown with a slight tilt; no faces of the user in Phase 1, no text in images, no neon. The shadow scene in a colder palette, opt-in. No stock illustration, no 3D blobs.

### 8.9 The paywall
One screen: the user's own "I will" line at the top in the serif, three benefit lines (every goal's Blueprint; re-authoring, the Bench and the Quarry; the coach every day), a plan toggle with the annual highlighted and per-month maths, the trial line in a caption, Continue in ink, Not now in the tertiary. No timers, no fake discounts.

### 8.10 Anti-template checklist (every screen, before merge)
1. No indigo or violet gradients on chrome; gradients live only on stones and the ground.
2. No emoji as icons; no sparkle icon for AI; the coach is the pearl.
3. No uniform rounded cards with drop shadows; at most one elevated surface.
4. Inter, Roboto and system type never appear in Morrow text.
5. No confetti, coins, XP, leaderboards or percent rings.
6. Chat bubbles are never the primary surface; the coach writes documents.
7. The serif is only ever the user's words.
8. Every number that matters is tabular; every label optically aligned.
9. Copy has a voice: second person, specific, no exclamation marks in system text, no "Oops".
10. Empty, loading, error and offline states are designed in the studio.
11. Light and dark reviewed on device with Dynamic Type at 200% and reduce motion.
12. Screenshot beside Structured, Rosebud and Opal: it must not be mistakable for any of them, nor for a Tailwind template.

### 8.11 Voice and tone
Second person, present tense, concrete. The coach acknowledges before it advises and quotes before it suggests. Never "you failed", "streak lost", "don't break the chain"; instead "quiet day", "return", "the two-minute version counts". Humour is dry and never at the user's expense. Examples: "Sealed. Tomorrow starts with the walk." / "No connection. Your day is saved here and will sync." / "You wrote this much about the run. Want to go that deep on the rest?"

### 8.12 References
Apple Design Award winners 2024–2026 (Tide Guide's environment-matched palette, Gentler Streak's supportive copy, Structured's quiet AI, grug's one idea a day); Oura's "one big thing"; Opal's commitment gesture; Headspace Ebb's AI transparency; Apple Journal's prompts from the user's own day; Duolingo's two-fact widget; galleries: Mobbin, Screenlane, Refero, Nicelydone, 60fps.design, Design Spells.

---

## 9. Information architecture and screens

### 9.1 Navigation
Native tab bar (glass on iOS 26, Material on Android): **Today**, **Goals** (the target glyph opens the Now goal), **Envision**, **Coach**, plus the coral **plus** for a new move. Top-right on Today: the day count and returns; the Book opens from Today, the Coach and Settings.

### 9.2 Screen inventory

| # | Screen | Route | Phase | Notes |
|---|---|---|---|---|
| 1 | Welcome 1–3 | `/welcome` | P1 | stone settles; sittings and times; name and persona |
| 2 | Consent | `/welcome/consent` | P1 | AI data disclosure |
| 3 | Interview | `/interview/[n]` | P1 | tap-only; clarity ring; tray; live on the canvas |
| 4 | Interview summary | `/interview/heard` | P1 | stones with Drop; Add another; Begin the Fifteen |
| 5 | Authoring opening | `/authoring` | P1 | sittings, real lengths, depth question |
| 6 | The Fifteen | `/authoring/write/[kind]` | P1 | ideal or shadow; night studio; ring; seeds; nudges; voice |
| 7 | What I heard | `/authoring/heard` | P1 | quoted spans as stones; Keep / Merge / Not a goal |
| 8 | Rank and title | `/authoring/rank` | P1 | drag; spine title |
| 9 | Analysis half-sheet | `/goals/[id]/stone/[kind]` | P1 | framings; the serif line; paragraph box on Full |
| 10 | Seal the Book | `/authoring/seal` | P1 | the hold; spine appears |
| 11 | The Book | `/book/[version]` | P1 | reader; export |
| 12 | Sunday reading | `/book/sunday` | P1 | page turns; Still true / Something moved |
| 13 | Portrait | `/goals/[id]/portrait` | P1 | built from the user's lines; inline edit |
| 14 | Auth | `/auth` | P1 | Apple, Google, OTP |
| 15 | Blueprint | `/goals/[id]/plan` | P1 | Path spine; source line under each move; versions |
| 16 | Replan diff | `/goals/[id]/replan` | P1 | Accept / Keep mine per row |
| 17 | Paywall | `/paywall` | P1 | five entry points |
| 18 | Today | `/` | P1 | goal row, Now card, Later, Consistency; live on the canvas |
| 19 | Goal | `/goals/[id]` | P1 | flight header; five stones; Path; scene print; stats; ledger |
| 20 | New move sheet | modal | P1 | goal, words, takes |
| 21 | Seal the Day | `/seal` | P1 | word, proof, glad of; the hold; live on the canvas |
| 22 | Practice builder and runner | `/practices/[id]`, `/practices/[id]/run` | P1 | steps; schedules; two-minute version |
| 23 | Envision | `/envision` | P1 | scene print; tone chips; the other road; wallpaper; live on the canvas |
| 24 | Letters | `/envision/letters` | P1 | from and to the future self |
| 25 | Coach | `/coach` | P1 | dawn brief; chips; chat; live on the canvas |
| 26 | Horizon Review | `/coach/review/[week]` | P1 | Consistency band; milestones; insight; Replan |
| 27 | Memory profile | `/settings/memory` | P1 | editable |
| 28 | You: Consistency, Returns, Almanac, Ledger | `/you/*` | P1 | shelf of stones |
| 29 | Settings, export, delete | `/settings/*` | P1 | includes the depth track switch |
| 30 | Returns letter | modal | P1 | after two or more missed days |
| 31 | Crisis resources | modal | P1 | by locale |
| 32 | Re-authoring | `/book/reauthor` | P2 | two Books; diff |
| 33 | The Bench | `/authoring/bench` | P2 | two decks |
| 34 | Declaration | `/book/declare` | P2 | portrait; witness |
| 35 | The Quarry | `/authoring/quarry/[goal]` | P3 | doorway; two memories |
| 36 | iOS widgets; Live Activity | WidgetKit / ActivityKit | P1 / stretch | — |

The *Flow Atlas* holds every flow, entry, exit, state and the three state machines; it is the source of truth for navigation.

### 9.3 Deep links
`morrow://today`, `morrow://goal/{id}`, `morrow://book`, `morrow://authoring/{sitting}`, `morrow://practice/{id}/run`, `morrow://letter/{id}`, `morrow://brief/{date}`, `morrow://capture`.

---

## 10. Technical architecture

### 10.1 Stack (free-first, swappable, polish-capable)

| Layer | Pick | Why |
|---|---|---|
| App | **Expo SDK 57 + React Native 0.86** (Expo Router, native tabs, New Architecture), TypeScript strict | Native chrome incl. iOS 26 glass, EAS, the largest polish ecosystem, fastest for a one-month build |
| Styling | **Unistyles 3** | Runtime themes (day and night studio) without re-renders |
| Motion | **Reanimated 4.6 + Gesture Handler** | Springs, worklets, the stone gestures |
| Graphics | **Skia 2.11** | Stones, rings, the Path, the Almanac, grain |
| Lists | LegendList or FlashList v2 | Ledger, Almanac, Book |
| Native UI | `expo-glass-effect`, `expo-blur`, `expo-symbols`, `zeego`, `@gorhom/bottom-sheet`, `react-native-keyboard-controller` | Platform-true chrome |
| Media and voice | `expo-image`, `expo-audio`, `expo-haptics`, `expo-speech`, `expo-speech-recognition` (on-device STT) | Voice is the Fifteen's default |
| Widgets | `@bacons/apple-targets` (WidgetKit, ActivityKit), `react-native-android-widget` | P1 deliverable |
| Local data | **expo-sqlite + Drizzle**, MMKV for preferences | Offline-first, typed |
| Sync | **Legend-State v3 + Supabase** (fallback: TanStack Query + outbox) | Least code for local-first sync |
| Backend | **Supabase** (Postgres, Auth, Storage, Edge Functions, cron, pgvector) | Relational fit, RLS, Apple and Google auth, edge AI calls |
| AI orchestration | **Vercel AI SDK** in Edge Functions | Provider abstraction, streaming, structured objects |
| LLM | **Claude**: `claude-opus-5` for Portrait, Blueprint, Replan, review; `claude-sonnet-5` for briefs, letters, chat; `claude-haiku-4-5` for read-back verification support, classification, safety, memory; Gemini Flash and Groq for free dev iteration | Plan quality and instruction following; caching |
| Images | **fal.ai FLUX.1 schnell** | Cheap, fast, photographic |
| STT fallback / TTS | faster-whisper (small, int8) and Kokoro self-hosted on the client's Oracle Always Free instance (§10.8); on-device TTS as the fallback; ElevenLabs only if a listening test demands it | Free voice pipeline; audio never leaves infrastructure we control |
| Payments | **RevenueCat** | Entitlements, paywalls, webhooks |
| Notifications | `expo-notifications`; Expo push for letters and the review | — |
| Analytics, crashes | **PostHog**, **Sentry** | Free tiers |
| CI and builds | **EAS** Build, Submit, Update; GitHub Actions; **Maestro** | — |
| Web | Next.js on Vercel (landing, policy, support) | — |

Monthly infrastructure at 1,000 MAU ≈ $300–450 (AI is the only line that scales; voice is free on the Oracle instance, §10.8); at 10,000 ≈ $2.7–4.3k; §11.7 keeps AI under 25% of subscription revenue. Authoring adds little AI cost: the Fifteen and the stones are the user's typing.

### 10.2 System diagram (textual)
```
[App: Expo RN]  UI (Unistyles, Reanimated, Skia) · Local store (SQLite/Drizzle + MMKV, source of truth)
                · Sync (Legend-State ↔ Supabase, RLS) · Widgets (Swift targets read an app-group snapshot)
                · AI client (SSE to Edge Functions; never holds provider keys) · On-device STT
[Supabase]      Postgres (§10.3, RLS, pgvector) · Auth · Storage (books/, scenes/, anchors/, exports/)
                · Edge Functions: interview-turn, readback, portrait, blueprint, replan, brief, reflect, review,
                  coach-chat, scene, letter, classify-capture, safety, memory-summarize, book-render,
                  revenuecat-webhook, export, delete-account
                · pg_cron: dawn briefs per timezone, nightly memory and consistency, letter delivery, day-90 re-authoring
[Providers]     Anthropic · fal.ai · Groq/Gemini (dev) · ElevenLabs/Kokoro (stretch)
[Ops]           RevenueCat · PostHog · Sentry · EAS
```

### 10.3 Data model (Postgres; every table has `user_id`, RLS `user_id = auth.uid()`, timestamps, soft delete)

| Table | Key columns |
|---|---|
| `profiles` | display_name, persona, chronotype, wake_time, evening_time, day_boundary, timezone, theme_mode, sound_on, haptics_on, locale, onboarding_state, depth_track, subscription_tier |
| `interview_sessions` | belief_state jsonb, transcript jsonb, clarity, completed_at |
| `authoring_sessions` | volume (future/bench/quarry), track, sitting (1..7), started_at, completed_at, mode (type/voice/walk), seconds_writing, idle_nudges |
| `authoring_texts` | session_id, kind (ideal/shadow/addition/memory_start/memory_broke), body, word_count, specificity_score, sealed_until, safety_flags jsonb |
| `goals` | title (user's name for it), domain, target_date, status (named/authored/active/paused/archived/completed), rank, importance, confidence, readiness, portrait jsonb, cover_scene_id |
| `goal_analyses` | goal_id, kind (motives/impact/strategies/obstacles/monitoring), track, framing_id, line, line_2 (if-then), paragraph, specificity_score, followup_shown, written_at |
| `books` | title, current_version, first_sealed_at |
| `book_versions` | book_id, version, sealed_at, track, authorship_ratio, i_will, contents jsonb, diff jsonb, pdf_path, lockscreen_path |
| `plans` | goal_id, version, season_weeks, status, generated_from jsonb, model, prompt_version |
| `milestones` | plan_id, goal_id, title, proof (from the Monitoring line), target_date, order, reached_at |
| `moves` | goal_id, milestone_id, title, effort, energy, if_then, scheduled_for, status, completed_at, evidence_id, order, source (ai/user), **source_line_id → goal_analyses** |
| `obstacle_plans` | goal_id, obstacle, response, source_line_id |
| `practices` / `practice_logs` | kind, title, steps jsonb, min_version, schedule jsonb, energy_slot, anchor_text; log: date, status, duration_s, evidence_id |
| `evidence` | goal_id?, kind (move/milestone/capture/seal), text, media_path, day |
| `day_summaries` | date, planned_count, done_count, min_count, evidence_count, sealed_at, mood_word, consistency_snapshot |
| `consistency_daily`, `returns` | score, baseline; gap_days, returned_on |
| `scenes` | goal_id, type (practice/moment/tuesday/other_road), prompt, image_path, narrative, sourced_detail, favorite |
| `letters` | goal_id?, direction, body, trigger, deliver_at, delivered_at, read_at, quotes jsonb |
| `briefs`, `coach_threads`, `coach_messages`, `memory_profiles` | as in §7.9; messages carry safety_flags and quoted_span_ids |
| `bench_cards`, `bench_entries` [P2] | deck, text; card_id, cost_lines, sign_line, proof_lines, goal_id |
| `quarry_memories` [P3] | goal_id, kind (start/broke), body, closing_line, in_book, quote_permitted |
| `declarations`, `witnesses` [P2] | photo_path, i_will, visibility; witness_user_id, accepted_at |
| `cohorts`, `cohort_members` [P3] | institution, code, schedule jsonb; consent_at, completion (never content) |
| `captures`, `notifications_schedule`, `subscriptions`, `ai_usage`, `events_outbox` | as in v1 |

Storage buckets: `books/` (PDF and lock screens), `scenes/`, `anchors/`, `exports/`, private with signed URLs. Media stored at original plus a 1024 px derivative.

### 10.8 The Oracle Always Free instance (client-provided)

The client holds an Oracle Cloud Always Free instance. Since Oracle halved the free shape, plan on **2 Arm OCPUs, 12 GB RAM, 100 GB block storage**, one region, no SLA, reclaimable if idle. It is used for compute that is heavier than an edge function and lighter than a database, and for nothing stateful.

| Service | Container | Sizing on 2 cores / 12 GB | Notes |
|---|---|---|---|
| Voice out | Kokoro TTS behind a small HTTP API | ~1.5 GB RAM; a 120-word brief renders in 2–4 s on CPU | Spoken replies and "Read it back"; cached per brief |
| Voice in (fallback) | faster-whisper `small` int8 | ~1 GB RAM; roughly real time on 2 cores | Only when on-device recognition is unavailable; audio deleted after transcription |
| Book renderer | headless Chromium in a queue worker | ~1.5 GB RAM per render, one at a time | Called by the seal; PDF and lock-screen image written to Supabase Storage |
| Jobs | a worker for the dawn-brief scheduler, nightly memory and consistency, letter delivery, day-90 re-authoring, and the prompt eval | small | Replaces most pg_cron and GitHub Actions minutes |
| Staging web | the landing page and policy on a preview subdomain | negligible | Production web stays on Vercel |

**Rules.** One Docker Compose file in `infra/oracle/` rebuilds the whole instance; nothing lives only there except caches. Same region as the Supabase project. A keep-alive job and health check so the instance is never idle-reclaimed; if it disappears, the app degrades to on-device TTS, Groq's free Whisper quota, and edge-function rendering with no user-visible failure. Services are exposed only to Supabase Edge Functions through a private token; the app never calls the instance directly. Not used for the primary database, auth or storage: Supabase stays managed and moves to Pro ($25) before the demo so the project never pauses.

**Concurrency.** With two cores, TTS and rendering share a single worker queue; at Phase 1 scale (a few hundred users) queue depth stays under a minute. Past a few thousand users, move the renderer to a paid worker and keep voice on the instance.

### 10.4 Offline-first and sync
The UI reads only from the local store; mutations write locally, enqueue, and sync with retry and `updated_at` cursors. Conflicts: last writer wins per row, except `evidence`, `practice_logs` and `authoring_texts`, which are append-only; Books are versioned so nothing is overwritten; a seal on one device blocks re-authoring on another until synced. The Interview and the Fifteen work fully offline; What I heard queues. Acceptance: a 1,000-mutation offline session replays with zero loss; the airplane-mode Maestro flow passes.

### 10.5 Performance budgets
Cold start ≤ 1.5 s TTI on iPhone 12 / Pixel 6a; JS bundle ≤ 4 MB; app ≤ 60 MB on iOS; 60 fps on all lists and 120 on ProMotion for Today, the Fifteen and the Book; Skia stones ≤ 2 ms per frame; memory ≤ 250 MB with twenty scenes cached; the Book renders within 1 s locally.

### 10.6 Security and privacy engineering
Provider keys only in Edge Function secrets; RLS on every table; signed URLs; analytics carry ids and counts, never text; Sentry scrubs content. AI data map, disclosed in the policy and in-app: to the LLM go Interview answers, the user's authoring texts and stones, plan, ledger text, chats and the memory profile; to the image provider go scene prompts only; audio stays on device unless the fallback STT is used and is never stored. Retention per provider policy (Anthropic 30 days); Morrow deletes within 7 days of account deletion. Rate limits per user per feature; global circuit breakers.

### 10.7 Repository and standards
pnpm monorepo: `apps/mobile`, `apps/web`, `packages/ui`, `packages/schemas` (Zod shared), `packages/prompts` (versioned, including the framing bank and the nudge bank), `supabase/`. Conventional commits; PR template with the anti-template checklist and device screenshots for both themes; CI runs typecheck, lint, unit tests, the prompt eval and the Maestro smoke flow; EAS Update channels `preview` and `production`; PostHog flags for stretch features.

---

## 11. AI system design

### 11.1 Principles and authorship rules
Structured outputs for anything that becomes data; streaming for anything the user watches; caching for anything long and stable; human confirmation for anything that changes the plan; a safety screen in front of every free-text input; a provider abstraction so models can be swapped in a day.

**Authorship rules.** The model never produces text that enters the Book, a goal name, or a plan line as the user's words. Allowed outputs: questions; quoted spans of the user's text, verified as substrings in code; orderings; classifications; framings drawn from the fixed bank; plan structure whose every move references a user line; letters and briefs that quote the user; typesetting. "Rewrite this for me" does not exist; "Ask me a better question" does. Regeneration never overwrites a user edit. The authorship ratio (user characters ÷ all characters in the Book) is computed server-side at every seal and must be ≥ 0.95.

### 11.2 Model routing

| Feature | Model | Notes |
|---|---|---|
| Interview turn (engine) | `claude-sonnet-5` | tap-only answer types; scripted bank as offline fallback |
| What I heard (`ReadBack`) | `claude-sonnet-5` | spans verified as substrings; one retry with a stricter prompt |
| Portrait, Blueprint, Replan, Horizon Review | `claude-opus-5`, high effort | plan quality is the product; every move needs a `source_line_id` |
| Dawn brief, reflection, letters, scene narratives | `claude-sonnet-5` | must quote the Book; `sourced_detail` required |
| Coach chat | `claude-sonnet-5` (Opus 5 deep mode for Pro) | ends in an action |
| Capture classification, safety, memory summary | `claude-haiku-4-5` | cheap and fast |
| Specificity check | deterministic | times, places, numbers, weekdays |
| Dev iteration | Gemini Flash / Groq | zero cost |

All calls use structured outputs (Zod → JSON Schema), adaptive thinking where supported, and a cache breakpoint after the stable prefix (method, persona, schemas, the Book, the memory profile).

### 11.3 Schemas (abbreviated; full Zod in `packages/schemas`)
```ts
InterviewTurn = { question, type: 'pills', options: {label, value}[] (2..5), custom_allowed: true, clarity, guess_line?, done }
ReadBack = { spans: { text /* substring of source */, start, end, domain_guess, merge_with? }[] (3..9), left_out_question? }
AnalysisFraming = { kind, question /* varies by domain */, framings: {id, label}[] (3..4), followup?: 'when_where', full_prompts: string[] }
GoalPortrait = { title /* user's */, why /* Motives line */, identity_line /* editable */, obstacle, if_then /* Obstacles line */, first_moves: string[3] /* from Strategies */, letter_from_future /* quotes the Fifteen */ }
Blueprint = { season_weeks, milestones: { title, proof /* Monitoring line */, target_date, moves: { title, effort, energy, if_then, week, source_line_id /* required */ }[] }[] (3..6), practices: {...}[], obstacle_plans: { obstacle, response, source_line_id }[], review_cadence: 'weekly' }
ReplanDiff = { changes: { op, target, id?, before?, after?, reason, source_line_id? }[], summary }
BookVersion = { title, sealed_at, track, first_sentence, chapters: { goal_id, name, due, lines: { kind, framing_id?, text, text_2? }[] }[], i_will, authorship_ratio }
DawnBrief = { yesterday, today, if_then, first_move_id, quoted_span_ids: string[] (≥1) }
Scene = { type, image_prompt, negative_prompt, narrative (90..120 words), sourced_detail }
Letter = { body (120..180 words), quotes: string[] (≥1, substrings of the Book or ledger) }
CaptureClassification = { kind, goal_id?, title?, scheduled_for? }
SafetyScreen = { risk: 'none'|'concern'|'crisis', category?, action: 'continue'|'soften'|'resources' }
```

### 11.4 The coach system prompt (skeleton; versioned in `packages/prompts`)
1. **Identity.** "You are Morrow's coach. You help this person become who they described in their Book. You are not a therapist, doctor or financial adviser and you say so when it matters."
2. **Authorship** (cached). You never write a goal or a plan line. You quote before you suggest. Every suggestion names the line it comes from.
3. **Method** (cached). OARS; acknowledge before advising; ask permission before advice; end exchanges with one action written to Today when the user agrees; never shame; never "fail", "failure", "streak"; missed days are data; the two-minute version counts.
4. **Voice** (cached). Persona register with examples; second person; present tense; ≤ 120 words a turn; no emoji; no exclamation marks; the future-self voice in letters uses first person, past-tense memories and one sensory detail from the Book.
5. **Context** (cached daily). The current Book version; the memory profile; active goals with stones and milestones; today's plan; the last seven days of ledger; recent Returns.
6. **Boundaries** (cached). Crisis protocol; medical, legal and financial redirects; no romantic or dependency role-play; AI status disclosed when asked; never claim a memory not in context.
7. **Turn** (uncached). The message, the safety result, the output schema.

### 11.5 Memory pipeline
Nightly at 03:00 local: the day's ledger, seals and chats are summarised by Haiku into the profile document (Who / Goals and whys / What works / What gets in the way / Preferences / Dates), diffed and versioned; user edits are locked. The Book itself is always in context and is never summarised away. Profile ≤ 1,500 tokens.

### 11.6 Safety layer
Every free-text input, including every authoring text, passes a Haiku screen in parallel. *Crisis* replaces the response with the Resources card (warm acknowledgment, local emergency guidance, region hotlines: US 988; UK and IE Samaritans 116 123; PK Umang 0311-7786264; findahelpline.com), pauses the sitting or chat until "I'm okay to continue", stores nothing in the memory profile and logs a flag, never text. *Concern* softens the next prompt, avoids numeric targets and suggests professional support once. No diet plans under 1,200 kcal, no medication or financial product advice; such goals are coached at the behaviour level. Age 16+ at signup, 17+ store rating. "Morrow's coach is an AI" at first chat and in Settings; conversations deletable individually. The Quarry adds a doorway warning, an exit on every screen and, for the Full autobiography, a clinical review before release.

### 11.7 Cost controls
Per-user caps (free: 20 chat turns a day, one scene set per goal; Pro: 200 turns, 20 regenerations a month); caching mandatory on coach calls (≥ 80% cache hit); briefs in batch; images at 1024 px; monthly `ai_usage` review; tiering flags to move any feature between models without a release. Authoring is nearly free: the only calls are the read-back, the Portrait and the Blueprint.

### 11.8 Evaluation
A golden set of 40 synthetic profiles (personas × domains × both tracks) with authored Books. Checks: read-back spans are substrings (100%); Portrait and Blueprint schemas pass with every move sourced; plan realism (first move ≤ 30 min, ≤ 3 moves a week early, proofs measurable); brief tone (no banned words, ≤ 90 words, at least one quoted span); letters quote the Book; safety recall ≥ 0.95 on a 200-item labelled set; authorship ratio ≥ 0.95 on every generated Book. LLM-as-judge with Opus 5 plus human review of 20% before launch; prompt changes require the eval to pass in CI. In-product: thumbs on briefs, "Added to Today" rate, Replan acceptance per change, Full-track uptake after the invitation.

---

## 12. Non-functional requirements and compliance

**Accessibility.** Dynamic Type to 200% with reflow; VoiceOver and TalkBack on every Skia stone with custom actions for seat, park and step; the Fifteen fully usable by dictation with ring progress announced each minute; contrast AA; reduce motion; reduce transparency disables glass; colour never the only signal; 44 pt targets; haptics and sound independently switchable.

**Reliability.** Crash-free sessions ≥ 99.5% before submission; authoring texts never lost (append-only, autosaved per keystroke); AI failures degrade to designed states; nightly jobs idempotent; Supabase daily backups.

**Localization.** English in Phase 1; strings externalized; Intl dates and numbers; no hard-coded left or right.

**Privacy and legal.** Policy and terms on the web and in-app; explicit AI-sharing consent; in-app deletion and export; GDPR and CCPA rights via those flows; no health claims; no HealthKit in Phase 1; 16+ gate. The method is used under published research; no prompts, names or copy are taken from selfauthoring.com; the product never uses the words "Self Authoring" or "Peterson".

**App Store and Play checklist.** 5.1.1(v) in-app deletion; 4.8 Sign in with Apple; 3.1.2 subscription clarity, ≥ 7-day trial; 2.3.2 screenshots disclose the subscription; 1.4.1 no medical claims; 5.1.2(i) explicit AI data disclosure and 2026 AI-model declarations; 1.2 no user-to-user content in Phase 1 (the witness in Phase 2 is one-to-one and reportable); Play Data safety, health-apps declaration, deletion URL.

---

## 13. Success metrics and monetization

### 13.1 Metric tree
- **North star.** Days with Evidence per weekly active user ≥ 4.0 by week 8 after launch.
- **Activation (days 0–2).** Reach question 1 ≥ 90% of installs; complete the Interview ≥ 70%; enter the Fifteen ≥ 60%; complete it ≥ 60% of entrants; complete Sitting 2 ≥ 50% of Sitting 1 completers; seal a Book ≥ 40% of Sitting 1 completers; view the Portrait ≥ 65% of sealers; generate a Blueprint ≥ 55%; first check-in the same day ≥ 40%.
- **Authorship and depth.** Authorship ratio ≥ 0.95 on every sealed Book; median words in the Fifteen ≥ 350; Strategies lines passing the specificity check without follow-up ≥ 60%; Sunday reading in the first fortnight ≥ 50% of sealers; Full-track uptake ≥ 20% of sealers by day 30; Full stones completed ≥ 60% of those started; re-authoring on day 90 ≥ 35% of active sealers [P2].
- **Retention.** D1 ≥ 45%, D7 ≥ 28%, D30 ≥ 15% (category medians roughly 25 / 12 / 6); Seal-the-Day ≥ 35% of DAU; Returns ≥ 50% of users with a gap of two or more days back within seven.
- **Engagement.** Dawn brief open ≥ 60%; Horizon Review ≥ 40% of WAU; Replan acceptance ≥ 60% of proposed changes.
- **Quality.** Brief thumbs-up ≥ 80%; chats ending in an action ≥ 50%; store rating ≥ 4.7 after 200 ratings; crash-free ≥ 99.5%.
- **Monetization.** Install to trial ≥ 8%; trial to paid ≥ 38%; D35 download to paid ≥ 3.5%; annual share ≥ 65%; AI cost ≤ 25% of net revenue.

### 13.2 Instrumentation (PostHog; no free text)
`onboarding_step`, `interview_answer {clarity}`, `authoring_sitting {n, track, completed, seconds}`, `fifteen_completed {mode, words_bucket, nudges}`, `shadow_written`, `readback_reviewed {kept, merged, dropped}`, `stone_written {kind, framing_id, followup, track}`, `book_sealed {version, track, authorship_bucket}`, `book_exported {format}`, `sunday_reading {verdict}`, `track_switched {from, to}`, `portrait_viewed`, `blueprint_generated {ms, sourced_moves}`, `paywall_viewed {trigger}`, `trial_started`, `purchase {plan}`, `move_completed {source, min_version}`, `stone_parked`, `practice_logged {status}`, `capture {kind}`, `seal_completed`, `brief_opened {kind}`, `brief_feedback`, `chat_turn {ended_in_action}`, `replan_change {op, accepted}`, `scene_viewed`, `scene_regenerated`, `other_road_rendered`, `letter_read`, `wallpaper_exported`, `return_detected {gap}`, `reauthoring {kept, rewritten, let_go}`, `widget_installed`, `notification_opened {kind}`, `setting_changed {key}`, `account_deleted`. Session replay for the TestFlight cohort only, inputs masked.

### 13.3 Monetization design
- **Free.** The Interview and the whole Future volume on either track; the first Book with export forever; one active goal with a full Blueprint and one Replan a month; practices and Today unlimited; Ledger and Consistency; one scene set; the coach at 20 turns a day; the dawn brief daily; the review monthly.
- **Pro.** Every goal's Blueprint; unlimited Replans; scene regeneration (20 a month), all scene types and *The other road*; letters and write-to-future; wallpapers; the coach at 200 turns and deep mode; the review weekly; re-authoring [P2]; the Bench [P2]; the Quarry [P3]; the Declaration and a witness [P2].
- **Prices (US, localized).** $9.99 a month; $49.99 a year with a 7-day trial; $149.99 lifetime, tested on and off. *Gift a chapter* at $14.95 gives a friend the Future volume and makes them a witness. Institutional cohorts priced per seat in Phase 3 (benchmark: the original at $14.95 a seat; orientation programs charge students hundreds).
- **Paywall moment.** Once after the Blueprint, soft, dismissible; then only at free limits. Never timers, fake discounts, interstitials or paywalled trivialities.

---

## 14. Delivery plan: four weeks to a polished Phase 1

Two people (lead engineer; designer-engineer owning the design system, motion and copy), starting Monday 14 September 2026, demo-ready Friday 9 October, submission the following Monday. Week 0 prepares accounts and tokens.

### 14.1 Week 0 (10–13 Sept): accounts, tokens, skeleton
Apple Developer, Play Console, Supabase, RevenueCat, PostHog, Sentry, Anthropic, Google AI Studio, Groq, fal.ai, EAS, GitHub, Figma. Studio tokens and the canvas as the source; fonts as static instances. Monorepo scaffold, Expo SDK 57 with Router and native tabs, Unistyles with both studios, Sentry and PostHog, Supabase client, CI, a Maestro hello flow. Prompts and schemas for the Interview engine, ReadBack, Portrait and Blueprint; the framing bank (five kinds × six domains) and the nudge bank as data; the eval harness.

### 14.2 Week 1 (14–18 Sept): the writing
Design system package: Stone, Socket, Ring, Chip, Field, Sheet, HoldBar, Toast, EmptyState, text primitives. Auth and profiles; migrations for every Phase 1 table with RLS; storage. Edge Functions: interview-turn, readback (with substring verification), safety. Screens: Welcome, Consent, Interview (tap-only, clarity ring, tray), Authoring opening with the depth question, the Fifteen (type and voice, ring, seeds, nudges, 24-hour lock, resume-once), the shadow, What I heard. *Exit:* a new user goes from install through the Interview and a complete Fifteen to a confirmed tray on both platforms; Sitting 1 median under 35 minutes on device; both studios; VoiceOver pass on the Interview and the Fifteen with dictation.

### 14.3 Week 2 (21–25 Sept): the Book and the plan
Rank by drag, spine title, the analysis half-sheet (five kinds, framings, specificity follow-up, the Full paragraph box), Go deeper, "I will", Seal the Book; the Book renderer (reader, PDF, lock screen), Sunday reading; Portrait from the user's lines; Blueprint streaming with `source_line_id` validation, editing, versions, Replan and the diff view. Practices: builder, schedules, two-minute versions, runner. Local-first store, sync, outbox, airplane tests. *Exit:* a user completes all three sittings and seals a Book with authorship ratio ≥ 0.95; the Blueprint shows a source sentence under every move; the day loop works offline.

### 14.4 Week 3 (28 Sept–2 Oct): the life after the writing
Today with every stone gesture, the Now card, Later, the new-move sheet, Seal the Day; Consistency, Returns, Ledger, Almanac, Goal with the flight and five stones; Envision (scenes from Impact lines, *The other road*, tone chips, wallpapers, letters that quote the Fifteen); the Coach (dawn brief scheduler per timezone, evening reflection, Horizon Review with Replan, chat with the four chips, memory profile and editor, persona, resources card, the single Full-track invitation). RevenueCat products, paywall, free limits enforced in Edge Functions, restore, webhook. iOS widgets and deep links. *Exit:* a seeded account runs a full day, a Sunday and a return; the brief arrives before wake time across three timezones; sandbox purchases on both stores; widgets update within 60 s.

### 14.5 Week 4 (5–9 Oct): polish, hardening, submission
Motion and haptics pass on the six signature moments (seat, park, hold, flight, the Fifteen's close, the Book seal); sound set; reduce motion and transparency paths; anti-template review of every screen in both studios; copy pass; every empty, loading, error and offline state; accessibility pass; Android parity; iPad; performance and Sentry triage to zero known crashes; Maestro flows (install → Interview → Fifteen → stones → seal the Book → Blueprint → check-in → seal the day → paywall → delete); a 20-person TestFlight and internal-track cohort with replay; store assets, metadata, privacy labels, AI declarations, policy and terms live, review notes with a demo account. Stretch only if Week 3 exits were met by Wednesday: Live Activity, spoken replies, share cards, Android widget, calendar read. Client demo Friday 9 October.

### 14.6 Solo-developer cut list
Keep: Interview, the Fifteen (type only), What I heard, five stones for the top three goals, Seal the Book, the Book reader (PDF deferred), Portrait, Blueprint from user lines (no version UI), practices (runner deferred), Today, Seal the Day, Consistency and Ledger (Almanac deferred), one scene type plus the welcome letter, dawn brief and chat, paywall, small widget, iOS first with Android in a fifth week. Defer: the shadow and its render, voice in the Fifteen, the Full track's paragraph mode, Sunday reading, the Replan diff (offer regenerate), the Returns letter, wallpapers, the review document.

### 14.7 Client demo script (12 minutes)
1. Cold open on Today at the demo's real time. 30 s.
2. New account → Interview by taps with the client's own goal → into the Fifteen for a shortened two-minute write by voice → What I heard reads the client's own phrases back as stones. 4 min.
3. One stone live (Strategies: framings, the line, the "When, exactly?" follow-up) → a seeded account's sealed Book, page turns, the "I will" lock screen → the Blueprint with the source sentence under each move. 3 min.
4. Seat the first move; drag one to not today; watch the score. 30 s.
5. Envision: three scenes and the welcome letter quoting the Fifteen; export a wallpaper. 1.5 min.
6. Coach: "I don't feel like it" → the coach quotes the client's own if-then → action added to Today; "What Morrow knows about me". 1.5 min.
7. A missed week on the seeded account: the Returns letter, Sunday reading, the Replan diff. 1 min.
8. Close on the paywall, the Full track invitation and the Phase 2 roadmap. 30 s.

### 14.8 Definition of done
All Must features on iOS and Android, including the complete Future volume from Interview to a sealed Book on both tracks with authorship ratio ≥ 0.95; both studios; accessibility checklist passed; performance budgets met on reference devices; anti-template sign-off per screen; Maestro suite green; the prompt eval green; crash-free ≥ 99.5% over the cohort week; store submissions accepted or in review with no policy findings; documentation: README, architecture notes, prompt and schema versions, runbook.

---

## 15. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fifteen minutes of writing does not hold on a phone | Medium | High | Voice default; seeds in the margin; ten minutes counts on Starter; the first twenty testers decide the default length |
| Stage 2 dropout, as in every study | High | High | Three sittings under thirty minutes; dawn-brief threading; five stones only for the top three; the Book as a visible reward |
| The read-back quotes text the user did not write | Low | High | Substring verification in code; retry once; fall back to the Interview tray |
| The client expects AI to write the plan | Medium | High | Show the ownership numbers (§4.1); every move shows its source line; "Ask me a better question" instead of "Rewrite" |
| Legal proximity to Self Authoring | Medium | High | Method only; original prompts; no names; counsel review of copy before launch |
| Emotional harm in the shadow or the Quarry | Medium | High | Optional and never first; the safety layer on every text; the Quarry per goal in Phase 3; clinical review for the full autobiography |
| Scope exceeds one month | High | High | Must and stretch split; weekly exits; the solo cut list; flags |
| AI quality (plans too ambitious, briefs preachy) | Medium | High | Schemas with hard rules; the eval gating prompts; Opus 5 for plans |
| AI cost at scale | Medium | Medium | Authoring is user typing; caching ≥ 80%; caps; tiering |
| App Review (AI disclosure, health language, subscriptions) | Medium | High | §12 checklist; 17+ rating; consent screen; AI declarations |
| Legend-State v3 sync immaturity | Medium | Medium | Thin adapter; TanStack Query fallback designed |
| Lost device, no account, Book gone | Medium | High | Account ask before the paywall; export one tap after every seal |
| Naming conflict | Medium | Medium | Trademark and store search before Week 2 (§16) |

---

## 16. Naming
Working name **Morrow** ("the morrow", the coming day; the future you are writing toward). Before committing: USPTO and EUIPO searches in classes 9 and 42, App Store and Play name search, domains (`morrow.app`, `getmorrow.com`), handles. Ranked alternatives with the same logic: Yonder, Onward, Hence, Author (too generic), Volume, Ledger, Wend, Selfsame, Meridian. The product's own vocabulary (the Fifteen, the Book, stones, the Bench, the Quarry) is original and should be trademarked with the name.

---

## 17. Phases 2 and 3 (designed now, built after the demo)

**Phase 2.** The Bench (§7.15); Day-90 re-authoring (§7.3); the Declaration, one witness and gift a chapter (§7.17); the Council of archetypal mentors (never real named people) delivering briefs and letters in their own voice; Future You face and voice with consent, 18+, pre-registered safety review; the Apple Journaling Suggestions integration; Android widget parity; the Wrapped-style year recap; localization (ES, PT, DE, FR, UR/HI).

**Phase 3.** The Quarry (§7.16) and, separately consented, the full autobiography; cohorts for institutions (§7.18) with an admin view and research export; wearable-aware placement of moves (HealthKit and Health Connect, never to judge); calendar write; vision films from scenes; the web app for the Book and the review; a marketplace of Blueprints from coaches.

Data-model readiness: `book_versions` carries every volume; `letters.direction`, `scenes.type` and `profiles.persona` generalize to mentors; `cohorts` and `witnesses` exist as tables from Phase 1 migrations, empty; pgvector is enabled for long-horizon memory.

---

## 18. Resources (free unless noted)
**Design:** Apple Design Awards 2024–2026; Mobbin, Screenlane, Refero, Nicelydone, 60fps.design, Design Spells; Apple HIG and Liquid Glass guidance; Material 3 research; Google Fonts (Outfit, Newsreader); fontTools for static instances.
**Engineering:** Expo SDK 57 docs, Unistyles 3, Reanimated 4, Skia, Legend-State v3, Drizzle with expo-sqlite, @bacons/apple-targets, react-native-android-widget, Maestro, EAS, Supabase, Vercel AI SDK, Anthropic docs (structured outputs, caching), PostHog RN, Sentry RN, RevenueCat RN.
**AI providers:** Anthropic (production); Google AI Studio and Groq (development); fal.ai; ElevenLabs free and Kokoro (voice, stretch).
**Science:** the studies in §4.1 with links in *The Authoring Brief*; Locke and Latham 2002; Gollwitzer and Sheeran 2006; Oettingen (woopmylife.org); Pham and Taylor 1999; Hershfield 2011; MIT Future You (arXiv 2405.12514); King 2001; Miller and Rollnick; Harkin 2016; Epton 2017; Carrillo 2019; Frattaroli 2006; Dekker 2023; arXiv 2605.12344.
**Benchmarks:** RevenueCat State of Subscription Apps 2026; Adapty 2026; the digital-journal market reports (used for scale only).
**Legal:** Apple privacy labels guide; Play Data safety; GDPR patterns; policy generators for first drafts, reviewed by counsel.

---

## 19. Open questions for the client
1. **Name.** Proceed with Morrow pending searches, or choose from §16?
2. **Default track.** Starter with the coach's one invitation (recommended for consumers), or Full by default if the first users are a cohort?
3. **How much will your users write?** If broader than people willing to write, the Starter Fifteen becomes seven minutes by voice.
4. **Is there an institution in mind?** If so, cohorts move to Phase 2 and the tone follows.
5. **"Like Self Authoring" as method only (recommended) or as an association with the brand?** Prompts and name are theirs; association is a marketing and legal risk.
6. **Where the AI stops.** Our position is that it never writes a goal (§11.1). If the client wants "the AI writes my plan", the May 2026 study says that version acts on fewer goals; we recommend showing the numbers.
7. **Does the Quarry belong at all?** Recommendation: the per-goal version in Phase 3; the full autobiography only after clinical review.
8. **What is the Book worth?** Free first edition with premium re-authoring (recommended), or the paid object?
9. **Pricing.** Confirm $9.99 / $49.99 / $149.99, the 7-day trial, gift a chapter at $14.95, and whether lifetime exists.
10. **Persona voices.** Three registers, or one branded voice?
11. **Phase 2 avatars.** Archetypal mentors only (recommended), or likeness of real people (not recommended)?
12. **Accounts.** Which of Apple, Google, Supabase, RevenueCat and Anthropic are created under the client's entity from day one?

---

## Appendix A — Research files and companion documents
- *The Authoring Brief* (9 Sept 2026): selfauthoring.com research, walkthrough, prompt tree, evidence, twenty ideas. https://claude.ai/code/artifact/1a4a9499-e85e-466f-9f92-af3047115230
- *The Morrow Authoring Script* v2 (9 Sept 2026): every screen and prompt of the Future, Bench and Quarry volumes on both tracks. https://claude.ai/code/artifact/47760d6c-15af-480c-be27-c30261c7642d
- *Morrow Flow Atlas* v2 (9 Sept 2026): every flow, the screen inventory with states, three state machines, the time map, edge cases, and the second research pass. https://claude.ai/code/artifact/d61b0f86-b9b4-4a97-8368-3a3a1fbab4fe
- *Morrow Studio Direction* (the design canvas, with Today, the Interview and Seal the day as live prototypes). https://claude.ai/code/artifact/e4f75940-70eb-4261-9a2f-a33b75ffcdcc
- `docs/research/00-verified-facts.md` … `06-inspiration-scan.md`; archived directions under `design/archive/`.

## Appendix B — Glossary
**Authoring** the writing volumes: Future, Bench, Quarry. **The Fifteen** fifteen minutes of continuous writing about the ideal future. **The shadow** the write about the future to avoid; rendered as *The other road*. **What I heard** the coach's read-back of the user's phrases as stones. **Stone** a goal, or a move, rendered as a sphere; also the five analyses on a goal (motives, impact, strategies, obstacles, monitoring). **Seat / park / step** the three stone gestures. **The Book** the user's writing, typeset and sealed; versioned. **Spine** the Book's title. **Starter / Full** the two depth tracks. **Portrait** the goal articulated from the user's lines. **Blueprint** the plan generated from the user's lines. **Source line** the user's sentence a move came from. **Move** a concrete ≤ 2-hour action. **Practice** a routine or habit. **Path** the goal's route. **Evidence** any logged proof; its rule is the user's Monitoring line. **Consistency Score** trailing 28-day weighted completion. **Return** coming back after two or more missed days. **Seal** the hold that closes a day or a Book. **Sunday reading** ten minutes with the Book before the Horizon Review. **Re-authoring** the Day-90 rewrite with a diff. **The Bench** faults and virtues in plain words. **The Quarry** two memories per goal. **Declaration** the portrait with the "I will" line. **Witness** the one person who receives it. **Cohort** an institution's class on the Full track.

## Appendix C — Change log
- **v4.1, 9 Sept 2026.** §10.8 added: the client's Oracle Always Free instance (halved shape, 2 OCPU / 12 GB) hosts voice, the Book renderer and jobs; stack and cost lines updated.
- **v4.0, 9 Sept 2026.** Single complete rewrite around the Self Authoring system. Studio is the only design system in the document. Depth tracks integrated. Research rounds two and three added (Dekker 2023, Harkin 2016, Epton 2017, Carrillo 2019, Frattaroli 2006, Travers 2015, dictation evidence, MIT Future You, the 2026 category and trend scan). Companion documents listed in Appendix A.
- **v3.0–3.2, 9 Sept 2026.** Re-based on Self Authoring by patching v1; depth tracks added. Superseded.
- **v1.0, 8 Sept 2026.** Future-self coaching with the Landscape design system. Superseded.
