# Morrow

Write your future in your own words. Then live by it.

The Self Authoring method rebuilt for a phone: an Interview, fifteen minutes of
continuous writing, five stones per goal, a Book the person seals with a hold,
and a Today built out of their own lines. The one rule shaping everything: the
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
authorship guard, the web build and the end-to-end suite. Nothing ships
without it passing. `npx expo-doctor` in `apps/mobile` checks the native
configuration; it passes 18/18.

## What needs a key

Everything runs on local fallbacks without one. To go beyond them:

| Key | Where | What it turns on |
|---|---|---|
| Supabase URL + anon key | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | sign-in and sync (wired once the key arrives) |
| Anthropic | the edge functions' `ANTHROPIC_API_KEY`; the app's `EXPO_PUBLIC_MORROW_API` | the read-back, the coach, letters, scenes |
| fal.ai | the scene function's `FAL_KEY` | scene images |
| RevenueCat | `EXPO_PUBLIC_RC_IOS`, `EXPO_PUBLIC_RC_ANDROID` | purchases |

## Layout

```
apps/mobile      the Expo app (expo-router screens in app/, the store in src/)
packages/core    the engines: every rule, testable without React Native
packages/ui      the Studio design system: tokens, stones, rings, the hold
supabase         the migration and the edge functions
scripts          the guards and the end-to-end suite
design           the Studio canvas and the archived directions
```
