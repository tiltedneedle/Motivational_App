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
 * So this module is imported by the app's entry (`index.js`), before the
 * router exists at all. Imported from the root layout instead it was a coin
 * toss — with async routes the container mounts and subscribes while the
 * layout's chunk is still being fetched — and on the loads it lost, the
 * router answered the pop first, reset the navigator, and this handler ran
 * two milliseconds later to find the screen that had promised an undo
 * already unmounted. Three loads in twelve here, and four CI runs.
 *
 * A back that leaves the document — a screen opened by typing its URL, with
 * nothing of the app's behind it — fires no popstate and is not the app's to
 * intercept; that is the browser's, the same as on any site.
 */
import { useNavigation, usePathname } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface Handler {
  canStepBack: boolean;
  stepBack: () => void;
  /** The path this screen lives at, as the browser showed it when the screen mounted. */
  path: string;
}

/**
 * Kept for the root layout, which called it while this module tracked where
 * the app was. It tracks nothing now — see `onPopState` — and the call is
 * harmless; the export stays so the layout needs no special knowledge.
 */
export function setAppPath(_next: string): void {
  // nothing: the pop says for itself where it landed
}

/** The screens mounted right now that use this, the one on top last. */
const mounted: { current: Handler }[] = [];

/**
 * The last screen to arm or disarm, and when — evidence, for the same
 * reason `note` exists. A pop that arrives to an empty stack is either a
 * screen that was never armed or one the router tore down in the same event,
 * and those are different faults with the same symptom.
 */
let lastChange: { path: string; armed: boolean; at: number } | null = null;

// The step forward fires a popstate of its own, which is likewise kept from
// the container: by the time it lands, the browser is back where the
// navigator already thinks it is.
let restoring = false;

function onPopState(e: { stopImmediatePropagation: () => void }): void {
  if (restoring) {
    restoring = false;
    e.stopImmediatePropagation();
    return;
  }
  /**
   * Where the browser has landed. This is the whole question, and the only
   * thing that can be known for certain when a pop arrives.
   *
   * The rule: a pop that lands somewhere other than the top screen's own
   * path is the browser leaving that screen, and the screen answers it with
   * one step back. A pop that lands on the top screen's own path is
   * something above it closing — the privacy details over set-up — and is
   * the browser's to finish.
   *
   * This used to ask instead where the app *was*, tracked by patching
   * `history.pushState`. That held here and not on CI's machine, where the
   * router moves the URL by some other route: the tracked value stayed at
   * whatever the page first loaded with, never matched the screen asking,
   * and the browser's back simply left every screen that had promised to
   * undo. Reading the router's own path instead was worse: on a back the
   * app asks for, the route updates before the URL does, so "where we were"
   * was already the destination and the details' Back ate a set-up step.
   */
  const landing = window.location.pathname;
  const top = mounted[mounted.length - 1]?.current;
  const acted = Boolean(top?.canStepBack) && top?.path !== landing;
  note({ landing, screens: mounted.map((m) => m.current.path), acted });
  if (!acted || !top) return;
  e.stopImmediatePropagation();
  restoring = true;
  window.history.go(1);
  top.stepBack();
}

/**
 * The last pop, on `window.__morrowBack`, so a check that fails can say why
 * rather than "false". Web only, a few bytes, and nothing reads it in the
 * product: three checks failed on CI's machine and on no machine here, and
 * a bare pass/fail is not evidence.
 */
let pops = 0;
function note(what: { landing: string; screens: string[]; acted: boolean }): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  pops += 1;
  const since = lastChange ? { ...lastChange, msAgo: Date.now() - lastChange.at } : null;
  // The count matters as much as the rest: a back that leaves the document
  // never reaches this listener at all, and without a count a check cannot
  // tell that from a pop this handler saw and stood aside from.
  (window as unknown as { __morrowBack?: unknown }).__morrowBack = { ...what, pops, since };
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('popstate', onPopState);
  // What is armed at this moment, read rather than kept: a check that means
  // to press the browser's back on a screen that has promised an undo can
  // wait for the promise instead of guessing at how long a commit takes.
  // Costs nothing until something asks.
  Object.defineProperty(window, '__morrowScreens', {
    configurable: true,
    get: () => mounted.map((m) => ({ path: m.current.path, canStepBack: m.current.canStepBack })),
  });
}

/**
 * A screen's promise is armed in the commit that puts it on the glass, not a
 * beat later: a layout effect, not a passive one.
 *
 * CI painted the Present writing step, took the browser's back six hundred
 * milliseconds afterwards, and this handler found an empty stack — the
 * passive effect had not been given its slot on a loaded machine, so for
 * that stretch the screen was plainly there and its undo did not exist, and
 * the browser did what it does with a screen that promised nothing: it left,
 * with the writing in it. Off the web it stays passive; nothing there can
 * outrun a commit.
 */
const useArm = Platform.OS === 'web' ? useLayoutEffect : useEffect;

export function usePlatformBack(canStepBack: boolean, stepBack: () => void): void {
  const navigation = useNavigation();
  // The screen's own path, taken once at mount from the navigator — which
  // already has this screen as the route in front — rather than from the
  // browser, which is still showing the previous screen's URL at that
  // moment. A later render may happen with another screen's path current.
  const pathname = usePathname();
  // Captured once, at mount. (State rather than a ref read in render: the
  // React Compiler skips a hook that reads a ref while rendering, and this
  // hook is on every screen.)
  const [path] = useState(pathname);
  // Read at the moment of the event, never from a closure that has gone
  // stale: a listener remade on every change was still one render behind on
  // Full's writing screen.
  const latest = useRef<Handler>({ canStepBack, stepBack, path });
  useEffect(() => {
    latest.current = { canStepBack, stepBack, path };
  });

  // iOS's interactive pop completes before `beforeRemove` can refuse it:
  // the screen slides away, is put back, and only then steps back. While a
  // step can be undone the edge swipe is off, and the hardware/back button
  // path below still answers. Android's predictive gesture takes the same
  // native-first path, so it is off there too.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      (navigation as { setOptions?: (o: Record<string, unknown>) => void }).setOptions?.({ gestureEnabled: !canStepBack });
    } catch {
      // not a stack
    }
  }, [navigation, canStepBack]);

  useEffect(() => {
    const off = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data?: { action?: { type?: string } } }) => {
      if (!latest.current.canStepBack) return;
      // Only the person's back is an undo. A replace, a reset or a dismiss the
      // app itself asked for (set-up sending a finished person to Today) is
      // not, and preventing it left the screen stuck one step back.
      const type = e.data?.action?.type;
      // Only GO_BACK and POP: a dismiss the app asks for (POP_TO) is not
      // an undo either, and treated as one it swallowed every dismissTo
      // above a finished Interview, rewinding hidden answers a tap at a time.
      if (type !== 'GO_BACK' && type !== 'POP') return;
      e.preventDefault();
      latest.current.stepBack();
    });
    return off;
  }, [navigation]);

  useArm(() => {
    mounted.push(latest);
    lastChange = { path: latest.current.path, armed: true, at: Date.now() };
    return () => {
      const at = mounted.indexOf(latest);
      if (at >= 0) mounted.splice(at, 1);
      lastChange = { path: latest.current.path, armed: false, at: Date.now() };
    };
  }, []);
}
