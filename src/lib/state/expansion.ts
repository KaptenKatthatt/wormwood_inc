/**
 * The expansion's state and actions (Jonas, 2026-11-17): the week staircase
 * (steps 6-9) with its fifteen hooks, five worlds and the neighbouring
 * villages. It plugs into state/game.ts through `expansionHooks`, so a build
 * without the expansion (VITE_EXPANSION=false, the pilot) behaves exactly as
 * before. Every hook moment is logged with logHook, like the first pass.
 */
import { get, writable } from 'svelte/store';
import { DEV_MENU, EXPANSION } from '../config/flags';
import { HOUR } from '../time/clock';
import { makeRng } from '../match3/rng';
import { worldOf, WORLDS } from '../match3/levels';
import { dayKey, daysBetween } from '../daily';
import { load, randomId, save } from './storage';
import { log } from '../log/logger';
import { schedulePush } from '../push/push';
import { tutorialActive } from '../tutorial';
import { ON_HOLD, type HookId } from '../hooks';
import { WEEK_STEPS, starsFor, stepOfHook, weekStepFor, type WeekStep } from '../expansion/week';
import {
  ADS_PER_DAY, adGroupFor, nextAd, type AdFilm, type AdGroup, ALBUM_REWARD, ALBUM_SIZE, GOLD_PASS_GEMS, HELP_COOLDOWN, HELP_DELAY, LEAGUES, PASS_DAYS,
  MISSIONS, PASS_XP_PER_TIER, PASS_TIERS, SET_REWARD, drawSticker, helpLives, freshLeague, leagueEndsAt, leagueRank, leagueResult, leagueTable, stepLeague, type LeagueState, missionProgress, missionReady, missionsOn, passReward, passTier, passXp, setComplete, stickerName,
  type Mission, type MissionEvent, type MissionState, type PassReward,
} from '../expansion/social';
import {
  CHEST_SLOTS, DRAW_GEMS, ROYAL_CHEST_GEMS, SPIN_GEMS, TEN_DRAW_GEMS, WHEEL, WHEEL_FREE_START, WOOD_CHEST_CHANCE, WOOD_CHEST_TIME,
  championPower, chestSkipGems, drawChampion, nearJackpot, openChest, spinWheel, type Champion, type ChestKind, type ChestLoot,
} from '../expansion/luck';
import {
  GATE_AT, GATE_SKIP_GEMS, winterOpenAt, HELPERS, HELPERS_NEEDED, HELPER_ARRIVES, HELPER_GOLD_BONUS, HELPER_MAX, HELPER_PATIENCE, KEEP_HOURS, MERCENARIES,
  NEIGHBOURS, RETAKE_AFTER, RETAKE_CHANCE, RIDERS_AFTER, TROOPS, activeHelpers, battle, fakeFriendEvent, neighbourDefence, personalOffer,
  storehouse, vipBonus, type Army, type BattleResult, type Helper, type Owned, type TroopType,
} from '../expansion/conquest';
import {
  addGold, challengeNo, clock, daily, expansionHooks, hookOn, letter, lives, logHook, payGems, playerId, purse, say, settings, stairs, toast, village,
} from './game';
import { settleLives } from '../time/lives';
import { REMOVE_ADS_KRONOR, RESUME_AWAY, freshInter, interDue, interLook, interShown, offerRemoveAds, type InterState, type InterTrigger } from '../expansion/interstitial';
import { formatKr } from '../economy/wallet';
import { skipGems } from '../economy/village';

const rng = (): number => Math.random();

export interface ExpState {
  /** The week step reached (5 = only the first pass's staircase so far) and when each was reached (game time). */
  step: 5 | WeekStep;
  reached: Partial<Record<WeekStep, number>>;
  maxWorld: number;
  stars: Record<number, number>;
  league: LeagueState | null;
  album: number[];
  dupes: number;
  setsRewarded: number[];
  albumRewarded: boolean;
  pass: { startedAt: number; xp: number; gold: boolean; claimedFree: number[]; claimedGold: number[]; missions?: MissionState } | null;
  help: { arrivesAt: number; lives: number } | null;
  lastHelp: number;
  ads: { day: string; count: number };
  chests: { id: string; kind: ChestKind; readyAt: number }[];
  wheelFreeDay: string | null;
  /** Free spins left of the first ones. */
  wheelFreeLeft: number;
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
  /** Ads between challenges (step 6 on). */
  inter: InterState;
}

