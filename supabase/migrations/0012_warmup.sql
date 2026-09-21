-- The first write (the rebuild, 2026-09-21).
--
-- Before the Interview and the fifteen minutes, a person writes two minutes
-- on one of the warm-up prompts. It is a text like every other — verbatim,
-- theirs, exportable — under its own kind, so the check that names the kinds
-- widens by one. The Book and the read-back never look for it.

alter table public.authoring_texts
  drop constraint if exists authoring_texts_kind_check,
  add constraint authoring_texts_kind_check
    check (kind in ('ideal','shadow','addition','memory_start','memory_broke','warmup'));

-- Set-up asks when they have a quiet moment. A preference, not a schedule.
alter table public.profiles
  add column if not exists write_when text not null default 'evening'
    check (write_when in ('morning','evening','any'));
