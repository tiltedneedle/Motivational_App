/**
 * One studio at a time: every screen, in the night studio and in the day,
 * looking for the colours of the other one.
 *
 * The palettes are swapped globally (`day` is a proxy over `night` while the
 * night studio is on), so a screen picks up the mode almost everywhere by
 * itself. What that cannot catch is a colour written down as a hex, or a
 * token from the wrong palette used on purpose for one studio and then seen
 * in the other — a cream card on the dark ground, a charcoal pill on the
 * cream. This walks the DOM and reports elements whose own background comes
 * from the studio that is not running.
 *
 *   node scripts/check-studio.mjs            # both studios
 *   DARK=1 node scripts/check-studio.mjs     # the night studio only
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8806);
const BASE = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };

/**
 * The routes, and the screen each one should settle on. Kept here rather than
 * shared with the screenshot script because this walk wants the states that
 * are always one studio — the writing room and the two seals are the night
 * studio whatever the setting says, and they are exactly where a day colour
 * would show.
 */
const ROUTES = {
  welcome: '/',
  today: '/today',
  book: '/book',
  coach: '/coach',
  progress: '/progress',
  settings: '/settings',
  envision: '/envision',
  letters: '/letters',
  goal: '/goal?id=goal_mtwbjf3sdpofma',
  practice: '/practice',
  account: '/account',
  paywall: '/paywall?moment=second-blueprint',
  present: '/present',
  past: '/past',
  choose: '/choose',
  heard: '/heard',
  interview: '/interview',
  rank: '/rank',
  reading: '/reading',
  memory: '/memory',
  // The nine that are the night studio whatever the setting says.
  'write-doorway': '/write?kind=ideal',
  'seal-day': '/seal-day',
  'seal-book': '/seal-book',
  run: '/run?id=pr_seed1',
  wallpaper: '/wallpaper',
  declare: '/declare',
  'first-write': '/first-write',
};

/**
 * The grounds and surfaces of each studio that belong to it alone.
 *
 * Not `night.ground` (#17181C): it is also the day studio's ink, and every
 * filled button in the product is painted with it. Only colours that can
 * mean one studio and nothing else are worth reporting.
 */
const DAY = ['#f1f0ec', '#f8f7f4', '#e4e3df', '#ffffff', '#eeede8'];
const NIGHT = ['#23252c', '#0e0f12', '#1e1f24', '#26272d'];

/**
 * The grounds and surfaces each studio paints, including the ones it shares a
 * hex with. Used as the *backdrop* half of the ink check below: a colour is
 * only the wrong ink if it is sitting on this studio's own furniture.
 */
const DAY_GROUNDS = ['#f1f0ec', '#f8f7f4', '#e4e3df', '#eeedea', '#ffffff', '#eeede8'];
const NIGHT_GROUNDS = ['#17181c', '#23252c', '#0e0f12', '#1e1f24', '#26272d'];

/**
 * The three inks of each studio. A text colour from one studio, set on the
 * other studio's ground, is the fault this catches: a control that kept a
 * fixed white after the palette swapped under it, or a fixed charcoal.
 *
 * Not `#17181c` on the night side: it is `night.onInk`, what a filled control
 * carries there, and it is correct on ink and on an accent — neither of which
 * is a ground.
 */
const DAY_INKS = ['#17181c', '#55585f', '#62656e'];
const NIGHT_INKS = ['#f2f1ed', '#b4b6bc', '#8b8e95', '#ffffff'];
/** Screens that are the night studio whatever the setting says. */
const ALWAYS_NIGHT = new Set(['book', 'reading', 'envision', 'write-doorway', 'seal-day', 'seal-book', 'run', 'wallpaper', 'declare']);
/** The Book's paper is neither studio's: it is the same object in both. */
const PAPER = ['#fbf8f2', '#e2dacb'];

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  let file = join(DIST, decodeURIComponent(url.pathname));
  try { const s = await stat(file); if (s.isDirectory()) file = join(file, 'index.html'); } catch { file = join(DIST, 'index.html'); }
  try { res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(PORT, r));

