/**
 * Steps 8 and 9 (pure logic): attacking and taking over made-up neighbouring
 * villages, soldier types that make the old ones weak (power creep), hired
 * troops for gems (pay to win), loyalty tiers (VIP), offers picked from what
 * the player bought before, and neighbours who must be recruited and kept
 * happy (step 9). The villages and people are all made up and run by the game.
 */
import { HOUR, MINUTE } from '../time/clock';
import type { Rng } from '../match3/rng';

// ------------------------------------------------------------------ neighbouring villages

export interface Neighbour { id: string; name: string; world: number; defence: number; goldPerHour: number }

const NAMES = [
  ['Rapsby', 'Kvarnhem', 'Alléstad'],
  ['Hyttbo', 'Gruvberg', 'Masugnsby'],
  ['Klippvik', 'Fiskeläget', 'Branthamn'],
  ['Snöby', 'Ljusåker', 'Marknadsvik'],
];

/** Three villages per world 2-5; each a little stronger and richer than the last. */
export const NEIGHBOURS: Neighbour[] = NAMES.flatMap((names, w) =>
  names.map((name, j) => {
    const i = w * 3 + j;
    return { id: `n${i + 1}`, name, world: w + 2, defence: 60 + 45 * i, goldPerHour: 40 + 15 * i };
  }),
);

/** The villages the player can see: those of the worlds reached, at least world 2's. */
export function visibleNeighbours(world: number): Neighbour[] {
  return NEIGHBOURS.filter((n) => n.world <= Math.max(2, world));
}

// ------------------------------------------------------------------ the army

export type TroopType = 'bonde' | 'knekt' | 'ryttare';
export interface TroopDef { id: TroopType; name: string; plural: string; power: number; gold: number }

/** Each new type makes the neighbours stronger, so the old soldiers count for less (power creep). */
export const TROOPS: TroopDef[] = [
  { id: 'bonde', name: 'Bondesoldat', plural: 'bondesoldater', power: 10, gold: 50 },
  { id: 'knekt', name: 'Knekt', plural: 'knektar', power: 20, gold: 120 },
  { id: 'ryttare', name: 'Ryttare', plural: 'ryttare', power: 35, gold: 250 },
];
/** How much stronger the neighbours get with each soldier type out (1, 2 or 3 types). */
export const ERA_FACTOR = [1, 1, 1.6, 2.4];
/** Riders come two days after the knights. */
export const RIDERS_AFTER = 48 * HOUR;

export type Army = Record<TroopType, number>;

export function armyPower(army: Army, extra = 0): number {
  return TROOPS.reduce((s, t) => s + (army[t.id] ?? 0) * t.power, 0) + extra;
}

export function neighbourDefence(n: Neighbour, eras: number): number {
  return Math.round(n.defence * ERA_FACTOR[Math.max(1, Math.min(3, eras))]);
}

/** Scouting gives a range, not the number. */
export function scout(def: number): [number, number] {
  return [Math.round((def * 0.8) / 10) * 10, Math.round((def * 1.2) / 10) * 10];
}

/** Hired troops (pay to win): for one battle only. */
export const MERCENARIES = { count: 10, power: 25, gems: 40 };

export interface BattleResult { won: boolean; attack: number; defence: number; lost: Army }

/** The battle: the attack against the defence times a little luck. Losers lose more men. */
export function battle(army: Army, extra: number, def: number, rng: Rng): BattleResult {
  const attack = armyPower(army, extra);
  const won = attack >= def * (0.9 + rng() * 0.2);
  const share = won ? 0.25 : 0.6;
  const lost = { bonde: Math.ceil((army.bonde ?? 0) * share), knekt: Math.ceil((army.knekt ?? 0) * share), ryttare: Math.ceil((army.ryttare ?? 0) * share) };
  return { won, attack, defence: def, lost };
}

// ------------------------------------------------------------------ owned villages

/** Gold waits in the village's storehouse this long; after that it rots (playing by appointment). */
export const KEEP_HOURS = 8;

