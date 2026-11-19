<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import { VillageScene, type PlotView } from '../game/VillageScene';
  import { bubble, hookOn, now, pressQuit, purse, skipBuild, skipRepair, stairs, startBuild, timers, topUpAndBuild, topUpOffered, village } from '../lib/state/game';
  import { tutEvent } from '../lib/tutorial';
  import { CHRISTMAS } from '../lib/config/flags';
  import { daily, settings } from '../lib/state/game';
  import { countdownShown, forcedLook, villageLook, xmas, xmasDate, xmasDay, xmasOpen } from '../lib/state/christmas';
  import { countdownText, decorLayers } from '../lib/christmas';
  import { onMount } from 'svelte';
  import { BASE_BUILDINGS, BUILDINGS as ALL_BUILDINGS, MAX_LEVEL, buildBlock, buildTime, cleared, priceFor, skipGems, topUpGems } from '../lib/economy/village';
  import { EXPANSION } from '../lib/config/flags';
  import { WORLDS } from '../lib/match3/levels';
  // The expansion's four buildings only exist with the expansion (the pilot has eight).
  const BUILDINGS = EXPANSION ? ALL_BUILDINGS : BASE_BUILDINGS;
  import { formatDuration } from '../lib/time/clock';
  import { progress, remaining } from '../lib/time/timers';

  let { onPlay }: { onPlay: () => void } = $props();

  const constr = $derived($village.construction);
  const timer = $derived(constr ? $timers.find((t) => t.id === constr.timerId) : undefined);
  const left = $derived(timer ? remaining(timer, $now) : 0);
  const nextNo = $derived($village.builds + 1);
  const price = $derived(priceFor(nextNo, $village));

  const plots = $derived<PlotView[]>(
    BUILDINGS.map((b) => ({
      id: b.id, name: b.short ?? b.name, level: $village.levels[b.id], locked: !cleared($village, b.id),
      building: constr?.id === b.id, progress: constr?.id === b.id && timer ? progress(timer, $now) : 0,
    })),
  );

  // Christmas in Skargardsbyn: the sign with the countdown opens the calendar and the market.
  const xday = $derived.by(() => { void $now; void $settings; void $daily; void $xmasDate; return CHRISTMAS ? xmasDay() : 0; });
  $effect(() => { if (xday > 0) countdownShown(); });
  // The village's look (summer, or winter A, B or C in December) and the bought decorations.
  const look = $derived.by(() => { void $now; void $xmasDate; void $forcedLook; return villageLook(); });
  const layers = $derived(CHRISTMAS ? decorLayers($xmas) : []);

  onMount(() => tutEvent('inVillage'));
  $effect(() => { if (constr) tutEvent('built'); });
  const damaged = $derived($stairs.damaged);
  const repairTimer = $derived(damaged ? $timers.find((t) => t.id === damaged.timerId) : undefined);
  const repairLeft = $derived(repairTimer ? remaining(repairTimer, $now) : 0);
  const figures = $derived(hookOn('figures'));
  const face = $derived(['😢', '🙁', '😐', '🙂', '😊'][Math.min(4, Math.floor($stairs.mood / 20))]);

  const blockText = { busy: 'Ett bygge pågår', cap: 'Bygg ut Stugan först', gold: 'För lite guld', max: 'Högsta nivån', locked: '' } as const;
</script>

<section class="view">
  <div class="canvas">
    <GameCanvas scene={VillageScene} data={{ plots, look, layers }} label={`Byn på udden. ${plots.filter((p) => !p.locked).length} av ${plots.length} tomter är röjda.`} />
    {#if figures}
      <div class="mood" role="meter" aria-label="Bybornas trivsel" aria-valuemin="0" aria-valuemax="100" aria-valuenow={$stairs.mood}>
        <span class="face" aria-hidden="true">{face}</span>
        <span class="track"><span style:width={`${$stairs.mood}%`}></span></span>
      </div>
      {#if $bubble}<p class="bubble" aria-live="polite">{$bubble}</p>{/if}
    {/if}
  </div>
  <div class="panel">
    {#if xday > 0}
      <button class="xmas" onclick={() => xmasOpen.set(true)}>🎄 {countdownText(xday)} · 🍪 {$xmas.cookies}</button>
    {:else if CHRISTMAS && $xmas.decor.length > 0}
      <button class="xmas" onclick={() => xmasOpen.set(true)}>🎄 Ditt julpynt</button>
    {/if}
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
    <p class="next">Nästa bygge: <strong>{price === 0 ? 'gratis' : `${price} guld`}</strong>, tar {formatDuration(buildTime(nextNo))}</p>
    <ul>
      {#each BUILDINGS as b (b.id)}
        {@const block = buildBlock($village, b.id, $purse.gold)}
        {#if block === 'locked'}
        <li class="locked">
          <div>
            <strong>{b.name}</strong> <span class="lvl">skog</span>
            <span class="fine">{b.world ? `Marken röjs när du når ${WORLDS[b.world - 1].name}.` : `Marken röjs när Stugan når nivå ${b.unlock}.`}</span>
          </div>
          <span class="lock" aria-hidden="true">🌲</span>
        </li>
        {:else}
        <li>
          <div>
            <strong>{b.name}</strong> <span class="lvl">{$village.levels[b.id] === 0 ? 'ej byggd' : `nivå ${$village.levels[b.id]} av ${MAX_LEVEL}`}</span>
            <span class="fine">{b.effect}</span>
          </div>
          {#if block === 'gold' && hookOn('topUpGold')}
            {@const missing = price - $purse.gold}
            {topUpOffered(b.id, missing)}
            <button data-tut={`build-${b.id}`} class="primary topup" onclick={() => topUpAndBuild(b.id)}>
              Fyll på {missing} guld för 💎 {topUpGems(missing)}
            </button>
          {:else}
            <button data-tut={`build-${b.id}`} class={block ? 'ghost' : 'primary'} disabled={block !== null} onclick={() => startBuild(b.id)} aria-describedby={block ? `why-${b.id}` : undefined}>
              {$village.levels[b.id] === 0 ? 'Bygg' : 'Bygg ut'}
            </button>
            {#if block}<span class="why" id={`why-${b.id}`}>{blockText[block]}</span>{/if}
          {/if}
        </li>
        {/if}
      {/each}
    </ul>
    <button class="primary play" onclick={onPlay}>Spela för guld</button>
    <button class="ghost quit" data-tut="quit" onclick={pressQuit}>Avsluta</button>
  </div>
</section>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .canvas { position: relative; flex: 0 0 50%; min-height: 200px; }
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
  .xmas { background: var(--falu); color: #fff; border: 0; border-radius: 8px; padding: 10px; font: inherit; font-weight: 700; min-height: 44px; }
  .play { margin-top: 4px; }
  .quit { margin-top: 8px; }
  .locked { opacity: .7; }
  .lock { font-size: 1.4rem; }
  .damaged { background: color-mix(in srgb, var(--falu) 18%, transparent); }
  .mood { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; align-items: center; gap: 8px; background: rgb(243 236 228 / .9); border-radius: 999px; padding: 4px 10px; }
  .face { font-size: 1.3rem; line-height: 1; }
  .track { flex: 1; height: 8px; background: #d8ccc0; border-radius: 4px; overflow: hidden; }
  .track span { display: block; height: 100%; background: #3f6d3a; transition: width .4s; }
  .bubble { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); margin: 0; background: #fff; color: #1f1a17; border-radius: 14px; padding: 6px 12px; font-weight: 600; box-shadow: 0 2px 8px rgb(0 0 0 / .25); max-width: 90%; text-align: center; }
</style>
