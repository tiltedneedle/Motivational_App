/**
 * The shell (the rebuild, 2026-09-21): the pieces every screen of the new
 * first run and the new home are made of, so a screen is a headline, a
 * line and a control rather than a page of prose.
 *
 *  - `Screen`: top bar, an optional progress bar, a scrolling body and a
 *    footer that stays put — the one scaffold every program screen uses.
 *  - `ProgressBar`: a thin bar with "Step 2 of 5 · Find your goals" over it.
 *  - `OptionTile`: a big tappable answer with a glyph, for the one-tap steps.
 *  - `StatTile`, `WeekStrip`, `StreakPill`, `PathCard`: the home's loop.
 *  - `TabBar`: the five tabs, once, rather than a copy inside Today.
 *  - `Glyph`: the product's line icons, drawn once in SVG so they match on
 *    every platform (emoji do not).
 */
import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { accent, radius, shadow, type as fonts, webHover, webOnlyStyle } from './tokens';
import { Body, InkButton, Label, Rise, Statement, Studio, TopBar, TextButton, useHover, usePalette, useReducedMotion } from './primitives';
import { usePress } from './motion';
import { Animated } from 'react-native';

// ---------------------------------------------------------------- glyphs

export type GlyphName =
  | 'health'
  | 'money'
  | 'craft'
  | 'mind'
  | 'people'
  | 'home'
  | 'custom'
  | 'sun'
  | 'book'
  | 'eye'
  | 'chat'
  | 'person'
  | 'check'
  | 'plus'
  | 'mic'
  | 'flame'
  | 'pen'
  | 'clock'
  | 'star'
  | 'arrow'
  | 'morning'
  | 'evening'
  | 'any';

/**
 * One stroke, round caps, on a 24-grid. Every icon in the product comes
 * from here so the weight matches everywhere.
 */
