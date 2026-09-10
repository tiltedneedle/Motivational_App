/**
 * The resources card (PRD §11.6).
 *
 * It sits above every screen. When the screen returns `crisis`, the sitting
 * pauses here: nothing was sent anywhere, nothing entered the coach's memory,
 * and the only way on is the person saying they are okay to continue.
 *
 * Four things are load-bearing here, all of them found the hard way. This is
 * the last control a person in trouble touches, so none of them are style:
 *
 *  - Not an RN Modal. On web it painted above its own dismiss button.
 *  - Not a flex:1 container. The card collapsed and the button fell outside it.
 *  - The dismiss button does not accept a tap for a moment after the card
 *    appears. It sits exactly where the button that raised the card was, and a
 *    double tap used to close a crisis card nobody had read.
 *  - `accessibilityViewIsModal` is iOS-only, so the card announces itself and
 *    the screen behind is hidden from assistive technology explicitly.
 */
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { HELPLINES, RESOURCES_COPY } from '@morrow/core';
import { day, night, radius, type as fonts } from '@morrow/ui';
import { useMorrow } from '../store';

/**
 * How long the way out is inert. Long enough that the second half of a double
 * tap cannot land on it, short enough that nobody trying to leave feels held.
 */
const SETTLE_MS = 900;

export function SafetyGate() {
  const pause = useMorrow((s) => s.safetyPause);
  const clear = useMorrow((s) => s.clearSafety);
  const reconsider = useMorrow((s) => s.reconsiderLatestFlag);
  const { height } = useWindowDimensions();
  const [armed, setArmed] = useState(false);
  const [dialFailed, setDialFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!pause) {
      setArmed(false);
      setDialFailed(null);
      return;
    }
    const t = setTimeout(() => setArmed(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [pause]);

  if (!pause) return null;

  const open = async (contact: string) => {
    const target = contact.includes('.')
      ? `https://${contact}`
      : `tel:${contact.replace(/\s/g, '')}`;
    try {
      await Linking.openURL(target);
      setDialFailed(null);
    } catch {
      // A tablet with no dialler, a locked-down device, a browser that refuses
      // tel: links. Swallowing this left the person tapping a number that did
      // nothing at all, so say what happened and leave the number readable.
      setDialFailed(contact);
    }
  };

  return (
    <View
      accessibilityViewIsModal
      // iOS reads the first; Android needs the second; the web build needs the
      // third. All three say the same thing: nothing behind this exists yet.
      importantForAccessibility="yes"
      aria-modal
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
        accessibilityRole={Platform.OS === 'web' ? undefined : 'alert'}
        accessibilityLiveRegion="assertive"
        style={{
          backgroundColor: day.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingHorizontal: 22,
          paddingTop: 22,
          paddingBottom: 34,
        }}
      >
        <ScrollView
          // Leave room for the padding and the button below, so the heading
          // can always be scrolled to even on a very short window.
          style={{ maxHeight: Math.max(140, height - 210) }}
          showsVerticalScrollIndicator={false}
        >
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
                testID={`safety-line-${h.region}`}
                accessibilityRole="link"
                accessibilityLabel={`${h.name}, ${h.region}. ${h.contact}`}
                accessibilityHint={h.contact.includes('.') ? 'Opens in a browser' : 'Calls this number'}
                onPress={() => void open(h.contact)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
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
                      color: day.ink2,
                    }}
                  >
                    {h.region}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansMedium, fontSize: 16, color: day.ink, marginTop: 2 }}>
                    {h.name}
                  </Text>
                </View>
                <Text
                  selectable
                  style={{ fontFamily: fonts.sansSemi, fontSize: 16, color: day.ink, flexShrink: 0 }}
                >
                  {h.contact}
                </Text>
              </Pressable>
            ))}
          </View>

          {dialFailed ? (
            <Text
              testID="safety-dial-failed"
              accessibilityLiveRegion="polite"
              style={{ fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: day.ink, marginTop: 14 }}
            >
              This device could not open {dialFailed} on its own. The number is above and can be copied.
            </Text>
          ) : null}

          <Text style={{ fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: day.ink2, marginTop: 18 }}>
            {RESOURCES_COPY.note}
          </Text>
        </ScrollView>

        {/* outside the scroll view, so it is always reachable */}
        <Pressable
          testID="safety-continue"
          accessibilityRole="button"
          accessibilityLabel={RESOURCES_COPY.dismiss}
          accessibilityState={{ disabled: !armed }}
          disabled={!armed}
          onPress={clear}
          style={({ pressed }) => ({
            minHeight: 58,
            paddingVertical: 14,
            paddingHorizontal: 18,
            marginTop: 18,
            borderRadius: radius.chip,
            backgroundColor: day.ink,
            // Not hidden and not moved: the card must not shift under a thumb.
            // It simply does not answer for the first moment.
            opacity: armed ? 1 : 0.45,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateY: pressed && armed ? 2 : 0 }],
          })}
        >
          <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, color: '#FFFFFF', textAlign: 'center' }}>
            {RESOURCES_COPY.dismiss}
          </Text>
        </Pressable>
        {/*
          The screen can be wrong, and when it is it has quietly excluded the
          whole sitting from their Book. The person is the only one who knows,
          so they are given the say. Placed under the way out, in the quieter
          weight: it is the rarer answer, not the encouraged one.
        */}
        <Pressable
          testID="safety-wrong"
          accessibilityRole="button"
          accessibilityLabel="This was not about me. Keep my writing."
          accessibilityState={{ disabled: !armed }}
          disabled={!armed}
          onPress={reconsider}
          style={{ paddingVertical: 12, marginTop: 14, alignItems: 'center', opacity: armed ? 1 : 0.45 }}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: day.ink2, textAlign: 'center' }}>
            This was not about me — keep my writing
          </Text>
        </Pressable>

      </View>
    </View>
  );
}
