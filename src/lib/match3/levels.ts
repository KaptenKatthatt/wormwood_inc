/**
 * The challenges (Jonas, 2026-11-17: no level select, challenges come one
 * after another). Each has a goal and a number of moves: collect tiles of one
 * kind, break the ice, or reach a score. The first three are the original
 * levels; the rest are built from a few settings and get slowly harder.
 */
export type Goal =
  | { type: 'collect'; kind: number; count: number }
  | { type: 'ice' }
  | { type: 'score'; score: number };

export interface Level {
  id: number;
  name: string;
  rows: number;
  cols: number;
  kinds: number;
  moves: number;
  goal: Goal;
  /**
   * Where rigging aims the player's progress on the last move: 1 lets the
   * goal be reached just in time, below 1 makes the level end a hair short.
   */
  rigTarget: number;
  /** No rigging at all (the first challenge must be quick and easy). */
  noRig?: boolean;
  /** Cells covered by ice: [row, col]. */
  ice?: [number, number][];
}

/** The approved tiles ("Rödfärg och skärgård"), in kind order: file name and Swedish plural. */
export const TILES = ['fisk', 'ankare', 'snacka', 'fyr', 'tunna', 'bat'] as const;
export const KIND_NAMES = ['fiskar', 'ankare', 'snäckor', 'fyrar', 'tunnor', 'båtar'];

function block(r0: number, r1: number, c0: number, c1: number): [number, number][] {
  const out: [number, number][] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r, c]);
  return out;
}

const FIRST: Level[] = [
  // Jonas, 2026-11-17: the first one is very quick and easy (five kinds, no rigging).
  { id: 1, name: 'Utmaning 1', rows: 8, cols: 8, kinds: 5, moves: 12, rigTarget: 1, noRig: true, goal: { type: 'collect', kind: 0, count: 6 } },
  { id: 2, name: 'Utmaning 2', rows: 8, cols: 8, kinds: 6, moves: 22, rigTarget: 1, goal: { type: 'ice' }, ice: block(3, 4, 2, 5) },
  { id: 3, name: 'Utmaning 3', rows: 8, cols: 8, kinds: 6, moves: 16, rigTarget: 0.93, goal: { type: 'score', score: 2600 } },
];

/** Ice shapes for the generated challenges, as blocks [r0, r1, c0, c1]. */
const ICE_SHAPES: [number, number, number, number][] = [
  [3, 4, 2, 5], [5, 6, 1, 6], [2, 5, 3, 4], [4, 6, 2, 5], [1, 2, 0, 7], [3, 6, 1, 6],
];

/**
 * Challenge n (1-based) from settings: goals take turns (collect, ice, score),
 * the targets grow a little with n, every fifth one is a harder "peak" that
 * is rigged to end just short, and the one after it is an easy breather.
 */
export function makeChallenge(n: number): Level {
  if (n <= FIRST.length) return FIRST[n - 1];
  const step = n - FIRST.length; // 1, 2, 3 ...
  const peak = n % 5 === 0;
  const breather = n % 5 === 1;
  const hard = Math.min(1, step / 37) + (peak ? 0.25 : 0) - (breather ? 0.2 : 0);
  const base = { id: n, name: `Utmaning ${n}`, rows: 8, cols: 8, kinds: 6, rigTarget: peak ? 0.93 : 1 };
  switch (n % 3) {
    case 1: {
      // Jonas, 2026-11-17: too many to collect; start at 8 and climb slowly to about 20.
      const count = Math.round(8 + 12 * Math.max(0, hard));
      return { ...base, moves: Math.round(20 + 2 * hard), goal: { type: 'collect', kind: n % TILES.length, count } };
    }
    case 2: {
      const [r0, r1, c0, c1] = ICE_SHAPES[step % ICE_SHAPES.length];
      return { ...base, moves: Math.round(22 + 4 * hard), goal: { type: 'ice' }, ice: block(r0, r1, c0, c1) };
    }
    default: {
      const score = Math.round((2600 + 2400 * hard) / 100) * 100;
      return { ...base, moves: Math.round(16 + 3 * hard), goal: { type: 'score', score } };
    }
  }
}

