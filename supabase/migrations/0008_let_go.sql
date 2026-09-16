-- Day-90 re-authoring (PRD §7.3), 2026-09-16.
--
-- A goal let go "is archived with a line about what it taught, written
-- now". The status column already allowed 'archived'; nothing had ever set
-- it. The line is the person's own writing and lives on their goal row,
-- under the row's own policy, and travels into the next edition's first
-- page (book_versions.diff) at the seal. When, so the seal can tell a goal
-- let go this quarter from one let go last year.

alter table public.goals
  add column if not exists lesson text,
  add column if not exists let_go_at timestamptz;
