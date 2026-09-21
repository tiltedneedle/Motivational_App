/**
 * Getting the person's writing out of the app, whatever the platform can do.
 *
 * On a phone the share sheet is the way, and it is what `Share.share` opens.
 * On the web the sheet exists only on some browsers (Safari, Chrome on a
 * phone or a Mac); on Firefox, Chrome on Linux and most webviews it does
 * not, and the one control that promises the writing is theirs to take away
 * used to apologise and do nothing. So: the sheet when there is one, a file
 * download when there is not, the clipboard after that — and a closed sheet
 * is "not sent", not a failure.
 */
import { Platform, Share } from 'react-native';

export type Takeaway =
  | { ok: true; how: 'shared' | 'downloaded' | 'copied' }
  | { ok: false; how: 'dismissed' | 'failed'; error: string };

const NOTHING_LEFT = 'This device would not open the share sheet, so nothing left the app. Everything is still here, and you can try again.';

export async function takeAway(text: string, title: string, fileName = 'morrow-export.txt'): Promise<Takeaway> {
  if (Platform.OS === 'web') return takeAwayOnWeb(text, title, fileName);
  try {
    const r = await Share.share({ message: text, title });
    const action = (r as { action?: string } | undefined)?.action;
    if (action === Share.dismissedAction) return { ok: false, how: 'dismissed', error: 'Not sent.' };
    return { ok: true, how: 'shared' };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return aborted ? { ok: false, how: 'dismissed', error: 'Not sent.' } : { ok: false, how: 'failed', error: NOTHING_LEFT };
  }
}

async function takeAwayOnWeb(text: string, title: string, fileName: string): Promise<Takeaway> {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, text });
      return { ok: true, how: 'shared' };
    } catch (err) {
      // The sheet opened and was closed: nothing went, nothing failed.
      if (err instanceof Error && err.name === 'AbortError') return { ok: false, how: 'dismissed', error: 'Not sent.' };
      // The sheet refused the payload (some browsers cap the text): fall
      // through to a file.
    }
  }
  if (download(text, fileName)) return { ok: true, how: 'downloaded' };
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return { ok: true, how: 'copied' };
    }
  } catch {
    // The clipboard needs a user gesture on some browsers; nothing else to try.
  }
  return { ok: false, how: 'failed', error: NOTHING_LEFT };
}

/** A file, through an anchor the DOM holds for the click. False when there is no DOM. */
function download(text: string, fileName: string): boolean {
  const doc = (globalThis as { document?: Document }).document;
  const url = (globalThis as { URL?: typeof URL }).URL;
  if (!doc || !url || typeof Blob === 'undefined') return false;
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const href = url.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = href;
    a.download = fileName;
    a.style.display = 'none';
    doc.body.appendChild(a);
    a.click();
    setTimeout(() => {
      doc.body.removeChild(a);
      url.revokeObjectURL(href);
    }, 1000);
    return true;
  } catch {
    return false;
  }
}

/** One line for the screen, true of what happened. */
export function takeawayNote(t: Takeaway, what = 'it'): string {
  if (!t.ok) return t.error;
  if (t.how === 'downloaded') return `Downloaded ${what} as a text file.`;
  if (t.how === 'copied') return `Copied ${what} to the clipboard.`;
  return 'Handed to the share sheet.';
}
