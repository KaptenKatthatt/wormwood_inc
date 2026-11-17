/**
 * The game's state: clock, lives, currencies, village, timers and settings,
 * persisted on the device. Everything time-based is stored in game time (see
 * time/clock.ts), so the game catches up by itself when it is opened again.
 */
import { get, writable } from 'svelte/store';
import { GameClock, MINUTE, type ClockState } from '../time/clock';
import { createLives, settleLives, spendLife, type LivesState } from '../time/lives';
import { collectDue, finishNow, remaining, startTimer, type GameTimer, type TimerKind } from '../time/timers';
import { load, randomId, save } from './storage';
import { log } from '../log/logger';
import { cancelPush, schedulePush } from '../push/push';
import { formatKr } from '../economy/wallet';
import { GEM_PACKS, PRICE, START, levelReward } from '../economy/shop';
import { BUILDINGS, START_VILLAGE, buildBlock, buildCost, buildTime, goldMultiplier, skipGems, type BuildingId, type VillageState } from '../economy/village';
import { DEV_MENU } from '../config/flags';
import { HOOKS, type HookId, type HookResponse } from '../hooks';

export const LIFE_REGEN = 20 * MINUTE;
export const SPEEDS = [1, 15, 60] as const;

export interface Settings {
  speed: number;
  /** Consent to send anonymous playtest events. */
  logging: boolean | null;
  notifications: boolean;
  hooks: Record<HookId, boolean>;
}

const ALL_HOOKS_ON = Object.fromEntries(HOOKS.map((h) => [h.id, true])) as Record<HookId, boolean>;

export const playerId: string = load('playerId', '') || (() => { const id = randomId(); save('playerId', id); return id; })();

export const clock = new GameClock(load<ClockState | null>('clock', null), Date.now, (s) => save('clock', s));

const storedSettings = load<Partial<Settings> & { fastMode?: boolean }>('settings', {});
export const settings = writable<Settings>({
  speed: storedSettings.speed ?? 1,
  logging: storedSettings.logging ?? null,
  notifications: storedSettings.notifications ?? false,
  hooks: { ...ALL_HOOKS_ON, ...(storedSettings.hooks ?? {}) },
});
settings.subscribe((s) => save('settings', s));

// A build without the dev menu always runs in real time with every hook on.
if (!DEV_MENU) settings.update((s) => ({ ...s, speed: 1, hooks: { ...ALL_HOOKS_ON } }));
if (clock.speed !== get(settings).speed) clock.setSpeed(get(settings).speed);

export const hookOn = (id: HookId): boolean => get(settings).hooks[id] !== false;

/** Game time when this player first opened the game; hook logs count minutes from it. */
export const startedAt: number = load('startedAt', 0) || (() => { const t = clock.now(); save('startedAt', t); return t; })();

export const lives = writable<LivesState>({ ...(load('lives', null) ?? createLives(clock.now())), regenMs: LIFE_REGEN });
lives.subscribe((l) => save('lives', l));

export interface Purse { gold: number; gems: number; kronor: number; kronorSpent: number }
export const purse = writable<Purse>(load('purse', { ...START, kronorSpent: 0 }));
purse.subscribe((p) => save('purse', p));

export const village = writable<VillageState>(load('village', START_VILLAGE));
village.subscribe((v) => save('village', v));

export const timers = writable<GameTimer[]>(load('timers', []));
timers.subscribe((t) => save('timers', t));

/** Best result per level id: wins and losses so far. */
export const levelStats = writable<Record<number, { wins: number; losses: number }>>(load('levelStats', {}));
levelStats.subscribe((s) => save('levelStats', s));

/** Game time, updated every second by tick(). Components read this. */
export const now = writable(clock.now());

