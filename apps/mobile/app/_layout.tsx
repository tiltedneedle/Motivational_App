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
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // A font that will not load must never be the reason someone cannot write.
  const ready = (fontsLoaded || Boolean(fontError) || slow) && (hydrated || slow);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: day.ground }} testID="boot">
        <ActivityIndicator color={day.ink} />
        <Text style={{ marginTop: 12, color: day.ink3, fontSize: 13 }}>Opening the studio…</Text>
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
