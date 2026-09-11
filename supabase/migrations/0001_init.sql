-- Morrow, initial schema (PRD §10.3).
--
-- Two rules shape this file:
--   1. Row level security on every table, every policy keyed to auth.uid().
--      A user can only ever see their own writing.
--   2. The authorship rules are constraints, not conventions: a move without a
--      user line behind it cannot be inserted, and a sealed Book below the
--      authorship floor cannot be written.

create extension if not exists "pgcrypto";

-- Ids are text, not uuid. The app mints every id on the device ("goal_mtvy…")
-- so that writing works with the network off, and the server keeps those ids
-- as they are: a push is an upsert on the device's own id, and a new device
-- pulls back the same rows under the same names. The default is only for rows
-- made server-side, which today is none of them.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  persona text not null default 'gentle' check (persona in ('gentle','straight','fierce')),
  track text not null default 'starter' check (track in ('starter','full')),
  wake_time time not null default '07:00',
  evening_time time not null default '21:30',
  day_boundary_hour smallint not null default 3 check (day_boundary_hour between 0 and 6),
  -- PRD 7.3: the Sunday reading, at an hour the person picks.
  sunday_hour smallint not null default 9 check (sunday_hour between 0 and 23),
  -- PRD 8.7: the app's own reduced-motion switch, beside the OS one.
  reduced_motion boolean not null default false,
  timezone text not null default 'UTC',
  sound_on boolean not null default true,
  haptics_on boolean not null default true,
  consented_at timestamptz,
  -- Set by the billing webhook with the service role, never by the app: a
  -- client that could write this column could write itself a subscription.
  -- The trigger below refuses the change from any user session.
  entitlement text not null default 'free' check (entitlement in ('free','pro')),
  -- PRD 11.6: the concern band suggests professional support *once*. This is
  -- what makes it once across devices rather than once per install.
  support_offered_at timestamptz,
  -- PRD 7.13: the paywall moments already shown. "Once" has to mean once
  -- across devices, not once per install.
  paywall_seen jsonb not null default '[]'::jsonb,
  -- PRD 7.11: what "Fewer" has turned off, and the honest all-off state, kept
  -- apart so turning them back on restores what they had rather than defaults.
  muted_moments jsonb not null default '[]'::jsonb,
  notifications_off boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PRD 7.12: the soft delete. Stamped by the delete-account function; the
  -- sweep removes the auth user seven days later and everything cascades.
  -- Cleared by any push from a signed-in device inside the week.
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- goals

