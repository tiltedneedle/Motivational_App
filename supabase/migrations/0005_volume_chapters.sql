-- The Past and Present volumes in the Book, and in the authorship guard.
--
-- A sealed Book carries the person's writing, and the server recomputes what
-- share of it is theirs rather than trusting the number the client sends
-- (0001, book_authorship_ratio). Both new volumes put prose in the Book, so
-- the walk has to count them — otherwise a Book with a Present chapter in it
-- would be measured as if that chapter were not there.
--
-- What counts as theirs: the two lines under each pick, and the three boxes
-- under each analysed event. What counts as neither: the card's sentence and
-- the framing labels, which come from a fixed bank, are the same for everyone,
-- and are printed as headings. The client's engines/book.ts counts exactly
-- this set; the two must agree or a Book will disagree with its own row.
create or replace function public.book_authorship_ratio(contents jsonb) returns real
language plpgsql immutable as $$
declare
  chapter jsonb;
  line jsonb;
  entry jsonb;
  user_chars bigint := 0;
  generated_chars bigint := 0;
begin
  user_chars := user_chars
    + coalesce(length(contents ->> 'ideal'), 0)
    + coalesce(length(contents ->> 'shadow'), 0)
    + coalesce(length(contents ->> 'iWill'), 0);

  -- A title the person typed counts; "Untitled" and a tapped framing do not.
  if coalesce((contents ->> 'titleAuthored')::boolean, true) then
    user_chars := user_chars + coalesce(length(contents ->> 'title'), 0);
  end if;

  for chapter in select * from jsonb_array_elements(coalesce(contents -> 'chapters', '[]'::jsonb)) loop
    if coalesce((chapter ->> 'nameAuthored')::boolean, true) then
      user_chars := user_chars + coalesce(length(chapter ->> 'name'), 0);
    end if;

    for line in select * from jsonb_array_elements(coalesce(chapter -> 'lines', '[]'::jsonb)) loop
      user_chars := user_chars
        + coalesce(length(line ->> 'text'), 0)
        + coalesce(length(line ->> 'text2'), 0);
      generated_chars := generated_chars + coalesce(length(line ->> 'generated'), 0);
    end loop;

    for line in select * from jsonb_array_elements(coalesce(chapter -> 'memories', '[]'::jsonb)) loop
      user_chars := user_chars + coalesce(length(line #>> '{}'), 0);
    end loop;
  end loop;

  -- The Present volume: the two lines under each pick. The card's own sentence
  -- is the app's words and is not counted either way.
  for entry in select * from jsonb_array_elements(coalesce(contents #> '{volumes,present,entries}', '[]'::jsonb)) loop
    user_chars := user_chars
      + coalesce(length(entry ->> 'story'), 0)
      + coalesce(length(entry ->> 'apply'), 0);
  end loop;

  -- The Past volume: the three boxes under each analysed event, and the title
  -- the person gave it.
  for entry in select * from jsonb_array_elements(coalesce(contents #> '{volumes,past,entries}', '[]'::jsonb)) loop
    user_chars := user_chars
      + coalesce(length(entry ->> 'title'), 0)
      + coalesce(length(entry ->> 'whatHappened'), 0)
      + coalesce(length(entry ->> 'shapedMe'), 0)
      + coalesce(length(entry ->> 'stillBelieve'), 0);
  end loop;

  if user_chars + generated_chars = 0 then
    return 1.0;
  end if;
  return user_chars::real / (user_chars + generated_chars)::real;
end $$;
