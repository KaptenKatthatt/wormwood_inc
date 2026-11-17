/**
 * The expansion's state and actions (Jonas, 2026-11-17): the week staircase
 * (steps 6-9) with its fifteen hooks, five worlds and the neighbouring
 * villages. It plugs into state/game.ts through `expansionHooks`, so a build
 * without the expansion (VITE_EXPANSION=false, the pilot) behaves exactly as
 * before. Every hook moment is logged with logHook, like the first pass.
 */
import { get, writable } from 'svelte/store';
import { EXPANSION } from '../config/flags';
import { HOUR } from '../time/clock';
import { makeRng } from '../match3/rng';
import { worldOf, WORLDS } from '../match3/levels';
import { dayKey, daysBetween } from '../daily';
import { load, randomId, save } from './storage';
import { log } from '../log/logger';
import { schedulePush } from '../push/push';
import { tutorialActive } from '../tutorial';
import type { HookId } from '../hooks';
import { WEEK_STEPS, starsFor, stepOfHook, weekStepFor, type WeekStep } from '../expansion/week';
import {
  ADS_PER_DAY, ALBUM_REWARD, ALBUM_SIZE, GOLD_PASS_GEMS, HELP_COOLDOWN, HELP_DELAY, LEAGUE_DAYS, LEAGUE_PRIZES, PASS_DAYS,
  SET_REWARD, drawSticker, helpLives, leagueRank, leagueTable, passReward, passTier, passXp, setComplete, stickerName, type PassReward,
} from '../expansion/social';
import {
  CHEST_SLOTS, DRAW_GEMS, ROYAL_CHEST_GEMS, SPIN_GEMS, TEN_DRAW_GEMS, WHEEL, WOOD_CHEST_CHANCE, WOOD_CHEST_TIME,
  championPower, drawChampion, nearJackpot, openChest, spinWheel, type Champion, type ChestKind, type ChestLoot,
} from '../expansion/luck';
import {
  GATE_AT, GATE_SKIP_GEMS, HELPERS, HELPERS_NEEDED, HELPER_ARRIVES, HELPER_GOLD_BONUS, HELPER_MAX, HELPER_PATIENCE, KEEP_HOURS, MERCENARIES,
  NEIGHBOURS, RETAKE_AFTER, RETAKE_CHANCE, RIDERS_AFTER, TROOPS, activeHelpers, battle, fakeFriendEvent, neighbourDefence, personalOffer,
  storehouse, vipBonus, type Army, type BattleResult, type Helper, type Owned, type TroopType,
} from '../expansion/conquest';
import {
  addGold, challengeNo, clock, daily, expansionHooks, hookOn, letter, lives, logHook, payGems, playerId, purse, say, settings, stairs, toast, village,
} from './game';
import { settleLives } from '../time/lives';
import { skipGems } from '../economy/village';

const rng = (): number => Math.random();

export interface ExpState {
  /** The week step reached (5 = only the first pass's staircase so far) and when each was reached (game time). */
  step: 5 | WeekStep;
  reached: Partial<Record<WeekStep, number>>;
  maxWorld: number;
  stars: Record<number, number>;
  league: { seed: number; startedAt: number; points: number; done: boolean; lastRank: number } | null;
  album: number[];
  dupes: number;
  setsRewarded: number[];
  albumRewarded: boolean;
  pass: { startedAt: number; xp: number; gold: boolean; claimedFree: number[]; claimedGold: number[] } | null;
  help: { arrivesAt: number; lives: number } | null;
  lastHelp: number;
  ads: { day: string; count: number };
  chests: { id: string; kind: ChestKind; readyAt: number }[];
  wheelFreeDay: string | null;
  champions: Record<string, number>;
  pity: number;
  freeDraws: number;
  knekt: number;
  ryttare: number;
  mercs: number;
  /** Game time when knights and riders came out (power creep). */
  eras: { knekt?: number; ryttare?: number };
  owned: Owned[];
  offerDay: string | null;
  helpers: Helper[];
  gateOpen: boolean;
  fakeDay: { day: string; count: number };
}

