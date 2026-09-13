/**
 * Contrast is a promise the product makes, so it is measured rather than
 * eyeballed (PRD §8.7, WCAG 2.2 AA).
 *
 * The rule that matters: text a person has to read must clear 4.5:1 against the
 * ground it sits on, and 3:1 when it is large. A colour that only reads on a
 * designer's calibrated screen is not a colour anyone else has.
 */
import { describe, expect, it } from 'vitest';
import { accent, day, dayStudio, night, paper, setDark } from '../src/tokens';

/** sRGB relative luminance, WCAG 2.x definition. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const parts = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = parts.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = lin as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

const AA_BODY = 4.5;
const AA_LARGE = 3;

describe('the day studio', () => {
  const grounds: [string, string][] = [
    ['the ground', day.ground],
    ['the darkest edge of the ground', day.groundBottom],
    ['a surface', day.surface],
    ['a raised surface', day.surface2],
  ];

  for (const [where, bg] of grounds) {
    it(`sets body text legibly on ${where}`, () => {
      expect(ratio(day.ink, bg)).toBeGreaterThanOrEqual(AA_BODY);
      expect(ratio(day.ink2, bg)).toBeGreaterThanOrEqual(AA_BODY);
    });

    it(`sets the quietest ink legibly on ${where}`, () => {
      // ink3 carries labels, placeholders, captions and completed rows. It is
      // small text, so it has to clear the body threshold, not the large one.
      // It used to measure 2.14:1, which is not grey — it is invisible.
      expect(ratio(day.ink3, bg)).toBeGreaterThanOrEqual(AA_BODY);
    });
  }
});

describe('the paper the Book is printed on', () => {
  it('sets every ink legibly on the paper', () => {
    expect(ratio(paper.ink, paper.ground)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(paper.ink2, paper.ground)).toBeGreaterThanOrEqual(AA_BODY);
    // The label ink carries the small captions above every line of the
    // Book, so it is held to the body threshold, not the large one.
    expect(ratio(paper.ink3, paper.ground)).toBeGreaterThanOrEqual(AA_BODY);
  });
});

describe('the night studio', () => {
  const grounds: [string, string][] = [
    ['the ground', night.ground],
    ['a surface', night.surface],
    ['a raised surface', night.surface2],
  ];

  for (const [where, bg] of grounds) {
    it(`sets every ink legibly on ${where}`, () => {
      expect(ratio(night.ink, bg)).toBeGreaterThanOrEqual(AA_BODY);
      expect(ratio(night.ink2, bg)).toBeGreaterThanOrEqual(AA_BODY);
      expect(ratio(night.ink3, bg)).toBeGreaterThanOrEqual(AA_BODY);
    });
  }
});

describe('the domain accents', () => {
  // These identify a domain and they are also set as small uppercase labels, so
  // each needs a text-safe partner rather than being used raw on the ground.
  const domains = ['coral', 'teal', 'violet', 'amber', 'rose', 'moss'] as const;

  for (const name of domains) {
    it(`${name} has a text-safe form for the day studio`, () => {
      const onInk = accent[`${name}Text` as keyof typeof accent] as string | undefined;
      expect(onInk, `${name}Text is missing`).toBeTruthy();
      expect(ratio(onInk as string, day.ground)).toBeGreaterThanOrEqual(AA_BODY);
      expect(ratio(onInk as string, day.surface)).toBeGreaterThanOrEqual(AA_BODY);
    });

    it(`${name} has a text-safe form for the night studio`, () => {
      const onNight = accent[`${name}Night` as keyof typeof accent] as string | undefined;
      expect(onNight, `${name}Night is missing`).toBeTruthy();
      expect(ratio(onNight as string, night.ground)).toBeGreaterThanOrEqual(AA_BODY);
      expect(ratio(onNight as string, night.surface)).toBeGreaterThanOrEqual(AA_BODY);
    });

    it(`${name} still works as a mark, which only needs the large threshold`, () => {
      expect(ratio(accent[name], day.ground)).toBeGreaterThanOrEqual(AA_LARGE);
    });
  }
});

describe('the status colours, which are also set as text', () => {
  // These were left out of the first sweep and are used as 14px body text:
  // the delta beside the Consistency Score, and the error line in the practice
  // builder. A colour that means "this went well" or "this is wrong" has to be
  // readable, or it means nothing at all.
  it('success reads as small text on the day ground', () => {
    expect(ratio(accent.success, day.ground)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(accent.success, day.surface)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('destructive reads as small text on the day ground', () => {
    expect(ratio(accent.destructive, day.ground)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(accent.destructive, day.surface)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('pearl is a mark, not a text colour, and is only asked to be one', () => {
    // Deliberately not held to the text threshold: it is the coach's stone.
    expect(ratio(accent.pearl, day.ground)).toBeGreaterThan(1);
  });
});

describe('white on a filled control', () => {
  it('reads on the ink button and on coral', () => {
    expect(ratio('#FFFFFF', day.ink)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio('#FFFFFF', accent.coral)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe('the night studio as dark mode', () => {
  it('sets the status colours legibly on the night ground too', () => {
    expect(ratio(accent.successNight, night.ground)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(accent.successNight, night.surface)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(accent.destructiveNight, night.ground)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(accent.destructiveNight, night.surface)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('turns the day palette into the night palette, and the text accents with it', () => {
    // `day` is a view over whichever studio is on (PRD 7.14). Off, it is the
    // day studio; on, every read is the night studio's, and each `…Text`
    // accent answers with its `…Night` form so a label set in coral is still a
    // colour on charcoal.
    setDark(true);
    try {
      expect(day.ground).toBe(night.ground);
      expect(day.ink).toBe(night.ink);
      expect(day.onInk).toBe(night.onInk);
      expect(accent.coralText).toBe(accent.coralNight);
      expect(accent.success).toBe(accent.successNight);
      expect(accent.coral).toBe('#EA4B2E');
      expect(ratio(day.ink, day.ground)).toBeGreaterThanOrEqual(AA_BODY);
      expect(ratio(day.onInk, day.ink)).toBeGreaterThanOrEqual(AA_BODY);
    } finally {
      setDark(false);
    }
    expect(day.ground).toBe('#F1F0EC');
    expect(accent.coralText).toBe('#CB3014');
  });

  it('sets white on the ink fill legibly in the day studio', () => {
    expect(ratio(day.onInk, day.ink)).toBeGreaterThanOrEqual(AA_BODY);
  });

  it('sets the second line on an ink fill legibly, in both studios', () => {
    // A selected track card's description was white at 75% — a colour that
    // vanished on the night studio's light ink.
    expect(ratio(dayStudio.onInkSoft, dayStudio.ink)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio(night.onInkSoft, night.ink)).toBeGreaterThanOrEqual(AA_BODY);
  });
});

/**
 * Non-text contrast (WCAG 1.4.11): the one line under every text field is
 * the field's boundary, and it has to clear 3:1 against the ground at rest —
 * not only when focused. At 45% coral it sat under 2:1.
 */
describe('the field underline', () => {
  const over = (rgba: string, bgHex: string): string => {
    const m = rgba.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
    if (!m) return rgba;
    const a = Number(m[4]);
    const bg = bgHex.replace('#', '');
    const ch = (i: number) => parseInt(bg.slice(i, i + 2), 16);
    const mix = (fg: number, b: number) => Math.round(fg * a + b * (1 - a));
    const hex = [mix(Number(m[1]), ch(0)), mix(Number(m[2]), ch(2)), mix(Number(m[3]), ch(4))].map((v) => v.toString(16).padStart(2, '0')).join('');
    return `#${hex}`;
  };
  it('clears 3:1 at rest on the day ground and on a surface', () => {
    expect(ratio(over(accent.coralSoftLine, day.ground), day.ground)).toBeGreaterThanOrEqual(3);
    expect(ratio(over(accent.coralSoftLine, day.surface), day.surface)).toBeGreaterThanOrEqual(3);
  });
});
