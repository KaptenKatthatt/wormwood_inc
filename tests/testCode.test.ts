import { describe, expect, it } from 'vitest';
import { testCode } from '../src/lib/testCode';

describe('testCode', () => {
  it('is six readable characters and stable for one id', () => {
    const c = testCode('abc123');
    expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(testCode('abc123')).toBe(c);
  });
  it('differs between ids', () => {
    const codes = new Set(Array.from({ length: 200 }, (_, i) => testCode(`player-${i}`)));
    expect(codes.size).toBe(200);
  });
});
