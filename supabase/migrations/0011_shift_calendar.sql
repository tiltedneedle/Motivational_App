-- The shift calendar (PRD §7.12), 2026-09-17.
--
-- The weekdays that keep other hours, and the hours they keep. On the
-- profile row like the other times; empty means every day is the same.

alter table public.profiles
  add column if not exists shift_days jsonb not null default '[]'::jsonb,
  add column if not exists shift_wake_time text not null default '13:00',
  add column if not exists shift_evening_time text not null default '23:00';
