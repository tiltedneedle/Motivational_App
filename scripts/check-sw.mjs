/**
 * The service worker, driven in a real Chromium: the first load registers it
 * and caches the shell and the statics; a second "deploy" (the same bundle
 * under a new hashed name, referenced by a rewritten index.html) drops the
 * old statics' cache and keeps the new one; and with the server gone the
 * app still opens. The other walks skip the worker (`navigator.webdriver`);
 * this one tells the shell it is not automated, so the worker registers.
 *
 *   pnpm build:web:offline && node scripts/check-sw.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8795);
const BASE = `http://localhost:${PORT}`;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const jsDir = join(DIST, '_expo/static/js/web');
const entry = (await readdir(jsDir)).find((f) => f.startsWith('entry-'));
if (!entry) throw new Error('no entry bundle in dist; build first');
// Deploy 2 is the same entry served under another hashed name.
let deploy = 1;
const renamed = entry.replace('entry-', 'entry-deploy2-');

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  let path = decodeURIComponent(url.pathname);
  if (deploy === 2 && path.endsWith(renamed)) path = path.replace(renamed, entry);
  let file = join(DIST, path);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, 'index.html');
  }
  try {
    let body = await readFile(file);
    if (file.endsWith('index.html') && deploy === 2) body = Buffer.from(body.toString('utf8').replace(entry, renamed));
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(PORT, resolve));

const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const fallbacks = [
  explicit,
  'C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',
].filter(Boolean);
let browser = null;
for (const executablePath of [explicit, undefined, ...fallbacks.filter((x) => x !== explicit)]) {
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    break;
  } catch (err) {
    if (executablePath === fallbacks[fallbacks.length - 1] || (!fallbacks.length && executablePath === undefined)) throw err;
  }
}
const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
const page = await context.newPage();

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const cacheKeys = () => page.evaluate(() => caches.keys());
const cached = (name) =>
  page.evaluate(async (n) => {
    const c = await caches.open(n);
    return (await c.keys()).map((r) => new URL(r.url).pathname);
  }, name);

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
check(
  'the worker is active after the first load',
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then((r) => !!r.active), new Promise((resolve) => setTimeout(() => resolve(false), 8000))])),
);

// After the first load alone — before any second navigation — the shell
// has fetched the scripts it names, so the app would open offline now.
let keys = await cacheKeys();
const statics0 = keys.find((k) => k.startsWith('morrow-static-'));
const held0 = statics0 ? await cached(statics0) : [];
check('the first load alone puts the entry bundle in the cache', held0.some((p) => p.endsWith(entry)), held0.join(',') || 'nothing cached');

await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
keys = await cacheKeys();
const statics1 = keys.find((k) => k.startsWith('morrow-static-'));
check('one shell cache and one statics cache', keys.includes('morrow-shell-v2') && !!statics1 && keys.length === 2, keys.join(','));
const shell = await cached('morrow-shell-v2');
check('the shell cache holds index.html and the version marker', shell.includes('/index.html') && shell.includes('/__shell-version'), shell.join(','));
const held1 = statics1 ? await cached(statics1) : [];
check('the entry bundle is cached', held1.some((p) => p.endsWith(entry)), held1.join(','));

deploy = 2;
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
keys = await cacheKeys();
const statics2 = keys.find((k) => k.startsWith('morrow-static-'));
check('a new deploy gets a new statics cache and the old one is gone', !!statics2 && statics2 !== statics1 && !keys.includes(statics1), keys.join(','));
const held2 = statics2 ? await cached(statics2) : [];
check('the renamed entry is cached and the old name is not', held2.some((p) => p.endsWith(renamed)) && !held2.some((p) => p.endsWith(entry)), held2.join(','));

await new Promise((resolve) => server.close(resolve));
await page.goto(`${BASE}/today`, { waitUntil: 'load' }).catch(() => {});
await page.waitForTimeout(2500);
const opened = await page.locator('[data-testid="screen-today"], [data-testid="screen-welcome"]').count();
check('with no server the app still opens', opened > 0, (await page.locator('body').innerText().catch(() => '')).slice(0, 120));
// A screen that arrives on demand (async routes): its chunk was followed
// from the entry and kept, so it opens with no server too.
await page.goto(`${BASE}/settings`, { waitUntil: 'load' }).catch(() => {});
await page.waitForTimeout(2500);
check('and so does a screen whose code arrives on demand', (await page.locator('[data-testid="screen-settings"]').count()) > 0, (await page.locator('body').innerText().catch(() => '')).slice(0, 120));

await browser.close();
console.log(failures ? `${failures} failed` : '9/9 service-worker checks passed');
process.exit(failures ? 1 : 0);
