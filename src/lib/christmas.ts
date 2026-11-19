/**
 * Christmas in Skargardsbyn, 1-24 December (game design, "Julen i
 * Skargardsbyn"; Jonas chose advent calendar and Christmas market together on
 * 2026-11-19). One door a day with gingerbread and a small gift, gingerbread
 * for won challenges, decorations for the village bought with gingerbread, and
 * a countdown to the market closing. Pure logic; state/christmas.ts applies it.
 *
 * The numbers are the design thread's proposal and not yet confirmed by Jonas.
 */

export const LAST_DOOR = 24;
/** Gingerbread in every door. */
export const DOOR_COOKIES = 20;
/** Gems to open a door whose day has passed. */
export const LATE_DOOR_GEMS = 5;
export const WIN_COOKIES = 5;
export const STAR_COOKIES = 1;
/** Gingerbread per gem when topping up. */
export const COOKIES_PER_GEM = 10;

export type DecorId = 'lights' | 'sheaves' | 'stars' | 'snow' | 'tree';
export const DECOR: { id: DecorId; name: string; cookies: number }[] = [
  { id: 'lights', name: 'Ljusslingor på muren', cookies: 40 },
  { id: 'sheaves', name: 'Julkärvar vid stugorna', cookies: 80 },
  { id: 'stars', name: 'Adventsstjärnor i fönstren', cookies: 150 },
  { id: 'snow', name: 'Snö på taken', cookies: 250 },
  { id: 'tree', name: 'Julgran på torget', cookies: 400 },
];

export interface DoorGift { gold?: number; life?: boolean; gems?: number; star?: boolean }

const GEM_DOORS = [6, 13, 20];
const LIFE_DOORS = [2, 5, 9, 15, 19, 23];
const GOLD = [100, 150, 200, 250, 300];

/** What a door holds besides the gingerbread. Door 24 is the star for the top of the tree. */
export function doorGift(day: number): DoorGift {
  if (day === LAST_DOOR) return { star: true };
  if (GEM_DOORS.includes(day)) return { gems: 1 };
  if (LIFE_DOORS.includes(day)) return { life: true };
  return { gold: GOLD[(day * 3) % GOLD.length] };
}

export function doorGiftText(g: DoorGift): string {
  if (g.star) return '⭐ Granens stjärna';
  if (g.gems) return `💎 ${g.gems}`;
  if (g.life) return '❤️ Ett liv';
  return `🪙 ${g.gold}`;
}

export interface XmasState {
  /** The December the doors belong to. */
  year: number;
  opened: number[];
  cookies: number;
  decor: DecorId[];
  /** The star from door 24. */
  star: boolean;
  /** The day (1-24) the countdown was last logged as seen. */
  countdownSeen: number;
}

export function startXmas(year: number): XmasState {
  return { year, opened: [], cookies: 0, decor: [], star: false, countdownSeen: 0 };
}

/** The door of the day, 1 to 24, or 0 outside 1-24 December. */
export function eventDay(now: number): number {
  const d = new Date(now);
  return d.getMonth() === 11 && d.getDate() <= LAST_DOOR ? d.getDate() : 0;
}

/** A new December starts a new calendar; bought decorations and the star stay. */
export function forYear(s: XmasState, now: number): XmasState {
  const year = new Date(now).getFullYear();
  return eventDay(now) > 0 && s.year !== year ? { ...s, year, opened: [], cookies: 0, countdownSeen: 0 } : s;
}

/** Days until the market closes: 0 on the 24th. */
export function daysLeft(today: number): number {
  return LAST_DOOR - today;
}

export function countdownText(today: number): string {
  const n = daysLeft(today);
  return n === 0 ? 'Julmarknaden stänger i kväll' : n === 1 ? 'Julmarknaden stänger om 1 dag' : `Julmarknaden stänger om ${n} dagar`;
}

export type DoorStatus = 'opened' | 'today' | 'missed' | 'later';

/** Days before today count as missed, also the ones before the player started. */
export function doorStatus(s: XmasState, day: number, today: number): DoorStatus {
  if (s.opened.includes(day)) return 'opened';
  if (day === today) return 'today';
  return day < today ? 'missed' : 'later';
}

/** Gems a door costs to open today, or null when it cannot be opened. */
export function doorPrice(s: XmasState, day: number, today: number): number | null {
  if (today < 1) return null;
  const st = doorStatus(s, day, today);
  return st === 'today' ? 0 : st === 'missed' ? LATE_DOOR_GEMS : null;
}

/** Opens a door. The caller has taken the gems for a late one and hands out the gift. */
export function openDoor(s: XmasState, day: number, today: number): { state: XmasState; gift: DoorGift; late: boolean } | null {
  const price = doorPrice(s, day, today);
  if (price === null) return null;
  const gift = doorGift(day);
  return {
    state: { ...s, opened: [...s.opened, day].sort((a, b) => a - b), cookies: s.cookies + DOOR_COOKIES, star: s.star || !!gift.star },
    gift,
    late: price > 0,
  };
}

export function cookiesForWin(stars: number): number {
  return WIN_COOKIES + STAR_COOKIES * stars;
}

/** Gems that cover the missing gingerbread, and how much gingerbread they give. */
export function refill(missing: number): { gems: number; cookies: number } {
  const gems = Math.max(1, Math.ceil(missing / COOKIES_PER_GEM));
  return { gems, cookies: gems * COOKIES_PER_GEM };
}

export type DecorBlock = 'closed' | 'owned' | 'cookies' | null;

/** Why a decoration cannot be bought now, or null when it can. */
export function decorBlock(s: XmasState, id: DecorId, today: number): DecorBlock {
  if (s.decor.includes(id)) return 'owned';
  if (today < 1) return 'closed';
  return s.cookies < DECOR.find((d) => d.id === id)!.cookies ? 'cookies' : null;
}

export function buyDecor(s: XmasState, id: DecorId, today: number): XmasState | null {
  if (decorBlock(s, id, today) !== null) return null;
  return { ...s, cookies: s.cookies - DECOR.find((d) => d.id === id)!.cookies, decor: [...s.decor, id] };
}
