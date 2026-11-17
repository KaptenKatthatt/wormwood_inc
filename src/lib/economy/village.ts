/**
 * The village (game design, section 3 "Byggnaderna" and "Kostnadskurvan").
 * Five buildings with levels; Stugan's level is the ceiling for the others.
 * One building is built at a time. Cost and time follow the number of the
 * build (the first two are free and take 5 seconds), not the building.
 */
import { HOUR, MINUTE } from '../time/clock';

export type BuildingId = 'stugan' | 'sjoboden' | 'kasernen' | 'vakttornet' | 'kapellet';

export interface BuildingDef { id: BuildingId; name: string; effect: string }

export const BUILDINGS: BuildingDef[] = [
  { id: 'stugan', name: 'Stugan', effect: 'Huvudbyggnaden. Dess nivå är taket för de andra.' },
  { id: 'sjoboden', name: 'Sjöboden', effect: '+10 % guld per vunnen bana för varje nivå.' },
  { id: 'kasernen', name: 'Kasernen', effect: 'Tränar soldater (kommer snart).' },
  { id: 'vakttornet', name: 'Vakttornet', effect: 'Försvarar byn vid anfall (kommer snart).' },
  { id: 'kapellet', name: 'Kapellet', effect: 'Bybornas humör (kommer snart).' },
];

const COSTS = [0, 0, 150, 400, 900, 1600];
const TIMES = [5_000, 5_000, MINUTE, 5 * MINUTE, 30 * MINUTE, 2 * HOUR];

/** Gold for build number n (1-based). Grows roughly with the square of n. */
export function buildCost(n: number): number {
  if (n <= COSTS.length) return COSTS[n - 1];
  return Math.round((1600 * (n / 6) ** 2) / 50) * 50;
}

/** Game time for build number n (1-based). After the table: 4 h, 8 h, then 12 h. */
export function buildTime(n: number): number {
  if (n <= TIMES.length) return TIMES[n - 1];
  return Math.min(12 * HOUR, 2 * HOUR * 2 ** (n - TIMES.length));
}

/** Gems to finish a build now: 1 per started game minute, at least 5. */
export function skipGems(remainingMs: number): number {
  if (remainingMs <= 0) return 0;
  return Math.max(5, Math.ceil(remainingMs / MINUTE));
}

export interface Construction { id: BuildingId; toLevel: number; timerId: string }

export interface VillageState {
  levels: Record<BuildingId, number>;
  /** Builds started so far (sets the price of the next one). */
  builds: number;
  construction: Construction | null;
}

export const START_VILLAGE: VillageState = {
  levels: { stugan: 0, sjoboden: 0, kasernen: 0, vakttornet: 0, kapellet: 0 },
  builds: 0,
  construction: null,
};

export type BuildBlock = 'busy' | 'cap' | 'gold' | null;

/** Why a building cannot be built now, or null if it can. */
export function buildBlock(v: VillageState, id: BuildingId, gold: number): BuildBlock {
  if (v.construction) return 'busy';
  if (id !== 'stugan' && v.levels[id] + 1 > v.levels.stugan) return 'cap';
  if (gold < buildCost(v.builds + 1)) return 'gold';
  return null;
}

export function goldMultiplier(v: VillageState): number {
  return 1 + 0.1 * v.levels.sjoboden;
}
