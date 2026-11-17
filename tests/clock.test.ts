import { describe, expect, it } from 'vitest';
import { FAST_SPEED, GameClock, MINUTE, createClockState, formatDuration, gameTimeAt, realMsUntil, withSpeed } from '../src/lib/time/clock';

describe('clock', () => {
  it('runs with the wall clock at speed 1, also across a closed app', () => {
    const s = createClockState(1_000);
    expect(gameTimeAt(s, 1_000 + 5 * MINUTE)).toBe(1_000 + 5 * MINUTE);
  });

  it('fast mode turns 30 minutes into 2', () => {
    const s = withSpeed(createClockState(0), FAST_SPEED, 0);
    expect(gameTimeAt(s, 2 * MINUTE)).toBe(30 * MINUTE);
    expect(realMsUntil(s, 30 * MINUTE, 0)).toBe(2 * MINUTE);
  });

  it('changing speed does not make game time jump', () => {
    let s = createClockState(0);
    s = withSpeed(s, FAST_SPEED, 10 * MINUTE);
    expect(gameTimeAt(s, 10 * MINUTE)).toBe(10 * MINUTE);
    s = withSpeed(s, 1, 12 * MINUTE); // 2 real min at x15 = 30 game min
    expect(gameTimeAt(s, 12 * MINUTE)).toBe(40 * MINUTE);
  });

  it('never runs backwards when the device clock is turned back', () => {
    let real = 100 * MINUTE;
    const c = new GameClock(createClockState(0), () => real);
    const before = c.now();
    real = 50 * MINUTE;
    expect(c.now()).toBe(before);
  });

  it('persists through save', () => {
    let saved = null as unknown;
    const c = new GameClock(null, () => 0, (s) => (saved = s));
    c.setSpeed(FAST_SPEED);
    expect((saved as { speed: number }).speed).toBe(FAST_SPEED);
  });

  it('formats durations in Swedish', () => {
    expect(formatDuration(65 * MINUTE)).toBe('1 h 05 min');
    expect(formatDuration(4 * MINUTE + 9_000)).toBe('4 min 09 s');
    expect(formatDuration(1)).toBe('1 s');
  });
});