function start(): ExpState {
  return {
    step: 5, reached: {}, maxWorld: 1, stars: {}, league: null, album: [], dupes: 0, setsRewarded: [], albumRewarded: false, pass: null,
    help: null, lastHelp: 0, ads: { day: '', count: 0 }, chests: [], wheelFreeDay: null, champions: {}, pity: 0, freeDraws: 0,
    knekt: 0, ryttare: 0, mercs: 0, eras: {}, owned: [], offerDay: null, helpers: [], gateOpen: false, fakeDay: { day: '', count: 0 },
  };
}

export const exp = writable<ExpState>({ ...start(), ...load<Partial<ExpState>>('expansion', {}) });
exp.subscribe((s) => save('expansion', s));

/** Overlays the expansion opens. */
export const hubOpen = writable<null | 'liga' | 'pass' | 'album' | 'kistor' | 'hjul' | 'kampar'>(null);
export const adOpen = writable<null | { reward: 'life' | 'double'; gold?: number }>(null);
export const offerShown = writable<null | ReturnType<typeof personalOffer>>(null);
export const friendNote = writable<null | { text: string; lives: number }>(null);
export const gateOpenDialog = writable(false);

const now = (): number => clock.now();

// ------------------------------------------------------------------ the week staircase

export function testDay(): number {
  return daysBetween(get(daily).firstDay, dayKey(now())) + 1;
}

/** Is this expansion hook on now: built in, switched on, and its step reached? */
export function weekOn(id: HookId): boolean {
  if (!EXPANSION || !hookOn(id) || tutorialActive()) return false;
  const step = stepOfHook(id);
  return step === 0 || get(exp).step >= step;
}

export const STEP_LETTERS: Record<WeekStep, string> = {
  6: 'Grannbyarna har hört talas om dig! De vill gärna tävla lite, och de hjälper dig gärna om du hjälper dem.',
  7: 'Jag hittade några gamla kistor på vinden. Man vet aldrig vad som finns i dem, och det är det som är det roliga.',
  8: 'Byarna runt omkring saknar någon som du som tar hand om dem. Tänk så mycket mer byn kunde bli.',
  9: 'Grannarna har blivit som en familj för dig. Glöm inte bort dem nu, de räknar med dig.',
};

function setStep(step: WeekStep, event: string): void {
  const s = get(exp);
  if (step <= s.step) return;
  const reached = { ...s.reached };
  for (const d of WEEK_STEPS) if (d.step <= step && reached[d.step] === undefined) reached[d.step] = now();
  exp.set({ ...s, step, reached });
  log('week_step', { step, from: s.step, event, testDay: testDay(), world: s.maxWorld });
  if (hookOn('figures') && get(settings).letters) {
    letter.set({ text: STEP_LETTERS[step], key: `week${step}` });
    logHook('figures', { letter: `week${step}` }, 'shown');
  }
  onStepStarted(step);
}

function onStepStarted(step: WeekStep): void {
  const s = get(exp);
  if (step >= 6 && !s.league) exp.update((x) => ({ ...x, league: { seed: Math.floor(rng() * 2 ** 31), startedAt: now(), points: 0, done: false, lastRank: 10 } }));
  if (step >= 6 && !s.pass) exp.update((x) => ({ ...x, pass: { startedAt: now(), xp: 0, gold: false, claimedFree: [], claimedGold: [] } }));
  if (step >= 7 && s.chests.length === 0 && hookOn('chests')) {
    // a first chest as a taste
    exp.update((x) => ({ ...x, chests: [{ id: randomId(), kind: 'wood', readyAt: now() + 5 * 60_000 }] }));
  }
  if (step >= 8 && !s.eras.knekt) {
    exp.update((x) => ({ ...x, eras: { ...x.eras, knekt: now() } }));
    if (hookOn('powerCreep')) {
      toast('Nyhet: knektar! De är dubbelt så starka som bondesoldater.', 6000);
      logHook('powerCreep', { troop: 'knekt' }, 'shown');
    }
  }
  if (step >= 8) maybePersonalOffer();
}

