/**
 * Text, chips, fields, buttons and the hold control.
 *
 * The typographic rule of the product lives here: `UserText` is the ONLY
 * component that sets the serif, and it is the only one the user's own words go
 * through. If a screen wants to render app prose in the serif, it cannot.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { accent, day, focusRing, motion, night, radius, size, type as fonts, webOnlyStyle, type Palette } from './tokens';
import { splitQuoted } from './quoted';

export const PaletteContext = React.createContext<{ p: Palette; dark: boolean }>({ p: day, dark: false });

export function usePalette() {
  return React.useContext(PaletteContext);
}

export function Studio({
  dark = false,
  wide = false,
  children,
  style,
  testID,
}: {
  dark?: boolean;
  /**
   * Let the screen use the full tablet width rather than one column of
   * writing. Only for the two screens PRD 7.14 names — the Goal and the Book —
   * which lay out their own columns inside it.
   */
  wide?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const p = dark ? (night as unknown as Palette) : day;
  return (
    <PaletteContext.Provider value={{ p, dark }}>
      {/*
        The ground is full bleed; the writing is not.

        This is a phone-native product and every measure in it — the Fifteen,
        the Book, the read-back — is set for a hand's width. Opened at 1280 pt
        the Book's first sentence ran 1192 pt wide, about a hundred and fifty
        characters on one line of serif, which is not a page anybody reads.
        One column here rather than a max-width on forty screens, and the
        colour still reaches the edges so a tablet does not look like a phone
        pasted onto a white sheet.
      */}
      <View testID={testID} style={[{ flex: 1, backgroundColor: p.ground }, style]}>
        <View style={{ flex: 1, width: '100%', maxWidth: wide ? TWO_COLUMN : COLUMN, alignSelf: 'center' }}>
          {children}
        </View>
      </View>
    </PaletteContext.Provider>
  );
}

/**
 * The widest one column of writing is ever set (PRD 7.14: "content max-width
 * 640 pt"). A little over a large phone, so a tablet feels roomy without the
 * line length leaving the range this type was chosen for.
 */
export const COLUMN = 640;

/**
 * The width at which there is honestly room for two columns.
 *
 * Two columns of 640 plus the gutter and the margins. Below it there is not
 * room for both, and a screen that tries anyway gets two narrow columns rather
 * than one good one.
 */
export const TWO_COLUMN = 1000;

/**
 * Whether this screen has room for the tablet layout (PRD 7.14: two-column
 * Goal and Book).
 *
 * Reads the window rather than the platform, so it is right on a folding
 * phone, on a split-screen tablet and in a resized browser — all three of
 * which a platform check gets wrong.
 */
export function useTwoColumn(): boolean {
  const { width } = useWindowDimensions();
  return width >= TWO_COLUMN;
}

// ---------------------------------------------------------------- text

type TextProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  testID?: string;
  accessibilityRole?: 'header' | 'text';
  /**
   * What a screen reader says instead of the rendered characters. Needed
   * wherever the visual form carries meaning the letters do not — a quoted
   * fragment in a margin, a bare number, a time.
   */
  accessibilityLabel?: string;
  /**
   * Lets the reader select and copy the text. Off by default, on wherever the
   * characters themselves are the useful thing — a helpline number that will
   * not dial on this device is only any use if it can be copied out.
   */
  selectable?: boolean;
};

