/**
 * The whole walk, frame by frame, then tiled for the eye.
 *
 *   pnpm build:web && pnpm journey     → scripts/shots/journey/_sheet-*.png
 *
 * Runs the end-to-end suite with JOURNEY set, so every tap leaves a
 * screenshot, then tiles them twenty to a sheet with the step's name under
 * each. The checks read the DOM; this is how a person reads the product.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const dir = 'scripts/shots/journey';
rmSync(dir, { recursive: true, force: true });
const run = (args, env = {}) => spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...env } });
const walk = run(['scripts/e2e.mjs'], { JOURNEY: dir });
if (walk.status !== 0) process.exit(walk.status ?? 1);
process.exit(run(['scripts/sheet.mjs', dir, '5', '0.42', '20']).status ?? 1);
