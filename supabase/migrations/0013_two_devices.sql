-- Two devices on one account (the completeness pass, 2026-09-22).
--
-- The account is a copy of one device at a time. Which device, and when,
-- was not written anywhere, so a phone and a laptop signed into the same
-- account each pushed their own snapshot over the other's on every
-- backgrounding, and neither ever knew. The profile row now says who copied
-- last and when; a device whose last copy is older than that stops and asks
-- rather than pruning what the other one wrote.

alter table public.profiles
  add column if not exists pushed_at timestamptz,
  add column if not exists pushed_by text;

-- The entitlement guard keyed on the role in the claims, not on their
-- presence. PostgREST sets request.jwt.claims for every request that carries
-- a JWT, the service role's included, so the billing webhook this guard was
-- written to let through would have been refused. A direct connection with
-- no claims (the migration runner, the tests) still passes.
create or replace function public.guard_entitlement() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  claims text := coalesce(current_setting('request.jwt.claims', true), '');
  role_name text := null;
begin
  if claims <> '' then
    begin
      role_name := (claims::jsonb ->> 'role');
    exception when others then
      role_name := 'unknown';
    end;
  end if;
  if new.entitlement is distinct from old.entitlement
     and role_name is not null
     and role_name <> 'service_role' then
    raise exception 'profiles.entitlement is not the app''s to set';
  end if;
  return new;
end $$;