export function Glyph({ name, size = 22, color, strokeWidth = 1.8 }: { name: GlyphName; size?: number; color?: string; strokeWidth?: number }) {
  const { p } = usePalette();
  const c = color ?? p.ink;
  const s = { stroke: c, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const };
  const body = (() => {
    switch (name) {
      case 'health':
        return <Path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10Z" {...s} />;
      case 'money':
        return (
          <>
            <Circle cx="12" cy="12" r="8" {...s} />
            <Path d="M12 7.5v9M14.5 9.5c0-1-1.1-1.6-2.5-1.6s-2.5.6-2.5 1.6c0 2.4 5 1 5 3.4 0 1-1.1 1.7-2.5 1.7s-2.5-.7-2.5-1.7" {...s} />
          </>
        );
      case 'craft':
        return <Path d="M4 20l5.5-5.5M13 6l5 5M9.5 9.5l5 5M3.5 20.5l3-.5 8.5-8.5-2.5-2.5L4 17.5l-.5 3ZM14 5l2-2 5 5-2 2" {...s} />;
      case 'mind':
        return <Path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A7 7 0 0 1 15.5 3.5Z" {...s} />;
      case 'people':
        return (
          <>
            <Circle cx="9" cy="8.5" r="3.2" {...s} />
            <Path d="M3.5 19.5c0-3.3 2.5-5.3 5.5-5.3s5.5 2 5.5 5.3M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17 14.5c2.3.4 3.7 2.2 3.7 5" {...s} />
          </>
        );
      case 'home':
        return <Path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1v-8.5Z" {...s} />;
      case 'custom':
        return <Path d="M12 5v14M5 12h14" {...s} />;
      case 'sun':
      case 'morning':
        return (
          <>
            <Circle cx="12" cy="12" r="3.8" {...s} />
            <Path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" {...s} />
          </>
        );
      case 'evening':
        return <Path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A7 7 0 0 1 15.5 3.5Z" {...s} />;
      case 'any':
        return (
          <>
            <Circle cx="12" cy="12" r="8.5" {...s} />
            <Path d="M12 7.5V12l3 2" {...s} />
          </>
        );
      case 'book':
        return <Path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v15H6.5a2 2 0 0 0-2 2v-15ZM4.5 18.5a2 2 0 0 1 2-2H19M8 7.5h7" {...s} />;
      case 'eye':
        return (
          <>
            <Path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" {...s} />
            <Circle cx="12" cy="12" r="2.8" {...s} />
          </>
        );
      case 'chat':
        return <Path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5v-8Z" {...s} />;
      case 'person':
        return (
          <>
            <Circle cx="12" cy="8" r="3.6" {...s} />
            <Path d="M4.5 20.5c0-4 3.4-6.3 7.5-6.3s7.5 2.3 7.5 6.3" {...s} />
          </>
        );
      case 'check':
        return <Path d="M5 12.5l4.5 4.5L19 7.5" {...s} strokeWidth={strokeWidth + 0.6} />;
      case 'plus':
        return <Path d="M12 5v14M5 12h14" {...s} strokeWidth={strokeWidth + 0.4} />;
      case 'mic':
        return (
          <>
            <Rect x="9" y="3" width="6" height="11" rx="3" {...s} />
            <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" {...s} />
          </>
        );
      case 'flame':
        return <Path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3 2.2-5 3.4-7.2.6 1.5 1.5 2.2 2.4 2.4.2-2.6 1.1-5.5 3.9-7 0 3 1.4 4.3 2.4 5.8 1.1 1.6 1.9 3.3 1.9 5.5 0 3.9-3 6.7-7.5 6.7Z" {...s} />;
      case 'pen':
        return <Path d="M4 20l4-1 11-11-3-3L5 16l-1 4ZM14 7l3 3" {...s} />;
      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="8.5" {...s} />
            <Path d="M12 7.5V12l3 2" {...s} />
          </>
        );
      case 'star':
        return <Path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.5Z" {...s} />;
      case 'arrow':
        return <Path d="M5 12h14M13 6l6 6-6 6" {...s} />;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {body}
    </Svg>
  );
}

// ---------------------------------------------------------------- progress

/**
 * Where you are (NN/g: a visible position in a multi-step flow cuts
 * abandonment). A hairline that fills in coral, with a label over it.
 */
export function ProgressBar({ value, label, testID, style }: { value: number; label?: string; testID?: string; style?: StyleProp<ViewStyle> }) {
  const { p } = usePalette();
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value));
  const now = Math.round(pct * 100);
  return (
    <View
      testID={testID}
      style={[{ gap: 8 }, style]}
      accessibilityRole="progressbar"
      // Both spellings: the object form is what native reads, the aria
      // props are what react-native-web forwards (it drops the object).
      accessibilityValue={{ min: 0, max: 100, now, text: label }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={now}
      aria-valuetext={label ?? `${now} percent`}
      accessibilityLabel={label ?? `${now} percent`}
    >
      {label ? <Label numberOfLines={1}>{label}</Label> : null}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: p.line, overflow: 'hidden' }}>
        <View
          testID={testID ? `${testID}-fill` : undefined}
          style={[
            { height: 4, borderRadius: 2, backgroundColor: accent.coral, width: `${now}%` },
            // The fill eases to its new width; under reduce motion it is simply there.
            Platform.OS === 'web' && !reduced ? webOnlyStyle({ transitionProperty: 'width', transitionDuration: '360ms', transitionTimingFunction: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }) : null,
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- screen

/**
 * The scaffold. Top bar with a way back; a progress bar when the screen is
 * one step of a path; a scrolling body; and a footer that stays at the
 * bottom with the one thing to do next. `footer` takes a node, so a screen
 * can put a note under its button; `cta` is the common case.
 */
/**
 * The soft edge of a scroll.
 *
 * A scroll region clips whatever crosses its edge, mid-word and mid-pill, and
 * at the bottom that cut lands an inch above a pinned button — on the paywall
 * it left half a "Manage subscription" behind Continue, which reads as a
 * drawing fault rather than as "there is more below". Twenty-two points of
 * the ground, fading out, says the true thing instead.
 *
 * Decoration: it takes no touches and is not in the accessibility tree. The
 * ground is a radial gradient and this is a flat one, which is near enough at
 * the extremes of the screen, where the radial has flattened out anyway.
 */
export function ScrollFade({ edge = 'bottom', height = 22, color }: { edge?: 'top' | 'bottom'; height?: number; color?: string }) {
  const { p } = usePalette();
  // The ground is a radial from above the screen, so at the bottom edge it is
  // its outer stop and at the top its inner one — not the middle the `ground`
  // token names. Faded to the middle, the night studio grew a lighter band
  // above the hold bar, which is worse than the cut it replaced.
  const c = color ?? (edge === 'bottom' ? p.groundBottom : p.groundTop);
  const id = React.useMemo(() => `fd${Math.random().toString(36).slice(2, 9)}`, []);
  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, height, ...(edge === 'top' ? { top: 0 } : { bottom: 0 }) }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1={edge === 'bottom' ? '0' : '1'} x2="0" y2={edge === 'bottom' ? '1' : '0'}>
            <Stop offset="0%" stopColor={c} stopOpacity={0} />
            <Stop offset="100%" stopColor={c} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function Screen({
  testID,
  back,
  where,
  help,
  right,
  progress,
  children,
  footer,
  cta,
  secondary,
  dark = false,
  scroll = true,
  contentStyle,
  keyboard = false,
}: {
  testID?: string;
  back?: { label?: string; onPress: () => void; testID?: string };
  where?: string;
  help?: { onPress: () => void; testID?: string };
  right?: ReactNode;
  progress?: { value: number; label?: string; testID?: string };
  children: ReactNode;
  footer?: ReactNode;
  /** The one button. */
  cta?: { label: string; onPress: () => void; testID?: string; disabled?: boolean; busy?: boolean };
  /** The quiet way out under it. */
  secondary?: { label: string; onPress: () => void; testID?: string };
  dark?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Taps land while the keyboard is up (a screen with a field). */
  keyboard?: boolean;
}) {
  const { p } = usePalette();
  const reduced = useReducedMotion();
  // The screen's parts rise in sequence (PRD 8.5: "the screen's parts rise
  // in sequence; entry sequences stagger at 0.08–0.1 s"): each direct child
  // one beat after the last, the beats capped so a long list is not a wait.
  // A fragment is opened one level so a screen written as <>…</> staggers
  // its own parts rather than arriving as one block.
  const parts = React.Children.toArray(
    React.isValidElement(children) && children.type === React.Fragment ? (children.props as { children?: ReactNode }).children : children,
  );
  // A screen that lays itself out (scroll off: a list that fills the
  // height) keeps its children as they are; a wrapper would take their flex.
  const body = (
    <>
      {progress ? <ProgressBar value={progress.value} label={progress.label} testID={progress.testID ?? 'progress'} style={{ marginBottom: 18 }} /> : null}
      {scroll
        ? parts.map((part, i) => (
            <Rise key={(React.isValidElement(part) && part.key) || i} index={Math.min(i, 5)} reducedMotion={reduced}>
              {part}
            </Rise>
          ))
        : children}
    </>
  );
  const foot =
    footer || cta || secondary ? (
      <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 14, gap: 10, backgroundColor: 'transparent' }}>
        {cta ? <InkButton testID={cta.testID} label={cta.label} onPress={cta.onPress} disabled={cta.disabled} busy={cta.busy} /> : null}
        {secondary ? <TextButton testID={secondary.testID} label={secondary.label} onPress={secondary.onPress} style={{ alignSelf: 'center' }} /> : null}
        {footer}
      </View>
    ) : null;
  return (
    <Studio testID={testID} dark={dark}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 22 }}>
          <TopBar back={back} where={where} help={help} right={right} />
        </View>
        {/*
          The keyboard: on iOS the view is padded up by its height so the
          footer's one button stays above it, and the scroll view adjusts its
          insets for the field being typed into (the older screens did this;
          the rebuilt shell did not).
        */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 24, gap: 14 }, contentStyle]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps={keyboard ? 'handled' : 'never'}
                keyboardDismissMode={keyboard ? 'on-drag' : 'none'}
                {...(Platform.OS === 'web' ? { tabIndex: 0 } : {})}
              >
                {body}
              </ScrollView>
              {/* At the bottom only. The top of a scroll sits under the
                  screen's own header, where a cut reads as the header's edge;
                  at the bottom it sits above a button, where it reads as a
                  fault — and a fade painted at the top of a screen nobody has
                  scrolled is a band over the first line of it. */}
              <ScrollFade edge="bottom" />
            </View>
          ) : (
            <View style={[{ flex: 1, paddingHorizontal: 22, paddingTop: 6, gap: 14 }, contentStyle]}>{body}</View>
          )}
          {foot}
        </KeyboardAvoidingView>
        {/* the ground under the footer, so a scrolled body does not show through it */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0, backgroundColor: p.ground }} />
      </SafeAreaView>
    </Studio>
  );
}

