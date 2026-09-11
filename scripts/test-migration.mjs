/**
 * Run the migration against a real Postgres and exercise its guards.
 *
 * PGlite is Postgres 18 compiled to WebAssembly, so this needs no Docker and no
 * installed server — which matters, because this migration had never been
 * executed at all. Structural checks over the text cannot validate a `plpgsql`
 * body: a function referencing a column that does not exist parses perfectly
 * and fails the moment it runs. Everything below actually runs.
 *
 * Two things Supabase provides that PGlite does not, both stubbed here:
 *
 *  - the `auth` schema: a `users` table for the foreign keys, and `auth.uid()`
 *    reading a session setting so a test can say who it is.
 *  - the `authenticated` role. This one matters more than it looks. Postgres
 *    exempts a table's OWNER from row level security, and PGlite connects as a
 *    superuser who owns everything, so a naive harness reports every policy
 *    working while actually testing nothing. Supabase runs user queries as
 *    `authenticated`, so the tests below do the same.
 *
 * Run: node scripts/test-migration.mjs
 */
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const MIGRATION = 'supabase/migrations/0001_init.sql';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

const AUTH_STUB = `
create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text unique
);

-- Supabase reads the signed-in user out of the request JWT. A session setting
-- stands in, so a test can act as one person and then the other.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create role authenticated nologin;
grant usage on schema public, auth to authenticated;
grant select on auth.users to authenticated;
`;

/** Run after the migration: the role has to be able to reach the new tables. */
const GRANTS = `
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
`;

let failures = 0;
let passes = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passes++;
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** PGlite errors carry the whole bundle in the stack; only the message helps. */
function reason(err) {
  return String(err?.message ?? err).split('\n')[0];
}

async function mustReject(db, name, sql, params, expect) {
  try {
    await db.query(sql, params);
    check(name, false, 'the database accepted it');
  } catch (err) {
    const message = reason(err);
    const matched = !expect || message.toLowerCase().includes(expect.toLowerCase());
    check(name, matched, matched ? '' : `rejected, but for the wrong reason: ${message}`);
  }
}

const db = await PGlite.create({ extensions: { pgcrypto } });

/** Act as one person, through the role Supabase actually uses. */
async function as(userId, sql, params) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await db.exec('set role authenticated');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}

async function asRejects(name, userId, sql, params, expect) {
  try {
    await as(userId, sql, params);
    check(name, false, 'the database accepted it');
  } catch (err) {
    const message = reason(err);
    const matched = !expect || message.toLowerCase().includes(expect.toLowerCase());
    check(name, matched, matched ? '' : `rejected, but for the wrong reason: ${message}`);
  }
}

let fatal = null;

