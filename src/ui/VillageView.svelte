<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import { VillageScene, type PlotView } from '../game/VillageScene';
  import { bubble, hookOn, now, pressQuit, purse, skipBuild, skipRepair, stairs, startBuild, timers, village } from '../lib/state/game';
  import { BUILDINGS, buildBlock, buildCost, buildTime, skipGems } from '../lib/economy/village';
  import { formatDuration } from '../lib/time/clock';
  import { progress, remaining } from '../lib/time/timers';

  let { onPlay }: { onPlay: () => void } = $props();

  const constr = $derived($village.construction);
  const timer = $derived(constr ? $timers.find((t) => t.id === constr.timerId) : undefined);
  const left = $derived(timer ? remaining(timer, $now) : 0);
  const nextNo = $derived($village.builds + 1);

  const plots = $derived<PlotView[]>(
    BUILDINGS.map((b) => ({
      id: b.id, name: b.name, level: $village.levels[b.id],
      building: constr?.id === b.id, progress: constr?.id === b.id && timer ? progress(timer, $now) : 0,
    })),
  );

  const damaged = $derived($stairs.damaged);
  const repairTimer = $derived(damaged ? $timers.find((t) => t.id === damaged.timerId) : undefined);
  const repairLeft = $derived(repairTimer ? remaining(repairTimer, $now) : 0);
  const figures = $derived(hookOn('figures'));
  const face = $derived(['😢', '🙁', '😐', '🙂', '😊'][Math.min(4, Math.floor($stairs.mood / 20))]);

  const blockText = { busy: 'Ett bygge pågår', cap: 'Bygg ut Stugan först', gold: 'För lite guld' } as const;
</script>

<section class="view">
  <div class="canvas">
    <GameCanvas scene={VillageScene} data={{ plots }} label="Byn på udden med fem byggnader." />
    {#if figures}
      <div class="mood" role="meter" aria-label="Bybornas trivsel" aria-valuemin="0" aria-valuemax="100" aria-valuenow={$stairs.mood}>
        <span class="face" aria-hidden="true">{face}</span>
        <span class="track"><span style:width={`${$stairs.mood}%`}></span></span>
      </div>
      {#if $bubble}<p class="bubble" aria-live="polite">{$bubble}</p>{/if}
    {/if}
  </div>
  <div class="panel">
    {#if constr && timer}
      <div class="building">
        <span><strong>{BUILDINGS.find((b) => b.id === constr.id)?.name}</strong> byggs till nivå {constr.toLevel}: {formatDuration(left)} kvar</span>
        {#if hookOn('skipWait')}<button class="primary" onclick={skipBuild}>Klart nu för 💎 {skipGems(left)}</button>{/if}
      </div>
    {/if}
    {#if damaged && repairTimer && repairLeft > 0}
      <div class="building damaged">
        <span><strong>{BUILDINGS.find((b) => b.id === damaged.id)?.name}</strong> skadades i anfallet och lagas: {formatDuration(repairLeft)} kvar</span>
        {#if hookOn('skipWait')}<button class="primary" onclick={skipRepair}>Laga nu för 💎 {skipGems(repairLeft)}</button>{/if}
      </div>
    {/if}
    <p class="next">Nästa bygge: <strong>{buildCost(nextNo) === 0 ? 'gratis' : `${buildCost(nextNo)} guld`}</strong>, tar {formatDuration(buildTime(nextNo))}</p>
    <ul>
      {#each BUILDINGS as b (b.id)}
        {@const block = buildBlock($village, b.id, $purse.gold)}
        <li>
          <div>
            <strong>{b.name}</strong> <span class="lvl">{$village.levels[b.id] === 0 ? 'ej byggd' : `nivå ${$village.levels[b.id]}`}</span>
            <span class="fine">{b.effect}</span>
          </div>
          <button class={block ? 'ghost' : 'primary'} disabled={block !== null} onclick={() => startBuild(b.id)} aria-describedby={block ? `why-${b.id}` : undefined}>
            {$village.levels[b.id] === 0 ? 'Bygg' : 'Bygg ut'}
          </button>
          {#if block}<span class="why" id={`why-${b.id}`}>{blockText[block]}</span>{/if}
        </li>
      {/each}
    </ul>
    <button class="primary play" onclick={onPlay}>Spela en bana för guld</button>
    <button class="ghost quit" onclick={pressQuit}>Avsluta</button>
  </div>
</section>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .canvas { position: relative; flex: 0 0 38%; min-height: 160px; }
  .panel { flex: 1; overflow-y: auto; background: var(--panel); padding: 8px 16px 16px; display: grid; gap: 8px; align-content: start; }
  .building { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: color-mix(in srgb, var(--gold) 25%, transparent); border-radius: 8px; padding: 8px 10px; }
  .building span { flex: 1 1 180px; font-variant-numeric: tabular-nums; }
  .next { margin: 0; color: var(--muted); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  li { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 10px; border-bottom: 1px solid var(--line); padding: 6px 0; }
  li div { display: grid; }
  .lvl { color: var(--muted); font-size: .9rem; }
  .fine { color: var(--muted); font-size: .85rem; }
  .why { grid-column: 2; font-size: .8rem; color: var(--muted); text-align: right; }
  .play { margin-top: 4px; }
  .quit { margin-top: 8px; }
  .damaged { background: color-mix(in srgb, var(--falu) 18%, transparent); }
  .mood { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; align-items: center; gap: 8px; background: rgb(243 236 228 / .9); border-radius: 999px; padding: 4px 10px; }
  .face { font-size: 1.3rem; line-height: 1; }
  .track { flex: 1; height: 8px; background: #d8ccc0; border-radius: 4px; overflow: hidden; }
  .track span { display: block; height: 100%; background: #3f6d3a; transition: width .4s; }
  .bubble { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); margin: 0; background: #fff; color: #1f1a17; border-radius: 14px; padding: 6px 12px; font-weight: 600; box-shadow: 0 2px 8px rgb(0 0 0 / .25); max-width: 90%; text-align: center; }
</style>
