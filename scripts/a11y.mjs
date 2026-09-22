/**
 * An accessibility pass over every screen, with axe-core.
 *
 * The built web bundle, the seeded store, each route from `shots.mjs`, and
 * axe's WCAG 2.1 AA rules run against the DOM react-native-web produces.
 * What it can catch that a person looking at the pictures cannot: a control
 * with no name, a contrast that fails by a point, a landmark missing, an
 * image with no alt, a form field with no label. What it cannot catch: the
 * order things are read in, or whether a name makes sense. Those stay with
 * the walkthroughs.
 *
 *   node scripts/a11y.mjs            # every route; exits 1 on serious/critical
 *   node scripts/a11y.mjs today book # some
 *   DARK=1 node scripts/a11y.mjs     # the night studio
 *   SEED=scripts/fixtures/empty.json node scripts/a11y.mjs   # another store
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8797);
const BASE = `http://localhost:${PORT}`;
const AXE = require.resolve('axe-core/axe.min.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

/** The same routes the screenshots use, so the two passes look at the same screens. */
const ROUTES = {
  welcome: '/?intro=1',
  consent: '/consent',
  'consent-details': '/consent?from=setup',
  setup: '/setup',
  signin: '/signin',
  'first-write': '/first-write',
  mirror: '/mirror',
  interview: '/interview',
  authoring: '/authoring',
  'write-doorway': '/write?kind=ideal',
  heard: '/heard',
  choose: '/choose',
  explore: '/explore',
  present: '/present',
  'present-virtues': '/present?half=virtues',
  past: '/past',
  rank: '/rank',
  title: '/title',
  stone: '/stone?goal=goal_mtwbjf3sdpofma&kind=strategies',
  'stone-obstacles': '/stone?goal=goal_mtwbjf3sdpofma&kind=obstacles',
  portrait: '/portrait?goal=goal_mtwbjf3sdpofma',
  'seal-book': '/seal-book',
  book: '/book',
  reading: '/reading',
  today: '/today',
  'new-move': '/new-move',
  'seal-day': '/seal-day',
  coach: '/coach',
  progress: '/progress',
  goal: '/goal?id=goal_mtwbjf3sdpofma',
  replan: '/replan?goal=goal_mtwbjf3sdpofma',
  envision: '/envision',
  letters: '/letters',
  practice: '/practice',
  run: '/run?id=pr_seed1',
  settings: '/settings',
  paywall: '/paywall?moment=second-blueprint',
  account: '/account',
  wallpaper: '/wallpaper',
  declare: '/declare',
  reauthor: '/reauthor',
  memory: '/memory',
};

/**
 * Rules that do not apply to a phone screen rendered by react-native-web:
 * there are no landmarks or headings in a native app's sense, and RNW's
 * `<div role="button">` with a `tabindex` is how every Pressable is made.
 */
const DISABLED = ['region', 'landmark-one-main', 'bypass'];

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', BASE);
      let file = join(DIST, decodeURIComponent(url.pathname));
      try {
        const s = await stat(file);
        if (s.isDirectory()) file = join(file, 'index.html');
      } catch {
        file = join(DIST, 'index.html');
      }
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

const server = await serve();
const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: process.env.DARK ? 'dark' : 'light',
});
const page = await context.newPage();

const seed = JSON.parse(await readFile(process.env.SEED ? join(ROOT, process.env.SEED) : join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
if (process.env.DARK) seed.state.profile.appearance = 'dark';
// Three screens a finished Book sends away (set-up and the mirror dismiss
// to Today; the first line is already written): seeded from where a
// person actually meets them, or the audit ran on Today three times and
// called it set-up.
const fresh = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'empty.json'), 'utf8'));
fresh.state.profile.consentedAt = null;
// The mirror: a first line written and nothing after it.
const mirrored = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'empty.json'), 'utf8'));
mirrored.state.texts = [
  {
    id: 'text_a11y_warm',
    sessionId: 'sess_a11y_warm',
    kind: 'warmup',
    body: 'I want the mornings back: the kitchen before anyone is up, and the kettle on.',
    wordCount: 15,
    secondsWriting: 90,
    mode: 'type',
    sealedUntil: '2026-09-13T09:00:00.000Z',
    safetyRisk: 'none',
    createdAt: '2026-09-12T08:00:00.000Z',
  },
];
const SEED_FOR = { setup: fresh, 'first-write': JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'empty.json'), 'utf8')), mirror: mirrored };
await page.addInitScript((s) => {
  const override = sessionStorage.getItem('a11y-seed');
  localStorage.setItem('morrow-v1', override ?? JSON.stringify(s));
}, seed);
/** The screen id a route must land on; a route with more than one face lists them. */
const SCREEN_FOR = {
  welcome: ['screen-welcome'],
  'consent-details': ['screen-consent'],
  'write-doorway': ['screen-write-doorway'],
  'present-virtues': ['screen-present', 'screen-present-narrow', 'screen-present-write'],
  present: ['screen-present', 'screen-present-narrow', 'screen-present-write', 'screen-present-done'],
  past: ['screen-past-doorway', 'screen-past-age', 'screen-past-events', 'screen-past-choose', 'screen-past-analyse', 'screen-past-done'],
  'stone-obstacles': ['screen-stone'],
};
await page.clock.install({ time: new Date('2026-09-12T09:00:00') });
const axeSource = await readFile(AXE, 'utf8');

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(ROUTES);
let serious = 0;
let minor = 0;
for (const name of names) {
  const route = ROUTES[name];
  if (!route) {
    console.log(`skip ${name}: no such route`);
    continue;
  }
  const override = SEED_FOR[name];
  await page.goto(`${BASE}/`, { waitUntil: 'commit' });
  await page.evaluate((s) => (s ? sessionStorage.setItem('a11y-seed', s) : sessionStorage.removeItem('a11y-seed')), override ? JSON.stringify(override) : null);
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.clock.runFor(1800);
  await page.waitForTimeout(400);
  // The audit is of the screen named, or it is of nothing: a route that
  // redirected used to be axe'd as whatever it landed on and reported
  // under the name it was asked for.
  const landed = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="screen-"]')].map((e) => e.getAttribute('data-testid')));
  const expected = SCREEN_FOR[name] ?? [`screen-${name}`];
  if (!landed.some((id) => expected.includes(id))) {
    serious += 1;
    console.log(`FAIL  ${name.padEnd(14)} did not open: landed on ${landed.join(', ') || 'nothing'}`);
    continue;
  }
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(
    async (disabled) =>
      await globalThis.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
        rules: Object.fromEntries(disabled.map((id) => [id, { enabled: false }])),
      }),
    DISABLED,
  );
  const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const rest = result.violations.filter((v) => !bad.includes(v));
  serious += bad.length;
  minor += rest.length;
  const tag = bad.length ? 'FAIL' : rest.length ? 'note' : 'PASS';
  console.log(`${tag}  ${name.padEnd(14)} ${bad.length} serious, ${rest.length} minor`);
  for (const v of [...bad, ...rest]) {
    console.log(`      ${v.impact.padEnd(8)} ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) {
      const html = n.html.replace(/\s+/g, ' ').slice(0, 140);
      console.log(`               ${n.target.join(' ')}\n               ${html}`);
      if (n.failureSummary) console.log(`               ${n.failureSummary.split('\n')[1] ?? ''}`);
    }
    if (v.nodes.length > 3) console.log(`               … and ${v.nodes.length - 3} more`);
  }
}

await browser.close();
server.close();
console.log(`\n${serious} serious/critical, ${minor} minor across ${names.length} screens`);
process.exit(serious ? 1 : 0);
