-- The Past and Present volumes (PRD §7.15, §7.16, revised 2026-09-15).
--
-- The Future volume's tables came first because it shipped first. These are
-- its two siblings, and they follow every rule that file set: one row per
-- thing the person wrote, RLS on with a policy written out by hand, the owner
-- checked against the parent row by trigger, and `updated_at` touched so the
-- sync can tell which side is newer.
--
-- Nothing here stores a trait, a factor or a score. A card is referenced by
-- its id, which resolves to a sentence held in the app; what the person wrote
-- about it is the only free text.

-- ------------------------------------------------------------ Present

create table public.present_picks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  -- Which half of the volume: what gets in the way, or what you are good at.
  half text not null check (half in ('faults','virtues')),
  -- The card in the app's deck. Not a trait id: a sentence id.
  card_id text not null,
  -- A time it cost, or a time it mattered. Theirs, and required.
  story_line text not null check (length(btrim(story_line)) > 0),
  -- The fault's answer ("what I do instead") or the virtue's use next week.
  apply_line text not null default '',
  -- The earliest sign they tapped; becomes the If of the if-then.
  framing_id text,
  -- The goal this pairs with, once one exists. Null until then, and null again
  -- if that goal is deleted: a pick outlives the goal it was once about.
  goal_id text references public.goals on delete set null,
  rank integer not null default 0,
  -- These are sentences about a person's own life; the same screen that reads
  -- a sitting reads these, and a flagged line never reaches the Book.
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis')),
  written_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, half, card_id)
);

-- ------------------------------------------------------------ Past

create table public.past_epochs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  -- What the person calls this period. Cut from their age, then renameable.
  label text not null check (length(btrim(label)) > 0),
  from_age integer not null check (from_age >= 0 and from_age <= 120),
  to_age integer not null check (to_age >= 0 and to_age <= 120),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_age >= from_age)
);

create table public.past_events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  epoch_id text not null references public.past_epochs on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  -- One that helped or one that hurt. Never "good" and "bad".
  weight text not null check (weight in ('helped','hurt')),
  -- Chosen for the third move: what it made of you.
  analysed boolean not null default false,
  -- The three boxes, written only once it is chosen.
  what_happened text not null default '',
  shaped_me text not null default '',
  still_believe text not null default '',
  -- Their choice, per event. Nothing is quoted anywhere else without it, and
  -- the default is out rather than in.
  joins_book boolean not null default false,
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------ the boundary

alter table public.present_picks enable row level security;
alter table public.past_epochs   enable row level security;
alter table public.past_events   enable row level security;

create policy "own present_picks" on public.present_picks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own past_epochs" on public.past_epochs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own past_events" on public.past_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A row may only point at a parent its owner owns.
create trigger present_picks_owner before insert or update on public.present_picks
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger past_events_owner before insert or update on public.past_events
  for each row execute function public.check_parent_owner('epoch_id', 'past_epochs');

create trigger present_picks_touch before update on public.present_picks
  for each row execute function public.touch_updated_at();
create trigger past_epochs_touch before update on public.past_epochs
  for each row execute function public.touch_updated_at();
create trigger past_events_touch before update on public.past_events
  for each row execute function public.touch_updated_at();

create index present_picks_user on public.present_picks (user_id, half);
create index past_epochs_user on public.past_epochs (user_id, position);
create index past_events_epoch on public.past_events (epoch_id, position);
