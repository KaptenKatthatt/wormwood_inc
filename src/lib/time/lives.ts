/**
 * Lives that refill over time (the classic "come back later" hook).
 * Pure functions over game time; see clock.ts.
 */
import { MINUTE } from './clock';

export interface LivesState {
  count: number;
  max: number;
  /** Game time from which the next life is counting. Only meaningful when count < max. */
  regenFrom: number;
  regenMs: number;
}

export const DEFAULT_LIVES: Omit<LivesState, 'regenFrom'> = { count: 5, max: 5, regenMs: 30 * MINUTE };

export function createLives(gameNow: number, opts: Partial<LivesState> = {}): LivesState {
  return { ...DEFAULT_LIVES, regenFrom: gameNow, ...opts };
}

/** Adds every life that has refilled up to `gameNow`. */
export function settleLives(s: LivesState, gameNow: number): LivesState {
  if (s.count >= s.max) return { ...s, regenFrom: gameNow };
  const gained = Math.floor((gameNow - s.regenFrom) / s.regenMs);
  if (gained <= 0) return s;
  const count = Math.min(s.max, s.count + gained);
  const regenFrom = count >= s.max ? gameNow : s.regenFrom + gained * s.regenMs;
  return { ...s, count, regenFrom };
}

/** Uses one life. Returns null when there are none. */
export function spendLife(s: LivesState, gameNow: number): LivesState | null {
  const settled = settleLives(s, gameNow);
  if (settled.count <= 0) return null;
  const wasFull = settled.count >= settled.max;
  return { ...settled, count: settled.count - 1, regenFrom: wasFull ? gameNow : settled.regenFrom };
}

/** Game ms until the next life, or null when full. */
export function nextLifeIn(s: LivesState, gameNow: number): number | null {
  const settled = settleLives(s, gameNow);
  if (settled.count >= settled.max) return null;
  return settled.regenFrom + settled.regenMs - gameNow;
}

/** Game time when all lives are back, or null when full. */
export function fullAt(s: LivesState, gameNow: number): number | null {
  const settled = settleLives(s, gameNow);
  if (settled.count >= settled.max) return null;
  return settled.regenFrom + (settled.max - settled.count) * settled.regenMs;
}
