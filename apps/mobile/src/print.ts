/**
 * Making a PDF of the Book (PRD §7.3: "Exports: PDF … a one-page print").
 *
 * The document itself is `bookToHtml` in core, tested there. This is only the
 * edge: hand that HTML to whatever the platform can turn it into a file with,
 * offer the file through the share sheet, and say plainly what happened when
 * neither is possible. Both modules are loaded lazily behind a try/catch for
 * the same reason the notifications are — a Book must never fail to open
 * because an export library is missing.
 *
 * On the web there is no file to hand over. The browser's own print dialogue
 * is the honest equivalent, and "Save as PDF" is in it on every platform.
 * But not through expo-print: its web build ignores the `html` it is handed
 * and prints whatever the page is showing, which is the app's own screen,
 * scroll view and all. The Book is written into a frame of its own and that
 * frame is what prints.
 */
import { Platform } from 'react-native';

export type PrintResult =
  | { ok: true; how: 'shared' | 'printed' }
  | { ok: false; error: string };

const NO_WAY =
  'This device has no way to make a PDF, so nothing was made. The Book is still here, and Settings can copy it out as text.';

export async function printBook(html: string, title: string): Promise<PrintResult> {
  if (Platform.OS === 'web') {
    return printInFrame(html, title);
  }

  try {
    const print: any = await import('expo-print');
    const sharing: any = await import('expo-sharing');
    const { uri } = await print.printToFileAsync({ html });
    if (await sharing.isAvailableAsync()) {
      await sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
      return { ok: true, how: 'shared' };
    }
    // A file was made but there is nowhere to hand it. Print it instead, which
    // on iOS and Android also offers Save as PDF.
    await print.printAsync({ html });
    return { ok: true, how: 'printed' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error && /cancel/i.test(err.message) ? 'Nothing was made; you closed it.' : NO_WAY,
    };
  }
}

/**
 * The web: the document in a hidden frame, printed from there.
 *
 * The frame is removed once the dialogue closes. `afterprint` fires on the
 * frame's window in every current browser; the timer is for the one that
 * does not, and for a dialogue that was cancelled before it opened.
 */
function printInFrame(html: string, title: string): Promise<PrintResult> {
  return new Promise((resolve) => {
    try {
      const doc = globalThis.document;
      if (!doc?.body) {
        resolve({ ok: false, error: NO_WAY });
        return;
      }
      const frame = doc.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('title', title);
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      doc.body.appendChild(frame);

      const win = frame.contentWindow;
      const inner = win?.document;
      if (!win || !inner) {
        frame.remove();
        resolve({ ok: false, error: NO_WAY });
        return;
      }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve({ ok: true, how: 'printed' });
      };
      const cleanup = () => frame.remove();
      // Chrome and Firefox block in print() until the dialogue closes, so the
      // frame can go the moment it returns. Safari returns at once and prints
      // from the frame afterwards, so the frame stays until afterprint says
      // it is finished — or a minute, for a dialogue that was cancelled in a
      // way that fires nothing.
      inner.open();
      inner.write(html);
      inner.close();
      // After close(), not before open(): document.open() erases every
      // listener on the frame's window, so one added first never fired and
      // the frame lived on for the full minute every time.
      win.addEventListener('afterprint', () => {
        finish();
        setTimeout(cleanup, 500);
      });
      // Fonts and layout settle on the next frame; printing before that
      // gives a blank first page in Safari.
      setTimeout(() => {
        try {
          win.focus();
          win.print();
          finish();
          setTimeout(cleanup, 60_000);
        } catch {
          cleanup();
          done = true;
          resolve({ ok: false, error: NO_WAY });
        }
      }, 50);
    } catch {
      resolve({ ok: false, error: NO_WAY });
    }
  });
}
