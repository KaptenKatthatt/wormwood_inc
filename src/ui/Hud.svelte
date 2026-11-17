<script lang="ts">
  import { lives, now, purse, settings, shopOpen } from '../lib/state/game';
  import { formatDuration } from '../lib/time/clock';
  import { nextLifeIn } from '../lib/time/lives';

  const next = $derived(nextLifeIn($lives, $now));
</script>

<header class="hud">
  <div class="lives" data-tut="lives" aria-label={`${$lives.count} av ${$lives.max} liv${next === null ? '' : `, nästa om ${formatDuration(next)}`}`}>
    <span class="heart" aria-hidden="true">♥</span><strong>{$lives.count}</strong>
    <span class="next" aria-hidden="true">{next === null ? 'fullt' : formatDuration(next)}</span>
  </div>
  <span class="gold" aria-label={`${$purse.gold} guld`}><span aria-hidden="true">🪙</span> {$purse.gold}</span>
  <button class="gems" data-tut="gems" onclick={() => shopOpen.set({ reason: 'hud' })} aria-label={`${$purse.gems} ädelstenar. Öppna butiken`}>
    <span aria-hidden="true">💎</span> {$purse.gems} <span class="plus" aria-hidden="true">+</span>
  </button>
  {#if $settings.speed !== 1}<span class="badge" title="Snabbad klocka">×{$settings.speed}</span>{/if}
</header>

<style>
  .hud { min-width: 0; display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: var(--panel); border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  .lives { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; flex: 1; min-width: 0; }
  .heart { color: var(--falu); font-size: 1.3rem; line-height: 1; }
  .next { color: var(--muted); font-size: .9rem; margin-left: 2px; }
  .gold { font-weight: 700; white-space: nowrap; }
  .gems { min-height: 40px; padding: 4px 10px; background: transparent; border: 2px solid var(--line); color: var(--ink); white-space: nowrap; }
  .plus { color: var(--falu); font-weight: 900; }
  .badge { background: var(--gold); color: #1f1a17; font-weight: 800; border-radius: 999px; padding: 2px 8px; font-size: .8rem; }
</style>
