/**
 * The filled store: the seeded one with all three volumes written.
 *
 * For the screenshots that show the product finished — the chooser with three
 * "Written" marks, the Present and Past closing screens with their lines, a
 * second edition of the Book carrying "What I am like" and "Where I came
 * from". Derived from `seeded-state.json`, so the Future half is the one
 * every check runs against; the Present and Past are added here in the
 * shape the store writes them, and the second edition is what `sealBook`
 * would have built from them.
 *
 *   node scripts/fixtures/filled.mjs   → scripts/fixtures/filled.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(readFileSync(join(HERE, 'seeded-state.json'), 'utf8'));
const s = seed.state;
const at = '2026-09-14T20:10:00.000Z';
const goal = s.goals[0];

s.profile.displayName = 'Sam';

// ---- Present: three faults, three virtues, every one written
const faults = [
  ['f-start-and-drift', 'fs-night-before', 'The half-marathon plan. Three weeks of it, then the spreadsheet went quiet.', 'Put the next run in the calendar the night before, with the shoes by the door.'],
  ['f-night-before', 'fs-night-before', 'The talk for work. I wrote it at midnight and it showed.', 'Twenty minutes on the morning it lands, before anything else opens.'],
  ['f-promise-and-forget', 'fs-someone-asks', "Told Sam I'd fix the gate in March. It is September.", 'Say the day out loud when I promise, and write it where they can see.'],
];
const virtues = [
  ['v-dr-boring', 'The winter I did the same four exercises every morning and my back stopped hurting.', 'On Tuesday I use this to run the slow loop when the fast one is tempting.'],
  ['v-dr-unwatched', 'Nobody checked the early shifts and I did them anyway.', 'On the mornings nobody is awake, out the door before I decide.'],
  ['v-dr-return', 'The race I walked the last mile of. I ran the next weekend.', 'On the day after a bad one, back out, shorter, same time.'],
];
s.presentPicks = [
  ...faults.map(([cardId, framingId, storyLine, applyLine], i) => ({
    id: `pp_fill_f${i}`,
    half: 'faults',
    cardId,
    storyLine,
    applyLine,
    framingId,
    goalId: null,
    rank: i,
    safetyRisk: 'none',
    writtenAt: at,
  })),
  ...virtues.map(([cardId, storyLine, applyLine], i) => ({
    id: `pp_fill_v${i}`,
    half: 'virtues',
    cardId,
    storyLine,
    applyLine,
    framingId: null,
    goalId: goal.id,
    rank: i,
    safetyRisk: 'none',
    writtenAt: at,
  })),
];
s.presentDraft = null;

// ---- Past: four periods at 34, five events, three gone into, two in the Book
s.pastEpochs = [
  { id: 'ep-early', label: 'Before school', fromAge: 0, toAge: 5, position: 0, createdAt: at },
  { id: 'ep-school', label: 'The house with the green door', fromAge: 6, toAge: 12, position: 1, createdAt: at },
  { id: 'ep-teens', label: 'The teenage years', fromAge: 13, toAge: 18, position: 2, createdAt: at },
  { id: 'ep-19-34', label: '19 to now', fromAge: 19, toAge: 34, position: 3, createdAt: at },
];
const ev = (id, epochId, title, weight, position, analysed, joinsBook, three) => ({
  id,
  epochId,
  title,
  weight,
  analysed,
  whatHappened: three?.[0] ?? '',
  shapedMe: three?.[1] ?? '',
  stillBelieve: three?.[2] ?? '',
  joinsBook,
  safetyRisk: 'none',
  position,
  createdAt: at,
});
s.pastEvents = [
  ev('pe_fill_1', 'ep-early', 'my grandmother teaching me to swim', 'helped', 0, false, false),
  ev('pe_fill_2', 'ep-school', 'changing school mid-term', 'hurt', 0, true, true, [
    'It happened in the spring and nobody explained it. New uniform, a class that had already made its friends, a teacher who called me by the wrong name for a month.',
    'I make friends slowly and I keep them. I pack lightly. I notice the new person in a room before anyone else does.',
    'Starting again is survivable.',
  ]),
  ev('pe_fill_3', 'ep-teens', 'the year I stopped running', 'hurt', 0, true, false, [
    'A coach who said I had the wrong build for it, and me believing him for eleven years.',
    'I hear a verdict in ordinary comments. I also know now what it costs to take one.',
    "Nobody knows what your build is for until you've used it.",
  ]),
  ev('pe_fill_4', 'ep-19-34', 'the first job, and being good at it', 'helped', 0, true, true, [
    'Two years at the desk by the window, doing the dull thing well, and being trusted with the next one because of it.',
    'I am steadier than I feel. Boring work does not bore me the way I expected.',
    'The slow loop is still a loop.',
  ]),
  ev('pe_fill_5', 'ep-19-34', 'moving cities for someone', 'helped', 1, false, false),
];
s.pastListed = true;
s.pastDraft = null;

// ---- the Book: a second edition carrying both volumes
const cardText = {
  'f-start-and-drift': 'I start things and drift.',
  'f-night-before': 'I leave it until the night before.',
  'f-promise-and-forget': 'I promise things and then forget them.',
  'v-dr-boring': 'I can do boring things for a long time.',
  'v-dr-unwatched': 'I work the same when nobody is checking.',
  'v-dr-return': 'I come back the day after it goes badly.',
};
const framingLabel = { 'fs-night-before': 'The night before', 'fs-someone-asks': 'The moment someone else needs something' };
const first = s.books[0];
const second = {
  ...first,
  id: 'book_fill_2',
  version: 2,
  sealedAt: '2026-09-15T21:40:00.000Z',
  volumes: {
    present: {
      entries: s.presentPicks.map((p) => ({
        half: p.half,
        card: cardText[p.cardId],
        ...(p.framingId ? { framing: framingLabel[p.framingId] } : {}),
        story: p.storyLine,
        apply: p.applyLine,
        ...(p.goalId ? { goalName: goal.title } : {}),
      })),
    },
    past: {
      entries: s.pastEvents
        .filter((v) => v.joinsBook && v.analysed)
        .map((v) => ({
          period: s.pastEpochs.find((e) => e.id === v.epochId).label,
          title: v.title,
          whatHappened: v.whatHappened,
          shapedMe: v.shapedMe,
          stillBelieve: v.stillBelieve,
        })),
    },
  },
};
s.books = [first, second];

writeFileSync(join(HERE, 'filled.json'), JSON.stringify(seed, null, 2) + '\n');
console.log('wrote scripts/fixtures/filled.json —', s.presentPicks.length, 'picks,', s.pastEvents.length, 'events,', s.books.length, 'editions');
