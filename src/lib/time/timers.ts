/**
 * Countdown timers in game time: build times, offers that expire, attacks.
 * Pure functions; the store in state/ keeps the list and persists it.
 */

export type TimerKind = 'build' | 'offer' | 'attack' | 'other';

export interface GameTimer {
  id: string;
  kind: TimerKind;
  /** Swedish text shown to the player and in the notification. */
  label: string;
  startedAt: number;
  endsAt: number;
  /** Set once the timer has been reported as done. */
  doneAt?: number;
}

export function startTimer(id: string, kind: TimerKind, label: string, gameNow: number, durationMs: number): GameTimer {
  return { id, kind, label, startedAt: gameNow, endsAt: gameNow + durationMs };
}

export function remaining(t: GameTimer, gameNow: number): number {
  return Math.max(0, t.endsAt - gameNow);
}

export function progress(t: GameTimer, gameNow: number): number {
  const total = t.endsAt - t.startedAt;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (gameNow - t.startedAt) / total));
}

/** Splits timers into those that just finished and the rest, marking the finished ones. */
export function collectDue(timers: GameTimer[], gameNow: number): { due: GameTimer[]; timers: GameTimer[] } {
  const due: GameTimer[] = [];
  const next = timers.map((t) => {
    if (t.doneAt === undefined && t.endsAt <= gameNow) {
      const done = { ...t, doneAt: gameNow };
      due.push(done);
      return done;
    }
    return t;
  });
  return { due, timers: next };
}

/** Finishes a timer at once (what the "buy it away" button does). */
export function finishNow(timers: GameTimer[], id: string, gameNow: number): GameTimer[] {
  return timers.map((t) => (t.id === id && t.endsAt > gameNow ? { ...t, endsAt: gameNow } : t));
}
