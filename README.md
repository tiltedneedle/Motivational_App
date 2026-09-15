# Morrow

Write your future in your own words. Then live by it.

A writing program with published evidence behind it, built for a phone: an
Interview, fifteen minutes of continuous writing about the future, five stones
per goal, a Book the person seals with a hold, and a Today built out of their
own lines. The method comes from the goal-setting and expressive-writing
research (Morisano et al. 2010; Schippers et al. 2015, 2020; King 2001); every
prompt, name and line of copy is Morrow's own. The one rule shaping everything: the
person writes every goal, plan line and Book sentence. The app asks, quotes,
sorts and typesets, and never writes a word about their life.

`PRD.md` is the spec. `PROGRESS.md` is where the build is and what is left.

## Run it on a Mac (iPhone)

Once: install [Xcode](https://apps.apple.com/app/xcode/id497799835) from the
App Store, open it, accept the licence. Then:

```bash
# copy this folder to the Mac (without node_modules), or push it and clone it
cd morrow
corepack enable          # picks up pnpm 11 from package.json
pnpm install
cd apps/mobile
npx expo run:ios
```

The first run generates the `ios/` folder and compiles (about ten minutes).
It opens in the iPhone Simulator. Nothing else to configure: the icon, the
splash and the notification settings are in `app.json` and the assets are
committed.

On your own iPhone, plug it in and:

```bash
npx expo run:ios --device
```

Xcode will ask you to sign in with an Apple ID the first time. A free one
installs for seven days; a developer account makes it permanent.

## Run it anywhere, without a build

Install **Expo Go** on the phone, then:

```bash
cd apps/mobile && npx expo start --tunnel
```

Scan the QR code. Everything runs in Expo Go except home-screen widgets.

## Android

Either Android Studio (an emulator or a phone with USB debugging, JDK 17,
`ANDROID_HOME` set) and `npx expo run:android`, or the cloud:
`npm i -g eas-cli && eas login && eas build -p android --profile development`.

## Check the tree

```bash
pnpm verify
```

Toolchain guard, date guard, copy guard, typecheck, lint, every unit test, the
edge-function and SQL guards, the migration against a real Postgres, the serif
authorship guard, the guard that every screen has a way back at its top,
the accessibility lint (eslint-plugin-react-native-a11y, thirteen rules),
the web build (offline: every key blanked), the end-to-end suite and an
axe-core accessibility pass over every screen. Nothing ships without it passing.
`npx expo-doctor` in `apps/mobile` checks the native configuration; it
passes 18/18.

To look at the product rather than its tests:

```bash
pnpm shots
```

renders every screen from a seeded store at phone size into `scripts/shots/`
(`DARK=1` for the night studio, `W=375 H=667` for a smaller phone), and
`pnpm test:a11y` runs the same screens through axe (`DARK=1` there too).

## What needs a key

Everything runs on local fallbacks without one. To go beyond them:

| Key | Where | What it turns on |
|---|---|---|
| Supabase URL + anon key | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the account: email code, Sign in with Apple, push/pull of the whole store, and the edge functions on the project's own host. Run `supabase db push` and `supabase functions deploy` once. |
| Anthropic | the edge functions' `ANTHROPIC_API_KEY` (`EXPO_PUBLIC_MORROW_API` only if the functions live somewhere other than Supabase) | the read-back, the second safety opinion, scenes |
| fal.ai | the scene function's `FAL_KEY` | scene images |
| RevenueCat | `EXPO_PUBLIC_RC_IOS`, `EXPO_PUBLIC_RC_ANDROID` | purchases |
| PostHog | `EXPO_PUBLIC_POSTHOG_KEY` (and `_HOST` if not US) | product analytics: fixed event names and numbers, never text |

### Setting the Supabase project up, once

1. The schema. `pnpm db:push` applies whatever is in `supabase/migrations/` that the project has not seen and records it where the CLI looks (`supabase_migrations.schema_migrations`), so a later `supabase db push` finds nothing to do. It needs three values, in `supabase/.env.local` (gitignored) or the environment:

   ```
   SUPABASE_REF=<ref>
   SUPABASE_REGION=<pooler region>
   PGPASSWORD=<database password>
   ```

   The region is the session pooler's (`aws-0-<region>.pooler.supabase.com`; the dashboard's *Connect* panel shows it, or `pnpm db:find` tries each one) — the direct `db.<ref>.supabase.co` host is IPv6-only, which is also why the CLI's own `db push` fails on an IPv4 network until `supabase link` has set the pooler up. The password is written nowhere by the scripts. `pnpm db:push -- --dry` lists without applying.
