/**
 * The seeded store ninety days in: the Book sealed in June, a day closed
 * most evenings since, two gaps a person came back from, and a ledger of a
 * couple of hundred entries. For looking at Progress, Today and the Sunday
 * reading once there is a history behind them — and at whether a ledger
 * that long still renders.
 *
 *   node scripts/fixtures/long-game.mjs > scripts/fixtures/long-game.json
 *   SEED=scripts/fixtures/long-game.json node scripts/shots.mjs today progress reading letters goal coach
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(await readFile(join(here, 'seeded-state.json'), 'utf8'));
const s = seed.state;

const START = '2026-06-14';
const TODAY = '2026-09-12';
const GAPS = new Set([
  '2026-07-08',
  '2026-07-09',
  '2026-07-10',
  '2026-07-11',
  '2026-07-12',
  '2026-08-20',
  '2026-08-21',
  '2026-08-22',
]);
const PROOFS = [
  'Out before the kettle. Cold, and I did not mind.',
  'Only the ten-minute version, and it counted.',
  'Ran to the second bridge and back without the phone.',
  'Nothing finished, but I sat down at the table anyway.',
  'Shoes by the door the night before, which is the whole trick.',
  'Sam came as far as the first bridge.',
];
const MOODS = ['Proud', 'Steady', 'Tired', 'Glad', 'Quiet'];

function shift(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const goal = s.goals[0];
const move = s.plans[0].moves[0];
const seededDay = s.days['2026-09-11'];

// Move the seal back to June so the Book has a season behind it.
s.books[0].sealedAt = `${START}T20:15:00.000Z`;
for (const g of s.goals) g.createdAt = `${START}T19:00:00.000Z`;
// Three months from June is mid-September: the race is two days away.
s.goals[0].targetDate = '2026-09-14';
for (const p of s.plans) p.createdAt = `${START}T20:20:00.000Z`;
// The milestones fall inside the season: the first two reached in July and August, the third due with the race.
for (const p of s.plans) {
  const dates = ['2026-07-14', '2026-08-14', '2026-09-14'];
  p.milestones.forEach((m, i) => {
    m.targetDate = dates[i] ?? m.targetDate;
    m.reachedAt = i < 2 ? `${dates[i]}T21:30:00.000Z` : null;
  });
}

s.days = {};
s.evidence = [];
let i = 0;
for (let day = shift(START, 1); day < TODAY; day = shift(day, 1)) {
  i += 1;
  if (GAPS.has(day)) continue;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const planned = weekday === 0 ? 0 : 1;
  const done = planned && i % 5 !== 0 ? 1 : 0;
  const proof = PROOFS[i % PROOFS.length];
  s.days[day] = {
    ...seededDay,
    day,
    planned,
    done,
    skipped: planned - done,
    partial: 0,
    evidenceCount: done + 1,
    sealedAt: `${day}T21:${String(10 + (i % 40)).padStart(2, '0')}:00.000Z`,
    moodWord: MOODS[i % MOODS.length],
    proof,
    gladOf: i % 7 === 0 ? 'the kettle' : null,
    intentionMoveId: move.id,
    safetyRisk: 'none',
  };
  if (done) {
    s.evidence.push({
      id: `ev_lg_${day}_m`,
      goalId: goal.id,
      moveId: move.id,
      kind: 'move',
      text: move.title,
      day,
      createdAt: `${day}T07:05:00.000Z`,
    });
  }
  s.evidence.push({
    id: `ev_lg_${day}_s`,
    goalId: null,
    kind: 'seal',
    text: proof,
    day,
    safetyRisk: 'none',
    createdAt: `${day}T21:15:00.000Z`,
  });
}

// The seed's dawn brief was written for the seed's day; this store makes its own.
s.briefs = [];
// And the seed's first letter said the ledger was empty, which it is not here.
s.letters = [];

process.stdout.write(JSON.stringify(seed));
