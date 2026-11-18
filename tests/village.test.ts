import { describe, expect, it } from 'vitest';
import { HOUR, MINUTE } from '../src/lib/time/clock';
import { START_VILLAGE, buildBlock, buildCost, buildTime, goldMultiplier, skipGems } from '../src/lib/economy/village';

describe('village', () => {
  it('follows the cost curve from the design', () => {
    expect([1, 2].map(buildCost)).toEqual([0, 0]);
    expect(buildCost(13)).toBeGreaterThan(buildCost(12));
    expect([1, 2].map(buildTime)).toEqual([5000, 5000]);
    for (const n of [3, 4, 5, 6, 7, 8]) expect(buildTime(n)).toBeLessThan(MINUTE);
    expect([9, 10, 11, 12].map(buildTime)).toEqual([5 * MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE]);
    expect(buildTime(13)).toBe(HOUR);
    expect(buildTime(20)).toBe(2 * HOUR);
    expect(buildTime(40)).toBe(2 * HOUR);
    // builds 1-10 cost about what ten challenges pay (150-250 each)
    const firstTen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(buildCost).reduce((a, b) => a + b, 0);
    expect(firstTen).toBeGreaterThan(1500);
    expect(firstTen).toBeLessThan(2500);
  });

  it('caps other buildings at the level of Stugan and builds one at a time', () => {
    expect(buildBlock(START_VILLAGE, 'sjoboden', 0)).toBe('cap');
    expect(buildBlock(START_VILLAGE, 'stugan', 0)).toBeNull();
    const v = { ...START_VILLAGE, levels: { ...START_VILLAGE.levels, stugan: 1 }, builds: 2 };
    expect(buildBlock(v, 'sjoboden', 90)).toBe('gold');
    expect(buildBlock(v, 'sjoboden', 100)).toBeNull();
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

import { cleared, millMoves, priceFor, withAllBuildings } from '../src/lib/economy/village';
describe('the growing village', () => {
  it('clears land for new buildings as Stugan grows and stops at level 10', () => {
    const v = { ...START_VILLAGE, levels: { ...START_VILLAGE.levels, stugan: 2 } };
    expect(cleared(v, 'kvarnen')).toBe(false);
    expect(buildBlock(v, 'kvarnen', 9999)).toBe('locked');
    const v3 = { ...v, levels: { ...v.levels, stugan: 3 } };
    expect(cleared(v3, 'kvarnen')).toBe(true);
    expect(cleared(v3, 'smedjan')).toBe(false);
    expect(buildBlock({ ...v3, levels: { ...v3.levels, stugan: 10 } }, 'stugan', 1e9)).toBe('max');
  });
  it('Marknaden lowers prices and Kvarnen gives moves', () => {
    const v = { ...START_VILLAGE, levels: { ...START_VILLAGE.levels, marknaden: 2, kvarnen: 3 } };
    expect(priceFor(10, v)).toBe(Math.round((buildCost(10) * 0.9) / 10) * 10);
    expect(millMoves(v)).toBe(1);
  });
  it('fills in buildings missing from an old save', () => {
    const old = { levels: { stugan: 2, sjoboden: 1, kasernen: 0, vakttornet: 0, kapellet: 0 }, builds: 3, construction: null } as never;
    expect(withAllBuildings(old).levels.marknaden).toBe(0);
  });
});
