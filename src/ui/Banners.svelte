<script lang="ts">
  /** Running events shown under the top bar on every screen: the offer and the attack. */
  import { buyShield, currentDefence, dayOn, now, offerOpen, purse, stairs, trainSoldier, village } from '../lib/state/game';
  import { weekendEvent } from '../lib/daily';
  import { ATTACK } from '../lib/staircase';
  import { formatDuration } from '../lib/time/clock';

  const offer = $derived($stairs.offer?.status === 'open' ? $stairs.offer : null);
  const attack = $derived($stairs.attack && !$stairs.attack.result ? $stairs.attack : null);
  const def = $derived.by(() => { void $stairs; void $village; return currentDefence(); });
  const shielded = $derived($stairs.shieldUntil > $now);
  const weekend = $derived.by(() => { const w = weekendEvent($now); return w.on && dayOn('weekend') ? w : null; });
</script>

{#if attack}
  <div class="banner attack" role="region" aria-label="Anfall">
    <p><strong>Grannbyn är på väg!</strong> Framme om {formatDuration(attack.hitsAt - $now)}.</p>
    <p class="nums">Ert försvar {def} mot deras styrka {attack.strength}{shielded ? ' · Skölden är uppe' : ''}</p>
    <div class="row">
      {#if !shielded}<button class="primary" onclick={buyShield}>Sköld 💎 {ATTACK.shieldGems}</button>{/if}
      <button class="ghost" onclick={trainSoldier} disabled={$village.levels.kasernen < 1 || $purse.gold < ATTACK.soldierGold}>
        {$village.levels.kasernen < 1 ? 'Bygg kasernen för soldater' : `Soldat 🪙 ${ATTACK.soldierGold}`}
      </button>
    </div>
  </div>
{:else if offer && !$offerOpen}
  <button class="banner offer" onclick={() => offerOpen.set(true)}>
    🎁 Startpaket: <strong>{formatDuration(offer.endsAt - $now)}</strong> kvar
  </button>
{:else if weekend}
  <div class="banner weekend" role="region" aria-label="Helgmarknad">
    🎪 <strong>Helgmarknad:</strong> dubbelt guld för vunna banor, {formatDuration(weekend.endsAt - $now)} kvar
  </div>
{/if}

<style>
  .banner { display: block; width: 100%; border: 0; border-radius: 0; text-align: left; padding: 8px 12px; font-variant-numeric: tabular-nums; }
  .attack { background: #f6d8c8; color: #2b1a14; display: grid; gap: 6px; }
  .attack p { margin: 0; }
  .nums { font-size: .9rem; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .row button { flex: 1 1 140px; min-height: 44px; }
  .offer { background: var(--gold); color: #1f1a17; font-weight: 600; min-height: 44px; }
  .weekend { background: #fff3c4; color: #5a1d14; font-weight: 600; padding: 8px 12px; }
</style>
