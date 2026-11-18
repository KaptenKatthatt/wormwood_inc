<script lang="ts">
  /**
   * The start screen (Jonas approved it 2026-11-18): the boathouse with the
   * sign and a Play button, shown each time the app opens, before the map.
   * Sign and button are set in code over the approved picture; no version number.
   */
  let { onPlay }: { onPlay: () => void } = $props();
</script>

<section class="intro" aria-label="Skärgårdsbyn">
  <h1 class="sign"><span class="nail l" aria-hidden="true"></span><span class="nail r" aria-hidden="true"></span>Skärgårdsbyn</h1>
  <button class="play" onclick={onPlay}>Spela</button>
</section>

<style>
  .intro { position: fixed; inset: 0; z-index: 100; background: #7fb6dc url('/art/intro.jpg') 50% center / cover no-repeat; font-family: 'Baloo 2', system-ui, sans-serif; }
  .sign {
    position: absolute; top: calc(env(safe-area-inset-top, 0px) + 11vh); left: 50%; transform: translateX(-50%) rotate(-2deg);
    white-space: nowrap; margin: 0; padding: 14px 26px 8px; border-radius: 14px; text-align: center;
    background: repeating-linear-gradient(92deg, rgba(0, 0, 0, .08) 0 2px, transparent 2px 9px), linear-gradient(#a33a2a, #86281c);
    border: 4px solid #f6efe2; box-shadow: 0 0 0 3px #5a1d14, 0 8px 0 3px #5a1d14, 0 14px 24px rgba(0, 0, 0, .3);
    color: #fff; font-weight: 800; font-size: 40px; line-height: 1.05; text-shadow: 0 3px 0 #5a1d14;
  }
  .nail { position: absolute; top: 8px; width: 10px; height: 10px; border-radius: 50%; background: #cfc6b8; box-shadow: inset -2px -2px 0 #8a8070; }
  .nail.l { left: 10px; }
  .nail.r { right: 10px; }
  .play {
    position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(env(safe-area-inset-bottom, 0px) + 13.3vh);
    width: 230px; height: 76px; border-radius: 40px; background: linear-gradient(#5cb84f, #3f8f3a); border: 4px solid #fff;
    box-shadow: 0 0 0 3px #1f5a1c, 0 7px 0 3px #1f5a1c, 0 12px 20px rgba(0, 0, 0, .3);
    color: #fff; font: 800 38px/1 'Baloo 2', system-ui, sans-serif; text-shadow: 0 3px 0 #1f5a1c; cursor: pointer; padding: 0;
  }
  .play:active { transform: translateX(-50%) translateY(3px); }
  .play:focus-visible { outline: 4px solid #ffe9c9; outline-offset: 4px; }
</style>
