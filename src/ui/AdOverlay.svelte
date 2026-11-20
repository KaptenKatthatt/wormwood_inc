<script lang="ts">
  /**
   * A pretend rewarded ad film (step 6): ten seconds of a made-up product in
   * three scenes, with a bar that runs from one side of the screen to the
   * other while it plays (Jonas, 2026-11-19), then the reward.
   */
  import { adClosed, adGroup, adOpen, adWatched } from '../lib/state/expansion';
  import { AD_SECONDS, nextAd } from '../lib/expansion/social';
  import { get } from 'svelte/store';
  import { log } from '../lib/log/logger';
  import { playAd } from '../lib/audio/sound';

  // The film was picked when the ad was offered, from the player's group.
  const ad = get(adOpen)?.ad ?? nextAd(adGroup());
  /** Seconds played. Driven by the clock, so the bar also runs in calm mode. */
  let t = $state(0);
  $effect(() => {
    const start = performance.now();
    let frame = 0;
    const loop = () => {
      t = Math.min(AD_SECONDS, (performance.now() - start) / 1000);
      if (t < AD_SECONDS) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    log('ad_shown', { ad: ad.id, adGroup: adGroup() });
    const stopSound = playAd(ad.id);
    return () => { cancelAnimationFrame(frame); stopSound(); };
  });
  const left = $derived(Math.ceil(AD_SECONDS - t));
  const done = $derived(t >= AD_SECONDS);
  const scene = $derived(Math.min(2, Math.floor(t / (AD_SECONDS / 3))));
</script>

<div class="ad" class:serif={ad.serif} class:loud={ad.loud} role="dialog" aria-modal="true" aria-label={`Reklam för ${ad.brand}`} style:--accent={ad.accent} style:--ink={ad.ink}>
  <img class="film" src={`/art/ads/${ad.id}.webp`} alt="" style:animation-duration={`${AD_SECONDS}s`} />
  <div class="veil"></div>
  <div class="bar" role="progressbar" aria-label="Filmen" aria-valuemin="0" aria-valuemax={AD_SECONDS} aria-valuenow={Math.floor(t)}>
    <span style:width={`${(t / AD_SECONDS) * 100}%`}></span>
  </div>
  <div class="chrome">
    <span class="tag">Reklam</span>
    {#if !done}
      <span class="count" aria-live="off">{left}</span>
      <button class="close-x close" data-no-click-sound onclick={() => adClosed(t)} aria-label="Stäng reklamen utan belöning">✕</button>
    {/if}
  </div>
  <div class="mark">
    <span class="kicker">{ad.kicker}</span>
    <span class="brand">{ad.brand}</span>
    <!-- The copy sits in the upper third under the name, where ad films put it; the picture's subject is in the lower half (Jonas, 2026-11-19). -->
    {#key scene}<p class="line">{ad.scenes[scene]}</p>{/key}
  </div>
  <div class="foot">
    {#if scene === 2}<span class="cta" aria-hidden="true">{ad.cta}</span>{/if}
    {#if ad.legal}<p class="legal">{ad.legal}</p>{/if}
    <p class="fine" aria-live="polite">{done ? 'Klart!' : `Belöningen kommer om ${left} s`}</p>
    {#if done}
      <button class="primary get" onclick={adWatched}>Hämta {$adOpen?.reward === 'life' ? 'livet' : 'guldet'}</button>
    {/if}
  </div>
</div>

<style>
  .ad { position: fixed; inset: 0; z-index: 12; background: #10202c; color: #fff; overflow: hidden; display: grid; grid-template-rows: auto auto 1fr auto; }
  .film { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; animation: drift linear both; transform-origin: 50% 60%; }
  @keyframes drift { from { transform: scale(1); } to { transform: scale(1.16) translateY(-2%); } }
  .veil { position: absolute; inset: 0; background: linear-gradient(to bottom, rgb(0 0 0 / .62), rgb(0 0 0 / .4) 30%, transparent 46%, transparent 62%, rgb(0 0 0 / .78)); }
  .bar, .chrome, .mark, .foot { position: relative; }
  .bar { height: 7px; margin-top: env(safe-area-inset-top); background: rgb(255 255 255 / .3); }
  .bar span { display: block; height: 100%; background: #fff; border-radius: 0 4px 4px 0; box-shadow: 0 0 8px rgb(255 255 255 / .8); }
  .chrome { display: flex; align-items: center; gap: 10px; padding: 8px 10px 0 12px; }
  .tag { background: #fff; color: #1f3a5a; border-radius: 4px; padding: 0 6px; font-weight: 800; font-size: .8rem; margin-right: auto; }
  .count { min-width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: rgb(0 0 0 / .45); font-weight: 800; font-variant-numeric: tabular-nums; }
  .close { background: rgb(0 0 0 / .45); color: #fff; border: 2px solid rgb(255 255 255 / .6); }
  .mark { align-self: start; justify-self: center; display: grid; justify-items: center; gap: 8px; margin-top: 3vh; padding: 0 16px; text-align: center; animation: drop .5s ease-out both; }
  @keyframes drop { from { transform: translateY(-18px) scale(.9); opacity: 0; } }
  .kicker { background: var(--accent); color: var(--ink); border-radius: 999px; padding: 0 12px; font-weight: 800; font-size: .85rem; letter-spacing: .08em; text-transform: uppercase; }
  .brand { font-size: clamp(2.6rem, 14vw, 4rem); font-weight: 800; line-height: 1.05; text-shadow: 0 3px 0 var(--accent), 0 6px 18px rgb(0 0 0 / .55); }
  .serif .brand { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; letter-spacing: .01em; text-shadow: 0 2px 14px rgb(0 0 0 / .7); }
  .foot { display: grid; justify-items: center; gap: 12px; padding: 0 20px calc(26px + env(safe-area-inset-bottom)); text-align: center; }
  .line { margin: 6px 0 0; font-size: 1.55rem; font-weight: 800; line-height: 1.2; max-width: 20ch; text-shadow: 0 2px 10px rgb(0 0 0 / .7); animation: rise .45s ease-out both; }
  .serif .line { font-family: Georgia, 'Times New Roman', serif; font-weight: 600; }
  @keyframes rise { from { transform: translateY(14px); opacity: 0; } }
  .cta { background: var(--accent); color: var(--ink); border: 2px solid rgb(255 255 255 / .85); border-radius: 999px; padding: 8px 22px; font-weight: 800; font-size: 1.1rem; animation: pulse 1s ease-in-out infinite alternate; }
  @keyframes pulse { to { transform: scale(1.07); } }
  /* The loud ads: the name shakes, the lines slam in and the button flashes. */
  .loud .brand { font-size: clamp(2rem, 11vw, 3.2rem); max-width: 94vw; text-transform: uppercase; font-style: italic; color: var(--accent); text-shadow: 0 3px 0 #000, 0 0 22px var(--accent); animation: shake .5s linear infinite; }
  .loud .line { font-size: 1.8rem; text-transform: uppercase; font-style: italic; animation: slam .3s cubic-bezier(.2, 2.2, .4, 1) both; }
  .loud .cta { font-size: 1.35rem; padding: 10px 28px; border-radius: 10px; border-color: #fff; animation: flash .35s steps(2, jump-none) infinite; }
  .loud .film { animation-name: thump; animation-timing-function: ease-in-out; }
  @keyframes shake { 0%, 100% { transform: rotate(-2deg) scale(1); } 50% { transform: rotate(2deg) scale(1.06); } }
  @keyframes slam { from { transform: scale(2.2); opacity: 0; } }
  @keyframes flash { from { filter: none; transform: scale(1); } to { filter: brightness(1.5) saturate(1.4); transform: scale(1.1); } }
  @keyframes thump { 0% { transform: scale(1); } 20% { transform: scale(1.12); } 40% { transform: scale(1.05); } 60% { transform: scale(1.18); } 80% { transform: scale(1.1); } 100% { transform: scale(1.24); } }
  @media (prefers-reduced-motion: reduce) { .loud .brand, .loud .cta, .loud .line { animation: none; } .loud .film { animation-name: drift; } }
  .legal { margin: 0; font-size: .7rem; opacity: .85; letter-spacing: .02em; }
  .fine { margin: 0; opacity: .9; font-size: .9rem; }
  .get { min-width: 220px; font-size: 1.15rem; box-shadow: 0 4px 0 rgb(0 0 0 / .4); }
</style>