/** The screen's title and its one line, set the same way everywhere. */
export function Heading({ title, line, testID, lineTestID, style }: { title: string; line?: string; testID?: string; lineTestID?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 8, marginBottom: 6 }, style]}>
      <Statement testID={testID}>{title}</Statement>
      {line ? (
        <Body testID={lineTestID} style={{ fontSize: 16, lineHeight: 23 }}>
          {line}
        </Body>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- option tile

/**
 * A big answer to tap: a glyph in a tinted circle, a title, an optional
 * caption. Selected: ink fill. One of a set (radio) or one of many
 * (checkbox), and it says which.
 */
export function OptionTile({
  glyph,
  letter,
  title,
  caption,
  selected,
  onPress,
  testID,
  role = 'radio',
  tint,
  accessibilityLabel,
  compact = false,
}: {
  glyph?: GlyphName;
  /** A, B, C… when the set is long enough to need it. */
  letter?: string;
  title: string;
  caption?: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
  role?: 'radio' | 'checkbox' | 'button';
  /** The mark colour behind the glyph. */
  tint?: string;
  accessibilityLabel?: string;
  compact?: boolean;
}) {
  const { p, dark } = usePalette();
  const { hovered, hoverProps } = useHover();
  const reduced = useReducedMotion();
  const { scale, onPressIn, onPressOut } = usePress(reduced);
  const on = selected === true;
  const mark = tint ?? accent.coral;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...hoverProps}
      accessibilityRole={role}
      aria-checked={role === 'button' ? undefined : on}
      accessibilityLabel={accessibilityLabel ?? (caption ? `${title}. ${caption}` : title)}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              minHeight: compact ? 54 : 64,
              paddingVertical: compact ? 10 : 12,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: on ? p.ink : p.surface,
              borderWidth: 1,
              borderColor: on ? p.ink : hovered ? p.ink2 : dark ? p.line2 : 'rgba(23,24,28,0.06)',
              transform: [{ translateY: hovered && !pressed ? -1 : 0 }, { scale }],
            },
            Platform.OS === 'web' ? webHover.transitionStill : null,
            Platform.OS === 'web' && !on ? webOnlyStyle({ boxShadow: hovered && !pressed ? (dark ? webHover.liftNight.boxShadow : webHover.lift.boxShadow) : '0 1px 2px rgba(23,24,28,0.04)' }) : null,
          ]}
        >
          {glyph ? (
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? p.onInkWash : `${mark}1F` }}>
              <Glyph name={glyph} size={22} color={on ? p.onInk : mark} />
            </View>
          ) : letter ? (
            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? p.onInkWash : p.surface2 }}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 13, color: on ? p.onInk : p.ink2 }}>{letter}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: fonts.sansSemi, fontSize: 16, lineHeight: 21, color: on ? p.onInk : p.ink }}>{title}</Text>
            {caption ? <Text style={{ fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: on ? p.onInkSoft : p.ink2 }}>{caption}</Text> : null}
          </View>
          {on ? <Glyph name="check" size={20} color={p.onInk} /> : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- the loop

export function StatTile({ value, label, testID, style }: { value: string | number; label: string; testID?: string; style?: StyleProp<ViewStyle> }) {
  const { p } = usePalette();
  return (
    <View testID={testID} accessibilityLabel={`${label}: ${value}`} style={[{ flex: 1, backgroundColor: p.surface2, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }, style]}>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 24, lineHeight: 28, color: p.ink }}>{value}</Text>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, color: p.ink2 }}>{label}</Text>
    </View>
  );
}

