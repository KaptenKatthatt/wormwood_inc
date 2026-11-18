import { describe, expect, it } from 'vitest';
import { HOBAL, KLAPPER, MALM, Match3 } from '../src/lib/match3/engine';
import { ALL_LEVELS, goalText, regionOf, type Level } from '../src/lib/match3/levels';

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

describe('the obstacles of worlds 2 to 5', () => {
  it('ore takes two hits and shows what is left', () => {
    const b = base();
    b[3][3] = MALM;
    const g = new Match3({ ...level, goal: { type: 'block', block: 'malm', count: 1 } }, rng, false, b);
    expect(g.hp[3][3]).toBe(2);
    const first = g.smash({ r: 4, c: 3 }).steps[0];
    expect(first.blockHit).toEqual([{ r: 3, c: 3, left: 1 }]);
    expect(g.board[3][3]).toBe(MALM);
    expect(g.status()).not.toBe('won');
    g.smash({ r: 2, c: 3 });
    expect(g.board[3][3]).not.toBe(MALM);
    expect(g.blocksCleared).toBe(1);
    expect(g.status()).toBe('won');
  });

  it('a shingle stone takes three hits', () => {
    const b = base();
    b[0][0] = KLAPPER;
    const g = new Match3({ ...level, goal: { type: 'block', block: 'klapper', count: 1 } }, rng, false, b);
    for (const left of [2, 1]) {
      g.smash({ r: 1, c: 0 });
      expect(g.hp[0][0]).toBe(left);
      expect(g.board[0][0]).toBe(KLAPPER);
    }
    g.smash({ r: 0, c: 1 });
    expect(g.board[0][0]).not.toBe(KLAPPER);
    expect(g.status()).toBe('won');
  });

  it('a hay bale rolls one step away from a clear, and out over the edge', () => {
    const b = base();
    b[1][2] = HOBAL;
    const g = new Match3({ ...level, goal: { type: 'block', block: 'hobal', count: 1 } }, rng, false, b);
    // a clear below the bale pushes it up to row 0
    const step = g.smash({ r: 2, c: 2 }).steps[0];
    expect(step.rolled).toEqual([{ from: { r: 1, c: 2 }, to: { r: 0, c: 2 }, out: false }]);
    expect(g.board[0][2]).toBe(HOBAL);
    expect(g.status()).not.toBe('won');
    // next push takes it out over the top
    const out = g.smash({ r: 1, c: 2 }).steps[0];
    expect(out.rolled?.[0].out).toBe(true);
    expect(g.countOf(HOBAL)).toBe(0);
    expect(g.status()).toBe('won');
  });

  it('every world has its own tiles, cover and block, brought in with a tip', () => {
    expect([41, 81, 121, 161].map((n) => regionOf(n).id)).toEqual(['slatten', 'bergslagen', 'hogakusten', 'vinter']);
    expect(regionOf(200).id).toBe('vinter');
    for (const [first, cover, block] of [[41, 'lera', 'hobal'], [81, 'kol', 'malm'], [121, 'nat', 'klapper'], [161, 'frost', 'snogubbe']] as const) {
      const world = ALL_LEVELS.slice(first - 1, first + 39);
      expect(world.some((l) => l.intro === cover)).toBe(true);
      expect(ALL_LEVELS[first + 8].intro).toBe(block);
      expect(regionOf(first).tiles).toHaveLength(6);
    }
    expect(goalText(ALL_LEVELS[40].goal, 41)).toBe('Torka bort all lera');
    expect(goalText(ALL_LEVELS[160].goal, 161)).toBe('Smält all frost');
    expect(goalText(ALL_LEVELS[169].goal, 170)).toMatch(/Smält \d+ snögubbar/);
    // every board starts with a move
    for (const l of ALL_LEVELS) expect(new Match3(l, rng, false).hasMove()).toBe(true);
  });
});
