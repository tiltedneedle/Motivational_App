# Verified primary-source facts (fetched 2026-09-08)

These were fetched directly from the source pages during PRD research. Items marked "verify" could not be fetched (domain blocked) and are from memory.

## Subscription benchmarks — RevenueCat "State of Subscription Apps 2026" (data from 2025)
Source: https://www.revenuecat.com/state-of-subscription-apps/
- Download→trial (D30): Health & Fitness median 6.9%; Business 9.1%; North America 7.1%
- Trial→paid: 17–32 day trials 42.5%; 5–9 day trials 37.4%; ≤4 day trials 25.5%
- Download→paid (D35): hard paywall 10.7% vs freemium 2.1% (5x); Health & Fitness 2.9%
- Revenue per install: Health & Fitness D14 $0.48, D60 $0.66
- Realized LTV per payer after 1 year: Health & Fitness $35.64
- Median prices: weekly $5.99, monthly $10.00, yearly $34.80 (H&F yearly $39.94; NA yearly $39.99)
- Health & Fitness apps: 68% of subscriptions are annual; Productivity: 77% monthly
- Short trials (≤4 days) now 46.5% of apps; 55% of 3‑day trial cancellations happen on Day 0
- AI apps earn 41% more per payer but churn 30% faster
- Top quartile apps grew 80% YoY; bottom quartile shrank 33%
- ~14,700 new subscription apps launched per month (Jan 2026) vs ~2,000 (Jan 2022)

## Apple Design Awards 2026 (design references)
Source: https://developer.apple.com/design/awards/
- Delight & Fun: grug (winner; minimalist scribbled design, "Neolithic" daily wisdom), Blippo+ (retro-futurist TV), Metaballs
- Inclusivity: Guitar Wiz (winner), Hearing Buddy, Structured (daily planner for neurodivergent users, AI task suggestions)
- Innovation: NBA app (winner), Detail: AI Video Editor (uses Apple Foundation Models)
- Interaction: Moonlitt: Moon Phase Tracker (winner; Liquid Glass integration), The Outsiders: Athlete Tracker, Tide Guide
- Social Impact: Primary: News in Depth (winner), Katha Room (Gond-art-inspired UI), Harvee (Apple Watch stress monitor using on-device foundation models)
- Visuals & Graphics: Tide Guide (winner; Liquid Glass polish, sky-matching color palettes), Caradise, (Not Boring) Camera (retro '70s–'80s, haptic controls)

## MIT Media Lab "Future You" (future-self AI)
Sources: https://www.media.mit.edu/projects/future-you/overview/ ; https://arxiv.org/abs/2405.12514
- Components: LLM-generated "synthetic memories" from a survey (present → age 60), StyleGAN age-progressed avatar, LLM persona chat
- RCT, 188 participants (18–30): decreased anxiety, reduced negative emotion, reduced lack of motivation, increased future self-continuity
- Published IEEE FIE 2024 + NeurIPS Creative AI 2024; >60,000 users across 190 countries
- Authors include Pattie Maes and Hal Hershfield

