/**
 * Buildings damaged by a lost attack (Jonas, 2026-11-19, alternative B).
 * A damaged building gives half its bonus and cannot be upgraded until it is
 * repaired. The player starts the repair: gold for a fifth of the building's
 * last upgrade, and a quarter of that upgrade's time (at least two minutes),
 * which gems can buy away like a build. Pure logic.
 */
import { MINUTE } from './time/clock';
import { TOWERS, type BuildingId, type VillageState } from './economy/village';
import ART from '../game/villageArt.json';

/** `timerId` is set while the repair runs. */
export interface Damage { id: BuildingId; timerId?: string }

export const REPAIR_GOLD_SHARE = 0.2;
export const REPAIR_TIME_SHARE = 0.25;
export const REPAIR_MIN_MS = 2 * MINUTE;
/** The villagers' mood drops this much for each damaged building until it is repaired. */
export const DAMAGE_MOOD = 5;

/** How many buildings a lost attack damages: the weaker the defence, the more. */
export function damageCount(defence: number, strength: number): 1 | 2 | 3 {
  const share = strength > 0 ? defence / strength : 1;
  return share >= 0.75 ? 1 : share >= 0.5 ? 2 : 3;
}

const ANCHORS = (ART.buildings as unknown as Record<string, { anchor: [number, number] }>);
const CENTRE: [number, number] = [ART.background.w / 2, 740];

/** How far a building stands from the side the attack came from (0 north, 1 east, 2 south, 3 west); less is nearer. */
function distance(id: BuildingId, side: number): number {
  const [x, y] = ANCHORS[id]?.anchor ?? CENTRE;
  return [y, -x, -y, x][side] ?? y;
}

/**
 * The buildings in the order an attack from `side` damages them: that side's
 * tower first, then the ones nearest that side, Stugan last.
 */
export function damageOrder(side: number, built: BuildingId[]): BuildingId[] {
  const tower = TOWERS[side];
  const rank = (id: BuildingId) => (id === tower ? 0 : id === 'stugan' ? 2 : 1);
  return [...built].sort((a, b) => rank(a) - rank(b) || distance(a, side) - distance(b, side));
}

/** The buildings a lost attack damages now: built, not already damaged, in order. */
export function pickDamaged(v: VillageState, already: Damage[], side: number, defence: number, strength: number): BuildingId[] {
  const hit = new Set(already.map((d) => d.id));
  const built = (Object.keys(v.levels) as BuildingId[]).filter((id) => v.levels[id] > 0 && !hit.has(id));
  return damageOrder(side, built).slice(0, damageCount(defence, strength));
}

/** Gold to repair, from the gold of the building's last upgrade; rounded to 10. */
export function repairGold(lastGold: number): number {
  return Math.round((lastGold * REPAIR_GOLD_SHARE) / 10) * 10;
}

export function repairTime(lastMs: number): number {
  return Math.max(REPAIR_MIN_MS, Math.round(lastMs * REPAIR_TIME_SHARE));
}

/** The village as its bonuses count it: a damaged building at half its level. */
export function withDamage(v: VillageState, damaged: Damage[]): VillageState {
  if (damaged.length === 0) return v;
  const levels = { ...v.levels };
  for (const d of damaged) levels[d.id] = levels[d.id] / 2;
  return { ...v, levels };
}
