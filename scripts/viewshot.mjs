/**
 * One screen, exactly as the phone shows it: the viewport, not the whole
 * scroll. The full-page shots stack a pinned footer over the bottom of the
 * page, which reads as a clipped stone when it is nothing of the kind.
 *
 *   node scripts/viewshot.mjs /seal-day seal-day
 */
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = 8802;
const BASE = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  let file = join(DIST, decodeURIComponent(url.pathname));
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, 'index.html'); } catch { file = join(DIST, 'index.html'); }
  try { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(PORT, r));

const route = process.argv[2] ?? '/today';
const name = process.argv[3] ?? 'view';
const out = join(ROOT, 'scripts', 'shots', 'view');
await mkdir(out, { recursive: true });
const seed = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: process.env.DARK ? 'dark' : 'light' });
if (process.env.DARK) seed.state.profile.appearance = 'dark';
await ctx.addInitScript((s) => localStorage.setItem('morrow-v1', JSON.stringify(s)), seed);
const page = await ctx.newPage();
await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const over = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')].filter((e) => e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 200);
  return all.map((e) => ({ c: e.clientHeight, s: e.scrollHeight, over: e.scrollHeight - e.clientHeight }))[0] ?? null;
});
console.log('scroll overflow:', JSON.stringify(over));
await page.screenshot({ path: join(out, `${name}.png`) });
console.log('wrote', join(out, `${name}.png`));
await browser.close();
server.close();
