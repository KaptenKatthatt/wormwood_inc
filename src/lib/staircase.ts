/**
 * The hook staircase (game design, section 4): five steps of rising pressure.
 * Each step starts on an event in the game, with the clock as a fallback if
 * the event is late. Steps only go up, and may skip (trying to quit jumps
 * straight to step 5).
 */
import { MINUTE } from './time/clock';

export type Step = 1 | 2 | 3 | 4 | 5;

export const STEP_NAMES: Record<Step, string> = { 1: 'Mild', 2: 'Lockande', 3: 'Begränsande', 4: 'Stressande', 5: 'Skuldbeläggande' };

/** Game minutes after start when a step begins at the latest. */
export const FALLBACK_MINUTES: Record<Step, number> = { 1: 0, 2: 3, 3: 6, 4: 10, 5: 12 };

export type StairEvent =
  | 'loss'          // a level was lost, or the player ran out of moves
  | 'longBuild'     // a build of 5 minutes or more started
  | 'noLives'       // lives ran out
  | 'quit';         // the player pressed Avsluta

/** The step after `event` at `minutesIn`, given the current step. */
export function nextStep(current: Step, minutesIn: number, event?: StairEvent): Step {
  let s: Step = current;
  for (const k of [2, 3, 4, 5] as Step[]) if (minutesIn >= FALLBACK_MINUTES[k] && s < k) s = k;
  if (event === 'loss' && s < 2) s = 2;
  if ((event === 'longBuild' || event === 'noLives') && s < 3) s = 3;
  if (event === 'loss' && minutesIn >= 9 && s < 4) s = 4;
  if (event === 'quit') s = 5;
  return s;
}

/** The starter pack in step 4. */
export const OFFER = { kronor: 19, gems: 250, gold: 1000, lastsMs: 5 * MINUTE };

/** The attack in step 5. */
export const ATTACK = {
  warningMs: 60_000,
  shieldGems: 100,
  shieldMs: 8 * 60 * MINUTE,
  soldierGold: 50,
  soldierPower: 10,
  towerPower: 30,
  goldLoss: 0.3,
  repairMs: 5 * MINUTE,
};

export function defence(soldiers: number, towerLevel: number): number {
  return soldiers * ATTACK.soldierPower + towerLevel * ATTACK.towerPower;
}

/**
 * Strength of the attack, set when the warning comes: a little too strong for
 * what the player has, so the shield tempts. Two more soldiers are enough.
 */
export function attackStrength(defenceNow: number): number {
  return Math.max(40, defenceNow + 15);
}

export type AttackResult = 'shielded' | 'defended' | 'lost';

export function resolveAttack(strength: number, def: number, shielded: boolean): AttackResult {
  if (shielded) return 'shielded';
  return def >= strength ? 'defended' : 'lost';
}
