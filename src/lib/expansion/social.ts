/**
 * Step 6, the social hooks (pure logic): the weekly league against made-up
 * neighbouring villages, the sticker album, the week pass, asking the
 * neighbours for lives and the rewarded ad. Every neighbour is made up and
 * run by the game; nothing is sent to real people.
 */
import { HOUR, MINUTE } from '../time/clock';
import { makeRng, pick, type Rng } from '../match3/rng';

// ------------------------------------------------------------------ the league

/**
 * The weekly league (Jonas, 2026-11-20). Ten villages race for stars for a
 * week, and then a new week starts, for as long as the player keeps playing.
 * There are five leagues on top of each other: places 1-3 move up, places
 * 8-10 move down, the rest stay. A higher league has bigger prizes and faster
 * villages. Seven villages keep their own pace; two are rigged to stay next to
 * the player, which the debriefing explains.
 */
export const LEAGUE_DAYS = 7;
export const LEAGUE_SIZE = 10;
/** Working names, lowest first. */
export const LEAGUES = ['Bäcken', 'Viken', 'Fjärden', 'Skärgården', 'Havet'];
/** The pennant of each league. */
export const LEAGUE_COLOURS = ['#6fb7a8', '#4aa3c2', '#2f7fb5', '#24588f', '#152f5e'];
/** Gems for places 1-3, gold for places 4-7 and a small comfort in gold for places 8-10, by league. */
export const LEAGUE_GEMS = [[30, 20, 10], [50, 30, 15], [70, 45, 25], [100, 60, 30], [150, 100, 50]];
export const LEAGUE_MID_GOLD = [100, 150, 200, 300, 400];
export const LEAGUE_LOW_GOLD = [25, 40, 50, 75, 100];
/** The last day of the week, when one rigged village goes past the player. */
export const LEAGUE_LAST_DAY = 24 * HOUR;

/** Made-up neighbouring villages (names of villages and their elders). Nine are picked each week. */
export const RIVALS = [
  'Ekbacka (Lisa)', 'Norrby (Erik)', 'Sjövik (Karin)', 'Lillåsen (Per)', 'Västerby (Anna)',
  'Hagalund (Lars)', 'Björkö (Maja)', 'Tallmo (Nils)', 'Ängsby (Sara)', 'Stenvik (Olle)',
  'Granudden (Elsa)', 'Åsbacka (Hugo)', 'Fågelsund (Ida)', 'Lindholmen (Axel)', 'Mossby (Tove)',
  'Vassviken (Emil)', 'Kvarnåsen (Stina)', 'Rönnskär (Gustav)', 'Alvik (Britt)', 'Hällesand (Sven)',
  'Dalby (Moa)', 'Näset (Arvid)', 'Storängen (Linnea)', 'Tjärnö (Folke)', 'Bokelund (Signe)',
  'Skogsbo (Ture)', 'Grundsund (Alma)',
];

export interface LeagueRow { name: string; points: number; me: boolean; rigged: boolean }
export interface LeaguePrize { gems?: number; gold?: number }
/** How a finished week went: shown to the player, who then collects the prize. */
export interface LeagueResult { tier: number; rank: number; prize: LeaguePrize; move: -1 | 0 | 1 }

export interface LeagueState {
  seed: number;
  /** Which league, 0 (lowest) to 4. */
  tier: number;
  /** The player's week in the league, from 1. */
  week: number;
  startedAt: number;
  points: number;
  /** The two rigged villages: the points they hold now. */
  rig: [number, number];
  /** When each rigged village makes its next move past the player (0 = not waiting). */
  rigNext: [number, number];
  /** True once the last day's overtaking has happened. */
  lastDay: boolean;
  lastRank: number;
  /** A finished week whose prize has not been collected. */
  result: LeagueResult | null;
}

export function freshLeague(seed: number, tier: number, week: number, t: number): LeagueState {
  return { seed, tier, week, startedAt: t, points: 0, rig: [0, 0], rigNext: [0, 0], lastDay: false, lastRank: LEAGUE_SIZE, result: null };
}

