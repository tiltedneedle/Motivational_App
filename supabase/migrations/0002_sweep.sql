-- The seven-day promise, on the database's own clock.
--
-- PRD 7.12: a closed account and its copy are gone within seven days. The
-- delete-account function stamps profiles.deleted_at and runs a sweep of
-- anyone past the grace period — but only when it is called, so on a quiet
-- project a closed account could outlive its week. This schedules the same
-- sweep nightly with pg_cron, which Supabase ships; deleting the auth user
-- cascades through profiles and every table under it.
--
-- Guarded: on a Postgres without pg_cron (the PGlite the migration test runs
-- on) nothing is created and nothing fails. The function's own sweep stays,
-- so the two never disagree about what "past the grace period" means.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- Idempotent: a second push of this file replaces the job rather than
    -- adding a twin.
    perform cron.unschedule(jobid) from cron.job where jobname = 'morrow-hard-delete';
    perform cron.schedule(
      'morrow-hard-delete',
      '17 3 * * *',
      $job$
        delete from auth.users
        where id in (
          select id from public.profiles
          where deleted_at is not null and deleted_at < now() - interval '7 days'
        )
      $job$
    );
  end if;
end $$;
