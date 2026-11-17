<script lang="ts">
  import { installPrompt, isIos, isStandalone } from '../lib/pwa/install';

  const standalone = isStandalone();
  const ios = isIos();

  async function install() {
    const p = $installPrompt;
    if (!p) return;
    await p.prompt();
    installPrompt.set(null);
  }
</script>

{#if standalone}
  <p>Spelet är installerat på hemskärmen.</p>
{:else if ios}
  <ol class="steps">
    <li>Öppna sidan i <strong>Safari</strong>.</li>
    <li>Tryck på <strong>Dela</strong> (rutan med pilen uppåt).</li>
    <li>Välj <strong>Lägg till på hemskärmen</strong> och tryck <strong>Lägg till</strong>.</li>
    <li>Starta spelet från ikonen. Först då kan det skicka notiser.</li>
  </ol>
{:else if $installPrompt}
  <button class="primary" onclick={install}>Installera på hemskärmen</button>
{:else}
  <p>Öppna webbläsarens meny och välj <strong>Installera app</strong> eller <strong>Lägg till på startskärmen</strong>.</p>
{/if}

<style>
  .steps { margin: 0; padding-left: 1.3em; display: grid; gap: 4px; }
</style>
