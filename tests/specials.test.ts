import { describe, expect, it } from 'vitest';
import { BOMB, POWER, Match3, isRocket, type Special } from '../src/lib/match3/engine';
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
    expect(r.steps[0].made[0]).toMatchObject({ cell: { r: 0, c: 2 }, special: 'right', kind: POWER });
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
    g.special[3][0] = 'right';
    const step = g.smash({ r: 3, c: 0 }).steps[0];
    expect(step.cleared.filter((x) => x.r === 3)).toHaveLength(6);
    expect(step.blasts[0].special).toBe('right');
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
    g.special[2][0] = 'right'; g.special[2][1] = 'right'; g.special[2][2] = 'right';
    expect(g.findMatches()).toHaveLength(0);
    const r = g.fire({ r: 2, c: 1 });
    expect(r.valid).toBe(true);
    expect(g.movesLeft).toBe(level.moves - 1);
    expect(r.steps[0].cleared.filter((x) => x.r === 2)).toHaveLength(6); // forward to the edge, and the flame burns the rest
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

  it('a frozen tile cannot be moved and thaws when something beside it clears', () => {
    const iced: Level = { ...level, ice: [[3, 3]] };
    const b = base();
    const g = new Match3(iced, rng, false, b);
    expect(g.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 }).valid).toBe(false);
    expect(g.trySwap({ r: 2, c: 3 }, { r: 3, c: 3 }).valid).toBe(false);
    g.smash({ r: 4, c: 3 });
    expect(g.ice[3][3]).toBe(false); // thawed by the clear beside it
  });

  it('tiles above a frozen tile do not fall through it', () => {
    const iced: Level = { ...level, ice: [[3, 3]] };
    const g = new Match3(iced, rng, false, base());
    const kind = g.board[3][3];
    const step = g.smash({ r: 5, c: 3 }).steps[0];
    expect(g.ice[3][3]).toBe(true);
    expect(g.board[3][3]).toBe(kind);
    expect(step.falls.every((f) => !(f.from.r < 3 && f.to.r > 3))).toBe(true);
    expect(g.board.flat().every((k) => k >= 0)).toBe(true);
  });

  it('five in a row leaves a shining tile of its own kind that takes every tile of that kind', () => {
    const b = base();
    b[0] = [0, 0, 5, 0, 0, 4];
    b[1][2] = 0;
    const g = new Match3(level, rng, false, b);
    const r = g.trySwap({ r: 1, c: 2 }, { r: 0, c: 2 });
    expect(r.steps[0].made[0]).toMatchObject({ cell: { r: 0, c: 2 }, kind: 0, special: 'all' });
    g.board = base(); g.special = base().map((row) => row.map(() => null));
    g.special[2][2] = 'all'; // a shining kind-4 tile
    const fired = g.fire({ r: 2, c: 2 });
    expect(fired.valid).toBe(true);
    expect(fired.steps[0].cleared).toHaveLength(6); // every kind-4 tile on the base board
  });

  it('a rocket clears its whole line: forward, and the flame behind it', () => {
    const g = new Match3(level, rng, false, base());
    g.board[2][3] = POWER; g.special[2][3] = 'up';
    const step = g.fire({ r: 2, c: 3 }).steps[0];
    const col = step.cleared.filter((x) => x.c === 3).map((x) => x.r).sort();
    expect(col).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('a rocket points toward the side of the board with more tiles', () => {
    const b = base();
    b[0] = [0, 0, 5, 0, 4, 5];
    b[1][2] = 0;
    const g = new Match3(level, rng, false, b);
    const r = g.trySwap({ r: 1, c: 2 }, { r: 0, c: 2 });
    expect(r.steps[0].made[0].special).toBe('right'); // c=2 of 6: more room to the right
  });

  describe('two specials swapped together', () => {
    const setup = (sa: Special, sb: Special) => {
      const g = new Match3(level, rng, false, base());
      g.board[2][2] = POWER; g.special[2][2] = sa;
      g.board[2][3] = POWER; g.special[2][3] = sb;
      return g;
    };
    it('rocket and rocket clear a cross', () => {
      const g = setup('right', 'down');
      const step = g.trySwap({ r: 2, c: 2 }, { r: 2, c: 3 }).steps[0];
      const set = new Set(step.cleared.map((x) => `${x.r},${x.c}`));
      // b = (2,3): the whole row 2 and column 3
      for (let i = 0; i < 6; i++) { expect(set.has(`2,${i}`)).toBe(true); expect(set.has(`${i},3`)).toBe(true); }
    });
    it('rocket and fireworks clear three rows and three columns', () => {
      const g = setup('right', 'area');
      const step = g.trySwap({ r: 2, c: 2 }, { r: 2, c: 3 }).steps[0];
      expect(step.cleared.length).toBe(36 - 3 * 3); // all but the corners outside rows 1-3 and columns 2-4
    });
    it('a shining tile and a rocket turn every tile of its kind into rockets', () => {
      const g = new Match3(level, rng, false, base());
      g.special[2][2] = 'all'; // kind 4
      g.board[2][3] = POWER; g.special[2][3] = 'right';
      const step = g.trySwap({ r: 2, c: 2 }, { r: 2, c: 3 }).steps[0];
      expect(step.blasts.filter((x) => isRocket(x.special)).length).toBeGreaterThanOrEqual(5);
      expect(step.cleared.length).toBeGreaterThan(20);
    });
    it('two shining tiles clear the whole board', () => {
      const g = new Match3(level, rng, false, base());
      g.special[2][2] = 'all'; g.special[2][3] = 'all';
      const step = g.trySwap({ r: 2, c: 2 }, { r: 2, c: 3 }).steps[0];
      expect(step.cleared).toHaveLength(36);
    });
  });

  it('stars follow the moves left, and the finale spends them as rockets', () => {
    const won: Level = { ...level, moves: 10, goal: { type: 'score', score: 1 } };
    const g = new Match3(won, rng, false, base());
    g.score = 5; // goal reached with all 10 moves left
    expect(g.status()).toBe('won');
    expect(g.stars()).toBe(3);
    const steps = g.finale();
    expect(steps).toHaveLength(1);
    expect(g.leftAtWin).toBe(10);
    expect(g.movesLeft).toBe(0);
    expect(g.stars()).toBe(3); // still counted from the moves left at the win
    expect(steps[0].blasts.length).toBeGreaterThanOrEqual(10);
    expect(g.finale()).toEqual([]); // only once
    g.leftAtWin = 2; expect(g.stars()).toBe(2);
    g.leftAtWin = 0; expect(g.stars()).toBe(1);
  });
});