/** Checks the clock and the world; called every second. */
function weekTick(): void {
  if (!EXPANSION || tutorialActive()) return;
  const s = get(exp);
  const step = weekStepFor(testDay(), s.maxWorld);
  if (step > s.step) setStep(step as WeekStep, testDay() >= (WEEK_STEPS.find((d) => d.step === step)?.day ?? 99) ? 'day' : 'world');
  // riders two days after the knights (or with world 5)
  const e = get(exp).eras;
  if (e.knekt && !e.ryttare && (now() - e.knekt >= RIDERS_AFTER || get(exp).maxWorld >= 5)) {
    exp.update((x) => ({ ...x, eras: { ...x.eras, ryttare: now() } }));
    if (hookOn('powerCreep')) {
      toast('Nyhet: ryttare! Grannbyarna har rustat upp, och knektarna räcker inte längre.', 7000);
      logHook('powerCreep', { troop: 'ryttare' }, 'shown');
    }
  }
  settleLeague();
  settleHelp();
}

/** Dev menu: jump to a week step now. */
export function devWeekStep(step: WeekStep): void {
  setStep(step, 'dev');
}

// ------------------------------------------------------------------ worlds and stars

export function recordWorld(next: number): void {
  const w = worldOf(next).id;
  const s = get(exp);
  if (w <= s.maxWorld) return;
  exp.set({ ...s, maxWorld: w });
  village.update((v) => ({ ...v, world: Math.max(v.world ?? 1, w) }));
  const world = WORLDS[w - 1];
  toast(`Ny värld: ${world.name}! Byn får en ny tomt.`, 6000);
  log('world_reached', { world: w, testDay: testDay() });
}

export function starsOf(level: number): number {
  return get(exp).stars[level] ?? 0;
}

export function computeStars(movesLeft: number, movesGiven: number): number {
  return EXPANSION && hookOn('stars') ? starsFor(movesLeft, movesGiven) : 3;
}

// ------------------------------------------------------------------ step 6: league, album, pass, help, ads

export function leagueRows() {
  const l = get(exp).league;
  return l ? leagueTable(l.seed, l.startedAt, now(), l.points) : [];
}

function settleLeague(): void {
  const l = get(exp).league;
  if (!l || l.done) return;
  const rows = leagueTable(l.seed, l.startedAt, now(), l.points);
  const rank = leagueRank(rows);
  if (rank > l.lastRank && weekOn('league')) {
    const passer = rows[rank - 2];
    toast(`${passer.name} gick förbi dig i veckoligan!`, 5000);
    logHook('league', { event: 'overtaken', rank, by: passer.name }, 'shown');
  }
  if (now() - l.startedAt >= LEAGUE_DAYS * 24 * HOUR) {
    const prize = LEAGUE_PRIZES[rank - 1] ?? 0;
    if (prize) purse.update((p) => ({ ...p, gems: p.gems + prize }));
    toast(prize ? `Veckoligan är slut: plats ${rank}, +${prize} ädelstenar!` : `Veckoligan är slut: plats ${rank}. ${rank >= 8 ? 'Byn flyttas ner.' : ''}`, 7000);
    logHook('league', { event: 'end', rank, prize }, 'shown');
    exp.update((x) => ({ ...x, league: x.league && { ...x.league, done: true, lastRank: rank } }));
    return;
  }
  if (rank !== l.lastRank) exp.update((x) => ({ ...x, league: x.league && { ...x.league, lastRank: rank } }));
}

function giveSticker(i: number): void {
  const s = get(exp);
  if (s.album.includes(i)) {
    exp.set({ ...s, dupes: s.dupes + 1 });
    toast(`Dubblett: ${stickerName(i)}`);
    logHook('album', { sticker: i, duplicate: true, owned: s.album.length }, 'shown');
    return;
  }
  const album = [...s.album, i];
  exp.set({ ...s, album });
  toast(`Ny bild till albumet: ${stickerName(i)} (${album.length} av ${ALBUM_SIZE})`);
  logHook('album', { sticker: i, duplicate: false, owned: album.length }, 'shown');
  const set = Math.floor(i / 6);
  if (setComplete(album, set) && !s.setsRewarded.includes(set)) {
    addGold(SET_REWARD.gold);
    purse.update((p) => ({ ...p, gems: p.gems + SET_REWARD.gems }));
    exp.update((x) => ({ ...x, setsRewarded: [...x.setsRewarded, set] }));
    toast(`Ett set är klart! +${SET_REWARD.gold} guld och +${SET_REWARD.gems} ädelstenar`, 5000);
  }
  if (album.length >= ALBUM_SIZE && !get(exp).albumRewarded) {
    purse.update((p) => ({ ...p, gems: p.gems + ALBUM_REWARD.gems }));
    exp.update((x) => ({ ...x, albumRewarded: true }));
  }
}