## Platform / framework versions
- Expo SDK 57.0.0 bundles React Native 0.86, React 19.2.3, Node ≥22.13, Android compileSdk 36, iOS minimum 16.4 (https://docs.expo.dev/versions/latest/)
- expo-glass-effect: GlassView + GlassContainer; iOS 26+ only; falls back to plain View elsewhere; props glassEffectStyle ('clear'|'regular'|'none'), tintColor, isInteractive, colorScheme; opacity:0 breaks the effect (https://docs.expo.dev/versions/latest/sdk/glass-effect/)
- Expo Router Native Tabs: iOS 26 Liquid Glass tab bar (auto color adjust, minimizeBehavior on scroll), Android Material tab bar, max 5 tabs on Android, SDK 55+ recommended, SDK 56+ for disabled tabs (https://docs.expo.dev/router/advanced/native-tabs/)
- react-native-reanimated 4.6.0 (Aug 2026): RN 0.83–0.87, Worklets 0.12.x, CSS animation/transition callbacks, contrastColor worklet (https://github.com/software-mansion/react-native-reanimated/releases)
- @shopify/react-native-skia v2.11.2 (Sep 1 2026); v2.12 pre-release migrating to WebGPU; Skia m152 (https://github.com/Shopify/react-native-skia/releases)
- EAS Starter plan $19/month incl. $45 build credit; free plan = "limited quantity of low-priority builds" + free updates (exact counts not on docs page; verify on expo.dev/pricing)

## Free tiers (verified)
- RevenueCat: free up to $2,500 monthly tracked revenue, then 1% of MTR; includes paywall editor + A/B tests (https://www.revenuecat.com/pricing/)
- Superwall: subscription infrastructure free at any scale; paywalls free up to $10k/month paywall-attributed revenue, then 1% (https://superwall.com/pricing)
- PostHog: 1M events, 5K session replays, 1M flag requests, 1,500 survey responses, 100K exceptions per month free (https://posthog.com/pricing)
- Sentry Developer plan: 5k errors, 50 replays, 5M spans, 5GB logs, 1 user; Team $26/mo (https://sentry.io/pricing/)
- Convex Starter: 1M function calls, 0.5 GB DB, 1 GB files, 20 GB‑hours actions; Pro $25/dev/month (https://www.convex.dev/pricing)
- Rive Free: 3 files, 1 workspace, editor access, NO .riv export on free (Cadet $9/mo needed to export) (https://rive.app/pricing)
- Groq free tier: e.g., Qwen/GPT-OSS models 30 RPM / 1K RPD / 8K TPM / 200K TPD; whisper-large-v3(-turbo) 20 RPM / 2K RPD / 7.2K audio-sec/hour (https://console.groq.com/docs/rate-limits)
- Supabase free (verify — domain blocked): ~2 projects, 500 MB DB, 1 GB storage, 5 GB egress, 50k MAU, 500k edge invocations, projects pause after ~1 week inactivity; Pro $25/mo
- Gemini API free tier (verify — domain blocked): Flash-class models free in AI Studio with per-minute/day caps
- fal.ai FLUX.1 [schnell] (verify): ~$0.003/megapixel image; FLUX dev ~$0.025/MP
- ElevenLabs free (verify): ~10k credits/month, non-commercial on free; Starter $5/mo commercial

## Claude API (from bundled skill, cached 2026-06-24)
- claude-opus-5: $5 / $25 per 1M in/out, 1M context; claude-sonnet-5: $2 / $10; claude-haiku-4-5: $1 / $5
- Adaptive thinking (`thinking: {type: "adaptive"}`), `output_config.effort` low→max, structured outputs via `output_config.format`, prompt caching (cache reads much cheaper), Batches API at 50% cost
- No free tier; use for production coach quality. Gemini/Groq free tiers for dev-phase load.

## Apple App Store Review Guidelines (relevant clauses)
Source: https://developer.apple.com/app-store/review/guidelines/
- 5.1.1(v): in-app account deletion mandatory if accounts exist
- 4.8: if using Google/Facebook login, must also offer Sign in with Apple (or equivalent privacy-limiting login)
- 3.1.2: subscriptions ≥7 days, ongoing value, clear description of what user gets before subscribing; 2.3.2 screenshots must disclose IAP
- 1.4.1: no medical/diagnostic claims; remind users to consult a doctor for medical decisions
- 5.1.2(i): "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so."
- 5.1.2(vi): HealthKit data may not be used for marketing/advertising/data mining
- 1.2: if any user-generated/shared content → filtering, reporting, blocking, contact info

## Material 3 Expressive research (Google)
Source: https://design.google/library/expressive-material-design-google-research
- Five levers: color, shape, size, motion, containment
- Key elements spotted up to 4x faster; 45+ users perform at parity with younger users
- 18–24 preference up to 87%; +34% "modern", +32% "subculture", +30% "rebellious"
- Guidance: context matters, function first, exceed accessibility guidelines, test
