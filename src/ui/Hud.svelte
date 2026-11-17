<script lang="ts">
  import { lives, now, settings, wallet } from '../lib/state/game';
  import { formatKr } from '../lib/economy/wallet';
  import { formatDuration } from '../lib/time/clock';
  import { nextLifeIn } from '../lib/time/lives';

  const next = $derived(nextLifeIn($lives, $now));
</script>

<header class="hud">
  <div class="lives" aria-label={`${$lives.count} av ${$lives.max} liv`}>
    {#each Array($lives.max) as _, i}
      <span class="heart" class:empty={i >= $lives.count} aria-hidden="true">♥</span>
    {/each}
    <span class="next">{next === null ? 'Fullt' : `+1 om ${formatDuration(next)}`}</span>
  </div>
  <div class="right">
    {#if $settings.fastMode}<span class="badge" title="30 minuter blir 2">Snabb</span>{/if}
    <span class="kr" aria-label={`Plånbok: ${formatKr($wallet.kronor)}`}>{formatKr($wallet.kronor)}</span>
  </div>
</header>

<style>
  .hud { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 16px; background: var(--panel); border-bottom: 1px solid var(--line); }
  .lives { min-width: 0; display: flex; align-items: center; gap: 2px; }
  .heart { color: var(--falu); font-size: 1.15rem; line-height: 1; }
  .heart.empty { color: var(--line); }
  .next { white-space: nowrap; margin-left: 6px; color: var(--muted); font-size: .95rem; font-variant-numeric: tabular-nums; }
  .right { display: flex; align-items: center; gap: 6px; }
  .kr { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .badge { background: var(--gold); color: #1f1a17; font-weight: 700; border-radius: 999px; padding: 2px 10px; font-size: .85rem; }
</style>
