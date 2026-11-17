<script lang="ts">
  /**
   * The start page (Jonas, 2026-11-17): a map of a made-up Sweden with a road
   * through the archipelago, the forest and the mountains. The challenges lie
   * in order along the road; only the next one can be played.
   * Placeholder drawing until the map art is approved.
   */
  import { tick } from 'svelte';
  import { LEVELS, goalText } from '../lib/match3/levels';

  let { current, countdown = 0, onPlay }: { current: number; countdown?: number; onPlay: () => void } = $props();

  const STEP = 92; // px between challenges along the road
  const W = 360;
  const H = LEVELS.length * STEP + 140;
  // Challenge n sits from the bottom up, swinging left and right.
  const pos = (n: number) => ({ x: W / 2 + Math.sin(n * 0.9) * 110, y: H - 80 - (n - 1) * STEP });
  const road = LEVELS.map((l) => pos(l.id)).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const zone = (n: number) => (n <= 13 ? 'Skärgården' : n <= 27 ? 'Skogen' : 'Fjällen');
  const zoneTop = (from: number) => pos(from).y + STEP / 2;

  let scroller: HTMLDivElement;
  $effect(() => {
    void current;
    void tick().then(() => {
      const svg = scroller?.querySelector('svg');
      if (!svg) return;
      const y = pos(current).y * (svg.clientWidth / W); // the drawing is scaled to the width
      scroller.scrollTo({ top: Math.max(0, y - scroller.clientHeight * 0.65), behavior: 'auto' });
    });
  });

  const level = $derived(LEVELS[current - 1]);
</script>

<section class="map" aria-label="Kartan">
  <div class="scroll" bind:this={scroller}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Vägen genom ${LEVELS.length} utmaningar. Du är på ${level.name}, i ${zone(current).toLowerCase()}.`}>
      <!-- the three lands, from the sea at the bottom to the mountains at the top -->
      <rect x="0" y={zoneTop(14)} width={W} height={H - zoneTop(14)} fill="#9fd0e6" />
      <rect x="0" y={zoneTop(28)} width={W} height={zoneTop(14) - zoneTop(28)} fill="#8fbf7a" />
      <rect x="0" y="0" width={W} height={zoneTop(28)} fill="#e9eef2" />
      {#each [[40, 0.92], [300, 0.85], [70, 0.7], [290, 0.62]] as [x, f]}
        <ellipse cx={x} cy={H * f} rx="46" ry="26" fill="#c9b8b0" stroke="#8a7a72" stroke-width="2" />
      {/each}
      {#each [[50, 0.5], [310, 0.45], [40, 0.38], [300, 0.33]] as [x, f]}
        <polygon points={`${x},${H * f - 34} ${x - 22},${H * f + 8} ${x + 22},${H * f + 8}`} fill="#3f6d3a" />
      {/each}
      {#each [[60, 0.2], [290, 0.12], [80, 0.05]] as [x, f]}
        <polygon points={`${x},${H * f - 44} ${x - 46},${H * f + 18} ${x + 46},${H * f + 18}`} fill="#a9b4bd" />
        <polygon points={`${x},${H * f - 44} ${x - 16},${H * f - 22} ${x + 16},${H * f - 22}`} fill="#fff" />
      {/each}
      <text x="12" y={zoneTop(14) - 10} class="zone">Skärgården</text>
      <text x="12" y={zoneTop(28) - 10} class="zone">Skogen</text>
      <text x="12" y="28" class="zone">Fjällen</text>
      <path d={road} fill="none" stroke="#e9d9bd" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
      <path d={road} fill="none" stroke="#c9a978" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" />
      {#each LEVELS as l (l.id)}
        {@const p = pos(l.id)}
        {@const done = l.id < current}
        {@const now = l.id === current}
        <g class:now transform={`translate(${p.x} ${p.y})`}>
          <circle r={now ? 24 : 17} fill={done ? '#d9a441' : now ? '#b8382a' : '#d8ccc0'} stroke={now ? '#fff' : '#5a1d14'} stroke-width={now ? 4 : 2} />
          <text y="6" text-anchor="middle" class:light={now} class="num">{l.id}</text>
        </g>
      {/each}
    </svg>
  </div>
  <div class="next">
    <div>
      <strong>{level.name}</strong>
      <span>{goalText(level.goal)} på {level.moves} drag</span>
      {#if countdown > 0}<span class="cd" aria-live="polite">Startar om {countdown} …</span>{/if}
    </div>
    <button class="primary" data-tut="map-current" onclick={onPlay}>Spela</button>
  </div>
</section>

<style>
  .map { display: flex; flex-direction: column; height: 100%; background: #9fd0e6; }
  .scroll { flex: 1; overflow-y: auto; min-height: 0; }
  svg { display: block; max-width: 520px; margin: 0 auto; }
  .zone { font: 800 15px 'Baloo 2', system-ui, sans-serif; fill: #5a1d14; opacity: .75; }
  .num { font: 800 15px 'Baloo 2', system-ui, sans-serif; fill: #5a1d14; }
  .num.light { fill: #fff; font-size: 18px; }
  g.now circle { animation: pulse 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes pulse { 50% { transform: scale(1.12); } }
  .next { display: flex; align-items: center; gap: 12px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: #fff8ec; border-top: 3px solid #7a2418; color: var(--deep); }
  .next div { flex: 1; display: grid; line-height: 1.25; }
  .next strong { font-size: 1.1rem; }
  .cd { color: var(--falu); font-weight: 700; }
  .next button { min-width: 110px; }
</style>
