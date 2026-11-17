<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, children }: { title: string; children: Snippet } = $props();
  const id = `m-${Math.random().toString(36).slice(2)}`;
</script>

<div class="backdrop">
  <div class="card" role="dialog" aria-modal="true" aria-labelledby={id}>
    <h2 {id}>{title}</h2>
    {@render children()}
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: grid; place-items: center; padding: 16px; z-index: 10; }
  .card { background: var(--panel); color: var(--ink); border-radius: 10px; padding: 20px; width: min(420px, 100%); display: grid; gap: 12px; max-height: calc(100dvh - 32px); overflow-y: auto; }
  h2 { margin: 0; font-size: 1.3rem; }
  .card :global(p) { margin: 0; }
  .card :global(.buttons) { display: flex; flex-wrap: wrap; gap: 8px; }
  .card :global(.buttons button) { flex: 1 1 140px; }
</style>
