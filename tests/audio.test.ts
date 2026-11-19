import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { puzzleMusicFor, sliderGain, WORLD_EXTRA, WORLD_TUNES } from '../src/lib/audio/sound';

const AUDIO = new URL('../public/audio/', import.meta.url);
const SRC = readFileSync(new URL('../src/lib/audio/sound.ts', import.meta.url), 'utf8');

describe('sound', () => {
  it('the volume sliders go from silence to full, and never past either end', () => {
    expect(sliderGain(0)).toBe(0);
    expect(sliderGain(1)).toBe(1);
    expect(sliderGain(0.5)).toBeCloseTo(0.25);
    expect(sliderGain(7)).toBe(1);
    expect(sliderGain(-1)).toBe(0);
    expect(sliderGain(Number.NaN)).toBe(1);
  });

  it('the puzzle alternates between its two tunes', () => {
    expect(puzzleMusicFor(1)).toBe('puzzle-brickor');
    expect(puzzleMusicFor(2)).toBe('puzzle-gem-waltz');
    expect(puzzleMusicFor(3)).toBe('puzzle-brickor');
  });

  it('a world with its own tune plays it on all its challenges, the others keep the two', () => {
    expect(puzzleMusicFor(41, [2, 3])).toBe('world-2');
    expect(puzzleMusicFor(80, [2, 3])).toBe('world-2');
    expect(puzzleMusicFor(81, [2, 3])).toBe('world-3');
    expect(puzzleMusicFor(121, [2, 3])).toBe('puzzle-brickor');
    expect(puzzleMusicFor(40, [2, 3])).toBe('puzzle-gem-waltz');
    // past the road it starts over in the first world
    expect(puzzleMusicFor(201, [2, 3])).toBe('puzzle-brickor');
  });

  it('a world with several tunes takes them in turn, starting with its own', () => {
    const extra = { 5: ['a', 'b'] };
    expect(puzzleMusicFor(161, [5], extra)).toBe('world-5');
    expect(puzzleMusicFor(162, [5], extra)).toBe('world-5-a');
    expect(puzzleMusicFor(163, [5], extra)).toBe('world-5-b');
    expect(puzzleMusicFor(164, [5], extra)).toBe('world-5');
    expect(puzzleMusicFor(200, [5], extra)).toBe('world-5'); // challenge 40 of the world
    expect(puzzleMusicFor(41, [2, 5], extra)).toBe('world-2');
  });

  it('every world tune exists in both formats', () => {
    const files = [
      ...WORLD_TUNES.map((w) => `world-${w}`),
      ...Object.entries(WORLD_EXTRA).flatMap(([w, names]) => names.map((name) => `world-${w}-${name}`)),
    ];
    expect(files.length).toBe(9);
    for (const f of files) for (const ext of ['ogg', 'mp3']) expect(existsSync(new URL(`music/${f}.${ext}`, AUDIO)), `${f}.${ext}`).toBe(true);
  });

  it('every file the game asks for exists in both formats', () => {
    const names = [...SRC.matchAll(/'((?:music|sfx)\/[a-z-]+)'/g)].map((m) => m[1]);
    const listed = [...SRC.matchAll(/: '([a-z-]+)'/g)].map((m) => m[1]);
    const files = [
      ...names,
      ...listed.map((n) => (existsSync(new URL(`music/${n}.mp3`, AUDIO)) ? `music/${n}` : `sfx/${n}`)),
      ...Array.from({ length: 8 }, (_, i) => `sfx/match-${i}`),
    ];
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) for (const ext of ['ogg', 'mp3']) expect(existsSync(new URL(`${f}.${ext}`, AUDIO)), `${f}.${ext}`).toBe(true);
  });

  it('every audio file is named in the credits', () => {
    const credits = readFileSync(new URL('CREDITS.md', AUDIO), 'utf8');
    for (const dir of ['music', 'sfx', 'ads']) {
      for (const f of readdirSync(new URL(`${dir}/`, AUDIO))) {
        const base = f.replace(/\.(ogg|mp3)$/, '').replace(/^match-\d$/, 'match-0');
        expect(credits.includes(`${dir}/${base}`), `${dir}/${f}`).toBe(true);
      }
    }
  });
});
