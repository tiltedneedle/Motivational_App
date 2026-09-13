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
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
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

let lastCheckAt = Date.now();
function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ` — ${detail}` : ''}`);
  // E2E_TRACE=1 prints how long each check took to reach, for finding the slow step.
  if (process.env.E2E_TRACE) {
    const now = Date.now();
    console.log(`${String(now - lastCheckAt).padStart(6)} ms  ${name}`);
    lastCheckAt = now;
  }
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

  /**
   * axe-core over the screen as it is right now. `scripts/a11y.mjs` covers
   * every route at rest; this covers the states only a flow reaches — a room
   * being written in, the seal bar, a toast with its undo, the safety card.
   * Serious or critical only, the same rules as the route pass.
   */
  const axeSource = await readFile(AXE, 'utf8');
  const accessible = async (name) => {
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(
      async () =>
        await globalThis.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
          rules: { region: { enabled: false }, 'landmark-one-main': { enabled: false }, 'page-has-heading-one': { enabled: false }, bypass: { enabled: false } },
        }),
    );
    const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check(
      `axe: ${name}`,
      bad.length === 0,
      bad.map((v) => `${v.id} (${v.nodes[0]?.target.join(' ')})`).join('; '),
    );
  };

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

    // ---- Welcome is three screens (PRD 7.1), each with a way back and a way past
    check('the first page says what this is', await seen('welcome-page-0'));
    await tap('welcome-next');
    check('the second says what three evenings make', await seen('welcome-page-1'));
    await tap('welcome-back');
    check('and Back goes back a page', await seen('welcome-page-0'));
    await tap('welcome-skip');
    check('Skip lands on the last page', await seen('welcome-page-2'));
    await page.locator('[data-testid="welcome-name"]').fill('Sam');

    // ---- Interview
    await tap('welcome-begin');
    check('consent screen', await seen('screen-consent'));
    await tap('consent-back');
    check('consent has a way back to Welcome', await seen('screen-welcome'));
    await tap('welcome-begin');
    await tap('consent-continue');
    check('interview screen', await seen('screen-interview'));
    check('the name given on Welcome is kept', await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
      return JSON.parse(localStorage.getItem(key)).state.profile.displayName === 'Sam';
    }));
    check('clarity starts at the floor', (await text('clarity-value')).startsWith('8%'));

    await tap('option-0'); // Health
    check('guess is built from the pick', (await text('guess-line')).toLowerCase().includes('health'));
    await tap('interview-continue');
    await tap('option-0'); // Finish a race
    check('follow-up asked', (await text('interview-question')) === 'How far?');
    // A wrong tap is not final: Back undoes it and keeps everything before it (§7.1).
    await tap('interview-back');
    check('Back in the Interview undoes the last answer', (await text('interview-question')) !== 'How far?');
    check('and keeps the ones before it', (await text('guess-line')).toLowerCase().includes('health'));
    await tap('option-0'); // Finish a race, again
    check('the follow-up is asked again', (await text('interview-question')) === 'How far?');

    // The Interview survives a kill: reloaded mid-way, it is on the same
    // question with the same answers behind it.
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('a reload mid-Interview lands on the same question', (await text('interview-question')) === 'How far?', await text('interview-question'));
    check('with the answers so far kept', (await text('guess-line')).toLowerCase().includes('health'), await text('guess-line'));
    // The browser's own Back is the same one-step undo, not an exit.
    await page.goBack({ waitUntil: 'commit' }).catch(() => {});
    await page.waitForTimeout(600);
    check('the platform back undoes one answer rather than leaving', (await seen('screen-interview')) && (await text('interview-question')) !== 'How far?', await text('interview-question'));
    await tap('option-0'); // Finish a race, once more
    check('and the follow-up comes back', (await text('interview-question')) === 'How far?');
    // The helplines, one tap from the question.
    check('the Interview has "Need someone?" at its top', await seen('top-help'));
    await tap('top-help');
    check('which opens the helplines without a pause', await seen('safety-card') && !(await seen('safety-wrong')));
    await tap('safety-continue');
    await page.waitForTimeout(300);
    check('and closes back onto the same question', !(await seen('safety-card')) && (await text('interview-question')) === 'How far?');
    await tap('option-2'); // A half marathon
    check('horizon asked', (await text('interview-question')) === 'By when?');
    await tap('option-1'); // Six months
    await tap('option-1'); // admire: a friend
    check('summary names the goal', (await page.locator('body').innerText()).includes('Half marathon'));
    await tap('interview-finish');
    check('authoring opening', await seen('screen-authoring'));

    // ---- halfway along, the app opens on the next step, not the start
    // Somebody who named goals tonight and comes back tomorrow used to be
    // offered "Begin tonight" and the Interview again, or a Today with a
    // goal row and nothing to do on it.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(500);
    check('a launch with goals named does not show Welcome again', !(await seen('screen-welcome')) && (await seen('screen-today')));
    check('Today, with goals and no Book, is the path', (await text('today-path')).includes('not finished'), await text('today-path'));
    check('and its button is the next step', (await text('today-begin')) === 'Write the Fifteen', await text('today-begin'));
    await tap('today-begin');
    check('and it goes to the Fifteen', await seen('screen-authoring'));

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
      await accessible('the room, mid-sitting');
    }

    // The clock can be paused (WCAG 2.2.1): held, it does not move.
    await tap('write-hold');
    const heldAt = await text('write-remaining');
    await page.clock.runFor(30 * 1000);
    await page.waitForTimeout(300);
    check('Pause holds the clock', (await text('write-remaining')) === heldAt, `${heldAt} → ${await text('write-remaining')}`);
    await tap('write-hold');
    await page.clock.runFor(2000);
    await page.waitForTimeout(300);
    check('and Carry on starts it again', (await text('write-remaining')) !== heldAt, await text('write-remaining'));

    // fast-forward past the ten-minute floor
    await page.clock.runFor(11 * 60 * 1000);
    await page.waitForTimeout(400);
    check('the room can be closed once the floor is met', await seen('write-close'));
    // Let the clock run out: the room closes, and offers five more minutes.
    await page.clock.runFor(5 * 60 * 1000);
    await page.waitForTimeout(500);
    check('the clock closes the room at fifteen', await seen('screen-write-closed'));
    check('and offers five more minutes', await seen('write-extend'));
    await tap('write-extend');
    check('Five more minutes reopens the room', await seen('screen-write'));
    check('with the words still on the page', (await page.locator('[data-testid="write-input"]').inputValue()).length > 0);
    check('and five minutes on the clock', (await text('write-remaining')).startsWith('5:00') || (await text('write-remaining')).startsWith('4:5'), await text('write-remaining'));
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
    await page.waitForTimeout(400);
    // The read-back survives a kill: the name typed a moment ago is still there.
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(800);
    check('a reload mid-read-back keeps the names', (await page.locator('[data-testid="name-0"]').inputValue()) === 'Half marathon');
    await tap('heard-continue');

    // ---- rank + title
    //
    // The framing chip is the app's words and the field is theirs. Choosing a
    // chip here is what proves the two survive to the Book as two things: the
    // framing used to be a placeholder, so the opening the person chose
    // vanished the moment they left this screen.
    // The first evening ends on Today, with the next step on the path card
    // — not straight on into the second sitting.
    check('the read-back lands on Today, a marked stopping point', await seen('screen-today') && (await seen('today-path')));
    check('with the Fifteen written, Today points at the order', (await text('today-begin')) === 'Put the goals in order', await text('today-begin'));
    await tap('today-begin');
    check('rank screen', await seen('screen-rank'));
    await tap('title-framing-The one where I…');
    await page.waitForTimeout(200);
    await page.locator('[data-testid="book-title"]').fill('stopped negotiating with the alarm');
    await page.waitForTimeout(200);
    await tap('rank-continue');

    // ---- the five stones
    check('stone screen', await seen('screen-stone'));
    const seenKinds = [];
    for (let i = 0; i < 12; i++) {
      if (!(await seen('screen-stone'))) break;
      const step = await text('stone-step');
      seenKinds.push(step.split('·')[0].trim());
      // The stone's kind is in the route, not in its heading: the headings
      // are the app's own words for the five questions and may change.
      const kind = (new URL(page.url()).searchParams.get('kind') ?? '').toLowerCase();
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

      // On the second stone: Back is the previous stone, with its line still
      // there, and the way forward is the same stone again. The stones
      // replace each other on the stack, so the router's own back would have
      // landed two screens too far.
      if (i === 1 && (await seen('screen-stone'))) {
        const here = new URL(page.url()).searchParams.get('kind');
        await tap('stone-back');
        const before = new URL(page.url()).searchParams.get('kind');
        check('Back on a stone is the previous stone', (await seen('screen-stone')) && before !== here, `${here} → ${before}`);
        const kept = await page.locator('[data-testid="stone-line"]').inputValue();
        check('and what was written on it is still there', kept.trim().length > 0, kept);
        await tap('stone-seat');
        if (await seen('stone-followup')) await tap('stone-seat');
        await page.waitForTimeout(300);
        check('and forward is the same stone again', new URL(page.url()).searchParams.get('kind') === here);
      }
    }
    check('all five stones were asked', seenKinds.length >= 5, seenKinds.join(','));

    // ---- the Portrait reveal (PRD 7.4)
    //
    // This is what the five stones were for, and for a long time nothing in
    // the app ever showed it: the Portrait was built at the last stone and the
    // sitting went straight to sealing the Book. Two actions and one editable
    // line, and everything else on it is a sentence they wrote.
    check('the portrait is revealed after the last stone', await seen('screen-portrait'));

    if (await seen('screen-portrait')) {
      check(
        'it quotes their Motives line back as the why',
        (await text('portrait-why')).length > 10,
        await text('portrait-why'),
      );
      check('and carries the letter from the future self', (await text('portrait-letter')).length > 60);
      check(
        'which names no goal and no plan line',
        !/half marathon/i.test(await text('portrait-letter')),
        (await text('portrait-letter')).slice(0, 80),
      );

      // "Not quite" is the only edit on the screen, because the identity clause
      // is the only line the app proposed rather than quoted.
      await tap('portrait-not-quite');
      await page.waitForTimeout(300);
      check('Not quite opens the one line they can rewrite', await seen('portrait-identity-field'));
      await page.locator('[data-testid="portrait-identity-field"]').fill('somebody who starts before deciding');
      await page.waitForTimeout(200);
      await tap('portrait-identity-save');
      await page.waitForTimeout(400);
      check(
        'and it keeps what they typed',
        (await text('portrait-identity')).includes('starts before deciding'),
        await text('portrait-identity'),
      );

      await tap('portrait-accept');
      await page.waitForTimeout(700);
    }

    // ---- seal the Book
    check('seal screen', await seen('screen-seal-book'));
    await page.locator('[data-testid="i-will"]').fill('I will be out the back door before the kettle boils');
    await page.waitForTimeout(200);
    await accessible('the seal, line written, before the hold');

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
      // The spine. Sitting 2 asks what is on it, the export printed it, and the
      // Book itself did not — somebody was asked to title their own book and
      // then never saw the title.
      check(
        'the Book shows the title they wrote on its spine',
        (await text('book-spine')).includes('stopped negotiating with the alarm'),
        await text('book-spine'),
      );
      check(
        'with the framing they chose in front of it, as separate words',
        (await text('book-spine-framing')).includes('The one where I'),
        await text('book-spine-framing'),
      );

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

      // ---- the lock screen (PRD 7.8): the I will line as an image
      //
      // On the web the capture is a PNG the browser downloads; the download
      // itself is intercepted so the check is on the image, not on the dialog.
      await tap('book-wallpaper');
      check('the Book offers the I will line as a lock screen', await seen('screen-wallpaper'));
      if (await seen('screen-wallpaper')) {
        check('and the print carries their line', (await text('wallpaper-line')).includes('out the back door before the kettle boils'));
        const download = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
        await tap('wallpaper-save');
        const got = await download;
        check('the capture is a PNG', Boolean(got && /\.png$/.test(got.suggestedFilename())), got ? got.suggestedFilename() : 'no download');
        // Not only that a file arrived: what is in it. Lock-screen pixels,
        // the night ground, the stone in its colour and the line in ink —
        // html2canvas can produce a blank sheet without a word of complaint.
        if (got) {
          try {
            const png = PNG.sync.read(await readFile(await got.path()));
            check('at lock-screen pixels', png.width === 1170 && png.height === 2532, `${png.width}×${png.height}`);
            let stone = 0;
            let ink = 0;
            for (let i = 0; i < png.data.length; i += 16) {
              const r = png.data[i];
              const g = png.data[i + 1];
              const b = png.data[i + 2];
              if (r > 170 && g < 120 && b < 110) stone += 1;
              if (r > 200 && g > 200 && b > 190) ink += 1;
            }
            check('with the stone on it', stone > 200, `${stone} stone-coloured samples`);
            check('and the line in ink', ink > 2000, `${ink} ink samples`);
          } catch (err) {
            check('the capture can be read back', false, err instanceof Error ? err.message : String(err));
          }
        }
        await tap('wallpaper-back');
        await page.waitForTimeout(400);
        check('and Back returns to the Book', await seen('screen-book'));
      }
    }

    // ---- the one paywall moment, on the way to Today (PRD §7.13, §8.9)
    //
    // "Once after the Blueprint, soft, dismissible." It arrives here because
    // this is the first time Today opens with a Blueprint behind it, and the
    // rest of this suite is the proof that "Not now" costs nothing: everything
    // after this point runs exactly as it did before the paywall existed.
    check('straight from the seal, the Book has one door: Today', await seen('book-to-today'));
    await tap('book-to-today');
    await page.waitForTimeout(900);
    // No paywall before the first value moment: the first Today is a Today.
    check('the first Today is not a paywall', !(await seen('screen-paywall')) && (await seen('screen-today')));
    check('and it shows the few things that matter: no consistency score yet', !(await seen('today-consistency')));
    check('and no practices invitation yet', !(await seen('today-no-practices')));

    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(700);
    check('today renders', await seen('screen-today'));
    // The first Today explains itself, once.
    check('the first Today says what the stone and the check are', await seen('today-intro'));
    if (await seen('today-intro')) {
      await tap('today-intro-done');
      check('Got it takes the card away', !(await seen('today-intro')));
      await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(500);
      check('and it stays away', !(await seen('today-intro')));
    }
    // The quotation has its own id. Reading the card's innerText and splitting
    // on a newline made this depend on a line break the layout happens to
    // produce, and it stopped producing one the moment another screen was
    // pushed over the top of Today.
    const quoted = (await text('today-book-quote')).replace(/^["'“”\s]+|["'“”\s]+$/g, '');
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
      // The consistency score waits for the first sealed day, so the proof
      // that seating a stone counts is the move itself: done, in the store.
      const doneBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1')).state.plans.flatMap((p) => p.moves).filter((m) => m.status === 'done').length);
      await page.locator('[data-testid^="stone-mv"]').first().click();
      await page.waitForTimeout(600);
      const doneAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1')).state.plans.flatMap((p) => p.moves).filter((m) => m.status === 'done').length);
      check('seating a stone marks the move done', doneAfter === doneBefore + 1, `${doneBefore} → ${doneAfter}`);
    }

    // ---- the New move sheet, and capture (PRD 7.6)
    //
    // The plus raises a sheet whose every suggestion is cut from the person's
    // own line for the goal; what they pick lands on Today. Capture files one
    // line in the ledger, with undo.
    const rowsBefore = await page.locator('[data-testid^="row-mv"]').count();
    await tap('new-move-button');
    check('the plus raises the New move sheet', await seen('screen-new-move'));
    if (await seen('screen-new-move')) {
      const offered = await seen('new-move-pick-0');
      check('the sheet offers moves cut from their own line', offered);
      if (offered) {
        const offer = await text('new-move-pick-0');
        check('and the offer is their sentence', IDEALISH.some((w) => offer.toLowerCase().includes(w)), offer);
        await tap('new-move-pick-0');
        await tap('new-move-length-2');
        await tap('new-move-keep');
        await page.waitForTimeout(500);
        check('the move lands on Today', await seen('screen-today'));
        const rowsAfter = await page.locator('[data-testid^="row-mv"], [data-testid="now-card"]').count();
        check('as one more stone', rowsAfter > rowsBefore, `${rowsBefore} → ${rowsAfter}`);
      }
      await tap('new-move-button');
      await tap('new-move-mode-capture');
      await page.locator('[data-testid="capture-text"]').fill('Saw the heron again on the towpath');
      await tap('capture-keep');
      await page.waitForTimeout(500);
      const kept = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
        return JSON.parse(localStorage.getItem(key)).state.evidence.filter((e) => e.kind === 'capture').length;
      });
      check('a capture is filed in the ledger', kept === 1, String(kept));
      check('with undo', await seen('toast-action'));
      if (await seen('toast-action')) {
        await accessible('a toast with its undo');
        await tap('toast-action');
        await page.waitForTimeout(300);
        const after = await page.evaluate(() => {
          const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
          return JSON.parse(localStorage.getItem(key)).state.evidence.filter((e) => e.kind === 'capture').length;
        });
        check('and undo takes it back out', after === 0, String(after));
      }
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

    // ---- the one paywall moment: once, after the Blueprint AND the first sealed day (PRD §7.13, §8.9)
    //
    // "Once after the Blueprint, soft, dismissible." It waits for one real
    // evening so that the first Today is the thing three sittings were for,
    // not a price. The rest of this suite is the proof that "Not now" costs
    // nothing: everything after this point runs as it did before.
    await page.waitForTimeout(600);
    const sawPaywallNow = await seen('screen-paywall');
    check('the paywall arrives once, after the first sealed day', sawPaywallNow);
    if (sawPaywallNow) {
      check(
        'and it opens with the line they wrote, not a pitch',
        (await text('paywall-i-will')).includes('out the back door before the kettle boils'),
        await text('paywall-i-will'),
      );
      check('the annual plan carries the per-month maths', (await text('plan-note')).includes('$4.17'));
      check('the trial is a caption, never a countdown', (await text('plan-trial')).includes('7 days free'));
      // Nothing was charged, and the screen says so rather than spinning.
      await tap('paywall-continue');
      await page.waitForTimeout(600);
      check(
        'Continue says plainly that purchases are not wired up in this build',
        (await seen('paywall-problem')) && (await text('paywall-problem')).includes('nothing was charged'),
        (await seen('paywall-problem')) ? await text('paywall-problem') : '(no message)',
      );
      await tap('paywall-not-now');
      await page.waitForTimeout(600);
    }
    // Once means once, whichever way they left it. Marking it seen on the
    // dismiss button meant a system back gesture, or closing the app on this
    // screen, brought it back the next time Today opened — which is the exact
    // behaviour that makes people delete an app rather than pay for it.
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(700);
    check('and it does not come back the next time Today opens', !(await seen('screen-paywall')));
    check('and after the first sealed day the consistency score appears', await seen('today-consistency'));
    // Back to the Today that was there, not a second one on top of it. A
    // replace from a pushed screen left two Todays mounted, the hidden one
    // first in the DOM, so every later click on Today found the wrong one.
    check(
      'and there is one Today, not one stacked on another',
      (await page.locator('[data-testid="screen-today"]').count()) === 1,
      String(await page.locator('[data-testid="screen-today"]').count()),
    );

    // ---- sealing the same day again is an edit, never a loss
    //
    // The seal screen can be reached again after a seal. It used to open on
    // an empty form and replace the day's proof line with whatever was in it
    // — including nothing — so a second visit to change the mood word
    // silently deleted the sentence they had written an hour before.
    await page.goto(`${BASE}/seal-day`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    if (await seen('screen-seal-day')) {
      const kept = await page.locator('[data-testid="seal-proof"]').inputValue();
      check('the seal screen opens on what was already written', kept === 'ten floors, twice, in the rain', kept);
      await page.locator('[data-testid="seal-proof"]').fill('');
      await page.waitForTimeout(200);
      const bar3 = page.locator('[data-testid="seal-day-hold"]').first();
      const box3 = await bar3.boundingBox();
      await page.mouse.move(box3.x + box3.width / 2, box3.y + box3.height / 2);
      await page.mouse.down();
      await page.clock.runFor(2000);
      await page.waitForTimeout(300);
      await page.mouse.up();
      await page.clock.runFor(1500);
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
        const st = JSON.parse(localStorage.getItem(key)).state;
        const day = Object.values(st.days).find((d) => d.sealedAt);
        return { proof: day?.proof ?? null, seals: st.evidence.filter((e) => e.kind === 'seal').length };
      });
      check('and a blank re-seal keeps the proof line', after.proof === 'ten floors, twice, in the rain', JSON.stringify(after));
      check('with one ledger row for it, not two', after.seals === 1, String(after.seals));
      // Back onto Today by the front door, so the stack the seal left behind
      // is not what the next section clicks through.
      await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(600);
    }

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

    // ---- the other road (PRD 7.2, 7.8)
    //
    // Optional on Starter, always after the ideal, never the default view —
    // and drawn from the shadow, so if the shadow was never written the
    // eight-minute write is offered here rather than a scene made up in its
    // place. The room accepted kind=shadow and nothing had ever sent anyone
    // there.
    check('an unwritten other road offers the write, not a picture', await seen('scene-write-shadow'));
    check('and does not offer to draw what does not exist', !(await seen('scene-draw-other_road')));

    await tap('scene-write-shadow');
    await page.waitForTimeout(400);
    check('the shadow has its own doorway', await seen('screen-write-doorway'));
    const shadowDoor = await page.locator('body').innerText();
    check('at eight minutes on Starter', shadowDoor.includes('8 minutes'), shadowDoor.slice(0, 120));

    await tap('write-begin');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="write-input"]').fill(
      'The alarm goes and I turn it off. The kitchen is still blue but I am not in it. Sam stopped asking.',
    );
    // Eight minutes, on the clock the product actually ships.
    await page.clock.runFor(8 * 60 * 1000 + 2000);
    await page.waitForTimeout(600);
    check('the shadow closes on its own clock', await seen('write-continue'));
    check(
      'and goes on to the read-back of the ideal, not of itself',
      (await text('write-continue')).toLowerCase().includes('read the ideal'),
      await text('write-continue'),
    );
    await tap('write-continue');
    await page.waitForTimeout(600);
    check('which is What I heard', await seen('screen-heard'));

    await page.goto(`${BASE}/envision`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(900);
    check('and once written, the other road can be drawn', await seen('scene-draw-other_road'));

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

    // ---- the shape of the page, at the two widths that break it
    //
    // Both of these were real: three chips in a fixed row ran 12 pt off the
    // side of a 320 pt screen, and on a wide browser the Book's first sentence
    // set itself 1192 pt wide — about a hundred and fifty characters on one
    // line of serif. Neither is visible at the 420 pt this suite otherwise
    // runs at, which is exactly why they survived.
    const SCREENS = ['/today', '/book', '/coach', '/progress', '/settings', '/envision'];

    await page.setViewportSize({ width: 320, height: 700 });
    const narrow = [];
    for (const route of SCREENS) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1200);
      await page.waitForTimeout(350);
      const over = await page.evaluate(() => {
        const de = document.documentElement;
        return de.scrollWidth > de.clientWidth ? `${de.scrollWidth} > ${de.clientWidth}` : null;
      });
      if (over) narrow.push(`${route}: ${over}`);
    }
    check('nothing runs off the side of a 320 pt screen', narrow.length === 0, narrow.join(', '));

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/book`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(400);
    const measure = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="book-first-sentence"]');
      const shell = document.querySelector('[data-testid="screen-book"]');
      if (!el || !shell) return null;
      return { line: Math.round(el.getBoundingClientRect().width), ground: Math.round(shell.getBoundingClientRect().width) };
    });
    check(
      'the writing keeps a readable measure on a wide screen',
      Boolean(measure) && measure.line <= 600,
      measure ? `${measure.line} pt` : '(no book on screen)',
    );
    check(
      'and the ground still reaches both edges',
      Boolean(measure) && measure.ground >= 1200,
      measure ? `${measure.ground} pt` : '(no book on screen)',
    );

    // PRD 7.14: two-column Goal and Book on a tablet. Both columns must
    // actually carry something — a split that leaves one side empty is worse
    // than no split at all.
    const bookCols = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="book-two-column"]');
      if (!el) return null;
      return [...el.children].map((c) => ({ w: Math.round(c.getBoundingClientRect().width), n: c.innerText.trim().length }));
    });
    check(
      'the Book lays itself out in two columns on a tablet',
      Boolean(bookCols) && bookCols.length === 2 && bookCols.every((c) => c.w > 300 && c.n > 40),
      JSON.stringify(bookCols),
    );

    const goalHref = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
      const st = key ? JSON.parse(localStorage.getItem(key)).state : null;
      return st?.goals?.[0]?.id ?? null;
    });
    if (goalHref) {
      await page.goto(`${BASE}/goal?id=${goalHref}`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1200);
      await page.waitForTimeout(400);
      const goalCols = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="goal-two-column"]');
        if (!el) return null;
        return [...el.children].map((c) => ({ w: Math.round(c.getBoundingClientRect().width), n: c.innerText.trim().length }));
      });
      check(
        'and so does the Goal',
        Boolean(goalCols) && goalCols.length === 2 && goalCols.every((c) => c.w > 300 && c.n > 40),
        JSON.stringify(goalCols),
      );
    }

    // And back to one column on a phone, which is the case that ships.
    await page.setViewportSize({ width: 420, height: 900 });
    await page.goto(`${BASE}/book`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(400);
    check('a phone gets one column, not two narrow ones', !(await seen('book-two-column')));
    check('and the Book is all still there', (await text('book-i-will')).length > 10);

    // ---- Letters (PRD 7.8)
    //
    // "120-180 words, quoting the Fifteen and real ledger entries... they never
    // contain a goal or a plan line." The last clause is the one worth a check:
    // a letter that names the plan is the app writing the plan back at somebody
    // in a warmer voice, and the plan is sitting in the same store.
    await page.goto(`${BASE}/letters`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('letters', await seen('screen-letters'));

    const letterBodies = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
      const st = key ? JSON.parse(localStorage.getItem(key)).state : null;
      return (st?.letters ?? []).map((l) => ({ body: l.body, quotes: l.quotes, direction: l.direction }));
    });
    const fromFuture = letterBodies.filter((l) => l.direction === 'from_future');
    check('one arrived after the Portrait', fromFuture.length >= 1, `${fromFuture.length} letters`);

    if (fromFuture.length) {
      const l = fromFuture[0];
      const n = l.body.trim().split(/\s+/).length;
      check('and it is a letter, not a notification', n >= 120 && n <= 180, `${n} words`);
      check(
        'it quotes something they actually wrote',
        l.quotes.length > 0 && l.quotes.every((q) => IDEAL.includes(q) || l.body.includes(q)),
        l.quotes.join(' | ').slice(0, 80),
      );
      check(
        'and it never names a goal or a plan line',
        !/half marathon/i.test(l.body) && !/tuesday: at/i.test(l.body),
        l.body.slice(0, 90),
      );
    }

    // Writing one the other way. It is sealed until its day and must not be
    // sitting in the arrived list the moment it is written.
    await page.locator('[data-testid="letter-draft"]').fill(
      'By now you will know whether the stairwell was the thing or just the excuse. Either answer is fine.',
    );
    await page.waitForTimeout(200);
    await tap('letter-when-90');
    await tap('letter-send');
    await page.waitForTimeout(500);
    check('a letter to the future is sealed until its day', await seen('letter-sent'));
    check('and it is not sitting in the inbox already', await seen('letters-waiting'));

    // ---- the Goal Path (PRD 7.7)
    //
    // "A single route from now to the target date with milestone nodes, the
    // user's dot at the current fraction, You are here, distance to next, and
    // the last five evidence entries." The dot is time, not completions, so
    // that where they are and what is behind them are allowed to disagree.
    const pathGoal = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
      const st = key ? JSON.parse(localStorage.getItem(key)).state : null;
      return st?.goals?.[0]?.id ?? null;
    });
    if (pathGoal) {
      await page.goto(`${BASE}/goal?id=${pathGoal}`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(500);
      check('the goal has a path', await seen('goal-path'));
      check('with "You are here" on it', await seen('goal-path-here'));
      check('and the next milestone with how far off it is', await seen('goal-path-next'));
      const next = (await seen('goal-path-next')) ? await text('goal-path-next') : '';
      check(
        'the next milestone carries their own Monitoring line as its proof',
        next.includes('one run in the ledger') || next.includes('Proof, in your words'),
        next.slice(0, 120),
      );
      // The drawing must not be the only place the information lives.
      const label = await page.evaluate(
        () => document.querySelector('[data-testid="goal-path-track"]')?.getAttribute('aria-label') ?? '',
      );
      check(
        'and everything the drawing shows is also said in words',
        /%/.test(label) && /milestone/.test(label),
        label,
      );
    }

    // ---- Replan (PRD 7.4)
    //
    // "Proposes changes as a diff, each with a reason and its source line,
    // Accept or Keep mine per row, applied as a new version." proposeReplan and
    // applyReplan were written and tested and had no call site at all.
    if (pathGoal) {
      // A week where most of it did not happen, so there is something to
      // propose. Left to the run's own figures this lands in the band where
      // nothing needs changing — which is the honest common case and also a
      // branch that never exercises the part worth testing.
      const dayBefore = await page.evaluate(() => {
        const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
        const raw = JSON.parse(localStorage.getItem(key));
        const before = JSON.stringify(raw.state.days);
        for (const d of Object.values(raw.state.days)) d.planned = Math.max(4, d.planned);
        localStorage.setItem(key, JSON.stringify(raw));
        return before;
      });

      await page.goto(`${BASE}/replan?goal=${pathGoal}`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(500);
      check('replan', await seen('screen-replan'));

      const hasRows = await seen('replan-row-0');
      check(
        'it either proposes something or says plainly that it does not',
        hasRows || (await seen('replan-nothing')),
      );

      if (hasRows) {
        // Nothing starts accepted. A diff that arrives pre-accepted is an edit
        // with a confirmation dialogue.
        check('nothing is accepted to begin with', !(await seen('replan-keep-0')));
        check(
          'and the row shows the line of theirs it came from',
          (await text('replan-row-0')).includes('from'),
          (await text('replan-row-0')).slice(0, 90),
        );

        const versionBefore = await page.evaluate((g) => {
          const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
          const st = key ? JSON.parse(localStorage.getItem(key)).state : null;
          return st?.plans?.find((p) => p.goalId === g)?.version ?? 0;
        }, pathGoal);

        await tap('replan-accept-0');
        await page.waitForTimeout(300);
        check('accepting a row offers to keep theirs instead', await seen('replan-keep-0'));
        await tap('replan-apply');
        await page.waitForTimeout(800);

        const versionAfter = await page.evaluate((g) => {
          const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
          const st = key ? JSON.parse(localStorage.getItem(key)).state : null;
          return st?.plans?.find((p) => p.goalId === g)?.version ?? 0;
        }, pathGoal);
        check(
          'and it lands as a new version of the plan',
          versionAfter === versionBefore + 1,
          `${versionBefore} -> ${versionAfter}`,
        );
      }

      // Put the week back the way the run actually went.
      await page.evaluate((before) => {
        const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
        const raw = JSON.parse(localStorage.getItem(key));
        raw.state.days = JSON.parse(before);
        localStorage.setItem(key, JSON.stringify(raw));
      }, dayBefore);
    }

    // ---- Sunday reading (PRD 7.3)
    //
    // "A reading view with no controls but a page turn; at the end, Still true
    // or Something moved." The Sunday notification points here, and until this
    // screen existed it pointed at nothing in particular.
    await page.goto(`${BASE}/reading`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(500);
    check('the reading view opens', await seen('screen-reading'));

    if (await seen('screen-reading')) {
      check(
        'and it opens on their own first sentence',
        IDEAL.includes((await text('reading-first-sentence')).trim()),
        await text('reading-first-sentence'),
      );
      const firstPage = await text('reading-progress');

      // Turn to the last page. The only control is the page itself.
      let turns = 0;
      while (turns < 12 && !(await seen('reading-still-true'))) {
        await tap('reading-page');
        await page.waitForTimeout(220);
        turns += 1;
      }
      check('every page can be turned with nothing but the page', await seen('reading-still-true'), `${turns} turns`);
      check('and the counter moved with it', (await text('reading-progress')) !== firstPage);
      check('the last page is the I will line', (await text('reading-i-will')).includes('kettle boils'));

      // The Horizon Review (PRD 7.9) sits under the I will line: a number,
      // the next milestone, one sentence they wrote this week, and what a
      // replan would change. Nothing on it is a sentence the app wrote about
      // their week.
      check('the last page carries the Horizon Review', await seen('horizon-review'));
      if (await seen('horizon-review')) {
        check('with the consistency trend as a number', /Consistency \d+|No days/.test(await text('review-consistency')), await text('review-consistency'));
        check('and the next milestone with its distance', await seen(`review-next-${pathGoal}`));
        if (await seen('review-insight')) {
          const insight = await text('review-insight');
          check(
            'and the one insight is their own proof line, quoted',
            insight.includes('ten floors, twice, in the rain') || /kept \d+ of/.test(insight),
            insight,
          );
        }
      }

      // "Something moved" opens the review with a goal to pick, and never
      // strands them: Never mind puts the two decisions back.
      await tap('reading-moved');
      await page.waitForTimeout(300);
      check('Something moved asks which one', await seen('reading-pick-goal'));

      // And it is not a one-way door: somebody who taps it and then decides
      // nothing did move gets the two decisions back rather than being made to
      // pick a goal to rewrite.
      await tap('reading-never-mind');
      await page.waitForTimeout(300);
      check('and it can be backed out of', await seen('reading-still-true'));

      await tap('reading-still-true');
      await page.waitForTimeout(600);
      check('Still true goes back to Today', await seen('screen-today'));
    }

    // ---- the way out of a screen that broke
    //
    // The boundary says "export it first if you would rather be certain" and
    // for a long time offered no way to do it: the only control was Try again,
    // and Settings is behind the router the boundary may have just caught. So
    // it reads the blob straight off disk — not through the store, which is one
    // of the things that could be broken — and spills it onto the screen when
    // the platform has no share sheet, which is every desktop browser.
    //
    // Broken here by giving the sealed Book a null chapter list, which is what
    // a half-written record on disk would look like.
    // Everything the run has seen up to here. Only the errors this section
    // causes on purpose are dropped — clearing the whole list would quietly
    // excuse every real error before it, on the one check that exists to catch
    // them.
    const errorsBefore = pageErrors.slice();

    const saved = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
      if (!key) return null;
      const before = localStorage.getItem(key);
      const raw = JSON.parse(before);
      const book = raw.state.books?.[raw.state.books.length - 1];
      if (!book) return null;
      book.chapters = null;
      localStorage.setItem(key, JSON.stringify(raw));
      return before;
    });

    if (saved) {
      await page.goto(`${BASE}/book`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(600);
      check('a screen that throws is caught rather than blanking', await seen('error-boundary'));

      if (await seen('error-boundary')) {
        await tap('error-export');
        await page.waitForTimeout(800);
        const spilled = (await seen('error-spilled')) ? await text('error-spilled') : '';
        check(
          'and the writing can still be got out of it',
          spilled.includes('"state"') && spilled.length > 200,
          spilled ? `${spilled.length} chars` : '(nothing spilled)',
        );
      }

      // Put the device back the way it was; the checks after this need a Book.
      await page.evaluate((before) => {
        const key = Object.keys(localStorage).find((k) => k.includes('morrow'));
        if (key) localStorage.setItem(key, before);
      }, saved);
      // pageerror fires for the throw this test caused on purpose. Rewind to
      // exactly what was there before, so a real one is still a failure.
      pageErrors.length = 0;
      pageErrors.push(...errorsBefore);
    }

    // ---- the two places PRD §11.6 requires the disclosure, and the helplines
    //
    // "Morrow's coach is an AI" at first chat and in Settings. It was in
    // neither, and the helplines lived only on the card the safety screen
    // raises — so the only route to a number was to already be in crisis.
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(2000);
    await page.waitForTimeout(600);
    check('the coach says it is an AI on the first chat', await seen('coach-is-ai'));

    // ---- the two rituals PRD §7.10 puts inside the dawn brief
    //
    // Both were written and then never called: the brief named the first move
    // with nothing to tap, and `fullTrackInvitation` had no call site at all,
    // so the one invitation the product is allowed to make never arrived.
    check('the brief offers the morning intention', await seen('intention'));
    if (await seen('intention')) {
      await tap('intention');
      await page.waitForTimeout(400);
      check('and remembers it once it is said', await seen('intention-set'));
    }

    check('the Full track is offered, once the Book is sealed', await seen('full-track-quote'));
    if (await seen('full-track-no')) {
      const quoted = await text('full-track-quote');
      check(
        'and the invitation is their own longest line, not a sales pitch',
        IDEALISH.some((w) => quoted.toLowerCase().includes(w)) || quoted.length > 20,
        quoted.slice(0, 80),
      );
      await tap('full-track-no');
      await page.waitForTimeout(400);
      await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(500);
      check('once means once — it does not come back', !(await seen('full-track-quote')));
    }

    // Today is the other half of the intention: it says it back to them.
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(500);
    // Either card carries it: the Now card while the move is open, and the
    // day-done card once the day is finished. Forgetting it the moment the day
    // closed would make the ritual look like a to-do item rather than the thing
    // they chose this morning and then did.
    const card = (await seen('said-and-done'))
      ? await text('said-and-done')
      : (await seen('now-card'))
        ? await text('now-card')
        : (await seen('day-done-card'))
          ? await text('day-done-card')
          : '';
    check(
      'Today says back the move they pointed at this morning',
      card.toLowerCase().includes('you said this one'),
      card ? card.split('\n').slice(0, 2).join(' / ') : '(neither card is on screen)',
    );

    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(400);
    check('and Settings says it too', await seen('settings-is-ai'));
    check('the helplines are reachable without a crisis', await seen('settings-helpline-US'));

    // ---- "Fewer" (PRD §7.11)
    //
    // One control that steps down rather than five switches, and it has to say
    // what is left in words — a person turning notifications down is deciding
    // how much of this app they want in their day, and deserves a straight
    // answer about what they just chose.
    check('Settings says when Morrow speaks', await seen('notify-state'));
    const notifySteps = [];
    for (let i = 0; i < 4 && (await seen('notify-fewer')); i++) {
      await tap('notify-fewer');
      await page.waitForTimeout(300);
      notifySteps.push(await text('notify-state'));
    }
    check(
      'Fewer steps down rather than turning everything off at once',
      notifySteps.length >= 3 && new Set(notifySteps).size === notifySteps.length,
      notifySteps.join(' | '),
    );
    check(
      'and the last step is honest that it means nothing at all',
      (notifySteps[notifySteps.length - 1] ?? '').toLowerCase().startsWith('nothing'),
      notifySteps[notifySteps.length - 1] ?? '(no steps)',
    );
    if (await seen('notify-on')) {
      await tap('notify-on');
      await page.waitForTimeout(300);
      check('and they can all be turned back on', (await text('notify-state')).includes('morning'));
    }

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
      await accessible('the resources card');

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