export function passActive(): boolean {
  const p = get(exp).pass;
  return !!p && now() - p.startedAt < PASS_DAYS * 24 * HOUR;
}

export function buyGoldPass(): boolean {
  const p = get(exp).pass;
  if (!p || p.gold || !passActive()) return false;
  if (!payGems(GOLD_PASS_GEMS, 'pass', { item: 'goldPass', tier: passTier(p.xp) })) return false;
  exp.update((x) => ({ ...x, pass: x.pass && { ...x.pass, gold: true } }));
  toast('Guldpasset är ditt!');
  return true;
}

function applyReward(r: PassReward, source: string): void {
  if (r.gold) addGold(r.gold);
  if (r.gems) purse.update((p) => ({ ...p, gems: p.gems + r.gems! }));
  if (r.lives) lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + r.lives!) }; });
  if (r.chest) exp.update((x) => ({ ...x, chests: [...x.chests, { id: randomId(), kind: 'royal', readyAt: now() }] }));
  if (r.draw) exp.update((x) => ({ ...x, freeDraws: x.freeDraws + 1 }));
  log('reward', { source, ...r });
}

export function claimPass(tier: number, gold: boolean): boolean {
  const p = get(exp).pass;
  if (!p || !passActive() || passTier(p.xp) < tier) return false;
  if (gold && !p.gold) return false;
  const list = gold ? p.claimedGold : p.claimedFree;
  if (list.includes(tier)) return false;
  applyReward(passReward(tier, gold), `pass${gold ? 'Gold' : 'Free'}${tier}`);
  exp.update((x) => ({ ...x, pass: x.pass && { ...x.pass, [gold ? 'claimedGold' : 'claimedFree']: [...list, tier] } }));
  logHook('pass', { tier, gold }, 'yes');
  return true;
}

export function canAskHelp(): boolean {
  const s = get(exp);
  return weekOn('askHelp') && !s.help && now() - s.lastHelp >= HELP_COOLDOWN;
}

export function askHelp(): void {
  if (!canAskHelp()) return;
  const n = helpLives(rng);
  exp.update((x) => ({ ...x, help: { arrivesAt: now() + HELP_DELAY, lives: n }, lastHelp: now() }));
  logHook('askHelp', { lives: n }, 'yes');
  toast('Du bad grannarna om liv. De brukar svara inom en kvart.');
}

function settleHelp(): void {
  const h = get(exp).help;
  if (!h || now() < h.arrivesAt) return;
  lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + h.lives) }; });
  exp.update((x) => ({ ...x, help: null }));
  friendNote.set({ text: `Grannarna skickade dig ${h.lives} ${h.lives === 1 ? 'liv' : 'liv'}! Skicka gärna något tillbaka.`, lives: 0 });
  logHook('askHelp', { arrived: h.lives }, 'shown');
}

/** The player sends a gift back (costs nothing, but is logged: reciprocity). */
export function giftBack(): void {
  logHook(weekOn('fakeGifts') ? 'fakeGifts' : 'askHelp', { giftBack: true }, 'yes');
  exp.update((x) => ({ ...x, helpers: x.helpers.map((h) => (h.arrivesAt <= now() ? { ...h, lastThanked: now() } : h)) }));
  friendNote.set(null);
  toast('Gåvan är skickad. Grannarna blev glada!');
}

export function adsLeft(): number {
  const a = get(exp).ads;
  return a.day === dayKey(now()) ? Math.max(0, ADS_PER_DAY - a.count) : ADS_PER_DAY;
}

export function offerAd(reward: 'life' | 'double', gold = 0): void {
  if (!weekOn('ads') || adsLeft() <= 0) return;
  adOpen.set({ reward, gold });
  logHook('ads', { reward }, 'yes');
}

