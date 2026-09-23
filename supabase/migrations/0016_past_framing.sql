-- The framing on a Past event (the sweep, 2026-09-23).
--
-- "What it made of you" ends with a framing the person taps — "What I would
-- tell the person I was", and the rest — and the choice was thrown away on
-- Keep, so it never reached the store, let alone the account. It is kept on
-- the device now, and this is the column it travels in: their choice, like
-- every other framing in the product, which all travel.
--
-- Nullable, because every event written before today has none.
alter table public.past_events add column if not exists framing_id text;
