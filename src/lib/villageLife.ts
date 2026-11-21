/**
 * Life in the village (Jonas approved the three figures on 2026-11-20): small
 * people walk the painted roads. Pure decoration: nothing can be pressed and
 * nothing is earned. Who walks depends on what is built:
 * villagers come with Stugan, soldiers with the soldiers the player has
 * trained, and the priest with Kapellet.
 *
 * Everything here is in the pixels of the village background (1024 x 1536).
 * A figure is 28 px tall there, 1.3 times true scale like the doors of the
 * houses (the architect's measure). The scene draws them; this file only
 * decides who is there and where they go.
 */
export type FigureKind = 'villager' | 'soldier' | 'priest';
type Levels = Partial<Record<string, number>>;

/** Points on the painted roads. Names starting with x lie outside the picture. */
export const NODES: Record<string, [number, number]> = {
  // round the well
  rN: [452, 752], rNE: [507, 754], rE: [528, 792], rSE: [510, 822], rS: [478, 832], rSW: [440, 826], rW: [418, 802], rNW: [425, 772],
  // the north road into the forest, with the north tower and the mill path
  b: [400, 670], c: [360, 600], d: [342, 550], tn: [325, 522], e: [300, 480], f: [268, 420], g: [215, 330], h: [160, 200], i: [135, 90], xN: [120, -20],
  m1: [410, 537], mill: [492, 532],
  // the east road, with Stugan's door and the east tower
  e1: [560, 762], cj: [610, 748], cd: [604, 729], e2: [680, 730], to: [775, 702], gate: [815, 682], e3: [940, 640], xE: [1050, 612],
  // the west road, with Kapellet's door, the west tower and the path to Smedjan
  w1: [400, 817], wj: [330, 833], chp: [328, 810], chd: [325, 791], w2: [200, 870], tv: [160, 885], wg: [125, 897], w3: [50, 920], xW: [-25, 942],
  s1: [146, 920], s2: [156, 960], sm: [165, 1004],
  // the south road past the south tower to the jetty
  sa: [560, 865], sb: [600, 895], sc: [648, 943], ts: [674, 975], se: [692, 1005], sf: [712, 1050], sg: [726, 1085], dk1: [742, 1098], dk2: [782, 1166],
};

const CHAINS: string[][] = [
  ['rN', 'rNE', 'rE', 'rSE', 'rS', 'rSW', 'rW', 'rNW', 'rN'],
  ['rN', 'b', 'c', 'd', 'tn', 'e', 'f', 'g', 'h', 'i', 'xN'],
  ['d', 'm1', 'mill'],
  ['rE', 'e1', 'cj', 'e2', 'to', 'gate', 'e3', 'xE'],
  ['cj', 'cd'],
  ['rW', 'w1', 'wj', 'w2', 'tv', 'wg', 'w3', 'xW'],
  ['wj', 'chp', 'chd'],
  ['wg', 's1', 's2', 'sm'],
  ['rSE', 'sa', 'sb', 'sc', 'ts', 'se', 'sf', 'sg', 'dk1', 'dk2'],
];

const NEXT: Record<string, string[]> = {};
for (const k of Object.keys(NODES)) NEXT[k] = [];
for (const chain of CHAINS) {
  for (let n = 1; n < chain.length; n++) {
    NEXT[chain[n - 1]].push(chain[n]);
    NEXT[chain[n]].push(chain[n - 1]);
  }
}

/** The points to pass from a to b along the roads, b last; empty when a is b. */
export function route(a: string, b: string): string[] {
  const prev: Record<string, string | null> = { [a]: null };
  const queue = [a];
  while (queue.length > 0) {
    const n = queue.shift()!;
    if (n === b) break;
    for (const m of NEXT[n]) if (!(m in prev)) { prev[m] = n; queue.push(m); }
  }
  const path: string[] = [];
  for (let n: string | null = b; n !== null && n !== a; n = prev[n] ?? null) path.unshift(n);
  return path;
}

/** Pixels a second on the ground, and seconds to stand at a goal. */
export const KINDS: Record<FigureKind, { speed: number; wait: [number, number] }> = {
  villager: { speed: 24, wait: [2, 6] },
  soldier: { speed: 24, wait: [5, 10] },
  priest: { speed: 15, wait: [3, 7] },
};

const has = (levels: Levels, id: string): boolean => (levels[id] ?? 0) > 0;

/** Who walks in the village, from the buildings' levels and the trained soldiers. */
export function cast(levels: Levels, soldiers: number): FigureKind[] {
  const stugan = levels.stugan ?? 0;
  const villagers = stugan >= 8 ? 3 : stugan >= 4 ? 2 : stugan >= 1 ? 1 : 0;
  const guards = !has(levels, 'kasernen') ? 0 : soldiers >= 6 ? 3 : soldiers >= 3 ? 2 : soldiers >= 1 ? 1 : 0;
  const out: FigureKind[] = [];
  for (let n = 0; n < villagers; n++) out.push('villager');
  for (let n = 0; n < guards; n++) out.push('soldier');
  if (has(levels, 'kapellet')) out.push('priest');
  return out;
}