/**
 * The run of days, with a flame. Never a zero: the product's rule (PRD §2.4,
 * "nothing resets to zero") and the person it is written for both mean a
 * dead flame at 0 the morning after a night shift is the wrong first thing
 * to see. With no run, `week` (days kept this week) is shown instead, and
 * with nothing at all there is no pill.
 */
export function StreakPill({ count, week = 0, testID }: { count: number; week?: number; testID?: string }) {
  const { p } = usePalette();
  const on = count > 0;
  if (!on && week === 0) return null;
  return (
    <View
      testID={testID}
      accessible
      // A group on the web (react-native-web maps "text" to no role, and a
      // name on a role-less element is ignored by NVDA and JAWS); plain text
      // on a phone, where "image" would add an image trait to live text.
      {...labelledRole}
      accessibilityLabel={on ? `${count} day run` : `${week} of 7 days this week`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 12, borderRadius: 999, backgroundColor: on ? accent.coralText : p.surface2 }}
    >
      {/*
        `accent.coralText` is the deep coral by day and the light `coralNight`
        by night, so a fixed white here was 5.3:1 in one studio and 3.3:1 in
        the other. `onInk` is whichever of the two reads on a filled control.
      */}
      <Glyph name="flame" size={18} color={on ? p.onInk : p.ink3} />
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: on ? p.onInk : p.ink2 }}>{on ? `${count}` : `${week}/7`}</Text>
    </View>
  );
}

