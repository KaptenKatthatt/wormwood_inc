<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import { VillageScene, type PlotView } from '../game/VillageScene';
  import { bubble, hookOn, now, pressQuit, purse, repairPrice, skipBuild, skipRepair, stairs, startBuild, startRepair, timers, topUpAndBuild, topUpOffered, village } from '../lib/state/game';
  import { tutEvent, tutorialActive } from '../lib/tutorial';
  import { firstLetter } from '../lib/state/game';
  import { CHRISTMAS } from '../lib/config/flags';
  import { daily, settings } from '../lib/state/game';
  import { countdownShown, forcedLook, villageLook, xmas, xmasDate, xmasDay, xmasOpen } from '../lib/state/christmas';
  import { countdownText, decorLayers } from '../lib/christmas';
  import { onMount } from 'svelte';
  import { load, save } from '../lib/state/storage';
  import { BASE_BUILDINGS, BUILDINGS as ALL_BUILDINGS, WORLD_BUILDINGS_ON_HOLD, MAX_LEVEL, buildBlock, buildTime, cleared, priceFor, skipGems, topUpGems, type BuildingId } from '../lib/economy/village';
  import { EXPANSION } from '../lib/config/flags';
  import { WORLDS } from '../lib/match3/levels';
  // The expansion's four buildings only exist with the expansion (the pilot has eight).
  const BUILDINGS = EXPANSION && !WORLD_BUILDINGS_ON_HOLD ? ALL_BUILDINGS : BASE_BUILDINGS;
  import { formatDuration } from '../lib/time/clock';
  import { progress, remaining } from '../lib/time/timers';

  let { onPlay }: { onPlay: () => void } = $props();

  const constr = $derived($village.construction);
  const timer = $derived(constr ? $timers.find((t) => t.id === constr.timerId) : undefined);
  const left = $derived(timer ? remaining(timer, $now) : 0);
  const nextNo = $derived($village.builds + 1);
  const priceOf = (id: BuildingId) => priceFor(nextNo, $village, id);
  // The buildings to choose from come up from a floating button, so the village keeps the whole screen (Jonas, 2026-11-19).
  let sheet = $state(false);
  function build(id: BuildingId, topUp = false) {
    if (topUp ? topUpAndBuild(id) : startBuild(id)) sheet = false;
  }

  const plots = $derived<PlotView[]>(
    BUILDINGS.map((b) => ({
      id: b.id, name: b.short ?? b.name, level: $village.levels[b.id], locked: !cleared($village, b.id),
      building: constr?.id === b.id, progress: constr?.id === b.id && timer ? progress(timer, $now) : 0,
      damaged: $stairs.damaged.some((d) => d.id === b.id),
    })),
  );

  // Christmas in Skargardsbyn: the sign with the countdown opens the calendar and the market.
  const xday = $derived.by(() => { void $now; void $settings; void $daily; void $xmasDate; return CHRISTMAS ? xmasDay() : 0; });
  $effect(() => { if (xday > 0) countdownShown(); });
  // The village's look (summer, or winter A, B or C in December) and the bought decorations.
  const look = $derived.by(() => { void $now; void $xmasDate; void $forcedLook; return villageLook(); });
  // The window stars only exist for buildings at levels 4-7 so far.
  const starsFit = $derived(plots.every((p) => p.locked || p.level === 0 || (p.level >= 4 && p.level <= 7)));
  const layers = $derived(CHRISTMAS ? decorLayers($xmas, look, starsFit) : []);

  onMount(() => { tutEvent('inVillage'); if (!tutorialActive()) firstLetter(); });

  // The first three times the village opens, two fingers show that it can be
  // pinched to zoom (Jonas, 2026-11-20). They go away at the first zoom.
  const HINT_TIMES = 3;
  let zoomHint = $state(false);
  onMount(() => {
    if (tutorialActive()) return;
    const seen = load<number>('zoomHint', 0);
    if (seen >= HINT_TIMES) return;
    save('zoomHint', seen + 1);
    zoomHint = true;
    const t = setTimeout(() => (zoomHint = false), 6000);
    return () => clearTimeout(t);
  });
  function zoomed() {
    if (zoomHint) save('zoomHint', HINT_TIMES); // the player has it: no more hints
    zoomHint = false;
  }
  $effect(() => { if (constr) tutEvent('built'); });
  // Buildings damaged by a lost attack: half bonus and no upgrade until the player has them repaired.
  const damaged = $derived($stairs.damaged.map((d) => {
    const t = d.timerId ? $timers.find((x) => x.id === d.timerId) : undefined;
    return { id: d.id, name: BUILDINGS.find((b) => b.id === d.id)?.name ?? d.id, repairing: !!t, left: t ? remaining(t, $now) : 0, price: repairPrice(d.id) };
  }));
  const figures = $derived(hookOn('figures'));
  // The speech bubble points down at the villager who speaks (Jonas chose bubble A, 2026-11-20).
  // The scene says where that villager's head is; with nobody in sight the line shows at the bottom as before.
  let speaker = $state<{ x: number; y: number } | null>(null);
  let stageW = $state(0);
  let stageH = $state(0);
  let talkW = $state(0);
  let talkH = $state(0);
  const TAIL = 9;
  const talk = $derived.by(() => {
    if (!speaker || speaker.x < 12 || speaker.x > stageW - 12 || speaker.y < 40 || speaker.y > stageH) return null;
    // Kept inside the picture; the tail still points at the villager.
    const half = talkW / 2;
    const left = Math.min(Math.max(speaker.x, half + 8), Math.max(half + 8, stageW - half - 8));
    const top = Math.max(speaker.y, talkH + TAIL + 6);
    return { left, top, tail: Math.min(Math.max(speaker.x - left, -half + 16), half - 16) };
  });
  const face = $derived(['😢', '🙁', '😐', '🙂', '😊'][Math.min(4, Math.floor($stairs.mood / 20))]);

  const blockText = { busy: 'Ett bygge pågår', cap: 'Bygg ut Stugan först', gold: 'För lite guld', max: 'Högsta nivån', locked: '' } as const;
