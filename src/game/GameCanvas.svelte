<script lang="ts">
  import Phaser from 'phaser';
  import { onMount } from 'svelte';

  /**
   * Hosts one Phaser game with one scene. `data` goes into the game registry
   * (the scene listens for changes), `on` maps game events to callbacks.
   */
  let {
    scene,
    data = {},
    on = {},
    label,
    interactive = false,
  }: {
    scene: typeof Phaser.Scene;
    data?: Record<string, unknown>;
    on?: Record<string, (...args: any[]) => void>;
    label: string;
    /** Focusable and keyboard driven (the puzzle board); otherwise a picture. */
    interactive?: boolean;
  } = $props();

  let host: HTMLDivElement;
  let game = $state<Phaser.Game>();

  onMount(() => {
    const g = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: '#a9d8ec',
      scale: { mode: Phaser.Scale.RESIZE, width: host.clientWidth, height: host.clientHeight },
      banner: false,
      callbacks: {
        preBoot: (game) => { for (const [k, v] of Object.entries(data)) game.registry.set(k, v); },
      },
    });
    g.scene.add('main', scene, true);
    game = g;
    return () => g.destroy(true);
  });

  $effect(() => {
    const g = game;
    if (!g) return;
    for (const [k, v] of Object.entries(data)) if (g.registry.get(k) !== v) g.registry.set(k, v);
  });

  $effect(() => {
    const g = game;
    if (!g) return;
    const entries = Object.entries(on);
    for (const [ev, fn] of entries) g.events.on(ev, fn);
    return () => { for (const [ev, fn] of entries) g.events.off(ev, fn); };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="stage" bind:this={host} role={interactive ? 'application' : 'img'} tabindex={interactive ? 0 : -1} aria-label={label}></div>

<style>
  .stage { position: absolute; inset: 0; touch-action: none; }
  .stage:focus-visible { outline: 3px solid var(--gold); outline-offset: -3px; }
  .stage :global(canvas) { display: block; }
</style>
