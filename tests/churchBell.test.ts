import { describe, expect, it } from 'vitest';
import { BELL, QUARTER_MS, quarterOf, sinceQuarter, strikesAt, strokes } from '../src/lib/churchBell';

const at = (h: number, m: number) => new Date(2026, 10, 20, h, m, 1).getTime();

describe('the chapel bell', () => {
  it('strikes one, two and three at the quarters', () => {
    expect(strikesAt(at(10, 15))).toEqual({ quarters: 1, hours: 0 });
    expect(strikesAt(at(10, 30))).toEqual({ quarters: 2, hours: 0 });
    expect(strikesAt(at(10, 45))).toEqual({ quarters: 3, hours: 0 });
  });
  it('strikes four and then the hour by the twelve-hour clock', () => {
    expect(strikesAt(at(15, 0))).toEqual({ quarters: 4, hours: 3 });
    expect(strikesAt(at(0, 0))).toEqual({ quarters: 4, hours: 12 });
    expect(strikesAt(at(12, 0))).toEqual({ quarters: 4, hours: 12 });
  });
  it('keeps the approved pace, with a pause before the hour', () => {
    const s = strokes(4, 3);
    expect(s.map((x) => x.hour)).toEqual([false, false, false, false, true, true, true]);
    expect(s[1].at - s[0].at).toBe(BELL.quarterGap);
    expect(s[4].at - s[3].at).toBeCloseTo(BELL.pause, 6);
    expect(s[6].at - s[5].at).toBeCloseTo(BELL.hourGap, 6);
    expect(strokes(2, 0)).toHaveLength(2);
  });
  it('knows when a new quarter begins', () => {
    const t = at(10, 30) - 1000; // 10:30:00
    expect(quarterOf(t)).toBe(quarterOf(t - 1) + 1);
    expect(sinceQuarter(t + 2500)).toBe(2500);
    expect(sinceQuarter(t + QUARTER_MS - 1)).toBe(QUARTER_MS - 1);
  });
});
