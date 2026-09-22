/**
 * Motion (PRD 8.5), measured mid-animation in a real browser rather than
 * trusted: a screen arriving, a chip answering a press, the seal's rings,
 * the Interview's next question sliding in. A motion layer that has gone
 * static — a spring replaced by a set, an Animated.View by a View — fails
 * here, where a screenshot could never tell.
 *
 *   pnpm build:web:offline && node scripts/check-motion.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8794);
const BASE = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  let file = join(DIST, decodeURIComponent(url.pathname));
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, 'index.html'); } catch { file = join(DIST, 'index.html'); }
  try { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(PORT, r));
const seed = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
// A fresh install that has been through set-up: the Interview is the first
// screen with a slide, and it sits behind the consent gate.
const fresh = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'empty.json'), 'utf8'));
const candidates = [process.env.PLAYWRIGHT_CHROMIUM_PATH, 'C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'].filter(Boolean);
let browser = null;
for (const executablePath of [process.env.PLAYWRIGHT_CHROMIUM_PATH, undefined, ...candidates.filter((x) => x !== process.env.PLAYWRIGHT_CHROMIUM_PATH)]) {
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    break;
  } catch (err) {
    if (executablePath === candidates[candidates.length - 1]) throw err;
  }
}
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
// The seed is written once per tab, so a later `localStorage.clear()` sticks.
await context.addInitScript((s) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('morrow-v1', JSON.stringify(s));
    sessionStorage.setItem('seeded', '1');
  }
}, seed);
const page = await context.newPage();
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ' — ' + detail}`); if (!ok) fails++; };
const styleOf = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const c = getComputedStyle(el); return { opacity: parseFloat(c.opacity), transform: c.transform }; }, sel);
const scaleOf = (t) => { const m = /matrix\(([^,]+),/.exec(t ?? ''); return m ? parseFloat(m[1]) : 1; };

// 1. Arrival: the screen's contents fade and rise in. Sampled every frame from inside the page.
await page.addInitScript(() => {
  window.__arrive = [];
  const tick = () => { const s = document.querySelector('[data-testid^="screen-"]'); const inner = s?.children?.[1]; if (inner) window.__arrive.push(parseFloat(getComputedStyle(inner).opacity)); if (window.__arrive.length < 90) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const samples = await page.evaluate(() => window.__arrive);
check('a screen arrives: partly transparent at first, whole a moment later', samples.length > 5 && samples[0] < 0.9 && samples[samples.length - 1] > 0.99, JSON.stringify(samples.slice(0, 6)) + ' … ' + samples[samples.length - 1]);

// 2. A chip answers the press with a sprung scale.
await page.goto(`${BASE}/seal-day`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const chip = page.locator('[role="radio"]').first();
const box = await chip.boundingBox();
// The face sits on its edge (a chip is a key): the wrapper is the edge, the face the child under it.
const face = '[role="radio"] > div > div';
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(120);
const pressed = scaleOf((await styleOf(face))?.transform);
await page.mouse.up();
await page.waitForTimeout(700);
const released = scaleOf((await styleOf(face))?.transform);
check('a chip drops to 0.97 under the press and springs back', pressed < 0.985 && released > 0.995, `pressed ${pressed} released ${released}`);

// 3. The ink button's face drops onto its edge and comes back.
const ink = page.locator('[data-testid="seal-day-hold"]').first();
check('the hold bar is there for the seal', (await ink.count()) > 0);

// 4. The seal: hold, and two rings pulse out while the stone settles.
const bar = await ink.boundingBox();
await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
await page.mouse.down();
await page.waitForTimeout(2200);
await page.mouse.up();
await page.waitForTimeout(250);
const rings = await page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => { const c = getComputedStyle(d); return c.borderRadius !== '0px' && c.borderWidth === '2px' && /234, 75, 46/.test(c.borderColor) && c.position === 'absolute'; }).map((d) => ({ opacity: parseFloat(getComputedStyle(d).opacity), transform: getComputedStyle(d).transform })));
check('two coral rings pulse out of the sealed stone', rings.length === 2 && rings.some((r) => /matrix\(/.test(r.transform) && parseFloat(r.transform.split('(')[1]) > 1.05), JSON.stringify(rings));
await page.waitForTimeout(900);
check('and the day is sealed', /Closed|Sealed|screen-today/.test((await page.locator('body').innerText()) + (await page.evaluate(() => [...document.querySelectorAll('[data-testid^="screen-"]')].map((e) => e.getAttribute('data-testid')).join(',')))));

// 5. The Interview: the next question slides in from the right.
await context.clearCookies();
await page.evaluate((s) => localStorage.setItem('morrow-v1', JSON.stringify(s)), fresh);
await page.goto(`${BASE}/interview`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.locator('[data-testid="option-0"]').click();
await page.locator('[data-testid="interview-continue"]').click();
await page.waitForTimeout(40);
const mid = await page.evaluate(() => { const slideOf = () => { let el = document.querySelector('[data-testid="interview-question"]'); for (let i = 0; el && i < 5; i++) { el = el.parentElement; if (el && getComputedStyle(el).transform !== 'none') return getComputedStyle(el).transform; } return el ? getComputedStyle(el).transform : null; }; return slideOf(); });
await page.waitForTimeout(800);
const end = await page.evaluate(() => { const el = document.querySelector('[data-testid="interview-question"]')?.parentElement?.parentElement; return el ? getComputedStyle(el).transform : null; });
const tx = (t) => { const m = /matrix\(([^)]*)\)/.exec(t ?? ''); return m ? parseFloat(m[1].split(',')[4]) : 0; };
check('the next question slides in from the right', tx(mid) > 2 && Math.abs(tx(end)) < 0.5, `mid ${mid} end ${end}`);

// 6. Reduce motion: a crossfade and nothing else. The answer must be known at
// the first frame — it used to arrive one render late, after the rise had
// already started.
const still = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await still.addInitScript((s) => localStorage.setItem('morrow-v1', JSON.stringify(s)), seed);
await still.addInitScript(() => {
  window.__arrive = [];
  const tick = () => { const s = document.querySelector('[data-testid^="screen-"]'); const inner = s?.children?.[1]; if (inner) { const c = getComputedStyle(inner); window.__arrive.push([parseFloat(c.opacity), c.transform]); } if (window.__arrive.length < 90) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const quiet = await still.newPage();
await quiet.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
await quiet.waitForTimeout(1500);
const stillSamples = await quiet.evaluate(() => window.__arrive);
const moved = stillSamples.filter(([, t]) => t && t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)');
check('under reduce motion a screen only crossfades: no frame moves it', stillSamples.length > 5 && moved.length === 0 && stillSamples[0][0] < 0.9, JSON.stringify(moved.slice(0, 3)) + ' first opacity ' + stillSamples[0]?.[0]);
await quiet.goto(`${BASE}/seal-day`, { waitUntil: 'networkidle' });
await quiet.waitForTimeout(900);
const chip2 = quiet.locator('[role="radio"]').first();
const box2 = await chip2.boundingBox();
await quiet.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
await quiet.mouse.down();
await quiet.waitForTimeout(120);
const pressedStill = await quiet.evaluate(() => { const el = document.querySelector('[role="radio"] > div > div'); return el ? getComputedStyle(el).transform : null; });
await quiet.mouse.up();
check('and a chip does not scale under a press', !/0\.9[0-9]/.test(pressedStill ?? ''), pressedStill ?? 'none');
await still.close();

await browser.close();
server.close();
console.log(fails ? `${fails} failed` : '8/8 motion checks passed');
process.exit(fails ? 1 : 0);
