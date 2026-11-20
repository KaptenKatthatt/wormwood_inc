<script lang="ts">
  import { playerId, rescheduleAll, settings, toast } from '../lib/state/game';
  import { DEV_MENU } from '../lib/config/flags';
  import DevMenu from './DevMenu.svelte';
  import { startTutorial } from '../lib/tutorial';
  import { myCode } from '../lib/invite';
  import { enablePush, lastPushError, permissionNow, testPush } from '../lib/push/push';
  import { log } from '../lib/log/logger';
  import { flush } from '../lib/log/logger';
  import InstallGuide from './InstallGuide.svelte';
  import Credits from './Credits.svelte';
  import VolumeRow from './VolumeRow.svelte';
  import { doneTesting, openQuestionnaire, qState } from '../lib/state/questionnaire';
  import { contact, contactOpen, contactsOpen, inbox, markRead, removeContact } from '../lib/state/reach';
  import { dayText } from '../lib/reach';
  let openMessage = $state('');
  // Newest first, as in a mailbox.
  const messages = $derived([...$inbox.messages].reverse());
  function toggleMessage(id: string) {
    openMessage = openMessage === id ? '' : id;
    if (openMessage) markRead(id);
  }
  async function dropContact() {
    toast((await removeContact()) ? 'Mejladressen är borttagen.' : 'Det gick inte just nu. Försök igen om en stund.');
  }

  let pushStatus = $state('');
  let credits = $state(false);

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
  {#if messages.length}
    <h2>Meddelanden från Jonas</h2>
    {#each messages as m (m.id)}
      <button class="message" class:unread={!$inbox.read.includes(m.id)} aria-expanded={openMessage === m.id} onclick={() => toggleMessage(m.id)}>
        <strong>{m.title}</strong>
        <small>{dayText(m.sentAt)}</small>
        {#if openMessage === m.id}<span class="body">{m.body}</span>{/if}
      </button>
    {/each}
  {/if}
  <h2>Ljud</h2>
  <VolumeRow kind="music" label="Musik" />
  <VolumeRow kind="sfx" label="Ljudeffekter" />
  {#if DEV_MENU}<VolumeRow kind="ambience" label="Havsljud i byn" />{/if}

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
    <span><strong>Skicka testdata</strong>: vad du gör i spelet och när, till Jonas Olson. {$contact || contactsOpen() ? 'Inget namn.' : 'Inget namn, ingen e-post.'}</span>
  </label>
  <p>Din testkod: <strong class="code">{myCode(playerId)}</strong>. Vill du att dina uppgifter raderas, säg koden till Jonas.</p>

  {#if $contact}
    <h2>Mejladress</h2>
    <p>Jonas får höra av sig till <strong class="mail">{$contact}</strong>.</p>
    <button class="ghost" onclick={dropContact}>Ta bort min mejladress</button>
  {:else if contactsOpen()}
    <h2>Mejladress</h2>
    <p>Ingen mejladress är sparad.</p>
    <button class="ghost" onclick={() => contactOpen.set(true)}>Lägg till en mejladress</button>
  {/if}
  {#if $settings.logging === true}
    {#if $qState.stage === 'done'}
      <p>Du har svarat på alla frågor om spelet. Tack!</p>
    {:else if $qState.stage === 'waiting'}
      <p>Tack för dina svar! När du inte vill testa mer: tryck här, så får du några sista frågor.</p>
      <button class="ghost" onclick={doneTesting}>Jag har testat klart</button>
    {:else}
      <p>När du har spelat en vecka, eller inte vill spela mer: svara gärna på några frågor om spelet. Det tar några minuter.</p>
      <button class="primary" onclick={openQuestionnaire}>{$qState.stage === 'part1' && Object.keys($qState.answers).length === 0 ? 'Svara på frågorna' : 'Fortsätt med frågorna'}</button>
    {/if}
  {/if}

  {#if DEV_MENU}<DevMenu />{/if}
  <button class="ghost" onclick={() => (credits = true)}>Medverkande</button>
  <p class="version">Version {__APP_VERSION__}</p>
</section>
{#if credits}<Credits onClose={() => (credits = false)} />{/if}

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
  .mail { overflow-wrap: anywhere; }
  /* The same cool, plain look as the message when it comes up (JonasMessage.svelte). */
  .message { flex: none; display: grid; gap: 2px; text-align: left; background: #e7f1f5; border: 2px solid #7fa9bd; color: #17384a; font-weight: 400; padding: 8px 14px; }
  .message strong { font-weight: 700; }
  .message small { opacity: .8; }
  .message.unread strong::before { content: '● '; color: var(--falu); }
  .message .body { margin-top: 6px; white-space: pre-line; overflow-wrap: anywhere; }
</style>
