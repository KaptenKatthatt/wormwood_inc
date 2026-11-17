import { describe, expect, it } from 'vitest';
import { HOUR, MINUTE } from '../src/lib/time/clock';
import { START_VILLAGE, buildBlock, buildCost, buildTime, goldMultiplier, skipGems } from '../src/lib/economy/village';

describe('village', () => {
  it('follows the cost curve from the design', () => {
    expect([1, 2, 3, 4, 5, 6].map(buildCost)).toEqual([0, 0, 150, 400, 900, 1600]);
    expect(buildCost(7)).toBeGreaterThan(1600);
    expect([1, 2, 3, 4, 5, 6].map(buildTime)).toEqual([5000, 5000, MINUTE, 5 * MINUTE, 30 * MINUTE, 2 * HOUR]);
    expect(buildTime(20)).toBe(12 * HOUR);
  });

  it('caps other buildings at the level of Stugan and builds one at a time', () => {
    expect(buildBlock(START_VILLAGE, 'sjoboden', 0)).toBe('cap');
    expect(buildBlock(START_VILLAGE, 'stugan', 0)).toBeNull();
    const v = { ...START_VILLAGE, levels: { ...START_VILLAGE.levels, stugan: 1 }, builds: 2 };
    expect(buildBlock(v, 'sjoboden', 100)).toBe('gold');
    expect(buildBlock(v, 'sjoboden', 150)).toBeNull();
    expect(buildBlock({ ...v, construction: { id: 'stugan', toLevel: 2, timerId: 'x' } }, 'sjoboden', 999)).toBe('busy');
  });

  it('prices skipping at a gem per minute, at least 5', () => {
    expect(skipGems(0)).toBe(0);
    expect(skipGems(10_000)).toBe(5);
    expect(skipGems(30 * MINUTE)).toBe(30);
  });

  it('Sjöboden adds 10 % gold per level', () => {
    expect(goldMultiplier({ ...START_VILLAGE, levels: { ...START_VILLAGE.levels, sjoboden: 2 } })).toBeCloseTo(1.2);
  });
});

import { topUpGems } from '../src/lib/economy/village';
describe('topUpGems', () => {
  it('charges one gem per 10 gold, rounded up', () => {
    expect(topUpGems(150)).toBe(15);
    expect(topUpGems(151)).toBe(16);
    expect(topUpGems(3)).toBe(1);
  });
});
