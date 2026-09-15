-- A ceiling on how often one caller can ask an AI function.
--
-- The read-back, the safety second opinion and the scenes answer to the
-- publishable key alone — there is no account wall (PRD 7.12) — and the key
-- ships in the app, so anyone holding it could spend the providers' quota.
-- An in-memory limiter in the functions was found to hold nothing: the edge
-- runtime gives every request its own execution. So the count lives here,
-- one row per caller, in fixed windows, behind a function only the service
-- role may call. The functions ask before they spend.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
-- Nobody reads or writes this through the API: RLS on, no policies, and
-- the service role (which the functions hold) goes past RLS by design.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_calls integer, p_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_cutoff timestamptz := now() - make_interval(secs => p_seconds);
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case when public.rate_limits.window_start < v_cutoff then 1 else public.rate_limits.count + 1 end,
        window_start = case when public.rate_limits.window_start < v_cutoff then now() else public.rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_calls;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- Old windows go with the nightly sweep (pg_cron where it exists; see 0002).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'morrow-rate-limit-prune';
    perform cron.schedule(
      'morrow-rate-limit-prune',
      '23 3 * * *',
      $job$ delete from public.rate_limits where window_start < now() - interval '1 day' $job$
    );
  end if;
end $$;
