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
import { BUILDINGS, START_VILLAGE, buildBlock, buildCost, buildTime, goldMultiplier, skipGems, topUpGems, type BuildingId, type VillageState } from '../economy/village';
import { DEV_MENU } from '../config/flags';
import { HOOKS, type HookId, type HookResponse } from '../hooks';
import { ATTACK, OFFER, attackStrength, defence, nextStep, resolveAttack, type AttackResult, type StairEvent, type Step } from '../staircase';
import { BUBBLES, LETTERS, pickLine } from '../voices';
import { tutorialActive } from '../tutorial';

export const LIFE_REGEN = 20 * MINUTE;
export const SPEEDS = [1, 15, 60] as const;

export interface Settings {
  speed: number;
  /** Consent to send anonymous playtest events. */
  logging: boolean | null;
  notifications: boolean;
  hooks: Record<HookId, boolean>;
  /** The uncle's letters. Paused by default in dev builds while Jonas tests (2026-11-17). */
  letters: boolean;
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
});
settings.subscribe((s) => save('settings', s));

// A build without the dev menu always runs in real time with every hook on.
if (!DEV_MENU) settings.update((s) => ({ ...s, speed: 1, hooks: { ...ALL_HOOKS_ON }, letters: true }));
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

export const village = writable<VillageState>(load('village', null) ?? startVillage());
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
  stairTick();
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
  if (st.damaged?.timerId === t.id) {
    stairs.set({ ...st, damaged: null });
    toast(`${BUILDINGS.find((b) => b.id === st.damaged!.id)?.name} är lagad`);
    changeMood(10);
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

export function levelWon(levelId: number, extra: Record<string, unknown>): number {
  const gold = levelReward(levelId, goldMultiplier(effectiveVillage()));
  addGold(gold);
  let gems = 0;
  if (Math.random() < 0.15) { gems = 5; purse.update((p) => ({ ...p, gems: p.gems + gems })); }
  levelStats.update((s) => ({ ...s, [levelId]: { wins: (s[levelId]?.wins ?? 0) + 1, losses: s[levelId]?.losses ?? 0 } }));
  log('level_won', { level: levelId, gold, gems, minutesIn: minutesIn(), ...extra });
  return gold;
}

export function levelLost(levelId: number, extra: Record<string, unknown>): void {
  loseLife();
  stairEvent('loss');
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
  if (buildTime(n) >= 5 * MINUTE) stairEvent('longBuild');
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
  const missing = buildCost(v.builds + 1) - get(purse).gold;
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
  startedAt = clock.now();
  save('startedAt', startedAt);
  save('welcomed', false);
  tick();
}

// ------------------------------------------------------------------ the hook staircase

export interface StairState {
  step: Step;
  /** Minutes in when each step was reached. */
  reached: Partial<Record<Step, number>>;
  offer: { endsAt: number; status: 'open' | 'bought' | 'expired' } | null;
  attack: { hitsAt: number; strength: number; result?: AttackResult } | null;
  soldiers: number;
  shieldUntil: number;
  damaged: { id: BuildingId; timerId: string } | null;
  /** The villagers' mood, 0 to 100. */
  mood: number;
  lastSeen: number;
}

function startStairs(t: number): StairState {
  return { step: 1, reached: { 1: 0 }, offer: null, attack: null, soldiers: 0, shieldUntil: 0, damaged: null, mood: 60, lastSeen: t };
}

export const stairs = writable<StairState>(load('stairs', null) ?? startStairs(clock.now()));
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

function writeLetter(key: keyof typeof LETTERS): void {
  if (!hookOn('figures') || !get(settings).letters) return;
  letter.set({ text: LETTERS[key], key: String(key) });
  logHook('figures', { letter: key }, 'shown');
}

export function changeMood(delta: number): void {
  stairs.update((s) => ({ ...s, mood: Math.max(0, Math.min(100, Math.round(s.mood + delta))) }));
}

/** Village with a damaged building counted as level 0 (no bonus while it is broken). */
export function effectiveVillage(): VillageState {
  const v = get(village);
  const d = get(stairs).damaged;
  return d ? { ...v, levels: { ...v.levels, [d.id]: 0 } } : v;
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
  if (s2.step === 5 && !s2.attack && minutesIn() >= 12 && hookOn('attack')) startAttack();
  const s3 = get(stairs);
  if (s3.attack && !s3.attack.result && now >= s3.attack.hitsAt) hitAttack();
}

function startAttack(): void {
  const st = get(stairs);
  const v = effectiveVillage();
  const strength = attackStrength(defence(st.soldiers, v.levels.vakttornet));
  stairs.set({ ...st, attack: { hitsAt: clock.now() + realMs(ATTACK.warningMs), strength } });
  writeLetter(5);
  say(pickLine(BUBBLES.worried));
  logHook('attack', { strength, defence: defence(st.soldiers, v.levels.vakttornet) }, 'shown');
}

export function currentDefence(): number {
  return defence(get(stairs).soldiers, effectiveVillage().levels.vakttornet);
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

function hitAttack(): void {
  const st = get(stairs);
  if (!st.attack) return;
  const def = currentDefence();
  const result = resolveAttack(st.attack.strength, def, st.shieldUntil > clock.now());
  let damaged = st.damaged;
  if (result === 'lost') {
    const p = get(purse);
    const lost = Math.round(p.gold * ATTACK.goldLoss);
    purse.set({ ...p, gold: p.gold - lost });
    const v = get(village);
    const built = BUILDINGS.filter((b) => v.levels[b.id] > 0 && b.id !== 'stugan');
    const target = (built.length ? built : BUILDINGS.filter((b) => v.levels[b.id] > 0))[0];
    if (target && !damaged) {
      const t = addTimer('other', `${target.name} lagas`, ATTACK.repairMs);
      damaged = { id: target.id, timerId: t.id };
    }
    changeMood(-25);
    writeLetter('attackLost');
    say(pickLine(BUBBLES.lost));
    log('attack_result', { result, strength: st.attack.strength, defence: def, goldLost: lost, damaged: damaged?.id, minutesIn: minutesIn() });
  } else {
    changeMood(10);
    if (result === 'defended') writeLetter('defended');
    log('attack_result', { result, strength: st.attack.strength, defence: def, minutesIn: minutesIn() });
  }
  stairs.set({ ...get(stairs), attack: { ...st.attack, result }, damaged });
}

export function skipRepair(): boolean {
  const d = get(stairs).damaged;
  const t = d && get(timers).find((x) => x.id === d.timerId);
  if (!d || !t) return false;
  const left = remaining(t, clock.now());
  if (!payGems(skipGems(left), 'skipWait', { repair: d.id, leftMs: left })) return false;
  timers.update((list) => finishNow(list, t.id, clock.now()));
  tick();
  return true;
}

/** Called when the game is opened again: the villagers missed the player. */
export function welcomeBack(): void {
  const st = get(stairs);
  const away = clock.now() - st.lastSeen;
  if (away > 60 * MINUTE) {
    changeMood(-Math.min(30, Math.floor(away / (60 * MINUTE)) * 5));
    say(pickLine(BUBBLES.sad));
  }
  stairs.update((s) => ({ ...s, lastSeen: clock.now() }));
}

export function markSeen(): void {
  stairs.update((s) => ({ ...s, lastSeen: clock.now() }));
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

/** The advisor's welcome, once per player. */
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