function start(): ExpState {
  return {
    step: 5, reached: {}, maxWorld: 1, stars: {}, league: null, album: [], dupes: 0, setsRewarded: [], albumRewarded: false, pass: null,
    help: null, lastHelp: 0, ads: { day: '', count: 0 }, chests: [], wheelFreeDay: null, wheelFreeLeft: WHEEL_FREE_START, champions: {}, pity: 0, freeDraws: 0,
    knekt: 0, ryttare: 0, mercs: 0, eras: {}, owned: [], offerDay: null, helpers: [], gateOpen: false, fakeDay: { day: '', count: 0 },
    inter: freshInter(),
  };
}

export const exp = writable<ExpState>({ ...start(), ...load<Partial<ExpState>>('expansion', {}) });
exp.subscribe((s) => save('expansion', s));

/** Overlays the expansion opens. */
export const hubOpen = writable<null | 'liga' | 'pass' | 'album' | 'kistor' | 'hjul' | 'kampar'>(null);
export const adOpen = writable<null | { reward: 'life' | 'double'; gold?: number; ad: AdFilm }>(null);
/** An ad between challenges, on screen (no reward; the cross comes after xAfter seconds). */
export const interOpen = writable<null | { ad: AdFilm; trigger: InterTrigger; step: number; xAfter: number; smallX: boolean }>(null);
/** An ad between challenges waiting for a calm moment (App.svelte shows it outside a challenge). */
export const interPending = writable<InterTrigger | null>(null);
/** "Ta bort reklam" on screen. */
export const removeAdsOpen = writable(false);
/** Which films this player gets. The dev menu can override the group the player id gives. */
export const adGroupChoice = writable<AdGroup | 'all' | null>(load('adGroup', null));
adGroupChoice.subscribe((g) => save('adGroup', g));
export function adGroup(): AdGroup | 'all' {
  // Without the dev menu (the test build) nothing can override the group.
  return (DEV_MENU ? get(adGroupChoice) : null) ?? adGroupFor(playerId);
}
/** The reward animation after a watched ad film (Jonas, 2026-11-19): the gold doubles on screen. */
export const adReward = writable<null | { reward: 'life' | 'double'; gold: number }>(null);
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
  if (!EXPANSION || ON_HOLD.includes(id) || !hookOn(id) || tutorialActive()) return false;
  const step = stepOfHook(id);
  return step === 0 || get(exp).step >= step;
}

export const STEP_LETTERS: Record<WeekStep, string> = {
  6: 'Grannbyarna har hört talas om dig! De vill gärna tävla lite, och de hjälper dig gärna om du hjälper dem.',
  7: 'Vi hittade några gamla kistor på vinden… vad kan det vara i dem?',
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
  // A step's letter is about one of its hooks, so it waits with that hook while it is on hold.
  const about: Record<WeekStep, HookId> = { 6: 'askHelp', 7: 'chests', 8: 'conquest', 9: 'neighboursNeeded' };
  if (hookOn('figures') && get(settings).letters && !ON_HOLD.includes(about[step])) {
    letter.set({ text: STEP_LETTERS[step], key: `week${step}` });
    logHook('figures', { letter: `week${step}` }, 'shown');
  }
  onStepStarted(step);
}

