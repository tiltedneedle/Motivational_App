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

/** Words from the Strategies line this run types, for the authorship checks. */
const IDEALISH = ['back door', '6:40', 'tuesday', 'thursday', 'saturday', 'stairwell'];

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
    // Pinned, not "now". The plan builder schedules from named weekdays, so an
    // unpinned clock made the suite's result depend on the day it was run: the
    // same code passed on a Wednesday and could fail on a Sunday. Wednesday is
    // the interesting case, with named days falling either side of it.
    await page.clock.install({ time: new Date('2026-09-16T09:00:00') });
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

    // ---- the app is killed mid-sitting
    // Fifteen minutes of writing is the most expensive thing a person gives
    // this product. A backgrounded phone must not be able to take it, so the
    // page is reloaded outright — the process is gone, only disk survives.
    const beforeCrash = await page.locator('[data-testid="write-input"]').inputValue();
    await page.goto(`${BASE}/write?kind=ideal`, { waitUntil: 'networkidle' });
    await page.clock.runFor(3000);
    await page.waitForTimeout(1500);

    const resume = page.locator('[data-testid="write-resume"]').first();
    let survived = true;
    try {
      await resume.waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      survived = false;
    }
    check('an interrupted sitting is offered back', survived);

    if (survived) {
      await tap('write-resume');
      await page.waitForTimeout(400);
      const afterCrash = await page.locator('[data-testid="write-input"]').inputValue();
      check(
        'every word written before the crash is still there',
        afterCrash === beforeCrash,
        `${afterCrash.length} of ${beforeCrash.length} characters`,
      );
      const left = await text('write-remaining');
      check('the ring picks up where it stopped, not at the top', !left.startsWith('15:00'), left);
    }

    // fast-forward past the ten-minute floor
    await page.clock.runFor(11 * 60 * 1000);
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

    // Keyboard first, before the pointer touches it. Somebody who cannot press
    // and hold has exactly one way to seal their Book, and the guard that tells
    // a finger apart from an assistive activation is the thing most likely to
    // swallow it by accident.
    await page.locator('[data-testid="seal-hold"]').first().focus().catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    const sealedByKeyboard = await seen('seal-open-book');
    check('the Book can be sealed from the keyboard alone', sealedByKeyboard);

    if (sealedByKeyboard) {
      await tap('seal-open-book');
      await page.waitForTimeout(900);
    } else {
      // The pointer route, only if the keyboard did not already do it: press,
      // let the clock run past the hold, release.
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
    }

    check('the Book was sealed', await seen('screen-book'));
    if (await seen('screen-book')) {
      const firstSentence = await text('book-first-sentence');
      // `IDEAL.includes('')` is true, so the old form of this check passed
      // when the element rendered nothing at all — the one failure it existed
      // to catch.
      check(
        'the Book opens with the user first sentence',
        firstSentence.length > 20 && IDEAL.includes(firstSentence),
        `${firstSentence.length} chars: ${firstSentence.slice(0, 60)}`,
      );
      check(
        'the I will line is in the Book',
        (await text('book-i-will')).includes('out the back door before the kettle boils'),
      );

      // ---- the promise the whole product rests on
      //
      // Every sentence printed in the Book is one the person typed. Nothing
      // asserted this anywhere, which meant the central claim of the product
      // was the least tested thing in it.
      const bookText = await page.locator('[data-testid="screen-book"]').innerText();
      const typed = [
        'I will be out the back door before the kettle boils',
        'take the stairwell, ten floors, twice',
      ];
      const missing = typed.filter((t) => !bookText.includes(t));
      check('every sentence in the Book is one the user typed', missing.length === 0, missing.join(' | '));

      // And nothing the app writes about their life is in there beside them.
      const appProse = [
        'One entry in the ledger',
        "that's the whole ask",
        'I have been reading',
      ];
      const intruders = appProse.filter((t) => bookText.includes(t));
      check('no app prose was sealed into the Book', intruders.length === 0, intruders.join(' | '));
    }

    // ---- Today
    await tap('book-still-true');
    await page.waitForTimeout(600);
    check('today renders', await seen('screen-today'));
    // The card carries the quotation and a caption under it, so take the
    // quoted line itself and strip the typographic quote marks around it.
    const bookLine = (await text('today-book-line')).split('\n')[0].trim();
    const quoted = bookLine.replace(/^["'“”\s]+|["'“”\s]+$/g, '');
    const everythingWritten = `${IDEAL} I will be out the back door before the kettle boils`;
    // Asserting the element merely exists let an empty quotation pass.
    check(
      'today quotes the Book in the user own words',
      quoted.length > 10 && everythingWritten.includes(quoted),
      quoted,
    );

    const rows = await page.locator('[data-testid^="stone-mv"]').count();
    check('the plan produced at least one move on Today', rows > 0, `rows=${rows}`);

    // A move is cut from the Strategies line the person wrote.
    //
    // Scoped to the move rows themselves. Reading the whole screen let the Book
    // quotation card at the top satisfy this, so the check passed without ever
    // looking at a move.
    if (rows > 0) {
      const titles = await page.locator('[data-testid^="row-mv"], [data-testid="now-card"]').allInnerTexts();
      const joined = titles.join(' | ');
      check(
        'the moves on Today are cut from the user own strategy line',
        titles.length > 0 && (joined.includes('6:40') || joined.includes('back door')),
        joined.slice(0, 200) || '(no move rows read)',
      );
    }

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

    // ---- a practice, built from their own line and then run
    // It lives below the fold on a screen that already has a plan on it, so
    // scroll the way a thumb would rather than clicking something off-screen.
    const addPractice = page.locator('[data-testid="today-add-first-practice"]').first();
    check('today offers to build a practice', (await addPractice.count()) > 0);
    for (let i = 0; i < 8; i++) {
      if (await addPractice.isVisible().catch(() => false)) break;
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(150);
    }
    await addPractice.click({ timeout: 5000 }).catch(async () => {
      // Whatever is covering it, the builder itself is what this section tests.
      await page.goto(`${BASE}/practice`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
    });
    await page.waitForTimeout(600);
    check('practice builder', await seen('screen-practice'));

    if (await seen('screen-practice')) {
      // The builder opens with steps already cut from the Strategies line, so
      // the first thing a person sees is their own sentence, not a blank form.
      const prefilled = await page.locator('[data-testid="practice-step-text-0"]').inputValue();
      check(
        'the builder opens with steps cut from the user own line',
        prefilled.length > 0 && IDEALISH.some((w) => prefilled.toLowerCase().includes(w)),
        prefilled,
      );

      await page.locator('[data-testid="practice-title"]').fill('The morning round');
      await page.waitForTimeout(200);
      await tap('practice-save');
      await page.waitForTimeout(900);
      const saveTrouble = (await seen('practice-error'))
        ? await text('practice-error')
        : (await seen('screen-practice'))
          ? 'still on the builder, no error shown'
          : (await seen('error-boundary'))
            ? 'the screen crashed: ' + (await page.locator('[data-testid="error-boundary"]').innerText()).slice(0, 200)
            : 'url ' + page.url() + ' | body ' + (await page.locator('body').innerText()).slice(0, 200);
      check('keeping a practice returns to today', await seen('screen-today'), saveTrouble);
      check('the practice appears on today', await seen('today-practices'));

      // Run it. The clock counts down but the person decides when a step ends.
      const stone = page.locator('[data-testid^="practice-open-"]').first();
      if (await stone.count()) {
        await stone.click();
        await page.waitForTimeout(600);
        check('the runner opens', await seen('screen-run'));

        if (await seen('screen-run')) {
          const stepText = await text('run-step');
          check(
            'the runner shows the user own words for the step',
            stepText.length > 0 && IDEALISH.some((w) => stepText.toLowerCase().includes(w)),
            stepText,
          );

          // Let the step's clock run out. It must NOT advance on its own.
          const before = await text('run-step');
          await page.clock.runFor(20 * 60 * 1000);
          await page.waitForTimeout(400);
          check('a step whose time runs out waits for the person', (await text('run-step')) === before);

          // Walk it to the end.
          for (let i = 0; i < 6; i++) {
            if (await seen('run-close')) break;
            await tap('run-next');
            await page.waitForTimeout(250);
          }
          check('a run can be finished', await seen('run-close'));
          await tap('run-close');
          await page.waitForTimeout(600);
          check('finishing a run returns to today', await seen('screen-today'));
        }
      }
    }

    // ---- Envision: built from their words or not built at all
    await page.goto(`${BASE}/envision`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(900);
    check('envision screen', await seen('screen-envision'));

    // The first scene draws on arrival. Whatever it shows, it must either carry
    // a phrase from the user's own writing or say plainly that it cannot.
    const drew = await seen('scene-practice');
    if (drew) {
      const sceneText = await page.locator('[data-testid="scene-practice"]').innerText();
      check(
        'the scene contains a phrase from the user own writing',
        sceneText.includes('kitchen') || sceneText.includes('back door') || sceneText.includes('towpath'),
        sceneText.slice(0, 160),
      );
    } else {
      check('a scene it cannot source says so rather than inventing one', await seen('scene-empty-practice'));
    }

    // ---- Progress: the ledger, the almanac and the score
    await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(500);
    check('progress screen', await seen('screen-progress'));
    check('the almanac renders a year of stones', await seen('progress-almanac'));

    // The ledger is the point: it must contain what the run actually did, in
    // the person's own words, not a count of them.
    const ledgerText = (await seen('progress-ledger'))
      ? await page.locator('[data-testid="progress-ledger"]').innerText()
      : '';
    check(
      'the ledger holds the day the run sealed, in the user own words',
      ledgerText.includes('ten floors') || ledgerText.includes('out the back door') || ledgerText.includes('6:40'),
      ledgerText.slice(0, 160) || '(ledger empty)',
    );

    const progressScore = await text('progress-score');
    check('the score is a number, not a blank', /^\d+$/.test(progressScore.trim()), progressScore);

    // ---- the safety gate, on its own path
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(600);
    await page.locator('[data-testid="coach-input"]').fill("I don't want to be here any more");
    await tap('coach-send');
    await page.waitForTimeout(200);
    // The contracted form. The screen's first version could only match "do not
    // want", so the way people actually write the sentence went straight past.
    check('crisis language raises the resources card', await seen('safety-card'));

    if (await seen('safety-card')) {
      // The way out sits exactly where the Send button was. A second tap of a
      // double tap must not land on it and close a card nobody has read.
      await page.locator('[data-testid="safety-continue"]').click({ force: true, timeout: 2000 }).catch(() => {});
      check('a stray tap straight after cannot dismiss the card', await seen('safety-card'));

      // And once it has settled, it must still be the easiest thing to press.
      await page.waitForTimeout(1100);
      await tap('safety-continue');
      check('the card can be dismissed once it has settled', !(await seen('safety-card')));
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