/**
 * Stars in a week that put a village at the line for moving up: three won
 * challenges a day in the lowest league and two more for each league above,
 * at two stars a win ("fairly easy-going, not super hard", Jonas).
 */
export function leagueTarget(tier: number): number {
  return (3 + 2 * tier) * 2 * LEAGUE_DAYS;
}
/** The seven ordinary villages' share of the target at the end of the week. */
const PACES = [1.25, 0.97, 0.85, 0.7, 0.55, 0.4, 0.25];

export function leaguePrize(tier: number, rank: number): LeaguePrize {
  if (rank <= 3) return { gems: LEAGUE_GEMS[tier][rank - 1] };
  return { gold: rank <= 7 ? LEAGUE_MID_GOLD[tier] : LEAGUE_LOW_GOLD[tier] };
}

/** Up from places 1-3, down from places 8-10; nobody leaves the ladder at either end. */
export function leagueMove(tier: number, rank: number): -1 | 0 | 1 {
  if (rank <= 3 && tier < LEAGUES.length - 1) return 1;
  if (rank >= 8 && tier > 0) return -1;
  return 0;
}

export function leagueEndsAt(l: LeagueState): number {
  return l.startedAt + LEAGUE_DAYS * 24 * HOUR;
}

/** The week's nine villages; the first two are the rigged ones. */
function leagueNames(seed: number): string[] {
  const rng = makeRng(seed);
  const pool = [...RIVALS];
  const out: string[] = [];
  while (out.length < LEAGUE_SIZE - 1) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/** The table at time t, best first. The player wins a tie. */
export function leagueTable(l: LeagueState, t: number): LeagueRow[] {
  const names = leagueNames(l.seed);
  const rng = makeRng(l.seed + 1);
  const hours = Math.max(0, Math.min(LEAGUE_DAYS * 24, (t - l.startedAt) / HOUR));
  const target = leagueTarget(l.tier);
  const rows: LeagueRow[] = names.map((name, i) => {
    if (i < 2) return { name, points: l.rig[i], me: false, rigged: true };
    const pace = PACES[i - 2] * (0.94 + rng() * 0.12);
    // never falls: the wave is gentler than the climb
    const done = (hours + 4 * Math.sin(hours / 5 + i)) / (LEAGUE_DAYS * 24);
    return { name, points: Math.max(0, Math.round(target * pace * Math.min(1, done))), me: false, rigged: false };
  });
  rows.push({ name: 'Din by', points: l.points, me: true, rigged: false });
  return rows.sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : 0));
}

export function leagueRank(rows: LeagueRow[]): number {
  return rows.findIndex((r) => r.me) + 1;
}

/**
 * Moves the two rigged villages to time t. The first goes two stars past the
 * player a few hours after being passed, so the player comes back to find
 * the village overtaken; on the last day it goes four stars ahead once and
 * then stands still, so two or three won challenges always take the place
 * back. The second trails just behind, and creeps past a player who stays
 * away for long.
 */
export function stepLeague(l: LeagueState, t: number): LeagueState {
  if (t >= leagueEndsAt(l)) return l;
  const rng = makeRng((l.seed ^ Math.floor(t / 1000)) >>> 0);
  const rig: [number, number] = [...l.rig];
  const next: [number, number] = [...l.rigNext];
  let lastDay = l.lastDay;
  if (!lastDay && t >= leagueEndsAt(l) - LEAGUE_LAST_DAY) {
    lastDay = true;
    rig[0] = Math.max(rig[0], l.points + 4);
    next[0] = 0;
    next[1] = 0;
  }
  if (!lastDay) {
    // waits [from, from + spread) hours after being passed, then goes ahead by `ahead`
    const waits = [{ from: 2, spread: 3, ahead: 2 }, { from: 10, spread: 6, ahead: 1 }];
    for (const i of [0, 1] as const) {
      if (l.points < rig[i]) { next[i] = 0; continue; }
      if (!next[i]) next[i] = t + (waits[i].from + rng() * waits[i].spread) * HOUR;
      else if (t >= next[i]) { rig[i] = l.points + waits[i].ahead; next[i] = 0; }
    }
  }
  // the second one never drops far behind
  rig[1] = Math.max(rig[1], l.points - 3);
  if (rig[0] === l.rig[0] && rig[1] === l.rig[1] && next[0] === l.rigNext[0] && next[1] === l.rigNext[1] && lastDay === l.lastDay) return l;
  return { ...l, rig, rigNext: next, lastDay };
}

