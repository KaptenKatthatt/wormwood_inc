/**
 * The day hooks for the week at home (game design, "Testupplägg"): a seven-day
 * calendar of gifts, a streak of days with a won level, an attack while the
 * player is away, and a weekend event. They start on the second day the game
 * is opened, so the first 15-minute pass only has the staircase. Pure logic;
 * the store in state/game.ts applies it.
 */
import { HOUR } from './time/clock';

/** Local calendar day of a time, as YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from one day key to another (local days, so DST does not matter). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / (24 * HOUR));
}

export interface Gift { gold?: number; gems?: number; shieldHours?: number }

/** Day 7 is the big one, so missing a day hurts. */
export const CALENDAR: Gift[] = [
  { gold: 100 },
  { gems: 10 },
  { gold: 250 },
  { shieldHours: 8 },
  { gems: 20 },
  { gold: 500 },
  { gems: 50, gold: 500 },
];

export function giftText(g: Gift): string {
  const parts: string[] = [];
  if (g.gold) parts.push(`🪙 ${g.gold}`);
  if (g.gems) parts.push(`💎 ${g.gems}`);
  if (g.shieldHours) parts.push(`🛡️ ${g.shieldHours} h`);
  return parts.join(' + ');
}

export type DayMode = 'auto' | 'on' | 'off';

export interface DailyState {
  /** The first day the game was opened. */
  firstDay: string;
  /** Gifts taken so far (0 to 7) and the day of the last one. */
  claimed: number;
  lastClaimDay: string | null;
  /** Days in a row with at least one won level, and the last such day. */
  streak: number;
  lastWinDay: string | null;
  bestStreak: number;
}

export function startDaily(now: number): DailyState {
  return { firstDay: dayKey(now), claimed: 0, lastClaimDay: null, streak: 0, lastWinDay: null, bestStreak: 0 };
}

/** Day hooks are on from the second day in 'auto', always in 'on', never in 'off'. */
export function dayHooksActive(s: DailyState, now: number, mode: DayMode): boolean {
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return dayKey(now) !== s.firstDay;
}

export function canClaim(s: DailyState, now: number): boolean {
  return s.claimed < CALENDAR.length && s.lastClaimDay !== dayKey(now);
}

export function claim(s: DailyState, now: number): { state: DailyState; gift: Gift } | null {
  if (!canClaim(s, now)) return null;
  return { state: { ...s, claimed: s.claimed + 1, lastClaimDay: dayKey(now) }, gift: CALENDAR[s.claimed] };
}

/** The streak as it stands today: it is broken if yesterday had no win. */
export function liveStreak(s: DailyState, now: number): number {
  if (!s.lastWinDay) return 0;
  return daysBetween(s.lastWinDay, dayKey(now)) <= 1 ? s.streak : 0;
}

/** Bonus gold for the first win of a day: 50 per day in the streak, at most 250. */
export const STREAK_BONUS = 50;
export const STREAK_CAP = 5;

/** Records a won level; returns the new state and the bonus (0 after the first win of the day). */
export function recordWin(s: DailyState, now: number): { state: DailyState; bonus: number } {
  const today = dayKey(now);
  if (s.lastWinDay === today) return { state: s, bonus: 0 };
  const streak = s.lastWinDay && daysBetween(s.lastWinDay, today) === 1 ? s.streak + 1 : 1;
  const bonus = STREAK_BONUS * Math.min(streak, STREAK_CAP);
  return { state: { ...s, streak, lastWinDay: today, bestStreak: Math.max(s.bestStreak, streak) }, bonus };
}

/** Away this long, the neighbours attack while the player is gone (shown on return). */
export const AWAY_ATTACK_AFTER = 20 * HOUR;
/** The warning notification comes a little before. */
export const THREAT_PUSH_AFTER = 18 * HOUR;
/** The calendar reminder: the next day at this hour. */
export const REMINDER_HOUR = 18;

export function nextReminder(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d.getTime();
}

/** The weekend event runs from Friday 18.00 to Sunday midnight; won levels give double gold. */
export function weekendEvent(now: number): { on: boolean; endsAt: number } {
  const d = new Date(now);
  const day = d.getDay(); // 0 Sunday, 5 Friday, 6 Saturday
  const on = day === 6 || day === 0 || (day === 5 && d.getHours() >= 18);
  const end = new Date(now);
  end.setDate(end.getDate() + (day === 0 ? 1 : day === 6 ? 2 : 3));
  end.setHours(0, 0, 0, 0);
  return { on, endsAt: end.getTime() };
}
export const WEEKEND_GOLD = 2;
