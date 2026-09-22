/**
 * The flight (PRD §8.5): "a goal chip's stone flies to the Goal screen's
 * header in 0.62 s with a 12° roll at 1.74×; the screen's parts rise in
 * sequence; Back flies it home."
 *
 * The two screens are different routes, so there is no shared element to
 * hand over. What travels instead is a memory: the chip records where its
 * stone was on the glass the moment it is pressed, and the Goal screen —
 * mounted a fraction of a second later — draws one copy of that stone at
 * the remembered place and runs it to its own header. The header's stone
 * waits, hidden, until the copy lands on it; nothing else moves.
 *
 * It is the one piece of motion in the product that crosses a screen, and
 * it exists because the goal a person taps and the goal they arrive at
 * should obviously be the same object. Under reduce motion there is no
 * flight at all: the header's stone is simply there.
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import type { DomainId } from '@morrow/core';
import { Stone } from './Stone';

/** Where a stone was, in window coordinates, and how big. */
export interface StoneOrigin {
  x: number;
  y: number;
  size: number;
  domain: DomainId;
  polish: number;
  /** When it was recorded; a memory older than a moment is not a flight. */
  at: number;
}

let origin: StoneOrigin | null = null;

/** The chip, as it is pressed: where its stone is now. */
export function rememberStone(o: Omit<StoneOrigin, 'at'>): void {
  origin = { ...o, at: Date.now() };
}

/**
 * What the screen it flew to should draw, if anything. Null when nothing was
 * remembered, or when the memory is stale — a Goal screen opened from a
 * link, or from the Book, has no chip behind it and must not animate from
 * nowhere.
 *
 * A look, not a taking: a screen mounts more than once on its way in, and
 * consuming the memory on the first mount left the instance that survived
 * with nothing to fly. The memory is let go when a flight has landed, or
 * when it goes stale on its own.
 */
export function peekStone(withinMs = 1200): StoneOrigin | null {
  const held = origin;
  const fresh = held && Date.now() - held.at <= withinMs ? held : null;
  if (held && !fresh) origin = null;
  return fresh;
}

/** Thrown away without flying: a screen that will not run it says so, so the next tap is clean. */
export function forgetStone(): void {
  origin = null;
}

/**
 * Where a thing is on the glass, on either platform.
 *
 * `measureInWindow` is the native answer and is silent when the node is not
 * ready; in a browser the node is a DOM element and knows its own rectangle.
 * Asked once on layout and once more on the next frame, because the first
 * ask can land before the element has one.
 */
export function measureOnGlass(node: unknown, then: (rect: { x: number; y: number; width: number; height: number }) => void): void {
  const ask = (attempt: number): void => {
    const el = node as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void; getBoundingClientRect?: () => DOMRect } | null;
    if (!el) {
      if (attempt < 3) requestAnimationFrame(() => ask(attempt + 1));
      return;
    }
    if (Platform.OS === 'web' && typeof el.getBoundingClientRect === 'function') {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || attempt >= 3) then({ x: r.x, y: r.y, width: r.width, height: r.height });
      else requestAnimationFrame(() => ask(attempt + 1));
      return;
    }
    if (typeof el.measureInWindow === 'function') {
      el.measureInWindow((x, y, width, height) => then({ x, y, width, height }));
      return;
    }
    if (attempt < 3) requestAnimationFrame(() => ask(attempt + 1));
  };
  ask(0);
}

export interface FlightProps {
  /** Where it lands, in window coordinates, and at what size. */
  to: { x: number; y: number; size: number } | null;
  from: StoneOrigin | null;
  reduced?: boolean;
  /** Called when the stone has landed, so the screen's own can appear. */
  onDone: () => void;
}

/**
 * One stone in flight, over everything, touching nothing. Absolute in the
 * screen's own root, so it needs no portal and cannot outlive the screen.
 */
export function StoneFlight({ to, from, reduced = false, onDone }: FlightProps) {
  const [t] = useState(() => new Animated.Value(0));
  const ready = Boolean(from && to);
  useEffect(() => {
    if (!ready || reduced) {
      if (ready) onDone();
      return;
    }
    const run = Animated.timing(t, {
      toValue: 1,
      duration: 620,
      // Out of the chip quickly, into the header softly: a thing thrown and
      // caught, not a thing slid.
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    run.start(({ finished }) => {
      // Landed, so the memory has been spent — the next Goal screen opened
      // any other way starts with its stone simply there.
      forgetStone();
      if (finished) onDone();
    });
    return () => run.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reduced]);

  if (!ready || reduced || !from || !to) return null;
  const scale = to.size / from.size;
  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      testID="stone-flight"
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: from.size,
        height: from.size,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, to.x - from.x] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, to.y - from.y] }) },
          // The roll: twelve degrees out and back to level, so it reads as
          // an object with weight rather than a sprite being moved.
          { rotate: t.interpolate({ inputRange: [0, 0.45, 1], outputRange: ['0deg', '12deg', '0deg'] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) },
        ],
      }}
    >
      <View style={{ width: from.size, height: from.size }}>
        <Stone size={from.size} domain={from.domain} polish={from.polish} />
      </View>
    </Animated.View>
  );
}