try {
  await db.exec(AUTH_STUB);
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
    ALICE,
    'alice@example.com',
    BOB,
    'bob@example.com',
  ]);

  const sql = await readFile(MIGRATION, 'utf8');
  try {
    await db.exec(sql);
    check('the migration runs against a real Postgres', true);
  } catch (err) {
    check('the migration runs against a real Postgres', false, reason(err));
    throw new Error('migration failed');
  }
  await db.exec(GRANTS);

  const { rows: tables } = await db.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  );
  // Counted from the migration rather than written down here. A hard-coded 14
  // made this a check that failed every time a table was legitimately added,
  // which trains the person running it to edit the number rather than look —
  // and a check people edit past is worse than no check.
  const declared = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]).sort();
  const built = tables.map((t) => t.tablename).sort();
  const missing = declared.filter((t) => !built.includes(t));
  check(
    'every table the migration declares exists in the database',
    missing.length === 0 && declared.length === built.length,
    missing.length ? `missing: ${missing.join(', ')}` : `${declared.length} declared, ${built.length} built`,
  );

  const { rows: unprotected } = await db.query(
    `select c.relname from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false`,
  );
  check(
    'row level security is on in the running database',
    unprotected.length === 0,
    unprotected.map((r) => r.relname).join(', '),
  );

  // ---- a person's writing is theirs alone

  await as(ALICE, `insert into public.profiles (id) values ($1)`, [ALICE]);
  const goalId = (
    await as(
      ALICE,
      `insert into public.goals (user_id, title, domain) values ($1, 'Half marathon', 'health') returning id`,
      [ALICE],
    )
  ).rows[0].id;

  const lineId = (
    await as(
      ALICE,
      `insert into public.goal_analyses (user_id, goal_id, kind, track, line, specificity, followup_shown)
       values ($1, $2, 'strategies', 'starter', 'Tuesday, Thursday, Saturday at 6:40, out the back door', 0.8, false)
       returning id`,
      [ALICE, goalId],
    )
  ).rows[0].id;

  await as(BOB, `insert into public.profiles (id) values ($1)`, [BOB]);

  const bobSees = await as(BOB, 'select id from public.goals');
  check("one person cannot read another's goals", bobSees.rows.length === 0, `${bobSees.rows.length} rows visible`);

  const bobSeesWriting = await as(BOB, 'select id from public.goal_analyses');
  check(
    "one person cannot read another's writing",
    bobSeesWriting.rows.length === 0,
    `${bobSeesWriting.rows.length} rows visible`,
  );

  const aliceSees = await as(ALICE, 'select id from public.goals');
  check('a person can read their own goals', aliceSees.rows.length === 1);

  await asRejects(
    "one person cannot write a row stamped with another's id",
    BOB,
    `insert into public.goals (user_id, title, domain) values ($1, 'Not mine to write', 'health')`,
    [ALICE],
    'policy',
  );

  // ---- a move must have a line the same person wrote, for the same goal

  const planId = (
    await as(
      ALICE,
      `insert into public.plans (user_id, goal_id, version, season_weeks, status)
       values ($1, $2, 1, 12, 'active') returning id`,
      [ALICE, goalId],
    )
  ).rows[0].id;

  const okMove = await as(
    ALICE,
    `insert into public.moves (user_id, goal_id, plan_id, title, effort, energy, status, source_line_id, "order")
     values ($1, $2, $3, 'Tuesday: out the back door', 'S', 'high', 'todo', $4, 0) returning id`,
    [ALICE, goalId, planId, lineId],
  );
  check('a move with the user own line behind it is accepted', okMove.rows.length === 1);

  await asRejects(
    'a move with no source line at all is refused',
    ALICE,
    `insert into public.moves (user_id, goal_id, plan_id, title, effort, energy, status, source_line_id, "order")
     values ($1, $2, $3, 'Invented by the app', 'S', 'high', 'todo', null, 1)`,
    [ALICE, goalId, planId],
    'does not exist',
  );

  await asRejects(
    'a move sourced from a line that does not exist is refused',
    ALICE,
    `insert into public.moves (user_id, goal_id, plan_id, title, effort, energy, status, source_line_id, "order")
     values ($1, $2, $3, 'Invented by the app', 'S', 'high', 'todo', gen_random_uuid(), 2)`,
    [ALICE, goalId, planId],
    'source_line_id',
  );

  const bobGoalId = (
    await as(
      BOB,
      `insert into public.goals (user_id, title, domain) values ($1, 'Learn guitar', 'craft') returning id`,
      [BOB],
    )
  ).rows[0].id;
  const bobPlanId = (
    await as(
      BOB,
      `insert into public.plans (user_id, goal_id, version, season_weeks, status)
       values ($1, $2, 1, 12, 'active') returning id`,
      [BOB, bobGoalId],
    )
  ).rows[0].id;
  const bobLineId = (
    await as(
      BOB,
      `insert into public.goal_analyses (user_id, goal_id, kind, track, line, specificity, followup_shown)
       values ($1, $2, 'strategies', 'starter', 'Ten minutes of scales after dinner', 0.6, false) returning id`,
      [BOB, bobGoalId],
    )
  ).rows[0].id;

  await asRejects(
    "a move sourced from someone else's line is refused",
    ALICE,
    `insert into public.moves (user_id, goal_id, plan_id, title, effort, energy, status, source_line_id, "order")
     values ($1, $2, $3, 'Borrowed from a stranger', 'S', 'high', 'todo', $4, 3)`,
    [ALICE, goalId, planId, bobLineId],
    'another person',
  );

  // A line of Alice's, but written for a different goal of hers.
  const otherGoalId = (
    await as(
      ALICE,
      `insert into public.goals (user_id, title, domain) values ($1, 'Sleep before midnight', 'mind') returning id`,
      [ALICE],
    )
  ).rows[0].id;
  await asRejects(
    "a move sourced from the user's line for a different goal is refused",
    ALICE,
    `insert into public.moves (user_id, goal_id, plan_id, title, effort, energy, status, source_line_id, "order")
     values ($1, $2, $3, 'Wrong goal entirely', 'S', 'high', 'todo', $4, 4)`,
    [ALICE, otherGoalId, planId, lineId],
    'goal',
  );

  await asRejects(
    "a move filed under someone else's plan is refused",
    ALICE,
    `insert into public.moves (user_id, goal_id, plan_id, title, effort, energy, status, source_line_id, "order")
     values ($1, $2, $3, 'Filed in a stranger plan', 'S', 'high', 'todo', $4, 5)`,
    [ALICE, goalId, bobPlanId, lineId],
    'another person',
  );

  const planned = await as(
    ALICE,
    `select count(*)::int as n from public.moves where plan_id = $1`,
    [planId],
  );
  // The whole reason plan_id exists: a plan's moves are reachable without
  // going through a nullable milestone.
  check('a plan can find its own moves', planned.rows[0].n === 1, `${planned.rows[0].n} moves`);

  // ---- writing is never rewritten

  const textId = (
    await as(
      ALICE,
      `insert into public.authoring_texts (user_id, kind, body, word_count, seconds_writing, mode, safety_risk)
       values ($1, 'ideal', 'It is 6:40 and the kitchen is still blue.', 9, 900, 'type', 'none') returning id`,
      [ALICE],
    )
  ).rows[0].id;

  await asRejects(
    'the words of a sitting cannot be rewritten',
    ALICE,
    `update public.authoring_texts set body = 'Something safer.' where id = $1`,
    [textId],
    'never rewritten',
  );

  // The shape the app actually writes: a 24-hour draft lock, still running.
  // The guard was only ever tested on a row with `sealed_until` null, which is
  // a row the product never stores, so the case that matters went unchecked.
  const lockedId = (
    await as(
      ALICE,
      `insert into public.authoring_texts (user_id, kind, body, word_count, seconds_writing, mode, safety_risk, sealed_until)
       values ($1, 'shadow', 'The alarm goes twice and I let it.', 8, 600, 'type', 'none', now() + interval '24 hours')
       returning id`,
      [ALICE],
    )
  ).rows[0].id;
  await asRejects(
    'a sitting inside its draft lock cannot be rewritten',
    ALICE,
    `update public.authoring_texts set body = 'Something safer.' where id = $1`,
    [lockedId],
    'never rewritten',
  );

  const expiredId = (
    await as(
      ALICE,
      `insert into public.authoring_texts (user_id, kind, body, word_count, seconds_writing, mode, safety_risk, sealed_until)
       values ($1, 'addition', 'And another thing.', 3, 120, 'type', 'none', now() - interval '48 hours')
       returning id`,
      [ALICE],
    )
  ).rows[0].id;
  await asRejects(
    'and it still cannot be rewritten after the lock expires',
    ALICE,
    `update public.authoring_texts set body = 'Something safer.' where id = $1`,
    [expiredId],
    'never rewritten',
  );

  const touched = await as(
    ALICE,
    `update public.authoring_texts set safety_risk = 'concern' where id = $1 returning id`,
    [textId],
  );
  check('everything else about a sitting can still change', touched.rows.length === 1);

  // ---- the authorship floor is computed here, not believed

  const bookId = (
    await as(ALICE, `insert into public.books (user_id, title) values ($1, 'A year of small mornings') returning id`, [
      ALICE,
    ])
  ).rows[0].id;

  const iWill = 'I will be out the back door before the kettle boils';
  const honest = {
    title: 'A year of small mornings',
    titleAuthored: true,
    ideal: 'It is 6:40 and the kitchen is still blue. I am out the back door before the kettle boils.',
    shadow: null,
    iWill,
    chapters: [
      {
        goalId,
        name: 'Half marathon',
        horizon: 'This season',
        lines: [{ kind: 'strategies', framingLabel: 'The way in', text: 'Tuesday, Thursday, Saturday at 6:40' }],
        memories: [],
      },
    ],
  };

  const good = await as(
    ALICE,
    `insert into public.book_versions (user_id, book_id, version, track, i_will, contents, authorship_ratio)
     values ($1, $2, 1, 'starter', $3, $4, 0.2) returning authorship_ratio`,
    [ALICE, bookId, iWill, JSON.stringify(honest)],
  );
  check('a Book of the user own words is accepted', good.rows.length === 1);
  check(
    'the stored ratio is the server figure, not the one the device sent',
    Number(good.rows[0].authorship_ratio) === 1,
    `stored ${good.rows[0].authorship_ratio} after sending 0.2`,
  );

  const poisoned = {
    ...honest,
    chapters: [
      {
        ...honest.chapters[0],
        lines: [
          {
            kind: 'strategies',
            framingLabel: 'The way in',
            text: 'Tuesday at 6:40',
            generated:
              'You have always been the kind of person who follows through, and this year that finally becomes visible to everyone around you. It was never really in doubt, and the people who know you best have been waiting for it.',
          },
        ],
      },
    ],
  };

  await asRejects(
    'a Book carrying prose the person did not write is refused',
    ALICE,
    `insert into public.book_versions (user_id, book_id, version, track, i_will, contents, authorship_ratio)
     values ($1, $2, 2, 'starter', $3, $4, 1.0)`,
    [ALICE, bookId, iWill, JSON.stringify(poisoned)],
    'own words',
  );

  const untyped = { ...honest, titleAuthored: false };
  const { rows: untypedRatio } = await db.query('select public.book_authorship_ratio($1::jsonb) as r', [
    JSON.stringify(untyped),
  ]);
  check(
    'a title the person did not type earns no authorship credit',
    Number(untypedRatio[0].r) === 1,
    `ratio ${untypedRatio[0].r}`,
  );

  const empty = { title: '', titleAuthored: true, ideal: '', shadow: null, iWill: '', chapters: [] };
  const { rows: emptyRatio } = await db.query('select public.book_authorship_ratio($1::jsonb) as r', [
    JSON.stringify(empty),
  ]);
  check('an empty Book does not divide by zero', Number(emptyRatio[0].r) === 1, `ratio ${emptyRatio[0].r}`);
} catch (err) {
  fatal = reason(err);
} finally {
  await db.close();
}

console.log('');
if (fatal && fatal !== 'migration failed') console.log(`stopped early: ${fatal}`);
console.log(
  failures || fatal
    ? `${failures} failed, ${passes} passed`
    : `${passes} checks passed against a real Postgres (PGlite, no Docker)`,
);
process.exit(failures || fatal ? 1 : 0);
