import { describe, expect, it } from 'vitest';
import { Match3 } from '../src/lib/match3/engine';
import { LEVELS, type Level } from '../src/lib/match3/levels';
import { makeRng } from '../src/lib/match3/rng';

const small: Level = { id: 9, name: 't', rows: 4, cols: 4, kinds: 4, moves: 5, rigTarget: 1, goal: { type: 'collect', kind: 0, count: 3 } };

describe('match-3 engine', () => {
  it('starts without matches and with a legal move', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed < 20; seed++) {
        const g = new Match3(level, makeRng(seed), false);
        expect(g.findMatches()).toHaveLength(0);
        expect(g.hasMove()).toBe(true);
      }
    }
  });

  it('refuses a swap that makes no line, and keeps the move', () => {
    const board = [
      [0, 1, 2, 3],
      [1, 2, 3, 0],
      [2, 3, 0, 1],
      [3, 0, 1, 2],
    ];
    const g = new Match3(small, makeRng(1), false, board.map((r) => [...r]));
    const r = g.trySwap({ r: 0, c: 0 }, { r: 0, c: 1 });
    expect(r.valid).toBe(false);
    expect(g.movesLeft).toBe(5);
    expect(g.board).toEqual(board);
  });

  it('clears a line, counts the goal tiles, drops and refills', () => {
    const board = [
      [1, 2, 3, 1],
      [2, 3, 1, 2],
      [0, 0, 1, 0],
      [3, 1, 2, 3],
    ];
    const g = new Match3(small, makeRng(1), false, board);
    const r = g.trySwap({ r: 2, c: 2 }, { r: 2, c: 3 });
    expect(r.valid).toBe(true);
    expect(g.collected).toBeGreaterThanOrEqual(3);
    expect(g.status()).toBe('won');
    expect(g.movesLeft).toBe(4);
    expect(g.board.flat().every((k) => k >= 0)).toBe(true);
    expect(r.steps[0].cleared).toHaveLength(3);
    expect(r.steps[0].spawns.length).toBe(3);
  });

  it('breaks ice under matched tiles', () => {
    const lvl: Level = { ...small, goal: { type: 'ice' }, ice: [[2, 0]] };
    const board = [
      [1, 2, 3, 1],
      [2, 3, 1, 2],
      [0, 0, 1, 0],
      [3, 1, 2, 3],
    ];
    const g = new Match3(lvl, makeRng(1), false, board);
    g.trySwap({ r: 2, c: 2 }, { r: 2, c: 3 });
    expect(g.iceLeft()).toBe(0);
    expect(g.status()).toBe('won');
  });

  it('runs out of moves and can be given extra moves', () => {
    const g = new Match3({ ...LEVELS[2], moves: 1 }, makeRng(3), false);
    const move = g.findMove()!;
    g.trySwap(...move);
    expect(g.status()).toBe('out-of-moves');
    g.addMoves(5);
    expect(g.status()).toBe('playing');
  });

  /** Plays a whole level with a simple greedy bot and reports how it ended. */
  function playOut(level: Level, seed: number, rigged: boolean) {
    const g = new Match3(level, makeRng(seed), rigged);
    while (g.status() === 'playing') {
      const move = g.findMove();
      if (!move) break;
      g.trySwap(...move);
    }
    return { won: g.status() === 'won', progress: g.progress() };
  }

  it('rigging makes losses end close to the goal', () => {
    const runs = 60;
    const lostProgress = (rigged: boolean) => {
      const ps: number[] = [];
      for (let s = 1; s <= runs; s++) {
        const r = playOut(LEVELS[2], s, rigged);
        if (!r.won) ps.push(r.progress);
      }
      return ps;
    };
    const rig = lostProgress(true);
    const honest = lostProgress(false);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
    expect(rig.length).toBeGreaterThan(0);
    // rigged losses sit closer to the goal than honest ones
    expect(avg(rig)).toBeGreaterThan(avg(honest));
    expect(avg(rig)).toBeGreaterThan(0.75);
  });
});

describe('boosters', () => {
  it('the hammer removes a tile without using a move', () => {
    const g = new Match3(LEVELS[0], makeRng(5), false);
    const before = g.movesLeft;
    const r = g.smash({ r: 3, c: 3 });
    expect(r.valid).toBe(true);
    expect(r.steps[0].cleared).toEqual([{ r: 3, c: 3 }]);
    expect(g.movesLeft).toBe(before);
    expect(g.board.flat().every((k) => k >= 0)).toBe(true);
  });
  it('the shuffler keeps the tiles and leaves a move', () => {
    const g = new Match3(LEVELS[0], makeRng(9), false);
    const sorted = (b: number[][]) => b.flat().sort().join();
    const before = sorted(g.board);
    g.mix();
    expect(sorted(g.board)).toBe(before);
    expect(g.findMove()).not.toBeNull();
  });
});

describe('the first challenge', () => {
  it('is quick and easy: plain play wins it within its moves', () => {
    let wins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = new Match3(LEVELS[0], makeRng(seed), true);
      while (g.status() === 'playing') {
        const m = g.findMove();
        if (!m) break;
        g.trySwap(m[0], m[1]);
      }
      if (g.status() === 'won') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(34);
  });
});
