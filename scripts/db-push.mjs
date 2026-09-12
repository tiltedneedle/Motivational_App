/**
 * `supabase db push`, without the CLI.
 *
 * The CLI needs an access token from `supabase login`, which only the person
 * who owns the project can do. The database itself needs only its password.
 * This applies whatever is in `supabase/migrations/` that the project has not
 * seen, each file in one transaction, and records it in the same table the
 * CLI reads (`supabase_migrations.schema_migrations`), so a later
 * `supabase db push` from a logged-in machine finds nothing to do rather than
 * trying to create everything twice.
 *
 *   SUPABASE_REF=<ref> SUPABASE_REGION=ap-southeast-1 PGPASSWORD=… node scripts/db-push.mjs
 *   …                                                  node scripts/db-push.mjs --dry   # list only
 *
 * The region is the pooler's (`scripts/db-find.mjs` finds it); the direct
 * host is IPv6-only. The three values can also sit in `supabase/.env.local`
 * (gitignored), so the password never has to be typed on a command line;
 * the script writes it nowhere.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIR = join(ROOT, 'supabase', 'migrations');

/**
 * `supabase/.env.local` (gitignored), so the password never has to be on a
 * command line. Shell variables win over the file.
 */
async function loadLocalEnv() {
  try {
    const text = await readFile(join(ROOT, 'supabase', '.env.local'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    // no file: the environment has to carry everything
  }
}
await loadLocalEnv();

const ref = process.env.SUPABASE_REF;
const region = process.env.SUPABASE_REGION;
const password = process.env.PGPASSWORD;
const dry = process.argv.includes('--dry');
if (!ref || !region || !password) {
  console.error('SUPABASE_REF, SUPABASE_REGION and PGPASSWORD are required');
  process.exit(2);
}

const files = (await readdir(DIR)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
const client = new pg.Client({
  host: `aws-0-${region}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();
try {
  // The CLI's own bookkeeping, created the way it creates it.
  await client.query('create schema if not exists supabase_migrations');
  await client.query(
    'create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)',
  );
  const applied = new Set((await client.query('select version from supabase_migrations.schema_migrations')).rows.map((r) => r.version));

  for (const file of files) {
    const [, version, name] = file.match(/^(\d+)_(.*)\.sql$/);
    if (applied.has(version)) {
      console.log(`${file.padEnd(24)} already applied`);
      continue;
    }
    if (dry) {
      console.log(`${file.padEnd(24)} would apply`);
      continue;
    }
    const sql = await readFile(join(DIR, file), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)', [
        version,
        name,
        [sql],
      ]);
      await client.query('commit');
      console.log(`${file.padEnd(24)} applied`);
    } catch (err) {
      await client.query('rollback');
      console.error(`${file.padEnd(24)} FAILED — rolled back\n${err.message}`);
      process.exitCode = 1;
      break;
    }
  }

  // What the project holds now, for the eye.
  const tables = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );
  const rls = await client.query(
    "select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and relkind = 'r' order by relname",
  );
  const policies = await client.query("select count(*)::int as n from pg_policies where schemaname = 'public'");
  const off = rls.rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  console.log(`\n${tables.rows.length} tables in public, ${policies.rows[0].n} policies, RLS off on: ${off.length ? off.join(', ') : 'none'}`);
} finally {
  await client.end();
}
