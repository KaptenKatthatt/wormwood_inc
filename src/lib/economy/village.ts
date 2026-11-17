/**
 * The village (game design, section 3 "Byggnaderna" and "Kostnadskurvan").
 * Eight buildings with ten levels each; Stugan's level is the ceiling for the
 * others. Three of them stand on land that is cleared when Stugan reaches
 * level 3, 5 and 7 (the village grows outward). One building is built at a
 * time. Cost and time follow the number of the build (the first two are free
 * and take 5 seconds), not the building.
 */
import { HOUR, MINUTE } from '../time/clock';

export type BuildingId = 'stugan' | 'sjoboden' | 'kasernen' | 'vakttornet' | 'kapellet' | 'kvarnen' | 'smedjan' | 'marknaden' | 'tornet_o' | 'tornet_s' | 'tornet_v';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  effect: string;
  /** Stugan's level that clears the land for it (0: from the start). */
  unlock: number;
  /** Short label in the village picture. */
  short?: string;
}

/**
 * Four watchtowers, one on each side of the gathered village (Jonas,
 * 2026-11-17). An attack comes from one side: that tower counts in full, the
 * others at half. Tower 1 (north) is there from the start, the rest come with
 * Stugan level 2, 4 and 6.
 */
export const TOWERS: BuildingId[] = ['vakttornet', 'tornet_o', 'tornet_s', 'tornet_v'];
export const SIDES = ['norr', 'öster', 'söder', 'väster'] as const;

export const MAX_LEVEL = 10;

export const BUILDINGS: BuildingDef[] = [
  { id: 'stugan', name: 'Stugan', unlock: 0, effect: 'Huvudbyggnaden. Dess nivå är taket för de andra, och nivå 3, 5 och 7 röjer ny mark.' },
  { id: 'sjoboden', name: 'Sjöboden', unlock: 0, effect: '+10 % guld per klarad utmaning för varje nivå.' },
  { id: 'kasernen', name: 'Kasernen', unlock: 0, effect: 'Här tränas soldater när byn anfalls.' },
  { id: 'vakttornet', name: 'Vakttornet i norr', short: 'Torn N', unlock: 0, effect: '+30 i försvar mot anfall norrifrån för varje nivå, +15 från andra håll.' },
  { id: 'kapellet', name: 'Kapellet', unlock: 0, effect: 'Gör byborna gladare för varje nivå.' },
  { id: 'kvarnen', name: 'Kvarnen', unlock: 3, effect: '+1 drag i varje utmaning för varannan nivå.' },
  { id: 'smedjan', name: 'Smedjan', unlock: 5, effect: '+5 i försvar per soldat för varje nivå.' },
  { id: 'marknaden', name: 'Marknaden', unlock: 7, effect: 'Byggen kostar 5 % mindre för varje nivå.' },
  { id: 'tornet_o', name: 'Vakttornet i öster', short: 'Torn Ö', unlock: 2, effect: '+30 i försvar mot anfall österifrån för varje nivå, +15 från andra håll.' },
  { id: 'tornet_s', name: 'Vakttornet i söder', short: 'Torn S', unlock: 4, effect: '+30 i försvar mot anfall söderifrån för varje nivå, +15 från andra håll.' },
  { id: 'tornet_v', name: 'Vakttornet i väster', short: 'Torn V', unlock: 6, effect: '+30 i försvar mot anfall västerifrån för varje nivå, +15 från andra håll.' },
];

const COSTS = [0, 0, 150, 400, 900, 1600];
const TIMES = [5_000, 5_000, MINUTE, 5 * MINUTE, 30 * MINUTE, 2 * HOUR];

/**
 * Gold for build number n (1-based). After the table it grows by 300 a build,
 * so 80 builds (8 buildings, 10 levels) stay within a few hours of play.
 */
export function buildCost(n: number): number {
  if (n <= COSTS.length) return COSTS[n - 1];
  return 1600 + 300 * (n - COSTS.length);
}

/** The price with Marknaden's discount, rounded to 10. */
export function priceFor(n: number, v: VillageState): number {
  const discount = Math.min(0.5, 0.05 * (v.levels.marknaden ?? 0));
  return Math.round((buildCost(n) * (1 - discount)) / 10) * 10;
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
  levels: { stugan: 0, sjoboden: 0, kasernen: 0, vakttornet: 0, kapellet: 0, kvarnen: 0, smedjan: 0, marknaden: 0, tornet_o: 0, tornet_s: 0, tornet_v: 0 },
  builds: 0,
  construction: null,
};

/** Fills in buildings added after a village was saved. */
export function withAllBuildings(v: VillageState): VillageState {
  return { ...v, levels: { ...START_VILLAGE.levels, ...v.levels } };
}

/** Is the land for this building cleared yet? */
export function cleared(v: VillageState, id: BuildingId): boolean {
  return v.levels.stugan >= (BUILDINGS.find((b) => b.id === id)?.unlock ?? 0);
}

export type BuildBlock = 'busy' | 'locked' | 'max' | 'cap' | 'gold' | null;

/** Why a building cannot be built now, or null if it can. */
export function buildBlock(v: VillageState, id: BuildingId, gold: number): BuildBlock {
  if (!cleared(v, id)) return 'locked';
  if (v.levels[id] >= MAX_LEVEL) return 'max';
  if (v.construction) return 'busy';
  if (id !== 'stugan' && v.levels[id] + 1 > v.levels.stugan) return 'cap';
  if (gold < priceFor(v.builds + 1, v)) return 'gold';
  return null;
}

/** Extra moves per challenge from Kvarnen. */
export function millMoves(v: VillageState): number {
  return Math.floor((v.levels.kvarnen ?? 0) / 2);
}

/** Gems that buy the missing gold for a build: 10 gold per gem, rounded up (Jonas, 2026-11-17). */
export const GOLD_PER_GEM = 10;
export function topUpGems(missingGold: number): number {
  return Math.max(1, Math.ceil(missingGold / GOLD_PER_GEM));
}

export function goldMultiplier(v: VillageState): number {
  return 1 + 0.1 * v.levels.sjoboden;
}
