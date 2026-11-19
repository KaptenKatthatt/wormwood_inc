/**
 * The game's state: clock, lives, currencies, village, timers and settings,
 * persisted on the device. Everything time-based is stored in game time (see
 * time/clock.ts), so the game catches up by itself when it is opened again.
 */
import { get, writable } from 'svelte/store';
import { GameClock, HOUR, MINUTE, type ClockState } from '../time/clock';
import { createLives, fullAt, settleLives, spendLife, type LivesState } from '../time/lives';
import { collectDue, finishNow, remaining, startTimer, type GameTimer, type TimerKind } from '../time/timers';
import { load, randomId, save } from './storage';
import { log } from '../log/logger';
import { cancelPush, schedulePush } from '../push/push';
import { CHALLENGE_COUNT, TOTAL_CHALLENGES } from '../match3/levels';
import { FINALE_GOLD } from '../match3/engine';
import { AWAY_ATTACK_AFTER, SHIELD_GEMS, SHIELD_MAX, THREAT_PUSH_AFTER, WEEKEND_GOLD, claim, canClaim, countWin, declineRepair, repairOffer, repairStreak, tiredFactor, dayHooksActive, dayKey, nextReminder, recordWin, startDaily, weekendEvent, type DailyState, type DayMode, type Gift } from '../daily';
import { formatKr } from '../economy/wallet';
import { GEM_PACKS, PRICE, START, levelReward } from '../economy/shop';
import { BUILDINGS, SIDES, TOWERS, START_VILLAGE, buildBlock, buildTime, goldMultiplier, priceFor, skipGems, topUpGems, withAllBuildings, type BuildingId, type VillageState } from '../economy/village';
import { DEV_MENU, EXPANSION } from '../config/flags';
import { HOOKS, type HookId, type HookResponse } from '../hooks';
import { ATTACK, FALLBACK_MINUTES, OFFER, attackStrength, defence, nextStep, resolveAttack, type AttackResult, type StairEvent, type Step } from '../staircase';
import { BUBBLES, LETTERS, pickLine } from '../voices';
import { tutorialActive } from '../tutorial';
import { DAMAGE_MOOD, pickDamaged, repairGold, repairTime, withDamage, type Damage } from '../damage';

/** A new life every 30 minutes, at most five (Jonas, 2026-11-17). */
export const LIFE_REGEN = 30 * MINUTE;
export const SPEEDS = [1, 15, 60] as const;

export interface Settings {
  speed: number;
  /** Consent to send anonymous playtest events. */
  logging: boolean | null;
  notifications: boolean;
  hooks: Record<HookId, boolean>;
  /** The letters. Paused by default in dev builds while Jonas tests (2026-11-17). */
  letters: boolean;
  /** Day hooks: from the second day ('auto'), always or never. */
  dayMode: DayMode;
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
  letters: storedSettings.letters ?? false,
  dayMode: storedSettings.dayMode ?? 'auto',
});
settings.subscribe((s) => save('settings', s));

// A build without the dev menu always runs in real time with every hook on.
if (!DEV_MENU) settings.update((s) => ({ ...s, speed: 1, hooks: { ...ALL_HOOKS_ON }, letters: true, dayMode: 'auto' }));
if (clock.speed !== get(settings).speed) clock.setSpeed(get(settings).speed);

export const hookOn = (id: HookId): boolean => get(settings).hooks[id] !== false;

/** Game time when this player first opened the game; hook logs count minutes from it. */
export let startedAt: number = load('startedAt', 0) || (() => { const t = clock.now(); save('startedAt', t); return t; })();

export const lives = writable<LivesState>({ ...(load('lives', null) ?? createLives(clock.now())), regenMs: LIFE_REGEN });
lives.subscribe((l) => save('lives', l));

export interface Purse { gold: number; gems: number; kronor: number; kronorSpent: number }
function startPurse(): Purse {
  const help = get(settings).hooks.starterHelp !== false;
  return { gold: help ? START.gold : 0, gems: help ? START.gems : 0, kronor: START.kronor, kronorSpent: 0 };
}
/** Without the starter help the free 5-second builds are skipped. */
const startVillage = (): VillageState => ({ ...START_VILLAGE, builds: get(settings).hooks.starterHelp !== false ? 0 : 2 });

export const purse = writable<Purse>(load('purse', null) ?? startPurse());
purse.subscribe((p) => save('purse', p));

