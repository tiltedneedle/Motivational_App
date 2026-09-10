-- Morrow, initial schema (PRD §10.3).
--
-- Two rules shape this file:
--   1. Row level security on every table, every policy keyed to auth.uid().
--      A user can only ever see their own writing.
--   2. The authorship rules are constraints, not conventions: a move without a
--      user line behind it cannot be inserted, and a sealed Book below the
--      authorship floor cannot be written.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  persona text not null default 'gentle' check (persona in ('gentle','straight','fierce')),
  track text not null default 'starter' check (track in ('starter','full')),
  wake_time time not null default '07:00',
  evening_time time not null default '21:30',
  day_boundary_hour smallint not null default 3 check (day_boundary_hour between 0 and 6),
  timezone text not null default 'UTC',
  sound_on boolean not null default true,
  haptics_on boolean not null default true,
  consented_at timestamptz,
  entitlement text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- goals

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  domain text not null check (domain in ('health','money','craft','mind','people','home','custom')),
  domain_label text,
  horizon text not null default 'No deadline',
  target_date date,
  status text not null default 'named'
    check (status in ('named','authored','active','paused','archived','completed')),
  rank int not null default 0,
  -- the span of the user's own writing this goal came from, if any
  source_span text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index goals_user_rank on public.goals (user_id, rank);

-- ---------------------------------------------------------------- authoring

create table public.authoring_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  volume text not null check (volume in ('future','bench','quarry')),
  track text not null check (track in ('starter','full')),
  sitting smallint not null check (sitting between 1 and 7),
  mode text not null default 'type' check (mode in ('type','say','walk')),
  seconds_writing int not null default 0,
  idle_nudges int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.authoring_texts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid references public.authoring_sessions on delete set null,
  kind text not null check (kind in ('ideal','shadow','addition','memory_start','memory_broke')),
  -- verbatim, never rewritten by the app or a model
  body text not null,
  word_count int not null default 0,
  seconds_writing int not null default 0,
  mode text not null default 'type',
  sealed_until timestamptz,
  -- the category only; never the words that triggered it
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index authoring_texts_user_kind on public.authoring_texts (user_id, kind);

create table public.goal_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  kind text not null check (kind in ('motives','impact','strategies','obstacles','monitoring')),
  track text not null default 'starter',
  framing_id text,
  -- the user's line. nothing counts until this exists, so it cannot be blank
  line text not null check (length(btrim(line)) > 0),
  line2 text,
  paragraph text,
  specificity real not null default 0,
  followup_shown boolean not null default false,
  written_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, kind)
);

-- ---------------------------------------------------------------- the Book

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default 'Untitled',
  current_version int not null default 1,
  first_sealed_at timestamptz not null default now()
);

create table public.book_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  book_id uuid not null references public.books on delete cascade,
  version int not null,
  track text not null,
  sealed_at timestamptz not null default now(),
  first_sentence text not null default '',
  i_will text not null check (length(btrim(i_will)) > 0),
  contents jsonb not null,
  diff jsonb,
  -- PRD §11.1: a Book below this floor contains prose the user did not write
  authorship_ratio real not null check (authorship_ratio >= 0.95),
  pdf_path text,
  lockscreen_path text,
  unique (book_id, version)
);

-- ---------------------------------------------------------------- the plan

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  version int not null default 1,
  season_weeks int not null default 12,
  status text not null default 'active' check (status in ('active','superseded')),
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan_id uuid not null references public.plans on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  title text not null,
  -- the user's Monitoring line, verbatim
  proof text not null check (length(btrim(proof)) > 0),
  proof_source_line_id uuid references public.goal_analyses on delete set null,
  target_date date not null,
  "order" int not null default 0,
  reached_at timestamptz
);

