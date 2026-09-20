/**
 * Two shapes of sentence the app keeps getting wrong, checked.
 *
 * Both were found on screen more than once and fixed more than once, which is
 * the signal that a rule is cheaper than vigilance:
 *
 *   1. `“${line}”.` — the app's full stop landing on top of the person's own.
 *      Their line usually ends in one already. `endSentence()` is the answer.
 *   2. `On ${d.day}` — a stored `YYYY-MM-DD` printed as prose. `formatDay()`
 *      is the answer, and `dayOf()` for "today".
 *   3. `/s+/` — a regex that lost its backslash to a shell on the way in and
 *      now splits on the letter s. One shipped in the coach and sat there
 *      with its fallback dead until a read found it.
 *
 * Text-level, so it will not catch every case, and it does not try to: a
 * cheap rule that fires on the exact shape that has already shipped twice is
 * worth more than a clever one that fires on nothing.
 *
 *   node scripts/check-copy.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ROOTS = [join(ROOT, 'apps', 'mobile', 'app'), join(ROOT, 'apps', 'mobile', 'src'), join(ROOT, 'packages')];
const SKIP = new Set(['node_modules', 'dist', '.expo', 'build']);

/** A quotation closed and then a full stop added, inside a template literal. */
const QUOTE_THEN_STOP = /\$\{[^}]*\}[”"]\.(?=[\s`])/;
/** A day column interpolated straight into prose. */
const RAW_DAY = /\$\{[^}]*\.(day|scheduledFor|targetDate|deliverAt|sealedAt|createdAt)\}/;
/**
 * A regex literal in which a class letter stands bare where a class was
 * meant: `/s+/`, `/d{2}/`, `(?=s|$)`, `[^s]`. The letter must follow a
 * slash, a bracket, a bar or a lookaround, so "(s|es)$" and "is+" pass.
 */
const MANGLED_CLASS = /\/(?:[^\/\n\\]|\\.)*?(?:(?<=[\/(|\[^])[sd][+*{]|\(\?<?[=!][sd][|)]|\[\^?[sd]\])(?:[^\/\n\\]|\\.)*\/[dgimsuvy]*/;

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

const problems = [];
let checked = 0;

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const src = await readFile(file, 'utf8');
    checked += 1;
    src.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.replace(/\/\/.*$/, '');
      if (QUOTE_THEN_STOP.test(line) && !/endSentence\(/.test(line)) {
        problems.push({ file: rel, line: i + 1, why: "the app's full stop on top of theirs — use endSentence()" });
      }
      // Not prose: a day being parsed into a Date, or used as part of an id.
      const notProse = /formatDay\(|key=|testID=|\bid:|Id\b|\.slice\(|T00:00:00|new Date\(|Date\.parse\(|\}:[a-z]/.test(line);
      if (RAW_DAY.test(line) && !notProse) {
        problems.push({ file: rel, line: i + 1, why: 'a stored day printed as prose — use formatDay()' });
      }
      if (MANGLED_CLASS.test(line)) {
        problems.push({ file: rel, line: i + 1, why: 'a regex that lost its backslash — /s+/ splits on the letter s' });
      }
    });
  }
}

// The scripts and the edge functions too, for the regex rule only: a check
// whose regex lost its backslash is a check that passes on nothing.
for (const dir of [join(ROOT, 'scripts'), join(ROOT, 'supabase', 'functions')]) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch {
    continue;
  }
  for (const e of entries) {
    if (!e.isFile() || !/\.(mjs|ts)$/.test(e.name)) continue;
    const file = join(e.parentPath ?? e.path ?? dir, e.name);
    // This file names the shapes it looks for.
    if (file.includes('node_modules') || e.name === 'check-copy.mjs') continue;
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const src = await readFile(file, 'utf8');
    checked += 1;
    src.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.replace(/\/\/.*$/, '');
      if (MANGLED_CLASS.test(line)) problems.push({ file: rel, line: i + 1, why: 'a regex that lost its backslash — /s+/ splits on the letter s' });
    });
  }
}

for (const p of problems) console.error(`FAIL  ${p.file}:${p.line} — ${p.why}`);
if (problems.length) process.exit(1);
console.log(`PASS  ${checked} files, no full stop on top of theirs, no stored day printed as prose, no regex missing its backslash`);
