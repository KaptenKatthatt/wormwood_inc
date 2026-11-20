import { describe, expect, it } from 'vitest';
import { winterOpenAt } from '../src/lib/expansion/conquest';

describe('the winter market', () => {
  it('stays closed until 1 December', () => {
    expect(winterOpenAt(new Date(2026, 10, 20, 12).getTime())).toBe(false);
    expect(winterOpenAt(new Date(2026, 10, 30, 23, 59).getTime())).toBe(false);
    expect(winterOpenAt(new Date(2026, 11, 1, 0, 0).getTime())).toBe(true);
    expect(winterOpenAt(new Date(2027, 0, 10).getTime())).toBe(true);
  });
});
