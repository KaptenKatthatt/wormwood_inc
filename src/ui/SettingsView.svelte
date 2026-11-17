<script lang="ts">
  import { playerId, rescheduleAll, settings, toast } from '../lib/state/game';
  import { DEV_MENU } from '../lib/config/flags';
  import DevMenu from './DevMenu.svelte';
  import { startTutorial } from '../lib/tutorial';
  import { testCode } from '../lib/testCode';
  import { enablePush, lastPushError, permissionNow, testPush } from '../lib/push/push';
  import { log } from '../lib/log/logger';
  import { flush } from '../lib/log/logger';
  import InstallGuide from './InstallGuide.svelte';

  let pushStatus = $state('');

  async function turnOnPush() {
    pushStatus = 'Frågar …';
    const r = await enablePush(playerId);
    log('push_enable', { result: r, permission: permissionNow(), error: lastPushError || undefined });
    pushStatus = {
      ok: 'Notiser är på.',
      unsupported: 'Den här webbläsaren kan inte ta emot notiser här. På iPhone: installera spelet på hemskärmen först.',
      denied: 'Notiser är avstängda för spelet. Slå på dem i webbläsarens eller telefonens inställningar för den här sidan, och tryck sedan här igen.',
      unanswered: 'Inget svar kom från frågan om notiser. Tryck igen, eller slå på notiser för sidan i webbläsaren. Spelet märker det själv när de är på.',
      error: 'Notiser är tillåtna, men anslutningen misslyckades. Försök igen om en stund.',
    }[r];
    if (r === 'ok') {
      settings.update((s) => ({ ...s, notifications: true }));
      rescheduleAll();
    }
  }

  function setLogging(on: boolean) {
    settings.update((s) => ({ ...s, logging: on }));
    if (on) flush(false);
  }

</script>

<section class="settings">
  <h2>Hjälp</h2>
  <button class="ghost" onclick={() => startTutorial(true)}>Visa introduktionen igen</button>

  <h2>Installera</h2>
  <InstallGuide />

  <h2>Notiser</h2>
  {#if $settings.notifications}
    <p>Notiser är på. Du får en notis när ett bygge är klart, även när spelet är stängt.</p>
    <button class="ghost" onclick={async () => toast((await testPush(playerId)) ? 'Testnotis skickad' : 'Kunde inte skicka')}>Skicka en testnotis</button>
  {:else}
    <p>Få en notis när ett bygge är klart.</p>
    <button class="primary" onclick={turnOnPush}>Slå på notiser</button>
  {/if}
  {#if pushStatus}<p class="status" role="status">{pushStatus}</p>{/if}

  <h2>Speltest</h2>
  <label class="row">
    <input type="checkbox" checked={$settings.logging === true} onchange={(e) => setLogging(e.currentTarget.checked)} />
    <span><strong>Skicka testdata</strong>: vad du gör i spelet och när, till Jonas Olson. Inget namn, ingen e-post.</span>
  </label>
  <p>Din testkod: <strong class="code">{testCode(playerId)}</strong>. Vill du att dina uppgifter raderas, säg koden till Jonas.</p>

  {#if DEV_MENU}<DevMenu />{/if}
  <p class="version">Version {__APP_VERSION__}</p>
</section>

<style>
  .settings { background: var(--panel); color: var(--ink); padding: 8px 16px 24px; overflow-y: auto; height: 100%; display: flex; flex-direction: column; gap: 10px; }
  .settings > :global(*) { width: 100%; max-width: 640px; margin-inline: auto; }
  h2 { font-size: 1.15rem; margin: 14px 0 0; }
  p { margin: 0; }
  .row { display: flex; gap: 10px; align-items: flex-start; min-height: 48px; }
  .row input { width: 24px; height: 24px; margin-top: 2px; accent-color: var(--falu); flex: none; }
  .status { color: var(--muted); }
  .version { margin: 16px 0 0; font-size: .85rem; opacity: .7; text-align: center; }
  .code { font-family: ui-monospace, monospace; font-size: 1.1rem; letter-spacing: .08em; }
</style>
