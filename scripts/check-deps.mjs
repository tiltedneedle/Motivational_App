/**
 * One toolchain across the workspace.
 *
 * `apps/mobile` was typechecking with TypeScript 6.0.3 while `packages/core`
 * and `packages/ui` used 5.9.3 — and mobile compiles those packages from
 * source, so the same file was being checked by two compilers with two ideas
 * of what is legal. Nothing failed; it simply meant `pnpm typecheck` could go
 * green on a construct the app's own compiler would later reject.
 *
 * The same applies to the test runner: two vitest majors in one workspace is
 * two sets of defaults, and a suite is only a safety net if it behaves the
 * same way everywhere.
 *
 *   node scripts/check-deps.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Tooling that must agree across every package that declares it. */
const SHARED = ['typescript', 'vitest'];

async function manifests() {
  const out = [];
  const read = async (dir) => {
    try {
      const raw = await readFile(join(dir, 'package.json'), 'utf8');
      out.push({ dir, json: JSON.parse(raw) });
    } catch {
      /* not a package */
    }
  };
  await read(ROOT);
  for (const group of ['apps', 'packages']) {
    let entries = [];
    try {
      entries = await readdir(join(ROOT, group), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) if (e.isDirectory()) await read(join(ROOT, group, e.name));
  }
  return out;
}

const problems = [];
const notes = [];

const pkgs = await manifests();

for (const name of SHARED) {
  const seen = new Map();
  for (const { dir, json } of pkgs) {
    const range = json.dependencies?.[name] ?? json.devDependencies?.[name];
    if (!range) continue;
    const where = dir === ROOT ? '.' : dir.slice(ROOT.length + 1).replace(/\\/g, '/');
    if (!seen.has(range)) seen.set(range, []);
    seen.get(range).push(where);
  }
  if (seen.size === 0) continue;
  if (seen.size > 1) {
    const detail = [...seen.entries()].map(([range, where]) => `${range} in ${where.join(', ')}`).join('; ');
    problems.push(`${name} is pinned to ${seen.size} different ranges — ${detail}`);
  } else {
    const [[range, where]] = [...seen.entries()];
    notes.push(`${name} ${range} across ${where.length} package${where.length === 1 ? '' : 's'}`);
  }
}

// The React Native side is Expo's to decide. Upgrading react-native,
// react-native-gesture-handler or @react-native-async-storage/async-storage
// ahead of the SDK breaks the managed workflow, and `pnpm outdated` will
// happily recommend exactly that — it reported six such upgrades while
// `npx expo install --check` said the tree was already correct.
//
// `~` is Expo's own convention and is fine: it takes patches within the minor
// the SDK supports. `^` is not, because it takes the next minor, which is
// precisely the jump that breaks autolinking. `expo install --check` remains
// the authority; this is the cheap local half of it.
const EXPO_OWNED = [
  'react',
  'react-dom',
  'react-native',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-screens',
  '@react-native-async-storage/async-storage',
  'expo',
  'expo-router',
];

const mobile = pkgs.find((p) => p.dir.endsWith(join('apps', 'mobile')));
if (mobile) {
  const deps = { ...mobile.json.dependencies, ...mobile.json.devDependencies };
  const floating = EXPO_OWNED.filter((n) => deps[n] && deps[n].startsWith('^'));
  if (floating.length) {
    problems.push(
      `Expo pins these; a caret takes the next minor and breaks the SDK: ${floating
        .map((n) => `${n}@${deps[n]}`)
        .join(', ')}`,
    );
  } else {
    notes.push(`${EXPO_OWNED.filter((n) => deps[n]).length} Expo-owned packages left to the SDK`);
  }
}

for (const n of notes) console.log(`PASS  ${n}`);
for (const p of problems) console.error(`FAIL  ${p}`);

if (problems.length) {
  console.error(`\n${problems.length} toolchain problem${problems.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('\none toolchain, and the React Native side left to Expo');
