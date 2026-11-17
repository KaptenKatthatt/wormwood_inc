<script lang="ts">
  /** A note from the neighbours: lives they sent, or a record they beat (steps 6 and 9; the neighbours are made up). */
  import Modal from './Modal.svelte';
  import { friendNote, giftBack } from '../lib/state/expansion';
  import { logHook } from '../lib/state/game';

  function later() {
    logHook('fakeGifts', { giftBack: false }, 'no');
    friendNote.set(null);
  }
</script>

{#if $friendNote}
  <Modal title="Från grannarna">
    <p class="big">{$friendNote.text}</p>
    <div class="buttons">
      <button class="primary" onclick={giftBack}>Tacka och skicka en gåva tillbaka</button>
      <button class="ghost" onclick={later}>Senare</button>
    </div>
  </Modal>
{/if}

<style>
  .big { font-size: 1.15rem; font-weight: 700; }
</style>