create table public.goals (
  id text primary key default gen_random_uuid()::text,
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
  -- Whether the person typed the title. The authorship ratio credits an
  -- authored title to them and a proposed one to nobody; without the flag a
  -- pulled goal reads as theirs, which credits the app's own words to them.
  title_authored boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index goals_user_rank on public.goals (user_id, rank);

-- ---------------------------------------------------------------- authoring

create table public.authoring_sessions (
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  session_id text references public.authoring_sessions on delete set null,
  kind text not null check (kind in ('ideal','shadow','addition','memory_start','memory_broke')),
  -- verbatim, never rewritten by the app or a model
  body text not null check (length(btrim(body)) > 0),
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
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text not null references public.goals on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
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
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  book_id text not null references public.books on delete cascade,
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
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text not null references public.goals on delete cascade,
  version int not null default 1,
  season_weeks int not null default 12,
  status text not null default 'active' check (status in ('active','superseded')),
  -- When each accepted replan was applied (PRD 13.3: one a month, free).
  replanned_at jsonb not null default '[]'::jsonb,
  model text,
  prompt_version text,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  plan_id text not null references public.plans on delete cascade,
  goal_id text not null references public.goals on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  -- the user's Monitoring line, verbatim
  proof text not null check (length(btrim(proof)) > 0),
  proof_source_line_id text references public.goal_analyses on delete set null,
  target_date date not null,
  "order" int not null default 0,
  reached_at timestamptz
);

create table public.moves (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text not null references public.goals on delete cascade,
  -- The plan this move belongs to. Not optional, and not reachable through the
  -- milestone: `milestone_id` is nullable, so a move without one had no path
  -- back to its plan at all, and the client model is `Plan.moves`. Syncing a
  -- plan would have silently dropped every move that had no milestone.
  plan_id text not null references public.plans on delete cascade,
  milestone_id text references public.milestones on delete set null,
  title text not null check (length(btrim(title)) > 0),
  effort text not null default 'M' check (effort in ('S','M','L')),
  energy text not null default 'low' check (energy in ('low','high')),
  if_then text,
  scheduled_for date,
  week int,
  status text not null default 'todo' check (status in ('todo','done','skip')),
  completed_at timestamptz,
  min_version text,
  -- Whether they took the smaller version today (the coach's "stuck" reply).
  doing_min_version boolean not null default false,
  -- NOT NULL on purpose: a move with no user line behind it is not a move
  source_line_id text not null references public.goal_analyses on delete cascade,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index moves_user_sched on public.moves (user_id, scheduled_for);
create index moves_plan on public.moves (plan_id, "order");

create table public.obstacle_plans (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text not null references public.goals on delete cascade,
  obstacle text not null check (length(btrim(obstacle)) > 0),
  response text not null check (length(btrim(response)) > 0),
  source_line_id text not null references public.goal_analyses on delete cascade
);

-- ---------------------------------------------------------------- the day

create table public.evidence (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text references public.goals on delete set null,
  -- The move this row is proof of, when it is one. Undo removes a move's own
  -- ledger row and no one else's; the client matched on the title and day
  -- before this existed, which deleted the wrong row whenever two moves shared
  -- a name on a day. `set null` rather than cascade: a deleted move does not
  -- unhappen the morning somebody did it.
  move_id text references public.moves on delete set null,
  kind text not null check (kind in ('move','practice','milestone','capture','seal')),
  text text not null check (length(btrim(text)) > 0),
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
  partial numeric(5,2) not null default 0 check (partial >= 0),
  evidence_count int not null default 0,
  sealed_at timestamptz,
  mood_word text,
  proof text,
  glad_of text,
  -- PRD 7.10, the morning intention: the move they pointed at in the dawn
  -- brief. Nothing scores against it; Today only says it back to them, and it
  -- is here so that survives a new device.
  intention_move_id text references public.moves on delete set null,
  primary key (user_id, day),
  -- The proof line typed at night is read back the next morning.
  safety_risk text not null default 'none' check (safety_risk in ('none','concern','crisis'))
);

-- ---------------------------------------------------------------- practices

-- PRD 7.5. A practice is built out of the person's own Strategies line, and
-- `source_line_id` says which one; a practice with nothing of theirs behind it
-- is the one thing the builder refuses to store.
create table public.practices (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text references public.goals on delete set null,
  kind text not null check (kind in ('routine','habit')),
  title text not null check (length(btrim(title)) > 0),
  steps jsonb not null default '[]'::jsonb,
  -- Required: every practice has a two-minute version (PRD 7.4's rule).
  min_version text not null check (length(btrim(min_version)) > 0),
  schedule jsonb not null,
  energy_slot text not null check (energy_slot in ('morning','midday','evening')),
  source_line_id text references public.goal_analyses on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index practices_user on public.practices (user_id);

-- What actually happened in a run, finished or abandoned. One row per practice
-- per day; the two-minute version is worth the whole thing (PRD 7.7).
create table public.practice_logs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  practice_id text not null references public.practices on delete cascade,
  day date not null,
  steps_done int not null default 0 check (steps_done >= 0),
  steps_total int not null default 0 check (steps_total >= steps_done),
  minimal boolean not null default false,
  completed_at timestamptz,
  unique (practice_id, day)
);
create index practice_logs_user_day on public.practice_logs (user_id, day);

-- ---------------------------------------------------------------- scenes

-- PRD 7.8. `sourced_detail` is a detail lifted from the person's own writing
-- and is required: a scene with no detail of their life in it is stock
-- footage, and the app shows its typographic card instead of storing one.
create table public.scenes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text not null references public.goals on delete cascade,
  type text not null check (type in ('practice','moment','tuesday','other_road')),
  image_prompt text not null default '',
  image_uri text,
  narrative text not null check (length(btrim(narrative)) > 0),
  sourced_detail text not null check (length(btrim(sourced_detail)) > 0),
  tone text check (tone in ('warmer','simpler','closer')),
  created_at timestamptz not null default now(),
  unique (goal_id, type)
);

-- ---------------------------------------------------------------- letters

-- PRD 7.8. `trigger` is the occasion key, unique per user, which is what stops
-- the same milestone producing a second letter after a sync or a re-reach.
create table public.letters (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  goal_id text references public.goals on delete set null,
  direction text not null check (direction in ('from_future','to_future')),
  body text not null check (length(btrim(body)) > 0),
  -- Every span here is a verbatim substring of the person's own writing,
  -- checked in `checkLetter` before the row is ever written.
  quotes jsonb not null default '[]'::jsonb,
  check (direction = 'to_future' or jsonb_array_length(quotes) > 0),
  trigger text not null,
  deliver_at date not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, trigger)
);
create index letters_user_deliver on public.letters (user_id, deliver_at);

create table public.briefs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  kind text not null check (kind in ('dawn','evening','weekly')),
  yesterday text not null default '',
  today text not null default '',
  if_then text not null default '',
  -- every brief must quote the user at least once (PRD §7.9)
  quoted_spans jsonb not null default '[]'::jsonb,
  first_move_id text references public.moves on delete set null,
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
alter table public.practices          enable row level security;
alter table public.practice_logs      enable row level security;
alter table public.scenes             enable row level security;
alter table public.letters            enable row level security;
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

create policy "own practices" on public.practices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own practice_logs" on public.practice_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own scenes" on public.scenes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own letters" on public.letters
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

-- The entitlement is the billing webhook's to set, with the service role.
-- A user session that changes it — through the app or the REST API with its
-- own JWT — is refused. The service role carries no request.jwt.claims, and
-- that absence is what lets it through.
create or replace function public.guard_entitlement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.entitlement is distinct from old.entitlement
     and coalesce(current_setting('request.jwt.claims', true), '') <> '' then
    raise exception 'profiles.entitlement is not the app''s to set';
  end if;
  return new;
end $$;

create trigger profiles_entitlement_guard before update on public.profiles
  for each row execute function public.guard_entitlement();

-- A row may only point at a parent that belongs to the same person.
--
-- Row level security answers "may Bob read or write this row"; it says nothing
-- about what the row points at. Bob's own practice_logs row is his to insert,
-- and nothing in the policy stopped it referencing Alice's practice — found by
-- running the migration against a real Postgres and trying exactly that. A
-- foreign key only checks the parent exists. This checks whose it is.
--
-- One function, parameterised by trigger arguments, rather than one per table:
-- the rule is the same everywhere and a copy per table is a copy that drifts.
create or replace function public.check_parent_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  col text := tg_argv[0];
  parent text := tg_argv[1];
  pid text;
  owner uuid;
begin
  pid := to_jsonb(new) ->> col;
  if pid is null then
    return new;
  end if;
  execute format('select user_id from public.%I where id = $1', parent) into owner using pid;
  if owner is null then
    raise exception '%.%: % does not exist', tg_table_name, col, pid;
  end if;
  if owner <> new.user_id then
    raise exception '%.%: belongs to another person', tg_table_name, col;
  end if;
  return new;
end $$;

-- Every column that points at something a person owns. `moves` is covered by
-- its own guard above, which also checks the goal matches.
create trigger authoring_texts_owner before insert or update on public.authoring_texts
  for each row execute function public.check_parent_owner('session_id', 'authoring_sessions');
create trigger goal_analyses_owner before insert or update on public.goal_analyses
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger book_versions_owner before insert or update on public.book_versions
  for each row execute function public.check_parent_owner('book_id', 'books');
create trigger plans_owner before insert or update on public.plans
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger milestones_plan_owner before insert or update on public.milestones
  for each row execute function public.check_parent_owner('plan_id', 'plans');
create trigger milestones_goal_owner before insert or update on public.milestones
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger milestones_proof_owner before insert or update on public.milestones
  for each row execute function public.check_parent_owner('proof_source_line_id', 'goal_analyses');
create trigger moves_milestone_owner before insert or update on public.moves
  for each row execute function public.check_parent_owner('milestone_id', 'milestones');
create trigger obstacle_plans_goal_owner before insert or update on public.obstacle_plans
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger obstacle_plans_line_owner before insert or update on public.obstacle_plans
  for each row execute function public.check_parent_owner('source_line_id', 'goal_analyses');
create trigger evidence_goal_owner before insert or update on public.evidence
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger evidence_move_owner before insert or update on public.evidence
  for each row execute function public.check_parent_owner('move_id', 'moves');
create trigger day_summaries_owner before insert or update on public.day_summaries
  for each row execute function public.check_parent_owner('intention_move_id', 'moves');
create trigger practices_goal_owner before insert or update on public.practices
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger practices_line_owner before insert or update on public.practices
  for each row execute function public.check_parent_owner('source_line_id', 'goal_analyses');
create trigger practice_logs_owner before insert or update on public.practice_logs
  for each row execute function public.check_parent_owner('practice_id', 'practices');
create trigger scenes_owner before insert or update on public.scenes
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger letters_owner before insert or update on public.letters
  for each row execute function public.check_parent_owner('goal_id', 'goals');
create trigger briefs_owner before insert or update on public.briefs
  for each row execute function public.check_parent_owner('first_move_id', 'moves');

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
