import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { inLevel, toast, toasts } from '../src/lib/state/game';

/** Messages from a challenge do not follow the player to the map (Jonas, 2026-11-21). */
describe('messages shown during a challenge', () => {
  it('go away when the player leaves the challenge, and others stay', () => {
    toasts.set([]);
    toast('before');
    inLevel.set(true);
    toast('tip in the challenge', 60_000);
    expect(get(toasts).map((t) => t.text)).toEqual(['before', 'tip in the challenge']);
    inLevel.set(false);
    expect(get(toasts).map((t) => t.text)).toEqual(['before']);
    toast('on the map');
    expect(get(toasts).map((t) => t.text)).toEqual(['before', 'on the map']);
  });
});
