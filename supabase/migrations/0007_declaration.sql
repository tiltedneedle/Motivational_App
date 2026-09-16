-- The Declaration (PRD §7.17), 2026-09-16.
--
-- One named witness, by the name the person calls them, and when the
-- Declaration was first made. The product's only social surface: the witness
-- gets the image and, when the person chooses, their sealed days — through
-- whatever the person already uses to reach them, never through Morrow's
-- servers. So there is no witness table, no invitation, no feed: two columns
-- on the person's own profile row, under the profile's own policy.

alter table public.profiles
  add column if not exists witness_name text not null default '',
  add column if not exists declared_at timestamptz;
