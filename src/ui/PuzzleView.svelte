<script lang="ts">
  import GameCanvas from '../game/GameCanvas.svelte';
  import { lives, toast, useLife } from '../lib/state/game';

  function play() {
    if (useLife()) toast('Nivån startar (platshållare)');
    else toast('Slut på liv. Vänta eller köp fler.');
  }
</script>

<section class="view">
  <div class="canvas"><GameCanvas scene="puzzle" label="Spelplan med sju gånger sju brickor. Tryck på två grannar för att byta plats." /></div>
  <div class="bar">
    <button class="primary" onclick={play} disabled={$lives.count === 0}>Spela nivå (kostar ett liv)</button>
  </div>
</section>

<style>
  .view { display: flex; flex-direction: column; height: 100%; }
  .canvas { position: relative; flex: 1; min-height: 0; }
  .bar { padding: 12px 16px; display: flex; gap: 8px; background: var(--panel); }
  .bar button { flex: 1; }
</style>
