import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useFonts as useOutfit, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { day } from '@morrow/ui';
import { useMorrow } from '../src/store';
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
  const paused = useMorrow((s) => s.safetyPause !== null);
  const storageError = useMorrow((s) => s.storageError);
  const [slowFonts, setSlowFonts] = useState(false);
  const [slowStore, setSlowStore] = useState(false);

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