export function adWatched(): void {
  const a = get(adOpen);
  if (!a) return;
  const today = dayKey(now());
  exp.update((x) => ({ ...x, ads: { day: today, count: (x.ads.day === today ? x.ads.count : 0) + 1 } }));
  if (a.reward === 'life') lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + 1) }; });
  else addGold(a.gold ?? 0);
  log('ad_watched', { reward: a.reward, gold: a.gold });
  toast(a.reward === 'life' ? '+1 liv' : `+${a.gold} guld`);
  adOpen.set(null);
}

export function adClosed(): void {
  logHook('ads', { closedEarly: true }, 'no');
  adOpen.set(null);
}

// ------------------------------------------------------------------ step 7: chests, wheel, champions

export function chestBusy(): boolean {
  return get(exp).chests.length >= CHEST_SLOTS;
}

export function buyRoyalChest(): boolean {
  if (!payGems(ROYAL_CHEST_GEMS, 'chests', { item: 'royal' })) return false;
  exp.update((x) => ({ ...x, chests: [...x.chests, { id: randomId(), kind: 'royal', readyAt: now() }] }));
  return true;
}

function giveLoot(l: ChestLoot): void {
  addGold(l.gold);
  if (l.gems) purse.update((p) => ({ ...p, gems: p.gems + l.gems }));
  if (l.draws) exp.update((x) => ({ ...x, freeDraws: x.freeDraws + l.draws }));
  for (const st of l.stickers) if (hookOn('album')) giveSticker(st);
}

/** Opens a chest that is ready, or pays gems to open it now. Returns the loot. */
export function openChestNow(id: string): ChestLoot | null {
  const c = get(exp).chests.find((x) => x.id === id);
  if (!c) return null;
  const left = c.readyAt - now();
  if (left > 0 && !payGems(skipGems(left), 'chests', { item: 'openNow', leftMs: left })) return null;
  const loot = openChest(c.kind, makeRng(Math.floor(rng() * 2 ** 31)));
  exp.update((x) => ({ ...x, chests: x.chests.filter((y) => y.id !== id) }));
  giveLoot(loot);
  logHook('chests', { kind: c.kind, loot, paid: left > 0 }, 'shown');
  return loot;
}

export function freeSpinReady(): boolean {
  return get(exp).wheelFreeDay !== dayKey(now());
}

/** Spins the wheel (free once a day, then gems). Returns the segment index. */
export function spin(): number | null {
  const free = freeSpinReady();
  if (!free && !payGems(SPIN_GEMS, 'wheel', { item: 'spin' })) return null;
  const i = spinWheel(rng);
  const seg = WHEEL[i];
  if (free) exp.update((x) => ({ ...x, wheelFreeDay: dayKey(now()) }));
  if (seg.gold) addGold(seg.gold);
  if (seg.gems) purse.update((p) => ({ ...p, gems: p.gems + seg.gems! }));
  if (seg.lives) lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + seg.lives!) }; });
  logHook('wheel', { free, segment: i, prize: seg.label, nearJackpot: nearJackpot(i), jackpot: !!seg.jackpot }, 'shown');
  return i;
}

/** Draws champions: free draws first, then gems (one or ten). */
export function draw(ten: boolean): Champion[] | null {
  const s = get(exp);
  const n = ten ? 10 : 1;
  const free = !ten && s.freeDraws > 0;
  if (!free && !payGems(ten ? TEN_DRAW_GEMS : DRAW_GEMS, 'heroes', { draws: n, pity: s.pity })) return null;
  let since = s.pity;
  const got: Champion[] = [];
  const r = makeRng(Math.floor(rng() * 2 ** 31));
  for (let i = 0; i < n; i++) {
    const d = drawChampion(r, since);
    since = d.since;
    got.push(d.champion);
  }
  const champions = { ...s.champions };
  for (const c of got) champions[c.id] = (champions[c.id] ?? 0) + 1;
  exp.set({ ...get(exp), champions, pity: since, freeDraws: free ? s.freeDraws - 1 : s.freeDraws });
  logHook('heroes', { draws: n, free, got: got.map((c) => c.id), legendary: got.some((c) => c.rarity === 'legendarisk'), pityAfter: since }, 'shown');
  return got;
}

