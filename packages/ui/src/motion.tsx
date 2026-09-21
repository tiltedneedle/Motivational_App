/**
 * Motion (PRD §8.5), as a few small parts the screens share.
 *
 * The rules: springs, not curves, for anything that moves a thing; nothing
 * bounces more than once; motion shows causality or state, never
 * decoration; and reduce motion turns every move into a crossfade. Each
 * part takes `reduced` from `useReducedMotion()` rather than reading it
 * itself, so a screen decides once.
 *
 * - `Arrive`: a screen's contents arriving — a fade and an eight-point rise.
 * - `Slide`: the next question sliding in from the right (the Interview).
 * - `Settle`: a stone seating — the settle spring, from a little above.
 * - `Pop`: a stone forming — from small, on the settle spring.
 * - `SealBurst`: two rings pulsing out from a sealed stone.
 * - `usePress`: the press a control answers with — a small scale, sprung back.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from './tokens';

type Kids = { children: React.ReactNode; style?: StyleProp<ViewStyle>; reduced?: boolean };

/** A screen's contents arriving: fade 240 ms with an eight-point rise; a crossfade under reduce motion. */
export function Arrive({ children, style, reduced = false }: Kids) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [y] = useState(() => new Animated.Value(reduced ? 0 : 8));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.fade, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: motion.fade, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, y]);
  return <Animated.View style={[{ flex: 1, opacity, transform: [{ translateY: y }] }, style]}>{children}</Animated.View>;
}

/** The next thing sliding in from the right, on the standard spring. Keyed by the caller, so a new key is a new slide. */
export function Slide({ children, style, reduced = false }: Kids) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [x] = useState(() => new Animated.Value(reduced ? 0 : 28));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.fadeFast, useNativeDriver: true }),
      Animated.spring(x, { toValue: 0, useNativeDriver: true, ...motion.standard }),
    ]).start();
  }, [opacity, x]);
  return <Animated.View style={[{ opacity, transform: [{ translateX: x }] }, style]}>{children}</Animated.View>;
}

/**
 * A stone seating: from ten points above, down onto its socket on the settle
 * spring (one overshoot, 0.55 s). `play` re-runs it; a change of key does too.
 */
export function Settle({ children, style, reduced = false, play = 0 }: Kids & { play?: number }) {
  const [y] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    // Under reduce motion a fresh mount crossfades in once; a later "play"
    // is left still. A stone that is already visible is never blanked.
    if (reduced) {
      if (first.current) {
        opacity.setValue(0);
        Animated.timing(opacity, { toValue: 1, duration: motion.fade, useNativeDriver: true }).start();
      }
      first.current = false;
      return;
    }
    first.current = false;
    y.setValue(-10);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, ...motion.seat }).start();
  }, [play, reduced, y, opacity]);
  return <Animated.View style={[{ opacity, transform: [{ translateY: y }] }, style]}>{children}</Animated.View>;
}

/** A stone forming: from three-fifths of its size, on the settle spring. */
export function Pop({ children, style, reduced = false }: Kids) {
  const [scale] = useState(() => new Animated.Value(reduced ? 1 : 0.6));
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.fadeFast, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...motion.seat }),
    ]).start();
  }, [opacity, scale]);
  return <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>{children}</Animated.View>;
}

/**
 * Two rings pulsing out from a stone the moment it is sealed (PRD §8.5:
 * "completion drops the stone with a spring, two rings pulse out"). Sits
 * behind the stone, centred; `size` is the stone's. Plays once when `play`
 * turns true; still under reduce motion.
 */
export function SealBurst({ size, color, play, reduced = false, reach = 2.4 }: { size: number; color: string; play: boolean; reduced?: boolean; reach?: number }) {
  const rings = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const played = useRef(false);
  useEffect(() => {
    if (!play || played.current || reduced) return;
    played.current = true;
    Animated.stagger(
      140,
      rings.map((r) => Animated.timing(r, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
    ).start();
  }, [play, reduced, rings]);
  if (reduced) return null;
  return (
    <>
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          aria-hidden
          importantForAccessibility="no"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            opacity: r.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.55, 0] }),
            transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [1, reach] }) }],
          }}
        />
      ))}
    </>
  );
}

/**
 * The press a control answers with: down to 0.97 on the way in, sprung back
 * on the way out. Returns the scale to put on the control's face and the two
 * handlers for the Pressable around it.
 */
export function usePress(reduced = false): { scale: Animated.Value; onPressIn: () => void; onPressOut: () => void } {
  const [scale] = useState(() => new Animated.Value(1));
  const onPressIn = () => {
    if (reduced) return;
    Animated.timing(scale, { toValue: 0.97, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    if (reduced) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...motion.standard }).start();
  };
  return { scale, onPressIn, onPressOut };
}
