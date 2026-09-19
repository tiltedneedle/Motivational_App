/**
 * The screen stays on while this is mounted (PRD §7.5: the runner "keeps the
 * screen awake"; and a room being spoken into, where nobody is touching the
 * screen, would otherwise lock on a phone and take the microphone with it).
 *
 * A component rather than a call, so a screen can keep the phone awake for
 * one phase of itself and not another without breaking the rules of hooks.
 * Deactivation is quiet: a lock that was never granted — a browser without
 * the Wake Lock API, a tab in the background — is not an error worth a line.
 *
 * In a browser the lock is let go the moment the tab is hidden and is not
 * given back on return, so this asks again when the page comes back into
 * view. On a phone the operating system holds the lock itself.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake, useKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function KeepAwake({ tag }: { tag: string }) {
  useKeepAwake(tag, { suppressDeactivateWarnings: true });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const back = () => {
      if (document.visibilityState !== 'visible') return;
      // The lock the browser let go of is released on this side too before a
      // new one is asked for, so the module's map never holds a lock twice.
      deactivateKeepAwake(tag)
        .catch(() => undefined)
        .then(() => activateKeepAwakeAsync(tag))
        .catch(() => undefined);
    };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [tag]);

  return null;
}
