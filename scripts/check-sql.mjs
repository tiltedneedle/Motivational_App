/**
 * Structural checks on the migration.
 *
 * There is no Postgres on this machine, so the migration has never been
 * executed — see PROGRESS.md. That is a real gap and this script does not close
 * it: `plpgsql` function bodies are opaque strings to any parser, so a body
 * that references a column that does not exist will pass here and fail on the
 * first `supabase db reset`. What this does check is that the guards carrying
 * the product's promises are present and shaped correctly, so none of them can
 * be quietly deleted or weakened in a refactor.
 *
 * Run: node scripts/check-sql.mjs
 */
import { readFile } from 'node:fs/promises';

const FILE = 'supabase/migrations/0001_init.sql';
const sql = await readFile(FILE, 'utf8');
const lower = sql.toLowerCase();

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

// ---- every table carries row level security

const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
const rls = new Set([...sql.matchAll(/alter table public\.(\w+)\s+enable row level security/g)].map((m) => m[1]));
check(`every table has row level security (${tables.length} tables)`, tables.every((t) => rls.has(t)), tables.filter((t) => !rls.has(t)).join(', '));

const policied = new Set([...sql.matchAll(/create policy "[^"]+" on public\.(\w+)/g)].map((m) => m[1]));
check('every table has at least one policy', tables.every((t) => policied.has(t)), tables.filter((t) => !policied.has(t)).join(', '));

// ---- the authorship guards, which are the product's central promise

check(
  'a move cannot exist without the user line behind it',
  /source_line_id\s+uuid\s+not null/.test(lower),
  'moves.source_line_id must be NOT NULL',
);
check(
  'a trigger checks that line belongs to the same person and goal',
  /create trigger moves_source_guard/.test(lower) && /check_move_source/.test(lower),
);
check(
  'the authorship ratio is recomputed on the server, not believed',
  /create trigger book_versions_authorship_guard/.test(lower) && /new\.authorship_ratio\s*:=\s*actual/.test(lower),
  'the stored ratio must be overwritten with the server figure',
);
check(
  'the floor is still 0.95 in both the constraint and the trigger',
  /authorship_ratio\s+real\s+not null\s+check\s*\(authorship_ratio\s*>=\s*0\.95\)/.test(lower) &&
    /if actual < 0\.95 then/.test(lower),
);
check(
  'writing cannot be rewritten once it is stored',
  /create trigger authoring_texts_immutable/.test(lower) &&
    /new\.body is distinct from old\.body/.test(lower),
);
check(
  'the immutability rule is unconditional',
  // It once compared `sealed_until < now()`, which froze the words only after
  // the draft lock expired and left them editable for the day they were meant
  // to be protected. Exactly backwards, and easy to reintroduce.
  !/if\s+old\.sealed_until\s*[<>]/.test(lower),
  'found a sealed_until comparison guarding the body check',
);

// ---- nothing is readable across accounts

const policies = [...sql.matchAll(/create policy "[^"]+" on public\.\w+[^;]*;/g)].map((m) => m[0].toLowerCase());
check(
  'every policy is scoped to the signed-in user',
  policies.every((p) => p.includes('auth.uid()')),
  `${policies.filter((p) => !p.includes('auth.uid()')).length} policy without auth.uid()`,
);

console.log('');
console.log(
  failures
    ? `${failures} structural check(s) failed`
    : `${tables.length} tables, ${policies.length} policies, all guards present`,
);
console.log('NOTE: the migration has not been executed — no Postgres in this environment.');
process.exit(failures ? 1 : 0);