export interface Owned { id: string; since: number; lastCollect: number }

/** Gold waiting in a village, and gold that has already rotted. */
export function storehouse(n: Neighbour, o: Owned, now: number, keepHours: number, bonus = 0): { ready: number; rotted: number } {
  const rate = n.goldPerHour * (1 + bonus);
  const hours = Math.max(0, (now - o.lastCollect) / HOUR);
  const made = rate * hours;
  const cap = rate * keepHours;
  return { ready: Math.floor(Math.min(made, cap)), rotted: Math.floor(Math.max(0, made - cap)) };
}

/** Away this long, the neighbours may take a village back. */
export const RETAKE_AFTER = 12 * HOUR;
export const RETAKE_CHANCE = 0.25;

// ------------------------------------------------------------------ loyalty (VIP) and offers

export const VIP_TIERS = [
  { name: 'Brons', kronor: 20, bonus: 0.05 },
  { name: 'Silver', kronor: 49, bonus: 0.1 },
  { name: 'Guld', kronor: 99, bonus: 0.2 },
];

export function vipTier(spent: number): number {
  let t = 0;
  VIP_TIERS.forEach((v, i) => { if (spent >= v.kronor) t = i + 1; });
  return t;
}

export function vipBonus(spent: number): number {
  const t = vipTier(spent);
  return t ? VIP_TIERS[t - 1].bonus : 0;
}

export interface PersonalOffer { variant: 'first' | 'upsell' | 'big'; gems: number; kronor: number; text: string }

/** Picked from what the player has bought before (personalised offer). */
export function personalOffer(spent: number): PersonalOffer {
  if (spent <= 0) return { variant: 'first', gems: 150, kronor: 20, text: 'Ditt första köp: dubbelt så många ädelstenar som vanligt.' };
  if (spent < 99) return { variant: 'upsell', gems: 450, kronor: 49, text: 'Bara för dig som redan handlat: 50 % extra.' };
  return { variant: 'big', gems: 1100, kronor: 99, text: 'Tack för att du är en trogen kund. Vårt största paket, bara i dag.' };
}

// ------------------------------------------------------------------ step 9: neighbours who help

/** Made-up villagers next door who can be "invited". */
export const HELPERS = ['Karin', 'Erik', 'Lisa', 'Nils', 'Maja', 'Per', 'Anna', 'Lars'];
export const HELPERS_NEEDED = 3;
export const HELPER_MAX = 5;
export const HELPER_ARRIVES = 30 * MINUTE;
/** A helper who gets no gift back for a day moves away. */
export const HELPER_PATIENCE = 24 * HOUR;
export const HELPER_GOLD_BONUS = 0.05;
export const GATE_SKIP_GEMS = 100;
/** The first challenge of the Winter market: it opens with three helpers (or gems). */
export const GATE_AT = 161;
/**
 * The winter market, the fifth world, stays closed until 1 December (Jonas,
 * 2026-11-20), whatever else would open it.
 */
export const WINTER_OPENS = { year: 2026, month: 12, day: 1 };
export function winterOpenAt(ms: number): boolean {
  return ms >= new Date(WINTER_OPENS.year, WINTER_OPENS.month - 1, WINTER_OPENS.day).getTime();
}

export interface Helper { name: string; arrivesAt: number; lastThanked: number }

export function activeHelpers(list: Helper[], now: number): Helper[] {
  return list.filter((h) => h.arrivesAt <= now && now - Math.max(h.arrivesAt, h.lastThanked) < HELPER_PATIENCE);
}

/** Made-up "friend" events (impersonation): gifts and beaten records. */
export function fakeFriendEvent(rng: Rng, challenge: number): { name: string; text: string; lives: number } {
  const name = HELPERS[Math.floor(rng() * HELPERS.length)];
  if (rng() < 0.5) return { name, text: `${name} skickade dig ett liv!`, lives: 1 };
  const n = Math.max(1, challenge - 1 - Math.floor(rng() * 3));
  return { name, text: `${name} slog ditt rekord på utmaning ${n}.`, lives: 0 };
}
