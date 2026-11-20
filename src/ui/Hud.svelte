<script lang="ts">
  import { inLevel, levelMenuAsked, lives, now, purse, settings, shopOpen } from '../lib/state/game';
  import { formatDuration } from '../lib/time/clock';
  import { nextLifeIn } from '../lib/time/lives';
  import { inFlight } from '../lib/ui/flyReward';

  // Gold and gems that are flying in from a dialog are not shown until they land.
  const gold = $derived($purse.gold - $inFlight.gold);
  const gems = $derived($purse.gems - $inFlight.gems);

  const next = $derived(nextLifeIn($lives, $now));
  /** One heart per life, filled or empty; bought lives beyond the usual five get hearts of their own. */
  const hearts = $derived(Array.from({ length: Math.max($lives.max, $lives.count) }, (_, i) => i < $lives.count));
  /** The wait for the next life, short enough to fit beside the hearts: 29:55, or 1:05:00. */
  function short(ms: number): string {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), r = sec % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
  }
  const HEART = 'M12 21s-8-5.2-8-11.2C4 6.6 6.3 4.5 8.8 4.5c1.4 0 2.6.7 3.2 1.8.6-1.1 1.8-1.8 3.2-1.8 2.5 0 4.8 2.1 4.8 5.3C20 15.8 12 21 12 21z';
</script>

<header class="hud">
  {#if $inLevel}
    <button class="menu" data-tut="level-menu" onclick={() => levelMenuAsked.set(true)} aria-label="Meny: pausa eller lämna utmaningen" aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
    </button>
  {/if}
  <div class="lives" data-tut="lives" role="img" aria-label={`${$lives.count} av ${$lives.max} liv${next === null ? '' : `, nästa om ${formatDuration(next)}`}`}>
    <span class="hearts">
      {#each hearts as full}
        <svg class="heart" class:empty={!full} viewBox="0 0 24 24" aria-hidden="true"><path d={HEART} /></svg>
      {/each}
    </span>
    {#if next !== null}<span class="next" aria-hidden="true">{short(next)}</span>{/if}
  </div>
  <span class="gold" data-counter="gold" aria-label={`${gold} guld`}><span aria-hidden="true">🪙</span> {gold}</span>
  <button class="gems" data-tut="gems" onclick={() => shopOpen.set({ reason: 'hud' })} data-counter="gems" aria-label={`${gems} ädelstenar. Öppna butiken`}>
    <span aria-hidden="true">💎</span> {gems} <span class="plus" aria-hidden="true">+</span>
  </button>
  {#if $settings.speed !== 1}<span class="badge" title="Snabbad klocka">×{$settings.speed}</span>{/if}
</header>

<style>
  .hud { min-width: 0; display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: var(--panel); border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  .menu { flex: none; width: 40px; height: 40px; min-height: 0; padding: 0; display: grid; place-items: center; background: transparent; border: 2px solid var(--line); color: var(--ink); }
  .menu svg { width: 22px; height: 22px; }
  .lives { display: flex; align-items: center; gap: 6px; white-space: nowrap; flex: 1; min-width: 0; }
  .hearts { display: flex; gap: 1px; }
  .heart { width: 22px; height: 22px; flex: none; fill: #d62a1e; stroke: #5e150d; stroke-width: 1.6; stroke-linejoin: round; }
  .heart.empty { fill: transparent; stroke: var(--muted); }
  .next { color: var(--muted); font-size: .9rem; margin-left: 2px; }
  .gold { font-weight: 700; white-space: nowrap; }
  .gems { min-height: 40px; padding: 4px 10px; background: transparent; border: 2px solid var(--line); color: var(--ink); white-space: nowrap; }
  .plus { color: var(--falu); font-weight: 900; }
  /* While a reward flies in, the bar is lifted above the dialog's backdrop so the counters are seen counting up. */
  :global(body.reward-flying) .hud { position: relative; z-index: 11; }
  :global(.landed) { animation: landed .16s ease-out; }
  @keyframes landed { 50% { transform: scale(1.18); } }
  .gold, .gems { transform-origin: center; }
  .gold { display: inline-block; }
  .badge { background: var(--gold); color: #1f1a17; font-weight: 800; border-radius: 999px; padding: 2px 8px; font-size: .8rem; }
</style>
