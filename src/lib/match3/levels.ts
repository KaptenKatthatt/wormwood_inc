/**
 * The challenges (Jonas, 2026-11-17: no level select, challenges come one
 * after another). Each has a goal and a number of moves: collect tiles of one
 * kind, break the ice, or reach a score. The first three are the original
 * levels; the rest are built from a few settings and get slowly harder.
 */
export type Goal =
  | { type: 'collect'; kind: number; count: number }
  /** Clear every layer of ice (or snow, in the fells). */
  | { type: 'ice' }
  | { type: 'score'; score: number }
  /** Clear all the moss under the tiles. */
  | { type: 'moss' }
  /** Clear `count` seaweed or stones. */
  | { type: 'block'; block: 'tang' | 'sten'; count: number }
  /** Bring every log down to the bottom of the board. */
  | { type: 'stock'; count: number };

/** An obstacle the player meets for the first time with an arrow and one sentence. */
export type Obstacle = 'is' | 'tang' | 'mossa' | 'stock' | 'sno' | 'sten';

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
  /** Cells covered by ice (snow in the fells): [row, col, layers]; layers default to 1. */
  ice?: [number, number, number?][];
  /** Moss under the tiles: cleared when the tile on it is cleared. */
  moss?: [number, number][];
  /** Seaweed: a block that a clear beside it removes, and that grows when left alone. */
  tang?: [number, number][];
  /** Stones: blocks that only specials (and the hammer) break. */
  sten?: [number, number][];
  /** Logs: they fall like tiles and are collected at the bottom row. */
  stock?: [number, number][];
  /** The obstacle this challenge introduces, shown with an arrow the first time. */
  intro?: Obstacle;
}

/**
 * The three regions of the first world (Jonas, 2026-11-18): the board changes
 * look as the player goes on, with its own background, six tiles and frame.
 * Tile file names are in kind order, with their Swedish plural.
 */
export interface Region {
  id: 'skargard' | 'skog' | 'fjall';
  first: number;
  tiles: readonly string[];
  /** The file extension of the tile pictures. */
  ext: 'png' | 'webp';
  names: readonly string[];
  background: string;
  /** Frame, light edge and dark edge of the board. */
  frame: number;
  light: number;
  dark: number;
}
export const REGIONS: Region[] = [
  { id: 'skargard', first: 1, tiles: ['fisk', 'ankare', 'snacka', 'fyr', 'tunna', 'bat'], ext: 'png', names: ['fiskar', 'ankare', 'snäckor', 'fyrar', 'tunnor', 'båtar'], background: '/art/bakgrund.jpg', frame: 0x8b2a1e, light: 0xc9473a, dark: 0x5a1d14 },
  { id: 'skog', first: 14, tiles: ['kotte', 'kantarell', 'blabar', 'lov', 'smultron', 'ljung'], ext: 'webp', names: ['kottar', 'kantareller', 'blåbär', 'löv', 'smultron', 'ljungkvistar'], background: '/art/bakgrund-skog.jpg', frame: 0x4f6b34, light: 0x6f8f4a, dark: 0x2f4220 },
  { id: 'fjall', first: 28, tiles: ['hjortron', 'fjallsippa', 'ryggsack', 'kasa', 'blaklocka', 'talt'], ext: 'webp', names: ['hjortron', 'fjällsippor', 'ryggsäckar', 'kåsor', 'blåklockor', 'tält'], background: '/art/bakgrund-fjall.jpg', frame: 0x4a6f8c, light: 0x6a92b2, dark: 0x2c4a62 },
];
export function regionOf(levelId: number): Region {
  const n = ((levelId - 1) % 40) + 1;
  return [...REGIONS].reverse().find((r) => n >= r.first)!;
}
export const tileUrl = (region: Region, kind: number): string => `/art/tiles/${region.tiles[kind]}.${region.ext}`;

/** The first region's tiles, kept for older callers. */
export const TILES = REGIONS[0].tiles;
export const KIND_NAMES = REGIONS[0].names;

/** The sentence shown with the arrow the first time an obstacle appears. */
export const OBSTACLE_TIPS: Record<Obstacle, string> = {
  is: 'Tjock is! Den spricker i två steg. Matcha bredvid den.',
  tang: 'Tången växer om du låter den vara. Matcha bredvid den!',
  mossa: 'Mossan försvinner när du matchar brickan som ligger på den.',
  stock: 'Få ner stockarna till botten av brädet. Rensa under dem!',
  sno: 'Snön försvinner ett lager i taget när du matchar bredvid den.',
  sten: 'Stenen spricker bara av specialbrickor. Gör en raket!',
};

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

const row = (r: number, c0: number, c1: number): [number, number][] => block(r, r, c0, c1);

/**
 * The obstacles (Jonas, 2026-11-18, option C): each region brings two, the
 * first in its fifth challenge and the second five later, and each is shown
 * the first time with an arrow and one sentence.
 */