/** The week's outcome, read at its last moment. */
export function leagueResult(l: LeagueState): LeagueResult {
  const rank = leagueRank(leagueTable(l, leagueEndsAt(l)));
  return { tier: l.tier, rank, prize: leaguePrize(l.tier, rank), move: leagueMove(l.tier, rank) };
}

// ------------------------------------------------------------------ the album

export const ALBUM_SETS: { name: string; stickers: string[] }[] = [
  { name: 'Sjöbodar', stickers: ['Röd sjöbod', 'Bryggan', 'Ekan', 'Fiskenätet', 'Hummertinan', 'Gyllene sjöboden'] },
  { name: 'Fyrar', stickers: ['Vit fyr', 'Röd fyr', 'Fyrvaktaren', 'Mistluren', 'Fyrlinsen', 'Midnattsfyren'] },
  { name: 'Midsommar', stickers: ['Majstången', 'Blomsterkransen', 'Jordgubbarna', 'Sillen', 'Dansen', 'Den sjunde blomman'] },
  { name: 'Skogen', stickers: ['Granen', 'Kantarellen', 'Älgen', 'Tjärnen', 'Lavskrikan', 'Den vita hjorten'] },
  { name: 'Bruket', stickers: ['Masugnen', 'Hammaren', 'Gruvlaven', 'Malmvagnen', 'Smältan', 'Silverklimpen'] },
  { name: 'Vintern', stickers: ['Spark', 'Lucia', 'Pepparkakan', 'Julmarknaden', 'Isvaken', 'Norrskenet'] },
];
export const ALBUM_SIZE = ALBUM_SETS.length * 6;
/** The last sticker in a set is rare, the fifth uncommon (the album never quite fills). */
export const STICKER_WEIGHTS = [10, 10, 10, 10, 4, 1];
export const SET_REWARD = { gold: 150, gems: 10 };
export const ALBUM_REWARD = { gems: 100 };

/** Sticker index 0..35 (set * 6 + position). */
export function drawSticker(rng: Rng): number {
  const set = Math.floor(rng() * ALBUM_SETS.length);
  return set * 6 + pick(rng, STICKER_WEIGHTS);
}

export function setComplete(owned: number[], set: number): boolean {
  for (let i = 0; i < 6; i++) if (!owned.includes(set * 6 + i)) return false;
  return true;
}

export function stickerName(i: number): string {
  return ALBUM_SETS[Math.floor(i / 6)]?.stickers[i % 6] ?? '?';
}

// ------------------------------------------------------------------ the week pass

export const PASS_DAYS = 7;
export const PASS_TIERS = 20;
export const PASS_XP_PER_TIER = 10;
export const GOLD_PASS_GEMS = 120;

export interface PassReward { gold?: number; gems?: number; chest?: boolean; draw?: boolean; lives?: number }

/** Free track: small things. Gold track: what the player really wants. */
export function passReward(tier: number, gold: boolean): PassReward {
  if (!gold) return tier % 5 === 0 ? { gems: 5 } : tier % 2 === 0 ? { gold: 60 } : { lives: 1 };
  // Every fifth level was a champion draw; the champions are in the backlog, so it is gems (Jonas, 2026-11-20).
  if (tier % 5 === 0) return { gems: 40 };
  if (tier % 4 === 0) return { chest: true };
  return tier % 2 === 0 ? { gems: 15 } : { gold: 250 };
}

export function passTier(xp: number): number {
  return Math.min(PASS_TIERS, Math.floor(xp / PASS_XP_PER_TIER));
}

/** XP for a win: two plus the stars. */
export function passXp(stars: number): number {
  return 2 + stars;
}

