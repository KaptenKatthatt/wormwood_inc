<script lang="ts">
  /**
   * The week pass (week step 6), full screen, as in the mockup Jonas approved
   * on 2026-11-20: a stamp card for seven days. Points give levels, every level
   * has a free reward and a gold-pass reward, and a tapped reward flies up to
   * its counter. The second tab holds the missions, which give points.
   */
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { lives, now, purse } from '../lib/state/game';
  import { buyGoldPass, claimMission, claimPass, exp, hubOpen, missionState, passActive, passMissions, renewPass } from '../lib/state/expansion';
  import { GOLD_PASS_GEMS, PASS_DAYS, PASS_TIERS, PASS_XP_PER_TIER, missionReady, passReward, passTier, type Mission, type PassReward } from '../lib/expansion/social';
  import { play } from '../lib/audio/sound';
  import { silently } from '../lib/audio/director';
  import { countAt, flyReward, pieces } from '../lib/ui/flyReward';

  const DAY = 24 * 3600_000;
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ART = { gold: '/art/wheel/coin.webp', gems: '/art/wheel/gem.webp', lives: '/art/wheel/heart.webp', chest: '/art/chests/royal-closed.webp' };
  type Kind = 'gold' | 'gems' | 'lives';

  // The counters show what the player has seen arrive.
  const owned = (k: Kind) => (k === 'lives' ? get(lives).count : get(purse)[k]);
  const shown: Record<Kind, number> = $state({ gold: owned('gold'), gems: owned('gems'), lives: owned('lives') });
  const pills: Partial<Record<Kind, HTMLElement>> = $state({});
  let bumped = $state<Kind | null>(null);
  let flights = 0;
  let alive = true;
  function bump(k: Kind) { bumped = k; setTimeout(() => { if (bumped === k) bumped = null; }, 130); }
  function sync() { if (flights === 0) for (const k of ['gold', 'gems', 'lives'] as const) shown[k] = owned(k); }

  let tab = $state<'rewards' | 'missions'>('rewards');
  let note = $state('');
  let noteKey = $state(0);
  function say(text: string) { note = text; const k = ++noteKey; setTimeout(() => { if (k === noteKey) note = ''; }, 1700); }

  const pass = $derived($exp.pass);
  const tier = $derived(pass ? passTier(pass.xp) : 0);
  const active = $derived.by(() => { void $now; void $exp; return passActive(); });
  const daysLeft = $derived(pass ? Math.max(0, Math.ceil((pass.startedAt + PASS_DAYS * DAY - $now) / DAY)) : 0);
  const leftText = $derived(!active ? 'Slut' : daysLeft > 1 ? `${daysLeft} dagar kvar` : 'Sista dagen!');
  const missions = $derived.by(() => { void $exp; void $now; return passMissions(); });
  const mstate = $derived.by(() => { void $exp; void $now; return missionState(); });
  const waitingRewards = $derived.by(() => {
    if (!pass || !active) return 0;
    let n = 0;
    for (let t = 1; t <= tier; t++) { if (!pass.claimedFree.includes(t)) n++; if (pass.gold && !pass.claimedGold.includes(t)) n++; }
    return n;
  });
  const readyMissions = $derived(active ? missions.filter((m) => missionReady(mstate, m)).length : 0);

  function look(r: PassReward): { img: string; big: string; word: string; kind: Kind | 'chest' } {
    if (r.gold) return { img: ART.gold, big: fmt(r.gold), word: 'guld', kind: 'gold' };
    if (r.gems) return { img: ART.gems, big: String(r.gems), word: 'ädelstenar', kind: 'gems' };
    if (r.lives) return { img: ART.lives, big: String(r.lives), word: 'liv', kind: 'lives' };
    return { img: ART.chest, big: 'Kista', word: 'kunglig kista', kind: 'chest' };
  }
  function rewardState(t: number, gold: boolean): 'done' | 'can' | 'locked' | 'far' | 'reached' {
    if (!pass) return 'far';
    if ((gold ? pass.claimedGold : pass.claimedFree).includes(t)) return 'done';
    if (gold && !pass.gold) return 'locked';
    if (t > tier) return 'far';
    return active ? 'can' : 'reached';
  }

  function take(t: number, gold: boolean, el: HTMLElement) {
    if (rewardState(t, gold) !== 'can') return;
    const l = look(passReward(t, gold));
    const from = l.kind === 'chest' ? 0 : shown[l.kind];
    flights++;
    // The purse is paid at once; the counter waits for the flight.
    if (!silently(() => claimPass(t, gold))) { flights--; return; }
    if (l.kind === 'chest') { flights--; play('shine'); say('En kunglig kista väntar bland dina kistor!'); return; }
    const k = l.kind;
    const to = owned(k);
    play(k === 'gold' ? 'coins' : k === 'gems' ? 'gems' : 'shine');
    const origin = el.querySelector('img') ?? el;
    const target = pills[k];
    if (!target) { flights--; sync(); return; }
    flyReward({
      src: l.img, n: pieces(k, to - from), from: origin, to: target,
      onLand: (i, n) => { if (alive) { shown[k] = Math.max(shown[k], countAt(from, to, i, n)); bump(k); } },
      onDone: () => { flights--; sync(); },
    });
  }
  function collect(m: Mission) {
    const before = tier;
    const xp = claimMission(m.id);
    if (!xp) return;
    play('coins');
    const after = passTier(get(exp).pass?.xp ?? 0);
    if (after > before) { play('shine'); say(`Nivå ${after}! Hämta belöningen.`); } else say(`+${xp} poäng`);
  }
  function buy() {
    if (!pass || pass.gold || shown.gems < GOLD_PASS_GEMS) return;
    if (!buyGoldPass()) return;
    sync(); bump('gems'); play('purchase');
    say('Guldpasset är ditt!');
    tab = 'rewards';
  }
  function close() { hubOpen.set(null); }

  onMount(() => {
    renewPass();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const offP = purse.subscribe(sync);
    const offL = lives.subscribe(sync);
    return () => { alive = false; offP(); offL(); window.removeEventListener('keydown', onKey); };
  });
