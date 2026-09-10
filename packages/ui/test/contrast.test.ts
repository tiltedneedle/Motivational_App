/**
 * Contrast is a promise the product makes, so it is measured rather than
 * eyeballed (PRD §8.7, WCAG 2.2 AA).
 *
 * The rule that matters: text a person has to read must clear 4.5:1 against the
 * ground it sits on, and 3:1 when it is large. A colour that only reads on a
 * designer's calibrated screen is not a colour anyone else has.
 */
import { describe, expect, it } from 'vitest';
import { accent, day, night } from '../src/tokens';

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

describe('white on a filled control', () => {
  it('reads on the ink button and on coral', () => {
    expect(ratio('#FFFFFF', day.ink)).toBeGreaterThanOrEqual(AA_BODY);
    expect(ratio('#FFFFFF', accent.coral)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
