/**
 * Game clock.
 *
 * Game time is derived from the real wall clock, so it keeps running while the
 * game is closed: everything the game remembers is stored as game-time
 * timestamps, and on start the game simply asks "what time is it now?".
 *
 * The clock has a speed. Normal play runs at 1. Fast mode (for playtests)
 * runs at FAST_SPEED, where 30 game minutes pass in 2 real minutes.
 *
 * gameNow = anchorGame + (realNow - anchorReal) * speed
 *
 * Changing the speed re-anchors at the current moment, so game time never
 * jumps. If the device clock is turned backwards, game time stands still
 * instead of running backwards (it never goes below the last seen value).
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
/** 30 minutes become 2 minutes. */
export const FAST_SPEED = 15;

export interface ClockState {
  anchorReal: number;
  anchorGame: number;
  speed: number;
  /** Highest game time seen, so turning the device clock back cannot rewind the game. */
  lastSeenGame: number;
}

export type RealNow = () => number;

export function createClockState(realNow: number, speed = 1): ClockState {
  return { anchorReal: realNow, anchorGame: realNow, speed, lastSeenGame: realNow };
}

export function gameTimeAt(state: ClockState, realNow: number): number {
  const computed = state.anchorGame + (realNow - state.anchorReal) * state.speed;
  return Math.max(computed, state.lastSeenGame);
}

/** Returns a new state running at `speed`, anchored at `realNow`. */
export function withSpeed(state: ClockState, speed: number, realNow: number): ClockState {
  if (!(speed > 0)) throw new Error(`Ogiltig hastighet: ${speed}`);
  const g = gameTimeAt(state, realNow);
  return { anchorReal: realNow, anchorGame: g, speed, lastSeenGame: g };
}

/** Real milliseconds until the game clock reaches `gameTarget` (0 if already passed). */
export function realMsUntil(state: ClockState, gameTarget: number, realNow: number): number {
  const remainingGame = gameTarget - gameTimeAt(state, realNow);
  return remainingGame <= 0 ? 0 : remainingGame / state.speed;
}

/** Stateful wrapper used by the app. Persists itself through `save`. */
export class GameClock {
  private state: ClockState;

  constructor(
    state: ClockState | null,
    private readonly realNow: RealNow = Date.now,
    private readonly save: (s: ClockState) => void = () => {},
  ) {
    this.state = state ?? createClockState(this.realNow());
    this.save(this.state);
  }

  now(): number {
    const g = gameTimeAt(this.state, this.realNow());
    if (g > this.state.lastSeenGame) this.state = { ...this.state, lastSeenGame: g };
    return g;
  }

  get speed(): number {
    return this.state.speed;
  }

  setSpeed(speed: number): void {
    this.state = withSpeed(this.state, speed, this.realNow());
    this.save(this.state);
  }

  /** Real ms until game time `gameTarget`; used to schedule push notifications. */
  realMsUntil(gameTarget: number): number {
    return realMsUntil(this.state, gameTarget, this.realNow());
  }

  /** Persist lastSeenGame (call when the page is hidden). */
  persist(): void {
    this.now();
    this.save(this.state);
  }

  snapshot(): ClockState {
    return { ...this.state };
  }
}

/** "1 h 05 min", "4 min 09 s", "12 s". Swedish, short. */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(sec).padStart(2, '0')} s`;
  return `${sec} s`;
}
