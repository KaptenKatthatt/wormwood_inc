/**
 * Step 7, chance (pure logic): chests with random contents, the wheel of
 * fortune and drawing champions with a pity counter. Everything is paid in
 * gems, which are bought with the pretend kronor of the test wallet.
 */
import { HOUR } from '../time/clock';
import { pick, type Rng } from '../match3/rng';
import { drawSticker } from './social';

// ------------------------------------------------------------------ chests

export type ChestKind = 'wood' | 'royal';
export const CHEST_SLOTS = 4;
export const WOOD_CHEST_CHANCE = 0.3;
export const WOOD_CHEST_TIME = 3 * HOUR;
export const ROYAL_CHEST_GEMS = 50;

export interface ChestLoot { gold: number; gems: number; stickers: number[]; draws: number }

export function openChest(kind: ChestKind, rng: Rng): ChestLoot {
  if (kind === 'royal') {
    return {
      gold: 300 + Math.round(rng() * 500),
      gems: rng() < 0.25 ? 20 : 0,
      stickers: [drawSticker(rng), drawSticker(rng), drawSticker(rng)],
      draws: rng() < 0.2 ? 1 : 0,
    };
  }
  return {
    gold: 50 + Math.round(rng() * 250),
    gems: rng() < 0.1 ? 5 + Math.round(rng() * 15) : 0,
    stickers: rng() < 0.6 ? [drawSticker(rng)] : [],
    draws: 0,
  };
}

// ------------------------------------------------------------------ the wheel

export interface WheelSegment { label: string; gold?: number; gems?: number; lives?: number; jackpot?: boolean }

/**
 * Eight segments. The jackpot sits between the two cheapest, and those two
 * come up most often, so the wheel stops right beside the big prize again and
 * again (near miss).
 */
export const WHEEL: WheelSegment[] = [
  { label: '💎 100', gems: 100, jackpot: true },
  { label: '🪙 50', gold: 50 },
  { label: '🪙 200', gold: 200 },
  { label: '💎 5', gems: 5 },
  { label: '🪙 100', gold: 100 },
  { label: '❤️ 1', lives: 1 },
  { label: '🪙 500', gold: 500 },
  { label: '🪙 50', gold: 50 },
];
export const WHEEL_WEIGHTS = [1, 30, 10, 8, 15, 8, 3, 25];
export const SPIN_GEMS = 10;

/** The first spins are free, then one a day (Jonas, 2026-11-20). */
export const WHEEL_FREE_START = 3;

export function spinWheel(rng: Rng): number {
  return pick(rng, WHEEL_WEIGHTS);
}

/** Did the wheel stop right beside the jackpot? */
export function nearJackpot(i: number): boolean {
  const j = WHEEL.findIndex((s) => s.jackpot);
  return i !== j && (i === (j + 1) % WHEEL.length || i === (j + WHEEL.length - 1) % WHEEL.length);
}

// The painted disc (public/art/wheel/disc.webp) has eight fields of 45 degrees,
// counted clockwise from the top; its gold field is the second one.
export const FIELD_DEG = 45;
/**
 * The leather flap rests against a peg until the peg is this many degrees past
 * the pointer, so a field wins until its last peg has slipped under the flap.
 */
export const FLAP_GRIP = 6;

/** Where segment i of WHEEL is painted on the disc. */
export function discField(i: number): number {
  return (i + 1) % WHEEL.length;
}

/**
 * The disc angle under the pointer when the wheel stops on segment i (r is a
 * random number, 0 to 1). The disc turns clockwise, so the fields pass the
 * pointer in falling order. Beside the jackpot the stop is staged: before it,
 * the flap is bent hard over the last peg and holds; after it, the flap has
 * just crept over the peg and slipped.
 */
export function landingAngle(i: number, r: number): number {
  const n = WHEEL.length;
  const f = discField(i);
  const j = discField(WHEEL.findIndex((s) => s.jackpot));
  let a: number;
  if (f === (j + 1) % n) a = f * FIELD_DEG - (2 + r * 2.5);
  else if (f === (j + n - 1) % n) a = (f + 1) * FIELD_DEG - FLAP_GRIP - (1 + r * 3);
  else a = f * FIELD_DEG - FLAP_GRIP + 9 + r * 26;
  return ((a % 360) + 360) % 360;
}

/** The segment that wins with this disc angle under the pointer. */
export function segmentAtAngle(angle: number): number {
  const n = WHEEL.length;
  const field = Math.floor((((angle % 360) + 360) % 360 + FLAP_GRIP) / FIELD_DEG) % n;
  return (field + n - 1) % n;
}

// ------------------------------------------------------------------ champions (gacha)

export type Rarity = 'vanlig' | 'sällsynt' | 'legendarisk';
export interface Champion { id: string; name: string; rarity: Rarity; power: number }

export const CHAMPIONS: Champion[] = [
  { id: 'drang', name: 'Drängen Olle', rarity: 'vanlig', power: 5 },
  { id: 'piga', name: 'Pigan Stina', rarity: 'vanlig', power: 5 },
  { id: 'fiskare', name: 'Fiskaren Johan', rarity: 'vanlig', power: 5 },
  { id: 'smed', name: 'Smeden Gustav', rarity: 'vanlig', power: 5 },
  { id: 'jagare', name: 'Jägaren Elin', rarity: 'vanlig', power: 5 },
  { id: 'lotsen', name: 'Lotsen Axel', rarity: 'sällsynt', power: 15 },
  { id: 'gardsfru', name: 'Gårdsfrun Hedvig', rarity: 'sällsynt', power: 15 },
  { id: 'trumslagare', name: 'Trumslagaren Sven', rarity: 'sällsynt', power: 15 },
  { id: 'bjornen', name: 'Björnjägaren Ragnhild', rarity: 'legendarisk', power: 40 },
  { id: 'kaptenen', name: 'Sjökaptenen Wilhelm', rarity: 'legendarisk', power: 40 },
];

export const DRAW_GEMS = 30;
export const TEN_DRAW_GEMS = 270;
export const PITY_HARD = 30;
export const PITY_SOFT = 20;
const BASE = { vanlig: 0.8, sällsynt: 0.18, legendarisk: 0.02 };

/** Chance of a legendary on the next draw, with `since` draws since the last one. */
export function legendaryChance(since: number): number {
  if (since + 1 >= PITY_HARD) return 1;
  if (since + 1 > PITY_SOFT) return Math.min(1, BASE.legendarisk + 0.06 * (since + 1 - PITY_SOFT));
  return BASE.legendarisk;
}

/** One draw; `since` is the pity counter before it. */
export function drawChampion(rng: Rng, since: number): { champion: Champion; since: number } {
  const leg = legendaryChance(since);
  const x = rng();
  const rarity: Rarity = x < leg ? 'legendarisk' : x < leg + BASE.sällsynt ? 'sällsynt' : 'vanlig';
  const pool = CHAMPIONS.filter((c) => c.rarity === rarity);
  const champion = pool[Math.floor(rng() * pool.length)];
  return { champion, since: rarity === 'legendarisk' ? 0 : since + 1 };
}

/** The champions' combined power (each copy counts). */
export function championPower(owned: Record<string, number>): number {
  return CHAMPIONS.reduce((sum, c) => sum + (owned[c.id] ?? 0) * c.power, 0);
}
