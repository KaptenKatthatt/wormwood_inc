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
  | { type: 'block'; block: 'tang' | 'sten' | 'malm' | 'klapper' | 'hobal'; count: number }
  /** Bring every log down to the bottom of the board. */
  | { type: 'stock'; count: number }
  /** Just make `count` moves: the introduction's first challenge (Jonas, 2026-11-19). */
  | { type: 'moves'; count: number };

/**
 * The first challenge as the introduction plays it: the move the hand shows and three practice
 * moves, and then it is cleared (Jonas, 2026-11-19). Without the introduction it is an ordinary challenge.
 */
export const introLevel = (l: Level): Level => ({ ...l, moves: 4, goal: { type: 'moves', count: 4 } });

/** An obstacle the player meets for the first time with an arrow and one sentence. */
export type Obstacle = 'is' | 'tang' | 'mossa' | 'stock' | 'sno' | 'sten'
  // worlds 2-5 (2026-11-18): four covers that work like ice, two blocks like stone and seaweed, three new
  | 'lera' | 'hobal' | 'kol' | 'malm' | 'nat' | 'klapper' | 'frost' | 'snogubbe' | 'sand';

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
  /** Ore: a block that takes two hits from clears beside it. */
  malm?: [number, number][];
  /** Beach stones: a block that takes three hits. */
  klapper?: [number, number][];
  /** Hay bales: a clear beside one rolls it a step away; off the edge it is gone. */
  hobal?: [number, number][];
  /** The obstacle this challenge introduces, shown with an arrow the first time. */
  intro?: Obstacle;
}

/**
 * The three regions of the first world (Jonas, 2026-11-18): the board changes
 * look as the player goes on, with its own background, six tiles and frame.
 * Tile file names are in kind order, with their Swedish plural.
 */
export interface Region {
  id: 'skargard' | 'skog' | 'fjall' | 'slatten' | 'bergslagen' | 'hogakusten' | 'vinter';
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
  /** The picture on cells under the `ice` layers, and how opaque one layer is (the first world: is or sno). */
  cover?: { picture: Obstacle; alpha: number };
  /** The picture for stone blocks (a snowman in the winter market). */
  stone?: Obstacle;
}
export const REGIONS: Region[] = [
  { id: 'skargard', first: 1, tiles: ['fisk', 'ankare', 'snacka', 'fyr', 'tunna', 'bat'], ext: 'png', names: ['fiskar', 'ankare', 'snäckor', 'fyrar', 'tunnor', 'båtar'], background: '/art/bakgrund.jpg', frame: 0x8b2a1e, light: 0xc9473a, dark: 0x5a1d14 },
  { id: 'skog', first: 14, tiles: ['kotte', 'kantarell', 'blabar', 'lov', 'smultron', 'ljung'], ext: 'webp', names: ['kottar', 'kantareller', 'blåbär', 'löv', 'smultron', 'ljungkvistar'], background: '/art/bakgrund-skog.jpg', frame: 0x4f6b34, light: 0x6f8f4a, dark: 0x2f4220 },
  { id: 'fjall', first: 28, tiles: ['hjortron', 'fjallsippa', 'ryggsack', 'kasa', 'blaklocka', 'talt'], ext: 'webp', names: ['hjortron', 'fjällsippor', 'ryggsäckar', 'kåsor', 'blåklockor', 'tält'], background: '/art/bakgrund-fjall.jpg', frame: 0x4a6f8c, light: 0x6a92b2, dark: 0x2c4a62 },
  // Worlds 2-5 (Jonas approved tiles, frames and obstacles 2026-11-18; mapping in pussel-stil/regioner/README.md).
  { id: 'slatten', first: 41, tiles: ['raps', 'vallmo', 'blaklint', 'apple', 'trasko', 'gas'], ext: 'webp', names: ['rapsblommor', 'vallmor', 'blåklintar', 'äpplen', 'träskor', 'gäss'], background: '/art/worlds/2/bakgrund.jpg', frame: 0xb07a24, light: 0xd29a3e, dark: 0x6e4a12, cover: { picture: 'lera', alpha: 0.9 } },
  { id: 'bergslagen', first: 81, tiles: ['lingon', 'gultlov', 'lykta', 'kristall', 'grankvist', 'ekollon'], ext: 'webp', names: ['lingon', 'höstlöv', 'gruvlyktor', 'kristaller', 'grankvistar', 'ekollon'], background: '/art/worlds/3/bakgrund.jpg', frame: 0x7a4630, light: 0x9c6446, dark: 0x4a2818, cover: { picture: 'kol', alpha: 0.92 } },
  { id: 'hogakusten', first: 121, tiles: ['sjostjarna', 'mussla', 'krabba', 'flote', 'fjader', 'korg'], ext: 'webp', names: ['sjöstjärnor', 'blåmusslor', 'krabbor', 'glasflöten', 'måsfjädrar', 'fiskekorgar'], background: '/art/worlds/4/bakgrund.jpg', frame: 0x2f6c6c, light: 0x4b8d8c, dark: 0x18403f, cover: { picture: 'sand', alpha: 1 } },
  { id: 'vinter', first: 161, tiles: ['pepparkaka', 'halmbock', 'julkula', 'vante', 'julgran', 'paket'], ext: 'webp', names: ['pepparkakor', 'halmbockar', 'julkulor', 'vantar', 'julgranar', 'paket'], background: '/art/worlds/5/bakgrund.jpg', frame: 0x7a3550, light: 0x9c4f6c, dark: 0x4a1c30, cover: { picture: 'frost', alpha: 0.75 }, stone: 'snogubbe' },
];
export function regionOf(levelId: number): Region {
  // challenges 41-200 have their own worlds; anything past the road starts over
  const n = ((levelId - 1) % 200) + 1;
  return [...REGIONS].reverse().find((r) => n >= r.first)!;
}
export const tileUrl = (region: Region, kind: number): string => `/art/tiles/${region.tiles[kind]}.${region.ext}`;

