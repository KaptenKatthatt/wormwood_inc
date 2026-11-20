<script lang="ts">
  /**
   * The week's hooks in one sheet: league, pass, album (step 6) and chests,
   * wheel, champions (step 7). Opened from the strip over the map.
   */
  import Modal from './Modal.svelte';
  import {
    buyGoldPass, buyRoyalChest, claimPass, draw, exp, freeSpinReady, hubOpen, leagueRows, openChestNow, passActive, spin,
  } from '../lib/state/expansion';
  import { now, purse } from '../lib/state/game';
  import { ALBUM_SETS, ALBUM_SIZE, GOLD_PASS_GEMS, LEAGUE_DAYS, PASS_DAYS, PASS_TIERS, PASS_XP_PER_TIER, passReward, passTier, rewardText } from '../lib/expansion/social';
  import { CHAMPIONS, CHEST_SLOTS, DRAW_GEMS, PITY_HARD, ROYAL_CHEST_GEMS, SPIN_GEMS, TEN_DRAW_GEMS, WHEEL, championPower, nearJackpot, type Champion, type ChestLoot } from '../lib/expansion/luck';
  import { formatDuration, HOUR } from '../lib/time/clock';
  import { skipGems } from '../lib/economy/village';
  import { stickerName } from '../lib/expansion/social';

  /** Long countdowns in days, short ones as usual. */
  const left = (ms: number) => (ms >= 48 * HOUR ? `${Math.floor(ms / (24 * HOUR))} dagar` : formatDuration(ms));
  const TITLES = { liga: 'Veckoligan', pass: 'Veckopasset', album: 'Albumet', kistor: 'Kistor', hjul: 'Lyckohjulet', kampar: 'Kämpar' } as const;
  const tab = $derived($hubOpen);

  // league
  const rows = $derived.by(() => { void $now; void $exp; return leagueRows(); });
  const leagueLeft = $derived($exp.league ? $exp.league.startedAt + LEAGUE_DAYS * 24 * HOUR - $now : 0);

  // pass
  const tier = $derived($exp.pass ? passTier($exp.pass.xp) : 0);
  const passLeft = $derived($exp.pass ? $exp.pass.startedAt + PASS_DAYS * 24 * HOUR - $now : 0);

  // chests
  let loot = $state<ChestLoot | null>(null);
  function openC(id: string) { loot = openChestNow(id); }

  // wheel
  let spinning = $state(false);
  let angle = $state(0);
  let result = $state<number | null>(null);
  function doSpin() {
    if (spinning) return;
    const i = spin();
    if (i === null) return;
    result = null;
    spinning = true;
    const seg = 360 / WHEEL.length;
    angle = angle - (angle % 360) + 360 * 5 + (360 - i * seg - seg / 2);
    setTimeout(() => { spinning = false; result = i; }, 3200);
  }

  // champions
  let drawn = $state<Champion[] | null>(null);
  function doDraw(ten: boolean) { drawn = draw(ten); }

  function close() { hubOpen.set(null); loot = null; drawn = null; result = null; }
</script>

