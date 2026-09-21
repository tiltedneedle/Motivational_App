/**
 * The platform's back — the Android button, the iOS edge swipe, the browser's
 * arrow — as one step back within a screen, for as long as the screen has a
 * step to give, and only then a way out (GOV.UK, Baymard).
 *
 * Native: `beforeRemove`. The native stack emits it for a pop and honours it
 * when prevented, which is the whole mechanism.
 *
 * Web: expo-router answers the browser's back by resetting the navigator to
 * the previous history record (`navigation.resetRoot` in its forked
 * `useLinking`), and a reset emits no `beforeRemove`, so nothing a screen
 * listens for can stop it. Every screen in the app that promised "back is an
 * undo" was making that promise to native only. So on web the popstate is
 * taken here first, the browser is stepped forward again to the entry it just
 * left, and the screen steps back itself. The URL never settles anywhere else
 * and the navigator is untouched, so nothing remounts.
 *
 * "First" is a matter of registration order: listeners on one target run in
 * the order they were added, and the container adds its own when it mounts.
 * This module is imported by the root layout for exactly that reason — the
 * route screens that use the hook are lazy chunks, loaded long after the
 * container has subscribed, and a listener registered from one of them ran
 * second and saw the screen already gone.
 *
 * A back that leaves the document — a screen opened by typing its URL, with
 * nothing of the app's behind it — fires no popstate and is not the app's to
 * intercept; that is the browser's, the same as on any site.
 */
import { useNavigation, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface Handler {
  canStepBack: boolean;
  stepBack: () => void;
  /** The path this screen lives at, as the browser showed it when the screen mounted. */
  path: string;
}

/**
 * The path the browser was on before the pop being handled. A pop that
 * leaves some other screen — the privacy details pushed over set-up — is
 * that screen's, and no handler underneath it may take it as its own. The
 * browser has already moved by the time popstate fires, so the path is
 * tracked as it changes.
 */
// On React Native `window` is the global and has no `location`; only the
// web build reads it (a module-level read here crashed a native boot).
let currentPath = Platform.OS === 'web' && typeof window !== 'undefined' && window.location ? window.location.pathname : '/';
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = ((...args: Parameters<History['pushState']>) => {
      const out = original(...args);
      currentPath = window.location.pathname;
      return out;
    }) as History['pushState'];
  }
}

/** The screens mounted right now that use this, the one on top last. */
const mounted: { current: Handler }[] = [];

// The step forward fires a popstate of its own, which is likewise kept from
// the container: by the time it lands, the browser is back where the
// navigator already thinks it is.
let restoring = false;

function onPopState(e: { stopImmediatePropagation: () => void }): void {
  const leaving = currentPath;
  currentPath = window.location.pathname;
  if (restoring) {
    restoring = false;
    e.stopImmediatePropagation();
    return;
  }
  const top = mounted[mounted.length - 1]?.current;
  if (!top?.canStepBack) return;
  // The pop belongs to the screen the browser is leaving. A handler for a
  // screen underneath it — set-up under the privacy details — stays out
  // of the way; it used to take that pop as its own step back. (The
  // navigator's own focus is no help here: on web it reports the screen
  // underneath as focused, and re-renders it after the URL has moved.)
  if (top.path !== leaving) return;
  e.stopImmediatePropagation();
  restoring = true;
  window.history.go(1);
  top.stepBack();
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('popstate', onPopState);
}

export function usePlatformBack(canStepBack: boolean, stepBack: () => void): void {
  const navigation = useNavigation();
  // The screen's own path, taken once at mount from the navigator — which
  // already has this screen as the route in front — rather than from the
  // browser, which is still showing the previous screen's URL at that
  // moment. A later render may happen with another screen's path current.
  const pathname = usePathname();
  const path = useRef(pathname).current;
  // Read at the moment of the event, never from a closure that has gone
  // stale: a listener remade on every change was still one render behind on
  // Full's writing screen.
  const latest = useRef<Handler>({ canStepBack, stepBack, path });
  useEffect(() => {
    latest.current = { canStepBack, stepBack, path };
  });

  useEffect(() => {
    const off = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data?: { action?: { type?: string } } }) => {
      if (!latest.current.canStepBack) return;
      // Only the person's back is an undo. A replace, a reset or a dismiss the
      // app itself asked for (set-up sending a finished person to Today) is
      // not, and preventing it left the screen stuck one step back.
      const type = e.data?.action?.type;
      if (type && type !== 'GO_BACK' && type !== 'POP' && type !== 'POP_TO') return;
      e.preventDefault();
      latest.current.stepBack();
    });
    return off;
  }, [navigation]);

  useEffect(() => {
    mounted.push(latest);
    return () => {
      const at = mounted.indexOf(latest);
      if (at >= 0) mounted.splice(at, 1);
    };
  }, []);
}