const seed = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));
const browser = await launchBrowser();
let failures = 0;
let ran = 0;
const check = (name, ok, detail = '') => {
  ran += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};

const studios = process.env.DARK ? ['night'] : process.env.LIGHT ? ['day'] : ['day', 'night'];
for (const studio of studios) {
  const night = studio === 'night';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: night ? 'dark' : 'light' });
  const state = JSON.parse(JSON.stringify(seed));
  state.state.profile.appearance = night ? 'dark' : 'light';
  await ctx.addInitScript((s) => localStorage.setItem('morrow-v1', JSON.stringify(s)), state);
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-09-12T09:00:00') });

  for (const [name, route] of Object.entries(ROUTES)) {
    // A screen that is the night studio on purpose is not wearing the wrong
    // one when the setting says day.
    if (!night && ALWAYS_NIGHT.has(name)) continue;
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1800);
    await page.waitForTimeout(500);
    const found = await page.evaluate(
      ({ wrong, paper }) => {
        // Opaque only. A tint over the ground — the nine per cent white a
        // pill wears in the night studio — is the studio working, not
        // failing, and reads as the same hex as a white card.
        const hex = (c) => {
          const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c || '');
          if (!m) return null;
          if (m[4] !== undefined && Number(m[4]) < 0.95) return null;
          return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
        };
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          const bg = hex(getComputedStyle(el).backgroundColor);
          if (!bg || !wrong.includes(bg)) continue;
          const r = el.getBoundingClientRect();
          // Something you can actually see: not a hairline, not off-screen.
          if (r.width < 24 || r.height < 12) continue;
          if (paper.some((p) => { let n = el.parentElement; for (let i = 0; i < 8 && n; i++, n = n.parentElement) if (hex(getComputedStyle(n).backgroundColor) === p) return true; return false; })) continue;
          const id = el.getAttribute('data-testid') || el.parentElement?.getAttribute('data-testid') || '';
          out.push(`${bg}${id ? ` (${id})` : ''} ${Math.round(r.width)}×${Math.round(r.height)}`);
          if (out.length >= 4) break;
        }
        return out;
      },
      { wrong: night ? DAY : NIGHT, paper: PAPER },
    );
    check(`${studio} · ${name}`, found.length === 0, found.join(', '));

    // And the other half: an ink from the studio that is not running, set on
    // this studio's own ground. White left on a pale surface, or charcoal on
    // a dark one — the palette swapped and one control did not follow.
    const inks = await page.evaluate(
      ({ wrongInks, grounds, paper }) => {
        const hex = (c) => {
          const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c || '');
          if (!m) return null;
          if (m[4] !== undefined && Number(m[4]) < 0.95) return null;
          return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
        };
        /** The nearest ancestor that actually paints something. */
        const backdrop = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const bg = hex(getComputedStyle(n).backgroundColor);
            if (bg) return bg;
          }
          return null;
        };
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          if (el.childElementCount > 0) continue;
          const text = (el.textContent ?? '').trim();
          if (!text) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) continue;
          const fg = hex(getComputedStyle(el).color);
          if (!fg || !wrongInks.includes(fg)) continue;
          const bg = backdrop(el);
          if (!bg || paper.includes(bg) || !grounds.includes(bg)) continue;
          const id = el.getAttribute('data-testid') || el.closest('[data-testid]')?.getAttribute('data-testid') || '';
          out.push(`${fg} on ${bg}${id ? ` (${id})` : ''} "${text.slice(0, 24)}"`);
          if (out.length >= 4) break;
        }
        return out;
      },
      { wrongInks: night ? DAY_INKS : NIGHT_INKS, grounds: night ? NIGHT_GROUNDS : DAY_GROUNDS, paper: PAPER },
    );
    check(`${studio} · ${name} · inks`, inks.length === 0, inks.join(', '));
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} of ${ran} screens carry the other studio's colours` : `\n${ran}/${ran} screens wear one studio at a time`);
process.exit(failures > 0 ? 1 : 0);
