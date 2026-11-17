<script lang="ts">
  /** The offer picked from what the player bought before (step 8). Paid with the pretend kronor. */
  import Modal from './Modal.svelte';
  import { buyPersonalOffer, dismissPersonalOffer, offerShown } from '../lib/state/expansion';
  import { purse } from '../lib/state/game';
  import { formatKr } from '../lib/economy/wallet';
</script>

{#if $offerShown}
  <Modal title="Bara för dig">
    <p class="big">💎 {$offerShown.gems} för {formatKr($offerShown.kronor)}</p>
    <p>{$offerShown.text}</p>
    <div class="buttons">
      <button class="primary" onclick={buyPersonalOffer}>Köp</button>
      <button class="ghost" onclick={dismissPersonalOffer}>Nej tack</button>
    </div>
    <p class="fine">I plånboken: {formatKr($purse.kronor)}.</p>
  </Modal>
{/if}

<style>
  .big { font-size: 1.4rem; font-weight: 800; }
  .fine { color: var(--muted); font-size: .9rem; }
</style>
