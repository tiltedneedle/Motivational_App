-- The Past volume's "done listing" flag (2026-09-15).
--
-- Whether the person has walked every period and said they are done. The app
-- keeps this beside the periods rather than deriving it from them, because a
-- period left empty on purpose is a real answer and "every period has
-- something" was never the test. It was the one piece of the Past volume that
-- did not travel with the account: a restore reopened a finished Past on the
-- walk and the chooser called it "Picked up". One fact per person, so it
-- lives on the profile, covered by the profile's own policy.

alter table public.profiles
  add column if not exists past_listed boolean not null default false;
