import { describe, expect, it } from 'vitest';
import { attackStrength, defence, nextStep, resolveAttack } from '../src/lib/staircase';
import { LETTERS } from '../src/lib/voices';

describe('hook staircase', () => {
  it('climbs on events', () => {
    expect(nextStep(1, 1)).toBe(1);
    expect(nextStep(1, 1, 'loss')).toBe(2);
    expect(nextStep(2, 4, 'longBuild')).toBe(3);
    expect(nextStep(3, 8, 'loss')).toBe(3);
    expect(nextStep(3, 9.5, 'loss')).toBe(4);
    expect(nextStep(2, 4, 'quit')).toBe(5);
  });
  it('uses the clock as a fallback and never goes down', () => {
    expect(nextStep(1, 3)).toBe(2);
    expect(nextStep(1, 12)).toBe(5);
    expect(nextStep(4, 0)).toBe(4);
  });
  it('makes the attack a little too strong, beatable with two soldiers or a shield', () => {
    const d = defence(1, 1);
    const s = attackStrength(d);
    expect(resolveAttack(s, d, false)).toBe('lost');
    expect(resolveAttack(s, defence(3, 1), false)).toBe('defended');
    expect(resolveAttack(s, d, true)).toBe('shielded');
  });
  it('letters are short', () => {
    for (const t of Object.values(LETTERS)) expect(t.split(/[.!?]\s/).length).toBeLessThanOrEqual(2);
  });
});
