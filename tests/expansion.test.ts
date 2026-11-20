import { describe, expect, it } from 'vitest';
import { ALL_LEVELS, CHALLENGE_COUNT, LEVELS, TOTAL_CHALLENGES, WORLDS, levelAt, makeChallenge, worldOf } from '../src/lib/match3/levels';
import { WEEK_STEPS, starsFor, stepOfHook, weekStepFor } from '../src/lib/expansion/week';
import { ADS, adGroupFor, adsFor, nextAd } from '../src/lib/expansion/social';
import { ALBUM_SIZE, drawSticker, leagueRank, leagueTable, passReward, passTier, setComplete } from '../src/lib/expansion/social';
import { FIELD_DEG, FLAP_GRIP, PITY_HARD, WHEEL, WHEEL_FREE_START, chestSkipGems, discField, drawChampion, landingAngle, legendaryChance, nearJackpot, openChest, segmentAtAngle, spinWheel } from '../src/lib/expansion/luck';
import { ERA_FACTOR, NEIGHBOURS, activeHelpers, battle, neighbourDefence, personalOffer, storehouse, vipTier } from '../src/lib/expansion/conquest';
import { BUILDINGS, START_VILLAGE, cleared } from '../src/lib/economy/village';
import { HOOKS, EXPANSION_HOOKS } from '../src/lib/hooks';
import { makeRng } from '../src/lib/match3/rng';
import { HOUR } from '../src/lib/time/clock';

describe('worlds and levels', () => {
  it('keeps the first world exactly as the pilot has it', () => {
    expect(LEVELS).toHaveLength(CHALLENGE_COUNT);
    for (let n = 1; n <= CHALLENGE_COUNT; n++) expect(ALL_LEVELS[n - 1]).toEqual(makeChallenge(n));
  });

  it('has 200 challenges in five worlds of 40', () => {
    expect(ALL_LEVELS).toHaveLength(TOTAL_CHALLENGES);
    expect(WORLDS.map((w) => w.to - w.from + 1)).toEqual([40, 40, 40, 40, 40]);
    expect(worldOf(41).name).toBe('Slätten');
    expect(worldOf(200).id).toBe(5);
    expect(levelAt(500).id).toBe(200);
    ALL_LEVELS.forEach((l, i) => {
      expect(l.id).toBe(i + 1);
      expect(l.moves).toBeGreaterThanOrEqual(12);
      expect(l.moves).toBeLessThanOrEqual(32);
    });
  });
});

describe('the week staircase', () => {
  it('starts each step on its day or its world, whichever is first', () => {
    expect(weekStepFor(1, 1)).toBe(5);
    expect(weekStepFor(2, 1)).toBe(6);
    expect(weekStepFor(1, 3)).toBe(7);
    expect(weekStepFor(4, 2)).toBe(8);
    expect(weekStepFor(6, 1)).toBe(9);
    expect(weekStepFor(1, 5)).toBe(9);
  });

  it('places all fifteen new hooks in steps 6-9, and stars in step 1', () => {
    const inSteps = WEEK_STEPS.flatMap((d) => d.hooks);
    expect(inSteps).toHaveLength(15);
    expect(new Set([...inSteps, 'stars'])).toEqual(new Set(EXPANSION_HOOKS));
    for (const id of EXPANSION_HOOKS) expect(HOOKS.some((h) => h.id === id)).toBe(true);
    expect(stepOfHook('wheel')).toBe(7);
  });

  it('gives stars by the share of moves left', () => {
    expect(starsFor(6, 20)).toBe(3);
    expect(starsFor(2, 20)).toBe(2);
    expect(starsFor(0, 20)).toBe(1);
  });
});