/** Short messages shown at the top. */
export const toasts = writable<{ id: string; text: string }[]>([]);
export function toast(text: string): void {
  const id = randomId();
  toasts.update((t) => [...t, { id, text }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 3500);
}

/** The shop overlay; `reason` says why it opened (logged). */
export const shopOpen = writable<null | { reason: string }>(null);

// ------------------------------------------------------------------ logging

export function minutesIn(): number {
  return Math.round(((clock.now() - startedAt) / MINUTE) * 10) / 10;
}

/** One line per hook moment: what was offered and what the player did. */
export function logHook(hook: HookId, offer: Record<string, unknown>, response: HookResponse): void {
  log('hook', { hook, offer, response, minutesIn: minutesIn(), purse: get(purse) });
}

// ------------------------------------------------------------------ clock

export function tick(): void {
  const g = clock.now();
  now.set(g);
  lives.update((l) => settleLives(l, g));
  const { due, timers: next } = collectDue(get(timers), g);
  if (due.length) {
    timers.set(next);
    for (const t of due) onTimerDone(t);
  }
}

function onTimerDone(t: GameTimer): void {
  log('timer_done', { id: t.id, kind: t.kind });
  const v = get(village);
  if (t.kind === 'build' && v.construction?.timerId === t.id) {
    const c = v.construction;
    village.set({ ...v, levels: { ...v.levels, [c.id]: c.toLevel }, construction: null });
    const name = BUILDINGS.find((b) => b.id === c.id)?.name ?? c.id;
    toast(`${name} är klar (nivå ${c.toLevel})`);
  }
}

export function setSpeed(speed: number): void {
  clock.setSpeed(speed);
  settings.update((s) => ({ ...s, speed }));
  log('speed', { speed });
  rescheduleAll();
  tick();
}

export function setHook(id: HookId, on: boolean): void {
  settings.update((s) => ({ ...s, hooks: { ...s.hooks, [id]: on } }));
  log('hook_toggle', { hook: id, on });
}

// ------------------------------------------------------------------ currencies

function spendGems(n: number): boolean {
  const p = get(purse);
  if (p.gems < n) return false;
  purse.set({ ...p, gems: p.gems - n });
  return true;
}

export function addGold(n: number): void {
  purse.update((p) => ({ ...p, gold: p.gold + n }));
}

/** Buys a gem pack with pretend kronor from the test wallet. */
export function buyPack(packId: string, reason: string): boolean {
  const pack = GEM_PACKS.find((p) => p.id === packId);
  if (!pack) return false;
  const p = get(purse);
  if (p.kronor < pack.kronor) {
    logHook('gemPacks', { pack: pack.id, kronor: pack.kronor, reason }, 'cannot-afford');
    toast(`Det kostar ${formatKr(pack.kronor)}, du har ${formatKr(p.kronor)}`);
    return false;
  }
  purse.set({ ...p, kronor: p.kronor - pack.kronor, kronorSpent: p.kronorSpent + pack.kronor, gems: p.gems + pack.gems });
  logHook('gemPacks', { pack: pack.id, kronor: pack.kronor, gems: pack.gems, reason }, 'yes');
  log('purchase', { item: pack.id, kronor: pack.kronor });
  toast(`+${pack.gems} ädelstenar`);
  return true;
}

/** Pays gems, or opens the shop when there are too few. */
function payGems(n: number, hook: HookId, offer: Record<string, unknown>): boolean {
  if (spendGems(n)) {
    logHook(hook, { ...offer, gems: n }, 'yes');
    return true;
  }
  logHook(hook, { ...offer, gems: n }, 'cannot-afford');
  if (hookOn('gemPacks')) shopOpen.set({ reason: hook });
  else toast('För få ädelstenar');
  return false;
}

// ------------------------------------------------------------------ lives

export function canPlay(): boolean {
  return settleLives(get(lives), clock.now()).count > 0;
}

export function loseLife(): void {
  const next = spendLife(get(lives), clock.now());
  if (next) lives.set(next);
  log('life_lost', { left: next?.count ?? 0 });
}

export function buyLives(full: boolean): boolean {
  const cost = full ? PRICE.fullLives : PRICE.oneLife;
  if (!payGems(cost, 'buyLives', { full })) return false;
  lives.update((l) => {
    const s = settleLives(l, clock.now());
    const count = full ? s.max : Math.min(s.max, s.count + 1);
    return { ...s, count, regenFrom: count >= s.max ? clock.now() : s.regenFrom };
  });
  return true;
}

// ------------------------------------------------------------------ levels

export function levelWon(levelId: number, extra: Record<string, unknown>): number {
  const gold = levelReward(levelId, goldMultiplier(get(village)));
  addGold(gold);
  let gems = 0;
  if (Math.random() < 0.15) { gems = 5; purse.update((p) => ({ ...p, gems: p.gems + gems })); }
  levelStats.update((s) => ({ ...s, [levelId]: { wins: (s[levelId]?.wins ?? 0) + 1, losses: s[levelId]?.losses ?? 0 } }));
  log('level_won', { level: levelId, gold, gems, minutesIn: minutesIn(), ...extra });
  return gold;
}

export function levelLost(levelId: number, extra: Record<string, unknown>): void {
  loseLife();
  levelStats.update((s) => ({ ...s, [levelId]: { wins: s[levelId]?.wins ?? 0, losses: (s[levelId]?.losses ?? 0) + 1 } }));
  log('level_lost', { level: levelId, minutesIn: minutesIn(), ...extra });
}

/** Pays for extra moves. The caller adds them to the board. */
export function buyExtraMoves(offer: Record<string, unknown>): boolean {
  return payGems(PRICE.extraMoves, 'extraMoves', offer);
}

// ------------------------------------------------------------------ village

export function startBuild(id: BuildingId): boolean {
  const v = get(village);
  const p = get(purse);
  const block = buildBlock(v, id, p.gold);
  if (block) return false;
  const n = v.builds + 1;
  const cost = buildCost(n);
  const t = addTimer('build', BUILDINGS.find((b) => b.id === id)!.name, buildTime(n));
  purse.set({ ...p, gold: p.gold - cost });
  village.set({ ...v, builds: n, construction: { id, toLevel: v.levels[id] + 1, timerId: t.id } });
  log('build_start', { building: id, toLevel: v.levels[id] + 1, buildNo: n, gold: cost, timeMs: buildTime(n), minutesIn: minutesIn() });
  return true;
}

export function skipBuild(): boolean {
  const c = get(village).construction;
  const t = c && get(timers).find((x) => x.id === c.timerId);
  if (!c || !t) return false;
  const left = remaining(t, clock.now());
  const gems = skipGems(left);
  if (!payGems(gems, 'skipWait', { building: c.id, leftMs: left })) return false;
  timers.update((list) => finishNow(list, t.id, clock.now()));
  void cancelPush(playerId, t.id);
  tick();
  return true;
}

// ------------------------------------------------------------------ timers and push

export function addTimer(kind: TimerKind, label: string, durationMs: number): GameTimer {
  const t = startTimer(`${kind}-${randomId()}`, kind, label, clock.now(), durationMs);
  timers.update((list) => [...list.filter((x) => x.doneAt === undefined).slice(-30), t]);
  schedule(t);
  return t;
}

function schedule(t: GameTimer): void {
  if (!get(settings).notifications || t.doneAt !== undefined) return;
  void schedulePush(playerId, t.id, clock.realMsUntil(t.endsAt), `${t.label} är klar`, 'Byborna väntar på dig.');
}

/** Real times change when the speed changes, so every pending notification is sent again. */
export function rescheduleAll(): void {
  for (const t of get(timers)) schedule(t);
}

// ------------------------------------------------------------------ dev menu

export function devGive(what: 'kronor' | 'gold' | 'gems', n: number): void {
  purse.update((p) => ({ ...p, [what]: p[what] + n }));
  log('dev_give', { what, n });
}

export function resetAll(): void {
  log('reset', {});
  void cancelPush(playerId);
  lives.set(createLives(clock.now(), { regenMs: LIFE_REGEN }));
  purse.set({ ...START, kronorSpent: 0 });
  village.set(START_VILLAGE);
  timers.set([]);
  levelStats.set({});
  save('startedAt', clock.now());
  tick();
}