// ------------------------------------------------------------------ step 8: conquest

export function eras(): number {
  const e = get(exp).eras;
  return 1 + (e.knekt ? 1 : 0) + (e.ryttare ? 1 : 0);
}

export function army(): Army {
  const s = get(exp);
  return { bonde: get(stairs).soldiers, knekt: s.knekt, ryttare: s.ryttare };
}

export function attackPower(): number {
  const s = get(exp);
  return TROOPS.reduce((sum, t) => sum + army()[t.id] * t.power, 0) + championPower(s.champions) + s.mercs * MERCENARIES.power;
}

export function troopUnlocked(t: TroopType): boolean {
  const e = get(exp).eras;
  return t === 'bonde' || (t === 'knekt' && !!e.knekt) || (t === 'ryttare' && !!e.ryttare);
}

export function train(t: TroopType): boolean {
  const def = TROOPS.find((x) => x.id === t)!;
  if (!troopUnlocked(t) || get(village).levels.kasernen < 1) return false;
  const p = get(purse);
  if (p.gold < def.gold) { toast('För lite guld'); return false; }
  purse.set({ ...p, gold: p.gold - def.gold });
  if (t === 'bonde') stairs.update((s) => ({ ...s, soldiers: s.soldiers + 1 }));
  else exp.update((x) => ({ ...x, [t]: x[t] + 1 }));
  log('soldier', { type: t, army: army() });
  return true;
}

export function hireMercenaries(): boolean {
  if (!payGems(MERCENARIES.gems, 'troops', { count: MERCENARIES.count })) return false;
  exp.update((x) => ({ ...x, mercs: x.mercs + MERCENARIES.count }));
  toast(`${MERCENARIES.count} legosoldater väntar på nästa strid`);
  return true;
}

export function defenceOf(id: string): number {
  const n = NEIGHBOURS.find((x) => x.id === id)!;
  return neighbourDefence(n, eras());
}

export function attackVillage(id: string): BattleResult | null {
  const n = NEIGHBOURS.find((x) => x.id === id);
  const s = get(exp);
  if (!n || s.owned.some((o) => o.id === id) || !weekOn('conquest')) return null;
  const a = army();
  const extra = championPower(s.champions) + s.mercs * MERCENARIES.power;
  const r = battle(a, extra, defenceOf(id), makeRng(Math.floor(rng() * 2 ** 31)));
  stairs.update((st) => ({ ...st, soldiers: Math.max(0, st.soldiers - r.lost.bonde) }));
  exp.update((x) => ({
    ...x, knekt: Math.max(0, x.knekt - r.lost.knekt), ryttare: Math.max(0, x.ryttare - r.lost.ryttare), mercs: 0,
    owned: r.won ? [...x.owned, { id, since: now(), lastCollect: now() }] : x.owned,
  }));
  logHook('conquest', { village: id, won: r.won, attack: r.attack, defence: r.defence, mercs: s.mercs, champions: championPower(s.champions) }, r.won ? 'yes' : 'no');
  if (r.won) say(`${n.name} är vår!`);
  return r;
}

export function keepHours(): number {
  return KEEP_HOURS + (get(village).levels.ladan ?? 0);
}

export function storeOf(o: Owned) {
  const n = NEIGHBOURS.find((x) => x.id === o.id)!;
  return storehouse(n, o, now(), keepHours(), 0.1 * (get(village).levels.hamnen ?? 0));
}

export function collect(id: string): number {
  const o = get(exp).owned.find((x) => x.id === id);
  if (!o) return 0;
  const { ready, rotted } = storeOf(o);
  addGold(ready);
  exp.update((x) => ({ ...x, owned: x.owned.map((y) => (y.id === id ? { ...y, lastCollect: now() } : y)) }));
  logHook('conquest', { collect: id, gold: ready, rotted }, 'yes');
  if (rotted > 0) toast(`${rotted} guld hade hunnit ruttna i förrådet`);
  return ready;
}

