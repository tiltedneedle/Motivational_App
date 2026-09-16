-- What Morrow knows about me (PRD §7.9, §7.12), 2026-09-17.
--
-- The memory profile is rebuilt from the person's own material on the
-- device; what travels is what they changed about it — a line in their own
-- words, or a line forgotten — and the document as it last stood, for a
-- coach behind a model. One row per person, under the same policy as
-- everything else of theirs.

create table public.memory_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  edits jsonb not null default '[]'::jsonb,
  document text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.memory_profiles enable row level security;

create policy "own memory" on public.memory_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
