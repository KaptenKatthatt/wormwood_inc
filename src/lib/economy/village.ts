/**
 * The village (game design, section 3 "Byggnaderna" and "Kostnadskurvan").
 * Eight buildings with ten levels each; Stugan's level is the ceiling for the
 * others. Three of them stand on land that is cleared when Stugan reaches
 * level 3, 5 and 7 (the village grows outward). One building is built at a
 * time. Cost and time follow the number of the build (the first two are free
 * and take 5 seconds); each building also has its own price factor.
 */
import { HOUR, MINUTE } from '../time/clock';

export type BuildingId = 'stugan' | 'sjoboden' | 'kasernen' | 'vakttornet' | 'kapellet' | 'kvarnen' | 'smedjan' | 'marknaden' | 'tornet_o' | 'tornet_s' | 'tornet_v'
  | 'ladan' | 'skolan' | 'hamnen' | 'gastgiveriet';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  effect: string;
  /** Stugan's level that clears the land for it (0: from the start). */
  unlock: number;
  /** Short label in the village picture. */
  short?: string;
  /** The expansion's buildings: the land is cleared when the player reaches this world. */
  world?: number;
  /**
   * How dear this building is next to the others (Jonas, 2026-11-19: the
   * buildings do not all cost the same). The price is the build number's cost
   * times this; the main house and what earns gold cost more, towers and the
   * chapel less. The average over the first builds stays near 1, so the pace
   * of the start is unchanged.
   */
  price: number;
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
  { id: 'stugan', name: 'Stugan', price: 1.5, unlock: 0, effect: 'Huvudbyggnaden. Dess nivå är taket för de andra, och nivå 3, 5 och 7 röjer ny mark.' },
  { id: 'sjoboden', name: 'Sjöboden', price: 1.2, unlock: 0, effect: '+10 % guld per klarad utmaning för varje nivå.' },
  { id: 'kasernen', name: 'Kasernen', price: 1.0, unlock: 0, effect: 'Här tränas soldater när byn anfalls.' },
  { id: 'vakttornet', name: 'Vakttornet i norr', price: 0.8, short: 'Torn N', unlock: 0, effect: '+30 i försvar mot anfall norrifrån för varje nivå, +15 från andra håll.' },
  { id: 'kapellet', name: 'Kapellet', price: 0.7, unlock: 0, effect: 'Gör byborna gladare för varje nivå.' },
  { id: 'kvarnen', name: 'Kvarnen', price: 1.3, unlock: 3, effect: '+1 drag i varje utmaning för varannan nivå.' },
  { id: 'smedjan', name: 'Smedjan', price: 1.1, unlock: 5, effect: '+5 i försvar per soldat för varje nivå.' },
  { id: 'marknaden', name: 'Marknaden', price: 1.4, unlock: 7, effect: 'Byggen kostar 5 % mindre för varje nivå.' },
  { id: 'tornet_o', name: 'Vakttornet i öster', price: 0.8, short: 'Torn Ö', unlock: 2, effect: '+30 i försvar mot anfall österifrån för varje nivå, +15 från andra håll.' },
  { id: 'tornet_s', name: 'Vakttornet i söder', price: 0.8, short: 'Torn S', unlock: 4, effect: '+30 i försvar mot anfall söderifrån för varje nivå, +15 från andra håll.' },
  { id: 'tornet_v', name: 'Vakttornet i väster', price: 0.8, short: 'Torn V', unlock: 6, effect: '+30 i försvar mot anfall västerifrån för varje nivå, +15 från andra håll.' },
  // The expansion (Jonas, 2026-11-17: 12 buildings): one new plot for each new world.
  { id: 'ladan', name: 'Ladan', price: 0.9, unlock: 0, world: 2, effect: 'Förråden i byar du tagit över rymmer en timmes guld till för varje nivå.' },
  { id: 'skolan', name: 'Skolan', price: 1.1, unlock: 0, world: 3, effect: '+3 % chans till en kista efter varje klarad utmaning för varje nivå.' },
  { id: 'hamnen', name: 'Hamnen', price: 1.3, unlock: 0, world: 4, effect: '+10 % guld från erövrade byar för varje nivå.' },
  { id: 'gastgiveriet', name: 'Gästgiveriet', price: 1.2, short: 'Gästgiv.', unlock: 0, world: 5, effect: '+5 % guld per klarad utmaning för varje nivå.' },
];

/** The buildings without the expansion's four (the pilot's village). */
export const BASE_BUILDINGS: BuildingDef[] = BUILDINGS.filter((b) => !b.world);

/*
 * A more generous start (Jonas, 2026-11-18). With 150-250 gold a challenge,
 * builds 1-10 cost about what ten challenges pay, so the first real wall
 * (build 11 takes 15 minutes and the lives run out) comes near minute 20.
 */
const COSTS = [0, 0, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600];
const TIMES = [5_000, 5_000, 15_000, 20_000, 30_000, 40_000, 45_000, 50_000, 5 * MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE];

/** Gold for build number n (1-based). After the table it grows by 150 a build. */
export function buildCost(n: number): number {
  if (n <= COSTS.length) return COSTS[n - 1];
  return 600 + 150 * (n - COSTS.length);
}

/** The price of building `id` as build number n: its own factor and Marknaden's discount, rounded to 10. */
export function priceFor(n: number, v: VillageState, id?: BuildingId): number {
  const discount = Math.min(0.5, 0.05 * (v.levels.marknaden ?? 0));
  const factor = BUILDINGS.find((b) => b.id === id)?.price ?? 1;
  return Math.round((buildCost(n) * factor * (1 - discount)) / 10) * 10;
}

/** Game time for build number n (1-based). From build 13 it grows about quadratically from 1 to 2 hours. */
export function buildTime(n: number): number {
  if (n <= TIMES.length) return TIMES[n - 1];
  const k = Math.min(1, (n - 13) / 7);
  return Math.round((1 + k * k) * HOUR / MINUTE) * MINUTE;
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
  /** The highest world reached (clears the expansion's plots). */
  world?: number;
}

export const START_VILLAGE: VillageState = {
  levels: { stugan: 0, sjoboden: 0, kasernen: 0, vakttornet: 0, kapellet: 0, kvarnen: 0, smedjan: 0, marknaden: 0, tornet_o: 0, tornet_s: 0, tornet_v: 0, ladan: 0, skolan: 0, hamnen: 0, gastgiveriet: 0 },
  builds: 0,
  construction: null,
};

/** Fills in buildings added after a village was saved. */
export function withAllBuildings(v: VillageState): VillageState {
  return { ...v, levels: { ...START_VILLAGE.levels, ...v.levels } };
}

/** Is the land for this building cleared yet? */
export function cleared(v: VillageState, id: BuildingId): boolean {
  const b = BUILDINGS.find((x) => x.id === id);
  if (b?.world && (v.world ?? 1) < b.world) return false;
  return v.levels.stugan >= (b?.unlock ?? 0);
}

export type BuildBlock = 'busy' | 'locked' | 'max' | 'cap' | 'gold' | null;

/** Why a building cannot be built now, or null if it can. */
export function buildBlock(v: VillageState, id: BuildingId, gold: number): BuildBlock {
  if (!cleared(v, id)) return 'locked';
  if (v.levels[id] >= MAX_LEVEL) return 'max';
  if (v.construction) return 'busy';
  if (id !== 'stugan' && v.levels[id] + 1 > v.levels.stugan) return 'cap';
  if (gold < priceFor(v.builds + 1, v, id)) return 'gold';
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
  return 1 + 0.1 * v.levels.sjoboden + 0.05 * (v.levels.gastgiveriet ?? 0);
}
