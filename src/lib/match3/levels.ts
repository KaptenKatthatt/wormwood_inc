/**
 * The three levels (game design, section 3 "Banorna"): collect tiles of one
 * kind, break the ice, reach a score. Level 3 is hard so most players run out
 * of lives there. Numbers are starting values to balance after the tests.
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

/** Swedish names of the tile kinds, in tile order. Placeholder until the art is chosen. */
export const KIND_NAMES = ['röda cirklar', 'blå rutor', 'gula trianglar', 'gröna romber', 'lila sexhörningar'];

function block(r0: number, r1: number, c0: number, c1: number): [number, number][] {
  const out: [number, number][] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r, c]);
  return out;
}

export const LEVELS: Level[] = [
  { id: 1, name: 'Bana 1', rows: 8, cols: 7, kinds: 5, moves: 20, rigTarget: 1, goal: { type: 'collect', kind: 0, count: 20 } },
  { id: 2, name: 'Bana 2', rows: 8, cols: 7, kinds: 5, moves: 18, rigTarget: 1, goal: { type: 'ice' }, ice: block(4, 6, 1, 5) },
  { id: 3, name: 'Bana 3', rows: 8, cols: 7, kinds: 5, moves: 14, rigTarget: 0.93, goal: { type: 'score', score: 3600 } },
];

export function goalText(goal: Goal): string {
  switch (goal.type) {
    case 'collect': return `Samla ${goal.count} ${KIND_NAMES[goal.kind]}`;
    case 'ice': return 'Bryt all is';
    case 'score': return `Nå ${goal.score.toLocaleString('sv-SE')} poäng`;
  }
}
