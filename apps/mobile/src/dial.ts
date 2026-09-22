/**
 * Opening a helpline: a number in the dialler, a domain in the browser.
 *
 * `canOpenURL` is asked only on iOS. On Android 11 and later it answers "no"
 * for tel: unless the manifest declares a dial query, so every helpline read
 * as undiallable on exactly the phones that could dial it; on the web it is
 * hard-coded to "yes", so it says nothing. Both go straight to `openURL` and
 * treat a rejection as the failure. One function, because the resources
 * card and Settings list the same numbers and had drifted apart.
 */
import { Linking, Platform } from 'react-native';

export function helplineTarget(contact: string): string {
  return contact.includes('.') ? `https://${contact}` : `tel:${contact.replace(/\s/g, '')}`;
}

/** True when the OS took it; false when the person needs the number to copy instead. */
export async function openHelpline(contact: string): Promise<boolean> {
  const target = helplineTarget(contact);
  try {
    if (Platform.OS === 'ios') {
      const handled = await Linking.canOpenURL(target).catch(() => true);
      if (!handled) return false;
    }
    await Linking.openURL(target);
    return true;
  } catch {
    return false;
  }
}
