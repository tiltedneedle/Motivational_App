import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, View, Text, ActivityIndicator, useColorScheme } from 'react-native';
import { useFonts as useOutfit, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { day } from '@morrow/ui';
import { useMorrow } from '../src/store';
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
  const syncNotifications = useMorrow((s) => s.syncNotifications);
  useEffect(() => {
    if (!hydrated) return;
    void syncNotifications();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncNotifications();
    });
    return () => sub.remove();
  }, [hydrated, syncNotifications]);

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
    void setAccount().then(() => {
      if (useMorrow.getState().account) void pushToAccount();
    });
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && useMorrow.getState().account) void pushToAccount();
    });
    return () => sub.remove();
  }, [hydrated, setAccount, pushToAccount]);

  /**
   * A tapped notification opens its screen (PRD §7.11). Subscribed once the
   * store is readable, so the screen it opens has something to show, and
   * only routes of the app's own shape are followed.
   */
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
        {storageError ? <StorageWarning onExport={() => router.push('/settings')} /> : null}
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