describe('step 6', () => {
  it('ranks the player among nine made-up villages', () => {
    const rows = leagueTable(7, 0, 24 * HOUR, 20);
    expect(rows).toHaveLength(10);
    expect(rows.filter((r) => r.me)).toHaveLength(1);
    const rank = leagueRank(rows);
    expect(rank).toBeGreaterThanOrEqual(1);
    expect(rank).toBeLessThanOrEqual(10);
  });

  it('makes the last sticker of a set rare', () => {
    const rng = makeRng(1);
    const counts = new Array(ALBUM_SIZE).fill(0);
    for (let i = 0; i < 6000; i++) counts[drawSticker(rng)]++;
    expect(counts[5]).toBeLessThan(counts[0] / 4);
    expect(setComplete([0, 1, 2, 3, 4, 5], 0)).toBe(true);
    expect(setComplete([0, 1, 2, 3, 4], 0)).toBe(false);
  });

  it('gives more on the gold track of the pass', () => {
    expect(passTier(35)).toBe(3);
    expect(passTier(10_000)).toBe(20);
    expect(passReward(5, true).draw).toBe(true);
    expect(passReward(5, false).gems).toBe(5);
  });
});

describe('step 7', () => {
  it('guarantees a legendary champion within the pity limit', () => {
    expect(legendaryChance(0)).toBeCloseTo(0.02);
    expect(legendaryChance(PITY_HARD - 1)).toBe(1);
    const rng = makeRng(3);
    let since = 0;
    let longest = 0;
    for (let i = 0; i < 2000; i++) {
      const d = drawChampion(rng, since);
      since = d.since;
      longest = Math.max(longest, since);
    }
    expect(longest).toBeLessThan(PITY_HARD);
  });

  it('stops the wheel beside the jackpot more often than on it', () => {
    const rng = makeRng(9);
    let near = 0;
    let jackpot = 0;
    for (let i = 0; i < 5000; i++) {
      const s = spinWheel(rng);
      if (nearJackpot(s)) near++;
      if (WHEEL[s].jackpot) jackpot++;
    }
    expect(near).toBeGreaterThan(jackpot * 20);
  });

  it('stops the painted wheel on the field that was drawn', () => {
    expect(WHEEL_FREE_START).toBe(3);
    expect(discField(WHEEL.findIndex((s) => s.jackpot))).toBe(1); // the gold field of the painting
    for (let i = 0; i < WHEEL.length; i++) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const a = landingAngle(i, r);
        expect(segmentAtAngle(a)).toBe(i);
        expect(segmentAtAngle(a + 720)).toBe(i);
      }
    }
    // Beside the jackpot the stop is staged within a few degrees of the peg that decides it.
    const j = WHEEL.findIndex((s) => s.jackpot);
    for (const i of [(j + 1) % WHEEL.length, (j + WHEEL.length - 1) % WHEEL.length]) {
      const past = (((landingAngle(i, 0.5) + FLAP_GRIP) % FIELD_DEG) + FIELD_DEG) % FIELD_DEG;
      expect(Math.min(past, FIELD_DEG - past)).toBeLessThan(6);
    }
  });

  it('fills a chest', () => {
    const l = openChest('royal', makeRng(2));
    expect(l.gold).toBeGreaterThanOrEqual(300);
    expect(l.stickers).toHaveLength(3);
  });
});

describe('opening a chest early', () => {
  it('costs one gem for every ten minutes left, and less than a royal chest', () => {
    expect(chestSkipGems(3 * 3600_000)).toBe(18);
    expect(chestSkipGems(134 * 60_000)).toBe(14);
    expect(chestSkipGems(1000)).toBe(1);
  });
});

