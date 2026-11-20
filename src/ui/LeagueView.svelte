<script lang="ts">
  /**
   * The weekly league (week step 6), full screen, as in the mockup Jonas
   * approved on 2026-11-20: the five leagues as pennants, the time left, the
   * ten villages with the prize of each place, the lines for moving up and
   * down, and what the player needs for the next place. When a week has
   * ended the screen opens on the prize giving: the place, the prize to
   * collect, and then the move to the next league.
   */
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { flip } from 'svelte/animate';
  import { now, purse } from '../lib/state/game';
  import { claimLeaguePrize, exp, hubOpen, leagueRows } from '../lib/state/expansion';
  import { LEAGUES, LEAGUE_COLOURS, LEAGUE_LAST_DAY, leagueEndsAt, leaguePrize, leagueRank, type LeagueResult, type LeagueRow } from '../lib/expansion/social';
  import { HOUR } from '../lib/time/clock';
  import { play } from '../lib/audio/sound';
  import { silently } from '../lib/audio/director';
  import { countAt, flyReward, pieces } from '../lib/ui/flyReward';

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ART = { gold: '/art/wheel/coin.webp', gems: '/art/wheel/gem.webp' };

  // The counters show what the player has seen arrive, not what the purse already holds.
  let shown = $state({ gold: get(purse).gold, gems: get(purse).gems });
  let bumped = $state<'gold' | 'gems' | null>(null);
  const pills: { gold?: HTMLElement; gems?: HTMLElement } = $state({});
  let flying = false;
  let alive = true;
  function sync() { if (!flying) shown = { gold: get(purse).gold, gems: get(purse).gems }; }
  function bump(k: 'gold' | 'gems') { bumped = k; setTimeout(() => { if (bumped === k) bumped = null; }, 130); }

  const league = $derived($exp.league);
  const tier = $derived(league?.tier ?? 0);
  const rows = $derived.by<LeagueRow[]>(() => { void $now; void $exp; return leagueRows(); });
  const rank = $derived(leagueRank(rows));
  const msLeft = $derived(league ? Math.max(0, leagueEndsAt(league) - $now) : 0);
  const lastDay = $derived(msLeft <= LEAGUE_LAST_DAY);
  const leftText = $derived.by(() => {
    const h = Math.ceil(msLeft / HOUR);
    if (h >= 24) { const d = Math.floor(h / 24), r = h % 24; return `${d} ${d === 1 ? 'dag' : 'dagar'}${r ? ` ${r} tim` : ''} kvar`; }
    return h > 1 ? `${h} tim kvar` : 'Mindre än 1 tim kvar';
  });
  /** What the player needs for the place that matters most from here. */
  const hint = $derived.by(() => {
    if (!rows.length) return '';
    const need = (place: number) => rows[place - 1].points - rows[rank - 1].points + 1;
    if (rank === 1) return 'Du leder ligan.';
    if (rank <= 3) return `${need(rank - 1)} ★ till plats ${rank - 1}.`;
    if (rank >= 8 && tier > 0) return `${need(7)} ★ för att slippa flyttas ner.`;
    if (rank <= 5) return `${need(3)} ★ till ${tier < LEAGUES.length - 1 ? 'uppflyttning' : 'prisplats'}.`;
    return `${need(rank - 1)} ★ till plats ${rank - 1}.`;
  });

  // ---------------------------------------------------------------- the prize giving
  let result = $state<LeagueResult | null>(null);
  let stage = $state<'prize' | 'move'>('prize');
  let prizeEl = $state<HTMLElement>();
  let claimed = $state(false);
  const prizeKind = $derived(result?.prize.gems ? 'gems' as const : 'gold' as const);
  const prizeAmount = $derived(result ? (result.prize.gems ?? result.prize.gold ?? 0) : 0);
  const prizeLine = $derived(!result ? '' : result.rank <= 3 ? 'Bra jobbat, byn tog en prisplats!' : result.rank <= 7 ? 'Byn klarade sig kvar. Här är ett pris för besväret.' : 'Det räckte inte den här veckan. Här är ett litet tröstpris.');
  const moveLine = $derived.by(() => {
    if (!result) return '';
    const from = LEAGUES[result.tier], to = LEAGUES[result.tier + result.move];
    if (result.move > 0) return `I ${to} är priserna större och grannbyarna snabbare.`;
    if (result.move < 0) return `Kom bland de tre bästa i ${to} så är du tillbaka i ${from} nästa vecka.`;
    if (result.rank <= 3) return 'Du håller dig kvar i den högsta ligan.';
    if (result.rank >= 8) return 'Ingen flyttas ner från den lägsta ligan.';
    return 'Kom bland de tre bästa nästa vecka för att flyttas upp.';
  });

  function collect() {
    if (!result || claimed) return;
    claimed = true;
    const k = prizeKind;
    const from = shown[k];
    flying = true;
    const paid = silently(() => claimLeaguePrize());
    const to = get(purse)[k];
    play(k === 'gems' ? 'gems' : 'coins');
    const target = pills[k];
    const next = () => { flying = false; sync(); if (alive) { stage = 'move'; if (result && result.move > 0) play('fireworks'); } };
    if (!paid || !target || !prizeEl) { next(); return; }
    flyReward({
      src: ART[k], n: pieces(k, to - from), from: prizeEl, to: target,
      onLand: (i, n) => { if (alive) { shown[k] = Math.max(shown[k], countAt(from, to, i, n)); bump(k); } },
      onDone: next,
    });
  }
  function nextWeek() { result = null; }
  function close() { hubOpen.set(null); }

  onMount(() => {
    result = get(exp).league?.result ?? null;
    if (result && result.rank <= 3) play('fireworks');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !result) close(); };
    window.addEventListener('keydown', onKey);
    const offP = purse.subscribe(sync);
    return () => { alive = false; offP(); window.removeEventListener('keydown', onKey); };
  });