</script>

<div class="view" role="dialog" aria-modal="true" aria-label="Veckopasset" data-no-click-sound>
  <div class="stage">
    <div class="hud">
      {#each ['gold', 'gems', 'lives'] as const as k}
        <span class="pill" bind:this={pills[k]} class:bump={bumped === k} aria-label={`${shown[k]} ${k === 'gold' ? 'guld' : k === 'gems' ? 'ädelstenar' : 'liv'}`}><img src={ART[k]} alt="" />{fmt(shown[k])}</span>
      {/each}
      <button class="close-x x" onclick={close} aria-label="Stäng veckopasset">✕</button>
    </div>

    {#if pass}
      <div class="head">
        <div class="top"><h2>Veckopasset</h2><span class="left">{leftText}</span></div>
        <div class="lvl"><span>Nivå {tier}</span><div class="bar"><i style:width={`${tier >= PASS_TIERS ? 100 : ((pass.xp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER) * 100}%`}></i></div><span>{tier >= PASS_TIERS ? 'Klart!' : `${pass.xp % PASS_XP_PER_TIER}/${PASS_XP_PER_TIER}`}</span></div>
      </div>
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" aria-selected={tab === 'rewards'} onclick={() => (tab = 'rewards')}>Belöningar{#if waitingRewards}<span class="dot">{waitingRewards}</span>{/if}</button>
        <button class="tab" role="tab" aria-selected={tab === 'missions'} onclick={() => (tab = 'missions')}>Uppdrag{#if readyMissions}<span class="dot">{readyMissions}</span>{/if}</button>
      </div>

      <div class="body">
        {#if tab === 'rewards'}
          <div class="cols"><span>Gratis</span><span></span><span class="g">Guldpasset</span></div>
          {#each Array.from({ length: PASS_TIERS }, (_, i) => i + 1) as t (t)}
            <div class="tier" class:reached={t <= tier}>
              {#each [false, true] as gold, gi}
                {@const l = look(passReward(t, gold))}
                {@const st = rewardState(t, gold)}
                {#if gi === 1}<div class="num">{t}</div>{/if}
                <button class="rw {st}" class:gold aria-disabled={st !== 'can'} onclick={(e) => take(t, gold, e.currentTarget)}
                  aria-label={`Nivå ${t}, ${gold ? 'guldpasset' : 'gratis'}: ${l.big} ${l.word}${st === 'done' ? ', hämtad' : st === 'can' ? ', tryck för att hämta' : st === 'locked' ? ', låst' : ''}`}>
                  {#if st === 'locked'}<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="#5a1d14" stroke-width="3" /><rect x="4" y="10" width="16" height="12" rx="3" fill="#5a1d14" /></svg>{/if}
                  <img src={l.img} alt="" /><span>{l.big}</span>
                  {#if st === 'can'}<span class="get">Hämta</span>{/if}
                </button>
              {/each}
            </div>
          {/each}
        {:else}
          <div class="sec">Dagens uppdrag <small>Nya vid midnatt</small></div>
          {#each missions.filter((m) => !m.weekly) as m (m.id)}{@render mission(m)}{/each}
          <div class="sec">Veckans uppdrag <small>{leftText}</small></div>
          {#each missions.filter((m) => m.weekly) as m (m.id)}{@render mission(m)}{/each}
        {/if}
      </div>

      <div class="buy">
        {#if pass.gold}
          <div>Du har guldpasset<small>Högra spalten är upplåst hela veckan</small></div>
        {:else}
          <div>Lås upp guldpasset<small>{tier > 0 ? `${tier} ${tier === 1 ? 'guldbelöning' : 'guldbelöningar'} väntar redan på dig` : 'Större belöning på varje nivå'}</small></div>
          <button class="btn" disabled={!active || shown.gems < GOLD_PASS_GEMS} onclick={buy} aria-label={`Lås upp guldpasset för ${GOLD_PASS_GEMS} ädelstenar`}><img src={ART.gems} alt="" /> {GOLD_PASS_GEMS}</button>
        {/if}
      </div>
    {/if}
    {#key noteKey}{#if note}<div class="note" role="status">{note}</div>{/if}{/key}
  </div>
</div>

{#snippet mission(m: Mission)}
  {@const have = Math.min(m.need, mstate.have[m.id] ?? 0)}
  {@const got = mstate.got.includes(m.id)}
  {@const ready = active && have >= m.need && !got}
  <div class="mis" class:done={got}>
    <div class="t">{m.text}</div>
    <div class="p"><div class="bar"><i style:width={`${(have / m.need) * 100}%`}></i></div>{have}/{m.need}</div>
    <button class="btn pts" class:green={ready} disabled={!ready} onclick={() => collect(m)}>{got ? 'Hämtat' : `+${m.xp} poäng`}</button>
  </div>
{/snippet}

<style>
  .view { position: fixed; inset: 0; z-index: 12; background: #7fb6e6 url(/art/chests/scene.webp) center / cover no-repeat; display: flex; justify-content: center; align-items: center; overflow: hidden; user-select: none; -webkit-user-select: none; color: #1f1a17; }
  /* The stage keeps the mockup's shape, so its measures (cqw) carry over. Its own padding and gap are in % and px: cqw on the container itself would measure the window. */
  .stage { position: relative; box-sizing: border-box; width: min(100%, 520px); height: min(100%, 900px); container-type: inline-size; display: grid; grid-template-rows: auto auto auto minmax(0, 1fr) auto; gap: 7px; padding: calc(8px + env(safe-area-inset-top)) 3% calc(10px + env(safe-area-inset-bottom)); }
  .hud { display: flex; gap: 6px; align-items: center; min-height: 44px; }
  .pill { display: flex; align-items: center; gap: 4px; padding: 2px 10px 2px 4px; border-radius: 999px; background: #fffaf2; border: 2px solid var(--deep); font-weight: 800; font-size: 1rem; font-variant-numeric: tabular-nums; transition: transform .12s; }
  .pill img { width: 1.5em; height: 1.5em; object-fit: contain; }
  .pill.bump { transform: scale(1.2); }
  .x { margin-left: auto; background: #fffaf2; color: var(--deep); border: 2px solid var(--deep); }

  .head { background: rgb(255 250 242 / .95); border: 3px solid var(--deep); border-radius: 14px; padding: 1.5cqw 3cqw 2.4cqw; display: grid; gap: 1cqw; }
  .top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .top h2 { margin: 0; font-size: clamp(19px, 6.2cqw, 28px); font-weight: 800; line-height: 1.1; }
  .left { font-weight: 700; font-size: clamp(12px, 3.8cqw, 17px); color: var(--falu); white-space: nowrap; }
  .lvl { display: flex; align-items: center; gap: 2cqw; font-weight: 800; font-size: clamp(13px, 4.2cqw, 18px); }
  .bar { flex: 1; height: 3.4cqw; min-height: 12px; border-radius: 999px; background: #e6d8c2; border: 2px solid var(--deep); overflow: hidden; }
  .bar i { display: block; height: 100%; background: linear-gradient(#f6d24a, #e0a81c); transition: width .5s; }

  .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 2cqw; }
  .tab { position: relative; font: inherit; font-weight: 800; font-size: clamp(15px, 4.8cqw, 21px); min-height: 44px; border-radius: 12px; border: 3px solid var(--deep); background: rgb(255 250 242 / .8); color: var(--deep); cursor: pointer; box-shadow: none; }
  .tab[aria-selected='true'] { background: var(--falu); color: #fffaf2; box-shadow: 0 3px 0 var(--deep); }
  .dot { position: absolute; top: -8px; right: -6px; min-width: 22px; height: 22px; box-sizing: border-box; padding: 0 5px; border-radius: 999px; background: #b8382a; color: #fff; border: 2px solid #fff; font-size: 13px; line-height: 18px; }

  .body { min-height: 0; overflow-y: auto; border-radius: 14px; background: rgb(255 250 242 / .93); border: 3px solid var(--deep); padding: 2cqw; scrollbar-width: thin; }
  .cols { display: grid; grid-template-columns: 1fr 11cqw 1fr; gap: 1.5cqw; align-items: center; font-weight: 800; font-size: clamp(12px, 3.9cqw, 17px); text-align: center; position: sticky; top: -2cqw; background: #fffaf2; padding: 1cqw 0; z-index: 2; border-bottom: 2px solid #d8ccc0; }
  .cols .g { color: #8a5a00; }
  .tier { display: grid; grid-template-columns: 1fr 11cqw 1fr; gap: 1.5cqw; align-items: center; padding: 1cqw 0 1.6cqw; position: relative; }
  .tier::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1.4cqw; margin-left: -.7cqw; background: #d8ccc0; }
  .tier.reached::before { background: #e0a81c; }
  .num { position: relative; z-index: 1; justify-self: center; width: 9.5cqw; height: 9.5cqw; border-radius: 50%; display: grid; place-items: center; background: #e6d8c2; border: 3px solid var(--deep); font-weight: 800; font-size: clamp(13px, 4.4cqw, 19px); }
  .tier.reached .num { background: linear-gradient(#f6d24a, #e0a81c); }
  .rw { position: relative; font: inherit; font-weight: 800; font-size: clamp(13px, 4.2cqw, 18px); min-height: 13cqw; border-radius: 12px; border: 3px solid var(--deep); background: #fff; color: #1f1a17; display: flex; align-items: center; justify-content: center; gap: 1.2cqw; padding: 1cqw; cursor: default; line-height: 1.05; box-shadow: none; }
  .rw img { width: 8.5cqw; height: 8.5cqw; object-fit: contain; }
  .rw.gold { background: linear-gradient(#fff3c4, #f2d27a); }
  .rw.can { cursor: pointer; box-shadow: 0 0 0 3px #57a84f, 0 4px 0 var(--deep); animation: can 1.2s ease-in-out infinite; }
  @keyframes can { 50% { transform: scale(1.04); } }
  .rw.locked, .rw.far { filter: saturate(.45); opacity: .75; }
  .rw.done { opacity: .5; }
  .rw.done::after { content: '✓'; position: absolute; right: 4px; top: 0; color: #3f6d3a; font-size: 1.3em; }
  .lock { position: absolute; left: 3px; top: 3px; width: 5cqw; height: 5cqw; }
  .get { position: absolute; left: 50%; bottom: -2.2cqw; transform: translateX(-50%); background: #57a84f; color: #fff; border: 2px solid var(--deep); border-radius: 999px; padding: 0 8px; font-size: .72em; white-space: nowrap; }

  .sec { font-weight: 800; font-size: clamp(14px, 4.6cqw, 20px); margin: 1cqw 1cqw 1.5cqw; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .sec small { font-weight: 700; color: var(--falu); font-size: .78em; }
  .mis { display: grid; grid-template-columns: 1fr auto; gap: 1cqw 2cqw; align-items: center; background: #fff; border: 3px solid var(--deep); border-radius: 12px; padding: 2cqw 2.5cqw; margin-bottom: 2cqw; }
  .mis.done { opacity: .55; }
  .t { font-weight: 800; font-size: clamp(13px, 4.3cqw, 19px); line-height: 1.15; }
  .p { grid-column: 1; display: flex; align-items: center; gap: 2cqw; font-weight: 700; font-size: clamp(12px, 3.7cqw, 16px); color: #5c524b; }
  .p .bar { height: 2.6cqw; min-height: 10px; }
  .p .bar i { background: linear-gradient(#6fc0f0, #2f7fbf); }
  .pts { grid-row: 1 / span 2; grid-column: 2; }
  .btn { font: inherit; font-weight: 800; font-size: clamp(14px, 4.4cqw, 19px); line-height: 1.1; color: #fffaf2; background: linear-gradient(#c8432f, #9b2a1f); border: 3px solid var(--deep); border-radius: 12px; padding: 6px 12px; min-height: 44px; cursor: pointer; box-shadow: 0 4px 0 var(--deep); display: inline-flex; gap: 5px; align-items: center; justify-content: center; }
  .btn img { width: 1.2em; height: 1.2em; object-fit: contain; }
  .btn.green { background: linear-gradient(#57a84f, #3f6d3a); }
  .btn:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 var(--deep); }
  .btn:disabled { background: #e6d8c2; color: #5c524b; box-shadow: none; cursor: default; opacity: 1; }
  .buy { display: flex; align-items: center; gap: 2cqw; background: linear-gradient(#fff3c4, #f2d27a); border: 3px solid var(--deep); border-radius: 14px; padding: 1.5cqw 3cqw; font-weight: 800; font-size: clamp(14px, 4.5cqw, 20px); line-height: 1.1; min-height: 52px; }
  .buy div { flex: 1; min-width: 0; }
  .buy small { display: block; font-weight: 700; font-size: .76em; color: #5c3a10; }
  .note { position: absolute; left: 8%; right: 8%; top: 44%; z-index: 20; background: #fffaf2; border: 3px solid var(--deep); border-radius: 14px; padding: 3cqw; text-align: center; font-weight: 800; font-size: clamp(16px, 5.4cqw, 24px); box-shadow: 0 6px 0 rgb(90 29 20 / .4); animation: pop .4s cubic-bezier(.2, 1.5, .4, 1); pointer-events: none; }
  @keyframes pop { from { transform: scale(.3); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .rw.can, .note { animation: none; } .bar i { transition: none; } }
</style>
