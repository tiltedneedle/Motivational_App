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
let deletedUserId = null;
const server = await serve();
let browser = null;
try {
  const made = await admin('/admin/users', { method: 'POST', body: JSON.stringify({ email, email_confirm: true }) });
  const user = await made.json();
  userId = user.id ?? null;
  deletedUserId = userId;
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
  // The seed predates the other two volumes; they travel too, and the Past
  // walk's end with them. Added here so the fixture stays the Future's.
  {
    const at = '2026-09-15T20:00:00.000Z';
    up.presentPicks = [
      { id: 'pp_e2e_1', half: 'faults', cardId: 'f-next-idea-better', storyLine: 'The talk I had to give, written at midnight.', applyLine: 'Twenty minutes in the calendar the night before.', framingId: null, goalId: null, rank: 0, safetyRisk: 'none', writtenAt: at },
      { id: 'pp_e2e_2', half: 'virtues', cardId: 'v-dr-after', storyLine: 'The winter I got up for it every day.', applyLine: 'On Tuesday I use this to start before I am ready.', framingId: null, goalId: up.goals[0].id, rank: 0, safetyRisk: 'none', writtenAt: at },
    ];
    up.pastEpochs = [
      { id: 'ep-early', label: 'Before school', fromAge: 0, toAge: 5, position: 0, createdAt: at },
      { id: 'ep-school', label: 'School', fromAge: 6, toAge: 12, position: 1, createdAt: at },
      { id: 'ep-teens', label: 'The teenage years', fromAge: 13, toAge: 18, position: 2, createdAt: at },
      { id: 'ep-19-34', label: '19 to now', fromAge: 19, toAge: 34, position: 3, createdAt: at },
    ];
    up.pastEvents = [
      { id: 'pe_e2e_1', epochId: 'ep-school', title: 'the move', weight: 'hurt', analysed: true, whatHappened: 'We moved in the middle of a term.', shapedMe: 'I make friends slowly and keep them.', stillBelieve: 'Starting again is survivable.', joinsBook: true, safetyRisk: 'none', position: 0, createdAt: at },
    ];
    up.pastListed = true;
  }
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
  // The store is seeded; the session is NOT put in storage. It arrives the
  // way the email's link delivers it: in the fragment of the URL that opens
  // the app (\`morrow://#access_token=…&refresh_token=…\`), which the root
  // layout hands to the auth server.
  await page.addInitScript(
    ({ s }) => {
      if (!localStorage.getItem('morrow-v1') && !localStorage.getItem('e2e-wiped')) localStorage.setItem('morrow-v1', JSON.stringify(s));
    },
    { s: seed },
  );
  const tap = async (id) => {
    const el = page.locator(`[data-testid="${id}"]`).first();
    await el.waitFor({ state: 'visible', timeout: 15_000 });
    await el.click();
    await page.waitForTimeout(400);
  };
  const seen = async (id) => (await page.locator(`[data-testid="${id}"]`).count()) > 0;
  const text = async (id) => (await page.locator(`[data-testid="${id}"]`).first().innerText()).trim();

  const linkUrl = `${BASE}/#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}&expires_in=${session.expires_in ?? 3600}&token_type=bearer&type=magiclink`;
  await page.goto(linkUrl, { waitUntil: 'networkidle' });
  const signedIn = await settle(async () => await seen('screen-account'), 20_000);
  check('the link in the email signs the app in and lands on the account screen', signedIn);
  check('which shows the signed-in state', await seen('account-signed-in'));
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
  for (const table of ['profiles', 'goals', 'authoring_texts', 'goal_analyses', 'books', 'book_versions', 'plans', 'milestones', 'moves', 'evidence', 'day_summaries', 'practices', 'letters', 'briefs', 'present_picks', 'past_epochs', 'past_events']) {
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
  check('the Present picks are on the account', counts.present_picks === up.presentPicks.length, `${counts.present_picks} vs ${up.presentPicks.length}`);
  check('the Past periods and events are on the account', counts.past_epochs === up.pastEpochs.length && counts.past_events === up.pastEvents.length, `${counts.past_epochs} periods, ${counts.past_events} events`);
  const profileRow = await (await rest('/profiles?select=past_listed', session.access_token)).json();
  check("the Past walk's end is on the account", Array.isArray(profileRow) && profileRow[0]?.past_listed === true, JSON.stringify(profileRow).slice(0, 80));
  // The memory profile (PRD 7.9) is keyed by the person, not by an id; the
  // push has to know that or it stops here and nothing after it lands.
  const memoryRow = await (await rest('/memory_profiles?select=user_id,document', session.access_token)).json();
  check('the memory profile is on the account, with its document', Array.isArray(memoryRow) && memoryRow.length === 1 && String(memoryRow[0]?.document ?? '').includes('- '), JSON.stringify(memoryRow).slice(0, 80));

  // A card let go and written about again is a new row with the same card.
  // present_picks has a second unique key, so the upsert has to match on it —
  // or the account's old row refuses this push and every push after it.
  await page.evaluate(() => {
    const k = 'morrow-v1';
    const st = JSON.parse(localStorage.getItem(k) ?? '{}');
    st.state.presentPicks = st.state.presentPicks.map((q) => (q.id === 'pp_e2e_1' ? { ...q, id: 'pp_e2e_1b', storyLine: 'The second time I wrote about it.' } : q));
    localStorage.setItem(k, JSON.stringify(st));
  });
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await tap('settings-account-push');
  const landedAgain = await settle(async () => (await page.locator('body').innerText()).includes('Copied. The Book has a second home.'), 20_000);
  check('a card let go and written again still pushes', landedAgain, (await page.locator('body').innerText()).match(/Copied[^\n]*|could not[^\n]*|duplicate[^\n]*/i)?.[0] ?? 'no note');
  const rewritten = await (await rest('/present_picks?select=id,card_id&half=eq.faults', session.access_token)).json();
  check(
    'and the account holds one row for that card, the new one',
    Array.isArray(rewritten) && rewritten.length === 1 && rewritten[0]?.id === 'pp_e2e_1b',
    JSON.stringify(rewritten).slice(0, 120),
  );
  up.presentPicks = up.presentPicks.map((q) => (q.id === 'pp_e2e_1' ? { ...q, id: 'pp_e2e_1b', storyLine: 'The second time I wrote about it.' } : q));

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
    same('Present picks', up.presentPicks.map((q) => [q.id, q.half, q.cardId, q.rank, q.goalId]), (down.presentPicks ?? []).map((q) => [q.id, q.half, q.cardId, q.rank, q.goalId]));
    same('Past periods, in their order', up.pastEpochs.map((e) => e.id), (down.pastEpochs ?? []).map((e) => e.id));
    same('Past events', up.pastEvents.map((v) => [v.id, v.epochId, v.analysed, v.joinsBook]), (down.pastEvents ?? []).map((v) => [v.id, v.epochId, v.analysed, v.joinsBook]));
    same("the Past walk's end", up.pastListed, down.pastListed);
  }
  await tap('account-continue');
  await page.waitForTimeout(1500);
  check('and Carry on lands on Today with the Book', await seen('screen-today'));

  // ---- 5. Close the account from Settings: the deployed delete-account
  // function, called the way the app calls it, with the person's own token.
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await tap('settings-account-delete');
  await tap('settings-account-delete-confirm');
  const closed = await settle(async () => !(await seen('settings-account-who')), 20_000);
  const note = (await seen('settings-account-note')) ? await text('settings-account-note') : '(no note)';
  check('Close the account, through the deployed function, signs the device out', closed, note);
  // A soft delete: the profile is stamped, every session is revoked, and the
  // sweep removes the user for good after the grace period (the function's
  // own promise: "gone within seven days"). Checked with the service role.
  const marked = await fetch(`${URL_}/rest/v1/profiles?select=deleted_at&id=eq.${userId}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  const rows = await marked.json();
  check('the profile is stamped for deletion', Array.isArray(rows) && rows[0]?.deleted_at != null, JSON.stringify(rows).slice(0, 120));
  // The access token is a JWT and lives out its hour; what the close revokes
  // is the session behind it, so it cannot be renewed anywhere.
  const renew = await fetch(`${URL_}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  check('and the old session cannot be renewed', renew.status >= 400, String(renew.status));
  check('the writing stays on the device', await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.goals ?? []).length > 0));
  check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
  if (process.env.E2E_TRACE) console.log(consoleLines.join('\n'));
} catch (err) {
  check('the run completed', false, err instanceof Error ? err.message : String(err));
} finally {
  // ---- 6. the throwaway user goes now rather than in seven days
  if (userId) {
    const gone = await admin(`/admin/users/${userId}`, { method: 'DELETE' });
    check('the test user is removed by the admin API', gone.status === 200, String(gone.status));
  }
  if (deletedUserId) {
    const left = await fetch(`${URL_}/rest/v1/goals?select=id&user_id=eq.${deletedUserId}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: 'count=exact' } });
    check('and its rows went with it', (left.headers.get('content-range') ?? '').endsWith('/0'), left.headers.get('content-range') ?? '');
  }
  if (browser) await browser.close();
  server.close();
}

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