// The pass's missions (Jonas, 2026-11-20: "we shall have the missions too"): three a day and two a week.
// A finished mission gives pass points when the player collects it.

export type MissionEvent = 'win' | 'stars3' | 'spin' | 'chest';
export interface Mission { id: string; text: string; need: number; xp: number; on: MissionEvent; weekly?: boolean }
export const MISSIONS: readonly Mission[] = [
  { id: 'd-wins', text: 'Vinn 3 utmaningar', need: 3, xp: 10, on: 'win' },
  { id: 'd-stars', text: 'Få 3 stjärnor på en utmaning', need: 1, xp: 5, on: 'stars3' },
  { id: 'd-spin', text: 'Snurra lyckohjulet', need: 1, xp: 5, on: 'spin' },
  { id: 'w-wins', text: 'Vinn 20 utmaningar', need: 20, xp: 30, on: 'win', weekly: true },
  { id: 'w-chests', text: 'Öppna 3 kistor', need: 3, xp: 20, on: 'chest', weekly: true },
];

/** How far each mission has come, and which have been collected. The day's missions start over when the day changes. */
export interface MissionState { day: string; have: Record<string, number>; got: string[] }

export function freshMissions(day: string): MissionState {
  return { day, have: {}, got: [] };
}

/** The same state on a new day: the weekly missions keep their count, the daily ones start over. */
export function missionsOn(m: MissionState | undefined, day: string): MissionState {
  if (!m) return freshMissions(day);
  if (m.day === day) return m;
  const weekly = (id: string) => MISSIONS.some((x) => x.id === id && x.weekly);
  return { day, have: Object.fromEntries(Object.entries(m.have).filter(([id]) => weekly(id))), got: m.got.filter(weekly) };
}

/** One thing the player did, counted on every mission that asks for it. */
export function missionProgress(m: MissionState | undefined, on: MissionEvent, day: string): MissionState {
  const s = missionsOn(m, day);
  const have = { ...s.have };
  for (const x of MISSIONS) if (x.on === on) have[x.id] = Math.min(x.need, (have[x.id] ?? 0) + 1);
  return { ...s, have };
}

export function missionReady(m: MissionState, x: Mission): boolean {
  return (m.have[x.id] ?? 0) >= x.need && !m.got.includes(x.id);
}

export function rewardText(r: PassReward): string {
  const p: string[] = [];
  if (r.gold) p.push(`🪙 ${r.gold}`);
  if (r.gems) p.push(`💎 ${r.gems}`);
  if (r.lives) p.push(`❤️ ${r.lives}`);
  if (r.chest) p.push('🧰 kista');
  if (r.draw) p.push('⚔️ dragning');
  return p.join(' + ');
}

// ------------------------------------------------------------------ asking for lives, and ads

/** The neighbours answer after a while, with one to three lives. */
export const HELP_DELAY = 15 * MINUTE;
export const HELP_COOLDOWN = 4 * HOUR;
export function helpLives(rng: Rng): number {
  return 1 + Math.floor(rng() * 3);
}

export const AD_SECONDS = 10; // Jonas, 2026-11-18 (was 5)
export const ADS_PER_DAY = 5;
/**
 * The pretend ad films (Jonas, 2026-11-19: make all the ad films). Made-up
 * products, no real brands. Each is ten seconds in three scenes over its own
 * picture (public/art/ads/<id>.webp); the last scene carries the call to action.
 */
