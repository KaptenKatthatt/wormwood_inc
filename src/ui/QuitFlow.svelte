<script lang="ts">
  import Modal from './Modal.svelte';
  import { answerNag, quitFlow } from '../lib/state/game';
  import { LETTERS } from '../lib/voices';
  import { flush } from '../lib/log/logger';

  function close() {
    quitFlow.set(null);
    flush(false);
  }
</script>

{#if $quitFlow === 'nag'}
  <div class="backdrop">
    <div class="paper" role="dialog" aria-modal="true" aria-label="Meddelande" aria-describedby="nag-text">
      <p id="nag-text">{LETTERS.quit}</p>
      <div class="buttons">
        <button class="primary" onclick={() => answerNag(true)}>Stanna en stund till</button>
        <button class="ghost" onclick={() => answerNag(false)}>Lämna ändå</button>
      </div>
    </div>
  </div>
{:else if $quitFlow === 'thanks'}
  <Modal title="Tack för att du var med!">
    <p>Testomgången är sparad. Du får gärna spela vidare när du vill.</p>
    <div class="buttons"><button class="primary" onclick={close}>Stäng</button></div>
  </Modal>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .45); display: grid; place-items: start center; padding: var(--note-top) 16px 16px; z-index: 20; }
  .paper { width: min(380px, 100%); background: #fbf4e6; color: #2b2420; border-radius: 4px; padding: 24px 22px 18px; box-shadow: 0 10px 30px rgb(0 0 0 / .35); display: grid; gap: 12px; font-family: Georgia, serif; font-size: 1.1rem; }
  .paper p { margin: 0; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; font-family: system-ui, sans-serif; }
  .buttons button { flex: 1 1 140px; }
</style>
