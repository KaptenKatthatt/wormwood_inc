<script lang="ts">
  import Modal from './Modal.svelte';
  import { buyPack, logHook, purse, shopOpen } from '../lib/state/game';
  import { GEM_PACKS } from '../lib/economy/shop';
  import { formatKr } from '../lib/economy/wallet';

  const reason = $shopOpen?.reason ?? 'hud';
  logHook('gemPacks', { reason }, 'shown');

  function close() {
    shopOpen.set(null);
  }
</script>

<Modal title="Butiken">
  <p>Du har <strong>{$purse.gems} ädelstenar</strong> och <strong>{formatKr($purse.kronor)}</strong> i testplånboken.</p>
  <ul class="packs">
    {#each GEM_PACKS as pack (pack.id)}
      <li class:tagged={pack.tag}>
        {#if pack.tag}<span class="tag">{pack.tag}</span>{/if}
        <span class="gems">💎 {pack.gems}</span>
        <button class="primary" onclick={() => buyPack(pack.id, reason) && close()}>{formatKr(pack.kronor)}</button>
      </li>
    {/each}
  </ul>
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
</style>
