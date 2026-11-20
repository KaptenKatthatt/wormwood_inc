<script lang="ts">
  /**
   * Draws the introduction: a ring around the thing to look at and a speech
   * bubble with the text. The rest of the screen stays usable, so the player
   * does each step for real. Screen readers hear each step as it comes.
   */
  import { tick } from 'svelte';
  import { TUT_STEPS, endTutorial, nextTutStep, tutText, tutorial } from '../lib/tutorial';

  const step = $derived($tutorial.index === null ? null : TUT_STEPS[$tutorial.index]);
  let rect = $state<DOMRect | null>(null);
  /** The dialog the target sits in, if any (the button "Till byn" in "Utmaningen klarad!"). */
  let host = $state<DOMRect | null>(null);
  /** Where the two hinted tiles are on the screen (sent by the board), for the first step. */
  let spot = $state<{ left: number; top: number; width: number; height: number } | null>(null);
  /** The target sits in a centred dialog (not a bottom sheet), which then makes room above itself. */
  let overModal = $state(false);
  let nextBtn = $state<HTMLButtonElement>();
  let frame = 0;

  function targetEl(): Element | null {
    const sel = step?.target?.split('|').map((t) => `[data-tut="${t}"]`).join(', ');
    return sel ? document.querySelector(sel) : null;
  }

  /**
   * Keeps the ring inside the list its target scrolls in (Jonas, 2026-11-19: scrolling the build
   * list sent the ring up over the heading). The ring is cut at the list's edge, like the row itself.
   */
  let clip = $state('');
  function clipOf(el: Element, r: DOMRect): string {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if (o !== 'auto' && o !== 'scroll') continue;
      const b = p.getBoundingClientRect();
      // the ring is 6 px wider than its target on every side
      const top = Math.max(0, b.top - (r.top - 6)), bottom = Math.max(0, r.bottom + 6 - b.bottom);
      if (top === 0 && bottom === 0) return '';
      return `clip-path: inset(${top}px 0 ${bottom}px 0);`;
    }
    return '';
  }

  function track() {
    const el = targetEl();
    const r = el?.getBoundingClientRect() ?? null;
    rect = r && r.width > 0 ? r : null;
    const h = rect ? el?.closest('[role="dialog"]')?.getBoundingClientRect() ?? null : null;
    host = h && h.width > 0 ? h : null;
    overModal = host !== null && el?.closest('.backdrop') != null;
    clip = rect && el ? clipOf(el, rect) : '';
    frame = requestAnimationFrame(track);
  }

  $effect(() => {
    if (!step) return;
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!step?.hint) { spot = null; return; }
    // Between moves the board has no hint; the sign stays where it was until the next one comes.
    const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d) spot = d; };
    window.addEventListener('tut-hint', on);
    return () => window.removeEventListener('tut-hint', on);
  });
  // The first sign goes away at a touch anywhere (Jonas, 2026-11-19): the board lights up again
  // and the frame and the hand stay on the two tiles until the move is made.
  let dismissed = $state(false);
  $effect(() => {
    if (step?.id !== 'swap') { dismissed = false; return; }
    const on = (e: Event) => { if (!(e.target as Element | null)?.closest?.('.bubble')) dismissed = true; };
    window.addEventListener('pointerdown', on, true);
    return () => window.removeEventListener('pointerdown', on, true);
  });
  const lit = $derived(step?.hint && spot ? spot : null);
  const dim = $derived(step?.id === 'swap');
  // The practice sign is small and keeps one place, just above the board (Jonas, 2026-11-19),
  // so it never covers the tiles and does not jump about between moves.
  const practice = $derived(step?.repeat !== undefined);
  const practiceStyle = $derived(rect ? `bottom: ${window.innerHeight - rect.top + 6}px;` : 'top: 180px;');
  // Bring the target into view when a step starts (some targets sit far down in the village).
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

  // Every sign starts in the upper third of the screen, just under the top bar (Jonas, 2026-11-19).
  // Only when it would cover what it points at (the two tiles, a button, a dialog) does it move to
  // just below that. A dialog it points into starts lower meanwhile (Modal), so the sign sits above it.
  const NOTE_TOP = 68, BUBBLE_H = 170;
  const bubbleStyle = $derived.by(() => {
    const t = host ?? lit ?? (rect && rect.height <= window.innerHeight * 0.4 ? rect : null);
    const covers = t !== null && t.top < NOTE_TOP + BUBBLE_H && t.top + t.height > NOTE_TOP;
    return covers ? `top: ${Math.min(window.innerHeight - 200, t.top + t.height + 14)}px;` : 'top: var(--note-top);';
  });
  $effect(() => {
    const on = step !== null && !step.silent && overModal;
    document.body.classList.toggle('coach-over-dialog', on);
    return () => document.body.classList.remove('coach-over-dialog');
  });
  const big = $derived(rect !== null && rect.height > window.innerHeight * 0.4);
</script>

{#if step && !step.silent && !dismissed}
  {#if practice}
    <!-- the practice moves: the board draws its own frame, and nothing is dimmed -->
  {:else if lit}
    <div class="ring dim" style:top={`${lit.top - 4}px`} style:left={`${lit.left - 4}px`} style:width={`${lit.width + 8}px`} style:height={`${lit.height + 8}px`} aria-hidden="true"></div>
  {:else if rect}
    <div class="ring" class:big class:lit={host !== null} style={clip} style:top={`${rect.top - 6}px`} style:left={`${rect.left - 6}px`} style:width={`${rect.width + 12}px`} style:height={`${rect.height + 12}px`} aria-hidden="true"></div>
  {/if}
  <div class="bubble" class:small={practice} style={practice ? practiceStyle : bubbleStyle} role="dialog" aria-modal="false" aria-labelledby="coach-title" aria-describedby="coach-text">
    <h2 id="coach-title">{step.title}</h2>
    <p id="coach-text" aria-live="polite">{tutText(step, $tutorial.left)}</p>
    <div class="row">
      {#if !step.waitFor}
        <button class="primary" bind:this={nextBtn} onclick={nextTutStep}>{($tutorial.index ?? 0) === TUT_STEPS.length - 1 ? 'Börja spela' : 'Nästa'}</button>
      {/if}
      {#if !practice}<button class="skip" onclick={() => endTutorial(true)}>Hoppa över introduktionen</button>{/if}
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
  /* the practice moves: a small sign that lets the board through around it */
  .bubble.small { padding: 10px 16px; gap: 0; max-width: 260px; text-align: center; }
  .bubble.small .row { margin-top: 0; }
  h2 { margin: 0; font-size: 1.15rem; }
  p { margin: 0; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 4px; }
  .skip { background: none; border: 0; color: #5c524b; text-decoration: underline; font-weight: 500; min-height: 44px; padding: 4px 6px; }
</style>