</script>

{#snippet prize(p: { gems?: number; gold?: number })}
  <img src={p.gems ? ART.gems : ART.gold} alt={p.gems ? 'ädelstenar' : 'guld'} />{p.gems ?? p.gold}
{/snippet}

<div class="view" role="dialog" aria-modal="true" aria-label="Veckoligan" data-no-click-sound>
  <div class="stage">
    <div class="hud">
      {#each ['gold', 'gems'] as const as k}
        <span class="pill" bind:this={pills[k]} class:bump={bumped === k} aria-label={`${shown[k]} ${k === 'gold' ? 'guld' : 'ädelstenar'}`}><img src={ART[k]} alt="" />{fmt(shown[k])}</span>
      {/each}
      {#if !result}<button class="close-x x" onclick={close} aria-label="Stäng veckoligan">✕</button>{/if}
    </div>

    <div class="panel">
      <div class="ladder" aria-label={`Din by spelar i ${LEAGUES[tier]}, liga ${tier + 1} av ${LEAGUES.length}`}>
        {#each LEAGUES as name, i (name)}
          <div class="pennant" class:on={i === tier} class:passed={i < tier} style:--c={LEAGUE_COLOURS[i]}><i></i>{name}</div>
        {/each}
      </div>
      <div class="clock"><h2>{LEAGUES[tier]}</h2><span class="left" class:hot={lastDay}>{lastDay ? 'Sista dygnet! ' : ''}{leftText}</span></div>
      <ol class="table">
        {#each rows as r, i (r.name)}
          <li class:me={r.me} class:up={i < 3} class:down={i >= 7 && tier > 0} class:cut={i === 2 || (i === 6 && tier > 0)}
            data-cut={i === 2 ? (tier < LEAGUES.length - 1 ? 'Flyttas upp' : 'Prisplats') : 'Flyttas ner'} class:cut-down={i === 6}
            animate:flip={{ duration: calm ? 0 : 450 }}>
            <span class="pl">{i + 1}</span>
            <span class="nm">{r.name}</span>
            <span class="st">{r.points}<span class="star" aria-hidden="true"> ★</span><span class="sr"> stjärnor</span></span>
            <span class="prize">{@render prize(leaguePrize(tier, i + 1))}</span>
          </li>
        {/each}
      </ol>
      <p class="hint" class:hot={lastDay || (rank >= 8 && tier > 0)}>{hint}</p>
      <button class="go" onclick={close}>Spela en utmaning</button>
    </div>

    {#if result}
      <div class="over">
        {#if stage === 'prize'}
          <h2>Veckan är slut!</h2>
          <p>Din by kom på plats</p>
          <div class="big">{result.rank}</div>
          <p>{prizeLine}</p>
          <div class="won" bind:this={prizeEl}>{@render prize(result.prize)}</div>
          <button class="gold" onclick={collect} disabled={claimed}>Hämta priset</button>
        {:else}
          {@const from = result.tier}
          {@const to = result.tier + result.move}
          <h2>{result.move > 0 ? 'Byn flyttas upp!' : result.move < 0 ? 'Byn flyttas ner' : `Byn stannar i ${LEAGUES[from]}`}</h2>
          <div class="move" class:downward={result.move < 0}>
            {#if result.move !== 0}
              <div class="v old" style:--c={LEAGUE_COLOURS[from]}><i></i>{LEAGUES[from]}</div>
              <span class="arrow" aria-hidden="true">→</span>
            {/if}
            <div class="v new" style:--c={LEAGUE_COLOURS[to]}><i></i>{LEAGUES[to]}</div>
          </div>
          <p>{moveLine}</p>
          <button class="gold" onclick={nextWeek}>Börja nästa vecka</button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .view { position: fixed; inset: 0; z-index: 12; background: #7fb6e6 url(/art/chests/scene.webp) center / cover no-repeat; display: flex; justify-content: center; align-items: center; overflow: hidden; user-select: none; -webkit-user-select: none; color: #1f1a17; }
  .stage { position: relative; box-sizing: border-box; width: min(100%, 520px); height: min(100%, 900px); display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 7px; padding: calc(8px + env(safe-area-inset-top)) 3% calc(10px + env(safe-area-inset-bottom)); }
  .hud { display: flex; gap: 6px; align-items: center; min-height: 44px; }
  .pill { display: flex; align-items: center; gap: 4px; padding: 2px 10px 2px 4px; border-radius: 999px; background: #fffaf2; border: 2px solid var(--deep); font-weight: 800; font-size: 1rem; font-variant-numeric: tabular-nums; transition: transform .12s; }
  .pill img { width: 1.5em; height: 1.5em; object-fit: contain; }
  .pill.bump { transform: scale(1.2); }
  .x { margin-left: auto; background: #fffaf2; color: var(--deep); border: 2px solid var(--deep); }

  .panel { background: rgb(243 236 228 / .97); border: 3px solid var(--deep); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .ladder { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
  .pennant { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; opacity: .45; font-size: .72rem; font-weight: 700; color: var(--muted); }
  .pennant i, .v i { display: block; width: 30px; height: 38px; background: var(--c); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%); }
  .pennant.on { opacity: 1; color: var(--ink); font-size: .85rem; }
  .pennant.on i { width: 44px; height: 56px; }
  .pennant.passed { opacity: .8; }

  .clock { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; border-top: 2px solid var(--line); padding-top: 6px; }
  .clock h2 { margin: 0; font-size: 1.15rem; font-weight: 800; }
  .left { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
  .left.hot { color: var(--falu); animation: pulse 1.1s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .55; } }

  .table { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  .table li { position: relative; display: grid; grid-template-columns: 30px minmax(0, 1fr) auto 74px; align-items: center; gap: 8px; background: #fff; border-radius: 10px; padding: 5px 8px; font-weight: 500; }
  .pl { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; background: #e9dfd3; font-variant-numeric: tabular-nums; }
  .table li.up { background: #dfead9; }
  .table li.up .pl { background: var(--green); color: #fff; }
  .table li.down { background: #f2d9d3; }
  .table li.down .pl { background: var(--falu); color: #fff; }
  .table li.me { outline: 3px solid var(--gold); outline-offset: -3px; background: #fff6dc; font-weight: 800; }
  .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .star { color: var(--gold); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .prize { display: flex; align-items: center; justify-content: flex-end; gap: 3px; font-size: .9rem; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
  .prize :global(img) { width: 18px; height: 18px; object-fit: contain; }
  /* The lines for moving up and down sit under the third and the seventh place, whoever holds them. */
  .table li.cut { margin-bottom: 20px; }
  .table li.cut::after { content: attr(data-cut); position: absolute; left: 0; right: 0; top: calc(100% + 3px); height: 16px; display: grid; place-items: center; font-size: .72rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--green); background: linear-gradient(currentColor, currentColor) left center / calc(50% - 60px) 2px no-repeat, linear-gradient(currentColor, currentColor) right center / calc(50% - 60px) 2px no-repeat; }
  .table li.cut-down::after { color: var(--falu); }

  .hint { margin: 0; text-align: center; font-weight: 700; min-height: 1.3em; }
  .hint.hot { color: var(--falu); }
  .go { background: var(--green); color: #fff; border: 0; border-bottom: 4px solid #28481f; border-radius: 14px; font-size: 1.25rem; font-weight: 800; padding: 10px; min-height: 52px; }

  .over { position: absolute; inset: 0; z-index: 2; background: rgb(40 12 8 / .97); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 20px; text-align: center; }
  .over h2 { font-size: 1.9rem; font-weight: 800; margin: 0; text-wrap: balance; }
  .over p { margin: 0; font-size: 1.1rem; max-width: 30ch; }
  .big { font-size: 4.2rem; font-weight: 800; line-height: 1; color: var(--gold); animation: pop .5s cubic-bezier(.2, 1.6, .4, 1); }
  @keyframes pop { from { transform: scale(.2); opacity: 0; } }
  .won { display: flex; align-items: center; gap: 8px; font-size: 2rem; font-weight: 800; background: rgb(255 255 255 / .12); border-radius: 16px; padding: 6px 18px; }
  .won :global(img) { width: 40px; height: 40px; object-fit: contain; }
  .gold { background: var(--gold); color: var(--ink); border: 0; border-bottom: 4px solid #9a6f1c; border-radius: 14px; font-size: 1.2rem; font-weight: 800; padding: 10px 22px; min-height: 52px; }
  .gold:disabled { opacity: .6; }
  .move { display: flex; align-items: center; gap: 14px; font-weight: 800; }
  .v { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .v i { width: 54px; height: 70px; }
  .v.old { opacity: .45; }
  .v.new { animation: hoist .9s cubic-bezier(.2, 1.3, .4, 1); }
  .downward .v.new { animation-name: lower; }
  @keyframes hoist { from { transform: translateY(70px); opacity: 0; } }
  @keyframes lower { from { transform: translateY(-70px); opacity: 0; } }
  .arrow { font-size: 2rem; }
  @media (prefers-reduced-motion: reduce) { .left.hot, .big, .v.new { animation: none; } }
</style>
