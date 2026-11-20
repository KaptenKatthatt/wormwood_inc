<script lang="ts">
  /**
   * "Trött på reklam?" (Jonas, 2026-11-20): from step 8, after the third ad
   * between challenges in a day. A one-off purchase from the test wallet that
   * stops those ads; the voluntary films with a reward stay. "Inte nu" brings
   * it back the next day.
   */
  import Modal from './Modal.svelte';
  import { buyRemoveAds, declineRemoveAds } from '../lib/state/expansion';
  import { REMOVE_ADS_KRONOR } from '../lib/expansion/interstitial';
  import { formatKr } from '../lib/economy/wallet';
  import { purse } from '../lib/state/game';
</script>

<Modal title="Trött på reklam?" onClose={declineRemoveAds}>
  <p>Slipp filmerna som kommer mellan utmaningarna, för alltid. Filmerna du själv väljer att titta på för att få liv eller guld finns kvar.</p>
  <p class="fine">Du har {formatKr($purse.kronor)} i testplånboken.</p>
  <div class="buttons">
    <button class="primary" onclick={buyRemoveAds}>Ta bort reklam <span class="price">{formatKr(REMOVE_ADS_KRONOR)}</span></button>
    <button class="ghost" onclick={declineRemoveAds}>Inte nu</button>
  </div>
</Modal>

<style>
  p { margin: 0; }
  .fine { color: var(--muted); font-size: .9rem; }
  .buttons { display: grid; gap: 8px; }
  .price { white-space: nowrap; }
</style>
