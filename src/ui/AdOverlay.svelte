<script lang="ts">
  /** A pretend rewarded ad (step 6): five seconds of a made-up product, then the reward. */
  import { adClosed, adOpen, adWatched } from '../lib/state/expansion';
  import { AD_SECONDS, AD_TEXTS } from '../lib/expansion/social';

  let left = $state(AD_SECONDS);
  const text = AD_TEXTS[Math.floor(Math.random() * AD_TEXTS.length)];
  $effect(() => {
    const t = setInterval(() => { left = Math.max(0, left - 1); }, 1000);
    return () => clearInterval(t);
  });
</script>

<div class="ad" role="dialog" aria-modal="true" aria-label="Reklam">
  <span class="tag">Reklam</span>
  <p class="text">{text}</p>
  <p class="fine" aria-live="polite">{left > 0 ? `Belöningen kommer om ${left} s` : 'Klart!'}</p>
  {#if left > 0}
    <button class="ghost close" onclick={adClosed} aria-label="Stäng reklamen utan belöning">✕</button>
  {:else}
    <button class="primary" onclick={adWatched}>Hämta {$adOpen?.reward === 'life' ? 'livet' : 'guldet'}</button>
  {/if}
</div>

<style>
  .ad { position: fixed; inset: 0; z-index: 12; background: linear-gradient(160deg, #1f3a5a, #2c6fa6); color: #fff; display: grid; place-content: center; justify-items: center; gap: 16px; padding: 24px; text-align: center; }
  .tag { position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 12px; background: #fff; color: #1f3a5a; border-radius: 4px; padding: 0 6px; font-weight: 800; font-size: .8rem; }
  .text { font-size: 1.4rem; font-weight: 800; max-width: 22ch; margin: 0; }
  .fine { margin: 0; opacity: .85; }
  .close { position: absolute; top: calc(8px + env(safe-area-inset-top)); right: 8px; min-width: 44px; min-height: 44px; color: #fff; border-color: #fff8; }
</style>
