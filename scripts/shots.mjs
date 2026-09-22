/**
 * Screenshots of every screen, at phone size, from a seeded store.
 *
 * For looking at the product the way a person will, on a machine with no
 * phone: the built web bundle in headless Chromium at 390 × 844, the seeded
 * state from `scripts/fixtures/seeded-state.json` (a Book, a plan, a sealed
 * day, a practice, a brief, a letter), and one full-page PNG per route.
 *
 *   node scripts/shots.mjs                 # all routes → scripts/shots/
 *   node scripts/shots.mjs today book      # some
 *   OUT=some/dir node scripts/shots.mjs    # elsewhere
 *   DARK=1 node scripts/shots.mjs          # the night studio pinned → scripts/shots/dark/
 *   W=375 H=667 node scripts/shots.mjs    # a smaller phone (an SE) → scripts/shots/375x667/
 *   REDUCED=1 node scripts/shots.mjs       # reduce motion on → scripts/shots/reduced/
 *   SEED=scripts/fixtures/long-lines.json node scripts/shots.mjs   # another store → scripts/shots/<seed name>/
 *   FULL=1 node scripts/shots.mjs          # the whole screen, however long it scrolls → …/full/
 *   DAY=2026-09-13 node scripts/shots.mjs  # another day on the clock (a Sunday) → …/2026-09-13/
 *   DAY=2026-09-12T22:00 node scripts/shots.mjs   # an evening → …/2026-09-12T22-00/
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { basename, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8798);
const BASE = `http://localhost:${PORT}`;
const W = Number(process.env.W ?? 390);
const H = Number(process.env.H ?? 844);
const SEED = process.env.SEED ? join(ROOT, process.env.SEED) : join(ROOT, 'scripts', 'fixtures', 'seeded-state.json');
const SEED_NAME = process.env.SEED ? basename(SEED, '.json') : null;
const DAY = process.env.DAY ?? '2026-09-12';
const DAY_NAME = DAY === '2026-09-12' ? null : DAY.replace(/:/g, '-');
const SUBDIR =
  [SEED_NAME, DAY_NAME, W !== 390 || H !== 844 ? `${W}x${H}` : null, process.env.DARK ? 'dark' : null, process.env.REDUCED ? 'reduced' : null, process.env.FULL ? 'full' : null]
    .filter(Boolean)
    .join('-') || '.';
const OUT = process.env.OUT ?? join(ROOT, 'scripts', 'shots', SUBDIR);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** The routes, and the state each needs beyond the seed. */
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
};

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
const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const candidates = [explicit, 'C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'].filter(Boolean);
let browser = null;
for (const executablePath of [process.env.PLAYWRIGHT_CHROMIUM_PATH, undefined, ...candidates.filter((x) => x !== process.env.PLAYWRIGHT_CHROMIUM_PATH)]) {
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    break;
  } catch (err) {
    if (executablePath === candidates[candidates.length - 1]) throw err;
  }
}
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  colorScheme: process.env.DARK ? 'dark' : 'light',
  reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
});
const page = await context.newPage();
await mkdir(OUT, { recursive: true });

const seed = JSON.parse(await readFile(SEED, 'utf8'));
if (process.env.DARK) seed.state.profile.appearance = 'dark';
await page.addInitScript((s) => {
  localStorage.setItem('morrow-v1', JSON.stringify(s));
}, seed);
// The seed's day. A clock pinned so "today" and the plan's dates agree.
await page.clock.install({ time: new Date(DAY.includes('T') ? DAY : `${DAY}T09:00:00`) });

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(ROUTES);
for (const name of names) {
  const route = ROUTES[name];
  if (!route) {
    console.log(`skip ${name}: no such route`);
    continue;
  }
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.clock.runFor(1800);
  await page.waitForTimeout(700);
  if (process.env.FULL) {
    // The app is one full-height column with a scroll view in it, so a
    // full-page screenshot shows only the first screenful. Grow the viewport
    // to the tallest scroll region's content and everything lays out at
    // once; the fixed chrome (a tab bar, a hold bar) lands at the bottom.
    const tall = await page.evaluate(() => {
      let max = 0;
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          max = Math.max(max, el.scrollHeight - el.clientHeight);
        }
      }
      return max;
    });
    if (tall > 0) {
      await page.setViewportSize({ width: W, height: H + tall + 40 });
      await page.waitForTimeout(400);
    }
  }
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  if (process.env.FULL) await page.setViewportSize({ width: W, height: H });
  console.log(`${name.padEnd(14)} ${route}`);
}

await browser.close();
server.close();
