<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import { build, buildings, now, skipTimer, timers } from '../lib/state/game';
  import { MINUTE, formatDuration } from '../lib/time/clock';
  import { progress, remaining } from '../lib/time/timers';
  import { formatKr, skipPrice } from '../lib/economy/wallet';
  import type { PlotView } from '../game/VillageScene';

  const PLACEHOLDERS = [
    { label: 'Sjöboden', minutes: 30 },
    { label: 'Kvarnen', minutes: 60 },
    { label: 'Kapellet', minutes: 240 },
  ];

  const rows = $derived(
    PLACEHOLDERS.map((p, plot) => {
      const b = $buildings.find((x) => x.plot === plot);
      const t = b ? $timers.find((x) => x.id === b.timerId) : undefined;
      const state: PlotView['state'] = !b || !t ? 'empty' : remaining(t, $now) > 0 ? 'building' : 'built';
      return { plot, ...p, state, timer: t, left: t ? remaining(t, $now) : 0, progress: t ? progress(t, $now) : 0 };
    }),
  );
  const plots = $derived(rows.map((r) => ({ plot: r.plot, state: r.state, progress: r.progress })));
</script>

<section class="view">
  <div class="canvas"><GameCanvas scene="village" {plots} label="Byn på udden med tre tomter." /></div>
  <ul class="plots">
    {#each rows as r (r.plot)}
      <li>
        <span class="name">{r.plot + 1}. {r.label}</span>
        {#if r.state === 'empty'}
          <button class="primary" onclick={() => build(r.plot, r.label, r.minutes * MINUTE)}>Bygg ({formatDuration(r.minutes * MINUTE)})</button>
        {:else if r.state === 'building'}
          <span class="left" aria-live="off">{formatDuration(r.left)} kvar</span>
          <button class="ghost" onclick={() => r.timer && skipTimer(r.timer.id)}>Klart nu, {formatKr(skipPrice(r.left))}</button>
        {:else}
          <span class="done">Klar</span>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .canvas { position: relative; flex: 1; min-height: 0; }
  .plots { list-style: none; margin: 0; padding: 8px 16px 12px; background: var(--panel); display: grid; gap: 6px; }
  li { display: flex; align-items: center; gap: 8px; min-height: 48px; }
  .name { flex: 1; font-weight: 600; }
  .left { color: var(--muted); font-variant-numeric: tabular-nums; }
  .done { color: var(--green); font-weight: 700; }
</style>
