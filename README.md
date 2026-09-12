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
authorship guard, the web build, the end-to-end suite and an axe-core
accessibility pass over every screen. Nothing ships without it passing.
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
2. The functions and the auth config need the CLI signed in **as the project's owner**. The CLI is a dev dependency (`pnpm exec supabase`); a machine may already hold a login for some other account, and `supabase login` replaces it:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase functions deploy
   pnpm exec supabase config diff --project-ref <ref>   # read it
   pnpm exec supabase config push --project-ref <ref>   # the six-digit code template, otp length, Apple
   pnpm exec supabase secrets set ANTHROPIC_API_KEY=… FAL_KEY=…
   ```

   The service-role key and the anon key are already in the functions' environment; neither belongs in the app or this repo.
3. Authentication → Email: the app asks for a **six-digit code**, and `config.toml` carries the template (`supabase/templates/magic_link.html`, `{{ .Token }}`) so `config push` sets it; check the dashboard shows it after. Authentication → Providers → Apple: `config.toml` enables it with the bundle id `app.morrow.client` as the client id (native sign-in needs no secret).
4. Put the project URL and the publishable (anon) key in the app's environment (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — `apps/mobile/.env` works for `expo start`, `expo run:*` and `pnpm build:web`. The tests build with `pnpm build:web:offline`, which blanks every `EXPO_PUBLIC_*` so `pnpm verify` never reaches the network.
5. The hard delete: schedule a call to the `delete-account` sweep daily if you want it on the clock (it also runs on every call), e.g. a pg_cron job hitting the function, or leave it: every close of an account runs the sweep for the ones whose week is up.

## Layout

```
apps/mobile      the Expo app (expo-router screens in app/, the store in src/)
packages/core    the engines: every rule, testable without React Native
packages/ui      the Studio design system: tokens, stones, rings, the hold
supabase         the migration and the edge functions
scripts          the guards and the end-to-end suite
design           the Studio canvas and the archived directions
```
