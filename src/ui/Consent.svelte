<script lang="ts">
  import { settings } from '../lib/state/game';
  import { startTutorial, tutorialDone } from '../lib/tutorial';
  import { flush } from '../lib/log/logger';
  import { contactsOpen } from '../lib/state/reach';

  function answer(yes: boolean) {
    settings.update((s) => ({ ...s, logging: yes }));
    if (yes) flush(false);
    // The voluntary question about an e-mail address comes next and starts the introduction itself.
    if (!contactsOpen() && !tutorialDone()) startTutorial();
  }
</script>

<div class="backdrop">
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="consent-title">
    <h2 id="consent-title">Hej och välkommen!</h2>
    <p>Det här spelet är en del av ett examensarbete om mobilspel. Får spelet spara vad du gör i det, till exempel vilka banor du spelar, vad du köper för låtsaspengar och när du spelar, och skicka det till Jonas Olson?</p>
    <ul class="fine">
      <li>Inget namn. Du får en testkod som bara Jonas kan koppla till dig.</li>
      <li>Uppgifterna används bara i examensarbetet och raderas senast 1 mars 2027.</li>
      <li>Du kan sluta när du vill och be Jonas radera allt, utan att säga varför.</li>
    </ul>
    <div class="buttons">
      <button class="primary" onclick={() => answer(true)}>Ja, det går bra</button>
      <button class="ghost" onclick={() => answer(false)}>Nej tack</button>
    </div>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: start center; padding: var(--note-top) 16px 16px; z-index: 10; }
  .card { background: var(--panel); color: var(--ink); border-radius: 8px; padding: 20px; max-width: 420px; display: grid; gap: 10px; }
  h2 { margin: 0; }
  p { margin: 0; }
  ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; }
  .fine { color: var(--muted); font-size: .9rem; }
  .buttons { display: flex; flex-wrap: wrap; gap: 8px; }
  .buttons button { flex: 1 1 140px; }
</style>