function onStepStarted(step: WeekStep): void {
  const s = get(exp);
  if (step >= 6 && !s.league) exp.update((x) => ({ ...x, league: newLeague(0, 1) }));
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

function newLeague(tier: number, week: number): LeagueState {
  return freshLeague(Math.floor(rng() * 2 ** 31), tier, week, now());
}

/** The league the player is in now, or null before step 6 (or with a save from before the leagues). */
function leagueNow(): LeagueState | null {
  const l = get(exp).league;
  return l && typeof l.tier === 'number' && Array.isArray(l.rig) ? l : null;
}

export function leagueRows() {
  const l = leagueNow();
  return l ? leagueTable(l, now()) : [];
}

/** True when a finished week's prize waits to be collected. */
export function leaguePrizeWaiting(): boolean {
  return Boolean(leagueNow()?.result);
}

function settleLeague(): void {
  const s = get(exp);
  if (s.step < 6 || !weekOn('league')) return;
  let l = leagueNow();
  // a league from before the five leagues (or none yet): start in the lowest one
  if (!l) { exp.update((x) => ({ ...x, league: newLeague(0, 1) })); return; }
  if (now() >= leagueEndsAt(l)) {
    // The week is over. Its prize waits until the last one has been collected.
    if (l.result) return;
    const result = leagueResult(l);
    const tier = l.tier + result.move;
    logHook('league', { event: 'end', league: LEAGUES[l.tier], week: l.week, rank: result.rank, points: l.points, move: result.move, ...result.prize }, 'shown');
    exp.update((x) => ({ ...x, league: { ...newLeague(tier, l!.week + 1), result } }));
    toast(`Veckoligan är slut: plats ${result.rank}. Hämta ditt pris!`, 7000);
    return;
  }
  const wasLastDay = l.lastDay;
  l = stepLeague(l, now());
  const rows = leagueTable(l, now());
  const rank = leagueRank(rows);
  if (rank > l.lastRank) {
    const passer = rows[rank - 2];
    toast(l.lastDay && !wasLastDay ? `Sista dygnet i veckoligan! ${passer.name} gick förbi dig.` : `${passer.name} gick förbi dig i veckoligan!`, 5000);
    logHook('league', { event: 'overtaken', league: LEAGUES[l.tier], rank, by: passer.name, rigged: passer.rigged, lastDay: l.lastDay }, 'shown');
  }
  if (rank !== l.lastRank) l = { ...l, lastRank: rank };
  if (l !== get(exp).league) exp.update((x) => ({ ...x, league: l }));
}

/** Pays the finished week's prize. Returns what was paid, or null when nothing waited. */
export function claimLeaguePrize(): { gems?: number; gold?: number } | null {
  const l = leagueNow();
  if (!l?.result) return null;
  const { prize, rank, tier, move } = l.result;
  purse.update((p) => ({ ...p, gems: p.gems + (prize.gems ?? 0), gold: p.gold + (prize.gold ?? 0) }));
  exp.update((x) => ({ ...x, league: x.league && { ...x.league, result: null } }));
  logHook('league', { event: 'claim', league: LEAGUES[tier], rank, move, ...prize }, 'yes');
  return prize;
}

/** Dev menu: move the league's week so that this many hours are left. */
export function devLeagueHoursLeft(hours: number): void {
  const l = leagueNow();
  if (!l) return;
  exp.update((x) => ({ ...x, league: { ...l, startedAt: now() + hours * HOUR - (leagueEndsAt(l) - l.startedAt) } }));
  settleLeague();
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

/** A new pass starts when the old one has run its seven days; what was not collected is gone. */
export function renewPass(): void {
  const s = get(exp);
  if (s.step < 6 || !s.pass || passActive()) return;
  exp.update((x) => ({ ...x, pass: { startedAt: now(), xp: 0, gold: false, claimedFree: [], claimedGold: [] } }));
  log('pass_renewed', { levelReached: passTier(s.pass.xp), gold: s.pass.gold });
}

/** The missions the player can do something about: none that asks for a game that is not there yet. */
export function passMissions(): Mission[] {
  return MISSIONS.filter((m) => (m.on === 'spin' ? weekOn('wheel') : m.on === 'chest' ? weekOn('chests') : true));
}

export function missionState(): MissionState {
  return missionsOn(get(exp).pass?.missions, dayKey(now()));
}

/** Something a mission may ask for has happened. */
export function missionEvent(on: MissionEvent): void {
  if (!weekOn('pass') || !passActive()) return;
  exp.update((x) => ({ ...x, pass: x.pass && { ...x.pass, missions: missionProgress(x.pass.missions, on, dayKey(now())) } }));
}

/** Collects a finished mission's points. Returns the points, or 0. */
export function claimMission(id: string): number {
  const m = passMissions().find((x) => x.id === id);
  const st = missionState();
  if (!m || !passActive() || !missionReady(st, m)) return 0;
  exp.update((x) => ({ ...x, pass: x.pass && { ...x.pass, xp: Math.min(PASS_TIERS * PASS_XP_PER_TIER, x.pass.xp + m.xp), missions: { ...st, got: [...st.got, id] } } }));
  logHook('pass', { mission: id, xp: m.xp }, 'yes');
  return m.xp;
}

/** What waits in the pass: rewards to take and missions to collect. */
export function passWaiting(): number {
  const p = get(exp).pass;
  if (!p || !passActive()) return 0;
  let n = 0;
  for (let t = 1; t <= passTier(p.xp); t++) {
    if (!p.claimedFree.includes(t)) n++;
    if (p.gold && !p.claimedGold.includes(t)) n++;
  }
  const st = missionState();
  return n + passMissions().filter((m) => missionReady(st, m)).length;
}

export function buyGoldPass(): boolean {
  const p = get(exp).pass;
  if (!p || p.gold || !passActive()) return false;
  if (!payGems(GOLD_PASS_GEMS, 'pass', { item: 'goldPass', tier: passTier(p.xp) })) return false;
  exp.update((x) => ({ ...x, pass: x.pass && { ...x.pass, gold: true } }));
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
  const ad = nextAd(adGroup());
  adOpen.set({ reward, gold, ad });
  logHook('ads', { reward, ad: ad.id, adGroup: adGroup() }, 'yes');
}

export function adWatched(): void {
  const a = get(adOpen);
  if (!a) return;
  const today = dayKey(now());
  exp.update((x) => ({ ...x, ads: { day: today, count: (x.ads.day === today ? x.ads.count : 0) + 1 } }));
  if (a.reward === 'life') lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + 1) }; });
  else addGold(a.gold ?? 0);
  log('ad_watched', { reward: a.reward, gold: a.gold, ad: a.ad.id, adGroup: adGroup() });
  // A voluntary film also starts the wait before the next ad between challenges again.
  exp.update((x) => ({ ...x, inter: { ...inter(x), lastAt: now() } }));
  adOpen.set(null);
  adReward.set({ reward: a.reward, gold: a.gold ?? 0 });
}

