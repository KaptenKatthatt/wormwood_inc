import { describe, expect, it } from 'vitest';
import { countAt, pieces } from '../src/lib/ui/flyReward';

describe('the standard reward animation', () => {
  it('flies a stream of pieces, never a swarm', () => {
    expect(pieces('gold', 0)).toBe(0);
    expect(pieces('gold', 50)).toBe(6);
    expect(pieces('gold', 500)).toBe(13);
    expect(pieces('gold', 5000)).toBe(14);
    expect(pieces('gems', 5)).toBe(6);
    expect(pieces('gems', 100)).toBe(14);
    expect(pieces('lives', 1)).toBe(1);
    expect(pieces('lives', 9)).toBe(5);
  });

  it('counts up to exactly the new amount as the pieces land', () => {
    expect(countAt(100, 150, 0, 6)).toBe(100);
    expect(countAt(100, 150, 3, 6)).toBe(125);
    expect(countAt(100, 150, 6, 6)).toBe(150);
    expect(countAt(100, 150, 0, 0)).toBe(150);
  });
});
