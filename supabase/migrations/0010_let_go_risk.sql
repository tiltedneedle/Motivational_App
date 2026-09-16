-- After the review of 0008 and 0009 (2026-09-17).
--
-- The line written on letting a goal go is free text like every other, so
-- it carries the safety screen's word the way the stones and the seals do;
-- and it is never blank, the way every other free-text column is never
-- blank. memory_profiles keeps updated_at moving like every other table
-- with that column.

alter table public.goals
  add column if not exists lesson_risk text check (lesson_risk in ('none','concern','crisis')),
  add constraint goals_lesson_not_blank check (lesson is null or length(btrim(lesson)) > 0);

create trigger memory_profiles_touch before update on public.memory_profiles
  for each row execute function public.touch_updated_at();
