/**
 * Studio tokens (PRD §8.3, §8.4, §8.7).
 *
 * Two grounds: the day studio and the night studio. The night studio is not
 * "dark mode" — it is the room the writing and the seals happen in, and it is
 * used at those moments whatever the system theme says.
 */

/**
 * Every ink here clears 4.5:1 against every ground in this palette, measured
 * in `test/contrast.test.ts` rather than judged by eye.
 *
 * There is not room for three legible greys on a light ground, and the old
 * palette pretended there was: `ink3` measured 2.14:1 and carried every label,
 * placeholder, caption and completed row in the product. The hierarchy is now
 * two steps of colour (5.55 and 4.53) and is carried the rest of the way by
 * weight and size, which cost nobody their eyesight.
 */
export const day = {
  ground: '#F1F0EC',
  groundTop: '#F8F7F4',
  groundBottom: '#E4E3DF',
  surface: '#FFFFFF',
  surface2: '#EEEDE8',
  ink: '#17181C',
  ink2: '#55585F',
  ink3: '#62656E',
  line: 'rgba(23,24,28,0.12)',
  line2: 'rgba(23,24,28,0.06)',
  scrim: 'rgba(23,24,28,0.38)',
} as const;

export const night = {
  ground: '#17181C',
  groundTop: '#23252C',
  groundBottom: '#0E0F12',
  surface: '#1E1F24',
  surface2: '#26272D',
  ink: '#F2F1ED',
  ink2: '#B4B6BC',
  ink3: '#8B8E95',
  line: 'rgba(255,255,255,0.14)',
  line2: 'rgba(255,255,255,0.07)',
  scrim: 'rgba(0,0,0,0.55)',
} as const;

export type Palette = typeof day;

/**
 * Each domain colour comes in three forms, because one colour cannot do all
 * three jobs and the palette used to ask it to.
 *
 *  - the bare name is the MARK: stones, rings, the fill of a control. It clears
 *    3:1 on the day ground, the threshold for a graphical object.
 *  - `…Text` is the same hue dark enough to be READ as small text on a light
 *    ground. Amber as a 12px label measured 1.97:1, which is not a colour.
 *  - `…Night` is the same hue light enough to be read in the night studio.
 *
 * White is only legible on `…Text`, never on the mark, so a filled control that
 * carries a white label takes the text form as its fill.
 */
export const accent = {
  coral: '#EA4B2E',
  coralText: '#CB3014',
  coralNight: '#ED6147',
  coralSoft: 'rgba(234,75,46,0.12)',
  /** The writing line at rest. Focus moves it to full coral. */
  coralSoftLine: 'rgba(234,75,46,0.45)',
  teal: '#169A89',
  tealText: '#11796C',
  tealNight: '#179F8D',
  violet: '#6D4BE8',
  violetText: '#6D4BE8',
  violetNight: '#957CEE',
  amber: '#C27B0C',
  amberText: '#966009',
  amberNight: '#F09A12',
  rose: '#E23A6E',
  roseText: '#CF1E55',
  roseNight: '#E75E88',
  moss: '#5C9A2D',
  mossText: '#477823',
  mossNight: '#5E9E2E',
  pearl: '#CFCBC2',
  // Darkened to read as small text. It is set at 14px beside the Consistency
  // Score, where it measured 2.68:1 against the ground it sits on — a colour
  // that means "this went well" and could not be read.
  success: '#167442',
  destructive: '#B23A1E',
} as const;

/**
 * The focus ring, on web.
 *
 * Chrome draws its own in amber (#E59700), which is not a colour this product
 * owns and reads as a warning against the night studio. Keyboard focus has to
 * stay visible — that is a promise, not a preference — so it is redrawn in the
 * product's own coral rather than removed.
 */
export const focusRing = {
  outlineColor: accent.coral,
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 3,
} as const;

/**
 * Style properties react-native-web understands and React Native's own types do
 * not, such as `outlineStyle`. Casting once here beats an `as never` at every
 * call site and keeps it obvious that these apply on web only.
 */
export function webOnlyStyle(style: Record<string, unknown>): Record<string, never> {
  return style as Record<string, never>;
}

export const space = [0, 4, 8, 12, 16, 22, 32, 48, 64] as const;

export const radius = {
  chip: 999,
  field: 16,
  sheet: 30,
  card: 22,
  print: 28,
} as const;

export const type = {
  /** The interface and the coach. */
  sans: 'Outfit_400Regular',
  sansMedium: 'Outfit_500Medium',
  sansSemi: 'Outfit_600SemiBold',
  sansBold: 'Outfit_700Bold',
  /** ONLY the user's own words. Nothing the app wrote is ever set in this. */
  serif: 'Newsreader_400Regular',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifMedium: 'Newsreader_500Medium',
} as const;

export const size = {
  statement: 34,
  h2: 28,
  question: 22,
  body: 17,
  small: 15,
  label: 12,
  readout: 40,
} as const;

/** Springs and durations (PRD §8.5). Nothing bounces more than once. */
export const motion = {
  seat: { damping: 14, stiffness: 260, mass: 1 },
  standard: { damping: 18, stiffness: 180, mass: 1 },
  sheet: { damping: 24, stiffness: 120, mass: 1 },
  fadeFast: 180,
  fade: 240,
  fadeSlow: 400,
  holdMs: 1600,
  stagger: 80,
} as const;

export const shadow = {
  card: {
    shadowColor: '#17181C',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#17181C',
    shadowOpacity: 0.4,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: -20 },
    elevation: 16,
  },
  /** The pressable bottom edge on ink buttons. */
  inkEdge: {
    shadowColor: '#000000',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
} as const;

export const PHONE = { width: 390, height: 844 } as const;
