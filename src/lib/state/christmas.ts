/**
 * Christmas in Skargardsbyn: the store around lib/christmas.ts. It listens to
 * the game's wins and resets instead of being imported by state/game.ts.
 * Every moment is logged under the hook 'christmas' with its part: door,
 * lateDoor, decor, refill, countdown.
 */
import { get, writable } from 'svelte/store';
import { CHRISTMAS, DEV_MENU } from '../config/flags';
import { DECOR, buyDecor as buy, cookiesForWin, daysLeft, decorBlock, doorGiftText, doorPrice, eventDay, forYear, openDoor as open, refill, startXmas, type DecorId, type DoorGift, type XmasState } from '../christmas';
import { load, save } from './storage';
import { addGold, clock, dayOn, lives, logHook, payGems, purse, resetListeners, toast, winListeners } from './game';
import { settleLives } from '../time/lives';
import { log } from '../log/logger';

/** Dev menu: a pretended date (YYYY-MM-DD) for the event, or null for the real one. */
export const xmasDate = writable<string | null>(DEV_MENU ? load<string | null>('xmasDate', null) : null);
xmasDate.subscribe((d) => { if (DEV_MENU) save('xmasDate', d); });

/** The time the event goes by: the dev menu's date at noon, or the game clock. */
export function xmasNow(): number {
  const d = get(xmasDate);
  if (!d) return clock.now();
  return new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), 12).getTime();
}

export const xmas = writable<XmasState>(load('xmas', null) ?? startXmas(new Date(xmasNow()).getFullYear()));
xmas.subscribe((s) => save('xmas', s));
export const xmasOpen = writable(false);

/** Today's door (1-24) while the event runs for this player, otherwise 0. */
export function xmasDay(): number {
  if (!CHRISTMAS || !dayOn('christmas')) return 0;
  return eventDay(xmasNow());
}

function current(): XmasState {
  const s = forYear(get(xmas), xmasNow());
  if (s !== get(xmas)) xmas.set(s);
  return s;
}

/** Logged once a day, the first time the player sees the countdown. */
export function countdownShown(): void {
  const today = xmasDay();
  const s = current();
  if (today < 1 || s.countdownSeen === today) return;
  xmas.set({ ...s, countdownSeen: today });
  logHook('christmas', { part: 'countdown', day: today, daysLeft: daysLeft(today) }, 'shown');
}

function give(g: DoorGift): void {
  if (g.gold) addGold(g.gold);
  if (g.gems) purse.update((p) => ({ ...p, gems: p.gems + g.gems! }));
  if (g.life) lives.update((l) => { const s = settleLives(l, clock.now()); return { ...s, count: Math.min(s.max, s.count + 1) }; });
}

/** Opens a door: today's for free, a missed one for gems. */
export function openXmasDoor(day: number): DoorGift | null {
  const today = xmasDay();
  const s = current();
  const price = doorPrice(s, day, today);
  if (price === null) return null;
  if (price > 0 && !payGems(price, 'christmas', { part: 'lateDoor', day, today })) return null;
  const r = open(s, day, today);
  if (!r) return null;
  xmas.set(r.state);
  give(r.gift);
  if (!r.late) logHook('christmas', { part: 'door', day, gift: r.gift }, 'yes');
  return r.gift;
}

export function buyXmasDecor(id: DecorId): boolean {
  const today = xmasDay();
  const next = buy(current(), id, today);
  if (!next) return false;
  xmas.set(next);
  const d = DECOR.find((x) => x.id === id)!;
  logHook('christmas', { part: 'decor', decor: id, cookies: d.cookies, day: today, cookiesLeft: next.cookies }, 'yes');
  toast(`${d.name} pyntar nu byn!`);
  return true;
}

/** Tops up the gingerbread missing for a decoration with gems. */
export function refillFor(id: DecorId): boolean {
  const today = xmasDay();
  const s = current();
  if (decorBlock(s, id, today) !== 'cookies') return false;
  const r = refill(DECOR.find((x) => x.id === id)!.cookies - s.cookies);
  if (!payGems(r.gems, 'christmas', { part: 'refill', decor: id, cookies: r.cookies, day: today })) return false;
  xmas.set({ ...s, cookies: s.cookies + r.cookies });
  return true;
}

if (CHRISTMAS) {
  winListeners.push(({ stars }) => {
    if (xmasDay() < 1) return;
    const n = cookiesForWin(stars);
    xmas.set({ ...current(), cookies: current().cookies + n });
    toast(`+${n} pepparkakor`);
  });
  resetListeners.push(() => xmas.set(startXmas(new Date(xmasNow()).getFullYear())));
}

/** Dev menu: the pretended date, or null for the real one. */
export function devXmasDate(d: string | null): void {
  xmasDate.set(d || null);
  log('dev_xmas_date', { date: d || null });
}

export { doorGiftText };
