/**
 * Ads between challenges (Jonas, 2026-11-20, game design "Mellanreklam"): films
 * that come by themselves, on top of the voluntary ones with a reward. They
 * start with step 6 of the week staircase and press harder with each step.
 * Pure logic; state/expansion.ts applies it and AdOverlay.svelte shows the film.
 */
import { MINUTE } from '../time/clock';

export type InterTrigger = 'win' | 'lose' | 'resume' | 'toMap' | 'dev';

export interface InterRule {
  /** An ad after every n-th finished challenge (won or lost). */
  every: number;
  /** Also after every lost challenge. */
  onLoss: boolean;
  /** Also when the game is opened again after RESUME_AWAY, and when the player goes from the village to the map. */
  resumeAndMap: boolean;
  /** At least this long between two ads (game time). */
  gapMs: number;
  /** Seconds before the cross comes. */
  xAfter: number;
  /** Every n-th ad has a small, pale cross in the corner (0 = never). */
  smallEvery: number;
  /** "Ta bort reklam" is offered from the third ad of the day. */
  offerRemove: boolean;
}

export const INTER_RULES: Record<6 | 7 | 8 | 9, InterRule> = {
  6: { every: 3, onLoss: false, resumeAndMap: false, gapMs: 3 * MINUTE, xAfter: 5, smallEvery: 0, offerRemove: false },
  7: { every: 2, onLoss: true, resumeAndMap: false, gapMs: 2 * MINUTE, xAfter: 5, smallEvery: 0, offerRemove: false },
  8: { every: 2, onLoss: true, resumeAndMap: true, gapMs: 2 * MINUTE, xAfter: 5, smallEvery: 0, offerRemove: true },
  9: { every: 2, onLoss: true, resumeAndMap: true, gapMs: 1 * MINUTE, xAfter: 8, smallEvery: 3, offerRemove: true },
};

/** Away at least this long counts as opening the game again. */
export const RESUME_AWAY = 10 * MINUTE;
/** "Ta bort reklam": a one-off purchase from the test wallet (price confirmed by Jonas, 2026-11-20). */
export const REMOVE_ADS_KRONOR = 39;
/** The offer comes after this many ads in one day. */
export const REMOVE_ADS_AFTER = 3;

export function interRule(step: number): InterRule | null {
  return step >= 6 ? INTER_RULES[Math.min(9, step) as 6 | 7 | 8 | 9] : null;
}

export interface InterState {
  /** Challenges finished since the last ad. */
  since: number;
  /** Game time of the last ad, or of the last voluntary film (which also resets the wait). */
  lastAt: number;
  /** Ads shown in all, to pick the small cross. */
  shown: number;
  /** Ads shown today. */
  day: string;
  today: number;
  /** "Ta bort reklam" bought. */
  removed: boolean;
  /** The day the offer was turned down: it comes back the next day. */
  declinedDay: string | null;
}

export const freshInter = (): InterState => ({ since: 0, lastAt: 0, shown: 0, day: '', today: 0, removed: false, declinedDay: null });

/**
 * Should an ad come now? `finished` is true when the trigger ends a challenge,
 * and the caller counts it in `s.since` first.
 */
export function interDue(step: number, s: InterState, trigger: InterTrigger, now: number): boolean {
  const r = interRule(step);
  if (!r || s.removed) return false;
  if (trigger === 'dev') return true;
  if (now - s.lastAt < r.gapMs) return false;
  if (trigger === 'resume' || trigger === 'toMap') return r.resumeAndMap;
  if (trigger === 'lose' && r.onLoss) return true;
  return s.since >= r.every;
}

/** The ad that comes now: when the cross shows, and whether it is the small one. */
export function interLook(step: number, s: InterState): { xAfter: number; smallX: boolean } {
  const r = interRule(step) ?? INTER_RULES[6];
  return { xAfter: r.xAfter, smallX: r.smallEvery > 0 && (s.shown + 1) % r.smallEvery === 0 };
}

/** The state after an ad was shown. */
export function interShown(s: InterState, now: number, today: string): InterState {
  return { ...s, since: 0, lastAt: now, shown: s.shown + 1, day: today, today: (s.day === today ? s.today : 0) + 1 };
}

/** Is "Ta bort reklam" offered after the ad that just closed? */
export function offerRemoveAds(step: number, s: InterState, today: string): boolean {
  const r = interRule(step);
  return !!r && r.offerRemove && !s.removed && s.day === today && s.today >= REMOVE_ADS_AFTER && s.declinedDay !== today;
}