/** The role a labelled group of text carries: `group` on the web, where a name needs a role; none on a phone. */
const labelledRole = Platform.OS === 'web' ? ({ role: 'group' } as const) : ({ accessibilityRole: 'text' } as const);

export type WeekDay = { key: string; letter: string; state: 'sealed' | 'today' | 'todaySealed' | 'empty' | 'future'; label: string };

/** Seven dots for the week: a filled coral dot for a sealed day, a ring for today. */
export function WeekStrip({ days, testID }: { days: WeekDay[]; testID?: string }) {
  const { p } = usePalette();
  return (
    <View testID={testID} accessible {...labelledRole} accessibilityLabel={`This week: ${days.map((d) => d.label).join('; ')}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d) => {
        const sealed = d.state === 'sealed' || d.state === 'todaySealed';
        const today = d.state === 'today' || d.state === 'todaySealed';
        return (
          <View key={d.key} style={{ alignItems: 'center', gap: 6, width: 36 }}>
            <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, color: today ? p.ink : p.ink3 }}>{d.letter}</Text>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: sealed ? accent.coral : d.state === 'future' ? 'transparent' : p.surface2,
                borderWidth: today ? 2 : d.state === 'future' ? 1 : 0,
                borderColor: today ? p.ink : p.line,
              }}
            >
              {sealed ? <Glyph name="check" size={16} color="#FFFFFF" /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export interface PathStep {
  label: string;
  minutes?: string;
  done: boolean;
}

/**
 * The card that replaces the paragraph: where you are on the way to a Book,
 * as a list with ticks, and one button. Numbers are honest minutes.
 */
export function PathCard({
  title,
  caption,
  steps,
  at,
  cta,
  secondary,
  testID,
}: {
  title: string;
  caption?: string;
  steps: PathStep[];
  /** Index of the current step. */
  at: number;
  cta: { label: string; onPress: () => void; testID?: string };
  secondary?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  const { p, dark } = usePalette();
  const done = steps.filter((s) => s.done).length;
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: p.surface,
        borderRadius: radius.card,
        padding: 20,
        gap: 14,
        borderWidth: dark ? 1 : 0,
        borderColor: p.line2,
        ...(Platform.OS === 'web' ? webOnlyStyle({ boxShadow: dark ? shadow.cardWebNight : shadow.cardWeb }) : { ...shadow.card, shadowOpacity: dark ? 0.5 : 0.1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } }),
      }}
    >
      <View style={{ gap: 6 }}>
        <Label testID={testID ? `${testID}-where` : undefined}>{`Step ${Math.min(at + 1, steps.length)} of ${steps.length}`}</Label>
        <Text testID={testID ? `${testID}-title` : undefined} accessibilityRole="header" aria-level={2} style={{ fontFamily: fonts.sansBold, fontSize: 24, lineHeight: 29, color: p.ink }}>
          {title}
        </Text>
        {caption ? (
          <Text testID={testID ? `${testID}-caption` : undefined} style={{ fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: p.ink2 }}>
            {caption}
          </Text>
        ) : null}
      </View>
      <ProgressBar value={done / steps.length} label={undefined} testID={testID ? `${testID}-bar` : undefined} />
      <View style={{ gap: 8 }}>
        {steps.map((s, i) => {
          const current = i === at && !s.done;
          const later = !s.done && !current;
          return (
            <View key={s.label} accessible {...labelledRole} accessibilityLabel={`${s.label}${s.minutes ? `, ${s.minutes}` : ''}${s.done ? ', done' : current ? ', next' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: s.done ? accent.coral : 'transparent',
                  borderWidth: s.done ? 0 : current ? 2 : 1,
                  borderColor: current ? p.ink : p.line,
                }}
              >
                {s.done ? <Glyph name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={{ flex: 1, fontFamily: current ? fonts.sansSemi : fonts.sansMedium, fontSize: 15, color: later ? p.ink2 : p.ink }}>{s.label}</Text>
              {s.minutes ? <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: p.ink2 }}>{s.minutes}</Text> : null}
            </View>
          );
        })}
      </View>
      <InkButton testID={cta.testID} label={cta.label} onPress={cta.onPress} />
      {secondary ? <TextButton testID={secondary.testID} label={secondary.label} onPress={secondary.onPress} style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------- tab bar

export type TabName = 'today' | 'book' | 'envision' | 'coach' | 'you';

const TABS: { name: TabName; label: string; glyph: GlyphName }[] = [
  { name: 'today', label: 'Today', glyph: 'sun' },
  { name: 'book', label: 'Book', glyph: 'book' },
  { name: 'envision', label: 'Envision', glyph: 'eye' },
  { name: 'coach', label: 'Coach', glyph: 'chat' },
  { name: 'you', label: 'You', glyph: 'person' },
];

/** The five tabs. The active one is a pill; the rest lift under a pointer. */
export function TabBar({ active, onPress, style }: { active: TabName; onPress: (tab: TabName) => void; style?: StyleProp<ViewStyle> }) {
  const { p, dark } = usePalette();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          height: 62,
          borderRadius: 31,
          paddingHorizontal: 6,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.line2,
          ...(Platform.OS === 'web' ? webOnlyStyle({ boxShadow: dark ? shadow.cardWebNight : shadow.cardWeb }) : shadow.card),
        },
        style,
      ]}
    >
      {TABS.map((t) => (
        <TabButton key={t.name} tab={t} active={t.name === active} onPress={() => (t.name === active ? undefined : onPress(t.name))} />
      ))}
    </View>
  );
}