{#if tab}
<Modal title={TITLES[tab]} onClose={close}>
  {#if tab === 'liga'}
    <p>Tio byar tävlar om stjärnor i en vecka. Topp 3 får ädelstenar, de tre sista flyttas ner. {leagueLeft > 0 ? `${left(leagueLeft)} kvar.` : 'Ligan är slut.'}</p>
    <ol class="table">
      {#each rows as r, i}
        <li class:me={r.me} class:top={i < 3} class:bottom={i >= 7}><span>{i + 1}. {r.name}</span><strong>{r.points} ★</strong></li>
      {/each}
    </ol>
  {:else if tab === 'pass' && $exp.pass}
    <p>Klara utmaningar för att gå upp i nivå. {passActive() ? `Passet tar slut om ${left(passLeft)}; det som inte hämtats försvinner.` : 'Passet är slut.'}</p>
    <div class="xp" role="progressbar" aria-valuemin="0" aria-valuemax={PASS_XP_PER_TIER} aria-valuenow={$exp.pass.xp % PASS_XP_PER_TIER} aria-label="Till nästa nivå"><span style:width={`${(($exp.pass.xp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER) * 100}%`}></span></div>
    <p class="fine">Nivå {tier} av {PASS_TIERS}.</p>
    {#if !$exp.pass.gold && passActive()}
      <button class="primary" onclick={buyGoldPass}>Lås upp Guldpasset för 💎 {GOLD_PASS_GEMS}</button>
    {/if}
    <ol class="tiers">
      {#each Array.from({ length: PASS_TIERS }, (_, k) => k + 1) as t}
        {@const reached = t <= tier}
        <li class:reached>
          <span class="tn">{t}</span>
          <button class="ghost small" disabled={!reached || $exp.pass.claimedFree.includes(t) || !passActive()} onclick={() => claimPass(t, false)}>
            {$exp.pass.claimedFree.includes(t) ? '✓' : rewardText(passReward(t, false))}
          </button>
          <button class="small gold" disabled={!$exp.pass.gold || !reached || $exp.pass.claimedGold.includes(t) || !passActive()} onclick={() => claimPass(t, true)}>
            {$exp.pass.claimedGold.includes(t) ? '✓' : `${$exp.pass.gold ? '' : '🔒 '}${rewardText(passReward(t, true))}`}
          </button>
        </li>
      {/each}
    </ol>
  {:else if tab === 'album'}
    <p>{$exp.album.length} av {ALBUM_SIZE} bilder. Ett fullt set ger guld och ädelstenar; den sista bilden i varje set är sällsynt.</p>
    {#each ALBUM_SETS as set, si}
      <h3>{set.name}</h3>
      <ul class="album">
        {#each set.stickers as _, k}
          {@const id = si * 6 + k}
          <li class:have={$exp.album.includes(id)} class:rare={k === 5}>{$exp.album.includes(id) ? stickerName(id) : '?'}</li>
        {/each}
      </ul>
    {/each}
  {:else if tab === 'kistor'}
    {#if loot}
      <p class="big">Kistan innehöll: 🪙 {loot.gold}{loot.gems ? `, 💎 ${loot.gems}` : ''}{loot.stickers.length ? `, ${loot.stickers.length} ${loot.stickers.length === 1 ? 'bild' : 'bilder'}` : ''}{loot.draws ? ', en dragning' : ''}</p>
    {/if}
    <p>Kistor hittas efter klarade utmaningar och öppnas efter 3 timmar. Plats för {CHEST_SLOTS}.</p>
    <ul class="chests">
      {#each $exp.chests as c (c.id)}
        {@const left = c.readyAt - $now}
        <li>
          <span>{c.kind === 'royal' ? '👑 Kunglig kista' : '🧰 Träkista'}{left > 0 ? `: ${formatDuration(left)}` : ': klar!'}</span>
          <button class="primary small" onclick={() => openC(c.id)}>{left > 0 ? `Öppna nu 💎 ${skipGems(left)}` : 'Öppna'}</button>
        </li>
      {:else}
        <li class="fine">Inga kistor just nu.</li>
      {/each}
    </ul>
    <button class="primary" onclick={buyRoyalChest}>Köp en kunglig kista för 💎 {ROYAL_CHEST_GEMS}</button>
  {:else if tab === 'hjul'}
    <div class="wheelwrap">
      <svg viewBox="-110 -110 220 220" class="wheel" style:transform={`rotate(${angle}deg)`} class:spinning aria-hidden="true">
        {#each WHEEL as s, i}
          {@const a0 = (i * 2 * Math.PI) / WHEEL.length - Math.PI / 2}
          {@const a1 = ((i + 1) * 2 * Math.PI) / WHEEL.length - Math.PI / 2}
          <path d={`M0,0 L${100 * Math.cos(a0)},${100 * Math.sin(a0)} A100,100 0 0 1 ${100 * Math.cos(a1)},${100 * Math.sin(a1)} Z`} fill={s.jackpot ? '#f2c230' : i % 2 ? '#fff8ec' : '#e9c9a0'} stroke="#7a2418" stroke-width="2" />
          <text transform={`rotate(${(i + 0.5) * (360 / WHEEL.length)}) translate(0,-66)`} text-anchor="middle" class="seg">{s.label}</text>
        {/each}
        <circle r="14" fill="#b8382a" stroke="#fff" stroke-width="3" />
      </svg>
      <div class="pointer" aria-hidden="true">▼</div>
    </div>
    <p aria-live="polite" class="big">{result !== null ? (WHEEL[result].jackpot ? 'STORVINST! 💎 100' : nearJackpot(result) ? `${WHEEL[result].label}. Så nära storvinsten!` : `Du vann ${WHEEL[result].label}`) : ''}</p>
    <button class="primary" disabled={spinning} onclick={doSpin}>{freeSpinReady() ? 'Snurra gratis' : `Snurra för 💎 ${SPIN_GEMS}`}</button>
  {:else if tab === 'kampar'}
    <p>Kämpar gör armén starkare när du anfaller grannbyar. Legendariska: 2 %. Garanterad legendarisk inom {PITY_HARD} dragningar: <strong>{PITY_HARD - $exp.pity} kvar</strong>.</p>
    {#if drawn}
      <ul class="drawn">{#each drawn as c}<li class={c.rarity}>{c.name} <small>({c.rarity})</small></li>{/each}</ul>
    {/if}
    <div class="buttons">
      <button class="primary" onclick={() => doDraw(false)}>{$exp.freeDraws ? `Dra gratis (${$exp.freeDraws})` : `Dra en för 💎 ${DRAW_GEMS}`}</button>
      <button class="primary" onclick={() => doDraw(true)}>Dra tio för 💎 {TEN_DRAW_GEMS}</button>
    </div>
    <p class="fine">Dina kämpar ger +{championPower($exp.champions)} i anfall.</p>
    <ul class="owned">
      {#each CHAMPIONS as c}{#if $exp.champions[c.id]}<li class={c.rarity}>{c.name} ×{$exp.champions[c.id]}</li>{/if}{/each}
    </ul>
  {/if}
  <p class="fine">Du har 💎 {$purse.gems} och 🪙 {$purse.gold}.</p>
  <div class="buttons"><button class="ghost" onclick={close}>Stäng</button></div>
</Modal>
{/if}

<style>
  .table, .tiers, .album, .chests, .drawn, .owned { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .table li { display: flex; justify-content: space-between; padding: 4px 8px; border-radius: 6px; background: #fff8ec; }
  .table li.top { border-left: 4px solid #e0b04a; }
  .table li.bottom { border-left: 4px solid #b8382a; }
  .table li.me { background: #f2c230; font-weight: 800; }
  .xp { height: 10px; background: #e6d8c2; border-radius: 5px; overflow: hidden; }
  .xp span { display: block; height: 100%; background: #3f8f3a; }
  .tiers li { display: grid; grid-template-columns: 28px 1fr 1fr; gap: 6px; align-items: center; opacity: .6; }
  .tiers li.reached { opacity: 1; }
  .tn { font-weight: 800; text-align: center; }
  .small { min-height: 40px; padding: 4px 6px; font-size: .8rem; }
  .gold { background: #f2c230; color: var(--deep); border: 2px solid #7a2418; }
  h3 { margin: 6px 0 0; font-size: 1rem; }
  .album { grid-template-columns: repeat(3, 1fr); }
  .album li { border: 2px dashed var(--line); border-radius: 8px; padding: 6px 4px; text-align: center; font-size: .8rem; min-height: 44px; display: grid; place-items: center; color: var(--muted); }
  .album li.have { border-style: solid; border-color: #3f8f3a; color: var(--ink); background: #eef6e8; font-weight: 700; }
  .album li.rare:not(.have) { border-color: #e0b04a; }
  .chests li { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .wheelwrap { position: relative; width: min(260px, 80vw); margin: 0 auto; }
  .wheel { width: 100%; display: block; }
  .wheel.spinning { transition: transform 3.2s cubic-bezier(.15,.85,.25,1); }
  .seg { font: 700 11px system-ui, sans-serif; fill: #5a1d14; }
  .pointer { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: #b8382a; font-size: 1.6rem; }
  .legendarisk { color: #9a6a09; font-weight: 800; }
  .sällsynt { color: #2c6fa6; font-weight: 700; }
  .big { font-size: 1.1rem; font-weight: 700; }
  .fine { color: var(--muted); font-size: .9rem; }
  @media (prefers-reduced-motion: reduce) { .wheel.spinning { transition-duration: .3s; } }
</style>
