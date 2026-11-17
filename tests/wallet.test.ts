import { describe, expect, it } from 'vitest';
import { MINUTE } from '../src/lib/time/clock';
import { START_WALLET, pay, skipPrice, topUp } from '../src/lib/economy/wallet';

describe('test wallet', () => {
  it('prices skipping by remaining time', () => {
    expect(skipPrice(0)).toBe(0);
    expect(skipPrice(1000)).toBe(1);
    expect(skipPrice(30 * MINUTE)).toBe(6);
    expect(skipPrice(31 * MINUTE)).toBe(7);
  });
  it('pays and refuses when short', () => {
    expect(pay(START_WALLET, 30)).toEqual({ kronor: 70, spent: 30 });
    expect(pay({ kronor: 5, spent: 0 }, 6)).toBeNull();
    expect(topUp(START_WALLET, 50).kronor).toBe(150);
  });
});
