/**
 * The seeded store halfway along the first-run path: goals named, the
 * Fifteen written, the order and title done, two stones of ten written, no
 * Book. For looking at what Welcome and Today say to somebody who stopped.
 *
 *   node scripts/fixtures/midpath.mjs > scripts/fixtures/midpath.json
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const seed = JSON.parse(await readFile(join(here, 'seeded-state.json'), 'utf8'));
const s = seed.state;
s.analyses = s.analyses.filter((a) => a.goalId === s.goals[0].id && (a.kind === 'motives' || a.kind === 'impact'));
for (const k of ['books', 'portraits', 'plans', 'practices', 'practiceLogs', 'evidence', 'scenes', 'briefs', 'letters']) s[k] = [];
s.days = {};
s.iWill = null;
s.profile.todayIntroSeen = false;
process.stdout.write(JSON.stringify(seed));