/** The first region's tiles, kept for older callers. */
export const TILES = REGIONS[0].tiles;
export const KIND_NAMES = REGIONS[0].names;

/** The sentence shown with the arrow the first time an obstacle appears. */
export const OBSTACLE_TIPS: Record<Obstacle, string> = {
  is: 'Fisknät! Brickan under sitter fast men går att matcha. Första träffen river nätet, den andra tar bort det.',
  tang: 'Tången växer om du låter den vara. Matcha bredvid den!',
  mossa: 'Mossan försvinner när du matchar brickan som ligger på den.',
  stock: 'Få ner stockarna till botten av brädet. Rensa under dem!',
  sno: 'Snön smälter när du matchar bredvid den. Djup snö tar två gånger.',
  sten: 'Stenen spricker bara av specialbrickor. Gör en raket!',
  lera: 'Leran torkar bort när du matchar på den eller bredvid den.',
  hobal: 'Matcha bredvid höbalen så rullar den undan. Rulla ut den ur brädet!',
  kol: 'Kolet sopas bort ett lager i taget när du matchar på det eller bredvid.',
  malm: 'Malmen tål två träffar. Matcha bredvid den två gånger.',
  nat: 'Brickor under nät sitter fast. Matcha dem där de ligger!',
  sand: 'Sanden täcker brickan. Matcha på den eller bredvid den så blåser den bort!',
  klapper: 'Klapperstenen tål tre träffar. Matcha bredvid den tre gånger!',
  frost: 'Frosten smälter i två steg. Matcha på den eller bredvid den.',
  snogubbe: 'Snögubben smälter bara av specialbrickor. Gör en raket!',
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
  const k = n - w.from; // 0 to 39 inside the world
  const inWorld = k / 39; // 0 to 1 across the world
  const peak = n % 5 === 0;
  const breather = n % 5 === 1;
  const base0 = 0.45 + 0.1 * (w.id - 2); // world 2 starts at 0.45, world 5 at 0.75
  const hard = Math.min(1.35, base0 + 0.45 * inWorld + (peak ? 0.25 : 0) - (breather ? 0.2 : 0));
  const base = { id: n, name: `Utmaning ${n}`, rows: 8, cols: 8, kinds: 6, rigTarget: peak ? 0.93 : 1 };
  const obs = WORLD_OBSTACLES[w.id];
  // the world's block: introduced in its tenth challenge, back in the 20th, 30th and 40th
  if (obs && (k === 9 || k === 19 || k === 29 || k === 39)) {
    const placed = obs.blockAt[(k - 9) / 10];
    const lvl: Level = { ...base, rigTarget: 1, moves: Math.round(obs.blockMoves + 2 * hard), goal: obs.blockGoal(placed.length), [obs.blockField]: placed };
    if (k === 9) lvl.intro = obs.block;
    if (k === 39) lvl.ice = row8(0).map(([r, c]) => [r, c, obs.layers(c)]);
    return lvl;
  }
  switch (n % 3) {
    case 1: {
      const count = Math.round(10 + 12 * hard);
      return { ...base, moves: Math.round(20 + 3 * hard), goal: { type: 'collect', kind: (n + w.id) % TILES.length, count } };
    }
    case 2: {
      const [r0, r1, c0, c1] = ICE_SHAPES[(n + w.id) % ICE_SHAPES.length];
      const cells = block(r0, r1, c0, c1);
      const lvl: Level = { ...base, moves: Math.round(22 + 5 * hard), goal: { type: 'ice' }, ice: obs ? cells.map(([r, c]) => [r, c, obs.layers(c)]) : cells };
      // the first cover of a world is shown with an arrow and a sentence
      if (obs && k <= 3) lvl.intro = obs.cover;
      return lvl;
    }
    default: {
      const score = Math.round((2800 + 2600 * hard) / 100) * 100;
      return { ...base, moves: Math.round(16 + 4 * hard), goal: { type: 'score', score } };
    }
  }
}

