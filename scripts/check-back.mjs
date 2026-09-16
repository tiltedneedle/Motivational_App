/**
 * Every screen that is not a root has a way back at the top.
 *
 * The first-run path once had none, and the person who looked at the app
 * fresh said so first. A structural check over the screens: each file in
 * apps/mobile/app either renders a `TopBar` with a `back`, or one of the
 * older "← Today" / "← Back" text buttons at its top, or is a root (Welcome,
 * Today) or the layout. A new screen without one fails the gate rather than
 * shipping.
 *
 *   node scripts/check-back.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIR = join(ROOT, 'apps', 'mobile', 'app');
// +not-found is a redirect and +native-intent is not a screen at all.
const ROOTS = new Set(['index.tsx', 'today.tsx', '_layout.tsx', '+not-found.tsx', '+native-intent.tsx']);

const files = (await readdir(DIR)).filter((f) => f.endsWith('.tsx')).sort();
const missing = [];
for (const file of files) {
  if (ROOTS.has(file)) continue;
  const src = await readFile(join(DIR, file), 'utf8');
  const hasTopBar = /<TopBar[\s\S]*?back=\{/.test(src);
  const hasTextBack = /label="← (Today|Back)"/.test(src) || /label="Back"/.test(src);
  // A sheet closes; a running routine stops. Both sit where Back does.
  const hasClose = /label="(Close|Stop)"/.test(src);
  if (!hasTopBar && !hasTextBack && !hasClose) missing.push(file);
}

if (missing.length) {
  console.log(`FAIL  ${missing.length} screen(s) with no way back at the top: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`PASS  ${files.length - ROOTS.size} screens have a way back at the top; ${[...ROOTS].join(', ')} are roots`);
