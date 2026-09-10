/**
 * The typographic half of the authorship rule, enforced.
 *
 * `UserText` is the only component that sets the serif, and the promise it
 * makes to the reader is that everything in that face was written by them. That
 * promise is kept by convention everywhere else in the codebase, and convention
 * is exactly what drifts: the Interview shipped its own running commentary
 * ("Pick as many as are true. I will narrow it down from there.") in the serif,
 * which is the precise confusion the rule exists to prevent.
 *
 * So: a string literal inside UserText is a failure. Punctuation a quotation
 * needs — quote marks, an ellipsis, "from", "…then I" — is allowed, because
 * those frame the user's words rather than impersonate them.
 *
 * Run: node scripts/check-authorship.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOTS = ['apps/mobile/app', 'apps/mobile/src', 'packages/ui/src'];

/** Framing a quotation is allowed to carry. Everything else is prose. */
const ALLOWED = /^[\s“”"'’‘.,:;—–\-…()]*(?:from|then i|…then i)?[\s“”"'’‘.,:;—–\-…()]*$/i;

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(e.name)) yield p;
  }
}

const problems = [];
let checked = 0;
let usages = 0;

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const src = await readFile(file, 'utf8');
    if (!src.includes('UserText')) continue;
    checked++;

    // Each <UserText …> … </UserText> block, with its children.
    const re = /<UserText\b[^>]*>([\s\S]*?)<\/UserText>/g;
    let m;
    while ((m = re.exec(src))) {
      usages++;
      const body = m[1];
      // Drop every {expression}: those carry the user's own data.
      const literal = body.replace(/\{[\s\S]*?\}/g, '').trim();
      if (!literal || ALLOWED.test(literal)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      problems.push({ file: relative('.', file).replace(/\\/g, '/'), line, literal: literal.slice(0, 70) });
    }
  }
}

for (const p of problems) {
  console.log(`FAIL  ${p.file}:${p.line} — app prose in the serif: "${p.literal}"`);
}

if (!problems.length) {
  console.log(`PASS  ${usages} UserText usages across ${checked} files carry only the user's own words`);
}
process.exit(problems.length ? 1 : 0);