export const village = writable<VillageState>(withAllBuildings(load('village', null) ?? startVillage()));
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
export function toast(text: string, ms = 3500): void {
  const id = randomId();
  toasts.update((t) => [...t, { id, text }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), ms);
}

/** A tip shown once per player, the first time something matters (instead of a long introduction). */
/** True the first time it is asked for this id, then never again (shares the tips list). */
export function firstTime(id: string): boolean {
  const seen = load<string[]>('tips', []);
  if (seen.includes(id)) return false;
  save('tips', [...seen, id]);
  log('tip', { tip: id });
  return true;
}

export function tipOnce(id: string, text: string): void {
  const seen = load<string[]>('tips', []);
  if (seen.includes(id)) return;
  save('tips', [...seen, id]);
  toast(text, 6500);
  log('tip', { tip: id });
}

/** The shop overlay; `reason` says why it opened (logged). */
export const shopOpen = writable<null | { reason: string }>(null);

// ------------------------------------------------------------------ the expansion's hooks into the game

/**
 * The expansion (state/expansion.ts) listens here instead of being imported,
 * so the two modules do not import each other. Plain functions, set once.
 */
export interface WinInfo { level: number; stars: number; gold: number }
export const expansionHooks: {
  onWin: (info: WinInfo) => void;
  onLoss: (level: number) => void;
  onReset: () => void;
  onReturn: (awayMs: number) => void;
  onAwayPush: () => void;
  onTick: () => void;
  goldBonus: () => number;
} = { onWin: () => {}, onLoss: () => {}, onReset: () => {}, onReturn: () => {}, onAwayPush: () => {}, onTick: () => {}, goldBonus: () => 0 };

/** Others that want to know about a win or a reset (the Christmas event). */
export const winListeners: ((info: WinInfo) => void)[] = [];
export const resetListeners: (() => void)[] = [];

/** The last challenge on the road: 40 in the pilot, 200 with the expansion. */
export const LAST_CHALLENGE = EXPANSION ? TOTAL_CHALLENGES : CHALLENGE_COUNT;

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
  stairTick();
  expansionHooks.onTick();
}