/** Closed before the end, without the reward: how far the player got is what the two groups are compared on. */
export function adClosed(secondsWatched = 0): void {
  const a = get(adOpen);
  logHook('ads', { closedEarly: true, reward: a?.reward, ad: a?.ad.id, adGroup: adGroup(), secondsWatched: Math.round(secondsWatched * 10) / 10 }, 'no');
  adOpen.set(null);
}

// ------------------------------------------------------------------ ads between challenges (step 6 on)

const inter = (x: ExpState): InterState => ({ ...freshInter(), ...(x.inter ?? {}) });

/**
 * Something happened that may bring an ad: a challenge ended, the game was
 * opened again, or the player went from the village to the map. A due ad
 * waits in interPending until App.svelte finds a calm moment outside a challenge.
 */
export function interEvent(trigger: InterTrigger): void {
  if (!weekOn('interstitial')) return;
  const finished = trigger === 'win' || trigger === 'lose';
  if (finished) exp.update((x) => ({ ...x, inter: { ...inter(x), since: inter(x).since + 1 } }));
  if (get(interPending) || get(interOpen)) return;
  if (interDue(get(exp).step, inter(get(exp)), trigger, now())) interPending.set(trigger);
}

/** App.svelte calls this when the moment is calm: the waiting ad comes up. */
export function showPendingInter(): void {
  const trigger = get(interPending);
  interPending.set(null);
  if (!trigger || get(interOpen) || get(adOpen)) return;
  if (trigger !== 'dev' && (!weekOn('interstitial') || inter(get(exp)).removed)) return;
  const s = get(exp);
  const step = Math.max(6, s.step);
  const look = interLook(step, inter(s));
  const ad = nextAd(adGroup());
  exp.update((x) => ({ ...x, inter: interShown(inter(x), now(), dayKey(now())) }));
  interOpen.set({ ad, trigger, step, ...look });
  log('interstitial_shown', { ad: ad.id, adGroup: adGroup(), step, trigger, xAfter: look.xAfter, smallX: look.smallX, today: inter(get(exp)).today });
  logHook('interstitial', { ad: ad.id, adGroup: adGroup(), step, trigger, smallX: look.smallX }, 'shown');
}

/** The ad is closed (with the cross, or after the end): nothing is lost. */
export function interClosed(secondsWatched: number): void {
  const o = get(interOpen);
  if (!o) return;
  interOpen.set(null);
  const secs = Math.round(secondsWatched * 10) / 10;
  log('interstitial_closed', { ad: o.ad.id, step: o.step, trigger: o.trigger, secondsWatched: secs, smallX: o.smallX });
  if (offerRemoveAds(o.step, inter(get(exp)), dayKey(now()))) {
    removeAdsOpen.set(true);
    log('remove_ads_offer', { result: 'shown', kronor: REMOVE_ADS_KRONOR, today: inter(get(exp)).today });
    logHook('interstitial', { removeAds: true, kronor: REMOVE_ADS_KRONOR }, 'shown');
  }
}

/** "Ta bort reklam" for 39 kr from the test wallet: the ads between challenges stop, the voluntary films stay. */
export function buyRemoveAds(): void {
  const p = get(purse);
  if (p.kronor < REMOVE_ADS_KRONOR) {
    log('remove_ads_offer', { result: 'cannot-afford', kronor: REMOVE_ADS_KRONOR, have: p.kronor });
    logHook('interstitial', { removeAds: true, kronor: REMOVE_ADS_KRONOR }, 'cannot-afford');
    toast(`Det kostar ${formatKr(REMOVE_ADS_KRONOR)}, du har ${formatKr(p.kronor)}`);
    return;
  }
  purse.set({ ...p, kronor: p.kronor - REMOVE_ADS_KRONOR, kronorSpent: p.kronorSpent + REMOVE_ADS_KRONOR });
  exp.update((x) => ({ ...x, inter: { ...inter(x), removed: true } }));
  removeAdsOpen.set(false);
  log('remove_ads_offer', { result: 'bought', kronor: REMOVE_ADS_KRONOR });
  log('purchase', { item: 'removeAds', kronor: REMOVE_ADS_KRONOR });
  logHook('interstitial', { removeAds: true, kronor: REMOVE_ADS_KRONOR }, 'yes');
  toast('Reklamen mellan utmaningarna är borta.');
}