/** How many challenges the first world has (the pilot's whole road). After the last, it starts over at 1. */
export const CHALLENGE_COUNT = 40;
export const LEVELS: Level[] = Array.from({ length: CHALLENGE_COUNT }, (_, i) => makeChallenge(i + 1));

/**
 * The five worlds (Jonas, 2026-11-17: 200 challenges). Names are working names.
 * World 1 is the painted summer map with challenges 1-40, unchanged.
 */
export interface World { id: number; name: string; from: number; to: number; blurb: string }
export const WORLDS: World[] = [
  { id: 1, name: 'Sommarlandet', from: 1, to: 40, blurb: 'Skärgård, skog och fjäll i sommarljus.' },
  { id: 2, name: 'Slätten', from: 41, to: 80, blurb: 'Rapsfält, väderkvarnar och långa alléer.' },
  { id: 3, name: 'Bergslagen', from: 81, to: 120, blurb: 'Bruksorter, gruvhål och höstskog.' },
  { id: 4, name: 'Höga kusten', from: 121, to: 160, blurb: 'Branta klippor och fiskelägen vid havet.' },
  { id: 5, name: 'Vintermarknaden', from: 161, to: 200, blurb: 'Snö, marknadsstånd och levande ljus.' },
];
export const TOTAL_CHALLENGES = 200;

export function worldOf(n: number): World {
  return WORLDS.find((w) => n >= w.from && n <= w.to) ?? WORLDS[0];
}

/**
 * Challenges 41-200. Each world starts a little easier than the last one
 * ended and climbs again, so a new world feels like a fresh start. The same
 * rhythm as world 1: every fifth is a rigged peak, the next a breather.
 */
export function makeLaterChallenge(n: number): Level {
  const w = worldOf(n);
  const inWorld = (n - w.from) / 39; // 0 to 1 across the world
  const peak = n % 5 === 0;
  const breather = n % 5 === 1;
  const base0 = 0.45 + 0.1 * (w.id - 2); // world 2 starts at 0.45, world 5 at 0.75
  const hard = Math.min(1.35, base0 + 0.45 * inWorld + (peak ? 0.25 : 0) - (breather ? 0.2 : 0));
  const base = { id: n, name: `Utmaning ${n}`, rows: 8, cols: 8, kinds: 6, rigTarget: peak ? 0.93 : 1 };
  switch (n % 3) {
    case 1: {
      const count = Math.round(10 + 12 * hard);
      return { ...base, moves: Math.round(20 + 3 * hard), goal: { type: 'collect', kind: (n + w.id) % TILES.length, count } };
    }
    case 2: {
      const [r0, r1, c0, c1] = ICE_SHAPES[(n + w.id) % ICE_SHAPES.length];
      return { ...base, moves: Math.round(22 + 5 * hard), goal: { type: 'ice' }, ice: block(r0, r1, c0, c1) };
    }
    default: {
      const score = Math.round((2800 + 2600 * hard) / 100) * 100;
      return { ...base, moves: Math.round(16 + 4 * hard), goal: { type: 'score', score } };
    }
  }
}

export const ALL_LEVELS: Level[] = [...LEVELS, ...Array.from({ length: TOTAL_CHALLENGES - CHALLENGE_COUNT }, (_, i) => makeLaterChallenge(CHALLENGE_COUNT + i + 1))];

/** Challenge n, 1-based (clamped to the road). */
export function levelAt(n: number): Level {
  return ALL_LEVELS[Math.min(ALL_LEVELS.length, Math.max(1, Math.round(n))) - 1];
}

export function goalText(goal: Goal): string {
  switch (goal.type) {
    case 'collect': return `Samla ${goal.count} ${KIND_NAMES[goal.kind]}`;
    case 'ice': return 'Bryt all is';
    case 'score': return `Nå ${goal.score.toLocaleString('sv-SE')} poäng`;
  }
}
