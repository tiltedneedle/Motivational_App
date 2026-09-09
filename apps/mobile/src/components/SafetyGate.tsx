/**
 * The resources card (PRD §11.6).
 *
 * It sits above every screen. When the local screen returns `crisis`, the
 * sitting pauses here: nothing was sent anywhere, nothing entered the coach's
 * memory, and the only way on is the user saying they are okay to continue.
 *
 * Two layout lessons are baked in, both found by the end-to-end run:
 *  - not an RN Modal (on web it painted above its own dismiss button);
 *  - not a flex:1 container (the card collapsed and the button fell outside it).
 * The last control a person in trouble touches must never be the fragile one.
 */
import { Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { HELPLINES, RESOURCES_COPY } from '@morrow/core';
import { day, night, radius, type as fonts } from '@morrow/ui';
import { useMorrow } from '../store';

export function SafetyGate() {
  const pause = useMorrow((s) => s.safetyPause);
  const clear = useMorrow((s) => s.clearSafety);
  const { height } = useWindowDimensions();

  if (!pause) return null;

  return (
    <View
      accessibilityViewIsModal
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        backgroundColor: night.scrim,
        justifyContent: 'flex-end',
      }}
    >
      <View
        testID="safety-card"
        style={{
          backgroundColor: day.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: 22,
          paddingTop: 22,
          paddingBottom: 34,
        }}
      >
        <ScrollView style={{ maxHeight: Math.max(320, height * 0.7) }} showsVerticalScrollIndicator={false}>
          <Text
            testID="safety-title"
            accessibilityRole="header"
            style={{ fontFamily: fonts.sansSemi, fontSize: 22, lineHeight: 28, color: day.ink }}
          >
            {RESOURCES_COPY.title}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: day.ink2, marginTop: 10 }}>
            {RESOURCES_COPY.body}
          </Text>

          <View style={{ marginTop: 18 }}>
            {HELPLINES.map((h) => (
              <Pressable
                key={h.region}
                accessibilityRole="link"
                accessibilityLabel={`${h.name}, ${h.contact}`}
                onPress={() => {
                  const target = h.contact.includes('.')
                    ? `https://${h.contact}`
                    : `tel:${h.contact.replace(/\s/g, '')}`;
                  Linking.openURL(target).catch(() => undefined);
                }}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: day.line2,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.sansSemi,
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: day.ink3,
                    }}
                  >
                    {h.region}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: day.ink, marginTop: 2 }}>
                    {h.name}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: day.ink }}>{h.contact}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: day.ink2, marginTop: 18 }}>
            {RESOURCES_COPY.note}
          </Text>
        </ScrollView>

        {/* outside the scroll view, so it is always reachable */}
        <Pressable
          testID="safety-continue"
          accessibilityRole="button"
          accessibilityLabel={RESOURCES_COPY.dismiss}
          onPress={clear}
          style={({ pressed }) => ({
            height: 58,
            marginTop: 18,
            borderRadius: radius.chip,
            backgroundColor: day.ink,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: '#FFFFFF' }}>{RESOURCES_COPY.dismiss}</Text>
        </Pressable>
      </View>
    </View>
  );
}
