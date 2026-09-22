import { Stack, usePathname, useRouter } from 'expo-router';
// For its side effect, and it has to be from here: the browser's back is
// intercepted by a listener that must be registered before the navigation
// container below adds its own, and the screens that use the hook are lazy
// chunks loaded long after that. See src/platform-back.ts.
import '../src/platform-back';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, View, Text, ActivityIndicator, useColorScheme } from 'react-native';
import { useFonts as useOutfit, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { day } from '@morrow/ui';
import { darkOf, useMorrow } from '../src/store';
import { StatusBar } from 'expo-status-bar';
import { hasStoredSession, signInFromUrl } from '../src/supabase';
import { onNotificationOpened } from '../src/notify';
import { armAnalytics, track } from '../src/analytics';
import { SafetyGate } from '../src/components/SafetyGate';
import { StorageWarning } from '../src/components/StorageWarning';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useOutfit({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
  });
  const router = useRouter();
  const hydrated = useMorrow((s) => s.hydrated);
  // PRD 7.14: dark when the system is, unless they pinned one. The store
  // derives the mode; the tokens are a view over it.
  const scheme = useColorScheme();
  useEffect(() => {
    useMorrow.setState({ systemDark: scheme === 'dark' });
  }, [scheme]);
  const paused = useMorrow((s) => s.safetyPause !== null);
  // On the web, aria-hidden takes the screen out of the accessibility tree
  // but not out of the tab order: the editor behind the card kept its caret.
  // `inert` takes both.
  const behind = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = behind.current as unknown as { inert?: boolean } | null;
    if (node) node.inert = paused;
  }, [paused]);
  const storageError = useMorrow((s) => s.storageError);
  const dark = useMorrow(darkOf);
  const newVersionReady = useMorrow((s) => s.newVersionReady);
  const [slowFonts, setSlowFonts] = useState(false);
  const [slowStore, setSlowStore] = useState(false);

  /**
   * Reconcile the schedule once the disk has been read, and again whenever the
   * app comes back to the front (PRD §7.11: the schedule survives a reboot).
   *
   * Idempotent: the planner produces stable ids and the adapter drops anything
   * already scheduled or already past. Nothing here can fail loudly — a device
   * with no scheduler, or one that refuses permission, simply stays quiet.
   */
  // The navigator's own path, for handlers that run outside render.
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const syncNotifications = useMorrow((s) => s.syncNotifications);
  useEffect(() => {
    if (!hydrated) return;
    void syncNotifications();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncNotifications();
    });
    // And whenever what the notices are planned from changes — a day
    // closed, a move kept or parked, a plan built or replanned — after a
    // beat. Reconciled only on the next foreground, the evening line asked
    // to close a day closed an hour before, and the morning line named a
    // move parked the night before.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useMorrow.subscribe((s, prev) => {
      if (s.days === prev.days && s.plans === prev.plans && s.practices === prev.practices && s.goals === prev.goals) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncNotifications(), 1500);
    });
    return () => {
      sub.remove();
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [hydrated, syncNotifications]);

  /**
   * The web on a phone, three things the browser will not do by itself.
   * Persistent storage is asked for once (Chromium honours it and stops
   * evicting the site under pressure; elsewhere it is harmless). iOS Safari
   * never shrinks the layout viewport for its keyboard, so the root is
   * sized to the visual viewport while the keyboard is up and a screen's
   * footer button stays reachable. And the service worker's word that a
   * newer build has shipped is kept, so the line above the router can say
   * so rather than the old page failing to fetch chunks that have gone.
   */
  const setNewVersionReady = useMorrow((s) => s.setNewVersionReady);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !hydrated) return;
    try {
      void (navigator as { storage?: { persist?: () => Promise<boolean> } }).storage?.persist?.();
    } catch {
      // not offered here
    }
    const vv = (window as { visualViewport?: VisualViewport }).visualViewport;
    const root = document.getElementById('root');
    let wasUp = false;
    const onViewport = () => {
      if (!vv || !root) return;
      // At scale 1 only: pinch-zoom shrinks the visual viewport too, and
      // this used to squash the app into the top half of a zoomed page.
      const keyboardUp = vv.scale === 1 && vv.height < window.innerHeight - 120;
      root.style.height = keyboardUp ? `${Math.round(vv.height)}px` : '';
      if (keyboardUp && !wasUp) window.scrollTo(0, 0);
      wasUp = keyboardUp;
    };
    vv?.addEventListener('resize', onViewport);
    vv?.addEventListener('scroll', onViewport);
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'morrow:new-version') setNewVersionReady(true);
    };
    navigator.serviceWorker?.addEventListener?.('message', onMessage);
    return () => {
      vv?.removeEventListener('resize', onViewport);
      vv?.removeEventListener('scroll', onViewport);
      navigator.serviceWorker?.removeEventListener?.('message', onMessage);
      if (root) root.style.height = '';
    };
  }, [hydrated, setNewVersionReady]);

  /**
   * The day, kept current. Ticked on foreground, when a tab comes back into
   * view on the web, and at the boundary hour itself while the app is open
   * — so a screen left up overnight is on the new day by morning.
   */
  const tickClock = useMorrow((s) => s.tickClock);
  const boundaryHour = useMorrow((s) => s.profile.dayBoundaryHour);
  useEffect(() => {
    if (!hydrated) return;
    tickClock();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') tickClock();
    });
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') tickClock();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    // A timer for the next boundary. Re-armed after each firing (and each
    // foreground, through the effect's dependencies staying the same but the
    // timeout being recomputed on tick) — a timer set for tomorrow's boundary
    // survives a laptop lid closed and reopened, because it is checked
    // against the clock rather than counted.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(boundaryHour, 0, 5, 0);
      if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
      const wait = Math.min(next.getTime() - now.getTime(), 6 * 60 * 60 * 1000);
      timer = setTimeout(() => {
        tickClock();
        arm();
      }, wait);
    };
    arm();
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
      if (timer) clearTimeout(timer);
    };
  }, [hydrated, tickClock, boundaryHour]);

  /**
   * The copy, kept current (PRD §7.12). Once the disk has been read and the
   * session is known, and again whenever the app goes to the background —
   * the moment the process can be reaped is the moment the copy should be
   * whole. Nothing here can fail loudly; Settings says when the last copy
   * landed, and the next launch tries again.
   */
  const pushToAccount = useMorrow((s) => s.pushToAccount);
  const setAccount = useMorrow((s) => s.setAccount);
  useEffect(() => {
    if (!hydrated) return;
    // The auth layer may hold a session the store does not know about yet —
    // a relaunch after signing in — so ask it first. Once, at hydration:
    // keyed on the account as well, this re-ran the moment someone signed
    // in and pushed an empty device's defaults over the account's profile
    // while the sign-in screen was still pulling it down.
    // Only when there is an account to ask about: the store knows one, or
    // the auth layer holds a session from a sign-in on a previous launch.
    // Asked unconditionally, this loaded the account library on every
    // launch for a person who had never signed in.
    void (async () => {
      if (!useMorrow.getState().account && !(await hasStoredSession())) return;
      await setAccount();
      if (useMorrow.getState().account) void pushToAccount();
    })();
    // On 'background', not every non-active state: iOS says 'inactive' and
    // then 'background' on the way out, and pulling down Notification
    // Centre says 'inactive' alone — each of which started a whole push.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && useMorrow.getState().account) void pushToAccount();
    });
    return () => sub.remove();
  }, [hydrated, setAccount, pushToAccount]);

  /**
   * A tapped notification opens its screen (PRD §7.11). Subscribed once the
   * store is readable, so the screen it opens has something to show, and
   * only routes of the app's own shape are followed.
   */
  /**
   * The sign-in link (PRD §7.12, and the free tier's email). The URL that
   * opened the app, and any that arrives while it is open, is offered to the
   * auth server; a session that comes back lands on the account screen,
   * which knows what to do with a signed-in device. Every other URL is left
   * to the router.
   */
  useEffect(() => {
    if (!hydrated) return;
    const handle = async (url: string | null) => {
      const out = await signInFromUrl(url);
      if (!out) return;
      // Back from Google the tab is already on /account (and a cold start
      // from morrow://account?code=… lands there too): replace, or the
      // person lands on the second of two account screens.
      const here = pathnameRef.current === '/account';
      if (out.ok) {
        await setAccount();
        if (here) router.replace('/account');
        else router.push('/account');
      } else {
        // Said on the account screen, where the person is, not on a toast
        // only Today draws; and the used-up ?code= is dropped from the URL
        // so a reload does not fail the same way again.
        useMorrow.getState().setSignInNotice(out.error);
        if (here) router.replace('/account');
        else router.push('/account');
      }
    };
    void Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => sub.remove();
  }, [hydrated, router, setAccount]);

  useEffect(() => {
    if (!hydrated) return;
    let off: (() => void) | null = null;
    let gone = false;
    armAnalytics();
    void onNotificationOpened((route) => {
      track({ name: 'notification_opened', route });
      router.push(route as never);
    }).then((unsubscribe) => {
      if (gone) unsubscribe();
      else off = unsubscribe;
    });
    return () => {
      gone = true;
      off?.();
    };
  }, [hydrated, router]);

  useEffect(() => {
    // Two timers, because the two things they wait for are not alike.
    const fonts = setTimeout(() => setSlowFonts(true), 4000);
    const store = setTimeout(() => setSlowStore(true), 6000);
    return () => {
      clearTimeout(fonts);
      clearTimeout(store);
    };
  }, []);

  // A font that will not load must never be the reason someone cannot write.
  const typeReady = fontsLoaded || Boolean(fontError) || slowFonts;

  // The store is different, and it used to share the same escape hatch. Coming
  // up before the disk has been read means starting a person as though they
  // were new: they would see an empty app, and rehydration landing afterwards
  // replaces whatever they wrote in that window with what was on disk. So this
  // one does not time out. If the read fails outright, `storageError` is set
  // and the app opens in a state that refuses to write rather than one that
  // silently overwrites.
  const storeReady = hydrated || storageError;

  if (!typeReady || !storeReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: day.ground }} testID="boot">
        <ActivityIndicator color={day.ink} />
        <Text style={{ marginTop: 12, color: day.ink2, fontSize: 13, textAlign: 'center' }}>
          {slowStore && !storeReady
            ? 'Still finding your writing. It is on this device; this is only taking a moment longer than usual.'
            : 'Opening the studio…'}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/*
          The app is light by default whatever the phone's scheme; the status
          bar has to be told, or on a dark-mode phone the clock and the
          battery were white over the pale ground on every screen.
        */}
        <StatusBar style={dark ? 'light' : 'dark'} />
        {/*
          While the resources card is up, the screen behind it is hidden from
          assistive technology. The card's own `accessibilityViewIsModal` only
          does this on iOS, so without it a screen-reader user on Android or the
          web could tab straight past a crisis card into the writing that raised
          it.
        */}
        {/*
          Above the router, so it is on every screen and cannot be navigated
          away from. A store that will not save is not a per-screen problem.
        */}
        {newVersionReady ? (
          <View
            testID="new-version"
            accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: day.surface2 }}
          >
            <Text style={{ flex: 1, color: day.ink, fontSize: 14 }}>A newer Morrow is ready.</Text>
            <Text
              accessibilityRole="button"
              onPress={() => {
                if (typeof window !== 'undefined') window.location.reload();
              }}
              style={{ color: day.ink, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }}
            >
              Reload
            </Text>
          </View>
        ) : null}
        {storageError ? (
          <StorageWarning
            onExport={() => router.push('/settings')}
            onFresh={() => {
              // Signed out as well, as Settings' delete is: a session kept
              // through the reset was adopted on the next launch, and the
              // fresh start pushed itself over the account's Book.
              void useMorrow.getState().signOutAccount();
              useMorrow.getState().reset();
              useMorrow.setState({ storageError: false });
              router.replace('/');
            }}
          />
        ) : null}
        <View
          ref={behind}
          style={{ flex: 1 }}
          importantForAccessibility={paused ? 'no-hide-descendants' : 'auto'}
          aria-hidden={paused}
        >
          <ErrorBoundary onReset={() => router.replace('/today')}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: day.ground },
                animation: 'fade',
              }}
            />
          </ErrorBoundary>
        </View>
        {/* last in the tree, so it paints above whatever screen is showing */}
        <SafetyGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
