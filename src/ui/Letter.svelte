<script lang="ts">
  import { letter } from '../lib/state/game';
  import { ADVISOR_SIGNATURE } from '../lib/voices';
</script>

{#if $letter}
  <div class="backdrop">
    <div class="paper" role="dialog" aria-modal="true" aria-labelledby="letter-title">
      <p class="salute" id="letter-title">Kära du,</p>
      <p>{$letter.text}</p>
      <p class="sign">{ADVISOR_SIGNATURE}</p>
      <button class="primary" onclick={() => letter.set(null)}>Tack</button>
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .45); display: grid; place-items: center; padding: 16px; z-index: 20; }
  .paper { width: min(380px, 100%); background: #fbf4e6; color: #2b2420; border-radius: 4px; padding: 24px 22px 18px; box-shadow: 0 10px 30px rgb(0 0 0 / .35); display: grid; gap: 12px;
    font-family: Georgia, "Times New Roman", serif; font-size: 1.1rem; line-height: 1.5; transform: rotate(-0.6deg); }
  p { margin: 0; }
  .salute { font-style: italic; }
  .sign { font-style: italic; text-align: right; }
  button { justify-self: end; font-family: system-ui, sans-serif; }
</style>