/** Where a kind of figure may go: only to buildings that stand. */
export function goals(kind: FigureKind, levels: Levels): string[] {
  const out: string[] = [];
  const add = (node: string, building?: string): void => { if (!building || has(levels, building)) out.push(node); };
  if (kind === 'villager') {
    add('rS'); add('rNE'); add('xE'); add('cd', 'stugan'); add('chd', 'kapellet'); add('sm', 'smedjan'); add('mill', 'kvarnen'); add('dk2', 'sjoboden');
  } else if (kind === 'soldier') {
    add('tn', 'vakttornet'); add('to', 'tornet_o'); add('ts', 'tornet_s'); add('tv', 'tornet_v');
    if (out.length < 2) { out.push('gate'); out.push('wg'); } // too few towers: between the gates
  } else {
    add('rW'); add('dk1'); add('xN'); add('chd', 'kapellet'); add('cd', 'stugan'); add('mill', 'kvarnen');
  }
  return out;
}

export interface Walker {
  kind: FigureKind;
  /** The point last reached. */
  at: string;
  x: number;
  y: number;
  path: string[];
  /** Ground walked, for the step of the walk. */
  dist: number;
  /** Seconds left to stand still. */
  wait: number;
  /** Seen from the front (walking down the screen) or from behind. */
  front: boolean;
  /** Mirrored: the pictures walk down-left and up-right. */
  flip: boolean;
  moving: boolean;
}

/** Heights are drawn shorter than widths in the village picture; a step up the screen covers more ground. */
const GROUND_Y = 0.7;

export function spawn(kind: FigureKind, levels: Levels, rnd: () => number = Math.random): Walker {
  const g = goals(kind, levels).filter((n) => !n.startsWith('x'));
  const at = g[Math.floor(rnd() * g.length)] ?? 'rS';
  const [x, y] = NODES[at];
  return { kind, at, x, y, path: [], dist: rnd() * 30, wait: rnd() * 3, front: true, flip: rnd() < 0.5, moving: false };
}

/** Moves a walker dt seconds on: stand, pick a new goal, or walk toward it. */
export function step(w: Walker, dt: number, levels: Levels, rnd: () => number = Math.random): void {
  const kind = KINDS[w.kind];
  if (w.wait > 0) { w.wait -= dt; w.moving = false; return; }
  if (w.path.length === 0) {
    const g = goals(w.kind, levels).filter((n) => n !== w.at);
    if (g.length === 0) { w.wait = 5; return; }
    w.path = route(w.at, g[Math.floor(rnd() * g.length)]);
  }
  let left = kind.speed * dt;
  w.moving = true;
  while (left > 0 && w.path.length > 0) {
    const [tx, ty] = NODES[w.path[0]];
    const dx = tx - w.x;
    const dy = ty - w.y;
    const len = Math.hypot(dx, dy / GROUND_Y);
    if (len > 0.01) {
      w.front = dy >= -0.15 * Math.abs(dx);
      w.flip = w.front ? dx > 0 : dx < 0;
    }
    if (len <= left) {
      w.x = tx; w.y = ty; w.dist += len; left -= len;
      w.at = w.path.shift()!;
      if (w.path.length === 0) {
        w.wait = kind.wait[0] + rnd() * (kind.wait[1] - kind.wait[0]);
        if (w.at.startsWith('x')) w.wait += 4; // out of the picture for a while
      }
    } else {
      const f = left / len;
      w.x += dx * f; w.y += dy * f; w.dist += left; left = 0;
    }
  }
}

/** Ground for one whole stride (four pictures). */
export const STRIDE = 30;
/** Which of the four pictures of the walk; the second is the one for standing. */
export function frameOf(w: Walker): number {
  return w.moving ? Math.floor(w.dist / (STRIDE / 4)) % 4 : 1;
}

/** Makes the walkers match the cast, keeping those already there where they are. */
export function recast(walkers: Walker[], want: FigureKind[], levels: Levels, rnd: () => number = Math.random): Walker[] {
  const pool = [...walkers];
  return want.map((kind) => {
    const n = pool.findIndex((w) => w.kind === kind);
    return n >= 0 ? pool.splice(n, 1)[0] : spawn(kind, levels, rnd);
  });
}

/**
 * The smith (Jonas approved him on 2026-11-20): he stands at the anvil inside
 * Smedjan and hammers a glowing iron, four blows and then a short rest. His feet by
 * Smedjan's stage, so that the iron lies on the face of that stage's anvil.
 */
export const SMITH_AT: Record<'1' | '2' | '3', [number, number]> = { '1': [233, 984], '2': [233, 972], '3': [226, 976] };
/** Where the sparks fly from, from his feet. */
export const SMITH_SPARK: [number, number] = [-7, -12];
/** One blow: the picture and how long it shows. The hammer lands in picture 2. */
const BLOW: [number, number][] = [[0, 0.3], [1, 0.07], [2, 0.11], [3, 0.14]];
export const SMITH_BLOWS = 4;
export const SMITH_REST = 2.2;
/**
 * He hammers for eight seconds and then stands idle for a good while, so the
 * hammering is an event that comes back now and then (Jonas, 2026-11-20).
 */
