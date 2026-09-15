/**
 * The Vercel CLI with this repo's credentials from `supabase/.env.local`.
 *
 *   pnpm vc whoami
 *   pnpm vc projects ls
 *   pnpm vc deploy --prebuilt --prod
 *
 * The file (gitignored) carries VERCEL_TOKEN — a token from the owner's Vercel
 * account — and optionally VERCEL_ORG_ID and VERCEL_PROJECT_ID once a project
 * exists. Nothing here prints any of them. The same shape as `pnpm sb`, and for
 * the same reason: a credential belongs in one ignored file, not in a shell
 * history.
 */
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const env = { ...process.env };
try {
  const text = await readFile(join(ROOT, 'supabase', '.env.local'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {
  // no file: whatever the environment has
}
if (!env.VERCEL_TOKEN) {
  console.error('VERCEL_TOKEN is required (supabase/.env.local, or the environment).');
  process.exit(2);
}

const args = process.argv.slice(2);
// --token is passed explicitly as well as in the environment: the CLI reads the
// flag first, and a stale global login on this machine cannot win.
const child = spawn('pnpm', ['exec', 'vercel', ...args, '--token', env.VERCEL_TOKEN], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 1));
