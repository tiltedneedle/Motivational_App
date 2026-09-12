/**
 * The seeded store on the Full track: every stone carries a paragraph under
 * its line, the way the studied program asks (PRD §7.2), and the Book
 * prints them. For looking at the Goal, the stone and the Book when the
 * writing is the full dose.
 *
 *   node scripts/fixtures/full-track.mjs > scripts/fixtures/full-track.json
 *   SEED=scripts/fixtures/full-track.json node scripts/shots.mjs book goal stone reading
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(await readFile(join(here, 'seeded-state.json'), 'utf8'));
const s = seed.state;

const PARAGRAPHS = {
  motives:
    'I have said it out loud to Sam twice now, and the second time I heard myself. It is not about the race. It is about being somebody whose Tuesday morning is already decided the night before, so that the deciding does not eat the morning. The race is the date on the calendar that makes the mornings real.',
  impact:
    'Sam stops asking whether I am all right on the days I go quiet, because the run is the answer and it happened before breakfast. Mum gets a photo from the second bridge on Saturdays. The people at work get the version of me that has already done one hard thing today, which is a better colleague than the one that has not.',
  strategies:
    'Tuesday, Thursday and Saturday, 6:40, out the back door. Shoes by the door the night before, kit on the chair. The towpath as far as the second bridge and back, twenty-five minutes. If the morning is lost, the ten-minute version to the first bridge still counts, and it goes in the ledger as a run.',
  obstacles:
    'I stay up too late, and then 6:40 is a negotiation I lose. So the phone goes in the hall at ten, and the last thing I do is put the shoes by the door, which is a promise the morning can see. If it is raining I go anyway; the rain is not the obstacle, the deciding is.',
  monitoring:
    'One run in the ledger for each of the three days, any pace. On Sunday I look at the week: three is the week held, two is a quiet week and I say so, one is a week I look at properly. Three weeks of three and the second bridge becomes the third.',
};

s.profile.track = 'full';
for (const a of s.analyses) {
  a.track = 'full';
  a.paragraph = PARAGRAPHS[a.kind] ?? a.paragraph;
}
for (const b of s.books) {
  b.track = 'full';
  for (const c of b.chapters) {
    for (const l of c.lines) {
      l.paragraph = PARAGRAPHS[l.kind] ?? l.paragraph;
    }
  }
}

// The seed's dawn brief was written for the seed's day; this store makes its own.
s.briefs = [];

process.stdout.write(JSON.stringify(seed));
