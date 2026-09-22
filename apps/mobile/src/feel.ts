/**
 * The feel of the controls (PRD §8: haptics and sound).
 *
 * Three moments in the product are meant to be felt as well as seen: a stone
 * seating, a stone being parked, and a seal completing. Each is one call
 * here, gated by the person's own setting, and each is nothing at all on a
 * device that cannot do it — the web build, a tablet with no engine, a build
 * without the module. `expo-haptics` is loaded lazily behind a try/catch for
 * the same reason every other native edge is.
 *
 * Sound is deliberately not here yet: a seal with a sound needs an asset the
 * product does not have, and a placeholder click is worse than silence.
 */
import { Platform } from 'react-native';
import { useMorrow } from './store';

type Haptics = typeof import('expo-haptics');

let loaded: Haptics | null | undefined;

async function haptics(): Promise<Haptics | null> {
  if (loaded !== undefined) return loaded;
  if (Platform.OS === 'web') {
    loaded = null;
    return loaded;
  }
  try {
    loaded = await import('expo-haptics');
  } catch {
    loaded = null;
  }
  return loaded;
}

function allowed(): boolean {
  return useMorrow.getState().profile.hapticsOn !== false;
}

/** A stone finding its socket: one firm tap. */
export function feelSeat(): void {
  if (!allowed()) return;
  void haptics().then((h) => h?.impactAsync(h.ImpactFeedbackStyle.Medium).catch(() => {}));
}

/** A stone lifted out for the day: lighter, and not a verdict. */
export function feelPark(): void {
  if (!allowed()) return;
  void haptics().then((h) => h?.impactAsync(h.ImpactFeedbackStyle.Light).catch(() => {}));
}

/**
 * One fifth of the way through a hold (PRD §8.6: "1.6 s fill with a
 * `selection` tick every 20%"). The hold is the one gesture in the product
 * that asks a person to wait, and a hold that says nothing while it fills
 * is a hold people let go of.
 */
export function feelTick(): void {
  if (!allowed()) return;
  void haptics().then((h) => h?.selectionAsync().catch(() => {}));
}

/** A seal completing: the one success the product has a feeling for. */
export function feelSealed(): void {
  if (!allowed()) return;
  // Heavy, as the spec asks, and the notification's own success pattern
  // behind it: the first is the drop, the second is the word for it.
  void haptics().then((h) => {
    h?.impactAsync(h.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => void h?.notificationAsync(h.NotificationFeedbackType.Success).catch(() => {}), 90);
  });
}

/** The hold refused or released early: a small, honest nothing-happened. */
export function feelDrained(): void {
  if (!allowed()) return;
  void haptics().then((h) => h?.selectionAsync().catch(() => {}));
}
