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
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { join } from 'node:path';

const offline = process.argv.includes('--offline');
const env = { ...process.env };
if (offline) {
  for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_MORROW_API', 'EXPO_PUBLIC_POSTHOG_KEY', 'EXPO_PUBLIC_RC_IOS', 'EXPO_PUBLIC_RC_ANDROID', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID']) {
    // Blank, not deleted: dotenv fills in only what is absent.
    env[key] = '';
  }
}
// --clear: EXPO_PUBLIC_* values are inlined at transform time and Metro's
// transform cache does not key on them, so a build after the other mode's
// build would ship the other mode's values. A cold transform costs a minute.
const r = spawnSync('pnpm', ['--filter', 'mobile', 'export:web', '--', '--clear'], { stdio: 'inherit', env, shell: true });
if (r.status) process.exit(r.status);

/**
 * The weight of the first load, and a ceiling on it. The entry chunk was
 * 3.6 MB (876 KB over the wire) before the account library was made to
 * arrive on demand and a phone-only animation runtime was kept off the web;
 * a client on mobile data waits for every byte of this before Welcome. The
 * ceiling is a little above where it now sits, so a dependency that creeps
 * back in is a failed build, not a slower demo.
 */
const ENTRY_CEILING_KB = 2900;
const dir = join('apps', 'mobile', 'dist', '_expo', 'static', 'js', 'web');
const entry = readdirSync(dir).find((f) => f.startsWith('entry-'));
if (entry) {
  const raw = statSync(join(dir, entry)).size;
  const wire = brotliCompressSync(readFileSync(join(dir, entry))).length;
  console.log(`entry chunk ${Math.round(raw / 1024)} KB, ${Math.round(wire / 1024)} KB over the wire (brotli)`);
  if (raw / 1024 > ENTRY_CEILING_KB) {
    console.error(`FAIL  the entry chunk is over ${ENTRY_CEILING_KB} KB — something heavy joined the first load`);
    process.exit(1);
  }
}
process.exit(0);
