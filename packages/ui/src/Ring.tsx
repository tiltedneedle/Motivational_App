/**
 * The ring (PRD §8.2): the one progress mark in the product.
 * It fills over fifteen minutes in the Fifteen, over 1.6 s in a seal, one
 * segment per step on a routine, and to the goal's fraction on a chip.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export interface RingProps {
  size: number;
  /** 0..1 */
  progress: number;
  color: string;
  track?: string;
  width?: number;
  /** Draws the ring as N arcs, for a routine's steps. */
  segments?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  /**
   * What this ring is measuring, said in words. Without it the ring is a
   * drawing: the only thing carrying the Fifteen's countdown, a routine's step
   * progress or a goal's completion was the shape itself.
   *
   * Pass null for a ring that genuinely means nothing on its own — one sitting
   * behind a number that already says the same thing.
   */
  accessibilityLabel?: string | null;
  /** Overrides the percentage announcement, e.g. "3 of 5 steps". */
  valueText?: string;
}

export function Ring({
  size,
  progress,
  color,
  track = 'rgba(23,24,28,0.10)',
  width = 3,
  segments = 1,
  children,
  style,
  testID,
  accessibilityLabel,
  valueText,
}: RingProps) {
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <View
      testID={testID}
      {...(accessibilityLabel
        ? {
            accessibilityRole: 'progressbar' as const,
            accessibilityLabel,
            accessibilityValue: {
              min: 0,
              max: segments > 1 ? segments : 100,
              now: segments > 1 ? Math.round(p * segments) : Math.round(p * 100),
              ...(valueText ? { text: valueText } : {}),
            },
            // The aria spellings are what react-native-web forwards; it
            // drops the object above, and the ring was a progress bar with
            // no value on the web.
            'aria-valuemin': 0,
            'aria-valuemax': segments > 1 ? segments : 100,
            'aria-valuenow': segments > 1 ? Math.round(p * segments) : Math.round(p * 100),
            'aria-valuetext': valueText ?? `${Math.round(p * 100)} percent`,
          }
        : {})}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {segments <= 1 ? (
            <>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={width} fill="none" />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${c} ${c}`}
                strokeDashoffset={c * (1 - p)}
              />
            </>
          ) : (
            Array.from({ length: segments }, (_, i) => {
              const gap = c * 0.04;
              const seg = c / segments - gap;
              const filled = p * segments > i;
              return (
                <G key={i}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={filled ? color : track}
                  strokeWidth={width}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${seg} ${c - seg}`}
                  strokeDashoffset={-((c / segments) * i)}
                />
                </G>
              );
            })
          )}
        </G>
      </Svg>
      {children}
    </View>
  );
}
