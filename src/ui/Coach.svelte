<script lang="ts">
  /**
   * Draws the introduction: a ring around the thing to look at and a speech
   * bubble with the text. The rest of the screen stays usable, so the player
   * does each step for real. Screen readers hear each step as it comes.
   */
  import { tick } from 'svelte';
  import { TUT_STEPS, endTutorial, nextTutStep, tutorial } from '../lib/tutorial';

  const step = $derived($tutorial.index === null ? null : TUT_STEPS[$tutorial.index]);
  let rect = $state<DOMRect | null>(null);
  /** The dialog the target sits in, if any (the button "Till byn" in "Utmaningen klarad!"). */
  let host = $state<DOMRect | null>(null);
  /** Where the two hinted tiles are on the screen (sent by the board), for the first step. */
  let spot = $state<{ left: number; top: number; width: number; height: number } | null>(null);
  let nextBtn = $state<HTMLButtonElement>();
  let frame = 0;

  function targetEl(): Element | null {
    const sel = step?.target?.split('|').map((t) => `[data-tut="${t}"]`).join(', ');
    return sel ? document.querySelector(sel) : null;
  }

  function track() {
    const el = targetEl();
    const r = el?.getBoundingClientRect() ?? null;
    rect = r && r.width > 0 ? r : null;
    const h = rect ? el?.closest('[role="dialog"]')?.getBoundingClientRect() ?? null : null;
    host = h && h.width > 0 ? h : null;
    frame = requestAnimationFrame(track);
  }

  $effect(() => {
    if (!step) return;
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!step?.hint) { spot = null; return; }
    const on = (e: Event) => { spot = (e as CustomEvent).detail ?? null; };
    window.addEventListener('tut-hint', on);
    return () => window.removeEventListener('tut-hint', on);
  });
  const lit = $derived(step?.hint && spot ? spot : null);
  // The first sign sits in the middle of the screen with everything but the two tiles dimmed
  // (Jonas, 2026-11-19); it moves just above or below the tiles if it would cover them.
  const BUBBLE_H = 150;
  const midStyle = $derived.by(() => {
    if (!lit) return '';
    const h = window.innerHeight;
    const top = h / 2 - BUBBLE_H / 2;
    const covers = lit.top - 16 < top + BUBBLE_H && lit.top + lit.height + 16 > top;
    if (!covers) return `top: ${top}px;`;
    return lit.top - 16 - BUBBLE_H > 70 ? `bottom: ${h - lit.top + 16}px;` : `top: ${lit.top + lit.height + 16}px;`;
  });

  // Bring the target into view when a step starts (Avsluta sits far down in the village).
  $effect(() => {
    if (!step) return;
    void tick().then(() => {
      const el = targetEl();
      const r = el?.getBoundingClientRect();
      if (el && r && (r.top < 60 || r.bottom > window.innerHeight - 80)) {
        const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
      }
    });
  });

  $effect(() => {
    if (step && !step.waitFor) void tick().then(() => nextBtn?.focus());
  });

  // Put the bubble below the target when it is in the top half, otherwise above it.
  // A target inside a dialog gets the bubble above the whole dialog (below it when there is no
  // room above), so the two never overlap (Jonas, 2026-11-19); the dialog's own backdrop dims the rest.
  const below = $derived(host ? host.top < 170 : !rect || rect.top + rect.height / 2 < window.innerHeight / 2);
  const bubbleStyle = $derived(
    host
      ? below
        ? `top: ${Math.min(window.innerHeight - 170, host.bottom + 14)}px;`
        : `bottom: ${window.innerHeight - host.top + 14}px;`
      : !rect
        ? 'top: 50%; transform: translateY(-50%);'
        : below
          ? `top: ${Math.min(window.innerHeight - 220, rect.bottom + 14)}px;`
          : `bottom: ${Math.min(window.innerHeight - 220, window.innerHeight - rect.top + 14)}px;`,
  );
  const big = $derived(rect !== null && rect.height > window.innerHeight * 0.4);
</script>

{#if step && !step.silent}
  {#if lit}
    <div class="ring dim" style:top={`${lit.top - 4}px`} style:left={`${lit.left - 4}px`} style:width={`${lit.width + 8}px`} style:height={`${lit.height + 8}px`} aria-hidden="true"></div>
  {:else if rect}
    <div class="ring" class:big class:lit={host !== null} style:top={`${rect.top - 6}px`} style:left={`${rect.left - 6}px`} style:width={`${rect.width + 12}px`} style:height={`${rect.height + 12}px`} aria-hidden="true"></div>
  {/if}
  <div class="bubble" class:below class:floating={big && !lit} style={lit ? midStyle : big ? '' : bubbleStyle} role="dialog" aria-modal="false" aria-labelledby="coach-title" aria-describedby="coach-text">
    <h2 id="coach-title">{step.title}</h2>
    <p id="coach-text" aria-live="polite">{step.text}</p>
    <div class="row">
      {#if !step.waitFor}
        <button class="primary" bind:this={nextBtn} onclick={nextTutStep}>{($tutorial.index ?? 0) === TUT_STEPS.length - 1 ? 'Börja spela' : 'Nästa'}</button>
      {/if}
      <button class="skip" onclick={() => endTutorial(true)}>Hoppa över introduktionen</button>
    </div>
  </div>
{/if}

<style>
  .ring { position: fixed; z-index: 15; border: 4px solid var(--gold); border-radius: 12px; pointer-events: none;
    box-shadow: 0 0 0 9999px rgb(0 0 0 / .35); animation: pulse 1.4s ease-in-out infinite; }
  .ring.big, .ring.lit { box-shadow: none; }
  .ring.dim { box-shadow: 0 0 0 9999px rgb(0 0 0 / .55); }
  @keyframes pulse { 50% { border-color: #fff6ee; } }
  .bubble { position: fixed; left: 12px; right: 12px; z-index: 16; margin: 0 auto; max-width: 440px; background: #fffaf0; color: #1f1a17;
    border-radius: 14px; padding: 14px 16px; box-shadow: 0 8px 24px rgb(0 0 0 / .35); display: grid; gap: 6px; }
  /* over the boosters at the bottom, so the goal card at the top stays readable */
  .bubble.floating { top: auto; bottom: calc(64px + env(safe-area-inset-bottom)); }
  /* Over the board the bubble sits at the top, above the tiles, and stays small. */
  .bubble.floating { padding: 10px 14px; gap: 4px; }
  .bubble.floating .row { margin-top: 0; }
  h2 { margin: 0; font-size: 1.15rem; }
  p { margin: 0; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 4px; }
  .skip { background: none; border: 0; color: #5c524b; text-decoration: underline; font-weight: 500; min-height: 44px; padding: 4px 6px; }
</style>