/** "Inte nu": the offer comes back tomorrow. */
export function declineRemoveAds(): void {
  exp.update((x) => ({ ...x, inter: { ...inter(x), declinedDay: dayKey(now()) } }));
  removeAdsOpen.set(false);
  log('remove_ads_offer', { result: 'declined', kronor: REMOVE_ADS_KRONOR });
  logHook('interstitial', { removeAds: true, kronor: REMOVE_ADS_KRONOR }, 'no');
}

/** Dev menu: an ad between challenges right now, by the rules of the current step (step 6 before that). */
export function devInterstitial(): void {
  interPending.set('dev');
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
  if (left > 0 && !payGems(chestSkipGems(left), 'chests', { item: 'openNow', leftMs: left })) return null;
  const loot = openChest(c.kind, makeRng(Math.floor(rng() * 2 ** 31)));
  // A chest holds nothing the game cannot show: no album pictures and no champion draws while those are on hold.
  if (!hookOn('album')) loot.stickers = [];
  if (!hookOn('heroes')) loot.draws = 0;
  exp.update((x) => ({ ...x, chests: x.chests.filter((y) => y.id !== id) }));
  giveLoot(loot);
  missionEvent('chest');
  logHook('chests', { kind: c.kind, loot, paid: left > 0 }, 'shown');
  return loot;
}

/** The free spins: what is left of the first three, and whether today's is unused. */
export function wheelFree(): { starter: number; daily: boolean } {
  const s = get(exp);
  return { starter: s.wheelFreeLeft, daily: s.wheelFreeLeft <= 0 && s.wheelFreeDay !== dayKey(now()) };
}

export function freeSpinReady(): boolean {
  const f = wheelFree();
  return f.starter > 0 || f.daily;
}

/** Spins the wheel (the first three spins free, then one free a day, the rest for gems). Returns the segment index. */
export function spin(): number | null {
  const f = wheelFree();
  const free = f.starter > 0 || f.daily;
  if (!free && !payGems(SPIN_GEMS, 'wheel', { item: 'spin' })) return null;
  const i = spinWheel(rng);
  const seg = WHEEL[i];
  if (free) exp.update((x) => ({ ...x, wheelFreeLeft: Math.max(0, x.wheelFreeLeft - 1), wheelFreeDay: dayKey(now()) }));
  if (seg.gold) addGold(seg.gold);
  if (seg.gems) purse.update((p) => ({ ...p, gems: p.gems + seg.gems! }));
  if (seg.lives) lives.update((l) => { const s = settleLives(l, now()); return { ...s, count: Math.min(s.max, s.count + seg.lives!) }; });
  missionEvent('spin');
  logHook('wheel', { free, starter: f.starter > 0, segment: i, prize: seg.label, nearJackpot: nearJackpot(i), jackpot: !!seg.jackpot }, 'shown');
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
export function winterOpen(): boolean {
  return winterOpenAt(now());
}
export function gateBlocks(challenge: number): boolean {
  if (EXPANSION && challenge >= GATE_AT && !winterOpen()) return true;
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
  if (weekOn('league') && leagueNow() && now() < leagueEndsAt(leagueNow()!)) exp.update((x) => ({ ...x, league: x.league && { ...x.league, points: x.league.points + info.stars, lastRank: x.league.lastRank } }));
  renewPass();
  if (weekOn('pass') && passActive()) {
    missionEvent('win');
    if (info.stars >= 3) missionEvent('stars3');
    const before = passTier(get(exp).pass!.xp);
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
  interEvent('win');
}

function onLoss(): void {
  interEvent('lose');
}

function onReturn(awayMs: number): void {
  if (!EXPANSION) return;
  if (awayMs >= RESUME_AWAY) interEvent('resume');
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
  expansionHooks.onLoss = onLoss;
  expansionHooks.onReturn = onReturn;
  expansionHooks.onAwayPush = onAwayPush;
  expansionHooks.onReset = onReset;
  expansionHooks.onTick = weekTick;
  expansionHooks.goldBonus = goldBonus;
}
