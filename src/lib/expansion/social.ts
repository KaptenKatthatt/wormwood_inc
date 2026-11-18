/**
 * Step 6, the social hooks (pure logic): the weekly league against made-up
 * neighbouring villages, the sticker album, the week pass, asking the
 * neighbours for lives and the rewarded ad. Every neighbour is made up and
 * run by the game; nothing is sent to real people.
 */
import { HOUR, MINUTE } from '../time/clock';
import { makeRng, pick, type Rng } from '../match3/rng';

// ------------------------------------------------------------------ the league

export const LEAGUE_DAYS = 7;
export const LEAGUE_PRIZES = [100, 60, 30]; // gems for places 1-3
export const LEAGUE_SIZE = 10;

/** Made-up neighbouring villages (names of villages and their elders). */
export const RIVALS = [
  'Ekbacka (Lisa)', 'Norrby (Erik)', 'Sjövik (Karin)', 'Lillåsen (Per)', 'Västerby (Anna)',
  'Hagalund (Lars)', 'Björkö (Maja)', 'Tallmo (Nils)', 'Ängsby (Sara)',
];

export interface LeagueRow { name: string; points: number; me: boolean }

/**
 * The table at time t. Seven rivals earn stars at their own steady pace; two
 * keep just ahead of or just behind the player, so the player is overtaken
 * and can overtake (the pull of a close race).
 */
export function leagueTable(seed: number, startedAt: number, t: number, myPoints: number): LeagueRow[] {
  const rng = makeRng(seed);
  const hours = Math.max(0, Math.min(LEAGUE_DAYS * 24, (t - startedAt) / HOUR));
  const rows: LeagueRow[] = RIVALS.map((name, i) => {
    const rate = 0.4 + rng() * 1.6; // stars an hour
    if (i < 2) {
      // the two close rivals swing around the player's score
      const swing = Math.round(Math.sin(hours / (3 + i * 2) + i) * (3 + i * 2));
      return { name, points: Math.max(0, myPoints + swing + (i === 0 ? 2 : -1)), me: false };
    }
    const wobble = 0.85 + 0.3 * Math.abs(Math.sin(hours / 7 + i));
    return { name, points: Math.round(rate * hours * wobble), me: false };
  });
  rows.push({ name: 'Din by', points: myPoints, me: true });
  return rows.sort((a, b) => b.points - a.points || (a.me ? -1 : 1));
}

export function leagueRank(rows: LeagueRow[]): number {
  return rows.findIndex((r) => r.me) + 1;
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
  if (tier % 5 === 0) return { draw: true };
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
/** Made-up products for the pretend ads (no real brands). */
export const AD_TEXTS = [
  'Prova Bärplock, det nya spelet där du plockar bär i skogen!',
  'Kaffe från Brygghuset Nordanvind. Nu i ny förpackning.',
  'Sommarstugor till salu vid sjön. Ring Mäklarhuset Vassen.',
  'Ladda ner Fiskelyckan och vinn fina priser varje dag!',
];

