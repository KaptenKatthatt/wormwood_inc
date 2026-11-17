<script lang="ts">
  import Modal from './Modal.svelte';
  import { buyOffer, dismissOffer, now, purse, stairs } from '../lib/state/game';
  import { OFFER } from '../lib/staircase';
  import { formatDuration } from '../lib/time/clock';
  import { formatKr } from '../lib/economy/wallet';

  const left = $derived($stairs.offer ? ($stairs.offer.endsAt - $now) : 0);
</script>

<Modal title="Startpaket">
  <p class="deal">💎 {OFFER.gems} och 🪙 {OFFER.gold.toLocaleString('sv-SE')}</p>
  <p class="price">Bara <strong>{formatKr(OFFER.kronor)}</strong></p>
  <p class="clock" aria-live="off">Försvinner om <strong>{formatDuration(left)}</strong></p>
  <div class="buttons">
    <button class="primary" onclick={buyOffer}>Köp för {formatKr(OFFER.kronor)}</button>
    <button class="ghost" onclick={dismissOffer}>Inte nu</button>
  </div>
  <p class="fine">Testplånboken: {formatKr($purse.kronor)}.</p>
</Modal>

<style>
  .deal { font-size: 1.4rem; font-weight: 800; }
  .price { font-size: 1.1rem; }
  .clock { color: var(--falu); font-variant-numeric: tabular-nums; }
  .fine { color: var(--muted); font-size: .9rem; }
</style>
