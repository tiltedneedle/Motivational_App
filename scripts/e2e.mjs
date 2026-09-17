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
import { mkdir, readFile, stat } from 'node:fs/promises';
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

  /**
   * The journey, frame by frame. With JOURNEY=<dir> every tap is followed by
   * a screenshot named in sequence, so the whole first run and all three
   * volumes can be read as a person sees them — the checks read the DOM;
   * this is for the eye. `pnpm test:e2e` alone captures nothing.
   */
  const journey = process.env.JOURNEY ? join(ROOT, process.env.JOURNEY) : null;
  if (journey) await mkdir(journey, { recursive: true });
  let frame = 0;
  const snap = async (id) => {
    if (!journey) return;
    frame += 1;
    await page.screenshot({ path: join(journey, `${String(frame).padStart(3, '0')}-${id.replace(/[^a-z0-9-]/gi, '_')}.png`) }).catch(() => {});
  };
  const tap = async (id) => {
    const el = page.locator(`[data-testid="${id}"]`).first();
    await el.waitFor({ state: 'visible', timeout: 10_000 });
    await el.click();
    await page.waitForTimeout(320);
    await snap(id);
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
    // The 16+ gate (PRD 12): Continue waits for the affirmation.
    check('consent has the age gate', (await seen('consent-age')) && (await seen('consent-age-note')));
    check('and Continue waits for it', (await page.locator('[data-testid="consent-continue"]').getAttribute('aria-disabled')) === 'true' || (await page.locator('[data-testid="consent-continue"]').isDisabled()));
    await tap('consent-age');
    await page.waitForTimeout(200);
    check('one tap, and the note is gone', !(await seen('consent-age-note')));
    await tap('consent-continue');

    // ---- the three doors (client decision, 2026-09-15)
    //
    // Consent leads to a choice, not into one volume: the source sells its
    // programs separately and tells people to pick. Every door is reachable,
    // in any order, and the fourth explains all three.
    check('consent leads to the three doors', await seen('screen-choose'));
    check('the heading is the client’s own', (await text('choose-heading')) === 'Work on your:', await text('choose-heading'));
    for (const door of ['past', 'present', 'future']) {
      check(`the ${door} door is there`, await seen(`door-${door}`));
    }
    check('and Future is marked as the one Today comes from', await seen('door-future-badge'));
    await tap('choose-explore');
    check('door four explains all three', await seen('screen-explore'));
    for (const v of ['past', 'present', 'future']) check(`it says what ${v} is`, await seen(`explore-${v}`));
    const route = await text('explore-order-steps');
    check(
      'and offers the source’s order, with both halves of Present named',
      route.indexOf('faults') < route.indexOf('Future') && route.indexOf('Future') < route.indexOf('virtues') && route.indexOf('virtues') < route.indexOf('Past'),
      route,
    );
    check('and lets you choose from that screen', await seen('explore-pick-future'));
    await tap('explore-pick-future');

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
    // Killed mid-Interview and opened again: Today, not Welcome page one, and
    // the one button resumes the same question.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('a relaunch mid-Interview opens on Today, not on Welcome again', (await seen('screen-today')) && !(await seen('screen-welcome')));
    check('which says a sitting is kept', (await text('today-path')).toLowerCase().includes('sitting is kept'), await text('today-path'));
    check('and the caption says what Begin does', (await text('today-path-caption')).includes('picks the Interview up'), await text('today-path-caption'));
    await tap('today-begin');
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('and Begin the Interview resumes on the same question', (await text('interview-question')) === 'How far?', await text('interview-question'));
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
    // One question per page: the order here, the name on its own page.
    check('the order page asks one thing', !(await seen('book-title')));
    await tap('rank-continue');
    check('the name has a page of its own', await seen('screen-title'));
    check('with a way back to the order', await seen('title-back'));
    await tap('title-framing-The one where I…');
    await page.waitForTimeout(200);
    await page.locator('[data-testid="book-title"]').fill('stopped negotiating with the alarm');
    await page.waitForTimeout(200);
    await tap('title-continue');

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

    // ---- the account ask (only in a build with an account service) — never a gate
    if (await seen('screen-account')) {
      check('the account is offered after the Portrait, once, with a plain way past it', await seen('account-not-now'));
      await tap('account-not-now');
      await page.waitForTimeout(600);
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

    // The countdown can be put away for the next sitting, from the doorway.
    // The digits go; the minutes stay in the accessible name; the room still
    // closes on time.
    await page.goto(`${BASE}/write?kind=addition`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(400);
    check('the doorway offers to hide the clock', await seen('write-hide-clock'));
    if (await seen('write-hide-clock')) {
      await tap('write-hide-clock');
      check('Hide the clock is a checkbox that reads as on', (await page.locator('[data-testid="write-hide-clock"]').getAttribute('aria-checked')) === 'true');
      await tap('write-begin');
      await page.waitForTimeout(400);
      if (await seen('write-remaining')) {
        check('the room shows no digits', (await text('write-remaining')).toLowerCase() === 'clock hidden', await text('write-remaining'));
        check('but a screen reader still hears the minutes', /left$/.test((await page.locator('[data-testid="write-remaining"]').getAttribute('aria-label')) ?? ''));
      }
      await page.goto(`${BASE}/write?kind=addition`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1200);
      await page.waitForTimeout(400);
      if (await seen('write-hide-clock')) await tap('write-hide-clock'); // back on, for the sittings that follow
    }
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(500);
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

    // ---- your day (PRD 7.12): the times are the person's to change, and Today follows
    check('Settings has the day’s times', (await seen('day-times')) && (await seen('day-type-lark')) && (await seen('day-morning-05:30')));
    check('and the default day is the one in between', await page.locator('[data-testid="day-type-middle"]').getAttribute('aria-checked').then((v) => v === 'true'));
    await tap('day-type-lark');
    await page.waitForTimeout(300);
    check('Lark moves the morning, the evening and the Sunday together', (await text('day-times')).includes('5:30') && (await text('day-times')).includes('20:30') && (await text('day-times')).includes('at 8'), await text('day-times'));
    await tap('day-evening-22:00');
    await page.waitForTimeout(300);
    check('one time moved on its own leaves the preset', (await page.locator('[data-testid="day-type-lark"]').getAttribute('aria-checked')) !== 'true' && (await text('day-times')).includes('22:00'));
    await tap('day-ends-4');
    await page.waitForTimeout(300);
    const savedTimes = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.profile ?? {};
      return [p.wakeTime, p.eveningTime, p.sundayHour, p.dayBoundaryHour].join(' ');
    });
    check('and every one of them is kept', savedTimes === '05:30 22:00 8 4', savedTimes);
    await tap('day-type-middle');
    await page.waitForTimeout(300);
    await tap('day-ends-3');
    await page.waitForTimeout(300);

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

    // ---- the Present volume (PRD 7.15): pick, narrow, write twice
    //
    // The source's three moves with the personality model dropped. What is
    // checked here is what must never regress: no trait or factor is ever
    // named, the deck caps the picks with a reason, and the tapped sign plus
    // the written answer make one if-then.
    await page.goto(`${BASE}/present`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('the Present deck opens', await seen('screen-present'));
    const deckWords = await page.locator('body').innerText();
    check(
      'and names no trait, factor or diagnosis',
      !/extraversion|neurotic|agreeableness|conscientious|big five|personality type|diagnos/i.test(deckWords),
    );
    const cards = await page.locator('[data-testid^="present-card-"]').count();
    check('the evening deck is twelve cards', cards === 12, String(cards));
    const cardIds = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="present-card-"]')].map((e) => e.getAttribute('data-testid').replace('present-card-', '')),
    );
    for (const id of cardIds.slice(0, 4)) await tap(`present-card-${id}`);
    check('a fourth pick is refused, with a reason', (await text('present-problem')).includes('3 already'), await text('present-problem'));
    await tap('present-continue');
    check('the first pick opens its two writes', await seen('screen-present-write'));
    await page.locator('[data-testid="present-story"]').fill('The talk I had to give. I wrote it at midnight and it showed.');
    await page.waitForTimeout(200);
    const framingId = await page.evaluate(() =>
      document.querySelector('[data-testid^="present-framing-"]')?.getAttribute('data-testid')?.replace('present-framing-', '') ?? null,
    );
    if (framingId) await tap(`present-framing-${framingId}`);

    // Put it down mid-sentence and pick it up again. The method these volumes
    // come from says outright that its programs are meant to take several
    // sittings, so this is fidelity, not a nicety — and before this the two
    // newer volumes held every keystroke in screen state and lost the lot.
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('killed mid-sentence, the Present volume comes back to the writing', await seen('screen-present-write'));
    check(
      'with the words still in the box',
      (await page.locator('[data-testid="present-story"]').inputValue()).includes('midnight'),
      await page.locator('[data-testid="present-story"]').inputValue(),
    );
    if (framingId) {
      const keptSign = await page.evaluate(
        () => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.presentDraft?.writing?.framingId ?? null,
      );
      check('and the sign they had tapped', keptSign === framingId, String(keptSign));
    }

    await page.locator('[data-testid="present-apply"]').fill('Put the first twenty minutes in the calendar the morning it lands.');
    await page.waitForTimeout(300);

    // Back is an undo, not a delete: it returns to the deck with the picks
    // intact. It used to drop the card being written about.
    await tap('present-write-back');
    check('back from the writing returns to the deck', await seen('screen-present'));
    const stillPicked = await page.evaluate(
      () => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.presentDraft?.selected?.length ?? 0,
    );
    check('with every pick still ticked', stillPicked === 3, String(stillPicked));
    await tap('present-continue');
    check('and going on lands back on the same card', await seen('screen-present-write'));

    await tap('present-keep');
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.presentPicks ?? []);
    check('the pick is stored with both lines and the sign they tapped', kept.length === 1 && kept[0].storyLine && kept[0].applyLine && kept[0].framingId === framingId, JSON.stringify(kept[0] ?? {}).slice(0, 120));

    // One of three written is not a written half — the picks alone said it was.
    await page.goto(`${BASE}/choose`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    const doorMark = (await seen('door-present-mark')) ? (await text('door-present-mark')).toLowerCase() : '';
    check('one card of three written does not call the half written', doorMark === 'picked up', doorMark);
    await page.goto(`${BASE}/present?half=faults`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('and the door goes back to the writing, not to a closing screen', await seen('screen-present-write'));
    check('and screened, like every other thing a person writes here', kept[0]?.safetyRisk === 'none');

    // ---- the Past volume (PRD 7.16): periods, events, what they made of you
    //
    // The source's epoch structure. The two properties that matter most: a
    // period can hold more than one event and can be left empty, and nothing
    // reaches the Book unless the person puts it there.
    await page.goto(`${BASE}/past`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('the Past volume warns before it asks anything', await seen('screen-past-doorway'));
    check('and says plainly what it is not', (await text('past-doorway-note')).includes('not therapy'));
    check('with the helplines on that screen', await seen('top-help'));
    await tap('past-begin');
    await page.locator('[data-testid="past-age"]').fill('34');
    await page.waitForTimeout(200);
    await tap('past-age-continue');
    check('the periods are cut from their age', await seen('screen-past-events'));
    const periods = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastEpochs ?? []).map((e) => e.label));
    check('four of them on an evening, the last running to now', periods.length === 4 && periods[3].includes('now'), periods.join(' / '));

    // two in the first period: one event must not end it
    await page.locator('[data-testid="past-event-title"]').fill('the house with the green door');
    await page.waitForTimeout(150);
    await tap('past-event-add');
    check('adding one event does not end the period', await seen('past-event-title'));
    await page.locator('[data-testid="past-event-title"]').fill('my grandmother teaching me to swim');
    await page.waitForTimeout(150);
    await tap('past-event-add');
    const inFirst = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastEvents ?? []).length);
    check('so a period can hold more than one', inFirst === 2, String(inFirst));

    await tap('past-events-continue');
    await page.locator('[data-testid="past-event-title"]').fill('changing school mid-term');
    await page.waitForTimeout(150);
    await tap('past-weight-hurt');
    await tap('past-event-add');
    await tap('past-events-continue');
    await tap('past-events-continue'); // a period left empty on purpose
    await page.locator('[data-testid="past-event-title"]').fill('the year I moved cities');
    await page.waitForTimeout(150);
    await tap('past-event-add');
    await tap('past-events-continue');
    check('an empty period is allowed, and the walk ends when they say so', await seen('screen-past-choose'));

    const evIds = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastEvents ?? []).map((e) => e.id));
    for (const id of evIds.slice(0, 3)) await tap(`past-choose-${id}`);
    check('the picking screen holds until they press on', await seen('screen-past-choose'));
    await tap(`past-choose-${evIds[3]}`);
    check('a fourth is refused, with a reason', (await text('past-problem')).includes('3 already'), await text('past-problem'));
    await tap('past-choose-continue');
    for (let i = 0; i < 3; i += 1) {
      if (!(await seen('screen-past-analyse'))) break;
      await page.locator('[data-testid="past-what"]').fill(i === 2 ? 'My uncle died of an overdose that spring, and nobody said the word.' : 'It happened in the spring and nobody explained it.');
      await page.locator('[data-testid="past-shaped"]').fill('I pack lightly and I keep the people I find.');
      if (i === 0) {
        // Same test on the heaviest volume, and on more state: the walk it is
        // on, the events picked, and two of the three boxes.
        await page.waitForTimeout(300);
        await page.reload({ waitUntil: 'networkidle' });
        await page.clock.runFor(1500);
        await page.waitForTimeout(700);
        check('killed part-way, the Past volume comes back to the same event', await seen('screen-past-analyse'));
        check(
          'with what was written still there',
          (await page.locator('[data-testid="past-shaped"]').inputValue()).includes('pack lightly'),
          await page.locator('[data-testid="past-shaped"]').inputValue(),
        );
        check(
          'and it did not send them back through the periods again',
          (await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastDraft?.picked)) === true,
        );
      }
      await page.locator('[data-testid="past-believe"]').fill('Starting again is survivable.');
      await page.waitForTimeout(250);
      await tap('past-keep');
      if (i === 2) {
        await page.waitForTimeout(400);
        check('a line written in crisis raises the card in the Past too', await seen('safety-card'));
        if (await seen('safety-card')) {
          await page.waitForTimeout(1100);
          await tap('safety-continue');
          await page.waitForTimeout(300);
        }
      }
    }
    check('the three moves end on the Book question', await seen('screen-past-done'));
    const noDraftLeft = await page.evaluate(
      () => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastDraft?.writing ?? null,
    );
    check('and nothing is left half-written behind them', noDraftLeft === null, JSON.stringify(noDraftLeft));
    const written = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastEvents ?? []).filter((e) => e.analysed));
    check('all three are written, with what it made of them', written.length === 3 && written.every((e) => e.shapedMe && e.stillBelieve));
    check('and not one of them is in the Book until they say so', written.every((e) => e.joinsBook === false));
    await tap(`past-join-yes-${written[0].id}`);
    const joined = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.pastEvents ?? []).filter((e) => e.joinsBook).length);
    check('one tap puts one in, and only that one', joined === 1, String(joined));
    const heldEv = written.find((e) => e.whatHappened.includes('overdose'));
    check('the held one is said to be held, with no chips', Boolean(heldEv) && (await seen(`past-join-held-${heldEv?.id}`)));
    await tap(`past-change-${heldEv?.id}`);
    check('a held event can still be changed', await seen('screen-past-analyse'));
    await tap('past-keep');
    await page.waitForTimeout(400);
    check('and keeping it unchanged does not raise the card again', !(await seen('safety-card')) && (await seen('screen-past-done')));
    check('while it stays held', await seen(`past-join-held-${heldEv?.id}`));

    // ---- the deck's un-tick is a real un-tick (audit: a written card taken off still reached the Book)
    const store = async () => page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state ?? {});
    const patchStore = async (fn) =>
      page.evaluate((src) => {
        const k = 'morrow-v1';
        const s = JSON.parse(localStorage.getItem(k) ?? '{}');
        // eslint-disable-next-line no-new-func
        new Function('s', src)(s.state);
        localStorage.setItem(k, JSON.stringify(s));
      }, fn);
    const noticeText = async (id) => ((await seen(id)) ? await text(id) : '');

    await page.goto(`${BASE}/present`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('a bare door resumes the sitting that was left', await seen('screen-present-write'));
    await tap('present-write-back');
    check('and Back from it is the deck, picks ticked', await seen('screen-present'));

    // ---- lines are bound to their card, and Back to the deck keeps them
    await tap('present-continue');
    check('going on reopens the same card', await seen('screen-present-write'));
    await page.locator('[data-testid="present-story"]').fill('Half a line about the second card.');
    await page.waitForTimeout(300);
    await tap('present-write-back');
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('killed on the deck, it is the deck that comes back', await seen('screen-present'));
    await tap('present-continue');
    check('and the half-typed line is still there', (await page.locator('[data-testid="present-story"]').inputValue()).includes('Half a line'));
    const typedCard = (await store()).presentDraft?.writing?.cardId ?? '';
    await tap('present-write-back');
    await tap(`present-card-${typedCard}`);
    await tap('present-continue');
    check(
      'the next card opens with nothing of the other card in its boxes',
      (await page.locator('[data-testid="present-story"]').inputValue()) === '',
      await page.locator('[data-testid="present-story"]').inputValue(),
    );
    await tap('present-write-back');
    await tap(`present-card-${typedCard}`);
    const parked = (await store()).presentDraft?.lines?.[typedCard]?.story ?? '';
    check('and the un-ticked card kept its own words for when it comes back', parked.includes('Half a line'), parked);
    const writtenCard = ((await store()).presentPicks ?? [])[0]?.cardId ?? '';
    await tap(`present-card-${writtenCard}`);
    check('taking a written card off says what going on will cost', await seen('present-let-go'));
    await tap(`present-card-${writtenCard}`);
    check('and ticking it again costs nothing', !(await seen('present-let-go')));
    await tap(`present-card-${writtenCard}`);
    await tap('present-continue');
    const afterDrop = ((await store()).presentPicks ?? []).length;
    check('going on lets the written card go, so it cannot reach the Book', afterDrop === 0, String(afterDrop));
    check('and opens the writing for the next one', await seen('screen-present-write'));

    // ---- a finished half, and where its door leads
    for (let i = 0; i < 2; i += 1) {
      if (!(await seen('screen-present-write'))) break;
      await page.locator('[data-testid="present-story"]').fill('The Tuesday it cost me the whole afternoon.');
      await page.locator('[data-testid="present-apply"]').fill('Put the first twenty minutes in the calendar the night before.');
      await page.waitForTimeout(250);
      await tap('present-keep');
    }
    check('the half closes on its own screen', await seen('screen-present-done'));
    const doneWords = await page.locator('body').innerText();
    check('and claims nothing the app does not do', !/coach has them|sit with the goal/i.test(doneWords));
    await tap('present-later');
    await page.goto(`${BASE}/choose`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('the Present door names the half that is written', (await noticeText('door-present-mark')).toLowerCase().includes('faults'), await noticeText('door-present-mark'));
    await tap('door-present');
    await page.waitForTimeout(500);
    check('and opens the other half, not the finished deck', (await seen('screen-present')) && (await noticeText('present-deck-note')).includes('sound good'), await noticeText('present-deck-note'));
    await page.goto(`${BASE}/present?half=faults`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('a finished half opened by name lands on its closing screen', await seen('screen-present-done'));

    // The other half's live sitting, and the closing screen's two buttons.
    await page.goto(`${BASE}/present?half=virtues`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    const seedCard = await page.evaluate(() => document.querySelector('[data-testid^="present-card-"]')?.getAttribute('data-testid')?.replace('present-card-', '') ?? '');
    await patchStore(
      `s.presentDraft = { half: 'virtues', selected: [${JSON.stringify(seedCard)}], open: false, lines: { [${JSON.stringify(seedCard)}]: { story: 'Half a virtue, not yet kept.', apply: '', framingId: null, goalId: null } }, writing: { cardId: ${JSON.stringify(seedCard)}, story: 'Half a virtue, not yet kept.', apply: '', framingId: null, goalId: null }, updatedAt: '2026-09-16T00:00:00.000Z' };`,
    );
    await page.goto(`${BASE}/present?half=faults`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    await tap('present-next-half');
    await page.waitForTimeout(400);
    const afterNext = (await store()).presentDraft;
    check('"Now what you are good at" leaves the virtues sitting where it was', afterNext?.half === 'virtues' && (afterNext?.lines?.[seedCard]?.story ?? '').includes('Half a virtue'), JSON.stringify(afterNext ?? null).slice(0, 120));
    await page.goto(`${BASE}/present?half=faults`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    await tap('present-later');
    await page.waitForTimeout(400);
    const afterLater = (await store()).presentDraft;
    check('and so does "Another time"', afterLater?.half === 'virtues' && (afterLater?.lines?.[seedCard]?.story ?? '').includes('Half a virtue'), JSON.stringify(afterLater ?? null).slice(0, 120));
    check('so Today still offers to carry it on', await seen('today-carry-on'));
    await patchStore(`s.presentDraft = null;`);

    // ---- the virtues: a goal to pair, and a line the screen holds out of the Book
    await page.goto(`${BASE}/present?half=virtues`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    const vCards = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="present-card-"]')].map((e) => e.getAttribute('data-testid').replace('present-card-', '')),
    );
    await tap(`present-card-${vCards[0]}`);
    await tap('present-continue');
    check("the virtue's second write offers the goals to pair it with", (await page.locator('[data-testid^="present-goal-"]').count()) > 0);
    await page.locator('[data-testid^="present-goal-"]').first().click();
    await page.waitForTimeout(200);
    await page.locator('[data-testid="present-story"]').fill("I don't want to be here any more");
    await page.locator('[data-testid="present-apply"]').fill('On Tuesday I use this to get the first draft out.');
    await page.waitForTimeout(250);
    await tap('present-keep');
    await page.waitForTimeout(400);
    check('a line written in crisis raises the resources card here too', await seen('safety-card'));
    if (await seen('safety-card')) {
      await page.waitForTimeout(1100);
      await tap('safety-continue');
      await page.waitForTimeout(300);
    }
    check('the half closes', await seen('screen-present-done'));
    check('and says, per card, that the line stays out of the Book', await seen(`present-held-${vCards[0]}`));
    const heldRow = ((await store()).presentPicks ?? []).find((q) => q.half === 'virtues');
    check('kept on the phone, flagged, never sealed', heldRow?.safetyRisk === 'crisis', JSON.stringify(heldRow ?? {}).slice(0, 100));

    // ---- a paired virtue sits on its goal's page
    {
      const pairedVirtue = ((await store()).presentPicks ?? []).find((q) => q.half === 'virtues' && q.goalId);
      if (pairedVirtue) {
        await page.goto(`${BASE}/goal?id=${pairedVirtue.goalId}`, { waitUntil: 'networkidle' });
        await page.clock.runFor(1200);
        await page.waitForTimeout(500);
        check('a virtue paired with a goal sits on that goal\u2019s page', (await seen('goal-virtues')) && (await page.locator('body').innerText()).includes(pairedVirtue.applyLine.slice(0, 30)));
      } else {
        check('a virtue was paired with a goal to show on its page', false, 'no virtue carries a goalId');
      }
    }

    // ---- Full's deck takes everything, then narrows: the source's second move
    await patchStore(`s.profile.track = 'full'; s.presentPicks = (s.presentPicks ?? []).filter((q) => q.half === 'faults'); s.presentDraft = null;`);
    // In by the chooser's door, not by URL: page.goto makes a new document,
    // and the browser's back below then unloads it — nothing in the app can
    // intercept that. A tap pushes within the document, which the platform
    // back pops, which beforeRemove can catch.
    await page.goto(`${BASE}/choose`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    await tap('door-present');
    await page.waitForTimeout(500);
    check('the door opens the virtues on Full, the faults being written', await seen('screen-present'));
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    const fullCards = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="present-card-"]')].map((e) => e.getAttribute('data-testid').replace('present-card-', '')),
    );
    check('the long deck is forty cards', fullCards.length === 40, String(fullCards.length));
    check('and its note says the narrowing comes next', (await noticeText('present-deck-note')).includes('nine'), await noticeText('present-deck-note'));
    for (const id of fullCards.slice(0, 10)) await tap(`present-card-${id}`);
    check('ten ticks are taken without a refusal', !(await noticeText('present-problem')).includes('already'), await noticeText('present-problem'));
    await tap('present-continue');
    check('so the narrowing is its own step', await seen('screen-present-narrow'));
    check('which shows only the ticked cards', (await page.locator('[data-testid^="present-narrow-card-"]').count()) === 10);
    check('and will not go on with ten', (await noticeText('present-narrow-count')).toLowerCase().includes('keep up to 9'), await noticeText('present-narrow-count'));
    await tap(`present-narrow-card-${fullCards[3]}`);
    await tap('present-narrow-continue');
    check('nine go through to the writing', await seen('screen-present-write'));
    await page.goBack({ waitUntil: 'commit' }).catch(() => {});
    await page.waitForTimeout(600);
    check(
      "the platform's back there is one step back, to the deck",
      await seen('screen-present'),
      await page.evaluate(() => [...document.querySelectorAll('[data-testid^="screen-"]')].map((e) => e.getAttribute('data-testid')).join(',') + ' @ ' + location.pathname + location.search),
    );
    const nineKept = (await store()).presentDraft?.selected?.length ?? 0;
    check('in the order they were kept', nineKept === 9, String(nineKept));
    await patchStore(`s.profile.track = 'starter';`);

    // ---- the Past walk again: the ways back and the ways on (and the client's own report —
    //      age entered, Back, Begin, and no way to enter the age again)
    await patchStore(`s.pastEpochs = []; s.pastEvents = []; s.pastListed = false; s.pastDraft = null;`);
    await page.goto(`${BASE}/past`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    await tap('past-begin');
    await tap('past-age-back');
    const emptyDraft = (await store()).pastDraft ?? null;
    check('Begin then Back leaves no sitting behind', emptyDraft === null, JSON.stringify(emptyDraft ?? {}).slice(0, 80));
    await tap('past-begin');
    await page.locator('[data-testid="past-age"]').fill('40');
    await page.waitForTimeout(250);
    check('the age cuts the periods on the same screen, to keep or rename', await seen('past-periods'));
    const firstPeriod = await page.evaluate(
      () => document.querySelector('[data-testid^="past-period-"]')?.getAttribute('data-testid')?.replace('past-period-', '') ?? '',
    );
    await page.locator(`[data-testid="past-period-${firstPeriod}"]`).fill('The farm');
    await page.waitForTimeout(200);
    await tap('past-age-continue');
    check('a renamed period is called that on its own screen', (await noticeText('past-period-label')).toLowerCase() === 'the farm', await noticeText('past-period-label'));
    await tap('past-event-add');
    check('adding nothing says so', (await noticeText('past-events-problem')).includes('few words'), await noticeText('past-events-problem'));
    await page.locator('[data-testid="past-event-title"]').fill('the pond');
    await page.waitForTimeout(150);
    check('and the big button says it will keep what is typed', (await noticeText('past-events-continue')).startsWith('Keep it'), await noticeText('past-events-continue'));
    await tap('past-events-continue');
    await tap('past-events-back');
    const keptTitles = ((await store()).pastEvents ?? []).map((e) => e.title);
    check('a title typed and not added went in, not out', keptTitles.includes('the pond'), keptTitles.join(' / '));
    await tap('past-events-back');
    check('Back from the first period is the periods, not the doorway', await seen('screen-past-age'));
    check('with the age still in the box', (await page.locator('[data-testid="past-age"]').inputValue()) === '40');
    check('and nothing to cut again', (await noticeText('past-age-continue')).includes('Keep'), await noticeText('past-age-continue'));
    await page.locator('[data-testid="past-age"]').fill('50');
    await page.waitForTimeout(200);
    check('a changed age offers to cut again', (await noticeText('past-age-continue')).includes('Cut them again'), await noticeText('past-age-continue'));
    await tap('past-age-continue');
    const afterRecut = (await store()).pastEvents ?? [];
    check(
      'and what was listed follows its period through the new cut',
      afterRecut.length === keptTitles.length && afterRecut.every((e) => e.epochId === 'ep-early'),
      JSON.stringify(afterRecut.map((e) => e.epochId)),
    );
    await tap('past-events-back');
    await page.locator('[data-testid="past-age"]').fill('40');
    await page.waitForTimeout(200);
    await tap('past-age-continue');
    check('keeping them returns to the walk', await seen('screen-past-events'));
    await page.locator('[data-testid="past-event-title"]').fill('learning to swim');
    await page.waitForTimeout(150);
    await tap('past-event-add');
    check('a full period says so rather than hiding the field', await seen('past-events-full'));
    await tap('past-events-continue');
    for (const t of ['changing school', 'the first job', 'moving cities']) {
      await page.locator('[data-testid="past-event-title"]').fill(t);
      await page.waitForTimeout(150);
      await tap('past-events-continue');
    }
    check('the walk ends on the picking screen', await seen('screen-past-choose'));
    const evs = ((await store()).pastEvents ?? []).map((e) => e.id);
    check('with every period holding something', evs.length === 5, String(evs.length));
    await tap(`past-choose-${evs[0]}`);
    check('one that still has weight is enough', (await noticeText('past-choose-continue')).includes('this one'), await noticeText('past-choose-continue'));
    await tap('past-choose-back');
    check('Back from the picking screen is the last period, even with every period listed', await seen('screen-past-events'));
    await tap('past-events-continue');
    check('and the pick survived the detour', (await noticeText('past-choose-count')).toLowerCase().startsWith('1 of'), await noticeText('past-choose-count'));
    await tap('past-choose-continue');
    check('one pick goes straight into the writing', await seen('screen-past-analyse'));
    await page.locator('[data-testid="past-what"]').fill('We kept ducks and I fell in twice.');
    await page.locator('[data-testid="past-shaped"]').fill('I do not mind cold water or looking foolish.');
    await page.locator('[data-testid="past-believe"]').fill('Getting out matters more than not falling in.');
    await page.waitForTimeout(250);
    await tap('past-keep');
    check('and closes on the Book question', await seen('screen-past-done'));
    const ducks = ((await store()).pastEvents ?? []).find((e) => e.analysed && e.whatHappened.includes('ducks'));
    check('which shows every part it decides on, not only the last line', Boolean(ducks) && (await noticeText(`past-join-what-${ducks?.id}`)).includes('ducks'));
    check('and says which Book it is: there is one, so the next edition', (await noticeText('past-done-book')).toLowerCase().includes('next edition'), await noticeText('past-done-book'));
    await tap(`past-change-${ducks?.id}`);
    check('a part can be changed from there', (await seen('screen-past-analyse')) && (await page.locator('[data-testid="past-what"]').inputValue()).includes('ducks'));
    await page.locator('[data-testid="past-shaped"]').fill('I do not mind cold water, or looking foolish, or ducks.');
    await page.waitForTimeout(250);
    await tap('past-keep');
    check('and the change lands back on the Book question', await seen('screen-past-done'));
    const changed = ((await store()).pastEvents ?? []).find((e) => e.id === ducks?.id)?.shapedMe ?? '';
    check('with the change kept', changed.includes('or ducks'), changed);

    // ---- a second edition, sealed from here, carries the Past into the Book itself
    await tap(`past-join-yes-${ducks?.id}`);
    await tap('past-seal');
    check('the closing screen can seal a new edition when a Book exists', await seen('screen-seal-book'));
    await page.locator('[data-testid="seal-hold"]').first().focus().catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    if (await seen('seal-open-book')) {
      await tap('seal-open-book');
      await page.waitForTimeout(900);
    }
    check('and the new edition opens', await seen('screen-book'));
    const bookWords = await page.locator('body').innerText();
    check('with the Past printed on the paper, not only counted in its pages', bookWords.includes('Where I came from') && bookWords.includes('We kept ducks'));
    const editions = ((await store()).books ?? []).length;
    check('as a second edition', editions === 2, String(editions));

    // ---- Today leads back to whatever was left part-way
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('Today offers the volume left part-way', await seen('today-carry-on'));

    // ---- the doors stay open afterwards
    await page.goto(`${BASE}/choose`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('coming back, the chooser says what has been written', await seen('choose-reentry'));
    check('and marks the volumes that were', await seen('door-past-mark'));

    // ---- a finished Past reopens finished, and one Back does not un-finish it
    await page.goto(`${BASE}/past`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    if (await seen('screen-past-done')) await tap('past-finish');
    await page.goto(`${BASE}/past`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('a finished Past reopens on its closing screen, not the picking screen', await seen('screen-past-done'));
    await tap('past-done-back');
    await page.goto(`${BASE}/choose`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('and one Back does not un-finish it', (await noticeText('door-past-mark')).toLowerCase() === 'written', await noticeText('door-past-mark'));


    // ---- the evening, half written, comes back to what was written
    await page.goto(`${BASE}/seal-day`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('the evening seal opens', await seen('seal-proof'));
    if (await seen('seal-proof')) {
      await page.locator('[data-testid="seal-proof"]').fill('I did the twenty minutes before the kettle boiled.');
      await page.waitForTimeout(400);
      await page.reload({ waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(700);
      check('the evening, half written, comes back to it', (await page.locator('[data-testid="seal-proof"]').inputValue()).includes('before the kettle boiled'), await page.locator('[data-testid="seal-proof"]').inputValue());
    }

    // ---- a stone, killed mid-line, comes back to the line
    // Every other room in the app keeps what is typed; the stones held theirs
    // on the screen alone until the line was seated.
    const stoneGoal = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.goals?.[0]?.id ?? '');
    await page.goto(`${BASE}/stone?goal=${stoneGoal}&kind=obstacles`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('the Obstacles stone opens with a goal behind it', await seen('stone-line'));
    if (await seen('stone-line')) {
      await page.locator('[data-testid="stone-line"]').fill('The alarm goes and the room is cold.');
      await page.waitForTimeout(400);
      await page.reload({ waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(700);
      check('a stone killed mid-line comes back to the line', (await page.locator('[data-testid="stone-line"]').inputValue()).includes('the room is cold'), await page.locator('[data-testid="stone-line"]').inputValue());
      const stoneDraft = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.stoneDraft ?? null);
      check('and the sitting names the stone it belongs to', stoneDraft?.kind === 'obstacles' && stoneDraft?.goalId === stoneGoal, JSON.stringify(stoneDraft ?? {}).slice(0, 100));

      // The Present volume feeds the plan: the faults written are offered here.
      const faultsWritten = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.presentPicks ?? []).filter((q) => q.half === 'faults' && q.storyLine && q.applyLine));
      check('the Obstacles stone offers the faults written in Present', faultsWritten.length > 0 && (await seen('stone-faults')));
      if (faultsWritten.length) {
        await page.locator('[data-testid="stone-line"]').fill('');
        await tap(`stone-fault-${faultsWritten[0].cardId}`);
        const then = await page.locator('[data-testid="stone-line2"]').inputValue();
        const ifLine = await page.locator('[data-testid="stone-line"]').inputValue();
        check('a tap puts their own answer under the goal', then === faultsWritten[0].applyLine, then);
        check('and nothing of the app\u2019s into the If, which stays theirs to write', ifLine === '');
        const hint = await page.locator('[data-testid="stone-line"]').getAttribute('placeholder');
        check('with the sign they tapped as the hint', (hint ?? '').startsWith('If '), hint ?? '');
      }
    }

    // ---- the Declaration (PRD 7.17): the line across the night ground, one witness, kept
    await page.goto(`${BASE}/book`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('the Book offers the Declaration beside the lock screen', await seen('book-declare'));
    await tap('book-declare');
    check('the Declaration opens on the I will line', (await seen('screen-declare')) && (await seen('declare-line')));
    check('with the person\u2019s own line across it', (await text('declare-line')).toLowerCase().includes('kettle'), await text('declare-line'));
    await page.locator('[data-testid="declare-witness"]').fill('Sam');
    await page.waitForTimeout(200);
    await tap('declare-keep');
    await page.waitForTimeout(800);
    check('keeping it downloads on the web and says so', (await seen('declare-note')) && (await text('declare-note')).includes('Downloaded'), (await seen('declare-note')) ? await text('declare-note') : '');
    const declared = await page.evaluate(() => JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.profile ?? {});
    check('the witness is kept with the profile, and the Declaration dated', declared.witnessName === 'Sam' && typeof declared.declaredAt === 'string', JSON.stringify({ w: declared.witnessName, d: declared.declaredAt }));
    check('and the screen says when it was first made', await seen('declare-made'));

    // Settings knows the witness by name.
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('Settings names the witness', (await page.locator('body').innerText()).includes('Your witness is Sam'));

    // The sealed evening offers to tell the witness the count, and does not close on its own.
    await page.goto(`${BASE}/seal-day`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    if (await seen('seal-day-hold')) {
      await page.locator('[data-testid="seal-proof"]').fill('Out the door at 6:40, kettle still cold.');
      await page.waitForTimeout(200);
      await page.locator('[data-testid="seal-day-hold"]').first().focus().catch(() => {});
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
      await page.clock.runFor(1500);
      await page.waitForTimeout(400);
      check('a sealed evening with a witness offers to tell them, and waits', (await seen('seal-witness')) && (await seen('screen-seal-day')));
      check('by name', (await noticeText('seal-tell')).includes('Sam'), await noticeText('seal-tell'));
      await tap('seal-witness-today');
      await page.waitForTimeout(500);
      check('and Back to Today goes there', await seen('screen-today'));
    }

    // ---- the paywall's required pieces (PRD 7.13): restore, manage, and an honest price
    await page.goto(`${BASE}/paywall?moment=second-blueprint`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('the paywall offers Restore', await seen('paywall-restore'));
    check('and a way to the platform\u2019s own subscription page', await seen('paywall-manage'));
    check('and says its figures are in US dollars until a store is behind it', (await seen('plan-currency')) && (await text('plan-currency')).includes('US dollars'));
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('Settings has Manage subscription and Restore purchases too', (await seen('settings-manage-subscription')) && (await seen('settings-restore')));

    // ---- day 90 (PRD 7.3): the dawn brief opens the re-authoring, and every 90 after
    //
    // Ninety days on from the seal. The clock is Playwright's, so the app's
    // calendar moves and nothing else does: same store, same Book, same
    // goals. This lands at the end of the walk because it changes the day
    // for everything after it.
    const sealedStrategies = 'Tuesday, Thursday, Saturday at 6:40, out the back door before the kettle boils';
    const ORD = ['Zeroth', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
    await page.evaluate(() => {
      const k = 'morrow-v1';
      const st = JSON.parse(localStorage.getItem(k) ?? '{}');
      const now = new Date().toISOString();
      const id = 'goal_e2e_guitar';
      st.state.goals = [
        ...st.state.goals,
        { id, title: 'Play the guitar on the wall', domain: 'craft', horizon: 'This season', targetDate: null, status: 'authored', rank: st.state.goals.length, titleAuthored: true, createdAt: now },
      ];
      st.state.analyses = [
        ...st.state.analyses,
        { id: 'an_e2e_guitar_m', goalId: id, kind: 'motives', track: 'starter', framingId: null, line: 'Because it is on the wall where I can see it from the table', specificity: 0.7, followupShown: false, writtenAt: now },
        { id: 'an_e2e_guitar_s', goalId: id, kind: 'strategies', track: 'starter', framingId: null, line: 'Monday, Wednesday, Friday at 8:30, ten minutes before the plates', specificity: 0.8, followupShown: false, writtenAt: now },
        { id: 'an_e2e_guitar_o', goalId: id, kind: 'obstacles', track: 'starter', framingId: null, line: 'the plates are still on the table', line2: 'leave them and play first', specificity: 0.5, followupShown: false, writtenAt: now },
      ];
      // Pro for the seal-in, so the second goal gets a Blueprint of its own —
      // the let-go check needs moves to lose. Free again before the gate.
      st.state.profile.entitled = true;
      localStorage.setItem(k, JSON.stringify(st));
    });
    await page.goto(`${BASE}/seal-book`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    await page.locator('[data-testid="seal-hold"]').first().focus().catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    check('an edition with both goals is sealed to be re-authored', await seen('seal-open-book'));
    const editionBefore = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.books ?? []).length);
    const sealedAt = await page.evaluate(() => {
      const b = JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.books ?? [];
      return b[b.length - 1]?.sealedAt ?? '';
    });
    check('and the edition has a chapter for each', (await page.evaluate(() => {
      const b = JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.books ?? [];
      return b[b.length - 1]?.chapters.length ?? 0;
    })) === 2);
    await page.evaluate(() => {
      const k = 'morrow-v1';
      const st = JSON.parse(localStorage.getItem(k) ?? '{}');
      st.state.profile.entitled = false;
      localStorage.setItem(k, JSON.stringify(st));
    });
    // Day 89: nothing. Day 90, nine in the morning: the card.
    const day90 = new Date(new Date(sealedAt).getTime() + 90 * 86_400_000);
    day90.setHours(9, 0, 0, 0);
    await page.clock.setSystemTime(new Date(day90.getTime() - 86_400_000));
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('on day 89 Today has no such card', (await seen('screen-today')) && !(await seen('today-reauthor')));
    await page.clock.setSystemTime(day90);
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('on day 90 Today carries the card', await seen('today-reauthor'));
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    check('and the dawn brief opens it, in words', (await seen('dawn-brief')) && (await noticeText('dawn-brief')).toLowerCase().includes('day ninety'), (await noticeText('dawn-brief')).slice(0, 160));
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('and names the day', (await noticeText('today-reauthor')).toLowerCase().includes('day ninety'), await noticeText('today-reauthor'));
    await tap('today-reauthor');
    await page.waitForTimeout(700);
    check(
      'on the free plan the door is the paywall, at the moment the PRD names',
      (await seen('screen-paywall')) && (await page.locator('body').innerText()).includes('Ninety days'),
    );
    await tap('paywall-not-now');
    await page.waitForTimeout(700);
    check('Not now is Today again, the card still there, nothing lost', (await seen('screen-today')) && (await seen('today-reauthor')));

    // Reached by its own URL on the free plan: what Pro adds and what stays
    // theirs, on the screen itself — not a crash and not a silent redirect.
    await page.goto(`${BASE}/reauthor`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('the screen itself says what Pro adds and what stays theirs', (await seen('reauthor-gated')) && (await page.locator('body').innerText()).includes('yours either way'));
    await tap('reauthor-back');
    await page.waitForTimeout(600);
    check('and its Back is Today', await seen('screen-today'));

    // Pro. Set the way the billing webhook sets it; the app never can.
    await page.evaluate(() => {
      const k = 'morrow-v1';
      const st = JSON.parse(localStorage.getItem(k) ?? '{}');
      st.state.profile.entitled = true;
      localStorage.setItem(k, JSON.stringify(st));
    });
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    await tap('today-reauthor');
    await page.waitForTimeout(700);
    check('for Pro the card opens the two Books side by side', (await seen('screen-reauthor')) && (await seen('reauthor-title')));
    await accessible('the re-authoring, two Books side by side');
    const goalsNow = await page.evaluate(() =>
      (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.goals ?? []).map((g) => ({ id: g.id, title: g.title, status: g.status })),
    );
    const g0 = goalsNow[0] ?? { id: '', title: '' };
    const statusOf = async (id) => page.evaluate((gid) => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.goals ?? []).find((g) => g.id === gid)?.status ?? '', id);
    const lineOf = async (id, kind) =>
      page.evaluate(
        ([gid, k]) => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.analyses ?? []).find((a) => a.goalId === gid && a.kind === k)?.line ?? '',
        [id, kind],
      );
    check(
      'it says which edition, and when it was sealed',
      (await noticeText('reauthor-sealed')).toLowerCase().includes(`${ORD[editionBefore].toLowerCase()} edition`) && (await noticeText('reauthor-sealed')).toLowerCase().includes('sealed'),
      await noticeText('reauthor-sealed'),
    );
    check(
      'every sealed line is printed as it stands',
      (await seen(`reauthor-before-${g0.id}-strategies`)) && (await text(`reauthor-before-${g0.id}-strategies`)).includes('kettle boils'),
    );
    check('with Keep on and Rewrite beside it', (await seen(`reauthor-keep-${g0.id}-strategies`)) && (await seen(`reauthor-rewrite-${g0.id}-strategies`)));
    check('and, nothing changed yet, it says so', (await noticeText('reauthor-summary')).includes('Nothing changed'), await noticeText('reauthor-summary'));

    // Rewrite: the same stone, the sealed line above, an empty field.
    await tap(`reauthor-rewrite-${g0.id}-strategies`);
    await page.waitForTimeout(700);
    check('Rewrite opens the same stone', await seen('screen-stone'));
    check('with the sealed line above the field', (await seen('stone-before')) && (await noticeText('stone-before')).includes('kettle boils'));
    check('and the field empty, so the new line is written and not edited', (await page.locator('[data-testid="stone-line"]').inputValue()) === '');
    await tap('stone-back');
    await page.waitForTimeout(700);
    check(
      'Back with nothing written is the re-authoring again, the line still kept',
      (await seen('screen-reauthor')) && !(await seen(`reauthor-now-${g0.id}-strategies`)) && (await lineOf(g0.id, 'strategies')) === sealedStrategies,
    );
    const rewriteStrategies = async () => {
      await tap(`reauthor-rewrite-${g0.id}-strategies`);
      await page.waitForTimeout(700);
      await page.locator('[data-testid="stone-line"]').fill('Every morning at 6:40, out the door, and the kettle can wait');
      await page.waitForTimeout(300);
      await tap('stone-seat');
      // The one follow-up a vague Strategies line earns; this one is not vague, but the button is the same either way.
      if (await seen('stone-followup')) await tap('stone-seat');
      await page.waitForTimeout(800);
    };
    await rewriteStrategies();
    check('Keep this line returns to the re-authoring', await seen('screen-reauthor'));
    check(
      'where the stone now reads Written again, the old line above the new',
      (await seen(`reauthor-now-${g0.id}-strategies`)) &&
        (await text(`reauthor-now-${g0.id}-strategies`)).includes('kettle can wait') &&
        (await text(`reauthor-before-${g0.id}-strategies`)).includes('kettle boils') &&
        (await text(`reauthor-rewrite-${g0.id}-strategies`)).includes('Written again'),
    );
    check('and the summary counts it', (await noticeText('reauthor-summary')).includes('1 line written again'), await noticeText('reauthor-summary'));
    await tap(`reauthor-keep-${g0.id}-strategies`);
    await page.waitForTimeout(500);
    check(
      'Keep the old puts the sealed line back on the stone, word for word',
      !(await seen(`reauthor-now-${g0.id}-strategies`)) && (await lineOf(g0.id, 'strategies')) === sealedStrategies,
      await lineOf(g0.id, 'strategies'),
    );
    await rewriteStrategies();
    check('and it can be written again after that', (await seen('screen-reauthor')) && (await seen(`reauthor-now-${g0.id}-strategies`)));

    // Let it go: one line on what it turned out to be instead, and a way back until the seal.
    check('there is more than one goal, so one can be let go', goalsNow.length >= 2, `${goalsNow.length} goals`);
    const gLast = goalsNow[goalsNow.length - 1] ?? { id: '', title: '' };
    await tap(`reauthor-let-go-${gLast.id}`);
    await page.waitForTimeout(400);
    check('Let it go asks what it turned out to be instead', await seen(`reauthor-lesson-field-${gLast.id}`));
    await tap(`reauthor-let-go-cancel-${gLast.id}`);
    await page.waitForTimeout(300);
    check(
      'and Keep it closes it with nothing changed',
      !(await seen(`reauthor-lesson-field-${gLast.id}`)) && !(await seen(`reauthor-take-back-${gLast.id}`)) && (await statusOf(gLast.id)) !== 'archived',
    );
    // Half a line, Back, and back in: the line is where it was left.
    await tap(`reauthor-let-go-${gLast.id}`);
    await page.waitForTimeout(300);
    await page.locator(`[data-testid="reauthor-lesson-field-${gLast.id}"]`).fill('It was never the guitar');
    await page.waitForTimeout(300);
    await tap('reauthor-back');
    await page.waitForTimeout(600);
    await page.goto(`${BASE}/reauthor`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(600);
    check('a half-written line on letting go survives Back', (await seen(`reauthor-lesson-field-${gLast.id}`)) && (await page.locator(`[data-testid="reauthor-lesson-field-${gLast.id}"]`).inputValue()) === 'It was never the guitar');
    await tap(`reauthor-let-go-cancel-${gLast.id}`);
    await page.waitForTimeout(300);
    const letGoLast = async () => {
      await tap(`reauthor-let-go-${gLast.id}`);
      await page.waitForTimeout(300);
      await page.locator(`[data-testid="reauthor-lesson-field-${gLast.id}"]`).fill('It was never the guitar I wanted; it was the evenings.');
      await page.waitForTimeout(200);
      await tap(`reauthor-let-go-confirm-${gLast.id}`);
      await page.waitForTimeout(500);
    };
    const guitarMoves = await page.evaluate((gid) => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.plans ?? []).filter((p) => p.goalId === gid).flatMap((p) => p.moves.map((m) => m.title)), gLast.id);
    check('the goal let go had a Blueprint of its own to lose from Today', guitarMoves.length > 0, `${guitarMoves.length} moves`);
    await letGoLast();
    check(
      'the goal is let go, its line printed, with a way back',
      (await seen(`reauthor-lesson-${gLast.id}`)) && (await text(`reauthor-lesson-${gLast.id}`)).includes('the evenings') && (await seen(`reauthor-take-back-${gLast.id}`)),
    );
    check('and is archived in the store, not deleted', (await statusOf(gLast.id)) === 'archived', await statusOf(gLast.id));
    await tap(`reauthor-take-back-${gLast.id}`);
    await page.waitForTimeout(500);
    check('Take it back is exactly that', (await statusOf(gLast.id)) === 'active' && (await seen(`reauthor-let-go-${gLast.id}`)), await statusOf(gLast.id));
    await letGoLast();
    check('the summary counts both', (await noticeText('reauthor-summary')).includes('1 goal let go'), await noticeText('reauthor-summary'));
    // Day 99: the week's card is gone, and the door is still open because a
    // goal is let go and nothing sealed since.
    await page.clock.setSystemTime(new Date(day90.getTime() + 9 * 86_400_000));
    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('past the week, a let-go left unsealed keeps the door on Today', (await seen('today-reauthor')) && (await noticeText('today-reauthor')).toLowerCase().includes('let go'), await noticeText('today-reauthor'));
    await tap('today-reauthor');
    await page.waitForTimeout(700);
    check('and it opens the re-authoring, with the goal still there to take back', (await seen('screen-reauthor')) && (await seen(`reauthor-take-back-${gLast.id}`)));
    // Later the same day 90, not its first second: the seal must come after the let-go.
    await page.clock.setSystemTime(new Date(day90.getTime() + 3 * 3_600_000));

    // The seal, with the hold. Back from it is the re-authoring, nothing lost.
    await tap('reauthor-seal');
    await page.waitForTimeout(700);
    check('Seal is the seal screen, with the hold', (await seen('screen-seal-book')) && (await seen('seal-hold')));
    check('and the I will line is still theirs from the first edition', (await page.locator('[data-testid="i-will"]').inputValue()).includes('kettle boils'));
    await tap('seal-book-back');
    await page.waitForTimeout(700);
    check(
      'Back from the seal is the re-authoring, with everything still on it',
      (await seen('screen-reauthor')) && (await noticeText('reauthor-summary')).includes('1 goal let go') && (await seen(`reauthor-now-${g0.id}-strategies`)),
    );
    await tap('reauthor-seal');
    // The stack's slide runs on the fake clock; a focus placed mid-slide
    // lands nowhere and the Enter after it seals nothing.
    await page.clock.runFor(1200);
    await page.locator('[data-testid="seal-hold"]').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    await page.locator('[data-testid="seal-hold"]').first().focus().catch(() => {});
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    check('the new edition is sealed', await seen('seal-open-book'));
    await tap('seal-open-book');
    // The stack's slide runs on the fake clock; until it has run, the new
    // screen is mid-transition and innerText reads only its first line.
    await page.clock.runFor(1500);
    await page.waitForTimeout(900);
    check('and the Book opens', await seen('screen-book'));
    check('on the diff as its first page', await seen('book-diff'));
    const diffNodes = await page.locator('[data-testid="book-diff"]').count();
    const diffText = diffNodes ? (await page.locator('[data-testid="book-diff"]').last().innerText()).trim() : '';
    check('exactly one Book screen is mounted behind the diff', diffNodes === 1, String(diffNodes) + ' nodes; first: ' + (diffNodes ? (await page.locator('[data-testid="book-diff"]').first().innerText()).trim().slice(0, 80) : ''));
    // The labels are uppercased by the Label's own text-transform, which innerText honours.
    check('which says what was written again', diffText.toLowerCase().includes('written again') && diffText.includes(g0.title), diffText.slice(0, 160));
    check(
      'and what was let go, with the line about what it taught',
      diffText.toLowerCase().includes('let go') && diffText.includes(gLast.title) && diffText.includes('it was the evenings'),
      diffText.slice(0, 200),
    );
    check(`the spine says ${ORD[editionBefore + 1].toLowerCase()} edition`, (await page.locator('body').innerText()).toLowerCase().includes(`${ORD[editionBefore + 1].toLowerCase()} edition`));
    await accessible('the re-authored edition, diff first');
    const secondEdition = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state ?? {};
      return { books: (st.books ?? []).map((b) => ({ version: b.version, goalIds: b.chapters.map((c) => c.goalId), diff: b.diff })), goals: st.goals ?? [] };
    });
    const wasSealed = secondEdition.books[editionBefore - 1];
    const nowSealed = secondEdition.books[editionBefore];
    check('one more edition in the store, the one before it untouched', secondEdition.books.length === editionBefore + 1 && wasSealed?.goalIds.includes(gLast.id) === true);
    check('the new one without the goal let go, and with the diff on it', nowSealed?.goalIds.includes(gLast.id) === false && nowSealed?.diff?.letGo?.includes(gLast.title) === true);
    check('and the diff names the line written again', nowSealed?.diff?.rewritten?.includes(g0.title) === true, JSON.stringify(nowSealed?.diff ?? null));
    check('the goal let go keeps its line', secondEdition.goals.find((g) => g.id === gLast.id)?.lesson?.includes('the evenings') === true);

    await page.goto(`${BASE}/reading`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('the Sunday reading opens on the same page', await seen('reading-diff'));

    await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('and the card is gone: the next ninety count from this seal', (await seen('screen-today')) && !(await seen('today-reauthor')));
    check('the goal let go is off Today’s row of goals', !(await seen(`goal-chip-${gLast.id}`)) && (await seen(`goal-chip-${g0.id}`)));
    const todayText = await page.locator('body').innerText();
    check('and its moves are off Today with it', guitarMoves.every((t) => !todayText.includes(t)), guitarMoves.join(' | '));
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    const briefText = await noticeText('dawn-brief');
    check('and out of the brief', guitarMoves.every((t) => !briefText.includes(t)) && !briefText.includes('before the plates'), briefText.slice(0, 200));

    // ---- what Morrow knows about me (PRD 7.9, 7.12): every line, theirs to change or forget
    //
    // Built from the store as it stands at the end of the walk: a name, one
    // goal with its stones, a Book, sealed days. The forget has to reach the
    // coach — that is the whole point of the screen — so the check is the
    // coach's own reply before and after.
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('Settings opens the memory profile', await seen('settings-memory'));
    await tap('settings-memory');
    await page.waitForTimeout(700);
    check('What Morrow knows about you', (await seen('screen-memory')) && (await seen('memory-title')));
    await accessible('what Morrow knows, line by line');
    const memoryKeys = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="memory-line-"]')].map((e) => e.getAttribute('data-testid').slice('memory-line-'.length)));
    check('it has the name, the goal, the stones, the Book and the days', ['you.name', `goal.${g0.id}`, 'book.first', 'days.sealed'].every((k) => memoryKeys.includes(k)), memoryKeys.join(' '));
    check('and the name is theirs, in the serif', (await seen('memory-quote-you.name')) && (await text('memory-quote-you.name')) === 'Sam');
    const obstaclesId = await page.evaluate((gid) => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.analyses ?? []).find((a) => a.goalId === gid && a.kind === 'obstacles')?.id ?? '', g0.id);
    // Both halves are theirs; the framing between them is the app's, in the sans, so it is read off the row and not the quote.
    check('the if-then is one of the lines, both halves', (await seen(`memory-line-line.${obstaclesId}`)) && (await text(`memory-line-line.${obstaclesId}`)).toLowerCase().includes('then i') && (await text(`memory-quote-line.${obstaclesId}`)).length > 0);

    // Change: their words replace the line and are marked as theirs.
    await tap('memory-change-you.name');
    await page.waitForTimeout(300);
    await page.locator('[data-testid="memory-field-you.name"]').fill('Call me S.');
    await page.waitForTimeout(200);
    await tap('memory-keep-you.name');
    await page.waitForTimeout(400);
    check('a changed line reads in their words, and says so', (await text('memory-quote-you.name')) === 'Call me S.' && (await text('memory-line-you.name')).toLowerCase().includes('in your words'));
    check('the stone lines carry the goal’s name in its own face', (await seen(`memory-goal-line.${obstaclesId}`)) && (await text(`memory-goal-line.${obstaclesId}`)) === g0.title);
    check('with a way back to what Morrow had', await seen('memory-restore-you.name'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(600);
    check('and the change survives a relaunch: the edit is locked', (await text('memory-quote-you.name')) === 'Call me S.');
    await tap('memory-restore-you.name');
    await page.waitForTimeout(300);
    check('As Morrow had it puts the rebuilt line back', (await text('memory-quote-you.name')) === 'Sam' && !(await seen('memory-restore-you.name')));
    await tap('memory-change-you.name');
    await page.waitForTimeout(300);
    check('Change starts from their words', (await page.locator('[data-testid="memory-field-you.name"]').inputValue()) === 'Sam');
    await tap('memory-keep-you.name');
    await page.waitForTimeout(300);
    check('and Keep this with nothing changed is not an edit', !(await seen('memory-restore-you.name')) && !(await text('memory-line-you.name')).toLowerCase().includes('in your words'));
    // A goal from the bank: Change starts empty, and the bank's title typed back is not an edit either.
    // The walk's goal was typed by hand; a goal from the bank is seeded for this, the way the Interview names one.
    await page.evaluate(() => {
      const k = 'morrow-v1';
      const st = JSON.parse(localStorage.getItem(k) ?? '{}');
      const live = st.state.goals.filter((g) => g.status !== 'archived').length;
      st.state.goals = [...st.state.goals, { id: 'goal_e2e_bank', title: 'Get fit', domain: 'health', horizon: 'Three months', targetDate: null, status: 'named', rank: live, titleAuthored: false, createdAt: new Date().toISOString() }];
      localStorage.setItem(k, JSON.stringify(st));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(600);
    const bankGoalId = 'goal_e2e_bank';
    check('there is a bank-titled goal on the profile', bankGoalId.length > 0 && (await seen(`memory-line-goal.${bankGoalId}`)));
    await tap(`memory-change-goal.${bankGoalId}`);
    await page.waitForTimeout(300);
    check('a bank title seeds nothing', (await page.locator(`[data-testid="memory-field-goal.${bankGoalId}"]`).inputValue()) === '');
    const bankTitle = await text(`memory-quote-goal.${bankGoalId}`);
    await page.locator(`[data-testid="memory-field-goal.${bankGoalId}"]`).fill(bankTitle);
    await page.waitForTimeout(200);
    await tap(`memory-keep-goal.${bankGoalId}`);
    await page.waitForTimeout(300);
    check('and the bank title typed back is not an edit', !(await seen(`memory-restore-goal.${bankGoalId}`)) && !(await text(`memory-line-goal.${bankGoalId}`)).toLowerCase().includes('in your words'));
    await tap('memory-change-you.register');
    await page.waitForTimeout(300);
    check('a line that is all Morrow’s framing starts empty: Change means in your words, never Morrow’s', (await page.locator('[data-testid="memory-field-you.register"]').inputValue()) === '');
    await tap('memory-cancel-you.register');
    await page.waitForTimeout(200);

    // Forget the if-then, and the coach stops quoting it.
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    await tap('chip-stuck');
    await page.waitForTimeout(600);
    const stuckBefore = await page.locator('[data-testid^="msg-coach-"]').last().innerText().catch(() => '');
    check('before: I’m stuck quotes the if-then', stuckBefore.toLowerCase().includes('then'), stuckBefore.slice(0, 120));
    await page.goto(`${BASE}/memory`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    await tap(`memory-forget-line.${obstaclesId}`);
    await page.waitForTimeout(400);
    check('a forgotten line is gone from the page', !(await seen(`memory-line-line.${obstaclesId}`)));
    check('and counted, with a way to bring it back', (await seen('memory-forgotten')) && (await seen('memory-bring-back')));
    await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(600);
    await tap('chip-stuck');
    await page.waitForTimeout(600);
    const stuckAfter = await page.locator('[data-testid^="msg-coach-"]').last().innerText().catch(() => '');
    check('after: the coach no longer has the if-then to quote', !stuckAfter.toLowerCase().includes('stairwell') && stuckAfter !== stuckBefore, stuckAfter.slice(0, 120));
    await page.goto(`${BASE}/memory`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    await tap('memory-bring-back');
    await page.waitForTimeout(400);
    check('Bring it back is exactly that', (await seen(`memory-line-line.${obstaclesId}`)) && !(await seen('memory-forgotten')));
    await tap('memory-back');
    await page.waitForTimeout(600);
    check('Back from the memory screen is Settings', await seen('screen-settings'));

    // ---- the PRD's link shapes (9.2, 9.3) land on the app's screens; nowhere lands on Today
    const linkLands = async (path, screen, more = async () => true) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.clock.runFor(1500);
      await page.waitForTimeout(700);
      check(`${path} lands on ${screen}`, (await seen(screen)) && (await more()), new URL(page.url()).pathname);
    };
    await linkLands(`/goals/${g0.id}/stone/obstacles`, 'screen-stone', async () => (await seen('stone-line2')));
    await linkLands('/book/sunday', 'screen-reading');
    await linkLands('/settings/memory', 'screen-memory');
    const letterId = await page.evaluate(() => (JSON.parse(localStorage.getItem('morrow-v1') ?? '{}').state?.letters ?? []).map((l) => l.id)[0] ?? '');
    // The first letter, which arrived on day one; the last is one written to the future and not yet due.
    check('there is a letter to link to', letterId.length > 0);
    await linkLands(`/letter/${letterId}`, 'screen-letters', async () => (await page.locator('[data-testid^="letter-letter"]').first().getAttribute('data-testid')) === `letter-${letterId}`);
    await linkLands('/no-such-screen', 'screen-today');
    check('and the unmatched page is never shown', !(await page.locator('body').innerText()).includes('Unmatched Route'));

    // Consent reached by its own URL has nothing behind it; Back did nothing
    // at all, on the one screen a person can land on before anything exists.
    await page.goto(`${BASE}/consent`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    await tap('consent-back');
    await page.waitForTimeout(600);
    check('Back on a consent screen opened by its own link goes somewhere', !(await seen('screen-consent')));

    // ---- a cold launch with nothing but the two volumes: Today, not Welcome page one
    await page.evaluate(() => {
      const k = 'morrow-v1';
      const st = JSON.parse(localStorage.getItem(k) ?? '{}');
      const keep = {
        profile: st.state.profile,
        presentPicks: st.state.presentPicks,
        presentDraft: st.state.presentDraft,
        pastEpochs: st.state.pastEpochs,
        pastEvents: st.state.pastEvents,
        pastListed: st.state.pastListed,
      };
      localStorage.setItem(k, JSON.stringify({ ...st, state: keep }));
    });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1500);
    await page.waitForTimeout(700);
    check('a person who did only Present and Past opens on Today, not on Welcome again', (await seen('screen-today')) && !(await seen('screen-welcome')));
    check('and Today says what is there rather than "Nothing here yet"', !(await noticeText('today-path')).includes('Nothing here yet'), await noticeText('today-path'));
    check('with a way back into the finished volume', await seen('today-reread-past'));
    await tap('today-reread-present');
    await page.waitForTimeout(500);
    check('Reread your Present prints the lines themselves', (await seen('present-done-lines')) && (await page.locator('body').innerText()).includes('The Tuesday it cost me'));
    check(
      'and points to the other half from there',
      (await seen('present-other-half')) || (await noticeText('present-next-half')).toLowerCase().includes('good at'),
      await noticeText('present-next-half'),
    );
    await page.goBack({ waitUntil: 'commit' }).catch(() => {});
    await page.waitForTimeout(500);
    check('and the door is named as the three volumes', (await noticeText('today-other-volumes')).toLowerCase().includes('three volumes'), await noticeText('today-other-volumes'));
    await page.goto(`${BASE}/?intro=1`, { waitUntil: 'networkidle' });
    await page.clock.runFor(1200);
    await page.waitForTimeout(500);
    check('the introduction can still be seen again on request', await seen('screen-welcome'));

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
