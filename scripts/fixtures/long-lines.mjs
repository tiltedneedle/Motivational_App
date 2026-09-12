/**
 * The seeded store with everything a person writes made long: a forty-word
 * "I will", a goal named in a sentence, a move that runs to two lines, a
 * first sentence that is a paragraph. For looking at how the screens hold
 * when the writing does not fit the design's idea of it.
 *
 *   node scripts/fixtures/long-lines.mjs > scripts/fixtures/long-lines.json
 *   SEED=scripts/fixtures/long-lines.json node scripts/shots.mjs today wallpaper paywall book goal
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(await readFile(join(here, 'seeded-state.json'), 'utf8'));
const s = seed.state;

const IWILL =
  'I will be out of the back door before the kettle has boiled, with the left shoe laced first the way it always is, and the towpath run as far as the second bridge whatever the sky is doing that morning';
const TITLE = 'the kind of person who does the boring thing on the ordinary Tuesday without an audience';
const MOVE = 'Tuesday: at 6:40, out the back door and along the towpath as far as the second bridge, then the long way home past the bakery';
const FIRST =
  'It is 6:40 and the kitchen is still blue, and the kettle has not boiled, and the shoes are by the door where I left them last night because I knew I would not want to look for them.';

s.iWill = IWILL;
for (const b of s.books) {
  b.iWill = IWILL;
  b.firstSentence = FIRST;
  b.title = 'a year of the long way home past the bakery';
}
s.bookTitle = 'a year of the long way home past the bakery';
s.goals[0].title = TITLE;
s.goals[0].titleAuthored = true;
for (const p of s.plans) {
  for (const m of p.moves) {
    if (m.title.startsWith('Tuesday')) m.title = MOVE;
  }
}
for (const key of Object.keys(s.days)) {
  const d = s.days[key];
  if (d.note) d.note = `${d.note} ${FIRST}`;
}

// The seed's dawn brief was written for the seed's day; this store makes its own.
s.briefs = [];

process.stdout.write(JSON.stringify(seed));
