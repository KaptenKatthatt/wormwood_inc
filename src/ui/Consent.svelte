<script lang="ts">
  import { settings } from '../lib/state/game';
  import { startTutorial, tutorialDone } from '../lib/tutorial';
  import { flush } from '../lib/log/logger';

  function answer(yes: boolean) {
    settings.update((s) => ({ ...s, logging: yes }));
    if (yes) flush(false);
    if (!tutorialDone()) startTutorial();
  }
</script>

<div class="backdrop">
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="consent-title">
    <h2 id="consent-title">Hej och välkommen!</h2>
    <p>Det här spelet är en del av ett examensarbete. Får det skicka anonyma uppgifter om hur du spelar, till exempel vad du trycker på och när, till den som gör testet?</p>
    <p class="fine">Inget namn, ingen e-post. Du kan ändra dig under Inställningar.</p>
    <div class="buttons">
      <button class="primary" onclick={() => answer(true)}>Ja, det går bra</button>
      <button class="ghost" onclick={() => answer(false)}>Nej tack</button>
    </div>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: center; padding: 16px; z-index: 10; }
  .card { background: var(--panel); color: var(--ink); border-radius: 8px; padding: 20px; max-width: 420px; display: grid; gap: 10px; }
  h2 { margin: 0; }
  p { margin: 0; }
  .fine { color: var(--muted); font-size: .9rem; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { flex: 1 1 140px; }
</style>
