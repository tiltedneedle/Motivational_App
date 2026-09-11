/**
 * The Goal Path (PRD §7.7): a single route from now to the target date, with
 * milestone nodes and the person's dot on it.
 *
 * Deliberately not a progress bar. A bar says "you are 40% done"; this says
 * "the calendar is here, these are the nodes, and this is which of them are
 * behind you" — three separate facts that are allowed to disagree, which is the
 * only reason drawing it is worth anything.
 *
 * The drawing carries no information the labels do not: every node is a row
 * underneath with its date, and the whole thing has one accessibility label, so
 * nothing here is only available to somebody who can see it.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { usePalette } from './primitives';

export interface PathNodeMark {
  id: string;
  /** 0–1 along the route. */
  at: number;
  reached: boolean;
}

export interface PathProps {
  /** 0–1: where the calendar is. */
  at: number;
  nodes: PathNodeMark[];
  color: string;
  /** What the drawing says, in words. Required: see the note above. */
  accessibilityLabel: string;
  height?: number;
  style?: ViewStyle;
  testID?: string;
}

const DOT = 7;
const NODE = 5;

export function Path({ at, nodes, color, accessibilityLabel, height = 44, style, testID }: PathProps) {
  const { p } = usePalette();
  // A viewBox in the same units as the fractions, so the maths below is the
  // fractions themselves and there is nothing to get out of step.
  const W = 100;
  const y = height / 2;
  const inset = 3;
  const span = W - inset * 2;
  const x = (f: number) => inset + Math.min(1, Math.max(0, f)) * span;

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[{ height }, style]}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {/* the route */}
        <Line x1={inset} y1={y} x2={W - inset} y2={y} stroke={p.line} strokeWidth={1.5} strokeLinecap="round" />
        {/* how much of it is behind them, by the calendar */}
        <Line x1={inset} y1={y} x2={x(at)} y2={y} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        {nodes.map((n) => (
          <Circle
            key={n.id}
            cx={x(n.at)}
            cy={y}
            r={NODE / 2}
            // A reached node is filled, an unreached one is an outline. Not
            // colour alone: the same distinction has to survive a greyscale
            // screen and the commonest kinds of colour blindness.
            fill={n.reached ? color : p.ground}
            stroke={n.reached ? color : p.line2}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* you are here */}
        <Circle cx={x(at)} cy={y} r={DOT / 2} fill={color} stroke={p.ground} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </Svg>
    </View>
  );
}
