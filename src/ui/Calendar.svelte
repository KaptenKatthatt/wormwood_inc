<script lang="ts">
  /**
   * The seven-day gift calendar (day hook). Today's gift is the highlighted one.
   *
   * The flow is Jonas's, 2026-11-20: the only choice is to take the gift (no
   * close buttons). The calendar then fades away and the reward comes forward
   * with a sign that says what it is. A tap on the reward flies gold and gems
   * up to the menu bar, the reward fades, and the player lands on the map.
   */
  import Modal from './Modal.svelte';
  import { buyStreakShield, calendarOpen, claimGift, daily, dayOn, logHook, now } from '../lib/state/game';
  import { CALENDAR, SHIELD_GEMS, SHIELD_MAX, canClaim, giftSign, giftText, liveStreak, type Gift } from '../lib/daily';
  import { play } from '../lib/audio/sound';
  import { holdReward } from '../lib/ui/flyReward';
  import { silently } from '../lib/audio/director';

  type Fly = (from: Element | null, done?: () => void) => void;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase = $state<'calendar' | 'leaving' | 'prize' | 'collected'>('calendar');
  let gift = $state<Gift | null>(null);
  let release: { gold?: Fly; gems?: Fly } = {};
  let goldEl = $state<HTMLElement | null>(null);
  let gemsEl = $state<HTMLElement | null>(null);
  const ready = $derived(canClaim($daily, $now));
  const streak = $derived(liveStreak($daily, $now));

  function take() {
    const g = silently(() => claimGift());
    if (!g) return;
    gift = g;
    // The purse is paid; the menu bar holds the amounts back until the reward has flown in.
    release = { gold: g.gold ? holdReward('gold', g.gold) : undefined, gems: g.gems ? holdReward('gems', g.gems) : undefined };
    phase = 'leaving';
    setTimeout(() => { phase = 'prize'; play(g.shieldHours ? 'defended' : 'shine'); }, calm ? 0 : 260);
  }
  function collect() {
    if (phase !== 'prize' || !gift) return;
    phase = 'collected';
    const flights = [release.gold && (() => release.gold!(goldEl, landed)), release.gems && (() => release.gems!(gemsEl, landed))].filter((f): f is () => void => !!f);
    let left = flights.length;
    function landed() { if (--left <= 0) leave(); }
    if (gift.gold) play('coins'); else if (gift.gems) play('gems');
    if (!flights.length) { setTimeout(leave, calm ? 0 : 450); return; }
    flights.forEach((f, i) => setTimeout(f, i * 400));
  }
  /** The player lands on the map (the app follows the hash). */
  function leave() {
    calendarOpen.set(false);
    if (location.hash !== '#pussel') location.hash = '#pussel';
  }
  function close() {
    if (ready) logHook('calendar', { day: $daily.claimed + 1 }, 'no');
    calendarOpen.set(false);
  }
</script>

