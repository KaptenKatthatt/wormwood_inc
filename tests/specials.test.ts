import { describe, expect, it } from 'vitest';
import { BOMB, POWER, Match3 } from '../src/lib/match3/engine';
import type { Level } from '../src/lib/match3/levels';

const level: Level = { id: 99, name: 'Test', rows: 6, cols: 6, kinds: 6, moves: 10, rigTarget: 1, goal: { type: 'score', score: 1e9 } };
const rng = () => 0.5;
// A board with no lines; tests set a few cells on top of it.
const base = () => [
  [0, 1, 2, 3, 4, 5],
  [1, 2, 3, 4, 5, 0],
  [2, 3, 4, 5, 0, 1],
  [3, 4, 5, 0, 1, 2],
  [4, 5, 0, 1, 2, 3],
  [5, 0, 1, 2, 3, 4],
];

describe('special tiles', () => {
  it('four in a row leaves a row tile where the player moved', () => {
    const b = base();
    b[0] = [0, 0, 5, 0, 4, 5]; // swap (0,2) with (1,2)? set (1,2)=0
    b[1][2] = 0;
    const g = new Match3(level, rng, false, b);
    const r = g.trySwap({ r: 1, c: 2 }, { r: 0, c: 2 });
    expect(r.valid).toBe(true);
    // 0,0,0,0 across row 0 -> a row tile at (0,2)
    expect(r.steps[0].made[0]).toMatchObject({ cell: { r: 0, c: 2 }, special: 'row', kind: POWER });
  });

  it('an L shape leaves an area tile, five in a row a compass', () => {
    const g = new Match3(level, rng, false, base());
    g.board = base();
    g.board[0] = [0, 0, 0, 3, 4, 5];
    g.board[1][0] = 0; g.board[2][0] = 0;
    expect(g.findGroups()[0]).toMatchObject({ across: true, down: true });
    g.board = base();
    g.board[0] = [0, 0, 0, 0, 0, 5];
    expect(g.findGroups()[0].longest).toBe(5);
  });

  it('a row tile clears its whole row when it goes', () => {
    const g = new Match3(level, rng, false, base());
    g.special[3][0] = 'row';
    const step = g.smash({ r: 3, c: 0 }).steps[0];
    expect(step.cleared.filter((x) => x.r === 3)).toHaveLength(6);
    expect(step.blasts[0].special).toBe('row');
  });

  it('a compass swapped with a tile clears every tile of that kind', () => {
    const b = base();
    b[0][0] = BOMB;
    const g = new Match3(level, rng, false, b);
    const r = g.trySwap({ r: 0, c: 0 }, { r: 0, c: 1 }); // kind 1
    expect(r.valid).toBe(true);
    expect(r.steps[0].cleared).toHaveLength(1 + 6);
    expect(g.findMove()).not.toBeNull();
  });

  it('a rocket has no kind: it never matches, and a tap sets it off for one move', () => {
    const b = base();
    b[2][0] = POWER; b[2][1] = POWER; b[2][2] = POWER;
    const g = new Match3(level, rng, false, b);
    g.special[2][0] = 'row'; g.special[2][1] = 'row'; g.special[2][2] = 'row';
    expect(g.findMatches()).toHaveLength(0);
    const r = g.fire({ r: 2, c: 1 });
    expect(r.valid).toBe(true);
    expect(g.movesLeft).toBe(level.moves - 1);
    expect(r.steps[0].cleared.filter((x) => x.r === 2)).toHaveLength(6);
  });

  it('swapping fireworks with any neighbour sets them off where they land', () => {
    const b = base();
    b[3][3] = POWER;
    const g = new Match3(level, rng, false, b);
    g.special[3][3] = 'area';
    const r = g.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 });
    expect(r.valid).toBe(true);
    expect(r.steps[0].blasts[0]).toMatchObject({ cell: { r: 3, c: 4 }, special: 'area' });
    expect(r.steps[0].cleared.length).toBeGreaterThanOrEqual(6);
  });

  it('a normal tile cannot be fired by a tap', () => {
    const g = new Match3(level, rng, false, base());
    expect(g.fire({ r: 0, c: 0 }).valid).toBe(false);
  });
});
