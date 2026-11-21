import { describe, expect, it } from 'vitest';
import { levelAt, obstaclesIn } from '../src/lib/match3/levels';

/** The tip about an obstacle shows on the first three boards that have it (Jonas, 2026-11-21). */
describe('obstacles on a board', () => {
  it('names the obstacle a challenge introduces first', () => {
    expect(obstaclesIn(levelAt(5))[0]).toBe('is');
    expect(obstaclesIn(levelAt(10))[0]).toBe('tang');
    expect(obstaclesIn(levelAt(30))[0]).toBe('sno');
  });

  it('finds the net again on later boards of the skerries', () => {
    const later = [6, 7, 8, 9, 11, 12, 13].filter((n) => obstaclesIn(levelAt(n)).includes('is'));
    expect(later.length).toBeGreaterThan(0);
  });

  it('names each world’s own cover', () => {
    const covers = new Set([41, 42, 43, 44, 45].flatMap((n) => obstaclesIn(levelAt(n))));
    expect(covers.has('lera')).toBe(true);
    expect(covers.has('is')).toBe(false);
  });

  it('is empty on a board with no obstacles', () => {
    expect(obstaclesIn(levelAt(1))).toEqual([]);
  });
});
