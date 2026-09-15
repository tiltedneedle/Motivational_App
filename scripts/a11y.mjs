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
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const candidates = [
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  'C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',
].filter(Boolean);
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

const seed = JSON.parse(await readFile(process.env.SEED ? join(ROOT, process.env.SEED) : join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
if (process.env.DARK) seed.state.profile.appearance = 'dark';
await page.addInitScript((s) => {
  localStorage.setItem('morrow-v1', JSON.stringify(s));
}, seed);
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
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.clock.runFor(1800);
  await page.waitForTimeout(400);
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
