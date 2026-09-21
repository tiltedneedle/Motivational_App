/**
 * The five tabs, on every one of the five screens.
 *
 * The bar lived on Today alone, so Coach → Book was Coach → Today → Book,
 * and on the web every visit was one more history entry. Now each tab
 * screen draws the bar; moving between two tabs replaces the one with the
 * other, so Today stays the one screen under them and Back from any tab is
 * Today.
 */
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { TabBar, type TabName } from '@morrow/ui';

const ROUTE: Record<Exclude<TabName, 'today'>, string> = {
  book: '/book',
  envision: '/envision',
  coach: '/coach',
  you: '/settings',
};

export function useGoTab(from: TabName): (tab: TabName) => void {
  const router = useRouter();
  return (tab) => {
    if (tab === from) return;
    if (tab === 'today') {
      router.dismissTo('/today');
      return;
    }
    const route = ROUTE[tab] as never;
    // From Today the tab is pushed over it; from another tab it takes that
    // tab's place.
    if (from === 'today') router.push(route);
    else router.replace(route);
  };
}

/** The bar, floated over the bottom of a tab screen. The screen leaves ~100pt of room under its content. */
export function FloatingTabs({ active }: { active: TabName }) {
  const goTab = useGoTab(active);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 10 }}>
      <TabBar active={active} onPress={goTab} />
    </View>
  );
}

/** How much room a screen leaves under its content for the floating bar. */
export const TAB_BAR_ROOM = 100;
