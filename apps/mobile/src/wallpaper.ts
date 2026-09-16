/**
 * The lock screen (PRD §7.8: "wallpapers … export to Photos on iOS").
 *
 * The wallpaper is a view — the "I will" line typeset in the serif on the
 * night ground — and this is the edge that turns the view into an image and
 * puts it somewhere. On a phone: a capture to a file, then Photos, with the
 * one permission that is only the right to add. On the web: the same
 * capture as a PNG the browser downloads. Both modules are loaded lazily
 * behind a try/catch; a build without either says so in one sentence.
 */
import { Platform } from 'react-native';
import type { RefObject } from 'react';

export type WallpaperResult =
  | { ok: true; how: 'photos' | 'downloaded' | 'shared' }
  | { ok: false; error: string };

const NO_WAY = 'This device cannot make the image. The line is still in the Book.';
const REFUSED = 'Photos was not allowed. You can allow it in Settings, or share the image instead.';

/** Lock-screen pixels for the current run of phones; the view is drawn at a third of this. */
export const WALLPAPER = { width: 1170, height: 2532, scale: 3 } as const;

/** The pixel size the print is captured at: the lock screen's by default, or the Declaration's square. */
export type PrintSize = { width: number; height: number };

async function capture(ref: RefObject<unknown>, result: 'tmpfile' | 'data-uri', size: PrintSize = WALLPAPER): Promise<string | null> {
  try {
    const shot: any = await import('react-native-view-shot');
    const uri: string = await shot.captureRef(ref, {
      format: 'png',
      quality: 1,
      result,
      width: size.width,
      height: size.height,
    });
    return uri || null;
  } catch {
    return null;
  }
}

/** Save the wallpaper where the platform keeps images. */
export async function saveWallpaper(ref: RefObject<unknown>, fileName = 'morrow-lock-screen.png', size: PrintSize = WALLPAPER): Promise<WallpaperResult> {
  if (Platform.OS === 'web') {
    const data = await capture(ref, 'data-uri', size);
    if (!data) return { ok: false, error: NO_WAY };
    try {
      const a = globalThis.document.createElement('a');
      a.href = data;
      a.download = fileName;
      a.click();
      return { ok: true, how: 'downloaded' };
    } catch {
      return { ok: false, error: NO_WAY };
    }
  }

  const uri = await capture(ref, 'tmpfile', size);
  if (!uri) return { ok: false, error: NO_WAY };
  try {
    const media: any = await import('expo-media-library/legacy');
    // Add-only: the app never needs to read anybody's photos.
    const granted = await media.requestPermissionsAsync(true);
    if (!granted?.granted) return { ok: false, error: REFUSED };
    await media.saveToLibraryAsync(uri);
    return { ok: true, how: 'photos' };
  } catch {
    return { ok: false, error: NO_WAY };
  }
}

/** Hand the wallpaper to the share sheet instead — the way onto Android's lock screen, among others. */
export async function shareWallpaper(ref: RefObject<unknown>, fileName = 'morrow-lock-screen.png', title = 'Your lock screen', size: PrintSize = WALLPAPER): Promise<WallpaperResult> {
  if (Platform.OS === 'web') return saveWallpaper(ref, fileName, size);
  const uri = await capture(ref, 'tmpfile', size);
  if (!uri) return { ok: false, error: NO_WAY };
  try {
    const sharing: any = await import('expo-sharing');
    if (!(await sharing.isAvailableAsync())) return { ok: false, error: 'There is nowhere to share it to on this device.' };
    await sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
    return { ok: true, how: 'shared' };
  } catch {
    return { ok: false, error: NO_WAY };
  }
}
