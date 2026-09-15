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
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

// Every migration, in order — the same files `pnpm db:push` applies.
const MIGRATIONS_DIR = 'supabase/migrations';

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
-- The other two API roles a migration may name in a grant or a revoke.
create role anon nologin;
create role service_role nologin;
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
  // Supabase also exposes the whole JWT; the entitlement guard reads this one.
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: userId, role: 'authenticated' })]);
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

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  // Every file, concatenated, is what the checks below read for the declared
  // tables and policies.
  let sql = '';
  for (const file of files) {
    const one = await readFile(`${MIGRATIONS_DIR}/${file}`, 'utf8');
    sql += `
${one}`;
    try {
      await db.exec(one);
      check(`${file} runs against a real Postgres`, true);
    } catch (err) {
      check(`${file} runs against a real Postgres`, false, reason(err));
      throw new Error('migration failed');
    }
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

  // ---- practices (PRD 7.5): every routine has a two-minute version. Validated
  // in code by buildPractice, and here as well, because a row that arrives by
  // sync from an older build never went through buildPractice.
  await asRejects(
    'a practice with no two-minute version is refused by the database',
    ALICE,
    `insert into public.practices (user_id, goal_id, kind, title, min_version, schedule, energy_slot)
       values ($1, $2, 'routine', 'Ten minutes of scales', '   ', '{"type":"days","days":[1,3]}', 'evening')`,
    [ALICE, goalId],
    'check',
  );
  const practiceId = (
    await as(
      ALICE,
      `insert into public.practices (user_id, goal_id, kind, title, min_version, schedule, energy_slot)
         values ($1, $2, 'routine', 'Ten minutes of scales', 'Two minutes of scales', '{"type":"days","days":[1,3]}', 'evening')
       returning id`,
      [ALICE, goalId],
    )
  ).rows[0].id;
  check('a practice with one is kept', Boolean(practiceId));

  // Bob cannot see it, and cannot log against it.
  const { rows: bobsPractices } = await as(BOB, 'select id from public.practices', []);
  check("one person cannot see another's practices", bobsPractices.length === 0, `${bobsPractices.length} rows`);
  await asRejects(
    "and cannot log a run against another's practice",
    BOB,
    `insert into public.practice_logs (user_id, practice_id, day, steps_done, steps_total)
       values ($1, $2, '2026-09-11', 1, 3)`,
    [BOB, practiceId],
  );

  // A run of a practice is a ledger row that names the practice, in its own
  // column: Alice's row is kept, Bob's row naming Alice's practice is not.
  await as(
    ALICE,
    `insert into public.evidence (user_id, goal_id, practice_id, kind, text, day)
       values ($1, $2, $3, 'practice', 'Out the door', '2026-09-11')`,
    [ALICE, goalId, practiceId],
  );
  check('a practice run lands in the ledger naming its practice', true);
  await asRejects(
    "and a run cannot name another person's practice",
    BOB,
    `insert into public.evidence (user_id, practice_id, kind, text, day)
       values ($1, $2, 'practice', 'Out the door', '2026-09-11')`,
    [BOB, practiceId],
    'another person',
  );

  // A milestone before the person has written how they will know: no proof,
  // and the row is still allowed. An empty string is not.
  await as(
    ALICE,
    `insert into public.milestones (user_id, plan_id, goal_id, title, proof, target_date, "order")
       values ($1, $2, $3, 'First two weeks', null, '2026-09-24', 5)`,
    [ALICE, planId, goalId],
  );
  check('a milestone may wait for its proof', true);
  await asRejects(
    'but an empty proof is refused',
    ALICE,
    `insert into public.milestones (user_id, plan_id, goal_id, title, proof, target_date, "order")
       values ($1, $2, $3, 'First two weeks', '  ', '2026-09-24', 6)`,
    [ALICE, planId, goalId],
    'check',
  );

  // ---- the same guard on a different table, through the same function. One
  // parameterised trigger covers every parent pointer; if it only worked on the
  // first table it was tried on, this is where that would show.
  await asRejects(
    "one person cannot file evidence against another's move",
    BOB,
    `insert into public.evidence (user_id, goal_id, move_id, kind, text, day)
       values ($1, null, $2, 'move', 'Did it', '2026-09-11')`,
    [BOB, okMove.rows[0].id],
    'another person',
  );
  await asRejects(
    "nor point a letter at another's goal",
    BOB,
    `insert into public.letters (user_id, goal_id, direction, body, trigger, deliver_at)
       values ($1, $2, 'to_future', 'To me', 'self:2026-12-01', '2026-12-01')`,
    [BOB, goalId],
    'another person',
  );

  // ---- the entitlement is not the app's to set (PRD 13.3)
  await asRejects(
    'a user session cannot give itself Pro',
    ALICE,
    `update public.profiles set entitlement = 'pro' where id = $1`,
    [ALICE],
    "not the app's to set",
  );
  await as(ALICE, `update public.profiles set display_name = 'Alice' where id = $1`, [ALICE]);
  check('but can still change the rest of the profile', true);
  // The service role carries no JWT claims; that is what lets it through.
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', '', false)`);
  await db.query(`update public.profiles set entitlement = 'pro' where id = $1`, [ALICE]);
  const entitled = await as(ALICE, `select entitlement from public.profiles where id = $1`, [ALICE]);
  check('the billing webhook can', entitled.rows[0]?.entitlement === 'pro');

  // ---- scenes (PRD 7.8): no sourced detail, no scene.
  await asRejects(
    'a scene with no detail of theirs in it is refused',
    ALICE,
    `insert into public.scenes (user_id, goal_id, type, narrative, sourced_detail)
       values ($1, $2, 'practice', 'An ordinary morning.', '')`,
    [ALICE, goalId],
    'check',
  );

  // ---- the two new volumes (0004): one person's past is not another's
  await db.exec('reset role');
  await db.query(
    `insert into public.past_epochs (id, user_id, label, from_age, to_age) values ($1, $2, 'School', 6, 12)`,
    ['ep-a', ALICE],
  );
  await asRejects(
    'nobody can read another person’s past',
    BOB,
    'select * from public.past_epochs where id = $1',
    ['ep-a'],
    'empty',
  );
  await asRejects(
    'nor hang an event on it',
    BOB,
    `insert into public.past_events (id, user_id, epoch_id, title, weight) values ('ev-x', $1, 'ep-a', 'x', 'helped')`,
    [BOB],
    'not yours',
  );
  await db.exec('reset role');
  await mustReject(
    db,
    'an event must be one that helped or one that hurt, never a third thing',
    `insert into public.past_events (id, user_id, epoch_id, title, weight) values ('ev-y', $1, 'ep-a', 'x', 'neutral')`,
    [ALICE],
    'check',
  );
  await mustReject(
    db,
    'a pick must say which half of the Present it belongs to',
    `insert into public.present_picks (id, user_id, half, card_id, story_line) values ('pp-x', $1, 'both', 'f-a', 'a line')`,
    [ALICE],
    'check',
  );
  await mustReject(
    db,
    'a pick cannot be stored without the line they wrote',
    `insert into public.present_picks (id, user_id, half, card_id, story_line) values ('pp-y', $1, 'faults', 'f-a', '   ')`,
    [ALICE],
    'check',
  );
  {
    await db.query(
      `insert into public.present_picks (id, user_id, half, card_id, story_line) values ('pp-ok', $1, 'faults', 'f-a', 'the week it cost me')`,
      [ALICE],
    );
    const row = await db.query(`select joins_book from public.past_events where id = 'ev-a'`).catch(() => null);
    void row;
    await db.query(
      `insert into public.past_events (id, user_id, epoch_id, title, weight) values ('ev-a', $1, 'ep-a', 'the move', 'hurt')`,
      [ALICE],
    );
    const kept = await db.query(`select joins_book from public.past_events where id = 'ev-a'`);
    check('an event stays out of the Book until the person says otherwise', kept.rows[0].joins_book === false);
  }

  // ---- the ceiling on the AI functions (0003): counted here, not in a worker's memory
  await db.exec('reset role');
  const hits = [];
  for (let i = 0; i < 4; i += 1) {
    const r = await db.query('select public.rate_limit_hit($1, 3, 600) as ok', ['ip:test']);
    hits.push(r.rows[0].ok);
  }
  check('three calls pass and the fourth is refused', hits.join(',') === 'true,true,true,false', hits.join(','));
  // A window that has run out starts again: the row is aged by hand.
  await db.query(`update public.rate_limits set window_start = now() - interval '11 minutes' where key = $1`, ['ip:test']);
  const again = await db.query('select public.rate_limit_hit($1, 3, 600) as ok', ['ip:test']);
  check('and a new window opens once the old one has run out', again.rows[0].ok === true);
  check('another caller has its own count', (await db.query('select public.rate_limit_hit($1, 3, 600) as ok', ['user:someone'])).rows[0].ok === true);
  // Nobody reaches the table or the function through the API roles.
  // The API roles are granted the table like every other (Supabase's default
  // privileges do the same); RLS with no policy is what keeps it empty for them.
  const peek = await as(ALICE, 'select * from public.rate_limits', []);
  check('a signed-in person reads no counts', peek.rows.length === 0, `${peek.rows.length} rows`);
  await asRejects('nor call the counter', ALICE, "select public.rate_limit_hit('x', 1, 1)", [], 'permission denied');
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