export function Statement({ children, style, testID, accessibilityLabel }: TextProps) {
  const { p } = usePalette();
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessibilityRole="header"
      style={[
        { fontFamily: fonts.sansBold, fontSize: size.statement, lineHeight: 38, letterSpacing: -1, color: p.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Question({ children, style, testID, accessibilityLabel }: TextProps) {
  const { p } = usePalette();
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessibilityRole="header"
      style={[{ fontFamily: fonts.sansMedium, fontSize: size.question, lineHeight: 29, color: p.ink }, style]}
    >
      {children}
    </Text>
  );
}

export function Body({ children, style, numberOfLines, testID, accessibilityLabel, selectable }: TextProps) {
  const { p } = usePalette();
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[{ fontFamily: fonts.sans, fontSize: size.body, lineHeight: 23, color: p.ink2 }, style]}
    >
      {children}
    </Text>
  );
}

export function Label({ children, style, testID, accessibilityLabel }: TextProps) {
  const { p } = usePalette();
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        {
          fontFamily: fonts.sansSemi,
          fontSize: size.label,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: p.ink3,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * The user's own words. The only serif in the product.
 * Anything rendered here was typed or spoken by the person using the app.
 */
export function UserText({
  children,
  style,
  italic = false,
  numberOfLines,
  testID,
  accessibilityLabel,
  framing,
}: TextProps & {
  italic?: boolean;
  /**
   * The app's few words in front of theirs — "…then I" before the second
   * half of an if-then — set in the sans on the same line. The framing is
   * chrome, the same chrome the stone showed above the field, and printing
   * it in the serif would claim it as something they wrote.
   */
  framing?: string;
}) {
  const { p } = usePalette();
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: italic ? fonts.serifItalic : fonts.serif,
          fontSize: 19,
          lineHeight: 28,
          color: p.ink,
        },
        style,
      ]}
    >
      {framing ? <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, letterSpacing: 0.4 }}>{framing} </Text> : null}
      {children}
    </Text>
  );
}

/**
 * App prose with the person's own words set inside it.
 *
 * A brief, a coach reply, a letter from the future self: each is a sentence
 * the app wrote around a span the person wrote, and the two are not the same
 * kind of text. The span is set in the serif — the one face that means
 * "these are your words" — and everything around it in the sans, so the eye
 * can tell at a glance which words were typed and which were only typeset.
 *
 * `spans` are the verified substrings the engine already checked; nothing
 * here decides what counts as theirs, it only shows what was decided.
 */
export function Quoted({
  text,
  spans,
  style,
  testID,
  accessibilityLabel,
  italic = true,
}: {
  text: string;
  spans: readonly string[];
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  /** The serif face for the spans. Italic by default, as a quotation is. */
  italic?: boolean;
}) {
  const { p } = usePalette();
  const parts = splitQuoted(text, spans);
  const base: TextStyle = { fontFamily: fonts.sans, fontSize: size.body, lineHeight: 23, color: p.ink2 };
  return (
    <Text accessibilityLabel={accessibilityLabel} testID={testID} style={[base, style]}>
      {parts.map((part, i) =>
        part.theirs ? (
          <Text key={i} style={[base, style, { fontFamily: italic ? fonts.serifItalic : fonts.serif }]}>
            {part.text}
          </Text>
        ) : (
          <Text key={i} style={[base, style]}>
            {part.text}
          </Text>
        ),
      )}
    </Text>
  );
}

