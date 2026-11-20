<script lang="ts">
  /** The seven-day gift calendar (day hook). Today's gift is the highlighted one. */
  import Modal from './Modal.svelte';
  import { buyStreakShield, calendarOpen, claimGift, daily, dayOn, logHook, now } from '../lib/state/game';
  import { CALENDAR, SHIELD_GEMS, SHIELD_MAX, canClaim, giftText, liveStreak } from '../lib/daily';

  let got = $state<string | null>(null);
  const ready = $derived(canClaim($daily, $now));
  const streak = $derived(liveStreak($daily, $now));

  function take() {
    const g = claimGift();
    if (g) got = giftText(g);
  }
  function close() {
    if (ready && !got) logHook('calendar', { day: $daily.claimed + 1 }, 'no');
    calendarOpen.set(false);
    got = null;
  }
</script>

<Modal title="Dagens gåva" onClose={close}>
  <ol class="days" aria-label="Sju dagars gåvor">
    {#each CALENDAR as g, i}
      {@const taken = i < $daily.claimed}
      {@const today = got !== null ? i === $daily.claimed - 1 : ready && i === $daily.claimed}
      <li class:taken class:today aria-current={today ? 'date' : undefined}>
        <span class="n">Dag {i + 1}</span>
        <span class="g">{taken ? '✓' : giftText(g)}</span>
      </li>
    {/each}
  </ol>
  {#if got}
    <p class="big" aria-live="polite">Du fick {got}!</p>
    <p>Kom tillbaka i morgon för nästa gåva.</p>
  {:else if ready}
    <p>En ny gåva varje dag. Dag 7 är störst.</p>
  {:else}
    <p>Nästa gåva kommer i morgon.</p>
  {/if}
  {#if streak > 0}<p class="fine">Svit: {streak} {streak === 1 ? 'dag' : 'dagar'} i rad med en klarad utmaning.</p>{/if}
  {#if streak > 0 && dayOn('streak') && dayOn('streakShield')}
    <div class="shield">
      <p><strong>🛡️ Svitskydd: {$daily.shields ?? 0} av {SHIELD_MAX}</strong><br /><span class="fine">Räddar sviten om du missar en dag.</span></p>
      {#if ($daily.shields ?? 0) < SHIELD_MAX}<button class="ghost" onclick={buyStreakShield}>Köp för 💎 {SHIELD_GEMS}</button>{/if}
    </div>
  {/if}
  <div class="buttons">
    {#if ready && !got}<button class="primary" onclick={take}>Hämta</button>{/if}
    <button class="ghost" onclick={close}>{got ? 'Tack!' : 'Stäng'}</button>
  </div>
</Modal>

<style>
  .days { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .days li { border: 2px solid var(--line); border-radius: 10px; padding: 6px 4px; display: grid; justify-items: center; text-align: center; background: #fff8ec; }
  .days li:last-child { grid-column: span 2; border-color: var(--gold); }
  .days li.taken { opacity: .55; }
  .days li.today { border-color: var(--falu); box-shadow: 0 0 0 2px var(--falu); }
  .n { font-size: .8rem; color: var(--muted); }
  .g { font-weight: 800; font-size: .9rem; }
  .big { font-size: 1.2rem; font-weight: 800; }
  .fine { color: var(--muted); font-size: .9rem; }
  .shield { display: flex; gap: 10px; align-items: center; justify-content: space-between; border: 2px dashed var(--line); border-radius: 10px; padding: 8px 10px; }
  .shield p { margin: 0; }
  .shield button { white-space: nowrap; flex: none; }
</style>