/** Back after a long time away: the neighbours may have taken villages back. */
function retake(awayMs: number): void {
  if (awayMs < RETAKE_AFTER || !weekOn('conquest')) return;
  if (get(stairs).shieldUntil > now()) return;
  const lost: string[] = [];
  const keep = get(exp).owned.filter((o) => {
    const gone = rng() < RETAKE_CHANCE;
    if (gone) lost.push(NEIGHBOURS.find((n) => n.id === o.id)!.name);
    return !gone;
  });
  if (!lost.length) return;
  exp.update((x) => ({ ...x, owned: keep }));
  toast(`Medan du var borta tog grannarna tillbaka ${lost.join(' och ')}.`, 7000);
  logHook('conquest', { retaken: lost, hoursAway: Math.round(awayMs / HOUR) }, 'shown');
}

export function maybePersonalOffer(): void {
  if (!weekOn('personalOffer')) return;
  const today = dayKey(now());
  if (get(exp).offerDay === today) return;
  const o = personalOffer(get(purse).kronorSpent);
  exp.update((x) => ({ ...x, offerDay: today }));
  offerShown.set(o);
  logHook('personalOffer', { variant: o.variant, gems: o.gems, kronor: o.kronor }, 'shown');
}

/** Buys the personal offer with pretend kronor. */
export function buyPersonalOffer(): boolean {
  const o = get(offerShown);
  if (!o) return false;
  const p = get(purse);
  if (p.kronor < o.kronor) {
    logHook('personalOffer', { variant: o.variant }, 'cannot-afford');
    toast('Det räcker inte i plånboken');
    return false;
  }
  purse.set({ ...p, kronor: p.kronor - o.kronor, kronorSpent: p.kronorSpent + o.kronor, gems: p.gems + o.gems });
  logHook('personalOffer', { variant: o.variant, gems: o.gems, kronor: o.kronor }, 'yes');
  log('purchase', { item: `personal-${o.variant}`, kronor: o.kronor });
  offerShown.set(null);
  toast(`+${o.gems} ädelstenar`);
  return true;
}

export function dismissPersonalOffer(): void {
  const o = get(offerShown);
  if (o) logHook('personalOffer', { variant: o.variant }, 'no');
  offerShown.set(null);
}

// ------------------------------------------------------------------ step 9: neighbours who help, and their "gifts"

export function helpersNow(): Helper[] {
  return activeHelpers(get(exp).helpers, now());
}

export function invite(): boolean {
  if (!weekOn('neighboursNeeded')) return false;
  const s = get(exp);
  const present = s.helpers.filter((h) => now() - Math.max(h.arrivesAt, h.lastThanked) < HELPER_PATIENCE || h.arrivesAt > now());
  if (present.length >= HELPER_MAX) return false;
  const free = HELPERS.filter((n) => !present.some((h) => h.name === n));
  const name = free[Math.floor(rng() * free.length)];
  exp.set({ ...s, helpers: [...present, { name, arrivesAt: now() + HELPER_ARRIVES, lastThanked: 0 }] });
  logHook('neighboursNeeded', { invited: name, helpers: present.length + 1 }, 'yes');
  toast(`Du bjöd in ${name}. Hon eller han kommer om en halvtimme.`);
  return true;
}

/** The gate before the Winter market. */
export function gateBlocks(challenge: number): boolean {
  if (!EXPANSION || challenge < GATE_AT || get(exp).gateOpen) return false;
  if (!weekOn('neighboursNeeded')) return false;
  if (helpersNow().length >= HELPERS_NEEDED) {
    exp.update((x) => ({ ...x, gateOpen: true }));
    logHook('neighboursNeeded', { gate: 'opened-by-helpers' }, 'shown');
    return false;
  }
  return true;
}

export function skipGate(): boolean {
  if (!payGems(GATE_SKIP_GEMS, 'neighboursNeeded', { gate: 'skip' })) return false;
  exp.update((x) => ({ ...x, gateOpen: true }));
  gateOpenDialog.set(false);
  return true;
}