const OBSTACLE_LEVELS: Record<number, Omit<Level, 'id' | 'name' | 'rows' | 'cols' | 'kinds' | 'rigTarget'>> = {
  5: { intro: 'is', moves: 26, goal: { type: 'ice' }, ice: block(3, 4, 1, 6).map(([r, c]) => [r, c, 2]) },
  10: { intro: 'tang', moves: 22, goal: { type: 'block', block: 'tang', count: 8 }, tang: [[3, 3], [3, 4], [4, 3], [4, 4], [5, 4]] },
  15: { intro: 'mossa', moves: 22, goal: { type: 'moss' }, moss: [...row(5, 1, 6), ...row(6, 1, 6)] },
  20: { intro: 'stock', moves: 22, goal: { type: 'stock', count: 3 }, stock: [[0, 2], [0, 5], [1, 3]] },
  25: { moves: 24, goal: { type: 'stock', count: 3 }, stock: [[0, 1], [0, 6], [1, 4]], moss: [...row(6, 0, 7), ...row(7, 0, 7)] },
  30: { intro: 'sno', moves: 24, goal: { type: 'ice' }, ice: [...row(0, 0, 7), ...row(1, 0, 7)].map(([r, c]) => [r, c, c < 2 || c > 5 ? 2 : 1]) },
  35: { intro: 'sten', moves: 24, goal: { type: 'block', block: 'sten', count: 4 }, sten: [[3, 2], [3, 5], [4, 2], [4, 5]] },
  40: { moves: 26, goal: { type: 'block', block: 'sten', count: 4 }, sten: [[4, 1], [4, 6], [5, 3], [5, 4]], ice: row(0, 0, 7).map(([r, c]) => [r, c, 1]) },
};

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
  const special = OBSTACLE_LEVELS[n];
  if (special) return { id: n, name: `Utmaning ${n}`, rows: 8, cols: 8, kinds: 6, rigTarget: 1, ...special };
  const step = n - FIRST.length; // 1, 2, 3 ...
  const peak = n % 5 === 0;
  const breather = n % 5 === 1;
  const hard = Math.min(1, step / 37) + (peak ? 0.25 : 0) - (breather ? 0.2 : 0);
  const base = { id: n, name: `Utmaning ${n}`, rows: 8, cols: 8, kinds: 6, rigTarget: peak ? 0.93 : 1 };
  // a region's covering obstacle only comes after it has been introduced
  const early = (regionOf(n).id === 'skog' && n < 15) || (regionOf(n).id === 'fjall' && n < 30);
  switch (n % 3 === 2 && early ? 1 : n % 3) {
    case 1: {
      // Jonas, 2026-11-17: too many to collect; start at 8 and climb slowly to about 20.
      const count = Math.round(8 + 12 * Math.max(0, hard));
      return { ...base, moves: Math.round(20 + 2 * hard), goal: { type: 'collect', kind: n % TILES.length, count } };
    }
    case 2: {
      const [r0, r1, c0, c1] = ICE_SHAPES[step % ICE_SHAPES.length];
      const cells = block(r0, r1, c0, c1);
      const region = regionOf(n).id;
      // each region covers the board in its own way: thick ice, moss, snow
      if (region === 'skog') return { ...base, moves: Math.round(20 + 3 * hard), goal: { type: 'moss' }, moss: cells };
      const layers = n >= 5 ? 2 : 1;
      return { ...base, moves: Math.round(22 + (layers === 2 ? 6 : 4) * hard + (layers === 2 ? 4 : 0)), goal: { type: 'ice' }, ice: cells.map(([r, c]) => [r, c, (r + c) % 2 ? layers : 1]) };
    }
    default: {
      const score = Math.round((2600 + 2400 * hard) / 100) * 100;
      return { ...base, moves: Math.round(16 + 3 * hard), goal: { type: 'score', score } };
    }
  }
}

/** How many challenges there are in the row. After the last, it starts over at 1. */
export const CHALLENGE_COUNT = 40;
export const LEVELS: Level[] = Array.from({ length: CHALLENGE_COUNT }, (_, i) => makeChallenge(i + 1));

export function goalText(goal: Goal, levelId = 1): string {
  const region = regionOf(levelId);
  switch (goal.type) {
    case 'collect': return `Samla ${goal.count} ${region.names[goal.kind]}`;
    case 'ice': return region.id === 'fjall' ? 'Skotta bort all snö' : 'Bryt all is';
    case 'score': return `Nå ${goal.score.toLocaleString('sv-SE')} poäng`;
    case 'moss': return 'Rensa bort all mossa';
    case 'block': return goal.block === 'tang' ? `Rensa ${goal.count} tång` : `Spräck ${goal.count} stenar`;
    case 'stock': return `Få ner ${goal.count} stockar`;
  }
}
