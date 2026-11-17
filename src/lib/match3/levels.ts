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
  { id: 1, name: 'Utmaning 1', rows: 8, cols: 8, kinds: 6, moves: 20, rigTarget: 1, goal: { type: 'collect', kind: 0, count: 16 } },
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
      const count = Math.round(16 + 14 * hard);
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

/** How many challenges there are in the row. After the last, it starts over at 1. */
export const CHALLENGE_COUNT = 40;
export const LEVELS: Level[] = Array.from({ length: CHALLENGE_COUNT }, (_, i) => makeChallenge(i + 1));

export function goalText(goal: Goal): string {
  switch (goal.type) {
    case 'collect': return `Samla ${goal.count} ${KIND_NAMES[goal.kind]}`;
    case 'ice': return 'Bryt all is';
    case 'score': return `Nå ${goal.score.toLocaleString('sv-SE')} poäng`;
  }
}
