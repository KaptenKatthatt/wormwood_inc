import { describe, expect, it } from 'vitest';
import { MINUTE } from '../src/lib/time/clock';
import { createLives, fullAt, nextLifeIn, settleLives, spendLife } from '../src/lib/time/lives';

describe('lives', () => {
  it('starts full and spending one starts the refill', () => {
    const l = spendLife(createLives(0), 0)!;
    expect(l.count).toBe(4);
    expect(nextLifeIn(l, 0)).toBe(30 * MINUTE);
  });

  it('refills while the game is closed and keeps the remainder', () => {
    let l = createLives(0);
    for (let i = 0; i < 5; i++) l = spendLife(l, 0)!;
    expect(spendLife(l, 0)).toBeNull();
    const later = settleLives(l, 70 * MINUTE);
    expect(later.count).toBe(2);
    expect(nextLifeIn(later, 70 * MINUTE)).toBe(20 * MINUTE);
    expect(fullAt(l, 0)).toBe(150 * MINUTE);
  });

  it('never goes above max', () => {
    const l = spendLife(createLives(0), 0)!;
    expect(settleLives(l, 1000 * MINUTE).count).toBe(5);
    expect(nextLifeIn(l, 1000 * MINUTE)).toBeNull();
  });
});
