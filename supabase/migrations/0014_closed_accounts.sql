-- A closed account stays closed (the second sweep, 2026-09-22).
--
-- The soft delete (profiles.deleted_at) was cleared by every ordinary push:
-- the app wrote `deleted_at: null` on the profile row, and a push runs on
-- every launch and every backgrounding. So a second phone with an hour of
-- access token left, or a sign-in inside the week, quietly reopened an
-- account the person had closed, and the sweep never found it. The app no
-- longer sends the column; this refuses the un-delete from any user session
-- as well, so only the delete-account function (the service role, on the
-- person's own tap) can reopen one.

create or replace function public.guard_deleted_at() returns trigger
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
  if old.deleted_at is not null and new.deleted_at is null
     and role_name is not null
     and role_name <> 'service_role' then
    raise exception 'a closed account is reopened only by the person, through the app';
  end if;
  return new;
end $$;

drop trigger if exists guard_deleted_at on public.profiles;
create trigger guard_deleted_at before update on public.profiles
  for each row execute function public.guard_deleted_at();
