import { describe, expect, it } from 'vitest';
import { shiftDay, streakOf, weekOf } from '../src/engines/week';

describe('the week and the streak', () => {
  it('shifts across a month end', () => {
    expect(shiftDay('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts consecutive sealed days ending today', () => {
    expect(streakOf(['2026-09-14', '2026-09-15', '2026-09-16'], '2026-09-16')).toBe(3);
  });

  it('keeps a run alive through an unsealed today', () => {
    expect(streakOf(['2026-09-14', '2026-09-15'], '2026-09-16')).toBe(2);
  });

  it('ends a run that stopped two days ago', () => {
    expect(streakOf(['2026-09-13', '2026-09-14'], '2026-09-16')).toBe(0);
  });

  it('lays the week out Monday first, with today marked', () => {
    const w = weekOf('2026-09-16', ['2026-09-14', '2026-09-16']); // a Wednesday
    expect(w.map((c) => c.letter).join('')).toBe('MTWTFSS');
    expect(w[0]!.key).toBe('2026-09-14');
    expect(w[0]!.state).toBe('sealed');
    expect(w[1]!.state).toBe('empty');
    expect(w[2]!.state).toBe('todaySealed');
    expect(w[3]!.state).toBe('future');
    expect(w[2]!.label).toContain('today');
  });

  it('puts a Sunday at the end of its own week', () => {
    const w = weekOf('2026-09-20', []);
    expect(w[6]!.key).toBe('2026-09-20');
    expect(w[6]!.state).toBe('today');
  });
});
