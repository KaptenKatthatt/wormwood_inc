<script lang="ts">
  import type { Snippet } from 'svelte';
  // onClose gives the dialog a cross in its top right corner that stays in view while
  // the dialog scrolls (Jonas, 2026-11-20: nobody should have to scroll down to close).
  let { title, children, onClose }: { title: string; children: Snippet; onClose?: () => void } = $props();
  const id = `m-${Math.random().toString(36).slice(2)}`;
</script>

<div class="backdrop">
  <div class="card" role="dialog" aria-modal="true" aria-labelledby={id}>
    {#if onClose}
      <div class="head">
        <h2 {id}>{title}</h2>
        <button class="x" onclick={onClose} aria-label="Stäng">✕</button>
      </div>
    {:else}
      <h2 {id}>{title}</h2>
    {/if}
    {@render children()}
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: start center; padding: var(--note-top) 16px 16px; z-index: 10; }
  .card { background: var(--panel); color: var(--ink); border-radius: 10px; padding: 20px; width: min(420px, 100%); display: grid; gap: 12px; max-height: calc(100dvh - var(--note-top) - 16px); overflow-y: auto; }
  /* The introduction's sign sits above a dialog it points into, so the dialog starts lower then. */
  :global(body.coach-over-dialog) .backdrop { padding-top: calc(var(--note-top) + 184px); }
  :global(body.coach-over-dialog) .card { max-height: calc(100dvh - var(--note-top) - 200px); }
  h2 { margin: 0; font-size: 1.3rem; }
  .head { position: sticky; top: -20px; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -20px -20px 0; padding: 12px 12px 8px 20px; background: var(--panel); border-radius: 10px 10px 0 0; }
  .x { flex: none; box-sizing: border-box; width: 44px; height: 44px; min-width: 44px; min-height: 44px; aspect-ratio: 1; padding: 0; border-radius: 50%; background: var(--panel); border: 2px solid var(--muted); color: var(--ink); font-size: 1.2rem; font-weight: 700; line-height: 1; }
  .card :global(p) { margin: 0; }
  .card :global(.buttons) { display: flex; flex-wrap: wrap; gap: 8px; }
  .card :global(.buttons button) { flex: 1 1 140px; }
</style>