export function Readout({ children, style, testID, accessibilityLabel }: TextProps) {
  const { p } = usePalette();
  return (
    <Text
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        {
          fontFamily: fonts.sansBold,
          fontSize: size.readout,
          lineHeight: 42,
          letterSpacing: -1.5,
          color: p.ink,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- controls

export function Chip({
  label,
  selected = false,
  ghost = false,
  onPress,
  testID,
  style,
}: {
  label: string;
  selected?: boolean;
  ghost?: boolean;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { p, dark } = usePalette();
  const bg = selected ? p.ink : ghost ? 'transparent' : p.surface;
  const fg = selected ? (dark ? night.ground : '#FFFFFF') : p.ink;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          paddingVertical: 9,
          paddingHorizontal: 14,
          borderRadius: radius.chip,
          backgroundColor: bg,
          borderWidth: ghost ? 1.5 : 0,
          borderColor: p.line,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.sansSemi, fontSize: 14, color: ghost ? p.ink2 : fg }}>{label}</Text>
    </Pressable>
  );
}

export function InkButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  testID,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { p, dark } = usePalette();
  return (
    <Pressable
      testID={testID}
      onPress={disabled || busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        {
          // A floor, not a ceiling. At 200% type a fixed 58 clipped the label
          // inside the button that was supposed to carry it.
          minHeight: 58,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: radius.chip,
          backgroundColor: p.ink,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
          ...(Platform.OS === 'web'
            ? { boxShadow: pressed ? '0 3px 0 #000' : '0 5px 0 #000' }
            : { shadowColor: '#000', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: pressed ? 3 : 5 } }),
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={dark ? night.ground : '#FFFFFF'} />
      ) : (
        <Text style={{ fontFamily: fonts.sansSemi, fontSize: 17, textAlign: 'center', color: dark ? night.ground : '#FFFFFF' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextButton({ label, onPress, testID }: { label: string; onPress?: () => void; testID?: string }) {
  const { p } = usePalette();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 15, color: p.ink3 }}>{label}</Text>
    </Pressable>
  );
}

/**
 * The one place the user types a line. Serif, because it is their words, with a
 * coral underline so the page shows where authorship happens.
 */
export function UserField({
  value,
  onChangeText,
  placeholder,
  label,
  multiline = false,
  autoFocus = false,
  testID,
  onSubmitEditing,
  minHeight,
  autoCapitalize,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  /**
   * What this field is for, in words, and it is not the placeholder.
   *
   * A placeholder is a hint that vanishes the moment someone types, so using it
   * as the accessible name leaves the field unnamed exactly when a screen-reader
   * user is checking what they have written. Where a visible Label already sits
   * above the field, pass its text here.
   */
  label?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  testID?: string;
  onSubmitEditing?: () => void;
  minHeight?: number;
  /**
   * For the two fields that are not prose — an email address and a six-digit
   * code. The rest of the product never sets these: a sentence is typed as a
   * sentence, with whatever keyboard the person prefers.
   */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
}) {
  const { p } = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={p.ink3}
      multiline={multiline}
      autoFocus={autoFocus}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      autoCorrect={keyboardType ? false : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onSubmitEditing={onSubmitEditing}
      accessibilityLabel={label ?? placeholder}
      // The hint stays a hint. It is still announced, and it no longer has to
      // do the job of the name.
      {...(label && placeholder ? { accessibilityHint: placeholder } : {})}
      style={{
        fontFamily: fonts.serif,
        fontSize: 19,
        lineHeight: 28,
        color: p.ink,
        // Focus is shown by the line this field already has, not by a box
        // drawn around it. A coral rectangle on a coral-underlined field reads
        // as an error, and the browser's own ring is amber, which is worse.
        borderBottomWidth: focused ? 3 : 2,
        borderBottomColor: focused ? accent.coral : accent.coralSoftLine,
        paddingVertical: 8,
        minHeight: minHeight ?? (multiline ? 96 : 44),
        textAlignVertical: multiline ? 'top' : 'center',
        ...(Platform.OS === 'web' ? webOnlyStyle({ outlineStyle: 'none' }) : {}),
      }}
    />
  );
}

// ---------------------------------------------------------------- the hold

/**
 * Hold to seal (PRD §8.5). The same gesture closes a day and closes a Book, so
 * it means one thing: this is finished for now.
 * Releasing early drains the bar and changes nothing.
 */
export function HoldBar({
  label,
  doneLabel,
  onComplete,
  durationMs = motion.holdMs,
  done = false,
  testID,
  reducedMotion = false,
}: {
  label: string;
  doneLabel?: string;
  /**
   * Return `false` (or a promise of it) to refuse the seal. The bar then drains
   * and can be held again. Without that, a refusal used to latch the control
   * shut and strand the person on Seal the Book with nothing left to press.
   */
  onComplete: () => void | boolean | Promise<void | boolean>;
  durationMs?: number;
  done?: boolean;
  testID?: string;
  reducedMotion?: boolean;
}) {
  const { p, dark } = usePalette();
  const fill = useRef(new Animated.Value(done ? 1 : 0)).current;
  const [holding, setHolding] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const completed = useRef(done);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (live) setScreenReader(on);
    }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    completed.current = done;
    fill.setValue(done ? 1 : 0);
  }, [done, fill]);

  /** Let go of the latch when the thing being sealed says no. */
  const settle = useCallback(
    (outcome: void | boolean | Promise<void | boolean>) => {
      Promise.resolve(outcome)
        .then((ok) => {
          if (ok === false) {
            completed.current = false;
            setHolding(false);
            Animated.timing(fill, { toValue: 0, duration: 450, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
          }
        })
        .catch(() => {
          completed.current = false;
          setHolding(false);
          fill.setValue(0);
        });
    },
    [fill],
  );

  const start = useCallback(() => {
    if (completed.current) return;
    setHolding(true);
    // Reduced motion still needs the hold, or the gesture stops meaning
    // anything, and it still needs to SHOW the hold, or there is nothing on
    // screen saying how much longer to keep pressing.
    //
    // `Easing.step0` was the wrong tool: it returns 1 for every t above zero,
    // so the bar filled completely on the first frame while the timer ran the
    // full 1.6 seconds underneath. A reduced-motion person saw a finished bar,
    // let go, and the seal silently drained — they were shown the opposite of
    // what was happening. What that setting asks us to drop is the travelling
    // edge, not the information, so the bar now moves in four discrete jumps.
    const steps = 4;
    anim.current = reducedMotion
      ? Animated.sequence(
          Array.from({ length: steps }, (_, i) =>
            Animated.timing(fill, {
              toValue: (i + 1) / steps,
              duration: durationMs / steps,
              useNativeDriver: false,
              easing: Easing.step1,
            }),
          ),
        )
      : Animated.timing(fill, { toValue: 1, duration: durationMs, useNativeDriver: false, easing: Easing.linear });
    anim.current.start(({ finished }: { finished: boolean }) => {
      if (finished && !completed.current) {
        completed.current = true;
        setHolding(false);
        settle(onComplete());
      }
    });
  }, [durationMs, fill, onComplete, reducedMotion, settle]);

  const cancel = useCallback(() => {
    if (completed.current) return;
    anim.current?.stop();
    setHolding(false);
    Animated.timing(fill, { toValue: 0, duration: 450, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
  }, [fill]);

  /** Seal without the gesture. The one path assistive technology can take. */
  const sealDirectly = useCallback(() => {
    if (completed.current) return;
    anim.current?.stop();
    completed.current = true;
    setHolding(false);
    fill.setValue(1);
    settle(onComplete());
  }, [fill, onComplete, settle]);

  /**
   * Whether a finger is part-way through a press on this control.
   *
   * A pointer press always fires onPressIn before onPress. An activation from
   * TalkBack, from a switch, or from the Enter key arrives as a bare press with
   * no press-in at all — and those are exactly the users who cannot hold. So a
   * press with no pointer sequence behind it seals, and a real tap still has to
   * hold.
   *
   * The flag is lowered a moment after the finger lifts rather than on the
   * press itself, because a finger that presses down and slides off the control
   * fires press-in and press-out with no press at all. Left raised, it would
   * swallow the next activation from assistive technology, which is the one
   * activation that must never be dropped.
   */
  const pointerDown = useRef(false);
  const pointerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<unknown>(null);
  const sealDirectlyRef = useRef<() => void>(() => undefined);

  useEffect(
    () => () => {
      if (pointerTimer.current) clearTimeout(pointerTimer.current);
    },
    [],
  );

  /**
   * Keyboard, heard directly rather than inferred.
   *
   * react-native-web turns an Enter press into the same onPressIn / onPressOut
   * / onPress sequence a finger produces, so the guard that tells a finger from
   * an assistive activation cannot tell them apart at all — it saw a pointer
   * sequence and swallowed the only route a keyboard user has to seal their
   * Book. Verified in the browser: before this, Enter on a focused bar did
   * nothing whatsoever.
   *
   * A real key event carries no pointer, so listening for it on the DOM node
   * settles the question instead of guessing at it.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = barRef.current as { addEventListener?: (t: string, f: (e: unknown) => void) => void; removeEventListener?: (t: string, f: (e: unknown) => void) => void } | null;
    if (!node?.addEventListener) return;
    const onKey = (raw: unknown) => {
      const e = raw as { key?: string; preventDefault?: () => void; repeat?: boolean };
      if (e.repeat) return;
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault?.();
      sealDirectlyRef.current();
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener?.('keydown', onKey);
  }, []);

  sealDirectlyRef.current = sealDirectly;

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] });

  return (
    <Pressable
      ref={(node) => {
        barRef.current = node;
      }}
      testID={testID}
      onPressIn={() => {
        if (pointerTimer.current) clearTimeout(pointerTimer.current);
        pointerDown.current = true;
        start();
      }}
      onPressOut={() => {
        cancel();
        if (pointerTimer.current) clearTimeout(pointerTimer.current);
        // Long enough that the press that follows a lift still sees the flag,
        // short enough that a finger sliding off does not leave it raised.
        pointerTimer.current = setTimeout(() => {
          pointerDown.current = false;
        }, 250);
      }}
      onPress={() => {
        // A finger already had its go through the hold. Only an activation
        // with no pointer sequence behind it gets the direct path.
        if (pointerDown.current) return;
        sealDirectly();
      }}
      accessibilityRole="button"
      accessibilityLabel={done ? (doneLabel ?? label) : label}
      accessibilityHint={
        screenReader ? 'Double tap to seal' : 'Press and hold until the bar fills'
      }
      accessibilityState={{ disabled: done }}
      focusable
      onLongPress={undefined}
      onAccessibilityTap={sealDirectly}
      style={{
        // A floor, not a ceiling: at 200% type the label has to be able to
        // push the bar taller instead of being cut off inside it.
        minHeight: 60,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radius.chip,
        overflow: 'hidden',
        backgroundColor: p.surface2,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width,
          backgroundColor: accent.coral,
        }}
      />
      <Text
        style={{
          fontFamily: fonts.sansSemi,
          fontSize: 16,
          color: done || holding ? '#FFFFFF' : p.ink,
          textAlign: 'center',
        }}
      >
        {done ? (doneLabel ?? label) : holding ? 'Keep holding…' : label}
      </Text>
    </Pressable>
  );
}

/** Whether the OS asked us to stop moving things. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  const { p } = usePalette();
  return <View style={[{ height: 1, backgroundColor: p.line }, style]} />;
}

export function Toast({
  text,
  actionLabel,
  onAction,
  testID,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  // iOS ignores accessibilityLiveRegion, so a toast carrying Undo was
  // announced on Android and silent on VoiceOver — and Undo is the only way
  // back from parking a stone by accident. Announce it explicitly there.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const message = actionLabel ? `${text}. ${actionLabel} available.` : text;
    AccessibilityInfo.announceForAccessibility(message);
  }, [text, actionLabel]);

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      role="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingLeft: 18,
        paddingRight: 8,
        borderRadius: radius.chip,
        backgroundColor: night.ground,
      }}
    >
      <Text
        // Two lines, not one. A move title plus "Added ·" is routinely longer
        // than a phone is wide, and the tail was simply cut off.
        numberOfLines={2}
        style={{ flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: '#FFFFFF' }}
      >
        {text}
      </Text>
      {actionLabel ? (
        <Pressable
          testID={testID ? `${testID}-action` : undefined}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: '#FFFFFF' }}
        >
          <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: night.ground }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, body, testID }: { title: string; body: string; testID?: string }) {
  return (
    <View testID={testID} style={{ paddingVertical: 32, gap: 8 }}>
      <Question>{title}</Question>
      <Body>{body}</Body>
    </View>
  );
}
