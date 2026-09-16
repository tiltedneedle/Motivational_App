/**
 * Every route, opened cold.
 *
 * A stale notification, a bookmarked link, a phone handed over half-way: a
 * person can land on any screen with nothing behind it and nothing in the
 * store that the screen was written for. Each of those must still be a screen
 * — something rendered, a way out at the top or a way to Today, no uncaught
 * error — and never a blank page or a spinner that stays.
 *
 * The routes are the a11y pass's, so the three passes look at the same
 * screens. Two stores: empty (a fresh install) and the seeded one with every
 * id in the URL pointing at nothing (a goal, a practice, a Book that is not
 * there). The seeded pass is the a11y pass's job; this one is for the doors
 * nobody is meant to arrive at.
 *
 * Run: pnpm build:web && node scripts/check-cold.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8797);
const BASE = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

/** Every route the a11y pass renders, with the ids pointed at nothing. */
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
  stone: '/stone?goal=no-such-goal&kind=strategies',
  'stone-obstacles': '/stone?goal=no-such-goal&kind=obstacles',
  'stone-bare': '/stone',
  portrait: '/portrait?goal=no-such-goal',
  'seal-book': '/seal-book',
  book: '/book',
  reading: '/reading',
  today: '/today',
  'new-move': '/new-move',
  'seal-day': '/seal-day',
  coach: '/coach',
  progress: '/progress',
  goal: '/goal?id=no-such-goal',
  replan: '/replan?goal=no-such-goal',
  envision: '/envision',
  letters: '/letters',
  practice: '/practice',
  run: '/run?id=no-such-practice',
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

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ' — ' + detail}`);
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

const empty = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'empty.json'), 'utf8'));
const seeded = JSON.parse(await readFile(join(ROOT, 'scripts', 'fixtures', 'seeded-state.json'), 'utf8'));

async function walk(label, seed) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.addInitScript((s) => localStorage.setItem('morrow-v1', JSON.stringify(s)), seed);
  await page.clock.install({ time: new Date('2026-09-12T09:00:00') });

  for (const [name, path] of Object.entries(ROUTES)) {
    errors.length = 0;
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2500);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const screens = [...document.querySelectorAll('[data-testid^="screen-"]')].map((e) => e.getAttribute('data-testid'));
      const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
      const buttons = [...document.querySelectorAll('[role="button"],button,a[href]')].map((e) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      // Today and Welcome are the roots: they have no way out by design, the
      // same rule check-back.mjs holds. Every other screen must lead to one.
      const isRoot = screens.includes('screen-today') || screens.includes('screen-welcome');
      const wayOut = isRoot || buttons.some((b) => /\b(back|today|close|skip|not now|another time)\b/i.test(b));
      const boot = Boolean(document.querySelector('[data-testid="boot"]'));
      // The error boundary is a screen too, and the one this check exists to catch.
      const broke = Boolean(document.querySelector('[data-testid="error-boundary"]'));
      return { screens, chars: text.length, wayOut, boot, broke, path: location.pathname + location.search };
    });
    const rendered = state.screens.length > 0 && state.chars > 20 && !state.boot;
    const ok = rendered && !state.broke && state.wayOut && errors.length === 0;
    check(
      `${label} · ${name}`,
      ok,
      [
        rendered ? '' : `nothing rendered (screens=${state.screens.join(',') || '-'} chars=${state.chars} boot=${state.boot})`,
        state.broke ? 'fell into the error boundary' : '',
        state.wayOut ? '' : 'no way out',
        errors.length ? `error: ${errors[0]}` : '',
        ` → ${state.screens.join(',') || state.path}`,
      ]
        .filter(Boolean)
        .join('; '),
    );
  }
  await context.close();
}

try {
  await walk('empty', empty);
  // The seeded store, but every id in a URL points at nothing.
  await walk('missing id', seeded);
} finally {
  await browser.close();
  server.close();
}

const failures = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failures}/${results.length} routes open cold to a screen with a way out`);
process.exit(failures ? 1 : 0);