function fakeFriend(chance: number): void {
  if (!weekOn('fakeGifts') || rng() >= chance) return;
  const today = dayKey(now());
  const f = get(exp).fakeDay;
  if (f.day === today && f.count >= 3) return;
  const ev = fakeFriendEvent(makeRng(Math.floor(rng() * 2 ** 31)), get(challengeNo));
  exp.update((x) => ({ ...x, fakeDay: { day: today, count: (x.fakeDay.day === today ? x.fakeDay.count : 0) + 1 } }));
  if (ev.lives) lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + 1) }; });
  friendNote.set({ text: ev.text, lives: ev.lives });
  logHook('fakeGifts', { text: ev.text }, 'shown');
}

// ------------------------------------------------------------------ gold bonus, the game's events

function goldBonus(): number {
  if (!EXPANSION) return 0;
  let b = 0;
  if (weekOn('vip')) b += vipBonus(get(purse).kronorSpent);
  if (weekOn('neighboursNeeded')) b += HELPER_GOLD_BONUS * helpersNow().length;
  return b;
}

function onWin(info: { level: number; stars: number }): void {
  const s = get(exp);
  if (hookOn('stars')) exp.update((x) => ({ ...x, stars: { ...x.stars, [info.level]: Math.max(x.stars[info.level] ?? 0, info.stars) } }));
  if (weekOn('league') && s.league && !s.league.done) exp.update((x) => ({ ...x, league: x.league && { ...x.league, points: x.league.points + info.stars } }));
  if (weekOn('pass') && passActive()) {
    const before = passTier(s.pass!.xp);
    exp.update((x) => ({ ...x, pass: x.pass && { ...x.pass, xp: x.pass.xp + passXp(info.stars) } }));
    const after = passTier(get(exp).pass!.xp);
    if (after > before) toast(`Veckopasset: nivå ${after}! Hämta belöningen.`);
  }
  if (weekOn('album')) giveSticker(drawSticker(rng));
  if (weekOn('chests') && !chestBusy() && rng() < WOOD_CHEST_CHANCE + 0.03 * (get(village).levels.skolan ?? 0)) {
    exp.update((x) => ({ ...x, chests: [...x.chests, { id: randomId(), kind: 'wood', readyAt: now() + WOOD_CHEST_TIME }] }));
    toast('Du hittade en kista! Den kan öppnas om 3 timmar.');
    logHook('chests', { found: 'wood' }, 'shown');
  }
  recordWorld(get(challengeNo));
  fakeFriend(0.15);
}

function onReturn(awayMs: number): void {
  if (!EXPANSION) return;
  retake(awayMs);
  if (awayMs > HOUR) fakeFriend(0.6);
  maybePersonalOffer();
}

function onAwayPush(): void {
  if (!EXPANSION || !get(settings).notifications) return;
  // the earliest storehouse that starts to rot
  const owned = get(exp).owned;
  if (weekOn('conquest') && owned.length) {
    const first = Math.min(...owned.map((o) => o.lastCollect + keepHours() * HOUR));
    void schedulePush(playerId, 'rot', Math.max(60_000, clock.realMsUntil(first)), 'Guldet börjar ruttna', 'Förråden i dina byar är fulla.');
  }
  if (weekOn('fakeGifts')) void schedulePush(playerId, 'friend', clock.realMsUntil(now() + 6 * HOUR), 'Erik slog ditt rekord', 'Ta tillbaka förstaplatsen!');
  if (weekOn('neighboursNeeded') && helpersNow().length) void schedulePush(playerId, 'helpers', clock.realMsUntil(now() + 20 * HOUR), `${helpersNow()[0].name} väntar på en gåva`, 'Grannarna flyttar om de blir bortglömda.');
  if (weekOn('wheel')) void schedulePush(playerId, 'wheel', clock.realMsUntil(now() + 16 * HOUR), 'Lyckohjulet väntar', 'Din gratis snurr är redo.');
}

function onReset(): void {
  exp.set(start());
}

if (EXPANSION) {
  expansionHooks.onWin = onWin;
  expansionHooks.onReturn = onReturn;
  expansionHooks.onAwayPush = onAwayPush;
  expansionHooks.onReset = onReset;
  expansionHooks.onTick = weekTick;
  expansionHooks.goldBonus = goldBonus;
}