2. The functions and the auth config go through Supabase's Management API, which wants a **personal access token** from the owner's account (no project key opens it). Generate one at https://supabase.com/dashboard/account/tokens and put it in `supabase/.env.local` as `SUPABASE_ACCESS_TOKEN=sbp_…`; `pnpm sb` runs the CLI with that file's values, so a login stored on the machine for some other account is never touched:

   ```bash
   pnpm sb link --project-ref <ref>       # the database password comes from the same file
   pnpm sb config diff                    # read it first
   pnpm sb config push --yes              # otp length and expiry, the deep-link URLs, Apple
   pnpm sb functions deploy               # readback, safety, scene, delete-account
   pnpm sb secrets set LLM_BASE_URL=https://api.groq.com/openai/v1 LLM_API_KEY=… LLM_MODEL=llama-3.3-70b-versatile
   # or: pnpm sb secrets set ANTHROPIC_API_KEY=…
   ```

   The three AI functions speak to any OpenAI-compatible endpoint (OpenAI, Groq, Gemini's compatible URL, OpenRouter, Mistral, an Ollama of your own) through those three secrets, or to Anthropic through its one; with none set they say so and the app runs on its device engines. What a model adds, and what stands in for it without one: the **read-back** after the Fifteen (the model picks the person's own phrases as goal candidates; without it a local extractor picks), the **safety second opinion** on a sitting (the device's pattern screen is the first opinion and runs regardless), and the **scene** narrative in Envision (without it, the typeset scene). The coach, the Blueprint, the Portrait, the Book and everything else never leave the device.

   The service-role key and the anon key are already in the functions' environment; neither belongs in the app or this repo.
3. Authentication → Email. The app asks for a **six-digit code**, and `config.toml` carries the template for it (`supabase/templates/magic_link.html`, `{{ .Token }}`) — commented out, because a free-tier project on the default email provider refuses template changes. Until the project is on Pro (or has its own SMTP) the email carries Supabase's link, and the app signs in from the link too: tapped on the phone it opens `morrow://` with the session, which the root layout hands to the auth server. On Pro, uncomment the two template tables and `pnpm sb config push --yes`. Authentication → Providers → Apple: `config.toml` enables it with the bundle id `app.morrow.client` as the client id (native sign-in needs no secret).
4. The account, end to end, against the project: `pnpm build:web && pnpm test:account`. A throwaway user is made with the service role (from `supabase/.env.local`, never the browser), signed into the built app **from a link**, the seeded store pushed, the device wiped, the Book brought back and compared, the account closed through the deployed function, the user removed. Not part of `verify` — it reaches the network.
5. Put the project URL and the publishable (anon) key in the app's environment (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — `apps/mobile/.env` works for `expo start`, `expo run:*` and `pnpm build:web`. The tests build with `pnpm build:web:offline`, which blanks every `EXPO_PUBLIC_*` so `pnpm verify` never reaches the network.
6. The hard delete is on the clock already: migration 0002 schedules a nightly pg_cron job that removes the auth users past their seven days (and the function sweeps on every call as well). Was: schedule a call to the `delete-account` sweep daily if you want it on the clock, e.g. a pg_cron job hitting the function, or leave it: every close of an account runs the sweep for the ones whose week is up.

## Layout

```
apps/mobile      the Expo app (expo-router screens in app/, the store in src/)
packages/core    the engines: every rule, testable without React Native
packages/ui      the Studio design system: tokens, stones, rings, the hold
supabase         the migration and the edge functions
scripts          the guards and the end-to-end suite
design           the Studio canvas and the archived directions
```
