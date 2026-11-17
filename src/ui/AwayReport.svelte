<script lang="ts">
  /** Shown once on return when the village was attacked while the player was away. */
  import Modal from './Modal.svelte';
  import { awayReport } from '../lib/state/game';
  const r = $derived($awayReport!);
</script>

<Modal title="Medan du var borta">
  {#if r.result === 'lost'}
    <p>Grannbyn kom efter {r.hours} timmar. Ni hade inte nog med försvar.</p>
    <p class="big">−{r.goldLost} guld{r.damaged ? `, ${r.damaged} skadades` : ''}</p>
    <p>Fler soldater och ett vakttorn hjälper nästa gång.</p>
  {:else if r.result === 'shielded'}
    <p>Grannbyn kom, men skölden höll dem borta.</p>
  {:else}
    <p>Grannbyn kom, men era soldater försvarade byn.</p>
  {/if}
  <div class="buttons"><button class="primary" onclick={() => awayReport.set(null)}>Okej</button></div>
</Modal>

<style>
  .big { font-size: 1.2rem; font-weight: 800; color: var(--falu); }
</style>
