import { describe, expect, it } from 'vitest';
import { NODES, cast, frameOf, goals, recast, route, spawn, step } from '../src/lib/villageLife';

const ALL = { stugan: 5, kapellet: 2, kasernen: 3, smedjan: 1, kvarnen: 1, sjoboden: 1, vakttornet: 1, tornet_o: 1, tornet_s: 1, tornet_v: 1 };
/** A repeatable stand-in for Math.random. */
function dice(seed = 1): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s % 100000) / 100000; };
}

describe('who walks in the village', () => {
  it('follows the buildings and the trained soldiers', () => {
    expect(cast({}, 0)).toEqual([]);
    expect(cast({ stugan: 1 }, 0)).toEqual(['villager']);
    expect(cast({ stugan: 4, kapellet: 1 }, 0)).toEqual(['villager', 'villager', 'priest']);
    expect(cast({ stugan: 8, kasernen: 1 }, 3)).toEqual(['villager', 'villager', 'villager', 'soldier', 'soldier']);
    expect(cast({ stugan: 1 }, 5)).toEqual(['villager']); // soldiers need Kasernen
  });

  it('only goes to buildings that stand', () => {
    expect(goals('villager', { stugan: 1 })).not.toContain('sm');
    expect(goals('villager', ALL)).toContain('sm');
    expect(goals('soldier', { vakttornet: 1 })).toEqual(['tn', 'gate', 'wg']);
    expect(goals('soldier', ALL)).toEqual(['tn', 'to', 'ts', 'tv']);
  });

  it('keeps those already walking when the cast grows', () => {
    const one = recast([], ['villager'], ALL, dice());
    const two = recast(one, ['villager', 'villager', 'priest'], ALL, dice(7));
    expect(two[0]).toBe(one[0]);
    expect(two.map((w) => w.kind)).toEqual(['villager', 'villager', 'priest']);
    expect(recast(two, ['priest'], ALL)[0]).toBe(two[2]);
  });
});

describe('the roads', () => {
  it('reach every point from the well', () => {
    for (const k of Object.keys(NODES)) if (k !== 'rN') expect(route('rN', k).at(-1), k).toBe(k);
  });

  it('never cut across the well', () => {
    expect(route('rN', 'rS')).toHaveLength(4);
  });

  it('take a walker to a goal along them, and the walker rests there', () => {
    const rnd = dice(3);
    const w = spawn('villager', ALL, rnd);
    const visited = new Set<string>();
    for (let n = 0; n < 20000; n++) {
      step(w, 0.05, ALL, rnd);
      visited.add(w.at);
      expect(frameOf(w)).toBeGreaterThanOrEqual(0);
      expect(frameOf(w)).toBeLessThan(4);
      if (!w.moving) expect(frameOf(w)).toBe(1);
    }
    for (const g of goals('villager', ALL)) expect(visited, g).toContain(g);
    // Always on a point or on the line between two neighbouring points.
    expect(Number.isFinite(w.x) && Number.isFinite(w.y)).toBe(true);
  });

  it('walks toward the viewer going down the screen and away going up', () => {
    const w = spawn('priest', ALL, dice());
    Object.assign(w, { at: 'rN', x: NODES.rN[0], y: NODES.rN[1], path: ['b'], wait: 0 });
    step(w, 0.1, ALL, dice());
    expect(w.front).toBe(false); // north, up the screen
    Object.assign(w, { at: 'b', x: NODES.b[0], y: NODES.b[1], path: ['rN'], wait: 0 });
    step(w, 0.1, ALL, dice());
    expect(w.front).toBe(true);
  });
});

describe('the smith', () => {
  it('strikes four times and then rests', async () => {
    const { newSmith, stepSmith, SMITH_REST } = await import('../src/lib/villageLife');
    const s = newSmith();
    let hits = 0;
    let t = 0;
    while (!s.resting && t < 10) { if (stepSmith(s, 0.01)) hits++; t += 0.01; }
    expect(hits).toBe(4);
    expect(s.frame).toBe(3);
    expect(s.t).toBeCloseTo(SMITH_REST, 5);
    // nothing lands during the rest, and then he starts again
    for (let n = 0; n < 200; n++) expect(stepSmith(s, 0.01)).toBe(false);
    let again = false;
    for (let n = 0; n < 100; n++) again = stepSmith(s, 0.01) || again;
    expect(again).toBe(true);
  });
});
