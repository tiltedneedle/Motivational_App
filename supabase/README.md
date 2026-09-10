# Morrow backend

Nothing here is required to run the app. The device carries a `LocalProvider`
and its own store, so the Interview, the Fifteen, the stones, the Book and Today
all work with the network off and with no account at all. This directory is what
turns that into something that survives a lost phone.

## What is here

- `migrations/0001_init.sql` — the schema, with row level security on every
  table and three guards that make the authorship rules structural rather than
  conventional:
  - `moves.source_line_id` is `NOT NULL`, and a trigger checks that the line
    belongs to the same person and the same goal. A move with nothing of the
    user's behind it cannot be inserted.
  - `book_versions.authorship_ratio` is **recomputed on the server** from the
    Book's own contents, by the same rule as `authorshipRatio` in the core
    package, and the stored figure is overwritten with the server's. Below 0.95
    the insert is refused. A check constraint on a number the device sent would
    only have proved the device can divide.
  - `authoring_texts.body` cannot be rewritten at all, ever. It can be added
    to — that is a new row of kind `addition`. The Fifteen is not something to
    tidy later into something safer. (An earlier version compared
    `sealed_until < now()` and so left the words editable for exactly the 24
    hours they were meant to be protected, and froze them afterwards.)
  - Row level security is on all 14 tables, with one policy each, written out
    per table rather than generated in a loop so they can be read without being
    run. `scripts/check-sql.mjs` asserts all of the above still holds.
- `functions/readback` — chooses phrases from the user's writing and verifies
  every one is a verbatim substring before returning it.
- `functions/safety` — the second opinion behind the on-device screen.
- `functions/scene` — the Envision narrative, refused unless it contains a
  detail from the user's own words.

## Running it

```bash
supabase start
supabase db reset
supabase functions serve
```

### It is tested, without Docker

`pnpm test:migration` runs this file against a real Postgres 18 — PGlite, which
is Postgres compiled to WebAssembly, so it needs no server and no Docker — and
then exercises every guard: row level security from one account against
another's, the move source trigger in all four of its failure modes, the
immutability of stored writing, and the authorship floor including the case
where the device lies about the ratio.

Two things Supabase provides that the test has to stub: the `auth` schema, and
the `authenticated` role. The second matters more than it looks. Postgres
exempts a table's owner from row level security, and PGlite connects as a
superuser who owns everything, so a harness that skips this reports every policy
working while testing nothing at all.

`pnpm test:sql` is the cheap half: structural assertions over the text, so a
guard cannot be quietly deleted in a refactor.

Set `ANTHROPIC_API_KEY` in the function environment. Without it, every function
returns a `degraded` response and the app quietly uses its local engines. That
path is exercised by the test suite rather than hoped for.

## Wiring the app to it

`apps/mobile/src/store.ts` builds its provider with `guarded(new LocalProvider())`.
Swap in the real one when the keys exist:

```ts
export const ai = guarded(new AnthropicProvider({ endpoint: EDGE_URL }), {
  fallback: new LocalProvider(),
  onViolation: (i) => analytics.capture('authorship_violation', i),
});
```

`guarded()` re-verifies everything the server already verified. That is
deliberate: the rule that a person writes their own life should not depend on
any single process being correct.
