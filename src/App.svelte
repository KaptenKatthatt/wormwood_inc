<script lang="ts">
  import Hud from './ui/Hud.svelte';
  import PuzzleView from './ui/PuzzleView.svelte';
  import VillageView from './ui/VillageView.svelte';
  import SettingsView from './ui/SettingsView.svelte';
  import Consent from './ui/Consent.svelte';
  import { awayReport, calendarOpen, inLevel, streakRepair, offerOpen, quitFlow, settings, shopOpen, toasts } from './lib/state/game';
  import Letter from './ui/Letter.svelte';
  import Offer from './ui/Offer.svelte';
  import Banners from './ui/Banners.svelte';
  import QuitFlow from './ui/QuitFlow.svelte';
  import Shop from './ui/Shop.svelte';
  import Coach from './ui/Coach.svelte';
  import Calendar from './ui/Calendar.svelte';
  import AwayReport from './ui/AwayReport.svelte';
  import { log } from './lib/log/logger';
  import { TUT_STEPS, tutEvent, tutorial } from './lib/tutorial';
  import { EXPANSION } from './lib/config/flags';
  import { adOpen, adReward, exp, friendNote, hubOpen, offerShown } from './lib/state/expansion';
  import RewardBurst from './ui/RewardBurst.svelte';
  import { hookOn } from './lib/state/game';
  import { ON_HOLD } from './lib/hooks';
  import { closeAsked, closeGame, stay } from './lib/pwa/backGuard';
  import Modal from './ui/Modal.svelte';
  import NeighboursView from './ui/NeighboursView.svelte';
  import WeekHub from './ui/WeekHub.svelte';
  import WheelView from './ui/WheelView.svelte';
  import ChestView from './ui/ChestView.svelte';
  import PassView from './ui/PassView.svelte';
  import LeagueView from './ui/LeagueView.svelte';
  import AdOverlay from './ui/AdOverlay.svelte';
  import PersonalOffer from './ui/PersonalOffer.svelte';
  import FriendNote from './ui/FriendNote.svelte';
  import IntroScreen from './ui/IntroScreen.svelte';
  import StreakRepair from './ui/StreakRepair.svelte';
  import Christmas from './ui/Christmas.svelte';
  import { xmasOpen } from './lib/state/christmas';
  import { CHRISTMAS } from './lib/config/flags';
  import Questionnaire from './ui/Questionnaire.svelte';
  import { offerQuestionnaire, qOpen } from './lib/state/questionnaire';
  import { letter, village } from './lib/state/game';
  import JonasMessage from './ui/JonasMessage.svelte';
  import ContactAsk from './ui/ContactAsk.svelte';
  import { contactDue, contactOpen, initReach, pendingMessage } from './lib/state/reach';
  // The start screen shows each time the app opens (Jonas, 2026-11-18).
  let intro = $state(true);

  type Tab = 'pussel' | 'byn' | 'grannar' | 'installningar';
  const ALL_TABS: { id: Tab; label: string }[] = [
    { id: 'pussel', label: 'Kartan' },
    { id: 'byn', label: 'Byn' },
    { id: 'grannar', label: 'Grannar' },
    { id: 'installningar', label: 'Inställningar' },
  ];
  // The neighbours tab comes with step 8 of the week staircase (the expansion).
  const showNeighbours = $derived(EXPANSION && $exp.step >= 8 && hookOn('conquest') && !ON_HOLD.includes('conquest'));
  const TABS = $derived(ALL_TABS.filter((t) => t.id !== 'grannar' || showNeighbours));
  const fromHash = (): Tab => (ALL_TABS.find((t) => `#${t.id}` === location.hash)?.id ?? 'pussel');
  let tab = $state<Tab>(fromHash());
  // The settings' "show the introduction again" switches tab through the hash.
  $effect(() => {
    const onHash = () => (tab = fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  // The introduction takes the player to the tab each step is about, so it
  // cannot get stuck when it is started from Settings.
  const tutStep = $derived($tutorial.index === null ? null : TUT_STEPS[$tutorial.index]);
  $effect(() => {
    const s = tutStep;
    if (s && s.tab !== 'any' && !s.selfNav && s.tab !== tab) go(s.tab);
  });

  // The questionnaire that stands in for the interview: the game asks when it
  // opens or comes back after the free week, but never on top of something else.
  const calm = $derived(!intro && !tutStep && $settings.logging !== null && !$quitFlow && !$awayReport && !$streakRepair && !$calendarOpen && !$offerOpen && !$shopOpen && !$letter && !$adOpen && !$hubOpen && !$offerShown && !$friendNote && !$xmasOpen);
  // The question about an e-mail address follows the consent, or is opened from Settings.
  const askContact = $derived($contactOpen || (!intro && !tutStep && $contactDue));
  // A message from Jonas comes up when the game is calm and nobody is in a challenge, and then stays until it is read.
  $effect(() => initReach());
  let messageUp = $state(false);
  $effect(() => {
    if (!$pendingMessage) messageUp = false;
    else if (calm && !askContact && !$inLevel && !$qOpen) messageUp = true;
  });
  const quiet = $derived(calm && !askContact && !messageUp);
  let wantAsk = $state(true);
  $effect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') wantAsk = true; };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  });
  $effect(() => {
    if (wantAsk && quiet) { wantAsk = false; offerQuestionnaire(); }
  });

  // The introduction's last sign waits for the first house to stand ready.
  $effect(() => {
    if (tutStep?.id === 'building' && !$village.construction) tutEvent('buildDone');
  });

  function go(t: Tab) {
    tab = t;
    if (t === 'pussel') tutEvent('onMap');
    history.replaceState(null, '', `#${t}`);
    log('view', { tab: t });
  }
</script>

{#if intro}
<IntroScreen onPlay={() => { intro = false; log('intro_play', {}); }} />
{:else}
<div class="app">
  <div class="top"><Hud />{#if !tutStep}<Banners />{/if}</div>
  <main>
    {#if tab === 'pussel'}<PuzzleView onVillage={() => go('byn')} />{:else if tab === 'byn'}<VillageView onPlay={() => go('pussel')} />{:else if tab === 'grannar' && showNeighbours}<NeighboursView />{:else}<SettingsView />{/if}
  </main>
  <!-- Inside a challenge the menu is away; the board has its own small menu button (Jonas, 2026-11-19). -->
  {#if !(tab === 'pussel' && $inLevel)}
  <nav aria-label="Huvudmeny">
    {#each TABS as t}
      <button class="tab" data-tut={`tab-${t.id}`} aria-current={tab === t.id ? 'page' : undefined} onclick={() => go(t.id)}>{t.label}</button>
    {/each}
  </nav>
  {/if}
  <div class="toasts" aria-live="polite">
    {#each $toasts as t (t.id)}
      <div class="toast">
        {#if t.art === 'angle'}
          <!-- The two shapes that make fireworks: five tiles in a corner and in a T. -->
          <svg class="shapes" viewBox="0 0 84 34" aria-hidden="true">
            {#each [[0, 0], [0, 11], [0, 22], [11, 22], [22, 22], [50, 0], [61, 0], [72, 0], [61, 11], [61, 22]] as [x, y]}<rect {x} {y} width="10" height="10" rx="2" />{/each}
          </svg>
        {/if}
        <span>{t.text}</span>
      </div>
    {/each}
  </div>
  {#if $offerOpen && !tutStep}<Offer />{/if}
  {#if $awayReport && !tutStep}<AwayReport />{:else if $streakRepair && !tutStep}<StreakRepair />{:else if $calendarOpen && !tutStep}<Calendar />{/if}
  {#if CHRISTMAS && $xmasOpen && !tutStep}<Christmas />{/if}
  {#if $shopOpen}<Shop />{/if}
  <Coach />
  {#if !tutStep}<Letter />{/if}
  {#if $quitFlow}<QuitFlow />{/if}
  {#if $closeAsked}
    <Modal title="Vill du stänga spelet?">
      <div class="buttons">
        <button class="primary" onclick={stay}>Stanna kvar</button>
        <button class="ghost" onclick={closeGame}>Stäng</button>
      </div>
    </Modal>
  {/if}
  {#if $settings.logging === null}<Consent />{:else if askContact}<ContactAsk />{/if}
  {#if messageUp && $pendingMessage}{#key $pendingMessage.id}<JonasMessage message={$pendingMessage} />{/key}{/if}
  {#if EXPANSION && !tutStep}
    {#if $hubOpen === 'hjul'}<WheelView />{:else if $hubOpen === 'kistor'}<ChestView />{:else if $hubOpen === 'pass'}<PassView />{:else if $hubOpen === 'liga'}<LeagueView />{:else if $hubOpen}<WeekHub />{/if}
    {#if $offerShown && !$offerOpen}<PersonalOffer />{/if}
    {#if $friendNote && !$hubOpen}<FriendNote />{/if}
    {#if $adOpen}<AdOverlay />{/if}
    {#if $adReward}<RewardBurst />{/if}
  {/if}
  <!-- Last, so it lies on top of anything that opens at the same moment. -->
  {#if $qOpen && !tutStep && !$quitFlow}<Questionnaire />{/if}
</div>
{/if}

<style>
  .app { height: 100dvh; width: 100%; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto; padding-top: env(safe-area-inset-top); }
  main { min-height: 0; overflow: hidden; }
  nav { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; border-top: 1px solid var(--line); background: var(--panel); padding-bottom: env(safe-area-inset-bottom); }
  .tab { background: none; border: 0; border-radius: 0; min-height: 56px; font-weight: 600; color: var(--muted); }
  .tab[aria-current='page'] { color: var(--falu); box-shadow: inset 0 3px 0 var(--falu); }
  .toasts { position: fixed; top: var(--note-top); left: 0; right: 0; display: grid; justify-items: center; gap: 6px; pointer-events: none; z-index: 5; }
  .toast { display: flex; align-items: center; gap: 12px; background: var(--ink); color: var(--panel); padding: 8px 14px; border-radius: 6px; font-weight: 600; max-width: calc(100% - 32px); }
  .shapes { flex: none; width: 84px; height: 34px; fill: #f2c230; }
</style>