create table public.moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  milestone_id uuid references public.milestones on delete set null,
  title text not null,
  effort text not null default 'M' check (effort in ('S','M','L')),
  energy text not null default 'low' check (energy in ('low','high')),
  if_then text,
  scheduled_for date,
  week int,
  status text not null default 'todo' check (status in ('todo','done','skip')),
  completed_at timestamptz,
  min_version text,
  -- NOT NULL on purpose: a move with no user line behind it is not a move
  source_line_id uuid not null references public.goal_analyses on delete cascade,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index moves_user_sched on public.moves (user_id, scheduled_for);

create table public.obstacle_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  obstacle text not null,
  response text not null,
  source_line_id uuid not null references public.goal_analyses on delete cascade
);

-- ---------------------------------------------------------------- the day

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid references public.goals on delete set null,
  kind text not null check (kind in ('move','practice','milestone','capture','seal')),
  text text not null,
  day date not null,
  created_at timestamptz not null default now()
);
create index evidence_user_day on public.evidence (user_id, day);

create table public.day_summaries (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  planned int not null default 0,
  done int not null default 0,
  skipped int not null default 0,
  partial int not null default 0,
  evidence_count int not null default 0,
  sealed_at timestamptz,
  mood_word text,
  proof text,
  glad_of text,
  primary key (user_id, day)
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text not null check (kind in ('dawn','evening','weekly')),
  yesterday text not null default '',
  today text not null default '',
  if_then text not null default '',
  -- every brief must quote the user at least once (PRD §7.9)
  quoted_spans jsonb not null default '[]'::jsonb,
  first_move_id uuid references public.moves on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day, kind)
);

-- ---------------------------------------------------------------- rls

alter table public.profiles           enable row level security;
alter table public.goals              enable row level security;
alter table public.authoring_sessions enable row level security;
alter table public.authoring_texts    enable row level security;
alter table public.goal_analyses      enable row level security;
alter table public.books              enable row level security;
alter table public.book_versions      enable row level security;
alter table public.plans              enable row level security;
alter table public.milestones         enable row level security;
alter table public.moves              enable row level security;
alter table public.obstacle_plans     enable row level security;
alter table public.evidence           enable row level security;
alter table public.day_summaries      enable row level security;
alter table public.briefs             enable row level security;

-- profiles key on id; everything else on user_id.
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'goals','authoring_sessions','authoring_texts','goal_analyses','books','book_versions',
    'plans','milestones','moves','obstacle_plans','evidence','day_summaries','briefs'
  ] loop
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      'own ' || t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------- guards

-- A move must be sourced from a line the same user wrote, for the same goal.
create or replace function public.check_move_source() returns trigger
language plpgsql security definer set search_path = public as $$
declare src record;
begin
  select goal_id, user_id into src from public.goal_analyses where id = new.source_line_id;
  if src is null then
    raise exception 'move %: source_line_id does not exist', new.id;
  end if;
  if src.user_id <> new.user_id then
    raise exception 'move %: source line belongs to another person', new.id;
  end if;
  if src.goal_id <> new.goal_id then
    raise exception 'move %: source line belongs to a different goal', new.id;
  end if;
  return new;
end $$;

create trigger moves_source_guard
  before insert or update on public.moves
  for each row execute function public.check_move_source();

-- Writing is never rewritten. A sitting can be added to — that is a new row,
-- kind 'addition' — but the words themselves are fixed the moment they are
-- stored. The Fifteen is not something to tidy up later into something safer.
--
-- This used to compare `sealed_until < now()`, which is the moment the draft
-- lock EXPIRES, so the body was rewritable for the whole 24 hours it was
-- supposed to be protected and frozen only afterwards. Exactly backwards.
create or replace function public.protect_sealed_text() returns trigger
language plpgsql as $$
begin
  if new.body is distinct from old.body then
    raise exception 'this writing was stored on %; it can be added to, never rewritten', old.created_at;
  end if;
  return new;
end $$;

create trigger authoring_texts_immutable
  before update on public.authoring_texts
  for each row execute function public.protect_sealed_text();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();
create trigger analyses_touch before update on public.goal_analyses
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A new sign-up gets a profile row immediately, so the app never has to.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
