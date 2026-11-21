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
  it('hammers for eight seconds now and then, and stands idle in between', async () => {
    const { newSmith, stepSmith, SMITH_WORK, SMITH_IDLE, SMITH_FIRST } = await import('../src/lib/villageLife');
    const s = newSmith(() => 0);
    expect(s.idle).toBe(SMITH_FIRST[0]);
    const hits: number[] = [];
    for (let t = 0; t < 200; t += 0.01) if (stepSmith(s, 0.01, () => 0)) hits.push(t);
    const first = hits.filter((t) => t < 40);
    // the first spell starts after the first wait and lasts about eight seconds
    expect(first[0]).toBeGreaterThan(SMITH_FIRST[0]);
    expect(first[first.length - 1]).toBeLessThan(SMITH_FIRST[0] + SMITH_WORK + 1);
    expect(first.length).toBeGreaterThanOrEqual(8);
    // then nothing for the idle time, with the hammer up, and then a second spell
    const second = hits.filter((t) => t >= 40);
    expect(second[0]).toBeGreaterThan(SMITH_FIRST[0] + SMITH_WORK + SMITH_IDLE[0] - 1);
    expect(second.length).toBeGreaterThanOrEqual(8);
  });
  it('stands with the hammer up while idle', async () => {
    const { newSmith, stepSmith } = await import('../src/lib/villageLife');
    const s = newSmith(() => 0);
    for (let t = 0; t < 20; t += 0.01) stepSmith(s, 0.01, () => 0);
    expect(s.idle).toBeGreaterThan(0);
    expect(s.frame).toBe(3);
  });
});

describe('the fencers', () => {
  it('fence for about eight seconds now and then, and stand with lowered blades in between', async () => {
    const { newFencing, stepFencing, BOUT, FENCE, FENCE_FIRST, FENCE_IDLE } = await import('../src/lib/villageLife');
    const f = newFencing(() => 0);
    expect([f.a, f.b]).toEqual([FENCE.guard, FENCE.guard]);
    const busy: number[] = [];
    for (let t = 0; t < 120; t += 0.01) { stepFencing(f, 0.01, () => 0); if (f.i >= 0) busy.push(t); }
    const long = BOUT.reduce((n, b) => n + b[2], 0);
    expect(long).toBeGreaterThan(6);
    expect(long).toBeLessThan(9);
    const first = busy.filter((t) => t < FENCE_FIRST[0] + long + 1);
    expect(first[0]).toBeGreaterThan(FENCE_FIRST[0] - 0.1);
    const second = busy.filter((t) => t > FENCE_FIRST[0] + long + 1);
    expect(second[0]).toBeGreaterThan(FENCE_FIRST[0] + long + FENCE_IDLE[0] - 1);
  });
  it('never lets a lunge go unparried', async () => {
    const { BOUT, FENCE } = await import('../src/lib/villageLife');
    for (const [a, b] of BOUT) {
      if (a === FENCE.lunge) expect(b).toBe(FENCE.parry);
      if (b === FENCE.lunge) expect(a).toBe(FENCE.parry);
    }
  });
});

describe('the fencers between bouts', () => {
  it('are only in the yard while they fence', async () => {
    const { newFencing, stepFencing, fencersShown, FENCE_FADE } = await import('../src/lib/villageLife');
    const f = newFencing(() => 0);
    expect(fencersShown(f)).toBe(0);
    let fenced = 0, hidden = 0, half = 0;
    for (let t = 0; t < 120; t += 0.01) {
      stepFencing(f, 0.01, () => 0);
      const v = fencersShown(f);
      if (f.i >= 0) { fenced++; expect(v).toBe(1); }
      else if (v === 0) hidden++;
      else half++;
    }
    expect(fenced).toBeGreaterThan(0);
    // most of the time the yard is empty, and the fades are short
    expect(hidden).toBeGreaterThan(fenced * 4);
    expect(half * 0.01).toBeLessThan(5 * FENCE_FADE + 0.1); // two bouts and the start of a third
  });
});
