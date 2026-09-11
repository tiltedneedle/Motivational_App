/**
 * Structural checks on the migration.
 *
 * These are structural checks over the text: that the guards carrying the
 * product's promises are present and shaped correctly, so none of them can be
 * quietly deleted or weakened in a refactor. They are fast and they run on
 * every verify.
 *
 * They are not the whole story, because a `plpgsql` body is an opaque string to
 * any parser. `scripts/test-migration.mjs` is the other half: it runs this
 * migration against a real Postgres (PGlite, no Docker) and exercises every
 * guard below for real, as a non-owner role so row level security actually
 * applies.
 *
 * Run: node scripts/check-sql.mjs
 */
import { readFile } from 'node:fs/promises';

const FILE = 'supabase/migrations/0001_init.sql';
// Normalised to LF. This tree is checked out with CRLF, and a check that
// matches across a line break is a check that quietly never matches on it.
const sql = (await readFile(FILE, 'utf8')).replace(/\r\n/g, '\n');
const lower = sql.toLowerCase();

/**
 * The body of one `create table` statement.
 *
 * Every per-table assertion below runs against its own slice. Searching the
 * whole file meant `moves.source_line_id is NOT NULL` was satisfied by any
 * NOT NULL uuid column anywhere in the schema — both of these guards stayed
 * green with the columns they name made nullable.
 */
function tableBody(name) {
  const head = `create table public.${name} (`;
  const i = sql.indexOf(head);
  if (i === -1) return '';
  const j = sql.indexOf('\n);', i);
  return sql.slice(i + head.length, j === -1 ? undefined : j).toLowerCase();
}

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

const movesTable = tableBody('moves');
check(
  'a move cannot exist without the user line behind it',
  /source_line_id\s+uuid\s+not null/.test(movesTable),
  'moves.source_line_id must be NOT NULL',
);
check(
  'a trigger checks that line belongs to the same person and goal',
  /create trigger moves_source_guard/.test(lower) && /check_move_source/.test(lower),
);
check(
  'a move names the plan it belongs to',
  /plan_id\s+uuid\s+not null\s+references public\.plans/.test(movesTable),
  'moves.plan_id must be NOT NULL: milestone_id is nullable, so without it a move has no path to its plan',
);
check(
  'a ledger row can name the move it is proof of',
  /move_id\s+uuid\s+references public\.moves/.test(tableBody('evidence')),
  'evidence.move_id: undo removes a move\'s own row, and matching on the title deleted the wrong one',
);
check(
  'the free-text rows carry a safety verdict',
  ['goal_analyses', 'evidence', 'day_summaries'].every((t) => /safety_risk\s+text\s+not null/.test(tableBody(t))),
  'a flagged line must never be quoted back or sealed',
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
  !/old\.sealed_until/.test(lower),
  'the body check must not consult sealed_until at all: writing is never rewritten, not merely rewritten later',
);

// ---- nothing points at another person's rows
//
// Row level security says whether Bob may write a row; it says nothing about
// what the row points at. Every column that references something a person
// owns has to carry the ownership trigger, and the list here is derived from
// the migration rather than written down, so a new foreign key cannot be added
// without either a trigger or a deliberate exemption.
const OWNED = new Set(['goals', 'plans', 'moves', 'books', 'practices', 'authoring_sessions', 'goal_analyses', 'milestones']);
const EXEMPT = new Set([
  // Covered by its own, stricter guard (check_move_source), which also checks
  // that the line and the plan are for the same goal.
  'moves.plan_id',
  'moves.source_line_id',
  // Transitively: check_move_source requires the source line to belong to the
  // same person *and* the same goal, so the goal is theirs by construction.
  'moves.goal_id',
]);
const pointers = [];
for (const [, table, body] of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
  for (const [, col, parent] of body.matchAll(/^\s*(\w+)\s+uuid[^\n]*references public\.(\w+)/gm)) {
    if (OWNED.has(parent) && !EXEMPT.has(`${table}.${col}`)) pointers.push({ table, col, parent });
  }
}
const unguarded = pointers.filter(
  ({ table, col, parent }) =>
    !sql.includes(`on public.${table}\n  for each row execute function public.check_parent_owner('${col}', '${parent}');`),
);
check(
  'every pointer at something a person owns checks whose it is',
  pointers.length > 0 && unguarded.length === 0,
  unguarded.length
    ? `no ownership trigger on ${unguarded.map((u) => `${u.table}.${u.col}`).join(', ')}`
    : `${pointers.length} pointers found`,
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
console.log('NOTE: these are structural checks over the text. scripts/test-migration.mjs');
console.log('      runs the migration against a real Postgres and exercises the guards.');
process.exit(failures ? 1 : 0);
