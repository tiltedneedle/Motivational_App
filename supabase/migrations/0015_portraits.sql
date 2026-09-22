-- The Portrait travels with the Book (the second sweep, 2026-09-22).
--
-- A goal's Portrait is built on the device from the person's own lines —
-- except the identity line, which the person may have written themselves
-- ("Not quite", and their own clause). It was not in the account's copy at
-- all: a Book brought back to a new phone had plans and no portraits, the
-- Goal page had no "See the portrait", and the line the person wrote was
-- gone. One row per goal, under the same policy as everything else of
-- theirs; the document is stored as it stands, and the app reads it back.

create table public.portraits (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text not null references public.goals on delete cascade,
  document jsonb not null,
  updated_at timestamptz not null default now(),
  unique (goal_id)
);

alter table public.portraits enable row level security;

create policy "own portraits" on public.portraits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger portraits_owner before insert or update on public.portraits
  for each row execute function public.check_parent_owner('goal_id', 'goals');