const row8 = (r: number): [number, number][] => block(r, r, 0, 7);
type BlockField = 'hobal' | 'malm' | 'klapper' | 'sten';
/**
 * Each later world's two obstacles (approved 2026-11-18): a cover that works
 * like ice with its own picture and layers, and a block.
 */
const WORLD_OBSTACLES: Record<number, { cover: Obstacle; block: Obstacle; layers: (c: number) => number; blockField: BlockField; blockMoves: number; blockGoal: (count: number) => Goal; blockAt: [number, number][][] }> = {
  2: {
    cover: 'lera', block: 'hobal', layers: () => 1, blockField: 'hobal', blockMoves: 24,
    blockGoal: (count) => ({ type: 'block', block: 'hobal', count }),
    // bales near the edges, so two or three rolls take them out
    blockAt: [[[1, 1], [1, 6], [6, 3]], [[1, 2], [6, 1], [6, 6]], [[0, 3], [3, 0], [3, 7], [7, 4]], [[1, 1], [1, 6], [6, 1], [6, 6]]],
  },
  3: {
    cover: 'kol', block: 'malm', layers: (c) => (c % 3 === 1 ? 2 : 1), blockField: 'malm', blockMoves: 22,
    blockGoal: (count) => ({ type: 'block', block: 'malm', count }),
    blockAt: [[[3, 2], [3, 5], [4, 2], [4, 5]], [[2, 3], [2, 4], [5, 3], [5, 4]], [[3, 1], [3, 6], [5, 2], [5, 5]], [[2, 2], [2, 5], [5, 2], [5, 5]]],
  },
  4: {
    cover: 'sand', block: 'klapper', layers: () => 1, blockField: 'klapper', blockMoves: 24,
    blockGoal: (count) => ({ type: 'block', block: 'klapper', count }),
    blockAt: [[[3, 3], [3, 4], [4, 3], [4, 4]], [[5, 1], [5, 2], [5, 5], [5, 6]], [[2, 3], [3, 3], [4, 4], [5, 4]], [[3, 1], [3, 6], [4, 1], [4, 6]]],
  },
  5: {
    cover: 'frost', block: 'snogubbe', layers: () => 2, blockField: 'sten', blockMoves: 24,
    blockGoal: (count) => ({ type: 'block', block: 'sten', count }),
    blockAt: [[[3, 2], [3, 5], [4, 2], [4, 5]], [[2, 3], [2, 4], [5, 3], [5, 4]], [[3, 1], [3, 6], [5, 3], [5, 4]], [[2, 2], [2, 5], [5, 2], [5, 5]]],
  },
};

export const ALL_LEVELS: Level[] = [...LEVELS, ...Array.from({ length: TOTAL_CHALLENGES - CHALLENGE_COUNT }, (_, i) => makeLaterChallenge(CHALLENGE_COUNT + i + 1))];

/** Challenge n, 1-based (clamped to the road). */
export function levelAt(n: number): Level {
  return ALL_LEVELS[Math.min(ALL_LEVELS.length, Math.max(1, Math.round(n))) - 1];
}

export function goalText(goal: Goal, levelId = 1): string {
  const region = regionOf(levelId);
  switch (goal.type) {
    case 'collect': return `Samla ${goal.count} ${region.names[goal.kind]}`;
    case 'ice': return ({ fjall: 'Skotta bort all snö', slatten: 'Torka bort all lera', bergslagen: 'Sopa bort allt kol', hogakusten: 'Sopa bort all sand', vinter: 'Smält all frost' } as Record<string, string>)[region.id] ?? 'Riv alla fisknät';
    case 'score': return `Nå ${goal.score.toLocaleString('sv-SE')} poäng`;
    case 'moss': return 'Rensa bort all mossa';
    case 'block': {
      if (goal.block === 'sten' && region.stone === 'snogubbe') return `Smält ${goal.count} snögubbar`;
      return { tang: `Rensa ${goal.count} tång`, sten: `Spräck ${goal.count} stenar`, malm: `Bryt ${goal.count} malmblock`, klapper: `Rensa ${goal.count} klapperstenar`, hobal: `Rulla bort ${goal.count} höbalar` }[goal.block];
    }
    case 'stock': return `Få ner ${goal.count} stockar`;
    case 'moves': return 'Lär dig byta plats på brickor';
  }
}