function TabButton({ tab, active, onPress }: { tab: { name: TabName; label: string; glyph: GlyphName }; active: boolean; onPress: () => void }) {
  const { p } = usePalette();
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      testID={`tab-${tab.name}`}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      aria-selected={active}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: active ? p.surface2 : hovered ? p.line2 : 'transparent',
        opacity: pressed ? 0.7 : 1,
        ...(Platform.OS === 'web' ? webHover.transition : {}),
      })}
    >
      <Glyph name={tab.glyph} size={20} color={active ? accent.coralText : p.ink2} strokeWidth={active ? 2.1 : 1.8} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ fontFamily: active ? fonts.sansSemi : fonts.sansMedium, fontSize: 11, lineHeight: 14, color: active ? p.ink : p.ink2 }}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

/** A round action button (the + and the ✓ above the tab bar). */
export function RoundButton({
  glyph,
  onPress,
  accessibilityLabel,
  testID,
  size = 58,
  primary = false,
}: {
  glyph: GlyphName;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
  size?: number;
  primary?: boolean;
}) {
  const { p, dark } = usePalette();
  const { hovered, hoverProps } = useHover();
  const bg = primary ? accent.coral : p.surface;
  const web = primary ? '0 10px 28px rgba(234,75,46,0.35)' : dark ? shadow.cardWebNight : shadow.cardWeb;
  const webHovered = primary ? '0 14px 34px rgba(234,75,46,0.48)' : dark ? '0 18px 44px rgba(0,0,0,0.55)' : '0 18px 44px rgba(23,24,28,0.16)';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: primary ? 0 : 1,
        borderColor: p.line2,
        transform: [{ translateY: hovered && !pressed ? -2 : 0 }, { scale: pressed ? 0.95 : 1 }],
        ...(Platform.OS === 'web'
          ? { ...webOnlyStyle({ boxShadow: hovered && !pressed ? webHovered : web }), ...webHover.transition }
          : primary
            ? { shadowColor: accent.coral, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }
            : shadow.card),
      })}
    >
      <Glyph name={glyph} size={24} color={primary ? '#FFFFFF' : p.ink} strokeWidth={2.2} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- sign in