</script>

<section class="view">
  <div class="canvas" bind:clientWidth={stageW} bind:clientHeight={stageH}>
    <GameCanvas scene={VillageScene} data={{ plots, look, layers, soldiers: $stairs.soldiers, speaking: figures && !!$bubble }} on={{ 'village-zoomed': zoomed, 'village-speaker': (at: { x: number; y: number } | null) => (speaker = at) }} label={`Byn på udden. ${plots.filter((p) => !p.locked).length} av ${plots.length} tomter är röjda.`} />
    {#if zoomHint && !sheet}
      <div class="zoomhint" aria-hidden="true">
        <span class="finger a"></span><span class="finger b"></span>
        <span class="txt">Nyp för att zooma</span>
      </div>
    {/if}
    {#if figures}
      <div class="mood" role="meter" aria-label="Bybornas trivsel" aria-valuemin="0" aria-valuemax="100" aria-valuenow={$stairs.mood}>
        <span class="face" aria-hidden="true">{face}</span>
        <span class="track"><span style:width={`${$stairs.mood}%`}></span></span>
      </div>
    {/if}
    {#if figures && $bubble && talk}
      <p class="bubble talk" aria-live="polite" bind:clientWidth={talkW} bind:clientHeight={talkH} style:left={`${talk.left}px`} style:top={`${talk.top}px`} style:--tail={`${talk.tail}px`}>{$bubble}</p>
    {/if}
    <div class="float">
      {#if figures && $bubble && !talk}<p class="bubble" aria-live="polite">{$bubble}</p>{/if}
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
      {#each damaged as d (d.id)}
        <div class="building damaged">
          {#if d.repairing}
            <span><strong>{d.name}</strong> lagas: {formatDuration(d.left)} kvar</span>
            {#if hookOn('skipWait') && d.left > 0}<button class="primary" onclick={() => skipRepair(d.id)}>Klart nu för 💎 {skipGems(d.left)}</button>{/if}
          {:else}
            <span><strong>{d.name}</strong> skadades i anfallet och ger halv bonus tills den är lagad.</span>
            <button class="primary" disabled={$purse.gold < d.price.gold} onclick={() => startRepair(d.id)}>Laga för 🪙 {d.price.gold} ({formatDuration(d.price.ms)})</button>
          {/if}
        </div>
      {/each}
      <div class="fabs">
        <button class="quit" data-tut="quit" onclick={pressQuit}>Avsluta</button>
        {#if !sheet}
          <button class="fab" data-tut="build-open" onclick={() => (sheet = true)} aria-haspopup="dialog">
            <svg viewBox="0 0 40 40" aria-hidden="true"><g transform="rotate(-35 20 20)"><rect x="17.5" y="12" width="5" height="25" rx="2" fill="#c98f4e" stroke="#5a1d14" stroke-width="2"/><rect x="8" y="4" width="24" height="11" rx="3" fill="#cfd6dd" stroke="#3a3f45" stroke-width="2"/></g></svg>
            <span>Bygg</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
  {#if sheet}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="shade" onclick={() => (sheet = false)}></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="head">
        <div>
          <h2 id="sheet-title">Bygg</h2>
          <span class="fine">{constr ? 'Ett bygge i taget. Det som pågår ska bli klart först.' : `Nästa bygge tar ${formatDuration(buildTime(nextNo))}.`}</span>
        </div>
        <button class="close-x ghost" onclick={() => (sheet = false)} aria-label="Stäng bygglistan">✕</button>
      </div>
      <ul>
        {#each BUILDINGS as b (b.id)}
          {@const broken = $stairs.damaged.some((d) => d.id === b.id)}
          {@const block = buildBlock($village, b.id, $purse.gold)}
          {@const price = priceOf(b.id)}
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
            {#if broken}
              <button class="ghost" disabled aria-describedby={`why-${b.id}`}>Bygg ut</button>
              <span class="why" id={`why-${b.id}`}>Skadad: laga den först</span>
            {:else if block === 'gold' && hookOn('topUpGold')}
              {@const missing = price - $purse.gold}
              {topUpOffered(b.id, missing)}
              <button data-tut={`build-${b.id}`} class="primary topup" onclick={() => build(b.id, true)}>
                <span class="cost">🪙 {price}</span>
                Fyll på {missing} guld för 💎 {topUpGems(missing)}
              </button>
            {:else}
              <button data-tut={`build-${b.id}`} class={block ? 'ghost' : 'primary'} disabled={block !== null} onclick={() => build(b.id)} aria-describedby={block ? `why-${b.id}` : undefined}>
                {$village.levels[b.id] === 0 ? 'Bygg' : 'Bygg ut'}
                {#if block !== 'max'}<span class="cost">{price === 0 ? 'Gratis' : `🪙 ${price}`}</span>{/if}
              </button>
              {#if block}<span class="why" id={`why-${b.id}`}>{blockText[block]}</span>{/if}
            {/if}
          </li>
          {/if}
        {/each}
      </ul>
      <button class="primary play" onclick={onPlay}>Till Kartan</button>
    </div>
  {/if}
</section>

<style>
  .view { position: relative; height: 100%; overflow: hidden; }
  .canvas { position: absolute; inset: 0; }
  /* Everything that floats over the village sits in one column at the bottom. */
  .zoomhint { position: absolute; left: 50%; top: 38%; width: 180px; height: 150px; margin-left: -90px; pointer-events: none; }
  .zoomhint .finger { position: absolute; left: 50%; top: 45%; width: 34px; height: 34px; margin: -17px; border-radius: 50%; background: rgb(255 255 255 / .85); border: 3px solid var(--falu); box-shadow: 0 2px 6px rgb(0 0 0 / .4); }
  .zoomhint .a { animation: pinch-a 1.8s ease-in-out infinite; }
  .zoomhint .b { animation: pinch-b 1.8s ease-in-out infinite; }
  .zoomhint .txt { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-weight: 700; color: #fff; text-shadow: 0 1px 4px #000, 0 0 8px #000; }
  @keyframes pinch-a { 0%, 15% { transform: translate(-16px, 12px); } 60%, 100% { transform: translate(-62px, 46px); } }
  @keyframes pinch-b { 0%, 15% { transform: translate(16px, -12px); } 60%, 100% { transform: translate(62px, -46px); } }
  @media (prefers-reduced-motion: reduce) { .zoomhint .finger { animation: none; } .zoomhint .a { transform: translate(-62px, 46px); } .zoomhint .b { transform: translate(62px, -46px); } }
  .float { position: absolute; left: 10px; right: 10px; bottom: 12px; display: grid; gap: 8px; pointer-events: none; }
  .float > * { pointer-events: auto; }
  .building { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: rgb(255 248 236 / .96); border: 2px solid var(--frame); border-radius: 12px; padding: 8px 10px; box-shadow: 0 3px 0 var(--deep); }
  .building span { flex: 1 1 180px; font-variant-numeric: tabular-nums; }
  .damaged { border-color: var(--falu); background: #fbe6e1; }
  .fabs { display: flex; align-items: flex-end; justify-content: space-between; pointer-events: none; min-height: 84px; }
  .fabs > * { pointer-events: auto; }
  .quit { min-height: 44px; padding: 6px 14px; border-radius: 999px; background: rgb(255 248 236 / .92); border: 2px solid var(--frame); color: var(--deep); box-shadow: 0 2px 0 var(--deep); }
  .fab { width: 84px; height: 84px; min-height: 0; padding: 0; border-radius: 50%; display: grid; place-content: center; justify-items: center; gap: 0; line-height: 1;
    background: radial-gradient(circle at 40% 35%, #c9473a, #8b2a1e); color: #fff; border: 4px solid #fff; box-shadow: 0 0 0 3px var(--deep), 0 5px 0 3px var(--deep); font-weight: 800; font-size: 1.05rem; }
  .fab svg { width: 38px; height: 38px; }
  .fab:active { transform: translateY(3px); box-shadow: 0 0 0 3px var(--deep), 0 2px 0 3px var(--deep); }
  .xmas { background: var(--falu); color: #fff; border: 0; border-radius: 12px; padding: 10px; font: inherit; font-weight: 700; min-height: 44px; box-shadow: 0 3px 0 var(--deep); }
  .shade { position: absolute; inset: 0; background: rgb(0 0 0 / .25); }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; max-height: 72%; display: flex; flex-direction: column; background: var(--panel); border-radius: 18px 18px 0 0; border-top: 3px solid var(--frame); box-shadow: 0 -6px 24px rgb(0 0 0 / .3); padding: 10px 16px 14px; animation: up .22s ease-out; }
  @keyframes up { from { transform: translateY(100%); } }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  .head div { display: grid; }
  h2 { margin: 0; font-size: 1.3rem; line-height: 1.1; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; overflow-y: auto; flex: 1; min-height: 0; }
  li { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 10px; border-bottom: 1px solid var(--line); padding: 6px 0; }
  li div { display: grid; }
  li button { display: grid; justify-items: center; gap: 0; line-height: 1.2; min-width: 96px; padding: 6px 12px; }
  .cost { font-size: .9rem; font-weight: 800; white-space: nowrap; }
  .topup { max-width: 150px; font-size: .9rem; }
  .lvl { color: var(--muted); font-size: .9rem; }
  .fine { color: var(--muted); font-size: .85rem; }
  .why { grid-column: 2; font-size: .8rem; color: var(--muted); text-align: right; }
  .play { margin-top: 8px; }
  .locked { opacity: .7; }
  .lock { font-size: 1.4rem; }
  .mood { position: absolute; top: 8px; left: 8px; right: 8px; display: flex; align-items: center; gap: 8px; background: rgb(243 236 228 / .9); border-radius: 999px; padding: 4px 10px; }
  .face { font-size: 1.3rem; line-height: 1; }
  .track { flex: 1; height: 8px; background: #d8ccc0; border-radius: 4px; overflow: hidden; }
  .track span { display: block; height: 100%; background: #3f6d3a; transition: width .4s; }
  .bubble { justify-self: center; margin: 0; background: #fff; color: #1f1a17; border-radius: 14px; padding: 6px 12px; font-weight: 600; box-shadow: 0 2px 8px rgb(0 0 0 / .25); max-width: 90%; text-align: center; }
  .bubble.talk { position: absolute; margin: -9px 0 0; transform: translate(-50%, -100%); width: max-content; max-width: min(210px, 70%); font-size: 14px; line-height: 1.25; padding: 7px 12px; pointer-events: none; z-index: 2; }
  .bubble.talk::after { content: ''; position: absolute; left: calc(50% + var(--tail, 0px)); top: 100%; transform: translateX(-50%); border: 8px solid transparent; border-top-color: #fff; border-bottom: 0; }
</style>
