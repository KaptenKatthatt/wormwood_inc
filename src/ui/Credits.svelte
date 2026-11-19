<script lang="ts">
  // Everyone and everything behind the game, in one place (Jonas, 2026-11-19):
  // no credit or license text anywhere else in the app. Sources: public/audio/CREDITS.md
  // and public/fonts/OFL.txt.
  import Modal from './Modal.svelte';
  let { onClose }: { onClose: () => void } = $props();
</script>

<Modal title="Medverkande">
  <div class="credits">
    <h3>Spelet</h3>
    <p>Idé, design och ledning: Jonas Olson. Spelet är ett examensarbete från 2026.</p>
    <p>Kod, musik och ljud är gjorda med Claude från Anthropic.</p>

    <h3>Musik</h3>
    <p>"Solsken", "Udden", "Brickor", "Rapsfält", "Hammarsmeden", "Fiskeläget" och "Julmarknad" är gjorda för spelet.</p>
    <p>"Gem Waltz" av Haley Halcyon, CC BY 4.0, från OpenGameArt. Därifrån kommer också ljuden när en utmaning är klarad eller förlorad.</p>
    <p>Julmelodierna är gamla och fria att använda, i egna arrangemang: "Jingle Bells" av James Lord Pierpont (1857), "Deck the Halls", "We Wish You a Merry Christmas", "Staffansvisan" och "O Tannenbaum".</p>

    <h3>Ljud</h3>
    <p>De flesta ljuden är gjorda för spelet. Övriga kommer från Kenney, rubberduck, bart, RandomMind, jasinski och Rango Mango (CC0), via OpenGameArt.</p>
    <p>Instrumenten kommer från ljudbanken FluidR3_GM av Frank Wen (MIT).</p>
    <p>Reklamfilmernas röster, musik och ljud är AI-genererade med ElevenLabs. Ingen människa har läst in rösterna.</p>

    <h3>Bilder</h3>
    <p>Bilderna är AI-genererade med Pollinations och bearbetade för spelet.</p>

    <h3>Typsnitt</h3>
    <p>Baloo 2 av The Baloo 2 Project Authors, SIL Open Font License 1.1.</p>

    <h3>Teknik</h3>
    <p>Byggt med Phaser, Svelte och Vite (MIT).</p>
  </div>
  <div class="buttons"><button class="primary" onclick={onClose}>Stäng</button></div>
</Modal>

<style>
  .credits { display: grid; gap: 8px; }
  h3 { margin: 8px 0 0; font-size: 1.05rem; }
  h3:first-child { margin-top: 0; }
</style>
