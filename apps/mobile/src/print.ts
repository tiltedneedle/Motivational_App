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
 */
import { Platform } from 'react-native';

export type PrintResult =
  | { ok: true; how: 'shared' | 'printed' }
  | { ok: false; error: string };

const NO_WAY =
  'This device has no way to make a PDF, so nothing was made. The Book is still here, and Settings can copy it out as text.';

export async function printBook(html: string, title: string): Promise<PrintResult> {
  if (Platform.OS === 'web') {
    try {
      const print: any = await import('expo-print');
      await print.printAsync({ html });
      return { ok: true, how: 'printed' };
    } catch {
      return { ok: false, error: NO_WAY };
    }
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