describe('step 8 and 9', () => {
  it('makes the neighbours stronger with each soldier type', () => {
    const n = NEIGHBOURS[0];
    expect(neighbourDefence(n, 1)).toBe(n.defence);
    expect(neighbourDefence(n, 3)).toBe(Math.round(n.defence * ERA_FACTOR[3]));
    expect(NEIGHBOURS).toHaveLength(12);
  });

  it('wins a battle with a much stronger army and loses with a weak one', () => {
    expect(battle({ bonde: 20, knekt: 0, ryttare: 0 }, 0, 60, makeRng(1)).won).toBe(true);
    const lost = battle({ bonde: 2, knekt: 0, ryttare: 0 }, 0, 200, makeRng(1));
    expect(lost.won).toBe(false);
    expect(lost.lost.bonde).toBe(2);
  });

  it('lets gold rot after the storehouse is full', () => {
    const n = NEIGHBOURS[0];
    const s = storehouse(n, { id: n.id, since: 0, lastCollect: 0 }, 10 * HOUR, 8);
    expect(s.ready).toBe(n.goldPerHour * 8);
    expect(s.rotted).toBe(n.goldPerHour * 2);
  });

  it('picks the offer from what the player bought before', () => {
    expect(personalOffer(0).variant).toBe('first');
    expect(personalOffer(20).variant).toBe('upsell');
    expect(personalOffer(150).variant).toBe('big');
    expect(vipTier(0)).toBe(0);
    expect(vipTier(49)).toBe(2);
  });

  it('lets a helper move away without a gift for a day', () => {
    const h = [{ name: 'Karin', arrivesAt: 0, lastThanked: 0 }];
    expect(activeHelpers(h, 10 * HOUR)).toHaveLength(1);
    expect(activeHelpers(h, 25 * HOUR)).toHaveLength(0);
  });
});

describe('the bigger village', () => {
  it('clears the four new plots with the worlds', () => {
    expect(BUILDINGS).toHaveLength(15);
    const v = { ...START_VILLAGE, levels: { ...START_VILLAGE.levels } };
    expect(cleared(v, 'ladan')).toBe(false);
    expect(cleared({ ...v, world: 2 }, 'ladan')).toBe(true);
    expect(cleared({ ...v, world: 2 }, 'gastgiveriet')).toBe(false);
  });
});

describe('the world maps', () => {
  it('has 40 nodes on each painted map, inside the image and apart', async () => {
    const nodes = (await import('../src/lib/match3/worldNodes.json')).default as Record<string, number[][]>;
    for (const w of ['2', '3', '4', '5']) {
      const list = nodes[w];
      expect(list).toHaveLength(40);
      for (const [x, y] of list) {
        expect(x).toBeGreaterThan(40);
        expect(x).toBeLessThan(984);
        expect(y).toBeGreaterThan(200);
        expect(y).toBeLessThan(5632 - 60);
      }
      for (let i = 1; i < list.length; i++) expect(Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1])).toBeGreaterThan(90);
    }
  });
});

describe('ad films in two groups', () => {
  it('has four calm and four loud films, and a picture for each', async () => {
    const { existsSync } = await import('node:fs');
    expect(adsFor('calm').map((a) => a.id)).toEqual(['barplock', 'nordanvind', 'vassen', 'fiskelyckan']);
    expect(adsFor('loud')).toHaveLength(4);
    expect(adsFor('loud').every((a) => a.loud)).toBe(true);
    for (const a of ADS) expect(existsSync(`public/art/ads/${a.id}.webp`), a.id).toBe(true);
  });
  it('gives a player the same group every time and splits players about evenly', () => {
    expect(adGroupFor('abc123')).toBe(adGroupFor('abc123'));
    const loud = Array.from({ length: 400 }, (_, i) => adGroupFor(`player-${i * 7919}`)).filter((g) => g === 'loud').length;
    expect(loud).toBeGreaterThan(160);
    expect(loud).toBeLessThan(240);
  });
  it('only shows films from the group, and all four in four showings', () => {
    for (const g of ['calm', 'loud'] as const) {
      const seen = new Set(Array.from({ length: 4 }, () => nextAd(g).id));
      expect(seen.size).toBe(4);
      expect([...seen].every((id) => adsFor(g).some((a) => a.id === id))).toBe(true);
    }
  });
});
