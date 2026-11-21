import { describe, expect, it } from 'vitest';
import { Match3, POWER, STEN, STOCK, TANG } from '../src/lib/match3/engine';
import { LEVELS, goalText, regionOf, type Level } from '../src/lib/match3/levels';
import { makeRng } from '../src/lib/match3/rng';

const level: Level = { id: 99, name: 'Test', rows: 6, cols: 6, kinds: 6, moves: 10, rigTarget: 1, goal: { type: 'score', score: 1e9 } };
const rng = () => 0.5;
// A board with no lines.
const base = () => [
  [0, 1, 2, 3, 4, 5],
  [1, 2, 3, 4, 5, 0],
  [2, 3, 4, 5, 0, 1],
  [3, 4, 5, 0, 1, 2],
  [4, 5, 0, 1, 2, 3],
  [5, 0, 1, 2, 3, 4],
];

describe('obstacles', () => {
  it('two layers of ice take two hits, and the tile stays after the first', () => {
    const g = new Match3({ ...level, goal: { type: 'ice' }, ice: [[3, 3, 2]] }, rng, false, base());
    const kind = g.board[3][3];
    g.smash({ r: 4, c: 3 });
    expect(g.ice[3][3]).toBe(1);
    expect(g.board[3][3]).toBe(kind);
    expect(g.progress()).toBeCloseTo(0.5);
    // the hammer on the frozen tile itself takes the last layer
    g.smash({ r: 3, c: 3 });
    expect(g.ice[3][3]).toBe(0);
    expect(g.status()).toBe('won');
  });

  it('a hit on two layers takes only one and leaves the tile', () => {
    const g = new Match3({ ...level, ice: [[2, 2, 2]] }, rng, false, base());
    const kind = g.board[2][2];
    g.smash({ r: 2, c: 2 });
    expect(g.ice[2][2]).toBe(1);
    expect(g.board[2][2]).toBe(kind);
  });

  it('a rocket tears a net of two layers off completely, with the tile under it', () => {
    const g = new Match3({ ...level, goal: { type: 'ice' }, ice: [[3, 4, 2], [3, 2, 1]] }, rng, false, base());
    g.board[3][0] = POWER; g.special[3][0] = 'right';
    const r = g.fire({ r: 3, c: 0 });
    expect(r.valid).toBe(true);
    expect(g.ice[3][4]).toBe(0);
    expect(g.ice[3][2]).toBe(0);
    expect(r.steps[0].cleared).toContainEqual({ r: 3, c: 4 });
    expect(g.status()).toBe('won');
  });

  it('fireworks still take one layer of a net of two', () => {
    const g = new Match3({ ...level, ice: [[2, 2, 2]] }, rng, false, base());
    g.board[3][3] = POWER; g.special[3][3] = 'area';
    // the first step is the blast itself; later steps are cascades after the refill
    const step = g.fire({ r: 3, c: 3 }).steps[0];
    expect(step.iceBroken).toContainEqual({ r: 2, c: 2, left: 1 });
    expect(step.cleared).not.toContainEqual({ r: 2, c: 2 });
  });

  it('moss goes when the tile on it is cleared', () => {
    const g = new Match3({ ...level, goal: { type: 'moss' }, moss: [[5, 0], [5, 1]] }, rng, false, base());
    const step = g.smash({ r: 5, c: 0 }).steps[0];
    expect(step.mossGone).toEqual([{ r: 5, c: 0 }]);
    expect(g.moss[5][0]).toBe(false);
    expect(g.progress()).toBeCloseTo(0.5);
  });

  it('seaweed goes when something beside it clears, and it does not fall', () => {
    const b = base();
    b[3][3] = TANG;
    const g = new Match3({ ...level, goal: { type: 'block', block: 'tang', count: 1 } }, rng, false, b);
    expect(g.trySwap({ r: 3, c: 3 }, { r: 3, c: 4 }).valid).toBe(false);
    g.smash({ r: 4, c: 3 });
    expect(g.board[3][3]).not.toBe(TANG);
    expect(g.blocksCleared).toBe(1);
    expect(g.status()).toBe('won');
  });

  it('seaweed grows by one cell after a move that clears none', () => {
    const b = base();
    b[0][0] = TANG;
    // a line of three far from the seaweed
    b[5] = [5, 0, 1, 2, 2, 4];
    b[4][5] = 2;
    const g = new Match3(level, makeRng(3), false, b);
    const r = g.trySwap({ r: 4, c: 5 }, { r: 5, c: 5 });
    expect(r.valid).toBe(true);
    expect(r.grew).toBeDefined();
    expect(g.countOf(TANG)).toBe(2);
  });

  it('a stone breaks only from a special or the hammer', () => {
    const b = base();
    b[2][2] = STEN;
    b[2][0] = POWER;
    const g = new Match3({ ...level, goal: { type: 'block', block: 'sten', count: 1 } }, rng, false, b);
    g.special[2][0] = 'right';
    g.smash({ r: 2, c: 1 }); // a clear beside it does nothing
    expect(g.board[2][2]).toBe(STEN);
    g.fire({ r: 2, c: 0 }); // the rocket takes the row
    expect(g.board[2][2]).not.toBe(STEN);
    expect(g.blocksCleared).toBe(1);
  });

  it('a log falls and is collected at the bottom row', () => {
    const b = base();
    b[3][2] = STOCK;
    const g = new Match3({ ...level, goal: { type: 'stock', count: 1 } }, rng, false, b);
    g.smash({ r: 4, c: 2 });
    g.smash({ r: 5, c: 3 }); // keep the board moving
    // the log is now on row 4; clear below it
    expect(g.board[4][2]).toBe(STOCK);
    g.smash({ r: 5, c: 2 });
    expect(g.stocksOut).toBe(1);
    expect(g.status()).toBe('won');
    expect(g.board.flat().includes(STOCK)).toBe(false);
  });

  it('a rocket passes over a log without breaking it', () => {
    const b = base();
    b[1][3] = STOCK;
    b[1][0] = POWER;
    const g = new Match3(level, rng, false, b);
    g.special[1][0] = 'right';
    g.fire({ r: 1, c: 0 });
    expect(g.board.flat().filter((k) => k === STOCK).length).toBe(1);
  });

  it('the challenges bring the obstacles in their regions', () => {
    expect(regionOf(1).id).toBe('skargard');
    expect(regionOf(14).id).toBe('skog');
    expect(regionOf(28).id).toBe('fjall');
    expect(LEVELS[4].intro).toBe('is');
    expect(LEVELS[9].intro).toBe('tang');
    expect(LEVELS[14].intro).toBe('mossa');
    expect(LEVELS[19].intro).toBe('stock');
    expect(LEVELS[29].intro).toBe('sno');
    expect(LEVELS[34].intro).toBe('sten');
    expect(goalText(LEVELS[29].goal, 30)).toBe('Skotta bort all snö');
    // no moss before the forest's intro, no snow before the fells'
    for (const l of LEVELS) {
      if (l.moss) expect(l.id).toBeGreaterThanOrEqual(15);
      if (l.ice && regionOf(l.id).id === 'fjall') expect(l.id).toBeGreaterThanOrEqual(30);
      if (l.ice && regionOf(l.id).id === 'skog') throw new Error(`ice in the forest at ${l.id}`);
    }
    // every obstacle challenge starts with a board that has a move
    for (const l of LEVELS) expect(new Match3(l, rng, false).hasMove()).toBe(true);
  });
});
