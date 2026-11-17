<script lang="ts">
  import Phaser from 'phaser';
  import { onMount } from 'svelte';
  import { PuzzleScene } from './PuzzleScene';
  import { VillageScene } from './VillageScene';
  import type { PlotView } from './VillageScene';

  let { scene, plots = [], label }: { scene: 'puzzle' | 'village'; plots?: PlotView[]; label: string } = $props();
  let host: HTMLDivElement;
  let game: Phaser.Game | undefined;

  onMount(() => {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      backgroundColor: '#1d3a44',
      scale: { mode: Phaser.Scale.RESIZE, width: host.clientWidth, height: host.clientHeight },
      scene: [],
      banner: false,
    });
    game.scene.add('puzzle', PuzzleScene, scene === 'puzzle');
    game.scene.add('village', VillageScene, scene === 'village');
    return () => game?.destroy(true);
  });

  $effect(() => {
    const g = game;
    if (!g) return;
    const other = scene === 'puzzle' ? 'village' : 'puzzle';
    if (g.scene.isActive(other)) g.scene.stop(other);
    if (!g.scene.isActive(scene)) g.scene.start(scene);
  });

  $effect(() => {
    game?.registry.set('plots', plots);
  });
</script>

<div class="stage" bind:this={host} role="img" aria-label={label}></div>

<style>
  .stage { position: absolute; inset: 0; touch-action: none; }
  .stage :global(canvas) { display: block; }
</style>
