/**
 * One rule about days, checked.
 *
 * `toISOString()` converts to UTC. Build a date in local time, add three months
 * to it, then call `.toISOString().slice(0, 10)`, and west of Greenwich in the
 * evening you get tomorrow — which is how a three-month horizon landed a day
 * late and dated every milestone on the plan built from it. The same mistake
 * on the letters screen made a letter due today read as due tomorrow.
 *
 * The rule: `toISOString().slice(0, 10)` is only safe when the date it is
 * called on was anchored in UTC in the first place — which in this codebase
 * always looks like `new Date(\`${iso}T00:00:00Z\`)` followed by `setUTCDate`.
 * Anywhere else, `dayOf` is the function that means "which day is this".
 *
 * The check is deliberately per-function rather than per-file: a file may
 * legitimately do both, and it is the function that has to be consistent.
 *
 *   node scripts/check-dates.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ROOTS = [join(ROOT, 'apps', 'mobile'), join(ROOT, 'packages')];
const SKIP = new Set(['node_modules', 'dist', '.expo', 'build', 'android', 'ios']);

/**
 * `utcDate` is the one function allowed to do this unconditionally: it is named
 * for what it returns and its whole doc comment is a warning not to use it as
 * "today".
 */
const ALLOWED_FILES = new Set(['packages/core/src/ids.ts']);

const PATTERN = /toISOString\(\)\s*\.\s*slice\(\s*0\s*,\s*10\s*\)/;
const UTC_ANCHOR = /T00:00:00Z|setUTCDate|getUTCDate|Date\.UTC/;

async function* walk(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) yield full;
  }
}

/**
 * The lines around a hit that plausibly belong to the same function.
 *
 * A real parser would be better and is not worth it here: the window is the
 * enclosing blank-line-delimited block, which in this codebase is a function
 * body often enough that the check is useful and quiet.
 */
function block(lines, at) {
  let from = at;
  while (from > 0 && lines[from - 1].trim() !== '') from -= 1;
  let to = at;
  while (to < lines.length - 1 && lines[to + 1].trim() !== '') to += 1;
  return lines.slice(Math.max(0, from - 2), to + 2).join('\n');
}

const problems = [];
let checked = 0;

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (ALLOWED_FILES.has(rel)) continue;
    const src = await readFile(file, 'utf8');
    if (!PATTERN.test(src)) continue;
    checked += 1;
    // Split on both, because this repo is checked out with CRLF endings and a
    // trailing \r is a line terminator to a JS regex: `.` refuses to cross it,
    // so the comment-stripping below matched nothing at all and was quietly
    // doing nothing on every line in the tree.
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      // A comment explaining the mistake is not the mistake. Without this the
      // check fires on its own explanation, which is the fastest way to teach
      // somebody to delete a guard.
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (!PATTERN.test(code)) return;
      if (UTC_ANCHOR.test(block(lines, i))) return;
      problems.push({ file: rel, line: i + 1, code: code.trim().slice(0, 70) });
    });
  }
}

for (const p of problems) {
  console.error(`FAIL  ${p.file}:${p.line} — a local date turned into a UTC day: ${p.code}`);
}

if (problems.length) {
  console.error('\nUse dayOf(instant, boundaryHour). See packages/core/src/ids.ts.');
  process.exit(1);
}

console.log(`PASS  ${checked} files turn dates into days, and every one of them anchors in UTC first`);
