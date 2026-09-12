/**
 * The stone (PRD §8.2). A goal, a move, a day.
 *
 * Drawn with SVG so it renders identically on iOS, Android and the web build the
 * end-to-end tests drive. Skia can replace this later for the grain pass; the
 * props are the contract and would not change.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { domainMeta, type DomainId } from '@morrow/core';

export interface StoneProps {
  size: number;
  domain?: DomainId;
  /** Overrides the domain palette (the coach's pearl). */
  gradient?: readonly [string, string, string, string];
  /** 0 waiting (matte) … 1 kept (polished). */
  polish?: number;
  /** Sunk fraction for a routine that seats step by step. */
  sunk?: number;
  seated?: boolean;
  parked?: boolean;
  /** The slow light sweep (PRD 8.1), for a stone that is the hero of its screen. */
  sweep?: boolean;
  testID?: string;
  style?: ViewStyle;
}

export function Stone({
  size,
  domain = 'health',
  gradient,
  polish = 1,
  sunk = 0,
  seated = false,
  parked = false,
  sweep = false,
  testID,
  style,
}: StoneProps) {
  const colors = gradient ?? domainMeta(domain).gradient;
  const id = useMemo(() => `st${Math.random().toString(36).slice(2, 9)}`, []);
  const r = size / 2;

  // Matte while waiting, polished when kept. Never a different shape: the same
  // object, lit differently, so the gesture reads as physical.
  const saturation = 0.55 + 0.5 * polish;
  const brightness = parked ? 0.82 : 0.97 + 0.05 * polish;

  return (
    <View
      testID={testID}
      accessible={false}
      style={[
        { width: size, height: size, opacity: parked ? 0.72 : 1 },
        style,
      ]}
    >
      {/*
        The contact shadow (PRD 8.3: "a soft outer shadow tinted by the
        stone"). Under the sphere, in its own deep colour, fading to nothing:
        what makes it sit on the ground rather than float in front of it.
      */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -size * 0.15, right: -size * 0.15, top: size * 0.62, height: size * 0.6 }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id={`${id}cs`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors[3]} stopOpacity={parked ? 0.12 : 0.22 + 0.1 * polish} />
              <Stop offset="100%" stopColor={colors[3]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50" cy="50" rx="50" ry="50" fill={`url(#${id}cs)`} />
        </Svg>
      </View>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={id} cx="32%" cy="26%" r="75%">
            <Stop offset="0%" stopColor={colors[0]} stopOpacity={mix(1, saturation, brightness)} />
            <Stop offset="24%" stopColor={colors[1]} stopOpacity={mix(1, saturation, brightness)} />
            <Stop offset="60%" stopColor={colors[2]} stopOpacity={1} />
            <Stop offset="100%" stopColor={colors[3]} stopOpacity={1} />
          </RadialGradient>
          <RadialGradient id={`${id}sh`} cx="70%" cy="78%" r="60%">
            <Stop offset="0%" stopColor="#000000" stopOpacity={0.42} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
        <Circle cx={r} cy={r} r={r} fill={`url(#${id}sh)`} />
        {/* the specular highlight: the thing that makes it an object, not a dot */}
        <Ellipse
          cx={r * 0.68}
          cy={r * 0.48}
          rx={r * 0.3}
          ry={r * 0.18}
          fill="#FFFFFF"
          opacity={0.34 + 0.38 * polish}
          transform={`rotate(-18 ${r * 0.68} ${r * 0.48})`}
        />
        {seated ? (
          <Circle cx={r} cy={r} r={r * 0.98} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={1} />
        ) : null}
      </Svg>
      {sweep ? <Sweep size={size} /> : null}
      {sunk > 0 && sunk < 1 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: size * sunk,
            borderBottomLeftRadius: r,
            borderBottomRightRadius: r,
            backgroundColor: 'rgba(23,24,28,0.18)',
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * A band of light crossing the sphere, once every six seconds, clipped to
 * the circle. Slow enough to be noticed only when looked at.
 */
function Sweep({ size }: { size: number }) {
  const x = useRef(new Animated.Value(-size)).current;
  const id = useMemo(() => `sw${Math.random().toString(36).slice(2, 9)}`, []);
  const bandW = size * 0.42;
  const bandH = size * 1.4;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: size, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(3400),
        Animated.timing(x, { toValue: -size, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [size, x]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: -size * 0.2,
          width: bandW,
          height: bandH,
          transform: [{ translateX: x }, { rotate: '22deg' }],
        }}
      >
        <Svg width={bandW} height={bandH}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={bandW} height={bandH} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function mix(base: number, saturation: number, brightness: number): number {
  return Math.max(0, Math.min(1, base * saturation * brightness));
}

/** The dish a stone sits in. Concave, so "raised" and "seated" are readable. */
export function Socket({
  size,
  dark = false,
  children,
  style,
}: {
  size: number;
  dark?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? 'rgba(0,0,0,0.35)' : 'rgba(23,24,28,0.07)',
          borderWidth: 1,
          borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(23,24,28,0.06)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
