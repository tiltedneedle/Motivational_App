/**
 * End-to-end: install → Interview → the Fifteen → What I heard → the stones →
 * seal the Book → Today → seal the day.
 *
 * It drives the real build with no test hooks in product code: the fifteen
 * minutes are fast-forwarded with Playwright's clock, exactly as the clock
 * would have run.
 *
 *   node scripts/e2e.mjs            # expects a server on :8799
 *   PORT=8799 node scripts/e2e.mjs
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'mobile', 'dist');
const PORT = Number(process.env.PORT ?? 8799);
const BASE = `http://localhost:${PORT}`;

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

/** A single-page server: unknown paths fall back to index.html, like a real host. */
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
let failures = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ` — ${detail}` : ''}`);
  return ok;
}

const IDEAL =
  "It's 6:40 and the kitchen is still blue. I lace the left shoe first, like always, and the door is already open before I've decided anything. Rent went out on the first and I didn't look at the balance, because I already knew. Sam is asleep upstairs and the guitar is on the wall where I can see it from the table.";

async function main() {
  const server = await serve();
  // Reuse a Chromium that is already on this machine rather than downloading a
  // second copy; CI sets PLAYWRIGHT_CHROMIUM_PATH or lets Playwright resolve it.
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const fallbacks = [
    explicit,
    'C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe',
  ].filter(Boolean);
  let browser = null;
  for (const executablePath of [...fallbacks, undefined]) {
    try {
      browser = await chromium.launch(executablePath ? { executablePath } : {});
      break;
    } catch (err) {
      if (executablePath === undefined) throw err;
    }
  }
  if (!browser) throw new Error('no chromium available');
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 300)));

  const tap = async (id) => {
    const el = page.locator(`[data-testid="${id}"]`).first();
    await el.waitFor({ state: 'visible', timeout: 10_000 });
    await el.click();
    await page.waitForTimeout(320);
  };
  const seen = async (id) => (await page.locator(`[data-testid="${id}"]`).count()) > 0;
  const text = async (id) => (await page.locator(`[data-testid="${id}"]`).first().innerText()).trim();

  try {
    // The clock is installed before the app boots so every timer is ours.
    await page.clock.install();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.clock.runFor(3000);
    await page.waitForTimeout(1200);

    check('welcome renders', await seen('screen-welcome'));

    // ---- Interview
    await tap('welcome-begin');
    check('consent screen', await seen('screen-consent'));
    await tap('consent-continue');
    check('interview screen', await seen('screen-interview'));
    check('clarity starts at the floor', (await text('clarity-value')).startsWith('8%'));

    await tap('option-0'); // Health
    check('guess is built from the pick', (await text('guess-line')).toLowerCase().includes('health'));
    await tap('interview-continue');
    await tap('option-0'); // Finish a race
    check('follow-up asked', (await text('interview-question')) === 'How far?');
    await tap('option-2'); // A half marathon
    check('horizon asked', (await text('interview-question')) === 'By when?');
    await tap('option-1'); // Six months
    await tap('option-1'); // admire: a friend
    check('summary names the goal', (await page.locator('body').innerText()).includes('Half marathon'));
    await tap('interview-finish');
    check('authoring opening', await seen('screen-authoring'));

    // ---- the Fifteen
    await tap('authoring-begin');
    check('doorway', await seen('screen-write-doorway'));
    await tap('write-begin');
    check('writing room', await seen('screen-write'));

    await page.locator('[data-testid="write-input"]').fill(IDEAL);
    await page.clock.runFor(1000);
    await page.waitForTimeout(200);

    // idle: the nudge is a question and never contains a noun from the text
    await page.clock.runFor(9000);
    await page.waitForTimeout(200);
    const nudge = await text('write-nudge');
    check('a nudge appears after idle', nudge.length > 0, nudge);
    check('the nudge is a question', nudge.trim().endsWith('?') || nudge.toLowerCase().includes('keep going'), nudge);

    // fast-forward past the ten-minute floor
    await page.clock.runFor(10 * 60 * 1000);
    await page.waitForTimeout(400);
    check('the room can be closed once the floor is met', await seen('write-close'));
    await tap('write-close');
    check('close card', await seen('screen-write-closed'));
    await tap('write-continue');

    // ---- What I heard
    await page.waitForTimeout(800);
    check('read-back screen', await seen('screen-heard'));
    const firstSpan = (await seen('span-text-0')) ? await text('span-text-0') : '';
    check('the read-back quotes the user verbatim', firstSpan.length > 0 && IDEAL.includes(firstSpan.replace(/^“|”$/g, '')), firstSpan);

    await tap('keep-0');
    await page.locator('[data-testid="name-0"]').fill('Half marathon');
    await page.waitForTimeout(200);
    await tap('heard-continue');

    // ---- rank + title
    check('rank screen', await seen('screen-rank'));
    await page.locator('[data-testid="book-title"]').fill('A year of the back door');
    await page.waitForTimeout(200);
    await tap('rank-continue');

    // ---- the five stones
    check('stone screen', await seen('screen-stone'));
    const seenKinds = [];
    for (let i = 0; i < 12; i++) {
      if (!(await seen('screen-stone'))) break;
      const step = await text('stone-step');
      seenKinds.push(step.split('·')[0].trim());
      const kind = step.toLowerCase();
      await page.locator('[data-testid="stone-line"]').fill(
        kind.includes('strategies')
          ? 'Tuesday, Thursday, Saturday at 6:40, out the back door before the kettle boils'
          : kind.includes('obstacles')
            ? 'it is raining at seven'
            : kind.includes('monitoring')
              ? 'one run in the ledger, any pace, checked on Sunday'
              : 'because I said I would, and I would know',
      );
      if (kind.includes('obstacles')) {
        await page.locator('[data-testid="stone-line2"]').fill('take the stairwell, ten floors, twice');
      }
      await page.waitForTimeout(200);
      // the single follow-up may appear; the button then acknowledges it once
      await tap('stone-seat');
      if (await seen('stone-followup')) {
        await tap('stone-seat');
      }
      await page.waitForTimeout(300);
    }
    check('all five stones were asked', seenKinds.length >= 5, seenKinds.join(','));

    // ---- seal the Book
    check('seal screen', await seen('screen-seal-book'));
    await page.locator('[data-testid="i-will"]').fill('I will be out the back door before the kettle boils');
    await page.waitForTimeout(200);

    // hold: press, let the clock run past the hold duration, release
    const bar = page.locator('[data-testid="seal-hold"]').first();
    const box = await bar.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(2000);
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(400);
    await page.clock.runFor(1500);
    await page.waitForTimeout(800);

    check('the Book was sealed', await seen('screen-book'));
    if (await seen('screen-book')) {
      const firstSentence = await text('book-first-sentence');
      check('the Book opens with the user first sentence', IDEAL.includes(firstSentence), firstSentence);
      check('the I will line is in the Book', (await text('book-i-will')).includes('back door'));
    }

    // ---- Today
    await tap('book-still-true');
    await page.waitForTimeout(600);
    check('today renders', await seen('screen-today'));
    check('today quotes the Book', await seen('today-book-line'));

    const rows = await page.locator('[data-testid^="stone-mv"]').count();
    check('the plan produced at least one move on Today', rows > 0, `rows=${rows}`);

    if (rows > 0) {
      const before = await text('consistency');
      await page.locator('[data-testid^="stone-mv"]').first().click();
      await page.waitForTimeout(600);
      const after = await text('consistency');
      check('seating a stone moves consistency', before !== after, `${before} → ${after}`);
    }

    // ---- seal the day
    await tap('seal-day-button');
    check('seal-the-day screen', await seen('screen-seal-day'));
    await page.locator('[data-testid="seal-proof"]').fill('ten floors, twice, in the rain');
    await page.waitForTimeout(200);
    const bar2 = page.locator('[data-testid="seal-day-hold"]').first();
    const box2 = await bar2.boundingBox();
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.mouse.down();
    await page.clock.runFor(2000);
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.clock.runFor(1500);
    await page.waitForTimeout(900);
    check('sealing returns to today', await seen('screen-today'));

    // ---- the safety gate, on its own path
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(600);
    await page.locator('[data-testid="coach-input"]').fill('I want to kill myself');
    await tap('coach-send');
    await page.waitForTimeout(500);
    check('crisis language raises the resources card', await seen('safety-card'));
    if (await seen('safety-card')) {
      await tap('safety-continue');
      check('the card can be dismissed', !(await seen('safety-card')));
    }

    check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
  } catch (err) {
    check('the run completed', false, err instanceof Error ? err.message : String(err));
    await page.screenshot({ path: join(ROOT, 'e2e-failure.png') }).catch(() => undefined);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(results.join('\n'));
  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
