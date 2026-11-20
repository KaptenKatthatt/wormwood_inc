<script lang="ts">
  import Modal from './Modal.svelte';
  import { buyPack, logHook, purse, shopOpen } from '../lib/state/game';
  import { GEM_PACKS } from '../lib/economy/shop';
  import { formatKr } from '../lib/economy/wallet';
  import { askTopup, redeemTopup } from '../lib/state/topup';

  const reason = $shopOpen?.reason ?? 'hud';
  logHook('gemPacks', { reason }, 'shown');

  function close() {
    shopOpen.set(null);
  }

  // "Plånboken är tom" (Jonas, 2026-11-20): when the wallet cannot pay for a pack.
  const cheapest = Math.min(...GEM_PACKS.map((p) => p.kronor));
  let short = $state(false);
  const empty = $derived(short || $purse.kronor < cheapest);
  function buy(id: string, kronor: number) {
    if (buyPack(id, reason)) close();
    else if ($purse.kronor < kronor) short = true;
  }
  let code = $state('');
  let codeStatus = $state('');
  async function redeem(e: SubmitEvent) {
    e.preventDefault();
    if (!code.trim()) { codeStatus = 'Skriv koden från Jonas mejl.'; return; }
    codeStatus = 'Kollar koden …';
    const r = await redeemTopup(code);
    codeStatus = r === 'ok' ? '' : r === 'unknown' ? 'Koden stämmer inte. Kolla att du skrev av den rätt.' : r === 'used' ? 'Den koden är redan använd.' : 'Det gick inte att nå servern. Försök igen om en stund.';
    if (r === 'ok') { code = ''; short = false; }
  }
</script>

<Modal title="Butiken" onClose={close}>
  <p>Du har <strong>{$purse.gems} ädelstenar</strong> och <strong>{formatKr($purse.kronor)}</strong> i testplånboken.</p>
  <ul class="packs">
    {#each GEM_PACKS as pack (pack.id)}
      <li class:tagged={pack.tag}>
        {#if pack.tag}<span class="tag">{pack.tag}</span>{/if}
        <span class="gems">💎 {pack.gems}</span>
        <button class="primary" onclick={() => buy(pack.id, pack.kronor)}>{formatKr(pack.kronor)}</button>
      </li>
    {/each}
  </ul>
  {#if empty}
    <section class="empty" aria-labelledby="empty-title">
      <h3 id="empty-title">Plånboken är tom</h3>
      <p>Jonas kan fylla på den. Tryck på knappen så öppnas ett färdigt mejl med din testkod. Du får en kod tillbaka som du skriver in här.</p>
      <button class="primary" onclick={() => askTopup('shop')}>Be om påfyllning</button>
      <form class="redeem" onsubmit={redeem}>
        <label for="topup-code">Kod från Jonas</label>
        <div class="row">
          <input id="topup-code" bind:value={code} placeholder="FYLL-…" autocomplete="off" autocapitalize="characters" spellcheck="false" />
          <button class="ghost" type="submit">Lös in</button>
        </div>
        {#if codeStatus}<p class="status" aria-live="polite">{codeStatus}</p>{/if}
      </form>
    </section>
  {/if}
  <p class="fine">Låtsaspengar från testplånboken. Inga riktiga pengar dras.</p>
  <div class="buttons"><button class="ghost" onclick={close}>Stäng</button></div>
</Modal>

<style>
  .packs { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 2px solid var(--line); border-radius: 8px; padding: 10px 12px; }
  li.tagged { border-color: var(--gold); }
  .tag { position: absolute; top: -10px; left: 10px; background: var(--gold); color: #1f1a17; font-size: .8rem; font-weight: 800; padding: 1px 8px; border-radius: 999px; }
  .gems { font-size: 1.2rem; font-weight: 800; }
  .fine { color: var(--muted); font-size: .9rem; }
  .empty { display: grid; gap: 10px; border: 2px dashed var(--line); border-radius: 8px; padding: 12px; }
  .empty h3 { margin: 0; font-size: 1.1rem; }
  .empty p { margin: 0; }
  .redeem { display: grid; gap: 6px; }
  .redeem label { font-weight: 700; }
  .redeem .row { display: flex; gap: 8px; }
  .redeem input { flex: 1; min-width: 0; font-size: 1.1rem; letter-spacing: .06em; text-transform: uppercase; padding: 8px 10px; border: 2px solid var(--line); border-radius: 8px; }
  .status { color: var(--falu); font-size: .9rem; }
</style>
