/**
 * The typographic half of the authorship rule, enforced.
 *
 * The serif means one thing in this product: these are the person's own words.
 * That promise is kept by convention everywhere else in the codebase, and
 * convention is exactly what drifts — the Interview shipped its own running
 * commentary in the serif, which is the precise confusion the rule exists to
 * prevent.
 *
 * Three checks, because the first version had two holes an audit walked
 * straight through:
 *
 *  1. No string literal inside `<UserText>`. Punctuation a quotation needs is
 *     allowed; prose is not.
 *  2. No known app-prose producer inside `<UserText>` either. The first version
 *     stripped every `{...}` expression before looking, so `{guessLine(s)}` —
 *     the exact bug this was written for — was invisible to it.
 *  3. The serif faces themselves are only reachable through the two components
 *     that are allowed to set them. Otherwise a screen can simply write
 *     `fontFamily: fonts.serif` and bypass the whole thing.
 *
 * Run: node scripts/check-authorship.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOTS = ['apps/mobile/app', 'apps/mobile/src', 'packages/ui/src'];

/** Framing a quotation is allowed to carry; everything else is prose. */
const ALLOWED_LITERAL = /^[\s“”"'’‘.,:;—–\-…()]*(?:from|then i|…then i)?[\s“”"'’‘.,:;—–\-…()]*$/i;

/**
 * Functions that return words the app wrote about the person's life. None of
 * these may be rendered in the serif. Add to this list, never remove from it.
 */
const APP_PROSE = [
  'guessLine',
  'consistencyCaption',
  'framingLabel',
  'letterFromFuture',
  'minVersionOf',
  'followUpPrompt',
  'returnsLetter',
  'scheduleLabel',
  'durationLabel',
  'cadenceLabel',
  'greeting',
];

/**
 * The only files allowed to name a serif face.
 *
 * `primitives.tsx` defines `UserText` and `UserField`; `write.tsx` is the
 * writing room, whose whole surface is the person typing. A placeholder inside
 * those two fields is the one thing set in the serif that the person did not
 * write, and React Native gives no way to style a placeholder's face
 * separately from its value. It is grey, it disappears the moment they type,
 * and it is written down here rather than pretended away.
 */
const MAY_SET_SERIF = ['packages/ui/src/primitives.tsx', 'apps/mobile/app/write.tsx'];

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
let usages = 0;
let checked = 0;

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = relative('.', file).replace(/\\/g, '/');
    const src = await readFile(file, 'utf8');
    checked++;

    // ---- 3: who may SET a serif face on an element
    //
    // Naming one is fine and necessary: the layout loads the fonts and the
    // token file defines them. What no other file may do is put one ON
    // something, which is how a screen would bypass UserText entirely.
    const SETS_SERIF = /fontFamily:\s*(?:fonts\.serif|fonts\.serifItalic|type\.serif|['"]Newsreader)/;
    if (SETS_SERIF.test(src) && !MAY_SET_SERIF.includes(rel)) {
      const line = src.slice(0, src.search(SETS_SERIF)).split('\n').length;
      problems.push({
        file: rel,
        line,
        why: 'sets a serif face on an element; only UserText and the writing room may',
      });
    }

    if (!src.includes('UserText')) continue;

    const re = /<UserText\b[^>]*>([\s\S]*?)<\/UserText>/g;
    let m;
    while ((m = re.exec(src))) {
      usages++;
      const body = m[1];
      const line = src.slice(0, m.index).split('\n').length;

      // ---- 2: app prose arriving through an expression
      for (const fn of APP_PROSE) {
        if (new RegExp(`\\b${fn}\\s*\\(`).test(body)) {
          problems.push({ file: rel, line, why: `renders ${fn}(), which is prose the app wrote` });
        }
      }

      // ---- 1: app prose written straight in
      const literal = body.replace(/\{[\s\S]*?\}/g, '').trim();
      if (literal && !ALLOWED_LITERAL.test(literal)) {
        problems.push({ file: rel, line, why: `app prose in the serif: "${literal.slice(0, 60)}"` });
      }
    }
  }
}

for (const p of problems) console.log(`FAIL  ${p.file}:${p.line} — ${p.why}`);

if (!problems.length) {
  console.log(`PASS  ${usages} UserText usages across ${checked} files, and no screen sets a serif of its own`);
}
process.exit(problems.length ? 1 : 0);
