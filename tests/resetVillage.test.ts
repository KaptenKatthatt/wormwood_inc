import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { purse, resetVillage, stairs, timers, village } from '../src/lib/state/game';

/** The dev menu's "Nollställ byn" takes the village back to its start and leaves the rest (Jonas, 2026-11-21). */
describe('resetting the village', () => {
  it('sets every building to level 0, stops the build and the repairs, and keeps gold and the world', () => {
    timers.set([
      { id: 'b', kind: 'build', label: 'bygge', endsAt: 9e15 } as never,
      { id: 'r', kind: 'other', label: 'lagning', endsAt: 9e15 } as never,
      { id: 'x', kind: 'other', label: 'annat', endsAt: 9e15 } as never,
    ]);
    const v = get(village);
    village.set({ ...v, levels: { ...v.levels, stugan: 4, kapellet: 2 }, builds: 7, world: 3, construction: { id: 'sjoboden', toLevel: 1, timerId: 'b' } });
    stairs.update((s) => ({ ...s, damaged: [{ id: 'kapellet', timerId: 'r' } as never] }));
    purse.update((p) => ({ ...p, gold: 1234 }));

    resetVillage();

    const after = get(village);
    expect(Object.values(after.levels).every((n) => n === 0)).toBe(true);
    expect(after.construction).toBeNull();
    expect(after.world).toBe(3);
    expect(after.builds).toBeLessThan(7);
    expect(get(stairs).damaged).toEqual([]);
    expect(get(timers).map((t) => t.id)).toEqual(['x']);
    expect(get(purse).gold).toBe(1234);
  });
});