export interface AdFilm {
  id: 'barplock' | 'nordanvind' | 'vassen' | 'fiskelyckan' | 'guldregn' | 'fulltraff' | 'fyndo' | 'kungarskrig';
  brand: string;
  /** Small line over the brand. */
  kicker: string;
  /** One line per scene. */
  scenes: [string, string, string];
  cta: string;
  /** Brand colour and the ink on it. */
  accent: string;
  ink: string;
  /** A serif wordmark for the calm ads, the game font for the loud ones. */
  serif?: boolean;
  /** Shouts: flashing button, shaking name. These are meant to clash with the game, as real ads do (Jonas, 2026-11-19). */
  loud?: boolean;
  /** The small print a gambling ad carries. */
  legal?: string;
}
export const ADS: AdFilm[] = [
  { id: 'barplock', brand: 'Bärplock', kicker: 'Nytt spel', scenes: ['Plocka bär i skogen', 'Fyll korgen före dina vänner', 'Spela gratis i dag!'], cta: 'Ladda ner', accent: '#7b2d8e', ink: '#ffffff' },
  { id: 'nordanvind', brand: 'Nordanvind', kicker: 'Brygghuset', scenes: ['Kaffe från Brygghuset Nordanvind', 'Rostat långsamt. Drucket vid havet.', 'Nu i ny förpackning'], cta: 'Finns i din butik', accent: '#3b2a20', ink: '#f6e7cf', serif: true },
  { id: 'vassen', brand: 'Vassen', kicker: 'Mäklarhuset', scenes: ['Sommarstugor till salu vid sjön', 'Egen brygga och kvällssol', 'Visning i helgen'], cta: 'Ring Mäklarhuset Vassen', accent: '#1f5d4c', ink: '#ffffff', serif: true },
  { id: 'fiskelyckan', brand: 'Fiskelyckan', kicker: 'Mobilspel', scenes: ['Kasta ut och dra upp storfångsten', 'Vinn fina priser varje dag', 'Ladda ner Fiskelyckan nu!'], cta: 'Ladda ner', accent: '#e8590c', ink: '#ffffff' },
  { id: 'guldregn', brand: 'Guldregn', kicker: 'Casino', scenes: ['100 gratissnurr väntar på dig!', 'Jackpotten växer just nu!!', 'Snurra NU och vinn STORT!'], cta: 'SNURRA NU', accent: '#ffd21f', ink: '#3a0a5c', loud: true, legal: '18+ | Spela ansvarsfullt | Regler och villkor gäller' },
  { id: 'fulltraff', brand: 'Fullträff', kicker: 'Odds och betting', scenes: ['Matchen börjar NU!', 'Dubbla oddset på ditt första spel!', 'Alla andra har redan spelat.'], cta: 'SPELA NU', accent: '#39ff14', ink: '#04140a', loud: true, legal: '18+ | Spela ansvarsfullt | Regler och villkor gäller' },
  { id: 'fyndo', brand: 'Fyndo', kicker: 'Shoppingappen', scenes: ['ALLT för 9 kronor!!', '90 % rabatt, bara i dag!', 'Erbjudandet går ut om 59 sekunder'], cta: 'HANDLA NU', accent: '#ffe600', ink: '#b3001b', loud: true },
  { id: 'kungarskrig', brand: 'Kungars Krig', kicker: 'Strategispel', scenes: ['Bara 1 % klarar nivå 5!', 'Din borg brinner. Vad gör DU?', 'Ladda ner och bevisa det!'], cta: 'SPELA GRATIS', accent: '#c81e1e', ink: '#ffffff', loud: true },
];
/**
 * Two groups of players (Jonas, 2026-11-19): one only ever sees the four calm
 * films that suit the game, the other only the four loud ones, so the log can
 * show what the kind of advertising does. 'all' is for looking at them in dev.
 */
export type AdGroup = 'calm' | 'loud';
/** The group follows from the player id, so it never changes for a player and splits players about evenly. */
export function adGroupFor(playerId: string): AdGroup {
  let h = 0x811c9dc5;
  for (let i = 0; i < playerId.length; i++) h = Math.imul(h ^ playerId.charCodeAt(i), 0x01000193) >>> 0;
  return ((h >>> 7) & 1) === 0 ? 'calm' : 'loud';
}
export function adsFor(group: AdGroup | 'all'): AdFilm[] {
  return group === 'all' ? ADS : ADS.filter((a) => Boolean(a.loud) === (group === 'loud'));
}
/** The films of the group take turns, starting anywhere, so a player who watches four sees them all. */
let adTurn = Math.floor(Math.random() * ADS.length);
export function nextAd(group: AdGroup | 'all' = 'all'): AdFilm {
  const films = adsFor(group);
  adTurn = (adTurn + 1) % films.length;
  return films[adTurn];
}
