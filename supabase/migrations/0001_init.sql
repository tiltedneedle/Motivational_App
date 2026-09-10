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
  -- PRD 11.6: the concern band suggests professional support *once*. This is
  -- what makes it once across devices rather than once per install.
  support_offered_at timestamptz,
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
,
  -- The stones are free text, and the Obstacles stone asks what gets in the
  -- way, which is where the worst sentence of somebody's week can land. A
  -- flagged line is never read back or sealed into the Book.
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis')));

-- ---------------------------------------------------------------- the Book

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null default 'Untitled',
  -- The fixed words in front of the title ("The one where I"). App chrome, so
  -- it is stored apart from the title and never counted as the person's prose
  -- by book_authorship_ratio.
  title_framing text,
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
  -- PRD §11.1: a Book below this floor contains prose the user did not write.
  -- The constraint is a backstop; the number itself is recomputed from
  -- `contents` by book_versions_authorship_guard below, because a floor applied
  -- to a figure the client chose only checks that the client can do division.
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
  -- The plan this move belongs to. Not optional, and not reachable through the
  -- milestone: `milestone_id` is nullable, so a move without one had no path
  -- back to its plan at all, and the client model is `Plan.moves`. Syncing a
  -- plan would have silently dropped every move that had no milestone.
  plan_id uuid not null references public.plans on delete cascade,
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
create index moves_plan on public.moves (plan_id, "order");

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
  -- The move this row is proof of, when it is one. Undo removes a move's own
  -- ledger row and no one else's; the client matched on the title and day
  -- before this existed, which deleted the wrong row whenever two moves shared
  -- a name on a day. `set null` rather than cascade: a deleted move does not
  -- unhappen the morning somebody did it.
  move_id uuid references public.moves on delete set null,
  kind text not null check (kind in ('move','practice','milestone','capture','seal')),
  text text not null,
  day date not null,
  -- The safety verdict on this text. Free-text rows are quoted back in the dawn
  -- brief and the ledger, and a flagged one never is.
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis')),
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
  -- PRD 7.10, the morning intention: the move they pointed at in the dawn
  -- brief. Nothing scores against it; Today only says it back to them, and it
  -- is here so that survives a new device.
  intention_move_id uuid references public.moves on delete set null,
  primary key (user_id, day),
  -- The proof line typed at night is read back the next morning.
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis'))
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
  -- The one-time support line, and whether the brief was written in the
  -- concern band at all. Kept on the row rather than recomputed, because the
  -- register a person was actually spoken to in that morning is a fact about
  -- that morning, not something to re-derive later from data that has moved on.
  support text,
  soften boolean not null default false,
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

-- Written out one per table rather than generated in a loop. These policies
-- are the whole boundary between one person's writing and another's, and a
-- reviewer has to be able to read them without running them. Built with
-- dynamic SQL they were invisible to every tool that reads this file, which
-- is a poor property for the only thing standing between two strangers'
-- private diaries.

create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own authoring_sessions" on public.authoring_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own authoring_texts" on public.authoring_texts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own goal_analyses" on public.goal_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own books" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own book_versions" on public.book_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own plans" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own milestones" on public.milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own moves" on public.moves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own obstacle_plans" on public.obstacle_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own evidence" on public.evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own day_summaries" on public.day_summaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own briefs" on public.briefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- guards

-- A move must be sourced from a line the same user wrote, for the same goal.
create or replace function public.check_move_source() returns trigger
language plpgsql security definer set search_path = public as $$
declare src record; plan record;
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

  -- The plan has to answer the same two questions the line does.
  select goal_id, user_id into plan from public.plans where id = new.plan_id;
  if plan is null then
    raise exception 'move %: plan_id does not exist', new.id;
  end if;
  if plan.user_id <> new.user_id then
    raise exception 'move %: plan belongs to another person', new.id;
  end if;
  if plan.goal_id <> new.goal_id then
    raise exception 'move %: plan was made for a different goal', new.id;
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

-- The authorship floor, recomputed here rather than believed.
--
-- `authorship_ratio` arrives from the device, and a check constraint on a
-- number the client chose is not a guard: anything that could put prose the
-- person did not write into a Book could also send 1.0 alongside it. The Book's
-- contents are in this row, so the server can do the arithmetic itself.
--
-- Same rule as `authorshipRatio` in packages/core/src/engines/book.ts, and the
-- two are meant to agree: the user's own writing over their writing plus any
-- prose about their life they did not write. Framing labels and bank-supplied
-- names count as neither, being chrome that is identical for every person.
create or replace function public.book_authorship_ratio(contents jsonb) returns real
language plpgsql immutable as $$
declare
  chapter jsonb;
  line jsonb;
  user_chars bigint := 0;
  generated_chars bigint := 0;
begin
  user_chars := user_chars
    + coalesce(length(contents ->> 'ideal'), 0)
    + coalesce(length(contents ->> 'shadow'), 0)
    + coalesce(length(contents ->> 'iWill'), 0);

  -- A title the person typed counts; "Untitled" and a tapped framing do not.
  if coalesce((contents ->> 'titleAuthored')::boolean, true) then
    user_chars := user_chars + coalesce(length(contents ->> 'title'), 0);
  end if;

  for chapter in select * from jsonb_array_elements(coalesce(contents -> 'chapters', '[]'::jsonb)) loop
    if coalesce((chapter ->> 'nameAuthored')::boolean, true) then
      user_chars := user_chars + coalesce(length(chapter ->> 'name'), 0);
    end if;

    for line in select * from jsonb_array_elements(coalesce(chapter -> 'lines', '[]'::jsonb)) loop
      user_chars := user_chars
        + coalesce(length(line ->> 'text'), 0)
        + coalesce(length(line ->> 'text2'), 0);
      generated_chars := generated_chars + coalesce(length(line ->> 'generated'), 0);
    end loop;

    for line in select * from jsonb_array_elements(coalesce(chapter -> 'memories', '[]'::jsonb)) loop
      user_chars := user_chars + coalesce(length(line #>> '{}'), 0);
    end loop;
  end loop;

  if user_chars + generated_chars = 0 then
    return 1.0;
  end if;
  return user_chars::real / (user_chars + generated_chars)::real;
end $$;

create or replace function public.check_book_authorship() returns trigger
language plpgsql as $$
declare
  actual real;
begin
  actual := public.book_authorship_ratio(new.contents);

  if actual < 0.95 then
    raise exception
      'this Book is % percent the writer''s own words; below 95 it contains prose they did not write',
      round(actual::numeric * 100, 1);
  end if;

  -- The stored number is always the one the server worked out, so a Book can
  -- never claim an authorship it does not have.
  new.authorship_ratio := actual;
  return new;
end $$;

create trigger book_versions_authorship_guard
  before insert or update on public.book_versions
  for each row execute function public.check_book_authorship();

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
