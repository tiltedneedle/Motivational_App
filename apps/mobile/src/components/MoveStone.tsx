/**
 * The stone as the check control (PRD §8.5).
 *
 * Tap seats it. Drag up past 40 pt parks it as "not today". A long press does
 * the same thing, because a drag is not available to everyone and the gesture
 * must never be the only way to say it.
 */
import { useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ring, Socket, Stone, accent, day, useHover, webHover } from '@morrow/ui';
import { plural, type DomainId } from '@morrow/core';
import { feelPark, feelSeat } from '../feel';

const PARK_THRESHOLD = 40;

export interface MoveStoneProps {
  size: number;
  domain: DomainId;
  status: 'todo' | 'done' | 'skip';
  /** Routine progress, 0..1. */
  steps?: { done: number; total: number };
  onSeat: () => void;
  onPark: () => void;
  label: string;
  testID?: string;
  reducedMotion?: boolean;
  /** The slow light sweep, for the one stone that is the hero of Today. */
  hero?: boolean;
}

export function MoveStone({
  size,
  domain,
  status,
  steps,
  onSeat,
  onPark,
  hero = false,
  label,
  testID,
  reducedMotion = false,
}: MoveStoneProps) {
  const { hovered, hoverProps } = useHover();
  const [dy] = useState(() => new Animated.Value(0));
  const [hint] = useState(() => new Animated.Value(0));
  const socket = size * 1.35;

  // The latest handlers, read by a gesture made once: rebuilt on every
  // render, the gesture re-attached its native handler on every store
  // write Today re-rendered for.
  const latest = useRef({ onPark, reducedMotion });
  latest.current = { onPark, reducedMotion };
  const settle = () => {
    Animated.spring(dy, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 260, mass: 1 }).start();
    Animated.timing(hint, { toValue: 0, duration: 140, useNativeDriver: true }).start();
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .onUpdate((e) => {
          const clamped = Math.max(-64, Math.min(8, e.translationY));
          dy.setValue(latest.current.reducedMotion ? 0 : clamped);
          hint.setValue(e.translationY < -PARK_THRESHOLD ? 1 : 0);
        })
        .onEnd((e) => {
          if (e.translationY < -PARK_THRESHOLD) {
            feelPark();
            latest.current.onPark();
          }
          settle();
        })
        .onFinalize(settle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dy, hint],
  );

  const seated = status === 'done';
  const parked = status === 'skip';

  /**
   * The four per cent the spec asks for while it is being pulled ("follows
   * the finger, enlarges 4%"): the stone comes up off the page under the
   * thumb and settles back down with it, driven by the travel itself so
   * there is no second animation to keep in step. Under reduce motion the
   * travel is held at zero, so this is too.
   */
  const lifted = dy.interpolate({ inputRange: [-64, -8, 0, 8], outputRange: [1.04, 1.04, 1, 1], extrapolate: 'clamp' });

  const stone = (
    <Animated.View
      style={{
        transform: [
          // Parked on the rim, in the spec's own numbers: up 13, right 20,
          // rolled 14 degrees, and at 72% (the Stone's `parked`).
          { translateY: parked ? -13 : seated ? 0 : -6 },
          { translateY: dy },
          { translateX: parked ? 20 : 0 },
          { rotate: parked ? '14deg' : '0deg' },
          { scale: parked ? 0.92 : lifted },
        ],
      }}
    >
      <Stone
        size={size}
        domain={domain}
        polish={seated ? 1 : steps ? 0.5 + 0.5 * (steps.done / steps.total) : 0.55}
        seated={seated}
        parked={parked}
        sunk={steps ? steps.done / steps.total : 0}
        sweep={hero && !seated && !reducedMotion}
      />
    </Animated.View>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={pan}>
        <Pressable
          testID={testID}
          accessibilityRole="checkbox"
          // A stone has three states, not two. `checked` is a boolean, so
          // "parked" and "not done yet" both announced as unchecked and a
          // screen-reader user could not tell a move they had set aside from
          // one they had not reached. The state is spelled out in the label.
          aria-checked={status === 'done'}
          accessibilityLabel={
            status === 'done'
              ? `${label}. Done.`
              : status === 'skip'
                ? `${label}. Set aside for today.`
                : steps
                  ? `${label}. Not done. ${steps.done} of ${plural(steps.total, 'step')}.`
                  : `${label}. Not done.`
          }
          {...(steps
            ? {
                accessibilityValue: { min: 0, max: steps.total, now: steps.done },
              }
            : {})}
          // A stone that has been set aside goes back in the day on a tap;
          // the hint used to say "seat" there too, which is not what happens.
          accessibilityHint={parked ? 'Double tap to put it back in the day.' : 'Double tap to seat. Long press for not today.'}
          accessibilityActions={[{ name: 'longpress', label: 'Not today' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'longpress') {
              feelPark();
              onPark();
            }
          }}
          onPress={() => {
            feelSeat();
            onSeat();
          }}
          onLongPress={() => {
            feelPark();
            onPark();
          }}
          delayLongPress={420}
          {...hoverProps}
          style={{
            padding: 2,
            transform: [{ scale: hovered ? 1.04 : 1 }],
            ...(Platform.OS === 'web' ? webHover.transition : {}),
          }}
        >
          {steps ? (
            <Ring
              size={socket}
              progress={steps.done / steps.total}
              color={accent.coral}
              segments={steps.total}
              width={2.5}
              // The stone above already announces the step count, so the ring
              // inside it stays silent rather than saying the same thing twice.
              accessibilityLabel={null}
            >
              <Socket size={size * 1.16}>{stone}</Socket>
            </Ring>
          ) : (
            <Socket size={socket}>{stone}</Socket>
          )}
        </Pressable>
      </GestureDetector>
      {/*
        A drag hint for the eye only. It lives at opacity 0 almost always, and
        an element at opacity 0 is still in the accessibility tree, so a screen
        reader used to read out "Not today" under every stone on the screen.
      */}
      <Animated.Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{
          position: 'absolute',
          top: socket + 2,
          opacity: hint,
          fontSize: 11,
          fontWeight: '600',
          color: day.ink2,
        }}
      >
        Not today
      </Animated.Text>
    </View>
  );
}