function onTimerDone(t: GameTimer): void {
  log('timer_done', { id: t.id, kind: t.kind });
  const v = get(village);
  if (t.kind === 'build' && v.construction?.timerId === t.id) {
    const c = v.construction;
    village.set({ ...v, levels: { ...v.levels, [c.id]: c.toLevel }, construction: null });
    const name = BUILDINGS.find((b) => b.id === c.id)?.name ?? c.id;
    toast(`${name} är klar (nivå ${c.toLevel})`);
    changeMood(c.id === 'kapellet' ? 18 : 8);
    say(pickLine(BUBBLES.built));
  }
  const st = get(stairs);
  const mended = st.damaged.find((d) => d.timerId === t.id);
  if (mended) {
    stairs.set({ ...st, damaged: st.damaged.filter((d) => d !== mended) });
    toast(`${BUILDINGS.find((b) => b.id === mended.id)?.name} är lagad`);
    changeMood(DAMAGE_MOOD);
    log('repair_done', { building: mended.id, minutesIn: minutesIn() });
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

export function spendGems(n: number): boolean {
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
export function payGems(n: number, hook: HookId, offer: Record<string, unknown>): boolean {
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
  const ok = settleLives(get(lives), clock.now()).count > 0;
  if (!ok) stairEvent('noLives');
  return ok;
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

/** The challenge the player is on (1 to CHALLENGE_COUNT); a win moves it on. */
export const challengeNo = writable<number>(load('challengeNo', 1));
challengeNo.subscribe((n) => save('challengeNo', n));

/** Best stars per challenge (Jonas, 2026-11-18); shown on the map. */
export const bestStars = writable<Record<number, number>>(load('bestStars', {}));
bestStars.subscribe((s) => save('bestStars', s));
/** Extra gold for three stars. */
export const THREE_STAR_GOLD = 30;

/** What a win paid, for the dialog. */
/** tired: the share of gold this win paid (1 = full; diminishing rewards). */
export interface WinPay { total: number; base: number; finale: number; starBonus: number; streakBonus: number; stars: number; tired: number }

export function levelWon(levelId: number, extra: Record<string, unknown>, stars = 1, movesLeft = 0): WinPay {
  challengeNo.set(levelId >= LAST_CHALLENGE ? 1 : levelId + 1);
  bestStars.update((b) => ({ ...b, [levelId]: Math.max(b[levelId] ?? 0, stars) }));
  let base = levelReward(levelId, goldMultiplier(effectiveVillage()) + expansionHooks.goldBonus());
  const weekend = dayOn('weekend') && weekendEvent(clock.now()).on;
  if (weekend) base *= WEEKEND_GOLD;
  let finale = movesLeft * FINALE_GOLD;
  // Diminishing rewards: after the day's first wins each win pays less.
  const w = countWin(get(daily), clock.now());
  daily.set(w.state);
  const tired = dayOn('diminishing') ? tiredFactor(w.n) : 1;
  if (tired < 1) {
    base = Math.round(base * tired);
    finale = Math.round(finale * tired);
    logHook('diminishing', { win: w.n, share: tired }, 'shown');
  }
  const starBonus = stars === 3 ? THREE_STAR_GOLD : 0;
  const gold = base + finale + starBonus;
  addGold(gold);
  let streakBonus = 0;
  if (dayOn('streak')) {
    const r = recordWin(get(daily), clock.now(), dayOn('streakShield'));
    daily.set(r.state);
    if (r.shielded) {
      toast(`Svitskyddet räddade din svit! ${r.state.streak} dagar i rad.`, 5000);
      logHook('streakShield', { used: true, streak: r.state.streak, left: r.state.shields }, 'shown');
    }
    if (r.bonus > 0) {
      streakBonus = r.bonus;
      addGold(r.bonus);
      toast(`Svit ${r.state.streak} dagar i rad: +${r.bonus} guld`);
      logHook('streak', { streak: r.state.streak, bonus: r.bonus }, 'shown');
    }
  }
  let gems = 0;
  if (Math.random() < 0.15) { gems = 5; purse.update((p) => ({ ...p, gems: p.gems + gems })); }
  levelStats.update((s) => ({ ...s, [levelId]: { wins: (s[levelId]?.wins ?? 0) + 1, losses: s[levelId]?.losses ?? 0 } }));
  log('level_won', { level: levelId, gold, gems, weekend, streakBonus, stars, movesLeft, tired, minutesIn: minutesIn(), ...extra });
  expansionHooks.onWin({ level: levelId, stars, gold });
  for (const f of winListeners) f({ level: levelId, stars, gold });
  return { total: gold + streakBonus, base, finale, starBonus, streakBonus, stars, tired };
}

/** True while a challenge is on screen: the main menu is hidden then (Jonas, 2026-11-19). */
export const inLevel = writable(false);
/** The menu button in the top bar asks the challenge to open its pause dialog. */
export const levelMenuAsked = writable(false);

export function levelLost(levelId: number, extra: Record<string, unknown>): void {
  loseLife();
  tipOnce('lives', 'Ett liv gick åt. Ett nytt kommer av sig självt efter 30 minuter.');
  stairEvent('loss');
  levelStats.update((s) => ({ ...s, [levelId]: { wins: s[levelId]?.wins ?? 0, losses: (s[levelId]?.losses ?? 0) + 1 } }));
  log('level_lost', { level: levelId, minutesIn: minutesIn(), ...extra });
  expansionHooks.onLoss(levelId);
}

/** Pays for extra moves. The caller adds them to the board. */
// ------------------------------------------------------------------ boosters

export type Booster = 'hammer' | 'shuffle';
/** Free uses left; one of each is a gift at the start (Jonas, 2026-11-17). */
export const freeBoosters = writable<Record<Booster, number>>(load('freeBoosters', { hammer: 1, shuffle: 1 }));
freeBoosters.subscribe((f) => save('freeBoosters', f));

/** Pays for one use (a free one first, then gems; too few gems opens the shop). */
export function payBooster(b: Booster, level: number): boolean {
  const free = get(freeBoosters);
  if (free[b] > 0) {
    freeBoosters.set({ ...free, [b]: free[b] - 1 });
    logHook('boosters', { booster: b, level, free: true }, 'yes');
    return true;
  }
  return payGems(PRICE[b], 'boosters', { booster: b, level });
}

export function canAffordBooster(b: Booster): boolean {
  return get(freeBoosters)[b] > 0 || get(purse).gems >= PRICE[b];
}

export function buyExtraMoves(offer: Record<string, unknown>): boolean {
  return payGems(PRICE.extraMoves, 'extraMoves', offer);
}

// ------------------------------------------------------------------ village

export function startBuild(id: BuildingId): boolean {
  const v = get(village);
  const p = get(purse);
  const block = buildBlock(v, id, p.gold);
  if (block || isDamaged(id)) return false;
  const n = v.builds + 1;
  const cost = priceFor(n, v, id);
  const t = addTimer('build', BUILDINGS.find((b) => b.id === id)!.name, buildTime(n));
  purse.set({ ...p, gold: p.gold - cost });
  village.set({ ...v, builds: n, construction: { id, toLevel: v.levels[id] + 1, timerId: t.id }, last: { ...v.last, [id]: { gold: cost, ms: buildTime(n) } } });
  if (buildTime(n) >= 5 * MINUTE) stairEvent('longBuild');
  if (n >= 2) tipOnce('quit', 'När du vill sluta spela: tryck Avsluta längst ner i byn.');
  log('build_start', { building: id, toLevel: v.levels[id] + 1, buildNo: n, gold: cost, timeMs: buildTime(n), minutesIn: minutesIn() });
  return true;
}

const topUpShown = new Set<string>();
/** Logs once per building and price that the top-up button was offered. */
export function topUpOffered(id: BuildingId, missing: number): void {
  const key = `${id}:${missing}`;
  if (topUpShown.has(key)) return;
  topUpShown.add(key);
  logHook('topUpGold', { building: id, missing, gems: topUpGems(missing) }, 'shown');
}

/** Pays gems for the missing gold and starts the build. */
export function topUpAndBuild(id: BuildingId): boolean {
  const v = get(village);
  const missing = priceFor(v.builds + 1, v, id) - get(purse).gold;
  if (missing <= 0) return startBuild(id);
  if (!payGems(topUpGems(missing), 'topUpGold', { building: id, missing })) return false;
  addGold(missing);
  return startBuild(id);
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
  purse.set(startPurse());
  village.set(startVillage());
  stairs.set(startStairs(clock.now()));
  letter.set(null);
  timers.set([]);
  levelStats.set({});
  freeBoosters.set({ hammer: 1, shuffle: 1 });
  challengeNo.set(1);
  bestStars.set({});
  daily.set(startDaily(clock.now()));
  awayReport.set(null);
  startedAt = clock.now();
  save('startedAt', startedAt);
  save('welcomed', false);
  expansionHooks.onReset();
  for (const f of resetListeners) f();
  tick();
}

// ------------------------------------------------------------------ the hook staircase

export interface StairState {
  step: Step;
  /** Minutes in when each step was reached. */
  reached: Partial<Record<Step, number>>;
  offer: { endsAt: number; status: 'open' | 'bought' | 'expired' } | null;
  /** side: 0 north, 1 east, 2 south, 3 west (which tower takes the brunt). */
  attack: { hitsAt: number; strength: number; side?: number; result?: AttackResult } | null;
  soldiers: number;
  shieldUntil: number;
  /** Buildings damaged by a lost attack, each until it is repaired. */
  damaged: Damage[];
  /** The villagers' mood, 0 to 100. */
  mood: number;
  lastSeen: number;
}

function startStairs(t: number): StairState {
  return { step: 1, reached: { 1: 0 }, offer: null, attack: null, soldiers: 0, shieldUntil: 0, damaged: [], mood: 60, lastSeen: t };
}

/** A save from before 2026-11-19 held one damaged building or null. */
function withDamageList(s: StairState): StairState {
  const d = s.damaged as unknown;
  return Array.isArray(d) ? s : { ...s, damaged: d ? [d as Damage] : [] };
}
export const stairs = writable<StairState>(withDamageList(load('stairs', null) ?? startStairs(clock.now())));
stairs.subscribe((s) => save('stairs', s));

/** The advisor's letter on screen, if any. */
export const letter = writable<null | { text: string; key: string }>(null);
/** A villager's speech bubble in the village. */
export const bubble = writable<string | null>(null);
let bubbleTimer: ReturnType<typeof setTimeout> | undefined;

export function say(text: string): void {
  if (!hookOn('figures')) return;
  bubble.set(text);
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.set(null), 5000);
}

export function writeLetter(key: keyof typeof LETTERS): void {
  if (!hookOn('figures') || !get(settings).letters) return;
  letter.set({ text: LETTERS[key], key: String(key) });
  logHook('figures', { letter: key }, 'shown');
}

export function changeMood(delta: number): void {
  stairs.update((s) => ({ ...s, mood: Math.max(0, Math.min(100, Math.round(s.mood + delta))) }));
}

/** The village as its bonuses count it: a damaged building gives half until it is repaired. */
export function effectiveVillage(): VillageState {
  return withDamage(get(village), get(stairs).damaged);
}

export function isDamaged(id: BuildingId): boolean {
  return get(stairs).damaged.some((d) => d.id === id);
}

/** What the repair of a building costs: from its last upgrade, or today's price for an older save. */
export function repairPrice(id: BuildingId): { gold: number; ms: number } {
  const v = get(village);
  const last = v.last?.[id] ?? { gold: priceFor(Math.max(1, v.builds), v, id), ms: buildTime(Math.max(1, v.builds)) };
  return { gold: repairGold(last.gold), ms: repairTime(last.ms) };
}

/** The player starts the repair of a damaged building and pays its gold. */
export function startRepair(id: BuildingId): boolean {
  const st = get(stairs);
  const d = st.damaged.find((x) => x.id === id);
  if (!d || d.timerId) return false;
  const price = repairPrice(id);
  const p = get(purse);
  if (p.gold < price.gold) { toast('För lite guld'); return false; }
  purse.set({ ...p, gold: p.gold - price.gold });
  const name = BUILDINGS.find((b) => b.id === id)?.name ?? id;
  const t = addTimer('other', `${name} lagas`, price.ms);
  stairs.set({ ...get(stairs), damaged: st.damaged.map((x) => (x.id === id ? { ...x, timerId: t.id } : x)) });
  log('repair_started', { building: id, gold: price.gold, timeMs: price.ms, minutesIn: minutesIn() });
  return true;
}

/** Moves the staircase on, on an event or by the clock. */
export function stairEvent(event?: StairEvent): void {
  if (tutorialActive() && event !== 'quit') return; // the introduction is not part of the staircase
  const st = get(stairs);
  const mins = minutesIn();
  const step = nextStep(st.step, mins, event);
  if (step === st.step) return;
  stairs.set({ ...st, step, reached: { ...st.reached, [step]: mins } });
  log('step', { step, from: st.step, event: event ?? 'clock', minutesIn: mins });
  if (event !== 'quit') writeLetter(step);
  if (step >= 4) openOffer();
}

function realMs(ms: number): number {
  // Countdowns the player must react to run in real seconds, whatever the clock speed.
  return ms * clock.speed;
}

function openOffer(): void {
  const st = get(stairs);
  if (st.offer || !hookOn('timedOffer')) return;
  stairs.set({ ...st, offer: { endsAt: clock.now() + realMs(OFFER.lastsMs), status: 'open' } });
  offerOpen.set(true);
  logHook('timedOffer', { gems: OFFER.gems, gold: OFFER.gold }, 'shown');
}

/** The starter pack dialog on screen. */
export const offerOpen = writable(false);

export function buyOffer(): boolean {
  const st = get(stairs);
  if (st.offer?.status !== 'open') return false;
  if (!payGems(OFFER.gems, 'timedOffer', { leftMs: st.offer.endsAt - clock.now() })) return false;
  addGold(OFFER.gold);
  lives.update((l) => ({ ...settleLives(l, clock.now()), count: l.max, regenFrom: clock.now() }));
  stairs.set({ ...st, offer: { ...st.offer, status: 'bought' } });
  log('purchase', { item: 'starterPack', gems: OFFER.gems });
  offerOpen.set(false);
  toast(`+${OFFER.gold} guld och fulla liv`);
  return true;
}

export function dismissOffer(): void {
  logHook('timedOffer', { leftMs: (get(stairs).offer?.endsAt ?? 0) - clock.now() }, 'no');
  offerOpen.set(false);
}

function stairTick(): void {
  if (tutorialActive()) return;
  const now = clock.now();
  stairEvent();
  const st = get(stairs);
  // the offer runs out
  if (st.offer?.status === 'open' && now >= st.offer.endsAt) {
    stairs.set({ ...st, offer: { ...st.offer, status: 'expired' } });
    offerOpen.set(false);
    logHook('timedOffer', {}, 'expired');
  }
  // the attack comes at minute 12 (not when step 5 was reached by trying to quit)
  const s2 = get(stairs);
  if (s2.step === 5 && !s2.attack && minutesIn() >= FALLBACK_MINUTES[5] && hookOn('attack')) startAttack();
  const s3 = get(stairs);
  if (s3.attack && !s3.attack.result && now >= s3.attack.hitsAt) hitAttack();
}

function startAttack(): void {
  const st = get(stairs);
  const v = effectiveVillage();
  const side = Math.floor(Math.random() * 4);
  const strength = attackStrength(defenceOf(v, st.soldiers, side));
  stairs.set({ ...st, attack: { hitsAt: clock.now() + realMs(ATTACK.warningMs), strength, side } });
  writeLetter(5);
  say(pickLine(BUBBLES.worried));
  logHook('attack', { strength, side: SIDES[side], defence: defenceOf(v, st.soldiers, side) }, 'shown');
}

function defenceOf(v: VillageState, soldiers: number, side: number): number {
  return defence(soldiers, TOWERS.map((t) => v.levels[t] ?? 0), side, v.levels.smedjan ?? 0);
}

/** The defence against the coming attack (or from the north when none is coming). */
export function currentDefence(side = get(stairs).attack?.side ?? 0): number {
  return defenceOf(effectiveVillage(), get(stairs).soldiers, side);
}

export function buyShield(): boolean {
  if (!payGems(ATTACK.shieldGems, 'attack', { item: 'shield' })) return false;
  stairs.update((s) => ({ ...s, shieldUntil: clock.now() + ATTACK.shieldMs }));
  toast('Byn har en sköld i 8 timmar');
  return true;
}

export function trainSoldier(): boolean {
  if (get(village).levels.kasernen < 1) return false;
  const p = get(purse);
  if (p.gold < ATTACK.soldierGold) { toast('För lite guld'); return false; }
  purse.set({ ...p, gold: p.gold - ATTACK.soldierGold });
  stairs.update((s) => ({ ...s, soldiers: s.soldiers + 1 }));
  log('soldier', { soldiers: get(stairs).soldiers, minutesIn: minutesIn() });
  return true;
}

/** A lost attack: some gold goes and one to three buildings are damaged, nearest the attack's side first. */
function applyAttackLoss(side: number, def: number, strength: number): { goldLost: number; damaged: BuildingId[] } {
  const p = get(purse);
  const goldLost = Math.round(p.gold * ATTACK.goldLoss);
  purse.set({ ...p, gold: p.gold - goldLost });
  const st = get(stairs);
  const hit = pickDamaged(get(village), st.damaged, side, def, strength);
  stairs.set({ ...st, damaged: [...st.damaged, ...hit.map((id) => ({ id }))] });
  changeMood(-DAMAGE_MOOD * hit.length);
  for (const id of hit) log('building_damaged', { building: id, side: SIDES[side], defence: def, strength, minutesIn: minutesIn() });
  return { goldLost, damaged: hit };
}

const names = (ids: BuildingId[]): string => ids.map((id) => BUILDINGS.find((b) => b.id === id)?.name ?? id).join(', ');

function hitAttack(): void {
  const st = get(stairs);
  if (!st.attack) return;
  const def = currentDefence();
  const result = resolveAttack(st.attack.strength, def, st.shieldUntil > clock.now());
  if (result === 'lost') {
    const loss = applyAttackLoss(st.attack.side ?? 0, def, st.attack.strength);
    const lost = loss.goldLost;
    const damaged = loss.damaged;
    changeMood(-25);
    writeLetter('attackLost');
    say(pickLine(BUBBLES.lost));
    log('attack_result', { result, strength: st.attack.strength, defence: def, goldLost: lost, damaged, minutesIn: minutesIn() });
  } else {
    changeMood(10);
    if (result === 'defended') writeLetter('defended');
    log('attack_result', { result, strength: st.attack.strength, defence: def, minutesIn: minutesIn() });
  }
  stairs.set({ ...get(stairs), attack: { ...st.attack, result } });
}

export function skipRepair(id: BuildingId): boolean {
  const d = get(stairs).damaged.find((x) => x.id === id);
  const t = d && get(timers).find((x) => x.id === d.timerId);
  if (!d || !t) return false;
  const left = remaining(t, clock.now());
  if (!payGems(skipGems(left), 'skipWait', { repair: d.id, leftMs: left })) return false;
  log('repair_skipped_with_gems', { building: d.id, gems: skipGems(left), leftMs: left, minutesIn: minutesIn() });
  timers.update((list) => finishNow(list, t.id, clock.now()));
  tick();
  return true;
}

/** Called when the game is opened again: the villagers missed the player. */
export function welcomeBack(): void {
  const st = get(stairs);
  const away = clock.now() - st.lastSeen;
  awayAttack(away);
  expansionHooks.onReturn(away);
  if (away > 60 * MINUTE) {
    changeMood(-Math.min(30, Math.floor(away / (60 * MINUTE)) * 5));
    say(pickLine(BUBBLES.sad));
  }
  stairs.update((s) => ({ ...s, lastSeen: clock.now() }));
}

export function markSeen(): void {
  stairs.update((s) => ({ ...s, lastSeen: clock.now() }));
}

// ------------------------------------------------------------------ day hooks (the week at home)

export const daily = writable<DailyState>(load('daily', startDaily(clock.now())));
daily.subscribe((d) => save('daily', d));
export const calendarOpen = writable(false);
/** What happened while the player was away, shown once on return. */
export const awayReport = writable<null | { result: 'shielded' | 'defended' | 'lost'; goldLost: number; damaged: string | null; hours: number }>(null);

export function dayHooksOn(): boolean {
  return dayHooksActive(get(daily), clock.now(), get(settings).dayMode);
}
export function dayOn(id: HookId): boolean {
  return dayHooksOn() && hookOn(id);
}

/** The broken streak that can be repaired today (streak protection), shown before the calendar. */
export const streakRepair = writable<null | { streak: number; price: number }>(null);

/** Opens the calendar when today's gift is waiting (not during the introduction). */
export function offerCalendar(): void {
  if (tutorialActive() || get(calendarOpen) || get(streakRepair)) return;
  if (dayOn('streak') && dayOn('streakShield')) {
    const o = repairOffer(get(daily), clock.now());
    if (o) {
      streakRepair.set(o);
      logHook('streakShield', { repair: true, ...o }, 'shown');
      return;
    }
  }
  if (dayOn('calendar') && canClaim(get(daily), clock.now())) {
    calendarOpen.set(true);
    logHook('calendar', { day: get(daily).claimed + 1 }, 'shown');
  }
}

/** Answers the repair offer; returns false when the gems are not enough. */
export function answerRepair(pay: boolean): boolean {
  const o = get(streakRepair);
  if (!o) return true;
  if (pay) {
    if (!payGems(o.price, 'streakShield', { repair: true, ...o })) return false;
    daily.set(repairStreak(get(daily), clock.now()));
    toast(`Sviten är lagad: ${o.streak} dagar i rad. Klara en utmaning i dag så fortsätter den.`, 5000);
  } else {
    daily.set(declineRepair(get(daily), clock.now()));
    logHook('streakShield', { repair: true, ...o }, 'no');
  }
  streakRepair.set(null);
  offerCalendar();
  return true;
}

/** Buys a streak shield ahead (at most SHIELD_MAX in store). */
export function buyStreakShield(): boolean {
  const d = get(daily);
  if ((d.shields ?? 0) >= SHIELD_MAX) return false;
  if (!payGems(SHIELD_GEMS, 'streakShield', { buy: true, had: d.shields ?? 0 })) return false;
  daily.update((x) => ({ ...x, shields: (x.shields ?? 0) + 1 }));
  toast('Svitskydd köpt. Det räddar sviten om du missar en dag.');
  return true;
}

export function claimGift(): Gift | null {
  const r = claim(get(daily), clock.now());
  if (!r) return null;
  daily.set(r.state);
  const g = r.gift;
  purse.update((p) => ({ ...p, gold: p.gold + (g.gold ?? 0), gems: p.gems + (g.gems ?? 0) }));
  if (g.shieldHours) stairs.update((s) => ({ ...s, shieldUntil: Math.max(s.shieldUntil, clock.now()) + g.shieldHours! * HOUR }));
  logHook('calendar', { day: r.state.claimed, gift: g }, 'yes');
  return g;
}

/** On return: if the player was away long enough, the neighbours attacked meanwhile. */
function awayAttack(away: number): void {
  if (away < AWAY_ATTACK_AFTER || !dayOn('awayAttack') || tutorialActive()) return;
  const v = get(village);
  if (!BUILDINGS.some((b) => v.levels[b.id] > 0)) return;
  const st = get(stairs);
  const side = Math.floor(Math.random() * 4);
  const def = currentDefence(side);
  const strength = attackStrength(def);
  const result = resolveAttack(strength, def, st.shieldUntil > clock.now());
  let goldLost = 0;
  let damaged: string | null = null;
  if (result === 'lost') {
    const loss = applyAttackLoss(side, def, strength);
    goldLost = loss.goldLost;
    damaged = loss.damaged.length ? names(loss.damaged) : null;
    changeMood(-20);
  }
  awayReport.set({ result, goldLost, damaged, hours: Math.round(away / HOUR) });
  logHook('awayAttack', { result, goldLost, damaged, hoursAway: Math.round(away / HOUR) }, 'shown');
}

const AWAY_PUSH_IDS = ['lives-full', 'calendar', 'threat'];

/** When the game goes to the background: the notifications that pull the player back. */
export function scheduleAwayPushes(): void {
  if (!get(settings).notifications || !dayOn('dayPush')) return;
  const now = clock.now();
  const full = fullAt(settleLives(get(lives), now), now);
  if (full !== null) void schedulePush(playerId, 'lives-full', clock.realMsUntil(full), 'Liven är fulla igen', 'Fem nya försök väntar på dig.');
  if (dayOn('calendar') && get(daily).claimed < 7) {
    void schedulePush(playerId, 'calendar', Math.max(60_000, nextReminder(Date.now()) - Date.now()), 'Dagens gåva väntar', 'Hämta den innan dagen är slut.');
  }
  if (dayOn('awayAttack')) void schedulePush(playerId, 'threat', THREAT_PUSH_AFTER, 'Grannbyn närmar sig', 'Byborna undrar var du är.');
  expansionHooks.onAwayPush();
  log('push_scheduled', { lives: full !== null, day: dayKey(now) });
}

/** Dev menu: pretend the player was away for 24 hours (attack, sad villagers). */
export function devAway(): void {
  stairs.update((s) => ({ ...s, lastSeen: clock.now() - 24 * HOUR }));
  welcomeBack();
}

/** Dev menu: pretend the player missed yesterday (the streak breaks; repair or shield). */
export function devMissDay(): void {
  daily.update((d) => {
    const two = dayKey(clock.now() - 48 * HOUR);
    return { ...d, firstDay: two < d.firstDay ? two : d.firstDay, lastClaimDay: null, lastWinDay: d.lastWinDay ? two : null, repairAsked: null, streak: Math.max(d.streak, 3) };
  });
  offerCalendar();
}

/** Dev menu: pretend a new day began (the calendar gift is waiting again, day hooks on). */
export function devNewDay(): void {
  daily.update((d) => {
    const y = dayKey(clock.now() - 24 * HOUR);
    return { ...d, firstDay: d.firstDay === dayKey(clock.now()) ? y : d.firstDay, lastClaimDay: null, lastWinDay: d.lastWinDay ? y : null, winsDay: null, winsToday: 0, repairAsked: null };
  });
  offerCalendar();
}

export function cancelAwayPushes(): void {
  for (const id of AWAY_PUSH_IDS) void cancelPush(playerId, id);
}

// ------------------------------------------------------------------ quitting and the survey

export const quitFlow = writable<null | 'nag' | 'survey' | 'thanks'>(null);

export function pressQuit(): void {
  stairEvent('quit');
  log('quit_pressed', { minutesIn: minutesIn(), step: get(stairs).step });
  if (hookOn('guilt')) {
    changeMood(-5);
    say(pickLine(BUBBLES.sad));
    logHook('guilt', { minutesIn: minutesIn() }, 'shown');
    quitFlow.set('nag');
  } else {
    quitFlow.set('survey');
  }
}

export function answerNag(stay: boolean): void {
  logHook('guilt', { minutesIn: minutesIn() }, stay ? 'yes' : 'no');
  quitFlow.set(stay ? null : 'survey');
  if (stay) changeMood(5);
}

export interface SurveyAnswer { step: Step; pressure: number | null; wouldQuit: boolean | null }

export function submitSurvey(answers: SurveyAnswer[]): void {
  log('survey', { answers, minutesIn: minutesIn(), stepReached: get(stairs).step, purse: get(purse) });
  quitFlow.set('thanks');
}

/** The welcome letter, once per player: the first time they open the village on their own after the introduction. */
export function firstLetter(): void {
  if (load('welcomed', false)) return;
  save('welcomed', true);
  writeLetter(1);
}

/** Dev menu: jump to a step now. */
export function devStep(step: Step): void {
  const st = get(stairs);
  if (step <= st.step) return;
  stairs.set({ ...st, step, reached: { ...st.reached, [step]: minutesIn() } });
  log('step', { step, from: st.step, event: 'dev', minutesIn: minutesIn() });
  writeLetter(step);
  if (step >= 4) openOffer();
  if (step === 5 && hookOn('attack') && !get(stairs).attack) startAttack();
}

/** After the introduction: minute 0 of the hook staircase is now. */
export function restartHookClock(): void {
  startedAt = clock.now();
  save('startedAt', startedAt);
  stairs.update((s) => ({ ...s, step: 1, reached: { 1: 0 } }));
  log('hook_clock_start', {});
}
