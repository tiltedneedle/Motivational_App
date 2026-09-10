/**
 * The edge functions run on Deno, which is not installed here, so this at least
 * proves they parse as TypeScript and that the rules we care about are present.
 */
import ts from 'typescript';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dir = 'supabase/functions';
const names = await readdir(dir);
let bad = 0;

for (const name of names) {
  const file = join(dir, name, 'index.ts');
  let src;
  try { src = await readFile(file, 'utf8'); } catch { continue; }
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const diags = sf.parseDiagnostics ?? [];
  if (diags.length) {
    bad++;
    console.log(`FAIL ${name}: ${ts.flattenDiagnosticMessageText(diags[0].messageText, ' ')}`);
    continue;
  }
  // The rules that must never quietly disappear from these files.
  const rules = {
    readback: [/indexOf\(text/, /verify\(/],
    scene: [/haystack\.includes/],
    safety: [/crisis/],
  };
  const missing = (rules[name] ?? []).filter((re) => !re.test(src));
  if (missing.length) {
    bad++;
    console.log(`FAIL ${name}: a guard is missing (${missing.join(', ')})`);
  } else {
    console.log(`PASS ${name}: parses, guards present`);
  }
}
process.exit(bad ? 1 : 0);
