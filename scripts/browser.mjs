/**
 * The browser every check drives, opened the same way everywhere.
 *
 * Playwright's own Chromium first (what CI installs, and what the driver in
 * the lockfile expects); then, only if that is not there, a headless shell
 * already on this machine, so a laptop with an older build can still run the
 * suite without downloading a second copy. `PLAYWRIGHT_CHROMIUM_PATH` beats
 * both.
 *
 * One function because there were six copies of this loop in six scripts,
 * and they drifted: one of them ended up trying the Windows path first and
 * throwing its error on CI, where that path could never exist.
 */
import { chromium } from 'playwright';

/** A headless shell that may be on this machine already. Tried last, never first. */
const LOCAL_SHELLS = ['C:/Users/HP/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'];

export async function launchBrowser(options = {}) {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const tries = [...(explicit ? [explicit] : []), undefined, ...LOCAL_SHELLS];
  let last = null;
  for (const executablePath of tries) {
    try {
      return await chromium.launch(executablePath ? { ...options, executablePath } : options);
    } catch (err) {
      last = err;
    }
  }
  throw last ?? new Error('no Chromium: run `npx playwright install chromium`');
}
