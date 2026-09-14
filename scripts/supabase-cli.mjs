/**
 * The Supabase CLI with the project's credentials from `supabase/.env.local`.
 *
 *   pnpm sb projects list
 *   pnpm sb link --project-ref <ref>
 *   pnpm sb functions deploy
 *
 * The file (gitignored) can carry SUPABASE_ACCESS_TOKEN — a personal access
 * token from the owner's account, which the CLI reads in preference to any
 * login stored on the machine — and SUPABASE_DB_PASSWORD, which `link` reads
 * instead of prompting. Nothing here prints either.
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
if (env.PGPASSWORD && !env.SUPABASE_DB_PASSWORD) env.SUPABASE_DB_PASSWORD = env.PGPASSWORD;

const child = spawn('pnpm', ['exec', 'supabase', ...process.argv.slice(2)], { cwd: ROOT, env, stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 1));
