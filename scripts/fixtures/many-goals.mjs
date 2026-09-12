/**
 * The seeded store with the shelf full: five goals across five domains, a
 * plan for each with three moves scheduled today, four practices, and a
 * Book with five chapters. For looking at what the screens do when a
 * person has a lot going on.
 *
 *   node scripts/fixtures/many-goals.mjs > scripts/fixtures/many-goals.json
 *   SEED=scripts/fixtures/many-goals.json node scripts/shots.mjs today book envision new-move goal progress
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(await readFile(join(here, 'seeded-state.json'), 'utf8'));
const s = seed.state;

const base = s.goals[0];
const plan = s.plans.find((p) => p.goalId === base.id);
const chapter = s.books[0].chapters.find((c) => c.goalId === base.id);
const practice = s.practices[0];

const EXTRA = [
  { id: 'goal_many_money', title: 'a month of expenses in the account', domain: 'money', horizon: 'Six months', authored: true },
  { id: 'goal_many_craft', title: 'the portfolio site live', domain: 'craft', horizon: 'Three months', authored: true },
  { id: 'goal_many_people', title: 'Sunday dinner with Mum, most Sundays', domain: 'people', horizon: 'No deadline', authored: true },
];

let n = 0;
for (const g of EXTRA) {
  n += 1;
  s.goals.push({
    ...base,
    id: g.id,
    title: g.title,
    domain: g.domain,
    horizon: g.horizon,
    titleAuthored: g.authored,
    rank: s.goals.length,
    targetDate: g.horizon === 'No deadline' ? undefined : base.targetDate,
  });
  if (plan) {
    s.plans.push({
      ...plan,
      id: `plan_many_${n}`,
      goalId: g.id,
      milestones: plan.milestones.map((m) => ({ ...m, id: `${m.id}_${n}` })),
      moves: plan.moves.slice(0, 3).map((m, i) => ({
        ...m,
        id: `mv_many_${n}_${i}`,
        goalId: g.id,
        milestoneId: `${m.milestoneId}_${n}`,
        title:
          g.domain === 'money'
            ? ['Move £40 across before the rent goes', 'Cancel the gym I do not go to', 'Read last month’s statement with a coffee'][i]
            : g.domain === 'craft'
              ? ['Write the About page in one sitting', 'Pick three pieces for the front', 'Ask Dev to read it on Friday'][i]
              : ['Text Mum a day, not a week, ahead', 'Buy the lamb on Saturday', 'Leave the phone in the car'][i],
        scheduledFor: '2026-09-12',
        status: 'todo',
        completedAt: undefined,
      })),
      obstaclePlans: [],
    });
  }
  if (chapter) {
    s.books[0].chapters.push({ ...chapter, goalId: g.id, name: g.title, nameAuthored: g.authored, horizon: g.horizon });
  }
}
if (practice) {
  s.practices.push(
    { ...practice, id: 'pr_many_1', goalId: 'goal_many_craft', title: 'Desk, then door', steps: practice.steps },
    { ...practice, id: 'pr_many_2', goalId: 'goal_many_people', title: 'Sunday call', steps: practice.steps.slice(0, 1) },
  );
}

// The seed's dawn brief was written for the seed's day; this store makes its own.
s.briefs = [];

process.stdout.write(JSON.stringify(seed));
