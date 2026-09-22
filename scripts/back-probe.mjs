/**
 * The browser's Back on a screen that has armed an undo, over and over.
 *
 * Not part of `pnpm verify`: a measuring instrument, kept because this one
 * mechanism cost eight CI cycles and every one of them was argued about
 * rather than measured. It opens the Present volume, walks one step in so the
 * screen has something to undo, presses the browser's Back and prints what
 * the handler saw — including when a screen last armed or disarmed, which is
 * what finally named the fault: on the runs that failed, the screen had been
 * torn down two to five milliseconds earlier, in the same event, by a router
 * listener that had been added first.
 *
 *   node scripts/back-probe.mjs [runs]     # nine held of twelve, before the fix
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = 8804;
const BASE = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  let file = join(DIST, decodeURIComponent(url.pathname));
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, 'index.html'); } catch { file = join(DIST, 'index.html'); }
  try { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(PORT, r));

const RUNS = Number(process.argv[2] ?? 20);
const seed = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript((s) => localStorage.setItem('morrow-v1', JSON.stringify(s)), seed);
const page = await ctx.newPage();
let held = 0;
for (let i = 0; i < RUNS; i++) {
  // In by the door, not by URL: a document load leaves nothing of the app's
  // behind it, and the Back from there is the browser's own.
  await page.goto(`${BASE}/choose`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('[data-testid="door-present"]').first().click();
  const armed = await page
    .waitForFunction(() => (window.__morrowScreens ?? []).some((s) => s.path === '/present'), null, { timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  // The deck itself has nothing to step back to; ten cards and Continue is
  // the narrowing, which has.
  const cards = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="present-card-"]')].map((e) => e.getAttribute('data-testid')));
  for (const id of cards.slice(0, 10)) await page.locator(`[data-testid="${id}"]`).first().click();
  await page.locator('[data-testid="present-continue"]').first().click();
  const armedNow = await page
    .waitForFunction(() => (window.__morrowScreens ?? []).some((s) => s.canStepBack), null, { timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  await page.goBack({ waitUntil: 'commit' }).catch(() => {});
  await page.waitForTimeout(700);
  const out = await page.evaluate(() => ({
    back: window.__morrowBack ?? null,
    screens: [...document.querySelectorAll('[data-testid^="screen-"]')].map((e) => e.getAttribute('data-testid')).join(','),
  }));
  const kept = /screen-present/.test(out.screens);
  if (kept) held += 1;
  console.log(`${i + 1} ${kept ? 'held ' : 'LEFT '} armed=${armed}/${armedNow} ${out.screens || 'none'} ${JSON.stringify(out.back)}`);
  await page.evaluate(() => {
    const k = 'morrow-v1';
    const s = JSON.parse(localStorage.getItem(k) ?? '{}');
    if (s.state) { s.state.presentDraft = null; s.state.presentPicks = []; }
    localStorage.setItem(k, JSON.stringify(s));
  });
}
console.log(`\n${held}/${RUNS} held the screen`);
await browser.close();
server.close();
