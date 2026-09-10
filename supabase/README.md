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
  - `book_versions.authorship_ratio` carries a `>= 0.95` check constraint, so a
    Book containing prose the user did not write cannot be stored at all.
  - `authoring_texts` cannot be rewritten once the 24-hour draft lock passes.
    It can be added to. The Fifteen is not something to tidy later into
    something safer.
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
