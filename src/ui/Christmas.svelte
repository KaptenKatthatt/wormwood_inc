<script lang="ts">
  /**
   * Christmas in Skargardsbyn: the advent calendar and the Christmas market.
   * Placeholder look (emoji) until Jonas has approved the pictures.
   */
  import Modal from './Modal.svelte';
  import { now, purse, settings, daily } from '../lib/state/game';
  import { buyXmasDecor, countdownShown, openXmasDoor, refillFor, xmas, xmasDate, xmasDay, xmasOpen } from '../lib/state/christmas';
  import { DECOR, DOOR_COOKIES, STAR_COOKIES, WIN_COOKIES, LAST_DOOR, LATE_DOOR_GEMS, countdownText, decorBlock, doorGiftText, doorStatus, refill } from '../lib/christmas';
  import { onMount } from 'svelte';

  const today = $derived.by(() => { void $now; void $settings; void $daily; void $xmasDate; return xmasDay(); });
  let got = $state<string | null>(null);
  const doors = Array.from({ length: LAST_DOOR }, (_, i) => i + 1);

  onMount(countdownShown);

  function open(day: number) {
    const g = openXmasDoor(day);
    if (g) got = `Lucka ${day}: 🍪 ${DOOR_COOKIES} och ${doorGiftText(g)}`;
  }
</script>

<Modal title="Julen i Skärgårdsbyn">
  {#if today > 0}
    <p class="sign">⏳ {countdownText(today)}</p>
  {:else}
    <p class="sign">Julmarknaden har stängt. Ditt pynt står kvar.</p>
  {/if}
  <p class="have">🍪 <strong>{$xmas.cookies}</strong> pepparkakor · 💎 {$purse.gems}</p>

  {#if today > 0}
    <h3>Adventskalendern</h3>
    <ol class="doors" aria-label="Adventskalenderns 24 luckor">
      {#each doors as d}
        {@const st = doorStatus($xmas, d, today)}
        <li>
          {#if st === 'opened'}
            <span class="door opened" aria-label={`Lucka ${d}, öppnad`}>✓</span>
          {:else if st === 'today'}
            <button class="door today" onclick={() => open(d)} aria-label={`Öppna dagens lucka, ${d}`}>{d}</button>
          {:else if st === 'missed'}
            <button class="door missed" onclick={() => open(d)} aria-label={`Öppna missad lucka ${d} för ${LATE_DOOR_GEMS} ädelstenar`}>{d}<small>💎 {LATE_DOOR_GEMS}</small></button>
          {:else}
            <span class="door later" aria-label={`Lucka ${d}, öppnas den ${d} december`}>{d}</span>
          {/if}
        </li>
      {/each}
    </ol>
    {#if got}<p class="big" aria-live="polite">{got}</p>{/if}
    <p class="fine">En lucka om dagen. Missade luckor öppnas för 💎 {LATE_DOOR_GEMS}. Lucka 24 har stjärnan till granens topp.</p>
  {/if}

  <h3>Julpynt till byn</h3>
  <ul class="decor">
    {#each DECOR as d (d.id)}
      {@const block = decorBlock($xmas, d.id, today)}
      <li>
        <span><strong>{d.name}</strong>{#if d.id === 'tree' && $xmas.star && $xmas.decor.includes('tree')} ⭐{/if}<br /><span class="fine">🍪 {d.cookies}</span></span>
        {#if block === 'owned'}
          <span class="fine">Köpt ✓</span>
        {:else if block === 'closed'}
          <span class="fine">Stängt</span>
        {:else if block === 'cookies'}
          {@const r = refill(d.cookies - $xmas.cookies)}
          <button class="ghost" onclick={() => { if (refillFor(d.id)) buyXmasDecor(d.id); }}>Fyll på 🍪 {r.cookies} för 💎 {r.gems}</button>
        {:else}
          <button class="primary" onclick={() => buyXmasDecor(d.id)}>Köp</button>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="fine">Vunna utmaningar ger {WIN_COOKIES} pepparkakor och {STAR_COOKIES} till per stjärna.</p>
  <div class="buttons"><button class="ghost" onclick={() => xmasOpen.set(false)}>Stäng</button></div>
</Modal>

<style>
  h3 { margin: 0; font-size: 1.05rem; }
  .sign { background: var(--falu); color: #fff; border-radius: 8px; padding: 8px 10px; font-weight: 700; text-align: center; }
  .have { text-align: center; }
  .doors { background: url('/art/village/xmas/kalender.webp') center 62% / cover; border-radius: 10px; padding: 8px !important;
    list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .door { display: grid; place-items: center; width: 100%; min-height: 48px; border: 2px solid var(--line); border-radius: 8px; background: rgb(255 248 236 / .88); color: var(--ink); font: inherit; font-weight: 800; padding: 2px; }
  .door small { font-size: .65rem; font-weight: 600; }
  .door.opened { background: rgb(255 248 236 / .25); border-color: rgb(255 255 255 / .6); color: #fff; }
  .door.later { background: rgb(255 248 236 / .7); border-style: dashed; }
  .door.today { border-color: var(--falu); box-shadow: 0 0 0 2px var(--falu); }
  .door.missed { border-color: var(--gold); }
  .decor { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .decor li { display: flex; justify-content: space-between; align-items: center; gap: 10px; border-bottom: 1px solid var(--line); padding: 4px 0; }
  .decor button { flex: none; }
  .big { font-weight: 800; }
  .fine { color: var(--muted); font-size: .9rem; }
</style>
