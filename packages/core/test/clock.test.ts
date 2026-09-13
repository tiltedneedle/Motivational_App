import { describe, expect, it } from 'vitest';
import {
  EXTENSION_SECONDS,
  MAX_EXTENSIONS,
  canExtend,
  draftOf,
  extend,
  extensionsUsed,
  remaining,
  resumeWriting,
  ringFraction,
  startWriting,
  targetSeconds,
  tick,
} from '../src/engines/writing';

/**
 * WCAG 2.2.1 Timing Adjustable: the ring closes at fifteen (PRD §7.2), and a
 * person can add five more minutes, up to ten times, without losing a word.
 */
describe('the clock can be extended when it ends', () => {
  const atTheEnd = () => {
    const s = startWriting('ideal', 'starter');
    return tick({ ...s, body: 'a tuesday' }, targetSeconds('ideal', 'starter') * 1000, false);
  };

  it('closes at the target and reopens five minutes longer', () => {
    const closed = atTheEnd();
    expect(closed.closed).toBe(true);
    expect(remaining(closed)).toBe(0);
    const more = extend(closed);
    expect(more.closed).toBe(false);
    expect(more.body).toBe('a tuesday');
    expect(remaining(more)).toBe(EXTENSION_SECONDS);
    expect(extensionsUsed(more)).toBe(1);
  });

  it('the ring measures the longer clock, not the original', () => {
    const more = extend(atTheEnd());
    expect(ringFraction(more)).toBeLessThan(1);
    expect(ringFraction(more)).toBeCloseTo(15 / 20, 3);
    const again = tick(more, EXTENSION_SECONDS * 1000, false);
    expect(again.closed).toBe(true);
    expect(ringFraction(again)).toBe(1);
  });

  it('allows ten extensions and then no more', () => {
    let s = atTheEnd();
    for (let i = 0; i < MAX_EXTENSIONS; i += 1) {
      expect(canExtend(s)).toBe(true);
      s = tick(extend(s), EXTENSION_SECONDS * 1000, false);
      expect(s.closed).toBe(true);
    }
    expect(extensionsUsed(s)).toBe(MAX_EXTENSIONS);
    expect(canExtend(s)).toBe(false);
    expect(extend(s)).toBe(s);
  });

  it('carries the extension through a draft and a resume', () => {
    const more = extend(atTheEnd());
    const d = draftOf(more, '2026-09-13T20:00:00.000Z');
    expect(d.extraSeconds).toBe(EXTENSION_SECONDS);
    const back = resumeWriting(d);
    expect(back.extraSeconds).toBe(EXTENSION_SECONDS);
    expect(back.closed).toBe(false);
    expect(remaining(back)).toBe(EXTENSION_SECONDS);
  });

  it('an old draft with no extension field resumes as before', () => {
    const d = { ...draftOf(startWriting('ideal', 'starter')), elapsed: 30 } as ReturnType<typeof draftOf>;
    delete (d as { extraSeconds?: number }).extraSeconds;
    const back = resumeWriting(d);
    expect(back.extraSeconds).toBe(0);
    expect(remaining(back)).toBe(targetSeconds('ideal', 'starter') - 30);
  });
});
