<script lang="ts">
  import Modal from './Modal.svelte';
  import { buyOffer, dismissOffer, now, purse, stairs } from '../lib/state/game';
  import { OFFER } from '../lib/staircase';
  import { formatDuration } from '../lib/time/clock';

  const left = $derived($stairs.offer ? ($stairs.offer.endsAt - $now) : 0);
</script>

<Modal title="Startpaket">
  <p class="deal">🪙 {OFFER.gold.toLocaleString('sv-SE')} guld och fulla liv ❤️</p>
  <p class="price">Bara <strong>💎 {OFFER.gems}</strong> <s aria-label={`förr ${OFFER.was}`}>💎 {OFFER.was}</s></p>
  <p class="clock" aria-live="off">Försvinner om <strong>{formatDuration(left)}</strong></p>
  <div class="buttons">
    <button class="primary" onclick={buyOffer}>Köp för 💎 {OFFER.gems}</button>
    <button class="ghost" onclick={dismissOffer}>Inte nu</button>
  </div>
  <p class="fine">Du har 💎 {$purse.gems}.</p>
</Modal>

<style>
  .deal { font-size: 1.4rem; font-weight: 800; }
  .price { font-size: 1.1rem; }
  .clock { color: var(--falu); font-variant-numeric: tabular-nums; }
  .fine { color: var(--muted); font-size: .9rem; }
</style>
