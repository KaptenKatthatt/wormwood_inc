<script lang="ts">
  /**
   * The reward after a watched ad film (Jonas, 2026-11-19): the gold just won
   * is shown and doubles on screen, with a shower of coins. A life gets a
   * heart. It goes away by itself, or at a tap.
   */
  import { adReward } from '../lib/state/expansion';

  const r = $adReward!;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = 600; // the first number stands a moment before it doubles
  const COUNT = 1100;
  let shown = $state(calm || r.reward === 'life' ? r.gold * 2 : r.gold);
  let twice = $state(calm);
  $effect(() => {
    let frame = 0;
    const start = performance.now();
    const loop = () => {
      const k = Math.min(1, Math.max(0, (performance.now() - start - HOLD) / COUNT));
      if (k > 0) twice = true;
      // ease out, so the last coins tick in slowly
      shown = Math.round(r.gold * (1 + (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(loop);
    };
    if (!calm && r.reward === 'double') frame = requestAnimationFrame(loop);
    const close = setTimeout(() => adReward.set(null), calm ? 2200 : 3200);
    return () => { cancelAnimationFrame(frame); clearTimeout(close); };
  });
  const coins = Array.from({ length: 18 }, (_, i) => ({
    x: Math.round(Math.cos((i / 18) * Math.PI * 2) * (90 + (i % 3) * 45)),
    y: Math.round(Math.sin((i / 18) * Math.PI * 2) * (90 + (i % 3) * 45)) - 40,
    delay: HOLD + (i % 6) * 70,
  }));
</script>

<button class="burst" data-no-click-sound onclick={() => adReward.set(null)} aria-label="Stäng">
  <span class="rays" aria-hidden="true"></span>
  {#if r.reward === 'double'}
    <span class="coins" aria-hidden="true">
      {#each coins as c}<span class="coin" style:--x={`${c.x}px`} style:--y={`${c.y}px`} style:animation-delay={`${c.delay}ms`}>🪙</span>{/each}
    </span>
    <span class="title">Dubbelt guld!</span>
    <span class="sum" class:twice><span aria-hidden="true">🪙</span> {shown}{#if twice}<span class="x2" aria-hidden="true">×2</span>{/if}</span>
    <span class="sr" role="status">Dubbelt guld: {r.gold * 2} guld.</span>
  {:else}
    <span class="heart" aria-hidden="true">♥</span>
    <span class="title" role="status">+1 liv</span>
  {/if}
</button>

<style>
  .burst { position: fixed; inset: 0; z-index: 13; width: 100%; min-height: 0; border: 0; border-radius: 0; padding: 24px; background: rgb(20 12 8 / .93); color: #fff; display: grid; place-content: center; justify-items: center; gap: 6px; overflow: hidden; animation: fade .2s ease-out; }
  @keyframes fade { from { opacity: 0; } }
  .rays { position: absolute; left: 50%; top: 50%; width: 140vmax; height: 140vmax; margin: -70vmax 0 0 -70vmax; background: repeating-conic-gradient(rgb(242 194 48 / .22) 0 10deg, transparent 10deg 20deg); animation: spin 14s linear infinite; mask-image: radial-gradient(circle, #000 0, transparent 55%); -webkit-mask-image: radial-gradient(circle, #000 0, transparent 55%); }
  @keyframes spin { to { transform: rotate(360deg); } }
  .title, .sum, .heart, .coins { position: relative; }
  .title { font-size: 2rem; font-weight: 800; text-shadow: 0 3px 0 #5a1d14; animation: pop .35s ease-out both; }
  .sum { display: flex; align-items: center; gap: 10px; font-size: 3.4rem; font-weight: 800; line-height: 1.1; color: #ffd75a; text-shadow: 0 4px 0 #7a4a00, 0 8px 22px rgb(0 0 0 / .5); font-variant-numeric: tabular-nums; }
  .sum.twice { animation: swell 1.1s ease-out both; }
  @keyframes swell { 0% { transform: scale(1); } 60% { transform: scale(1.28); } 100% { transform: scale(1.15); } }
  .x2 { background: #c9473a; color: #fff; border: 3px solid #fff; border-radius: 999px; padding: 0 12px; font-size: 1.6rem; text-shadow: none; transform: rotate(-10deg); animation: stamp .3s cubic-bezier(.2, 1.6, .4, 1) both; }
  @keyframes stamp { from { transform: rotate(-10deg) scale(2.4); opacity: 0; } }
  @keyframes pop { from { transform: scale(.6); opacity: 0; } }
  .coins { width: 0; height: 0; }
  .coin { position: absolute; left: -16px; top: 40px; font-size: 2rem; opacity: 0; animation: fly 1.2s ease-out both; }
  @keyframes fly { 0% { transform: translate(0, 0) scale(.4); opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { transform: translate(var(--x), var(--y)) scale(1.1) rotate(200deg); opacity: 0; } }
  .heart { font-size: 6rem; line-height: 1; color: #e2483c; text-shadow: 0 4px 0 #5a1d14; animation: beat .5s ease-in-out 3 alternate; }
  @keyframes beat { to { transform: scale(1.25); } }
</style>
