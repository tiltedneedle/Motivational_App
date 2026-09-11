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
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8798);
const BASE = `http://localhost:${PORT}`;
const OUT = process.env.OUT ?? join(ROOT, 'scripts', 'shots', process.env.DARK ? 'dark' : '.');

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
  welcome: '/',
  consent: '/consent',
  interview: '/interview',
  authoring: '/authoring',
  'write-doorway': '/write?kind=ideal',
  heard: '/heard',
  stone: '/stone?goal=goal_mtwbjf3sdpofma&kind=strategies',
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
for (const executablePath of [...candidates, undefined]) {
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    break;
  } catch (err) {
    if (executablePath === undefined) throw err;
  }
}
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: process.env.DARK ? 'dark' : 'light',
});
const page = await context.newPage();
await mkdir(OUT, { recursive: true });

const seed = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
if (process.env.DARK) seed.state.profile.appearance = 'dark';
await page.addInitScript((s) => {
  localStorage.setItem('morrow-v1', JSON.stringify(s));
}, seed);
// The seed's day. A clock pinned so "today" and the plan's dates agree.
await page.clock.install({ time: new Date('2026-09-12T09:00:00') });

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
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${name.padEnd(14)} ${route}`);
}

await browser.close();
server.close();