{#if phase === 'calendar' || phase === 'leaving'}
  <div class="cal" class:out={phase === 'leaving'}>
    <Modal title="Dagens gåva" onClose={ready || phase === 'leaving' ? undefined : close}>
      <ol class="days" aria-label="Sju dagars gåvor">
        {#each CALENDAR as g, i}
          {@const taken = i < $daily.claimed}
          {@const today = phase === 'leaving' ? i === $daily.claimed - 1 : ready && i === $daily.claimed}
          <li class:taken={taken && !today} class:today aria-current={today ? 'date' : undefined}>
            <span class="n">Dag {i + 1}</span>
            <span class="g">{taken && !today ? '✓' : giftText(g)}</span>
          </li>
        {/each}
      </ol>
      {#if ready || phase === 'leaving'}
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
        {#if ready}<button class="primary" onclick={take}>Hämta</button>
        {:else if phase === 'calendar'}<button class="ghost" onclick={close}>Stäng</button>{/if}
      </div>
    </Modal>
  </div>
{:else if gift}
  <div class="veil" class:out={phase === 'collected'}></div>
  <button class="prize" class:two={!!gift.gold && !!gift.gems} class:out={phase === 'collected'} onclick={collect} disabled={phase === 'collected'} data-no-click-sound>
    <span class="things">
      {#if gift.gold}<span class="thing flies"><img src="/art/wheel/coin.webp" alt="" bind:this={goldEl} /><b>{gift.gold}</b></span>{/if}
      {#if gift.gems}<span class="thing flies"><img src="/art/wheel/gem.webp" alt="" bind:this={gemsEl} /><b>{gift.gems}</b></span>{/if}
      {#if gift.shieldHours}<span class="thing"><img src="/art/ui/shield.webp" alt="" /></span>{/if}
    </span>
    <span class="say" aria-live="polite">{giftSign(gift)}</span>
    <span class="tap">Tryck för att hämta</span>
  </button>
{/if}

<style>
  .cal { transition: opacity .25s; }
  .cal.out { opacity: 0; pointer-events: none; }
  .days { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .days li { border: 2px solid var(--line); border-radius: 10px; padding: 6px 4px; display: grid; justify-items: center; text-align: center; background: #fff8ec; }
  .days li:last-child { grid-column: span 2; border-color: var(--gold); }
  .days li.taken { opacity: .55; }
  .days li.today { border-color: var(--falu); box-shadow: 0 0 0 2px var(--falu); }
  .n { font-size: .8rem; color: var(--muted); }
  .g { font-weight: 800; font-size: .9rem; }
  .fine { color: var(--muted); font-size: .9rem; }
  .shield { display: flex; gap: 10px; align-items: center; justify-content: space-between; border: 2px dashed var(--line); border-radius: 10px; padding: 8px 10px; }
  .shield p { margin: 0; }
  .shield button { white-space: nowrap; flex: none; }

  /* The reward on its own: the same dark veil as a dialog's backdrop, the reward in the middle. */
  .veil { position: fixed; inset: 0; z-index: 10; background: rgb(0 0 0 / .55); transition: opacity .45s; }
  .veil.out { opacity: 0; }
  .prize { position: fixed; left: 50%; top: 42%; z-index: 10; width: min(86vw, 380px); transform: translate(-50%, -50%); background: none; border: 0; padding: 0; min-height: 0; display: grid; justify-items: center; gap: 10px; color: #fffaf2; font: inherit; cursor: pointer; animation: prize .5s cubic-bezier(.2, 1.5, .4, 1) both; transition: opacity .35s; }
  .prize.out { opacity: 0; }
  /* The picture becomes the flying pieces the moment it is tapped. */
  .prize.out .flies img { visibility: hidden; }
  .prize:disabled { cursor: default; }
  @keyframes prize { from { transform: translate(-50%, -50%) scale(.3); opacity: 0; } }
  .things { display: flex; gap: 14px; justify-content: center; align-items: flex-end; }
  .thing { display: grid; justify-items: center; gap: 2px; }
  .thing img { width: 132px; height: 132px; object-fit: contain; filter: drop-shadow(0 0 18px rgb(255 232 154 / .9)) drop-shadow(0 8px 10px rgb(0 0 0 / .45)); animation: bob 1.6s ease-in-out infinite; }
  .two .thing img { width: 104px; height: 104px; }
  .thing b { font-size: 1.8rem; font-weight: 800; line-height: 1; text-shadow: 0 2px 0 #3a120c; }
  @keyframes bob { 50% { transform: translateY(-6px); } }
  .say { background: #fffaf2; color: #1f1a17; border: 3px solid var(--deep); border-radius: 12px; padding: 4px 14px; font-weight: 800; font-size: 1.2rem; text-align: center; box-shadow: 0 4px 0 rgb(90 29 20 / .35); }
  .tap { font-weight: 700; animation: tapme 1s ease-in-out infinite; }
  @keyframes tapme { 50% { opacity: .45; } }
  @media (prefers-reduced-motion: reduce) { .prize, .thing img, .tap { animation: none; } .cal, .veil, .prize { transition: none; } }
</style>