/** The four-colour G, as Google draws it, on an 18-point grid. */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/**
 * Continue with Google, drawn to Google's own rules for the light button:
 * white, a hairline, the mark at the left, the words in the middle. It is
 * the one button in the product that is not the product's, which is the
 * point — a person recognises it.
 */
export function GoogleButton({ onPress, testID, busy = false, label = 'Continue with Google' }: { onPress: () => void; testID?: string; busy?: boolean; label?: string }) {
  const { hovered, hoverProps } = useHover();
  const reduced = useReducedMotion();
  const { scale, onPressIn, onPressOut } = usePress(reduced);
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={busy ? 'One moment' : label} accessibilityState={{ busy, disabled: busy }} aria-busy={busy} aria-disabled={busy} onPress={busy ? undefined : onPress} onPressIn={onPressIn} onPressOut={onPressOut} {...hoverProps}>
      {({ pressed }) => (
        <Animated.View
          style={[
            {
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: hovered ? '#5F6368' : '#747775',
              opacity: busy ? 0.7 : 1,
              transform: [{ translateY: hovered && !pressed ? -1 : 0 }, { scale }],
            },
            Platform.OS === 'web' ? webHover.transitionStill : null,
            Platform.OS === 'web' ? webOnlyStyle({ boxShadow: hovered && !pressed ? '0 4px 12px rgba(23,24,28,0.12)' : '0 1px 2px rgba(23,24,28,0.06)' }) : null,
          ]}
        >
          <GoogleMark size={20} />
          <Text style={{ flexShrink: 1, textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 16, color: '#1F1F1F' }}>{busy ? 'One moment…' : label}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}