export const SMITH_WORK = 8;
/** Seconds idle between two spells of hammering, and before the first one. */
export const SMITH_IDLE: [number, number] = [45, 120];
export const SMITH_FIRST: [number, number] = [4, 15];
export interface Smith { frame: number; t: number; i: number; blows: number; resting: boolean; work: number; idle: number }
export function newSmith(rnd: () => number = Math.random): Smith {
  return { frame: 3, t: 0, i: -1, blows: 0, resting: false, work: 0, idle: SMITH_FIRST[0] + rnd() * (SMITH_FIRST[1] - SMITH_FIRST[0]) };
}
/** Moves the smith on by dt seconds; true at the moment the hammer lands. */
export function stepSmith(s: Smith, dt: number, rnd: () => number = Math.random): boolean {
  if (s.idle > 0) {
    s.idle -= dt;
    if (s.idle > 0) return false;
    s.work = SMITH_WORK; s.t = 0; s.i = -1; s.blows = 0; s.resting = false;
  }
  s.work -= dt;
  s.t -= dt;
  if (s.t > 0) return false;
  // A blow is finished (the hammer is up again): stop here when the eight seconds are over.
  if (s.work <= 0 && s.frame === 3) {
    s.idle = SMITH_IDLE[0] + rnd() * (SMITH_IDLE[1] - SMITH_IDLE[0]);
    return false;
  }
  if (s.resting) { s.resting = false; s.i = -1; s.blows = 0; }
  s.i = (s.i + 1) % BLOW.length;
  [s.frame, s.t] = BLOW[s.i];
  if (s.frame === 3 && ++s.blows >= SMITH_BLOWS) { s.resting = true; s.t = SMITH_REST; }
  return s.frame === 2;
}

/**
 * The fencers (Jonas approved them on 2026-11-20): two soldiers practise with
 * rapiers in the yard of Kasernen. They fence for about eight seconds and then
 * stand with lowered blades for a good while, like the smith. Their feet by
 * Kasernen's stage: a on the left facing right, b on the right facing left.
 */
export const FENCERS_AT: Record<'1' | '2' | '3', { a: [number, number]; b: [number, number] }> = {
  '1': { a: [322, 978], b: [354, 978] },
  '2': { a: [411, 978], b: [443, 978] },
  '3': { a: [409, 992], b: [441, 992] },
};
/** The pictures: on guard, lunge, parry, blade lowered. */
export const FENCE = { guard: 0, lunge: 1, parry: 2, low: 3 } as const;
/** How far the one who parries steps back, so that the point stops at the blade and nobody looks hit. */
export const FENCE_BACK = 2.5;
/** One bout: picture of a, picture of b, seconds. A lunge always meets a parry. */
export const BOUT: [number, number, number][] = [
  [0, 0, 0.55], [1, 2, 0.34], [0, 0, 0.42], [2, 1, 0.34], [0, 0, 0.38], [1, 2, 0.3], [2, 1, 0.32], [0, 0, 0.5], [3, 0, 0.4], [2, 1, 0.34],
  [1, 2, 0.32], [0, 0, 0.48], [1, 2, 0.34], [0, 3, 0.4], [2, 1, 0.34], [0, 0, 0.45], [1, 2, 0.3], [2, 1, 0.3], [0, 0, 0.5],
];
export const FENCE_IDLE: [number, number] = [45, 120];
export const FENCE_FIRST: [number, number] = [8, 25];
/**
 * They are only in the yard while they fence (Jonas, 2026-11-21: soldiers standing frozen
 * in front of the barracks will not do): they fade in, fence and fade out again.
 */
export const FENCE_FADE = 0.6;
export interface Fencing { a: number; b: number; i: number; t: number; rest: number }
export function newFencing(rnd: () => number = Math.random): Fencing {
  return { a: FENCE.guard, b: FENCE.guard, i: -1, t: FENCE_FIRST[0] + rnd() * (FENCE_FIRST[1] - FENCE_FIRST[0]), rest: 0 };
}
/** Moves the fencers on by dt seconds. */
export function stepFencing(f: Fencing, dt: number, rnd: () => number = Math.random): void {
  f.t -= dt;
  if (f.t > 0) return;
  f.i++;
  if (f.i >= BOUT.length) {
    f.i = -1; f.a = f.b = FENCE.guard;
    f.t = f.rest = FENCE_IDLE[0] + rnd() * (FENCE_IDLE[1] - FENCE_IDLE[0]);
    return;
  }
  [f.a, f.b, f.t] = BOUT[f.i];
}

/** How much of the fencers shows: 1 while they fence, fading at both ends, 0 in between. */
export function fencersShown(f: Fencing): number {
  if (f.i >= 0) return 1;
  const gone = f.rest - f.t; // seconds since the bout ended
  const out = gone >= 0 && gone < FENCE_FADE ? 1 - gone / FENCE_FADE : 0;
  const into = f.t < FENCE_FADE ? 1 - f.t / FENCE_FADE : 0;
  return Math.min(1, Math.max(out, into));
}
