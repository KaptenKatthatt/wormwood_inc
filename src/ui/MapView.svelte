<script lang="ts">
  /**
   * The start page (Jonas, 2026-11-17): the painted map of a made-up Sweden,
   * archipelago at the bottom, forest in the middle, mountains at the top.
   * Challenges 1-11 lie on skerries joined by a dashed boat route; from 12 on
   * they follow the gravel road painted into the image. Only the next one can
   * be played; after challenge 40 the road starts over at 1.
   */
  import { tick } from 'svelte';
  import { ALL_LEVELS, LEVELS, WORLDS, goalText, levelAt, worldOf } from '../lib/match3/levels';
  import NODES from '../lib/match3/mapNodes.json';
  import WORLD_NODES from '../lib/match3/worldNodes.json';
  import { DEV_MENU, EXPANSION } from '../lib/config/flags';
  import { exp } from '../lib/state/expansion';
  import { bestStars } from '../lib/state/game';
  import WeekStrip from './WeekStrip.svelte';

  /** onPick: dev build only (Jonas, 2026-11-18): tap any challenge on the map to play it. */
  let { current, countdown = 0, onPlay, onPick }: { current: number; countdown?: number; onPlay: () => void; onPick?: (id: number) => void } = $props();

  // The image is 1024 x 5632 px; the nodes are in its pixels.
  const W = 1024;
  const H = 5632;
  /** Every world has its road painted into its map; the nodes are traced on that road, bottom to top. */
  function roadFor(world: number): (readonly [number, number])[] {
    const list = world === 1 ? (NODES as number[][]) : (WORLD_NODES as Record<string, number[][]>)[String(world)];
    return list.map(([x, y]) => [x, y] as const);
  }
  let viewWorld = $state(1);
  $effect(() => { viewWorld = EXPANSION ? worldOf(current).id : 1; });
  const world = $derived(WORLDS[viewWorld - 1]);
  const pts = $derived(roadFor(viewWorld));
  const worldLevels = $derived(EXPANSION ? ALL_LEVELS.slice(world.from - 1, world.to) : LEVELS);
  // the dev build can browse all five worlds (Jonas, 2026-11-18)
  const maxWorld = $derived(!EXPANSION ? 1 : DEV_MENU ? WORLDS.length : Math.min(WORLDS.length, Math.max($exp.maxWorld, worldOf(current).id) + 1));
  const BOAT_TO = 11;

  /** A smooth Catmull-Rom curve through the points. */
  function curve(q: readonly (readonly [number, number])[]): string {
    let d = `M${q[0][0]},${q[0][1]}`;
    for (let i = 0; i < q.length - 1; i++) {
      const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }
  const boat = $derived(viewWorld === 1 ? curve(pts.slice(0, BOAT_TO)) : '');
  const zone = (n: number) => (n <= 13 ? 'Skärgården' : n <= 27 ? 'Skogen' : 'Fjällen');

  let scroller: HTMLDivElement;
  $effect(() => {
    void current;
    void viewWorld;
    void tick().then(() => {
      const wrap = scroller?.querySelector('.wrap') as HTMLElement | null;
      if (!wrap) return;
      const i = Math.min(39, Math.max(0, current - world.from));
      const y = (current >= world.from && current <= world.to ? pts[i][1] : current < world.from ? 0 : H) * (wrap.clientWidth / W); // the map is scaled to the width
      scroller.scrollTo({ top: Math.max(0, y - scroller.clientHeight * 0.6), behavior: 'auto' });
    });
  });

  const level = $derived(levelAt(current));
</script>

<section class="map" aria-label="Kartan">
  {#if EXPANSION}
    <div class="worldbar">
      <button class="ghost arrow" disabled={viewWorld <= 1} aria-label="Föregående värld" onclick={() => (viewWorld = Math.max(1, viewWorld - 1))}>‹</button>
      <div class="wname"><strong>{world.name}</strong><span>Värld {viewWorld} av {WORLDS.length} · utmaning {world.from}–{world.to}</span></div>
      <button class="ghost arrow" disabled={viewWorld >= maxWorld} aria-label="Nästa värld" onclick={() => (viewWorld = Math.min(maxWorld, viewWorld + 1))}>›</button>
    </div>
    <WeekStrip />
  {/if}
  <div class="scroll" bind:this={scroller}>
    <div class="wrap">
      <img src={viewWorld === 1 ? '/art/map/karta.webp' : `/art/worlds/${viewWorld}/karta.webp`} width={W} height={H} alt="" decoding="async" />
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${world.name}: vägen genom utmaning ${world.from} till ${world.to}. Du är på ${level.name}${viewWorld === 1 ? `, i ${zone(current).toLowerCase()}` : ''}.`}>
        {#if viewWorld === 1}
          <path d={boat} fill="none" stroke="#2f6f8a55" stroke-width="26" stroke-linecap="round" />
          <path d={boat} fill="none" stroke="#fff" stroke-width="10" stroke-dasharray="5 24" stroke-linecap="round" />
        {/if}
        {#each worldLevels as l, i (l.id)}
          {@const p = pts[i]}
          {@const done = l.id < current}
          {@const now = l.id === current}
          {@const r = now ? 58 : 42}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (role is button whenever tabindex is set) -->
          <g transform={`translate(${p[0]} ${p[1]})`} class:pick={!!onPick} role={onPick ? 'button' : undefined} tabindex={onPick ? 0 : undefined} aria-label={onPick ? `Spela utmaning ${l.id}` : undefined}
            onclick={onPick ? () => onPick(l.id) : undefined} onkeydown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(l.id); } } : undefined}>
            <ellipse cy={r * 0.42} rx={r} ry={r * 0.55} fill="#00000033" />
            <g class:now>
              <circle {r} fill={done ? '#e0b04a' : now ? '#b8382a' : '#f4ead8'} stroke={now ? '#fff' : '#7a2418'} stroke-width={now ? 10 : 6.5} />
              <text y={now ? 18 : 14} text-anchor="middle" class="num" class:light={now}>{l.id}</text>
            </g>
            {#if done || $bestStars[l.id]}{@const n = $bestStars[l.id] ?? 1}<text y={-r - 8} text-anchor="middle" class="stars">{#each [1, 2, 3] as i}<tspan class:off={i > n}>★</tspan>{/each}</text>{/if}
          </g>
        {/each}
      </svg>
    </div>
  </div>
  <div class="next">
    <div>
      <strong>{level.name}</strong>
      <span>{goalText(level.goal, level.id)} på {level.moves} drag</span>
      {#if countdown > 0}<span class="cd" aria-live="polite">Startar om {countdown} …</span>{/if}
    </div>
    <button class="primary" data-tut="map-current" onclick={onPlay}>Spela</button>
  </div>
</section>

<style>
  .map { display: flex; flex-direction: column; height: 100%; background: #6fa9c2; }
  .scroll { flex: 1; overflow-y: auto; min-height: 0; }
  .wrap { position: relative; max-width: 520px; margin: 0 auto; }
  .wrap img { display: block; width: 100%; height: auto; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .num { font: 800 40px 'Baloo 2', system-ui, sans-serif; fill: #5a1d14; }
  .num.light { fill: #fff; font-size: 52px; }
  .pick { cursor: pointer; }
  .pick:focus-visible { outline: none; }
  .pick:focus-visible circle { stroke: #2c5d6e; }
  .stars { font-size: 56px; fill: #f2c230; stroke: #7a2418; stroke-width: 3; paint-order: stroke; }
  .stars .off { fill: #e8dccb; }
  svg { z-index: 2; }
  .worldbar { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #fff8ec; border-bottom: 3px solid #7a2418; color: var(--deep); }
  .wname { flex: 1; display: grid; text-align: center; line-height: 1.2; }
  .wname span { font-size: .8rem; color: var(--muted); }
  .arrow { min-width: 44px; min-height: 44px; font-size: 1.6rem; padding: 0; }
  g.now { animation: pulse 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes pulse { 50% { transform: scale(1.12); } }
  .next { display: flex; align-items: center; gap: 12px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: #fff8ec; border-top: 3px solid #7a2418; color: var(--deep); }
  .next div { flex: 1; display: grid; line-height: 1.25; }
  .next strong { font-size: 1.1rem; }
  .cd { color: var(--falu); font-weight: 700; }
  .next button { min-width: 110px; }
</style>
