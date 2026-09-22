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

// The shared modules every function imports: parsed like the rest, and the
// rate limit's own file held to its rule.
for (const shared of ['limit.ts', 'llm.ts']) {
  const file = join(dir, '_shared', shared);
  let src;
  try { src = await readFile(file, 'utf8'); } catch { continue; }
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const diags = sf.parseDiagnostics ?? [];
  if (diags.length) {
    bad++;
    console.log(`FAIL _shared/${shared}: ${ts.flattenDiagnosticMessageText(diags[0].messageText, ' ')}`);
    continue;
  }
  if (shared === 'limit.ts' && !/rate_limit_hit/.test(src)) {
    bad++;
    console.log('FAIL _shared/limit.ts: the rate limit no longer counts hits');
    continue;
  }
  console.log(`PASS _shared/${shared}: parses`);
}

for (const name of names) {
  if (name.startsWith('_')) continue;
  const file = join(dir, name, 'index.ts');
  let src;
  try { src = await readFile(file, 'utf8'); } catch { continue; }
  // Every function that spends a model call is rate limited; delete-account
  // is one authenticated update and is not.
  if (/_shared\/llm\.ts/.test(src) && !/tooMany\(|allow\(/.test(src)) {
    bad++;
    console.log(`FAIL ${name}: no rate limit call`);
    continue;
  }
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const diags = sf.parseDiagnostics ?? [];
  if (diags.length) {
    bad++;
    console.log(`FAIL ${name}: ${ts.flattenDiagnosticMessageText(diags[0].messageText, ' ')}`);
    continue;
  }
  // The rules that must never quietly disappear from these files.
  // Each rule names the behaviour that must not quietly disappear, and each
  // has to be specific enough that only the real thing satisfies it.
  //
  // `safety` used to be matched by /crisis/, which its own system prompt
  // contains three times over — the check passed on the instructions rather
  // than on any code, and would have gone on passing with the entire verdict
  // path deleted.
  const rules = {
    readback: [
      // Every span is proven to be a verbatim substring of the person's text.
      /indexOf\(text/,
      /verify\(/,
    ],
    scene: [
      // The detail is proven to come from their own writing.
      /haystack\.includes/,
      // ...and the scene is refused outright when it does not.
      /degraded/,
    ],
    'delete-account': [
      // The person is read out of their own token, never out of the body.
      /auth\.getUser\(token\)/,
      /headers\.get\('authorization'\)/,
      // A soft delete now, the hard one after the grace period.
      /deleted_at/,
      /GRACE_DAYS/,
      /admin\.deleteUser/,
    ],
    safety: [
      // The verdict is read out of the model's tool call, not guessed.
      /input\?\.risk === 'crisis'/,
      // A missing key fails open on the server, because the DEVICE screen is
      // the over-sensitive one and it has already run.
      /if \(!key\)/,
      // The person's words never come back, only a verdict.
      /return json\(\{\s*\n?\s*risk/,
    ],
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
