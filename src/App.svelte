<script lang="ts">
  import Hud from './ui/Hud.svelte';
  import PuzzleView from './ui/PuzzleView.svelte';
  import VillageView from './ui/VillageView.svelte';
  import SettingsView from './ui/SettingsView.svelte';
  import Consent from './ui/Consent.svelte';
  import { offerOpen, quitFlow, settings, shopOpen, toasts } from './lib/state/game';
  import Letter from './ui/Letter.svelte';
  import Offer from './ui/Offer.svelte';
  import Banners from './ui/Banners.svelte';
  import QuitFlow from './ui/QuitFlow.svelte';
  import Shop from './ui/Shop.svelte';
  import { log } from './lib/log/logger';

  type Tab = 'pussel' | 'byn' | 'installningar';
  const TABS: { id: Tab; label: string }[] = [
    { id: 'pussel', label: 'Banor' },
    { id: 'byn', label: 'Byn' },
    { id: 'installningar', label: 'Inställningar' },
  ];
  const fromHash = (): Tab => (TABS.find((t) => `#${t.id}` === location.hash)?.id ?? 'pussel');
  let tab = $state<Tab>(fromHash());

  function go(t: Tab) {
    tab = t;
    history.replaceState(null, '', `#${t}`);
    log('view', { tab: t });
  }
</script>

<div class="app">
  <div class="top"><Hud /><Banners /></div>
  <main>
    {#if tab === 'pussel'}<PuzzleView onVillage={() => go('byn')} />{:else if tab === 'byn'}<VillageView onPlay={() => go('pussel')} />{:else}<SettingsView />{/if}
  </main>
  <nav aria-label="Huvudmeny">
    {#each TABS as t}
      <button class="tab" aria-current={tab === t.id ? 'page' : undefined} onclick={() => go(t.id)}>{t.label}</button>
    {/each}
  </nav>
  <div class="toasts" aria-live="polite">
    {#each $toasts as t (t.id)}<div class="toast">{t.text}</div>{/each}
  </div>
  {#if $offerOpen}<Offer />{/if}
  {#if $shopOpen}<Shop />{/if}
  <Letter />
  {#if $quitFlow}<QuitFlow />{/if}
  {#if $settings.logging === null}<Consent />{/if}
</div>

<style>
  .app { height: 100dvh; width: 100%; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto; padding-top: env(safe-area-inset-top); }
  main { min-height: 0; overflow: hidden; }
  nav { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); background: var(--panel); padding-bottom: env(safe-area-inset-bottom); }
  .tab { background: none; border: 0; border-radius: 0; min-height: 56px; font-weight: 600; color: var(--muted); }
  .tab[aria-current='page'] { color: var(--falu); box-shadow: inset 0 3px 0 var(--falu); }
  .toasts { position: fixed; bottom: calc(72px + env(safe-area-inset-bottom)); left: 0; right: 0; display: grid; justify-items: center; gap: 6px; pointer-events: none; z-index: 5; }
  .toast { background: var(--ink); color: var(--panel); padding: 8px 14px; border-radius: 6px; font-weight: 600; max-width: calc(100% - 32px); }
</style>
