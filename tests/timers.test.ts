import { describe, expect, it } from 'vitest';
import { MINUTE } from '../src/lib/time/clock';
import { collectDue, finishNow, progress, remaining, startTimer } from '../src/lib/time/timers';

describe('timers', () => {
  it('counts down and reports done once', () => {
    const t = startTimer('a', 'build', 'Sjöbod', 0, 30 * MINUTE);
    expect(remaining(t, 10 * MINUTE)).toBe(20 * MINUTE);
    expect(progress(t, 15 * MINUTE)).toBe(0.5);
    const first = collectDue([t], 31 * MINUTE);
    expect(first.due).toHaveLength(1);
    expect(collectDue(first.timers, 32 * MINUTE).due).toHaveLength(0);
  });

  it('can be bought away', () => {
    const t = startTimer('a', 'build', 'Sjöbod', 0, 30 * MINUTE);
    const [done] = finishNow([t], 'a', 5 * MINUTE);
    expect(remaining(done, 5 * MINUTE)).toBe(0);
  });
});
