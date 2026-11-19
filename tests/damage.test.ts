import { describe, expect, it } from 'vitest';
import { damageCount, damageOrder, pickDamaged, repairGold, repairTime, withDamage } from '../src/lib/damage';
import { START_VILLAGE, goldMultiplier, type BuildingId } from '../src/lib/economy/village';
import { MINUTE } from '../src/lib/time/clock';

const village = (levels: Partial<Record<BuildingId, number>>) => ({ ...START_VILLAGE, levels: { ...START_VILLAGE.levels, ...levels } });

describe('buildings damaged by a lost attack (alternative B)', () => {
  it('damages one, two or three buildings by how weak the defence was', () => {
    expect(damageCount(75, 100)).toBe(1);
    expect(damageCount(74, 100)).toBe(2);
    expect(damageCount(50, 100)).toBe(2);
    expect(damageCount(49, 100)).toBe(3);
    expect(damageCount(0, 40)).toBe(3);
  });

  it("starts with the tower on the attack's side and ends with Stugan", () => {
    const built: BuildingId[] = ['stugan', 'sjoboden', 'kvarnen', 'vakttornet', 'tornet_s'];
    const north = damageOrder(0, built);
    expect(north[0]).toBe('vakttornet');
    expect(north[1]).toBe('kvarnen'); // the mill stands in the north
    expect(north.at(-1)).toBe('stugan');
    const south = damageOrder(2, built);
    expect(south[0]).toBe('tornet_s');
    expect(south.at(-1)).toBe('stugan');
  });

  it('skips buildings that are not built or already damaged', () => {
    const v = village({ stugan: 2, sjoboden: 1, vakttornet: 1 });
    expect(pickDamaged(v, [], 0, 0, 40)).toEqual(['vakttornet', 'sjoboden', 'stugan']);
    expect(pickDamaged(v, [{ id: 'vakttornet' }], 0, 80, 100)).toEqual(['sjoboden']);
    expect(pickDamaged(village({}), [], 0, 0, 40)).toEqual([]);
  });

  it('prices the repair from the last upgrade: a fifth of the gold, a quarter of the time, at least two minutes', () => {
    expect(repairGold(450)).toBe(90);
    expect(repairGold(0)).toBe(0);
    expect(repairTime(30 * MINUTE)).toBe(7.5 * MINUTE);
    expect(repairTime(5000)).toBe(2 * MINUTE);
  });

  it('gives half the bonus while a building is damaged', () => {
    const v = village({ sjoboden: 4 });
    expect(goldMultiplier(v)).toBeCloseTo(1.4);
    expect(goldMultiplier(withDamage(v, [{ id: 'sjoboden' }]))).toBeCloseTo(1.2);
    expect(withDamage(v, [])).toBe(v);
  });
});
