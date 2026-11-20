/**
 * The week staircase (Jonas, 2026-11-17): after the first pass's five steps,
 * four more blocks of hooks come during the week at home. A step starts on a
 * given test day or when the player reaches its world, whichever comes first,
 * the same idea as the first pass (an event, with the clock as fallback).
 * Pure logic; state/expansion.ts applies it.
 */
import type { HookId } from '../hooks';

export type WeekStep = 6 | 7 | 8 | 9;

export interface WeekStepDef {
  step: WeekStep;
  name: string;
  /** Test day (1 = the first day) when the step starts at the latest. */
  day: number;
  /** The world whose first challenge starts the step earlier. */
  world: number;
  hooks: HookId[];
}

export const WEEK_STEPS: WeekStepDef[] = [
  { step: 6, name: 'Socialt', day: 2, world: 2, hooks: ['league', 'askHelp', 'album', 'ads', 'interstitial', 'pass'] },
  { step: 7, name: 'Slump', day: 3, world: 3, hooks: ['chests', 'wheel', 'heroes'] },
  { step: 8, name: 'Erövring', day: 4, world: 4, hooks: ['conquest', 'troops', 'powerCreep', 'personalOffer', 'vip'] },
  { step: 9, name: 'Förpliktelse', day: 6, world: 5, hooks: ['neighboursNeeded', 'fakeGifts'] },
];

/** The week step for a test day and the highest world reached (5 = none of the week's steps yet). */
export function weekStepFor(testDay: number, world: number): 5 | WeekStep {
  let s: 5 | WeekStep = 5;
  for (const d of WEEK_STEPS) if (testDay >= d.day || world >= d.world) s = d.step;
  return s;
}

/** Which step a hook belongs to (0 when it is not a week hook). */
export function stepOfHook(id: HookId): number {
  return WEEK_STEPS.find((d) => d.hooks.includes(id))?.step ?? 0;
}

/** Stars for a won challenge: 3 with at least 30 % of the moves left, 2 with 10 %, else 1. */
export function starsFor(movesLeft: number, movesGiven: number): 1 | 2 | 3 {
  const share = movesGiven > 0 ? movesLeft / movesGiven : 0;
  return share >= 0.3 ? 3 : share >= 0.1 ? 2 : 1;
}
