/**
 * The stone as the check control (PRD §8.5).
 *
 * Tap seats it. Drag up past 40 pt parks it as "not today". A long press does
 * the same thing, because a drag is not available to everyone and the gesture
 * must never be the only way to say it.
 */
import { useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ring, Socket, Stone, accent, day } from '@morrow/ui';
import type { DomainId } from '@morrow/core';

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
}

export function MoveStone({
  size,
  domain,
  status,
  steps,
  onSeat,
  onPark,
  label,
  testID,
  reducedMotion = false,
}: MoveStoneProps) {
  const dy = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const socket = size * 1.35;

  const settle = () => {
    Animated.spring(dy, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 260, mass: 1 }).start();
    Animated.timing(hint, { toValue: 0, duration: 140, useNativeDriver: true }).start();
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      const clamped = Math.max(-64, Math.min(8, e.translationY));
      dy.setValue(reducedMotion ? 0 : clamped);
      hint.setValue(e.translationY < -PARK_THRESHOLD ? 1 : 0);
    })
    .onEnd((e) => {
      if (e.translationY < -PARK_THRESHOLD) {
        onPark();
      }
      settle();
    })
    .onFinalize(settle);

  const seated = status === 'done';
  const parked = status === 'skip';

  const stone = (
    <Animated.View
      style={{
        transform: [
          { translateY: parked ? -10 : seated ? 0 : -6 },
          { translateY: dy },
          { translateX: parked ? 14 : 0 },
          { rotate: parked ? '14deg' : '0deg' },
          { scale: parked ? 0.92 : 1 },
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
      />
    </Animated.View>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={pan}>
        <Pressable
          testID={testID}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: seated }}
          accessibilityLabel={label}
          accessibilityHint="Double tap to seat. Long press for not today."
          accessibilityActions={[{ name: 'longpress', label: 'Not today' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'longpress') onPark();
          }}
          onPress={onSeat}
          onLongPress={onPark}
          delayLongPress={420}
          style={{ padding: 2 }}
        >
          {steps ? (
            <Ring size={socket} progress={steps.done / steps.total} color={accent.coral} segments={steps.total} width={2.5}>
              <Socket size={size * 1.16}>{stone}</Socket>
            </Ring>
          ) : (
            <Socket size={socket}>{stone}</Socket>
          )}
        </Pressable>
      </GestureDetector>
      <Animated.Text
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
