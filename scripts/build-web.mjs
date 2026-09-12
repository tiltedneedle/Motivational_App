/**
 * The web build, with or without the account service.
 *
 * `expo export` reads `apps/mobile/.env`, and once that file names a real
 * Supabase project the bundle it produces talks to it: the read-back goes to
 * an edge function, the account screen offers sign-in. That is the build a
 * person runs. It is not the build the tests run — `pnpm verify` has to mean
 * the same thing on a machine with the keys and one without, and an e2e run
 * that reaches the network is one that can fail for reasons in Singapore.
 *
 *   node scripts/build-web.mjs             # as configured: the product
 *   node scripts/build-web.mjs --offline   # every EXPO_PUBLIC_* blank: the tests
 *
 * Shell variables set before the call still win over `.env`, so `--offline`
 * blanks them here rather than editing the file. Every build clears Metro's
 * transform cache, which does not know the env changed.
 */
import { spawnSync } from 'node:child_process';

const offline = process.argv.includes('--offline');
const env = { ...process.env };
if (offline) {
  for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_MORROW_API', 'EXPO_PUBLIC_POSTHOG_KEY', 'EXPO_PUBLIC_RC_IOS', 'EXPO_PUBLIC_RC_ANDROID']) {
    // Blank, not deleted: dotenv fills in only what is absent.
    env[key] = '';
  }
}
// --clear: EXPO_PUBLIC_* values are inlined at transform time and Metro's
// transform cache does not key on them, so a build after the other mode's
// build would ship the other mode's values. A cold transform costs a minute.
const r = spawnSync('pnpm', ['--filter', 'mobile', 'export:web', '--', '--clear'], { stdio: 'inherit', env, shell: true });
process.exit(r.status ?? 1);
