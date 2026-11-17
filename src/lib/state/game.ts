/**
 * The game's state: clock, lives, timers and settings, persisted on the device.
 * Everything time-based is stored in game time (see time/clock.ts), so the
 * game "catches up" by itself when it is opened again.
 */
import { writable, get } from 'svelte/store';
import { FAST_SPEED, GameClock, type ClockState } from '../time/clock';
import { createLives, settleLives, spendLife, type LivesState } from '../time/lives';
import { collectDue, finishNow, startTimer, type GameTimer, type TimerKind } from '../time/timers';
import { load, randomId, save } from './storage';
import { log } from '../log/logger';
import { cancelPush, schedulePush } from '../push/push';
import { START_WALLET, pay, skipPrice, topUp, formatKr, type Wallet } from '../economy/wallet';
import { remaining } from '../time/timers';
import { DEV_MENU } from '../config/flags';

export interface Settings {
  fastMode: boolean;
  /** Consent to send anonymous playtest events. */
  logging: boolean | null;
  notifications: boolean;
}

export const playerId: string = load('playerId', '') || (() => { const id = randomId(); save('playerId', id); return id; })();

export const clock = new GameClock(load<ClockState | null>('clock', null), Date.now, (s) => save('clock', s));

export const settings = writable<Settings>(load('settings', { fastMode: false, logging: null, notifications: false }));
settings.subscribe((s) => save('settings', s));

export const lives = writable<LivesState>(load('lives', null) ?? createLives(clock.now()));
lives.subscribe((l) => save('lives', l));

export const timers = writable<GameTimer[]>(load('timers', []));
timers.subscribe((t) => save('timers', t));

/** Game time, updated every second by tick(). Components read this. */
export const now = writable(clock.now());

export const wallet = writable<Wallet>(load('wallet', START_WALLET));
wallet.subscribe((w) => save('wallet', w));

// A build without the dev menu always runs in real time.
if (!DEV_MENU && clock.speed !== 1) {
  clock.setSpeed(1);
  settings.update((s) => ({ ...s, fastMode: false }));
}

/** Short messages shown at the top ("Sjöboden är klar"). */
export const toasts = writable<{ id: string; text: string }[]>([]);
export function toast(text: string): void {
  const id = randomId();
  toasts.update((t) => [...t, { id, text }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 4000);
}

export function tick(): void {
  const g = clock.now();
  now.set(g);
  lives.update((l) => settleLives(l, g));
  const { due, timers: next } = collectDue(get(timers), g);
  if (due.length) {
    timers.set(next);
    for (const t of due) {
      toast(`${t.label} är klar`);
      log('timer_done', { id: t.id, kind: t.kind });
    }
  }
}

export function setFastMode(on: boolean): void {
  clock.setSpeed(on ? FAST_SPEED : 1);
  settings.update((s) => ({ ...s, fastMode: on }));
  log('fast_mode', { on });
  rescheduleAll();
  tick();
}

export function useLife(): boolean {
  const next = spendLife(get(lives), clock.now());
  if (!next) return false;
  lives.set(next);
  log('life_spent', { left: next.count });
  return true;
}

export function addTimer(kind: TimerKind, label: string, durationMs: number): GameTimer {
  const t = startTimer(`${kind}-${randomId()}`, kind, label, clock.now(), durationMs);
  timers.update((list) => [...list.slice(-30), t]);
  log('timer_start', { id: t.id, kind, durationMs });
  schedule(t);
  return t;
}

/** Finishes a timer now, paid from the test wallet. Returns false if the player cannot afford it. */
export function skipTimer(id: string): boolean {
  const t = get(timers).find((x) => x.id === id);
  if (!t) return false;
  const price = skipPrice(remaining(t, clock.now()));
  const paid = pay(get(wallet), price);
  if (!paid) {
    log('purchase_declined', { item: 'skip', id, price, kronor: get(wallet).kronor });
    toast(`Det kostar ${formatKr(price)}, du har ${formatKr(get(wallet).kronor)}`);
    return false;
  }
  wallet.set(paid);
  timers.update((list) => finishNow(list, id, clock.now()));
  log('purchase', { item: 'skip', id, price, kronor: paid.kronor });
  void cancelPush(playerId, id);
  tick();
  return true;
}

export function addKronor(amount: number): void {
  wallet.update((w) => topUp(w, amount));
  log('wallet_topup', { amount });
}

function schedule(t: GameTimer): void {
  if (!get(settings).notifications || t.doneAt !== undefined) return;
  void schedulePush(playerId, t.id, clock.realMsUntil(t.endsAt), `${t.label} är klar`, 'Kom tillbaka och se.');
}

/** Real times change when the speed changes, so every pending notification is sent again. */
export function rescheduleAll(): void {
  for (const t of get(timers)) schedule(t);
}

export function resetAll(): void {
  log('reset', {});
  void cancelPush(playerId);
  clock.setSpeed(get(settings).fastMode ? FAST_SPEED : 1);
  lives.set(createLives(clock.now()));
  timers.set([]);
  buildings.set([]);
  wallet.set(START_WALLET);
  tick();
}

/** Placeholder village: three plots, each empty or holding a building with a build timer. */
export interface Building { plot: number; label: string; timerId: string }
export const buildings = writable<Building[]>(load('buildings', []));
buildings.subscribe((b) => save('buildings', b));

export function build(plot: number, label: string, durationMs: number): void {
  const t = addTimer('build', label, durationMs);
  buildings.update((b) => [...b.filter((x) => x.plot !== plot), { plot, label, timerId: t.id }]);
}
