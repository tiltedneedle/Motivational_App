/**
 * The account, end to end, against the real project.
 *
 * What "Next steps" asked for once there was a key: sign in on the built
 * app, push, wipe, sign in on a second install, pull, and compare the two
 * stores. This does that with a throwaway user and no inbox:
 *
 *   1. A test user is made with the service role (admin API) and a session
 *      minted for it the way the six-digit code would — a magic-link token
 *      from `generate_link`, verified with the publishable key.
 *   2. The configured web build (`pnpm build:web`, the one with the project
 *      in it) is opened with that session in storage, exactly where
 *      supabase-js keeps it, and the seeded store on the device.
 *   3. Settings → "Copy it now" pushes. The rows are counted through
 *      PostgREST with the session's token, under RLS.
 *   4. The device is wiped (the store cleared, the session kept), the account
 *      screen's "Bring my Book back" pulls, and the store that comes back is
 *      compared with the one that went up.
 *   5. The user is deleted (admin API); the rows must go with it (cascade).
 *
 * Needs `supabase/.env.local`: SUPABASE_URL, SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY. The service role never reaches the browser:
 * it makes the user, mints the token and deletes the user, in this process.
 * Not part of `pnpm verify` — it reaches the network and makes rows.
 *
 *   pnpm build:web && node scripts/account-e2e.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = 8793;
const BASE = `http://localhost:${PORT}`;

// ---- env
try {
  const text = await readFile(join(ROOT, 'supabase', '.env.local'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {
  // the environment has to carry everything
}
const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error('SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required (supabase/.env.local)');
  process.exit(2);
}
const REF = new URL(URL_).hostname.split('.')[0];

// The bundle must be the configured one, or the app has no account service.
const entry = (await readFile(join(DIST, 'index.html'), 'utf8')).match(/\/_expo\/static\/js\/web\/entry-[a-z0-9]+\.js/)?.[0];
const bundle = entry ? await readFile(join(DIST, entry), 'utf8') : '';
if (!bundle.includes(REF)) {
  console.error(`apps/mobile/dist is not built for ${REF}: run \`pnpm build:web\` (not the offline one) first`);
  process.exit(2);
}

const results = [];
let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ` — ${detail}` : ''}`);
}

const admin = (path, init = {}) =>
  fetch(`${URL_}/auth/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
const rest = (path, token) =>
  fetch(`${URL_}/rest/v1${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}`, Prefer: 'count=exact' } });

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let file = join(DIST, decodeURIComponent(new URL(req.url ?? '/', BASE).pathname));
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      } catch {
        file = join(DIST, 'index.html');
      }
      try {
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
        res.end(await readFile(file));
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

// ---- 1. a throwaway user and a session
const email = `e2e-${Date.now().toString(36)}@example.com`;
let userId = null;
const server = await serve();
let browser = null;
try {
  const made = await admin('/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true }) });
  const user = await made.json();
  userId = user.id ?? null;
  check('a test user can be made with the service role', made.status === 200 && Boolean(userId), `${made.status} ${JSON.stringify(user).slice(0, 120)}`);
  if (!userId) throw new Error('no user');

  const linked = await admin('/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'magiclink', email }) });
  const link = await linked.json();
  const tokenHash = link.hashed_token ?? link.properties?.hashed_token;
  check('a magic-link token can be minted for it', Boolean(tokenHash), JSON.stringify(link).slice(0, 160));

  const verified = await fetch(`${URL_}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  });
  const session = await verified.json();
  check('the token verifies into a session with the publishable key', verified.status === 200 && Boolean(session.access_token), `${verified.status} ${JSON.stringify(session).slice(0, 120)}`);
  if (!session.access_token) throw new Error('no session');
  if (!session.expires_at) session.expires_at = Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);

  // ---- 2. the built app, signed in, with the seeded store
  const seed = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
  const up = seed.state;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? 'C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
  const settle = async (predicate, ms) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await predicate()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };
  await page.addInitScript(
    ({ s, key, sess }) => {
      if (!localStorage.getItem('morrow-v1') && !localStorage.getItem('e2e-wiped')) localStorage.setItem('morrow-v1', JSON.stringify(s));
      localStorage.setItem(key, JSON.stringify(sess));
    },
    { s: seed, key: `sb-${REF}-auth-token`, sess: session },
  );
  const tap = async (id) => {
    const el = page.locator(`[data-testid="${id}"]`).first();
    await el.waitFor({ state: 'visible', timeout: 15_000 });
    await el.click();
    await page.waitForTimeout(400);
  };
  const seen = async (id) => (await page.locator(`[data-testid="${id}"]`).count()) > 0;
  const text = async (id) => (await page.locator(`[data-testid="${id}"]`).first().innerText()).trim();

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check('Settings sees the session as an account', await seen('settings-account'));
  const who = (await seen('settings-account-who')) ? await text('settings-account-who') : '';
  check('and names it', who.includes(email), who);

  // ---- 3. push
  await tap('settings-account-push');
  const landed = await settle(async () => (await page.locator('body').innerText()).includes('Copied. The Book has a second home.'), 20_000);
  check('Copy it now reports the copy landed', landed, (await page.locator('body').innerText()).match(/Copied[^\n]*|Not signed in[^\n]*|Nothing to copy[^\n]*|could not[^\n]*/i)?.[0] ?? 'no note');

  const counts = {};
  for (const table of ['profiles', 'goals', 'authoring_texts', 'goal_analyses', 'books', 'book_versions', 'plans', 'milestones', 'moves', 'evidence', 'day_summaries', 'practices', 'letters', 'briefs']) {
    const r = await rest(`/${table}?select=*`, session.access_token);
    counts[table] = Number(r.headers.get('content-range')?.split('/')[1] ?? -1);
  }
  check('the goals are on the account', counts.goals === up.goals.length, `${counts.goals} vs ${up.goals.length}`);
  check('the Book is on the account', counts.book_versions === up.books.length, `${counts.book_versions} vs ${up.books.length}`);
  check('the plan and its moves are on the account', counts.plans === up.plans.length && counts.moves === up.plans.reduce((n, p) => n + p.moves.length, 0), `${counts.plans} plans, ${counts.moves} moves`);
  check('the ledger is on the account', counts.evidence === up.evidence.length, `${counts.evidence} vs ${up.evidence.length}`);
  check('the days are on the account', counts.day_summaries === Object.keys(up.days).length, `${counts.day_summaries}`);
  check('the practice is on the account', counts.practices === up.practices.length, `${counts.practices}`);
  check('the profile row exists', counts.profiles === 1, `${counts.profiles}`);

  // Nobody else can see any of it.
  const stranger = await rest('/goals?select=id', ANON);
  const strangerRows = await stranger.json();
  check('a stranger with the publishable key sees none of it', Array.isArray(strangerRows) && strangerRows.length === 0, JSON.stringify(strangerRows).slice(0, 80));

  // ---- 4. wipe, then bring it back
  await page.evaluate(() => {
    localStorage.removeItem('morrow-v1');
    localStorage.setItem('e2e-wiped', '1');
  });
  await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check('a wiped device with a live session lands on the signed-in account screen', await seen('account-signed-in'));
  await tap('account-bring-back');
  const back = await settle(async () => (await page.locator('body').innerText()).includes('Your Book is back on this phone'), 30_000);
  const problem = (await seen('account-problem')) ? await text('account-problem') : '';
  check('Bring my Book back says it did', back, problem || (await page.locator('body').innerText()).slice(0, 300));

  const down = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state ?? null);
  check('the store came back', Boolean(down));
  if (down) {
    const same = (name, a, b) => check(`…the same ${name}`, JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a).slice(0, 80)} vs ${JSON.stringify(b).slice(0, 80)}`);
    same('goals', up.goals.map((g) => [g.id, g.title, g.rank]), down.goals.map((g) => [g.id, g.title, g.rank]));
    same('Book', [up.books[0].id, up.books[0].title, up.books[0].iWill, up.books[0].firstSentence], [down.books[0]?.id, down.books[0]?.title, down.books[0]?.iWill, down.books[0]?.firstSentence]);
    same('chapters', up.books[0].chapters.map((c) => c.lines.map((l) => l.text)), (down.books[0]?.chapters ?? []).map((c) => c.lines.map((l) => l.text)));
    same('moves', up.plans.flatMap((p) => p.moves.map((m) => [m.id, m.title, m.status, m.scheduledFor])), down.plans.flatMap((p) => p.moves.map((m) => [m.id, m.title, m.status, m.scheduledFor])));
    same('ledger', up.evidence.map((e) => [e.id, e.text, e.day]), down.evidence.map((e) => [e.id, e.text, e.day]));
    same('days', Object.keys(up.days).sort(), Object.keys(down.days).sort());
    same('Fifteen', up.texts.map((t) => [t.kind, t.body.length]), down.texts.map((t) => [t.kind, t.body.length]));
    same('analyses', up.analyses.map((a) => [a.id, a.kind, a.line]), down.analyses.map((a) => [a.id, a.kind, a.line]));
    same('persona', up.profile.persona, down.profile.persona);
  }
  await tap('account-continue');
  await page.waitForTimeout(1500);
  check('and Carry on lands on Today with the Book', await seen('screen-today'));
  check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
  if (process.env.E2E_TRACE) console.log(consoleLines.join('\n'));
} catch (err) {
  check('the run completed', false, err instanceof Error ? err.message : String(err));
} finally {
  // ---- 5. the user goes, and its rows with it
  if (userId) {
    const gone = await admin(`/admin/users/${userId}`, { method: 'DELETE' });
    check('the test user is deleted', gone.status === 200, String(gone.status));
    const left = await fetch(`${URL_}/rest/v1/goals?select=id&user_id=eq.${userId}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: 'count=exact' } });
    check('and its rows went with it', (left.headers.get('content-range') ?? '').endsWith('/0'), left.headers.get('content-range') ?? '');
  }
  if (browser) await browser.close();
  server.close();
}

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
